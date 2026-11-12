/* Pure layout maths for business charts: waterfall, Pareto, funnel, pyramid, bump ranks, Marimekko. */
export type WStep = { label: string; value: number; total?: boolean };
export type WBar = { label: string; start: number; end: number; delta: number; total: boolean };
/** Waterfall: each step floats from the running total; `total` steps show the running total as a bar from zero. */
export function waterfall(steps: WStep[]): WBar[] {
  let run = 0; return steps.map((s) => { if (s.total) { return { label: s.label, start: 0, end: run, delta: run, total: true }; } const start = run; run += s.value; return { label: s.label, start, end: run, delta: s.value, total: false }; });
}
export type PItem = { label: string; value: number; cum: number; share: number };
/** Pareto: sort descending, cumulative share of total. `vitalFew` = number of items needed to reach `cut` (default 80%). */
export function pareto(items: { label: string; value: number }[], cut = 0.8): { rows: PItem[]; vitalFew: number } {
  const s = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value); const t = s.reduce((a, b) => a + b.value, 0); let c = 0;
  const rows = s.map((i) => { c += i.value; return { label: i.label, value: i.value, share: i.value / t, cum: c / t }; });
  const vf = rows.findIndex((r) => r.cum >= cut - 1e-9); return { rows, vitalFew: vf < 0 ? rows.length : vf + 1 };
}
export type FStep = { label: string; value: number; ofFirst: number; ofPrev: number; lost: number };
export function funnel(steps: { label: string; value: number }[]): FStep[] {
  const f = steps[0]?.value || 0; return steps.map((s, i) => ({ label: s.label, value: s.value, ofFirst: f ? s.value / f : 0, ofPrev: i === 0 ? 1 : steps[i - 1].value ? s.value / steps[i - 1].value : 0, lost: i === 0 ? 0 : Math.max(0, steps[i - 1].value - s.value) }));
}
/** Rank per period (1 = highest value). Ties keep input order so ranks are always a permutation of 1..n. */
export function bumpRanks(series: { name: string; values: number[] }[]): number[][] {
  const T = series[0]?.values.length ?? 0; const ranks = series.map(() => new Array<number>(T).fill(0));
  for (let t = 0; t < T; t++) series.map((s, i) => ({ i, v: s.values[t] })).sort((a, b) => b.v - a.v || a.i - b.i).forEach((e, r) => { ranks[e.i][t] = r + 1; });
  return ranks;
}
export type MCell = { col: string; row: string; x: number; y: number; w: number; h: number; value: number };
/** Marimekko: column width = column share of grand total, cell height = row share of the column. Fractions of the unit square. */
export function marimekko(cols: { label: string; parts: { label: string; value: number }[] }[]): { cells: MCell[]; colWidths: number[] } {
  const totals = cols.map((c) => c.parts.reduce((a, p) => a + Math.max(0, p.value), 0)); const grand = totals.reduce((a, b) => a + b, 0) || 1; let x = 0; const cells: MCell[] = [];
  cols.forEach((c, i) => { const w = totals[i] / grand; let y = 0; for (const p of c.parts) { const h = totals[i] ? Math.max(0, p.value) / totals[i] : 0; cells.push({ col: c.label, row: p.label, x, y, w, h, value: p.value }); y += h; } x += w; });
  return { cells, colWidths: totals.map((t) => t / grand) };
}
