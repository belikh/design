import { useMemo } from "react";
import { alluvial, arcLayout, chord, sankey, type SLink, type SNodeIn } from "./flow.ts";
import { C, Chart, Legend, Note, Readout, Svg, fmt, sum, useHits } from "./kit.tsx";
import type { FrameState } from "../charts/frame.tsx";

type Common = { title?: string; state?: FrameState };
const ribbon = (x0: number, y0: number, x1: number, y1: number) => { const m = (x0 + x1) / 2; return `M${x0},${y0}C${m},${y0} ${m},${y1} ${x1},${y1}`; };

/** D041 Sankey: node height ∝ flow, one shared scale; focusing a node dims every flow that does not touch it. */
export function Sankey({ nodes, links, unit = "visits", title = "Sankey: traffic source to landing page to outcome", colour, stageNames, state }: Common & { nodes: SNodeIn[]; links: SLink[]; unit?: string; colour?: (id: string, i: number) => string; stageNames?: string[] }) {
  const { sel, text, hit } = useHits();
  return (
    <Chart title={title} n={links.length} state={state} height={340}
      table={{ head: ["From", "To", `Flow (${unit})`], rows: links.map((l) => [l.source, l.target, l.value]) }}>
      {(w) => {
        const padL = 78, padR = 92, top = stageNames ? 22 : 6, H = 340; const s = sankey(nodes, links, { width: Math.max(120, w - padL - padR), height: H - top - 6 });
        const col = (id: string) => (colour ? colour(id, nodes.findIndex((n) => n.id === id)) : C(nodes.findIndex((n) => n.id === id))); const last = Math.max(...s.nodes.map((n) => n.col));
        const touches = (id: string, l: { source: string; target: string }) => !sel || l.source === id || l.target === id; const on = (l: { source: string; target: string }) => !sel || l.source === sel || l.target === sel;
        return (
          <>
            <Svg w={w} h={H} label={`${title}. ${links.length} flows between ${nodes.length} nodes; total ${fmt(sum(s.nodes.filter((n) => n.col === 0).map((n) => n.value)))} ${unit}. Use the data table for exact values.`}>
              <g transform={`translate(${padL},${top})`}>
                {stageNames && Array.from({ length: last + 1 }, (_, c) => <text key={c} x={(s.nodes.find((n) => n.col === c)?.x0 ?? 0)} y={-8} className="dg-mute">{stageNames[c]}</text>)}
                {s.links.map((l, i) => <path key={i} className={`dg-link${sel && !on(l) ? " dg-dim" : ""}`} d={ribbon(l.x0, l.sy, l.x1, l.ty)} stroke={col(l.source)} strokeWidth={Math.max(1, l.width)} strokeOpacity={0.5} />)}
                {s.nodes.map((n) => (
                  <g key={n.id} {...hit(n.id, `${n.label}: ${fmt(n.value)} ${unit}${n.in ? `, ${fmt(n.in)} in` : ""}${n.out ? `, ${fmt(n.out)} out` : ""}. ${s.links.filter((l) => l.source === n.id).map((l) => `${fmt(l.value)} to ${l.target}`).join(", ")}`)}>
                    <rect x={n.x0} y={n.y0} width={n.x1 - n.x0} height={Math.max(1, n.y1 - n.y0)} fill={col(n.id)} rx="2" />
                    <text x={n.col === 0 ? n.x0 - 6 : n.x1 + 6} y={(n.y0 + n.y1) / 2} dy="0.35em" textAnchor={n.col === 0 ? "end" : "start"} className="dg-halo">{n.label}</text>
                  </g>))}
              </g>
            </Svg>
            <Readout>{text}</Readout>
          </>
        );
      }}
    </Chart>
  );
}

const STATE_COL: Record<string, number> = { Free: 0, Pro: 1, Team: 2, Churned: 6 };
/** D041 Alluvial: categorical states per stage; each ribbon is the cohort moving from one state to another between neighbouring stages. */
export function Alluvial({ stages, paths, title = "Alluvial: plan changes by quarter", state }: Common & { stages: string[]; paths: { states: string[]; value: number }[] }) {
  const a = useMemo(() => alluvial(stages, paths), [stages, paths]);
  const names = [...new Set(a.nodes.map((n) => n.label ?? n.id))];
  return (
    <>
      <Sankey title={title} state={state} nodes={a.nodes} links={a.links} unit="accounts" stageNames={stages} colour={(id) => { const n = id.split(":")[1] ?? ""; return C(STATE_COL[n] ?? names.indexOf(n)); }} />
      <Legend items={names.map((n) => ({ label: n, color: C(STATE_COL[n] ?? names.indexOf(n)) }))} />
    </>
  );
}

