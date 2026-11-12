import { useMemo, useState } from "react";
import { Field, TextInput, Select, Segmented, Checkbox } from "@belikh/jupiter-ui/inputs.tsx";
import { Btn } from "@belikh/jupiter-ui/kit.tsx";
import { DAY_KEYS, ZONES, fiscalOf, fiscalRange, fmtInZone, hoursOverlap, isoDate, offsetLabel, parseNaturalDate, tzOffsetMin, zonedToInstant, type Hours } from "./logic-num.ts";
import "./in2.css";

const long = (d: Date) => d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const TODAY = new Date(2026, 10, 12);

/* ---------- natural-language date ---------- */
export function NaturalDateField({ today = TODAY, label = "Due date" }: { today?: Date; label?: string }) {
  const [text, setText] = useState("next friday"); const [committed, setCommitted] = useState<string | null>(null); const d = parseNaturalDate(text, today);
  return (
    <div className="in2-stack">
      <Field label={label} error={text.trim() && !d ? "Couldn’t understand that. Try “tomorrow”, “in 2 weeks”, “15 dec” or 2026-12-01" : undefined} hint={d ? undefined : "Type it the way you’d say it"}>
        {(id, dd) => <TextInput id={id} aria-describedby={dd} value={text} onChange={(v) => { setText(v); setCommitted(null); }} onBlur={() => d && setCommitted(isoDate(d))} onKeyDown={(e) => { if (e.key === "Enter" && d) setCommitted(isoDate(d)); }} state={text.trim() && !d ? "error" : d ? "success" : undefined} />}
      </Field>
      <div aria-live="polite" className="in2-note">{d ? <>→ <b>{long(d)}</b>{committed ? <span className="in2-ok"> · saved as {committed}</span> : <span> · press Enter or leave the field to confirm</span>}</> : null}</div>
      <div className="in2-row">{["today", "tomorrow", "next friday", "in 3 weeks", "end of month", "eofy", "15 dec"].map((x) => <button key={x} type="button" className="in2-pill" onClick={() => { setText(x); const p = parseNaturalDate(x, today); setCommitted(p ? isoDate(p) : null); }}>{x}</button>)}</div>
    </div>
  );
}

/* ---------- fiscal period ---------- */
export function FiscalPicker({ today = TODAY }: { today?: Date }) {
  const cur = fiscalOf(today); const [fy, setFy] = useState(cur.fy); const [q, setQ] = useState<"year" | "1" | "2" | "3" | "4">(String(cur.quarter) as "1"); const [r0, r1] = fiscalRange(fy, q === "year" ? undefined : (Number(q) as 1 | 2 | 3 | 4));
  const [probe, setProbe] = useState(isoDate(today)); const pd = new Date(probe + "T00:00:00"); const pf = Number.isNaN(pd.getTime()) ? null : fiscalOf(pd);
  const fmt = (d: Date) => d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  return (
    <div className="in2-stack">
      <div className="in2-row"><div style={{ width: 150 }}><Field label="Financial year">{(id) => <Select id={id} value={String(fy)} onChange={(v) => setFy(Number(v))} options={[cur.fy - 3, cur.fy - 2, cur.fy - 1, cur.fy, cur.fy + 1].map((y) => ({ value: String(y), label: `FY${y}` }))} />}</Field></div>
        <div><div className="jp-label">Period</div><Segmented label="Period" value={q} onChange={setQ} options={[{ value: "year", label: "Full year" }, { value: "1", label: "Q1" }, { value: "2", label: "Q2" }, { value: "3", label: "Q3" }, { value: "4", label: "Q4" }]} /></div></div>
      <div className="in2-box" role="status" aria-live="polite"><b>FY{fy}{q !== "year" ? ` Q${q}` : ""}</b>: {fmt(r0)} to {fmt(r1)} <span className="in2-note">({Math.round((+r1 - +r0) / 86400000) + 1} days)</span></div>
      <div className="in2-row"><Field label="Which period is this date in?">{(id) => <input id={id} type="date" className="jp-input" value={probe} onChange={(e) => setProbe(e.target.value)} />}</Field><span className="in2-note" aria-live="polite">{pf ? <>→ <b>{pf.label}</b> (Australian financial year, 1 Jul to 30 Jun)</> : "Pick a date"}</span></div>
    </div>
  );
}

