import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon.tsx";
import { Badge } from "./kit.tsx";
import "./styles/inputs.css";

export type FieldState = "default" | "error" | "warn" | "success";

export function Field({ label, hint, error, warn, required, counter, children, inline }: { label: string; hint?: string; error?: string; warn?: string; required?: boolean; counter?: [number, number]; children: (id: string, describedBy: string) => ReactNode; inline?: boolean }) {
  const id = useId(); const d = `${id}-d`;
  return (
    <div className={`adm-field ${inline ? "adm-field--inline" : ""}`}>
      <label htmlFor={id} className="jp-label">{label}{required && <span className="adm-req" aria-hidden> *</span>}</label>
      {children(id, d)}
      <div className="adm-field__foot" id={d}>
        {error ? <span className="adm-err" role="alert">{error}</span> : warn ? <span className="adm-warn">{warn}</span> : hint ? <span className="jp-hint">{hint}</span> : <span />}
        {counter && <span className={`jp-hint ${counter[0] > counter[1] ? "adm-err" : ""}`}>{counter[0]}/{counter[1]}</span>}
      </div>
    </div>
  );
}

export function TextInput({ id, value, onChange, prefix, suffix, state, className, ...rest }: { id?: string; value: string; onChange: (v: string) => void; prefix?: ReactNode; suffix?: ReactNode; state?: FieldState } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "prefix">) {
  return (
    <div className={`adm-input ${state ? `is-${state}` : ""} ${rest.disabled ? "is-disabled" : ""}`}>
      {prefix && <span className="adm-input__add">{prefix}</span>}
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={state === "error" || undefined} {...rest} className={`jp-input${className ? ` ${className}` : ""}`} />
      {suffix && <span className="adm-input__add">{suffix}</span>}
    </div>
  );
}

export function PasswordInput({ id, value, onChange }: { id?: string; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  const score = useMemo(() => [/.{10,}/, /[a-z]/, /[A-Z]/, /\d/, /[^\w]/].filter((r) => r.test(value)).length, [value]);
  const label = ["Too weak", "Weak", "Fair", "Good", "Strong", "Excellent"][score];
  return (
    <div>
      <TextInput id={id} value={value} onChange={onChange} type={show ? "text" : "password"} autoComplete="new-password" suffix={<button type="button" className="adm-x" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(!show)}><Icon name="eye" size={16} /></button>} />
      <div className="adm-strength" aria-hidden>{[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= score ? `is-${score <= 2 ? "danger" : score <= 3 ? "warn" : "ok"}` : ""} />)}</div>
      <span className="jp-hint" aria-live="polite">{value ? label : "At least 10 characters"}</span>
    </div>
  );
}

export function TextArea({ id, value, onChange, max, rows = 3, ...rest }: { id?: string; value: string; onChange: (v: string) => void; max?: number; rows?: number } & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange">) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { const el = ref.current; if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight + 2}px`; } }, [value]);
  return <textarea ref={ref} id={id} className="jp-input adm-textarea" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} {...rest} maxLength={undefined} aria-invalid={max !== undefined && value.length > max ? true : undefined} />;
}

export function NumberStepper({ value, onChange, min = 0, max = 100, step = 1, unit }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; unit?: string }) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  return (
    <div className="adm-stepper" role="group">
      <button type="button" className="jp-btn jp-btn--secondary jp-btn--sm" aria-label="Decrease" onClick={() => onChange(clamp(value - step))}>−</button>
      <input className="jp-input jp-input--mono" inputMode="decimal" value={value} onChange={(e) => onChange(clamp(Number(e.target.value) || 0))} aria-label="Value" />
      {unit && <span className="jp-muted">{unit}</span>}
      <button type="button" className="jp-btn jp-btn--secondary jp-btn--sm" aria-label="Increase" onClick={() => onChange(clamp(value + step))}>+</button>
    </div>
  );
}

