import { describe, expect, it } from "vitest";
import { budgetCurve, projectCompletion, rollingBurn, spreadLabels, arcPath, budgetRemaining, burnDown, burnRate, burnUp, clusterLogs, clusterPoints, cooccurrence, cumulativeFlow, dagLayout, densityGrid, downtimeAllowed, forceLayout, hexbin, histogramByEdges, lanePack, linreg, logEdges, logPattern, mean, pearson, percentile, percentRank, projector, raceFrames, rankChange, sankeyLayout, shortestPath, stackByTime, topN } from "./lib.ts";

describe("stats", () => {
  it("percentile interpolates, handles edge cases and unsorted input", () => {
    expect(percentile([1, 2, 3, 4], 50)).toBe(2.5); expect(percentile([5, 1, 3], 0)).toBe(1); expect(percentile([5, 1, 3], 100)).toBe(5); expect(percentile([7], 95)).toBe(7); expect(percentile([], 50)).toBeNaN();
    expect(percentile([1, 2, 3, 4, 5], 150)).toBe(5);
  });
  it("linreg recovers a line and reports r2, with degenerate inputs flat", () => {
    const r = linreg([0, 1, 2, 3].map((x) => ({ x, y: 2 * x + 1 }))); expect(r.slope).toBeCloseTo(2); expect(r.intercept).toBeCloseTo(1); expect(r.r2).toBeCloseTo(1);
    expect(linreg([{ x: 1, y: 5 }]).slope).toBe(0); expect(linreg([{ x: 1, y: 1 }, { x: 1, y: 3 }]).slope).toBe(0); expect(linreg([]).intercept).toBe(0);
    expect(linreg([{ x: 0, y: 4 }, { x: 5, y: 4 }]).r2).toBe(1);
  });
  it("pearson is 1 for perfectly correlated, NaN for constants", () => { expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1); expect(pearson([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1); expect(pearson([1, 1, 1], [1, 2, 3])).toBeNaN(); });
  it("histogramByEdges counts each value once, including the last edge", () => { expect(histogramByEdges([1, 2, 3, 10, 10], [1, 2, 5, 10])).toEqual([1, 2, 2]); expect(logEdges(1, 100, 2)).toEqual([1, 10, 100].map((v) => expect.closeTo(v, 5))); });
  it("percentRank is the share of peers at or below", () => { expect(percentRank([1, 2, 3, 4], 3)).toBe(0.75); expect(percentRank([], 3)).toBe(0); });
});
describe("hexbin", () => {
  it("conserves the point count and puts coincident points in one bin", () => {
    const pts = Array.from({ length: 200 }, (_, i) => ({ x: (i * 37) % 300, y: (i * 91) % 200 })); const bins = hexbin(pts, 12);
    expect(bins.reduce((a, b) => a + b.count, 0)).toBe(200); expect(hexbin([{ x: 50, y: 50 }, { x: 50, y: 50 }], 10)).toHaveLength(1); expect(hexbin([], 10)).toEqual([]);
  });
});
describe("lanePack", () => {
  it("never overlaps within a lane and uses the minimum number of lanes", () => {
    const items = [{ start: 0, end: 5 }, { start: 1, end: 3 }, { start: 3, end: 6 }, { start: 5, end: 9 }, { start: 6, end: 7 }]; const out = lanePack(items);
    for (const a of out) for (const b of out) if (a !== b && a.lane === b.lane) expect(a.end <= b.start || b.end <= a.start).toBe(true);
    expect(Math.max(...out.map((o) => o.lane)) + 1).toBe(2); expect(lanePack([])).toEqual([]);
  });
});
describe("aggregation", () => {
  it("topN folds the rest into Other and preserves the total", () => {
    const items = [{ label: "a", value: 5 }, { label: "b", value: 1 }, { label: "c", value: 9 }, { label: "d", value: 2 }]; const t = topN(items, 2);
    expect(t.map((x) => x.label)).toEqual(["c", "a", "Other"]); expect(t[2].value).toBe(3); expect(t.reduce((a, b) => a + b.value, 0)).toBe(17); expect(t[2].members).toHaveLength(2); expect(topN(items, 10).some((x) => x.other)).toBe(false);
  });
  it("cooccurrence is symmetric with counts on the diagonal and ignores duplicates/unknown labels", () => {
    const m = cooccurrence([["a", "b", "a"], ["a", "c"], ["b", "x"]], ["a", "b", "c"]); expect(m[0][0]).toBe(2); expect(m[0][1]).toBe(1); expect(m[1][0]).toBe(1); expect(m[0][2]).toBe(m[2][0]); expect(m[1][1]).toBe(2);
  });
  it("rankChange reports places gained", () => { expect(rankChange(["a", "b", "c"], ["c", "a", "b"])).toEqual({ c: 2, a: -1, b: -1 }); });
});
describe("delivery and SLO maths", () => {
  it("burn-down ideal is linear and actual never goes below zero", () => { const b = burnDown(10, [4, 4, 4]); expect(b.ideal[0]).toBe(10); expect(b.ideal[3]).toBeCloseTo(0); expect(b.actual).toEqual([10, 6, 2, 0]); });
  it("burn-up accumulates and cumulative flow stacks per stage", () => { expect(burnUp([10, 10, 12], [2, 3, 1]).done).toEqual([2, 5, 6]); expect(cumulativeFlow([{ a: 1, b: 2 }, { a: 3 }], ["a", "b"])).toEqual([[1, 2], [4, 2]]); });
  it("burn rate: 1 is on budget, 0 when no traffic", () => { expect(burnRate(1, 1000, 0.999)).toBeCloseTo(1); expect(burnRate(14.4, 1000, 0.999)).toBeCloseTo(14.4); expect(burnRate(5, 0, 0.99)).toBe(0); expect(burnRate(1, 100, 1)).toBe(0); });
  it("budget remaining is clamped to 0..1", () => { expect(budgetRemaining(0, 1000, 0.999)).toBe(1); expect(budgetRemaining(2, 1000, 0.999)).toBe(0); expect(budgetRemaining(0.5, 1000, 0.999)).toBeCloseTo(0.5); });
  it("downtime allowed matches the familiar nines table", () => { expect(downtimeAllowed(99.9, 30 * 1440)).toBeCloseTo(43.2); expect(downtimeAllowed(99.99, 365 * 1440)).toBeCloseTo(52.56); });
  it("raceFrames order by value and end on the last data point", () => {
    const f = raceFrames({ a: [1, 10], b: [5, 5], c: [9, 0] }, 4); expect(f[0].order).toEqual(["c", "b", "a"]); expect(f[f.length - 1].order).toEqual(["a", "b", "c"]); expect(f[f.length - 1].values.a).toBe(10); expect(raceFrames({}, 3)).toEqual([]);
  });
});
describe("graphs", () => {
  const nodes = ["a", "b", "c", "d", "e"].map((id) => ({ id }));
  it("dagLayout puts every edge's source in an earlier layer and keeps nodes disjoint", () => {
    const edges = [{ from: "a", to: "b" }, { from: "a", to: "c" }, { from: "b", to: "d" }, { from: "c", to: "d" }, { from: "d", to: "e" }]; const L = dagLayout(nodes, edges);
    for (const e of edges) expect(L.pos.get(e.from)!.layer).toBeLessThan(L.pos.get(e.to)!.layer);
    const boxes = [...L.pos.values()]; for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i], b = boxes[j]; expect(Math.abs(a.x - b.x) >= L.nodeW || Math.abs(a.y - b.y) >= L.nodeH).toBe(true); }
    expect(L.width).toBeGreaterThan(0);
  });
  it("dagLayout copes with cycles, self loops, unknown nodes and empty input", () => {
    const L = dagLayout(nodes.slice(0, 3), [{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "c", to: "a" }, { from: "a", to: "a" }, { from: "a", to: "zzz" }]); expect(L.pos.size).toBe(3); expect(L.edges.some((e) => e.reversed)).toBe(true);
    expect(dagLayout([], []).pos.size).toBe(0); expect(dagLayout([{ id: "x" }], []).pos.get("x")).toEqual({ x: 0, y: 0, layer: 0 });
  });
  it("dagLayout works top-to-bottom", () => { const L = dagLayout(nodes, [{ from: "a", to: "b" }, { from: "b", to: "c" }], { direction: "TB" }); expect(L.pos.get("c")!.y).toBeGreaterThan(L.pos.get("a")!.y); });
  it("forceLayout is deterministic and stays in bounds", () => {
    const edges = [{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "c", to: "d" }, { from: "d", to: "e" }]; const a = forceLayout(nodes, edges, { width: 400, height: 300, seed: 3 }), b = forceLayout(nodes, edges, { width: 400, height: 300, seed: 3 });
    expect([...a.entries()]).toEqual([...b.entries()]); for (const p of a.values()) { expect(p.x).toBeGreaterThanOrEqual(24); expect(p.x).toBeLessThanOrEqual(376); expect(p.y).toBeGreaterThanOrEqual(24); expect(p.y).toBeLessThanOrEqual(276); }
    expect(forceLayout([], [], { width: 10, height: 10 }).size).toBe(0);
  });
  it("shortestPath finds the fewest-hop route, [] if unreachable, respects direction", () => {
    const e = [{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "a", to: "d" }, { from: "d", to: "e" }, { from: "e", to: "c" }]; expect(shortestPath(e, "a", "c")).toEqual(["a", "b", "c"]);
    expect(shortestPath(e, "a", "zz")).toEqual([]); expect(shortestPath(e, "c", "a", true)).toEqual([]); expect(shortestPath(e, "c", "a")).toEqual(["c", "b", "a"]); expect(shortestPath(e, "a", "a")).toEqual(["a"]);
  });
  it("sankeyLayout sizes nodes by flow and stacks links without exceeding node height", () => {
    const S = sankeyLayout([["s1"], ["s2", "x"]], [{ from: "s1", to: "s2", value: 70 }, { from: "s1", to: "x", value: 30 }], 200); const n = S.nodes.get("s1")!; expect(n.h).toBeCloseTo(100 * S.scale); expect(S.links).toHaveLength(2);
    expect(S.links.reduce((a, l) => a + l.h, 0)).toBeCloseTo(n.h);
  });
});
describe("logs", () => {
  it("logPattern masks numbers, ips and hex ids", () => { expect(logPattern("client 598 on 10.1.1.5 id deadbeef01")).toBe("client <n> on <ip> id <hex>"); });
  it("clusterLogs groups by pattern, sorted by count, with a series that sums to the count", () => {
    const lines = [{ t: 0, level: "info", msg: "took 5 ms" }, { t: 5, level: "info", msg: "took 9 ms" }, { t: 9, level: "error", msg: "failed" }]; const c = clusterLogs(lines, 3);
    expect(c[0].pattern).toBe("took <n> ms"); expect(c[0].count).toBe(2); expect(c[0].series.reduce((a, b) => a + b, 0)).toBe(2); expect(c).toHaveLength(2);
  });
  it("stackByTime buckets by key and ignores out-of-range or unknown", () => { const s = stackByTime([{ t: 0, key: "a" }, { t: 9, key: "a" }, { t: 4, key: "b" }, { t: 99, key: "a" }, { t: 1, key: "zz" }], ["a", "b"], 2, 0, 10); expect(s).toEqual([[1, 1], [1, 0]]); });
});
describe("maps", () => {
  const b = { minLon: 110, maxLon: 155, minLat: -45, maxLat: -10 };
  it("projector keeps points inside the box and north above south", () => { const p = projector(b, 400, 300); const [x, y] = p(133, -28); expect(x).toBeGreaterThan(0); expect(x).toBeLessThan(400); expect(p(133, -12)[1]).toBeLessThan(p(133, -40)[1]); expect(p(150, -28)[0]).toBeGreaterThan(p(120, -28)[0]); expect(y).toBeGreaterThan(0); });
  it("clusterPoints merges nearby points and conserves counts", () => { const pts = [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 50, y: 50 }]; const c = clusterPoints(pts, 10); expect(c).toHaveLength(2); expect(c.reduce((a, k) => a + k.count, 0)).toBe(3); });
  it("densityGrid is normalised, peaks near the data, and handles no points", () => {
    const g = densityGrid([{ x: 10, y: 10 }, { x: 12, y: 11 }], 100, 100, 10, 10, 8); expect(Math.max(...g.flat())).toBeCloseTo(1); expect(g[1][1]).toBeGreaterThan(g[8][8]); expect(densityGrid([], 10, 10, 2, 2, 3).flat().every((v) => v === 0)).toBe(true);
  });
  it("arcPath starts and ends at the given points", () => { expect(arcPath([0, 0], [10, 0])).toMatch(/^M0,0Q.* 10,0$/); });
  it("mean is NaN for empty", () => { expect(mean([])).toBeNaN(); });
});

