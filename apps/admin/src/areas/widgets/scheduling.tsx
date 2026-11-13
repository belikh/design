import { useMemo, useRef, useState } from "react";
import { Btn, Badge, Alert } from "@belikh/jupiter-ui/kit.tsx";
import { Segmented, Select, Checkbox } from "@belikh/jupiter-ui/inputs.tsx";
import { DAYS, WD, WD_NAMES, availHours, availRanges, buildCron, copyDay, describeCron, describeRRule, emptyAvail, expandRRule, fmtUTC, formatRRule, makeSlots, nextRuns, parseCron, parseRRule, workWeek, type Avail, type CronPreset, type Freq, type RRule, type Slot } from "./schedule.ts";
import { CopyBtn, Note, Row, Stack } from "./ui.tsx";

const NOW = new Date("2026-03-04T10:00:00Z");
const PRESETS: { value: CronPreset; label: string }[] = [{ value: "minutes", label: "Every N min" }, { value: "hourly", label: "Hourly" }, { value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }];
const num = (v: string, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(Number(v) || 0)));

/* ---------------- C037 cron builder ---------------- */
export function CronBuilder({ initial = "30 9 * * 1-5", now = NOW }: { initial?: string; now?: Date }) {
  const [expr, setExpr] = useState(initial); const [kind, setKind] = useState<CronPreset>("weekly"); const [o, setO] = useState({ every: 15, minute: 30, hour: 9, days: [1, 2, 3, 4, 5], dom: 1 });
  const parsed = parseCron(expr); const runs = useMemo(() => nextRuns(expr, now, 5), [expr, now]);
  const upd = (patch: Partial<typeof o>, k = kind) => { const n = { ...o, ...patch }; setO(n); setExpr(buildCron(k, n)); };
  const fieldNames = ["minute", "hour", "day of month", "month", "day of week"]; const parts = expr.trim().split(/\s+/);
  return (
    <Stack>
      <div className="p3-field"><span className="jp-label">Schedule type</span><Segmented label="Schedule type" options={PRESETS} value={kind} onChange={(k) => { setKind(k); setExpr(buildCron(k, o)); }} /></div>
      <Row>
        {kind === "minutes" && <label className="p3-field"><span className="jp-label">Every (minutes)</span><input className="jp-input p3-narrow" type="number" min={1} max={59} value={o.every} onChange={(e) => upd({ every: num(e.target.value, 1, 59) })} /></label>}
        {kind !== "minutes" && <label className="p3-field"><span className="jp-label">Minute</span><input className="jp-input p3-narrow" type="number" min={0} max={59} value={o.minute} onChange={(e) => upd({ minute: num(e.target.value, 0, 59) })} /></label>}
        {["daily", "weekly", "monthly"].includes(kind) && <label className="p3-field"><span className="jp-label">Hour (0-23)</span><input className="jp-input p3-narrow" type="number" min={0} max={23} value={o.hour} onChange={(e) => upd({ hour: num(e.target.value, 0, 23) })} /></label>}
        {kind === "monthly" && <label className="p3-field"><span className="jp-label">Day of month</span><input className="jp-input p3-narrow" type="number" min={1} max={28} value={o.dom} onChange={(e) => upd({ dom: num(e.target.value, 1, 28) })} /></label>}
      </Row>
      {kind === "weekly" && <div className="p3-days" role="group" aria-label="Days of the week">{[1, 2, 3, 4, 5, 6, 0].map((d) => <button key={d} type="button" aria-pressed={o.days.includes(d)} aria-label={DAYS[d]} onClick={() => upd({ days: o.days.includes(d) ? o.days.filter((x) => x !== d) : [...o.days, d] })}>{DAYS[d].slice(0, 3)}</button>)}</div>}
      <label className="p3-field"><span className="jp-label">Cron expression</span><input className="jp-input p3-mono" value={expr} aria-invalid={!parsed.ok} aria-describedby="cron-msg" onChange={(e) => setExpr(e.target.value)} spellCheck={false} /></label>
      <div className="p3-cronparts" aria-hidden>{fieldNames.map((n, i) => <span key={n} className={!parsed.ok && parsed.field === i ? "is-bad" : ""}><code>{parts[i] ?? "·"}</code>{n}</span>)}</div>
      <p id="cron-msg" className={parsed.ok ? "p3-sentence" : "p3-bad"} role="status">{describeCron(expr)}</p>
      {parsed.ok && <div><span className="jp-label">Next runs (UTC)</span><ol className="p3-runs">{runs.map((d) => <li key={d.toISOString()}>{fmtUTC(d)}</li>)}</ol>{!runs.length && <Note warn>This expression never fires within the next eight years.</Note>}</div>}
      <Row><CopyBtn text={expr} label="Copy expression" />{["@daily", "0 */6 * * *", "0 0 1 * *", "*/5 9-17 * * 1-5"].map((x) => <Btn key={x} sm variant="ghost" onClick={() => setExpr(x)}>{x}</Btn>)}</Row>
    </Stack>
  );
}

