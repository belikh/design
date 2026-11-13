// Layout maths for D041: sankey, alluvial, chord and arc diagrams. Pure functions, no React.
export type SLink = { source: string; target: string; value: number };
export type SNodeIn = { id: string; label?: string; col?: number };
export type SankeyNode = { id: string; label: string; col: number; value: number; in: number; out: number; x0: number; x1: number; y0: number; y1: number };
export type SankeyLink = { source: string; target: string; value: number; width: number; sy: number; ty: number; x0: number; x1: number };

/** Layered sankey: column = longest path from a source (or given), node height ∝ max(in, out), one shared scale per diagram so flows are comparable. */
export function sankey(nodesIn: SNodeIn[], linksIn: SLink[], o: { width: number; height: number; nodeWidth?: number; pad?: number }) {
  const nodeWidth = o.nodeWidth ?? 14, pad = o.pad ?? 10;
  const links = linksIn.filter((l) => l.value > 0);
  const col = new Map<string, number>(); nodesIn.forEach((n) => { if (n.col !== undefined) col.set(n.id, n.col); });
  const depth = (id: string, seen: Set<string>): number => {
    if (col.has(id)) return col.get(id)!;
    if (seen.has(id)) throw new Error(`cycle at ${id}`);
    seen.add(id);
    const ins = links.filter((l) => l.target === id);
    const d = ins.length ? Math.max(...ins.map((l) => depth(l.source, seen) + 1)) : 0; seen.delete(id); col.set(id, d); return d;
  };
  nodesIn.forEach((n) => depth(n.id, new Set()));
  const ncol = Math.max(0, ...col.values()) + 1;
  const nodes: SankeyNode[] = nodesIn.map((n) => {
    const i = links.filter((l) => l.target === n.id).reduce((a, l) => a + l.value, 0), out = links.filter((l) => l.source === n.id).reduce((a, l) => a + l.value, 0);
    return { id: n.id, label: n.label ?? n.id, col: col.get(n.id)!, value: Math.max(i, out), in: i, out, x0: 0, x1: 0, y0: 0, y1: 0 };
  });
  const cols: SankeyNode[][] = Array.from({ length: ncol }, (_, c) => nodes.filter((n) => n.col === c));
  const ky = Math.min(...cols.filter((c) => c.length).map((c) => (o.height - pad * (c.length - 1)) / (c.reduce((a, n) => a + n.value, 0) || 1)));
  const stepX = ncol > 1 ? (o.width - nodeWidth) / (ncol - 1) : 0;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const place = () => cols.forEach((c, ci) => { let y = 0; const used = c.reduce((a, n) => a + n.value * ky, 0) + pad * Math.max(0, c.length - 1); y = (o.height - used) / 2; c.forEach((n) => { n.x0 = ci * stepX; n.x1 = n.x0 + nodeWidth; n.y0 = y; n.y1 = y + n.value * ky; y = n.y1 + pad; }); });
  place();
  // barycentre ordering to reduce crossings (a few relaxation sweeps), then re-place
  for (let it = 0; it < 4; it++) {
    for (let ci = 1; ci < ncol; ci++) {
      const key = (n: SankeyNode) => { const ls = links.filter((l) => l.target === n.id); const w = ls.reduce((a, l) => a + l.value, 0); return w ? ls.reduce((a, l) => a + ((byId.get(l.source)!.y0 + byId.get(l.source)!.y1) / 2) * l.value, 0) / w : (n.y0 + n.y1) / 2; };
      const k = new Map(cols[ci].map((n) => [n.id, key(n)])); cols[ci].sort((a, b) => k.get(a.id)! - k.get(b.id)!); place();
    }
  }
  const outOff = new Map<string, number>(), inOff = new Map<string, number>();
  const sorted = [...links].sort((a, b) => byId.get(a.target)!.y0 - byId.get(b.target)!.y0 || byId.get(a.source)!.y0 - byId.get(b.source)!.y0);
  const outLinks: SankeyLink[] = []; 
  for (const l of sorted) { const s = byId.get(l.source)!, t = byId.get(l.target)!; const w = l.value * ky; const so = outOff.get(s.id) ?? 0; outOff.set(s.id, so + w); outLinks.push({ ...l, width: w, sy: s.y0 + so + w / 2, ty: 0, x0: s.x1, x1: t.x0 }); }
  const byT = [...outLinks].sort((a, b) => a.sy - b.sy);
  for (const l of byT) { const t = byId.get(l.target)!; const io = inOff.get(t.id) ?? 0; inOff.set(t.id, io + l.width); l.ty = t.y0 + io + l.width / 2; }
  return { nodes, links: outLinks, ky };
}

/** Alluvial: categorical states per stage with cohort paths; reduces to a sankey whose columns are the stages. */
export function alluvial(stages: string[], paths: { states: string[]; value: number }[]) {
  const nodeIds = new Map<string, SNodeIn>(); const agg = new Map<string, number>();
  for (const p of paths) {
    p.states.forEach((s, i) => { const id = `${i}:${s}`; if (!nodeIds.has(id)) nodeIds.set(id, { id, label: s, col: i }); });
    for (let i = 0; i + 1 < p.states.length; i++) { const k = `${i}:${p.states[i]}|${i + 1}:${p.states[i + 1]}`; agg.set(k, (agg.get(k) ?? 0) + p.value); }
  }
  const links: SLink[] = [...agg].map(([k, value]) => { const [source, target] = k.split("|"); return { source, target, value }; });
  return { stages, nodes: [...nodeIds.values()], links };
}

/** Chord layout (as d3-chord): group arcs sized by row totals with a gap; each chord's two ends sized by the matrix cells. Angles in radians clockwise from 12 o'clock. */
export type ChordEnd = { index: number; start: number; end: number; value: number };
export function chord(m: number[][], gap = 0.04) {
  const n = m.length; const rowSum = m.map((r) => r.reduce((a, b) => a + b, 0)); const total = rowSum.reduce((a, b) => a + b, 0);
  const k = total ? (2 * Math.PI - gap * n) / total : 0;
  const groups: ChordEnd[] = []; const sub: { start: number; end: number }[][] = Array.from({ length: n }, () => []); let x = 0;
  for (let i = 0; i < n; i++) { const x0 = x; for (let j = 0; j < n; j++) { const v = m[i][j]; sub[i][j] = { start: x, end: x + v * k }; x += v * k; } groups.push({ index: i, start: x0, end: x, value: rowSum[i] }); x += gap; }
  const chords: { source: ChordEnd; target: ChordEnd }[] = [];
  for (let i = 0; i < n; i++) for (let j = i; j < n; j++) { if (!m[i][j] && !m[j][i]) continue; chords.push({ source: { index: i, ...sub[i][j], value: m[i][j] }, target: { index: j, ...sub[j][i], value: m[j][i] } }); }
  return { groups, chords };
}

/** Arc diagram: nodes in a row (given order), each link is a semicircle whose height ∝ span. */
export function arcLayout(ids: string[], links: { source: string; target: string; value: number }[], width: number, pad = 16) {
  const step = ids.length > 1 ? (width - 2 * pad) / (ids.length - 1) : 0; const x = new Map(ids.map((id, i) => [id, pad + i * step]));
  return { x, arcs: links.map((l) => { const a = x.get(l.source)!, b = x.get(l.target)!; return { ...l, x0: Math.min(a, b), x1: Math.max(a, b), r: Math.abs(b - a) / 2 }; }) };
}
