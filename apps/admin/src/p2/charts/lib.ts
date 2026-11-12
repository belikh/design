// Pure, deterministic helpers behind the P2 charts. No React, no DOM: everything here is unit-tested.
import { rng } from "../../data/fixtures.ts";

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
export const mean = (a: number[]) => (a.length ? sum(a) / a.length : NaN);

/** Percentile by linear interpolation between closest ranks. `p` in 0..100. Input need not be sorted. */
export function percentile(values: number[], p: number): number {
  if (!values.length) return NaN;
  const s = [...values].sort((a, b) => a - b); const idx = (clamp(p, 0, 100) / 100) * (s.length - 1); const lo = Math.floor(idx), hi = Math.ceil(idx);
  return lerp(s[lo], s[hi], idx - lo);
}

/** Least-squares line and R². Fewer than 2 points or no x variance gives a flat line. */
export function linreg(pts: { x: number; y: number }[]) {
  const n = pts.length; if (n < 2) return { slope: 0, intercept: n ? pts[0].y : 0, r2: 0 };
  const mx = mean(pts.map((p) => p.x)), my = mean(pts.map((p) => p.y));
  const sxx = sum(pts.map((p) => (p.x - mx) ** 2)), sxy = sum(pts.map((p) => (p.x - mx) * (p.y - my))), syy = sum(pts.map((p) => (p.y - my) ** 2));
  if (sxx === 0) return { slope: 0, intercept: my, r2: 0 };
  const slope = sxy / sxx; return { slope, intercept: my - slope * mx, r2: syy === 0 ? 1 : (sxy * sxy) / (sxx * syy) };
}

/** Pearson correlation; NaN when undefined. */
export function pearson(a: number[], b: number[]) {
  const ma = mean(a), mb = mean(b); const sa = Math.sqrt(sum(a.map((v) => (v - ma) ** 2))), sb = Math.sqrt(sum(b.map((v) => (v - mb) ** 2)));
  return sa === 0 || sb === 0 ? NaN : sum(a.map((v, i) => (v - ma) * (b[i] - mb))) / (sa * sb);
}

/** Pointy-top hexagonal binning in pixel space. `r` is the hexagon circumradius. */
export function hexbin(points: { x: number; y: number }[], r: number) {
  const w = Math.sqrt(3) * r, h = 1.5 * r; const bins = new Map<string, { q: number; row: number; cx: number; cy: number; count: number }>();
  for (const p of points) {
    // convert to fractional axial coordinates then round (cube rounding)
    const qf = ((Math.sqrt(3) / 3) * p.x - (1 / 3) * p.y) / r, rf = ((2 / 3) * p.y) / r; let x = qf, z = rf, y = -x - z;
    let rx = Math.round(x), ry = Math.round(y), rz = Math.round(z); const dx = Math.abs(rx - x), dy = Math.abs(ry - y), dz = Math.abs(rz - z);
    if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz; else rz = -rx - ry; x = rx; z = rz;
    const key = `${x},${z}`; const cx = w * (x + z / 2), cy = h * z;
    const b = bins.get(key); if (b) b.count++; else bins.set(key, { q: x, row: z, cx, cy, count: 1 });
  }
  return [...bins.values()];
}
export const hexPath = (cx: number, cy: number, r: number) => Array.from({ length: 6 }, (_, i) => { const a = (Math.PI / 180) * (60 * i - 30); return `${i ? "L" : "M"}${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`; }).join("") + "Z";

/** Greedy interval partitioning: assigns each item the lowest lane with no overlap. */
export function lanePack<T extends { start: number; end: number }>(items: T[]): (T & { lane: number })[] {
  const ends: number[] = []; const out: (T & { lane: number })[] = [];
  for (const it of [...items].sort((a, b) => a.start - b.start || a.end - b.end)) {
    let lane = ends.findIndex((e) => e <= it.start); if (lane < 0) { lane = ends.length; ends.push(it.end); } else ends[lane] = it.end;
    out.push({ ...it, lane });
  }
  return out;
}

