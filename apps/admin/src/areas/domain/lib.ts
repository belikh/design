// Shared helpers for the domain modules. All fixtures use a fixed "now" so numbers (and tests) are deterministic.
export const NOW = new Date(2026, 10, 12, 17, 0, 0);
export const DAY = 86_400_000;
const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const parseIso = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`);
export const daysUntil = (iso: string, now: Date = NOW) => Math.round((midnight(parseIso(iso)) - midnight(now)) / DAY);
export const fmtDate = (iso: string) => parseIso(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
export const fmtShort = (iso: string) => parseIso(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
export const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
export const minutesToText = (m: number) => (m < 1 ? "<1 min" : m < 60 ? `${Math.round(m)} min` : m < 1440 ? `${Math.floor(m / 60)} h ${Math.round(m % 60)} m` : `${Math.floor(m / 1440)} d ${Math.floor((m % 1440) / 60)} h`);
export const bytesText = (b: number) => (b >= 1e12 ? `${(b / 1e12).toFixed(2)} TB` : b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} kB`);
export const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
export const mean = (a: number[]) => (a.length ? sum(a) / a.length : 0);
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const hhmm = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(Math.round(min % 60)).padStart(2, "0")}`;
/** Deterministic pseudo-random sequence from a seed (same as the rest of the app's fixtures). */
export function prng(seed: number) { let s = Math.imul(seed ^ 0x9e3779b9, 2654435761) >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
