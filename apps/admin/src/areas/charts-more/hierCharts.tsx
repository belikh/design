import { C, Chart, fmt, legendOf, T, type FrameState } from "./kit.tsx";
import { arcPath, fitCircles, maxDepth, packCircles, partition, total, treemap, type HNode } from "./hier.ts";

type Common = { id?: string; height?: number; state?: FrameState };
const branchOf = (root: HNode, path: string[]) => Math.max(0, (root.children ?? []).findIndex((c) => c.name === path[0]));
const pathText = (p: string[]) => p.join(" / ");
const flatRows = (root: HNode, tot: number) => { const out: (string | number)[][] = []; const walk = (n: HNode, path: string[]) => (n.children ?? []).forEach((c) => { const p = [...path, c.name]; out.push([p.join(" / "), total(c), `${((total(c) / tot) * 100).toFixed(1)}%`]); walk(c, p); }); walk(root, []); return out; };
const unit = "GB";
const fits = (w: number, h: number, text: string) => w > text.length * 7 + 10 && h > 20;
const empty = (root: HNode) => total(root) <= 0;

/* ---------- D021: treemap ---------- */
export function TreemapChart({ title = "Treemap", id = "D021", root, unit: u = unit, height = 320, state }: { title?: string; root: HNode; unit?: string } & Common) {
  const tot = total(root), nodes = treemap(root, 1, 1, 0), tops = (root.children ?? []).map((c) => c.name);
  const items = nodes.filter((n) => n.leaf).map((n) => `${pathText(n.path)}: ${fmt(n.value)} ${u}, ${((n.value / tot) * 100).toFixed(1)}% of ${fmt(tot)}`);
  return (
    <Chart title={title} id={id} height={height} state={state} count={empty(root) ? 0 : 1} items={items} legend={legendOf(tops)}
      summary={`Treemap of ${fmt(tot)} ${u} across ${tops.length} groups (${tops.join(", ")}); rectangle area is proportional to size.`}
      table={{ head: ["Path", u, "Share"], rows: flatRows(root, tot) }}
      build={(w, pk) => {
        const all = treemap(root, w, height, 3, 16), leavesN = all.filter((n) => n.leaf);
        return (<>
          {all.filter((n) => !n.leaf).map((g) => <g key={pathText(g.path)}><rect x={g.rect.x} y={g.rect.y} width={g.rect.w} height={g.rect.h} fill={C(branchOf(root, g.path))} fillOpacity={0.18} stroke="var(--jp-surface-raised)" strokeWidth={1} />{g.rect.w > 50 && <T x={g.rect.x + 5} y={g.rect.y + 12} anchor="start" cls="lab-tl">{g.name}</T>}</g>)}
          {leavesN.map((n, i) => <g key={pathText(n.path)}><rect {...pk.mark(i)} x={n.rect.x} y={n.rect.y} width={n.rect.w} height={n.rect.h} fill={C(branchOf(root, n.path))} fillOpacity={0.85} stroke="var(--jp-surface-raised)" strokeWidth={1.5} />
            {fits(n.rect.w, n.rect.h, n.name) && <T x={n.rect.x + 5} y={n.rect.y + 14} anchor="start" cls="lab-tw" pointerEvents="none">{n.name}</T>}</g>)}
        </>);
      }} />
  );
}

/* ---------- D021: sunburst ---------- */
export function Sunburst({ title = "Sunburst", id = "D021", root, unit: u = unit, height = 340, state }: { title?: string; root: HNode; unit?: string } & Common) {
  const tot = total(root), nodes = partition(root), D = maxDepth(nodes), tops = (root.children ?? []).map((c) => c.name);
  return (
    <Chart title={title} id={id} height={height} state={state} count={empty(root) ? 0 : 1} legend={legendOf(tops)}
      items={nodes.map((n) => `${pathText(n.path)}: ${fmt(n.value)} ${u}, ${((n.value / tot) * 100).toFixed(1)}% of total`)}
      summary={`Sunburst with ${D} rings: inner ring is ${tops.join(", ")}; outer rings break each down. Angle is proportional to size.`}
      table={{ head: ["Path", u, "Share"], rows: flatRows(root, tot) }}
      build={(w, pk) => {
        const cx = w / 2, cy = height / 2, R = Math.min(w, height) / 2 - 4, r0 = R * 0.22, rw = (R - r0) / (D || 1);
        return (<>
          {nodes.map((n, i) => <path key={pathText(n.path)} {...pk.mark(i)} d={arcPath(cx, cy, r0 + n.depth * rw, r0 + (n.depth + 1) * rw - 1, n.x0 * Math.PI * 2, n.x1 * Math.PI * 2)} fill={C(n.branch)} fillOpacity={1 - n.depth * 0.22} stroke="var(--jp-surface-raised)" strokeWidth={1.5} />)}
          <T x={cx} y={cy - 2} cls="lab-tc">{fmt(pk.i === null ? tot : nodes[pk.i].value)}</T><T x={cx} y={cy + 14}>{pk.i === null ? u : nodes[pk.i].name}</T>
        </>);
      }} />
  );
}

