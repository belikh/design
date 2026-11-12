import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Avatar, Badge, type Status } from "./kit.tsx";
import { Combobox } from "./inputs.tsx";
import { Icon } from "./Icon.tsx";
import "./editable.css";
import { usePrefsOptional } from "./store.tsx";
import { parseDateShortcut } from "./forms.tsx";
import { pushUndo } from "./undo.ts";

/**
 * Edit-in-place. One primitive for every editable value in the template (detail fields, table cells, cards, settings).
 *
 * - Activate: click the value (or its pencil), Enter or F2 on it. Esc cancels. Tab commits and moves to the next editable.
 * - Commit mode: "blur" (commit when focus leaves, or Enter) or "explicit" (Save / Cancel buttons; blur keeps the draft).
 *   The default comes from the user's Settings → Appearance preference (usePrefs().editCommit); pass `commit` to force one.
 * - Validation runs as you type; an invalid draft cannot commit and shows its message (role="alert").
 * - Saving is optimistic: the new value shows immediately; if `onSave` rejects (or returns an error string) it rolls back.
 *   A saved tick confirms, and an Undo toast restores the previous value.
 * - Booleans are single-click switches with no edit mode.
 */
export type Option = { value: string; label: string; s?: Status };
export type EditorSpec =
  | { type: "text"; placeholder?: string; maxLength?: number; /** Show as an avatar + name (people). */ avatar?: boolean }
  | { type: "textarea"; rows?: number; maxLength?: number }
  | { type: "number"; min?: number; max?: number; step?: number; unit?: string; fmt?: (v: number) => string; /** ISO currency code, e.g. "AUD": shown as money. */ currency?: string }
  | { type: "select"; options: Option[] }
  | { type: "date"; /** Show "in 3 days" instead of the ISO date (the date is in the tooltip). Default true. */ relative?: boolean }
  | { type: "tags"; options?: string[]; creatable?: boolean }
  | { type: "boolean"; onLabel?: string; offLabel?: string };
export type HistoryEntry = { who: string; at: string | Date; from: string; to: string };
/** Passed to onSave. `undo` is true when the save is an undo or redo, which should apply on top of the latest row (not conflict with your own earlier edit). */
export type SaveMeta = { undo: boolean };
export type EditValue = string | number | boolean | string[];
/** Return an error message to block the edit, or null/undefined when valid. */
export type Validate = (v: EditValue) => string | null | undefined;
export type CommitMode = "blur" | "explicit";
/** "none" = no auto-commit and no buttons: the host (e.g. the bulk-edit panel) reads the draft through `onDraft` and commits itself. */
export type EditorMode = CommitMode | "none";

export const isEmpty = (v: EditValue | undefined | null) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
export const sameValue = (a: EditValue | undefined, b: EditValue | undefined) => (Array.isArray(a) && Array.isArray(b) ? a.length === b.length && a.every((x, i) => x === b[i]) : a === b);

/** Parse the draft the user typed into the typed value for the editor (numbers become numbers). */
export function coerce(spec: EditorSpec, raw: EditValue): EditValue | typeof INVALID {
  if (spec.type === "number") { if (typeof raw === "number") return raw; const t = String(raw).replace(/[,\s$]/g, ""); if (t === "") return INVALID; const n = Number(t); return Number.isFinite(n) ? n : INVALID; }
  if (spec.type === "date") { const t = String(raw).trim(); return t === "" ? "" : parseDateShortcut(t) ?? INVALID; } // accepts 2026-12-31, tomorrow, +3d, next mon
  return raw;
}
export const INVALID = Symbol("invalid");
/** Format-as-you-type for numbers: keeps digits, one decimal point and a leading minus, and groups thousands ("1234567.5" becomes "1,234,567.5"). */
export function groupDigits(raw: string): string {
  const neg = raw.trim().startsWith("-"); const clean = raw.replace(/[^\d.]/g, ""); const [int = "", ...rest] = clean.split("."); const grouped = int.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (neg ? "-" : "") + grouped + (rest.length ? "." + rest.join("") : "");
}

