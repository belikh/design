import { useMemo, useState } from "react";
import { depMatrix, effectiveStates, layoutLayered, reach, type Edge, type RunState } from "./dag.ts";
import type { Ent } from "./data.ts";
import { C, Chart, HeatTable, Legend, Note, Readout, Scroll, Svg, useHits } from "./kit.tsx";
import { ChartFrame, type FrameState } from "../charts/frame.tsx";
import { autoState } from "../charts/shared.tsx";

type Common = { title?: string; state?: FrameState };
const link = (x0: number, y0: number, x1: number, y1: number) => { const m = (x0 + x1) / 2; return `M${x0},${y0}C${m},${y0} ${m},${y1} ${x1},${y1}`; };

/** Cardinality end-marks in crow's foot notation. dir = +1 when the line leaves to the right of the entity, -1 to the left. */
function EndMark({ x, y, dir, card }: { x: number; y: number; dir: 1 | -1; card: string }) {
  const s = (d: number) => x + dir * d;
  if (card === "N") return <g className="dg-edge" strokeWidth="1.5"><path d={`M${s(12)},${y}L${x},${y - 7}M${s(12)},${y}L${x},${y}M${s(12)},${y}L${x},${y + 7}`} /></g>;
  return <g className="dg-edge">{card === "0..1" && <circle cx={s(15)} cy={y} r="4" fill="var(--jp-surface-raised)" />}<path d={`M${s(8)},${y - 7}V${y + 7}`} /></g>;
}

/** D047 ER diagram: parents sit left of the tables that reference them; crow's foot ends show cardinality. */
export function ErDiagram({ entities, relations, title = "ER diagram: shop schema", state }: Common & { entities: Ent[]; relations: [string, string, string, string][] }) {
  const { text, hit, sel } = useHits();
  const lay = useMemo(() => layoutLayered(entities.map((e) => ({ id: e.id, w: 170, h: 26 + e.attrs.length * 18 })), relations.map((r) => [r[0], r[1]] as Edge), { colGap: 70, rowGap: 22 }), [entities, relations]);
  return (
    <Chart title={title} n={entities.length} state={state} height={360} table={{ head: ["Table", "Column", "Type", "Key"], rows: entities.flatMap((e) => e.attrs.map((a) => [e.id, a.name, a.type, a.pk ? "PK" : a.fk ? "FK" : ""])) }}>
      {() => {
        if (!lay) return <p>The relationships form a cycle, so they cannot be layered.</p>;
        const by = new Map(lay.placed.map((p) => [p.id, p])); const P = 10;
        return (
          <>
            <Scroll label={title}>
              <Svg w={lay.width + 2 * P} h={lay.height + 2 * P} label={`${title}. ${entities.length} tables and ${relations.length} relationships: ${relations.map((r) => `${r[0]} ${r[2]} to ${r[3]} ${r[1]}`).join("; ")}.`}>
                <g transform={`translate(${P},${P})`}>
                  {relations.map(([a, b, ca, cb], i) => { const A = by.get(a)!, B = by.get(b)!; const x0 = A.x + A.w, y0 = A.y + A.h / 2, x1 = B.x, y1 = B.y + B.h / 2; const hot = sel === a || sel === b; return <g key={i}><path className={`dg-edge${hot ? " is-hot" : ""}`} d={link(x0, y0, x1, y1)} /><EndMark x={x0} y={y0} dir={1} card={ca} /><EndMark x={x1} y={y1} dir={-1} card={cb} /><text x={x0 + 16} y={y0 - 6} className="dg-mute">{ca}</text><text x={x1 - 16} y={y1 - 6} textAnchor="end" className="dg-mute">{cb}</text></g>; })}
                  {entities.map((e) => { const p = by.get(e.id)!; const rel = relations.filter((r) => r[0] === e.id || r[1] === e.id).map((r) => (r[0] === e.id ? `${r[2]} to ${r[3]} ${r[1]}` : `${r[3]} to ${r[2]} ${r[0]}`)); return (
                    <g key={e.id} {...hit(e.id, `${e.id}: ${e.attrs.length} columns. Keys: ${e.attrs.filter((a) => a.pk || a.fk).map((a) => `${a.name} ${a.pk ? "primary" : "foreign"}`).join(", ")}. Relationships: ${rel.join("; ")}`)}>
                      <rect x={p.x} y={p.y} width={p.w} height={p.h} rx="6" className="dg-box" /><path d={`M${p.x},${p.y + 26}H${p.x + p.w}`} className="dg-edge" /><text x={p.x + 10} y={p.y + 14} dy="0.35em" className="dg-b dg-sm">{e.id}</text>
                      {e.attrs.map((a, i) => <text key={a.name} x={p.x + 10} y={p.y + 26 + 9 + i * 18 + 4} className={a.pk ? "dg-b" : undefined}>{a.pk ? "PK " : a.fk ? "FK " : "   "}{a.name}<tspan className="dg-mute" dx="8">{a.type}</tspan></text>)}
                    </g>); })}
                </g>
              </Svg>
            </Scroll>
            <Readout>{text}</Readout>
            <Note>Notation: a bar is exactly one, a bar with a circle is zero or one, a crow's foot is many. Lines run from the referenced table to the table that holds the foreign key.</Note>
          </>
        );
      }}
    </Chart>
  );
}

