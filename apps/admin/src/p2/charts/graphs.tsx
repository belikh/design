import { useEffect, useMemo, useRef, useState } from "react";
import { C, Legend } from "@belikh/jupiter-ui/Charts.tsx";
import { ChartFrame, Readout, type FrameState } from "./frame.tsx";
import { autoState, fmt1 } from "./shared.tsx";
import { dagLayout, forceLayout, shortestPath, type GEdge, type GNode } from "./lib.ts";

export type Health = "ok" | "warn" | "danger";
export type GN = GNode & { group?: number; status?: Health };
const hcol = (s?: Health) => (s === "danger" ? "var(--jp-danger)" : s === "warn" ? "var(--jp-warn)" : "var(--jp-ok)");
const HGLYPH = { ok: "●", warn: "◆", danger: "▲" } as const;
const labelOf = (n: GN) => n.label ?? n.id;

/** Orthogonal-ish bezier between two points, bowing horizontally (LR) or vertically (TB). */
const curve = (x1: number, y1: number, x2: number, y2: number, dir: "LR" | "TB") => (dir === "LR" ? `M${x1},${y1}C${x1 + (x2 - x1) / 2},${y1} ${x1 + (x2 - x1) / 2},${y2} ${x2},${y2}` : `M${x1},${y1}C${x1},${y1 + (y2 - y1) / 2} ${x2},${y1 + (y2 - y1) / 2} ${x2},${y2}`);

