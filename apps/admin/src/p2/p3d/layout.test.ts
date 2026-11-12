import { describe, expect, it } from "vitest";
import { areaPath, cycleSplit, fanBands, horizonBands, stack } from "./stack.ts";
import { beeswarm, boxStats, ecdf, histogram, invNorm, kde, normals, qqLine, qqNormal, quantile, silverman } from "./stats.ts";
import { arcPath, fitCircles, packCircles, partition, squarify, total, treemap, type HNode } from "./hier.ts";
import { bumpRanks, funnel, marimekko, pareto, waterfall } from "./flow.ts";
import { gaugeAngle, hourAngle, likert, nps, ringAngles, roseRadius, TAU, waffleCounts } from "./radial.ts";

describe("stacking", () => {
  const s = [[1, 2, 3], [3, 2, 1], [6, 6, 6]];
  it("none: tops are running sums", () => { const l = stack(s); expect(l[2].y1).toEqual([10, 10, 10]); expect(l[1].y0).toEqual(l[0].y1); });
  it("100%: every column sums to exactly 1", () => { const l = stack(s, "expand"); for (let j = 0; j < 3; j++) expect(l[2].y1[j]).toBeCloseTo(1, 10); expect(l[0].y0).toEqual([0, 0, 0]); });
  it("silhouette is centred on zero", () => { const l = stack(s, "silhouette"); expect(l[0].y0[0]).toBeCloseTo(-5); expect(l[2].y1[0]).toBeCloseTo(5); });
  it("wiggle keeps thickness and stays continuous", () => { const l = stack(s, "wiggle"); for (let j = 0; j < 3; j++) expect(l[2].y1[j] - l[0].y0[j]).toBeCloseTo(10); expect(l[0].y0.every(Number.isFinite)).toBe(true); });
  it("treats negatives and NaN as zero", () => { expect(stack([[1, -2], [NaN, 3]])[1].y1).toEqual([1, 3]); });
  it("area path closes and visits every point", () => { const d = areaPath([0, 10, 20], [0, 0, 0], [5, 6, 7]); expect(d.startsWith("M0,5")).toBe(true); expect(d.endsWith("Z")).toBe(true); expect(areaPath([], [], [])).toBe(""); });
});
describe("horizon, cycle, fan", () => {
  it("horizon layers sum back to the value", () => { const v = [0, 2, 5, 9, -4]; const h = horizonBands(v, 3, 9); v.forEach((x, j) => { const rec = h.pos.reduce((a, l) => a + l[j], 0) * h.width - h.neg.reduce((a, l) => a + l[j], 0) * h.width; expect(rec).toBeCloseTo(x, 8); }); });
  it("cycle split groups by position and averages", () => { const c = cycleSplit([1, 10, 3, 20, 5, 30], 2); expect(c.cycles).toEqual([[1, 3, 5], [10, 20, 30]]); expect(c.means).toEqual([3, 20]); });
  it("fan bands widen with horizon and nest", () => { const f = fanBands([10, 10, 10, 10], 2); expect(f[0].hi[0]).toBe(10); expect(f[2].hi[3]).toBeGreaterThan(f[0].hi[3]); expect(f[2].hi[3] - f[2].lo[3]).toBeGreaterThan(f[2].hi[1] - f[2].lo[1]); });
});
describe("statistics", () => {
  it("quantiles (type 7)", () => { const s = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; expect(quantile(s, 0.5)).toBe(5.5); expect(quantile(s, 0.25)).toBe(3.25); expect(quantile(s, 0.75)).toBe(7.75); expect(quantile(s, 0)).toBe(1); expect(quantile(s, 1)).toBe(10); });
  it("box stats find the 1.5 IQR outlier", () => { const b = boxStats([1, 2, 3, 4, 5, 6, 7, 8, 9, 100]); expect(b.q1).toBe(3.25); expect(b.median).toBe(5.5); expect(b.q3).toBe(7.75); expect(b.outliers).toEqual([100]); expect(b.whiskerHi).toBe(9); expect(b.whiskerLo).toBe(1); expect(boxStats([]).n).toBe(0); });
  it("histogram counts sum to n and include the upper edge", () => { const v = [0, 1, 2, 3, 4, 5, 5, 10]; const h = histogram(v, 5); expect(h.reduce((a, b) => a + b.count, 0)).toBe(v.length); expect(h[4].count).toBe(1); expect(h[0].x0).toBe(0); expect(h[4].x1).toBe(10); expect(histogram([], 4)).toEqual([]); expect(histogram([3, 3], 2).reduce((a, b) => a + b.count, 0)).toBe(2); });
  it("kde integrates to about 1 and peaks near the mean", () => { const v = normals(1, 400, 50, 8); const g = kde(v, 0, 100, 400); const dx = 100 / 399; const area = g.reduce((a, p) => a + p.y * dx, 0); expect(area).toBeGreaterThan(0.97); expect(area).toBeLessThan(1.03); const peak = g.reduce((a, p) => (p.y > a.y ? p : a)); expect(Math.abs(peak.x - 50)).toBeLessThan(6); expect(silverman([1])).toBe(1); expect(kde([], 0, 1)).toEqual([]); });
  it("ecdf ends at 1 and is non-decreasing", () => { const e = ecdf([3, 1, 2, 2]); expect(e.map((p) => p.p)).toEqual([0.25, 0.5, 0.75, 1]); expect(e.map((p) => p.x)).toEqual([1, 2, 2, 3]); });
  it("invNorm matches known z values", () => { expect(invNorm(0.5)).toBeCloseTo(0, 8); expect(invNorm(0.975)).toBeCloseTo(1.959964, 4); expect(invNorm(0.025)).toBeCloseTo(-1.959964, 4); expect(invNorm(0.9)).toBeCloseTo(1.281552, 4); });
  it("qq of normal data lies near the reference line", () => { const v = normals(7, 300, 100, 15); const q = qqNormal(v), l = qqLine(v); expect(l.slope).toBeGreaterThan(12); expect(l.slope).toBeLessThan(18); const err = q.slice(30, 270).reduce((a, p) => a + Math.abs(p.v - (l.intercept + l.slope * p.z)), 0) / 240; expect(err).toBeLessThan(3); });
  it("beeswarm never overlaps", () => { const pos = [10, 10.5, 11, 11.2, 30, 10.1, 10.9]; const off = beeswarm(pos, 4); for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) expect(Math.hypot(pos[i] - pos[j], off[i] - off[j])).toBeGreaterThanOrEqual(8 - 1e-6); expect(off[4]).toBe(0); });
});
describe("hierarchy layouts", () => {
  const r = { x: 0, y: 0, w: 200, h: 100 };
  it("squarify tiles the rectangle with areas proportional to value", () => {
    const v = [60, 30, 20, 10, 5, 5]; const rs = squarify(v, r); const sum = v.reduce((a, b) => a + b, 0);
    rs.forEach((q, i) => expect(q.w * q.h).toBeCloseTo((v[i] / sum) * 20000, 4)); expect(rs.reduce((a, q) => a + q.w * q.h, 0)).toBeCloseTo(20000, 4);
    rs.forEach((q) => { expect(q.x).toBeGreaterThanOrEqual(-1e-9); expect(q.x + q.w).toBeLessThanOrEqual(200 + 1e-9); expect(q.y + q.h).toBeLessThanOrEqual(100 + 1e-9); });
  });
  it("squarify copes with zeros and empty input", () => { expect(squarify([0, 0], r).every((q) => q.w === 0)).toBe(true); expect(squarify([], r)).toEqual([]); expect(squarify([5, 0, 5], r)[1].w).toBe(0); });
  const tree: HNode = { name: "root", children: [{ name: "A", children: [{ name: "a1", value: 30 }, { name: "a2", value: 10 }] }, { name: "B", value: 40 }, { name: "C", children: [{ name: "c1", value: 20 }] }] };
  it("treemap leaves keep proportional areas without padding", () => { const t = treemap(tree, 200, 100, 0); const leaves = t.filter((n) => n.leaf); expect(leaves.length).toBe(4); const sum = 100; leaves.forEach((n) => expect(n.rect.w * n.rect.h).toBeCloseTo((n.value / sum) * 20000, 3)); });
  it("partition spans are proportional and children nest in their parent", () => { const p = partition(tree); const A = p.find((n) => n.name === "A")!, a1 = p.find((n) => n.name === "a1")!; expect(A.x1 - A.x0).toBeCloseTo(0.4); expect(a1.x0).toBeGreaterThanOrEqual(A.x0); expect(a1.x1).toBeLessThanOrEqual(A.x1 + 1e-12); expect(a1.x1 - a1.x0).toBeCloseTo(0.3); expect(total(tree)).toBe(100); });
  it("arc paths are finite and closed", () => { for (const d of [arcPath(50, 50, 20, 40, 0, 1), arcPath(50, 50, 0, 40, 0, TAU), arcPath(50, 50, 20, 40, 0, 4)]) { expect(d).not.toMatch(/NaN/); expect(d.endsWith("Z")).toBe(true); } });
  it("circle packing: radius^2 proportional to value and no overlaps", () => {
    const v = [50, 30, 20, 20, 10, 8, 5, 5, 3]; const cs = packCircles(v); cs.forEach((c, i) => expect(c.r * c.r).toBeCloseTo(v[i], 6));
    for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) expect(Math.hypot(cs[i].x - cs[j].x, cs[i].y - cs[j].y)).toBeGreaterThanOrEqual(cs[i].r + cs[j].r - 1e-4);
    const f = fitCircles(cs, 300, 200); f.forEach((c) => { expect(c.x - c.r).toBeGreaterThanOrEqual(-1e-6); expect(c.x + c.r).toBeLessThanOrEqual(300 + 1e-6); expect(c.y + c.r).toBeLessThanOrEqual(200 + 1e-6); expect(c.y - c.r).toBeGreaterThanOrEqual(-1e-6); });
  });
});
describe("business layouts", () => {
  it("waterfall: floating bars and totals", () => { const w = waterfall([{ label: "Start", value: 100 }, { label: "Up", value: 30 }, { label: "Down", value: -50 }, { label: "Net", value: 0, total: true }]); expect(w.map((b) => [b.start, b.end])).toEqual([[0, 100], [100, 130], [130, 80], [0, 80]]); expect(w[3].total).toBe(true); });
  it("pareto sorts, accumulates to 1 and finds the vital few", () => { const p = pareto([{ label: "a", value: 5 }, { label: "b", value: 50 }, { label: "c", value: 30 }, { label: "d", value: 10 }, { label: "e", value: 5 }]); expect(p.rows[0].label).toBe("b"); expect(p.rows[4].cum).toBeCloseTo(1); expect(p.vitalFew).toBe(2); expect(p.rows.reduce((a, r) => a + r.share, 0)).toBeCloseTo(1); expect(pareto([]).rows).toEqual([]); });
  it("funnel conversion", () => { const f = funnel([{ label: "a", value: 1000 }, { label: "b", value: 400 }, { label: "c", value: 100 }]); expect(f[1].ofFirst).toBeCloseTo(0.4); expect(f[2].ofPrev).toBeCloseTo(0.25); expect(f[2].lost).toBe(300); expect(funnel([{ label: "z", value: 0 }])[0].ofFirst).toBe(0); });
  it("bump ranks are a permutation per period", () => { const r = bumpRanks([{ name: "a", values: [5, 1, 3] }, { name: "b", values: [3, 4, 3] }, { name: "c", values: [9, 2, 3] }]); expect(r).toEqual([[2, 3, 1], [3, 1, 2], [1, 2, 3]]); for (let t = 0; t < 3; t++) expect(r.map((x) => x[t]).sort()).toEqual([1, 2, 3]); });
  it("marimekko widths sum to 1 and cell areas are value shares", () => { const m = marimekko([{ label: "X", parts: [{ label: "p", value: 30 }, { label: "q", value: 10 }] }, { label: "Y", parts: [{ label: "p", value: 20 }, { label: "q", value: 40 }] }]); expect(m.colWidths.reduce((a, b) => a + b, 0)).toBeCloseTo(1); m.cells.forEach((c) => expect(c.w * c.h).toBeCloseTo(c.value / 100)); expect(m.cells.reduce((a, c) => a + c.w * c.h, 0)).toBeCloseTo(1); });
});
describe("radial maths", () => {
  it("waffle counts always sum to the cell total (largest remainder)", () => { for (const v of [[1, 1, 1], [33, 33, 34], [0.5, 0.3, 0.2], [7, 0, 3], [1]]) expect(waffleCounts(v).reduce((a, b) => a + b, 0)).toBe(100); expect(waffleCounts([1, 1, 1])).toEqual([34, 33, 33]); expect(waffleCounts([0, 0])).toEqual([0, 0]); expect(waffleCounts([1, 2, 3], 10).reduce((a, b) => a + b, 0)).toBe(10); });
  it("ring angles cover the full sweep", () => { const a = ringAngles([1, 1, 2]); expect(a[0].a0).toBe(0); expect(a[2].a1).toBeCloseTo(TAU); expect(a[1].a1 - a[1].a0).toBeCloseTo(TAU / 4); });
  it("rose radius: area-proportional by default", () => { expect(roseRadius(25, 100, 80)).toBeCloseTo(40); expect(roseRadius(25, 100, 80, false)).toBeCloseTo(20); expect(roseRadius(5, 0, 80)).toBe(0); });
  it("hour angle", () => { expect(hourAngle(6)).toBeCloseTo(Math.PI / 2); expect(hourAngle(24)).toBeCloseTo(TAU); });
  it("likert: odd scale centres the neutral; segments tile 100%", () => { const l = likert([10, 20, 40, 20, 10]); expect(l.neg).toBeCloseTo(50); expect(l.pos).toBeCloseTo(50); expect(l.segs[2].x0).toBeCloseTo(-20); expect(l.segs[2].x1).toBeCloseTo(20); expect(l.segs[4].x1).toBeCloseTo(50); expect(l.segs.reduce((a, s) => a + s.pct, 0)).toBeCloseTo(100); const e = likert([25, 25, 25, 25]); expect(e.neg).toBeCloseTo(50); expect(e.segs[2].x0).toBeCloseTo(0); });
  it("nps: promoters minus detractors", () => { const n = nps([10, 9, 9, 8, 7, 6, 0, 3, 10, 9]); expect(n.promoters).toBe(50); expect(n.passives).toBe(20); expect(n.detractors).toBe(30); expect(n.score).toBe(20); expect(nps([]).score).toBe(0); expect(nps([10, 10]).score).toBe(100); expect(nps([0, 5]).score).toBe(-100); });
  it("gauge angle clamps", () => { expect(gaugeAngle(50, 0, 100, -2, 2)).toBe(0); expect(gaugeAngle(500, 0, 100, -2, 2)).toBe(2); expect(gaugeAngle(-5, 0, 100, -2, 2)).toBe(-2); });
});
