import { beforeEach, describe, expect, it } from "vitest";
import { applyChips, chipLabel, chipMatches, loadViews, opsFor, saveViews, type Chip } from "./tableFilters.ts";

const chip = (op: Chip["op"], value = ""): Chip => ({ id: "x", key: "k", op, value });
describe("filter chips", () => {
  it("matches text operators case-insensitively", () => {
    expect(chipMatches("Pick List", chip("contains", "list"))).toBe(true); expect(chipMatches("Pick List", chip("not-contains", "list"))).toBe(false);
    expect(chipMatches("Pick List", chip("equals", "pick list"))).toBe(true); expect(chipMatches("Pick List", chip("starts", "pi"))).toBe(true);
    expect(chipMatches("", chip("empty"))).toBe(true); expect(chipMatches(undefined, chip("empty"))).toBe(true); expect(chipMatches("a", chip("not-empty"))).toBe(true);
  });
  it("compares numbers numerically, and rejects non-numbers", () => {
    expect(chipMatches(10, chip("gt", "9"))).toBe(true); expect(chipMatches("10", chip("gt", "9"))).toBe(true); expect(chipMatches(9, chip("gte", "9"))).toBe(true); expect(chipMatches(9, chip("lt", "9"))).toBe(false); expect(chipMatches("abc", chip("lt", "9"))).toBe(false);
  });
  it("matches tag arrays by their joined text", () => { expect(chipMatches(["a", "urgent"], chip("contains", "urgent"))).toBe(true); expect(chipMatches([], chip("empty"))).toBe(true); });
  it("ANDs chips and labels them", () => {
    const rows = [{ a: 1, b: "x" }, { a: 5, b: "x" }, { a: 9, b: "y" }];
    expect(applyChips(rows, [{ id: "1", key: "a", op: "gt", value: "2" }, { id: "2", key: "b", op: "equals", value: "x" }], (r, k) => (r as Record<string, unknown>)[k])).toEqual([{ a: 5, b: "x" }]);
    expect(chipLabel("Qty", { id: "1", key: "a", op: "gt", value: "2" })).toBe("Qty > 2"); expect(chipLabel("Owner", chip("empty"))).toBe("Owner is empty");
    expect(opsFor(true)).toContain("gt"); expect(opsFor(false)).toContain("contains");
  });
});
describe("saved views", () => {
  beforeEach(() => localStorage.clear());
  it("round-trips and tolerates corrupt storage", () => {
    saveViews("t", [{ name: "Mine", q: "x", facet: null, sort: [], colFilter: {}, chips: [], hidden: [], group: [] }]); expect(loadViews("t")[0].name).toBe("Mine");
    localStorage.setItem("jp-views:bad", "{nope"); expect(loadViews("bad")).toEqual([]);
  });
});