/* ---------- D042 + D046: network / topology / dependency graph with overlays and path trace ---------- */
export function GraphView({ nodes, edges, layout, directed = false, traffic = false, health = false, title = "Graph", state, height = 380 }: { nodes: GN[]; edges: (GEdge & { traffic?: number })[]; layout: "force" | "layered"; directed?: boolean; traffic?: boolean; health?: boolean; title?: string; state?: FrameState; height?: number }) {
  return (
    <ChartFrame title={title} state={autoState(state, nodes.length)} height={height} table={{ head: ["From", "To", "Traffic", "From health", "To health"], rows: edges.map((e) => [e.from, e.to, e.traffic ?? e.weight ?? "", nodes.find((n) => n.id === e.from)?.status ?? "", nodes.find((n) => n.id === e.to)?.status ?? ""]) }}>
      {(w) => <GraphBody w={w} nodes={nodes} edges={edges} layout={layout} directed={directed} traffic={traffic} health={health} height={height} title={title} />}
    </ChartFrame>
  );
}
function GraphBody({ w, nodes, edges, layout, directed, traffic, health, height, title }: { w: number; nodes: GN[]; edges: (GEdge & { traffic?: number })[]; layout: "force" | "layered"; directed: boolean; traffic: boolean; health: boolean; height: number; title: string }) {
  const [drag, setDrag] = useState<Record<string, { x: number; y: number }>>({}); const [pick, setPick] = useState<string[]>([]); const [hot, setHot] = useState<string | null>(null); const dragging = useRef<string | null>(null); const svgRef = useRef<SVGSVGElement>(null);
  const NW = 116, NH = 32;
  const base = useMemo(() => {
    if (layout === "force") { const P = forceLayout(nodes, edges, { width: w, height, seed: 11, pad: 34 }); return { pos: new Map([...P].map(([k, v]) => [k, { x: v.x, y: v.y }])), scale: 1, ox: 0, oy: 0, H: height }; }
    const L = dagLayout(nodes, edges, { nodeW: NW, nodeH: NH, gapX: 56, gapY: 16, direction: "LR" }); const scale = Math.min(1, (w - 16) / Math.max(1, L.width)); return { pos: new Map([...L.pos].map(([k, v]) => [k, { x: v.x + NW / 2, y: v.y + NH / 2 }])), scale, ox: 8, oy: 8, H: Math.max(120, L.height * scale + 16) };
  }, [nodes, edges, layout, w, height]);
  const P = (id: string) => drag[id] ?? base.pos.get(id) ?? { x: 0, y: 0 };
  const path = pick.length === 2 ? shortestPath(edges, pick[0], pick[1], directed) : []; const onPath = new Set(path); const pathEdge = (e: GEdge) => { const i = path.indexOf(e.from), j = path.indexOf(e.to); return i >= 0 && j >= 0 && Math.abs(i - j) === 1; };
  const tmax = Math.max(1, ...edges.map((e) => e.traffic ?? e.weight ?? 1));
  const choose = (id: string) => setPick((p) => (p.length === 1 && p[0] !== id ? [p[0], id] : p.length === 1 ? [] : [id]));
  const move = (e: React.PointerEvent) => { const id = dragging.current; if (!id || !svgRef.current) return; const r = svgRef.current.getBoundingClientRect(); setDrag((d) => ({ ...d, [id]: { x: (e.clientX - r.left - base.ox) / base.scale, y: (e.clientY - r.top - base.oy) / base.scale } })); };
  useEffect(() => { const up = () => { dragging.current = null; }; window.addEventListener("pointerup", up); return () => window.removeEventListener("pointerup", up); }, []);
  const H = base.H;
  return (
    <>
      <div className="adm-row" style={{ marginBottom: 6 }}><span className="pc-note" style={{ margin: 0 }}>{layout === "force" ? "Drag nodes to rearrange. " : ""}Click one node, then another, to trace the shortest path.</span>{pick.length > 0 && <button className="jp-btn jp-btn--ghost jp-btn--sm" onClick={() => setPick([])}>Clear trace</button>}</div>
      <svg ref={svgRef} viewBox={`0 0 ${w} ${H}`} style={{ width: "100%", height: H, touchAction: "none" }} role="group" aria-label={`${title}: ${nodes.length} nodes, ${edges.length} links`} onPointerMove={move}>
        <defs><marker markerUnits="userSpaceOnUse" id="pc-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--jp-text-muted)" /></marker><marker markerUnits="userSpaceOnUse" id="pc-arrow-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--jp-accent)" /></marker></defs>
        <g transform={`translate(${base.ox},${base.oy}) scale(${base.scale})`}>
          {edges.map((e, i) => { const a = P(e.from), b = P(e.to), on = pathEdge(e), wgt = e.traffic ?? e.weight ?? 1; const sw = traffic ? 1 + (wgt / tmax) * 7 : 1.5; const dir = layout === "layered" ? "LR" : "LR";
            const d = layout === "layered" ? curve(a.x + NW / 2, a.y, b.x - NW / 2, b.y, dir) : `M${a.x},${a.y}L${b.x},${b.y}`;
            return <path key={i} d={d} className={`pc-edge ${on ? "is-path" : ""} ${traffic ? "pc-flow" : ""}`} strokeWidth={on ? sw + 1.5 : sw} opacity={path.length && !on ? 0.2 : traffic ? 0.7 : 0.85} markerEnd={directed ? `url(#${on ? "pc-arrow-on" : "pc-arrow"})` : undefined}><title>{`${e.from} → ${e.to}${traffic ? `: ${fmt1(wgt)}` : ""}`}</title></path>; })}
          {nodes.map((n) => { const p = P(n.id), sel = pick.includes(n.id), on = onPath.has(n.id), dim = path.length > 0 && !on; const fill = health ? "var(--jp-surface-raised)" : C(n.group ?? 0);
            return (
              <g key={n.id} className="pc-node" tabIndex={0} role="button" aria-pressed={sel} aria-label={`${labelOf(n)}${n.status ? `, ${n.status}` : ""}${on ? ", on path" : ""}`} opacity={dim ? 0.3 : 1} transform={`translate(${p.x},${p.y})`} onClick={() => choose(n.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(n.id); } }} onMouseEnter={() => setHot(n.id)} onMouseLeave={() => setHot(null)} onFocus={() => setHot(n.id)} onBlur={() => setHot(null)}
                onPointerDown={(e) => { if (layout === "force") { dragging.current = n.id; (e.target as Element).setPointerCapture?.(e.pointerId); } }}>
                {layout === "layered" ? <rect x={-NW / 2} y={-NH / 2} width={NW} height={NH} rx="6" fill={fill} fillOpacity={health ? 1 : 0.9} stroke={on || sel ? "var(--jp-accent)" : health ? hcol(n.status) : "var(--jp-surface-raised)"} strokeWidth={on || sel ? 3 : health ? 2.5 : 1.5} /> : <circle r="16" fill={fill} fillOpacity={health ? 1 : 0.9} stroke={on || sel ? "var(--jp-accent)" : health ? hcol(n.status) : "var(--jp-surface-raised)"} strokeWidth={on || sel ? 3.5 : health ? 3 : 1.5} />}
                <text textAnchor="middle" y={layout === "layered" ? 4 : 32} fontSize="13" fill={layout === "layered" && !health ? "var(--jp-surface-raised)" : "var(--jp-text)"} fontWeight="600" style={{ pointerEvents: "none" }}>{health && n.status ? `${HGLYPH[n.status]} ` : ""}{labelOf(n)}</text>
              </g>); })}
        </g>
      </svg>
      {health && <Legend items={[{ name: "● ok", color: "var(--jp-ok)" }, { name: "◆ degraded", color: "var(--jp-warn)" }, { name: "▲ down", color: "var(--jp-danger)" }]} />}
      <Readout>{path.length ? `Path (${path.length - 1} hop${path.length === 2 ? "" : "s"}): ${path.join(" → ")}` : pick.length === 2 ? `No route between ${pick[0]} and ${pick[1]}.` : pick.length === 1 ? `From ${pick[0]}: pick a destination.` : hot ? `${hot}${nodes.find((n) => n.id === hot)?.status ? `: ${nodes.find((n) => n.id === hot)?.status}` : ""}` : ""}</Readout>
    </>
  );
}

