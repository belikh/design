import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../warehouse/wh.css";
import { actions, getState, useWhSim } from "../warehouse/store.ts";
import { CARRIERS, DIR_VERB, LOAD_LABEL, TRUCK_CLASSES, carrierOf, classOf, dur, hhmm, rank, refInUse, simNow, type Booking, type Direction, type LoadClass, type Ticket, type TruckClassId } from "../warehouse/engine.ts";
import { Keyboard, NumPad, applyKey } from "../warehouse/keyboards.tsx";
import { Icon, Spot } from "@belikh/jupiter-ui/Icon.tsx";
import { useNow } from "../warehouse/ui.tsx";

const IDLE_MS = 60_000, WARN_MS = 15_000;
const LOADS: { v: LoadClass; hint: string; icon: string }[] = [{ v: "ambient", hint: "Dry goods, general freight", icon: "box" }, { v: "chilled", hint: "0–5 °C", icon: "thermometer" }, { v: "frozen", hint: "−18 °C or below", icon: "drop" }, { v: "dg", hint: "Dangerous goods (UN-rated)", icon: "alert" }];
const STEPS = ["Vehicle", "Purpose", "Truck", "Load", "Driver", "Confirm"];
const PURPOSE: { v: Direction[]; label: string; hint: string; icon: string }[] = [{ v: ["in"], label: "Delivering", hint: "Bringing goods to us", icon: "box" }, { v: ["out"], label: "Collecting", hint: "Picking up an order", icon: "rack" }, { v: ["in", "out"], label: "Both", hint: "Deliver, then collect", icon: "refresh" }];
type JobForm = { ref: string; walkIn: boolean; load: LoadClass; pallets: number };
type Form = { rego: string; dirs: Direction[]; cls: TruckClassId; height: number; cube: number; tailLift: boolean; jobs: Record<Direction, JobForm>; carrier: string; driver: string; phone: string };
const JOB0: JobForm = { ref: "", walkIn: false, load: "ambient", pallets: 12 };
const EMPTY: Form = { rego: "", dirs: [], cls: "semi", height: classOf("semi").height, cube: classOf("semi").cube, tailLift: false, jobs: { in: JOB0, out: JOB0 }, carrier: "", driver: "", phone: "" };
const DEMO: Form = { ...EMPTY, rego: "1AB 2CD", dirs: ["in"], cls: "reefer", height: 4.1, cube: 70, jobs: { in: { ref: "BK4112", walkIn: false, load: "chilled", pallets: 18 }, out: JOB0 }, driver: "Sam Walker", phone: "0412345678" };

const Stepper = ({ value, onChange, min, max, step = 1, label, unit, small }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; label: string; unit?: string; small?: boolean }) => {
  const round = (v: number) => Math.round(v * 10) / 10;
  return <div className={`wh-stepper ${small ? "wh-stepper--sm" : ""}`} role="group" aria-label={label}><button aria-label={`Less ${label.toLowerCase()}`} onClick={() => onChange(Math.max(min, round(value - step)))}>−</button><output aria-live="polite">{value}{unit && <small> {unit}</small>}</output><button aria-label={`More ${label.toLowerCase()}`} onClick={() => onChange(Math.min(max, round(value + step)))}>+</button></div>;
};

