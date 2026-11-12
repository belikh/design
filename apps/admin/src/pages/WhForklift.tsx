import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "../warehouse/wh.css";
import { actions, useWhSim } from "../warehouse/store.ts";
import { DIR_VERB, carrierOf, finishBlockers, hhmm, jobOf, tally, workMin, type LineState, type Ticket } from "../warehouse/engine.ts";
import { DirTag, LoadTag, STAGE_TONE, StageChip, dockLabel, useNow } from "../warehouse/ui.tsx";

const ORDER = ["working", "accepted", "onDock", "called", "complete"] as const;
const SHOWN = new Set<string>(ORDER);
const rank = (t: Ticket) => ORDER.indexOf(t.status as (typeof ORDER)[number]);

/** Vehicle-mounted tablet for the forklift operator: pick a truck, see what to expect, start, tick pallets off, finish. Big targets, no typing. */
export function WhForklift() {
  const s = useWhSim(); const now = useNow(s); const [q, setQ] = useSearchParams(); const dockF = q.get("dock") ? Number(q.get("dock")) : null;
  const jobs = useMemo(() => s.tickets.filter((t) => SHOWN.has(t.status) && (dockF === null || t.dock === dockF)).sort((a, b) => rank(a) - rank(b) || (a.dock ?? 0) - (b.dock ?? 0)), [s.tickets, dockF]);
  const [sel, setSel] = useState<string | null>(null); const [list, setList] = useState(false);
  const first = jobs.find((t) => t.status === "working" || t.status === "accepted") ?? jobs[0];
  const cur = jobs.find((t) => t.id === sel) ?? first;
  useEffect(() => { if (sel && !jobs.some((t) => t.id === sel)) setSel(null); }, [jobs, sel]);
  const docksUsed = [...new Set(s.tickets.filter((t) => SHOWN.has(t.status) && t.dock !== undefined).map((t) => t.dock!))].sort((a, b) => a - b);
  return (
    <div className="wh-fork" data-view={list || !cur ? "list" : "job"}>
      <nav className="wh-fork__list" aria-label="Trucks">
        <h1>Trucks</h1>
        <div className="wh-fork__filter" role="group" aria-label="Filter by dock">
          <button className="wh-chip" aria-pressed={dockF === null} onClick={() => setQ({})}>All docks</button>
          {docksUsed.map((d) => <button key={d} className="wh-chip" aria-pressed={dockF === d} onClick={() => setQ({ dock: String(d) })}>{dockLabel(s, d)}</button>)}
        </div>
        {jobs.length === 0 && <div className="wh-fork__empty"><b>No trucks yet</b><span>Trucks appear here once they are called to a dock.</span></div>}
        {jobs.map((t) => { const j = jobOf(t), tl = tally(j); return (
          <button key={t.id} className="wh-fork__job" data-tone={STAGE_TONE[t.status]} aria-current={cur?.id === t.id} onClick={() => { setSel(t.id); setList(false); }}>
            <b>{dockLabel(s, t.dock)} · {t.id}</b><span>{t.rego} · {DIR_VERB[j.dir].job} · {j.declared} pallets</span>
            <small><StageChip st={t.status} /> {t.status === "working" ? `${tl.handled + tl.missing} of ${j.blind ? j.declared : j.lines.length} done` : ""}</small>
          </button>); })}
        <div style={{ marginTop: "auto", padding: 20, display: "flex", gap: 16 }}><Link to="/wh/portal">Dock status</Link><Link to="/wh/dock">Dock board</Link></div>
      </nav>
      {cur ? <Job key={cur.id} t={cur} now={now} onBack={() => setList(true)} /> : <div className="wh-fork__main"><div className="wh-fork__empty"><b>Nothing to work on</b><span>When a truck is accepted at a dock it shows up on the left.</span></div></div>}
    </div>
  );
}

