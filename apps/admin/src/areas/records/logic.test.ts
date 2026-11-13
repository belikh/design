import { describe, expect, it } from "vitest";
import * as L from "./logic.ts";

describe("config staging", () => {
  const live = { A: "1", B: "2", C: "3" };
  it("diffs add / change / remove", () => { expect(L.diffConfig(live, { A: "1", B: "9", D: "4" })).toEqual([{ key: "B", kind: "change", from: "2", to: "9" }, { key: "C", kind: "remove", from: "3" }, { key: "D", kind: "add", to: "4" }]); });
  it("applies staged changes as a new revision and rolls back as another new one", () => {
    let s = L.newStore(live); s = L.stage(s, { ...live, A: "10" }); expect(L.pending(s)).toHaveLength(1);
    s = L.apply(s, "ava", "t2", "bump"); expect(s.live.A).toBe("10"); expect(s.history).toHaveLength(2); expect(L.pending(s)).toHaveLength(0);
    s = L.rollback(s, 1, "ava", "t3"); expect(s.live.A).toBe("1"); expect(s.history).toHaveLength(3); expect(s.history[0].note).toMatch(/Rolled back to r1/);
  });
  it("does nothing when there is nothing to apply, and discards staged edits", () => { let s = L.newStore(live); expect(L.apply(s, "a", "t", "")).toBe(s); s = L.stage(s, { A: "x" }); expect(L.pending(L.discard(s))).toHaveLength(0); });
  it("parses KEY=value text with line-accurate errors", () => {
    const r = L.parseText("# c\nA=1\nbad line\n9X=2\nA=3"); expect(r.cfg).toEqual({ A: "1" }); expect(r.errors.map((e) => e.line)).toEqual([3, 4, 5]);
  });
});
describe("permissions", () => {
  const roles: L.Role[] = [{ id: "viewer", name: "Viewer", grants: { orders: ["read"] } }, { id: "editor", name: "Editor", inherits: "viewer", grants: { orders: ["update"], docs: ["read", "create"] } }, { id: "admin", name: "Admin", inherits: "editor", grants: { orders: ["delete", "admin"] } }];
  it("inherits through the chain", () => { expect(L.can(roles, "admin", "orders", "read")).toBe(true); expect(L.can(roles, "editor", "orders", "delete")).toBe(false); expect(L.source(roles, "admin", "orders", "read")).toBe("Viewer"); expect(L.source(roles, "admin", "orders", "admin")).toBe("own"); expect(L.source(roles, "viewer", "docs", "read")).toBeNull(); });
  it("detects inheritance cycles", () => { expect(L.wouldCycle(roles, "viewer", "admin")).toBe(true); expect(L.wouldCycle(roles, "admin", "viewer")).toBe(false); });
});
describe("csv import", () => {
  const fields: L.FieldDef[] = [{ key: "name", label: "Name", required: true, type: "text" }, { key: "email", label: "Email", required: true, type: "email" }, { key: "seats", label: "Seats", type: "number" }, { key: "plan", label: "Plan", type: "enum", options: ["free", "pro"] }];
  it("parses quotes, escaped quotes, CRLF and embedded commas", () => { expect(L.parseCsv('a,"b,c","d ""q"""\r\n1,2,3\n')).toEqual([["a", "b,c", 'd "q"'], ["1", "2", "3"]]); });
  it("guesses column mapping and validates every row", () => {
    const rows = L.parseCsv("Name,E-mail,Seats,Plan\nAva,ava@example.com,3,pro\n,bad,x,gold"); const m = L.guessMapping(rows[0], fields); expect(m).toEqual({ name: 0, email: 1, seats: 2, plan: 3 });
    const res = L.validateRows(rows.slice(1), m, fields); expect(res[0].errors).toHaveLength(0); expect(res[1].errors.map((e) => e.field).sort()).toEqual(["email", "name", "plan", "seats"]);
  });
  it("finds duplicate keys and round-trips CSV", () => { const res = L.validateRows([["a", "x@y.zz"], ["b", "X@y.zz"]], { name: 0, email: 1 }, fields); expect(L.dupes(res, "email")).toEqual([2]); expect(L.parseCsv(L.toCsvText(["a", "b"], [["x,y", 'q"']]))).toEqual([["a", "b"], ["x,y", 'q"']]); });
});
describe("schedules and windows", () => {
  it("computes the next run for daily, weekly and monthly", () => {
    const from = new Date(2026, 10, 12, 10, 0); // Thu 12 Nov 2026
    expect(L.fmtDate(L.nextRun({ freq: "daily", time: "09:00" }, from))).toBe("2026-11-13 09:00"); expect(L.fmtDate(L.nextRun({ freq: "daily", time: "11:30" }, from))).toBe("2026-11-12 11:30");
    expect(L.fmtDate(L.nextRun({ freq: "weekly", weekday: 1, time: "08:00" }, from))).toBe("2026-11-16 08:00"); expect(L.fmtDate(L.nextRun({ freq: "monthly", day: 1, time: "06:00" }, from))).toBe("2026-12-01 06:00");
  });
  it("validates maintenance windows and detects overlaps on shared systems only", () => {
    const a: L.Win = { id: "a", title: "DB patch", start: "2026-11-14T22:00", end: "2026-11-15T00:00", systems: ["db"], notify: true };
    expect(L.winErrors({ ...a, id: "b", start: "2026-11-14T23:00", end: "2026-11-15T01:00" }, [a])[0]).toMatch(/Overlaps/);
    expect(L.winErrors({ ...a, id: "b", start: "2026-11-14T23:00", end: "2026-11-15T01:00", systems: ["web"] }, [a])).toEqual([]);
    expect(L.winErrors({ ...a, end: "2026-11-14T21:00" }, [])).toContain("End must be after start"); expect(L.winErrors({ ...a, start: "2026-11-14T00:00", end: "2026-11-15T00:00" }, [])[0]).toMatch(/12 hours/);
    expect(L.winState(a, "2026-11-14T23:00")).toBe("active");
  });
});
describe("experiments and flags", () => {
  it("computes a z-test and flags significance", () => { const r = L.abTest({ n: 5000, x: 500 }, { n: 5000, x: 600 }); expect(r.lift).toBeCloseTo(0.2, 2); expect(r.significant).toBe(true); expect(L.abTest({ n: 100, x: 10 }, { n: 100, x: 11 }).significant).toBe(false); });
  it("buckets deterministically and respects rollout %", () => { expect(L.bucket("u1", "f")).toBe(L.bucket("u1", "f")); const on = Array.from({ length: 2000 }, (_, i) => L.inRollout(`u${i}`, "k", 25)).filter(Boolean).length; expect(on).toBeGreaterThan(400); expect(on).toBeLessThan(600); });
  it("evaluates rules before rollout and explains why", () => {
    const f = { key: "x", on: true, rollout: 0, rules: [{ attr: "plan" as const, op: "is" as const, value: "pro", serve: true }] }; const u = { id: "1", plan: "pro", region: "au", email: "a@b.co" };
    expect(L.evalFlag(f, u)).toMatchObject({ value: true }); expect(L.evalFlag({ ...f, on: false }, u).why).toBe("Flag is off"); expect(L.evalFlag(f, { ...u, plan: "free" }).value).toBe(false);
  });
});
describe("schema designer", () => {
  const fields: L.SField[] = [{ id: "1", key: "name", label: "Name", type: "text", required: true }, { id: "2", key: "age", label: "Age", type: "number", required: false, min: 18, max: 99 }, { id: "3", key: "kind", label: "Kind", type: "select", required: true, options: ["a", "b"] }, { id: "4", key: "other", label: "Other", type: "text", required: true, showIf: { key: "kind", equals: "b" } }];
  it("generates JSON Schema", () => { const s = L.toJsonSchema(fields) as { required: string[]; properties: Record<string, { minimum?: number; enum?: string[] }> }; expect(s.required).toEqual(["name", "kind"]); expect(s.properties.age.minimum).toBe(18); expect(s.properties.kind.enum).toEqual(["a", "b"]); });
  it("flags design problems", () => { expect(L.schemaIssues([...fields, { id: "5", key: "name", label: "Dup", type: "text", required: false }, { id: "6", key: "S", label: "S", type: "select", required: false }])).toEqual(expect.arrayContaining(["Duplicate key name", expect.stringMatching(/not a valid key/), expect.stringMatching(/at least one option/)])); });
  it("validates records, honouring conditional fields", () => {
    expect(L.validateRecord(fields, { name: "A", kind: "a" })).toEqual({}); expect(L.validateRecord(fields, { name: "A", kind: "b" })).toEqual({ other: "Required" }); expect(L.validateRecord(fields, { name: "", kind: "a", age: 5 })).toEqual({ name: "Required", age: "At least 18" });
  });
});
describe("templates, retention, upgrade, quotas", () => {
  it("escapes HTML and reports missing variables", () => { const r = L.renderTemplate("Hi {{name}}, {{ missing }} <b>", { name: "<i>Ava</i>" }); expect(r.out).toBe("Hi &lt;i&gt;Ava&lt;/i&gt;, ⟨missing⟩ <b>"); expect(r.missing).toEqual(["missing"]); expect(L.variablesIn("{{a}} {{b.c}} {{a}}")).toEqual(["a", "b.c"]); });
  it("expires retention and honours legal holds", () => { expect(L.expiresOn("2026-01-01", 30)).toBe("2026-01-31"); expect(L.dueForAction({ dataset: "x", days: 30, action: "delete" }, "2026-01-01", "2026-02-01")).toBe(true); expect(L.dueForAction({ dataset: "x", days: 30, action: "delete", legalHold: true }, "2026-01-01", "2026-02-01")).toBe(false); });
  it("separates blocking and advisory pre-flight checks", () => { const r = L.canUpgrade([{ id: "a", label: "", ok: false, severity: "block", detail: "" }, { id: "b", label: "", ok: false, severity: "warn", detail: "" }, { id: "c", label: "", ok: true, severity: "block", detail: "" }]); expect(r.blocked).toHaveLength(1); expect(r.warnings).toHaveLength(1); expect(r.ok).toBe(false); });
  it("classifies quotas and runs a token bucket", () => { expect(L.quotaState(50, 100)).toBe("ok"); expect(L.quotaState(80, 100)).toBe("warning"); expect(L.quotaState(95, 100)).toBe("critical"); expect(L.quotaState(100, 100)).toBe("exceeded"); const a = L.tokenBucket(10, 1, 10, 0, 10); expect(a.allowed).toBe(true); const b = L.tokenBucket(10, 1, a.tokens, 0, 1); expect(b.allowed).toBe(false); expect(L.tokenBucket(10, 1, b.tokens, 3, 3).allowed).toBe(true); });
});
