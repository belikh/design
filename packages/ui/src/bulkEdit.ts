import { coerce, INVALID, isEmpty, sameValue, validateSpec, type EditorSpec, type EditValue } from "./editable.tsx";

/** Pure logic for bulk edit: plan what would change, summarise it, and run it with progress, cancel and per-row failures. */
export type BulkOp = { kind: "set"; value: EditValue } | { kind: "add"; delta: number } | { kind: "tags-add"; tag: string } | { kind: "tags-remove"; tag: string };
export type PlanRow = { id: string; before: EditValue | undefined; after: EditValue | undefined; status: "change" | "same" | "invalid"; error?: string };

export const opsFor = (spec: EditorSpec): { kind: BulkOp["kind"]; label: string }[] =>
  spec.type === "number" ? [{ kind: "set", label: "Set to" }, { kind: "add", label: "Add (negative subtracts)" }]
  : spec.type === "tags" ? [{ kind: "tags-add", label: "Add tag" }, { kind: "tags-remove", label: "Remove tag" }, { kind: "set", label: "Replace all with" }]
  : [{ kind: "set", label: "Set to" }];

/** The value a row would have after the operation, or undefined when the operation has no usable input yet. */
export function applyOp(spec: EditorSpec, before: EditValue | undefined, op: BulkOp): EditValue | undefined {
  switch (op.kind) {
    case "set": { const v = coerce(spec, op.value); return v === INVALID ? undefined : v; }
    case "add": { const b = Number(before ?? 0); return Number.isFinite(b) && Number.isFinite(op.delta) ? Math.round((b + op.delta) * 1e6) / 1e6 : undefined; }
    case "tags-add": { const cur = Array.isArray(before) ? before : []; return op.tag && !cur.includes(op.tag) ? [...cur, op.tag] : cur; }
    case "tags-remove": { const cur = Array.isArray(before) ? before : []; return cur.filter((t) => t !== op.tag); }
  }
}

export function planBulk<T>(rows: T[], id: (r: T) => string, get: (r: T) => EditValue | undefined, spec: EditorSpec, op: BulkOp, validate?: (v: EditValue, r: T) => string | null | undefined): PlanRow[] {
  return rows.map((r) => {
    const before = get(r); const after = applyOp(spec, before, op);
    if (after === undefined) return { id: id(r), before, after, status: "invalid" as const, error: "Enter a value" };
    const err = validateSpec(spec, after, validate ? (v) => validate(v, r) : undefined);
    if (err) return { id: id(r), before, after, status: "invalid" as const, error: err };
    return { id: id(r), before, after, status: sameValue(after, before === undefined ? "" : before) || (isEmpty(before) && isEmpty(after)) ? ("same" as const) : ("change" as const) };
  });
}
export const summarize = (plan: PlanRow[]) => ({ total: plan.length, change: plan.filter((p) => p.status === "change").length, same: plan.filter((p) => p.status === "same").length, invalid: plan.filter((p) => p.status === "invalid").length });

/** "Mixed" detection: do all selected rows share one value for this column? */
export function commonValue(values: (EditValue | undefined)[]): { mixed: boolean; value?: EditValue; distinct: number } {
  const seen: (EditValue | undefined)[] = []; for (const v of values) if (!seen.some((s) => sameValue(s as EditValue, v as EditValue))) seen.push(v);
  return { mixed: seen.length > 1, value: seen.length === 1 ? seen[0] : undefined, distinct: seen.length };
}

export type RunResult = { ok: PlanRow[]; failed: { row: PlanRow; error: string }[]; cancelled: boolean };
/** Apply the changed rows one by one. Failures never abort the batch; cancel stops after the current row. */
export async function runBulk(plan: PlanRow[], save: (row: PlanRow) => Promise<void | string | null | undefined> | void | string | null, opts: { onProgress?: (done: number, total: number) => void; shouldCancel?: () => boolean } = {}): Promise<RunResult> {
  const todo = plan.filter((p) => p.status === "change"); const out: RunResult = { ok: [], failed: [], cancelled: false };
  for (let i = 0; i < todo.length; i++) {
    if (opts.shouldCancel?.()) { out.cancelled = true; break; }
    try { const r = await save(todo[i]); if (typeof r === "string" && r) out.failed.push({ row: todo[i], error: r }); else out.ok.push(todo[i]); } catch (e) { out.failed.push({ row: todo[i], error: e instanceof Error ? e.message : "Failed" }); }
    opts.onProgress?.(i + 1, todo.length);
    if ((i + 1) % 25 === 0) await new Promise((r) => setTimeout(r, 0)); // let the UI paint during big batches
  }
  return out;
}