/** Keep the `n` biggest, fold the rest into "Other". `members` lists what was folded so the UI can drill down. */
export function topN(items: { label: string; value: number }[], n: number) {
  const s = [...items].sort((a, b) => b.value - a.value); const head = s.slice(0, n).map((i) => ({ ...i, other: false as boolean, members: undefined as { label: string; value: number }[] | undefined }));
  const rest = s.slice(n); if (rest.length) head.push({ label: "Other", value: sum(rest.map((r) => r.value)), other: true, members: rest });
  return head;
}

/** Count how often each pair of labels appears in the same set. Diagonal = occurrences of the label. */
export function cooccurrence(sets: string[][], labels: string[]) {
  const ix = new Map(labels.map((l, i) => [l, i])); const m = labels.map(() => labels.map(() => 0));
  for (const set of sets) { const u = [...new Set(set)].filter((l) => ix.has(l)); for (const a of u) for (const b of u) m[ix.get(a)!][ix.get(b)!]++; }
  return m;
}

// ---------- delivery / SLO maths ----------
/** Ideal and actual remaining work per day. `done[i]` is work completed on day i. */
export function burnDown(total: number, done: number[], days = done.length) {
  const ideal = Array.from({ length: days + 1 }, (_, i) => total - (total * i) / days); let left = total;
  const actual = [total, ...done.map((d) => (left = Math.max(0, left - d)))]; return { ideal, actual };
}
export function burnUp(scope: number[], done: number[]) { let c = 0; return { scope: [...scope], done: done.map((d) => (c += d)) }; }
/** Cumulative flow: running totals per stage, stacked bottom (done) to top (backlog). */
export function cumulativeFlow(daily: Record<string, number>[], stages: string[]) { const run: Record<string, number> = Object.fromEntries(stages.map((s) => [s, 0])); return daily.map((d) => stages.map((s) => (run[s] += d[s] ?? 0))); }
/** Burn rate: how fast the error budget is being spent. 1 = exactly on budget, 14.4 = a 30-day budget gone in 2 days. */
export const burnRate = (errors: number, total: number, slo: number) => (total === 0 || slo >= 1 ? 0 : errors / total / (1 - slo));
export const budgetRemaining = (errors: number, total: number, slo: number) => (total === 0 ? 1 : clamp(1 - errors / total / (1 - slo), 0, 1));
/** Minutes of downtime allowed per period for an availability target (percent). */
export const downtimeAllowed = (availabilityPct: number, periodMinutes: number) => periodMinutes * (1 - availabilityPct / 100);
export const fmtDuration = (min: number) => (min >= 1440 ? `${(min / 1440).toFixed(1)} d` : min >= 60 ? `${(min / 60).toFixed(1)} h` : min >= 1 ? `${min.toFixed(1)} min` : `${(min * 60).toFixed(1)} s`);

/** Interpolated frames for a "bar chart race": at each frame, entities are ordered by value. */
export function raceFrames(series: Record<string, number[]>, sub = 6) {
  const names = Object.keys(series); const n = Math.max(0, ...names.map((k) => series[k].length)); const frames: { t: number; order: string[]; values: Record<string, number> }[] = [];
  for (let i = 0; i < n - 1; i++) for (let s = 0; s < sub; s++) {
    const t = s / sub, values: Record<string, number> = {}; for (const k of names) values[k] = lerp(series[k][i], series[k][i + 1], t);
    frames.push({ t: i + t, order: [...names].sort((a, b) => values[b] - values[a]), values });
  }
  if (n) { const values: Record<string, number> = {}; for (const k of names) values[k] = series[k][n - 1]; frames.push({ t: n - 1, order: [...names].sort((a, b) => values[b] - values[a]), values }); }
  return frames;
}

