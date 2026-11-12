import { useEffect, useRef, useState } from "react";
import { Field, TextInput, Select, Checkbox, Segmented } from "@belikh/jupiter-ui/inputs.tsx";
import { Btn } from "@belikh/jupiter-ui/kit.tsx";
import { CURRENCIES, DAY_KEYS, convert, currencyDigits, formatDuration, formatMoney, fromMinor, gcd, parseAmount, parseDuration, rebalance, roundSig, simplifyRatio, toIsoDuration, toMinor, UNITS, type UnitKind } from "./logic-num.ts";
import "./in2.css";
void DAY_KEYS; void gcd;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const snap = (v: number, step: number) => Math.round(v / step) * step;

/* ---------- scrub-to-change number ---------- */
export function ScrubNumber({ label, value, onChange, min = -Infinity, max = Infinity, step = 1, unit, pxPerStep = 4 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; unit?: string; pxPerStep?: number }) {
  const start = useRef<{ x: number; v: number } | null>(null); const [drag, setDrag] = useState(false); const prec = Math.max(0, (String(step).split(".")[1] ?? "").length);
  const set = (v: number) => onChange(Number(clamp(snap(v, step / 10 || step), min, max).toFixed(prec + 1)));
  const onMove = (e: React.PointerEvent) => { if (!start.current) return; const mult = e.shiftKey ? 0.1 : e.altKey ? 10 : 1; set(start.current.v + ((e.clientX - start.current.x) / pxPerStep) * step * mult); };
  return (
    <div className="in2-scrub">
      <label id={`sc-${label}`} className={drag ? "is-drag" : ""} onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); start.current = { x: e.clientX, v: value }; setDrag(true); }} onPointerMove={onMove} onPointerUp={() => { start.current = null; setDrag(false); }} onPointerCancel={() => { if (start.current) onChange(start.current.v); start.current = null; setDrag(false); }} title="Drag left/right to change. Shift = fine, Alt = coarse. Esc cancels.">⇔ {label}</label>
      <input className="jp-input jp-input--mono" aria-labelledby={`sc-${label}`} inputMode="decimal" value={value} onChange={(e) => { const n = Number(e.target.value); if (!Number.isNaN(n)) onChange(clamp(n, min, max)); }} onKeyDown={(e) => { if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); set(value + (e.key === "ArrowUp" ? 1 : -1) * step * (e.shiftKey ? 10 : 1)); } else if (e.key === "Escape" && start.current) { onChange(start.current.v); } }} />
      {unit && <span className="in2-note">{unit}</span>}
    </div>
  );
}

