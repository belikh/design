/* Geometry, easing, waveform, and sun helpers (pure). */
export type Pt = { x: number; y: number };
export const polygonArea = (p: Pt[]): number => Math.abs(p.reduce((a, q, i) => { const n = p[(i + 1) % p.length]; return a + (q.x * n.y - n.x * q.y); }, 0)) / 2;
export const perimeter = (p: Pt[], closed = true): number => p.reduce((a, q, i) => (i === p.length - 1 && !closed ? a : a + Math.hypot(p[(i + 1) % p.length].x - q.x, p[(i + 1) % p.length].y - q.y)), 0);
export function pointInPolygon(pt: Pt, poly: Pt[]): boolean { let inside = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if (a.y > pt.y !== b.y > pt.y && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) inside = !inside; } return inside; }
export type Box = { x: number; y: number; w: number; h: number };
export const normBox = (a: Pt, b: Pt): Box => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) });
export const clampBox = (b: Box, w: number, h: number): Box => { const x = Math.max(0, Math.min(b.x, w)), y = Math.max(0, Math.min(b.y, h)); return { x, y, w: Math.max(0, Math.min(b.w, w - x)), h: Math.max(0, Math.min(b.h, h - y)) }; };
export const iou = (a: Box, b: Box): number => { const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)), iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)); const inter = ix * iy; const u = a.w * a.h + b.w * b.h - inter; return u === 0 ? 0 : inter / u; };
export const snap = (v: number, step: number) => Math.round(v / step) * step;
/** Insert a point into the polygon edge nearest to it. */
export function insertOnNearestEdge(p: Pt[], pt: Pt): Pt[] { if (p.length < 2) return [...p, pt]; let best = 0, bd = Infinity; p.forEach((a, i) => { const b = p[(i + 1) % p.length]; const dx = b.x - a.x, dy = b.y - a.y; const t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / (dx * dx + dy * dy || 1))); const d = Math.hypot(a.x + t * dx - pt.x, a.y + t * dy - pt.y); if (d < bd) { bd = d; best = i; } }); const out = [...p]; out.splice(best + 1, 0, pt); return out; }

/* ---- easing: cubic-bezier(x1,y1,x2,y2) ---- */
export type Bezier = [number, number, number, number];
export const EASINGS: Record<string, Bezier> = { linear: [0, 0, 1, 1], ease: [0.25, 0.1, 0.25, 1], "ease-in": [0.42, 0, 1, 1], "ease-out": [0, 0, 0.58, 1], "ease-in-out": [0.42, 0, 0.58, 1], "back-out": [0.34, 1.56, 0.64, 1] };
export function bezierAt(b: Bezier, x: number): number {
  if (x <= 0) return 0; if (x >= 1) return 1; const [x1, y1, x2, y2] = b;
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t, sy = (t: number) => ((ay * t + by) * t + cy) * t;
  let lo = 0, hi = 1, t = x; for (let i = 0; i < 32; i++) { const v = sx(t); if (Math.abs(v - x) < 1e-6) break; if (v < x) lo = t; else hi = t; t = (lo + hi) / 2; } return sy(t);
}
export const bezierCss = (b: Bezier) => `cubic-bezier(${b.map((v) => Math.round(v * 100) / 100).join(", ")})`;
export function parseBezier(s: string): Bezier | null { const m = /^\s*cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)\s*$/.exec(s); if (!m) return null; const v = m.slice(1).map(Number) as Bezier; return v.some(Number.isNaN) || v[0] < 0 || v[0] > 1 || v[2] < 0 || v[2] > 1 ? null : v; }

