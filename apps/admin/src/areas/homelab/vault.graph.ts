import type { Note } from "./vault.data.ts";
/** Link graph layouts. All are deterministic (no Math.random) so tests and screenshots are stable. Positions are in 0..1. */
export type Pos = Record<string, { x: number; y: number }>;
export type Edge = readonly [string, string];
/** Undirected edges between notes that exist, each pair once. */
export function edgesOf(notes: Pick<Note, "id" | "links">[]): Edge[] {
  const ids = new Set(notes.map((n) => n.id)), seen = new Set<string>(), out: Edge[] = [];
  for (const n of notes) for (const l of n.links) { if (!ids.has(l) || l === n.id) continue; const k = n.id < l ? `${n.id}\u0000${l}` : `${l}\u0000${n.id}`; if (!seen.has(k)) { seen.add(k); out.push(n.id < l ? [n.id, l] : [l, n.id]); } }
  return out;
}
export const degrees = (notes: Pick<Note, "id">[], edges: readonly Edge[]) => { const d: Record<string, number> = Object.fromEntries(notes.map((n) => [n.id, 0])); for (const [a, b] of edges) { d[a]++; d[b]++; } return d; };
const hash01 = (s: string, k: number) => { let h = 2166136261 ^ k; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return ((h >>> 0) % 100000) / 100000; };
const fit = (p: Pos): Pos => { // scale to fill 0.06..0.94 keeping aspect
  const xs = Object.values(p).map((q) => q.x), ys = Object.values(p).map((q) => q.y); if (!xs.length) return p; const x0 = Math.min(...xs), y0 = Math.min(...ys), s = Math.max(Math.max(...xs) - x0, Math.max(...ys) - y0, 1e-9);
  const ox = (1 - (Math.max(...xs) - x0) / s) / 2, oy = (1 - (Math.max(...ys) - y0) / s) / 2; return Object.fromEntries(Object.entries(p).map(([id, q]) => [id, { x: 0.06 + 0.88 * (ox + (q.x - x0) / s), y: 0.06 + 0.88 * (oy + (q.y - y0) / s) }]));
};
/** Fruchterman-Reingold. Components are seeded on a circle by id hash, then relaxed; isolated notes drift to the edge by repulsion. */
export function forceLayout(notes: Pick<Note, "id">[], edges: readonly Edge[], iterations = 200): Pos {
  const n = notes.length; if (n === 0) return {}; if (n === 1) return { [notes[0].id]: { x: 0.5, y: 0.5 } };
  const ids = notes.map((x) => x.id); const idx = new Map(ids.map((id, i) => [id, i])); const px = ids.map((id) => 0.5 + 0.35 * Math.cos(2 * Math.PI * hash01(id, 1))), py = ids.map((id) => 0.5 + 0.35 * Math.sin(2 * Math.PI * hash01(id, 2)));
  const k = Math.sqrt(1 / n) * 0.9; let t = 0.1;
  for (let it = 0; it < iterations; it++) {
    const dx = new Array<number>(n).fill(0), dy = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { let ex = px[i] - px[j], ey = py[i] - py[j]; let d = Math.hypot(ex, ey); if (d < 1e-4) { ex = (hash01(ids[i], 3) - 0.5) * 1e-3; ey = (hash01(ids[j], 4) - 0.5) * 1e-3; d = Math.hypot(ex, ey) || 1e-3; } const f = (k * k) / d; dx[i] += (ex / d) * f; dy[i] += (ey / d) * f; dx[j] -= (ex / d) * f; dy[j] -= (ey / d) * f; }
    for (const [a, b] of edges) { const i = idx.get(a)!, j = idx.get(b)!; const ex = px[i] - px[j], ey = py[i] - py[j], d = Math.hypot(ex, ey) || 1e-3, f = (d * d) / k; dx[i] -= (ex / d) * f; dy[i] -= (ey / d) * f; dx[j] += (ex / d) * f; dy[j] += (ey / d) * f; }
    for (let i = 0; i < n; i++) { dx[i] -= (px[i] - 0.5) * 0.4; dy[i] -= (py[i] - 0.5) * 0.4; const d = Math.hypot(dx[i], dy[i]) || 1e-9, m = Math.min(d, t); px[i] += (dx[i] / d) * m; py[i] += (dy[i] / d) * m; }
    t = Math.max(0.002, t * 0.97);
  }
  return fit(Object.fromEntries(ids.map((id, i) => [id, { x: px[i], y: py[i] }])));
}
/** Rings by link distance from a centre note (BFS). Notes unreachable from it go on an outer ring. */
export function radialLayout(notes: Pick<Note, "id">[], edges: readonly Edge[], centre: string): Pos {
  const adj = new Map<string, string[]>(notes.map((n) => [n.id, []])); for (const [a, b] of edges) { adj.get(a)!.push(b); adj.get(b)!.push(a); }
  const c = adj.has(centre) ? centre : notes[0]?.id; if (!c) return {}; const depth = new Map<string, number>([[c, 0]]); const q = [c];
  for (let h = 0; h < q.length; h++) for (const m of [...adj.get(q[h])!].sort()) if (!depth.has(m)) { depth.set(m, depth.get(q[h])! + 1); q.push(m); }
  const far = Math.max(...depth.values()) + 1; const rings = new Map<number, string[]>(); for (const n of notes) { const d = depth.get(n.id) ?? far; (rings.get(d) ?? rings.set(d, []).get(d)!).push(n.id); }
  const maxR = Math.max(...rings.keys()) || 1; const out: Pos = {};
  for (const [d, list] of rings) { list.sort(); list.forEach((id, i) => { const a = (2 * Math.PI * (i + (d % 2) * 0.5)) / list.length - Math.PI / 2, r = (d / maxR) * 0.44; out[id] = { x: 0.5 + r * Math.cos(a), y: 0.5 + r * Math.sin(a) }; }); }
  return out;
}
export const circleLayout = (notes: Pick<Note, "id">[]): Pos => Object.fromEntries(notes.map((n, i) => [n.id, { x: 0.5 + 0.44 * Math.cos((2 * Math.PI * i) / notes.length - Math.PI / 2), y: 0.5 + 0.44 * Math.sin((2 * Math.PI * i) / notes.length - Math.PI / 2) }]));
/** Connected components, largest first (ids sorted inside). */
export function components(notes: Pick<Note, "id">[], edges: readonly Edge[]): string[][] {
  const adj = new Map<string, string[]>(notes.map((n) => [n.id, []])); for (const [a, b] of edges) { adj.get(a)?.push(b); adj.get(b)?.push(a); } const seen = new Set<string>(), out: string[][] = [];
  for (const n of notes) { if (seen.has(n.id)) continue; const comp: string[] = [], st = [n.id]; seen.add(n.id); while (st.length) { const x = st.pop()!; comp.push(x); for (const m of adj.get(x) ?? []) if (!seen.has(m)) { seen.add(m); st.push(m); } } out.push(comp.sort()); }
  return out.sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));
}