/* ---------- D044: flowchart ---------- */
export type FlowNode = { id: string; label: string; kind?: "start" | "end" | "process" | "decision" | "io" };
export function Flowchart({ nodes, edges, title = "Flowchart", state }: { nodes: FlowNode[]; edges: (GEdge & { label?: string })[]; title?: string; state?: FrameState }) {
  return (
    <ChartFrame title={title} state={autoState(state, nodes.length)} height={300} table={{ head: ["From", "To", "Label"], rows: edges.map((e) => [e.from, e.to, e.label ?? ""]) }}>
      {(w) => {
        const L = dagLayout(nodes, edges, { nodeW: 128, nodeH: 46, gapX: 54, gapY: 22, direction: "LR" }); const scale = Math.max(0.85, Math.min(1, (w - 16) / Math.max(1, L.width))), VW = Math.max(w, L.width * scale + 16), H = L.height * scale + 16; const at = (id: string) => L.pos.get(id)!; const byId = new Map(nodes.map((n) => [n.id, n]));
        return (
          <div style={{ overflowX: "auto" }}><svg viewBox={`0 0 ${VW} ${H}`} style={{ width: VW, height: H, maxWidth: "none" }} role="img" aria-label={`${title}: ${nodes.map((n) => n.label).join(", ")}`}>
            <defs><marker markerUnits="userSpaceOnUse" id="pc-fa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--jp-text-muted)" /></marker></defs>
            <g transform={`translate(8,8) scale(${scale})`}>
              {L.edges.map((e, i) => { const a = at(e.from), b = at(e.to), back = e.reversed; const [s, t] = back ? [b, a] : [a, b]; const orig = back ? { from: e.to, to: e.from } : e; const x1 = at(orig.from).x + 128, y1 = at(orig.from).y + 23, x2 = at(orig.to).x, y2 = at(orig.to).y + 23; void s; void t;
                const d = back ? `M${at(orig.from).x + 64},${at(orig.from).y + 46}C${at(orig.from).x + 64},${at(orig.from).y + 100} ${at(orig.to).x + 64},${at(orig.to).y + 100} ${at(orig.to).x + 64},${at(orig.to).y + 46}` : curve(x1, y1, x2, y2, "LR"); const lbl = edges.find((q) => q.from === orig.from && q.to === orig.to)?.label;
                return <g key={i}><path d={d} className="pc-edge" strokeWidth="1.6" markerEnd="url(#pc-fa)" />{lbl && <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 5} textAnchor="middle" className="adm-axis" fontWeight="700">{lbl}</text>}</g>; })}
              {nodes.map((n, i) => { const p = at(n.id), k = byId.get(n.id)?.kind ?? "process", cx = p.x + 64, cy = p.y + 23, col = C(k === "decision" ? 1 : k === "start" || k === "end" ? 2 : 0);
                return <g key={n.id} role="img" aria-label={`${k}: ${n.label}`}>{k === "decision" ? <path d={`M${cx},${p.y}L${p.x + 128},${cy}L${cx},${p.y + 46}L${p.x},${cy}Z`} fill="var(--jp-surface-raised)" stroke={col} strokeWidth="2.5" /> : k === "start" || k === "end" ? <rect x={p.x} y={p.y + 4} width="128" height="38" rx="19" fill="var(--jp-surface-raised)" stroke={col} strokeWidth="2.5" /> : k === "io" ? <path d={`M${p.x + 14},${p.y + 4}H${p.x + 128}L${p.x + 114},${p.y + 42}H${p.x}Z`} fill="var(--jp-surface-raised)" stroke={col} strokeWidth="2.5" /> : <rect x={p.x} y={p.y + 4} width="128" height="38" rx="4" fill="var(--jp-surface-raised)" stroke={col} strokeWidth="2.5" />}
                  <text x={cx} y={cy + 4} textAnchor="middle" fontSize="13" fill="var(--jp-text)" fontWeight="600">{n.label.length > 20 ? n.label.slice(0, 19) + "…" : n.label}</text><title>{`${i + 1}. ${n.label}`}</title></g>; })}
            </g>
          </svg></div>
        );
      }}
    </ChartFrame>
  );
}