describe("spreadLabels", () => {
  it("separates overlapping labels by at least the gap and preserves order", () => {
    const out = spreadLabels([10, 11, 12, 100], 14); const sorted = [...out].sort((a, b) => a - b); for (let i = 1; i < sorted.length; i++) expect(sorted[i] - sorted[i - 1]).toBeGreaterThanOrEqual(14 - 1e-9);
    expect(out[0]).toBeLessThan(out[1]); expect(out[1]).toBeLessThan(out[2]); expect(spreadLabels([], 10)).toEqual([]);
  });
  it("keeps labels inside bounds", () => { const out = spreadLabels([0, 1, 2], 20, 0, 50); expect(Math.min(...out)).toBeGreaterThanOrEqual(0); expect(Math.max(...out)).toBeLessThanOrEqual(50); });
});

describe("slo rolling windows", () => {
  it("rolling burn uses only the window and equals the plain burn rate for a full window", () => {
    const e = [0, 0, 10, 0, 0], tot = [100, 100, 100, 100, 100]; const r = rollingBurn(e, tot, 0.9, 2); expect(r[1]).toBe(0); expect(r[2]).toBeCloseTo(burnRate(10, 200, 0.9)); expect(r[4]).toBe(0); expect(rollingBurn([], [], 0.99, 3)).toEqual([]);
  });
  it("budget curve is non-increasing and clamped at zero", () => { const c = budgetCurve([1, 1, 50], 1000, 0.99); expect(c[0]).toBeGreaterThan(c[1]); expect(c[2]).toBe(0); });
  it("projectCompletion finds when a trend reaches scope; null for flat or short series", () => { expect(projectCompletion([2, 4, 6, 8], 20)).toBe(9); expect(projectCompletion([5, 5, 5], 20)).toBeNull(); expect(projectCompletion([3], 10)).toBeNull(); });
});
