import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import "./chrome.css";
import { Badge, Btn, ConfirmDelete, Modal, Tip } from "@belikh/jupiter-ui/kit.tsx";
import { Icon, Spot } from "@belikh/jupiter-ui/Icon.tsx";
import { useCan } from "./system.ts";
import { cooldownLeft, type Perm } from "./engine.ts";

/* ---------- permission-aware UI: disabled, hidden, or upsell (E015) ---------- */
export function Can({ perm, mode = "disable", upsell, children }: { perm: Perm; mode?: "disable" | "hide" | "upsell"; upsell?: string; children: ReactNode }) {
  const { allowed, reason } = useCan(perm); const [ask, setAsk] = useState(false);
  if (allowed) return <>{children}</>;
  if (mode === "hide") return null;
  return (
    <span className="adm-can">
      <Tip text={reason ?? "Not allowed"}><span className="adm-can__inner" inert aria-disabled="true">{children}</span></Tip>
      {mode === "upsell" && <><button className="adm-link adm-can__up" onClick={() => setAsk(true)}>Upgrade</button><Modal open={ask} onClose={() => setAsk(false)} size="sm" title="Unlock this feature" footer={<><Btn onClick={() => setAsk(false)}>Not now</Btn><Btn variant="primary" onClick={() => setAsk(false)}>See plans</Btn></>}><p>{upsell ?? "This is part of a higher plan."}</p><p className="jp-muted" style={{ marginTop: 8 }}>{reason}</p></Modal></>}
    </span>
  );
}

/* ---------- product tour + coachmarks (E014) ---------- */
export type TourStep = { target: string; title: string; body: string };
const SEEN = "adm-tour-seen";
export const tourSeen = () => { try { return localStorage.getItem(SEEN) === "1"; } catch { return false; } };
export const markTourSeen = (v = true) => { try { v ? localStorage.setItem(SEEN, "1") : localStorage.removeItem(SEEN); } catch { /* ignore */ } };
export function ProductTour({ steps, open, onClose, onDone }: { steps: TourStep[]; open: boolean; onClose: () => void; onDone?: () => void }) {
  const [i, setI] = useState(0); const [rect, setRect] = useState<DOMRect | null>(null); const card = useRef<HTMLDivElement>(null);
  const place = useCallback(() => { const el = document.querySelector(`[data-tour="${steps[i]?.target}"]`); if (el) { el.scrollIntoView?.({ block: "center", behavior: "auto" }); setRect(el.getBoundingClientRect()); } else setRect(null); }, [steps, i]);
  useEffect(() => { if (open) setI(0); }, [open]);
  useEffect(() => { if (!open) return; place(); window.addEventListener("resize", place); window.addEventListener("scroll", place, true); return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); }; }, [open, place]);
  useEffect(() => { if (open) card.current?.focus(); }, [open, i]);
  if (!open) return null; const s = steps[i]; const last = i === steps.length - 1;
  const finish = () => { markTourSeen(); onDone?.(); onClose(); };
  const key = (e: React.KeyboardEvent) => { if (e.key === "Escape") onClose(); else if (e.key === "ArrowRight") last ? finish() : setI(i + 1); else if (e.key === "ArrowLeft") setI(Math.max(0, i - 1)); };
  const below = rect ? rect.bottom + 12 + 190 < window.innerHeight : true;
  const style = rect ? { top: below ? rect.bottom + 12 : Math.max(8, rect.top - 12 - 170), left: Math.max(8, Math.min(window.innerWidth - 336, rect.left)) } : { top: "30%", left: "calc(50% - 160px)" };
  return (
    <div className="adm-tour" role="presentation">
      {rect && <div className="adm-tour__spot" style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }} />}{!rect && <div className="adm-tour__veil" />}
      <div ref={card} tabIndex={-1} className="adm-tour__card" role="dialog" aria-label={`Tour step ${i + 1} of ${steps.length}: ${s.title}`} style={style} onKeyDown={key}>
        <div className="adm-row" style={{ justifyContent: "space-between" }}><b>{s.title}</b><span className="jp-muted adm-num" style={{ fontSize: "var(--jp-fs-xs)" }}>{i + 1} / {steps.length}</span></div>
        <p>{s.body}</p>
        <div className="adm-row" style={{ justifyContent: "space-between" }}><button className="adm-link" onClick={onClose}>Skip tour</button><span className="adm-row"><Btn sm disabled={i === 0} onClick={() => setI(i - 1)}>Back</Btn><Btn sm variant="primary" onClick={() => (last ? finish() : setI(i + 1))}>{last ? "Done" : "Next"}</Btn></span></div>
      </div>
    </div>
  );
}
const COACH = "adm-coach-dismissed";
const dismissed = (): string[] => { try { return JSON.parse(localStorage.getItem(COACH) || "[]") as string[]; } catch { return []; } };
export function Coachmark({ id, text, children }: { id: string; text: string; children: ReactNode }) {
  const [gone, setGone] = useState(() => dismissed().includes(id)); const [open, setOpen] = useState(false);
  const dismiss = () => { setGone(true); try { localStorage.setItem(COACH, JSON.stringify([...dismissed(), id])); } catch { /* ignore */ } };
  return (
    <span className="adm-coachwrap">{children}
      {!gone && <button type="button" className="adm-coach" aria-label={`Hint: ${text}`} aria-expanded={open} onClick={() => setOpen(!open)} onMouseEnter={() => setOpen(true)}><i /></button>}
      {!gone && open && <span role="note" className="adm-coach__tip">{text} <button className="adm-link" onClick={dismiss}>Got it</button></span>}
    </span>
  );
}
export const resetCoachmarks = () => { try { localStorage.removeItem(COACH); } catch { /* ignore */ } };