/* ---------- D044: state machine (interactive) ---------- */
export function StateMachine({ states, transitions, initial, title = "State machine", state }: { states: { id: string; label?: string }[]; transitions: { from: string; to: string; event: string }[]; initial: string; title?: string; state?: FrameState }) {
  const [cur, setCur] = useState(initial); const [log, setLog] = useState<string[]>([]);
  const avail = transitions.filter((t) => t.from === cur);
  return (
    <ChartFrame title={title} state={autoState(state, states.length)} height={280} table={{ head: ["From", "Event", "To"], rows: transitions.map((t) => [t.from, t.event, t.to]) }}
      footer={<div style={{ marginTop: 8 }}><div className="adm-row"><span className="jp-muted">Current state:</span><b className="adm-num">{cur}</b><span className="jp-muted">Fire an event:</span>{avail.length ? avail.map((t) => <button key={t.event + t.to} className="jp-btn jp-btn--secondary jp-btn--sm" onClick={() => { setLog((l) => [`${t.from} —${t.event}→ ${t.to}`, ...l].slice(0, 6)); setCur(t.to); }}>{t.event}</button>) : <span className="jp-muted">terminal state</span>}<button className="jp-btn jp-btn--ghost jp-btn--sm" onClick={() => { setCur(initial); setLog([]); }}>Reset</button></div>{log.length > 0 && <Readout>{log[0]}</Readout>}</div>}>
      {(w) => {
        const L = dagLayout(states, transitions, { nodeW: 96, nodeH: 40, gapX: 70, gapY: 36, direction: "LR" }); const scale = Math.max(0.85, Math.min(1, (w - 16) / Math.max(1, L.width))), VW = Math.max(w, L.width * scale + 16), H = L.height * scale + 70; const at = (id: string) => L.pos.get(id)!;
        return (
          <div style={{ overflowX: "auto" }}><svg viewBox={`0 0 ${VW} ${H}`} style={{ width: VW, height: H, maxWidth: "none" }} role="img" aria-label={`${title}: ${states.length} states, current ${cur}`}>
            <defs><marker markerUnits="userSpaceOnUse" id="pc-sa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--jp-text-muted)" /></marker><marker markerUnits="userSpaceOnUse" id="pc-sa-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--jp-accent)" /></marker></defs>
            <g transform={`translate(8,26) scale(${scale})`}>
              {transitions.map((t, i) => { const a = at(t.from), b = at(t.to), live = t.from === cur; let d: string, lx: number, ly: number;
                if (t.from === t.to) { d = `M${a.x + 28},${a.y}c-12,-30 52,-30 40,0`; lx = a.x + 48; ly = a.y - 24; }
                else if (b.layer > a.layer || (b.layer === a.layer && b.y > a.y)) { d = curve(a.x + 96, a.y + 20, b.x, b.y + 20, "LR"); lx = (a.x + 96 + b.x) / 2; ly = (a.y + b.y) / 2 + 14; }
                else { d = `M${a.x + 48},${a.y + 40}C${a.x + 48},${a.y + 90} ${b.x + 48},${b.y + 90} ${b.x + 48},${b.y + 40}`; lx = (a.x + b.x) / 2 + 48; ly = Math.max(a.y, b.y) + 78; }
                return <g key={i}><path d={d} className="pc-edge" stroke={live ? "var(--jp-accent)" : undefined} strokeWidth={live ? 2.4 : 1.4} markerEnd={`url(#${live ? "pc-sa-on" : "pc-sa"})`} /><text x={lx} y={ly} textAnchor="middle" className="adm-axis" fontWeight={live ? 700 : 400}>{t.event}</text></g>; })}
              {states.map((s) => { const p = at(s.id), on = s.id === cur; return <g key={s.id} role="img" aria-label={`${s.label ?? s.id}${on ? " (current)" : ""}`}>{s.id === initial && <circle cx={p.x - 14} cy={p.y + 20} r="5" fill="var(--jp-text)" />}<rect x={p.x} y={p.y} width="96" height="40" rx="20" fill={on ? "var(--jp-accent)" : "var(--jp-surface-raised)"} stroke={on ? "var(--jp-accent)" : "var(--jp-text-muted)"} strokeWidth="2" /><text x={p.x + 48} y={p.y + 24} textAnchor="middle" fontSize="14" fontWeight="700" fill={on ? "var(--jp-on-accent)" : "var(--jp-text)"}>{s.label ?? s.id}</text></g>; })}
            </g>
          </svg></div>
        );
      }}
    </ChartFrame>
  );
}

