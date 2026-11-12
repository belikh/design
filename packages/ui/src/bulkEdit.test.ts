import { describe, expect, it } from "vitest";
import { applyOp, commonValue, opsFor, planBulk, runBulk, summarize } from "./bulkEdit.ts";

import type { EditorSpec } from "./editable.tsx";
const num: EditorSpec = { type: "number" }; const sel: EditorSpec = { type: "select", options: [{ value: "a", label: "A" }, { value: "b", label: "B" }] }; const tags: EditorSpec = { type: "tags" };
type R = { id: string; v?: number | string | string[] };

describe("bulk edit logic", () => {
  it("offers relative operations for numbers and tags only", () => {
    expect(opsFor(num).map((o) => o.kind)).toEqual(["set", "add"]);
    expect(opsFor(tags).map((o) => o.kind)).toEqual(["tags-add", "tags-remove", "set"]);
    expect(opsFor(sel).map((o) => o.kind)).toEqual(["set"]);
  });
  it("applies set, add and tag operations", () => {
    expect(applyOp(num, 5, { kind: "set", value: "12" })).toBe(12);
    expect(applyOp(num, 5, { kind: "set", value: "abc" })).toBeUndefined();
    expect(applyOp(num, 5, { kind: "add", delta: -2 })).toBe(3);
    expect(applyOp(num, 0.1, { kind: "add", delta: 0.2 })).toBe(0.3);
    expect(applyOp(tags, ["x"], { kind: "tags-add", tag: "y" })).toEqual(["x", "y"]);
    expect(applyOp(tags, ["x", "y"], { kind: "tags-add", tag: "y" })).toEqual(["x", "y"]);
    expect(applyOp(tags, ["x", "y"], { kind: "tags-remove", tag: "x" })).toEqual(["y"]);
  });
  it("plans changes, already-matching rows and invalid rows", () => {
    const rows: R[] = [{ id: "1", v: 5 }, { id: "2", v: 9 }, { id: "3", v: 9 }];
    const p = planBulk(rows, (r) => r.id, (r) => r.v as number, num, { kind: "set", value: 9 });
    expect(summarize(p)).toEqual({ total: 3, change: 1, same: 2, invalid: 0 });
    const bad = planBulk(rows, (r) => r.id, (r) => r.v as number, { type: "number", max: 8 }, { kind: "set", value: 9 });
    expect(summarize(bad).invalid).toBe(3);
    const custom = planBulk(rows, (r) => r.id, (r) => r.v as number, num, { kind: "set", value: 9 }, (_v, r) => (r.id === "1" ? "Locked" : null));
    expect(custom.find((x) => x.id === "1")).toMatchObject({ status: "invalid", error: "Locked" });
  });
  it("detects mixed values", () => {
    expect(commonValue(["a", "a"])).toMatchObject({ mixed: false, value: "a", distinct: 1 });
    expect(commonValue(["a", "b", "a"])).toMatchObject({ mixed: true, distinct: 2 });
    expect(commonValue([["x"], ["x"]]).mixed).toBe(false);
  });
  it("runs a batch, keeps going after failures, reports progress and honours cancel", async () => {
    const rows: R[] = [1, 2, 3, 4].map((n) => ({ id: String(n), v: n }));
    const plan = planBulk(rows, (r) => r.id, (r) => r.v as number, num, { kind: "set", value: 100 });
    const seen: number[] = [];
    const r = await runBulk(plan, (p) => (p.id === "2" ? "nope" : p.id === "3" ? Promise.reject(new Error("boom")) : undefined), { onProgress: (d) => seen.push(d) });
    expect(r.ok.map((x) => x.id)).toEqual(["1", "4"]);
    expect(r.failed.map((f) => [f.row.id, f.error])).toEqual([["2", "nope"], ["3", "boom"]]);
    expect(seen).toEqual([1, 2, 3, 4]);
    let n = 0; const c = await runBulk(plan, () => undefined, { shouldCancel: () => n++ >= 2 });
    expect(c.cancelled).toBe(true); expect(c.ok).toHaveLength(2);
  });
});