/** Built-in validation for a spec (min/max, length, option membership) combined with a caller's own rule. */
export function validateSpec(spec: EditorSpec, raw: EditValue, custom?: Validate): string | null {
  const v = coerce(spec, raw);
  if (v === INVALID) return spec.type === "date" ? "Enter a date like 2026-12-31, tomorrow or +3d" : "Enter a number";
  if (spec.type === "number") { if (spec.min !== undefined && (v as number) < spec.min) return `Must be at least ${spec.min}`; if (spec.max !== undefined && (v as number) > spec.max) return `Must be at most ${spec.max}`; }
  if ((spec.type === "text" || spec.type === "textarea") && spec.maxLength !== undefined && String(v).length > spec.maxLength) return `Max ${spec.maxLength} characters`;
  if (spec.type === "select" && !spec.options.some((o) => o.value === v)) return "Choose one of the options";
  return custom?.(v) ?? null;
}

export function formatValue(spec: EditorSpec, v: EditValue | undefined): string {
  if (isEmpty(v)) return "";
  if (spec.type === "number") { const n = Number(v); const base = spec.fmt ? spec.fmt(n) : spec.currency ? new Intl.NumberFormat("en-AU", { style: "currency", currency: spec.currency }).format(n) : String(n); return spec.unit ? `${base} ${spec.unit}` : base; }
  if (spec.type === "select") return spec.options.find((o) => o.value === v)?.label ?? String(v);
  if (spec.type === "tags") return (v as string[]).join(", ");
  if (spec.type === "boolean") return v ? "Yes" : "No";
  return String(v);
}
/** "in 3 days", "yesterday", "2 months ago" for an ISO date (UTC midnight compared with `now`). */
export function relativeDate(iso: string, now = new Date()): string {
  const d = new Date(iso + "T00:00:00Z"); if (Number.isNaN(d.getTime())) return iso;
  const days = Math.round((d.getTime() - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) / 86400000); const f = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const a = Math.abs(days); return a >= 365 ? f.format(Math.round(days / 365), "year") : a >= 60 ? f.format(Math.round(days / 30), "month") : a >= 14 ? f.format(Math.round(days / 7), "week") : f.format(days, "day");
}
export const defaultDisplay = (spec: EditorSpec, v: EditValue | undefined, empty = "Empty"): ReactNode => {
  if (isEmpty(v)) return <span className="jp-muted adm-editable__empty">{empty}</span>;
  if (spec.type === "date" && spec.relative !== false) return <time dateTime={String(v)} title={String(v)}>{relativeDate(String(v))}</time>;
  if (spec.type === "text" && spec.avatar) return <span className="adm-row" style={{ gap: 6 }}><Avatar name={String(v)} size={20} />{String(v)}</span>;
  if (spec.type === "select") { const o = spec.options.find((x) => x.value === v); return o ? (o.s ? <Badge s={o.s}>{o.label}</Badge> : o.label) : <span className="jp-muted">{formatValue(spec, v) || empty}</span>; }
  if (spec.type === "tags") return <span className="adm-row" style={{ gap: 4 }}>{(v as string[]).map((t) => <Badge key={t}>{t}</Badge>)}</span>;
  const s = formatValue(spec, v); return s ? s : <span className="jp-muted">{empty}</span>;
};

type FieldEditorProps = { spec: EditorSpec; value: EditValue | undefined; label: string; mode: EditorMode; placeholder?: string; seed?: string; onDraft?: (v: EditValue | undefined, error: string | null) => void; validate?: Validate; autoFocus?: boolean; onCommit: (v: EditValue) => void; onCancel: () => void; onTab?: (back: boolean, el: HTMLElement | null) => void; extra?: ReactNode; compact?: boolean };

