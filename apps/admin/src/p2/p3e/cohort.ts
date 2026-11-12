// D050: cohort retention and funnel arithmetic.
export type User = { cohort: number; active: number[] }; // cohort = signup period index; active = absolute periods with activity
export type CohortRow = { cohort: number; size: number; counts: (number | null)[]; pct: (number | null)[] };
/** Retention triangle: counts[k] = users active k periods after signup; null where the period has not happened yet. Period 0 is the signup period (everyone counts). */
export function cohorts(users: User[], periods: number): { rows: CohortRow[]; avg: (number | null)[] } {
  const rows: CohortRow[] = [];
  for (let c = 0; c < periods; c++) {
    const us = users.filter((u) => u.cohort === c); const size = us.length;
    const counts = Array.from({ length: periods }, (_, k) => (c + k >= periods ? null : us.filter((u) => k === 0 || u.active.includes(c + k)).length));
    rows.push({ cohort: c, size, counts, pct: counts.map((n) => (n === null || !size ? null : n / size)) });
  }
  // size-weighted average: only cohorts old enough to have data for offset k contribute
  const avg = Array.from({ length: periods }, (_, k) => { const rs = rows.filter((r) => r.counts[k] !== null && r.size); const s = rs.reduce((a, r) => a + r.size, 0); return s ? rs.reduce((a, r) => a + r.counts[k]!, 0) / s : null; });
  return { rows, avg };
}
export type FunnelStep = { name: string; count: number; fromPrev: number; fromTop: number; lost: number };
export function funnel(steps: { name: string; count: number }[]): FunnelStep[] {
  const top = steps[0]?.count ?? 0;
  return steps.map((s, i) => { const prev = i ? steps[i - 1].count : s.count; return { name: s.name, count: s.count, fromPrev: prev ? s.count / prev : 0, fromTop: top ? s.count / top : 0, lost: i ? prev - s.count : 0 }; });
}
