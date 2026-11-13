import { useEffect, useMemo, useState } from "react";
import { PageHeader, Panel, Btn, Badge, Stepper, Modal, Alert } from "@belikh/jupiter-ui/kit.tsx";
import { Field, Select, TextInput } from "@belikh/jupiter-ui/inputs.tsx";
import { ProgressBar, StatTile } from "@belikh/jupiter-ui/Charts.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { customers } from "../lib/data.ts";
import { applyItem, changedFields, planBulk, summary, type Op, type PlanItem } from "../lib/bulk.ts";
import type { Row } from "../lib/sql.ts";
import "../tools.css";

const OPS = [{ v: "set", l: "Set a field" }, { v: "add_tag", l: "Add a tag" }, { v: "uppercase", l: "Uppercase a text field" }, { v: "credit", l: "Credit an amount to balance" }, { v: "archive", l: "Archive (mark inactive)" }];
const SEL = [{ v: "all", l: "All customers" }, { v: "free", l: "Plan: free" }, { v: "pro", l: "Plan: pro" }, { v: "inactive", l: "Inactive" }, { v: "noemail", l: "Missing email" }, { v: "first20", l: "First 20" }];
const pickRows = (rows: Row[], sel: string) => rows.filter((r) => sel === "all" || (sel === "inactive" ? r.active === false : sel === "noemail" ? r.email === null : sel === "first20" ? Number(String(r.id).slice(1)) < 1020 : r.plan === sel));
const tone = { ok: "info", done: "ok", skip: undefined, error: "danger", failed: "warn" } as const;
export function BulkRunner() {
  const { toast } = usePrefs(); const [data, setData] = useState<Row[]>(customers); const [sel, setSel] = useState("free"); const [op, setOp] = useState("set"); const [field, setField] = useState("plan"); const [value, setValue] = useState("pro"); const [tag, setTag] = useState("reviewed"); const [amount, setAmount] = useState("10");
  const [phase, setPhase] = useState<"config" | "review" | "running" | "done">("config"); const [plan, setPlan] = useState<PlanItem[]>([]); const [confirm, setConfirm] = useState(false); const [maxFail, setMaxFail] = useState("5"); const [aborted, setAborted] = useState(false);
  const operation = (): Op => (op === "set" ? { kind: "set", field, value } : op === "add_tag" ? { kind: "add_tag", tag } : op === "uppercase" ? { kind: "uppercase", field } : op === "credit" ? { kind: "credit", amount: Number(amount) || 0 } : { kind: "archive" });
  const selected = useMemo(() => pickRows(data, sel), [data, sel]); const s = summary(plan);
  const dryRun = () => { setPlan(planBulk(selected, operation())); setPhase("review"); setAborted(false); };
  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => setPlan((p) => {
      let n = 0; const next = p.map((it) => { if (n < 6 && (it.status === "ok" || (it.status === "failed" && it.attempts === 0))) { n++; return applyItem(it); } return it; });
      const failedNow = next.filter((x) => x.status === "failed").length; const limit = Number(maxFail) || Infinity;
      if (failedNow > limit) { setAborted(true); setPhase("done"); } else if (n === 0) setPhase("done");
      return next;
    }), 220);
    return () => clearInterval(t);
  }, [phase, maxFail]);
  useEffect(() => { if (phase === "done") { setData((d) => d.map((r) => plan.find((p) => p.id === String(r.id) && p.status === "done")?.after ?? r)); toast({ kind: aborted ? "danger" : "ok", title: aborted ? "Run stopped: too many failures" : "Bulk run finished" }); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [phase]);
  const retry = () => { setPlan((p) => p.map((it) => (it.status === "failed" ? { ...it } : it))); setAborted(false); setPhase("running"); };
  const reset = () => { setPhase("config"); setPlan([]); };
  const step = { config: 0, review: 1, running: 2, done: 3 }[phase]; const finished = s.done + s.failed + s.skip + s.error; const runnable = s.ok + s.failed;
  return (
    <>
      <PageHeader title="Bulk job runner" crumbs={["Tools", "Bulk runner"]} desc="Apply a change to many records safely: choose rows and an operation, review a dry run of every change, then run it with progress, failure limits, retries and per-row results." status={<Badge>{selected.length} rows selected</Badge>} />
      <div style={{ marginBottom: 12 }}><Stepper steps={["Configure", "Review dry run", "Run", "Results"]} current={step} /></div>
      {phase === "config" && <Panel title="What do you want to change?"><div className="adm-grid adm-grid--2">
        <div className="adm-stack"><Field label="Rows">{(id) => <Select id={id} value={sel} onChange={setSel} options={SEL.map((x) => ({ value: x.v, label: `${x.l} (${pickRows(data, x.v).length})` }))} />}</Field><Field label="Operation">{(id) => <Select id={id} value={op} onChange={setOp} options={OPS.map((x) => ({ value: x.v, label: x.l }))} />}</Field></div>
        <div className="adm-stack">
          {(op === "set" || op === "uppercase") && <Field label="Field">{(id) => <Select id={id} value={field} onChange={setField} options={["plan", "country", "name", "tags", "balance", "nonexistent"]} />}</Field>}
          {op === "set" && <Field label="New value" hint={field === "plan" ? "free, pro or team (try “gold” to see validation)" : undefined}>{(id) => <TextInput id={id} value={value} onChange={setValue} />}</Field>}
          {op === "add_tag" && <Field label="Tag">{(id) => <TextInput id={id} value={tag} onChange={setTag} />}</Field>}{op === "credit" && <Field label="Amount">{(id) => <TextInput id={id} value={amount} onChange={setAmount} prefix="$" />}</Field>}
          {op === "archive" && <Alert s="warn" title="Archiving marks customers inactive">Inactive customers are skipped.</Alert>}
        </div></div><div style={{ marginTop: 12 }}><Btn variant="primary" disabled={!selected.length} onClick={dryRun}>Dry run on {selected.length} rows →</Btn></div></Panel>}
      {phase !== "config" && <>
        <div className="adm-grid adm-grid--4" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}><StatTile label="Will change" value={String(s.ok)} sub="rows" /><StatTile label="Skipped" value={String(s.skip)} sub="no-op" /><StatTile label="Errors" value={String(s.error)} sub="invalid" /><StatTile label="Done" value={String(s.done)} sub="applied" /><StatTile label="Failed" value={String(s.failed)} sub="retryable" /></div>
        {phase === "running" && <div style={{ margin: "12px 0" }}><ProgressBar value={finished} max={plan.length} label="Progress" /><span className="jp-muted">{finished} of {plan.length} processed…</span></div>}
        {aborted && <div style={{ margin: "12px 0" }}><Alert s="danger" title="Stopped early">More than {maxFail} rows failed, so the run was halted. Nothing further was applied. Retry the failures or adjust the limit.</Alert></div>}
        <Panel title={phase === "review" ? "Dry run: nothing has been changed yet" : "Per-row results"} className="adm-section" flush actions={<div className="adm-row">
          {phase === "review" && <><div style={{ width: 150 }}><TextInput value={maxFail} onChange={(v) => setMaxFail(v.replace(/\D/g, ""))} prefix="stop after" suffix="failures" aria-label="Stop after failures" /></div><Btn onClick={reset}>Back</Btn><Btn variant="primary" disabled={!s.ok} onClick={() => setConfirm(true)}>Run on {s.ok} rows</Btn></>}
          {phase === "done" && <>{s.failed > 0 && <Btn variant="primary" onClick={retry}>Retry {s.failed} failed</Btn>}<Btn onClick={reset}>New run</Btn></>}</div>}>
          <div className="adm-dt__wrap" style={{ maxHeight: 420, overflow: "auto" }}><table className="jp-table"><thead><tr><th>Customer</th><th>Status</th><th>Change</th><th>Note</th></tr></thead><tbody>{plan.slice(0, 80).map((it) => <tr key={it.id}><td><b className="adm-num">{it.id}</b> <span className="jp-muted">{String(it.before.name)}</span></td><td><Badge s={tone[it.status]}>{it.status}</Badge>{it.attempts > 1 && <span className="jp-muted"> ×{it.attempts}</span>}</td><td className="adm-num" style={{ whiteSpace: "normal" }}>{changedFields(it).map(([k, a, b]) => <div key={k}>{k}: <span style={{ color: "var(--jp-danger)", textDecoration: "line-through" }}>{String(a)}</span> → <span style={{ color: "var(--jp-ok)" }}>{String(b)}</span></div>)}{changedFields(it).length === 0 && <span className="jp-muted">—</span>}</td><td className="jp-muted" style={{ whiteSpace: "normal" }}>{it.reason ?? ""}</td></tr>)}</tbody></table></div>
          {plan.length > 80 && <p className="jp-muted" style={{ padding: 8 }}>Showing the first 80 of {plan.length}.</p>}
        </Panel></>}
      <Modal open={confirm} onClose={() => setConfirm(false)} size="sm" title="Run this change?" footer={<><Btn onClick={() => setConfirm(false)}>Cancel</Btn><Btn variant="primary" onClick={() => { setConfirm(false); setPhase("running"); }}>Apply to {runnable} rows</Btn></>}><p>{s.ok} rows will be changed, {s.skip} skipped and {s.error} ignored because of errors. The run stops if more than {maxFail || "∞"} rows fail.</p></Modal>
    </>
  );
}
