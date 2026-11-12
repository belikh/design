import { useMemo, useState } from "react";
import "./views.css";
import { PageHeader, Panel, Badge, Btn, Avatar, Tabs, Alert, Dot, Menu, type Status } from "@belikh/jupiter-ui/kit.tsx";
import { LineChart, BarChart, Donut, Gauge, ProgressBar, Spark, StatTile, Thermometer, C } from "@belikh/jupiter-ui/Charts.tsx";
import { Segmented, Slider, TextInput, Select } from "@belikh/jupiter-ui/inputs.tsx";
import { days, money, num, series } from "../../data/fixtures.ts";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { allowedDowntimeMin, daysUntil, errorBudget, forecast, nines, projectMonthEnd, variance, type CostLine } from "./logic.ts";
import { people } from "./data.ts";

/* ============ A003 KPI scorecard + A005 executive summary ============ */
type Kpi = { id: string; name: string; owner: string; target: number; actual: number; unit: string; higher: boolean; trend: number[] };
const KPIS0: Kpi[] = [
  { id: "k1", name: "Revenue (month)", owner: people[0], target: 160000, actual: 158340, unit: "$", higher: true, trend: series(12, 130, 20, 1, 3) }, { id: "k2", name: "Uptime", owner: people[1], target: 99.9, actual: 99.94, unit: "%", higher: true, trend: series(12, 99, 1, 2) },
  { id: "k3", name: "Median wait (dock)", owner: people[2], target: 25, actual: 31, unit: "min", higher: false, trend: series(12, 28, 8, 3) }, { id: "k4", name: "On-slot arrivals", owner: people[2], target: 80, actual: 72, unit: "%", higher: true, trend: series(12, 70, 8, 4) },
  { id: "k5", name: "Support SLA met", owner: people[3], target: 95, actual: 96.5, unit: "%", higher: true, trend: series(12, 94, 3, 5) }, { id: "k6", name: "Churn", owner: people[0], target: 2, actual: 2.6, unit: "%", higher: false, trend: series(12, 2.4, 0.8, 6) },
  { id: "k7", name: "Deploys / week", owner: people[1], target: 10, actual: 12, unit: "", higher: true, trend: series(12, 10, 3, 7) }, { id: "k8", name: "Cost per order", owner: people[4], target: 4.2, actual: 4.1, unit: "$", higher: false, trend: series(12, 4, 0.6, 8) },
];
const kstatus = (k: Kpi): Status => { const ratio = k.higher ? k.actual / k.target : k.target / k.actual; return ratio >= 1 ? "ok" : ratio >= 0.9 ? "warn" : "danger"; };
const kfmt = (k: Kpi, v: number) => (k.unit === "$" ? (v >= 1000 ? "$" + Math.round(v).toLocaleString("en-AU") : "$" + v) : `${v}${k.unit ? (k.unit === "%" ? "%" : ` ${k.unit}`) : ""}`);
export function Scorecard() {
  const [tab, setTab] = useState("scorecard"); const [kpis, setKpis] = useState(KPIS0); const [filter, setFilter] = useState<"all" | Status>("all"); const [owner, setOwner] = useState("all"); const [edit, setEdit] = useState<string | null>(null);
  const rows = kpis.filter((k) => (filter === "all" || kstatus(k) === filter) && (owner === "all" || k.owner === owner));
  const counts = { ok: kpis.filter((k) => kstatus(k) === "ok").length, warn: kpis.filter((k) => kstatus(k) === "warn").length, danger: kpis.filter((k) => kstatus(k) === "danger").length };
  const worst = [...kpis].sort((a, b) => (a.higher ? a.actual / a.target : a.target / a.actual) - (b.higher ? b.actual / b.target : b.target / b.actual))[0]; const best = kpis.filter((k) => kstatus(k) === "ok")[0];
  return (
    <>
      <PageHeader title="KPI scorecard" crumbs={["Views", "Scorecard"]} desc="Targets, owners and status per metric, plus an executive summary written from the same numbers." actions={<Btn icon="download" onClick={() => window.print()}>Print</Btn>}
        tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: "scorecard", label: "Scorecard", count: kpis.length }, { id: "exec", label: "Executive summary" }]} />} />
      {tab === "scorecard" && <>
        <div className="adm-row" style={{ marginBottom: 12 }}><Segmented label="Status filter" value={filter} onChange={setFilter} options={[{ value: "all", label: `All ${kpis.length}` }, { value: "ok", label: `On target ${counts.ok}` }, { value: "warn", label: `Near ${counts.warn}` }, { value: "danger", label: `Off ${counts.danger}` }]} />
          <div style={{ width: 180 }}><Select value={owner} onChange={setOwner} aria-label="Owner" options={["all", ...new Set(kpis.map((k) => k.owner))]} /></div></div>
        <Panel flush>{rows.length === 0 ? <p className="jp-muted" style={{ padding: 16 }}>No metrics match.</p> : rows.map((k) => { const s = kstatus(k); return (
          <div key={k.id} className="vw-score"><div><b>{k.name}</b><div className="adm-row jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}><Avatar name={k.owner} size={18} />{k.owner}</div></div>
            <b className="adm-num" style={{ fontSize: "var(--jp-fs-md)" }}>{kfmt(k, k.actual)}</b>
            <div>{edit === k.id ? <TextInput value={String(k.target)} onChange={(v) => setKpis((x) => x.map((y) => (y.id === k.id ? { ...y, target: Number(v) || 0 } : y)))} onBlur={() => setEdit(null)} autoFocus aria-label={`Target for ${k.name}`} /> : <button className="adm-link" onClick={() => setEdit(k.id)} aria-label={`Edit target for ${k.name}`}>target {kfmt(k, k.target)}</button>}</div>
            <ProgressBar value={Math.min(100, (k.higher ? k.actual / k.target : k.target / k.actual) * 100)} s={s === "ok" ? "ok" : s === "warn" ? "warn" : "danger"} label={`${k.name} vs target`} /><div className="adm-row" style={{ justifyContent: "flex-end" }}><Badge s={s}>{s === "ok" ? "on target" : s === "warn" ? "near" : "off"}</Badge><Spark data={k.trend} w={56} h={20} /></div></div>); })}</Panel></>}
      {tab === "exec" && (
        <div className="adm-stack" style={{ maxWidth: 900 }}>
          <div className="adm-grid adm-grid--3"><Panel><div className="vw-big">{counts.ok}<small> / {kpis.length}</small></div><p className="jp-muted">metrics on target</p></Panel><Panel><div className="vw-big">{money(158340)}</div><p className="jp-muted">revenue this month <span className="jp-delta--up">1.0% under target</span></p></Panel><Panel><div className="vw-big">99.94<small>%</small></div><p className="jp-muted">uptime, above the 99.9% goal</p></Panel></div>
          <Panel title="Summary"><p className="vw-narr">{counts.danger === 0 ? "All metrics are on or near target." : <><b>{counts.danger} of {kpis.length}</b> metrics are off target.</>} The biggest gap is <b>{worst.name}</b>, at {kfmt(worst, worst.actual)} against a target of {kfmt(worst, worst.target)} (owner: {worst.owner}). {best && <>On the positive side, <b>{best.name}</b> is {kfmt(best, best.actual)}, ahead of its {kfmt(best, best.target)} target.</>} Revenue is within 1% of plan; the main risks this month are dock wait times and churn.</p></Panel>
          <Panel title="Attention needed" flush>{kpis.filter((k) => kstatus(k) !== "ok").map((k) => <div key={k.id} className="vw-score" style={{ gridTemplateColumns: "1fr auto auto" }}><div><Dot s={kstatus(k)} /> <b>{k.name}</b></div><span className="adm-num">{kfmt(k, k.actual)} vs {kfmt(k, k.target)}</span><Badge s={kstatus(k)}>{kstatus(k) === "warn" ? "near" : "off"}</Badge></div>)}</Panel>
        </div>)}
    </>
  );
}