/* ---------- D044: sequence diagram ---------- */
export type SeqMsg = { from: string; to: string; label: string; kind?: "sync" | "async" | "return"; note?: string };
export function SequenceDiagram({ participants, messages, title = "Sequence diagram", state }: { participants: string[]; messages: SeqMsg[]; title?: string; state?: FrameState }) {
  return (
    <ChartFrame title={title} state={autoState(state, messages.length)} height={320} table={{ head: ["Step", "From", "To", "Message", "Kind"], rows: messages.map((m, i) => [i + 1, m.from, m.to, m.label, m.kind ?? "sync"]) }}>
      {(w) => {
        const n = participants.length, colW = Math.max(90, (w - 20) / n), x = (p: string) => 10 + colW * participants.indexOf(p) + colW / 2, rowH = 44, top = 46, H = top + messages.length * rowH + 30;
        // activation bars: a sync call opens one on the callee until the matching return back to the caller
        const bars: { p: string; y1: number; y2: number }[] = []; messages.forEach((m, i) => { if (m.kind === "return" || m.kind === "async") return; const j = messages.findIndex((r, k) => k > i && r.kind === "return" && r.from === m.to && r.to === m.from); bars.push({ p: m.to, y1: top + i * rowH + rowH / 2, y2: j >= 0 ? top + j * rowH + rowH / 2 : top + i * rowH + rowH / 2 + 18 }); });
        return (
          <svg viewBox={`0 0 ${w} ${H}`} style={{ width: "100%", height: H }} role="img" aria-label={`${title}: ${messages.length} messages between ${participants.join(", ")}`}>
            <defs><marker markerUnits="userSpaceOnUse" id="pc-qa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--jp-text)" /></marker><marker markerUnits="userSpaceOnUse" id="pc-qo" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M1,1L9,5L1,9" fill="none" stroke="var(--jp-text)" strokeWidth="1.5" /></marker></defs>
            {participants.map((p, i) => <g key={p}><rect x={x(p) - 44} y={6} width="88" height="28" rx="4" fill="var(--jp-surface-raised)" stroke={C(i)} strokeWidth="2.5" /><text x={x(p)} y={24} textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--jp-text)">{p}</text><line x1={x(p)} x2={x(p)} y1={34} y2={H - 10} stroke="var(--jp-border)" strokeDasharray="4 4" /></g>)}
            {bars.map((b, i) => <rect key={i} x={x(b.p) - 5} y={b.y1} width="10" height={Math.max(8, b.y2 - b.y1)} fill="var(--jp-accent)" fillOpacity=".25" stroke="var(--jp-accent)" />)}
            {messages.map((m, i) => { const y = top + i * rowH + rowH / 2, a = x(m.from), b = x(m.to), self = m.from === m.to, ret = m.kind === "return";
              return (<g key={i}>{self ? <><path d={`M${a},${y - 8}h28v16h-28`} fill="none" stroke="var(--jp-text)" strokeWidth="1.6" markerEnd="url(#pc-qa)" /><text x={a + 34} y={y + 4} className="adm-axis">{m.label}</text></>
                : <><line x1={a} x2={b + (b > a ? -6 : 6)} y1={y} y2={y} stroke="var(--jp-text)" strokeWidth="1.6" strokeDasharray={ret ? "5 3" : undefined} markerEnd={`url(#${m.kind === "async" || ret ? "pc-qo" : "pc-qa"})`} /><text x={(a + b) / 2} y={y - 6} textAnchor="middle" className="adm-axis" fontWeight={ret ? 400 : 700}>{i + 1}. {m.label}</text></>}
                {m.note && <g><rect x={Math.max(a, b) + 14} y={y - 10} width={Math.min(150, m.note.length * 6.5 + 12)} height="20" rx="3" fill="var(--jp-warn-bg)" stroke="var(--jp-warn)" /><text x={Math.max(a, b) + 20} y={y + 4} fontSize="12.5" fill="var(--jp-text)">{m.note}</text></g>}</g>); })}
          </svg>
        );
      }}
    </ChartFrame>
  );
}
