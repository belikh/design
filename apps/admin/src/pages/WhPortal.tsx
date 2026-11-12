import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import "../warehouse/wh.css";
import { Modal, Btn } from "@belikh/jupiter-ui/kit.tsx";
import { actions, useWhSim } from "../warehouse/store.ts";
import { DIR_VERB, EQUIP_LABEL, LOAD_LABEL, TEMP_LIMIT, TIMING, acceptBlockers, carrierOf, classOf, clearBlockers, hhmm, jobOf, mmss, needsTemp, occupant, rank, tally, tempOk, workMin, type Dock, type State, type Ticket } from "../warehouse/engine.ts";
import { DirTag, LoadTag, Rail, StageChip, useNow, type Tone } from "../warehouse/ui.tsx";

const REJECT_REASONS = ["Seal broken or missing", "Paperwork does not match", "Temperature out of range", "Damaged load", "Wrong goods"];

type View = { tone: Tone; word: string; sub: string; count?: { big: string; small: string; pct?: number } };
/** What the dock display says. One state word, one instruction, readable from the cab. */
function view(s: State, d: Dock, t: Ticket | undefined, now: number): View {
  if (d.status === "blocked") return { tone: "danger", word: "Closed", sub: d.reason ?? "This dock is out of service" };
  if (!t) { const next = rank(s, now).find((r) => r.dockHint === d.id); return { tone: "ok", word: "Free", sub: next ? `Next: ${next.t.id}, ${next.t.rego}${next.etaCall && next.etaCall >= 1 ? ` in about ${Math.round(next.etaCall)} min` : ""}` : "No truck assigned" }; }
  const j = jobOf(t), v = DIR_VERB[j.dir], tl = tally(j);
  switch (t.status) {
    case "called": return { tone: "warn", word: "Reverse in", sub: `${t.id}: reverse slowly onto ${d.name}`, count: { big: mmss(TIMING.approach - (now - t.since)), small: "to arrive", pct: Math.min(100, ((now - t.since) / TIMING.approach) * 100) } };
    case "onDock": return { tone: "info", word: "Check-in", sub: "Stay in your cab. Handbrake on, engine off. The clerk will be with you." };
    case "accepted": return { tone: "info", word: "Accepted", sub: `Waiting for the forklift to start ${v.work.toLowerCase()}. Stay in your cab.` };
    case "working": { const total = j.blind ? j.declared : j.lines.length; return { tone: "accent", word: v.work, sub: j.dir === "in" ? "Stay in your cab until you are cleared." : "Do not move the truck until you are cleared.", count: { big: `${tl.handled + tl.missing}/${total || "?"}`, small: "pallets", pct: total ? ((tl.handled + tl.missing) / total) * 100 : 0 } }; }
    case "complete": return j.outcome === "rejected" ? { tone: "danger", word: "Rejected", sub: `${j.reason ?? "Load not accepted"}. Wait for paperwork.` } : { tone: "warn", word: "Checking", sub: "Wait for clearance. The clerk is reviewing the load." };
    case "cleared": return { tone: "ok", word: "Clear to go", sub: "Pull away slowly. Watch for pedestrians.", count: { big: mmss(TIMING.leave - (now - t.since)), small: "to leave", pct: Math.min(100, ((now - t.since) / TIMING.leave) * 100) } };
    default: return { tone: "muted", word: "Free", sub: "" };
  }
}

export function WhPortal() {
  const { dock } = useParams(); const s = useWhSim(); const now = useNow(s);
  return dock ? <DockStatus s={s} now={now} id={Number(dock)} /> : <Wall s={s} now={now} />;
}

