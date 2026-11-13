import { useEffect, useMemo, useRef, useState } from "react";
import { Field, TextInput, TextArea, Slider, Checkbox } from "@belikh/jupiter-ui/inputs.tsx";
import { Btn, Badge, Avatar } from "@belikh/jupiter-ui/kit.tsx";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";
import { people } from "../../data/fixtures.ts";
import { abnValid, activeToken, applyMask, bsbValid, cardBrand, checkUsername, entropyBits, formatAbn, formatBsb, formatCard, formatIban, generateApiKey, generatePassword, ibanValid, insertToken, luhn, maskSecret, slugify, type Availability, type PwOptions } from "./logic-text.ts";
import "./in2.css";

/* ---------- masked inputs ---------- */
export type MaskKind = "card" | "iban" | "bsb" | "abn" | "phone" | "plate";
const MASKS: Record<MaskKind, { label: string; placeholder: string; hint: string; fmt: (v: string) => string; valid: (v: string) => string | null }> = {
  card: { label: "Card number", placeholder: "4111 1111 1111 1111", hint: "Visa, Mastercard and Amex are formatted as you type; the Luhn check runs on completion", fmt: formatCard, valid: (v) => (v.replace(/\D/g, "").length < 13 ? "Enter the full card number" : luhn(v) ? null : "That card number fails the checksum") },
  iban: { label: "IBAN", placeholder: "GB82 WEST 1234 5698 7654 32", hint: "Grouped in fours; validated with the mod-97 check", fmt: formatIban, valid: (v) => (v.replace(/\s/g, "").length < 15 ? "IBANs are 15–34 characters" : ibanValid(v) ? null : "The IBAN checksum does not match") },
  bsb: { label: "BSB", placeholder: "123-456", hint: "Australian bank-state-branch code", fmt: formatBsb, valid: (v) => (bsbValid(v) ? null : "A BSB is 6 digits, like 062-000") },
  abn: { label: "ABN", placeholder: "51 824 753 556", hint: "Validated with the ABN weighting checksum", fmt: formatAbn, valid: (v) => (abnValid(v) ? null : "That is not a valid ABN") },
  phone: { label: "Mobile", placeholder: "0412 345 678", hint: "Australian mobile: 04xx xxx xxx", fmt: (v) => applyMask(v, "#### ### ###").text, valid: (v) => (/^04\d{8}$/.test(v.replace(/\s/g, "")) ? null : "Australian mobiles start 04 and have 10 digits") },
  plate: { label: "Number plate", placeholder: "1AB 2CD", hint: "Letters and digits, uppercased: ### AAA style", fmt: (v) => applyMask(v, "*** ***").text.toUpperCase(), valid: (v) => (v.replace(/\s/g, "").length >= 5 ? null : "Plates have at least 5 characters") },
};
export function MaskedField({ kind, label, value: v0 = "" }: { kind: MaskKind; label?: string; value?: string }) {
  const m = MASKS[kind]; const [v, setV] = useState(m.fmt(v0)); const [touched, setTouched] = useState(false);
  const err = m.valid(v); const brand = kind === "card" ? cardBrand(v) : null;
  return (
    <Field label={label ?? m.label} hint={err && !touched ? m.hint : !err ? "Looks valid" : undefined} error={touched && err ? err : undefined}>
      {(id, d) => <TextInput id={id} aria-describedby={d} inputMode={kind === "plate" ? "text" : "numeric"} autoComplete="off" value={v} placeholder={m.placeholder} onChange={(x) => setV(m.fmt(x))} onBlur={() => setTouched(true)} state={touched && err ? "error" : !err ? "success" : undefined}
        suffix={brand && brand !== "unknown" ? <span className="in2-mono" style={{ textTransform: "uppercase" }}>{brand}</span> : !err ? <Icon name="check" size={14} /> : undefined} />}
    </Field>
  );
}

