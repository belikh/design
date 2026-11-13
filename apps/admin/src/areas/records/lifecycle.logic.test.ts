import { describe, expect, it } from "vitest";
import * as X from "./lifecycle.logic.ts";

describe("json diff and redaction", () => {
  it("finds nested add / remove / change paths", () => { expect(X.diffJson({ a: 1, b: { c: 2, d: 3 }, z: [1] }, { a: 1, b: { c: 9, e: 4 }, z: [1, 2] })).toEqual([{ path: "b.c", kind: "change", from: 2, to: 9 }, { path: "b.d", kind: "remove", from: 3 }, { path: "b.e", kind: "add", to: 4 }, { path: "z", kind: "change", from: [1], to: [1, 2] }]); expect(X.diffJson({ a: 1 }, { a: 1 })).toEqual([]); });
  it("redacts sensitive keys at any depth", () => { expect(X.redactJson({ user: "a", apiKey: "k", nested: { password: "p", ok: "x" }, list: [{ token: "t" }] })).toEqual({ user: "a", apiKey: "••••••", nested: { password: "••••••", ok: "x" }, list: [{ token: "••••••" }] }); });
});
describe("secrets", () => {
  it("classifies rotation age", () => { expect(X.rotationState(10, 90)).toBe("ok"); expect(X.rotationState(75, 90)).toBe("due soon"); expect(X.rotationState(90, 90)).toBe("overdue"); });
  it("finds keys missing from, or differing between, environments", () => { const g = X.envGaps({ dev: { A: "1", B: "x" }, prod: { A: "2", C: "z" } }); expect(g).toEqual([{ key: "A", missing: [], differs: true }, { key: "B", missing: ["prod"], differs: false }, { key: "C", missing: ["dev"], differs: false }]); expect(X.looksSecret("DB_PASSWORD")).toBe(true); expect(X.looksSecret("REGION")).toBe(false); });
});
describe("privacy requests", () => {
  it("computes the 30-day deadline and days left", () => { expect(X.dsarDue("2026-11-01")).toBe("2026-12-01"); expect(X.dsarDaysLeft("2026-11-01", "2026-11-12")).toBe(19); expect(X.DSAR_NEXT.new).toContain("verifying"); expect(X.DSAR_NEXT.done).toEqual([]); expect(X.canErase(["bob"], "bob").ok).toBe(false); expect(X.canErase(["bob"], "ann").ok).toBe(true); });
});
describe("backups", () => {
  const pts: X.Point[] = [{ id: "f1", at: "2026-11-10T02:00:00Z", kind: "full", size: 4e9, schema: 41 }, { id: "i1", at: "2026-11-11T02:00:00Z", kind: "incremental", size: 2e8, schema: 42, base: "f1" }, { id: "i2", at: "2026-11-09T02:00:00Z", kind: "incremental", size: 1e8, schema: 41, base: "gone" }];
  it("resolves incremental chains and sums size", () => { expect(X.restoreChain(pts, "i1")?.map((p) => p.id)).toEqual(["f1", "i1"]); expect(X.restoreChain(pts, "f1")).toHaveLength(1); expect(X.restoreChain(pts, "i2")).toBeNull(); expect(X.totalSize(X.restoreChain(pts, "i1")!)).toBe(4.2e9); });
  it("warns about data loss, schema drift and missing bases", () => { const w = X.restoreWarnings(pts, "i1", "2026-11-12T02:00:00Z", 43); expect(w[0]).toMatch(/24 h/); expect(w[1]).toMatch(/Schema v42 differs from current v43/); expect(X.restoreWarnings(pts, "i2", "2026-11-12T02:00:00Z", 41).some((x) => /base backup/.test(x))).toBe(true); });
});
describe("upgrade assistant", () => {
  const env = { freeGb: 50, lastBackupHours: 3, pluginsIncompatible: [], openIncidents: 0 };
  it("passes a clean minor upgrade", () => { const c = X.upgradeChecks("4.12.0", "4.13.0", env); expect(c.every((x) => x.ok)).toBe(true); });
  it("blocks on disk, plugins and (for majors) stale backups; incidents only warn", () => {
    const c = X.upgradeChecks("4.12.0", "5.0.0", { freeGb: 5, lastBackupHours: 30, pluginsIncompatible: ["legacy-auth"], openIncidents: 1 }); const failed = c.filter((x) => !x.ok); expect(failed.map((x) => x.id).sort()).toEqual(["backup", "disk", "inc", "plugins"]); expect(failed.find((x) => x.id === "backup")!.severity).toBe("block"); expect(failed.find((x) => x.id === "inc")!.severity).toBe("warn");
    expect(X.upgradeChecks("4.12.0", "4.13.0", { ...env, lastBackupHours: 30 }).find((x) => x.id === "backup")!.severity).toBe("warn");
  });
  it("steps through phases, fails where told, and rolls back", () => { let p: X.UpPhase = "idle"; const seen: X.UpPhase[] = []; for (let i = 0; i < 5; i++) { p = X.upNext(p); seen.push(p); } expect(seen).toEqual(["downloading", "migrating", "verifying", "done", "done"]); expect(X.upNext("migrating", "migrating")).toBe("failed"); expect(X.upRollback("failed")).toBe("rolled-back"); expect(X.upRollback("done")).toBe("done"); expect(X.upProgress("done")).toBe(100); expect(X.upProgress("migrating")).toBe(38); });
});