/* ============ A011 SLO and error budget ============ */
const BAD_DAYS = (() => { const b = series(30, 3, 2, 9).map((v) => v * 0.00002); b[12] += 0.0016; b[13] += 0.0008; b[24] += 0.0004; return b; })();
export function SloPage() {
  const [target, setTarget] = useState("99.9"); const [win, setWin] = useState("30"); const slo = Number(target) / 100; const W = Number(win);
  const bad = BAD_DAYS.slice(0, Math.min(BAD_DAYS.length, W === 7 ? 7 : W === 30 ? 30 : 30)); const b = errorBudget(slo, W, bad);
  const cumul = bad.reduce<number[]>((a, v, i) => [...a, (a[i - 1] ?? 0) + v], []); const allowed = b.allowedBad; const burn = bad.map((_, i) => (cumul[i] / allowed / ((i + 1) / W)));
  const fast = b.burnRate > 14.4, slow = b.burnRate > 6; const st: Status = b.remainingPct < 10 ? "danger" : b.remainingPct < 40 ? "warn" : "ok";
  return (
    <>
      <PageHeader title="SLO and error budget" crumbs={["Views", "SLO"]} desc="How much unreliability you can still spend this window, and how fast you are spending it."
        actions={<><Segmented label="SLO target" value={target} onChange={setTarget} options={["99", "99.5", "99.9", "99.95"].map((v) => ({ value: v, label: `${v}%` }))} /><Segmented label="Window" value={win} onChange={setWin} options={[{ value: "7", label: "7d" }, { value: "30", label: "30d" }]} /></>} />
      {(fast || slow) && <div style={{ marginBottom: 16 }}><Alert s={fast ? "danger" : "warn"} title={fast ? "Fast burn: page someone" : "Slow burn: ticket"}>Burn rate is {b.burnRate.toFixed(1)}×; {fast ? "at this rate the budget is gone within hours." : `budget exhausted in about ${b.daysToExhaust?.toFixed(1)} days.`}</Alert></div>}
      <div className="adm-grid adm-grid--4">
        <Panel><Gauge value={Math.round(100 - b.remainingPct)} label="Budget consumed" zones={[0.6, 0.9]} size={170} /></Panel>
        <StatTile label="Burn rate" value={`${b.burnRate.toFixed(2)}×`} sub={b.burnRate <= 1 ? "sustainable pace" : "over budget pace"} />
        <StatTile label="Budget" value={`${allowedDowntimeMin(slo, W).toFixed(0)} min`} sub={`allowed per ${W} days`} /><StatTile label="Exhausted in" value={b.daysToExhaust === null ? "never" : b.daysToExhaust === 0 ? "now" : `${b.daysToExhaust.toFixed(1)} d`} sub="at current rate" />
      </div>
      <div className="adm-grid adm-grid--21" style={{ marginTop: 16 }}>
        <Panel title="Budget consumed"><div className="vw-budget" role="img" aria-label={`${(100 - b.remainingPct).toFixed(0)}% of the error budget consumed`}><i className={st === "ok" ? "is-ok" : st === "warn" ? "is-warn" : "is-danger"} style={{ width: `${Math.min(100, 100 - b.remainingPct)}%` }} /></div><p className="jp-muted" style={{ marginTop: 6 }}>{(100 - b.remainingPct).toFixed(0)}% consumed with {W - bad.length >= 0 ? bad.length : W} of {W} days elapsed.</p>
          <LineChart title="Burn rate" height={190} labels={days(bad.length)} series={[{ name: "Burn rate (×)", data: burn.map((v) => Math.round(v * 100) / 100) }, { name: "Slow-burn threshold", data: bad.map(() => 6), color: "var(--jp-warn)" }]} yFmt={(v) => `${v}×`} annotations={[{ i: 12, label: "incident" }]} /></Panel>
        <Panel title="Availability targets" flush><div className="adm-dt__wrap"><table className="jp-table" style={{ fontSize: "var(--jp-fs-xs)" }}><thead><tr><th>Target</th><th>Nines</th><th className="jp-num">Per day</th><th className="jp-num">Per week</th><th className="jp-num">Per 30 d</th></tr></thead><tbody>{[0.99, 0.995, 0.999, 0.9995, 0.9999].map((t) => <tr key={t} style={t === slo ? { background: "color-mix(in oklab, var(--jp-accent) 10%, transparent)" } : undefined}><td><b>{(t * 100).toFixed(2)}%</b></td><td>{nines(t)}</td><td className="jp-num">{allowedDowntimeMin(t, 1).toFixed(1)} m</td><td className="jp-num">{allowedDowntimeMin(t, 7).toFixed(1)} m</td><td className="jp-num">{allowedDowntimeMin(t, 30).toFixed(1)} m</td></tr>)}</tbody></table></div></Panel>
      </div>
    </>
  );
}

