// 5-field cron (min hour day-of-month month day-of-week): * lists ranges steps, names, @aliases. Next-run search is bounded.
export class CronError extends Error { constructor(m: string) { super(m); this.name = "CronError"; } }
export type Cron = { min: number[]; hour: number[]; dom: number[]; mon: number[]; dow: number[]; domAny: boolean; dowAny: boolean };
const ALIAS: Record<string, string> = { "@yearly": "0 0 1 1 *", "@annually": "0 0 1 1 *", "@monthly": "0 0 1 * *", "@weekly": "0 0 * * 0", "@daily": "0 0 * * *", "@midnight": "0 0 * * *", "@hourly": "0 * * * *" };
const MON = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], DOW = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
function field(src: string, lo: number, hi: number, names: string[] | null, label: string): number[] {
  const out = new Set<number>(); const num = (t: string): number => { const n = names ? names.indexOf(t.toLowerCase()) : -1; if (n >= 0) return n + (label === "month" ? 1 : 0); if (!/^\d+$/.test(t)) throw new CronError(`Bad ${label} value "${t}"`); return Number(t); };
  for (const part of src.split(",")) {
    const [rng, stepS] = part.split("/"); const step = stepS === undefined ? 1 : Number(stepS); if (!Number.isInteger(step) || step < 1) throw new CronError(`Bad step "${stepS}" in ${label}`);
    let a: number, b: number; if (rng === "*") { a = lo; b = hi; } else if (rng.includes("-")) { const [x, y] = rng.split("-"); a = num(x); b = num(y); } else { a = num(rng); b = stepS === undefined ? a : hi; }
    if (label === "day of week") { if (a === 7) a = 0; if (b === 7 && a !== 0) b = 6; }
    if (a < lo || b > hi || a > b) throw new CronError(`${label} must be ${lo}–${hi} (got "${part}")`);
    for (let v = a; v <= b; v += step) out.add(v);
  }
  return [...out].sort((x, y) => x - y);
}
export function parseCron(expr: string): Cron {
  const raw = expr.trim(); const e = ALIAS[raw.toLowerCase()] ?? raw; const f = e.split(/\s+/); if (f.length !== 5) throw new CronError(`Expected 5 fields (minute hour day month weekday), got ${f.length}`);
  return { min: field(f[0], 0, 59, null, "minute"), hour: field(f[1], 0, 23, null, "hour"), dom: field(f[2], 1, 31, null, "day of month"), mon: field(f[3], 1, 12, MON, "month"), dow: field(f[4], 0, 7, DOW, "day of week"), domAny: f[2] === "*", dowAny: f[4] === "*" };
}
const dayMatches = (c: Cron, d: Date) => { const dm = c.dom.includes(d.getDate()), dw = c.dow.includes(d.getDay()); return c.mon.includes(d.getMonth() + 1) && (c.domAny && c.dowAny ? true : c.domAny ? dw : c.dowAny ? dm : dm || dw); };
/** The next `n` run times strictly after `from` (local time). Searches at most ~5 years ahead. */
export function nextRuns(expr: string | Cron, from: Date, n = 5): Date[] {
  const c = typeof expr === "string" ? parseCron(expr) : expr; const out: Date[] = []; const day = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let i = 0; i < 366 * 5 && out.length < n; i++, day.setDate(day.getDate() + 1)) {
    if (!dayMatches(c, day)) continue;
    for (const h of c.hour) for (const m of c.min) { const t = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m); if (t > from) { out.push(t); if (out.length >= n) return out; } }
  }
  return out;
}
const range = (a: number[]) => a.length > 1 && a[a.length - 1] - a[0] === a.length - 1;
export function describeCron(expr: string): string {
  const c = parseCron(expr); const full = (a: number[], n: number) => a.length === n;
  const time = full(c.min, 60) && full(c.hour, 24) ? "every minute" : c.min.length === 1 && full(c.hour, 24) ? `at minute ${c.min[0]} of every hour` : full(c.min, 60) ? `every minute during ${c.hour.length > 1 ? `hours ${c.hour.join(", ")}` : `hour ${c.hour[0]}`}` : c.min.length === 1 && c.hour.length === 1 ? `at ${String(c.hour[0]).padStart(2, "0")}:${String(c.min[0]).padStart(2, "0")}` : `at ${c.hour.map((h) => c.min.map((m) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`).join(", ")).join(", ")}`;
  const days = c.domAny && c.dowAny ? "every day" : c.domAny ? `on ${range(c.dow) ? `${DOW[c.dow[0]]}–${DOW[c.dow[c.dow.length - 1]]}` : c.dow.map((d) => DOW[d]).join(", ")}` : c.dowAny ? `on day ${c.dom.join(", ")} of the month` : `on day ${c.dom.join(", ")} or ${c.dow.map((d) => DOW[d]).join(", ")}`;
  const months = full(c.mon, 12) ? "" : ` in ${c.mon.map((m) => MON[m - 1]).join(", ")}`;
  return `${time[0].toUpperCase()}${time.slice(1)}, ${days}${months}`;
}