export function Slider({ value, onChange, min = 0, max = 100, step = 1, marks, fmt = (v: number) => String(v), label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; marks?: number[]; fmt?: (v: number) => string; label: string }) {
  const f = ((value - min) / (max - min)) * 100;
  return (
    <div className="adm-slider">
      <input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ ["--f" as string]: `${f}%` }} />
      <output>{fmt(value)}</output>
      {marks && <div className="adm-slider__marks">{marks.map((m) => <span key={m} style={{ left: `${((m - min) / (max - min)) * 100}%` }}>{fmt(m)}</span>)}</div>}
    </div>
  );
}
export function RangeSlider({ value, onChange, min = 0, max = 100, fmt = (v: number) => String(v), label }: { value: [number, number]; onChange: (v: [number, number]) => void; min?: number; max?: number; fmt?: (v: number) => string; label: string }) {
  const [a, b] = value; const pa = ((a - min) / (max - min)) * 100, pb = ((b - min) / (max - min)) * 100;
  return (
    <div className="adm-slider adm-slider--range">
      <div className="adm-slider__track"><i style={{ left: `${pa}%`, width: `${pb - pa}%` }} /></div>
      <input type="range" aria-label={`${label} minimum`} min={min} max={max} value={a} onChange={(e) => onChange([Math.min(Number(e.target.value), b), b])} />
      <input type="range" aria-label={`${label} maximum`} min={min} max={max} value={b} onChange={(e) => onChange([a, Math.max(Number(e.target.value), a)])} />
      <output>{fmt(a)} – {fmt(b)}</output>
    </div>
  );
}

export function Switch({ checked, onChange, label, pending }: { checked: boolean; onChange: (v: boolean) => void; label: string; pending?: boolean }) {
  return <label className="adm-switch"><input type="checkbox" role="switch" className="jp-toggle" checked={checked} disabled={pending} onChange={(e) => onChange(e.target.checked)} /><span>{label}</span>{pending && <span className="adm-spin" style={{ width: 12, height: 12 }} />}</label>;
}
export function Checkbox({ checked, onChange, label, indeterminate, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; indeterminate?: boolean; disabled?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate; }, [indeterminate]);
  return <label className="adm-check"><input ref={ref} type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} /><span>{label}</span></label>;
}
export function Radio({ name, value, current, onChange, label }: { name: string; value: string; current: string; onChange: (v: string) => void; label: ReactNode }) {
  return <label className="adm-check adm-check--radio"><input type="radio" name={name} checked={current === value} onChange={() => onChange(value)} /><span>{label}</span></label>;
}
export function RadioCards<T extends string>({ options, value, onChange, name }: { options: { value: T; title: string; desc: string; icon?: string; badge?: string }[]; value: T; onChange: (v: T) => void; name: string }) {
  return (
    <div className="adm-cards-radio" role="radiogroup">
      {options.map((o) => (
        <label key={o.value} className={value === o.value ? "is-on" : ""}>
          <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} />
          {o.icon && <Icon name={o.icon} size={20} />}<strong>{o.title}</strong>{o.badge && <Badge s="info">{o.badge}</Badge>}<span className="jp-muted">{o.desc}</span>
        </label>
      ))}
    </div>
  );
}
export function Segmented<T extends string>({ options, value, onChange, label }: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; label: string }) {
  return <div className="adm-seg" role="group" aria-label={label}>{options.map((o) => <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>)}</div>;
}