/* ---------------- C037 recurrence rule builder ---------------- */
export function RecurrenceBuilder({ start = "2026-03-02" }: { start?: string }) {
  const [rule, setRule] = useState<RRule>({ freq: "WEEKLY", interval: 1, byDay: ["MO", "WE"] }); const [end, setEnd] = useState<"never" | "count" | "until">("count"); const [count, setCount] = useState(8); const [until, setUntil] = useState("2026-06-30"); const [monthly, setMonthly] = useState<"dom" | "nth">("dom"); const [nth, setNth] = useState("1"); const [text, setText] = useState("");
  const r: RRule = { ...rule, count: end === "count" ? count : undefined, until: end === "until" ? until : undefined, byMonthDay: rule.freq === "MONTHLY" && monthly === "dom" ? rule.byMonthDay ?? Number(start.slice(8)) : undefined, byDay: rule.freq === "MONTHLY" ? (monthly === "nth" ? [`${nth}${rule.byDay[0]?.replace(/^[+-]?\d/, "") || "MO"}`] : []) : rule.freq === "WEEKLY" ? rule.byDay : [] };
  const str = formatRRule(r); const dates = expandRRule(r, start, 10); const parsedText = text ? parseRRule(text) : null;
  return (
    <Stack>
      <Row>
        <label className="p3-field"><span className="jp-label">Repeats</span><Select value={rule.freq} onChange={(f) => setRule({ ...rule, freq: f as Freq })} options={[{ value: "DAILY", label: "Daily" }, { value: "WEEKLY", label: "Weekly" }, { value: "MONTHLY", label: "Monthly" }, { value: "YEARLY", label: "Yearly" }]} aria-label="Repeats" /></label>
        <label className="p3-field"><span className="jp-label">Every</span><input className="jp-input p3-narrow" type="number" min={1} max={52} value={rule.interval} onChange={(e) => setRule({ ...rule, interval: num(e.target.value, 1, 52) })} /></label>
      </Row>
      {rule.freq === "WEEKLY" && <div className="p3-days" role="group" aria-label="Repeat on">{["MO", "TU", "WE", "TH", "FR", "SA", "SU"].map((d) => <button key={d} type="button" aria-pressed={rule.byDay.includes(d)} aria-label={WD_NAMES[d]} onClick={() => setRule({ ...rule, byDay: rule.byDay.includes(d) ? rule.byDay.filter((x) => x !== d) : [...rule.byDay, d] })}>{d}</button>)}</div>}
      {rule.freq === "MONTHLY" && <Row><Segmented label="Monthly pattern" value={monthly} onChange={setMonthly} options={[{ value: "dom", label: `On day ${start.slice(8)}` }, { value: "nth", label: "On the nth weekday" }]} />{monthly === "nth" && <><Select value={nth} onChange={setNth} options={[{ value: "1", label: "first" }, { value: "2", label: "second" }, { value: "3", label: "third" }, { value: "4", label: "fourth" }, { value: "-1", label: "last" }]} aria-label="Which" /><Select value={rule.byDay[0]?.replace(/^[+-]?\d/, "") || "MO"} onChange={(d) => setRule({ ...rule, byDay: [d] })} options={WD.map((d) => ({ value: d, label: WD_NAMES[d] }))} aria-label="Weekday" /></>}</Row>}
      <Row><Segmented label="Ends" value={end} onChange={setEnd} options={[{ value: "never", label: "Never" }, { value: "count", label: "After" }, { value: "until", label: "On date" }]} />
        {end === "count" && <label className="p3-field"><span className="p3-sr">Occurrences</span><input className="jp-input p3-narrow" aria-label="Occurrences" type="number" min={1} max={100} value={count} onChange={(e) => setCount(num(e.target.value, 1, 100))} /></label>}
        {end === "until" && <input className="jp-input" aria-label="End date" type="date" value={until} onChange={(e) => setUntil(e.target.value)} />}</Row>
      <p className="p3-sentence" role="status">{describeRRule(r)}, starting {start}.</p>
      <div className="p3-field"><span className="jp-label">Rule</span><code className="p3-code">RRULE:{str}</code></div>
      <div><span className="jp-label">Next occurrences</span><ol className="p3-runs">{dates.map((d) => <li key={d}>{new Date(d + "T00:00:00Z").toUTCString().slice(0, 16)}</li>)}</ol>{!dates.length && <Note warn>No occurrences match.</Note>}</div>
      <label className="p3-field"><span className="jp-label">Import a rule</span><input className="jp-input p3-mono" value={text} placeholder="FREQ=MONTHLY;BYDAY=-1FR" aria-invalid={typeof parsedText === "string"} onChange={(e) => setText(e.target.value)} /></label>
      {typeof parsedText === "string" && <span className="p3-bad" role="alert">{parsedText}</span>}
      {parsedText && typeof parsedText === "object" && <Row><span className="p3-sentence">{describeRRule(parsedText)}</span><Btn sm onClick={() => { setRule({ ...parsedText, byDay: parsedText.byDay }); setEnd(parsedText.count ? "count" : parsedText.until ? "until" : "never"); if (parsedText.count) setCount(parsedText.count); if (parsedText.until) setUntil(parsedText.until); if (parsedText.freq === "MONTHLY") { const m = /^([+-]?\d)/.exec(parsedText.byDay[0] ?? ""); setMonthly(m ? "nth" : "dom"); if (m) setNth(m[1]); } setText(""); }}>Use this rule</Btn></Row>}
    </Stack>
  );
}