function Wall({ s, now }: { s: State; now: number }) {
  return (
    <div className="wh-portal" style={{ gridTemplateRows: "auto 1fr" }}>
      <div className="wh-pagehead"><h1>Dock status</h1><span className="jp-muted">Open a dock to see its display and controls.</span><nav><Link to="/wh/dock">Dock board</Link><Link to="/wh/forklift">Forklift</Link></nav></div>
      <div className="wh-wall">
        {s.docks.map((d) => { const t = occupant(s, d.id); const v = view(s, d, t, now);
          return (
            <Link key={d.id} to={`/wh/portal/${d.id}`} className="wh-wall__tile" data-tone={v.tone} aria-label={`${d.name}: ${v.word}`}>
              <div className="wh-hazard" /><h2>{d.name}</h2><span className="wh-wall__state">{v.word}</span>
              <span>{t ? `${t.id} · ${t.rego} · ${DIR_VERB[jobOf(t).dir].job}` : v.sub}</span>
              <span className="adm-row" style={{ gap: 6 }}>{d.dirs.map((x) => <DirTag key={x} d={x} />)}{d.caps.map((c) => <LoadTag key={c} l={c} />)}</span>
            </Link>); })}
      </div>
    </div>
  );
}

function DockStatus({ s, now, id }: { s: State; now: number; id: number }) {
  const [q, setQ] = useSearchParams(); const display = q.get("display") === "1"; const [rejecting, setRejecting] = useState(false); const [reason, setReason] = useState(REJECT_REASONS[0]);
  const d = s.docks.find((x) => x.id === id);
  if (!d) return <div className="wh-portal" style={{ gridTemplateRows: "auto 1fr" }}><div className="wh-pagehead"><h1>No dock {id}</h1><nav><Link to="/wh/portal">All docks</Link></nav></div></div>;
  const t = occupant(s, d.id), j = t ? jobOf(t) : undefined, v = view(s, d, t, now);
  const dirs = d.dirs.map((x) => <DirTag key={x} d={x} />);
  return (
    <div className="wh-portal" data-display={display} data-theme={display ? "dark" : undefined}>
      <header className="wh-portal__top">
        <h1 className="wh-portal__dock">{d.name}</h1>
        <div className="wh-portal__cfg" aria-label="Dock setup">{dirs}{d.caps.map((c) => <LoadTag key={c} l={c} />)}<span className="jp-muted">up to {d.maxHeight} m · {d.maxCube} m³</span></div>
        <div className="wh-portal__tools">
          {!display && <><Link to="/wh/portal">All docks</Link><Link to={`/wh/forklift?dock=${d.id}`}>Forklift</Link></>}
          <button className="wh-chip" aria-pressed={display} onClick={() => setQ(display ? {} : { display: "1" })}>{display ? "Show controls" : "Display only"}</button>
          <span className="wh-portal__clock" aria-label="Time">{hhmm(now)}</span>
        </div>
      </header>
      <section className="wh-hero" data-tone={v.tone} aria-live="polite" aria-label={`${d.name} status`}>
        <div className="wh-hazard" aria-hidden />
        <h2 className="wh-hero__word">{v.word}</h2>
        <p className="wh-hero__sub">{v.sub}</p>
        {t && j && (
          <div className="wh-hero__row">
            <div className="wh-hero__id">{t.id}</div>
            <div className="wh-hero__who"><b>{t.rego}</b><span>{carrierOf(t.carrier).name}</span><span>{DIR_VERB[j.dir].job} · {LOAD_LABEL[j.load]} · {j.declared} pallets · {j.cube} m³{t.jobs.length > 1 ? ` · job ${t.cur + 1} of ${t.jobs.length}` : ""}</span></div>
            {v.count && <div className="wh-hero__count"><b>{v.count.big}</b><span>{v.count.small}</span>{v.count.pct !== undefined && <div className="wh-meter" role="progressbar" aria-valuenow={Math.round(v.count.pct)} aria-valuemin={0} aria-valuemax={100} aria-label={v.count.small}><span style={{ width: `${v.count.pct}%` }} /></div>}</div>}
          </div>
        )}
      </section>
      <footer className="wh-portal__foot" data-tone={v.tone}>
        {t && <Rail at={t.status} />}
        {t && j && <Controls s={s} d={d} t={t} now={now} onReject={() => setRejecting(true)} />}
        {!t && d.status === "open" && <FreeNote s={s} d={d} />}
        {d.status === "blocked" && <div className="wh-ctl"><span>This dock is blocked. Reopen it on the <Link to="/wh/dock">dock board</Link>.</span></div>}
      </footer>
      <Modal open={rejecting && !!t} onClose={() => setRejecting(false)} title={`Reject ${t?.id ?? ""}?`} size="sm"
        footer={<><Btn onClick={() => setRejecting(false)}>Keep truck</Btn><Btn variant="primary" onClick={() => { if (t) actions.reject(t.id, reason); setRejecting(false); }}>Reject truck</Btn></>}>
        <p className="jp-muted">The driver will be told to leave without {t && jobOf(t).dir === "in" ? "unloading" : "loading"}. Choose the reason.</p>
        <div className="wh-reasons-pick" role="radiogroup" aria-label="Reason for rejecting">{REJECT_REASONS.map((r) => <button key={r} role="radio" aria-checked={reason === r} className="wh-chip" aria-pressed={reason === r} onClick={() => setReason(r)}>{r}</button>)}</div>
      </Modal>
    </div>
  );
}