// ---------- graphs ----------
export type GNode = { id: string; label?: string }; export type GEdge = { from: string; to: string; weight?: number };
/** Layered (Sugiyama-style) layout: cycle edges are reversed, nodes get the longest-path layer, order is refined by barycenters. */
export function dagLayout(nodes: GNode[], edges: GEdge[], o: { nodeW?: number; nodeH?: number; gapX?: number; gapY?: number; direction?: "LR" | "TB" } = {}) {
  const { nodeW = 120, nodeH = 40, gapX = 60, gapY = 24, direction = "LR" } = o; const ids = nodes.map((n) => n.id);
  const out = new Map(ids.map((i) => [i, [] as string[]])); for (const e of edges) if (out.has(e.from) && out.has(e.to) && e.from !== e.to) out.get(e.from)!.push(e.to);
  // DFS to find back edges
  const state = new Map<string, 0 | 1 | 2>(), back = new Set<string>(); const visit = (u: string) => { state.set(u, 1); for (const v of out.get(u)!) { const s = state.get(v) ?? 0; if (s === 1) back.add(`${u}>${v}`); else if (s === 0) visit(v); } state.set(u, 2); };
  for (const i of ids) if (!state.get(i)) visit(i);
  const acyc = edges.filter((e) => out.has(e.from) && out.has(e.to) && e.from !== e.to).map((e) => (back.has(`${e.from}>${e.to}`) ? { ...e, from: e.to, to: e.from, reversed: true } : { ...e, reversed: false }));
  const preds = new Map(ids.map((i) => [i, [] as string[]])), succs = new Map(ids.map((i) => [i, [] as string[]])); for (const e of acyc) { preds.get(e.to)!.push(e.from); succs.get(e.from)!.push(e.to); }
  const layer = new Map<string, number>(); const indeg = new Map(ids.map((i) => [i, preds.get(i)!.length])); const q = ids.filter((i) => indeg.get(i) === 0); const topo: string[] = [];
  while (q.length) { const u = q.shift()!; topo.push(u); layer.set(u, Math.max(0, ...preds.get(u)!.map((p) => layer.get(p)! + 1))); for (const v of succs.get(u)!) { indeg.set(v, indeg.get(v)! - 1); if (indeg.get(v) === 0) q.push(v); } }
  for (const i of ids) if (!layer.has(i)) layer.set(i, 0);
  const L = Math.max(0, ...layer.values()); const cols: string[][] = Array.from({ length: L + 1 }, () => []); for (const i of ids) cols[layer.get(i)!].push(i);
  const posIn = (col: string[]) => new Map(col.map((id, k) => [id, k]));
  for (let sweep = 0; sweep < 4; sweep++) for (const dir of [1, -1]) {
    const range = dir === 1 ? Array.from({ length: L }, (_, k) => k + 1) : Array.from({ length: L }, (_, k) => L - 1 - k);
    for (const li of range) { const ref = posIn(cols[li - dir]); const nb = dir === 1 ? preds : succs;
      const bary = (id: string) => { const ns = nb.get(id)!.filter((n) => ref.has(n)); return ns.length ? mean(ns.map((n) => ref.get(n)!)) : cols[li].indexOf(id); };
      cols[li] = [...cols[li]].sort((a, b) => bary(a) - bary(b) || cols[li].indexOf(a) - cols[li].indexOf(b)); }
  }
  const maxCount = Math.max(1, ...cols.map((c) => c.length)); const pos = new Map<string, { x: number; y: number; layer: number }>();
  const along = nodeW + gapX, across = nodeH + gapY;
  cols.forEach((col, li) => col.forEach((id, k) => { const off = ((maxCount - col.length) * (direction === "LR" ? across : nodeW + gapY)) / 2; const a = li * (direction === "LR" ? along : nodeH + gapX), c = k * (direction === "LR" ? across : nodeW + gapY) + off; pos.set(id, direction === "LR" ? { x: a, y: c, layer: li } : { x: c, y: a, layer: li }); }));
  const width = direction === "LR" ? (L + 1) * along - gapX : maxCount * (nodeW + gapY) - gapY, height = direction === "LR" ? maxCount * across - gapY : (L + 1) * (nodeH + gapX) - gapX;
  return { pos, width, height, layers: cols, edges: acyc, nodeW, nodeH };
}

