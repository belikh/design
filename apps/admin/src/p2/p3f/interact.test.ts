import { describe, expect, it } from "vitest";
import { clampRange, indexAtX, keyRange, logFloor, logTicks, panBy, percentChange, pointInPolygon, polygonArea, rangeFromDrag, scalePos, selectInPolygon, thin, zoomBy, type Pt } from "./interact.ts";

describe("zoom domain transforms", () => {
  it("clampRange keeps the window inside the data and at least minSpan wide", () => {
    expect(clampRange([-5, 200], 60)).toEqual([0, 59]); expect(clampRange([30, 30], 60)).toEqual([30, 31]); expect(clampRange([59, 59], 60)).toEqual([58, 59]); expect(clampRange([40, 10], 60)).toEqual([10, 40]); expect(clampRange([0, 3], 1)).toEqual([0, 0]); expect(clampRange([1, 2], 0)).toEqual([0, 0]);
  });
  it("zoomBy halves the span about the pivot and doubles it back, never leaving the data", () => {
    expect(zoomBy([0, 59], 60, 0.5)).toEqual([15, 45]); expect(zoomBy([15, 45], 60, 2)).toEqual([0, 59]); expect(zoomBy([0, 59], 60, 0.5, 0)).toEqual([0, 30]); expect(zoomBy([0, 59], 60, 0.5, 1)).toEqual([29, 59]);
    let r: [number, number] = [0, 59]; for (let i = 0; i < 20; i++) r = zoomBy(r, 60, 0.5); expect(r[1] - r[0] + 1).toBeGreaterThanOrEqual(2); expect(zoomBy([5, 20], 60, 100)).toEqual([0, 59]);
  });
  it("panBy stops at the ends and keeps the width", () => { expect(panBy([10, 19], 60, 5)).toEqual([15, 24]); expect(panBy([10, 19], 60, -50)).toEqual([0, 9]); expect(panBy([10, 19], 60, 500)).toEqual([50, 59]); });
  it("rangeFromDrag maps plot fractions to indices in the current window; a click returns null", () => {
    expect(rangeFromDrag([0, 59], 0.25, 0.75)).toEqual([15, 44]); expect(rangeFromDrag([0, 59], 0.75, 0.25)).toEqual([15, 44]); expect(rangeFromDrag([20, 39], 0, 0.5)).toEqual([20, 30]); expect(rangeFromDrag([0, 59], 0.5, 0.5)).toBeNull(); expect(rangeFromDrag([0, 59], -1, 2)).toEqual([0, 59]);
  });
  it("indexAtX inverts the x scale and clamps", () => { expect(indexAtX(100, 100, 500, [10, 19])).toBe(10); expect(indexAtX(500, 100, 500, [10, 19])).toBe(19); expect(indexAtX(300, 100, 500, [0, 10])).toBe(5); expect(indexAtX(-9, 100, 500, [0, 10])).toBe(0); });
  it("keyRange: plus, minus, arrows, Home, End; unknown keys are ignored", () => {
    expect(keyRange([0, 59], 60, "+")).toEqual([15, 45]); expect(keyRange([15, 45], 60, "-")).toEqual([0, 59]); expect(keyRange([10, 39], 60, "ArrowRight")).toEqual([13, 42]); expect(keyRange([10, 39], 60, "ArrowLeft")).toEqual([7, 36]); expect(keyRange([10, 39], 60, "Home")).toEqual([0, 29]); expect(keyRange([10, 39], 60, "End")).toEqual([30, 59]); expect(keyRange([10, 39], 60, "q")).toBeNull();
  });
});

describe("scales and percent transform", () => {
  it("linear and log positions", () => { expect(scalePos(5, 0, 10, "linear")).toBe(0.5); expect(scalePos(10, 1, 100, "log")).toBeCloseTo(0.5, 12); expect(scalePos(1, 1, 100, "log")).toBe(0); expect(scalePos(100, 1, 100, "log")).toBe(1); expect(scalePos(0, 1, 100, "log")).toBe(0); expect(scalePos(-3, 1, 100, "log")).toBe(0); expect(scalePos(1e6, 1, 100, "log")).toBe(1); expect(scalePos(3, 3, 3, "linear")).toBe(0.5); });
  it("logTicks widen to whole decades; logFloor ignores zero, negative and NaN", () => { expect(logTicks(3, 420)).toEqual({ lo: 1, hi: 1000, ticks: [1, 10, 100, 1000] }); expect(logTicks(10, 10).ticks.length).toBe(2); expect(logFloor([0, -2, 4, 9, NaN])).toBe(4); expect(logFloor([0, -1])).toBe(1); });
  it("percentChange is relative to the first point (or a given base); zero base gives zeros", () => { expect(percentChange([50, 75, 25])).toEqual([0, 50, -50]); expect(percentChange([10, 20], 20)).toEqual([-50, 0]); expect(percentChange([0, 5])).toEqual([0, 0]); expect(percentChange([-10, -5])[1]).toBe(50); expect(percentChange([])).toEqual([]); });
});

describe("polygon hit testing (lasso)", () => {
  const sq: Pt[] = [[0, 0], [10, 0], [10, 10], [0, 10]], L: Pt[] = [[0, 0], [10, 0], [10, 4], [4, 4], [4, 10], [0, 10]];
  it("inside, outside, concave notch", () => { expect(pointInPolygon([5, 5], sq)).toBe(true); expect(pointInPolygon([11, 5], sq)).toBe(false); expect(pointInPolygon([2, 2], L)).toBe(true); expect(pointInPolygon([7, 7], L)).toBe(false); expect(pointInPolygon([2, 8], L)).toBe(true); });
  it("area is orientation independent", () => { expect(polygonArea(sq)).toBe(100); expect(polygonArea([...sq].reverse())).toBe(100); expect(polygonArea(L)).toBe(64); });
  it("selectInPolygon returns indices; degenerate lassos select nothing", () => {
    const pts: Pt[] = [[5, 5], [20, 20], [1, 9], [9.9, 0.1]]; expect(selectInPolygon(pts, sq)).toEqual([0, 2, 3]); expect(selectInPolygon(pts, [[0, 0], [10, 10]])).toEqual([]); expect(selectInPolygon(pts, [[0, 0], [5, 5], [10, 10]])).toEqual([]); expect(selectInPolygon([], sq)).toEqual([]);
  });
  it("thin drops near-duplicate vertices but keeps the first", () => { expect(thin([[0, 0], [1, 0], [2, 0], [5, 0], [5.5, 0], [9, 0]], 3)).toEqual([[0, 0], [5, 0], [9, 0]]); expect(thin([], 3)).toEqual([]); });
});