/* ---------- secret / API key ---------- */
export function SecretField({ initial = "jp_live_8f2c1d9a47e6b3a0c5d1e8f7a2b94c60", pickRandom }: { initial?: string; pickRandom?: (n: number) => number }) {
  const [key, setKey] = useState(initial); const [show, setShow] = useState(false); const [copied, setCopied] = useState(false); const [rotated, setRotated] = useState<string | null>(null); const [confirm, setConfirm] = useState(false);
  useEffect(() => { if (!show) return; const t = setTimeout(() => setShow(false), 10000); return () => clearTimeout(t); }, [show]);
  return (
    <div className="in2-stack">
      <div className="in2-secret"><code className="in2-mono" aria-label={show ? "API key (visible)" : "API key (hidden)"}>{show ? key : maskSecret(key)}</code>
        <Btn sm aria-pressed={show} onClick={() => setShow(!show)} icon="eye">{show ? "Hide" : "Reveal"}</Btn>
        <Btn sm icon="copy" onClick={() => { void navigator.clipboard?.writeText(key); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copied" : "Copy"}</Btn>
        <Btn sm icon="refresh" onClick={() => setConfirm(true)}>Rotate</Btn></div>
      {show && <span className="in2-note">Hides itself after 10 seconds.</span>}
      {confirm && <div className="in2-box" role="alertdialog" aria-label="Confirm rotation"><b>Rotate this key?</b><p className="in2-note">Anything using the old key keeps working for 24 hours, then stops.</p><div className="in2-row"><Btn sm variant="primary" onClick={() => { setRotated(key); setKey(generateApiKey("jp_live", pickRandom)); setShow(true); setConfirm(false); }}>Rotate now</Btn><Btn sm onClick={() => setConfirm(false)}>Cancel</Btn></div></div>}
      {rotated && <div className="in2-note" role="status">Rotated. The previous key ending <code>{rotated.slice(-4)}</code> expires in 24 h. The new key is shown once; copy it now.</div>}
    </div>
  );
}

/* ---------- click to edit ---------- */
export function ClickToEdit({ value, onSave, label, multiline, required, max = 80, delay = 600 }: { value: string; onSave?: (v: string) => Promise<void> | void; label: string; multiline?: boolean; required?: boolean; max?: number; delay?: number }) {
  const [v, setV] = useState(value); const [draft, setDraft] = useState(value); const [editing, setEditing] = useState(false); const [saving, setSaving] = useState(false); const [err, setErr] = useState("");
  const commit = async () => {
    const t = draft.trim(); if (required && !t) { setErr("Can’t be empty"); return; } if (t.length > max) { setErr(`At most ${max} characters`); return; } if (t === v) { setEditing(false); setErr(""); return; }
    setSaving(true); setErr(""); try { await new Promise((r) => setTimeout(r, delay)); if (/fail/i.test(t)) throw new Error("The server rejected that value"); await onSave?.(t); setV(t); setEditing(false); } catch (e) { setErr((e as Error).message); } finally { setSaving(false); }
  };
  if (!editing) return <button type="button" className="in2-click" aria-label={`Edit ${label}: ${v}`} onClick={() => { setDraft(v); setEditing(true); }} onKeyDown={(e) => e.key === "F2" && (setDraft(v), setEditing(true))}><span>{v || <em className="in2-note">Add {label.toLowerCase()}</em>}</span><Icon name="edit" size={14} /></button>;
  const common = { autoFocus: true, "aria-label": label, value: draft, disabled: saving, onChange: (x: string) => setDraft(x), onBlur: () => void commit(), onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Escape") { setEditing(false); setErr(""); } else if (e.key === "Enter" && (!multiline || e.metaKey || e.ctrlKey)) { e.preventDefault(); void commit(); } } };
  return <span className="in2-stack" style={{ gap: 4 }}>{multiline ? <TextArea {...common} rows={3} /> : <input className="jp-input" {...common} onChange={(e) => setDraft(e.target.value)} />}<span className="in2-note">{saving ? "Saving…" : "Enter to save, Esc to cancel"}{multiline && " (Ctrl+Enter)"}</span>{err && <span className="in2-bad" role="alert">{err}</span>}</span>;
}

/* ---------- username / slug availability ---------- */
export function UsernameField({ delay = 450, taken }: { delay?: number; taken?: string[] }) {
  const [v, setV] = useState(""); const [state, setState] = useState<"idle" | "checking" | "done">("idle"); const [res, setRes] = useState<Availability | null>(null);
  useEffect(() => { if (!v) { setState("idle"); setRes(null); return; } setState("checking"); const t = setTimeout(() => { setRes(checkUsername(v, taken)); setState("done"); }, delay); return () => clearTimeout(t); }, [v, delay, taken]);
  return (
    <Field label="Username" hint="3+ characters, starts with a letter" error={state === "done" && res && !res.ok ? res.reason : undefined}>
      {(id, d) => <><TextInput id={id} aria-describedby={d} autoComplete="off" value={v} onChange={setV} state={state === "done" ? (res?.ok ? "success" : "error") : undefined} suffix={state === "checking" ? <span className="adm-spin" style={{ width: 12, height: 12 }} aria-label="Checking" /> : state === "done" && res?.ok ? <Icon name="check" size={14} /> : undefined} />
        <div aria-live="polite" className="in2-note">{state === "checking" && "Checking availability…"}{state === "done" && res?.ok && <span className="in2-ok">“{v.toLowerCase()}” is available</span>}</div>
        {state === "done" && res && !res.ok && res.suggestions.length > 0 && <div className="in2-row"><span className="in2-note">Try:</span>{res.suggestions.map((s) => <button key={s} type="button" className="in2-pill" onClick={() => setV(s)}>{s}</button>)}</div>}</>}
    </Field>
  );
}
export function SlugField({ initialTitle = "Quarterly infrastructure review" }: { initialTitle?: string }) {
  const [title, setTitle] = useState(initialTitle); const [slug, setSlug] = useState(slugify(initialTitle)); const [manual, setManual] = useState(false);
  useEffect(() => { if (!manual) setSlug(slugify(title)); }, [title, manual]);
  return <div className="in2-stack"><Field label="Title">{(id) => <TextInput id={id} value={title} onChange={setTitle} />}</Field><Field label="URL slug" hint={manual ? "Edited by hand; no longer follows the title" : "Follows the title until you edit it"}>{(id) => <TextInput id={id} prefix="/docs/" className="in2-mono" value={slug} onChange={(x) => { setManual(true); setSlug(slugify(x)); }} suffix={manual ? <button type="button" className="adm-x" onClick={() => setManual(false)} aria-label="Reset slug to follow title">↺</button> : undefined} />}</Field></div>;
}

/* ---------- password generator ---------- */
export function PasswordGenerator({ onUse, pick }: { onUse?: (pw: string) => void; pick?: (n: number) => number }) {
  const [o, setO] = useState<PwOptions>({ length: 20, upper: true, lower: true, digits: true, symbols: true, avoidAmbiguous: true }); const [pw, setPw] = useState(() => generatePassword({ length: 20, upper: true, lower: true, digits: true, symbols: true, avoidAmbiguous: true }, pick)); const [copied, setCopied] = useState(false);
  const regen = (n = o) => setPw(generatePassword(n, pick)); const bits = entropyBits(pw); const level = bits < 50 ? "is-weak" : bits < 80 ? "is-mid" : "";
  const set = (p: Partial<PwOptions>) => { const n = { ...o, ...p }; if (!n.upper && !n.lower && !n.digits && !n.symbols) return; setO(n); regen(n); };
  return (
    <div className="in2-stack">
      <div className="in2-secret"><code className="in2-mono" aria-label="Generated password" aria-live="polite">{pw}</code><Btn sm icon="refresh" onClick={() => regen()}>New</Btn><Btn sm icon="copy" onClick={() => { void navigator.clipboard?.writeText(pw); setCopied(true); setTimeout(() => setCopied(false), 1200); }}>{copied ? "Copied" : "Copy"}</Btn></div>
      <div className={`in2-strength ${level}`} role="meter" aria-label="Strength" aria-valuenow={bits} aria-valuemin={0} aria-valuemax={128}><i style={{ width: `${Math.min(100, (bits / 128) * 100)}%` }} /></div><span className="in2-note">≈ {bits} bits of entropy · {bits < 50 ? "weak" : bits < 80 ? "good" : "very strong"}</span>
      <Slider label="Length" value={o.length} min={8} max={64} onChange={(length) => set({ length })} fmt={(x) => `${x} chars`} />
      <div className="in2-row">{(["upper", "lower", "digits", "symbols", "avoidAmbiguous"] as const).map((k) => <Checkbox key={k} checked={o[k]} onChange={(x) => set({ [k]: x })} label={{ upper: "A–Z", lower: "a–z", digits: "0–9", symbols: "!@#", avoidAmbiguous: "Avoid look-alikes (O0Il1)" }[k]} />)}</div>
      {onUse && <Btn variant="primary" onClick={() => onUse(pw)}>Use this password</Btn>}
    </div>
  );
}

/* ---------- multi-value paste into chips ---------- */
export type Chip = { id: number; text: string; error: string | null };
const EMAIL = (v: string) => (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? null : "Not a valid email address");
export function splitValues(raw: string): string[] { return raw.split(/[\n,;]+|\s{2,}|\t/).flatMap((x) => (x.includes("@") ? x.split(/\s+/) : [x])).map((x) => x.trim().replace(/^<|>$/g, "")).filter(Boolean); }
export function ChipPaste({ validate = EMAIL, label = "Recipients", placeholder = "Paste or type addresses…" }: { validate?: (v: string) => string | null; label?: string; placeholder?: string }) {
  const [chips, setChips] = useState<Chip[]>([]); const [text, setText] = useState(""); const id = useRef(0);
  const add = (vals: string[]) => setChips((c) => { const seen = new Set(c.map((x) => x.text.toLowerCase())); const next = [...c]; for (const v of vals) { if (seen.has(v.toLowerCase())) continue; seen.add(v.toLowerCase()); next.push({ id: ++id.current, text: v, error: validate(v) }); } return next; });
  const bad = chips.filter((c) => c.error);
  return (
    <div className="in2-stack">
      <Field label={label} hint="Paste a whole list: commas, semicolons and new lines all work. Duplicates are dropped.">
        {(fid, d) => <div className="jp-input in2-chips" style={{ height: "auto", minHeight: 36, display: "flex", flexWrap: "wrap", gap: 4, padding: 4, alignItems: "center" }}>
          {chips.map((c) => <span key={c.id} className={`in2-pill ${c.error ? "in2-pill--bad" : "in2-pill--ok"}`} title={c.error ?? "Valid"}>{c.error && <span aria-hidden>!</span>}{c.text}<button type="button" aria-label={`Remove ${c.text}`} onClick={() => setChips((x) => x.filter((y) => y.id !== c.id))}>×</button></span>)}
          <input id={fid} aria-describedby={d} style={{ flex: 1, minWidth: 140, border: 0, background: "none", font: "inherit", color: "inherit", outline: "none" }} placeholder={chips.length ? "" : placeholder} value={text} onChange={(e) => { const t = e.target.value; if (/[,;\n]$/.test(t)) { add(splitValues(t)); setText(""); } else setText(t); }}
            onPaste={(e) => { const t = e.clipboardData.getData("text"); if (/[,;\n\t]|\s{2,}/.test(t) || t.includes("@")) { e.preventDefault(); add(splitValues(t)); } }} onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) { e.preventDefault(); add(splitValues(text)); setText(""); } else if (e.key === "Backspace" && !text && chips.length) setChips((x) => x.slice(0, -1)); }} onBlur={() => { if (text.trim()) { add(splitValues(text)); setText(""); } }} /></div>}
      </Field>
      <div className="in2-row" aria-live="polite"><span className="in2-ok">{chips.length - bad.length} valid</span>{bad.length > 0 && <span className="in2-bad">{bad.length} need fixing</span>}{bad.length > 0 && <Btn sm onClick={() => setChips((c) => c.filter((x) => !x.error))}>Remove invalid</Btn>}{chips.length > 0 && <Btn sm variant="ghost" onClick={() => setChips([])}>Clear all</Btn>}</div>
    </div>
  );
}

