import { describe, it, expect } from "vitest";
import { clampView, fitView, nearestEdge, nearestOnSegment, panBy, polygonArea, screenToImage, translatePts, viewBox, zoomAt, bboxOfPts } from "./geometry.ts";
import { CSV_HEADER, SEED_ANNS, defaultShape, fromCoco, fromCsv, insertOnNearestEdge, insertVertex, moveBy, nextId, normalize, parseCsv, removeVertex, seedDoc, setVertex, toCoco, toCsv, type Ann } from "./annotate.ts";

const B = { w: 640, h: 400 };
const poly: Ann = { id: "a1", kind: "polygon", cls: "Fault", note: "", pts: [[10, 10], [110, 10], [110, 60], [10, 60]] };

describe("geometry", () => {
  it("measures boxes, polygons and edges", () => {
    expect(bboxOfPts(poly.pts)).toEqual({ x: 10, y: 10, w: 100, h: 50 }); expect(polygonArea(poly.pts)).toBe(5000); expect(nearestOnSegment([5, 5], [0, 0], [10, 0])).toMatchObject({ point: [5, 0], dist: 5 });
    expect(nearestEdge(poly.pts, [60, 8], true)).toMatchObject({ index: 0, point: [60, 10] }); expect(nearestEdge(poly.pts, [10, 35], true)!.index).toBe(3); expect(nearestEdge(poly.pts, [10, 35], false)!.index).toBe(0); expect(nearestEdge([[0, 0]], [1, 1], false)).toBeNull();
  });
  it("translates without squashing shapes at the image edge", () => {
    expect(translatePts(poly.pts, -50, 0, B)[0]).toEqual([0, 10]); expect(translatePts(poly.pts, -50, 0, B)[1]).toEqual([100, 10]); expect(translatePts(poly.pts, 9999, 9999, B)[2]).toEqual([640, 400]);
  });
  it("zooms about a point and clamps the view", () => {
    expect(viewBox(fitView(B), B)).toEqual({ x: 0, y: 0, w: 640, h: 400 }); const v = zoomAt(fitView(B), B, 2, [100, 100], 0.25, 0.25); const vb = viewBox(v, B); expect(vb.w).toBe(320); expect(vb.x).toBeCloseTo(20); expect(vb.y).toBeCloseTo(50);
    expect(clampView({ zoom: 99, cx: -5, cy: 9999 }, B)).toEqual({ zoom: 8, cx: 40, cy: 375 }); expect(panBy({ zoom: 2, cx: 320, cy: 200 }, B, 1000, 0).cx).toBe(480);
    expect(screenToImage({ zoom: 2, cx: 160, cy: 100 }, B, { left: 10, top: 20, width: 320, height: 200 }, 170, 120)).toEqual([160, 100]); expect(screenToImage(fitView(B), B, { left: 0, top: 0, width: 0, height: 0 }, 7, 9)).toEqual([7, 9]);
  });
});

describe("annotation operations", () => {
  it("normalises boxes (any corner order, min size, inside image)", () => {
    expect(normalize({ id: "a", kind: "box", cls: "x", note: "", pts: [[100, 90], [20, 10]] }, B).pts).toEqual([[20, 10], [100, 90]]); expect(normalize({ id: "a", kind: "box", cls: "x", note: "", pts: [[639, 399], [900, 900]] }, B).pts).toEqual([[638, 398], [640, 400]]);
    expect(normalize({ ...poly, pts: [[-5, 3], [700, 3], [5, 500]] }, B).pts).toEqual([[0, 3], [640, 3], [5, 400]]);
  });
  it("moves shapes and vertices", () => {
    expect(moveBy(poly, 5, 5, B).pts[0]).toEqual([15, 15]); expect(setVertex(poly, 2, [200, 90], B).pts[2]).toEqual([200, 90]); expect(setVertex(poly, 9, [1, 1], B)).toBe(poly);
    const box: Ann = { id: "b", kind: "box", cls: "x", note: "", pts: [[10, 10], [50, 50]] }; expect(setVertex(box, 1, [80, 70], B).pts).toEqual([[10, 10], [80, 70]]);
  });
  it("inserts and removes vertices within limits", () => {
    expect(insertVertex(poly, 0, undefined, B).pts[1]).toEqual([60, 10]); expect(insertVertex(poly, 3, undefined, B).pts[4]).toEqual([10, 35]); expect(insertVertex({ ...poly, kind: "polyline" }, 3, undefined, B).pts[4]).toEqual([30, 80]);
    expect(removeVertex(poly, 1)!.pts).toHaveLength(3); expect(removeVertex({ ...poly, pts: poly.pts.slice(0, 3) }, 1)).toBeNull(); expect(removeVertex(SEED_ANNS[0], 0)).toBeNull();
    expect(insertOnNearestEdge(poly, [60, 12], B)).toMatchObject({ index: 1 }); expect(insertOnNearestEdge(SEED_ANNS[2], [1, 1], B)).toBeNull(); expect(insertVertex(SEED_ANNS[0], 0, undefined, B)).toBe(SEED_ANNS[0]);
  });
  it("creates default shapes inside the image and unique ids", () => {
    for (const k of ["box", "point", "polygon", "polyline"] as const) { const p = defaultShape(k, [5, 5], B); expect(p.every(([x, y]) => x >= 0 && y >= 0)).toBe(true); }
    expect(defaultShape("polygon", [320, 200], B)).toHaveLength(3); expect(nextId(SEED_ANNS)).toBe("a6"); expect(nextId([])).toBe("a1");
  });
});

