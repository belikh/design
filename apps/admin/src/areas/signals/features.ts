/** Maths for D074 chart features. */
const BLOCKS = "▁▂▃▄▅▆▇█";
/** One-line block sparkline: values scaled between min and max onto 8 block heights. A flat series uses the middle block. */
export function asciiSpark(values: number[], width = values.length) {
  if (!values.length) return ""; const pts = Array.from({ length: width }, (_, i) => values[Math.min(values.length - 1, Math.floor((i * values.length) / width))]);
  const lo = Math.min(...pts), hi = Math.max(...pts); return pts.map((v) => (hi === lo ? BLOCKS[3] : BLOCKS[Math.min(7, Math.floor(((v - lo) / (hi - lo)) * 8))])).join("");
}
/** Multi-row column chart in text blocks (top row first) for terminals. Each column is `rows` characters tall with 8 sub-steps per row. */
export function asciiChart(values: number[], rows = 6, width = values.length) {
  if (!values.length) return [""]; const pts = Array.from({ length: width }, (_, i) => values[Math.min(values.length - 1, Math.floor((i * values.length) / width))]);
  const lo = Math.min(0, ...pts), hi = Math.max(...pts), total = rows * 8, eighths = pts.map((v) => (hi === lo ? 0 : Math.round(((v - lo) / (hi - lo)) * total)));
  return Array.from({ length: rows }, (_, r) => eighths.map((e) => { const left = e - (rows - 1 - r) * 8; return left <= 0 ? " " : left >= 8 ? BLOCKS[7] : BLOCKS[left - 1]; }).join(""));
}
/** Ray casting point-in-polygon, used by lasso selection. */
export function pointInPolygon(x: number, y: number, poly: [number, number][]) {
  let inside = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside; } return inside;
}
/** Convert stacked or grouped columns to shares of each column total (0..100). */
export const toPercent = (series: number[][]) => series.map((s, k) => s.map((_, i) => { const tot = series.reduce((a, r) => a + r[i], 0); return tot ? (100 * series[k][i]) / tot : 0; }));
/** Log-axis position 0..1 for a value between lo and hi (both > 0); values at or below zero clamp to the bottom. */
export const logPos = (v: number, lo: number, hi: number) => (v <= 0 ? 0 : Math.max(0, Math.min(1, (Math.log10(v) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo)))));
export type ThresholdBand = { from: number; to: number; level: "warn" | "danger"; label: string };
/** Alert markers: contiguous runs of points that sit inside a threshold band, reported once per run with the peak. */
export function breaches(values: number[], bands: ThresholdBand[]) {
  const out: { band: ThresholdBand; start: number; end: number; peak: number }[] = [];
  for (const b of bands) { let s = -1; values.forEach((v, i) => { const inb = v >= b.from && v < b.to; if (inb && s < 0) s = i; if ((!inb || i === values.length - 1) && s >= 0) { const e = inb ? i : i - 1; out.push({ band: b, start: s, end: e, peak: Math.max(...values.slice(s, e + 1)) }); s = -1; } }); }
  return out.sort((a, b) => a.start - b.start);
}
/** Cross filter: keep rows matching every active dimension filter. */
export function crossFilter<T extends Record<string, string | number>>(rows: T[], filters: Partial<Record<keyof T, string | number>>) {
  return rows.filter((r) => (Object.keys(filters) as (keyof T)[]).every((k) => filters[k] === undefined || r[k] === filters[k]));
}
