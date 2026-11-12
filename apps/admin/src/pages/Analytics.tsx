import { useMemo, useState } from "react";
import { PageHeader, Panel, Badge, Btn } from "@belikh/jupiter-ui/kit.tsx";
import { LineChart, BarChart, Funnel, Scatter, Treemap, Heatmap, Waterfall, Bullet, StatTile } from "@belikh/jupiter-ui/Charts.tsx";
import { Segmented, DateRange } from "@belikh/jupiter-ui/inputs.tsx";
import { days, series, rng } from "../data/fixtures.ts";

export function Analytics() {
  const [range, setRange] = useState<[string, string]>(["2026-10-14", "2026-11-12"]);
  const [by, setBy] = useState<"channel" | "region" | "device">("channel");
  const [pills, setPills] = useState<string[]>(["Paid", "Organic"]);
  const n = 30;
  const groups = { channel: ["Organic", "Paid", "Email", "Referral"], region: ["QLD", "NSW", "VIC", "WA"], device: ["Desktop", "Mobile", "Tablet", "Kiosk"] }[by];
  const stacks = useMemo(() => groups.map((g, i) => ({ name: g, data: series(n, 90 - i * 14, 22, i + 3, 0.5) })), [groups]);
  const g = rng(7); const pts = Array.from({ length: 60 }, (_, i) => { const x = 20 + g() * 480; return { x, y: 40 + x * 0.55 + (g() - 0.5) * 140, r: 3 + g() * 7, g: i % 3, label: `account ${i}` }; });
  const retention = ["Oct 14", "Oct 21", "Oct 28", "Nov 04", "Nov 11"].map((_, r) => Array.from({ length: 6 }, (_, c) => Math.max(0, c > 5 - r ? NaN : Math.round(100 * Math.exp(-c * 0.32) * (0.9 + g() * 0.15)))));
  const clean = retention.map((row) => row.map((v) => (Number.isNaN(v) ? 0 : v)));
  const hist = Array.from({ length: 16 }, (_, i) => Math.round(220 * Math.exp(-((i - 5) ** 2) / 14) + g() * 14));
  return (
    <>
      <PageHeader title="Analytics" desc="Break revenue down, compare periods, and find what moved." crumbs={["Dashboards", "Analytics"]}
        actions={<><Btn icon="download">Export</Btn><Btn variant="primary" icon="send">Share view</Btn></>} />
      <Panel className="adm-section" title="Scope" >
        <div className="adm-row" style={{ gap: 24, alignItems: "flex-start" }}>
          <DateRange value={range} onChange={setRange} />
          <div><div className="jp-label">Group by</div><Segmented label="Group by" value={by} onChange={setBy} options={[{ value: "channel", label: "Channel" }, { value: "region", label: "Region" }, { value: "device", label: "Device" }]} /></div>
          <div><div className="jp-label">Filters</div><div className="adm-row">{["Paid", "Organic", "Email", "Referral"].map((p) => <button key={p} className={`adm-pill ${pills.includes(p) ? "is-on" : ""}`} aria-pressed={pills.includes(p)} onClick={() => setPills((x) => x.includes(p) ? x.filter((y) => y !== p) : [...x, p])}>{p}</button>)}</div></div>
          <span className="adm-spacer" /><Badge s="info">{range[0]} → {range[1]}</Badge>
        </div>
      </Panel>
      <div className="adm-grid adm-grid--4" style={{ marginTop: 16 }}>
        <StatTile label="Sessions" value="48.2k" delta={6.2} spark={series(14, 30, 8, 2)} sub="vs prev" /><StatTile label="Conversion" value="3.4%" delta={0.4} spark={series(14, 30, 6, 4)} sub="vs prev" />
        <StatTile label="AOV" value="$142" delta={-2.1} spark={series(14, 30, 7, 6)} sub="vs prev" /><StatTile label="Churn" value="1.8%" delta={-0.3} invert spark={series(14, 30, 5, 8)} sub="vs prev" />
      </div>
      <div className="adm-grid adm-grid--2" style={{ marginTop: 16 }}>
        <Panel title={`Revenue by ${by} (stacked area)`}><LineChart stacked labels={days(n)} series={stacks} /></Panel>
        <Panel title={`Share by ${by} (100% stacked)`}><BarChart mode="percent" labels={days(10)} series={stacks.map((s) => ({ ...s, data: s.data.slice(-10) }))} /></Panel>
      </div>
      <div className="adm-grid adm-grid--3" style={{ marginTop: 16 }}>
        <Panel title="Conversion funnel"><Funnel steps={[{ label: "Visit", value: 48200 }, { label: "Product view", value: 29800 }, { label: "Add to cart", value: 9600 }, { label: "Checkout", value: 4100 }, { label: "Paid", value: 1640 }]} /></Panel>
        <Panel title="Spend vs revenue (scatter + trend)"><Scatter points={pts} xLabel="spend" yLabel="revenue" /></Panel>
        <Panel title="Order value distribution"><BarChart labels={hist.map((_, i) => `$${i * 25}`)} series={[{ name: "Orders", data: hist }]} height={220} /></Panel>
      </div>
      <div className="adm-grid adm-grid--21" style={{ marginTop: 16 }}>
        <Panel title="Revenue bridge (waterfall)"><Waterfall steps={[{ label: "Last mo", value: 118, total: true }, { label: "New", value: 34 }, { label: "Expansion", value: 21 }, { label: "Churn", value: -17 }, { label: "Refunds", value: -6 }, { label: "This mo", value: 150, total: true }]} /></Panel>
        <Panel title="Targets (bullet)"><div className="adm-stack">{[["Revenue", 112, 100, 150], ["Signups", 74, 90, 120], ["NPS", 52, 50, 100], ["Retention", 88, 85, 100]].map(([l, v, t, m]) => <Bullet key={l as string} label={l as string} value={v as number} target={t as number} max={m as number} ranges={[(m as number) * 0.5, (m as number) * 0.75, m as number]} />)}</div></Panel>
      </div>
      <div className="adm-grid adm-grid--2" style={{ marginTop: 16 }}>
        <Panel title="Revenue mix (treemap)"><Treemap items={[{ label: "Subscriptions", value: 480 }, { label: "Hardware", value: 260 }, { label: "Services", value: 190 }, { label: "Licences", value: 120 }, { label: "Support", value: 80 }, { label: "Other", value: 40 }]} /></Panel>
        <Panel title="Weekly cohort retention (%)"><Heatmap rows={["Oct 14", "Oct 21", "Oct 28", "Nov 04", "Nov 11"]} cols={["W0", "W1", "W2", "W3", "W4", "W5"]} data={clean} fmt={(v) => (v ? `${v}` : "")} /></Panel>
      </div>
    </>
  );
}
