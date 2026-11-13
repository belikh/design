import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./tables.css";
import { PageHeader, Panel, Badge, Btn, Drawer, Avatar } from "@belikh/jupiter-ui/kit.tsx";
import { Segmented, TextInput } from "@belikh/jupiter-ui/inputs.tsx";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";
import { DataTable, type Col } from "@belikh/jupiter-ui/DataTable.tsx";
import { SHIPMENTS, money, type Ship } from "./data.ts";

type View = "table" | "cards" | "calendar" | "map" | "timeline";
const SB: Record<string, "ok" | "warn" | "danger" | "info"> = { Delivered: "ok", "In transit": "info", Delayed: "warn", Held: "danger" };
const STATUSES = ["Delivered", "In transit", "Delayed", "Held"];
const day = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 86400000;
const OUTLINE: [number, number][] = [[113.5, -22], [114, -26], [115, -34], [118, -35], [123, -34], [129, -31.5], [134, -32.5], [138, -35], [140, -38], [144, -38.5], [147, -38], [150, -37], [153, -31], [153.5, -28], [153, -25], [149, -21], [146, -19], [145.5, -15], [143.5, -11], [142, -11], [141, -17], [139.5, -17.5], [136.5, -15], [136, -12], [132, -11.5], [130, -12.5], [126.5, -14], [123, -17], [121, -19], [116, -21]];
const TAS: [number, number][] = [[144.7, -40.7], [148.3, -40.9], [148, -43.3], [146, -43.6]];
const W = 640, H = 470; const px = (lng: number) => ((lng - 112) / 43) * W; const py = (lat: number) => ((-9 - lat) / 35) * (H - 10) + 5; const poly = (pts: [number, number][]) => pts.map(([a, b]) => `${px(a).toFixed(1)},${py(b).toFixed(1)}`).join(" ");

