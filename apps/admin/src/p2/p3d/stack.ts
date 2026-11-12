/* Pure layout maths: stacking, normalising, streamgraph baselines, horizon bands, cycle plots, area paths. */
export type Offset = "none" | "expand" | "silhouette" | "wiggle";
export type Layer = { y0: number[]; y1: number[] };

/** Stack series (rows) over shared x positions. Negative values are treated as 0 (stacked areas need non-negative parts). */
export function stack(series: number[][], offset: Offset = "none"): Layer[] {
  const n = series.length, m = n ? series[0].length : 0;
  const v = series.map((s) => s.map((x) => (Number.isFinite(x) && x > 0 ? x : 0)));
  const total = Array.from({ length: m }, (_, j) => v.reduce((a, s) => a + s[j], 0));
  let base = new Array<number>(m).fill(0), scale = new Array<number>(m).fill(1);
  if (offset === "expand") scale = total.map((t) => (t > 0 ? 1 / t : 0));
  if (offset === "silhouette") base = total.map((t) => -t / 2);
  if (offset === "wiggle") {
    base = new Array<number>(m).fill(0); let y = 0;
    for (let j = 1; j < m; j++) {
      let s1 = 0, s2 = 0;
      for (let i = 0; i < n; i++) {
        let s3 = (v[i][j] - v[i][j - 1]) / 2;
        for (let k = 0; k < i; k++) s3 += v[k][j] - v[k][j - 1];
        s1 += v[i][j]; s2 += s3 * v[i][j];
      }
      base[j - 1] = y; if (s1) y -= s2 / s1;
    }
    if (m) base[m - 1] = y;
  }
  const run = base.slice(); const out: Layer[] = [];
  for (let i = 0; i < n; i++) {
    const y0 = run.slice(); const y1 = run.map((b, j) => b + v[i][j] * scale[j]);
    for (let j = 0; j < m; j++) run[j] = y1[j]; out.push({ y0, y1 });
  }
  return out;
}

/** Area path between two y arrays; xs and ys already in pixels. `smooth` uses horizontal-tangent curves (good for streamgraphs). */
export function areaPath(xs: number[], y0: number[], y1: number[], smooth = false): string {
  if (!xs.length) return "";
  const to = (xa: number, ya: number, xb: number, yb: number) => (smooth ? `C${(xa + xb) / 2},${ya} ${(xa + xb) / 2},${yb} ${xb},${yb}` : `L${xb},${yb}`);
  let d = `M${xs[0]},${y1[0]}`;
  for (let i = 1; i < xs.length; i++) d += to(xs[i - 1], y1[i - 1], xs[i], y1[i]);
  const e = xs.length - 1; d += `L${xs[e]},${y0[e]}`;
  for (let i = e - 1; i >= 0; i--) d += to(xs[i + 1], y0[i + 1], xs[i], y0[i]);
  return d + "Z";
}
export function linePath(xs: number[], ys: number[], smooth = false): string {
  return xs.map((x, i) => (i === 0 ? `M${x},${ys[i]}` : smooth ? `C${(xs[i - 1] + x) / 2},${ys[i - 1]} ${(xs[i - 1] + x) / 2},${ys[i]} ${x},${ys[i]}` : `L${x},${ys[i]}`)).join("");
}

/** Horizon chart: split a series into `bands` layers per sign. Layer k holds clamp(|v| - k*w, 0, w) / w (0..1), w = max|v| / bands. */
export function horizonBands(values: number[], bands = 3, maxAbs?: number) {
  const max = maxAbs ?? Math.max(0, ...values.map((v) => Math.abs(v))); const w = max / bands || 1;
  const layer = (sign: 1 | -1) => Array.from({ length: bands }, (_, k) => values.map((v) => (v * sign > 0 ? Math.min(1, Math.max(0, (Math.abs(v) - k * w) / w)) : 0)));
  return { width: w, pos: layer(1), neg: layer(-1) };
}

/** Cycle plot: group a flat series by position in the cycle (e.g. month) so each cycle becomes a small time series. */
export function cycleSplit(values: number[], period: number) {
  const cycles = Array.from({ length: period }, (_, c) => values.filter((_, i) => i % period === c));
  return { cycles, means: cycles.map((c) => (c.length ? c.reduce((a, b) => a + b, 0) / c.length : 0)) };
}

/** Fan chart quantile bands: widening spread around a median forecast; returns lo/hi arrays per coverage level. */
export function fanBands(median: number[], spread: number, levels = [0.5, 0.8, 0.95]) {
  const z: Record<number, number> = { 0.5: 0.674, 0.8: 1.282, 0.95: 1.96 };
  return levels.map((p) => ({ level: p, lo: median.map((m, i) => m - (z[p] ?? 1) * spread * Math.sqrt(i)), hi: median.map((m, i) => m + (z[p] ?? 1) * spread * Math.sqrt(i)) }));
}