/* ---- audio waveform ---- */
/** Deterministic pseudo-speech envelope so the trim demo works without audio files. */
export function fakeWaveform(n: number, seed = 7): number[] { let s = seed; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); return Array.from({ length: n }, (_, i) => { const env = 0.35 + 0.65 * Math.abs(Math.sin(i / 9) * Math.cos(i / 23)); return Math.max(0.04, Math.min(1, env * (0.5 + rnd() * 0.5))); }); }
export const trimDuration = (total: number, a: number, b: number) => Math.max(0, (b - a) * total);
/** Index of the first/last bar louder than the threshold, for "trim silence". */
export function silenceBounds(w: number[], thr = 0.12): [number, number] { const a = w.findIndex((v) => v > thr); const b = w.length - 1 - [...w].reverse().findIndex((v) => v > thr); return a < 0 ? [0, w.length - 1] : [a, b]; }
export const fmtTime = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}.${String(Math.floor((sec % 1) * 10))}`;
/** Frame most different from its predecessor: a crude "best thumbnail" suggestion from per-frame scores. */
export const bestFrame = (scores: number[]): number => scores.reduce((best, v, i) => (v > scores[best] ? i : best), 0);

/* ---- sunrise / sunset (NOAA-style approximation, UTC minutes) ---- */
export function sunTimes(lat: number, lon: number, date: Date): { sunrise: number; sunset: number } | null {
  const rad = Math.PI / 180; const start = Date.UTC(date.getUTCFullYear(), 0, 0); const N = Math.floor((date.getTime() - start) / 86400000);
  const g = (2 * Math.PI / 365) * (N - 1); const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const c = (Math.cos(90.833 * rad) - Math.sin(lat * rad) * Math.sin(decl)) / (Math.cos(lat * rad) * Math.cos(decl)); if (c < -1 || c > 1) return null;
  const ha = Math.acos(c) / rad; const norm = (m: number) => ((m % 1440) + 1440) % 1440;
  return { sunrise: norm(720 - 4 * (lon + ha) - eqt), sunset: norm(720 - 4 * (lon - ha) - eqt) };
}
export const hhmm = (min: number) => { const m = ((Math.round(min) % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
export const parseOffset = (s: string): number | null => { const m = /^\s*([+-]?)\s*(?:(\d+)\s*h)?\s*(?:(\d+)\s*m?)?\s*$/i.exec(s); if (!m || (!m[2] && !m[3])) return null; return (m[1] === "-" ? -1 : 1) * (Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)); };
export const fmtOffset = (min: number) => `${min < 0 ? "-" : "+"}${Math.floor(Math.abs(min) / 60) ? `${Math.floor(Math.abs(min) / 60)}h ` : ""}${Math.abs(min) % 60}m`.replace(" 0m", "");

/* ---- routes and racks ---- */
export const routeLength = (p: Pt[]): number => p.reduce((a, q, i) => (i ? a + Math.hypot(q.x - p[i - 1].x, q.y - p[i - 1].y) : a), 0);
/** Greedy nearest-neighbour ordering starting from the first waypoint. */
export function nearestOrder<T extends Pt>(p: T[]): T[] { if (p.length < 3) return p; const left = p.slice(1); const out = [p[0]]; while (left.length) { const last = out[out.length - 1]; let bi = 0; left.forEach((q, i) => { if (Math.hypot(q.x - last.x, q.y - last.y) < Math.hypot(left[bi].x - last.x, left[bi].y - last.y)) bi = i; }); out.push(left.splice(bi, 1)[0]); } return out; }
export type RackDevice = { name: string; u: number; h: number };
/** Does a device of height `h` fit with its lowest unit at `u` (1 = bottom) in a rack of `size` units? */
export function rackFits(devices: RackDevice[], u: number, h: number, size = 42): { ok: boolean; reason: string } {
  if (u < 1 || u + h - 1 > size) return { ok: false, reason: `Does not fit: it would reach unit ${u + h - 1} in a ${size}U rack` };
  const hit = devices.find((d) => u <= d.u + d.h - 1 && u + h - 1 >= d.u); return hit ? { ok: false, reason: `Overlaps ${hit.name} (U${hit.u}${hit.h > 1 ? `-U${hit.u + hit.h - 1}` : ""})` } : { ok: true, reason: "Free" };
}
export const rackFree = (devices: RackDevice[], size = 42): number => size - devices.reduce((a, d) => a + d.h, 0);
