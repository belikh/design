// Pure numeric/date helpers: money, units, durations, allocation, ratios, natural-language dates, fiscal periods, time zones.

/* ---------- money ---------- */
export const CURRENCIES = [{ code: "AUD", name: "Australian dollar", digits: 2 }, { code: "USD", name: "US dollar", digits: 2 }, { code: "EUR", name: "Euro", digits: 2 }, { code: "GBP", name: "Pound sterling", digits: 2 }, { code: "JPY", name: "Japanese yen", digits: 0 }, { code: "NZD", name: "New Zealand dollar", digits: 2 }, { code: "KWD", name: "Kuwaiti dinar", digits: 3 }];
export const currencyDigits = (code: string) => CURRENCIES.find((c) => c.code === code)?.digits ?? 2;
/** Money is stored as integer minor units (cents) so arithmetic never drifts. */
export const toMinor = (major: number, code: string) => Math.round(major * 10 ** currencyDigits(code));
export const fromMinor = (minor: number, code: string) => minor / 10 ** currencyDigits(code);
export const formatMoney = (minor: number, code: string, locale = "en-AU") => new Intl.NumberFormat(locale, { style: "currency", currency: code, minimumFractionDigits: currencyDigits(code), maximumFractionDigits: currencyDigits(code) }).format(fromMinor(minor, code));
/** Parse "1,234.5", "$1 234,50", "12k" (also "1.5m") into a number; returns NaN if not a number. */
export function parseAmount(s: string): number {
  let t = s.trim().toLowerCase().replace(/[^\d.,kmb-]/g, ""); if (!t) return NaN; let mult = 1; if (/k$/.test(t)) { mult = 1e3; t = t.slice(0, -1); } else if (/m$/.test(t)) { mult = 1e6; t = t.slice(0, -1); } else if (/b$/.test(t)) { mult = 1e9; t = t.slice(0, -1); } if (!/\d/.test(t)) return NaN;
  const lastDot = t.lastIndexOf("."), lastComma = t.lastIndexOf(","); const dec = lastDot > lastComma ? "." : lastComma > lastDot ? "," : ""; if (dec) { const parts = t.split(dec); if (parts.length > 2 && dec === ",") t = t.replace(/,/g, ""); else { const frac = parts.pop()!; t = parts.join("").replace(/[.,]/g, "") + (frac.length === 3 && parts.length === 0 ? frac : "." + frac); if (frac.length === 3 && dec === "," && !t.includes(".")) t = t; } } t = t.replace(/,/g, "");
  const n = Number(t); return Number.isFinite(n) ? n * mult : NaN;
}

/* ---------- units ---------- */
export type UnitKind = "length" | "mass" | "temperature" | "data" | "time" | "speed";
export const UNITS: Record<UnitKind, { base: string; units: Record<string, number> }> = {
  length: { base: "m", units: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, mi: 1609.344 } },
  mass: { base: "kg", units: { g: 0.001, kg: 1, t: 1000, oz: 0.028349523125, lb: 0.45359237 } },
  temperature: { base: "°C", units: { "°C": 1, "°F": 1, K: 1 } },
  data: { base: "B", units: { B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KiB: 1024, MiB: 1048576, GiB: 1073741824 } },
  time: { base: "s", units: { ms: 0.001, s: 1, min: 60, h: 3600, d: 86400 } },
  speed: { base: "m/s", units: { "m/s": 1, "km/h": 1 / 3.6, mph: 0.44704, kn: 0.514444 } },
};
export function convert(v: number, from: string, to: string, kind: UnitKind): number {
  if (kind === "temperature") { const c = from === "°F" ? ((v - 32) * 5) / 9 : from === "K" ? v - 273.15 : v; return to === "°F" ? (c * 9) / 5 + 32 : to === "K" ? c + 273.15 : c; }
  const u = UNITS[kind].units; return (v * u[from]) / u[to];
}
export const roundSig = (v: number, sig = 6) => (v === 0 ? 0 : Number(v.toPrecision(sig)));

/* ---------- duration ---------- */
/** Parse "1h 30m", "90m", "1.5h", "01:30:00", "2d 3h", "45" (minutes). Returns seconds or null. */
export function parseDuration(s: string): number | null {
  const t = s.trim().toLowerCase(); if (!t) return null;
  if (/^\d{1,3}:\d{2}(:\d{2})?$/.test(t)) { const p = t.split(":").map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 3600 + p[1] * 60; }
  if (/^\d+(\.\d+)?$/.test(t)) return Math.round(Number(t) * 60);
  const re = /(\d+(?:\.\d+)?)\s*(d|h|m|s)(?![a-z])/g; let total = 0, hit = 0, m: RegExpExecArray | null;
  while ((m = re.exec(t))) { total += Number(m[1]) * { d: 86400, h: 3600, m: 60, s: 1 }[m[2] as "d"]; hit++; }
  return hit && t.replace(re, "").replace(/[\s,]|\band\b/g, "") === "" ? Math.round(total) : null;
}
export function formatDuration(sec: number, long = false): string { const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60), s = Math.round(sec % 60); const p: string[] = []; if (d) p.push(long ? `${d} day${d > 1 ? "s" : ""}` : `${d}d`); if (h) p.push(long ? `${h} hour${h > 1 ? "s" : ""}` : `${h}h`); if (m) p.push(long ? `${m} minute${m > 1 ? "s" : ""}` : `${m}m`); if (s || !p.length) p.push(long ? `${s} second${s !== 1 ? "s" : ""}` : `${s}s`); return p.join(long ? " " : " "); }
export const toIsoDuration = (sec: number) => { const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60), s = Math.round(sec % 60); return `P${d ? d + "D" : ""}${h || m || s || !d ? "T" : ""}${h ? h + "H" : ""}${m ? m + "M" : ""}${s || (!d && !h && !m) ? s + "S" : ""}`; };