/* ---------------- C037 weekly availability grid ---------------- */
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6);
export function AvailabilityGrid({ initial = workWeek() }: { initial?: Avail }) {
  const [a, setA] = useState<Avail>(initial); const paint = useRef<boolean | null>(null); const [cur, setCur] = useState<[number, number]>([0, 9]);
  const set = (d: number, h: number, v: boolean) => setA((x) => x.map((row, i) => (i === d ? row.map((c, j) => (j === h ? v : c)) : row)));
  const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]; const ranges = availRanges(a);
  const key = (e: React.KeyboardEvent, d: number, h: number) => { const m: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }; if (m[e.key]) { e.preventDefault(); const nd = Math.max(0, Math.min(6, d + m[e.key][0])), nh = Math.max(6, Math.min(21, h + m[e.key][1])); setCur([nd, nh]); (e.currentTarget.closest("table")?.querySelector(`[data-cell="${nd}-${nh}"]`) as HTMLElement | null)?.focus(); } };
  return (
    <Stack>
      <div className="p3-availwrap" onMouseUp={() => (paint.current = null)} onMouseLeave={() => (paint.current = null)}>
        <table className="p3-avail"><caption className="p3-sr">Weekly availability, one button per hour from 06:00 to 22:00</caption>
          <thead><tr><th scope="col"><span className="p3-sr">Hour</span></th>{names.map((n, d) => <th key={n} scope="col"><button type="button" className="adm-x" aria-label={`Toggle all of ${DAYS[(d + 1) % 7]}`} onClick={() => { const on = !HOURS.every((h) => a[d][h]); setA((x) => x.map((row, i) => (i === d ? row.map((c, j) => (j >= 6 && j < 22 ? on : c)) : row))); }}>{n}</button></th>)}</tr></thead>
          <tbody>{HOURS.map((h) => <tr key={h}><th scope="row">{String(h).padStart(2, "0")}:00</th>{names.map((n, d) => <td key={n}><button type="button" data-cell={`${d}-${h}`} aria-pressed={a[d][h]} aria-label={`${DAYS[(d + 1) % 7]} ${String(h).padStart(2, "0")}:00`} tabIndex={cur[0] === d && cur[1] === h ? 0 : -1} className={a[d][h] ? "is-on" : ""} onMouseDown={(e) => { e.preventDefault(); paint.current = !a[d][h]; set(d, h, paint.current); setCur([d, h]); (e.currentTarget as HTMLElement).focus(); }} onMouseEnter={() => paint.current !== null && set(d, h, paint.current)} onKeyDown={(e) => key(e, d, h)} onClick={(e) => { if (e.detail === 0) set(d, h, !a[d][h]); }} /></td>)}</tr>)}</tbody>
        </table>
      </div>
      <Row><Btn sm onClick={() => setA(workWeek())}>Reset to 9 to 5</Btn><Btn sm onClick={() => setA(emptyAvail())}>Clear all</Btn><Btn sm onClick={() => setA(copyDay(a, 0, [1, 2, 3, 4]))}>Copy Monday to Tue-Fri</Btn><Badge s="info">{availHours(a)} h per week</Badge></Row>
      <ul className="p3-ranges" aria-label="Summary">{ranges.map((r, d) => <li key={d}><b>{names[d]}</b> {r.length ? r.join(", ") : "unavailable"}</li>)}</ul>
      <Note>Click or drag to paint hours; the arrow keys move between hours and Space or Enter toggles one. Click a day name to toggle the whole day.</Note>
    </Stack>
  );
}

