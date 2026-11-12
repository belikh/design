/** Pure geometry for the image annotator: points, shapes, view (zoom and pan) maths. Coordinates are image pixels. */
export type Pt = [number, number];
export type Bounds = { w: number; h: number };
export type Box = { x: number; y: number; w: number; h: number };

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const round2 = (v: number) => Math.round(v * 100) / 100;
export const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export const bboxOfPts = (pts: Pt[]): Box => {
  if (!pts.length) return { x: 0, y: 0, w: 0, h: 0 };
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
};
/** Shoelace area of a closed polygon (always positive). */
export const polygonArea = (pts: Pt[]): number => { let s = 0; for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]; s += x1 * y2 - x2 * y1; } return Math.abs(s) / 2; };

/** Closest point on segment ab to p, with the distance. */
export function nearestOnSegment(p: Pt, a: Pt, b: Pt): { point: Pt; dist: number; t: number } {
  const dx = b[0] - a[0], dy = b[1] - a[1]; const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2, 0, 1);
  const point: Pt = [a[0] + t * dx, a[1] + t * dy]; return { point, dist: dist(p, point), t };
}

/** The edge of a polyline/polygon nearest to p: `index` is the vertex the new point goes AFTER. */
export function nearestEdge(pts: Pt[], p: Pt, closed: boolean): { index: number; point: Pt; dist: number } | null {
  let best: { index: number; point: Pt; dist: number } | null = null;
  const n = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) { const r = nearestOnSegment(p, pts[i], pts[(i + 1) % pts.length]); if (!best || r.dist < best.dist) best = { index: i, point: r.point, dist: r.dist }; }
  return best;
}

/** Shift points by (dx, dy), limiting the shift so the shape stays inside the image (the shape is never squashed). */
export function translatePts(pts: Pt[], dx: number, dy: number, b: Bounds): Pt[] {
  const bb = bboxOfPts(pts);
  const ddx = clamp(dx, -bb.x, b.w - (bb.x + bb.w)), ddy = clamp(dy, -bb.y, b.h - (bb.y + bb.h));
  return pts.map(([x, y]) => [round2(x + ddx), round2(y + ddy)] as Pt);
}
export const clampPt = (p: Pt, b: Bounds): Pt => [round2(clamp(p[0], 0, b.w)), round2(clamp(p[1], 0, b.h))];

/** View: zoom (1 = whole image) and the image point at the centre of the viewport. */
export type View = { zoom: number; cx: number; cy: number };
export const MIN_ZOOM = 1, MAX_ZOOM = 8;
export function clampView(v: View, b: Bounds): View {
  const zoom = clamp(v.zoom, MIN_ZOOM, MAX_ZOOM); const vw = b.w / zoom, vh = b.h / zoom;
  return { zoom, cx: clamp(v.cx, vw / 2, b.w - vw / 2), cy: clamp(v.cy, vh / 2, b.h - vh / 2) };
}
export const fitView = (b: Bounds): View => ({ zoom: 1, cx: b.w / 2, cy: b.h / 2 });
export function viewBox(v: View, b: Bounds): { x: number; y: number; w: number; h: number } {
  const c = clampView(v, b); const w = b.w / c.zoom, h = b.h / c.zoom; return { x: c.cx - w / 2, y: c.cy - h / 2, w, h };
}
/** Client (screen) point to image point, for an element whose rect is `rect` showing `viewBox(v, b)` (same aspect ratio). */
export function screenToImage(v: View, b: Bounds, rect: { left: number; top: number; width: number; height: number }, cx: number, cy: number): Pt {
  const vb = viewBox(v, b); const rw = rect.width || vb.w, rh = rect.height || vb.h;
  return [vb.x + ((cx - rect.left) / rw) * vb.w, vb.y + ((cy - rect.top) / rh) * vb.h];
}
/** Zoom to `zoom` keeping the image point `at` fixed under the same screen position. `fx`/`fy` is that position as a fraction of the viewport. */
export function zoomAt(v: View, b: Bounds, zoom: number, at: Pt, fx: number, fy: number): View {
  const z = clamp(zoom, MIN_ZOOM, MAX_ZOOM); const vw = b.w / z, vh = b.h / z;
  return clampView({ zoom: z, cx: at[0] - (fx - 0.5) * vw, cy: at[1] - (fy - 0.5) * vh }, b);
}
export const panBy = (v: View, b: Bounds, dx: number, dy: number): View => clampView({ ...v, cx: v.cx + dx, cy: v.cy + dy }, b);
/** Change zoom keeping the current centre. */
export const setZoomKeepCentre = (v: View, b: Bounds, zoom: number): View => clampView({ ...v, zoom }, b);