/* ---------- knob / dial ---------- */
export function Knob({ label, value, onChange, min = 0, max = 100, step = 1, size = 96, unit = "" }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; size?: number; unit?: string }) {
  const ref = useRef<SVGSVGElement>(null); const frac = (value - min) / (max - min); const a0 = 135, sweep = 270; const ang = a0 + frac * sweep; const r = size / 2 - 8, c = size / 2;
  const pt = (deg: number, rad: number) => [c + rad * Math.cos((deg * Math.PI) / 180), c + rad * Math.sin((deg * Math.PI) / 180)];
  const arc = (from: number, to: number) => { const [x0, y0] = pt(from, r), [x1, y1] = pt(to, r); return `M${x0},${y0}A${r},${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x1},${y1}`; };
  const fromPointer = (e: React.PointerEvent) => { const b = ref.current!.getBoundingClientRect(); let deg = (Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2)) * 180) / Math.PI; deg = (deg + 360) % 360; let rel = (deg - a0 + 360) % 360; if (rel > sweep) rel = rel - sweep < (360 - sweep) / 2 ? sweep : 0; onChange(clamp(snap(min + (rel / sweep) * (max - min), step), min, max)); };
  const [nx, ny] = pt(ang, r - 10);
  return (
    <div className="in2-stack" style={{ alignItems: "center", gap: 4 }}>
      <svg ref={ref} className="in2-knob" width={size} height={size} role="slider" tabIndex={0} aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} aria-valuetext={`${value}${unit}`}
        onPointerDown={(e) => { (e.currentTarget as SVGElement).setPointerCapture?.(e.pointerId); fromPointer(e); }} onPointerMove={(e) => e.buttons === 1 && fromPointer(e)} onWheel={(e) => onChange(clamp(value + (e.deltaY < 0 ? 1 : -1) * step, min, max))}
        onKeyDown={(e) => { const d = e.key === "ArrowUp" || e.key === "ArrowRight" ? 1 : e.key === "ArrowDown" || e.key === "ArrowLeft" ? -1 : e.key === "PageUp" ? 10 : e.key === "PageDown" ? -10 : 0; if (d) { e.preventDefault(); onChange(clamp(value + d * step, min, max)); } else if (e.key === "Home") onChange(min); else if (e.key === "End") onChange(max); }}>
        <path d={arc(a0, a0 + sweep)} fill="none" stroke="var(--jp-border)" strokeWidth="6" strokeLinecap="round" /><path d={arc(a0, Math.max(a0 + 0.1, ang))} fill="none" stroke="var(--jp-accent)" strokeWidth="6" strokeLinecap="round" />
        <circle cx={c} cy={c} r={r - 14} fill="var(--jp-surface-raised)" stroke="var(--jp-border)" /><line x1={c} y1={c} x2={nx} y2={ny} stroke="var(--jp-text)" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <b className="in2-mono">{value}{unit}</b><span className="in2-note">{label}</span>
    </div>
  );
}

/* ---------- min–max pair ---------- */
export function MinMaxPair({ label = "Price range", min: lo0 = 10, max: hi0 = 250, prefix = "$" }: { label?: string; min?: number; max?: number; prefix?: string }) {
  const [lo, setLo] = useState(String(lo0)); const [hi, setHi] = useState(String(hi0));
  const a = Number(lo), b = Number(hi); const err = lo === "" || hi === "" ? "Enter both values" : Number.isNaN(a) || Number.isNaN(b) ? "Numbers only" : a > b ? "Minimum can’t be larger than maximum" : "";
  return (
    <Field label={label} error={err || undefined} hint={!err ? `Between ${prefix}${a} and ${prefix}${b}` : undefined}>
      {(id, d) => <div className="in2-row" style={{ flexWrap: "nowrap" }}><TextInput id={id} aria-label={`${label} minimum`} aria-describedby={d} inputMode="decimal" prefix={prefix} value={lo} onChange={setLo} state={err ? "error" : undefined} /><span aria-hidden>to</span><TextInput aria-label={`${label} maximum`} inputMode="decimal" prefix={prefix} value={hi} onChange={setHi} state={err ? "error" : undefined} /><Btn sm type="button" disabled={a <= b || Number.isNaN(a) || Number.isNaN(b)} onClick={() => { setLo(hi); setHi(lo); }}>Swap</Btn></div>}
    </Field>
  );
}

