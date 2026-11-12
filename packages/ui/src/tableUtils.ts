// Pure helpers for DataTable and the P2 table demos: aggregation, column statistics, conditional formatting, grouping, delimited parsing.

export type Agg = "sum" | "avg" | "count" | "min" | "max" | "median" | "distinct";
export const AGG_LABEL: Record<Agg, string> = { sum: "Sum", avg: "Average", count: "Count", min: "Min", max: "Max", median: "Median", distinct: "Distinct" };

export const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
export const median = (xs: number[]) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** Aggregate a list of cell values. Non-numeric values are ignored by numeric aggregates; `count` counts all non-empty values. */
export function aggregate(values: unknown[], agg: Agg): number {
  if (agg === "count") return values.filter((v) => v !== null && v !== undefined && v !== "").length;
  if (agg === "distinct") return new Set(values.map((v) => String(v))).size;
  const nums = values.map((v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : v)).filter(isNum);
  if (!nums.length) return 0;
  switch (agg) {
    case "sum": return nums.reduce((a, b) => a + b, 0);
    case "avg": return nums.reduce((a, b) => a + b, 0) / nums.length;
    case "min": return Math.min(...nums);
    case "max": return Math.max(...nums);
    case "median": return median(nums);
  }
}

export type ColumnStats = {
  count: number; nulls: number; distinct: number; numeric: boolean;
  min?: number; max?: number; mean?: number; median?: number; sum?: number; stdev?: number;
  histogram: { from: number; to: number; count: number }[]; top: { value: string; count: number }[];
};
/** Column statistics for the stats popover: counts, nulls, distinct, numeric summary, 10-bin histogram, top values. */
export function columnStats(values: unknown[]): ColumnStats {
  const empty = (v: unknown) => v === null || v === undefined || v === "";
  const present = values.filter((v) => !empty(v)); const nums = present.filter(isNum);
  const numeric = present.length > 0 && nums.length === present.length;
  const freq = new Map<string, number>(); for (const v of present) freq.set(String(v), (freq.get(String(v)) ?? 0) + 1);
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5).map(([value, count]) => ({ value, count }));
  const out: ColumnStats = { count: values.length, nulls: values.length - present.length, distinct: freq.size, numeric, histogram: [], top };
  if (numeric) {
    const min = Math.min(...nums), max = Math.max(...nums), sum = nums.reduce((a, b) => a + b, 0), mean = sum / nums.length;
    out.min = min; out.max = max; out.sum = sum; out.mean = mean; out.median = median(nums); out.stdev = Math.sqrt(nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length);
    const bins = 10, span = max - min || 1; const h = Array.from({ length: bins }, (_, i) => ({ from: min + (span * i) / bins, to: min + (span * (i + 1)) / bins, count: 0 }));
    for (const v of nums) h[Math.min(bins - 1, Math.floor(((v - min) / span) * bins))].count++;
    out.histogram = h;
  }
  return out;
}

// ---------- conditional formatting ----------
export type Tone = "ok" | "warn" | "danger" | "info";
export type Rule = { op: ">" | ">=" | "<" | "<=" | "=" | "between" | "contains"; value: number | string; to?: number; tone: Tone };
export type CondFormat =
  | { type: "scale"; diverging?: boolean }                       // colour scale (sequential, or diverging around the mean)
  | { type: "bars" }                                             // data bars
  | { type: "icons"; invert?: boolean }                          // arrow icon set by tercile
  | { type: "rules"; rules: Rule[] };                            // highlight rules
export type NumStats = { min: number; max: number; mean: number };

export const numStats = (values: unknown[]): NumStats | null => { const n = values.filter(isNum); if (!n.length) return null; return { min: Math.min(...n), max: Math.max(...n), mean: n.reduce((a, b) => a + b, 0) / n.length }; };
export function ruleMatches(r: Rule, v: unknown): boolean {
  if (r.op === "contains") return String(v).toLowerCase().includes(String(r.value).toLowerCase());
  const n = typeof v === "string" ? Number(v) : v; if (!isNum(n)) return false; const x = Number(r.value);
  switch (r.op) { case ">": return n > x; case ">=": return n >= x; case "<": return n < x; case "<=": return n <= x; case "=": return n === x; case "between": return n >= x && n <= (r.to ?? x); }
}
export type CellFx = { background?: string; color?: string; glyph?: { char: string; label: string; tone: Tone | "muted" } };
/** Resolve a conditional format for one cell. All colours are CSS variables, so light, dark and high-contrast all work. */
export function cellFx(cf: CondFormat | undefined, v: unknown, st: NumStats | null): CellFx {
  if (!cf) return {};
  if (cf.type === "rules") { const r = cf.rules.find((x) => ruleMatches(x, v)); return r ? { background: `var(--jp-${r.tone}-bg)`, color: `var(--jp-${r.tone})` } : {}; }
  if (!st || !isNum(v)) return {};
  const span = st.max - st.min || 1;
  if (cf.type === "scale") {
    if (cf.diverging) { const t = v >= st.mean ? (v - st.mean) / ((st.max - st.mean) || 1) : (st.mean - v) / ((st.mean - st.min) || 1); const tone = v >= st.mean ? "ok" : "danger"; return { background: `color-mix(in oklab, var(--jp-${tone}) ${Math.round(t * 45)}%, transparent)` }; }
    return { background: `color-mix(in oklab, var(--jp-accent) ${Math.round(((v - st.min) / span) * 55)}%, transparent)` };
  }
  if (cf.type === "bars") { const p = Math.round(((v - st.min) / span) * 100); return { background: `linear-gradient(90deg, color-mix(in oklab, var(--jp-accent) 32%, transparent) ${p}%, transparent ${p}%)` }; }
  const t = (v - st.min) / span; const high = t > 2 / 3, low = t < 1 / 3; // the arrow follows the value; `invert` (lower is better) flips only the colour
  return high ? { glyph: { char: "▲", label: "high", tone: cf.invert ? "danger" : "ok" } } : low ? { glyph: { char: "▼", label: "low", tone: cf.invert ? "ok" : "danger" } } : { glyph: { char: "▶", label: "mid", tone: "muted" } };
}

// ---------- grouping ----------
export type GroupNode<T> = { key: string; id: string; value: string; rows: T[]; children: GroupNode<T>[]; depth: number };
/** Nest rows by one or more keys (multi-level grouping). Order of first appearance is preserved. */
export function groupRows<T>(rows: T[], keys: ((r: T) => string)[], depth = 0, prefix = ""): GroupNode<T>[] {
  if (!keys.length) return [];
  const m = new Map<string, T[]>(); for (const r of rows) { const k = keys[0](r); (m.get(k) ?? m.set(k, []).get(k)!).push(r); }
  return [...m.entries()].map(([value, rs]) => { const id = `${prefix}/${value}`; return { key: id, id, value, rows: rs, children: groupRows(rs, keys.slice(1), depth + 1, id), depth }; });
}

// ---------- delimited text ----------
/** Parse pasted spreadsheet text. Detects tab, semicolon or comma; handles quoted fields with embedded delimiters/newlines. */
export function parseDelimited(text: string): string[][] {
  const t = text.replace(/\r\n?/g, "\n").replace(/\n+$/, ""); if (!t) return [];
  const first = t.split("\n")[0]; const delim = first.includes("\t") ? "\t" : (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = []; let row: string[] = [], cur = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"' && cur === "") q = true;
    else if (ch === delim) { row.push(cur); cur = ""; }
    else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += ch;
  }
  row.push(cur); rows.push(row); return rows;
}