/* ---------------- C055 schedule picker ---------------- */
export function SchedulePicker({ now = NOW }: { now?: Date }) {
  const [mode, setMode] = useState<"now" | "later" | "recurring">("later"); const [date, setDate] = useState("2026-03-06"); const [time, setTime] = useState("02:00"); const [every, setEvery] = useState("daily"); const [window, setWindow] = useState(false); const [saved, setSaved] = useState("");
  const at = new Date(`${date}T${time}:00Z`); const past = mode === "later" && (Number.isNaN(at.getTime()) || at <= now);
  const [h, m] = time.split(":").map(Number); const cron = every === "daily" ? `${m} ${h} * * *` : every === "weekdays" ? `${m} ${h} * * 1-5` : `${m} ${h} * * 1`;
  const summary = mode === "now" ? "Runs immediately." : mode === "later" ? (past ? "" : `Runs once on ${fmtUTC(at)}.`) : `${describeCron(cron)} (UTC). Next: ${nextRuns(cron, now, 1).map(fmtUTC)[0] ?? "never"}.`;
  return (
    <Stack>
      <Segmented label="When to run" value={mode} onChange={(v) => { setMode(v); setSaved(""); }} options={[{ value: "now", label: "Now" }, { value: "later", label: "Later" }, { value: "recurring", label: "Repeat" }]} />
      {mode !== "now" && <Row><label className="p3-field"><span className="jp-label">Time (UTC)</span><input className="jp-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
        {mode === "later" && <label className="p3-field"><span className="jp-label">Date</span><input className="jp-input" type="date" value={date} min="2026-03-04" onChange={(e) => setDate(e.target.value)} aria-invalid={past} /></label>}
        {mode === "recurring" && <label className="p3-field"><span className="jp-label">Repeat</span><Select value={every} onChange={setEvery} options={[{ value: "daily", label: "Every day" }, { value: "weekdays", label: "Weekdays" }, { value: "weekly", label: "Every Monday" }]} aria-label="Repeat" /></label>}</Row>}
      {mode !== "now" && <Checkbox checked={window} onChange={setWindow} label="Only inside the maintenance window (01:00 to 05:00 UTC)" />}
      {window && mode !== "now" && (h < 1 || h >= 5) && <Alert s="warn" title="Outside the maintenance window">Pick a time between 01:00 and 05:00.</Alert>}
      {past && <span className="p3-bad" role="alert">Choose a time in the future.</span>}
      {summary && <p className="p3-sentence" role="status">{summary}</p>}
      <Row><Btn variant="primary" disabled={past || (window && mode !== "now" && (h < 1 || h >= 5))} onClick={() => setSaved(summary)}>Schedule</Btn>{saved && <span className="p3-ok" role="status">Scheduled. {saved}</span>}</Row>
    </Stack>
  );
}

