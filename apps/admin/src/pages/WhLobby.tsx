import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../warehouse/wh.css";
import { useWhSim } from "../warehouse/store.ts";
import { DIR_VERB, LOAD_LABEL, TIMING, carrierOf, dur, hhmm, jobOf, mmss, rank, tally } from "../warehouse/engine.ts";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";
import { DirTag, STAGE_TONE, dockLabel, useNow } from "../warehouse/ui.tsx";

const NOTICES = [["alert", "Speed limit 10 km/h on site. Pedestrians have right of way."], ["shield", "Hi-vis, safety boots and a hard hat are required outside your cab."], ["clock", "Canteen open 06:00–14:00. Please keep clear of the loading apron."], ["info", "Stay near your cab. If you miss your call, see the dock office to be put back in the queue."]];
const AT_DOCK_NOW = ["onDock", "accepted", "working", "complete", "cleared"] as const;

export function WhLobby() {
  const s = useWhSim(); const now = useNow(s); const q = rank(s, now);
  const called = s.tickets.filter((t) => t.status === "called").sort((a, b) => (b.calledAt ?? 0) - (a.calledAt ?? 0));
  const atDock = s.tickets.filter((t) => (AT_DOCK_NOW as readonly string[]).includes(t.status)).sort((a, b) => (a.dock ?? 0) - (b.dock ?? 0));
  const [n, setN] = useState(0); const seen = useRef<Set<string>>(new Set()); const [fresh, setFresh] = useState<Set<string>>(new Set());
  useEffect(() => { const t = setInterval(() => setN((x) => (x + 1) % NOTICES.length), 8000); return () => clearInterval(t); }, []);
  useEffect(() => { const add = called.filter((c) => !seen.current.has(c.id)).map((c) => c.id); if (add.length) { add.forEach((id) => seen.current.add(id)); setFresh(new Set(add)); const t = setTimeout(() => setFresh(new Set()), 7000); return () => clearTimeout(t); } }, [called.map((c) => c.id).join()]);
  return (
    <div className="wh-lobby" data-theme="dark">
      <header><Icon name="sparkle" size={40} /><h1>Dock activity</h1><span className="jp-muted">{q.length} waiting · {atDock.length} at docks</span><Link to="/wh/dock" className="jp-muted" style={{ fontSize: "var(--jp-fs-sm)" }}>Staff board</Link><div className="wh-lobby__clock">{hhmm(now)}</div></header>
      <section aria-label="Now calling">
        <h2 style={{ marginBottom: 14 }}>Now calling</h2>
        {called.length === 0 ? <div className="wh-notice"><Icon name="check" size={32} /><span>No trucks are being called right now.</span></div> : called.map((t) => (
          <div key={t.id} className={`wh-call ${fresh.has(t.id) ? "is-new" : ""}`} data-tone="warn" aria-live="assertive"><div className="wh-call__id">{t.id}</div><div><b style={{ fontSize: "var(--jp-fs-xl)" }}>{t.rego}</b><div className="jp-muted">{carrierOf(t.carrier).name} · {DIR_VERB[jobOf(t).dir].job.toLowerCase()}</div></div><div className="wh-call__dock">{dockLabel(s, t.dock).replace("Dock ", "Dock ")}<small>reverse in · {mmss(TIMING.approach - (now - t.since))}</small></div></div>))}
        {atDock.length > 0 && <><h2 style={{ margin: "24px 0 10px" }}>At the docks</h2>{atDock.map((t) => { const j = jobOf(t), tl = tally(j); const word = t.status === "working" ? `${DIR_VERB[j.dir].work} ${tl.handled + tl.missing}/${j.blind ? j.declared : j.lines.length}` : t.status === "cleared" ? "Cleared to go" : t.status === "complete" ? (j.outcome === "rejected" ? "Rejected" : "Being checked") : t.status === "accepted" ? "Accepted" : "Checking in";
          return <div key={t.id} className="wh-qrow" data-tone={STAGE_TONE[t.status]} style={{ gridTemplateColumns: "auto 1fr auto auto" }}><b>{t.id}</b><span>{t.rego} · {carrierOf(t.carrier).name}</span><span style={{ color: "var(--tone)", fontWeight: 700 }}>{word}</span><span className="adm-num jp-muted">{dockLabel(s, t.dock)}</span></div>; })}</>}
      </section>
      <section aria-label="Up next">
        <h2 style={{ marginBottom: 6 }}>Up next</h2>
        {q.slice(0, 8).map((r) => (
          <div key={r.t.id} className="wh-qrow"><span className="wh-qpos">{r.position}</span><b>{r.t.id}</b><span><span style={{ fontWeight: 700 }}>{r.t.rego}</span> <span className="jp-muted" style={{ fontSize: "var(--jp-fs-md)" }}>· {LOAD_LABEL[jobOf(r.t).load]}</span> <DirTag d={jobOf(r.t).dir} /></span><span className="adm-num" style={{ textAlign: "right" }}>{r.etaCall === null ? "see office" : r.etaCall < 1 ? "next" : `~${dur(r.etaCall)}`}</span></div>))}
        {q.length > 8 && <p className="jp-muted" style={{ marginTop: 10 }}>+ {q.length - 8} more in the queue</p>}
        {q.length === 0 && <p className="jp-muted" style={{ marginTop: 16 }}>No one waiting. Check in at the kiosk by the door.</p>}
      </section>
      <div className="wh-notice" aria-live="off"><Icon name={NOTICES[n][0]} size={34} /><span>{NOTICES[n][1]}</span></div>
    </div>
  );
}
