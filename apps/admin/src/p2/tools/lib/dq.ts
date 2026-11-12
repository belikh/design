import type { Cell, Row } from "./sql.ts";
export type DqRule = { id: string; col: string; kind: "not_null" | "unique" | "range" | "regex" | "enum" | "not_future"; severity: "error" | "warn"; min?: number; max?: number; pattern?: string; values?: string[]; label: string };
export type DqResult = { rule: DqRule; total: number; failed: number; failingIds: string[]; samples: Cell[] };
const idOf = (r: Row) => String(r.id ?? "?");
export function runRule(rows: Row[], rule: DqRule, today = "2026-11-12"): DqResult {
  const bad: Row[] = [];
  if (rule.kind === "unique") { const seen = new Map<string, number>(); rows.forEach((r) => { const v = r[rule.col]; if (v !== null) seen.set(String(v), (seen.get(String(v)) ?? 0) + 1); }); rows.forEach((r) => { const v = r[rule.col]; if (v !== null && (seen.get(String(v)) ?? 0) > 1) bad.push(r); }); }
  else rows.forEach((r) => {
    const v = r[rule.col]; let ok = true;
    switch (rule.kind) {
      case "not_null": ok = v !== null && v !== ""; break;
      case "range": ok = v === null || (typeof v === "number" && (rule.min === undefined || v >= rule.min) && (rule.max === undefined || v <= rule.max)); break;
      case "regex": ok = v === null || new RegExp(rule.pattern ?? ".*").test(String(v)); break;
      case "enum": ok = v === null || (rule.values ?? []).includes(String(v)); break;
      case "not_future": ok = v === null || String(v) <= today; break;
    }
    if (!ok) bad.push(r);
  });
  return { rule, total: rows.length, failed: bad.length, failingIds: bad.slice(0, 8).map(idOf), samples: bad.slice(0, 5).map((r) => r[rule.col]) };
}
export const runRules = (rows: Row[], rules: DqRule[]) => rules.map((r) => runRule(rows, r));
/** Weighted score: errors count double. 100 = every rule passes on every row. */
export function dqScore(results: DqResult[]): number { let w = 0, p = 0; for (const x of results) { const wt = x.rule.severity === "error" ? 2 : 1; w += wt * x.total; p += wt * (x.total - x.failed); } return w ? Math.round((p / w) * 1000) / 10 : 100; }
export type Profile = { col: string; type: string; nulls: number; distinct: number; min: Cell; max: Cell; top: [string, number][] };
export function profile(rows: Row[]): Profile[] {
  const cols = Object.keys(rows[0] ?? {});
  return cols.map((col) => { const vals = rows.map((r) => r[col]); const nn = vals.filter((v) => v !== null && v !== ""); const types = new Set(nn.map((v) => typeof v)); const counts = new Map<string, number>(); nn.forEach((v) => counts.set(String(v), (counts.get(String(v)) ?? 0) + 1));
    const sorted = [...nn].sort((a, b) => (typeof a === "number" && typeof b === "number" ? a - b : String(a) < String(b) ? -1 : 1)); return { col, type: [...types].join("|") || "empty", nulls: vals.length - nn.length, distinct: counts.size, min: sorted[0] ?? null, max: sorted[sorted.length - 1] ?? null, top: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3) }; });
}
export const DEFAULT_RULES: DqRule[] = [
  { id: "id-unique", col: "id", kind: "unique", severity: "error", label: "id is unique" }, { id: "email-present", col: "email", kind: "not_null", severity: "error", label: "email is present" },
  { id: "email-format", col: "email", kind: "regex", pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", severity: "error", label: "email looks valid" }, { id: "email-unique", col: "email", kind: "unique", severity: "warn", label: "email is unique" },
  { id: "phone-format", col: "phone", kind: "regex", pattern: "^04\\d{8}$", severity: "warn", label: "phone is an AU mobile (04xxxxxxxx)" }, { id: "balance-range", col: "balance", kind: "range", min: 0, max: 100000, severity: "error", label: "balance between 0 and 100,000" },
  { id: "plan-enum", col: "plan", kind: "enum", values: ["free", "pro", "team"], severity: "error", label: "plan is free, pro or team" }, { id: "country-present", col: "country", kind: "not_null", severity: "warn", label: "country is present" }, { id: "signup-past", col: "signup_date", kind: "not_future", severity: "error", label: "signup date is not in the future" },
];
