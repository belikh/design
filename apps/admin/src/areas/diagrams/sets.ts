// D045: set arithmetic for Venn and UpSet.
export type SetMap = Record<string, string[]>;
export type Inter = { sets: string[]; count: number; items: string[] };
/** Exclusive intersections: each item is counted once, under exactly the sets that contain it. Sorted by count desc, then degree. */
export function exclusive(sets: SetMap): Inter[] {
  const names = Object.keys(sets); const member = new Map<string, string[]>();
  for (const nm of names) for (const it of new Set(sets[nm])) member.set(it, [...(member.get(it) ?? []), nm]);
  const g = new Map<string, Inter>();
  for (const [it, ns] of member) { const k = ns.join("|"); const e = g.get(k) ?? { sets: ns, count: 0, items: [] }; e.count++; e.items.push(it); g.set(k, e); }
  return [...g.values()].sort((a, b) => b.count - a.count || a.sets.length - b.sets.length || a.sets.join().localeCompare(b.sets.join()));
}
export const unionSize = (sets: SetMap) => new Set(Object.values(sets).flat()).size;
export type Circle = { name: string; x: number; y: number; r: number };
/** Three-set Venn: radii ∝ sqrt(set size) (areas proportional to size), centres placed on a triangle; pairwise overlaps are schematic, not area-exact. */
export function vennCircles(sizes: Record<string, number>, w: number, h: number): Circle[] {
  const names = Object.keys(sizes); const mx = Math.max(...Object.values(sizes)); const R = Math.min(w, h) * 0.3;
  const r = names.map((n) => R * Math.sqrt(sizes[n] / mx)); const cx = w / 2, cy = h / 2;
  const pos = names.length === 2 ? [[cx - R * 0.55, cy], [cx + R * 0.55, cy]] : [[cx - R * 0.55, cy - R * 0.4], [cx + R * 0.55, cy - R * 0.4], [cx, cy + R * 0.5]];
  return names.map((name, i) => ({ name, x: pos[i][0], y: pos[i][1], r: r[i] }));
}
export const regionOf = (cs: Circle[], x: number, y: number) => cs.filter((c) => (x - c.x) ** 2 + (y - c.y) ** 2 <= c.r ** 2).map((c) => c.name);
/** Label anchor for each region = centroid of the sampled grid points that fall in exactly that region (always inside it for convex regions, checked by test). */
export function regionAnchors(cs: Circle[], w: number, h: number, step = 4) {
  const acc = new Map<string, { sx: number; sy: number; n: number; pts: [number, number][] }>();
  for (let x = 0; x <= w; x += step) for (let y = 0; y <= h; y += step) { const rs = regionOf(cs, x, y); if (!rs.length) continue; const k = rs.join("|"); const e = acc.get(k) ?? { sx: 0, sy: 0, n: 0, pts: [] }; e.sx += x; e.sy += y; e.n++; e.pts.push([x, y]); acc.set(k, e); }
  const out = new Map<string, { x: number; y: number }>();
  for (const [k, e] of acc) { const cx = e.sx / e.n, cy = e.sy / e.n; const inside = regionOf(cs, cx, cy).join("|") === k; const p = inside ? [cx, cy] : e.pts.reduce((best, q) => ((q[0] - cx) ** 2 + (q[1] - cy) ** 2 < (best[0] - cx) ** 2 + (best[1] - cy) ** 2 ? q : best)); out.set(k, { x: p[0], y: p[1] }); }
  return out;
}