/* ---------- multi-date picker with blackout dates ---------- */
export const AU_HOLIDAYS_2026 = ["2026-12-25", "2026-12-26", "2026-12-28", "2027-01-01", "2027-01-26"];
export function MultiDateCalendar({ blackout: b0 = AU_HOLIDAYS_2026, month: m0 = new Date(2026, 11, 1) }: { blackout?: string[]; month?: Date }) {
  const [month, setMonth] = useState(m0); const [picked, setPicked] = useState<Set<string>>(new Set(["2026-12-02", "2026-12-03"])); const [black, setBlack] = useState<string[]>(b0); const [anchor, setAnchor] = useState<string | null>(null); const [msg, setMsg] = useState(""); const [bf, setBf] = useState(["", ""]);
  const first = new Date(month.getFullYear(), month.getMonth(), 1); const lead = (first.getDay() + 6) % 7; const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: lead + days }, (_, i) => (i < lead ? null : new Date(month.getFullYear(), month.getMonth(), i - lead + 1)));
  const isBlack = (s: string) => black.includes(s); const click = (d: Date, shift: boolean) => {
    const s = isoDate(d); if (isBlack(s)) { setMsg(`${long(d)} is blocked`); return; } setMsg("");
    if (shift && anchor) { const [a, z] = [anchor, s].sort(); const next = new Set(picked); let skipped = 0; for (let t = new Date(a + "T00:00:00"); isoDate(t) <= z; t.setDate(t.getDate() + 1)) { const k = isoDate(t); if (isBlack(k)) skipped++; else next.add(k); } setPicked(next); if (skipped) setMsg(`${skipped} blocked date${skipped > 1 ? "s" : ""} skipped in the range`); }
    else { const n = new Set(picked); n.has(s) ? n.delete(s) : n.add(s); setPicked(n); setAnchor(s); }
  };
  const addBlock = () => { if (!bf[0]) return; const to = bf[1] || bf[0]; const [a, z] = [bf[0], to].sort(); const add: string[] = []; for (let t = new Date(a + "T00:00:00"); isoDate(t) <= z && add.length < 60; t.setDate(t.getDate() + 1)) add.push(isoDate(t)); setBlack([...new Set([...black, ...add])].sort()); setPicked(new Set([...picked].filter((x) => !add.includes(x)))); setBf(["", ""]); };
  return (
    <div className="in2-stack">
      <div className="in2-row" style={{ justifyContent: "space-between", maxWidth: 340 }}><Btn sm aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</Btn><b aria-live="polite">{month.toLocaleDateString("en-AU", { month: "long", year: "numeric" })}</b><Btn sm aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</Btn></div>
      <div className="in2-cal" role="grid" aria-label="Pick dates">{["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} className="in2-dow" role="columnheader">{d}</span>)}
        {cells.map((d, i) => d ? <button key={i} type="button" role="gridcell" aria-selected={picked.has(isoDate(d))} aria-disabled={isBlack(isoDate(d))} title={isBlack(isoDate(d)) ? "Blocked" : undefined} className={`${picked.has(isoDate(d)) ? "is-sel" : ""} ${isBlack(isoDate(d)) ? "is-block" : ""} ${isoDate(d) === isoDate(TODAY) ? "is-today" : ""}`} onClick={(e) => click(d, e.shiftKey)}>{d.getDate()}</button> : <span key={i} />)}</div>
      <span className="in2-note">Click to toggle · Shift-click to select a range · hatched dates are blackout days</span>
      <div aria-live="polite" className={msg ? "in2-warn" : "in2-note"}>{msg || `${picked.size} date${picked.size === 1 ? "" : "s"} selected`}</div>
      <div className="in2-row">{[...picked].sort().map((s) => <span key={s} className="in2-pill in2-pill--ok">{s}<button type="button" aria-label={`Remove ${s}`} onClick={() => { const n = new Set(picked); n.delete(s); setPicked(n); }}>×</button></span>)}</div>
      <div className="in2-box in2-stack"><b>Blackout dates</b><div className="in2-row"><input type="date" className="jp-input" aria-label="Block from" style={{ width: 160 }} value={bf[0]} onChange={(e) => setBf([e.target.value, bf[1]])} /><input type="date" className="jp-input" aria-label="Block to (optional)" style={{ width: 160 }} value={bf[1]} min={bf[0]} onChange={(e) => setBf([bf[0], e.target.value])} /><Btn sm disabled={!bf[0]} onClick={addBlock}>Block</Btn></div><div className="in2-row">{black.map((s) => <span key={s} className="in2-pill in2-pill--warn">{s}<button type="button" aria-label={`Unblock ${s}`} onClick={() => setBlack(black.filter((x) => x !== s))}>×</button></span>)}{!black.length && <span className="in2-note">None</span>}</div></div>
    </div>
  );
}

/* ---------- time-zone conversion preview ---------- */
export function TzPreview({ at = "2026-11-12T09:00" }: { at?: string }) {
  const [val, setVal] = useState(at); const [zone, setZone] = useState("Australia/Brisbane"); const [extra, setExtra] = useState<string[]>(["Australia/Sydney", "Asia/Tokyo", "Europe/London", "America/New_York"]);
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(val); const inst = m ? zonedToInstant(+m[1], +m[2], +m[3], +m[4], +m[5], zone) : null;
  const rows = useMemo(() => (inst ? [zone, ...extra.filter((z) => z !== zone)].map((z) => { const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: z, hour: "2-digit", hourCycle: "h23" }).format(inst)); const day = new Intl.DateTimeFormat("en-CA", { timeZone: z }).format(inst); const base = new Intl.DateTimeFormat("en-CA", { timeZone: zone }).format(inst); const dd = Math.round((+new Date(day) - +new Date(base)) / 86400000); return { z, label: offsetLabel(z, inst), time: fmtInZone(inst, z), h, dd, kind: h >= 9 && h < 17 ? "is-work" : h >= 7 && h < 21 ? "is-edge" : "is-night" }; }) : []), [inst, zone, extra]);
  return (
    <div className="in2-stack">
      <div className="in2-row"><Field label="Meeting time">{(id) => <input id={id} type="datetime-local" className="jp-input" value={val} onChange={(e) => setVal(e.target.value)} />}</Field><div style={{ width: 220 }}><Field label="In time zone">{(id) => <Select id={id} value={zone} onChange={setZone} options={ZONES} />}</Field></div></div>
      {inst ? <table className="in2-tz" aria-label="Converted times"><thead><tr><th>Zone</th><th>Local time</th><th>Offset</th><th>Day</th></tr></thead><tbody>{rows.map((r) => <tr key={r.z} className={r.kind}><td>{r.z.replace("_", " ")}</td><td className="in2-mono"><b>{r.time}</b></td><td className="in2-mono">{r.label}</td><td>{r.dd === 0 ? "same day" : r.dd > 0 ? `+${r.dd} day` : `${r.dd} day`}</td></tr>)}</tbody></table> : <span className="in2-bad" role="alert">Enter a date and time</span>}
      <div className="in2-row" role="group" aria-label="Add zones">{ZONES.filter((z) => !extra.includes(z) && z !== zone).slice(0, 5).map((z) => <button key={z} type="button" className="in2-pill" onClick={() => setExtra([...extra, z])}>+ {z.split("/")[1]?.replace("_", " ") ?? z}</button>)}{extra.length > 0 && <button type="button" className="in2-pill" onClick={() => setExtra([])}>Clear</button>}</div>
      <span className="in2-note">Green = business hours (09–17), amber = early/late, grey = night.{inst && ` Offsets include daylight saving at that date: ${zone} is ${offsetLabel(zone, inst)}.`}</span>
    </div>
  );
}