const KIND_COL: Record<string, number> = { client: 0, edge: 1, service: 2, store: 3, queue: 4 };
/** D047 Architecture diagram: tiers as bands, components as boxes, calls as arrows from upper to lower tiers. Focus a component to highlight what it calls and what calls it. */
export function Architecture({ tiers, edges, title = "Architecture diagram: shop platform", state }: Common & { tiers: { name: string; nodes: { id: string; label: string; kind: string }[] }[]; edges: Edge[] }) {
  const { sel, text, hit } = useHits(); const all = tiers.flatMap((t) => t.nodes);
  return (
    <Chart title={title} n={all.length} state={state} height={380} table={{ head: ["From", "To"], rows: edges.map(([a, b]) => [all.find((n) => n.id === a)?.label ?? a, all.find((n) => n.id === b)?.label ?? b]) }}>
      {(w) => {
        const bandH = 84, gapY = 16, H = tiers.length * (bandH + gapY), bw = Math.min(130, (w - 110) / Math.max(...tiers.map((t) => t.nodes.length)) - 12);
        const pos = new Map<string, { x: number; y: number }>(); tiers.forEach((t, ti) => t.nodes.forEach((n, i) => { const span = w - 100, step = span / t.nodes.length; pos.set(n.id, { x: 100 + step * (i + 0.5), y: ti * (bandH + gapY) + bandH / 2 }); }));
        const touched = (id: string) => edges.filter(([a, b]) => a === id || b === id);
        return (
          <>
            <Svg w={w} h={H} label={`${title}. ${tiers.length} tiers, ${all.length} components, ${edges.length} connections.`}>
              <defs><marker id="dg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--jp-text-muted)" /></marker></defs>
              {tiers.map((t, ti) => <g key={t.name}><rect x="0" y={ti * (bandH + gapY)} width={w} height={bandH} rx="8" fill="var(--jp-surface)" /><text x="10" y={ti * (bandH + gapY) + 18} className="dg-mute dg-b">{t.name}</text></g>)}
              {edges.map(([a, b], i) => { const A = pos.get(a)!, B = pos.get(b)!; const hot = sel === a || sel === b; const x0 = A.x, y0 = A.y + 22, x1 = B.x, y1 = B.y - 24, m = (y0 + y1) / 2; return <path key={i} className={`dg-edge${hot ? " is-hot" : ""}${sel && !hot ? " dg-dim" : ""}`} d={`M${x0},${y0}C${x0},${m} ${x1},${m} ${x1},${y1}`} markerEnd="url(#dg-arrow)" />; })}
              {all.map((n) => { const p = pos.get(n.id)!; const es = touched(n.id); return (
                <g key={n.id} {...hit(n.id, `${n.label} (${n.kind}). Calls ${es.filter(([a]) => a === n.id).map(([, b]) => all.find((x) => x.id === b)?.label).join(", ") || "nothing"}. Called by ${es.filter(([, b]) => b === n.id).map(([a]) => all.find((x) => x.id === a)?.label).join(", ") || "nothing"}.`)}>
                  <rect x={p.x - bw / 2} y={p.y - 22} width={bw} height="44" rx={n.kind === "store" ? 14 : n.kind === "queue" ? 2 : 6} className="dg-box" style={{ stroke: C(KIND_COL[n.kind] ?? 0), strokeWidth: 2.5, strokeDasharray: n.kind === "queue" ? "6 3" : undefined }} />
                  <text x={p.x} y={p.y - 3} textAnchor="middle" className="dg-b">{n.label}</text><text x={p.x} y={p.y + 13} textAnchor="middle" className="dg-mute">{n.kind}</text>
                </g>); })}
            </Svg>
            <Readout>{text}</Readout>
            <Legend items={Object.keys(KIND_COL).map((k) => ({ label: k, color: C(KIND_COL[k]) }))} />
          </>
        );
      }}
    </Chart>
  );
}