const pol = (r: number, a: number): [number, number] => [r * Math.sin(a), -r * Math.cos(a)];
const arcP = (r0: number, r1: number, a0: number, a1: number) => { const [x0, y0] = pol(r1, a0), [x1, y1] = pol(r1, a1), [x2, y2] = pol(r0, a1), [x3, y3] = pol(r0, a0); const big = a1 - a0 > Math.PI ? 1 : 0; return `M${x0},${y0}A${r1},${r1} 0 ${big} 1 ${x1},${y1}L${x2},${y2}A${r0},${r0} 0 ${big} 0 ${x3},${y3}Z`; };
/** D041 Chord: directed flows between groups; ribbon ends are sized by the matrix cell, so each end reads as "from this group" or "to this group". */
export function Chord({ names, matrix, unit = "k people", title = "Chord: moves between capital cities", state }: Common & { names: string[]; matrix: number[][]; unit?: string }) {
  const { sel, text, hit } = useHits<number>(); const { groups, chords } = useMemo(() => chord(matrix, 0.05), [matrix]);
  return (
    <Chart title={title} n={names.length} state={state} height={400}
      table={{ head: ["From", ...names.map((n) => `To ${n}`)], rows: names.map((n, i) => [n, ...matrix[i]]) }}>
      {(w) => {
        const H = Math.min(420, Math.max(300, w * 0.7)), R = Math.min(w, H) / 2 - 56, r0 = R - 16;
        return (
          <>
            <Svg w={w} h={H} label={`${title}. ${names.length} groups; total ${fmt(sum(matrix.flat()))} ${unit}. Use the data table for the full matrix.`}>
              <g transform={`translate(${w / 2},${H / 2})`}>
                {chords.map((c, i) => { const [sx0, sy0] = pol(r0, c.source.start), [sx1, sy1] = pol(r0, c.source.end), [tx0, ty0] = pol(r0, c.target.start), [tx1, ty1] = pol(r0, c.target.end);
                  const d = c.source.index === c.target.index ? `M${sx0},${sy0}A${r0},${r0} 0 0 1 ${sx1},${sy1}Q0,0 ${sx0},${sy0}Z` : `M${sx0},${sy0}A${r0},${r0} 0 0 1 ${sx1},${sy1}Q0,0 ${tx0},${ty0}A${r0},${r0} 0 0 1 ${tx1},${ty1}Q0,0 ${sx0},${sy0}Z`;
                  const hot = sel === null || sel === c.source.index || sel === c.target.index; return <path key={i} d={d} fill={C(c.source.index)} fillOpacity={hot ? 0.6 : 0.08} stroke={C(c.source.index)} strokeOpacity={hot ? 0.9 : 0.1} strokeWidth="0.5" />; })}
                {groups.map((g) => { const out = sum(matrix[g.index]), inn = sum(matrix.map((r) => r[g.index])); const mid = (g.start + g.end) / 2; const [lx, ly] = pol(R + 8, mid); return (
                  <g key={g.index} {...hit(g.index, `${names[g.index]}: ${fmt(out)} ${unit} out, ${fmt(inn)} in, net ${fmt(inn - out)}`)}>
                    <path d={arcP(r0, R, g.start, g.end)} fill={C(g.index)} />
                    <text x={lx} y={ly} dy="0.35em" textAnchor={Math.sin(mid) >= 0 ? "start" : "end"} className="dg-halo">{names[g.index]}</text>
                  </g>); })}
              </g>
            </Svg>
            <Readout>{text}</Readout>
            <Note>Ribbon colour = the group it leaves from. Each ribbon end is as wide as the flow it carries, so a wide end at one city and a thin end at the other shows a lopsided exchange.</Note>
          </>
        );
      }}
    </Chart>
  );
}

/** D041 Arc diagram: nodes on a line in a chosen order; arc height ∝ span, stroke width ∝ value. Focusing a node highlights its links. */
export function ArcDiagram({ ids, links, title = "Arc diagram: service calls", state }: Common & { ids: string[]; links: { source: string; target: string; value: number }[] }) {
  const { sel, text, hit } = useHits();
  return (
    <Chart title={title} n={links.length} state={state} height={300}
      table={{ head: ["Caller", "Callee", "Calls per s"], rows: links.map((l) => [l.source, l.target, l.value]) }}>
      {(w) => {
        const lay = arcLayout(ids, links, w, 20), baseY = 220, H = 300, maxR = Math.max(1, ...lay.arcs.map((a) => a.r)), k = Math.min(1, (baseY - 16) / maxR);
        const deg = (id: string) => links.filter((l) => l.source === id || l.target === id).length;
        return (
          <>
            <Svg w={w} h={H} label={`${title}. ${ids.length} nodes, ${links.length} links. Use the data table for the links.`}>
              {lay.arcs.map((a, i) => { const hot = !sel || a.source === sel || a.target === sel; return <path key={i} className="dg-link" d={`M${a.x0},${baseY}A${a.r},${a.r * k} 0 0 1 ${a.x1},${baseY}`} stroke={C(ids.indexOf(a.source))} strokeWidth={1 + a.value * 0.5} strokeOpacity={hot ? 0.75 : 0.1} />; })}
              {ids.map((id, i) => { const x = lay.x.get(id)!; return (
                <g key={id} {...hit(id, `${id}: ${deg(id)} links. Calls ${links.filter((l) => l.source === id).map((l) => `${l.target} (${l.value})`).join(", ") || "nothing"}. Called by ${links.filter((l) => l.target === id).map((l) => `${l.source} (${l.value})`).join(", ") || "nothing"}`)}>
                  <circle cx={x} cy={baseY} r={5 + Math.min(5, deg(id) / 2)} fill={C(i)} stroke="var(--jp-surface-raised)" strokeWidth="1.5" />
                  <text x={x} y={baseY + 14} transform={`rotate(60 ${x} ${baseY + 14})`} className="dg-sm">{id}</text>
                </g>); })}
            </Svg>
            <Readout>{text}</Readout>
          </>
        );
      }}
    </Chart>
  );
}
