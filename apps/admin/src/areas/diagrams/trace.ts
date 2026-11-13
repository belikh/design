// D049: trace waterfall and flame / icicle layouts.
export type Span = { id: string; parent: string | null; service: string; name: string; start: number; dur: number; error?: boolean };
export type Row = Span & { depth: number; self: number; critical: boolean };
const union = (iv: [number, number][]) => { const s = [...iv].sort((a, b) => a[0] - b[0]); let tot = 0, end = -Infinity, st = 0; for (const [a, b] of s) { if (a > end) { tot += end - st > 0 ? end - st : 0; st = a; end = b; } else end = Math.max(end, b); } return tot + (end - st > 0 ? end - st : 0); };
/** Rows in depth-first order (children by start time). self = duration minus the union of child intervals clipped to the span. Critical = at each level the child that ends last. */
export function waterfall(spans: Span[]): Row[] {
  const kids = new Map<string | null, Span[]>(); spans.forEach((s) => kids.set(s.parent, [...(kids.get(s.parent) ?? []), s])); kids.forEach((v) => v.sort((a, b) => a.start - b.start || b.dur - a.dur));
  const rows: Row[] = [];
  const walk = (s: Span, depth: number, critical: boolean) => {
    const ch = kids.get(s.id) ?? []; const self = Math.max(0, s.dur - union(ch.map((c) => [Math.max(c.start, s.start), Math.min(c.start + c.dur, s.start + s.dur)] as [number, number]).filter(([a, b]) => b > a)));
    rows.push({ ...s, depth, self, critical }); const last = ch.length ? ch.reduce((a, c) => (c.start + c.dur >= a.start + a.dur ? c : a)) : null;
    ch.forEach((c) => walk(c, depth + 1, critical && c === last));
  };
  (kids.get(null) ?? []).forEach((r) => walk(r, 0, true)); return rows;
}
export type Tree = { name: string; value: number; self: number; children: Tree[] };
/** Fold "a;b;c N" stack samples into a call tree. value = samples including children. */
export function foldStacks(stacks: [string, number][]): Tree {
  const root: Tree = { name: "all", value: 0, self: 0, children: [] };
  for (const [stack, n] of stacks) { root.value += n; let cur = root; const fr = stack.split(";"); fr.forEach((f, i) => { let c = cur.children.find((x) => x.name === f); if (!c) { c = { name: f, value: 0, self: 0, children: [] }; cur.children.push(c); } c.value += n; if (i === fr.length - 1) c.self += n; cur = c; }); if (!fr.length) root.self += n; }
  return root;
}
export type FRect = { path: string[]; name: string; depth: number; x0: number; x1: number; value: number; self: number };
/** Widths ∝ samples within [0,1]. Flame graphs sort siblings by name (so identical stacks line up); icicle by size (largest first). */
export function flameLayout(root: Tree, sort: "name" | "size" = "name"): FRect[] {
  const out: FRect[] = [];
  const walk = (t: Tree, path: string[], x0: number, x1: number, depth: number) => {
    out.push({ path, name: t.name, depth, x0, x1, value: t.value, self: t.self });
    const ch = [...t.children].sort(sort === "name" ? (a, b) => a.name.localeCompare(b.name) : (a, b) => b.value - a.value || a.name.localeCompare(b.name));
    let x = x0; for (const c of ch) { const w = (x1 - x0) * (c.value / t.value); walk(c, [...path, c.name], x, x + w, depth + 1); x += w; }
  };
  walk(root, [root.name], 0, 1, 0); return out;
}
export const subtree = (root: Tree, path: string[]): Tree => { let cur = root; for (const p of path.slice(1)) cur = cur.children.find((c) => c.name === p) ?? cur; return cur; };