/* ---------- allocation / ratio ---------- */
/** Set one allocation and redistribute the rest proportionally so the total stays `total`. Locked entries do not move. */
export function rebalance(values: number[], idx: number, next: number, locked: boolean[] = [], total = 100): number[] {
  const lockedSum = values.reduce((a, v, i) => a + (locked[i] && i !== idx ? v : 0), 0); const free = values.map((_, i) => i).filter((i) => i !== idx && !locked[i]);
  const target = Math.max(0, Math.min(total - lockedSum, next)); const rest = total - lockedSum - target; const cur = free.reduce((a, i) => a + values[i], 0); const out = [...values]; out[idx] = target;
  if (!free.length) return out.map((v, i) => (i === idx ? total - lockedSum - 0 : v)).map((v, i) => (i === idx ? Math.min(target, total - lockedSum) : v));
  let acc = 0; free.forEach((i, k) => { const share = k === free.length - 1 ? rest - acc : Math.round(cur > 0 ? (values[i] / cur) * rest : rest / free.length); out[i] = Math.max(0, share); acc += out[i]; });
  const diff = total - out.reduce((a, b) => a + b, 0); if (diff && free.length) out[free[free.length - 1]] += diff; return out;
}
export const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
export const simplifyRatio = (w: number, h: number) => { const g = gcd(Math.round(w), Math.round(h)) || 1; return [Math.round(w) / g, Math.round(h) / g] as [number, number]; };

/* ---------- natural language dates ---------- */
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]; const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
/** Understand "today", "tomorrow", "next friday", "in 3 weeks", "end of month", "15 dec", "dec 15 2027", "2026-12-01", "+10d". */
export function parseNaturalDate(input: string, today = new Date()): Date | null {
  const t = input.trim().toLowerCase(); if (!t) return null; const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (t === "today" || t === "now") return base; if (t === "tomorrow") return addDays(base, 1); if (t === "yesterday") return addDays(base, -1);
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t); if (m) { const d = new Date(+m[1], +m[2] - 1, +m[3]); return d.getMonth() === +m[2] - 1 ? d : null; }
  m = /^([+-])(\d+)\s*(d|w|m|y)$/.exec(t); if (m) { const n = (m[1] === "-" ? -1 : 1) * Number(m[2]); const d = new Date(base); if (m[3] === "d") d.setDate(d.getDate() + n); else if (m[3] === "w") d.setDate(d.getDate() + 7 * n); else if (m[3] === "m") d.setMonth(d.getMonth() + n); else d.setFullYear(d.getFullYear() + n); return d; }
  m = /^in\s+(\d+)\s+(day|week|month|year)s?$/.exec(t); if (m) { const n = Number(m[1]); const d = new Date(base); if (m[2] === "day") d.setDate(d.getDate() + n); else if (m[2] === "week") d.setDate(d.getDate() + 7 * n); else if (m[2] === "month") d.setMonth(d.getMonth() + n); else d.setFullYear(d.getFullYear() + n); return d; }
  m = /^(\d+)\s+(day|week|month)s?\s+ago$/.exec(t); if (m) { const n = Number(m[1]); const d = new Date(base); if (m[2] === "day") d.setDate(d.getDate() - n); else if (m[2] === "week") d.setDate(d.getDate() - 7 * n); else d.setMonth(d.getMonth() - n); return d; }
  m = /^(next|last|this)?\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/.exec(t);
  if (m) { // "friday" = upcoming (today if today); "this friday" same; "next friday" = that weekday in the following Mon-Sun week; "last friday" = most recent before today
    const target = DAYS.indexOf(m[2]); const sinceMon = (base.getDay() + 6) % 7; const tMon = (target + 6) % 7;
    if (m[1] === "next") return addDays(base, 7 - sinceMon + tMon); if (m[1] === "last") return addDays(base, -(((sinceMon - tMon + 7) % 7) || 7));
    return addDays(base, (target - base.getDay() + 7) % 7);
  }
  if (t === "end of month" || t === "eom") return new Date(base.getFullYear(), base.getMonth() + 1, 0); if (t === "start of month") return new Date(base.getFullYear(), base.getMonth(), 1); if (t === "end of year") return new Date(base.getFullYear(), 11, 31); if (t === "end of week") return addDays(base, (7 - base.getDay()) % 7);
  if (t === "next month") return new Date(base.getFullYear(), base.getMonth() + 1, base.getDate()); if (t === "next week") return addDays(base, 7); if (t === "next year") return new Date(base.getFullYear() + 1, base.getMonth(), base.getDate());
  if (t === "end of financial year" || t === "eofy") return new Date(base.getMonth() >= 6 ? base.getFullYear() + 1 : base.getFullYear(), 5, 30);
  const mi = (s: string) => MONTHS.findIndex((x) => x.startsWith(s.slice(0, 3)));
  m = /^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})(?:\s+(\d{4}))?$/.exec(t); if (m && mi(m[2]) >= 0) { const d = new Date(m[3] ? +m[3] : base.getFullYear(), mi(m[2]), +m[1]); if (!m[3] && d < base) d.setFullYear(d.getFullYear() + 1); return d.getDate() === +m[1] ? d : null; }
  m = /^([a-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?$/.exec(t); if (m && mi(m[1]) >= 0) { const d = new Date(m[3] ? +m[3] : base.getFullYear(), mi(m[1]), +m[2]); if (!m[3] && d < base) d.setFullYear(d.getFullYear() + 1); return d.getDate() === +m[2] ? d : null; }
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(t); if (m) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; const d = new Date(y, +m[2] - 1, +m[1]); return d.getMonth() === +m[2] - 1 ? d : null; } // AU: day first
  return null;
}

