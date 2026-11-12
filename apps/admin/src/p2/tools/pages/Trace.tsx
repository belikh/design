import { useMemo, useState } from "react";
import { PageHeader, Panel, Badge, Tabs } from "@belikh/jupiter-ui/kit.tsx";
import { Select, Switch } from "@belikh/jupiter-ui/inputs.tsx";
import { C, ProgressBar } from "@belikh/jupiter-ui/Charts.tsx";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";
import { criticalPath, depthOf, flatten, children, makeTrace, selfTime, serviceBreakdown } from "../lib/trace.ts";
import "../tools.css";

export function Trace() {
  const [seed, setSeed] = useState("1"); const trace = useMemo(() => makeTrace(Number(seed)), [seed]); const [collapsed, setCollapsed] = useState<Set<string>>(new Set()); const [sel, setSel] = useState("a"); const [crit, setCrit] = useState(true); const [tab, setTab] = useState("attrs");
  const rows = useMemo(() => flatten(trace.spans, collapsed), [trace, collapsed]); const cp = useMemo(() => criticalPath(trace.spans), [trace]); const services = useMemo(() => [...new Set(trace.spans.map((s) => s.service))], [trace]); const bd = useMemo(() => serviceBreakdown(trace.spans), [trace]);
  const cur = trace.spans.find((s) => s.id === sel) ?? trace.spans[0]; const pct = (v: number) => `${(v / trace.total) * 100}%`; const errors = trace.spans.filter((s) => s.status === "error").length; const ticks = [0, 0.25, 0.5, 0.75, 1];
  return (
    <>
      <PageHeader title="Trace viewer" crumbs={["Tools", "Traces"]} desc="A distributed trace as a span waterfall. Click a span for details; the highlighted chain is the critical path that sets the total latency."
        status={errors ? <Badge s="danger">{errors} error span{errors > 1 ? "s" : ""}</Badge> : <Badge s="ok">ok</Badge>} actions={<><Select value={seed} onChange={(v) => { setSeed(v); setSel("a"); setCollapsed(new Set()); }} aria-label="Trace" options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `trace-${n.toString(16).padStart(4, "0")}${n % 3 === 0 ? " (error)" : ""}` }))} /><Switch checked={crit} onChange={setCrit} label="Critical path" /></>} />
      <div className="adm-grid adm-grid--4" style={{ marginBottom: 12 }}>{[["Total", `${trace.total.toFixed(0)} ms`], ["Spans", String(trace.spans.length)], ["Services", String(services.length)], ["Critical path", `${cp.size} spans`]].map(([l, v]) => <div key={l} className="jp-stat"><span className="jp-stat__label">{l}</span><span className="jp-stat__value" style={{ fontSize: "var(--jp-fs-lg)" }}>{v}</span></div>)}</div>
      <div className="pt-split" style={{ gridTemplateColumns: "minmax(0, 1fr) 300px" }}>
        <div className="pt-wf" role="tree" aria-label="Span waterfall">
          <div className="pt-wf__ticks"><span /><div>{ticks.map((t) => <span key={t} style={{ left: `${t * 100}%` }}>{(t * trace.total).toFixed(0)}ms</span>)}</div></div>
          {rows.map((s) => { const d = depthOf(trace.spans, s); const kids = children(trace.spans, s.id).length; const col = C(services.indexOf(s.service));
            return (<div key={s.id} role="treeitem" aria-level={d + 1} aria-selected={sel === s.id} tabIndex={0} className={`pt-wf__row ${sel === s.id ? "is-sel" : ""}`} onClick={() => setSel(s.id)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSel(s.id))}>
              <div className="pt-wf__name" style={{ paddingInlineStart: 8 + d * 14 }}>{kids ? <button className="adm-x" aria-expanded={!collapsed.has(s.id)} aria-label={collapsed.has(s.id) ? "Expand" : "Collapse"} onClick={(e) => { e.stopPropagation(); setCollapsed((c) => { const n = new Set(c); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n; }); }}><Icon name={collapsed.has(s.id) ? "chevron-right" : "chevron-down"} size={12} /></button> : <span style={{ width: 22 }} />}<b style={{ color: col }}>{s.service}</b><small>{s.name}</small></div>
              <div className="pt-wf__lane"><div className={`pt-wf__bar ${s.status === "error" ? "is-err" : ""} ${crit && cp.has(s.id) ? "is-crit" : ""}`} style={{ left: pct(s.start), width: pct(s.dur), background: col }} title={`${s.name}: ${s.dur} ms`} /></div>
            </div>); })}
        </div>
        <div className="adm-stack">
          <Panel title={`${cur.service} · ${cur.name}`} actions={<Badge s={cur.status === "ok" ? "ok" : "danger"}>{cur.status}</Badge>}>
            <Tabs value={tab} onChange={setTab} tabs={[{ id: "attrs", label: "Attributes" }, { id: "timing", label: "Timing" }]} />
            {tab === "attrs" ? <dl className="adm-dl" style={{ gridTemplateColumns: "90px 1fr", marginTop: 8 }}>{Object.entries(cur.attrs).length ? Object.entries(cur.attrs).map(([k, v]) => <><dt key={k}>{k}</dt><dd key={k + "v"} className="adm-num" style={{ wordBreak: "break-all" }}>{String(v)}</dd></>) : <><dt>—</dt><dd className="jp-muted">no attributes</dd></>}</dl>
              : <dl className="adm-dl" style={{ gridTemplateColumns: "90px 1fr", marginTop: 8 }}><dt>Start</dt><dd className="adm-num">{cur.start} ms</dd><dt>Duration</dt><dd className="adm-num">{cur.dur} ms</dd><dt>Self time</dt><dd className="adm-num">{selfTime(trace.spans, cur)} ms</dd><dt>% of trace</dt><dd className="adm-num">{((cur.dur / trace.total) * 100).toFixed(1)}%</dd><dt>Critical</dt><dd>{cp.has(cur.id) ? "yes" : "no"}</dd></dl>}
          </Panel>
          <Panel title="Self time by service"><div className="adm-stack">{bd.map(([s, v]) => <div key={s}><div className="adm-row" style={{ justifyContent: "space-between", fontSize: "var(--jp-fs-xs)" }}><span style={{ color: C(services.indexOf(s)) }}><b>{s}</b></span><span className="adm-num">{v.toFixed(0)} ms</span></div><ProgressBar value={v} max={trace.total} label={s} /></div>)}</div></Panel>
        </div>
      </div>
    </>
  );
}
