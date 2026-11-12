/* Pure hierarchy layouts: squarified treemap, partition (icicle / sunburst), circle packing. */
export type HNode = { name: string; value?: number; children?: HNode[] };
export const total = (n: HNode): number => (n.children?.length ? n.children.reduce((a, c) => a + total(c), 0) : Math.max(0, n.value ?? 0));
export type Rect = { x: number; y: number; w: number; h: number };

/** Squarified treemap (Bruls et al.): returns one rect per item, in input order, tiling `r` with areas proportional to value. */
export function squarify(values: number[], r: Rect): Rect[] {
  const sum = values.reduce((a, b) => a + Math.max(0, b), 0); const out: Rect[] = values.map(() => ({ x: r.x, y: r.y, w: 0, h: 0 }));
  if (sum <= 0 || r.w <= 0 || r.h <= 0) return out;
  const order = values.map((_, i) => i).filter((i) => values[i] > 0).sort((a, b) => values[b] - values[a]);
  const k = (r.w * r.h) / sum; let { x, y, w, h } = r; let row: number[] = [];
  const worst = (rw: number[], side: number) => { const s = rw.reduce((a, i) => a + values[i] * k, 0); let mx = 0, mn = Infinity; for (const i of rw) { const a = values[i] * k; mx = Math.max(mx, a); mn = Math.min(mn, a); } return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn)); };
  const flush = () => {
    const s = row.reduce((a, i) => a + values[i] * k, 0); const horiz = w >= h; const side = horiz ? h : w; const thick = s / side; let p = 0;
    for (const i of row) { const len = (values[i] * k) / thick; out[i] = horiz ? { x, y: y + p, w: thick, h: len } : { x: x + p, y, w: len, h: thick }; p += len; }
    if (horiz) { x += thick; w -= thick; } else { y += thick; h -= thick; } row = [];
  };
  for (const i of order) { const side = Math.min(w, h); if (row.length && worst([...row, i], side) > worst(row, side)) flush(); row.push(i); }
  if (row.length) flush(); return out;
}

export type TNode = { name: string; value: number; depth: number; path: string[]; rect: Rect; leaf: boolean };
/** Nested treemap: groups are tiled first, then their children inside the group rect (inset by `pad` and a `head` strip for the label). */
export function treemap(root: HNode, w: number, h: number, pad = 2, head = 0): TNode[] {
  const out: TNode[] = [];
  const walk = (n: HNode, r: Rect, depth: number, path: string[]) => {
    const kids = (n.children ?? []).filter((c) => total(c) > 0); if (!kids.length) return;
    const rects = squarify(kids.map(total), r);
    kids.forEach((c, i) => {
      const rc = rects[i]; const leaf = !c.children?.length; out.push({ name: c.name, value: total(c), depth, path: [...path, c.name], rect: rc, leaf });
      if (!leaf) walk(c, { x: rc.x + pad, y: rc.y + pad + head, w: Math.max(0, rc.w - 2 * pad), h: Math.max(0, rc.h - 2 * pad - head) }, depth + 1, [...path, c.name]);
    });
  };
  walk(root, { x: 0, y: 0, w, h }, 0, []); return out;
}

export type PNode = { name: string; value: number; depth: number; x0: number; x1: number; path: string[]; leaf: boolean; branch: number };
/** Partition layout: every node gets a span [x0, x1] of the unit interval proportional to its value, and a depth. Root is excluded. */
export function partition(root: HNode): PNode[] {
  const out: PNode[] = []; const walk = (n: HNode, x0: number, x1: number, depth: number, path: string[], branch: number) => {
    const kids = (n.children ?? []).filter((c) => total(c) > 0); const t = kids.reduce((a, c) => a + total(c), 0); let x = x0;
    kids.forEach((c, i) => { const span = ((x1 - x0) * total(c)) / t; const p = [...path, c.name]; const leaf = !c.children?.length; const b = depth === 0 ? i : branch; out.push({ name: c.name, value: total(c), depth, x0: x, x1: x + span, path: p, leaf, branch: b }); walk(c, x, x + span, depth + 1, p, b); x += span; });
  };
  walk(root, 0, 1, 0, [], 0); return out;
}
export const maxDepth = (nodes: PNode[]) => nodes.reduce((a, n) => Math.max(a, n.depth + 1), 0);

