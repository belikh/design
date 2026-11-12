import type { Cell, Row } from "./sql.ts";
export type Op = { kind: "set"; field: string; value: string } | { kind: "add_tag"; tag: string } | { kind: "uppercase"; field: string } | { kind: "credit"; amount: number } | { kind: "archive" };
export type Status = "ok" | "skip" | "error" | "done" | "failed";
export type PlanItem = { id: string; before: Row; after: Row; status: Status; reason?: string; attempts: number };
const idOf = (r: Row) => String(r.id);
export function planBulk(rows: Row[], op: Op): PlanItem[] {
  return rows.map((before) => {
    const after: Row = { ...before }; let status: Status = "ok"; let reason: string | undefined;
    switch (op.kind) {
      case "set": if (!(op.field in before)) { status = "error"; reason = `No column "${op.field}"`; } else if (String(before[op.field]) === op.value) { status = "skip"; reason = "Already has that value"; } else if (op.field === "plan" && !["free", "pro", "team"].includes(op.value)) { status = "error"; reason = `"${op.value}" is not a valid plan`; } else after[op.field] = typeof before[op.field] === "number" ? Number(op.value) : op.value; break;
      case "add_tag": { const tags = String(before.tags ?? "").split(";").filter(Boolean); if (tags.includes(op.tag)) { status = "skip"; reason = "Already tagged"; } else after.tags = [...tags, op.tag].join(";"); break; }
      case "uppercase": if (typeof before[op.field] !== "string") { status = "error"; reason = `"${op.field}" is not text`; } else if (before[op.field] === String(before[op.field]).toUpperCase()) { status = "skip"; reason = "Already uppercase"; } else after[op.field] = String(before[op.field]).toUpperCase(); break;
      case "credit": if (before.active === false) { status = "skip"; reason = "Inactive customer"; } else if (typeof before.balance !== "number") { status = "error"; reason = "No numeric balance"; } else after.balance = Math.round((before.balance + op.amount) * 100) / 100; break;
      case "archive": if (before.active === false) { status = "skip"; reason = "Already archived"; } else after.active = false; break;
    }
    return { id: idOf(before), before, after, status, reason, attempts: 0 };
  });
}
const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
/** Simulate applying one planned item: deterministic transient failures (about 1 in 9 on the first attempt) that succeed on retry. */
export function applyItem(it: PlanItem, flaky = true): PlanItem {
  if (it.status !== "ok" && it.status !== "failed") return it; const attempts = it.attempts + 1;
  if (flaky && attempts === 1 && hash(it.id) % 9 === 0) return { ...it, status: "failed", attempts, reason: "Upstream timeout (transient)" };
  return { ...it, status: "done", attempts, reason: undefined };
}
export const summary = (plan: PlanItem[]) => ({ total: plan.length, ok: plan.filter((p) => p.status === "ok").length, skip: plan.filter((p) => p.status === "skip").length, error: plan.filter((p) => p.status === "error").length, done: plan.filter((p) => p.status === "done").length, failed: plan.filter((p) => p.status === "failed").length });
export const changedFields = (it: PlanItem): [string, Cell, Cell][] => Object.keys(it.after).filter((k) => it.after[k] !== it.before[k]).map((k) => [k, it.before[k], it.after[k]]);