/* ============ A012 Capacity planning ============ */
const RES = { disk: { label: "Disk (tank)", unit: "TB", limit: 24, data: series(40, 12.5, 1, 3, 0.18).map((v) => v / 1) }, cpu: { label: "CPU", unit: "%", limit: 85, data: series(40, 45, 5, 4, 0.5) }, mem: { label: "Memory", unit: "GB", limit: 64, data: series(40, 30, 3, 5, 0.35) }, net: { label: "Network egress", unit: "Mbit/s", limit: 900, data: series(40, 340, 40, 6, 3.5) } } as const;
export function Capacity() {
  const [res, setRes] = useState<keyof typeof RES>("disk"); const [growth, setGrowth] = useState(1); const R = RES[res]; const horizon = 30;
  const f = useMemo(() => forecast([...R.data], horizon, growth), [R, growth]); const dleft = daysUntil([...R.data], R.limit, growth);
  const labels = days(40 + horizon); const round = (a: number[]) => a.map((v) => Math.round(v * 10) / 10); const line = round([...R.data, ...f.future]);
  const st: Status = dleft === null ? "ok" : dleft < 14 ? "danger" : dleft < 45 ? "warn" : "ok";
  return (
    <>
      <PageHeader title="Capacity planning" crumbs={["Views", "Capacity"]} desc="Fit a trend to recent usage, project it forward with a confidence band, and see when you hit the limit. Drag the growth what-if."
        actions={<Segmented label="Resource" value={res} onChange={(v) => { setRes(v); setGrowth(1); }} options={Object.entries(RES).map(([k, v]) => ({ value: k as keyof typeof RES, label: v.label.split(" ")[0] }))} />} />
      <div className="adm-grid adm-grid--4">
        <StatTile label="Now" value={`${R.data[R.data.length - 1].toFixed(1)} ${R.unit}`} sub={`of ${R.limit} ${R.unit}`} /><StatTile label="Trend" value={`${f.slope >= 0 ? "+" : ""}${f.slope.toFixed(2)} ${R.unit}/d`} sub="what-if applied" />
        <StatTile label="Hits limit" value={dleft === null ? "never" : dleft === 0 ? "now" : `${Math.ceil(dleft)} days`} sub={dleft ? `around ${new Date(Date.UTC(2026, 10, 12) + dleft * 864e5).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}` : ""} />
        <Panel><div className="adm-row" style={{ justifyContent: "center" }}><Thermometer value={Math.round((R.data[R.data.length - 1] / R.limit) * 100)} min={0} max={100} unit="%" label="of limit" zones={[0.6, 0.85]} /></div></Panel>
      </div>
      {st !== "ok" && <div style={{ marginTop: 16 }}><Alert s={st === "danger" ? "danger" : "warn"} title={`${R.label} runs out in about ${Math.ceil(dleft ?? 0)} days`}>{res === "disk" ? "Order storage or archive old media now." : "Add capacity or reduce load before then."}</Alert></div>}
      <Panel className="adm-section" title="Usage and forecast" actions={<div style={{ width: 280 }}><Slider label="Growth what-if" value={growth} onChange={setGrowth} min={0} max={3} step={0.1} fmt={(v) => `${v.toFixed(1)}× growth`} marks={[0, 1, 2, 3]} /></div>}>
        <LineChart title={`${R.label} forecast`} labels={labels} height={280} yFmt={(v) => `${Math.round(v * 10) / 10}`} series={[{ name: "Usage (actual, then forecast)", data: line }, { name: `Limit (${R.limit})`, data: labels.map(() => R.limit), color: "var(--jp-danger)" }]} band={{ name: "95% band", lo: round([...R.data, ...f.lo]), hi: round([...R.data, ...f.hi]) }} annotations={[{ i: R.data.length - 1, label: "today →  forecast" }]} zoomable={false} />
      </Panel>
    </>
  );
}