function Job({ t, now, onBack }: { t: Ticket; now: number; onBack: () => void }) {
  const s = useWhSim(); const j = jobOf(t), v = DIR_VERB[j.dir], tl = tally(j), blockers = finishBlockers(j); void now;
  const working = t.status === "working", ready = t.status === "accepted"; const total = j.blind ? j.declared : j.lines.length; const done = tl.handled + tl.missing;
  const set = (id: string, cur: LineState | undefined, st: LineState) => actions.mark(t.id, id, cur === st ? undefined : st);
  const tone = STAGE_TONE[t.status];
  return (
    <section className="wh-fork__main" aria-label={`Truck ${t.id}`}>
      <header className="wh-fork__head" data-tone={tone}>
        <button className="wh-chip wh-fork__back" onClick={onBack}>← Trucks</button>
        <span className="wh-fork__dock">{dockLabel(s, t.dock)}</span>
        <div className="wh-fork__meta"><b>{t.id} · {t.rego}</b><span>{carrierOf(t.carrier).name} · {t.driver}</span></div>
        <div className="wh-fork__meta"><span><DirTag d={j.dir} /> <LoadTag l={j.load} /></span><span>{j.declared} pallets · {j.cube} m³{j.ref ? ` · ${j.ref}` : " · no booking"}</span></div>
        <span style={{ marginInlineStart: "auto" }}><StageChip st={t.status} /></span>
      </header>
      <div className="wh-fork__pallets">
        {t.status === "onDock" || t.status === "called" ? <div className="wh-fork__empty"><b>Not accepted yet</b><span>The dock clerk has to accept this truck before you can {v.start.toLowerCase()}.</span></div> : null}
        {ready && <>
          <h2 style={{ margin: 0, fontSize: "var(--jp-fs-lg)" }}>{j.blind ? "Blind count: no manifest" : `Expect ${j.lines.length} pallets`}</h2>
          {j.blind ? <p className="jp-muted">There is no booking for this truck. Count each pallet in as you {j.dir === "in" ? "unload" : "load"} it. The driver declared {j.declared}.</p>
            : j.lines.map((l) => <div key={l.id} className="wh-pal"><div className="wh-pal__info"><b>{l.id}</b><span>{l.desc} · {l.zone}</span></div></div>)}
        </>}
        {working && (j.blind
          ? <>
            <button className="wh-btn wh-btn--primary wh-btn--big" onClick={() => actions.addLine(t.id)}>+ Pallet counted</button>
            {j.lines.map((l) => <div key={l.id} className="wh-pal is-ok"><div className="wh-pal__info"><b>{l.id}</b><span>{l.zone}</span></div><div className="wh-pal__btns"><button aria-label={`Remove ${l.id}`} onClick={() => actions.removeLine(t.id, l.id)}>Remove</button></div></div>)}
          </>
          : <>
            {j.lines.map((l) => (
              <div key={l.id} className={`wh-pal ${l.state ? `is-${l.state}` : ""}`}>
                <div className="wh-pal__info"><b>{l.id}{l.extra ? " (extra)" : ""}</b><span>{l.desc} · {l.zone}</span></div>
                <div className="wh-pal__btns" role="group" aria-label={`Pallet ${l.id}`}>
                  <button aria-pressed={l.state === "ok"} onClick={() => set(l.id, l.state, "ok")}>{v.line}</button><button aria-pressed={l.state === "damaged"} onClick={() => set(l.id, l.state, "damaged")}>Damaged</button><button aria-pressed={l.state === "missing"} onClick={() => set(l.id, l.state, "missing")}>Missing</button>
                </div>
              </div>))}
            <div className="adm-row" style={{ gap: 12, marginTop: 6 }}>
              <button className="wh-btn wh-btn--sm" onClick={() => j.lines.filter((l) => !l.state).forEach((l) => actions.mark(t.id, l.id, "ok"))} disabled={tl.pending === 0}>Mark remaining {v.line.toLowerCase()}</button>
              <button className="wh-btn wh-btn--sm" onClick={() => actions.addLine(t.id)}>+ Extra pallet</button>
            </div>
          </>)}
        {t.status === "complete" && <div className="wh-fork__empty"><b>{j.outcome === "rejected" ? "Truck rejected" : `${v.done}. Nice work`}</b><span>{j.outcome === "rejected" ? j.reason : `The dock clerk is reviewing ${tl.handled} pallets${tl.discrepancy ? ` (${tl.issues.join(", ")})` : ""}.`}</span></div>}
      </div>
      <footer className="wh-fork__foot" data-tone={tone}>
        <div className="wh-fork__count">
          {working ? <><b>{done} / {total || "?"} pallets</b><div className="wh-meter" role="progressbar" aria-valuenow={total ? Math.round((done / total) * 100) : 0} aria-valuemin={0} aria-valuemax={100} aria-label="Pallets done"><span style={{ width: `${total ? Math.min(100, (done / total) * 100) : 0}%` }} /></div>{blockers.length > 0 && <span className="jp-muted">{blockers.join(". ")}</span>}</>
            : ready ? <span className="jp-muted">About {workMin(j)} min of work, started by you. Accepted at {hhmm(j.acceptedAt ?? t.since)}.</span> : <span className="jp-muted">{j.outcome === "completed" ? `Finished at ${hhmm(j.finishedAt ?? t.since)}.` : ""}</span>}
        </div>
        {ready && <button className="wh-btn wh-btn--primary wh-btn--big" onClick={() => actions.start(t.id)}>{v.start}</button>}
        {working && <button className="wh-btn wh-btn--ok wh-btn--big" disabled={blockers.length > 0} onClick={() => actions.finish(t.id)}>{v.finish}</button>}
      </footer>
    </section>
  );
}
