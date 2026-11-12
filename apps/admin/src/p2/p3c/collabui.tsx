import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, Badge, Btn, Dot, Modal } from "@belikh/jupiter-ui/kit.tsx";
import { Segmented } from "@belikh/jupiter-ui/inputs.tsx";
import { PEOPLE, acquire, cursorAt, initials, lockStatus, openCount, release, renew, threads, type Comment, type Lock, type Person } from "./collab.ts";
import { Note, Row, Stack, useReducedMotion } from "./ui.tsx";

const COLOUR = (hue: number) => `var(--adm-c${hue})`;
/** A ticking clock for simulations; `step` ms, frozen when `paused`. */
function useClock(step: number, paused = false, start = 0) { const [t, setT] = useState(start); useEffect(() => { if (paused) return; const i = window.setInterval(() => setT((x) => x + step), step); return () => window.clearInterval(i); }, [step, paused]); return t; }

/* ---------------- F012 presence avatars ---------------- */
export function PresenceBar({ initial = PEOPLE }: { initial?: Person[] }) {
  const [people, setPeople] = useState<Person[]>(initial); const online = people.filter((p) => p.status !== "away");
  const join = () => { const next = PEOPLE.find((p) => !people.some((x) => x.id === p.id)); if (next) setPeople([...people, { ...next, status: "active" }]); };
  return (
    <Stack>
      <Row>
        <ul className="p3-presence" aria-label={`${online.length} people here`}>{people.map((p) => <li key={p.id} className={`is-${p.status}`} title={`${p.name}: ${p.doing}`}><span className="p3-presence__ring" style={{ borderColor: COLOUR(p.hue) }}><Avatar name={p.name} size={32} /></span><span className="p3-sr">{p.name}, {p.status}, {p.doing}</span><span className={`p3-presence__dot is-${p.status}`} aria-hidden /></li>)}</ul>
        <span className="p3-note" role="status">{online.length} viewing now</span>
        <Btn sm onClick={join} disabled={people.length >= PEOPLE.length}>Simulate join</Btn><Btn sm variant="ghost" onClick={() => setPeople(people.slice(0, -1))} disabled={!people.length}>Simulate leave</Btn>
      </Row>
      <details className="p3-details"><summary>Who is here</summary><ul className="p3-whois">{people.map((p) => <li key={p.id}><Dot s={p.status === "active" ? "ok" : p.status === "idle" ? "warn" : "off"} /> <b>{p.name}</b> <span className="p3-note">{p.doing}</span></li>)}</ul></details>
    </Stack>
  );
}

/* ---------------- F012 live cursors ---------------- */
export function LiveCursors() {
  const reduce = useReducedMotion(); const [paused, setPaused] = useState(false); const t = useClock(reduce ? 2000 : 120, paused); const [mine, setMine] = useState({ x: 20, y: 30 }); const surf = useRef<HTMLDivElement>(null);
  const active = PEOPLE.filter((p) => p.status !== "away");
  return (
    <Stack>
      <div className="p3-surface" ref={surf} onPointerMove={(e) => { const r = surf.current!.getBoundingClientRect(); setMine({ x: ((e.clientX - r.left) / (r.width || 1)) * 100, y: ((e.clientY - r.top) / (r.height || 1)) * 100 }); }}>
        <div className="p3-surface__doc"><h3>Quarterly plan</h3><p>Move your pointer over this surface; collaborators' cursors drift around in real time (simulated).</p><div className="p3-surface__cards"><span>Goals</span><span>Budget</span><span>Risks</span></div></div>
        {active.map((p, i) => { const c = cursorAt(PEOPLE.indexOf(p), t + i * 1500); return <span key={p.id} className="p3-cursor" aria-hidden style={{ insetInlineStart: `${c.x}%`, insetBlockStart: `${c.y}%`, color: COLOUR(p.hue), transition: reduce ? "none" : undefined }}><svg viewBox="0 0 16 16" width="16" height="16"><path d="M1 1l5 13 2-5 5-2z" /></svg><b>{p.name.split(" ")[0]}</b></span>; })}
        <span className="p3-cursor p3-cursor--me" aria-hidden style={{ insetInlineStart: `${mine.x}%`, insetBlockStart: `${mine.y}%` }}><svg viewBox="0 0 16 16" width="16" height="16"><path d="M1 1l5 13 2-5 5-2z" /></svg><b>You</b></span>
      </div>
      <Row><Btn sm onClick={() => setPaused(!paused)} aria-pressed={paused}>{paused ? "Resume simulation" : "Pause simulation"}</Btn><span className="p3-note">{active.map((p) => p.name.split(" ")[0]).join(", ")} {active.length === 1 ? "is" : "are"} here. {reduce ? "Reduced motion: cursors update every two seconds." : ""}</span></Row>
    </Stack>
  );
}

