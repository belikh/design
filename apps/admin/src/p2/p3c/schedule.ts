/* Cron parsing/description/next-run, RRULE subset, availability helpers, slot generation. Everything is UTC so it is deterministic. */

/* ---------------- cron ---------------- */
type FieldDef = { name: string; min: number; max: number; names?: readonly string[]; base?: number };
const FIELDS: FieldDef[] = [
  { name: "minute", min: 0, max: 59 }, { name: "hour", min: 0, max: 23 }, { name: "day of month", min: 1, max: 31 },
  { name: "month", min: 1, max: 12, names: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"], base: 1 },
  { name: "day of week", min: 0, max: 7, names: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"], base: 0 },
];
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export type CronParsed = { ok: true; sets: number[][]; star: boolean[]; expr: string } | { ok: false; error: string; field?: number };
const ALIASES: Record<string, string> = { "@hourly": "0 * * * *", "@daily": "0 0 * * *", "@midnight": "0 0 * * *", "@weekly": "0 0 * * 0", "@monthly": "0 0 1 * *", "@yearly": "0 0 1 1 *", "@annually": "0 0 1 1 *" };
export function parseCron(input: string): CronParsed {
  const expr = ALIASES[input.trim().toLowerCase()] ?? input.trim().replace(/\s+/g, " ");
  const parts = expr.split(" ");
  if (parts.length !== 5) return { ok: false, error: `A cron expression has 5 fields (minute hour day-of-month month day-of-week); found ${parts.filter(Boolean).length}.` };
  const sets: number[][] = []; const star: boolean[] = [];
  for (let i = 0; i < 5; i++) {
    const f = FIELDS[i]; const out = new Set<number>(); star[i] = parts[i] === "*" || parts[i].startsWith("*/");
    for (const item of parts[i].split(",")) {
      const m = /^(\*|[A-Za-z0-9]+(?:-[A-Za-z0-9]+)?)(?:\/(\d+))?$/.exec(item);
      if (!m) return { ok: false, error: `"${item}" is not valid in the ${f.name} field.`, field: i };
      const step = m[2] ? Number(m[2]) : 1; if (step < 1) return { ok: false, error: `Step must be at least 1 in the ${f.name} field.`, field: i };
      const val = (s: string): number => { const n = f.names ? f.names.indexOf(s.toUpperCase()) : -1; return n >= 0 ? n + (f.base ?? 0) : Number(s); };
      let lo: number, hi: number;
      if (m[1] === "*") { lo = f.min; hi = i === 4 ? 6 : f.max; } else { const [a, b] = m[1].split("-"); lo = val(a); hi = b === undefined ? (m[2] ? f.max : lo) : val(b); }
      if (Number.isNaN(lo) || Number.isNaN(hi)) return { ok: false, error: `"${item}" is not valid in the ${f.name} field.`, field: i };
      if (lo < f.min || hi > f.max || lo > hi) return { ok: false, error: `${f.name} must be between ${f.min} and ${f.max === 7 ? 6 : f.max}.`, field: i };
      for (let v = lo; v <= hi; v += step) out.add(i === 4 && v === 7 ? 0 : v);
    }
    sets.push([...out].sort((a, b) => a - b));
  }
  return { ok: true, sets, star, expr };
}
const two = (n: number) => String(n).padStart(2, "0");
const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1]);
export function describeCron(input: string): string {
  const p = parseCron(input); if (!p.ok) return p.error;
  const [min, hr, dom, mon, dow] = p.sets; const parts = p.expr.split(" ");
  let when: string;
  if (parts[0].startsWith("*/") && parts[1] === "*") when = `Every ${Number(parts[0].slice(2)) === 1 ? "minute" : `${parts[0].slice(2)} minutes`}`;
  else if (parts[0] === "*" && parts[1] === "*") when = "Every minute";
  else if (min.length === 1 && parts[1] === "*") when = min[0] === 0 ? "Every hour, on the hour" : `Every hour at ${min[0]} minutes past`;
  else if (parts[1].startsWith("*/") && min.length === 1) when = `Every ${parts[1].slice(2)} hours at ${two(min[0])} minutes past`;
  else if (min.length * hr.length <= 6) when = `At ${list(hr.flatMap((h) => min.map((m) => `${two(h)}:${two(m)}`)))}`;
  else when = `At minute ${parts[0]} past hour ${parts[1]}`;
  const bits: string[] = [];
  if (!p.star[4]) bits.push(`on ${list(dow.map((d) => DAYS[d]))}`);
  if (!p.star[2]) bits.push(`${p.star[4] ? "on" : "and on"} day ${list(dom.map(String))} of the month`);
  if (!p.star[3]) bits.push(`in ${list(mon.map((m) => MONTHS[m - 1]))}`);
  return [when, ...bits].join(", ");
}
/** The next `n` run times strictly after `from` (UTC). Standard cron rule: if both day fields are restricted, either may match. */
export function nextRuns(input: string, from: Date, n = 5): Date[] {
  const p = parseCron(input); if (!p.ok) return [];
  const [min, hr, dom, mon, dow] = p.sets; const out: Date[] = [];
  const day = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  for (let guard = 0; guard < 366 * 8 && out.length < n; guard++, day.setUTCDate(day.getUTCDate() + 1)) {
    if (!mon.includes(day.getUTCMonth() + 1)) continue;
    const domOk = dom.includes(day.getUTCDate()), dowOk = dow.includes(day.getUTCDay());
    if (!(p.star[2] || p.star[4] ? domOk && dowOk : domOk || dowOk)) continue;
    for (const h of hr) for (const m of min) { const t = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h, m)); if (t > from && out.length < n) out.push(t); }
  }
  return out;
}
export type CronPreset = "minutes" | "hourly" | "daily" | "weekly" | "monthly";
export function buildCron(kind: CronPreset, o: { every: number; minute: number; hour: number; days: number[]; dom: number }): string {
  switch (kind) {
    case "minutes": return `*/${Math.max(1, o.every)} * * * *`;
    case "hourly": return `${o.minute} * * * *`;
    case "daily": return `${o.minute} ${o.hour} * * *`;
    case "weekly": return `${o.minute} ${o.hour} * * ${o.days.length ? [...o.days].sort().join(",") : "*"}`;
    default: return `${o.minute} ${o.hour} ${o.dom} * *`;
  }
}
export const fmtUTC = (d: Date) => `${d.toISOString().slice(0, 10)} ${two(d.getUTCHours())}:${two(d.getUTCMinutes())} UTC`;