/* ---------- ratio ---------- */
const RATIOS: [string, number, number][] = [["16:9", 16, 9], ["4:3", 4, 3], ["1:1", 1, 1], ["3:2", 3, 2], ["21:9", 21, 9], ["9:16", 9, 16]];
export function RatioField({ w0 = 1920, h0 = 1080 }: { w0?: number; h0?: number }) {
  const [w, setW] = useState(w0); const [h, setH] = useState(h0); const [lock, setLock] = useState(true); const [rw, rh] = simplifyRatio(w, h); const ratio = useRef(w0 / h0);
  const setWidth = (x: number) => { setW(x); if (lock) setH(Math.max(1, Math.round(x / ratio.current))); else ratio.current = x / h; };
  const setHeight = (x: number) => { setH(x); if (lock) setW(Math.max(1, Math.round(x * ratio.current))); else ratio.current = w / x; };
  return (
    <div className="in2-stack">
      <div className="in2-row" style={{ flexWrap: "nowrap" }}><Field label="Width (px)">{(id) => <TextInput id={id} inputMode="numeric" value={String(w)} onChange={(v) => /^\d*$/.test(v) && v && setWidth(Number(v))} />}</Field><button type="button" className="adm-x" aria-pressed={lock} aria-label={lock ? "Unlock aspect ratio" : "Lock aspect ratio"} onClick={() => setLock(!lock)} style={{ marginTop: 18, fontSize: "var(--jp-fs-md)" }}>{lock ? "🔗" : "⛓️‍💥"}</button><Field label="Height (px)">{(id) => <TextInput id={id} inputMode="numeric" value={String(h)} onChange={(v) => /^\d*$/.test(v) && v && setHeight(Number(v))} />}</Field></div>
      <div className="in2-row" role="group" aria-label="Presets">{RATIOS.map(([l, a, b]) => <button key={l} type="button" className={`in2-pill ${rw === a && rh === b ? "in2-pill--ok" : ""}`} onClick={() => { ratio.current = a / b; setH(Math.round(w / (a / b))); }}>{l}</button>)}</div>
      <span className="in2-note" aria-live="polite">Aspect ratio {rw}:{rh} · {((w * h) / 1e6).toFixed(2)} MP</span>
      <div aria-hidden style={{ width: Math.min(220, 220 * Math.min(1, w / h)), aspectRatio: `${w} / ${h}`, maxHeight: 140, border: "2px solid var(--jp-accent)", borderRadius: 4, background: "var(--jp-surface)" }} />
    </div>
  );
}

/* ---------- dimensions (W x H x D) ---------- */
export function DimensionsField({ initial = [40, 30, 25] as [number, number, number] }: { initial?: [number, number, number] }) {
  const [v, setV] = useState<string[]>(initial.map(String)); const [unit, setUnit] = useState<"mm" | "cm" | "in">("cm");
  const n = v.map(Number); const bad = v.map((x) => x === "" || Number.isNaN(Number(x)) || Number(x) <= 0); const factor = { mm: 0.001, cm: 0.01, in: 0.0254 }[unit]; const m3 = n[0] * n[1] * n[2] * factor ** 3; const ok = bad.every((b) => !b);
  return (
    <div className="in2-stack">
      <div className="in2-dim">{["Width", "Height", "Depth"].map((l, i) => <Field key={l} label={l} error={bad[i] ? "Positive number" : undefined}>{(id) => <TextInput id={id} inputMode="decimal" value={v[i]} onChange={(x) => setV(v.map((y, j) => (j === i ? x : y)))} state={bad[i] ? "error" : undefined} />}</Field>)}<div style={{ width: 90 }}><Select value={unit} onChange={(x) => setUnit(x as "mm" | "cm" | "in")} aria-label="Unit" options={["mm", "cm", "in"]} /></div></div>
      <span className="in2-note" aria-live="polite">{ok ? <>{n[0]} × {n[1]} × {n[2]} {unit} · volume {(m3 * 1000).toFixed(2)} L · cubic weight {(m3 * 250).toFixed(2)} kg (at 250 kg/m³)</> : "Enter all three dimensions"}</span>
    </div>
  );
}