function FreeNote({ s, d, now }: { s: State; d: Dock; now?: number }) {
  void now; const eq = d.equipment.map((e) => EQUIP_LABEL[e]).join(", ") || "no equipment";
  return <div className="wh-ctl"><div><p className="wh-ctl__title">This dock takes</p><span>{d.classes.map((c) => classOf(c).label).join(", ")} · {eq}. {s.tickets.filter((t) => t.status === "waiting").length} trucks waiting.</span></div></div>;
}

function Check({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) {
  return <button className="wh-check" aria-pressed={on} onClick={() => onChange(!on)}><i aria-hidden>{on ? "✓" : ""}</i>{label}</button>;
}

function Controls({ s, d, t, now, onReject }: { s: State; d: Dock; t: Ticket; now: number; onReject: () => void }) {
  void d; void s; const j = jobOf(t), dir = j.dir;
  if (t.status === "called") return <div className="wh-ctl"><div><p className="wh-ctl__title">Approaching</p><span>Arrives in {mmss(TIMING.approach - (now - t.since))}. Checks open when the truck is on the dock.</span></div></div>;
  if (t.status === "onDock") {
    const blockers = acceptBlockers(j); const temp = j.checks.temp;
    return (
      <div className="wh-ctl">
        <div><p className="wh-ctl__title">{dir === "in" ? "Check the delivery" : "Check the collection"}</p>
          <div className="wh-checks">
            <Check on={!!j.checks.paperwork} label={dir === "in" ? "Paperwork matches" : "Pick note matches"} onChange={(v) => actions.checks(t.id, { paperwork: v })} />
            {dir === "in" ? <Check on={!!j.checks.seal} label="Seal intact" onChange={(v) => actions.checks(t.id, { seal: v })} /> : <Check on={!!j.checks.inspect} label="Trailer clean and empty" onChange={(v) => actions.checks(t.id, { inspect: v })} />}
            {needsTemp(j) && (temp === undefined ? <button className="wh-check" onClick={() => actions.checks(t.id, { temp: TEMP_LIMIT[j.load]! })}><i aria-hidden />Record temperature</button>
              : <div className="wh-stepper wh-stepper--sm" role="group" aria-label="Load temperature"><button aria-label="Colder" onClick={() => actions.checks(t.id, { temp: temp - 1 })}>−</button><output aria-live="polite" style={{ color: tempOk(j) ? undefined : "var(--jp-danger)" }}>{temp} °C</output><button aria-label="Warmer" onClick={() => actions.checks(t.id, { temp: temp + 1 })}>+</button><small>max {TEMP_LIMIT[j.load]} °C</small></div>)}
          </div>
          {blockers.length > 0 && <ul className="wh-why" style={{ marginTop: 10 }}>{blockers.map((b) => <li key={b}>{b}</li>)}</ul>}
        </div>
        <div className="wh-actions"><button className="wh-btn wh-btn--danger" onClick={onReject}>Reject</button><button className="wh-btn wh-btn--primary" disabled={blockers.length > 0} onClick={() => actions.accept(t.id)}>Accept truck</button></div>
      </div>
    );
  }
  if (t.status === "accepted") return <div className="wh-ctl"><div><p className="wh-ctl__title">Accepted at {hhmm(j.acceptedAt ?? now)}</p><span>Waiting for the forklift operator to {DIR_VERB[dir].start.toLowerCase()}. About {workMin(j)} min of work.</span></div><div className="wh-actions"><button className="wh-btn wh-btn--danger" onClick={onReject}>Reject</button></div></div>;
  if (t.status === "working") { const tl = tally(j); return <div className="wh-ctl"><div><p className="wh-ctl__title">{DIR_VERB[dir].work} since {hhmm(j.startedAt ?? now)}</p><Tally j={j} /><span className="jp-muted">{tl.pending} still to check.</span></div></div>; }
  if (t.status === "complete") {
    const blockers = clearBlockers(j), tl = tally(j), rejected = j.outcome === "rejected";
    return (
      <div className="wh-ctl">
        <div><p className="wh-ctl__title">{rejected ? `Rejected: ${j.reason}` : "Review before clearing"}</p>
          {!rejected && <Tally j={j} />}
          {!rejected && tl.issues.length > 0 && <p style={{ margin: "10px 0 0", fontWeight: 700, color: j.ack ? "var(--jp-text-muted)" : "var(--jp-warn)" }}>Discrepancy: {tl.issues.join(", ")}{j.ack ? " (reviewed)" : ""}</p>}
          <div className="wh-checks" style={{ marginTop: 10 }}>
            {!rejected && tl.discrepancy && <Check on={!!j.ack} label="I have reviewed the discrepancy" onChange={(v) => v && actions.ack(t.id)} />}
            {!rejected && dir === "out" && <label className="wh-checks"><span className="jp-muted">Seal number</span><input className="wh-input" value={j.sealNo ?? ""} onChange={(e) => actions.seal(t.id, e.target.value.toUpperCase())} aria-label="Seal number" placeholder="SL000000" /></label>}
          </div>
          {blockers.length > 0 && <ul className="wh-why" style={{ marginTop: 10 }}>{blockers.map((b) => <li key={b}>{b}</li>)}</ul>}
        </div>
        <div className="wh-actions"><button className="wh-btn wh-btn--ok" disabled={blockers.length > 0} onClick={() => actions.clear(t.id)}>{rejected ? "Send away" : t.jobs[t.cur + 1] ? `Clear and start ${DIR_VERB[t.jobs[t.cur + 1].dir].job.toLowerCase()}` : "Clear to leave"}</button></div>
      </div>
    );
  }
  return <div className="wh-ctl"><div><p className="wh-ctl__title">Leaving</p><span>The dock frees when the truck has pulled away. <StageChip st={t.status} /></span></div></div>;
}

function Tally({ j }: { j: ReturnType<typeof jobOf> }) {
  const t = tally(j);
  return (
    <div className="wh-tally" role="group" aria-label="Pallet tally">
      <div><b>{j.booked ?? "–"}</b><span>booked</span></div><div><b>{j.declared}</b><span>declared</span></div><div><b>{t.handled}</b><span>{DIR_VERB[j.dir].line.toLowerCase()}</span></div>
      <div className={t.damaged ? "is-bad" : ""}><b>{t.damaged}</b><span>damaged</span></div><div className={t.missing ? "is-bad" : ""}><b>{t.missing}</b><span>missing</span></div>{t.extra > 0 && <div><b>{t.extra}</b><span>extra</span></div>}
    </div>
  );
}