/* ---------- wizard parts (E028) ---------- */
export type RailStep = { id: string; label: string; hint?: string; state: "done" | "current" | "todo" | "error" | "locked" };
export function StepRail({ steps, onSelect }: { steps: RailStep[]; onSelect?: (index: number) => void }) {
  return (
    <ol className="adm-rail" aria-label="Steps">
      {steps.map((s, i) => (
        <li key={s.id} className={`is-${s.state}`} aria-current={s.state === "current" ? "step" : undefined}>
          <button type="button" disabled={s.state === "locked" || s.state === "todo"} onClick={() => onSelect?.(i)}>
            <span className="adm-rail__n">{s.state === "done" ? <Icon name="check" size={12} /> : s.state === "error" ? "!" : s.state === "locked" ? <Icon name="lock" size={11} /> : i + 1}</span>
            <span><b>{s.label}</b>{s.hint && <small className="jp-muted">{s.hint}</small>}</span>
          </button>
        </li>))}
    </ol>
  );
}
export function ReviewSummary({ sections, onEdit }: { sections: { title: string; step: number; rows: [string, ReactNode][] }[]; onEdit?: (step: number) => void }) {
  return (
    <div className="adm-stack">{sections.map((s) => (
      <section key={s.title} className="adm-review"><header><b>{s.title}</b>{onEdit && <button className="adm-link" onClick={() => onEdit(s.step)} aria-label={`Edit ${s.title}`}>Edit</button>}</header>
        <dl className="adm-dl">{s.rows.map(([k, v]) => <div key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></section>))}</div>
  );
}
export function SuccessScreen({ title, body, steps, action, secondary, spot = "rocket" }: { title: string; body: string; steps?: string[]; action: ReactNode; secondary?: ReactNode; spot?: string }) {
  return (
    <div className="adm-success" role="status"><Spot name={spot} size={150} /><h2>{title}</h2><p className="jp-muted">{body}</p>
      {steps && <ol className="adm-success__steps">{steps.map((s, i) => <li key={s}><span className="adm-rail__n">{i + 1}</span>{s}</li>)}</ol>}<div className="adm-row" style={{ justifyContent: "center" }}>{action}{secondary}</div></div>
  );
}

/* ---------- danger zone, undo window, cooldown (E029) ---------- */
export type DangerAction = { id: string; title: string; description: string; button: string; confirmText?: string; cooldownMs?: number; run: () => void };
const useTick = (on: boolean, ms = 250) => { const [n, setN] = useState(() => Date.now()); useEffect(() => { if (!on) return; const t = setInterval(() => setN(Date.now()), ms); return () => clearInterval(t); }, [on, ms]); return n; };
export function DangerZone({ actions, defaultOpen = true }: { actions: DangerAction[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen); const [ask, setAsk] = useState<DangerAction | null>(null); const [last, setLast] = useState<Record<string, number>>({}); const [armedAt, setArmedAt] = useState<number | null>(null);
  const now = useTick(!!ask || Object.keys(last).length > 0); const ARM = 3000;
  const run = (a: DangerAction) => { a.run(); setLast((l) => ({ ...l, [a.id]: Date.now() })); setAsk(null); setArmedAt(null); };
  return (
    <section className="adm-danger-zone2" aria-label="Danger zone">
      <button className="adm-dz__head" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name="alert" size={16} /> Danger zone <Icon name={open ? "chevron-up" : "chevron-down"} size={14} /></button>
      {open && <ul>{actions.map((a) => { const cd = cooldownLeft(last[a.id] ?? null, a.cooldownMs ?? 0, now);
        return <li key={a.id}><div><b>{a.title}</b><p className="jp-muted">{a.description}</p></div><Btn className="adm-danger" variant="primary" disabled={cd > 0} onClick={() => { setAsk(a); setArmedAt(Date.now()); }}>{cd > 0 ? `Wait ${Math.ceil(cd / 1000)}s` : a.button}</Btn></li>; })}</ul>}
      {ask && (ask.confirmText
        ? <ConfirmDelete open onClose={() => setAsk(null)} what={ask.confirmText} onConfirm={() => run(ask)} />
        : <Modal open onClose={() => setAsk(null)} size="sm" title={ask.title} footer={<><Btn onClick={() => setAsk(null)}>Cancel</Btn><Btn variant="primary" className="adm-danger" disabled={armedAt !== null && now - armedAt < ARM} onClick={() => run(ask)}>{armedAt !== null && now - armedAt < ARM ? `Confirm in ${Math.ceil((ARM - (now - armedAt)) / 1000)}s` : ask.button}</Btn></>}><p>{ask.description}</p><p className="jp-muted" style={{ marginTop: 8 }}>The confirm button unlocks after a short pause so it can’t be hit by accident.</p></Modal>)}
    </section>
  );
}
/** Undo window: the action commits only after `ms`, unless undone. Render <UndoBar/> once. */
export type Pending = { id: number; label: string; ends: number; ms: number; commit: () => void; undo: () => void };
export function useUndoWindow() {
  const [pending, setPending] = useState<Pending | null>(null); const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined); const now = useTick(!!pending, 100);
  const finish = useCallback((p: Pending) => { p.commit(); setPending(null); }, []);
  const start = useCallback((label: string, commit: () => void, undo: () => void, ms = 6000) => {
    setPending((cur) => { if (cur) { clearTimeout(timer.current); cur.commit(); } const p: Pending = { id: Date.now(), label, ends: Date.now() + ms, ms, commit, undo }; timer.current = setTimeout(() => finish(p), ms); return p; });
  }, [finish]);
  const undo = useCallback(() => { clearTimeout(timer.current); setPending((p) => { p?.undo(); return null; }); }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return { pending, start, undo, now };
}
export function UndoBar({ pending, now, onUndo }: { pending: Pending | null; now: number; onUndo: () => void }) {
  if (!pending) return null; const left = Math.max(0, pending.ends - now);
  return <div className="adm-undobar" role="status" aria-live="polite"><span>{pending.label}</span><button className="adm-link" onClick={onUndo}>Undo ({Math.ceil(left / 1000)}s)</button><i style={{ width: `${(left / pending.ms) * 100}%` }} /></div>;
}
export { Badge };