/** The edit-mode UI. Exported so tables and the bulk toolbar can host it. */
export function FieldEditor({ spec, value, label, mode, placeholder, seed, onDraft, validate, autoFocus = true, onCommit, onCancel, onTab, extra, compact }: FieldEditorProps) {
  const initial: EditValue = isEmpty(value) ? (spec.type === "tags" ? [] : "") : (value as EditValue);
  const [draft, setDraft] = useState<EditValue>(seed !== undefined ? seed : spec.type === "number" && typeof initial === "number" ? String(initial) : initial);
  const [touched, setTouched] = useState(false);
  const err = validateSpec(spec, draft, validate); const shown = touched && err ? err : null;
  useEffect(() => { if (mode === "none") { const c = coerce(spec, draft); onDraft?.(c === INVALID || (isEmpty(draft) && placeholder) ? undefined : (c as EditValue), isEmpty(draft) ? null : err); } else onDraft?.(coerce(spec, draft) as EditValue, err); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);
  const id = useId(); const done = useRef(false); const wrap = useRef<HTMLDivElement>(null);
  const changed = !sameValue(coerce(spec, draft) as EditValue, value === undefined ? "" : value);
  const commit = useCallback(() => { if (done.current) return; setTouched(true); const e = validateSpec(spec, draft, validate); if (e) return; done.current = true; const v = coerce(spec, draft) as EditValue; if (sameValue(v, value === undefined ? "" : value)) onCancel(); else onCommit(v); }, [spec, draft, validate, value, onCommit, onCancel]);
  const cancel = () => { if (!done.current) { done.current = true; onCancel(); } };
  const onKey = (e: React.KeyboardEvent) => {
    if (mode === "none") return;
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cancel(); }
    else if (e.key === "Enter" && spec.type !== "textarea" && spec.type !== "tags") { e.preventDefault(); commit(); }
    else if (e.key === "Enter" && spec.type === "textarea" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); commit(); }
    else if (e.key === "Tab" && onTab) { e.preventDefault(); const ok = !validateSpec(spec, draft, validate); if (!ok) { setTouched(true); return; } onTab(e.shiftKey, wrap.current); commit(); }
  };
  // blur mode: leaving the whole editor commits (valid) or keeps it open showing the error (invalid).
  const onBlur = (e: React.FocusEvent) => { if (mode !== "blur" || wrap.current?.contains(e.relatedTarget as Node)) return; setTouched(true); if (!validateSpec(spec, draft, validate)) commit(); };
  const set = (v: EditValue) => { setDraft(v); setTouched(true); };
  const cls = `jp-input adm-editor ${shown ? "is-invalid" : ""}`;
  let input: ReactNode;
  if (spec.type === "select" && spec.options.length > 7) { const byLabel = new Map(spec.options.map((o) => [o.label, o.value])); input = <Combobox id={id} options={spec.options.map((o) => o.label)} value={spec.options.filter((o) => o.value === draft).map((o) => o.label)} onChange={(v) => { const val = byLabel.get(v[0] ?? ""); if (val === undefined) return; set(val); if (mode === "blur" && !validateSpec(spec, val, validate)) { done.current = true; onCommit(val); } }} placeholder={placeholder ?? "Search…"} />; }
  else if (spec.type === "select") input = <select id={id} className={`jp-select adm-editor ${shown ? "is-invalid" : ""}`} autoFocus={autoFocus} aria-label={label} aria-invalid={!!shown} value={String(draft)} onChange={(e) => { set(e.target.value); if (mode === "blur") { const v = e.target.value; if (!validateSpec(spec, v, validate)) { done.current = true; onCommit(v); } } }}>{!spec.options.some((o) => o.value === draft) && <option value="">{placeholder ?? "Choose…"}</option>}{spec.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
  else if (spec.type === "tags") input = <Combobox id={id} multi creatable={spec.creatable} options={spec.options ?? []} value={Array.isArray(draft) ? draft : []} onChange={(v) => set(v)} placeholder="Add…" />;
  else if (spec.type === "textarea") input = <textarea id={id} className={cls} autoFocus={autoFocus} aria-label={label} aria-invalid={!!shown} rows={spec.rows ?? 3} value={String(draft)} onChange={(e) => set(e.target.value)} />;
  else if (spec.type === "date") input = <><input id={id} className={cls} autoFocus={autoFocus} aria-label={label} aria-invalid={!!shown} placeholder={placeholder ?? "2026-12-31, tomorrow, +3d"} value={String(draft)} onChange={(e) => set(e.target.value)} onFocus={(e) => e.target.select()} /><span className="adm-editor__chips">{([["Today", "today"], ["Tomorrow", "tomorrow"], ["Next week", "+7d"]] as const).map(([l, k]) => <button key={k} type="button" className="adm-link" onClick={() => set(parseDateShortcut(k) ?? "")}>{l}</button>)}</span></>;
  else input = <input id={id} className={cls} autoFocus={autoFocus} aria-label={label} aria-invalid={!!shown} inputMode={spec.type === "number" ? "decimal" : undefined} placeholder={placeholder ?? (spec.type === "text" ? spec.placeholder : undefined)} value={String(draft)} onChange={(e) => set(spec.type === "number" ? groupDigits(e.target.value) : e.target.value)} onFocus={(e) => { if (seed !== undefined) { const n = e.target.value.length; e.target.setSelectionRange(n, n); } else e.target.select(); }} />;
  return (
    <div ref={wrap} className={`adm-editor-wrap ${compact ? "is-compact" : ""}`} onKeyDown={onKey} onBlur={onBlur}>
      <div className="adm-row" style={{ flexWrap: "nowrap", gap: 4 }}>
        <div style={{ flex: 1, minWidth: 0 }}>{input}</div>
        {spec.type === "number" && spec.unit && <span className="jp-muted">{spec.unit}</span>}
        {mode === "explicit" && <><button type="button" className="adm-editor__btn is-save" aria-label={`Save ${label}`} disabled={!!err || !changed} onClick={commit}><Icon name="check" size={15} /></button><button type="button" className="adm-editor__btn" aria-label={`Cancel editing ${label}`} onClick={cancel}><Icon name="close" size={15} /></button></>}
      </div>
      {shown && <div className="adm-err" role="alert">{shown}</div>}
      {extra}
    </div>
  );
}

