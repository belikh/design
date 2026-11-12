import { useState } from "react";
import { PageHeader, Panel, Badge, Btn, Skeleton, EmptyState } from "@belikh/jupiter-ui/kit.tsx";
import { LineChart, BarChart, Thermometer, Battery, Donut, Spark, Gauge, Ring, ProgressBar, Heatmap, CalendarHeat, UptimeBars, Scatter, Funnel, Treemap, Waterfall, Bullet, C } from "@belikh/jupiter-ui/Charts.tsx";
import { Segmented } from "@belikh/jupiter-ui/inputs.tsx";
import { days, series, heat, calendarValues, services, rng } from "../data/fixtures.ts";

const S = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => <section className="adm-section" id={id}><h2>{title}</h2><div className="adm-grid adm-grid--3">{children}</div></section>;
export function ChartsGallery() {
  const [st, setSt] = useState<"ready" | "loading" | "empty" | "error">("ready");
  const l = days(20), a = series(20, 60, 20, 1), b = series(20, 40, 15, 2), c = series(20, 25, 10, 3), g = rng(5);
  const hist = Array.from({ length: 14 }, (_, i) => Math.round(120 * Math.exp(-((i - 5) ** 2) / 10) + g() * 10));
  const state = (el: React.ReactNode) => st === "ready" ? el : st === "loading" ? <div className="adm-stack"><Skeleton h={160} r={6} /><Skeleton w="60%" /></div> : st === "empty" ? <EmptyState spot="no-results" title="No data">Nothing in this range.</EmptyState> : <EmptyState spot="unplugged" title="Couldn’t load" action={<Btn sm>Retry</Btn>}>The query timed out.</EmptyState>;
  return (
    <>
      <PageHeader title="Chart gallery" crumbs={["Library", "Charts"]} desc="Hand-rolled SVG charts that follow the tokens: crosshair tooltips, toggleable legends, thresholds, annotations, and every data state."
        actions={<><span className="jp-muted">State</span><Segmented label="Chart state" value={st} onChange={setSt} options={[{ value: "ready", label: "Ready" }, { value: "loading", label: "Loading" }, { value: "empty", label: "Empty" }, { value: "error", label: "Error" }]} /></>} />
      <S id="trend" title="Trend">
        <Panel title="Line (multi-series, hover for crosshair)">{state(<LineChart labels={l} height={200} series={[{ name: "A", data: a }, { name: "B", data: b }, { name: "C", data: c }]} />)}</Panel>
        <Panel title="Smoothed area + annotation">{state(<LineChart area smooth labels={l} height={200} annotations={[{ i: 12, label: "release" }]} series={[{ name: "Users", data: a }]} />)}</Panel>
        <Panel title="Stepped">{state(<LineChart step labels={l} height={200} series={[{ name: "Replicas", data: a.map((v) => Math.round(v / 15)) }]} yFmt={(v) => String(Math.round(v * 10) / 10)} />)}</Panel>
        <Panel title="Stacked area">{state(<LineChart stacked labels={l} height={200} series={[{ name: "A", data: a }, { name: "B", data: b }, { name: "C", data: c }]} />)}</Panel>
        <Panel title="Forecast band">{state(<LineChart labels={l} height={200} series={[{ name: "Actual", data: a }]} band={{ name: "p10–p90", lo: a.map((v) => v * 0.8), hi: a.map((v) => v * 1.25) }} />)}</Panel>
        <Panel title="Sparklines"><div className="adm-stack">{(["line", "area", "bar", "winloss"] as const).map((k, i) => <div key={k} className="adm-row" style={{ justifyContent: "space-between" }}><span className="jp-muted">{k}</span><Spark kind={k} data={k === "winloss" ? [1, -1, 1, 1, -1, 1, 1, 1, -1, 1] : series(14, 30, 10, i + 1)} w={120} h={30} color={C(i)} /></div>)}</div></Panel>
      </S>
      <S id="advanced" title="Advanced: zoom, anomalies, log and dual axes, export">
        <Panel title="Anomaly detection (z-score > 2.2)">{state(<LineChart title="Latency" anomalies labels={days(40)} height={200} series={[{ name: "Latency ms", data: series(40, 120, 20, 4).map((v, i) => (i === 14 ? v * 3.4 : i === 29 ? v * 0.2 : v)) }]} />)}</Panel>
        <Panel title="Log scale (heavy tail)">{state(<LineChart title="Requests" yScale="log" labels={days(20)} height={200} series={[{ name: "Requests", data: a.map((v, i) => Math.round(Math.exp(i / 3) * 6 + v)) }]} />)}</Panel>
        <Panel title="Dual axis (right axis dashed)">{state(<LineChart title="Revenue vs margin" labels={days(20)} height={200} yFmt={(v) => String(Math.round(v))} series={[{ name: "Revenue ($)", data: a.map((v) => v * 40) }, { name: "Margin (%)", data: b.map((v) => v / 2), axis: 2 }]} />)}</Panel>
        <Panel title="Thermometer, battery"><div className="adm-row" style={{ justifyContent: "space-around" }}><Thermometer value={23} /><Thermometer value={41} label="Server room" zones={[0.4, 0.75]} /><div className="adm-stack"><Battery value={78} charging /><Battery value={24} label="Sensor" /><Battery value={9} label="Door" /></div></div></Panel>
        <Panel title="Export and table view"><p className="jp-muted">Every line and bar chart has a toolbar: <b>table</b> toggles an accessible data table, <b>Export</b> downloads SVG, PNG or CSV (colours are resolved so the file renders anywhere), and fullscreen enlarges it.</p></Panel>
      </S>
      <S id="bars" title="Bars">
        <Panel title="Grouped">{state(<BarChart labels={["Mon", "Tue", "Wed", "Thu", "Fri"]} series={[{ name: "2025", data: [12, 18, 9, 22, 15] }, { name: "2026", data: [16, 21, 14, 25, 19] }]} height={200} />)}</Panel>
        <Panel title="Stacked + target">{state(<BarChart mode="stacked" target={55} labels={["Q1", "Q2", "Q3", "Q4"]} series={[{ name: "Product", data: [20, 25, 22, 30] }, { name: "Services", data: [10, 14, 18, 16] }, { name: "Other", data: [4, 6, 5, 8] }]} height={200} />)}</Panel>
        <Panel title="Horizontal">{state(<BarChart horizontal labels={["Brisbane", "Sydney", "Perth", "Hobart"]} series={[{ name: "Sales", data: [42, 31, 18, 9] }]} height={200} />)}</Panel>
        <Panel title="Diverging (variance)">{state(<BarChart diverging labels={["Jan", "Feb", "Mar", "Apr", "May"]} series={[{ name: "Variance", data: [8, -5, 12, -9, 4] }]} height={200} />)}</Panel>
        <Panel title="Histogram">{state(<BarChart labels={hist.map((_, i) => `${i * 10}`)} series={[{ name: "Count", data: hist }]} height={200} />)}</Panel>
        <Panel title="Waterfall">{state(<Waterfall steps={[{ label: "Start", value: 100, total: true }, { label: "+New", value: 40 }, { label: "−Churn", value: -25 }, { label: "End", value: 115, total: true }]} height={200} />)}</Panel>
      </S>
      <S id="composition" title="Composition">
        <Panel title="Donut"><div className="adm-row" style={{ justifyContent: "center" }}>{state(<Donut parts={[{ label: "A", value: 45 }, { label: "B", value: 30 }, { label: "C", value: 25 }]} center={<><b>100</b><span>total</span></>} />)}</div></Panel>
        <Panel title="Pie"><div className="adm-row" style={{ justifyContent: "center" }}>{state(<Donut pie parts={[{ label: "A", value: 45 }, { label: "B", value: 30 }, { label: "C", value: 25 }]} />)}</div></Panel>
        <Panel title="Semi-donut"><div className="adm-row" style={{ justifyContent: "center" }}>{state(<Donut semi parts={[{ label: "Used", value: 72 }, { label: "Free", value: 28 }]} center={<b>72%</b>} />)}</div></Panel>
        <Panel title="Treemap">{state(<Treemap height={190} items={[{ label: "System", value: 40 }, { label: "Media", value: 32 }, { label: "Backups", value: 20 }, { label: "Docs", value: 8 }]} />)}</Panel>
        <Panel title="Funnel">{state(<Funnel steps={[{ label: "Visit", value: 1000 }, { label: "Signup", value: 420 }, { label: "Activate", value: 210 }, { label: "Pay", value: 80 }]} />)}</Panel>
        <Panel title="Stacked progress"><ProgressBar value={100} max={100} label="Disk" segments={[{ name: "System", v: 38, color: C(0) }, { name: "Media", v: 29, color: C(1) }, { name: "Backups", v: 18, color: C(2) }]} /><ul className="adm-legend"><li><i style={{ background: C(0) }} />System 38%</li><li><i style={{ background: C(1) }} />Media 29%</li><li><i style={{ background: C(2) }} />Backups 18%</li></ul></Panel>
      </S>
      <S id="progress" title="Progress and status">
        <Panel title="Gauges"><div className="adm-row" style={{ justifyContent: "space-around" }}><Gauge value={34} label="Ok" size={130} /><Gauge value={74} label="Warn" size={130} /><Gauge value={93} label="Hot" size={130} /></div></Panel>
        <Panel title="Rings and bars"><div className="adm-row" style={{ justifyContent: "space-around" }}><Ring value={25} /><Ring value={64} /><Ring value={92} /></div><div className="adm-stack" style={{ marginTop: 12 }}><ProgressBar value={30} label="a" /><ProgressBar value={65} s="warn" label="b" /><ProgressBar value={92} s="danger" label="c" /></div></Panel>
        <Panel title="Bullet"><div className="adm-stack">{[["Revenue", 112], ["Signups", 74], ["NPS", 52]].map(([k, v]) => <Bullet key={k as string} label={k as string} value={v as number} target={90} max={150} ranges={[60, 100, 150]} />)}</div></Panel>
        <Panel title="Uptime bars"><div className="adm-stack">{services.slice(0, 3).map((s) => <div key={s.name}><div className="jp-muted adm-num" style={{ fontSize: "var(--jp-fs-xs)" }}>{s.name}</div><UptimeBars days={s.days} /></div>)}</div></Panel>
        <Panel title="Status grid"><div className="adm-statusgrid">{services.map((s) => <span key={s.name} className={`is-${s.status}`} title={`${s.name}: ${s.status}`}>{s.name.slice(0, 2)}</span>)}</div></Panel>
        <Panel title="Badges / tiles"><div className="adm-row"><Badge s="ok">ok</Badge><Badge s="warn">warn</Badge><Badge s="danger">down</Badge><Badge s="info">info</Badge><Badge pill>pill</Badge></div></Panel>
      </S>
      <S id="dist" title="Distribution and density">
        <Panel title="Scatter + trend">{state(<Scatter height={200} points={Array.from({ length: 40 }, () => { const x = g() * 100; return { x, y: x * 0.8 + g() * 30, g: Math.floor(g() * 3) }; })} />)}</Panel>
        <Panel title="Heatmap (matrix)">{state(<Heatmap rows={heat.rows} cols={heat.cols} data={heat.data} />)}</Panel>
        <Panel title="Calendar heatmap">{state(<CalendarHeat values={calendarValues} />)}</Panel>
      </S>
      <section className="adm-section"><h2>Colour</h2>
        <Panel title="Categorical (8), sequential, status"><div className="adm-stack"><div className="adm-row">{Array.from({ length: 8 }, (_, i) => <span key={i} className="adm-swatch" style={{ background: C(i) }}>{i + 1}</span>)}</div><div className="adm-row">{Array.from({ length: 9 }, (_, i) => <span key={i} className="adm-swatch" style={{ background: `color-mix(in oklab, var(--jp-accent) ${i * 12.5}%, var(--jp-surface))` }} />)}</div><div className="adm-row">{(["ok", "warn", "danger", "info"] as const).map((s) => <span key={s} className="adm-swatch" style={{ background: `var(--jp-${s})` }}>{s}</span>)}</div><p className="jp-muted">Series colours come from the tokens (accent, info, ok, warn, danger plus two mixes and muted), so they re-theme with light and dark. Pair colour with a legend, labels or patterns when meaning matters.</p></div></Panel></section>
    </>
  );
}
