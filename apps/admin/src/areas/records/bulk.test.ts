import { describe, expect, it } from "vitest";
import { applyBulk, blockedBy, changedCount, mixed, nextStep, opError, progress, type Item, type Step } from "./bulk.ts";

const rows: Item[] = [{ id: "a", name: "A", status: "active", owner: "ava", tags: ["x"], price: 10 }, { id: "b", name: "B", status: "paused", owner: "ava", tags: [], price: 20 }, { id: "c", name: "C", status: "active", owner: "noah", tags: ["x"], price: 30 }];
describe("bulk edit", () => {
  it("applies several operations only to the selected rows", () => {
    const out = applyBulk(rows, new Set(["a", "b"]), [{ field: "status", mode: "set", value: "archived" }, { field: "tags", mode: "append", value: "y" }, { field: "price", mode: "multiply", value: "1.1" }]);
    expect(out.map((r) => r.status)).toEqual(["archived", "archived", "active"]); expect(out[0].tags).toEqual(["x", "y"]); expect(out[1].price).toBe(22); expect(out[2]).toBe(rows[2]); expect(changedCount(rows, out)).toBe(2);
  });
  it("does not duplicate tags and can remove / clear", () => { const o = applyBulk(rows, new Set(["a"]), [{ field: "tags", mode: "append", value: "x" }]); expect(o[0].tags).toEqual(["x"]); expect(applyBulk(rows, new Set(["a"]), [{ field: "tags", mode: "remove", value: "x" }])[0].tags).toEqual([]); expect(applyBulk(rows, new Set(["a"]), [{ field: "owner", mode: "clear", value: "" }])[0].owner).toBe(""); });
  it("reports mixed values and validates ops", () => { expect(mixed(rows, new Set(["a", "c"]))).toMatchObject({ status: false, owner: true, price: true, tags: false }); expect(opError({ field: "price", mode: "set", value: "abc" })).toBe("Not a number"); expect(opError({ field: "status", mode: "set", value: "gone" })).toBe("Unknown status"); expect(opError({ field: "owner", mode: "clear", value: "" })).toBeNull(); });
});
describe("onboarding", () => {
  const steps: Step[] = [{ id: "p", title: "Project", why: "", action: "" }, { id: "t", title: "Team", why: "", action: "", needs: ["p"] }, { id: "o", title: "Opt", why: "", action: "", optional: true }];
  it("blocks dependent steps and picks the next available one", () => { expect(blockedBy(steps[1], { p: "todo", t: "todo", o: "todo" }, steps)).toEqual(["Project"]); expect(nextStep(steps, { p: "todo", t: "todo", o: "todo" })?.id).toBe("p"); expect(nextStep(steps, { p: "done", t: "todo", o: "todo" })?.id).toBe("t"); });
  it("completes when all required steps are done or skipped; optional can stay todo", () => { expect(progress(steps, { p: "done", t: "skipped", o: "todo" }).complete).toBe(true); expect(progress(steps, { p: "done", t: "todo", o: "done" })).toMatchObject({ done: 2, pct: 67, complete: false }); });
});