/* ---------- D021: icicle ---------- */
export function Icicle({ title = "Icicle", id = "D021", root, unit: u = unit, height = 240, state }: { title?: string; root: HNode; unit?: string } & Common) {
  const tot = total(root), nodes = partition(root), D = maxDepth(nodes), tops = (root.children ?? []).map((c) => c.name);
  return (
    <Chart title={title} id={id} height={height} state={state} count={empty(root) ? 0 : 1} legend={legendOf(tops)}
      items={nodes.map((n) => `${pathText(n.path)}: ${fmt(n.value)} ${u}, ${((n.value / tot) * 100).toFixed(1)}% of total`)}
      summary={`Icicle chart with ${D} levels; width is proportional to size, top level is ${tops.join(", ")}.`}
      table={{ head: ["Path", u, "Share"], rows: flatRows(root, tot) }}
      build={(w, pk) => {
        const rh = (height - 4) / (D || 1);
        return (<>{nodes.map((n, i) => { const x = n.x0 * w, ww = (n.x1 - n.x0) * w; return (<g key={pathText(n.path)}><rect {...pk.mark(i)} x={x} y={2 + n.depth * rh} width={Math.max(0, ww - 1)} height={rh - 2} fill={C(n.branch)} fillOpacity={1 - n.depth * 0.2} stroke="var(--jp-surface-raised)" />{fits(ww, rh, n.name) && <T x={x + 5} y={2 + n.depth * rh + rh / 2 + 4} anchor="start" cls="lab-tw" pointerEvents="none">{n.name}</T>}</g>); })}</>);
      }} />
  );
}

/* ---------- D021: packed circles ---------- */
export function PackedCircles({ title = "Packed circles", id = "D021", root, unit: u = unit, height = 320, state }: { title?: string; root: HNode; unit?: string } & Common) {
  const leaves = partition(root).filter((n) => n.leaf), tot = total(root), tops = (root.children ?? []).map((c) => c.name);
  const raw = packCircles(leaves.map((n) => n.value));
  return (
    <Chart title={title} id={id} height={height} state={state} count={empty(root) ? 0 : 1} legend={legendOf(tops)}
      items={leaves.map((n) => `${pathText(n.path)}: ${fmt(n.value)} ${u}, ${((n.value / tot) * 100).toFixed(1)}% of total`)}
      summary={`Packed circles: ${leaves.length} items, circle area proportional to size, coloured by group (${tops.join(", ")}).`}
      table={{ head: ["Path", u, "Share"], rows: leaves.map((n) => [pathText(n.path), n.value, `${((n.value / tot) * 100).toFixed(1)}%`]) }}
      build={(w, pk) => {
        const cs = fitCircles(raw, w, height);
        return (<>{cs.map((c, i) => <g key={i}><circle {...pk.mark(i)} cx={c.x} cy={c.y} r={Math.max(0, c.r - 1)} fill={C(leaves[i].branch)} fillOpacity={0.8} stroke="var(--jp-surface-raised)" strokeWidth={1.5} />{c.r > 22 && <T x={c.x} y={c.y + 4} cls="lab-tw" pointerEvents="none">{leaves[i].name.length * 6.5 > c.r * 2 ? leaves[i].name.slice(0, Math.floor(c.r / 3.5)) + "…" : leaves[i].name}</T>}</g>)}</>);
      }} />
  );
}
