import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { Btn, Modal } from "./kit.tsx";

/* ---------- drafts: survive a reload, with a notice ---------- */
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string | null) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* storage unavailable */ } };
/** Form state that is saved to localStorage as you type. `restored` is true when a previous draft was loaded, so show a notice with a Discard button. */
export function useDraft<T>(key: string, initial: T) {
  const k = `jp-draft:${key}`; const [restored, setRestored] = useState(false);
  const [value, setValue] = useState<T>(() => { const raw = read(k); if (raw) { try { return JSON.parse(raw) as T; } catch { /* ignore */ } } return initial; });
  useEffect(() => { if (read(k)) setRestored(true); }, [k]);
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } const t = setTimeout(() => write(k, JSON.stringify(value)), 300); return () => clearTimeout(t); }, [k, value]);
  const clear = useCallback(() => { write(k, null); setRestored(false); }, [k]);
  const discard = useCallback(() => { clear(); setValue(initial); }, [clear]); // eslint-disable-line react-hooks/exhaustive-deps
  return { value, setValue, restored, clear, discard };
}

/* ---------- autosave: no Save button ---------- */
export type SaveStatus = "idle" | "saving" | "saved" | "error";
/** Calls `save(value)` shortly after the value stops changing. `save` returns null or an error string (or rejects). Skips the initial value. */
export function useAutosave<T>(value: T, save: (v: T) => Promise<string | null | void> | string | null | void, delay = 600) {
  const [status, setStatus] = useState<SaveStatus>("idle"); const [error, setError] = useState(""); const first = useRef(true); const saveRef = useRef(save); saveRef.current = save;
  const run = useCallback(async (v: T) => { setStatus("saving"); try { const r = await saveRef.current(v); if (typeof r === "string" && r) { setError(r); setStatus("error"); } else { setError(""); setStatus("saved"); } } catch (e) { setError(e instanceof Error ? e.message : "Couldn’t save"); setStatus("error"); } }, []);
  useEffect(() => { if (first.current) { first.current = false; return; } const t = setTimeout(() => void run(value), delay); return () => clearTimeout(t); }, [value, delay, run]);
  useEffect(() => { if (status === "saved") { const t = setTimeout(() => setStatus("idle"), 2000); return () => clearTimeout(t); } }, [status]);
  return { status, error, retry: () => void run(value) };
}
export function SaveStatusText({ status, error, onRetry }: { status: SaveStatus; error?: string; onRetry?: () => void }) {
  return <span className="jp-muted" role="status" aria-live="polite">{status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? <>{error || "Couldn’t save"} {onRetry && <button type="button" className="adm-link" onClick={onRetry}>Retry</button>}</> : ""}</span>;
}

/* ---------- unsaved-changes guard (works with BrowserRouter: intercepts in-app links and reloads) ---------- */
const guards = new Set<string>(); const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());
/** Mark this page as having unsaved changes while `dirty` is true. Pair with <UnsavedGuardHost/> (mounted once in the Shell). */
export function useUnsavedGuard(dirty: boolean) {
  const id = useRef(Math.random().toString(36).slice(2));
  useEffect(() => { if (dirty) guards.add(id.current); else guards.delete(id.current); notify(); return () => { guards.delete(id.current); notify(); }; }, [dirty]);
}
export const hasUnsaved = () => guards.size > 0;
export function UnsavedGuardHost() {
  const dirty = useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => guards.size > 0);
  const nav = useNavigate(); const [pending, setPending] = useState<string | null>(null);
  useEffect(() => {
    if (!dirty) return;
    const click = (e: MouseEvent) => { const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null; if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || a.target === "_blank" || a.origin !== location.origin) return; const to = a.pathname + a.search + a.hash; if (to === location.pathname + location.search + location.hash) return; e.preventDefault(); e.stopPropagation(); setPending(to); };
    const unload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    document.addEventListener("click", click, true); window.addEventListener("beforeunload", unload);
    return () => { document.removeEventListener("click", click, true); window.removeEventListener("beforeunload", unload); };
  }, [dirty]);
  return (
    <Modal open={pending !== null} onClose={() => setPending(null)} size="sm" title="Leave without saving?"
      footer={<><Btn variant="ghost" onClick={() => setPending(null)}>Stay</Btn><Btn variant="primary" onClick={() => { const to = pending!; guards.clear(); notify(); setPending(null); nav(to); }}>Leave</Btn></>}>
      You have unsaved changes on this page. If you leave now they will be lost.
    </Modal>
  );
}

