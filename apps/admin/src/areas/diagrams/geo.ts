// D057-D059: spatial maths. Geometry is simplified and hand-made; nothing here is survey-grade.
export const R_EARTH = 6371008.8;
const rad = (d: number) => (d * Math.PI) / 180;
export const haversine = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => { const dl = rad(b.lat - a.lat), dn = rad(b.lon - a.lon); const h = Math.sin(dl / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dn / 2) ** 2; return 2 * R_EARTH * Math.asin(Math.sqrt(h)); };

/* ---------- hex tile map (pointy-top, odd-r offset rows) ---------- */
export type Hex = { q: number; r: number };
export const offsetToAxial = (col: number, row: number): Hex => ({ q: col - (row - (row & 1)) / 2, r: row });
export const hexToPixel = (h: Hex, size: number) => ({ x: size * Math.sqrt(3) * (h.q + h.r / 2), y: size * 1.5 * h.r });
export const hexDistance = (a: Hex, b: Hex) => (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
export const HEX_DIRS: Hex[] = [{ q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 }, { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }];
export const hexCorners = (c: { x: number; y: number }, size: number) => Array.from({ length: 6 }, (_, i) => { const a = rad(60 * i - 30); return [c.x + size * Math.cos(a), c.y + size * Math.sin(a)] as [number, number]; });
/** Round fractional axial coordinates to the containing hex (cube rounding). */
export function pixelToHex(x: number, y: number, size: number): Hex { const q = ((Math.sqrt(3) / 3) * x - y / 3) / size, r = ((2 / 3) * y) / size; let rq = Math.round(q), rr = Math.round(r); const rs = Math.round(-q - r); const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs + q + r); if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs; return { q: rq + 0, r: rr + 0 }; }
/** Rows of characters, one per hex; "." is empty. Odd rows are shifted half a hex right. */
export const parseHexGrid = (rows: string[]) => rows.flatMap((line, row) => [...line.replace(/ /g, "")].map((ch, col) => ({ ch, ...offsetToAxial(col, row), col, row })).filter((t) => t.ch !== "."));
export const connected = (tiles: Hex[]) => { if (!tiles.length) return true; const k = (h: Hex) => `${h.q},${h.r}`; const set = new Set(tiles.map(k)); const seen = new Set([k(tiles[0])]); const q = [tiles[0]]; while (q.length) { const u = q.pop()!; for (const d of HEX_DIRS) { const v = { q: u.q + d.q, r: u.r + d.r }; if (set.has(k(v)) && !seen.has(k(v))) { seen.add(k(v)); q.push(v); } } } return seen.size === set.size; };

/* ---------- isochrone: Dijkstra over a cost grid (minutes to cross one cell) ---------- */
export function travelTimes(cost: number[][], origin: [number, number]) {
  const h = cost.length, w = cost[0].length; const t: number[][] = cost.map((r) => r.map(() => Infinity)); t[origin[1]][origin[0]] = 0;
  const heap: [number, number, number][] = [[0, origin[0], origin[1]]];
  const push = (e: [number, number, number]) => { heap.push(e); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop()!; if (heap.length) { heap[0] = last; let i = 0; for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  while (heap.length) { const [d, x, y] = pop(); if (d > t[y][x]) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h || !Number.isFinite(cost[ny][nx])) continue; const nd = d + ((cost[y][x] + cost[ny][nx]) / 2) * (dx && dy ? Math.SQRT2 : 1); if (nd < t[ny][nx]) { t[ny][nx] = nd; push([nd, nx, ny]); } } }
  return t;
}
export const bandOf = (t: number, bands: number[]) => (Number.isFinite(t) ? (bands.findIndex((b) => t <= b) < 0 ? bands.length : bands.findIndex((b) => t <= b)) : -1);

/* ---------- GPS track ---------- */
export type Fix = { lat: number; lon: number; ele: number; t: number };
/** Cumulative distance (m), elevation gain/loss (m) with a hysteresis so GPS noise below `thresh` metres is ignored, and max grade between fixes ≥ 20 m apart. */
export function trackStats(pts: Fix[], thresh = 3) {
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + haversine(pts[i - 1], pts[i]));
  let gain = 0, loss = 0, ref = pts[0]?.ele ?? 0; for (const p of pts) { if (p.ele - ref >= thresh) { gain += p.ele - ref; ref = p.ele; } else if (ref - p.ele >= thresh) { loss += ref - p.ele; ref = p.ele; } }
  let maxGrade = 0; for (let i = 1; i < pts.length; i++) { const d = cum[i] - cum[i - 1]; if (d >= 20) maxGrade = Math.max(maxGrade, Math.abs(pts[i].ele - pts[i - 1].ele) / d); }
  const eles = pts.map((p) => p.ele); return { cum, distance: cum[cum.length - 1] ?? 0, gain, loss, maxGrade, min: Math.min(...eles), max: Math.max(...eles), seconds: pts.length ? pts[pts.length - 1].t - pts[0].t : 0 };
}

/* ---------- geofences ---------- */
export type Pt = [number, number];
export const pointInPolygon = (p: Pt, poly: Pt[]) => { let inside = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside; } return inside; };
export const polyArea = (poly: Pt[]) => { let a = 0; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1]; return a / 2; };
export type FenceEvent = { t: number; kind: "enter" | "exit"; fence: string };
export type FenceState = "inside" | "dwelling" | "outside";
/** Enter/exit events for one asset against several fences, and the state at the last sample: dwelling = inside for at least `dwell` seconds. */
export function fenceTrack(path: { t: number; p: Pt }[], fences: { id: string; poly: Pt[] }[], dwell: number) {
  const events: FenceEvent[] = []; const inside = new Map<string, number | null>(fences.map((f) => [f.id, null]));
  for (const s of path) for (const f of fences) { const now = pointInPolygon(s.p, f.poly), was = inside.get(f.id); if (now && was === null) { inside.set(f.id, s.t); events.push({ t: s.t, kind: "enter", fence: f.id }); } else if (!now && was !== null) { inside.set(f.id, null); events.push({ t: s.t, kind: "exit", fence: f.id }); } }
  const end = path[path.length - 1]?.t ?? 0;
  const state: Record<string, FenceState> = {}; for (const f of fences) { const since = inside.get(f.id); state[f.id] = since === null || since === undefined ? "outside" : end - since >= dwell ? "dwelling" : "inside"; }
  return { events, state };
}

/* ---------- bounding boxes (real boundary data lives in au.ts) ---------- */
export const bbox = (pts: Pt[]) => ({ minX: Math.min(...pts.map((p) => p[0])), maxX: Math.max(...pts.map((p) => p[0])), minY: Math.min(...pts.map((p) => p[1])), maxY: Math.max(...pts.map((p) => p[1])) });