/* ---------------- F012 record locks ---------------- */
type Rec = { id: string; title: string; lock: Lock; value: string };
const ME = "me";
export function RecordLocks({ tick = 1000 }: { tick?: number }) {
  const [now, setNow] = useState(() => Date.now()); useEffect(() => { const i = window.setInterval(() => setNow(Date.now()), tick); return () => window.clearInterval(i); }, [tick]);
  const [recs, setRecs] = useState<Rec[]>(() => { const n = Date.now(); return [{ id: "INV-1042", title: "Invoice INV-1042", lock: { by: "Ben Ortiz", since: n, expires: n + 45000 }, value: "Net 30" }, { id: "INV-1043", title: "Invoice INV-1043", lock: null, value: "Net 14" }, { id: "INV-1044", title: "Invoice INV-1044", lock: { by: "Cleo Park", since: n, expires: n + 8000 }, value: "Net 30" }]; });
  const [takeover, setTakeover] = useState<string | null>(null); const [msg, setMsg] = useState("");
  const set = (id: string, fn: (r: Rec) => Rec) => setRecs((x) => x.map((r) => (r.id === id ? fn(r) : r)));
  const take = (id: string, force = false) => { const r = recs.find((x) => x.id === id)!; const res = acquire(r.lock, Date.now(), ME, force); if (!res.ok) { setMsg(`${res.reason}. Try again when it is released.`); return; } set(id, (x) => ({ ...x, lock: res.lock })); setMsg(`You now hold ${id}. The lock lasts 60 seconds and renews while you edit.`); };
  return (
    <Stack>
      <ul className="p3-locks" aria-label="Records">
        {recs.map((r) => { const st = lockStatus(r.lock, now, ME); return (
          <li key={r.id} className={`p3-lock is-${st.kind}`}>
            <div className="p3-lock__h"><b>{r.title}</b>{st.kind === "free" && <Badge s="ok">Available</Badge>}{st.kind === "mine" && <Badge s="info">Editing: you · {st.secondsLeft}s</Badge>}{st.kind === "other" && <Badge s="warn">Locked by {st.by} · {st.secondsLeft}s</Badge>}</div>
            <label className="p3-field"><span className="jp-label">Payment terms</span><input className="jp-input" value={r.value} readOnly={st.kind !== "mine"} aria-readonly={st.kind !== "mine"} onChange={(e) => { set(r.id, (x) => ({ ...x, value: e.target.value, lock: renew(x.lock, Date.now(), ME) })); }} /></label>
            <Row>{st.kind === "free" && <Btn sm variant="primary" onClick={() => take(r.id)}>Edit</Btn>}{st.kind === "mine" && <><Btn sm onClick={() => { set(r.id, (x) => ({ ...x, lock: release(x.lock, ME) })); setMsg(`Released ${r.id}.`); }}>Save and release</Btn></>}{st.kind === "other" && <><Btn sm disabled aria-disabled>Read only</Btn><Btn sm variant="ghost" onClick={() => setTakeover(r.id)}>Take over</Btn></>}</Row>
          </li>); })}
      </ul>
      <p className="p3-note" role="status">{msg || "Locks expire after 60 seconds without edits."}</p>
      <Modal open={!!takeover} onClose={() => setTakeover(null)} title="Take over this record?" footer={<><Btn variant="ghost" onClick={() => setTakeover(null)}>Cancel</Btn><Btn variant="primary" onClick={() => { take(takeover!, true); setTakeover(null); }}>Take over</Btn></>}>
        <p>{recs.find((r) => r.id === takeover)?.lock?.by} is editing it. Taking over will end their session and they may lose unsaved changes.</p></Modal>
    </Stack>
  );
}