/** Fruchterman-Reingold force layout. Deterministic for a given seed. Positions stay inside [pad, size - pad]. */
export function forceLayout(nodes: GNode[], edges: GEdge[], o: { width: number; height: number; seed?: number; iterations?: number; pad?: number }) {
  const { width, height, seed = 7, iterations = 220, pad = 24 } = o; const r = rng(seed); const n = nodes.length; const P = new Map<string, { x: number; y: number }>();
  nodes.forEach((nd, i) => { const a = (2 * Math.PI * i) / Math.max(1, n); P.set(nd.id, { x: width / 2 + Math.cos(a) * width * 0.3 + (r() - 0.5) * 20, y: height / 2 + Math.sin(a) * height * 0.3 + (r() - 0.5) * 20 }); });
  const k = Math.sqrt((width * height) / Math.max(1, n)) * 0.6; let t = width / 8;
  for (let it = 0; it < iterations; it++) {
    const disp = new Map(nodes.map((nd) => [nd.id, { x: 0, y: 0 }]));
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const a = P.get(nodes[i].id)!, b = P.get(nodes[j].id)!; let dx = a.x - b.x, dy = a.y - b.y; let d = Math.hypot(dx, dy); if (d < 0.01) { dx = r() - 0.5; dy = r() - 0.5; d = Math.hypot(dx, dy) || 1; } const f = (k * k) / d; const da = disp.get(nodes[i].id)!, db = disp.get(nodes[j].id)!; da.x += (dx / d) * f; da.y += (dy / d) * f; db.x -= (dx / d) * f; db.y -= (dy / d) * f; }
    for (const e of edges) { const a = P.get(e.from), b = P.get(e.to); if (!a || !b) continue; const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy) || 1; const f = ((d * d) / k) * (1 + Math.log1p(e.weight ?? 0) * 0.05); const da = disp.get(e.from)!, db = disp.get(e.to)!; da.x -= (dx / d) * f; da.y -= (dy / d) * f; db.x += (dx / d) * f; db.y += (dy / d) * f; }
    for (const nd of nodes) { const p = P.get(nd.id)!, d = disp.get(nd.id)!; const len = Math.hypot(d.x, d.y) || 1; p.x = clamp(p.x + (d.x / len) * Math.min(len, t), pad, width - pad); p.y = clamp(p.y + (d.y / len) * Math.min(len, t), pad, height - pad); }
    t *= 0.985;
  }
  return P;
}

/** Dijkstra over an undirected (default) weighted graph. Returns the node ids from `from` to `to`, or [] if unreachable. */
export function shortestPath(edges: GEdge[], from: string, to: string, directed = false): string[] {
  const adj = new Map<string, { to: string; w: number }[]>(); const add = (a: string, b: string, w: number) => { if (!adj.has(a)) adj.set(a, []); adj.get(a)!.push({ to: b, w }); };
  for (const e of edges) { add(e.from, e.to, 1); if (!directed) add(e.to, e.from, 1); }
  const dist = new Map<string, number>([[from, 0]]), prev = new Map<string, string>(), done = new Set<string>();
  while (true) { let u: string | null = null, best = Infinity; for (const [k, d] of dist) if (!done.has(k) && d < best) { best = d; u = k; } if (u === null) break; if (u === to) break; done.add(u); for (const e of adj.get(u) ?? []) { const nd = best + e.w; if (nd < (dist.get(e.to) ?? Infinity)) { dist.set(e.to, nd); prev.set(e.to, u); } } }
  if (!dist.has(to)) return []; const path = [to]; while (path[0] !== from) path.unshift(prev.get(path[0])!); return path;
}

