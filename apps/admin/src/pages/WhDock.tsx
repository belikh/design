import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../warehouse/wh.css";
import { PageHeader, Panel, Btn, Badge, Menu, Alert, EmptyState, Dot, Drawer } from "@belikh/jupiter-ui/kit.tsx";
import { StatTile, BarChart } from "@belikh/jupiter-ui/Charts.tsx";
import { Slider, Switch } from "@belikh/jupiter-ui/inputs.tsx";
import { actions, useWhSim } from "../warehouse/store.ts";
import { DIR_VERB, LOAD_LABEL, carrierOf, dur, eligibleFreeDocks, hhmm, jobOf, kpis, occupant, rank, remaining, tally, DEFAULT_WEIGHTS, whyNoFit, type Direction, type Ticket, type Weights } from "../warehouse/engine.ts";
import { DirTag, LoadTag, StageChip, useNow } from "../warehouse/ui.tsx";

const WEIGHT_FIELDS: { k: keyof Weights; label: string; max: number; step?: number }[] = [
  { k: "waitPerMin", label: "Points per minute waited", max: 2, step: 0.1 }, { k: "slotBonus", label: "On-slot bonus", max: 40 }, { k: "latePerMin", label: "Late penalty per minute", max: 2, step: 0.1 }, { k: "walkIn", label: "Walk-in penalty", max: 60 },
  { k: "frozen", label: "Frozen load", max: 80 }, { k: "chilled", label: "Chilled load", max: 80 }, { k: "dg", label: "Dangerous goods", max: 80 }, { k: "tier1", label: "Tier 1 carrier", max: 30 }, { k: "urgent", label: "Urgent flag", max: 60 }, { k: "slaMin", label: "SLA minutes", max: 120 }, { k: "slaBonus", label: "Past-SLA bonus", max: 60 },
];
const SPEEDS = [1, 5, 15, 30];

