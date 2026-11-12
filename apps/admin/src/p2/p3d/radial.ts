/* Pure maths for radial and parts-of-whole charts: rose, clock, waffle, likert, NPS, gauge angles, ring fractions. */
export const TAU = Math.PI * 2;
/** Largest-remainder allocation: integer counts out of `cells` that always sum to exactly `cells`. */
export function waffleCounts(values: number[], cells = 100): number[] {
  const t = values.reduce((a, b) => a + Math.max(0, b), 0); if (t <= 0) return values.map(() => 0);
  const exact = values.map((v) => (Math.max(0, v) / t) * cells), base = exact.map(Math.floor); let left = cells - base.reduce((a, b) => a + b, 0);
  exact.map((e, i) => ({ i, f: e - base[i] })).sort((a, b) => b.f - a.f || a.i - b.i).forEach(({ i }) => { if (left > 0) { base[i]++; left--; } });
  return base;
}
/** Fractions of a ring: cumulative start/end angles (radians). */
export function ringAngles(values: number[], from = 0, sweep = TAU): { a0: number; a1: number }[] {
  const t = values.reduce((a, b) => a + Math.max(0, b), 0) || 1; let a = from; return values.map((v) => { const a0 = a; a += (Math.max(0, v) / t) * sweep; return { a0, a1: a }; });
}
/** Rose (Nightingale) radius: `area` keeps slice AREA proportional to value (r = R sqrt(v/max)); otherwise radius is linear. */
export const roseRadius = (v: number, max: number, R: number, area = true) => (max > 0 ? R * (area ? Math.sqrt(Math.max(0, v) / max) : Math.max(0, v) / max) : 0);
/** Clock hour to angle: 24 h around the dial, midnight at the top, clockwise. */
export const hourAngle = (h: number) => (h / 24) * TAU;
export type LRow = { label: string; counts: number[] };
export type LSeg = { cat: number; x0: number; x1: number; pct: number };
/** Diverging Likert: percentages by category; the neutral middle (odd count) is split across zero, negative categories go left. Returns segments in percent and the axis extent. */
export function likert(counts: number[]): { segs: LSeg[]; neg: number; pos: number } {
  const t = counts.reduce((a, b) => a + b, 0) || 1; const pct = counts.map((c) => (c / t) * 100); const n = counts.length; const mid = Math.floor(n / 2); const odd = n % 2 === 1;
  const left = pct.slice(0, mid).reduce((a, b) => a + b, 0) + (odd ? pct[mid] / 2 : 0); const segs: LSeg[] = []; let x = -left;
  pct.forEach((p, cat) => { segs.push({ cat, x0: x, x1: x + p, pct: p }); x += p; });
  return { segs, neg: left, pos: 100 - left };
}
/** Net Promoter Score from 0-10 ratings: promoters 9-10, passives 7-8, detractors 0-6; NPS = %promoters - %detractors (range -100..100). */
export function nps(scores: number[]) {
  const n = scores.length || 1; const pro = scores.filter((s) => s >= 9).length, pas = scores.filter((s) => s >= 7 && s <= 8).length, det = scores.length - pro - pas;
  return { promoters: (pro / n) * 100, passives: (pas / n) * 100, detractors: (det / n) * 100, score: ((pro - det) / n) * 100, n: scores.length };
}
/** Map a value to a gauge angle on an arc from `a0` to `a1` (radians from 12 o'clock). */
export const gaugeAngle = (v: number, min: number, max: number, a0: number, a1: number) => a0 + ((Math.min(max, Math.max(min, v)) - min) / (max - min || 1)) * (a1 - a0);