/* ---------- mention / slash command ---------- */
export const SLASH = [{ key: "h1", label: "Heading 1", insert: "# " }, { key: "h2", label: "Heading 2", insert: "## " }, { key: "todo", label: "To-do item", insert: "- [ ] " }, { key: "bullet", label: "Bulleted list", insert: "- " }, { key: "quote", label: "Quote", insert: "> " }, { key: "divider", label: "Divider", insert: "\n---\n" }, { key: "code", label: "Code block", insert: "```\n\n```" }, { key: "date", label: "Today’s date", insert: "2026-11-12" }];
export function MentionField({ initial = "" }: { initial?: string }) {
  const [text, setText] = useState(initial); const [caret, setCaret] = useState(0); const [hi, setHi] = useState(0); const ref = useRef<HTMLTextAreaElement>(null); const [dismissed, setDismissed] = useState(false);
  const tok = dismissed ? null : activeToken(text, caret);
  const items = useMemo(() => { if (!tok) return []; const q = tok.query.toLowerCase(); return tok.trigger === "@" ? people.filter((p) => p.toLowerCase().includes(q)).slice(0, 6).map((p) => ({ key: p, label: p, insert: `@${p.replace(/\s/g, "")} `, person: p })) : SLASH.filter((s) => s.key.includes(q) || s.label.toLowerCase().includes(q)).slice(0, 6).map((s) => ({ ...s, person: undefined as string | undefined })); }, [tok?.trigger, tok?.query]);
  const pick = (i: number) => { const it = items[i]; if (!tok || !it) return; const r = insertToken(text, tok, it.insert); setText(r.text); setHi(0); requestAnimationFrame(() => { ref.current?.focus(); ref.current?.setSelectionRange(r.caret, r.caret); setCaret(r.caret); }); };
  const mentioned = [...new Set([...text.matchAll(/@([A-Za-z]+)/g)].map((m) => m[1]))].filter((n) => people.some((p) => p.replace(/\s/g, "") === n));
  return (
    <div className="in2-stack">
      <div className="in2-rel">
        <label className="jp-label" htmlFor="mention-ta">Message</label>
        <textarea id="mention-ta" ref={ref} className="jp-input adm-textarea" rows={5} role="combobox" aria-expanded={items.length > 0} aria-controls="mention-list" aria-autocomplete="list" value={text} placeholder="Type @ to mention someone, or / for commands" onChange={(e) => { setText(e.target.value); setCaret(e.target.selectionStart); setHi(0); setDismissed(false); }} onSelect={(e) => setCaret((e.target as HTMLTextAreaElement).selectionStart)}
          onKeyDown={(e) => { if (!items.length) return; if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => (h + 1) % items.length); } else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => (h - 1 + items.length) % items.length); } else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(hi); } else if (e.key === "Escape") setDismissed(true); }} />
        {items.length > 0 && <ul id="mention-list" role="listbox" className="in2-menu" style={{ top: "auto", bottom: "calc(100% - 28px)", inset: "auto auto 8px 12px", width: 260 }}>{items.map((it, i) => <li key={it.key} role="option" aria-selected={i === hi} className={i === hi ? "is-hi" : ""} onMouseDown={(e) => { e.preventDefault(); pick(i); }}>{it.person ? <Avatar name={it.person} size={20} /> : <Icon name="code" size={14} />}{it.label}{!it.person && <span style={{ marginInlineStart: "auto", opacity: .7 }} className="in2-mono">/{it.key}</span>}</li>)}</ul>}
      </div>
      <div className="in2-row" aria-live="polite">{mentioned.length ? <><span className="in2-note">Will notify:</span>{mentioned.map((n) => <span key={n} className="in2-person"><Avatar name={people.find((p) => p.replace(/\s/g, "") === n)!} size={18} />{n}</span>)}</> : <span className="in2-note">No one mentioned yet.</span>}</div>
    </div>
  );
}

