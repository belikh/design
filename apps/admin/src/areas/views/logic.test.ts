import { describe, expect, it } from "vitest";
import { allowedDowntimeMin, cluster, contactSimilarity, daysUntil, deleteTag, errorBudget, findDuplicateGroups, forecast, jaroWinkler, mergeContacts, mergeTags, move, moveTag, nines, pack, pointInPolygon, projectMonthEnd, ranked, renameTag, restoreVersion, rollup, setDone, slaState, variance, type Contact, type SubTask, type Tag, type Version } from "./logic.ts";

describe("error budget", () => {
  it("computes consumed, remaining and burn rate", () => {
    const b = errorBudget(0.999, 30, Array(10).fill(0.002)); // allowed 0.03, consumed 0.02 after a third of the window
    expect(b.allowedBad).toBeCloseTo(0.03); expect(b.consumed).toBeCloseTo(0.02); expect(b.remainingPct).toBeCloseTo(33.3, 0); expect(b.burnRate).toBeCloseTo(2, 5); expect(b.daysToExhaust).toBeCloseTo(5, 5);
  });
  it("reports exhaustion and nines", () => { expect(errorBudget(0.99, 30, Array(30).fill(0.02)).daysToExhaust).toBe(0); expect(nines(0.999)).toBe(3); expect(allowedDowntimeMin(0.999, 30)).toBeCloseTo(43.2, 1); });
});
describe("forecast", () => {
  it("fits a trend and projects it", () => { const y = [10, 12, 14, 16, 18]; const f = forecast(y, 3); expect(f.future[0]).toBeCloseTo(20); expect(f.future[2]).toBeCloseTo(24); expect(f.slope).toBeCloseTo(2); });
  it("finds days until a limit, honouring growth what-ifs, or null when flat", () => { const y = [10, 12, 14, 16, 18]; expect(daysUntil(y, 28)).toBeCloseTo(5); expect(daysUntil(y, 28, 2)).toBeCloseTo(2.5); expect(daysUntil([5, 5, 5, 5], 10)).toBeNull(); expect(daysUntil(y, 10)).toBe(0); });
});
describe("cost", () => { it("classifies variance and projects month end", () => { expect(variance({ tag: "a", budget: 100, actual: 90 }).status).toBe("ok"); expect(variance({ tag: "a", budget: 100, actual: 105 }).status).toBe("warn"); expect(variance({ tag: "a", budget: 100, actual: 120 }).status).toBe("danger"); expect(projectMonthEnd(300, 10, 30)).toBe(900); }); });
describe("SLA timers", () => {
  it("moves ok -> risk -> breached and stops on resolve or while paused", () => {
    const t = { openedAt: 0, priority: "P1" as const }; expect(slaState(t, 10).state).toBe("ok"); expect(slaState(t, 50).state).toBe("risk"); expect(slaState(t, 61).state).toBe("breached");
    expect(slaState({ ...t, resolvedAt: 40 }, 500).state).toBe("met"); expect(slaState({ ...t, pausedAt: 30 }, 500).state).toBe("ok"); expect(slaState({ ...t, pausedMin: 100 }, 130).state).toBe("ok");
  });
});
const C = (id: string, name: string, email = "", phone = "", company = ""): Contact => ({ id, name, email, phone, company });
describe("duplicate detection and merge", () => {
  it("scores identical email/phone high and unrelated people low", () => {
    expect(contactSimilarity(C("1", "Ava Nguyen", "a@x.com"), C("2", "A. Nguyen", "A@x.com")).score).toBeGreaterThan(0.9);
    expect(contactSimilarity(C("1", "Ava", "", "0412 345 678"), C("2", "Someone", "", "+61 412-345-678")).reasons).toContain("same phone");
    expect(contactSimilarity(C("1", "Ava Nguyen", "a@x.com"), C("2", "Zed Quark", "z@y.com")).score).toBe(0);
    expect(jaroWinkler("Jon Smith", "John Smith")).toBeGreaterThan(0.9);
  });
  it("groups transitive duplicates", () => {
    const g = findDuplicateGroups([C("1", "Ava Nguyen", "a@x.com", "", "Acme"), C("2", "Ava Nguyen", "ava@y.com", "", "Acme"), C("3", "A Nguyen", "a@x.com"), C("4", "Bob", "b@z.com")]);
    expect(findDuplicateGroups([C("1", "Ava Nguyen", "a@x.com"), C("2", "Ava Nguyen", "ava@y.com")])).toHaveLength(0); // same name alone is not enough
    expect(g).toHaveLength(1); expect(g[0].ids.sort()).toEqual(["1", "2", "3"]);
  });
  it("merges keeping the primary and filling blanks", () => {
    const m = mergeContacts({ ...C("1", "Ava", "", "", "Acme"), notes: "vip" }, [{ ...C("2", "Ava N", "a@x.com", "0412", ""), notes: "likes email" }]);
    expect(m).toMatchObject({ name: "Ava", email: "a@x.com", phone: "0412", company: "Acme", notes: "vip / likes email" });
  });
});
const T: Tag[] = [{ id: "a", name: "Infra", parent: null, uses: 5 }, { id: "b", name: "Network", parent: "a", uses: 3 }, { id: "c", name: "Wi-Fi", parent: "b", uses: 2 }, { id: "d", name: "Storage", parent: "a", uses: 4 }];
describe("taxonomy", () => {
  it("renames with sibling-collision protection", () => { expect(renameTag(T, "b", "storage").error).toMatch(/sibling/); expect(renameTag(T, "b", " Net ").tags.find((t) => t.id === "b")!.name).toBe("Net"); expect(renameTag(T, "b", " ").error).toBeTruthy(); });
  it("refuses to create cycles when moving", () => { expect(moveTag(T, "a", "c").error).toBeTruthy(); expect(moveTag(T, "c", "d").tags.find((t) => t.id === "c")!.parent).toBe("d"); });
  it("merges counts and re-parents children; deletes subtrees", () => {
    const m = mergeTags(T, "b", "d").tags; expect(m.find((t) => t.id === "d")!.uses).toBe(7); expect(m.find((t) => t.id === "c")!.parent).toBe("d"); expect(m.some((t) => t.id === "b")).toBe(false);
    expect(mergeTags(T, "a", "c").error).toBeTruthy(); expect(deleteTag(T, "b").map((t) => t.id)).toEqual(["a", "d"]);
  });
});
describe("versions", () => { it("restore appends a new head and keeps history", () => { const vs: Version[] = [{ id: "v1", n: 1, at: "t1", by: "a", note: "", body: "one" }, { id: "v2", n: 2, at: "t2", by: "a", note: "", body: "two" }]; const r = restoreVersion(vs, "v1", "me", "t3"); expect(r).toHaveLength(3); expect(r[2]).toMatchObject({ n: 3, body: "one", restoredFrom: 1 }); expect(r.slice(0, 2)).toEqual(vs); }); });
describe("subtasks", () => {
  const tree: SubTask[] = [{ id: "p", title: "p", done: false, sub: [{ id: "a", title: "a", done: true }, { id: "b", title: "b", done: false, sub: [{ id: "c", title: "c", done: false }] }] }];
  it("rolls up nested progress", () => { expect(rollup(tree[0])).toEqual({ done: 1, total: 2 }); });
  it("completing a parent completes children; finishing every child completes the parent", () => {
    const all = setDone(tree, "p", true); expect(rollup(all[0])).toEqual({ done: 2, total: 2 });
    const one = setDone(tree, "c", true); expect(one[0].sub![1].done).toBe(true); expect(one[0].done).toBe(true);
  });
});
describe("helpers", () => {
  it("moves items and ignores out-of-range", () => { expect(move([1, 2, 3, 4], 0, 2)).toEqual([2, 3, 1, 4]); expect(move([1, 2], 0, 5)).toEqual([1, 2]); });
  it("ranks with ties and shows movement", () => { const r = ranked([{ id: "a", name: "A", score: 10, prev: 5 }, { id: "b", name: "B", score: 10, prev: 9 }, { id: "c", name: "C", score: 7, prev: 12 }]); expect(r.map((x) => x.rank)).toEqual([1, 1, 3]); expect(r.find((x) => x.id === "c")!.delta).toBeLessThan(0); expect(r.find((x) => x.id === "a")!.delta).toBeGreaterThan(0); });
  it("packs overlapping roadmap items into rows", () => { const p = pack([{ start: 0, end: 5 }, { start: 3, end: 8 }, { start: 5, end: 9 }]); expect(p.map((x) => x.row)).toEqual([0, 1, 0]); });
  it("clusters nearby map points and tests polygons", () => { expect(cluster([{ id: "a", x: 1, y: 1 }, { id: "b", x: 2, y: 2 }, { id: "c", x: 40, y: 40 }], 10)).toHaveLength(2); const sq: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10]]; expect(pointInPolygon(5, 5, sq)).toBe(true); expect(pointInPolygon(15, 5, sq)).toBe(false); });
});