/** Dispatch: who is waiting, which dock they will get, and what is happening at each dock. Dock work itself happens on the portal and forklift screens. */
export function WhDock() {
  const s = useWhSim(); const now = useNow(s); const q = useMemo(() => rank(s, now), [s, now]); const [dir, setDir] = useState<"all" | Direction>("all"); const [rules, setRules] = useState(false);
  const k = kpis(s, now, dir === "all" ? undefined : dir); const shown = q.filter((r) => dir === "all" || jobOf(r.t).dir === dir);
  const maxScore = Math.max(60, ...q.map((r) => r.score)); const open = (p: string) => window.open(p, "_blank");
  const noShows = s.tickets.filter((t) => t.status === "noshow");
  const byHour = useMemo(() => { const hrs = Array.from({ length: 12 }, (_, i) => 5 + i); return { labels: hrs.map((h) => `${h}:00`), arrivals: hrs.map((h) => s.tickets.filter((t) => Math.floor(t.arrivedAt / 60) === h).length), bookings: hrs.map((h) => s.bookings.filter((b) => Math.floor(b.slot / 60) === h).length) }; }, [s.tickets, s.bookings]);
  return (
    <>
      <PageHeader title="Dock board" crumbs={["Warehouse", "Dock board"]} desc="Dispatch for inbound and outbound trucks, ranked by the timeslot rules. Trucks are only called to docks that fit them. Open the other screens in their own tabs: they update together."
        status={<Badge s={k.breaches ? "danger" : "ok"}>{k.breaches ? `${k.breaches} past SLA` : "within SLA"}</Badge>}
        actions={<><Btn icon="monitor" onClick={() => open("/wh/portal")}>Dock status</Btn><Btn icon="monitor" onClick={() => open("/wh/forklift")}>Forklift</Btn><Btn icon="monitor" onClick={() => open("/wh/kiosk")}>Kiosk</Btn><Btn icon="monitor" onClick={() => open("/wh/lobby")}>Lobby</Btn><Btn icon="settings" onClick={() => setRules(true)}>Priority rules</Btn></>} />
      <div className="adm-row" style={{ marginBottom: 16, gap: 20 }}>
        <span className="adm-num" style={{ fontSize: "var(--jp-fs-xl)", fontWeight: 800 }}>{hhmm(now)}</span>
        <span className="jp-muted">speed</span>
        <div className="wh-seg" role="group" aria-label="Simulation speed">{SPEEDS.map((x) => <button key={x} aria-pressed={s.speed === x} onClick={() => actions.setSpeed(x)}>{x}×</button>)}</div>
        <Switch checked={s.auto} onChange={actions.setAuto} label="Auto-call best truck" /><Switch checked={s.autoArrivals} onChange={actions.setAutoArrivals} label="Simulate arrivals" />
        <Switch checked={s.simStaff} onChange={actions.setSimStaff} label="Simulate dock staff" /><Switch checked={s.simFork} onChange={actions.setSimFork} label="Simulate forklift" />
        <span className="adm-spacer" /><div className="wh-seg" role="group" aria-label="Direction">{(["all", "in", "out"] as const).map((x) => <button key={x} aria-pressed={dir === x} onClick={() => setDir(x)}>{x === "all" ? "All" : x === "in" ? "Inbound" : "Outbound"}</button>)}</div>
        <Btn sm icon="refresh" onClick={() => actions.reset()}>Reset demo</Btn>
      </div>
      <div className="adm-grid adm-grid--4" style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}>
        <StatTile label="Waiting" value={String(k.waiting)} sub="trucks" /><StatTile label="Avg wait" value={dur(k.avgWait)} sub="today" /><StatTile label="Longest wait" value={dur(k.longest)} sub="now" />
        <StatTile label="Dock use" value={`${Math.round(k.utilisation * 100)}%`} sub="open docks" /><StatTile label="On slot" value={`${Math.round(k.onTime * 100)}%`} sub="booked jobs" /><StatTile label="Departed" value={String(k.doneToday)} sub="today" />
      </div>
      <Panel title="Docks" className="adm-section" actions={<><Link to="/wh/docks">Dock setup</Link><Btn sm variant="primary" onClick={() => actions.callBest()}>Call best for every free dock</Btn></>}>
        <div className="wh-docks">{s.docks.filter((d) => dir === "all" || d.dirs.includes(dir)).map((d) => { const t = occupant(s, d.id); const eligible = d.status === "open" && !t ? q.filter((r) => whyNoFit({ docks: [d] }, r.t).length === 0).slice(0, 4) : [];
          const j = t ? jobOf(t) : undefined, tl = j ? tally(j) : undefined;
          return (
            <div key={d.id} className={`wh-dock ${d.status === "blocked" ? "is-blocked" : t?.status === "called" ? "is-called" : t ? "is-busy" : ""}`}>
              <h3><span>{d.name}</span><StageChip st={d.status === "blocked" ? "blocked" : t ? t.status : "free"} /></h3>
              <div className="wh-dock__cfg">{d.dirs.map((x) => <DirTag key={x} d={x} />)}{d.caps.map((c) => <LoadTag key={c} l={c} />)}<span>≤ {d.maxHeight} m · {d.maxCube} m³</span></div>
              {d.status === "blocked" ? <><span className="jp-muted">{d.reason}</span><Btn sm onClick={() => actions.block(d.id, false)}>Reopen</Btn></>
                : t && j && tl ? <>
                  <div className="adm-row" style={{ justifyContent: "space-between" }}><b className="adm-num">{t.id} · {t.rego}</b><LoadTag l={j.load} /></div>
                  <span className="jp-muted">{carrierOf(t.carrier).name} · {DIR_VERB[j.dir].job.toLowerCase()} · {j.declared} pallets{t.jobs.length > 1 ? ` · job ${t.cur + 1}/${t.jobs.length}` : ""}</span>
                  {t.status === "working" && <div className="adm-progress__track"><span style={{ width: `${Math.min(100, ((tl.handled + tl.missing) / Math.max(1, j.blind ? j.declared : j.lines.length)) * 100)}%` }} /></div>}
                  <div className="adm-row" style={{ justifyContent: "space-between" }}><span className="jp-muted">free in ~{dur(remaining(t, now))}</span>{t.status === "called" && <Btn sm onClick={() => actions.noShow(t.id)}>No-show</Btn>}</div>
                  <div className="wh-dock__links"><Link to={`/wh/portal/${d.id}`}>Status display</Link><Link to={`/wh/forklift?dock=${d.id}`}>Forklift</Link></div></>
                  : <>
                    {eligible.length ? <Menu label="Call truck…" items={eligible.map((r) => ({ label: `${r.t.id} · ${r.t.rego} (${r.score})`, onSelect: () => actions.call(r.t.id, d.id) }))} /> : <span className="jp-muted">No suitable truck waiting</span>}
                    <div className="adm-row" style={{ justifyContent: "space-between" }}><Btn sm variant="ghost" onClick={() => actions.block(d.id, true)}>Block dock</Btn><Link to={`/wh/portal/${d.id}`}>Status display</Link></div></>}
            </div>); })}</div>
      </Panel>
      <Panel title={`Priority queue (${shown.length})`} className="adm-section" flush>
        {shown.length === 0 ? <EmptyState spot="inbox-zero" title="No trucks waiting">New check-ins appear here instantly.</EmptyState> : (
          <div className="adm-dt__wrap"><table className="jp-table adm-table"><thead><tr><th>#</th><th>Ticket</th><th>Truck</th><th>Job</th><th>Slot</th><th>Waited</th><th style={{ minWidth: 230 }}>Priority and why</th><th>Call in</th><th><span className="adm-sr">Actions</span></th></tr></thead><tbody>
            {shown.map((r) => { const t: Ticket = r.t; const j = jobOf(t); const free = eligibleFreeDocks(s, t);
              return (<tr key={t.id} className={r.waited >= s.weights.slaMin ? "sev-danger" : ""}>
                <td className="adm-num">{r.position}</td><td><b className="adm-num">{t.id}</b></td>
                <td><div>{t.rego}</div><div className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>{carrierOf(t.carrier).name} · T{carrierOf(t.carrier).tier} · {t.height} m · {t.cube} m³{t.urgent && <> · <Badge s="danger">urgent</Badge></>}{t.tailLift && <> · tail-lift</>}</div></td>
                <td><DirTag d={j.dir} /> <LoadTag l={j.load} /> <span className="adm-num">{j.declared}p</span>{t.jobs.length > 1 && <div className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>job {t.cur + 1} of {t.jobs.length}</div>}</td><td className="adm-num">{j.slot !== undefined ? hhmm(j.slot) : <Badge>walk-in</Badge>}</td><td className="adm-num">{dur(r.waited)}</td>
                <td><div className="wh-score"><i style={{ width: `${Math.max(4, (r.score / maxScore) * 90)}px` }} /><b className="adm-num">{r.score}</b></div><div className="wh-reasons">{r.parts.map((p) => <span key={p.label} className={p.points < 0 ? "is-neg" : "is-pos"}>{p.label} {p.points > 0 ? "+" : ""}{p.points}</span>)}</div></td>
                <td className="adm-num">{r.etaCall === null ? <><Badge s="warn">no dock fits</Badge><ul className="wh-why">{r.noFit.slice(0, 2).map((m) => <li key={m}>{m}</li>)}</ul></> : r.etaCall < 1 ? <b>now</b> : <>{dur(r.etaCall)}<div className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>→ Dock {r.dockHint}</div></>}</td>
                <td style={{ textAlign: "right" }}>{free.length > 0 ? <Menu label={`Call → ${free[0].name}`} items={[...free.map((d) => ({ label: `Call to ${d.name}`, onSelect: () => actions.call(t.id, d.id) })), "sep" as const, { label: t.urgent ? "Remove urgent flag" : "Mark urgent", onSelect: () => actions.urgent(t.id, !t.urgent) }, { label: "Mark no-show", danger: true, onSelect: () => actions.noShow(t.id) }]} /> : <Menu label="Actions" items={[{ label: t.urgent ? "Remove urgent flag" : "Mark urgent", onSelect: () => actions.urgent(t.id, !t.urgent) }, { label: "Mark no-show", danger: true, onSelect: () => actions.noShow(t.id) }]} />}</td></tr>); })}
          </tbody></table></div>)}
      </Panel>
      {noShows.length > 0 && <Panel title={`No-shows (${noShows.length})`} className="adm-section" flush><ul className="adm-list adm-list--tight">{noShows.map((t) => <li key={t.id}><b className="adm-num">{t.id}</b><span style={{ flex: 1 }}>{t.rego} · {carrierOf(t.carrier).name}</span><Btn sm onClick={() => actions.requeue(t.id)}>Put back in queue</Btn></li>)}</ul></Panel>}
      <Panel title="Dock timeline" className="adm-section"><Gantt /></Panel>
      <div className="adm-grid adm-grid--2" style={{ marginTop: 16 }}>
        <Panel title="Arrivals vs bookings by hour"><BarChart height={200} labels={byHour.labels} series={[{ name: "Booked", data: byHour.bookings }, { name: "Arrived", data: byHour.arrivals }]} /></Panel>
        <Panel title="Activity" flush><ul className="adm-list adm-list--tight" style={{ maxHeight: 250, overflow: "auto" }}>{s.log.length ? s.log.slice(0, 14).map((l, i) => <li key={i}><span className="adm-num jp-muted">{hhmm(l.t)}</span><span>{l.msg}</span></li>) : <li className="jp-muted">Nothing yet. Actions appear here.</li>}</ul></Panel>
      </div>
      {k.breaches > 0 && <div style={{ marginTop: 16 }}><Alert s="danger" title={`${k.breaches} truck${k.breaches > 1 ? "s" : ""} past the ${s.weights.slaMin}-minute SLA`}>They already get a priority boost. Check <Link to="/wh/docks">dock setup</Link> if no dock fits them, or call them manually.</Alert></div>}
      <p className="jp-muted" style={{ marginTop: 12 }}><Dot s="info" /> Demo only: state lives in this browser and syncs between tabs; there is no server. A real day runs at 1×.</p>
      <Drawer open={rules} onClose={() => setRules(false)} title="Why this order? Tune the rules" footer={<Btn sm onClick={() => actions.weights(DEFAULT_WEIGHTS)}>Reset rules</Btn>}>
        <div className="adm-stack">{WEIGHT_FIELDS.map((w) => <div key={w.k}><div style={{ fontSize: "var(--jp-fs-xs)" }}>{w.label}</div><Slider label={w.label} value={s.weights[w.k]} min={0} max={w.max} step={w.step ?? 1} onChange={(v) => actions.weights({ [w.k]: v })} fmt={(v) => String(v)} /></div>)}</div>
      </Drawer>
    </>
  );
}

