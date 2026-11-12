/* Stroke model for the signature pad and drawing canvas. */
import type { Pt } from "./geometry.ts";
export type Stroke = { pts: Pt[]; color: string; width: number; erase?: boolean };
const dist2 = (p: Pt, a: Pt, b: Pt) => { const dx = b.x - a.x, dy = b.y - a.y; const l = dx * dx + dy * dy; const t = l === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l)); return (p.x - a.x - t * dx) ** 2 + (p.y - a.y - t * dy) ** 2; };
/** Ramer-Douglas-Peucker simplification. */
export function simplify(pts: Pt[], eps = 1): Pt[] {
  if (pts.length < 3) return pts; let max = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) { const d = dist2(pts[i], pts[0], pts[pts.length - 1]); if (d > max) { max = d; idx = i; } }
  if (max <= eps * eps) return [pts[0], pts[pts.length - 1]];
  return [...simplify(pts.slice(0, idx + 1), eps).slice(0, -1), ...simplify(pts.slice(idx), eps)];
}
export const inkLength = (s: Stroke[]) => s.filter((x) => !x.erase).reduce((a, st) => a + st.pts.reduce((b, p, i) => (i ? b + Math.hypot(p.x - st.pts[i - 1].x, p.y - st.pts[i - 1].y) : b), 0), 0);
export const pointCount = (s: Stroke[]) => s.reduce((a, st) => a + st.pts.length, 0);
const d = (pts: Pt[]) => pts.map((p, i) => `${i ? "L" : "M"}${Math.round(p.x * 10) / 10} ${Math.round(p.y * 10) / 10}`).join("");
export function strokesToSvg(strokes: Stroke[], w: number, h: number): string {
  const paths = strokes.filter((s) => !s.erase && s.pts.length).map((s) => `<path d="${d(simplify(s.pts, 0.6))}" fill="none" stroke="${s.color}" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${paths.join("")}</svg>`;
}
/** Is the signature substantial enough to accept? */
export const signatureOk = (s: Stroke[], min = 60) => s.length >= 1 && inkLength(s) >= min;