/* ---------- autocomplete with recents + ghost completion ---------- */
export function GhostAutocomplete({ options, storageKey = "in2-recents", label = "Search services" }: { options: string[]; storageKey?: string; label?: string }) {
  const read = (): string[] => { try { return JSON.parse(localStorage.getItem(storageKey) || "[]") as string[]; } catch { return []; } };
  const [v, setV] = useState(""); const [recents, setRecents] = useState<string[]>(read); const [open, setOpen] = useState(false); const [hi, setHi] = useState(0);
  const ghostSrc = v ? [...recents, ...options].find((o) => o.toLowerCase().startsWith(v.toLowerCase()) && o.length > v.length) : undefined;
  const rows = useMemo(() => { const q = v.toLowerCase(); const r = recents.filter((x) => x.toLowerCase().includes(q)).map((x) => ({ x, recent: true })); const o = options.filter((x) => x.toLowerCase().includes(q) && !recents.includes(x)).map((x) => ({ x, recent: false })); return [...r, ...o].slice(0, 8); }, [v, recents, options]);
  const commit = (x: string) => { setV(x); setOpen(false); const next = [x, ...recents.filter((y) => y !== x)].slice(0, 5); setRecents(next); try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ } };
  return (
    <Field label={label} hint="Tab or → accepts the grey completion. Recent picks come first.">
      {(id) => <div className="in2-rel">
        <div className="in2-ghost"><div className="in2-ghost__echo" aria-hidden>{v}<b>{ghostSrc ? ghostSrc.slice(v.length) : ""}</b></div>
          <input id={id} className="jp-input" role="combobox" aria-expanded={open && rows.length > 0} aria-autocomplete="both" autoComplete="off" value={v} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)} onChange={(e) => { setV(e.target.value); setOpen(true); setHi(0); }}
            onKeyDown={(e) => { if ((e.key === "Tab" || (e.key === "ArrowRight" && (e.target as HTMLInputElement).selectionStart === v.length)) && ghostSrc) { e.preventDefault(); setV(ghostSrc); } else if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHi((h) => Math.min(rows.length - 1, h + 1)); } else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); } else if (e.key === "Enter") { e.preventDefault(); const pick = rows[hi]?.x ?? v; if (pick) commit(pick); } else if (e.key === "Escape") setOpen(false); }} /></div>
        {open && rows.length > 0 && <ul role="listbox" className="in2-menu">{rows.map((r, i) => <li key={r.x} role="option" aria-selected={i === hi} className={i === hi ? "is-hi" : ""} onMouseDown={(e) => { e.preventDefault(); commit(r.x); }}><Icon name={r.recent ? "clock" : "search"} size={14} />{r.x}{r.recent && <Badge>recent</Badge>}</li>)}{recents.length > 0 && !v && <li className="in2-head" onMouseDown={(e) => { e.preventDefault(); setRecents([]); try { localStorage.removeItem(storageKey); } catch { /* ignore */ } }}>Clear recent searches</li>}</ul>}
      </div>}
    </Field>
  );
}
