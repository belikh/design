import { useMemo, useState } from "react";
import { PageHeader, Panel, Btn, Badge, Modal } from "@belikh/jupiter-ui/kit.tsx";
import { Segmented, TextInput, Field, Select } from "@belikh/jupiter-ui/inputs.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";

type Ev = { id: number; date: string; title: string; kind: "ok" | "warn" | "danger" | "info"; time: string };
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function Calendar() {
  const { toast } = usePrefs();
  const [cur, setCur] = useState(new Date(2026, 10, 12)); const [view, setView] = useState<"month" | "week" | "agenda">("month");
  const [events, setEvents] = useState<Ev[]>([
    { id: 1, date: "2026-11-03", title: "ZFS scrub", kind: "info", time: "02:00" }, { id: 2, date: "2026-11-06", title: "Cert renewal", kind: "warn", time: "09:00" }, { id: 3, date: "2026-11-12", title: "Release v1.0", kind: "ok", time: "10:30" },
    { id: 4, date: "2026-11-12", title: "Standup", kind: "info", time: "09:00" }, { id: 5, date: "2026-11-14", title: "Firmware window", kind: "danger", time: "22:00" }, { id: 6, date: "2026-11-18", title: "Backup test", kind: "ok", time: "03:00" }, { id: 7, date: "2026-11-25", title: "UPS test", kind: "warn", time: "13:00" },
  ]);
  const [open, setOpen] = useState<string | null>(null); const [title, setTitle] = useState(""); const [kind, setKind] = useState<Ev["kind"]>("info");
  const first = new Date(cur.getFullYear(), cur.getMonth(), 1); const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
  const cells = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  const week = useMemo(() => { const m = new Date(cur); m.setDate(cur.getDate() - ((cur.getDay() + 6) % 7)); return Array.from({ length: 7 }, (_, i) => { const d = new Date(m); d.setDate(m.getDate() + i); return d; }); }, [cur]);
  const shift = (n: number) => setCur((c) => { const d = new Date(c); view === "month" ? d.setMonth(d.getMonth() + n) : d.setDate(d.getDate() + n * 7); return d; });
  const on = (d: Date) => events.filter((e) => e.date === iso(d)).sort((a, b) => a.time.localeCompare(b.time));
  const today = iso(new Date(2026, 10, 12));
  return (
    <>
      <PageHeader title="Calendar" desc="Month, week and agenda views; click a day to add an event." crumbs={["Data", "Calendar"]}
        actions={<><Btn onClick={() => setCur(new Date(2026, 10, 12))}>Today</Btn><Btn aria-label="Previous" onClick={() => shift(-1)}>‹</Btn><Btn aria-label="Next" onClick={() => shift(1)}>›</Btn><Segmented label="View" value={view} onChange={setView} options={[{ value: "month", label: "Month" }, { value: "week", label: "Week" }, { value: "agenda", label: "Agenda" }]} /></>} />
      <Panel title={cur.toLocaleString("en-AU", { month: "long", year: "numeric" })} flush>
        {view === "month" && <div className="adm-cal">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="adm-cal__h">{d}</div>)}
          {cells.map((d) => (<div key={iso(d)} className={`adm-cal__d ${d.getMonth() !== cur.getMonth() ? "is-out" : ""} ${iso(d) === today ? "is-today" : ""}`} role="button" tabIndex={0} onClick={() => { setOpen(iso(d)); setTitle(""); }} onKeyDown={(e) => e.key === "Enter" && setOpen(iso(d))}>
            <span className="adm-cal__n">{d.getDate()}</span>{on(d).slice(0, 3).map((e) => <span key={e.id} className={`adm-cal__e is-${e.kind}`}>{e.time} {e.title}</span>)}{on(d).length > 3 && <span className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>+{on(d).length - 3} more</span>}</div>))}</div>}
        {view === "week" && <div className="adm-week">{week.map((d) => <div key={iso(d)} className={iso(d) === today ? "is-today" : ""}><b>{d.toLocaleString("en-AU", { weekday: "short" })} {d.getDate()}</b>{on(d).map((e) => <span key={e.id} className={`adm-cal__e is-${e.kind}`}>{e.time} {e.title}</span>)}<Btn sm variant="ghost" onClick={() => { setOpen(iso(d)); setTitle(""); }}>+</Btn></div>)}</div>}
        {view === "agenda" && <ul className="adm-list">{[...events].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).map((e) => <li key={e.id}><span className="adm-num" style={{ width: 90 }}>{e.date}</span><span className="adm-num jp-muted" style={{ width: 50 }}>{e.time}</span><b style={{ flex: 1 }}>{e.title}</b><Badge s={e.kind}>{e.kind}</Badge><button className="adm-x" aria-label={`Delete ${e.title}`} onClick={() => setEvents((x) => x.filter((y) => y.id !== e.id))}>×</button></li>)}</ul>}
      </Panel>
      <Modal open={!!open} onClose={() => setOpen(null)} size="sm" title={`New event · ${open}`} footer={<><Btn onClick={() => setOpen(null)}>Cancel</Btn><Btn variant="primary" disabled={!title.trim()} onClick={() => { setEvents((x) => [...x, { id: Date.now(), date: open!, title, kind, time: "12:00" }]); toast({ kind: "ok", title: "Event added" }); setOpen(null); }}>Add event</Btn></>}>
        <div className="adm-stack"><Field label="Title" required>{(id) => <TextInput id={id} value={title} onChange={setTitle} autoFocus />}</Field><Field label="Type">{(id) => <Select id={id} value={kind} onChange={(v) => setKind(v as Ev["kind"])} options={[{ value: "info", label: "Note" }, { value: "ok", label: "Release" }, { value: "warn", label: "Maintenance" }, { value: "danger", label: "Outage window" }]} />}</Field></div>
      </Modal>
    </>
  );
}
