import { useMemo, useState } from "react";
import { PageHeader, Panel, Badge, Btn, Alert, Dot } from "@belikh/jupiter-ui/kit.tsx";
import { Field, Select, Switch } from "@belikh/jupiter-ui/inputs.tsx";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";
import { EDGES, NODES, VLANS, bottleneck, edgeBetween, neighbors, pathEdges, shortestPath, type NodeKind } from "../lib/topology.ts";
import "../tools.css";

const ICON: Record<NodeKind, string> = { internet: "globe", gateway: "router", switch: "switch", ap: "ap", server: "server", nas: "disk", camera: "camera", iot: "cpu", client: "monitor" };
const uc = (u: number) => (u < 0.6 ? "u-ok" : u < 0.8 ? "u-warn" : "u-danger");
export function Topology() {
  const [sel, setSel] = useState<string | null>("core"); const [vlan, setVlan] = useState<number | null>(null); const [from, setFrom] = useState("ws"); const [to, setTo] = useState("api"); const [tracing, setTracing] = useState(false); const [avoid, setAvoid] = useState(true);
  const path = useMemo(() => (tracing ? shortestPath(from, to, { avoidDown: avoid }) : null), [tracing, from, to, avoid]); const pe = useMemo(() => new Set((path ? pathEdges(path) : []).map(([a, b]) => [a, b].sort().join("|"))), [path]);
  const node = NODES.find((n) => n.id === sel); const nb = sel ? neighbors(sel) : []; const bn = path ? bottleneck(path) : null; const down = NODES.filter((n) => n.status === "down");
  const opts = NODES.map((n) => ({ value: n.id, label: n.label }));
  return (
    <>
      <PageHeader title="Network topology" crumbs={["Tools", "Topology"]} desc="Explore the network: select a device, filter by VLAN, and trace the path between two devices. Link colour shows utilisation; dashed links are Wi-Fi."
        status={down.length ? <Badge s="danger">{down.length} down</Badge> : <Badge s="ok">all up</Badge>} actions={<div className="pt-chips"><button className={`adm-pill ${vlan === null ? "is-on" : ""}`} onClick={() => setVlan(null)}>All VLANs</button>{Object.entries(VLANS).filter(([k]) => k !== "99").map(([k, n]) => <button key={k} className={`adm-pill ${vlan === Number(k) ? "is-on" : ""}`} aria-pressed={vlan === Number(k)} onClick={() => setVlan(vlan === Number(k) ? null : Number(k))}>{n} <small>{k}</small></button>)}</div>} />
      <div className="pt-split" style={{ gridTemplateColumns: "minmax(0, 1fr) 300px" }}>
        <div>
          <svg className="pt-topo" viewBox="0 0 960 450" role="group" aria-label="Network topology diagram">
            {EDGES.map((e) => { const a = NODES.find((n) => n.id === e.a)!, b = NODES.find((n) => n.id === e.b)!; const key = [e.a, e.b].sort().join("|"); const dim = (vlan !== null && a.vlan !== vlan && b.vlan !== vlan) || (path && !pe.has(key)); const mid = [(a.x + b.x) / 2, (a.y + b.y) / 2];
              return <g key={key}><line className={`pt-edge ${uc(e.util)} ${e.medium === "wifi" ? "is-wifi" : ""} ${dim ? "is-dim" : ""} ${pe.has(key) ? "is-path" : ""}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={e.mbps >= 10000 ? 5 : e.mbps >= 1000 ? 3.5 : 2} aria-label={`${a.label} to ${b.label}, ${e.mbps} Mbps, ${Math.round(e.util * 100)}% used`} />{(!dim || pe.has(key)) && <text className="pt-sub" x={mid[0] + 4} y={mid[1] - 3}>{Math.round(e.util * 100)}%</text>}</g>; })}
            {NODES.map((n) => { const dim = (vlan !== null && n.vlan !== vlan) || (path && !path.includes(n.id)); return (
              <g key={n.id} className={`pt-node ${sel === n.id ? "is-sel" : ""} ${dim ? "is-dim" : ""} ${path?.includes(n.id) ? "is-path" : ""}`} role="button" tabIndex={0} aria-label={`${n.label}, ${n.status}`} aria-pressed={sel === n.id} onClick={() => setSel(n.id)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSel(n.id))} transform={`translate(${n.x - 52}, ${n.y - 18})`}>
                <rect width="104" height="36" rx="8" /><foreignObject x="6" y="9" width="18" height="18"><Icon name={ICON[n.kind]} size={18} /></foreignObject><text x="28" y="15">{n.label.length > 13 ? n.label.slice(0, 12) + "…" : n.label}</text><text className="pt-sub" x="28" y="28">{n.ip}</text><circle className={`st st-${n.status}`} cx="96" cy="8" r="4" />
              </g>); })}
          </svg>
          <div className="adm-row jp-muted" style={{ marginTop: 8, fontSize: "var(--jp-fs-xs)" }}><span><Dot s="ok" /> up</span><span><Dot s="warn" /> degraded</span><span><Dot s="danger" /> down</span><span>· links: green &lt;60%, amber &lt;80%, red ≥80% utilisation</span></div>
        </div>
        <div className="adm-stack">
          <Panel title="Device">{node ? <div className="adm-stack"><div className="adm-row"><Icon name={ICON[node.kind]} size={22} /><b>{node.label}</b><Badge s={node.status === "up" ? "ok" : node.status === "warn" ? "warn" : "danger"}>{node.status}</Badge></div>
            <dl className="adm-dl" style={{ gridTemplateColumns: "70px 1fr" }}><dt>IP</dt><dd className="adm-num">{node.ip}</dd><dt>VLAN</dt><dd>{VLANS[node.vlan]} ({node.vlan})</dd><dt>Type</dt><dd>{node.kind}</dd></dl>
            <div><div className="jp-label">Links</div><ul style={{ margin: 0, paddingInlineStart: 18 }}>{nb.map((id) => { const e = edgeBetween(sel!, id)!; return <li key={id}><button className="adm-link" onClick={() => setSel(id)}>{NODES.find((n) => n.id === id)!.label}</button> <span className="jp-muted">{e.mbps >= 1000 ? `${e.mbps / 1000} G` : `${e.mbps} M`} · {Math.round(e.util * 100)}%</span></li>; })}</ul></div></div> : <p className="jp-muted">Select a device on the diagram.</p>}</Panel>
          <Panel title="Trace a path" actions={<Switch checked={tracing} onChange={setTracing} label="Trace" />}>
            <div className="adm-stack"><Field label="From">{(id) => <Select id={id} value={from} onChange={setFrom} options={opts} />}</Field><Field label="To">{(id) => <Select id={id} value={to} onChange={setTo} options={opts} />}</Field><Switch checked={avoid} onChange={setAvoid} label="Route around down devices" />
              {tracing && (path ? <><div className="adm-row">{path.map((id, i) => <span key={id} className="adm-row" style={{ gap: 4 }}>{i > 0 && <Icon name="arrow-right" size={12} />}<Badge s={NODES.find((n) => n.id === id)!.status === "down" ? "danger" : "info"}>{NODES.find((n) => n.id === id)!.label}</Badge></span>)}</div><p className="jp-muted">{path.length - 1} hops{bn ? ` · tightest link: ${NODES.find((n) => n.id === bn.a)!.label} ↔ ${NODES.find((n) => n.id === bn.b)!.label} (${Math.round((1 - bn.util) * bn.mbps)} Mbps free)` : ""}</p></> : <Alert s="danger" title="No path">{avoid ? "Every route goes through a device that is down." : "These devices aren’t connected."}</Alert>)}
              <Btn sm variant="ghost" onClick={() => { setFrom(to); setTo(from); }}>Swap ends</Btn></div>
          </Panel>
        </div>
      </div>
    </>
  );
}
