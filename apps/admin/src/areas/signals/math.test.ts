import { describe, expect, it } from "vitest";
import { ageingBuckets, bridgeSteps, budgetVariance, candleGeom, candleValid, controlLimits, controlSignals, depthCurves, errorStats, mean, stdev } from "./finance.ts";
import { COMPASS16, declination, parallelNormalise, polarAreaWedges, polarPoint, radarVertices, sunPath, sunPosition, windRose } from "./polar.ts";
import { layoutCloud, sizeScale } from "./wordcloud.ts";
import { bandAt, comfortFraction, socSeries, stack, tariffCost } from "./energy.ts";
import { dftMagnitude, evm, histogram8, packMarkers, qam16, spectrogram, waterfallLines, waveformEnvelope } from "./signal.ts";
import { chainSegments, isClosed, iso, marchingSquares, sampleField, surfaceLines } from "./contour.ts";
import { forecast, linearFit, poolUsable, smartMargin, smartState } from "./storage.ts";
import { asciiChart, asciiSpark, breaches, crossFilter, logPos, pointInPolygon, toPercent } from "./features.ts";

describe("D060 candlestick, depth, control, error bars", () => {
  const y = (v: number) => 100 - v; // value 0..100 -> y 100..0
  it("candle body spans open..close and wick spans low..high", () => {
    const g = candleGeom({ t: "a", o: 40, h: 70, l: 30, c: 60 }, y);
    expect(g.up).toBe(true); expect(g.bodyTop).toBe(40); expect(g.bodyH).toBe(20); expect(g.wickTop).toBe(30); expect(g.wickBottom).toBe(70);
    const d = candleGeom({ t: "b", o: 60, h: 70, l: 30, c: 40 }, y); expect(d.up).toBe(false); expect(d.bodyTop).toBe(40); expect(d.bodyH).toBe(20);
    expect(candleGeom({ t: "c", o: 50, h: 50, l: 50, c: 50 }, y).bodyH).toBe(1);
    expect(candleValid({ t: "x", o: 5, h: 4, l: 1, c: 2 })).toBe(false);
  });
  it("depth is cumulative, bids descending and asks ascending", () => {
    const d = depthCurves([{ p: 99, q: 2 }, { p: 98, q: 3 }, { p: 100, q: 1 }], [{ p: 102, q: 4 }, { p: 101, q: 1 }]);
    expect(d.bids.map((b) => b.p)).toEqual([100, 99, 98]); expect(d.bids.map((b) => b.cum)).toEqual([1, 3, 6]); expect(d.asks.map((a) => a.cum)).toEqual([1, 5]);
  });
  it("control limits are mean ± 3 sigma", () => {
    const v = [10, 12, 10, 12, 10, 12, 10, 12]; const l = controlLimits(v);
    expect(l.mean).toBe(11); expect(l.sigma).toBeCloseTo(1); expect(l.ucl).toBeCloseTo(14); expect(l.lcl).toBeCloseTo(8); expect(mean(v)).toBe(11); expect(stdev(v)).toBeCloseTo(1);
  });
  it("signals: a point outside the limits and a run of 7 on one side", () => {
    const lim = { mean: 0, sigma: 1, ucl: 3, lcl: -3, uwl: 2, lwl: -2 };
    expect(controlSignals([0, 1, 5, -1, -4], lim)).toEqual([2, 4]); expect(controlSignals([1, 1, 1, 1, 1, 1, 1, -1], lim)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
  it("error stats: sd, se and 95% interval", () => {
    const e = errorStats([2, 4, 4, 4, 5, 5, 7, 9]); expect(e.mean).toBe(5); expect(e.sd).toBeCloseTo(2.138, 2); expect(e.hi - e.lo).toBeCloseTo(2 * 1.96 * e.se); expect(errorStats([3]).sd).toBe(0);
  });
});
describe("D066 budget variance, ageing, bridge", () => {
  it("favourable depends on cost vs revenue", () => {
    const [a, b] = budgetVariance([{ label: "r", budget: 100, actual: 110, kind: "revenue" }, { label: "c", budget: 100, actual: 110, kind: "cost" }]);
    expect(a.variance).toBe(10); expect(a.favourable).toBe(true); expect(b.favourable).toBe(false); expect(a.pct).toBeCloseTo(0.1);
  });
  it("ageing buckets sum to the total and edges land in the right bucket", () => {
    const inv = [{ due: 100, amount: 5 }, { due: 90, amount: 7 }, { due: 70, amount: 11 }, { due: 40, amount: 13 }, { due: 20, amount: 3 }, { due: 5, amount: 17 }, { due: 130, amount: 19 }].map((x, i) => ({ id: `${i}`, customer: "c", ...x }));
    const b = ageingBuckets(inv, 100); expect(b.map((x) => x.amount)).toEqual([19 + 5, 7 + 11, 13, 3, 17]); expect(b.reduce((a, x) => a + x.amount, 0)).toBe(75); expect(b.reduce((a, x) => a + x.count, 0)).toBe(7);
  });
  it("bridge: opening + deltas = closing", () => {
    const s = bridgeSteps([{ label: "open", value: 100, total: true }, { label: "in", value: 50 }, { label: "out", value: -30 }, { label: "close", value: 0, total: true }]);
    expect(s[1].from).toBe(100); expect(s[1].to).toBe(150); expect(s[2].to).toBe(120); expect(s[3].to).toBe(120);
  });
});
describe("D061 polar", () => {
  it("polarPoint: north is up, east is right", () => { const n = polarPoint(0, 0, 10, 0), e = polarPoint(0, 0, 10, 90); expect(n[0]).toBeCloseTo(0); expect(n[1]).toBeCloseTo(-10); expect(e[0]).toBeCloseTo(10); expect(e[1]).toBeCloseTo(0); });
  it("radar vertices of a square at full scale", () => {
    const v = radarVertices([10, 10, 10, 10], 10, 0, 0, 5); expect(v[0][1]).toBeCloseTo(-5); expect(v[1][0]).toBeCloseTo(5); expect(v[2][1]).toBeCloseTo(5); expect(v[3][0]).toBeCloseTo(-5);
    expect(radarVertices([5], 10, 0, 0, 10)[0][1]).toBeCloseTo(-5); expect(radarVertices([20], 10, 0, 0, 10)[0][1]).toBeCloseTo(-10);
  });
  it("polar area radius is the square root of value", () => { const w = polarAreaWedges([4, 1], 0, 0, 100); expect(w[0].r).toBe(100); expect(w[1].r).toBeCloseTo(50); });
  it("parallel coordinates normalise to 0..1 and invert", () => { const p = parallelNormalise([[0, 10], [10, 20]], [false, true]); expect(p.rows).toEqual([[0, 1], [1, 0]]); });
});
describe("D064 wind rose and sun path", () => {
  it("wind rose frequencies sum to 100 with calm", () => {
    const s = [{ dir: 0, speed: 3 }, { dir: 355, speed: 3 }, { dir: 90, speed: 8 }, { dir: 180, speed: 0.1 }]; const r = windRose(s, [1, 5, 10], 16);
    expect(r.freq[0][0]).toBe(50); expect(r.freq[4][1]).toBe(25); expect(r.calm).toBe(25); expect(r.freq.flat().reduce((a, b) => a + b, 0) + r.calm).toBeCloseTo(100); expect(COMPASS16).toHaveLength(16);
  });
  it("sun altitude at noon is 90 - latitude + declination", () => {
    expect(declination(80)).toBeCloseTo(0, 0); expect(sunPosition(0, 80, 12).alt).toBeGreaterThan(88);
    const sol = sunPosition(50, 172, 12); expect(sol.alt).toBeCloseTo(90 - 50 + declination(172), 3); expect(sol.az).toBeCloseTo(180, 0);
    expect(sunPosition(50, 172, 6).az).toBeLessThan(120); expect(sunPosition(50, 172, 18).az).toBeGreaterThan(240);
    expect(sunPath(50, 355).length).toBeLessThan(sunPath(50, 172).length);
  });
});
describe("D062 word cloud", () => {
  const words = Array.from({ length: 40 }, (_, i) => ({ text: `word${i}${"x".repeat(i % 6)}`, weight: 100 - i * 2 }));
  it("placements stay inside the box and never overlap", () => {
    const { placed, skipped } = layoutCloud(words, 600, 320);
    expect(placed.length + skipped.length).toBe(40); expect(placed.length).toBeGreaterThan(20);
    for (const a of placed) { expect(a.x).toBeGreaterThanOrEqual(0); expect(a.x + a.w).toBeLessThanOrEqual(600); expect(a.y + a.h).toBeLessThanOrEqual(320); }
    for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) { const a = placed[i], b = placed[j]; expect(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y).toBe(true); }
  });
  it("heavier words are larger; empty input is fine", () => { const s = sizeScale([1, 10, 100], 10, 40); expect(s(100)).toBe(40); expect(s(1)).toBe(10); expect(s(10)).toBeCloseTo(25); expect(layoutCloud([], 100, 100).placed).toEqual([]); });
});
describe("D063 energy", () => {
  const bands = [{ from: 0, to: 7, rate: 0.1, name: "off" }, { from: 7, to: 23, rate: 0.3, name: "day" }, { from: 23, to: 0, rate: 0.1, name: "off" }];
  it("band lookup wraps midnight", () => { expect(bandAt(bands, 3)?.rate).toBe(0.1); expect(bandAt(bands, 12)?.rate).toBe(0.3); expect(bandAt(bands, 23)?.rate).toBe(0.1); });
  it("tariff cost equals the sum of kWh × rate", () => { const t = tariffCost(new Array(24).fill(1), bands); expect(t.kwh).toBe(24); expect(t.cost).toBeCloseTo(8 * 0.1 + 16 * 0.3); });
  it("state of charge clamps to 0..capacity and applies efficiency", () => {
    const s = socSeries([10, 10, -50, 5], 20, 5, 0.5); expect(s[1]).toBe(10); expect(s[2]).toBe(15); expect(s[3]).toBe(0); expect(s[4]).toBeCloseTo(2.5);
    expect(socSeries([100], 20, 0)[1]).toBe(20);
  });
  it("comfort fraction and stack", () => { expect(comfortFraction([{ t: 21, rh: 50 }, { t: 30, rh: 50 }], { tLo: 18, tHi: 24, rhLo: 30, rhHi: 60 })).toBe(0.5); expect(stack([[1, 2], [3, 4]])[1].top).toEqual([4, 6]); });
});
describe("D065 and D067 signal", () => {
  it("a pure tone peaks in its own DFT bin", () => {
    const x = Array.from({ length: 64 }, (_, i) => Math.sin((2 * Math.PI * 8 * i) / 64)); const m = dftMagnitude(x, 32); expect(m.indexOf(Math.max(...m))).toBe(8);
    const sp = spectrogram([...x, ...x], 64, 32, 32); expect(sp).toHaveLength(3); expect(sp[0].indexOf(Math.max(...sp[0]))).toBe(8);
  });
  it("waterfall rows are ordered back to front and fit the box", () => {
    const l = waterfallLines([[0, 1], [0, 1], [0, 1]], 100, 100, 40, 20); expect(l).toHaveLength(3); expect(l[0][0][1]).toBeLessThan(l[2][0][1]); expect(l[2][1][1]).toBe(80); expect(l[0][0][0]).toBeGreaterThan(l[2][0][0]);
  });
  it("16-QAM has 16 distinct points; EVM is 0 for ideal and grows with noise", () => {
    const q = qam16(); expect(new Set(q.map((p) => `${p.i},${p.q}`)).size).toBe(16); expect(evm(q)).toBe(0);
    const noisy = q.map((p) => ({ i: p.i + 0.3, q: p.q })); expect(evm(noisy)).toBeCloseTo(0.3 / Math.sqrt(10), 5);
  });
  it("waveform envelope takes min/max per bucket", () => { expect(waveformEnvelope([0, 1, -1, 0.5, 0.2, -0.4], 3)).toEqual([{ min: 0, max: 1 }, { min: -1, max: 0.5 }, { min: -0.4, max: 0.2 }]); });
  it("histogram conserves the count and bins the extremes", () => { const h = histogram8([0, 255, 128, 128, 64], 4); expect(h).toEqual([1, 1, 2, 1]); });
  it("markers in the same window get different rows", () => { const p = packMarkers([{ at: 10, label: "a", kind: "x" }, { at: 11, label: "b", kind: "x" }, { at: 30, label: "c", kind: "x" }], 5); expect(p.map((m) => m.row)).toEqual([0, 1, 0]); });
});
describe("D068 contour and surface", () => {
  const n = 41, f = sampleField(n, (x, y) => x * x + y * y), r2 = 0.3;
  it("marching squares on a paraboloid gives one closed loop at the right radius", () => {
    const segs = marchingSquares(f, r2); expect(segs.length).toBeGreaterThan(20);
    const lines = chainSegments(segs); expect(lines).toHaveLength(1); expect(isClosed(lines[0])).toBe(true);
    for (const [gx, gy] of lines[0]) { const x = (2 * gx) / (n - 1) - 1, y = (2 * gy) / (n - 1) - 1; expect(Math.hypot(x, y)).toBeCloseTo(Math.sqrt(r2), 1); }
  });
  it("no crossing, no segments; a level outside the field gives nothing", () => { expect(marchingSquares(f, 10)).toEqual([]); expect(marchingSquares([], 1)).toEqual([]); });
  it("saddle cell emits two segments", () => { expect(marchingSquares([[1, 0], [0, 1]], 0.5)).toHaveLength(2); });
  it("iso projection and wireframe size", () => { expect(iso(0, 0, 0)).toEqual([0, 0]); expect(iso(1, 1, 0)[0]).toBeCloseTo(0); expect(iso(0, 0, 5)[1]).toBe(-5); const w = surfaceLines(sampleField(5, () => 0), 10, 10); expect(w.rows).toHaveLength(5); expect(w.cols[0]).toHaveLength(5); });
});
describe("D069 storage", () => {
  it("linear fit and forecast recover y = 10 + 2x", () => {
    const y = Array.from({ length: 10 }, (_, i) => 10 + 2 * i); const f = linearFit(y); expect(f.slope).toBeCloseTo(2); expect(f.intercept).toBeCloseTo(10);
    const fc = forecast(y, 3, 50); expect(fc.ahead).toEqual([expect.closeTo(30), expect.closeTo(32), expect.closeTo(34)]); expect(fc.toFull).toBeCloseTo(11);
    expect(forecast([5, 5, 5], 2, 10).toFull).toBeNull(); expect(forecast([], 2).ahead).toHaveLength(2);
  });
  it("pool capacity by level", () => {
    const d = [4, 4, 4, 8]; expect(poolUsable(d, "stripe")?.usableTb).toBe(16); expect(poolUsable(d, "raid5")?.usableTb).toBe(12); expect(poolUsable(d, "raid6")?.usableTb).toBe(8); expect(poolUsable(d, "mirror")?.tolerates).toBe(3);
    expect(poolUsable([4, 4], "raid5")).toBeNull();
  });
  it("SMART margin and state", () => { expect(smartMargin(100, 10)).toBe(1); expect(smartMargin(10, 10)).toBe(0); expect(smartState(100, 10)).toBe("ok"); expect(smartState(20, 10)).toBe("warn"); expect(smartState(9, 10)).toBe("fail"); });
});
describe("D074 features", () => {
  it("ASCII sparkline maps a ramp onto the eight blocks", () => { expect(asciiSpark([0, 1, 2, 3, 4, 5, 6, 7])).toBe("▁▂▃▄▅▆▇█"); expect(asciiSpark([5, 5])).toBe("▄▄"); expect(asciiSpark([])).toBe(""); expect(asciiSpark([0, 7], 4)).toBe("▁▁██"); });
  it("ASCII chart rows: a full column is full blocks, a half column fills the bottom", () => {
    const c = asciiChart([0, 8, 16], 2); expect(c).toEqual(["  █", " ██"]); expect(asciiChart([4, 8], 1)).toEqual(["▄█"]);
  });
  it("point in polygon", () => { const sq: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10]]; expect(pointInPolygon(5, 5, sq)).toBe(true); expect(pointInPolygon(11, 5, sq)).toBe(false); });
  it("percent conversion sums to 100; log position", () => { const p = toPercent([[1, 2], [3, 2]]); expect(p[0][0] + p[1][0]).toBeCloseTo(100); expect(p[0][1]).toBe(50); expect(logPos(10, 1, 100)).toBeCloseTo(0.5); expect(logPos(0, 1, 100)).toBe(0); });
  it("breaches group runs once with the peak", () => {
    const b = breaches([1, 5, 6, 1, 7, 9], [{ from: 5, to: 8, level: "warn", label: "w" }, { from: 8, to: 99, level: "danger", label: "d" }]);
    expect(b.map((x) => [x.band.label, x.start, x.end, x.peak])).toEqual([["w", 1, 2, 6], ["w", 4, 4, 7], ["d", 5, 5, 9]]);
  });
  it("cross filter keeps matching rows only", () => { const r = [{ a: "x", b: 1 }, { a: "y", b: 1 }, { a: "x", b: 2 }]; expect(crossFilter(r, { a: "x" })).toHaveLength(2); expect(crossFilter(r, { a: "x", b: 2 })).toHaveLength(1); expect(crossFilter(r, {})).toHaveLength(3); });
});
