import { useMemo, useState } from "react";
import { PageHeader, Panel, Btn, Badge } from "@belikh/jupiter-ui/kit.tsx";
import { Segmented, Slider, TextInput } from "@belikh/jupiter-ui/inputs.tsx";
import { DataTable, type Col } from "@belikh/jupiter-ui/DataTable.tsx";
import { StatTile, useWidth } from "@belikh/jupiter-ui/Charts.tsx";
import { FLOWS, applyFilters, sankey, type Filters, type Flow, type Proto } from "./lib/flows.ts";
import { fmtBytes } from "./common.ts";
import "./devtools.css";

const COLOUR: Record<Proto, string> = { tcp: "var(--adm-c1)", udp: "var(--adm-c3)", icmp: "var(--adm-c5)" };
const LW = 170, H = 360;

export function FlowViewer() {
  const [f, setF] = useState<Filters>({ proto: "all", minBytes: 0, q: "", action: "all" }); const [focus, setFocus] = useState<string | null>(null);
  const [wrap, W] = useWidth();
  const flows = useMemo(() => applyFilters(FLOWS, f), [f]); const shown = focus ? flows.filter((x) => x.src === focus || x.dst === focus) : flows;
  const lay = useMemo(() => sankey(flows, H), [flows]);
  const bytes = flows.reduce((s, x) => s + x.bytes, 0); const blocked = flows.filter((x) => x.action === "block").length;
  const rx = Math.max(W, 560) - LW;
  const dim = (src: string, dst: string) => focus !== null && focus !== src && focus !== dst;
  const cols: Col<Flow>[] = [
    { key: "src", header: "Source", width: 190, filter: "select" }, { key: "dst", header: "Destination", width: 190, filter: "select" },
    { key: "proto", header: "Proto", width: 80, render: (r) => <Badge>{r.proto}</Badge> }, { key: "port", header: "Port", width: 70, align: "right" }, { key: "app", header: "App", width: 110, filter: "select" },
    { key: "bytes", header: "Bytes", width: 100, align: "right", render: (r) => fmtBytes(r.bytes), value: (r) => r.bytes }, { key: "packets", header: "Packets", width: 90, align: "right" },
    { key: "action", header: "Action", width: 90, render: (r) => <Badge s={r.action === "allow" ? "ok" : "danger"}>{r.action}</Badge> },
  ];
  return (
    <>
      <PageHeader title="Network flows" crumbs={["Operations", "Network flows"]} desc="Who talks to whom, sized by bytes. Filter by protocol and volume, then select a device or destination to focus its flows."
        status={blocked ? <Badge s="warn">{blocked} blocked</Badge> : <Badge s="ok">none blocked</Badge>} actions={focus ? <Btn variant="ghost" onClick={() => setFocus(null)}>Clear focus</Btn> : undefined} />
      <div className="adm-grid adm-grid--3"><StatTile label="Flows" value={String(flows.length)} /><StatTile label="Traffic" value={fmtBytes(bytes)} /><StatTile label="Blocked" value={String(blocked)} /></div>
      <div className="lab-gap" />
      <Panel title="Filters"><div className="lab-filters">
        <Segmented label="Protocol" value={f.proto} onChange={(v) => setF({ ...f, proto: v })} options={[{ value: "all", label: "All" }, { value: "tcp", label: "TCP" }, { value: "udp", label: "UDP" }, { value: "icmp", label: "ICMP" }]} />
        <Segmented label="Action" value={f.action} onChange={(v) => setF({ ...f, action: v })} options={[{ value: "all", label: "Any" }, { value: "allow", label: "Allowed" }, { value: "block", label: "Blocked" }]} />
        <Slider label="Minimum bytes per flow" value={f.minBytes} onChange={(v) => setF({ ...f, minBytes: v })} min={0} max={2_000_000} step={50_000} fmt={fmtBytes} />
        <TextInput aria-label="Search flows" placeholder="Search source, destination, app…" value={f.q} onChange={(v) => setF({ ...f, q: v })} />
      </div></Panel>
      <div className="lab-gap" />
      <Panel title="Flow diagram">
        <div ref={wrap}>
          {lay.links.length === 0 ? <p className="jp-muted">No flows match these filters.</p> : (
            <svg width={Math.max(W, 560)} height={Math.max(H, ...lay.left.map((n) => n.y + n.h), ...lay.right.map((n) => n.y + n.h)) + 8} role="group" aria-label="Flow diagram: sources on the left, destinations on the right. The table below lists the same flows.">
              {lay.links.map((l) => <path key={`${l.src}>${l.dst}`} className={`lab-flow ${dim(l.src, l.dst) ? "is-dim" : ""}`} style={{ stroke: COLOUR[l.proto] }} strokeWidth={l.w} d={`M${LW},${l.sy + l.w / 2} C${LW + rx / 2},${l.sy + l.w / 2} ${LW + rx / 2},${l.dy + l.w / 2} ${LW + rx - 0},${l.dy + l.w / 2}`}><title>{`${l.src} to ${l.dst}: ${fmtBytes(l.bytes)} in ${l.flows} flow${l.flows === 1 ? "" : "s"}`}</title></path>)}
              {[...lay.left, ...lay.right].map((n) => { const x = n.side === "l" ? 0 : LW + rx; return (
                <g key={`${n.side}${n.name}`} className={`lab-fnode ${focus === n.name ? "is-sel" : ""}`} role="button" tabIndex={0} aria-pressed={focus === n.name} aria-label={`${n.name}, ${fmtBytes(n.total)}. Select to focus.`} onClick={() => setFocus(focus === n.name ? null : n.name)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFocus(focus === n.name ? null : n.name); } }}>
                  <rect x={n.side === "l" ? LW - 8 : LW + rx} y={n.y} width="8" height={n.h} rx="2" />
                  <text x={n.side === "l" ? LW - 14 : LW + rx + 14} y={n.y + Math.min(n.h, 28) / 2 + 4} textAnchor={n.side === "l" ? "end" : "start"}>{n.name.length > 24 ? `${n.name.slice(0, 23)}…` : n.name}</text>
                  <rect className="lab-hit" x={n.side === "l" ? 0 : LW + rx} y={n.y} width={x === 0 ? LW : 8} height={Math.max(n.h, 18)} />
                </g>); })}
            </svg>)}
        </div>
        <ul className="adm-legend lab-legend" aria-label="Protocol colours">{(Object.keys(COLOUR) as Proto[]).map((p) => <li key={p}><i style={{ background: COLOUR[p] }} />{p.toUpperCase()}</li>)}</ul>
      </Panel>
      <div className="lab-gap" />
      <Panel title={focus ? `Flows for ${focus}` : "Flows"} flush><DataTable<Flow> rows={shown} cols={cols} ariaLabel="Flows" exportName="flows" pageSize={10} /></Panel>
    </>
  );
}