function Gantt() {
  const s = useWhSim(); const now = useNow(s); const start = 5 * 60, end = 17 * 60; const frac = (m: number) => (Math.min(Math.max(m, start), end) - start) / (end - start); const pct = (m: number) => `${frac(m) * 100}%`;
  const hours = Array.from({ length: 13 }, (_, i) => 5 + i);
  return (
    <div className="wh-gantt"><div style={{ minWidth: 820 }}>
      <div className="wh-gantt__hours"><span /><div>{hours.map((h) => <span key={h} style={{ position: "absolute", left: pct(h * 60), transform: "translateX(-50%)" }}>{h}:00</span>)}</div></div>
      <div className="wh-gantt__body">
        {s.docks.map((d) => (
          <div key={d.id} className="wh-gantt__row"><b style={{ fontSize: "var(--jp-fs-xs)" }}>{d.name}</b>
            <div className="wh-gantt__lane" style={{ background: d.status === "blocked" ? "repeating-linear-gradient(135deg, transparent 0 6px, var(--jp-surface) 6px 12px)" : undefined }}>
              {s.tickets.filter((t) => t.dock === d.id && t.calledAt !== undefined).map((t) => { const a = t.calledAt!; const b = t.endedAt ?? now + remaining(t, now); return <div key={t.id} className={`wh-gantt__bar is-${jobOf(t).load} ${t.status === "called" ? "is-called" : ""} ${t.status === "departed" ? "is-done" : ""}`} style={{ left: pct(a), width: `calc(${pct(b)} - ${pct(a)})` }} title={`${t.id} ${t.rego} · ${LOAD_LABEL[jobOf(t).load]} · ${hhmm(a)}–${hhmm(b)}`}>{t.id}</div>; })}
            </div></div>))}
        <div className="wh-gantt__now" style={{ left: `calc(96px + (100% - 96px) * ${frac(now)})` }} />
      </div>
    </div></div>
  );
}