/* ---------------- C055 calendar slot picker ---------------- */
export function SlotPicker({ monday = "2026-03-09" }: { monday?: string }) {
  const [minutes, setMinutes] = useState(30); const [picked, setPicked] = useState<Slot | null>(null); const [booked, setBooked] = useState<string | null>(null); const [week, setWeek] = useState(monday);
  const slots = useMemo(() => makeSlots(week, workWeek(), minutes), [week, minutes]); const days = Array.from({ length: 5 }, (_, i) => { const d = new Date(new Date(week + "T00:00:00Z").getTime() + i * 86400000); return { iso: d.toISOString().slice(0, 10), label: d.toUTCString().slice(0, 11) }; });
  const shift = (n: number) => { setWeek(new Date(new Date(week + "T00:00:00Z").getTime() + n * 7 * 86400000).toISOString().slice(0, 10)); setPicked(null); };
  return (
    <Stack>
      <Row><Btn sm onClick={() => shift(-1)} aria-label="Previous week">‹ Prev</Btn><b className="p3-weeklabel" aria-live="polite">Week of {week}</b><Btn sm onClick={() => shift(1)} aria-label="Next week">Next ›</Btn><Segmented label="Duration" value={String(minutes)} onChange={(v) => { setMinutes(Number(v)); setPicked(null); }} options={[{ value: "15", label: "15 min" }, { value: "30", label: "30 min" }, { value: "60", label: "60 min" }]} /></Row>
      <div className="p3-slots" role="group" aria-label="Available slots">
        {days.map((d) => <div key={d.iso} className="p3-slots__day"><h3 className="p3-slots__h">{d.label}</h3>{slots.filter((s) => s.id.startsWith(d.iso)).map((s) => <button key={s.id} type="button" disabled={s.taken || s.id === booked} aria-pressed={picked?.id === s.id} className={picked?.id === s.id ? "is-on" : ""} aria-label={`${d.label} ${s.id.slice(11)}${s.taken ? ", taken" : ""}`} onClick={() => setPicked(s)}>{s.id.slice(11)}</button>)}</div>)}
      </div>
      <Row><span className="p3-note" aria-live="polite">{picked ? `Selected ${picked.id.replace("T", " ")} UTC for ${minutes} minutes` : "Pick a free slot. Greyed slots are taken."}</span><Btn variant="primary" disabled={!picked} onClick={() => { setBooked(picked!.id); setPicked(null); }}>Book slot</Btn>{booked && <span className="p3-ok" role="status">Booked {booked.replace("T", " ")} UTC</span>}</Row>
    </Stack>
  );
}
