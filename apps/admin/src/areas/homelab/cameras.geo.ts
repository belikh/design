/** Zone geometry in percent of the frame (0..100). Rectangles use x/y/w/h; polygons carry `points` and keep x/y/w/h as their bounding box. */
export type Pt = [number, number];
export type Geo = { shape: "rect" | "polygon"; x: number; y: number; w: number; h: number; points: Pt[] };
export const MIN = 4;
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const r1 = (v: number) => Math.round(v * 10) / 10;
export const bbox = (p: Pt[]) => { const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]); const x = Math.min(...xs), y = Math.min(...ys); return { x: r1(x), y: r1(y), w: r1(Math.max(...xs) - x), h: r1(Math.max(...ys) - y) }; };
export const outline = (z: Geo): Pt[] => (z.shape === "polygon" && z.points.length >= 3 ? z.points : [[z.x, z.y], [z.x + z.w, z.y], [z.x + z.w, z.y + z.h], [z.x, z.y + z.h]]);
export const withPoints = <T extends Geo>(z: T, points: Pt[]): T => ({ ...z, shape: "polygon", points: points.map(([a, b]) => [r1(clamp(a, 0, 100)), r1(clamp(b, 0, 100))] as Pt), ...bbox(points.map(([a, b]) => [clamp(a, 0, 100), clamp(b, 0, 100)] as Pt)) });
const shift = <T extends Geo>(z: T, dx: number, dy: number): T => (z.shape === "polygon" ? withPoints(z, z.points.map(([a, b]) => [a + dx, b + dy] as Pt)) : { ...z, x: r1(z.x + dx), y: r1(z.y + dy) });
/** Move a whole zone; it stops at the frame edge instead of changing size. */
export const moveZone = <T extends Geo>(z: T, dx: number, dy: number): T => shift(z, clamp(dx, -z.x, 100 - z.x - z.w), clamp(dy, -z.y, 100 - z.y - z.h));
/** Resize from the top-left corner: rectangles change w/h, polygons scale their points. Never smaller than MIN or outside the frame. */
export function resizeZone<T extends Geo>(z: T, dw: number, dh: number): T {
  const w = clamp(z.w + dw, MIN, 100 - z.x), h = clamp(z.h + dh, MIN, 100 - z.y);
  if (z.shape !== "polygon") return { ...z, w: r1(w), h: r1(h) };
  return withPoints(z, z.points.map(([a, b]) => [z.x + ((a - z.x) * w) / Math.max(z.w, 0.1), z.y + ((b - z.y) * h) / Math.max(z.h, 0.1)] as Pt));
}
export type Handle = "nw" | "ne" | "sw" | "se";
/** Drag one corner of a rectangle to (px, py); the opposite corner stays put. */
export function dragCorner<T extends Geo>(z: T, h: Handle, px: number, py: number): T {
  /** One axis: fixed edge f, moving edge at m; keep at least MIN apart and inside 0..100. */
  const axis = (f: number, m: number): [number, number] => { let e = clamp(m, 0, 100); if (Math.abs(e - f) < MIN) { e = clamp(f + (m >= f ? MIN : -MIN), 0, 100); if (Math.abs(e - f) < MIN) e = f + (e > f ? -MIN : MIN); } return [Math.min(f, e), Math.max(f, e)]; };
  const [x0, x1] = axis(h.includes("w") ? z.x + z.w : z.x, px), [y0, y1] = axis(h.includes("n") ? z.y + z.h : z.y, py);
  return { ...z, x: r1(x0), y: r1(y0), w: r1(x1 - x0), h: r1(y1 - y0) };
}
export const rectBetween = (a: Pt, b: Pt): Pick<Geo, "x" | "y" | "w" | "h"> => { const x = clamp(Math.min(a[0], b[0]), 0, 100), y = clamp(Math.min(a[1], b[1]), 0, 100); return { x: r1(x), y: r1(y), w: r1(clamp(Math.abs(a[0] - b[0]), 0, 100 - x)), h: r1(clamp(Math.abs(a[1] - b[1]), 0, 100 - y)) }; };
export const toPolygon = <T extends Geo>(z: T): T => (z.shape === "polygon" ? z : withPoints(z, outline(z)));
export const toRect = <T extends Geo>(z: T): T => ({ ...z, shape: "rect", points: [] });
export const moveVertex = <T extends Geo>(z: T, i: number, px: number, py: number): T => withPoints(z, z.points.map((p, k) => (k === i ? ([px, py] as Pt) : p)));
export const nudgeVertex = <T extends Geo>(z: T, i: number, dx: number, dy: number): T => moveVertex(z, i, z.points[i][0] + dx, z.points[i][1] + dy);
/** A polygon needs at least three corners. */
export const removeVertex = <T extends Geo>(z: T, i: number): T => (z.points.length <= 3 ? z : withPoints(z, z.points.filter((_, k) => k !== i)));
/** Add a corner at the midpoint of the edge after corner i. */
export const insertVertex = <T extends Geo>(z: T, i: number): T => { const a = z.points[i], b = z.points[(i + 1) % z.points.length]; const p = [...z.points]; p.splice(i + 1, 0, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]); return withPoints(z, p); };
export function inside(z: Geo, [px, py]: Pt) {
  const p = outline(z); let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c; } return c;
}
export const pathOf = (z: Geo, sx = 4, sy = 2.25) => `M${outline(z).map(([a, b]) => `${r1(a * sx)} ${r1(b * sy)}`).join("L")}Z`;
export const describeGeo = (z: Geo) => (z.shape === "polygon" ? `polygon, ${z.points.length} corners, x ${Math.round(z.x)} y ${Math.round(z.y)}, ${Math.round(z.w)} by ${Math.round(z.h)} percent` : `rectangle, x ${Math.round(z.x)} y ${Math.round(z.y)}, ${Math.round(z.w)} by ${Math.round(z.h)} percent`);
/** What an arrow key does to a selected zone: plain = move, Shift = resize (right/down grow). Ctrl = 5x step. */
const ARROWS: Record<string, Pt> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
export function keyEdit<T extends Geo>(z: T, key: string, o: { shift: boolean; ctrl: boolean }): T | null {
  const u = ARROWS[key]; if (!u) return null; const d = o.ctrl ? 5 : 1; return o.shift ? resizeZone(z, u[0] * d, u[1] * d) : moveZone(z, u[0] * d, u[1] * d);
}
export const arrowStep = (key: string, ctrl: boolean): Pt | null => { const u = ARROWS[key]; return u ? [u[0] * (ctrl ? 5 : 1), u[1] * (ctrl ? 5 : 1)] : null; };