export function Select({ id, value, onChange, options, ...rest }: { id?: string; value: string; onChange: (v: string) => void; options: (string | { value: string; label: string; group?: string })[] } & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange">) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const groups = [...new Set(opts.map((o) => (o as { group?: string }).group))];
  return (
    <select id={id} className="jp-select" value={value} onChange={(e) => onChange(e.target.value)} {...rest}>
      {groups.map((g) => g ? <optgroup key={g} label={g}>{opts.filter((o) => (o as { group?: string }).group === g).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</optgroup> : opts.filter((o) => !(o as { group?: string }).group).map((o) => <option key={o.value} value={o.value}>{o.label}</option>))}
    </select>
  );
}

/** Searchable combobox. Pass `multi` for chips. Filters locally with a simulated async delay when `async`. */
export function Combobox({ id, options, value, onChange, multi, placeholder = "Search…", creatable, async: isAsync }: { id?: string; options: string[]; value: string[]; onChange: (v: string[]) => void; multi?: boolean; placeholder?: string; creatable?: boolean; async?: boolean }) {
  const [q, setQ] = useState(""); const [open, setOpen] = useState(false); const [hi, setHi] = useState(0); const [loading, setLoading] = useState(false); const [res, setRes] = useState(options);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isAsync) { setRes(options.filter((o) => o.toLowerCase().includes(q.toLowerCase()))); return; }
    setLoading(true); const t = setTimeout(() => { setRes(options.filter((o) => o.toLowerCase().includes(q.toLowerCase()))); setLoading(false); }, 350); return () => clearTimeout(t);
  }, [q, options, isAsync]);
  useEffect(() => { const h = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false); document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const list = res.filter((o) => !multi || !value.includes(o)); const canCreate = creatable && q && !options.some((o) => o.toLowerCase() === q.toLowerCase());
  const pick = (o: string) => { onChange(multi ? [...value, o] : [o]); setQ(""); if (!multi) setOpen(false); };
  const total = list.length + (canCreate ? 1 : 0);
  const key = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHi((h) => (h + 1) % Math.max(1, total)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => (h - 1 + total) % Math.max(1, total)); }
    else if (e.key === "Enter" && open && total) { e.preventDefault(); const it = list[hi] ?? (canCreate ? q : undefined); if (it) pick(it); }
    else if (e.key === "Backspace" && !q && multi && value.length) onChange(value.slice(0, -1));
    else if (e.key === "Escape") setOpen(false);
  };
  return (
    <div className="adm-combo" ref={box}>
      <div className="adm-combo__box jp-input" onClick={() => setOpen(true)}>
        {multi && value.map((v) => <span key={v} className="adm-chip">{v}<button type="button" aria-label={`Remove ${v}`} onClick={(e) => { e.stopPropagation(); onChange(value.filter((x) => x !== v)); }}>×</button></span>)}
        <input id={id} role="combobox" aria-expanded={open} aria-autocomplete="list" value={open || multi ? q : (value[0] ?? "")} placeholder={value.length && multi ? "" : placeholder} onFocus={() => { setOpen(true); setQ(""); }} onChange={(e) => { setQ(e.target.value); setHi(0); setOpen(true); }} onKeyDown={key} />
        {loading && <span className="adm-spin" style={{ width: 12, height: 12 }} />}
      </div>
      {open && (
        <ul role="listbox" className="adm-combo__list">
          {list.slice(0, 8).map((o, i) => <li key={o} role="option" aria-selected={i === hi} className={i === hi ? "is-hi" : ""} onMouseEnter={() => setHi(i)} onMouseDown={(e) => { e.preventDefault(); pick(o); }}>{o}</li>)}
          {canCreate && <li role="option" aria-selected={hi === list.length} className={hi === list.length ? "is-hi" : ""} onMouseDown={(e) => { e.preventDefault(); pick(q); }}>Create “{q}”</li>}
          {!total && !loading && <li className="jp-muted adm-combo__none">No matches</li>}
        </ul>
      )}
    </div>
  );
}

export function DateRange({ value, onChange }: { value: [string, string]; onChange: (v: [string, string]) => void }) {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const preset = (days: number) => { const e = new Date(); const s = new Date(); s.setDate(e.getDate() - days); onChange([iso(s), iso(e)]); };
  return (
    <div className="adm-daterange">
      <div className="adm-row"><input type="date" className="jp-input" aria-label="From" value={value[0]} max={value[1]} onChange={(e) => onChange([e.target.value, value[1]])} /><span className="jp-muted">to</span><input type="date" className="jp-input" aria-label="To" value={value[1]} min={value[0]} onChange={(e) => onChange([value[0], e.target.value])} /></div>
      <div className="adm-row">{[["Today", 0], ["7 days", 7], ["30 days", 30], ["90 days", 90]].map(([l, d]) => <button key={l as string} type="button" className="adm-pill" onClick={() => preset(d as number)}>{l}</button>)}</div>
    </div>
  );
}

