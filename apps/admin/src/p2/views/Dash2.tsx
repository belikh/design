import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./views.css";
import { PageHeader, Panel, Badge, Btn, Avatar, Tabs, Alert, Dot, Menu, Modal, EmptyState, type Status } from "@belikh/jupiter-ui/kit.tsx";
import { LineChart, BarChart, Donut, Gauge, ProgressBar, Spark, StatTile, UptimeBars, Battery, Heatmap } from "@belikh/jupiter-ui/Charts.tsx";
import { Segmented, TextInput, Select, Checkbox, Switch, Field } from "@belikh/jupiter-ui/inputs.tsx";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";
import { days, money, rng, series, services, heat } from "../../data/fixtures.ts";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { useStored } from "./shared.tsx";
import { favStore, useFavs } from "./favs.ts";
import { people, products, tickets as TK, taskTree } from "./data.ts";
import { rollup } from "./logic.ts";

/* ============ A015 Live-stream dashboard ============ */
type Ev = { id: number; t: string; level: "info" | "warn" | "error"; svc: string; msg: string };
const MSG = ["request ok", "cache hit", "retrying upstream", "slow query (420 ms)", "client reconnected", "deploy step 2/3", "queue depth high", "health check ok", "timeout talking to db", "token refreshed"];
export function LiveStream() {
  const [run, setRun] = useState(true); const [win, setWin] = useState("60"); const [lvl, setLvl] = useState<"all" | "warn" | "error">("all");
  const g = useRef(rng(77)); const n = useRef(0);
  const [pts, setPts] = useState<number[]>(() => Array.from({ length: 300 }, (_, i) => 1800 + Math.sin(i / 9) * 260 + (i % 17) * 6));
  const [events, setEvents] = useState<Ev[]>([]);
  useEffect(() => {
    if (!run) return;
    const t = setInterval(() => {
      n.current++; const x = n.current; const r = g.current;
      setPts((p) => [...p.slice(-299), Math.round(1800 + Math.sin((p.length + x) / 9) * 260 + (r() - 0.5) * 220 + (x % 40 === 0 ? 900 : 0))]);
      if (r() > 0.35) { const lv: Ev["level"] = r() > 0.9 ? "error" : r() > 0.72 ? "warn" : "info"; const ts = new Date(Date.UTC(2026, 10, 12, 16, 52, x % 60)).toISOString().slice(11, 19); setEvents((e) => [{ id: x, t: ts, level: lv, svc: services[Math.floor(r() * services.length)].name.slice(0, 8), msg: MSG[Math.floor(r() * MSG.length)] }, ...e].slice(0, 60)); }
    }, 700);
    return () => clearInterval(t);
  }, [run]);
  const W = Number(win); const view = pts.slice(-W); const rate = Math.round(view[view.length - 1]); const avg = Math.round(view.reduce((a, b) => a + b, 0) / view.length);
  const shown = events.filter((e) => lvl === "all" || e.level === lvl || (lvl === "warn" && e.level === "error"));
  return (
    <>
      <PageHeader title="Live stream" crumbs={["Views", "Live"]} desc="A rolling window of requests per second and an event ticker. Pause to inspect." status={<Badge s={run ? "ok" : "warn"}>{run ? "live" : "paused"}</Badge>}
        actions={<><Segmented label="Window" value={win} onChange={setWin} options={[{ value: "30", label: "30 s" }, { value: "60", label: "1 min" }, { value: "180", label: "3 min" }]} /><Btn icon={run ? "pause" : "play"} onClick={() => setRun(!run)}>{run ? "Pause" : "Resume"}</Btn></>} />
      <div className="adm-grid adm-grid--4"><StatTile label="Requests / s" value={rate.toLocaleString()} sub="now" /><StatTile label="Average" value={avg.toLocaleString()} sub={`last ${W} s`} /><StatTile label="Errors in view" value={String(events.filter((e) => e.level === "error").length)} sub="events" invert /><Panel><Gauge value={Math.min(99, Math.round((rate / 3000) * 100))} label="Load" size={130} /></Panel></div>
      <div className="adm-grid adm-grid--21" style={{ marginTop: 16 }}>
        <Panel title={`Requests per second (last ${W}s)`}><LineChart title="Live requests" height={240} area smooth zoomable={false} tools={false} labels={view.map((_, i) => `${i - view.length + 1}s`)} series={[{ name: "req/s", data: view }]} /></Panel>
        <Panel title="Event ticker" actions={<Segmented label="Level" value={lvl} onChange={setLvl} options={[{ value: "all", label: "All" }, { value: "warn", label: "Warn+" }, { value: "error", label: "Errors" }]} />} flush>
          <div className="vw-ticker" role="log" aria-live="off">{shown.slice(0, 12).map((e) => <div key={e.id}><span className="jp-log-dim">{e.t}</span><span className={e.level === "error" ? "jp-log-danger" : e.level === "warn" ? "jp-log-warn" : "jp-log-info"}>{e.level.toUpperCase()}</span><span>{e.svc} {e.msg}</span></div>)}{!shown.length && <p className="jp-muted" style={{ padding: 12 }}>Waiting for events…</p>}</div></Panel>
      </div>
    </>
  );
}