/** D047 Dependency matrix: row depends on column. Order is topological, so a healthy graph has marks on one side of the diagonal only. */
export function DependencyMatrix({ ids, edges, title = "Dependency matrix: workspace packages", state }: Common & { ids: string[]; edges: Edge[] }) {
  const m = useMemo(() => depMatrix(ids, edges), [ids, edges]); const [text, setText] = useState("");
  const direct = (id: string) => edges.filter(([, u]) => u === id).map(([d]) => d);
  return (
    <ChartFrame title={title} state={autoState(state, ids.length)} svg={false} table={{ head: ["Package", "Depends directly on", "Transitive dependencies"], rows: m.order.map((id) => [id, direct(id).join(", "), reach(id, edges, "up").size]) }}>
      {() => (<>
      <HeatTable caption={title} corner="depends on →" rowHeads={m.order} colHeads={m.order} vertical onRead={setText}
        cell={(r, c) => ({ t: r === c ? null : m.cells[r][c] ? 1 : 0, text: m.cells[r][c] ? "●" : r === c ? "–" : "", label: `${m.order[r]} ${m.cells[r][c] ? "depends on" : "does not depend directly on"} ${m.order[c]}${r === c ? " (itself)" : ""}` })}
        extraCols={["direct", "all"]} rowExtra={(r) => [direct(m.order[r]).length, reach(m.order[r], edges, "up").size]} />
      <Readout>{text}</Readout>
      <Note>{`${edges.length} direct dependencies. Ordered dependencies-first, so every mark sits below the diagonal; a mark above it would be a cycle. "all" counts transitive dependencies.`}</Note>
      </>)}
    </ChartFrame>
  );
}

