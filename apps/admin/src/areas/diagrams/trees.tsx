import { useMemo, useState } from "react";
import { cutTree, dendrogramLayout, euclid, mindMap, tidyTree, upgma, type TNode, type TreeIn } from "./tree.ts";
import { C, Chart, Legend, Note, Readout, Scroll, Svg, useActions, useHits } from "./kit.tsx";
import type { FrameState } from "../charts/frame.tsx";

type Common = { title?: string; state?: FrameState };
const flat = (t: TreeIn, path: string[] = []): { id: string; label: string; path: string[]; note?: string }[] => [{ id: t.id, label: t.label, path: [...path, t.label], note: t.note }, ...(t.children ?? []).flatMap((c) => flat(c, [...path, t.label]))];
const tw = (s: string) => Math.round(s.length * 7.4 + 18);
const elbow = (x0: number, y0: number, x1: number, y1: number) => { const m = (x0 + x1) / 2; return `M${x0},${y0}C${m},${y0} ${m},${y1} ${x1},${y1}`; };

/** D043 Tree diagram: horizontal tidy tree; Enter or click on a branch collapses or expands it. */
export function TreeDiagram({ root, title = "Tree diagram: alert taxonomy", state }: Common & { root: TreeIn }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set()); const { text, act } = useActions();
  const nodes = useMemo(() => tidyTree(root, collapsed), [root, collapsed]); const all = flat(root); const by = new Map(nodes.map((n) => [n.id, n]));
  const toggle = (id: string) => setCollapsed((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const orig = new Map<string, TreeIn>(); const idx = (t: TreeIn) => { orig.set(t.id, t); t.children?.forEach(idx); }; idx(root);
  return (
    <Chart title={title} n={all.length} state={state} height={300} table={{ head: ["Node", "Path"], rows: all.map((a) => [a.label, a.path.join(" > ")]) }}>
      {(w) => {
        const rowH = 30, colW = Math.max(120, Math.min(190, (w - 40) / (Math.max(...nodes.map((n) => n.depth)) + 1))), H = Math.max(80, (Math.max(...nodes.map((n) => n.pos)) + 1) * rowH + 20);
        const xy = (n: TNode): [number, number] => [10 + n.depth * colW, 14 + n.pos * rowH];
        return (
          <>
            <Scroll label={title}>
              <Svg w={Math.max(w, 10 + (Math.max(...nodes.map((n) => n.depth)) + 1) * colW + 40)} h={H} label={`${title}. ${all.length} nodes in ${Math.max(...nodes.map((n) => n.depth)) + 1} levels. Press Enter on a branch to collapse or expand it.`}>
                {nodes.filter((n) => n.parent).map((n) => { const [x1, y1] = xy(n), [x0, y0] = xy(by.get(n.parent!)!); return <path key={n.id} className="p3e-edge" d={elbow(x0 + tw(by.get(n.parent!)!.label), y0, x1, y1)} />; })}
                {nodes.map((n) => { const [x, y] = xy(n); const o = orig.get(n.id)!; const branch = !!o.children?.length; const label = `${n.label}${branch ? (n.collapsed ? ", collapsed, " + o.children!.length + " children" : ", " + n.children.length + " children") : ", leaf"}`;
                  const g = branch ? act(n.id, label, () => toggle(n.id), !n.collapsed) : { tabIndex: 0, role: "img" as const, "aria-label": label, className: "p3e-pt" };
                  return <g key={n.id} {...g}><rect x={x} y={y - 12} width={tw(n.label)} height="24" rx="12" className="p3e-box" fill={branch ? "var(--jp-surface)" : undefined} /><text x={x + 9} y={y} dy="0.35em">{n.label}{n.collapsed ? " +" : ""}</text></g>; })}
              </Svg>
            </Scroll>
            <Readout>{text}</Readout>
          </>
        );
      }}
    </Chart>
  );
}

/** D043 Org chart: top-down boxes; focusing a person reads out the reporting chain. */
export function OrgChart({ root, title = "Org chart: leadership structure", state }: Common & { root: TreeIn }) {
  const { text, hit } = useHits(); const nodes = useMemo(() => tidyTree(root), [root]); const all = flat(root); const info = new Map(all.map((a) => [a.id, a]));
  return (
    <Chart title={title} n={all.length} state={state} height={340} table={{ head: ["Name", "Role", "Reports through"], rows: all.map((a) => [a.label, a.note ?? "", a.path.slice(0, -1).join(" > ")]) }}>
      {(w) => {
        const bw = 112, bh = 46, gx = 14, gy = 36, unit = bw + gx, maxD = Math.max(...nodes.map((n) => n.depth)), W = Math.max(w, (Math.max(...nodes.map((n) => n.pos)) + 1) * unit), H = (maxD + 1) * (bh + gy);
        const by = new Map(nodes.map((n) => [n.id, n])); const cx = (n: TNode) => n.pos * unit + bw / 2 + (W - (Math.max(...nodes.map((m) => m.pos)) + 1) * unit) / 2, cy = (n: TNode) => n.depth * (bh + gy);
        return (
          <>
            <Scroll label={title}>
              <Svg w={W} h={H} label={`${title}. ${all.length} people in ${maxD + 1} levels. Each box is focusable.`}>
                {nodes.filter((n) => n.parent).map((n) => { const p = by.get(n.parent!)!; const y0 = cy(p) + bh, y1 = cy(n), m = (y0 + y1) / 2; return <path key={n.id} className="p3e-edge" d={`M${cx(p)},${y0}V${m}H${cx(n)}V${y1}`} />; })}
                {nodes.map((n) => { const a = info.get(n.id)!; return (
                  <g key={n.id} {...hit(n.id, `${a.label}, ${a.note}. Reports through ${a.path.slice(0, -1).join(", then ") || "no one"}. ${n.children.length} direct reports.`)}>
                    <rect x={cx(n) - bw / 2} y={cy(n)} width={bw} height={bh} rx="6" className="p3e-box" style={{ stroke: n.depth === 0 ? "var(--jp-accent)" : undefined }} />
                    <text x={cx(n)} y={cy(n) + 19} textAnchor="middle" className="p3e-b">{n.label}</text><text x={cx(n)} y={cy(n) + 35} textAnchor="middle" className="p3e-mute">{n.note}</text>
                  </g>); })}
              </Svg>
            </Scroll>
            <Readout>{text}</Readout>
          </>
        );
      }}
    </Chart>
  );
}

/** D043 Mind map: the root in the middle, branches balanced to the left and right. */
export function MindMap({ root, title = "Mind map: incident response", state }: Common & { root: TreeIn }) {
  const { text, hit } = useHits(); const m = useMemo(() => mindMap(root), [root]); const all = flat(root);
  return (
    <Chart title={title} n={all.length} state={state} height={380} table={{ head: ["Topic", "Branch path"], rows: all.map((a) => [a.label, a.path.join(" > ")]) }}>
      {(w) => {
        const rowH = 30, rows = Math.max(m.leftLeaves, m.rightLeaves), H = Math.max(240, rows * rowH + 30), maxD = Math.max(1, ...m.left.map((n) => n.depth), ...m.right.map((n) => n.depth)), cw = Math.max(110, (w / 2 - 60) / maxD); const W = Math.max(w, 2 * (maxD * cw + 90));
        const info = new Map(all.map((a) => [a.id, a]));
        const place = (ns: TNode[], side: 1 | -1) => { const leaves = side === 1 ? m.rightLeaves : m.leftLeaves; const off = (H - leaves * rowH) / 2 + rowH / 2; return new Map(ns.map((n) => [n.id, { x: W / 2 + side * n.depth * cw, y: off + n.pos * rowH, n }])); };
        const R = place(m.right, 1), L = place(m.left, -1); const rootN = { x: W / 2, y: H / 2 };
        const draw = (P: Map<string, { x: number; y: number; n: TNode }>, side: 1 | -1) => [...P.values()].filter((p) => p.n.parent).map((p) => { const par = p.n.parent === root.id ? rootN : P.get(p.n.parent!)!; return <path key={p.n.id} className="p3e-edge" d={elbow(par.x, par.y, p.x, p.y)} stroke={C(Math.max(0, all.findIndex((a) => a.id === p.n.id)) % 8)} style={{ stroke: C(branchIndex(root, p.n.id)) }} data-side={side} />; });
        const label = (p: { x: number; y: number; n: TNode }, side: 1 | -1) => <g key={p.n.id} {...hit(p.n.id, `${p.n.label}. Path: ${info.get(p.n.id)?.path.join(" > ")}`)}><rect x={side === 1 ? p.x : p.x - tw(p.n.label)} y={p.y - 12} width={tw(p.n.label)} height="24" rx="12" className="p3e-box" style={{ stroke: C(branchIndex(root, p.n.id)) }} /><text x={(side === 1 ? p.x : p.x - tw(p.n.label)) + 9} y={p.y} dy="0.35em">{p.n.label}</text></g>;
        return (
          <>
            <Scroll label={title}>
              <Svg w={W} h={H} label={`${title}. Central topic with ${root.children?.length ?? 0} branches, ${all.length - 1} topics in total.`}>
                {draw(R, 1)}{draw(L, -1)}
                {[...R.values()].filter((p) => p.n.parent).map((p) => label(p, 1))}{[...L.values()].filter((p) => p.n.parent).map((p) => label(p, -1))}
                <g {...hit(root.id, `${root.label}: central topic with ${root.children?.length ?? 0} branches`)}><rect x={rootN.x - tw(root.label) / 2 - 8} y={rootN.y - 18} width={tw(root.label) + 16} height="36" rx="18" fill="var(--jp-accent)" /><text x={rootN.x} y={rootN.y} dy="0.35em" textAnchor="middle" className="p3e-b p3e-on">{root.label}</text></g>
              </Svg>
            </Scroll>
            <Readout>{text}</Readout>
          </>
        );
      }}
    </Chart>
  );
}
const branchIndex = (root: TreeIn, id: string): number => { const i = (root.children ?? []).findIndex((b) => flat(b).some((x) => x.id === id)); return i < 0 ? 0 : i; };

/** D043 Dendrogram: average-linkage clustering of feature vectors. The slider cuts the tree; branches below the cut take their cluster colour. */
export function Dendrogram({ labels, vectors, title = "Dendrogram: service similarity", state }: Common & { labels: string[]; vectors: number[][] }) {
  const merges = useMemo(() => upgma(vectors.map((a) => vectors.map((b) => euclid(a, b)))), [vectors]); const lay = useMemo(() => dendrogramLayout(labels.length, merges), [labels, merges]);
  const [cut, setCut] = useState(() => Math.round(lay.maxHeight * 0.45 * 10) / 10); const { text, hit } = useHits<number>();
  const cl = cutTree(labels.length, merges, cut); const k = new Set(cl).size; const by = new Map(lay.nodes.map((n) => [n.id, n]));
  const leafOf = (id: number): number => { const n = by.get(id)!; return n.leaf ? id : leafOf(n.a!); };
  const members = (id: number): number[] => { const n = by.get(id)!; return n.leaf ? [id] : [...members(n.a!), ...members(n.b!)]; };
  return (
    <>
      <div className="p3e-controls"><label>Cut height <input type="range" min={0} max={Math.ceil(lay.maxHeight * 10) / 10} step={0.1} value={cut} onChange={(e) => setCut(+e.target.value)} aria-valuetext={`${cut}: ${k} clusters`} /></label><span className="p3e-badge">{k} clusters at {cut.toFixed(1)}</span></div>
      <Chart title={title} n={labels.length} state={state} height={340} table={{ head: ["Service", "Cluster at cut", "Merge heights above (low to high)"], rows: lay.order.map((i) => [labels[i], `C${cl[i] + 1}`, merges.filter((m) => members(m.id).includes(i)).map((m) => m.height.toFixed(2)).join(", ")]) }}>
        {(w) => {
          const padB = 86, padT = 14, H = 340, pw = (w - 30) / Math.max(1, labels.length - 1); const X = (x: number) => 15 + x * pw, Y = (h: number) => H - padB - (h / (lay.maxHeight || 1)) * (H - padB - padT);
          const colOf = (id: number, h: number) => (h <= cut ? C(cl[leafOf(id)]) : "var(--jp-text-muted)");
          return (
            <>
              <Svg w={w} h={H} label={`${title}. ${labels.length} items merged in ${merges.length} steps; cutting at height ${cut.toFixed(1)} gives ${k} clusters.`}>
                {lay.nodes.filter((n) => !n.leaf).map((n) => { const a = by.get(n.a!)!, b = by.get(n.b!)!; return <path key={n.id} className="p3e-edge" stroke={colOf(n.id, n.y)} strokeWidth="2" d={`M${X(a.x)},${Y(a.y)}V${Y(n.y)}H${X(b.x)}V${Y(b.y)}`} />; })}
                <line x1="0" x2={w} y1={Y(cut)} y2={Y(cut)} stroke="var(--jp-accent)" strokeDasharray="5 4" /><text x={w - 4} y={Y(cut) - 4} textAnchor="end" className="p3e-mute">cut {cut.toFixed(1)}</text>
                {lay.order.map((leaf) => { const n = by.get(leaf)!; return <g key={leaf} {...hit(leaf, `${labels[leaf]}: cluster ${cl[leaf] + 1} of ${k} at cut ${cut.toFixed(1)}. Cluster mates: ${lay.order.filter((o) => cl[o] === cl[leaf] && o !== leaf).map((o) => labels[o]).join(", ") || "none"}`)}><circle cx={X(n.x)} cy={Y(0)} r="5" fill={C(cl[leaf])} /><text x={X(n.x)} y={Y(0) + 12} transform={`rotate(50 ${X(n.x)} ${Y(0) + 12})`}>{labels[leaf]}</text></g>; })}
              </Svg>
              <Readout>{text}</Readout>
            </>
          );
        }}
      </Chart>
      <Legend items={Array.from({ length: k }, (_, i) => ({ label: `C${i + 1}: ${lay.order.filter((o) => cl[o] === i).map((o) => labels[o]).join(", ")}`, color: C(i) }))} />
      <Note>Distance is Euclidean on three traffic-profile features; heights are average-linkage (UPGMA) merge distances.</Note>
    </>
  );
}