/* ---------------- F012 comments on anything ---------------- */
const TARGETS = [{ id: "t-heading", label: "Pricing heading", body: <h3 className="p3-ct__h">Pricing</h3> }, { id: "t-stat", label: "Revenue tile", body: <p className="p3-ct__stat"><b>$84.2k</b> revenue this month</p> }, { id: "t-image", label: "Hero image", body: <svg viewBox="0 0 160 60" className="p3-ct__img" role="img" aria-label="Placeholder hero image"><rect width="160" height="60" fill="var(--adm-c3)" opacity=".4" /><circle cx="40" cy="30" r="14" fill="var(--adm-c2)" /></svg> }];
export function CommentsDemo({ autoReply = true, delay = 1400 }: { autoReply?: boolean; delay?: number }) {
  const [cs, setCs] = useState<Comment[]>([{ id: 1, target: "t-stat", author: "Cleo Park", text: "Does this include refunds?", at: "09:12", resolved: false }, { id: 2, target: "t-stat", author: "Me", text: "Yes, net of refunds.", at: "09:14", resolved: false, parent: 1 }]); const [target, setTarget] = useState<string | null>(null); const [text, setText] = useState(""); const [show, setShow] = useState<"open" | "resolved" | "all">("open"); const id = useRef(2); const [replyTo, setReplyTo] = useState<number | null>(null); const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const add = () => { const t = text.trim(); if (!t || !target) return; const c: Comment = { id: ++id.current, target: replyTo ? cs.find((x) => x.id === replyTo)!.target : target, author: "Me", text: t, at: new Date().toISOString().slice(11, 16), resolved: false, parent: replyTo ?? undefined }; setCs((x) => [...x, c]); setText(""); const root = replyTo ?? c.id; setReplyTo(null);
    if (autoReply) timers.current.push(window.setTimeout(() => setCs((x) => [...x, { id: ++id.current, target: c.target, author: "Ben Ortiz", text: "Thanks, noted.", at: new Date().toISOString().slice(11, 16), resolved: false, parent: root }]), delay)); };
  const list = useMemo(() => threads(cs, undefined, show), [cs, show]); const label = (id: string) => TARGETS.find((t) => t.id === id)?.label ?? id;
  return (
    <Stack>
      <div className="p3-ctargets">{TARGETS.map((t) => <div key={t.id} className={`p3-ct ${target === t.id ? "is-on" : ""}`}>{t.body}<Btn sm variant="ghost" icon="chat" aria-label={`Comment on ${t.label}${openCount(cs, t.id) ? `, ${openCount(cs, t.id)} open` : ""}`} onClick={() => { setTarget(t.id); setReplyTo(null); }}>{openCount(cs, t.id) || "+"}</Btn></div>)}</div>
      <Row><Segmented label="Show comments" value={show} onChange={setShow} options={[{ value: "open", label: "Open" }, { value: "resolved", label: "Resolved" }, { value: "all", label: "All" }]} /><span className="p3-note">{cs.filter((c) => !c.parent && !c.resolved).length} open threads</span></Row>
      <ul className="p3-threads" aria-label="Comment threads">{list.map(({ root, replies }) => (
        <li key={root.id} className={root.resolved ? "is-resolved" : ""}><p className="p3-note">On <b>{label(root.target)}</b></p>
          {[root, ...replies].map((c) => <p key={c.id} className="p3-cmt"><span className="p3-cmt__av" aria-hidden>{initials(c.author)}</span><span><b>{c.author}</b> <span className="p3-note">{c.at}</span><br />{c.text}</span></p>)}
          <Row><Btn sm variant="ghost" onClick={() => { setTarget(root.target); setReplyTo(root.id); }}>Reply</Btn><Btn sm variant="ghost" onClick={() => setCs(cs.map((c) => (c.id === root.id ? { ...c, resolved: !c.resolved } : c)))}>{root.resolved ? "Reopen" : "Resolve"}</Btn>{root.author === "Me" && <Btn sm variant="ghost" onClick={() => setCs(cs.filter((c) => c.id !== root.id && c.parent !== root.id))}>Delete thread</Btn>}</Row></li>))}
        {!list.length && <li className="p3-note">No {show === "all" ? "" : show} comments.</li>}</ul>
      {target && <form className="p3-composer" onSubmit={(e) => { e.preventDefault(); add(); }}><label className="p3-field p3-grow"><span className="jp-label">{replyTo ? "Reply" : `Comment on ${label(target)}`}</span><input className="jp-input" value={text} onChange={(e) => setText(e.target.value)} autoFocus /></label><Btn variant="primary" type="submit" disabled={!text.trim()}>Post</Btn><Btn type="button" variant="ghost" onClick={() => { setTarget(null); setReplyTo(null); setText(""); }}>Cancel</Btn></form>}
      <Note>Use the comment button beside any block to start a thread. Ben replies shortly after you post (simulated).</Note>
    </Stack>
  );
}
