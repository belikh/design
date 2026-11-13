/* Pure statistics: quantiles, box stats, histogram, kernel density, ECDF, normal QQ, beeswarm. */
export const sortAsc = (v: number[]) => v.filter(Number.isFinite).sort((a, b) => a - b);
export const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);
export const sd = (v: number[]) => { if (v.length < 2) return 0; const m = mean(v); return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1)); };

/** Quantile by linear interpolation (R type 7); `sorted` must be ascending. */
export function quantile(sorted: number[], p: number): number {
  if (!sorted.length) return NaN; const h = (sorted.length - 1) * Math.min(1, Math.max(0, p)); const lo = Math.floor(h), hi = Math.ceil(h);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (h - lo);
}
export type Box = { n: number; min: number; q1: number; median: number; q3: number; max: number; whiskerLo: number; whiskerHi: number; outliers: number[] };
/** Tukey box: whiskers reach the furthest points within 1.5 x IQR of the quartiles; the rest are outliers. */
export function boxStats(values: number[]): Box {
  const s = sortAsc(values.slice()); if (!s.length) return { n: 0, min: NaN, q1: NaN, median: NaN, q3: NaN, max: NaN, whiskerLo: NaN, whiskerHi: NaN, outliers: [] };
  const q1 = quantile(s, 0.25), median = quantile(s, 0.5), q3 = quantile(s, 0.75), iqr = q3 - q1, lf = q1 - 1.5 * iqr, uf = q3 + 1.5 * iqr;
  const inside = s.filter((x) => x >= lf && x <= uf);
  return { n: s.length, min: s[0], q1, median, q3, max: s[s.length - 1], whiskerLo: inside[0], whiskerHi: inside[inside.length - 1], outliers: s.filter((x) => x < lf || x > uf) };
}

export type Bin = { x0: number; x1: number; count: number };
/** Equal-width bins over [lo, hi]; the last bin includes its upper edge. Counts always sum to the number of in-range values. */
export function histogram(values: number[], bins: number, lo?: number, hi?: number): Bin[] {
  const s = sortAsc(values.slice()); if (!s.length || bins < 1) return [];
  const a = lo ?? s[0]; let b = hi ?? s[s.length - 1]; if (b === a) b = a + 1; const w = (b - a) / bins;
  const out: Bin[] = Array.from({ length: bins }, (_, i) => ({ x0: a + i * w, x1: a + (i + 1) * w, count: 0 }));
  for (const x of s) { if (x < a || x > b) continue; out[Math.min(bins - 1, Math.floor((x - a) / w))].count++; }
  return out;
}
export const sturges = (n: number) => Math.max(1, Math.ceil(Math.log2(Math.max(1, n)) + 1));

/** Silverman's rule of thumb bandwidth. */
export function silverman(values: number[]): number {
  const s = sortAsc(values.slice()); if (s.length < 2) return 1; const iqr = quantile(s, 0.75) - quantile(s, 0.25), sig = sd(s);
  const spread = Math.min(sig, iqr / 1.34) || sig || 1; return 0.9 * spread * s.length ** -0.2;
}
/** Gaussian kernel density estimate on an even grid; integrates to about 1. */
export function kde(values: number[], lo: number, hi: number, steps = 64, bw?: number): { x: number; y: number }[] {
  const v = values.filter(Number.isFinite); if (!v.length) return []; const h = bw ?? silverman(v); const c = 1 / (v.length * h * Math.sqrt(2 * Math.PI));
  return Array.from({ length: steps }, (_, i) => { const x = lo + ((hi - lo) * i) / (steps - 1); let t = 0; for (const d of v) t += Math.exp(-0.5 * ((x - d) / h) ** 2); return { x, y: c * t }; });
}

/** Empirical CDF as step points: after the i-th smallest value, p = (i+1)/n. */
export function ecdf(values: number[]): { x: number; p: number }[] { const s = sortAsc(values.slice()); return s.map((x, i) => ({ x, p: (i + 1) / s.length })); }

/** Inverse standard normal CDF (Acklam's rational approximation, relative error about 1e-9). */
export function invNorm(p: number): number {
  if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239], b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783], d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - pl) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  const q = p - 0.5, r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
/** Normal QQ points: theoretical z at plotting positions (i - 0.5) / n against the sorted sample. */
export function qqNormal(values: number[]): { z: number; v: number }[] { const s = sortAsc(values.slice()); return s.map((v, i) => ({ z: invNorm((i + 0.5) / s.length), v })); }
/** Reference line through the quartiles (the usual robust QQ line): returns slope and intercept in sample units per z. */
export function qqLine(values: number[]): { slope: number; intercept: number } {
  const s = sortAsc(values.slice()); if (s.length < 2) return { slope: 0, intercept: s[0] ?? 0 };
  const q1 = quantile(s, 0.25), q3 = quantile(s, 0.75), z1 = invNorm(0.25), z3 = invNorm(0.75), slope = (q3 - q1) / (z3 - z1); return { slope, intercept: q1 - slope * z1 };
}

/** Beeswarm offsets: `pos` are pixel positions on the value axis; returns a perpendicular pixel offset per point so circles of radius r never overlap. */
export function beeswarm(pos: number[], r: number): number[] {
  const order = pos.map((_, i) => i).sort((a, b) => pos[a] - pos[b]); const placed: { p: number; o: number }[] = []; const out = new Array<number>(pos.length).fill(0); const D = 2 * r;
  for (const i of order) {
    const cand = [0]; for (const q of placed) { if (Math.abs(q.p - pos[i]) < D) { const dy = Math.sqrt(Math.max(0, D * D - (q.p - pos[i]) ** 2)); cand.push(q.o + dy, q.o - dy); } }
    cand.sort((a, b) => Math.abs(a) - Math.abs(b) || b - a);
    const ok = cand.find((o) => placed.every((q) => (q.p - pos[i]) ** 2 + (q.o - o) ** 2 >= D * D - 1e-6)) ?? 0;
    out[i] = ok; placed.push({ p: pos[i], o: ok });
  }
  return out;
}
/** Deterministic pseudo-random generator for sample data. */
export function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function normals(seed: number, n: number, mu: number, sigma: number): number[] { const r = rng(seed); return Array.from({ length: n }, () => mu + sigma * Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r())); }