export function FileDrop({ accept = "image/*,.pdf,.csv", maxMB = 5 }: { accept?: string; maxMB?: number }) {
  const [files, setFiles] = useState<{ name: string; size: number; p: number; err?: string }[]>([]);
  const [over, setOver] = useState(false);
  const add = (list: FileList | null) => {
    if (!list) return;
    const items = [...list].map((f) => ({ name: f.name, size: f.size, p: 0, err: f.size > maxMB * 1e6 ? `Over ${maxMB} MB` : undefined }));
    setFiles((x) => [...x, ...items]);
    items.filter((i) => !i.err).forEach((it) => { let p = 0; const t = setInterval(() => { p += 12 + Math.random() * 20; setFiles((x) => x.map((y) => (y.name === it.name ? { ...y, p: Math.min(100, p) } : y))); if (p >= 100) clearInterval(t); }, 180); });
  };
  return (
    <div>
      <label className={`adm-drop ${over ? "is-over" : ""}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}>
        <Icon name="upload" size={24} /><strong>Drop files here or click to browse</strong><span className="jp-muted">Up to {maxMB} MB each</span>
        <input type="file" multiple accept={accept} onChange={(e) => add(e.target.files)} />
      </label>
      {files.length > 0 && <ul className="adm-files">{files.map((f, i) => (
        <li key={f.name + i}><Icon name="file" size={16} /><span>{f.name}<small className="jp-muted"> {(f.size / 1024).toFixed(0)} KB</small></span>
          {f.err ? <span className="adm-err">{f.err}</span> : <div className="adm-progress__track" style={{ width: 120 }}><span style={{ width: `${f.p}%` }} className={f.p >= 100 ? "is-ok" : ""} /></div>}
          <button className="adm-x" aria-label={`Remove ${f.name}`} onClick={() => setFiles((x) => x.filter((_, j) => j !== i))}>×</button></li>))}</ul>}
    </div>
  );
}

export function OtpInput({ length = 6, value, onChange }: { length?: number; value: string; onChange: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const set = (i: number, c: string) => { const a = value.padEnd(length, " ").split(""); a[i] = c || " "; onChange(a.join("").trimEnd()); if (c && i < length - 1) refs.current[i + 1]?.focus(); };
  return (
    <div className="adm-otp" role="group" aria-label="One-time code" onPaste={(e) => { const t = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length); if (t) { e.preventDefault(); onChange(t); refs.current[Math.min(t.length, length - 1)]?.focus(); } }}>
      {Array.from({ length }, (_, i) => <input key={i} ref={(el) => { refs.current[i] = el; }} className="jp-input jp-input--mono" inputMode="numeric" maxLength={1} aria-label={`Digit ${i + 1}`} value={value[i]?.trim() ?? ""} onChange={(e) => set(i, e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => e.key === "Backspace" && !value[i]?.trim() && i > 0 && refs.current[i - 1]?.focus()} />)}
    </div>
  );
}

export function Rating({ value, onChange, max = 5 }: { value: number; onChange: (v: number) => void; max?: number }) {
  const [h, setH] = useState(0);
  return <div className="adm-rating" role="radiogroup" aria-label="Rating">{Array.from({ length: max }, (_, i) => <button key={i} type="button" role="radio" aria-checked={value === i + 1} aria-label={`${i + 1} of ${max}`} className={(h || value) > i ? "is-on" : ""} onMouseEnter={() => setH(i + 1)} onMouseLeave={() => setH(0)} onClick={() => onChange(i + 1)}><Icon name="star" size={22} /></button>)}</div>;
}

export function KeyValueEditor({ rows, onChange }: { rows: { k: string; v: string }[]; onChange: (r: { k: string; v: string }[]) => void }) {
  const upd = (i: number, p: Partial<{ k: string; v: string }>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  return (
    <div className="adm-kv">
      {rows.map((r, i) => (
        <div key={i} className="adm-kv__row">
          <input className="jp-input jp-input--mono" aria-label="Key" placeholder="KEY" value={r.k} onChange={(e) => upd(i, { k: e.target.value.toUpperCase() })} />
          <input className="jp-input jp-input--mono" aria-label="Value" placeholder="value" value={r.v} onChange={(e) => upd(i, { v: e.target.value })} />
          <button type="button" className="adm-x" aria-label="Move up" disabled={!i} onClick={() => { const c = [...rows]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; onChange(c); }}>↑</button>
          <button type="button" className="adm-x" aria-label="Remove row" onClick={() => onChange(rows.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      <button type="button" className="jp-btn jp-btn--ghost jp-btn--sm" onClick={() => onChange([...rows, { k: "", v: "" }])}>+ Add variable</button>
    </div>
  );
}