/** SVG path for an annular sector; angles in radians clockwise from 12 o'clock. A full circle is split into two halves. */
export function arcPath(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  const full = a1 - a0 >= Math.PI * 2 - 1e-6; if (full) a1 = a0 + Math.PI * 2 - 1e-4;
  const P = (r: number, a: number) => `${(cx + r * Math.sin(a)).toFixed(2)},${(cy - r * Math.cos(a)).toFixed(2)}`; const large = a1 - a0 > Math.PI ? 1 : 0;
  if (r0 <= 0.01) return `M${cx},${cy}L${P(r1, a0)}A${r1},${r1} 0 ${large} 1 ${P(r1, a1)}Z`;
  return `M${P(r1, a0)}A${r1},${r1} 0 ${large} 1 ${P(r1, a1)}L${P(r0, a1)}A${r0},${r0} 0 ${large} 0 ${P(r0, a0)}Z`;
}

export type Circle = { x: number; y: number; r: number };
/** Pack circles with area proportional to value (greedy tangent placement). Returns circles in input order, centred on the origin. */
export function packCircles(values: number[]): Circle[] {
  const order = values.map((_, i) => i).filter((i) => values[i] > 0).sort((a, b) => values[b] - values[a]); const out: Circle[] = values.map(() => ({ x: 0, y: 0, r: 0 })); const placed: number[] = [];
  const gap = 1e-6; const ok = (c: Circle) => placed.every((j) => Math.hypot(out[j].x - c.x, out[j].y - c.y) >= out[j].r + c.r - gap);
  for (const i of order) {
    const r = Math.sqrt(values[i]); out[i].r = r;
    if (!placed.length) { placed.push(i); continue; }
    if (placed.length === 1) { out[i].x = out[placed[0]].r + r; placed.push(i); continue; }
    const cx = placed.reduce((a, j) => a + out[j].x * out[j].r ** 2, 0) / placed.reduce((a, j) => a + out[j].r ** 2, 0), cy = placed.reduce((a, j) => a + out[j].y * out[j].r ** 2, 0) / placed.reduce((a, j) => a + out[j].r ** 2, 0);
    let best: Circle | null = null, bd = Infinity;
    for (let p = 0; p < placed.length; p++) for (let q = p + 1; q < placed.length; q++) {
      const A = out[placed[p]], B = out[placed[q]]; const ra = A.r + r, rb = B.r + r, d = Math.hypot(B.x - A.x, B.y - A.y); if (d > ra + rb || d < Math.abs(ra - rb) || d === 0) continue;
      const a = (ra * ra - rb * rb + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, ra * ra - a * a)), mx = A.x + (a * (B.x - A.x)) / d, my = A.y + (a * (B.y - A.y)) / d;
      for (const s of [1, -1]) { const c = { x: mx + (s * hh * (B.y - A.y)) / d, y: my - (s * hh * (B.x - A.x)) / d, r }; const dist = Math.hypot(c.x - cx, c.y - cy); if (dist < bd && ok(c)) { bd = dist; best = c; } }
    }
    if (!best) best = { x: Math.max(...placed.map((j) => out[j].x + out[j].r)) + r, y: 0, r };
    out[i] = best; placed.push(i);
  }
  return out;
}
/** Scale packed circles to fit a box (preserving proportions) and centre them. */
export function fitCircles(cs: Circle[], w: number, h: number, pad = 2): Circle[] {
  const live = cs.filter((c) => c.r > 0); if (!live.length) return cs;
  const x0 = Math.min(...live.map((c) => c.x - c.r)), x1 = Math.max(...live.map((c) => c.x + c.r)), y0 = Math.min(...live.map((c) => c.y - c.r)), y1 = Math.max(...live.map((c) => c.y + c.r));
  const s = Math.min((w - 2 * pad) / (x1 - x0), (h - 2 * pad) / (y1 - y0)); const ox = w / 2 - ((x0 + x1) / 2) * s, oy = h / 2 - ((y0 + y1) / 2) * s;
  return cs.map((c) => ({ x: c.x * s + ox, y: c.y * s + oy, r: c.r * s }));
}