/* ---------- allocation sliders that sum to 100 ---------- */
export function AllocationSliders({ names = ["Compute", "Storage", "Network", "Support"], initial = [40, 30, 20, 10] }: { names?: string[]; initial?: number[] }) {
  const [vals, setVals] = useState(initial); const [locked, setLocked] = useState<boolean[]>(names.map(() => false)); const total = vals.reduce((a, b) => a + b, 0);
  const colors = ["var(--adm-c1)", "var(--adm-c2)", "var(--adm-c3)", "var(--adm-c4)", "var(--adm-c5)", "var(--adm-c6)"];
  return (
    <div className="in2-stack">
      <div className="in2-stackbar" role="img" aria-label={names.map((n, i) => `${n} ${vals[i]}%`).join(", ")}>{vals.map((v, i) => <span key={i} style={{ width: `${v}%`, background: colors[i % 6] }} />)}</div>
      {names.map((n, i) => (
        <div key={n} className="in2-alloc"><label htmlFor={`al-${n}`}>{n}</label><input id={`al-${n}`} type="range" min={0} max={100} value={vals[i]} disabled={locked[i]} onChange={(e) => setVals(rebalance(vals, i, Number(e.target.value), locked))} /><b className="in2-mono" style={{ textAlign: "end" }}>{vals[i]}%</b><button type="button" className="adm-x" aria-pressed={locked[i]} aria-label={`${locked[i] ? "Unlock" : "Lock"} ${n}`} onClick={() => setLocked(locked.map((l, j) => (j === i ? !l : l)))}>{locked[i] ? "🔒" : "🔓"}</button></div>
      ))}
      <div className="in2-row"><span className={total === 100 ? "in2-ok" : "in2-bad"} role="status">Total {total}%</span><Btn sm onClick={() => setVals(names.map((_, i) => Math.floor(100 / names.length) + (i < 100 % names.length ? 1 : 0)))}>Equalise</Btn><Btn sm variant="ghost" onClick={() => { setVals(initial); setLocked(names.map(() => false)); }}>Reset</Btn></div>
    </div>
  );
}