/** One dataset, five views (B036): table, cards, calendar, map, timeline. Search, status filter and the selected record are shared. */
export function Views() {
  const [sp, setSp] = useSearchParams(); const view = (sp.get("view") as View) || "table"; const setView = (v: View) => setSp((p) => { const n = new URLSearchParams(p); v === "table" ? n.delete("view") : n.set("view", v); return n; }, { replace: true });
  const [q, setQ] = useState(""); const [st, setSt] = useState<string | null>(null); const [sel, setSel] = useState<Ship | null>(null); const [month, setMonth] = useState({ y: 2026, m: 10 });
  const rows = useMemo(() => SHIPMENTS.filter((s) => (!st || s.status === st) && (!q || `${s.ref} ${s.customer} ${s.city}`.toLowerCase().includes(q.toLowerCase()))), [q, st]);
  const cols: Col<Ship>[] = [{ key: "ref", header: "Ref", width: 100 }, { key: "customer", header: "Customer", width: 170 }, { key: "city", header: "Destination", width: 110 }, { key: "status", header: "Status", width: 110, render: (r) => <Badge s={SB[r.status]}>{r.status}</Badge> }, { key: "due", header: "Due", width: 110 }, { key: "cost", header: "Cost", width: 100, align: "right", fmt: money, agg: "sum" }];
  const open = (s: Ship) => setSel(s);
  // calendar
  const first = new Date(month.y, month.m, 1); const startDay = new Date(first); startDay.setDate(1 - ((first.getDay() + 6) % 7)); const cells = Array.from({ length: 42 }, (_, i) => { const d = new Date(startDay); d.setDate(startDay.getDate() + i); return d; });
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const byDay = useMemo(() => { const m = new Map<string, Ship[]>(); rows.forEach((s) => (m.get(s.due) ?? m.set(s.due, []).get(s.due)!).push(s)); return m; }, [rows]);
  // map
  const cities = useMemo(() => { const m = new Map<string, Ship[]>(); rows.forEach((s) => (m.get(s.city) ?? m.set(s.city, []).get(s.city)!).push(s)); return [...m.entries()]; }, [rows]);
  const [cityOpen, setCityOpen] = useState<string | null>(null);
  // timeline
  const tl = useMemo(() => [...rows].sort((a, b) => a.start.localeCompare(b.start)).slice(0, 70), [rows]); const d0 = Math.min(...tl.map((s) => day(s.start)), day("2026-11-01")), d1 = Math.max(...tl.map((s) => day(s.end)), day("2026-11-30")); const pct = (d: number) => `${((d - d0) / (d1 - d0 || 1)) * 100}%`; const today = day("2026-11-12");
  return (
    <>
      <PageHeader title="View switcher" crumbs={["Grids", "Views"]} desc="One dataset, five views. Search, the status filter and the selected record carry across; the view is kept in the URL." status={<Badge>{rows.length} of {SHIPMENTS.length}</Badge>}
        actions={<Segmented label="View" value={view} onChange={setView} options={[{ value: "table", label: "Table" }, { value: "cards", label: "Cards" }, { value: "calendar", label: "Calendar" }, { value: "map", label: "Map" }, { value: "timeline", label: "Timeline" }]} />} />
      <div className="adm-row" style={{ marginBottom: 12 }}>
        <div style={{ width: 280 }}><TextInput value={q} onChange={setQ} placeholder="Search ref, customer, city…" aria-label="Search all views" prefix={<Icon name="search" size={14} />} /></div>
        <div className="adm-row" role="group" aria-label="Status">{STATUSES.map((s) => <button key={s} className={`adm-pill ${st === s ? "is-on" : ""}`} aria-pressed={st === s} onClick={() => setSt(st === s ? null : s)}>{s} <small>{SHIPMENTS.filter((x) => x.status === s).length}</small></button>)}</div>
      </div>
      {view === "table" && <Panel flush><DataTable<Ship> rows={rows} cols={cols} pageSize={12} selectable={false} headerMenu exportName="shipments" rowActions={(r) => [{ label: "Open", onSelect: () => open(r) }]} /></Panel>}
      {view === "cards" && <div className="tbl-cards">{rows.slice(0, 48).map((s) => (
        <button key={s.id} className="tbl-card" onClick={() => open(s)}><div className="adm-row" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}><b className="adm-num">{s.ref}</b><Badge s={SB[s.status]}>{s.status}</Badge></div><span>{s.customer}</span><span className="jp-muted">{s.city} · due {s.due}</span><div className="adm-row" style={{ justifyContent: "space-between" }}><span className="adm-num">{money(s.cost)}</span><span className="jp-muted">{s.qty} pallets</span></div></button>))}
        {rows.length > 48 && <p className="jp-muted">Showing 48 of {rows.length}.</p>}{rows.length === 0 && <p className="jp-muted">No shipments match.</p>}</div>}
      {view === "calendar" && <Panel title={first.toLocaleString("en-AU", { month: "long", year: "numeric" })} actions={<div className="adm-row"><Btn sm aria-label="Previous month" onClick={() => setMonth(({ y, m }) => (m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }))}>‹</Btn><Btn sm aria-label="Next month" onClick={() => setMonth(({ y, m }) => (m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }))}>›</Btn></div>}>
        <div className="tbl-cal" role="grid" aria-label="Deliveries by due date">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="h" role="columnheader">{d}</div>)}
          {cells.map((d) => { const list = byDay.get(iso(d)) ?? []; return <div key={iso(d)} role="gridcell" className={d.getMonth() !== month.m ? "out" : ""}><span className="adm-num" style={{ fontSize: "var(--jp-fs-xs)" }}>{d.getDate()}</span>
            {list.slice(0, 3).map((s) => <button key={s.id} className={`tbl-chip is-${SB[s.status]}`} onClick={() => open(s)}>{s.ref} {s.customer.split(" ")[0]}</button>)}{list.length > 3 && <span className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>+{list.length - 3} more</span>}</div>; })}</div></Panel>}
      {view === "map" && <div className="adm-grid adm-grid--21"><Panel title="Destinations (bubble = shipments)">
        <svg className="tbl-map" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Map of destinations"><polygon className="land" points={poly(OUTLINE)} /><polygon className="land" points={poly(TAS)} />
          {[-40, -30, -20, -10].map((la) => <g key={la}><line className="grid" x1="0" x2={W} y1={py(la)} y2={py(la)} /><text x="6" y={py(la) - 3}>{-la}°S</text></g>)}
          {cities.map(([c, ss]) => { const s0 = ss[0]; const r = 7 + Math.sqrt(ss.length) * 4; const east = px(s0.lng) > W - 150; return (
            <g key={c}><circle tabIndex={0} role="button" aria-label={`${c}: ${ss.length} shipments`} cx={px(s0.lng)} cy={py(s0.lat)} r={r} fill="var(--adm-c1)" fillOpacity={cityOpen === c ? 0.95 : 0.6} onClick={() => setCityOpen(cityOpen === c ? null : c)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setCityOpen(cityOpen === c ? null : c)}><title>{c}: {ss.length} shipments</title></circle>
              <text x={px(s0.lng) + (east ? -(r + 5) : r + 5)} y={py(s0.lat) + 4} textAnchor={east ? "end" : "start"} pointerEvents="none">{c} {ss.length}</text></g>); })}
        </svg></Panel>
        <Panel title={cityOpen ? `${cityOpen} (${(cities.find((c) => c[0] === cityOpen)?.[1] ?? []).length})` : "Pick a city"} flush>{cityOpen ? <ul className="adm-list adm-list--tight" style={{ maxHeight: 440, overflow: "auto" }}>{(cities.find((c) => c[0] === cityOpen)?.[1] ?? []).map((s) => <li key={s.id}><button className="adm-link" onClick={() => open(s)}>{s.ref}</button><span style={{ flex: 1 }}>{s.customer}</span><Badge s={SB[s.status]}>{s.status}</Badge></li>)}</ul> : <p className="jp-muted" style={{ padding: 16 }}>Click a bubble (or focus it and press Enter).</p>}</Panel></div>}
      {view === "timeline" && <Panel title="Shipments over time (start to due date)" flush><div className="tbl-tl" role="img" aria-label="Timeline of shipments"><div className="lbl axis" /><div className="axis" style={{ position: "relative" }}>{[0, 0.25, 0.5, 0.75, 1].map((f) => <span key={f} style={{ position: "absolute", left: `${f * 100}%`, transform: f === 1 ? "translateX(-100%)" : undefined }}>{new Date((d0 + f * (d1 - d0)) * 86400000).toISOString().slice(5, 10)}</span>)}</div>
        {tl.map((s) => <><div key={`l${s.id}`} className="lbl">{s.ref} {s.customer.split(" ")[0]}</div><div key={s.id} className="lane">{today >= d0 && today <= d1 && <i className="today" style={{ left: pct(today) }} />}<button className={`bar is-${SB[s.status]}`} style={{ left: pct(day(s.start)), width: `max(10px, calc(${pct(day(s.end))} - ${pct(day(s.start))}))` }} onClick={() => open(s)} aria-label={`${s.ref}: ${s.start} to ${s.end}, ${s.status}`}>{s.status}</button></div></>)}</div></Panel>}
      <Drawer open={!!sel} onClose={() => setSel(null)} title={sel?.ref ?? ""} footer={<Btn onClick={() => setSel(null)}>Close</Btn>}>
        {sel && <div className="adm-stack"><div className="adm-row"><Avatar name={sel.customer} size={36} /><div><b>{sel.customer}</b><div className="jp-muted">{sel.city}, {sel.region}</div></div></div>
          <dl className="adm-dl"><dt>Status</dt><dd><Badge s={SB[sel.status]}>{sel.status}</Badge></dd><dt>Window</dt><dd>{sel.start} → {sel.due}</dd><dt>Cost</dt><dd>{money(sel.cost)}</dd><dt>Pallets</dt><dd>{sel.qty}</dd>{sel.err && <><dt>Problem</dt><dd style={{ color: "var(--jp-danger)" }}>{sel.err}</dd></>}{sel.note && <><dt>Note</dt><dd>{sel.note}</dd></>}</dl></div>}
      </Drawer>
    </>
  );
}
