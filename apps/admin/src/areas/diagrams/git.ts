// D054: commit calendar, branch lanes, deploy frequency and lead time.
export const isoDay = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
export type CalCell = { date: string; week: number; dow: number; count: number; level: 0 | 1 | 2 | 3 | 4 };
/** Week columns (Sunday first) ending with the week containing `end`. Level 0 = no commits; 1-4 are quartiles of the non-zero days. */
export function calendar(counts: Record<string, number>, end: Date, weeks: number) {
  const endSat = addDays(end, 6 - end.getUTCDay()); const start = addDays(endSat, -(weeks * 7 - 1));
  const cells: CalCell[] = []; for (let i = 0; i < weeks * 7; i++) { const d = addDays(start, i); const date = isoDay(d); cells.push({ date, week: Math.floor(i / 7), dow: d.getUTCDay(), count: date > isoDay(end) ? 0 : counts[date] ?? 0, level: 0 }); }
  const nz = cells.filter((c) => c.count > 0).map((c) => c.count).sort((a, b) => a - b); const q = (p: number) => nz[Math.min(nz.length - 1, Math.floor(p * nz.length))];
  const t = nz.length ? [q(0.25), q(0.5), q(0.75)] : [0, 0, 0];
  for (const c of cells) c.level = c.count === 0 ? 0 : c.count <= t[0] ? 1 : c.count <= t[1] ? 2 : c.count <= t[2] ? 3 : 4;
  return { cells, start: isoDay(start), end: isoDay(endSat) };
}
export type Commit = { id: string; branch: string; parents: string[]; msg: string; author: string; tag?: string };
/** Commits are given oldest first. A branch takes the lowest free lane when its first commit appears and releases it after it is merged (a later commit lists its tip as a non-first parent). */
export function assignLanes(commits: Commit[]) {
  const row = new Map(commits.map((c, i) => [c.id, i])); const laneOf = new Map<string, number>(); const free: number[] = []; let max = 0; const out: { id: string; row: number; lane: number }[] = [];
  const last = new Map<string, number>(); commits.forEach((c, i) => last.set(c.branch, i));
  const merged = new Map<number, string[]>(); // row -> branches released after that row
  commits.forEach((c, i) => c.parents.slice(1).forEach((p) => { const b = commits[row.get(p)!]?.branch; if (b && b !== c.branch && last.get(b)! <= i) merged.set(i, [...(merged.get(i) ?? []), b]); }));
  commits.forEach((c, i) => {
    if (!laneOf.has(c.branch)) { const l = free.length ? free.sort((a, b) => a - b).shift()! : max++; laneOf.set(c.branch, l); }
    out.push({ id: c.id, row: i, lane: laneOf.get(c.branch)! });
    for (const b of merged.get(i) ?? []) { free.push(laneOf.get(b)!); }
  });
  return { nodes: out, lanes: max, laneOf };
}
export type Deploy = { at: number; ok: boolean; commits?: number }; // at = epoch ms
export const weeklyCounts = (deploys: Deploy[], start: number, weeks: number) => { const c = Array(weeks).fill(0); for (const d of deploys) { const w = Math.floor((d.at - start) / (7 * 86400000)); if (w >= 0 && w < weeks) c[w]++; } return c as number[]; };
/** DORA 2023-style bands from deployments per day averaged over the window. */
export const doraFrequency = (perDay: number): "Elite" | "High" | "Medium" | "Low" => (perDay >= 1 ? "Elite" : perDay >= 1 / 7 ? "High" : perDay >= 1 / 30 ? "Medium" : "Low");
export const doraLeadTime = (hours: number): "Elite" | "High" | "Medium" | "Low" => (hours < 24 ? "Elite" : hours < 168 ? "High" : hours < 720 ? "Medium" : "Low");
export const quantile = (xs: number[], p: number) => { if (!xs.length) return NaN; const s = [...xs].sort((a, b) => a - b); const i = p * (s.length - 1); const lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };
export function histogram(xs: number[], edges: number[]) { const c = Array(edges.length + 1).fill(0); for (const x of xs) { let i = edges.findIndex((e) => x < e); if (i < 0) i = edges.length; c[i]++; } return c as number[]; }
