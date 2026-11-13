// Layout maths for D043: tidy tree / org chart / mind map, and an average-linkage dendrogram.
export type TreeIn = { id: string; label: string; children?: TreeIn[]; note?: string };
export type TNode = { id: string; label: string; note?: string; depth: number; pos: number; parent: string | null; children: string[]; leaves: number; collapsed: boolean };

/** Leaves take consecutive slots (0,1,2…); a parent sits at the midpoint of its first and last child, so same-depth nodes never overlap (min gap 1). `collapsed` nodes count as leaves. */
export function tidyTree(root: TreeIn, collapsed: ReadonlySet<string> = new Set()): TNode[] {
  const out: TNode[] = []; let next = 0;
  const walk = (n: TreeIn, depth: number, parent: string | null): TNode => {
    const kids = collapsed.has(n.id) ? [] : n.children ?? [];
    const node: TNode = { id: n.id, label: n.label, note: n.note, depth, pos: 0, parent, children: [], leaves: 0, collapsed: collapsed.has(n.id) && !!n.children?.length };
    out.push(node);
    if (!kids.length) { node.pos = next++; node.leaves = 1; return node; }
    const cs = kids.map((k) => walk(k, depth + 1, n.id)); node.children = cs.map((c) => c.id); node.pos = (cs[0].pos + cs[cs.length - 1].pos) / 2; node.leaves = cs.reduce((a, c) => a + c.leaves, 0); return node;
  };
  walk(root, 0, null); return out;
}

/** Mind map: the root's children are split into a left and right half by leaf count (balanced greedily, order kept), each laid out as its own tidy tree. */
export function mindMap(root: TreeIn) {
  const kids = root.children ?? []; const size = (n: TreeIn): number => (n.children?.length ? n.children.reduce((a, c) => a + size(c), 0) : 1);
  const total = kids.reduce((a, k) => a + size(k), 0); let acc = 0; let cut = 0;
  kids.forEach((k, i) => { if (acc + size(k) / 2 <= total / 2) { acc += size(k); cut = i + 1; } });
  const right = kids.slice(0, cut), left = kids.slice(cut);
  return { right: tidyTree({ ...root, children: right }), left: tidyTree({ ...root, children: left }), rightLeaves: right.reduce((a, k) => a + size(k), 0), leftLeaves: left.reduce((a, k) => a + size(k), 0) };
}

export type Merge = { id: number; a: number; b: number; height: number; size: number };
/** UPGMA (average linkage) on a symmetric distance matrix. Leaves are 0..n-1, merges get ids n..2n-2. Heights are non-decreasing. */
export function upgma(d: number[][]): Merge[] {
  const n = d.length; const act = new Map<number, number>(); const sz = new Map<number, number>(); for (let i = 0; i < n; i++) { act.set(i, i); sz.set(i, 1); }
  const dist = new Map<string, number>(); const key = (a: number, b: number) => (a < b ? `${a},${b}` : `${b},${a}`);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) dist.set(key(i, j), d[i][j]);
  const merges: Merge[] = []; let id = n; const live = new Set<number>(Array.from({ length: n }, (_, i) => i));
  while (live.size > 1) {
    let best = Infinity, ba = -1, bb = -1; const ids = [...live].sort((x, y) => x - y);
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) { const v = dist.get(key(ids[i], ids[j]))!; if (v < best) { best = v; ba = ids[i]; bb = ids[j]; } }
    const sa = sz.get(ba)!, sb = sz.get(bb)!; sz.set(id, sa + sb);
    for (const c of ids) if (c !== ba && c !== bb) dist.set(key(id, c), (dist.get(key(ba, c))! * sa + dist.get(key(bb, c))! * sb) / (sa + sb));
    live.delete(ba); live.delete(bb); live.add(id); merges.push({ id, a: ba, b: bb, height: best, size: sa + sb }); id++;
  }
  return merges;
}
export type DNode = { id: number; leaf: boolean; x: number; y: number; a?: number; b?: number };
/** Leaf order from the merge tree (a before b), x = leaf slot, internal x = midpoint of its children, y = merge height. */
export function dendrogramLayout(n: number, merges: Merge[]) {
  const m = new Map(merges.map((x) => [x.id, x])); const root = merges.length ? merges[merges.length - 1].id : 0; const order: number[] = [];
  const nodes = new Map<number, DNode>();
  const walk = (id: number): DNode => {
    const mg = m.get(id); if (!mg) { const nd = { id, leaf: true, x: order.length, y: 0 }; order.push(id); nodes.set(id, nd); return nd; }
    const a = walk(mg.a), b = walk(mg.b); const nd = { id, leaf: false, x: (a.x + b.x) / 2, y: mg.height, a: mg.a, b: mg.b }; nodes.set(id, nd); return nd;
  };
  walk(root); return { order, nodes: [...nodes.values()], maxHeight: merges.length ? merges[merges.length - 1].height : 0 };
}
/** Cut the tree at a height: returns cluster index per leaf. */
export function cutTree(n: number, merges: Merge[], height: number): number[] {
  const parent = Array.from({ length: 2 * n }, (_, i) => i); const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  for (const mg of merges) if (mg.height <= height) { parent[find(mg.a)] = mg.id; parent[find(mg.b)] = mg.id; }
  const roots = new Map<number, number>(); return Array.from({ length: n }, (_, i) => { const r = find(i); if (!roots.has(r)) roots.set(r, roots.size); return roots.get(r)!; });
}
export const euclid = (a: number[], b: number[]) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