/* ---------- fiscal periods (Australia: 1 Jul - 30 Jun; FY named for the year it ends) ---------- */
export type Fiscal = { fy: number; quarter: 1 | 2 | 3 | 4; label: string };
export function fiscalOf(d: Date, startMonth = 6): Fiscal { const m = d.getMonth(); const shifted = (m - startMonth + 12) % 12; const fy = d.getFullYear() + (m >= startMonth && startMonth !== 0 ? 1 : 0); const quarter = (Math.floor(shifted / 3) + 1) as 1 | 2 | 3 | 4; return { fy, quarter, label: `FY${fy} Q${quarter}` }; }
export function fiscalRange(fy: number, quarter?: 1 | 2 | 3 | 4, startMonth = 6): [Date, Date] { const startYear = startMonth === 0 ? fy : fy - 1; if (!quarter) return [new Date(startYear, startMonth, 1), new Date(startYear, startMonth + 12, 0)]; const s = new Date(startYear, startMonth + (quarter - 1) * 3, 1); return [s, new Date(s.getFullYear(), s.getMonth() + 3, 0)]; }

/* ---------- time zones ---------- */
export const ZONES = ["Australia/Brisbane", "Australia/Sydney", "Australia/Perth", "Pacific/Auckland", "Asia/Tokyo", "Asia/Singapore", "Asia/Kolkata", "Asia/Dubai", "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "UTC"];
/** Offset in minutes (zone minus UTC) at an instant. */
export function tzOffsetMin(zone: string, at: Date): number { const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(at); const g = (t: string) => Number(parts.find((p) => p.type === t)!.value); const asUtc = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second")); return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000); }
/** Interpret local wall time (y-m-d h:m) in a zone as an instant. */
export function zonedToInstant(y: number, mo: number, d: number, h: number, mi: number, zone: string): Date { const guess = Date.UTC(y, mo - 1, d, h, mi); let off = tzOffsetMin(zone, new Date(guess)); let t = guess - off * 60000; off = tzOffsetMin(zone, new Date(t)); t = guess - off * 60000; return new Date(t); }
export const fmtInZone = (at: Date, zone: string, opts: Intl.DateTimeFormatOptions = {}) => new Intl.DateTimeFormat("en-AU", { timeZone: zone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", ...opts }).format(at);
export const offsetLabel = (zone: string, at: Date) => { const o = tzOffsetMin(zone, at); const s = o < 0 ? "-" : "+"; const a = Math.abs(o); return `UTC${s}${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`; };
export type Hours = Record<string, [number, number] | null>; // minutes since local midnight; null = closed
export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
/** Overlap of two zones' working hours for each weekday, as minutes in zone A local time. */
export function hoursOverlap(a: Hours, zoneA: string, b: Hours, zoneB: string, on: Date): Record<string, [number, number] | null> {
  const dOff = tzOffsetMin(zoneB, on) - tzOffsetMin(zoneA, on); const out: Record<string, [number, number] | null> = {};
  for (const k of DAY_KEYS) { const ha = a[k], hb = b[k]; if (!ha || !hb) { out[k] = null; continue; } const bs = hb[0] - dOff, be = hb[1] - dOff; const s = Math.max(ha[0], bs), e = Math.min(ha[1], be); out[k] = e > s ? [s, e] : null; }
  return out;
}
