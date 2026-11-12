import { aggregate, type Agg } from "@belikh/jupiter-ui/tableUtils.ts";

export type PivotResult<T> = { rows: string[]; cols: string[]; cells: (number | null)[][]; groups: Map<string, T[]>; rowTotals: number[]; colTotals: number[]; grand: number; min: number; max: number };
/** Cross-tab: aggregate `val` for every (row key, column key) pair, with row/column/grand totals (computed from the raw values, so averages stay correct). */
export function pivot<T>(rows: T[], rowKey: (r: T) => string, colKey: (r: T) => string, val: (r: T) => unknown, agg: Agg, sortKeys: "alpha" | "total" = "alpha"): PivotResult<T> {
  const groups = new Map<string, T[]>(); const rs = new Map<string, T[]>(); const cs = new Map<string, T[]>();
  for (const r of rows) { const a = rowKey(r), b = colKey(r); (groups.get(`${a}\u0000${b}`) ?? groups.set(`${a}\u0000${b}`, []).get(`${a}\u0000${b}`)!).push(r); (rs.get(a) ?? rs.set(a, []).get(a)!).push(r); (cs.get(b) ?? cs.set(b, []).get(b)!).push(r); }
  const tot = (rs: T[]) => aggregate(rs.map(val), agg);
  let rkeys = [...rs.keys()].sort(), ckeys = [...cs.keys()].sort();
  if (sortKeys === "total") { rkeys = rkeys.sort((x, y) => tot(rs.get(y)!) - tot(rs.get(x)!)); ckeys = ckeys.sort((x, y) => tot(cs.get(y)!) - tot(cs.get(x)!)); }
  const cells = rkeys.map((a) => ckeys.map((b) => { const g = groups.get(`${a}\u0000${b}`); return g ? aggregate(g.map(val), agg) : null; }));
  const flat = cells.flat().filter((v): v is number => v !== null);
  return { rows: rkeys, cols: ckeys, cells, groups, rowTotals: rkeys.map((a) => tot(rs.get(a)!)), colTotals: ckeys.map((b) => tot(cs.get(b)!)), grand: tot(rows), min: flat.length ? Math.min(...flat) : 0, max: flat.length ? Math.max(...flat) : 0 };
}
