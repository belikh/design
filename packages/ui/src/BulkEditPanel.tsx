import { useMemo, useRef, useState } from "react";
import { Btn } from "./kit.tsx";
import { FieldEditor, formatValue, type EditorSpec, type EditValue, type Validate } from "./editable.tsx";
import { applyOp, commonValue, opsFor, planBulk, runBulk, summarize, type BulkOp, type PlanRow, type RunResult } from "./bulkEdit.ts";
import { usePrefsOptional } from "./store.tsx";
import { pushUndo } from "./undo.ts";

export type BulkField<T> = { key: string; header: string; editor: EditorSpec; validate?: (v: EditValue, r: T) => string | null | undefined; get: (r: T) => EditValue | undefined };
type Commit<T> = (r: T, key: string, v: EditValue) => void | string | null | Promise<void | string | null>;

/** Bulk edit for the selected rows: pick a field, set a value (or an operation), see exactly what changes, apply once, undo once. */
export function BulkEditPanel<T extends { id: string }>({ rows, fields, commit, onClose, reviewOver = 50 }: { rows: T[]; fields: BulkField<T>[]; commit: Commit<T>; onClose: () => void; reviewOver?: number }) {
  const prefs = usePrefsOptional();
  const [fk, setFk] = useState(fields[0]?.key ?? ""); const field = fields.find((f) => f.key === fk) ?? fields[0];
  const ops = opsFor(field.editor); const [opKind, setOpKind] = useState<BulkOp["kind"]>(ops[0].kind); const kind = ops.some((o) => o.kind === opKind) ? opKind : ops[0].kind;
  const [draft, setDraft] = useState<{ v: EditValue | undefined; err: string | null }>({ v: undefined, err: null });
  const [phase, setPhase] = useState<"edit" | "review" | "running" | "done">("edit"); const [prog, setProg] = useState<[number, number]>([0, 0]); const [res, setRes] = useState<RunResult | null>(null); const cancel = useRef(false);
  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  const common = useMemo(() => commonValue(rows.map((r) => field.get(r))), [rows, field]);
  const spec: EditorSpec = kind === "add" ? { type: "number" } : kind === "tags-add" || kind === "tags-remove" ? { type: "text", placeholder: "Tag" } : field.editor;
  const op: BulkOp | null = draft.v === undefined || draft.err ? null : kind === "set" ? { kind, value: draft.v } : kind === "add" ? { kind, delta: Number(draft.v) } : { kind, tag: String(draft.v) };
  const plan = useMemo(() => (op ? planBulk(rows, (r) => r.id, field.get, field.editor, op, field.validate) : []), [rows, field, op?.kind, JSON.stringify(op)]); // eslint-disable-line react-hooks/exhaustive-deps
  const sum = summarize(plan); const big = sum.change > reviewOver;
  const label = (v: EditValue | undefined) => (v === undefined ? "—" : formatValue(field.editor, v) || "empty");

  const execute = async (p: PlanRow[]) => {
    cancel.current = false; setPhase("running"); setProg([0, p.filter((x) => x.status === "change").length]);
    const r = await runBulk(p, (row) => commit(byId.get(row.id)!, field.key, row.after as EditValue), { onProgress: (d, t) => setProg([d, t]), shouldCancel: () => cancel.current });
    setRes((old) => ({ ok: [...(old?.ok ?? []), ...r.ok], failed: r.failed, cancelled: r.cancelled })); setPhase("done");
    const revert = () => runBulk(r.ok.map((x) => ({ ...x, before: x.after, after: x.before ?? "", status: "change" as const })), (row) => commit(byId.get(row.id)!, field.key, row.after as EditValue)); const reapply = () => runBulk(r.ok.map((x) => ({ ...x, status: "change" as const })), (row) => commit(byId.get(row.id)!, field.key, row.after as EditValue));
    if (r.ok.length) pushUndo({ label: `${field.header}: ${r.ok.length} rows`, undo: revert, redo: reapply });
    if (r.ok.length) prefs?.toast({ kind: "ok", title: `Updated ${r.ok.length} ${r.ok.length === 1 ? "row" : "rows"}`, body: field.header, undo: () => { void runBulk(r.ok.map((x) => ({ ...x, before: x.after, after: x.before ?? "", status: "change" as const })), (row) => commit(byId.get(row.id)!, field.key, row.after as EditValue)); } });
  };
  const apply = () => { setRes(null); if (big) setPhase("review"); else void execute(plan); };
  const retry = () => { const failedIds = new Set(res?.failed.map((f) => f.row.id)); setRes((o) => (o ? { ...o, failed: [] } : o)); void execute(plan.filter((p) => failedIds.has(p.id))); };

  return (
    <div className="adm-bulkedit" role="region" aria-label="Bulk edit">
      {phase === "edit" && <>
        <div className="adm-bulkedit__row">
          <label className="adm-bulkedit__f"><span className="jp-label">Field</span>
            <select className="jp-select" aria-label="Field to edit" value={field.key} onChange={(e) => { setFk(e.target.value); setOpKind("set"); setDraft({ v: undefined, err: null }); }}>{fields.map((f) => <option key={f.key} value={f.key}>{f.header}</option>)}</select></label>
          {ops.length > 1 && <label className="adm-bulkedit__f"><span className="jp-label">Action</span>
            <select className="jp-select" aria-label="Action" value={kind} onChange={(e) => { setOpKind(e.target.value as BulkOp["kind"]); setDraft({ v: undefined, err: null }); }}>{ops.map((o) => <option key={o.kind} value={o.kind}>{o.label}</option>)}</select></label>}
          <div className="adm-bulkedit__f adm-bulkedit__val"><span className="jp-label">{kind === "set" ? "New value" : "Value"}</span>
            <FieldEditor key={`${field.key}:${kind}`} spec={spec} value={kind === "set" && !common.mixed ? common.value : undefined} label={`New ${field.header}`} mode="none" autoFocus={false}
              placeholder={kind === "set" && common.mixed ? `Mixed (${common.distinct} values)` : undefined} onDraft={(v, err) => setDraft((d) => (d.v === v && d.err === err ? d : { v, err }))} onCommit={() => {}} onCancel={() => {}} /></div>
        </div>
        <div className="adm-bulkedit__foot" aria-live="polite">
          <span className="jp-muted">{draft.err ? draft.err : !op ? (common.mixed && kind === "set" ? `The ${rows.length} selected rows have ${common.distinct} different values. Enter one to set them all.` : "Enter a value to preview the change.")
            : `Changes ${sum.change} of ${rows.length}${sum.same ? `, ${sum.same} already match` : ""}${sum.invalid ? `, ${sum.invalid} can’t be set` : ""}`}</span>
          <span className="adm-spacer" />
          <Btn sm variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn sm variant="primary" disabled={!op || sum.change === 0} onClick={apply}>Apply to {rows.length} selected</Btn>
        </div>
        {op && sum.invalid > 0 && <ul className="adm-bulkedit__list">{plan.filter((p) => p.status === "invalid").slice(0, 3).map((p) => <li key={p.id}><b>{p.id}</b> {p.error}</li>)}</ul>}
      </>}
      {phase === "review" && <>
        <div><b>Review {sum.change} changes to {field.header}.</b> <span className="jp-muted">This is a large change. Check a sample, then confirm. You can undo it afterwards.</span></div>
        <ul className="adm-bulkedit__list">{plan.filter((p) => p.status === "change").slice(0, 6).map((p) => <li key={p.id}><b>{p.id}</b> <s>{label(p.before)}</s> → {label(p.after)}</li>)}{sum.change > 6 && <li className="jp-muted">…and {sum.change - 6} more</li>}</ul>
        <div className="adm-bulkedit__foot"><span className="adm-spacer" /><Btn sm variant="ghost" onClick={() => setPhase("edit")}>Back</Btn><Btn sm variant="primary" onClick={() => void execute(plan)}>Apply {sum.change} changes</Btn></div>
      </>}
      {phase === "running" && <div className="adm-bulkedit__foot" role="status"><progress value={prog[0]} max={Math.max(1, prog[1])} aria-label="Applying changes" /><span>Updating {prog[0]} of {prog[1]}…</span><span className="adm-spacer" /><Btn sm variant="ghost" onClick={() => { cancel.current = true; }}>Cancel</Btn></div>}
      {phase === "done" && res && <>
        <div role="status"><b>{res.ok.length} updated</b>{res.cancelled && <span className="jp-muted"> · stopped early</span>}{res.failed.length > 0 && <span> · <b className="adm-bulkedit__bad">{res.failed.length} failed</b></span>}</div>
        {res.failed.length > 0 && <ul className="adm-bulkedit__list">{res.failed.slice(0, 5).map((f) => <li key={f.row.id}><b>{f.row.id}</b> {f.error}</li>)}{res.failed.length > 5 && <li className="jp-muted">…and {res.failed.length - 5} more</li>}</ul>}
        <div className="adm-bulkedit__foot"><span className="adm-spacer" />{res.failed.length > 0 && <Btn sm onClick={retry}>Retry {res.failed.length} failed</Btn>}<Btn sm variant="primary" onClick={onClose}>Done</Btn></div>
      </>}
    </div>
  );
}
export { applyOp };