/* ---------- date shortcuts: "tomorrow", "+3d", "next mon", "in 2 weeks" ---------- */
const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const iso = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
/** Turn a typed shortcut into an ISO date (YYYY-MM-DD), or null if it isn't one. `now` is injectable for tests. */
export function parseDateShortcut(text: string, now = new Date()): string | null {
  const t = text.trim().toLowerCase(); if (!t) return null; const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); const add = (n: number) => { const d = new Date(base); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t; if (t === "today" || t === "now") return add(0); if (t === "tomorrow" || t === "tmrw") return add(1); if (t === "yesterday") return add(-1);
  const rel = /^(?:in\s+|\+)(\d+)\s*(d|day|days|w|wk|week|weeks|m|mo|month|months)$/.exec(t) ?? /^(\d+)\s*(d|day|days|w|week|weeks)\s+(?:from now|ahead)$/.exec(t);
  if (rel) { const n = Number(rel[1]); const u = rel[2][0]; if (u === "m") { const d = new Date(base); d.setUTCMonth(d.getUTCMonth() + n); return iso(d); } return add(u === "w" ? n * 7 : n); }
  const neg = /^-(\d+)\s*(d|day|days|w|week|weeks)$/.exec(t); if (neg) return add(-Number(neg[1]) * (neg[2][0] === "w" ? 7 : 1));
  const wd = /^(?:next\s+|this\s+|on\s+)?(sun|mon|tue|wed|thu|fri|sat)[a-z]*$/.exec(t); if (wd) { const diff = (DAYS.indexOf(wd[1]) - base.getUTCDay() + 7) % 7; return add(diff === 0 ? 7 : diff); } // the next such weekday after today
  return null;
}

/* ---------- paste-to-fill: paste "Label: value" lines or a tab-separated row anywhere in a form ---------- */
/** Parse pasted text into label/value pairs ("Name: Ava" lines) or, for a single tab-separated line, positional values. */
export function parsePasted(text: string): { pairs: [string, string][]; positional: string[] } {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean); const pairs: [string, string][] = [];
  for (const l of lines) { const m = /^([^:\t=]{1,40})\s*[:=]\s*(.*)$/.exec(l); if (m) pairs.push([m[1].trim(), m[2].trim()]); }
  return { pairs: pairs.length >= 2 || (pairs.length === 1 && lines.length === 1) ? pairs : [], positional: lines.length === 1 && lines[0].includes("\t") ? lines[0].split("\t").map((x) => x.trim()) : [] };
}
const setNative = (el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, v: string) => { const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, v); el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true })); };
/**
 * Make any form accept pasted data. Fields are matched by their visible label (case-insensitive); a tab-separated line fills fields in order.
 * Returns the number of fields filled via `onFilled`. Pasting into a text field that is not the first target is left alone for single values.
 */
export function usePasteFill(ref: { current: HTMLElement | null }, onFilled?: (n: number, skipped: string[]) => void) {
  useEffect(() => {
    const root = ref.current; if (!root) return;
    const handler = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("text") ?? ""; const { pairs, positional } = parsePasted(text); if (!pairs.length && positional.length < 2) return;
      const fields = [...root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input:not([type=checkbox]):not([type=radio]):not([type=hidden]), textarea, select")].filter((el) => !el.disabled && !("readOnly" in el && el.readOnly));
      const labelOf = (el: HTMLElement) => (el.id ? root.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent : null) ?? el.getAttribute("aria-label") ?? ""; let n = 0; const skipped: string[] = [];
      if (pairs.length) for (const [k, v] of pairs) { const el = fields.find((f) => labelOf(f).replace(/\s*\*$/, "").trim().toLowerCase() === k.toLowerCase()); if (el) { setNative(el, v); n++; } else skipped.push(k); }
      else positional.forEach((v, i) => { if (fields[i]) { setNative(fields[i], v); n++; } });
      if (n) { e.preventDefault(); onFilled?.(n, skipped); }
    };
    root.addEventListener("paste", handler); return () => root.removeEventListener("paste", handler);
  }, [ref, onFilled]);
}

/* ---------- validate on blur, summarise on submit ---------- */
export type Rules<V> = { [K in keyof V]?: (value: V[K], all: V) => string | null | undefined };
/** Errors appear for a field once it has been blurred (or after a submit attempt); `summary` lists every error after a submit attempt. */
export function useFieldErrors<V extends Record<string, unknown>>(values: V, rules: Rules<V>) {
  const [touched, setTouched] = useState<Record<string, boolean>>({}); const [submitted, setSubmitted] = useState(false);
  const all = (Object.keys(rules) as (keyof V)[]).reduce<Partial<Record<keyof V, string>>>((acc, k) => { const m = rules[k]?.(values[k], values); if (m) acc[k] = m; return acc; }, {});
  return {
    errors: all, valid: Object.keys(all).length === 0,
    error: (k: keyof V) => (touched[k as string] || submitted ? all[k] : undefined),
    blur: (k: keyof V) => setTouched((t) => (t[k as string] ? t : { ...t, [k as string]: true })),
    /** Call on submit. Returns true when valid; otherwise reveals every error and returns the first failing key. */
    submit: (): true | keyof V => { setSubmitted(true); const first = Object.keys(all)[0] as keyof V | undefined; return first ?? true; },
    summary: submitted ? (Object.entries(all) as [keyof V, string][]) : [], reset: () => { setTouched({}); setSubmitted(false); },
  };
}
export function FormSummary({ items, onJump }: { items: [string, string][]; onJump?: (key: string) => void }) {
  if (!items.length) return null;
  return <div className="adm-alert adm-alert--danger" role="alert" aria-label="Form errors"><strong>{items.length} {items.length === 1 ? "problem" : "problems"} to fix</strong><ul>{items.map(([k, m]) => <li key={k}>{onJump ? <button type="button" className="adm-link" onClick={() => onJump(k)}>{m}</button> : m}</li>)}</ul></div>;
}

/** "Same as above": checking it copies the source values; unchecking leaves them for editing. */
export function SameAsAbove({ label = "Same as above", checked, onChange }: { label?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="adm-check"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /><span>{label}</span></label>;
}