/** Sankey layout for column-based flows: node heights are proportional to throughput. */
export function sankeyLayout(columns: string[][], links: { from: string; to: string; value: number }[], height: number, gap = 10) {
  const through = new Map<string, number>(); for (const l of links) { through.set(l.from, (through.get(l.from) ?? 0) + 0); }
  const outV = new Map<string, number>(), inV = new Map<string, number>(); for (const l of links) { outV.set(l.from, (outV.get(l.from) ?? 0) + l.value); inV.set(l.to, (inV.get(l.to) ?? 0) + l.value); }
  const val = (id: string) => Math.max(outV.get(id) ?? 0, inV.get(id) ?? 0); const maxCol = Math.max(...columns.map((c) => sum(c.map(val)) + gap * (c.length - 1)), 1); const scale = height / maxCol;
  const nodes = new Map<string, { col: number; y: number; h: number; value: number }>();
  columns.forEach((c, ci) => { let y = 0; for (const id of c) { const h = Math.max(2, val(id) * scale); nodes.set(id, { col: ci, y, h, value: val(id) }); y += h + gap; } });
  const outOff = new Map<string, number>(), inOff = new Map<string, number>();
  const ls = [...links].sort((a, b) => (nodes.get(a.to)?.y ?? 0) - (nodes.get(b.to)?.y ?? 0)).map((l) => { const a = nodes.get(l.from)!, b = nodes.get(l.to)!; const h = Math.max(1, l.value * scale); const y0 = a.y + (outOff.get(l.from) ?? 0), y1 = b.y + (inOff.get(l.to) ?? 0); outOff.set(l.from, (outOff.get(l.from) ?? 0) + h); inOff.set(l.to, (inOff.get(l.to) ?? 0) + h); return { ...l, y0, y1, h }; });
  void through; return { nodes, links: ls, scale };
}

// ---------- logs ----------
/** Normalise a log message into a pattern: numbers, hex ids and IPs become placeholders. */
export const logPattern = (m: string) => m.replace(/\b\d{1,3}(\.\d{1,3}){3}\b/g, "<ip>").replace(/\b[0-9a-f]{8,}\b/gi, "<hex>").replace(/\d+/g, "<n>");
export function clusterLogs(lines: { t: number; level: string; msg: string }[], buckets = 12, t0?: number, t1?: number) {
  const lo = t0 ?? Math.min(...lines.map((l) => l.t)), hi = t1 ?? Math.max(...lines.map((l) => l.t)); const span = Math.max(1, hi - lo);
  const map = new Map<string, { pattern: string; count: number; example: string; levels: Record<string, number>; series: number[] }>();
  for (const l of lines) { const p = logPattern(l.msg); let c = map.get(p); if (!c) { c = { pattern: p, count: 0, example: l.msg, levels: {}, series: Array(buckets).fill(0) }; map.set(p, c); } c.count++; c.levels[l.level] = (c.levels[l.level] ?? 0) + 1; c.series[Math.min(buckets - 1, Math.floor(((l.t - lo) / span) * buckets))]++; }
  return [...map.values()].sort((a, b) => b.count - a.count);
}
export function stackByTime(items: { t: number; key: string }[], keys: string[], buckets: number, t0: number, t1: number) {
  const span = Math.max(1, t1 - t0); const out = keys.map(() => Array(buckets).fill(0) as number[]);
  for (const it of items) { const k = keys.indexOf(it.key); if (k < 0 || it.t < t0 || it.t > t1) continue; out[k][Math.min(buckets - 1, Math.floor(((it.t - t0) / span) * buckets))]++; }
  return out;
}

