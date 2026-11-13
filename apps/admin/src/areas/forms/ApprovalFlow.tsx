import { useState } from "react";
import { Alert, Badge, Btn, EmptyState, PageHeader, Panel } from "@belikh/jupiter-ui/kit.tsx";
import { Field, NumberStepper } from "@belikh/jupiter-ui/inputs.tsx";
import { Editable } from "@belikh/jupiter-ui/editable.tsx";
import { useDraft, useUnsavedGuard } from "@belikh/jupiter-ui/forms.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { APPROVERS, SEED_STEPS, appliesTo, move, newStep, route, validateFlow, type Step } from "./lib.ts";
import "./forms.css";

const WHEN = [{ value: "always", label: "Always" }, { value: "amount_gt", label: "Amount over" }, { value: "amount_lte", label: "Amount up to" }];
const money = (n: number) => "$" + n.toLocaleString("en-AU");
export function ApprovalFlow() {
  const { toast } = usePrefs(); const draft = useDraft<Step[]>("frm-approval-flow", SEED_STEPS); const steps = draft.value; const set = draft.setValue;
  const [saved, setSaved] = useState(JSON.stringify(SEED_STEPS)); const dirty = JSON.stringify(steps) !== saved; useUnsavedGuard(dirty);
  const [amount, setAmount] = useState(12000); const issues = validateFlow(steps); const r = route(steps, amount);
  const patch = (id: string, p: Partial<Step>) => set(steps.map((s) => (s.id === id ? { ...s, ...p } : s)));
  const remove = (i: number) => { const prev = steps; set(steps.filter((_, j) => j !== i)); toast({ kind: "info", title: `Removed “${prev[i].name}”`, undo: () => set(prev) }); };
  const publish = () => { if (issues.length) { toast({ kind: "danger", title: "Fix the flow before publishing", body: issues[0] }); return; } setSaved(JSON.stringify(steps)); toast({ kind: "ok", title: "Approval flow published", body: `${steps.length} steps` }); };
  return (
    <>
      <PageHeader title="Approval flow designer" crumbs={["Workflows", "Approval flow"]} desc="Design who must approve a purchase request, and under what conditions. Try an amount on the right to see the route a request would take."
        status={issues.length ? <Badge s="danger">{issues.length} issue{issues.length > 1 ? "s" : ""}</Badge> : dirty ? <Badge s="warn">Unpublished changes</Badge> : <Badge s="ok">Published</Badge>}
        actions={<><Btn variant="ghost" onClick={() => { draft.discard(); setSaved(JSON.stringify(SEED_STEPS)); }}>Reset to default</Btn><Btn variant="primary" onClick={publish}>Publish flow</Btn></>} />
      <div className="frm-flow">
        <Panel title="Steps" actions={<Btn sm icon="plus" onClick={() => set([...steps, newStep(steps.length + 1)])}>Add step</Btn>}>
          {steps.length === 0 ? <EmptyState title="No approval steps" action={<Btn variant="primary" onClick={() => set([newStep(1)])}>Add the first step</Btn>}>Requests would be approved automatically.</EmptyState> : (
            <ol className="frm-steps">{steps.map((s, i) => (
              <li key={s.id} className={appliesTo(s, amount) ? "is-on" : "is-skip"}>
                <span className="frm-num" aria-hidden>{i + 1}</span>
                <div className="frm-step">
                  <Editable label={`Name of step ${i + 1}`} value={s.name} editor={{ type: "text", maxLength: 50 }} onSave={(v) => patch(s.id, { name: String(v) })} validate={(v) => (String(v).trim() ? null : "A step needs a name")} />
                  <div className="frm-step__row">
                    <Editable label={`Approver for ${s.name}`} value={s.approver} editor={{ type: "select", options: APPROVERS.map((a) => ({ value: a, label: a })) }} onSave={(v) => patch(s.id, { approver: String(v) })} />
                    <Editable label={`Approval rule for ${s.name}`} value={s.mode} editor={{ type: "select", options: [{ value: "any", label: "Any one approver" }, { value: "all", label: "Everyone must approve" }] }} onSave={(v) => patch(s.id, { mode: v as Step["mode"] })} />
                    <Editable label={`Condition for ${s.name}`} value={s.when} editor={{ type: "select", options: WHEN }} onSave={(v) => patch(s.id, { when: v as Step["when"] })} />
                    {s.when !== "always" && <Editable label={`Amount threshold for ${s.name}`} value={s.amount} editor={{ type: "number", min: 0, currency: "AUD" }} onSave={(v) => patch(s.id, { amount: Number(v) })} />}
                    <Editable label={`SLA hours for ${s.name}`} value={s.slaHours} editor={{ type: "number", min: 1, max: 720, unit: "h" }} onSave={(v) => patch(s.id, { slaHours: Number(v) })} validate={(v) => (Number(v) < 1 ? "SLA must be at least 1 hour" : null)} />
                  </div>
                </div>
                <span className="adm-row"><Btn sm variant="ghost" aria-label={`Move ${s.name} up`} disabled={i === 0} onClick={() => set(move(steps, i, i - 1))}>Up</Btn><Btn sm variant="ghost" aria-label={`Move ${s.name} down`} disabled={i === steps.length - 1} onClick={() => set(move(steps, i, i + 1))}>Down</Btn><Btn sm variant="ghost" aria-label={`Remove ${s.name}`} onClick={() => remove(i)}>Remove</Btn></span>
              </li>))}</ol>)}
        </Panel>
        <div className="adm-stack">
          <Panel title="Test a request"><div className="adm-stack">
            <Field label="Request amount">{() => <NumberStepper value={amount} onChange={setAmount} min={0} max={1000000} step={500} unit="AUD" />}</Field>
            {r.path.length === 0 ? <Alert s="warn" title="Approved automatically">No step applies to {money(amount)}.</Alert> : (
              <ol className="frm-path" aria-label="Route for this request">{r.path.map((s) => <li key={s.id}><b>{s.name}</b><span className="jp-muted">{s.approver}, {s.mode === "all" ? "all must approve" : "any one"}, within {s.slaHours} h</span></li>)}</ol>)}
            <p className="jp-muted" aria-live="polite">{r.path.length} of {steps.length} steps apply. Longest wait {r.hours} h{r.skipped.length ? `; skipped: ${r.skipped.map((s) => s.name).join(", ")}` : ""}.</p>
          </div></Panel>
          <Panel title="Checks">{issues.length === 0 ? <Alert s="ok" title="The flow is valid">Every request amount reaches at least one approver.</Alert> : <ul className="frm-issues">{issues.map((m) => <li key={m}><Badge s="danger">Fix</Badge> {m}</li>)}</ul>}</Panel>
        </div>
      </div>
    </>
  );
}
