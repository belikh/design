export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const fmtBytes = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)} GB` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : n >= 1e3 ? `${(n / 1e3).toFixed(1)} kB` : `${n} B`);
export const pad = (n: number) => String(n).padStart(2, "0");
/** The demo clock used across the app: Thu 12 Nov 2026, 17:52. */
export const NOW = new Date(2026, 10, 12, 17, 52);
export const fmtStamp = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