/* ============ A013 Cost and spend ============ */
const COST0: CostLine[] = [{ tag: "compute", budget: 2400, actual: 2310 }, { tag: "storage", budget: 900, actual: 1090 }, { tag: "network", budget: 600, actual: 540 }, { tag: "licences", budget: 1500, actual: 1500 }, { tag: "support", budget: 700, actual: 810 }, { tag: "misc", budget: 300, actual: 120 }];
export function CostPage() {
  const { toast } = usePrefs(); const [tag, setTag] = useState("all"); const [lines, setLines] = useState(COST0); const dom = 12, dim = 30;
  const total = lines.reduce((a, l) => a + l.actual, 0), budget = lines.reduce((a, l) => a + l.budget, 0); const proj = projectMonthEnd(total * (dom / dim), dom, dim);
  const shown = tag === "all" ? lines : lines.filter((l) => l.tag === tag);
  return (
    <>
      <PageHeader title="Cost and spend" crumbs={["Views", "Cost"]} desc="Budget against actual by tag, a month-end projection and the biggest overruns." actions={<><Select value={tag} onChange={setTag} aria-label="Tag" options={["all", ...lines.map((l) => l.tag)]} /><Btn icon="download" onClick={() => toast({ kind: "info", title: "Cost report export queued" })}>Export</Btn></>} />
      <div className="adm-grid adm-grid--4"><StatTile label="Spend to date" value={money(total * (dom / dim))} sub={`day ${dom} of ${dim}`} /><StatTile label="Projected month end" value={money(proj)} delta={((proj - budget) / budget) * 100} invert sub="vs budget" /><StatTile label="Budget" value={money(budget)} sub="monthly" /><StatTile label="Over budget" value={String(lines.filter((l) => variance(l).abs > 0).length)} sub="tags" /></div>
      <div className="adm-grid adm-grid--21" style={{ marginTop: 16 }}>
        <Panel title="Budget vs actual by tag"><BarChart title="Budget vs actual" labels={shown.map((l) => l.tag)} series={[{ name: "Budget", data: shown.map((l) => l.budget), color: "var(--jp-border)" }, { name: "Actual", data: shown.map((l) => l.actual) }]} yFmt={(v) => `$${Math.round(v)}`} height={240} /></Panel>
        <Panel title="Daily spend (anomalies flagged)"><LineChart title="Daily spend" height={240} anomalies labels={days(12)} series={[{ name: "Spend", data: series(12, 190, 20, 3).map((v, i) => (i === 7 ? v * 2.1 : v)) }]} yFmt={(v) => `$${Math.round(v)}`} zoomable={false} /></Panel>
      </div>
      <Panel title="Variance" className="adm-section" flush><table className="jp-table"><thead><tr><th>Tag</th><th className="jp-num">Budget</th><th className="jp-num">Actual</th><th className="jp-num">Variance</th><th>Status</th><th style={{ width: 160 }}>Adjust budget</th></tr></thead><tbody>{shown.map((l) => { const v = variance(l); return <tr key={l.tag}><td><b>{l.tag}</b></td><td className="jp-num">{money(l.budget)}</td><td className="jp-num">{money(l.actual)}</td><td className="jp-num" style={{ color: v.abs > 0 ? "var(--jp-danger)" : "var(--jp-ok)" }}>{v.abs > 0 ? "+" : ""}{money(v.abs)} ({v.pct.toFixed(0)}%)</td><td><Badge s={v.status}>{v.status === "ok" ? "under" : v.status === "warn" ? "over" : "well over"}</Badge></td>
        <td><Menu label="Budget" items={[{ label: "+10%", onSelect: () => setLines((x) => x.map((y) => (y.tag === l.tag ? { ...y, budget: Math.round(y.budget * 1.1) } : y))) }, { label: "Match actual", onSelect: () => setLines((x) => x.map((y) => (y.tag === l.tag ? { ...y, budget: y.actual } : y))) }]} /></td></tr>; })}</tbody></table></Panel>
      <p className="jp-muted" style={{ marginTop: 8 }}>{num(Math.round(total))} total this month. Projections are straight-line.</p>
    </>
  );
}

