/** Maths for D060 (candlestick, depth, control, error bars) and D066 (budget variance, ageing, bridge). Pure functions, no DOM. */
export type Candle = { t: string; o: number; h: number; l: number; c: number; v?: number };
export type CandleGeom = { up: boolean; bodyTop: number; bodyH: number; wickTop: number; wickBottom: number };

/** Pixel geometry of one candle for a y scale (higher value = smaller y). Body is at least 1 unit tall so a doji stays visible. */
export function candleGeom(c: Candle, y: (v: number) => number): CandleGeom {
  const yo = y(c.o), yc = y(c.c);
  return { up: c.c >= c.o, bodyTop: Math.min(yo, yc), bodyH: Math.max(1, Math.abs(yo - yc)), wickTop: y(c.h), wickBottom: y(c.l) };
}
/** A candle is valid when high and low enclose open and close. */
export const candleValid = (c: Candle) => c.h >= Math.max(c.o, c.c) && c.l <= Math.min(c.o, c.c);

export type Level = { p: number; q: number };
/** Cumulative depth: bids descend from the best bid, asks ascend from the best ask; `cum` is the running volume. */
export function depthCurves(bids: Level[], asks: Level[]) {
  const run = (a: Level[]) => { let s = 0; return a.map((l) => ({ p: l.p, cum: (s += l.q) })); };
  return { bids: run([...bids].sort((a, b) => b.p - a.p)), asks: run([...asks].sort((a, b) => a.p - b.p)) };
}
export const midPrice = (bids: Level[], asks: Level[]) => (bids.length && asks.length ? (Math.max(...bids.map((b) => b.p)) + Math.min(...asks.map((a) => a.p))) / 2 : NaN);

export const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN);
/** Population standard deviation. */
export const stdev = (v: number[]) => { const m = mean(v); return v.length ? Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length) : NaN; };
/** Shewhart limits: centre line = mean, control limits = mean ± 3σ, taken from the first `baseline` points (all points by default). */
export function controlLimits(values: number[], baseline = values.length) {
  const base = values.slice(0, baseline), m = mean(base), s = stdev(base);
  return { mean: m, sigma: s, ucl: m + 3 * s, lcl: m - 3 * s, uwl: m + 2 * s, lwl: m - 2 * s };
}
/** Indices outside the control limits, plus runs of 7 on one side of the centre line (a Western Electric style signal). */
export function controlSignals(values: number[], lim: ReturnType<typeof controlLimits>) {
  const out = new Set<number>(); values.forEach((v, i) => { if (v > lim.ucl || v < lim.lcl) out.add(i); });
  let run = 0, side = 0;
  values.forEach((v, i) => { const s = Math.sign(v - lim.mean); run = s !== 0 && s === side ? run + 1 : s !== 0 ? 1 : 0; side = s; if (run >= 7) for (let k = i - 6; k <= i; k++) out.add(k); });
  return [...out].sort((a, b) => a - b);
}
/** Mean, sample SD, standard error and a normal 95% interval of one group. */
export function errorStats(values: number[]) {
  const n = values.length, m = mean(values), sd = n > 1 ? Math.sqrt(values.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1)) : 0, se = n ? sd / Math.sqrt(n) : NaN;
  return { n, mean: m, sd, se, lo: m - 1.96 * se, hi: m + 1.96 * se };
}

export type BudgetRow = { label: string; budget: number; actual: number; kind: "cost" | "revenue" };
/** Variance is actual minus budget. It is favourable when revenue is above plan or cost is below plan. */
export function budgetVariance(rows: BudgetRow[]) {
  return rows.map((r) => { const variance = r.actual - r.budget; return { ...r, variance, pct: r.budget ? variance / r.budget : 0, favourable: r.kind === "revenue" ? variance >= 0 : variance <= 0 }; });
}
export type Invoice = { id: string; customer: string; due: number; amount: number };
export const AGEING_LABELS = ["Not yet due", "1-30 days", "31-60 days", "61-90 days", "Over 90 days"];
/** Bucket open invoices by days past due on `asOf` (day numbers). Every invoice lands in exactly one bucket. */
export function ageingBuckets(invoices: Invoice[], asOf: number) {
  const b = AGEING_LABELS.map((label) => ({ label, amount: 0, count: 0 }));
  for (const inv of invoices) { const late = asOf - inv.due; const k = late <= 0 ? 0 : late <= 30 ? 1 : late <= 60 ? 2 : late <= 90 ? 3 : 4; b[k].amount += inv.amount; b[k].count++; }
  return b;
}
export type BridgeStep = { label: string; value: number; total?: boolean };
/** Cash-flow bridge: deltas move a running level; a `total` step shows the running level (the first step, if a total, sets the opening balance). */
export function bridgeSteps(steps: BridgeStep[]) {
  let run = 0;
  return steps.map((s, k) => { if (s.total) { if (k === 0) run = s.value; return { ...s, from: 0, to: run, delta: run }; } const from = run; run += s.value; return { ...s, from, to: run, delta: s.value }; });
}