/* ---------------- recurrence rule (RRULE subset) ---------------- */
export type Freq = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
export type RRule = { freq: Freq; interval: number; byDay: string[]; byMonthDay?: number; count?: number; until?: string };
export const WD = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
export const WD_NAMES: Record<string, string> = { SU: "Sunday", MO: "Monday", TU: "Tuesday", WE: "Wednesday", TH: "Thursday", FR: "Friday", SA: "Saturday" };
export const formatRRule = (r: RRule): string => ["FREQ=" + r.freq, r.interval > 1 ? `INTERVAL=${r.interval}` : "", r.byDay.length ? `BYDAY=${r.byDay.join(",")}` : "", r.byMonthDay ? `BYMONTHDAY=${r.byMonthDay}` : "", r.count ? `COUNT=${r.count}` : "", r.until ? `UNTIL=${r.until.replace(/-/g, "")}` : ""].filter(Boolean).join(";");
export function parseRRule(s: string): RRule | string {
  const m: Record<string, string> = {}; for (const kv of s.replace(/^RRULE:/i, "").split(";")) { const [k, v] = kv.split("="); if (k && v) m[k.toUpperCase()] = v; }
  if (!["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(m.FREQ)) return "FREQ must be DAILY, WEEKLY, MONTHLY or YEARLY.";
  const interval = m.INTERVAL ? Number(m.INTERVAL) : 1; if (!Number.isInteger(interval) || interval < 1) return "INTERVAL must be a whole number of at least 1.";
  const byDay = m.BYDAY ? m.BYDAY.split(",") : []; if (byDay.some((d) => !/^[+-]?\d?(SU|MO|TU|WE|TH|FR|SA)$/.test(d))) return "BYDAY has an unknown day.";
  const until = m.UNTIL && /^\d{8}/.test(m.UNTIL) ? `${m.UNTIL.slice(0, 4)}-${m.UNTIL.slice(4, 6)}-${m.UNTIL.slice(6, 8)}` : undefined;
  return { freq: m.FREQ as Freq, interval, byDay, byMonthDay: m.BYMONTHDAY ? Number(m.BYMONTHDAY) : undefined, count: m.COUNT ? Number(m.COUNT) : undefined, until };
}
const ORD = ["", "first", "second", "third", "fourth", "fifth"];
export function describeRRule(r: RRule): string {
  const every = r.interval === 1 ? "Every" : `Every ${r.interval}`; const unit = { DAILY: "day", WEEKLY: "week", MONTHLY: "month", YEARLY: "year" }[r.freq];
  let s = `${every} ${unit}${r.interval > 1 ? "s" : ""}`;
  if (r.byDay.length) s += " on " + list(r.byDay.map((d) => { const m = /^([+-]?\d)?(\w\w)$/.exec(d)!; const o = m[1] ? (m[1] === "-1" ? "last " : `${ORD[Math.abs(Number(m[1]))]} `) : ""; return o + WD_NAMES[m[2]]; }));
  if (r.byMonthDay) s += ` on day ${r.byMonthDay}`;
  if (r.count) s += `, ${r.count} time${r.count === 1 ? "" : "s"}`; if (r.until) s += `, until ${r.until}`;
  return s;
}
const dayMs = 86400000;
/** Occurrences of the rule from a start date (YYYY-MM-DD), up to `n`. */
export function expandRRule(r: RRule, start: string, n = 8): string[] {
  const s = new Date(start + "T00:00:00Z"); if (Number.isNaN(s.getTime())) return []; const out: string[] = []; const limit = r.count ? Math.min(r.count, n) : n; const until = r.until ? new Date(r.until + "T00:00:00Z") : null;
  const weekStart = (d: Date) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x; };
  const w0 = weekStart(s);
  for (let i = 0; i < 366 * 6 && out.length < limit; i++) {
    const d = new Date(s.getTime() + i * dayMs); if (until && d > until) break;
    const mDiff = (d.getUTCFullYear() - s.getUTCFullYear()) * 12 + d.getUTCMonth() - s.getUTCMonth(); let ok = false;
    switch (r.freq) {
      case "DAILY": ok = i % r.interval === 0; break;
      case "WEEKLY": { const wk = Math.round((weekStart(d).getTime() - w0.getTime()) / (7 * dayMs)); const days = r.byDay.length ? r.byDay : [WD[s.getUTCDay()]]; ok = wk % r.interval === 0 && days.includes(WD[d.getUTCDay()]); break; }
      case "MONTHLY": {
        if (mDiff % r.interval) break;
        if (r.byDay.length) { const dim = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(); ok = r.byDay.some((x) => { const m = /^([+-]?\d)?(\w\w)$/.exec(x)!; if (WD[d.getUTCDay()] !== m[2]) return false; if (!m[1]) return true; const nth = Math.ceil(d.getUTCDate() / 7); const k = Number(m[1]); return k > 0 ? nth === k : d.getUTCDate() + 7 > dim && k === -1; }); }
        else ok = d.getUTCDate() === (r.byMonthDay ?? s.getUTCDate());
        break;
      }
      default: ok = (d.getUTCFullYear() - s.getUTCFullYear()) % r.interval === 0 && d.getUTCMonth() === s.getUTCMonth() && d.getUTCDate() === s.getUTCDate();
    }
    if (ok) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/* ---------------- weekly availability ---------------- */
export type Avail = boolean[][]; // [day 0=Mon..6=Sun][hour 0..23]
export const emptyAvail = (): Avail => Array.from({ length: 7 }, () => Array(24).fill(false));
export const workWeek = (): Avail => emptyAvail().map((d, i) => d.map((_, h) => i < 5 && h >= 9 && h < 17 && h !== 12));
export const availRanges = (a: Avail): string[][] => a.map((day) => { const out: string[] = []; let s = -1; for (let h = 0; h <= 24; h++) { const on = h < 24 && day[h]; if (on && s < 0) s = h; if (!on && s >= 0) { out.push(`${two(s)}:00-${two(h % 24)}:00`); s = -1; } } return out; });
export const availHours = (a: Avail) => a.flat().filter(Boolean).length;
export const copyDay = (a: Avail, from: number, to: number[]): Avail => a.map((d, i) => (to.includes(i) ? [...a[from]] : d));

/* ---------------- calendar slots ---------------- */
export type Slot = { id: string; start: string; end: string; taken: boolean };
/** Slots for 7 days from `monday` (YYYY-MM-DD) wherever availability is on, in blocks of `minutes`; a deterministic hash marks some taken. */
export function makeSlots(monday: string, avail: Avail, minutes: number): Slot[] {
  const m = new Date(monday + "T00:00:00Z"); const out: Slot[] = [];
  for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) { if (!avail[d][h]) continue;
    for (let off = 0; off + minutes <= 60; off += minutes) { const st = new Date(m.getTime() + d * dayMs + (h * 60 + off) * 60000); const en = new Date(st.getTime() + minutes * 60000); const id = st.toISOString().slice(0, 16); const hash = [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7); out.push({ id, start: st.toISOString(), end: en.toISOString(), taken: hash % 5 === 0 }); } }
  return out;
}