/* ============ A014 Security posture ============ */
type Finding = { id: string; title: string; sev: "critical" | "high" | "medium" | "low"; asset: string; age: number; status: "open" | "ack" | "fixed" };
const F0: Finding[] = [["OpenSSH outdated on pxe-boot", "high", "pxe-boot", 34], ["TLS 1.0 enabled on legacy proxy", "critical", "wg-gateway", 12], ["Default password on camera", "critical", "cam-driveway", 3], ["Missing MFA for 2 admins", "high", "iam", 21], ["Unencrypted backup volume", "medium", "backup-zfs", 60], ["Open port 8080 on kiosk", "medium", "kiosk-1", 9], ["Weak cipher in MQTT broker", "low", "mqtt-broker", 45], ["Stale API key (90d)", "low", "api", 90]].map(([title, sev, asset, age], i) => ({ id: `F-${100 + i}`, title: title as string, sev: sev as Finding["sev"], asset: asset as string, age: age as number, status: "open" as const }));
export function Security() {
  const { toast } = usePrefs(); const [fs, setFs] = useState(F0); const [sev, setSev] = useState<"all" | Finding["sev"]>("all");
  const open = fs.filter((f) => f.status !== "fixed"); const by = (s: Finding["sev"]) => open.filter((f) => f.sev === s).length; const score = Math.max(0, 100 - by("critical") * 18 - by("high") * 9 - by("medium") * 3 - by("low"));
  const set = (id: string, status: Finding["status"], msg: string) => { const old = fs; setFs((x) => x.map((f) => (f.id === id ? { ...f, status } : f))); toast({ kind: status === "fixed" ? "ok" : "info", title: msg, undo: () => setFs(old) }); };
  const shown = fs.filter((f) => sev === "all" || f.sev === sev);
  const sevS = { critical: "danger", high: "danger", medium: "warn", low: "info" } as const;
  return (
    <>
      <PageHeader title="Security posture" crumbs={["Views", "Security"]} desc="Findings by severity, coverage of key controls, and how long things have been open." />
      <div className="adm-grid adm-grid--4"><Panel><Gauge value={100 - score} label="Risk (lower is better)" zones={[0.3, 0.6]} size={170} /></Panel>
        <Panel title="Open findings"><div className="adm-row" style={{ justifyContent: "center" }}><Donut size={140} thickness={20} parts={(["critical", "high", "medium", "low"] as const).map((s, i) => ({ label: s, value: Math.max(0.0001, by(s)), color: ["var(--jp-danger)", "var(--adm-c4)", "var(--jp-warn)", "var(--jp-info)"][i] }))} center={<><b>{open.length}</b><span>open</span></>} /></div></Panel>
        <Panel title="Coverage"><div className="adm-stack">{[["Patched", 91], ["MFA enabled", 86], ["Disks encrypted", 74], ["Backups verified", 97]].map(([l, v]) => <div key={l as string}><div className="adm-row" style={{ justifyContent: "space-between" }}><span>{l}</span><span className="adm-num">{v}%</span></div><ProgressBar value={v as number} s={(v as number) < 80 ? "warn" : "ok"} label={l as string} /></div>)}</div></Panel>
        <Panel title="Age of open findings"><BarChart title="Finding age" height={170} labels={["<7d", "7–30d", "30–60d", ">60d"]} series={[{ name: "Findings", data: [open.filter((f) => f.age < 7).length, open.filter((f) => f.age >= 7 && f.age < 30).length, open.filter((f) => f.age >= 30 && f.age < 60).length, open.filter((f) => f.age >= 60).length], color: "var(--adm-c2)" }]} tools={false} /></Panel></div>
      <Panel title="Findings" className="adm-section" actions={<Segmented label="Severity" value={sev} onChange={setSev} options={[{ value: "all", label: "All" }, ...(["critical", "high", "medium", "low"] as const).map((s) => ({ value: s, label: s }))]} />} flush>
        <table className="jp-table"><thead><tr><th>Finding</th><th>Severity</th><th>Asset</th><th className="jp-num">Age</th><th>Status</th><th /></tr></thead><tbody>{shown.map((f) => <tr key={f.id} style={f.status === "fixed" ? { opacity: 0.5 } : undefined}><td><b>{f.title}</b><div className="jp-muted adm-num" style={{ fontSize: "var(--jp-fs-xs)" }}>{f.id}</div></td><td><Badge s={sevS[f.sev]}>{f.sev}</Badge></td><td className="adm-num">{f.asset}</td><td className="jp-num">{f.age} d</td><td>{f.status}</td>
          <td style={{ textAlign: "end" }}><Menu label="Actions" items={[{ label: "Acknowledge", onSelect: () => set(f.id, "ack", `Acknowledged ${f.id}`) }, { label: "Mark fixed", onSelect: () => set(f.id, "fixed", `${f.id} marked fixed`) }, { label: "Reopen", onSelect: () => set(f.id, "open", `Reopened ${f.id}`) }]} /></td></tr>)}</tbody></table></Panel>
      <p className="jp-muted" style={{ marginTop: 8 }}><C_ /></p>
    </>
  );
}
const C_ = () => <>Scores are illustrative: each critical subtracts 18, high 9, medium 3, low 1 from 100. <span style={{ color: C(0) }} /></>;