// ---------- maps ----------
export type Bounds = { minLon: number; maxLon: number; minLat: number; maxLat: number };
/** Equirectangular projection, scaled by cos(mid-latitude) so shapes are not stretched. Returns pixel coordinates inside w x h. */
export function projector(b: Bounds, w: number, h: number, pad = 8) {
  const midLat = ((b.minLat + b.maxLat) / 2) * (Math.PI / 180); const kx = Math.cos(midLat); const spanX = (b.maxLon - b.minLon) * kx, spanY = b.maxLat - b.minLat;
  const s = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanY); const ox = (w - spanX * s) / 2, oy = (h - spanY * s) / 2;
  return (lon: number, lat: number): [number, number] => [ox + (lon - b.minLon) * kx * s, oy + (b.maxLat - lat) * s];
}
/** Grid clustering: points in the same cell merge into one marker at their centroid. */
export function clusterPoints<T extends { x: number; y: number }>(pts: T[], cell: number) {
  const m = new Map<string, { x: number; y: number; count: number; members: T[] }>();
  for (const p of pts) { const key = `${Math.floor(p.x / cell)},${Math.floor(p.y / cell)}`; const c = m.get(key); if (c) { c.x = (c.x * c.count + p.x) / (c.count + 1); c.y = (c.y * c.count + p.y) / (c.count + 1); c.count++; c.members.push(p); } else m.set(key, { x: p.x, y: p.y, count: 1, members: [p] }); }
  return [...m.values()];
}
/** Gaussian kernel density on a cols x rows grid, normalised to 0..1. */
export function densityGrid(pts: { x: number; y: number }[], w: number, h: number, cols: number, rows: number, bandwidth: number) {
  const g = Array.from({ length: rows }, () => Array(cols).fill(0) as number[]); let max = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const cx = ((c + 0.5) / cols) * w, cy = ((r + 0.5) / rows) * h; let v = 0; for (const p of pts) { const d2 = (p.x - cx) ** 2 + (p.y - cy) ** 2; v += Math.exp(-d2 / (2 * bandwidth * bandwidth)); } g[r][c] = v; max = Math.max(max, v); }
  return max ? g.map((row) => row.map((v) => v / max)) : g;
}
/** Great-circle-ish arc as an SVG quadratic path bowed perpendicular to the chord. */
export function arcPath(a: [number, number], b: [number, number], bow = 0.25) { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1]; return `M${a[0]},${a[1]}Q${mx - dy * bow},${my + dx * bow} ${b[0]},${b[1]}`; }

// ---------- ranks / formatting ----------
export function rankChange(prev: string[], cur: string[]) { return Object.fromEntries(cur.map((k, i) => [k, prev.indexOf(k) < 0 ? 0 : prev.indexOf(k) - i])) as Record<string, number>; }
export const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
/** Where `value` sits within `peers`, as a 0..1 fraction (share of peers at or below it). */
export const percentRank = (peers: number[], value: number) => (peers.length ? peers.filter((p) => p <= value).length / peers.length : 0);
/** Ranges for a log-spaced latency histogram: returns bucket edges. */
export const logEdges = (min: number, max: number, n: number) => Array.from({ length: n + 1 }, (_, i) => min * (max / min) ** (i / n));
export function histogramByEdges(values: number[], edges: number[]) { const c = Array(edges.length - 1).fill(0) as number[]; for (const v of values) { for (let i = 0; i < c.length; i++) if (v >= edges[i] && (v < edges[i + 1] || (i === c.length - 1 && v <= edges[i + 1]))) { c[i]++; break; } } return c; }

/** Nudge label positions apart so none are closer than `gap`, keeping order and staying within [lo, hi]. */
export function spreadLabels(ys: number[], gap: number, lo = -Infinity, hi = Infinity) {
  const idx = ys.map((_, i) => i).sort((a, b) => ys[a] - ys[b]); const out = [...ys];
  for (let k = 0; k < idx.length; k++) { const i = idx[k]; out[i] = clamp(out[i], lo, hi); if (k > 0) out[i] = Math.max(out[i], out[idx[k - 1]] + gap); }
  for (let k = idx.length - 1; k >= 0; k--) { const i = idx[k]; if (out[i] > hi) out[i] = hi; if (k < idx.length - 1) out[i] = Math.min(out[i], out[idx[k + 1]] - gap); }
  return out;
}

/** Rolling burn rate over a window of intervals. The first `window - 1` points use the data available so far. */
export function rollingBurn(errors: number[], total: number[], slo: number, window: number) {
  return errors.map((_, i) => { const a = Math.max(0, i - window + 1); return burnRate(sum(errors.slice(a, i + 1)), sum(total.slice(a, i + 1)), slo); });
}
/** Cumulative budget remaining (1 = untouched, 0 = spent) given per-interval errors against a period total. */
export function budgetCurve(errors: number[], periodTotal: number, slo: number) { let c = 0; return errors.map((e) => { c += e; return budgetRemaining(c, periodTotal, slo); }); }
/** Day index at which a linear trend of cumulative `done` reaches `scope`, or null if it never will. */
export function projectCompletion(done: number[], scope: number) { const pts = done.map((y, x) => ({ x, y })); const r = linreg(pts); return r.slope <= 0 || done.length < 2 ? null : Math.ceil((scope - r.intercept) / r.slope); }