/* ---------- working hours + overlap ---------- */
const toMin = (s: string) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; }; const toStr = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const DEFAULT_HOURS: Hours = { mon: [540, 1020], tue: [540, 1020], wed: [540, 1020], thu: [540, 1020], fri: [540, 1020], sat: null, sun: null };
function HoursEditor({ title, hours, onChange }: { title: string; hours: Hours; onChange: (h: Hours) => void }) {
  const copy = () => { const mon = hours.mon; onChange(Object.fromEntries(DAY_KEYS.map((k) => [k, k === "sat" || k === "sun" ? hours[k] : mon])) as Hours); };
  return (
    <div className="in2-stack" role="group" aria-label={title}><b>{title}</b>{DAY_KEYS.map((k) => { const h = hours[k]; const bad = h && h[1] <= h[0]; return (
      <div key={k} className="in2-hours" style={{ gridTemplateColumns: "50px 70px 100px 100px" }}><span style={{ textTransform: "capitalize" }}>{k}</span><Checkbox checked={!!h} onChange={(v) => onChange({ ...hours, [k]: v ? [540, 1020] : null })} label="Open" />
        {h ? <><input type="time" className="jp-input" aria-label={`${k} opens`} value={toStr(h[0])} onChange={(e) => e.target.value && onChange({ ...hours, [k]: [toMin(e.target.value), h[1]] })} aria-invalid={bad || undefined} /><input type="time" className="jp-input" aria-label={`${k} closes`} value={toStr(h[1])} onChange={(e) => e.target.value && onChange({ ...hours, [k]: [h[0], toMin(e.target.value)] })} aria-invalid={bad || undefined} /></> : <span className="in2-note" style={{ gridColumn: "3 / 5" }}>Closed</span>}
        {bad && <span className="in2-bad" role="alert" style={{ gridColumn: "1 / -1" }}>Closing time must be after opening</span>}</div>); })}
      <Btn sm onClick={copy}>Copy Monday to weekdays</Btn></div>
  );
}
export function WorkingHours({ on = new Date(2026, 10, 12) }: { on?: Date }) {
  const [a, setA] = useState<Hours>(DEFAULT_HOURS); const [b, setB] = useState<Hours>({ ...DEFAULT_HOURS, mon: [480, 960], tue: [480, 960], wed: [480, 960], thu: [480, 960], fri: [480, 960] }); const [zA, setZA] = useState("Australia/Brisbane"); const [zB, setZB] = useState("Pacific/Auckland");
  const ov = hoursOverlap(a, zA, b, zB, on); const total = DAY_KEYS.reduce((s, k) => s + (ov[k] ? ov[k]![1] - ov[k]![0] : 0), 0);
  return (
    <div className="in2-stack">
      <div className="in2-grid"><div className="in2-stack"><div style={{ maxWidth: 240 }}><Select value={zA} onChange={setZA} aria-label="Team A zone" options={ZONES} /></div><HoursEditor title={`Team A (${zA.split("/")[1]})`} hours={a} onChange={setA} /></div><div className="in2-stack"><div style={{ maxWidth: 240 }}><Select value={zB} onChange={setZB} aria-label="Team B zone" options={ZONES} /></div><HoursEditor title={`Team B (${zB.split("/")[1]})`} hours={b} onChange={setB} /></div></div>
      <div className="in2-box in2-stack" aria-live="polite"><b>Overlap, shown in {zA.split("/")[1]} time</b>{DAY_KEYS.map((k) => <div key={k} className="in2-hours" style={{ gridTemplateColumns: "50px 110px minmax(0,1fr)" }}><span style={{ textTransform: "capitalize" }}>{k}</span><span className="in2-mono">{ov[k] ? `${toStr(ov[k]![0])}–${toStr(ov[k]![1])}` : "none"}</span><div className="in2-hours__bar" aria-hidden>{ov[k] && <i style={{ insetInlineStart: `${(ov[k]![0] / 1440) * 100}%`, width: `${((ov[k]![1] - ov[k]![0]) / 1440) * 100}%` }} />}</div></div>)}<span className={total ? "in2-ok" : "in2-bad"}>{total ? `${(total / 60).toFixed(1)} shared hours a week` : "No shared working hours. Consider widening one team’s day."} (offset {(tzOffsetMin(zB, on) - tzOffsetMin(zA, on)) / 60 >= 0 ? "+" : ""}{(tzOffsetMin(zB, on) - tzOffsetMin(zA, on)) / 60} h)</span></div>
    </div>
  );
}