const STATE_LABEL: Record<RunState, string> = { success: "Succeeded", failed: "Failed", running: "Running", queued: "Queued", skipped: "Skipped", blocked: "Blocked by upstream failure" };
const STATE_COLOUR: Record<RunState, string> = { success: "var(--jp-ok)", failed: "var(--jp-danger)", running: "var(--jp-accent)", queued: "var(--jp-text-muted)", skipped: "var(--jp-text-muted)", blocked: "var(--jp-warn)" };
/** A status glyph whose shape differs per state, so colour is never the only cue. */
function Glyph({ s, x, y }: { s: RunState; x: number; y: number }) {
  const c = STATE_COLOUR[s];
  switch (s) {
    case "success": return <g><circle cx={x} cy={y} r="8" fill={c} /><path d={`M${x - 4},${y}L${x - 1},${y + 3}L${x + 4},${y - 3}`} stroke="var(--jp-surface-raised)" strokeWidth="2" fill="none" /></g>;
    case "failed": return <g><circle cx={x} cy={y} r="8" fill={c} /><path d={`M${x - 3.5},${y - 3.5}L${x + 3.5},${y + 3.5}M${x + 3.5},${y - 3.5}L${x - 3.5},${y + 3.5}`} stroke="var(--jp-surface-raised)" strokeWidth="2" /></g>;
    case "running": return <g><circle cx={x} cy={y} r="8" fill="none" stroke={c} strokeWidth="2.5" className="dg-run" /><path d={`M${x - 2},${y - 4}L${x + 4},${y}L${x - 2},${y + 4}z`} fill={c} /></g>;
    case "queued": return <circle cx={x} cy={y} r="7" fill="none" stroke={c} strokeWidth="2" />;
    case "skipped": return <g><circle cx={x} cy={y} r="7" fill="none" stroke={c} strokeWidth="2" strokeDasharray="3 2" /><path d={`M${x - 3},${y}H${x + 3}`} stroke={c} strokeWidth="2" /></g>;
    default: return <g><circle cx={x} cy={y} r="7" fill="none" stroke={c} strokeWidth="2" /><path d={`M${x - 5},${y + 5}L${x + 5},${y - 5}`} stroke={c} strokeWidth="2" /></g>;
  }
}
const LAYER_PREFIX = ["raw", "stg", "mart", "dash", "ml"];
/** D047 Pipeline DAG with run states, or (mode "lineage") table-level data lineage: focus a node to trace everything upstream and downstream of it. */
export function LayeredGraph({ ids, edges, raw, mode = "run", title, state }: Common & { ids: string[]; edges: Edge[]; raw?: Record<string, Exclude<RunState, "blocked">>; mode?: "run" | "lineage" }) {
  const { sel, text, hit } = useHits(); const eff = useMemo(() => (raw ? effectiveStates(raw, edges) : null), [raw, edges]);
  const lay = useMemo(() => layoutLayered(ids.map((id) => ({ id, w: mode === "run" ? 168 : 128, h: 34 })), edges, { colGap: 46, rowGap: 12 }), [ids, edges, mode]);
  const t = title ?? (mode === "run" ? "Pipeline DAG: nightly ML run" : "Data lineage: warehouse tables");
  const up = sel ? reach(sel, edges, "up") : new Set<string>(), down = sel ? reach(sel, edges, "down") : new Set<string>();
  const lit = (id: string) => !sel || id === sel || up.has(id) || down.has(id);
  const counts = eff ? (Object.keys(STATE_LABEL) as RunState[]).map((s) => [s, Object.values(eff).filter((x) => x === s).length] as const).filter(([, n]) => n) : [];
  return (
    <Chart title={t} n={ids.length} state={state} height={340} table={{ head: mode === "run" ? ["Task", "State", "Waits for"] : ["Table", "Feeds", "Fed by"], rows: ids.map((id) => mode === "run" ? [id, eff ? STATE_LABEL[eff[id]] : "", edges.filter(([, b]) => b === id).map(([a]) => a).join(", ")] : [id, edges.filter(([a]) => a === id).map(([, b]) => b).join(", "), edges.filter(([, b]) => b === id).map(([a]) => a).join(", ")]) }}>
      {() => {
        if (!lay) return <p>These edges contain a cycle, so they are not a DAG.</p>;
        const by = new Map(lay.placed.map((p) => [p.id, p])); const P = 8;
        return (
          <>
            <Scroll label={t}>
              <Svg w={lay.width + 2 * P} h={lay.height + 2 * P} label={`${t}. ${ids.length} nodes in ${Math.max(...lay.placed.map((p) => p.layer)) + 1} layers, ${edges.length} edges.${counts.length ? " " + counts.map(([s, n]) => `${n} ${STATE_LABEL[s].toLowerCase()}`).join(", ") + "." : ""}`}>
                <g transform={`translate(${P},${P})`}>
                  {edges.map(([a, b], i) => { const A = by.get(a)!, B = by.get(b)!; const hot = !!sel && lit(a) && lit(b); return <path key={i} className={`dg-edge${hot ? " is-hot" : ""}${sel && !hot ? " dg-dim" : ""}`} d={link(A.x + A.w, A.y + A.h / 2, B.x, B.y + B.h / 2)} />; })}
                  {lay.placed.map((p) => { const s = eff?.[p.id]; const lp = mode === "lineage" ? LAYER_PREFIX.indexOf(p.id.split(".")[0]) : -1; return (
                    <g key={p.id} style={sel && !lit(p.id) ? { opacity: 0.2 } : undefined} {...hit(p.id, mode === "run" ? `${p.id}: ${s ? STATE_LABEL[s] : ""}. Waits for ${edges.filter(([, b]) => b === p.id).map(([a]) => a).join(", ") || "nothing"}. Unblocks ${[...reach(p.id, edges, "down")].length} later tasks.` : `${p.id}: ${[...reach(p.id, edges, "up")].length} upstream and ${[...reach(p.id, edges, "down")].length} downstream tables. Fed by ${edges.filter(([, b]) => b === p.id).map(([a]) => a).join(", ") || "source"}.`)}>
                      <rect x={p.x} y={p.y} width={p.w} height={p.h} rx="6" className="dg-box" style={{ stroke: s ? STATE_COLOUR[s] : C(Math.max(0, lp)), strokeWidth: 2, strokeDasharray: s === "skipped" ? "4 3" : undefined }} />
                      {s && <Glyph s={s} x={p.x + 16} y={p.y + p.h / 2} />}<text x={p.x + (s ? 32 : 10)} y={p.y + p.h / 2} dy="0.35em">{p.id}</text>
                    </g>); })}
                </g>
              </Svg>
            </Scroll>
            <Readout>{text}</Readout>
            {mode === "run" ? <Legend items={(Object.keys(STATE_LABEL) as RunState[]).map((s) => ({ label: STATE_LABEL[s], color: STATE_COLOUR[s] }))} /> : <Legend items={LAYER_PREFIX.map((l, i) => ({ label: l, color: C(i) }))} />}
            <Note>{mode === "run" ? "A queued task with a failed ancestor can never start, so it is shown as blocked rather than waiting. Each state has its own shape as well as colour." : "Focus a table to light up everything upstream (its sources) and downstream (what breaks if it is wrong)."}</Note>
          </>
        );
      }}
    </Chart>
  );
}