/* ---------- money ---------- */
export function MoneyField({ label = "Amount", minor: m0 = 125000, currency: c0 = "AUD", allowNegative = false, max }: { label?: string; minor?: number; currency?: string; allowNegative?: boolean; max?: number }) {
  const [cur, setCur] = useState(c0); const [text, setText] = useState(String(fromMinor(m0, c0))); const [focus, setFocus] = useState(false);
  const n = parseAmount(text); const minor = Number.isNaN(n) ? NaN : toMinor(n, cur); const digits = currencyDigits(cur); const fracLen = (text.split(/[.,]/)[1] ?? "").replace(/\D/g, "").length;
  const err = text.trim() === "" ? "Enter an amount" : Number.isNaN(n) ? "Not a valid amount" : !allowNegative && n < 0 ? "Can’t be negative" : fracLen > digits && !/[kmb]$/i.test(text.trim()) ? `${cur} uses ${digits} decimal place${digits === 1 ? "" : "s"}` : max !== undefined && minor > max ? `At most ${formatMoney(max, cur)}` : "";
  return (
    <Field label={label} error={err || undefined} hint={!err ? `= ${formatMoney(minor, cur)} (${minor} minor units). Try “12k” or “1.5m”.` : undefined}>
      {(id, d) => <div className="in2-row" style={{ flexWrap: "nowrap" }}><div style={{ width: 120 }}><Select value={cur} onChange={(v) => setCur(v)} aria-label="Currency" options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code}` }))} /></div><TextInput id={id} aria-describedby={d} inputMode="decimal" className="in2-mono" value={text} onFocus={() => setFocus(true)} onBlur={() => { setFocus(false); if (!err && !Number.isNaN(n)) setText(n.toFixed(digits)); }} onChange={setText} state={err ? "error" : undefined} suffix={!focus && !err ? <span className="in2-note">{cur}</span> : undefined} /></div>}
    </Field>
  );
}
export function MoneyRange({ currency = "AUD" }: { currency?: string }) {
  const [lo, setLo] = useState("1000"); const [hi, setHi] = useState("5000"); const a = parseAmount(lo), b = parseAmount(hi); const err = Number.isNaN(a) || Number.isNaN(b) ? "Enter both amounts" : a > b ? "Minimum is above the maximum" : "";
  return <Field label="Budget range" error={err || undefined} hint={!err ? `${formatMoney(toMinor(a, currency), currency)} to ${formatMoney(toMinor(b, currency), currency)}` : undefined}>{(id, d) => <div className="in2-row" style={{ flexWrap: "nowrap" }}><TextInput id={id} aria-label="Minimum budget" aria-describedby={d} prefix={currency} className="in2-mono" inputMode="decimal" value={lo} onChange={setLo} state={err ? "error" : undefined} /><span aria-hidden>–</span><TextInput aria-label="Maximum budget" prefix={currency} className="in2-mono" inputMode="decimal" value={hi} onChange={setHi} state={err ? "error" : undefined} /></div>}</Field>;
}

/* ---------- unit-switching input ---------- */
export function UnitField({ kind: k0 = "length" as UnitKind, label }: { kind?: UnitKind; label?: string }) {
  const [kind, setKind] = useState<UnitKind>(k0); const unitsOf = Object.keys(UNITS[kind].units); const [unit, setUnit] = useState(unitsOf[unitsOf.indexOf(UNITS[kind].base) >= 0 ? unitsOf.indexOf(UNITS[kind].base) : 0]); const [text, setText] = useState("1"); const n = Number(text);
  const changeKind = (nk: UnitKind) => { setKind(nk); const us = Object.keys(UNITS[nk].units); setUnit(UNITS[nk].base in UNITS[nk].units ? UNITS[nk].base : us[0]); setText("1"); };
  const changeUnit = (nu: string) => { if (!Number.isNaN(n)) setText(String(roundSig(convert(n, unit, nu, kind)))); setUnit(nu); };
  const err = text.trim() === "" || Number.isNaN(n) ? "Enter a number" : "";
  return (
    <div className="in2-stack">
      <div className="in2-row"><div style={{ width: 150 }}><Select value={kind} onChange={(v) => changeKind(v as UnitKind)} aria-label="Quantity" options={Object.keys(UNITS)} /></div></div>
      <Field label={label ?? "Value"} error={err || undefined}>{(id) => <div className="in2-row" style={{ flexWrap: "nowrap" }}><TextInput id={id} inputMode="decimal" className="in2-mono" value={text} onChange={setText} state={err ? "error" : undefined} /><div style={{ width: 110 }}><Select value={unit} onChange={changeUnit} aria-label="Unit" options={unitsOf} /></div></div>}</Field>
      {!err && <span className="in2-note" aria-live="polite">= {unitsOf.filter((u) => u !== unit).slice(0, 4).map((u) => `${roundSig(convert(n, unit, u, kind), 5)} ${u}`).join(" · ")}</span>}
    </div>
  );
}

/* ---------- duration ---------- */
export function DurationField({ label = "Estimated time", seconds: s0 = 5400, min = 60, max = 86400 * 7 }: { label?: string; seconds?: number; min?: number; max?: number }) {
  const [sec, setSec] = useState<number | null>(s0); const [text, setText] = useState(formatDuration(s0)); const [touched, setTouched] = useState(false);
  useEffect(() => { void touched; }, [touched]);
  const err = sec === null ? "Try “1h 30m”, “90m”, “1.5h” or “01:30:00”" : sec < min ? `At least ${formatDuration(min)}` : sec > max ? `At most ${formatDuration(max)}` : "";
  const commit = (v: string) => { const p = parseDuration(v); setSec(p); if (p !== null) setText(formatDuration(p)); };
  const bump = (d: number) => { const next = Math.max(0, (sec ?? 0) + d); setSec(next); setText(formatDuration(next)); };
  return (
    <Field label={label} error={touched && err ? err : undefined} hint={sec !== null && !err ? `${formatDuration(sec, true)} · ${toIsoDuration(sec)} · ${sec} s` : "Accepts 1h 30m, 90m, 1.5h, 01:30:00"}>
      {(id, d) => <div className="in2-stack"><TextInput id={id} aria-describedby={d} className="in2-mono" value={text} onChange={(v) => { setText(v); setSec(parseDuration(v)); }} onBlur={() => { setTouched(true); commit(text); }} state={touched && err ? "error" : undefined} />
        <div className="in2-row" role="group" aria-label="Adjust duration">{[["-1h", -3600], ["-15m", -900], ["-5m", -300], ["+5m", 300], ["+15m", 900], ["+1h", 3600]].map(([l, v]) => <button key={l as string} type="button" className="in2-pill" onClick={() => { bump(v as number); setTouched(true); }}>{l}</button>)}</div></div>}
    </Field>
  );
}
void Segmented; void Checkbox;