describe("COCO export and import", () => {
  const doc = seedDoc();
  it("exports images, categories and annotations", () => {
    const j = JSON.parse(toCoco(doc)); expect(j.images[0]).toMatchObject({ width: 640, height: 400, file_name: "rack-front.svg" }); expect(j.categories.map((c: { name: string }) => c.name)).toEqual(["Device", "Cable", "Fault", "Label"]);
    expect(j.annotations).toHaveLength(5); expect(j.annotations[0]).toMatchObject({ category_id: 1, bbox: [70, 52, 230, 40], area: 9200, segmentation: [[70, 52, 300, 52, 300, 92, 70, 92]] }); expect(j.annotations[2].keypoints).toEqual([318, 152, 2]); expect(j.annotations[3].segmentation).toEqual([]);
  });
  it("round-trips every kind", () => {
    const r = fromCoco(toCoco(doc), { w: 640, h: 400 }); if (!r.ok) throw new Error(r.error); expect(r.anns.map((a) => ({ ...a, id: "" }))).toEqual(doc.anns.map((a) => ({ ...a, id: "" }))); expect(r.classes).toEqual(doc.classes); expect(r.warnings).toEqual([]); expect(r.image).toEqual({ name: "rack-front.svg", w: 640, h: 400 });
  });
  it("reads plain COCO (bbox, segmentation, keypoints) and warns about problems", () => {
    const plain = { images: [{ file_name: "a.png", width: 100, height: 100 }], categories: [{ id: 7, name: "cat" }], annotations: [{ category_id: 7, bbox: [10, 10, 50, 50] }, { category_id: 7, segmentation: [[0, 0, 200, 0, 50, 90]] }, { category_id: 7, keypoints: [5, 5, 2] }, { category_id: 9 }] };
    const r = fromCoco(JSON.stringify(plain), { w: 640, h: 400 }); if (!r.ok) throw new Error(r.error); expect(r.anns.map((a) => a.kind)).toEqual(["box", "polygon", "point"]); expect(r.anns[1].pts[1]).toEqual([200, 0]); expect(r.warnings.join(" ")).toMatch(/Skipped annotation 4.*100 × 100/);
    const small = fromCoco(JSON.stringify(plain), { w: 100, h: 100 }); if (!small.ok) throw new Error(); expect(small.anns[1].pts[1]).toEqual([100, 0]); expect(small.warnings.join(" ")).toMatch(/moved to fit/);
  });
  it("rejects bad input", () => { expect(fromCoco("{", B).ok).toBe(false); expect(fromCoco("[]", B).ok).toBe(false); expect(fromCoco('{"annotations":{}}', B).ok).toBe(false); });
});

describe("CSV", () => {
  it("quotes cells and neutralises spreadsheet formulas", () => {
    const a: Ann = { id: "a1", kind: "point", cls: "Fault", note: 'say "hi", ok\nline2', pts: [[1, 2]] }; const c = toCsv([a, { ...a, id: "a2", note: "=SUM(A1)" }]);
    expect(c.split("\r\n")[0]).toBe(CSV_HEADER.join(",")); expect(c).toContain('"say ""hi"", ok\nline2"'); expect(c).toContain("'=SUM(A1)");
    expect(parseCsv(c)![1][3]).toBe('say "hi", ok\nline2'); expect(parseCsv('a,"b')).toBeNull(); expect(parseCsv("a,b\n\n1,2")).toEqual([["a", "b"], ["1", "2"]]);
  });
  it("round-trips every kind, adding unknown classes", () => {
    const r = fromCsv(toCsv(seedDoc().anns), B, ["Device"]); if (!r.ok) throw new Error(r.error); expect(r.anns.map((a) => ({ ...a, id: "" }))).toEqual(seedDoc().anns.map((a) => ({ ...a, id: "" }))); expect(r.classes).toEqual(["Device", "Fault", "Cable", "Label"].sort((a, b) => ["Device", "Fault", "Cable", "Label"].indexOf(a) - ["Device", "Fault", "Cable", "Label"].indexOf(b)));
    const n = fromCsv(toCsv([{ id: "a1", kind: "point", cls: "X", note: "=1+1", pts: [[1, 2]] }]), B, []); if (!n.ok) throw new Error(); expect(n.anns[0].note).toBe("=1+1");
  });
  it("rejects bad files and skips bad rows", () => {
    expect(fromCsv("a,b\n1,2", B, []).ok).toBe(false); const r = fromCsv("kind,points\nbox,1 1;5 5\nstar,1 1\npolygon,1 1;2 2", B, []); if (!r.ok) throw new Error(); expect(r.anns).toHaveLength(1); expect(r.warnings).toHaveLength(2); expect(fromCsv("kind,points\nstar,1 1", B, []).ok).toBe(false);
  });
});