/* ============ A016 Comparison dashboard + A037 comparison view ============ */
const PERIODS = { "wow": ["This week", "Last week"], "mom": ["This month", "Last month"], "yoy": ["This year", "Last year"] } as const;
const PLAN_ROWS: [string, string, string, string][] = [["Price per month", "$49", "$149", "money"], ["Projects", "Unlimited", "Unlimited", ""], ["Seats", "8", "50", "num"], ["Backups", "Daily", "Hourly", ""], ["SSO", "No", "Yes", ""], ["Audit log", "No", "Yes", ""], ["Support", "Email", "Priority", ""], ["Uptime SLA", "99.9%", "99.95%", ""], ["Data region", "AU", "AU", ""]];
export function Compare() {
  const [tab, setTab] = useState("periods"); const [per, setPer] = useState<keyof typeof PERIODS>("mom"); const [a, b] = PERIODS[per]; const [svcA, setSvcA] = useState("jupiter-api"); const [svcB, setSvcB] = useState("media-archive"); const [diffOnly, setDiffOnly] = useState(false); const [mode, setMode] = useState<"periods" | "entities">("periods");
  const sA = useMemo(() => series(30, 420, 70, 1, 1.5), []), sB = useMemo(() => series(30, 370, 60, 2, 0.8), []); const tot = (x: number[]) => x.reduce((p, c) => p + c, 0);
  const sa = services.find((s) => s.name === svcA)!, sb = services.find((s) => s.name === svcB)!;
  const rows = PLAN_ROWS.filter((r) => !diffOnly || r[1] !== r[2]);
  return (
    <>
      <PageHeader title="Compare" crumbs={["Views", "Compare"]} desc="Two periods or two entities side by side, and a feature-level comparison with differences highlighted."
        tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: "periods", label: "Periods and entities" }, { id: "items", label: "Compare items" }]} />} />
      {tab === "periods" && <>
        <div className="adm-row" style={{ marginBottom: 12 }}><Segmented label="Mode" value={mode} onChange={setMode} options={[{ value: "periods", label: "Two periods" }, { value: "entities", label: "Two services" }]} />
          {mode === "periods" ? <Segmented label="Period" value={per} onChange={setPer} options={[{ value: "wow", label: "Week" }, { value: "mom", label: "Month" }, { value: "yoy", label: "Year" }]} /> : <><div style={{ width: 170 }}><Select value={svcA} onChange={setSvcA} aria-label="Service A" options={services.map((s) => s.name)} /></div><span className="jp-muted">vs</span><div style={{ width: 170 }}><Select value={svcB} onChange={setSvcB} aria-label="Service B" options={services.map((s) => s.name)} /></div></>}</div>
        {mode === "periods" ? <>
          <div className="adm-grid adm-grid--3"><StatTile label={`Revenue · ${a}`} value={money(tot(sA) * 10)} delta={((tot(sA) - tot(sB)) / tot(sB)) * 100} sub={`vs ${b}`} /><StatTile label={`Orders · ${a}`} value={Math.round(tot(sA) / 3).toLocaleString("en-AU")} delta={5.2} sub={`vs ${b}`} /><StatTile label={`Avg order · ${a}`} value="$142" delta={-1.8} sub={`vs ${b}`} /></div>
          <Panel className="adm-section" title={`${a} vs ${b} (overlaid)`}><LineChart title="Period comparison" height={260} labels={days(30)} series={[{ name: a, data: sA }, { name: b, data: sB, color: "var(--adm-c2)" }]} /></Panel></>
        : <div className="adm-grid adm-grid--2">{[sa, sb].map((s, i) => <Panel key={s.name} title={s.name} actions={<Badge s={s.status}>{s.status}</Badge>}><div className="adm-stack"><div className="adm-grid adm-grid--3"><StatTile label="p95" value={`${s.latency} ms`} /><StatTile label="Uptime" value={`${s.uptime.toFixed(2)}%`} /><StatTile label="Region" value={s.region.slice(0, 6)} /></div><UptimeBars days={s.days} /><Spark data={s.spark} w={300} h={50} color={i ? "var(--adm-c2)" : "var(--jp-accent)"} kind="area" /></div></Panel>)}</div>}
      </>}
      {tab === "items" && <Panel title="Pro vs Team" actions={<Switch checked={diffOnly} onChange={setDiffOnly} label="Differences only" />} flush>
        <table className="jp-table"><thead><tr><th>Feature</th><th>Pro</th><th>Team</th></tr></thead><tbody>{rows.map(([f, x, y]) => { const d = x !== y; return <tr key={f}><td>{f}</td><td>{d ? <span className="vw-diffcell">{x}</span> : x}</td><td>{d ? <span className="vw-diffcell">{y}</span> : y}</td></tr>; })}</tbody></table>
        {rows.length === 0 && <p className="jp-muted" style={{ padding: 16 }}>No differences.</p>}</Panel>}
    </>
  );
}