export function WhKiosk() {
  const s = useWhSim(); const now = useNow(s);
  const qs = new URLSearchParams(location.search); const demoStep = Number(qs.get("step") || 0);
  const [step, setStep] = useState(demoStep); const [f, setF] = useState<Form>(demoStep > 1 ? DEMO : EMPTY); const [field, setField] = useState<"driver" | "phone">("driver"); const [ticket, setTicket] = useState<Ticket | null>(null); const [typing, setTyping] = useState<Direction | null>(null); const [err, setErr] = useState("");
  const [idleLeft, setIdleLeft] = useState(IDLE_MS); const last = useRef(Date.now());
  const reset = () => { setStep(0); setF(EMPTY); setTicket(null); setField("driver"); setTyping(null); setErr(""); };
  useEffect(() => {
    const touch = () => { last.current = Date.now(); setIdleLeft(IDLE_MS); };
    window.addEventListener("pointerdown", touch); window.addEventListener("keydown", touch);
    const t = setInterval(() => { if (step === 0) return; const left = IDLE_MS - (Date.now() - last.current); setIdleLeft(left); if (left <= 0) reset(); }, 1000);
    return () => { window.removeEventListener("pointerdown", touch); window.removeEventListener("keydown", touch); clearInterval(t); };
  }, [step]);
  useEffect(() => { if (step === 7) { const t = setTimeout(reset, 25_000); return () => clearTimeout(t); } }, [step]);
  const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }));
  const setJob = (d: Direction, p: Partial<JobForm>) => setF((x) => ({ ...x, jobs: { ...x.jobs, [d]: { ...x.jobs[d], ...p } } }));
  const find = (d: Direction): Booking | undefined => s.bookings.find((b) => b.dir === d && b.ref.toLowerCase() === f.jobs[d].ref.toLowerCase());
  const inUse = (d: Direction) => { const b = find(d); return !!b && refInUse(s, b.ref, d); };
  const upcoming = (d: Direction) => s.bookings.filter((b) => b.dir === d && !refInUse(s, b.ref) && Math.abs(b.slot - now) <= 120).sort((a, b) => Math.abs(a.slot - now) - Math.abs(b.slot - now)).slice(0, 4);
  const pickBooking = (d: Direction, b: Booking) => setJob(d, { ref: b.ref, walkIn: false, load: b.load, pallets: b.pallets });
  /** A typed reference behaves like a tapped booking: as soon as it matches, the booking's load and pallets are copied in. */
  const typeRef = (d: Direction, k: string) => { const ref = applyKey(f.jobs[d].ref, k, 8); const b = s.bookings.find((x) => x.dir === d && x.ref.toLowerCase() === ref.toLowerCase()); if (b) pickBooking(d, b); else setJob(d, { ref }); };
  const pickClass = (cls: TruckClassId) => { const c = classOf(cls); set({ cls, height: c.height, cube: c.cube }); };
  const bookedCarrier = f.dirs.map((d) => find(d)?.carrier).find(Boolean);
  const jobOk = (d: Direction) => (f.jobs[d].walkIn ? true : !!find(d) && !inUse(d));
  const valid = [f.rego.replace(/\s/g, "").length >= 3, f.dirs.length > 0, f.height > 0 && f.cube > 0, f.dirs.every(jobOk), f.driver.trim().length >= 2 && f.phone.length >= 8 && (!!bookedCarrier || !!f.carrier), true][Math.min(step - 1, 5)] ?? true;
  const submit = () => {
    const r = actions.checkIn({ rego: f.rego, driver: f.driver, phone: f.phone, carrier: bookedCarrier ?? (f.carrier || "adhoc"), cls: f.cls, height: f.height, cube: f.cube, tailLift: f.tailLift, jobs: f.dirs.map((d) => ({ dir: d, ref: f.jobs[d].walkIn ? undefined : f.jobs[d].ref, load: f.jobs[d].load, pallets: f.jobs[d].pallets })) });
    if (r.ticket) { setTicket(r.ticket); setStep(7); setErr(""); } else setErr(r.error ?? "Could not check in");
  };
  const eta = ticket ? rank(getState(), simNow(getState())).find((r) => r.t.id === ticket.id) : null;
  const q = useMemo(() => rank(s, now), [s, now]);
  const effective = step === 7 && !ticket ? 0 : step;

  return (
    <div className="wh-kiosk" data-theme="dark">
      <div className="wh-kiosk__top"><div className="adm-brand"><Icon name="sparkle" size={30} /><span>Jupiter DC · Truck check-in</span></div><Link to="/wh/dock" className="jp-muted" style={{ fontSize: "var(--jp-fs-sm)" }}>Staff board</Link><div className="wh-kiosk__clock">{hhmm(now)}</div></div>
      {effective === 0 && (
        <div className="wh-attract">
          <Spot name="box" size={260} />
          <h1>Delivering or collecting?<br />Check in here.</h1>
          <p className="jp-muted">It takes about a minute. You’ll get a queue number and an estimated wait.</p>
          <button className="wh-btn wh-btn--primary wh-btn--big wh-attract__cta" onClick={() => { last.current = Date.now(); setStep(1); }}>Touch to start <Icon name="arrow-right" size={34} /></button>
          <p className="jp-muted">{q.length} trucks waiting · average wait {dur(q.reduce((a, r) => a + r.waited, 0) / Math.max(1, q.length))}</p>
        </div>
      )}
      {effective >= 1 && effective <= 6 && (
        <>
          <div className="wh-kiosk__main">
            <div className="wh-progress" aria-label={`Step ${step} of 6`}>{STEPS.map((x, i) => <i key={x} className={i < step ? "is-on" : ""} />)}</div>
            <h2 style={{ color: "var(--jp-accent)" }}>{step}. {STEPS[step - 1]}</h2>
            {step === 1 && <>
              <h1>What’s your registration?</h1>
              <div className="wh-field is-focus" aria-live="polite">{f.rego || <span className="jp-muted">e.g. 1AB 2CD</span>}<small>plate</small></div>
              <Keyboard onKey={(k) => set({ rego: applyKey(f.rego, k, 9) })} space />
            </>}
            {step === 2 && <>
              <h1>Why are you here today?</h1>
              <div className="wh-tiles">{PURPOSE.map((p) => <button key={p.label} className="wh-tile" aria-pressed={f.dirs.join() === p.v.join()} onClick={() => set({ dirs: p.v })}><Icon name={p.icon} size={44} />{p.label}<small>{p.hint}</small></button>)}</div>
            </>}
            {step === 3 && <>
              <h1>What are you driving?</h1>
              <div className="wh-tiles wh-tiles--sm">{TRUCK_CLASSES.map((c) => <button key={c.id} className="wh-tile" aria-pressed={f.cls === c.id} onClick={() => pickClass(c.id)}>{c.label}<small>{c.hint} · {c.height} m</small></button>)}</div>
              <div className="adm-row" style={{ gap: 48, alignItems: "flex-end" }}>
                <div><h2>Trailer height</h2><Stepper small label="Trailer height" value={f.height} min={1.5} max={5.5} step={0.1} unit="m" onChange={(v) => set({ height: v })} /></div>
                <div><h2>Cargo space</h2><Stepper small label="Cargo space" value={f.cube} min={5} max={300} step={5} unit="m³" onChange={(v) => set({ cube: v })} /></div>
              </div>
              <div className="wh-chips"><button className="wh-flag" aria-pressed={f.tailLift} onClick={() => set({ tailLift: !f.tailLift })}>My truck has a tail-lift (needs a ground-level bay)</button></div>
            </>}
            {step === 4 && <>
              <h1>Tell us about the load</h1>
              {f.dirs.map((d) => {
                const jf = f.jobs[d], b = find(d), used = inUse(d);
                return (
                  <section key={d} className="wh-job" aria-label={DIR_VERB[d].job}>
                    <header><h2>{DIR_VERB[d].job}</h2>{b && !jf.walkIn && <span className="wh-locked">{b.ref} <small>booked: {LOAD_LABEL[b.load]}, {b.pallets} pallets, {hhmm(b.slot)}</small><button className="wh-chip" onClick={() => setJob(d, { ref: "", load: "ambient", pallets: 12 })}>Change</button></span>}</header>
                    {!jf.walkIn && !b && <>
                      <p className="jp-muted">{d === "in" ? "Tap your booking, or type the reference." : "Tap your order, or type the reference."}</p>
                      <div className="wh-tiles wh-tiles--sm">{upcoming(d).map((x) => <button key={x.ref} className="wh-tile" onClick={() => pickBooking(d, x)}><span className="adm-num">{x.ref}</span><small>{hhmm(x.slot)} · {carrierOf(x.carrier).name} · {LOAD_LABEL[x.load]}</small></button>)}</div>
                      <button className="wh-field" style={{ textAlign: "left", fontSize: 34 }} onClick={() => setTyping(typing === d ? null : d)} aria-label="Reference">{jf.ref || <span className="jp-muted">{d === "in" ? "Booking ref (BK…)" : "Order ref (DS…)"}</span>}{jf.ref && !b && <small className="wh-error">not found</small>}</button>
                      {typing === d && <Keyboard onKey={(k) => typeRef(d, k)} />}
                    </>}
                    {used && <p className="wh-error" role="alert">{b?.ref} has already checked in. See the dock office if this is a mistake.</p>}
                    {b && !jf.walkIn && !used && <div><h2>Pallets on your truck</h2><Stepper small label="Pallets" value={jf.pallets} min={1} max={60} onChange={(v) => setJob(d, { pallets: v })} /></div>}
                    {jf.walkIn && <>
                      <p className="jp-muted">{d === "in" ? "No booking is fine. Walk-ins are called after booked trucks." : "Collections without an order are loaded by count and checked by staff."}</p>
                      <div className="wh-tiles wh-tiles--sm">{LOADS.map((l) => <button key={l.v} className="wh-tile" aria-pressed={jf.load === l.v} onClick={() => setJob(d, { load: l.v })}><Icon name={l.icon} size={36} />{LOAD_LABEL[l.v]}<small>{l.hint}</small></button>)}</div>
                      <div><h2>How many pallets?</h2><Stepper small label="Pallets" value={jf.pallets} min={1} max={60} onChange={(v) => setJob(d, { pallets: v })} /></div>
                    </>}
                    {!b && <button className="wh-btn wh-btn--sm" style={{ alignSelf: "flex-start" }} onClick={() => { setTyping(null); setJob(d, jf.walkIn ? { walkIn: false, ref: "" } : { walkIn: true, ref: "" }); }}>{jf.walkIn ? `← I have ${d === "in" ? "a booking" : "an order"}` : `I don’t have ${d === "in" ? "a booking" : "an order"}`}</button>}
                  </section>
                );
              })}
            </>}
            {step === 5 && <>
              <h1>Driver details</h1>
              <div className="adm-row" style={{ gap: 18, flexWrap: "nowrap" }}>
                <button className={`wh-field ${field === "driver" ? "is-focus" : ""}`} style={{ flex: 1, textAlign: "left", fontSize: "var(--jp-fs-xl)" }} onClick={() => setField("driver")} aria-label="Driver name">{f.driver || <span className="jp-muted">Your name</span>}<small>name</small></button>
                <button className={`wh-field ${field === "phone" ? "is-focus" : ""}`} style={{ flex: 1, textAlign: "left", fontSize: "var(--jp-fs-xl)" }} onClick={() => setField("phone")} aria-label="Mobile number">{f.phone || <span className="jp-muted">Mobile</span>}<small>mobile</small></button>
              </div>
              {!bookedCarrier && <><h2>Your company</h2><div className="wh-tiles wh-tiles--sm">{CARRIERS.map((c) => <button key={c.id} className="wh-tile" aria-pressed={f.carrier === c.id} onClick={() => set({ carrier: c.id })}>{c.name}</button>)}</div></>}
              {field === "driver" ? <Keyboard space onKey={(k) => set({ driver: applyKey(f.driver, k, 24) })} /> : <NumPad onKey={(k) => set({ phone: applyKey(f.phone, k, 12) })} />}
            </>}
            {step === 6 && <>
              <h1>Check your details</h1>
              <dl className="wh-review"><dt>Vehicle</dt><dd className="adm-num">{f.rego.toUpperCase()}</dd><dt>Truck</dt><dd>{classOf(f.cls).label} · {f.height} m · {f.cube} m³{f.tailLift ? " · tail-lift" : ""}</dd><dt>Company</dt><dd>{carrierOf(bookedCarrier ?? f.carrier).name}</dd>
                {f.dirs.map((d) => { const jf = f.jobs[d], b = find(d); return <div key={d} style={{ display: "contents" }}><dt>{DIR_VERB[d].job}</dt><dd>{b && !jf.walkIn ? `${b.ref} · slot ${hhmm(b.slot)} · ${LOAD_LABEL[b.load]}, ${jf.pallets} pallets` : `No ${d === "in" ? "booking" : "order"} · ${LOAD_LABEL[jf.load]}, ${jf.pallets} pallets`}</dd></div>; })}
                <dt>Driver</dt><dd>{f.driver} · {f.phone}</dd></dl>
              {err && <p className="wh-error" role="alert">{err}</p>}
            </>}
          </div>
          <div className="wh-kiosk__foot">
            <button className="wh-btn" onClick={() => setStep(step - 1)}>← Back</button>
            <button className="wh-btn" onClick={reset}>Cancel</button>
            <span className="adm-spacer" />
            {step < 6 ? <button className="wh-btn wh-btn--primary" disabled={!valid} onClick={() => { setTyping(null); setStep(step + 1); }}>Next →</button> : <button className="wh-btn wh-btn--primary wh-btn--big" onClick={submit}>Confirm check-in ✓</button>}
          </div>
        </>
      )}
      {effective === 7 && ticket && (
        <div className="wh-kiosk__main" style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <h1>You’re checked in</h1>
          <div className="wh-ticket" role="status"><div className="jp-muted">Your number</div><div className="wh-ticket__id">{ticket.id}</div>
            <dl><dt>Vehicle</dt><dd className="adm-num">{ticket.rego}</dd><dt>For</dt><dd>{ticket.jobs.map((j) => `${DIR_VERB[j.dir].job.toLowerCase()} (${LOAD_LABEL[j.load].toLowerCase()})`).join(" then ")}</dd>
              <dt>Queue position</dt><dd><b>{eta ? `#${eta.position}` : "—"}</b></dd>
              <dt>Estimated wait</dt><dd><b>{eta?.etaCall != null ? dur(eta.etaCall) : "waiting for a suitable dock"}</b></dd>
              {eta?.dockHint && <><dt>Likely dock</dt><dd><b>{s.docks.find((d) => d.id === eta.dockHint)?.name}</b></dd></>}
              {eta && eta.etaCall === null && eta.noFit.length > 0 && <><dt>Why</dt><dd>{eta.noFit[0]}. Please see the dock office.</dd></>}
              <dt>Track on your phone</dt><dd className="adm-num" style={{ fontSize: "var(--jp-fs-md)" }}>{location.host}/wh/ticket/{ticket.id}</dd></dl></div>
          <p className="jp-muted">Please wait in your cab. Your number will be called on the screen.</p>
          <button className="wh-btn wh-btn--primary" onClick={reset}>Done</button>
        </div>
      )}
      {step > 0 && step < 7 && idleLeft < WARN_MS && <div className="wh-idle" role="alert">Still there? Resetting in {Math.ceil(idleLeft / 1000)}s. Touch the screen to continue.</div>}
    </div>
  );
}
