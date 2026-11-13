// D047: layered layout for DAGs (pipelines, lineage, ER, architecture) plus run-state propagation and a dependency matrix.
export type LNode = { id: string; w: number; h: number };
export type Edge = [string, string];
export type Placed = { id: string; x: number; y: number; w: number; h: number; layer: number };

export const layers = (ids: string[], edges: Edge[]): Map<string, number> | null => {
  const layer = new Map<string, number>(); const indeg = new Map(ids.map((i) => [i, 0])); edges.forEach(([, t]) => indeg.set(t, (indeg.get(t) ?? 0) + 1));
  const q = ids.filter((i) => !indeg.get(i)); ids.forEach((i) => layer.set(i, 0)); let seen = 0;
  while (q.length) { const u = q.shift()!; seen++; for (const [f, t] of edges) if (f === u) { layer.set(t, Math.max(layer.get(t)!, layer.get(u)! + 1)); indeg.set(t, indeg.get(t)! - 1); if (!indeg.get(t)) q.push(t); } }
  return seen === ids.length ? layer : null; // null = cycle
};
export const topoOrder = (ids: string[], edges: Edge[]) => { const l = layers(ids, edges); return l ? [...ids].sort((a, b) => l.get(a)! - l.get(b)! || ids.indexOf(a) - ids.indexOf(b)) : null; };
export function crossings(order: string[][], edges: Edge[]) {
  let c = 0; const pos = new Map<string, number>(); order.forEach((col) => col.forEach((id, i) => pos.set(id, i))); const lay = new Map<string, number>(); order.forEach((col, li) => col.forEach((id) => lay.set(id, li)));
  const es = edges.filter(([f, t]) => lay.get(t)! - lay.get(f)! === 1);
  for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) { const [a, b] = es[i], [x, y] = es[j]; if (lay.get(a) === lay.get(x) && (pos.get(a)! - pos.get(x)!) * (pos.get(b)! - pos.get(y)!) < 0) c++; }
  return c;
}
/** Left-to-right layered layout: longest-path layers, barycentre sweeps (best ordering by crossing count is kept), columns centred. Returns null on a cycle. */
export function layoutLayered(nodes: LNode[], edges: Edge[], o: { colGap: number; rowGap: number }) {
  const ids = nodes.map((n) => n.id); if (!ids.length) return { placed: [] as Placed[], width: 0, height: 0, order: [] as string[][], crossings: 0 };
  const lay = layers(ids, edges); if (!lay) return null;
  const nl = Math.max(...lay.values()) + 1; let order: string[][] = Array.from({ length: nl }, (_, i) => ids.filter((id) => lay.get(id) === i));
  let best = order.map((c) => [...c]), bc = crossings(best, edges);
  const bary = (id: string, adj: (e: Edge) => boolean, other: (e: Edge) => string, pos: Map<string, number>) => { const ns = edges.filter(adj).map(other).filter((x) => pos.has(x)); return ns.length ? ns.reduce((a, x) => a + pos.get(x)!, 0) / ns.length : pos.get(id)!; };
  for (let it = 0; it < 6; it++) {
    const down = it % 2 === 0; const rng = down ? [...Array(nl).keys()].slice(1) : [...Array(nl).keys()].slice(0, -1).reverse();
    for (const li of rng) { const pos = new Map<string, number>(); order[down ? li - 1 : li + 1].forEach((id, i) => pos.set(id, i)); const cur = new Map<string, number>(); order[li].forEach((id, i) => cur.set(id, i));
      const key = new Map(order[li].map((id) => [id, down ? bary(id, ([, t]) => t === id, ([f]) => f, pos) : bary(id, ([f]) => f === id, ([, t]) => t, pos)]));
      order[li] = [...order[li]].sort((a, b) => key.get(a)! - key.get(b)! || cur.get(a)! - cur.get(b)!); }
    const c = crossings(order, edges); if (c < bc) { bc = c; best = order.map((x) => [...x]); }
  }
  order = best; const byId = new Map(nodes.map((n) => [n.id, n])); const colW = order.map((c) => Math.max(0, ...c.map((id) => byId.get(id)!.w))); const colH = order.map((c) => c.reduce((a, id) => a + byId.get(id)!.h, 0) + o.rowGap * Math.max(0, c.length - 1)); const H = Math.max(...colH);
  const placed: Placed[] = []; let x = 0;
  order.forEach((col, li) => { let y = (H - colH[li]) / 2; col.forEach((id) => { const n = byId.get(id)!; placed.push({ id, x, y, w: n.w, h: n.h, layer: li }); y += n.h + o.rowGap; }); x += colW[li] + o.colGap; });
  return { placed, width: x - o.colGap, height: H, order, crossings: bc };
}
export const overlaps = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export type RunState = "success" | "failed" | "running" | "queued" | "skipped" | "blocked";
/** A queued task with a failed ancestor can never run: it is shown as `blocked` (upstream failed). Running tasks keep their state. */
export function effectiveStates(raw: Record<string, Exclude<RunState, "blocked">>, edges: Edge[]): Record<string, RunState> {
  const out: Record<string, RunState> = { ...raw }; const failed = new Set(Object.keys(raw).filter((k) => raw[k] === "failed"));
  const down = new Set<string>(); const q = [...failed]; while (q.length) { const u = q.pop()!; for (const [f, t] of edges) if (f === u && !down.has(t)) { down.add(t); q.push(t); } }
  for (const id of down) if (raw[id] === "queued") out[id] = "blocked"; return out;
}
/** Dependency matrix: rows depend on columns. Both axes follow topological order (dependencies first), so a DAG has marks only on one side of the diagonal. */
export function depMatrix(ids: string[], edges: Edge[]) {
  const order = topoOrder(ids, edges) ?? ids; const idx = new Map(order.map((id, i) => [id, i])); const cells = order.map(() => order.map(() => 0));
  for (const [dep, user] of edges) cells[idx.get(user)!][idx.get(dep)!] = 1; return { order, cells };
}
export const reach = (id: string, edges: Edge[], dir: "up" | "down") => { const out = new Set<string>(); const q = [id]; while (q.length) { const u = q.pop()!; for (const [f, t] of edges) { const [a, b] = dir === "down" ? [f, t] : [t, f]; if (a === u && !out.has(b)) { out.add(b); q.push(b); } } } return out; };