/* ============ A017 Personal "my work" home ============ */
export function MyWork() {
  const { toast } = usePrefs(); const f = useFavs(); const [tasks, setTasks] = useStored("vw-mywork", [{ id: "w1", t: "Review GTK widgets CSS", due: "Today", done: false }, { id: "w2", t: "Approve PXE access request", due: "Today", done: false }, { id: "w3", t: "Write ESPHome OTA doc", due: "Fri", done: false }, { id: "w4", t: "Rotate WireGuard keys", due: "Sat", done: true }]);
  const [mentions, setMentions] = useStored("vw-mentions", [{ id: "m1", who: people[1], text: "Can you check the firewall zones?", at: "21m", read: false }, { id: "m2", who: people[2], text: "Looks good, ship it.", at: "2h", read: false }, { id: "m3", who: people[4], text: "Added you to the incident channel.", at: "1d", read: true }]);
  const open = tasks.filter((t) => !t.done); const unread = mentions.filter((m) => !m.read).length;
  return (
    <>
      <PageHeader title="My work" crumbs={["Views", "My work"]} desc="What is assigned to you, who mentioned you, and where you were last." />
      <div className="adm-grid adm-grid--3"><StatTile label="Open tasks" value={String(open.length)} sub={`${tasks.filter((t) => t.due === "Today" && !t.done).length} due today`} /><StatTile label="Unread mentions" value={String(unread)} /><StatTile label="Pinned" value={String(f.pinned.length)} /></div>
      <div className="adm-grid adm-grid--3" style={{ marginTop: 16 }}>
        <Panel title="Assigned to me" flush>{tasks.map((t) => <div key={t.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 16px", borderTop: "1px solid var(--jp-border)" }}><Checkbox checked={t.done} onChange={(v) => { setTasks((x) => x.map((y) => (y.id === t.id ? { ...y, done: v } : y))); if (v) toast({ kind: "ok", title: "Task done", undo: () => setTasks((x) => x.map((y) => (y.id === t.id ? { ...y, done: false } : y))) }); }} label={<span style={{ textDecoration: t.done ? "line-through" : undefined }}>{t.t}</span>} /><span className="adm-spacer" /><Badge s={t.due === "Today" && !t.done ? "danger" : undefined}>{t.due}</Badge></div>)}</Panel>
        <Panel title={`Mentions${unread ? ` (${unread})` : ""}`} actions={<Btn sm variant="ghost" disabled={!unread} onClick={() => setMentions((m) => m.map((x) => ({ ...x, read: true })))}>Mark all read</Btn>} flush><ul className="adm-list">{mentions.map((m) => <li key={m.id} style={{ alignItems: "flex-start", opacity: m.read ? 0.7 : 1 }}><Avatar name={m.who} size={28} /><div className="adm-list__main"><span><b>{m.who}</b> <span className="jp-muted">{m.at}</span></span><span>{m.text}</span></div>{!m.read && <Dot s="info" />}</li>)}</ul></Panel>
        <Panel title="Recents" actions={<Btn sm variant="ghost" onClick={() => favStore.clearRecents()}>Clear</Btn>} flush>{f.recents.length ? <ul className="adm-list">{f.recents.slice(0, 6).map((r) => <li key={r.path}><Icon name={r.icon} size={16} /><a href={r.path} style={{ flex: 1 }}>{r.title}</a></li>)}</ul> : <EmptyState spot="empty" title="Nothing recent">Pages you open appear here.</EmptyState>}</Panel>
      </div>
    </>
  );
}

/* ============ A018 Dashboard gallery and template picker ============ */
type Tpl = { id: string; name: string; desc: string; tags: string[]; layout: number[][] };
const TPLS: Tpl[] = [{ id: "ops", name: "Operations", desc: "Service health, throughput and alerts.", tags: ["ops", "live"], layout: [[1, 1, 1, 1], [2, 2, 1, 1], [1, 1, 1, 1]] }, { id: "exec", name: "Executive", desc: "Big numbers and a narrative.", tags: ["exec"], layout: [[1, 1, 1], [2, 2, 2]] }, { id: "sales", name: "Sales pipeline", desc: "Funnel, forecast and top accounts.", tags: ["sales"], layout: [[1, 1], [2, 1], [1, 1]] }, { id: "sec", name: "Security", desc: "Findings, coverage and ageing.", tags: ["security"], layout: [[1, 1, 1], [1, 2, 2]] }, { id: "wh", name: "Warehouse", desc: "Docks, queue and on-slot rate.", tags: ["ops", "warehouse"], layout: [[1, 1, 1, 1], [2, 2, 2, 2]] }, { id: "home", name: "Home", desc: "Energy, climate and presence.", tags: ["home", "live"], layout: [[2, 1, 1], [1, 1, 1]] }];
export function Gallery() {
  const { toast } = usePrefs(); const [q, setQ] = useState(""); const [tag, setTag] = useState("all"); const [pick, setPick] = useState<string | null>(null); const [name, setName] = useState(""); const [mine, setMine] = useStored<{ id: string; name: string; tpl: string }[]>("vw-dash-mine", []);
  const shown = TPLS.filter((t) => (tag === "all" || t.tags.includes(tag)) && (t.name + t.desc).toLowerCase().includes(q.toLowerCase()));
  const sel = TPLS.find((t) => t.id === pick);
  const create = () => { if (!sel || !name.trim()) return; setMine((m) => [...m, { id: `d${Date.now()}`, name: name.trim(), tpl: sel.id }]); toast({ kind: "ok", title: `Created “${name.trim()}”` }); setPick(null); setName(""); };
  return (
    <>
      <PageHeader title="Dashboard gallery" crumbs={["Views", "Gallery"]} desc="Start from a template, name it, and it lands in My dashboards." />
      <div className="adm-row" style={{ marginBottom: 16 }}><div style={{ width: 260 }}><TextInput value={q} onChange={setQ} placeholder="Search templates…" aria-label="Search templates" prefix={<Icon name="search" size={14} />} /></div><Segmented label="Tag" value={tag} onChange={setTag} options={["all", "ops", "live", "exec", "security", "home"].map((v) => ({ value: v, label: v }))} /></div>
      <div className="vw-gallery">{shown.map((t) => (
        <button key={t.id} className="vw-tpl" aria-pressed={pick === t.id} onClick={() => setPick(t.id)} style={{ textAlign: "start", font: "inherit", color: "inherit", padding: 0, cursor: "pointer" }}>
          <div className="vw-tpl__thumb" style={{ gridTemplateRows: `repeat(${t.layout.length}, 1fr)` }}>{t.layout.map((row, i) => <div key={i} style={{ display: "grid", gridTemplateColumns: row.map((s) => `${s}fr`).join(" "), gap: 4 }}>{row.map((_, j) => <i key={j} className={i === 0 && j === 0 ? "hi" : ""} />)}</div>)}</div>
          <div className="vw-tpl__body"><b>{t.name}</b><span className="jp-muted">{t.desc}</span><div className="adm-row">{t.tags.map((x) => <Badge key={x}>{x}</Badge>)}</div></div></button>))}</div>
      {!shown.length && <EmptyState spot="no-results" title="No templates match">Try another search.</EmptyState>}
      <Panel className="adm-section" title={`My dashboards (${mine.length})`} flush>{mine.length ? <ul className="adm-list">{mine.map((d) => <li key={d.id}><Icon name="chart" size={16} /><b style={{ flex: 1 }}>{d.name}</b><Badge>{TPLS.find((t) => t.id === d.tpl)?.name}</Badge><Btn sm variant="ghost" onClick={() => { const old = mine; setMine(mine.filter((x) => x.id !== d.id)); toast({ kind: "warn", title: `Removed ${d.name}`, undo: () => setMine(old) }); }}>Remove</Btn></li>)}</ul> : <EmptyState spot="empty" title="No dashboards yet">Pick a template above.</EmptyState>}</Panel>
      <Modal open={!!sel} onClose={() => setPick(null)} title={`Use “${sel?.name}”`} size="sm" footer={<><Btn onClick={() => setPick(null)}>Cancel</Btn><Btn variant="primary" disabled={!name.trim()} onClick={create}>Create dashboard</Btn></>}><Field label="Dashboard name" required>{(id) => <TextInput id={id} value={name} onChange={setName} autoFocus />}</Field></Modal>
    </>
  );
}

/* ============ A010 Print-ready paged report ============ */
export function Report() {
  const [size, setSize] = useState<"a4" | "letter">("a4"); const pages = 3; const rev = series(12, 120, 25, 3, 4);
  const Page = ({ n, children, title }: { n: number; children: React.ReactNode; title: string }) => <section className="vw-page" aria-label={`Page ${n}`}><header><span>Jupiter · Monthly report</span><span>{title}</span></header><main>{children}</main><footer><span>Confidential · generated 12 Nov 2026</span><span>Page {n} of {pages}</span></footer></section>;
  return (
    <>
      <div className="vw-noprint"><PageHeader title="Report" crumbs={["Views", "Report"]} desc="A paged document with running headers and footers. Use Print (or Save as PDF); controls and the app shell are hidden in print." actions={<><Segmented label="Paper" value={size} onChange={setSize} options={[{ value: "a4", label: "A4" }, { value: "letter", label: "Letter" }]} /><Btn variant="primary" icon="download" onClick={() => window.print()}>Print / PDF</Btn></>} /></div>
      <style>{`@media print { @page { size: ${size === "a4" ? "A4" : "letter"}; margin: 16mm; } }`}</style>
      <div className="vw-report">
        <Page n={1} title="Summary"><h1>Monthly operations report</h1><p className="jp-muted">November 2026</p><div className="adm-grid adm-grid--3"><StatTile label="Revenue" value="$158k" delta={4.1} /><StatTile label="Uptime" value="99.94%" delta={0.02} /><StatTile label="On-slot" value="72%" delta={-3} /></div><p className="vw-narr">Revenue is slightly under plan while reliability beat its target. Dock wait times are the main risk heading into December.</p><h2>Contents</h2><ol><li>Summary</li><li>Revenue and reliability</li><li>Warehouse performance</li></ol></Page>
        <Page n={2} title="Revenue and reliability"><h2>Revenue</h2><LineChart title="Revenue" height={200} labels={days(12)} series={[{ name: "Revenue", data: rev }]} tools={false} zoomable={false} /><h2>Reliability</h2><table className="jp-table"><thead><tr><th>Service</th><th className="jp-num">Uptime</th><th className="jp-num">p95</th></tr></thead><tbody>{services.slice(0, 5).map((s) => <tr key={s.name}><td>{s.name}</td><td className="jp-num">{s.uptime.toFixed(2)}%</td><td className="jp-num">{s.latency} ms</td></tr>)}</tbody></table></Page>
        <Page n={3} title="Warehouse performance"><h2>Dock utilisation by hour</h2><Heatmap rows={heat.rows.slice(0, 5)} cols={heat.cols} data={heat.data.slice(0, 5)} /><h2>Notes</h2><p>Chilled loads queue longest because only two docks are rated for them; consider re-rating Dock 6.</p></Page>
      </div>
    </>
  );
}

/* ============ A006 Per-entity dashboard ============ */
type Kind = "service" | "device" | "customer";
export function EntityDash() {
  const [sp, setSp] = useSearchParams(); const kind = (sp.get("kind") as Kind) || "service"; const id = sp.get("id") ?? "";
  const list = kind === "service" ? services.map((s) => s.name) : kind === "device" ? ["esp-livingroom", "esp-garage", "cam-driveway", "aquila-02"] : people.slice(0, 6);
  const cur = list.includes(id) ? id : list[0]; const set = (k: Kind, i?: string) => setSp({ kind: k, id: i ?? "" }, { replace: true });
  useEffect(() => { favStore.visit({ path: `/views/entity?kind=${kind}&id=${cur}`, title: `${kind}: ${cur}`, icon: kind === "customer" ? "user" : kind === "device" ? "cpu" : "server" }); }, [kind, cur]);
  const seed = [...cur].reduce((a, c) => a + c.charCodeAt(0), 0); const svc = services.find((s) => s.name === cur);
  return (
    <>
      <PageHeader title={cur} crumbs={["Views", "Entity", kind]} desc="One page template for a single service, device or customer: same layout, different panels." status={<Badge s="ok">{kind}</Badge>}
        actions={<><Segmented label="Entity type" value={kind} onChange={(k) => set(k)} options={[{ value: "service", label: "Service" }, { value: "device", label: "Device" }, { value: "customer", label: "Customer" }]} /><div style={{ width: 190 }}><Select value={cur} onChange={(v) => set(kind, v)} aria-label="Entity" options={list} /></div></>} />
      {kind === "service" && svc && <><div className="adm-grid adm-grid--4"><StatTile label="p95 latency" value={`${svc.latency} ms`} spark={svc.spark} /><StatTile label="Uptime" value={`${svc.uptime.toFixed(2)}%`} /><StatTile label="Deploys (30d)" value={String(3 + (seed % 9))} /><Panel><Gauge value={30 + (seed % 60)} label="CPU" size={130} /></Panel></div><Panel className="adm-section" title="Uptime, 60 days"><UptimeBars days={svc.days} /></Panel></>}
      {kind === "device" && <div className="adm-grid adm-grid--3"><Panel title="Battery and signal"><div className="adm-stack"><Battery value={20 + (seed % 70)} charging={seed % 2 === 0} /><ProgressBar value={40 + (seed % 55)} label="Wi-Fi signal" /></div></Panel><Panel title="Temperature (24h)"><LineChart title="Temperature" height={160} labels={days(24).map((_, i) => `${i}h`)} series={[{ name: "°C", data: series(24, 22, 3, seed) }]} tools={false} zoomable={false} /></Panel><Panel title="Firmware"><dl className="adm-dl"><dt>Version</dt><dd>2026.{seed % 12}.1</dd><dt>Uptime</dt><dd>{seed % 40} d</dd><dt>Last seen</dt><dd>{seed % 9 + 1} min ago</dd></dl></Panel></div>}
      {kind === "customer" && <div className="adm-grid adm-grid--3"><StatTile label="Lifetime value" value={money(2000 + seed * 13)} /><StatTile label="Open tickets" value={String(seed % 4)} /><StatTile label="Last order" value={`${seed % 20 + 1}d ago`} /><Panel title="Spend (12 months)"><BarChart title="Spend" height={170} labels={days(12).map((_, i) => `M${i + 1}`)} series={[{ name: "Spend", data: series(12, 200, 90, seed) }]} tools={false} /></Panel><Panel title="Recent tickets" flush><ul className="adm-list">{TK.slice(0, 3).map((t) => <li key={t.id}><b className="adm-num">{t.id}</b><span style={{ flex: 1 }}>{t.title}</span><Badge s={t.status === "resolved" ? "ok" : "warn"}>{t.status}</Badge></li>)}</ul></Panel></div>}
    </>
  );
}
void taskTree; void rollup; void products; void Alert; void Donut; void Menu; void useMemo;
