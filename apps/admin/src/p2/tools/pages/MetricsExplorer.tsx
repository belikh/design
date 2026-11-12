import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader, Panel, Badge, EmptyState } from "@belikh/jupiter-ui/kit.tsx";
import { Field, Select, Segmented } from "@belikh/jupiter-ui/inputs.tsx";
import { LineChart, BarChart, Spark, C } from "@belikh/jupiter-ui/Charts.tsx";
import { DIMS, METRICS, queryMetrics, type Agg, type MetricId, type Query } from "../lib/metrics.ts";
import { CodeBlock } from "@belikh/jupiter-ui/kit.tsx";
import "../tools.css";

const DEFAULT: Query = { metric: "latency_ms", agg: "avg", groupBy: ["service"], filters: {}, hours: 72, step: 3 };
const parse = (raw: string | null): Query => { try { const q = JSON.parse(raw ?? "") as Query; return METRICS.some((m) => m.id === q.metric) ? { ...DEFAULT, ...q } : DEFAULT; } catch { return DEFAULT; } };
export const queryText = (q: Query) => `${q.agg}(${q.metric})${Object.entries(q.filters).filter(([, v]) => v.length).map(([d, v]) => `{${d}:${v.join("|")}}`).join("")}${q.groupBy.length ? ` by {${q.groupBy.join(",")}}` : ""} over ${q.hours}h step ${q.step}h`;
export function MetricsExplorer() {
  const [sp, setSp] = useSearchParams(); const q = useMemo(() => parse(sp.get("q")), [sp]); const m = METRICS.find((x) => x.id === q.metric)!; const kind = sp.get("kind") ?? "line";
  const set = (p: Partial<Query>) => setSp((prev) => { const n = new URLSearchParams(prev); n.set("q", JSON.stringify({ ...q, ...p })); return n; }, { replace: true });
  const res = useMemo(() => queryMetrics(q), [q]); const fmt = (v: number) => `${Math.round(v * 10) / 10}${m.unit === "%" ? "%" : ""}`;
  const toggle = (dim: string, v: string) => { const cur = q.filters[dim] ?? []; set({ filters: { ...q.filters, [dim]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] } }); };
  const stats = res.series.map((s) => ({ name: s.name, min: Math.min(...s.data), max: Math.max(...s.data), avg: s.data.reduce((a, b) => a + b, 0) / (s.data.length || 1), last: s.data[s.data.length - 1] }));
  return (
    <>
      <PageHeader title="Metrics explorer" crumbs={["Tools", "Metrics"]} desc="Pick a metric, aggregate it, group it by dimensions and filter. The query lives in the URL, so a view can be shared." status={<Badge s="info">{res.matched.toLocaleString()} points scanned</Badge>}
        actions={<Segmented label="Chart" value={kind} onChange={(k) => setSp((p) => { const n = new URLSearchParams(p); n.set("kind", k); return n; }, { replace: true })} options={[{ value: "line", label: "Line" }, { value: "area", label: "Area" }, { value: "stacked", label: "Stacked" }, { value: "bar", label: "Bars" }]} />} />
      <div className="pt-split" style={{ gridTemplateColumns: "300px minmax(0, 1fr)" }}>
        <Panel title="Query"><div className="adm-stack">
          <Field label="Metric">{(id) => <Select id={id} value={q.metric} onChange={(v) => set({ metric: v as MetricId })} options={METRICS.map((x) => ({ value: x.id, label: `${x.label} (${x.unit})` }))} />}</Field>
          <Field label="Aggregation">{(id) => <Select id={id} value={q.agg} onChange={(v) => set({ agg: v as Agg })} options={["sum", "avg", "min", "max", "p95"]} />}</Field>
          <div><div className="jp-label">Group by</div><div className="pt-chips">{Object.keys(DIMS).map((d) => <button key={d} type="button" className={`adm-pill ${q.groupBy.includes(d) ? "is-on" : ""}`} aria-pressed={q.groupBy.includes(d)} onClick={() => set({ groupBy: q.groupBy.includes(d) ? q.groupBy.filter((x) => x !== d) : [...q.groupBy, d] })}>{d}</button>)}</div></div>
          {Object.entries(DIMS).map(([d, vals]) => <div key={d}><div className="jp-label">Filter {d}</div><div className="pt-chips">{vals.map((v) => <button key={v} type="button" className={`adm-pill ${(q.filters[d] ?? []).includes(v) ? "is-on" : ""}`} aria-pressed={(q.filters[d] ?? []).includes(v)} onClick={() => toggle(d, v)}>{v}</button>)}</div></div>)}
          <div className="adm-row" style={{ flexWrap: "nowrap" }}><Field label="Range">{(id) => <Select id={id} value={String(q.hours)} onChange={(v) => set({ hours: Number(v), step: Number(v) <= 24 ? 1 : Number(v) <= 72 ? 3 : 6 })} options={[{ value: "6", label: "6 hours" }, { value: "24", label: "24 hours" }, { value: "72", label: "3 days" }, { value: "168", label: "7 days" }]} />}</Field><Field label="Step">{(id) => <Select id={id} value={String(q.step)} onChange={(v) => set({ step: Number(v) })} options={[{ value: "1", label: "1 h" }, { value: "3", label: "3 h" }, { value: "6", label: "6 h" }, { value: "24", label: "1 day" }]} />}</Field></div>
        </div></Panel>
        <div className="adm-stack">
          <CodeBlock label="query" code={queryText(q)} />
          <Panel title={`${m.label} (${m.unit})`}>
            {res.series.length === 0 ? <EmptyState spot="no-results" title="No data">Those filters match no series.</EmptyState> : kind === "bar" ? <BarChart height={260} labels={res.labels} series={res.series.slice(0, 8)} title={m.label} yFmt={fmt} /> : <LineChart height={260} labels={res.labels} series={res.series.slice(0, 8)} area={kind === "area"} stacked={kind === "stacked"} title={m.label} yFmt={fmt} anomalies />}
            {res.series.length > 8 && <p className="jp-muted">Showing the first 8 of {res.series.length} series. Add a filter to narrow it.</p>}
          </Panel>
          <Panel title="Series" flush><div className="adm-dt__wrap"><table className="jp-table"><thead><tr><th>Series</th><th className="jp-num">Min</th><th className="jp-num">Avg</th><th className="jp-num">Max</th><th className="jp-num">Last</th><th>Trend</th></tr></thead><tbody>{stats.map((s, i) => <tr key={s.name}><td><span style={{ color: C(i) }}>■</span> {s.name}</td><td className="jp-num">{fmt(s.min)}</td><td className="jp-num">{fmt(s.avg)}</td><td className="jp-num">{fmt(s.max)}</td><td className="jp-num">{fmt(s.last)}</td><td><Spark data={res.series[i].data} w={90} h={20} color={C(i)} /></td></tr>)}</tbody></table></div></Panel>
        </div>
      </div>
    </>
  );
}