type EditableProps = {
  value: EditValue | undefined; editor: EditorSpec; label: string; onSave: (v: EditValue, meta?: SaveMeta) => void | string | null | Promise<void | string | null>;
  validate?: Validate; commit?: CommitMode; display?: ReactNode; disabled?: boolean; undo?: boolean; className?: string; placeholderEmpty?: string;
  /** Controlled editing (tables drive this for keyboard navigation). */ editing?: boolean; onEditingChange?: (editing: boolean) => void; extra?: ReactNode; compact?: boolean; hideAffordance?: boolean; trigger?: "click" | "dblclick"; seed?: string;
  /** Why this field can't be edited. Shows a lock and the reason (tooltip and screen readers). Implies `disabled`. */ locked?: string;
  /** Show a history popover (who, when, from, to). Entries from this session are added automatically; pass `history` to seed earlier ones. */ showHistory?: boolean; history?: HistoryEntry[];
  /** Table hosts take over Tab / Shift+Tab / Enter navigation. Return true when handled. */ onNavigate?: (dir: "next" | "prev" | "down") => boolean;
  /** Set false when a host (a grid) manages focus itself, so the value is not its own tab stop. */ tabbable?: boolean;
};

export function Editable({ value, editor, label, onSave, validate, commit, display, disabled, undo = true, className = "", editing: editingProp, onEditingChange, extra, compact, hideAffordance, trigger = "click", seed, locked, placeholderEmpty, onNavigate, tabbable = true, showHistory, history }: EditableProps) {
  const [session, setSession] = useState<HistoryEntry[]>([]);
  if (locked) disabled = true;
  const prefs = usePrefsOptional(); const editCommit = prefs?.editCommit ?? "blur"; const toast = prefs?.toast ?? (() => {}); const mode = commit ?? editCommit;
  const [editingState, setEditingState] = useState(false); const editing = editingProp ?? editingState;
  const setEditing = useCallback((v: boolean) => { setEditingState(v); onEditingChange?.(v); }, [onEditingChange]);
  const [pending, setPending] = useState<{ v: EditValue } | null>(null); const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle"); const [msg, setMsg] = useState("");
  const shownValue = pending ? pending.v : value; const btn = useRef<HTMLElement>(null); const prev = useRef<EditValue | undefined>(value);
  useEffect(() => { if (status === "saved") { const t = setTimeout(() => setStatus("idle"), 1400); return () => clearTimeout(t); } }, [status]);
  const run = useCallback(async (v: EditValue, before: EditValue | undefined, isUndo = false) => {
    setPending({ v }); setStatus("saving"); setMsg("");
    try { const r = await onSave(v, { undo: isUndo }); if (typeof r === "string" && r) throw new Error(r); setPending(null); setStatus("saved"); if (showHistory) setSession((h) => [{ who: "You", at: new Date(), from: formatValue(editor, before) || "empty", to: formatValue(editor, v) || "empty" }, ...h]);
      if (undo && !isUndo) pushUndo({ label: `${label}: ${formatValue(editor, v) || "cleared"}`, undo: () => run(before ?? "", v, true), redo: () => run(v, before, true) });
      if (undo && !isUndo) toast({ kind: "ok", title: `${label} updated`, body: formatValue(editor, v) || "Cleared", undo: () => { void run(before ?? "", v, true); } });
    } catch (e) { setPending(null); setStatus("error"); setMsg(e instanceof Error ? e.message : "Couldn’t save"); }
  }, [onSave, undo, toast, label, editor, showHistory]);
  const moving = useRef(false);
  /** Move to the next/previous editable relative to the editor's own position (the display element is unmounted while editing). */
  const focusNext = (back: boolean, el: HTMLElement | null) => {
    if (!el) return; moving.current = true;
    const all = [...document.querySelectorAll<HTMLElement>("[data-editable]")];
    const next = back ? [...all].reverse().find((n) => el.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_PRECEDING) : all.find((n) => el.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING);
    if (next) setTimeout(() => { next.focus(); next.click(); }, 0);
  };
  if (editor.type === "boolean") {
    const on = !!shownValue;
    return <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} data-editable-switch ref={(el) => { btn.current = el; }} className={`adm-editable-switch ${on ? "is-on" : ""} ${className}`} onClick={() => { void run(!on, on); }}><i />{on ? editor.onLabel ?? "Yes" : editor.offLabel ?? "No"}{status === "saving" && <span className="adm-spin" style={{ width: 10, height: 10 }} />}</button>;
  }
  if (editing && !disabled) {
    return <FieldEditor spec={editor} value={shownValue} label={label} mode={mode} seed={seed} validate={validate} compact={compact} extra={extra} onTab={(back, el) => { if (onNavigate?.(back ? "prev" : "next")) { moving.current = true; return; } focusNext(back, el); }}
      onCancel={() => { setEditing(false); if (!moving.current) setTimeout(() => btn.current?.focus(), 0); moving.current = false; }} onCommit={(v) => { const before = value; prev.current = before; setEditing(false); void run(v, before); if (!moving.current) setTimeout(() => btn.current?.focus(), 0); moving.current = false; }} />;
  }
  return (
    <span className={`adm-editable ${disabled ? "is-disabled" : ""} ${status === "error" ? "is-error" : ""} ${className}`}>
      <span role="button" tabIndex={disabled || !tabbable ? -1 : 0} data-editable ref={btn} aria-label={`Edit ${label}`} aria-disabled={disabled || undefined} title={locked ? `Locked: ${locked}` : undefined} className="adm-editable__value"
        onClick={() => !disabled && trigger === "click" && setEditing(true)} onDoubleClick={() => !disabled && trigger === "dblclick" && setEditing(true)} onKeyDown={(e) => { if (!disabled && (e.key === "Enter" || e.key === "F2")) { e.preventDefault(); setEditing(true); } }}>
        {display ?? defaultDisplay(editor, shownValue, placeholderEmpty ?? `Add ${label.toLowerCase()}`)}{locked && <><Icon name="lock" size={13} className="adm-editable__lock" /><span className="adm-sr">Locked: {locked}</span></>}{!hideAffordance && !disabled && <Icon name="edit" size={13} className="adm-editable__pencil" />}
      </span>
      {showHistory && (session.length + (history?.length ?? 0)) > 0 && (
        <details className="adm-hist"><summary aria-label={`History of ${label}`}><Icon name="clock" size={13} /></summary>
          <ol className="adm-hist__list">{[...session, ...(history ?? [])].map((h, i) => <li key={i}><b>{h.who}</b> <span className="jp-muted">{typeof h.at === "string" ? h.at : h.at.toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}</span><br /><s>{h.from}</s> → {h.to}</li>)}</ol></details>)}
      <span className="adm-editable__status" aria-live="polite">{status === "saving" ? <span className="adm-spin" style={{ width: 11, height: 11 }} aria-label="Saving" /> : status === "saved" ? <Icon name="check" size={13} className="adm-editable__ok" /> : status === "error" ? <span className="adm-err" role="alert">{msg} <button type="button" className="adm-link" onClick={() => pending ? undefined : setEditing(true)}>Edit again</button></span> : null}</span>
    </span>
  );
}
