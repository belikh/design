/** Pure maths behind `useChartInteractions` (D074): zoom domains, scales, percent transform and polygon hit-testing. */
export type Range = [number, number]; // inclusive index window into the full data domain
export type Pt = [number, number];

/** Clamp an inclusive window to 0..n-1 and keep at least `minSpan` points (2 by default) unless the data itself is shorter. */
export function clampRange([a, b]: Range, n: number, minSpan = 2): Range {
  if (n <= 0) return [0, 0]; const span = Math.min(Math.max(minSpan, 2), n); let lo = Math.round(Math.min(a, b)), hi = Math.round(Math.max(a, b));
  lo = Math.max(0, lo); hi = Math.min(n - 1, hi); if (hi - lo + 1 < span) { hi = Math.min(n - 1, lo + span - 1); lo = Math.max(0, hi - span + 1); } return [lo, hi];
}
/** Zoom by `factor` (below 1 zooms in) about a point given as a 0..1 fraction of the visible window. */
export function zoomBy(r: Range, n: number, factor: number, centre = 0.5, minSpan = 2): Range {
  const span = r[1] - r[0], pivot = r[0] + centre * span, ns = Math.max(minSpan - 1, Math.round(span * factor)); const lo = pivot - centre * ns; return clampRange([lo, lo + ns], n, minSpan);
}
/** Shift the window by `delta` indices, stopping at the ends without changing its width. */
export function panBy(r: Range, n: number, delta: number): Range { const span = r[1] - r[0]; const lo = Math.max(0, Math.min(n - 1 - span, r[0] + Math.round(delta))); return [lo, lo + span]; }
/** New window for a drag between two fractions (0..1) of the plot width. Returns null for a click (less than `minSpan` points selected). */
export function rangeFromDrag(r: Range, f0: number, f1: number, minSpan = 2): Range | null {
  const a = Math.max(0, Math.min(1, Math.min(f0, f1))), b = Math.max(0, Math.min(1, Math.max(f0, f1))), span = r[1] - r[0];
  const lo = r[0] + Math.round(a * span), hi = r[0] + Math.round(b * span); return hi - lo + 1 < minSpan ? null : [lo, hi];
}
/** Index (in the full domain) under a pixel x inside the plot box [l, r]. */
export const indexAtX = (x: number, l: number, r: number, win: Range) => Math.max(win[0], Math.min(win[1], win[0] + Math.round(((x - l) / (r - l || 1)) * (win[1] - win[0]))));
/** Keyboard zoom: + / = zoom in, - zoom out, arrows pan by 10% of the window, Home / End jump to the start / end. Null if the key means nothing. */
export function keyRange(r: Range, n: number, key: string, minSpan = 2): Range | null {
  const step = Math.max(1, Math.round((r[1] - r[0]) * 0.1));
  switch (key) { case "+": case "=": return zoomBy(r, n, 0.5, 0.5, minSpan); case "-": case "_": return zoomBy(r, n, 2, 0.5, minSpan); case "ArrowLeft": return panBy(r, n, -step); case "ArrowRight": return panBy(r, n, step);
    case "Home": return panBy(r, n, -n); case "End": return panBy(r, n, n); default: return null; }
}

export type Scale = "linear" | "log";
export const logFloor = (vals: number[]) => { const p = vals.filter((v) => v > 0 && Number.isFinite(v)); return p.length ? Math.min(...p) : 1; };
/** Position 0..1 of v between lo and hi. Log scale needs lo > 0; values at or below zero clamp to the bottom. */
export function scalePos(v: number, lo: number, hi: number, scale: Scale) {
  if (scale === "linear") return hi === lo ? 0.5 : (v - lo) / (hi - lo); if (v <= 0) return 0; const a = Math.log10(lo), b = Math.log10(hi); return Math.max(0, Math.min(1, (Math.log10(v) - a) / (b - a || 1)));
}
/** Decade ticks (1, 10, 100, ...) covering lo..hi, widened to whole decades; also returns the widened domain. */
export function logTicks(lo: number, hi: number) { const a = Math.floor(Math.log10(Math.max(lo, 1e-12))), b = Math.max(a + 1, Math.ceil(Math.log10(Math.max(hi, 1e-12)))); return { lo: 10 ** a, hi: 10 ** b, ticks: Array.from({ length: b - a + 1 }, (_, k) => 10 ** (a + k)) }; }
/** Percent change relative to a base value (default the first point). A zero base returns zeros rather than infinities. */
export const percentChange = (vals: number[], base = vals[0]) => vals.map((v) => (base ? (100 * (v - base)) / Math.abs(base) : 0));

export function pointInPolygon([x, y]: Pt, poly: Pt[]) { let inside = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside; } return inside; }
export const polygonArea = (poly: Pt[]) => { let a = 0; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1]; return Math.abs(a) / 2; };
/** Indices of points inside a lasso. A polygon with fewer than 3 vertices or (near) zero area selects nothing. */
export const selectInPolygon = (pts: Pt[], poly: Pt[]) => (poly.length < 3 || polygonArea(poly) < 1 ? [] : pts.flatMap((p, i) => (pointInPolygon(p, poly) ? [i] : [])));
/** Drop freehand vertices closer than `minDist` to the previous one (keeps pointer lassos small). */
export const thin = (poly: Pt[], minDist = 3) => poly.filter((p, i) => i === 0 || Math.hypot(p[0] - poly[i - 1][0], p[1] - poly[i - 1][1]) >= minDist);
