import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, Panel, Badge, Btn, Avatar, Dot, type Status } from "@belikh/jupiter-ui/kit.tsx";
import { StatTile, LineChart, Donut, BarChart, UptimeBars, Heatmap, Spark } from "@belikh/jupiter-ui/Charts.tsx";
import { Segmented, Switch } from "@belikh/jupiter-ui/inputs.tsx";
import { activity, days, heat, money, num, orders, series, services } from "../data/fixtures.ts";

const ST = ["var(--jp-ok)", "var(--jp-warn)", "var(--jp-info)", "var(--jp-danger)"]; // paid, pending, refunded, failed: status colours, not series colours
export function Overview() {
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");
  const [compare, setCompare] = useState(true);
  const n = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const rev = series(n, 420, 90, 3, 1.6), prev = series(n, 360, 80, 5, 1.1), lo = rev.map((v) => v * 0.85), hi = rev.map((v) => v * 1.12);
  const byStatus = ["paid", "pending", "refunded", "failed"].map((s) => ({ label: s, value: orders.filter((o) => o.status === s).length }));
  const byRegion = ["Brisbane", "Sydney", "Melbourne", "Perth", "Adelaide"].map((r) => orders.filter((o) => o.region === r).reduce((a, o) => a + o.amount, 0));
  return (
    <>
      <PageHeader title="Overview" desc="Revenue, orders and service health at a glance."
        actions={<><Segmented label="Range" value={range} onChange={setRange} options={[{ value: "7d", label: "7d" }, { value: "30d", label: "30d" }, { value: "90d", label: "90d" }]} /><Switch checked={compare} onChange={setCompare} label="Compare" /><Btn icon="refresh">Refresh</Btn></>} />
      <div className="adm-grid adm-grid--4">
        <StatTile label="Revenue" value={money(rev.reduce((a, b) => a + b, 0) * 12)} delta={12.4} spark={rev.slice(-14)} sub="vs prev period" />
        <StatTile label="Orders" value={num(orders.length * 4)} delta={4.1} spark={series(14, 30, 8, 8)} sub="vs prev period" />
        <StatTile label="Latency p95" value="182 ms" delta={8.2} invert spark={series(14, 150, 30, 9)} sub="vs last week" />
        <StatTile label="Uptime" value="99.94%" delta={0.02} spark={series(14, 99, 1, 11)} sub="30 days" />
      </div>
      <div className="adm-grid adm-grid--21" style={{ marginTop: 16 }}>
        <Panel title="Revenue" actions={<Badge s="info">AUD · daily</Badge>}>
          <LineChart area smooth labels={days(n)} yFmt={(v) => `$${Math.round(v)}`} series={[{ name: "Revenue", data: rev }, ...(compare ? [{ name: "Previous", data: prev, color: "var(--jp-text-muted)" }] : [])]} annotations={[{ i: Math.floor(n * 0.62), label: "v4.12 deploy" }]} band={{ lo, hi, name: "forecast" }} />
        </Panel>
        <Panel title="Orders by status"><div className="adm-row" style={{ justifyContent: "center" }}><Donut parts={byStatus.map((p, i) => ({ ...p, color: ST[i] }))} center={<><b>{orders.length}</b><span>orders</span></>} /></div>
          <ul className="adm-legend" style={{ justifyContent: "center" }}>{byStatus.map((p, i) => <li key={p.label}><i style={{ background: ST[i], width: 10, height: 10, borderRadius: 2 }} /> {p.label} <b>{p.value}</b></li>)}</ul></Panel>
      </div>
      <div className="adm-grid adm-grid--3" style={{ marginTop: 16 }}>
        <Panel title="Revenue by region"><BarChart horizontal height={200} labels={["Brisbane", "Sydney", "Melbourne", "Perth", "Adelaide"]} series={[{ name: "Revenue", data: byRegion.map(Math.round) }]} yFmt={(v) => `$${Math.round(v / 1000)}k`} /></Panel>
        <Panel title="Traffic by hour"><Heatmap rows={heat.rows} cols={heat.cols} data={heat.data} /></Panel>
        <Panel title="Recent activity" actions={<Link to="/activity">All</Link>} flush>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>{activity.slice(0, 5).map((a, i) => (
            <li key={i} className="adm-row" style={{ padding: "10px 16px", borderTop: i ? "1px solid var(--jp-border)" : 0, flexWrap: "nowrap" }}>
              <Avatar name={a.who} size={26} /><span style={{ flex: 1 }}><b>{a.who}</b> {a.what} <span className="adm-num">{a.target}</span></span><span className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>{a.when}</span></li>))}</ul>
        </Panel>
      </div>
      <Panel title="Service health" className="adm-section" actions={<Link to="/status">Status page</Link>} flush>
        <table className="jp-table"><thead><tr><th>Service</th><th>Region</th><th>Status</th><th className="jp-num">p95</th><th style={{ width: 260 }}>Last 60 days</th><th>Trend</th></tr></thead>
          <tbody>{services.slice(0, 6).map((s) => (<tr key={s.name}><td><Dot s={s.status as Status} /> <span className="adm-num">{s.name}</span></td><td className="jp-muted">{s.region}</td><td><Badge s={s.status}>{s.status === "ok" ? "healthy" : s.status === "warn" ? "degraded" : "down"}</Badge></td><td className="jp-num">{s.latency} ms</td><td><UptimeBars days={s.days} /></td><td><Spark data={s.spark} /></td></tr>))}</tbody></table>
      </Panel>
    </>
  );
}
