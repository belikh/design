import { Link, useParams } from "react-router-dom";
import "../warehouse/wh.css";
import { useWhSim } from "../warehouse/store.ts";
import { DIR_VERB, LOAD_LABEL, TIMING, carrierOf, dur, hhmm, jobOf, mmss, rank, tally, type Ticket } from "../warehouse/engine.ts";
import { Stepper, Badge, EmptyState } from "@belikh/jupiter-ui/kit.tsx";
import { dockLabel, useNow, STAGE_TONE } from "../warehouse/ui.tsx";

const STEPS = ["Checked in", "Called", "At dock", "Working", "Cleared"];
const stepOf = (t: Ticket) => ({ waiting: 1, called: 2, onDock: 3, accepted: 3, working: 4, complete: 4, cleared: 5, departed: 5, noshow: 1 }[t.status]);

/** Mobile status page a driver opens from the kiosk ticket. One big instruction per stage. */
export function WhTicket() {
  const { id } = useParams(); const s = useWhSim(); const now = useNow(s); const t = s.tickets.find((x) => x.id === id?.toUpperCase());
  if (!t) return <div className="wh-ticketpage"><EmptyState spot="not-found" title="Ticket not found">Check the number on your kiosk ticket.</EmptyState><Link to="/wh/kiosk" className="jp-btn jp-btn--primary">Check in</Link></div>;
  const r = rank(s, now).find((x) => x.t.id === t.id); const j = jobOf(t), v = DIR_VERB[j.dir], d = dockLabel(s, t.dock), tl = tally(j); const tone = STAGE_TONE[t.status];
  const more = t.jobs.length > 1 ? ` (${t.cur + 1} of ${t.jobs.length}: ${t.jobs.map((x) => DIR_VERB[x.dir].job.toLowerCase()).join(" then ")})` : "";
  return (
    <div className="wh-ticketpage">
      <div className="wh-ticket" role="status"><div className="jp-muted">Ticket</div><div className="wh-ticket__id">{t.id}</div><div className="adm-num">{t.rego}</div></div>
      <Stepper steps={STEPS} current={stepOf(t)} />
      <div className="wh-bigstep" data-tone={tone}>
        {t.status === "waiting" && <><h2>Position #{r?.position} in the queue</h2><p>{r?.etaCall == null ? <>No dock fits your truck yet{r?.noFit[0] ? `: ${r.noFit[0]}` : ""}. Please see the dock office.</> : <>Estimated call in <b>{dur(r.etaCall)}</b>{r.dockHint ? <> · likely {dockLabel(s, r.dockHint)}</> : null}.</>}</p><p className="jp-muted">Priority is based on your slot, load type, carrier and time waited.</p></>}
        {t.status === "called" && <><h1>Back onto {d}</h1><p>You were called at {hhmm(t.calledAt ?? now)}. Reverse in slowly: about {mmss(TIMING.approach - (now - t.since))} to go.</p></>}
        {t.status === "onDock" && <><h1>Stay in your cab</h1><p>Handbrake on, engine off. The clerk at {d} will check your paperwork{j.dir === "in" ? " and seal" : ""}.</p></>}
        {t.status === "accepted" && <><h1>Accepted at {d}</h1><p>The forklift will start {v.work.toLowerCase()} soon. Stay in your cab.</p></>}
        {t.status === "working" && <><h2>{v.work} at {d}</h2><p>{tl.handled + tl.missing} of {j.blind ? j.declared : j.lines.length} pallets done. Started {hhmm(j.startedAt ?? now)}.</p></>}
        {t.status === "complete" && <><h2>{j.outcome === "rejected" ? "Your load was rejected" : "Almost done"}</h2><p>{j.outcome === "rejected" ? `${j.reason}. Wait for your paperwork.` : "The clerk is checking the load. Wait for the all-clear."}</p></>}
        {t.status === "cleared" && <><h1>Cleared. Collect your paperwork</h1><p>Pull away from {d} slowly. Drive safely.</p></>}
        {t.status === "departed" && <><h2>All done. Thank you!</h2><p className="jp-muted">Left {d} at {hhmm(t.endedAt ?? now)}.</p></>}
        {t.status === "noshow" && <><h2>Marked as no-show</h2><p>Please see the dock office to be put back in the queue.</p></>}
        {more && <p className="jp-muted">{more}</p>}
      </div>
      <dl className="adm-dl"><dt>Company</dt><dd>{carrierOf(t.carrier).name}</dd><dt>Load</dt><dd>{LOAD_LABEL[j.load]} · {j.declared} pallets · {j.cube} m³</dd><dt>Booking</dt><dd>{j.ref ? <>{j.ref} · {hhmm(j.slot ?? 0)}</> : <Badge>walk-in</Badge>}</dd><dt>Arrived</dt><dd>{hhmm(t.arrivedAt)}</dd></dl>
    </div>
  );
}
