import { useMemo, useRef, useState } from "react";
import { PageHeader, Panel, Btn, Badge, Alert } from "@belikh/jupiter-ui/kit.tsx";
import { Field, Select, TextInput, Segmented } from "@belikh/jupiter-ui/inputs.tsx";
import { useWidth } from "@belikh/jupiter-ui/Charts.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { NODE_H, NODE_W, SEED, TYPE_LABEL, addEdge, simulate, validate, type Graph, type NodeType, type WfNode } from "./lib/workflow.ts";
import { clamp } from "./common.ts";
import "./p3b.css";

const H = 400;
const TYPES = Object.keys(TYPE_LABEL) as NodeType[];

export function WorkflowBuilder() {
  const { toast } = usePrefs();
  const [g, setG] = useState<Graph>(SEED); const [sel, setSel] = useState<string | null>("n2"); const [addType, setAddType] = useState<NodeType>("action");
  const [wrap, W] = useWidth(); const svg = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null); const [link, setLink] = useState<{ from: string; x: number; y: number } | null>(null);
  const [target, setTarget] = useState(""); const [run, setRun] = useState<string[]>([]);
  const issues = useMemo(() => validate(g), [g]); const errors = issues.filter((i) => i.level === "error").length;
  const node = g.nodes.find((n) => n.id === sel);
  const world = Math.max(W, ...g.nodes.map((n) => n.x + NODE_W + 20));
  const pt = (e: { clientX: number; clientY: number }) => { const r = svg.current?.getBoundingClientRect(); return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) }; };
  const patchNode = (id: string, p: Partial<WfNode>) => setG((c) => ({ ...c, nodes: c.nodes.map((n) => (n.id === id ? { ...n, ...p } : n)) }));
  const move = (id: string, x: number, y: number) => patchNode(id, { x: clamp(Math.round(x), 0, 4000), y: clamp(Math.round(y), 0, H - NODE_H) });
  const connect = (from: string, to: string) => { const r = addEdge(g, from, to); if (r.error) toast({ kind: "warn", title: "Cannot connect", body: r.error }); else { setG(r.graph); setRun([]); toast({ kind: "ok", title: "Connected" }); } };
  const remove = (id: string) => {
    const old = g; const n = g.nodes.find((x) => x.id === id)!;
    setG({ nodes: g.nodes.filter((x) => x.id !== id), edges: g.edges.filter((e) => e.from !== id && e.to !== id) }); setSel(null); setRun([]);
    toast({ kind: "warn", title: `Deleted “${n.label}”`, undo: () => { setG(old); setSel(id); } });
  };
  const removeEdge = (id: string) => { const old = g; setG({ ...g, edges: g.edges.filter((e) => e.id !== id) }); setRun([]); toast({ kind: "warn", title: "Connection removed", undo: () => setG(old) }); };
  const add = () => {
    const id = `n${Date.now()}`; const y = 20 + (g.nodes.length % 6) * 55;
    setG({ ...g, nodes: [...g.nodes, { id, type: addType, label: `New ${TYPE_LABEL[addType].toLowerCase()}`, x: 30 + (g.nodes.length % 4) * 30, y, outcome: addType === "condition" ? "yes" : undefined }] }); setSel(id);
  };
  const key = (e: React.KeyboardEvent, n: WfNode) => {
    const step = e.shiftKey ? 40 : 10;
    const d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (d[e.key]) { e.preventDefault(); move(n.id, n.x + d[e.key][0], n.y + d[e.key][1]); }
    else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); remove(n.id); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(n.id); }
  };
  const byId = (id: string) => g.nodes.find((n) => n.id === id)!;
  const edgePath = (a: WfNode, b: WfNode) => { const x1 = a.x + NODE_W, y1 = a.y + NODE_H / 2, x2 = b.x, y2 = b.y + NODE_H / 2, c = Math.max(30, Math.abs(x2 - x1) / 2); return `M${x1},${y1} C${x1 + c},${y1} ${x2 - c},${y2} ${x2},${y2}`; };
  const runSet = new Set(run);
  const others = g.nodes.filter((n) => n.id !== sel && n.type !== "trigger").map((n) => ({ value: n.id, label: n.label }));
  return (
    <>
      <PageHeader title="Workflow builder" crumbs={["Builders", "Workflow builder"]} desc="Compose an automation from triggers, actions, conditions and delays. Drag steps, or select one and use the arrow keys; connect by dragging from the round port or with the inspector."
        status={errors ? <Badge s="danger">{errors} error{errors === 1 ? "" : "s"}</Badge> : issues.length ? <Badge s="warn">{issues.length} warning{issues.length === 1 ? "" : "s"}</Badge> : <Badge s="ok">valid</Badge>}
        actions={<><Btn icon="bolt" disabled={errors > 0} onClick={() => { const p = simulate(g); setRun(p); toast({ kind: "info", title: `Dry run visited ${p.length} step${p.length === 1 ? "" : "s"}` }); }}>Dry run</Btn><Btn variant="ghost" onClick={() => { setG(SEED); setSel(null); setRun([]); }}>Reset</Btn></>} />
      <div className="p3-split">
        <Panel title="Canvas" actions={<div className="adm-row"><Select aria-label="Step type to add" value={addType} onChange={(v) => setAddType(v as NodeType)} options={TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] }))} /><Btn sm icon="plus" onClick={add}>Add step</Btn></div>}>
          <div ref={wrap} className="p3-canvas" style={{ overflowX: "auto" }}>
            <svg ref={svg} width={world} height={H} viewBox={`0 0 ${world} ${H}`} role="group" aria-label="Workflow canvas"
              onPointerMove={(e) => { const p = pt(e); if (drag) move(drag.id, p.x - drag.dx, p.y - drag.dy); else if (link) setLink({ ...link, x: p.x, y: p.y }); }}
              onPointerUp={(e) => { if (link) { const p = pt(e); const hit = g.nodes.find((n) => n.id !== link.from && p.x >= n.x && p.x <= n.x + NODE_W && p.y >= n.y && p.y <= n.y + NODE_H); if (hit) connect(link.from, hit.id); setLink(null); } setDrag(null); }}>
              <defs><marker id="wf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0,0 L10,5 L0,10 z" className="p3-arrowhead" /></marker></defs>
              {g.edges.map((e) => { const a = byId(e.from), b = byId(e.to); const on = runSet.has(e.from) && runSet.has(e.to);
                return <g key={e.id}><path d={edgePath(a, b)} className={`p3-edge ${on ? "is-run" : ""}`} markerEnd="url(#wf-arrow)" />{e.branch && <text className="p3-edge-label" x={a.x + NODE_W + 12} y={a.y + NODE_H / 2 + (e.branch === "yes" ? -6 : 14)}>{e.branch}</text>}</g>; })}
              {link && (() => { const a = byId(link.from); return <path d={`M${a.x + NODE_W},${a.y + NODE_H / 2} L${link.x},${link.y}`} className="p3-edge is-temp" />; })()}
              {g.nodes.map((n) => (
                <g key={n.id} className={`p3-node p3-node--${n.type} ${sel === n.id ? "is-sel" : ""} ${runSet.has(n.id) ? "is-run" : ""}`} transform={`translate(${n.x},${n.y})`} role="button" tabIndex={0}
                  aria-label={`${TYPE_LABEL[n.type]}: ${n.label}. Arrow keys move, Delete removes.`} aria-pressed={sel === n.id} onKeyDown={(e) => key(e, n)} onFocus={() => setSel(n.id)}
                  onPointerDown={(e) => { const p = pt(e); setSel(n.id); setDrag({ id: n.id, dx: p.x - n.x, dy: p.y - n.y }); }}>
                  <rect width={NODE_W} height={NODE_H} rx="10" /><text x="12" y="19" className="p3-node-kind">{TYPE_LABEL[n.type]}</text><text x="12" y="36" className="p3-node-label">{n.label.length > 19 ? `${n.label.slice(0, 18)}…` : n.label}</text>
                  {n.type !== "end" && <circle className="p3-port" cx={NODE_W} cy={NODE_H / 2} r="7" onPointerDown={(e) => { e.stopPropagation(); const p = pt(e); setSel(n.id); setLink({ from: n.id, x: p.x, y: p.y }); }} />}
                </g>))}
            </svg>
          </div>
          {run.length > 0 && <p className="p3-note" role="status">Dry run: {run.map((id) => byId(id).label).join(" → ")}</p>}
        </Panel>
        <div className="adm-stack">
          <Panel title="Inspector">
            {node ? (
              <div className="adm-stack">
                <Field label="Label">{(id) => <TextInput id={id} value={node.label} onChange={(v) => patchNode(node.id, { label: v })} />}</Field>
                <Field label="Type">{(id) => <Select id={id} value={node.type} onChange={(v) => patchNode(node.id, { type: v as NodeType, outcome: v === "condition" ? "yes" : undefined })} options={TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] }))} />}</Field>
                {node.type === "condition" && <Segmented label="Dry-run outcome" value={node.outcome ?? "yes"} onChange={(v) => patchNode(node.id, { outcome: v })} options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} />}
                <Field label="Connect to">{(id) => <Select id={id} value={target} onChange={setTarget} options={[{ value: "", label: "Choose a step…" }, ...others]} />}</Field>
                <div className="adm-row"><Btn sm disabled={!target} onClick={() => { connect(node.id, target); setTarget(""); }}>Connect</Btn><Btn sm variant="ghost" onClick={() => remove(node.id)}>Delete step</Btn></div>
                <div className="adm-row"><span className="jp-muted">Position</span><span className="adm-num">{node.x}, {node.y}</span></div>
              </div>) : <p className="jp-muted">Select a step to edit it.</p>}
          </Panel>
          <Panel title="Checks">
            {issues.length === 0 ? <Alert s="ok" title="No problems found">Every step is reachable and every condition has both branches.</Alert> : <ul className="adm-list adm-list--tight">{issues.map((i, k) => <li key={k}><Badge s={i.level === "error" ? "danger" : "warn"}>{i.level}</Badge> <span>{i.text}</span></li>)}</ul>}
          </Panel>
        </div>
      </div>
      <Panel title="Connections" flush>
        <table className="jp-table"><caption className="p3-sr">Connections between steps</caption><thead><tr><th scope="col">From</th><th scope="col">Branch</th><th scope="col">To</th><th scope="col"><span className="p3-sr">Actions</span></th></tr></thead><tbody>
          {g.edges.map((e) => <tr key={e.id}><td>{byId(e.from).label}</td><td>{e.branch ?? "always"}</td><td>{byId(e.to).label}</td><td style={{ textAlign: "end" }}><button className="adm-x" aria-label={`Remove connection from ${byId(e.from).label} to ${byId(e.to).label}`} onClick={() => removeEdge(e.id)}>×</button></td></tr>)}
          {g.edges.length === 0 && <tr><td colSpan={4} className="jp-muted">No connections yet.</td></tr>}
        </tbody></table>
      </Panel>
    </>
  );
}
