import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SameAsAbove, useDraft } from "@belikh/jupiter-ui/forms.tsx";
import { PageHeader, Panel, Btn, Stepper, Alert, Badge } from "@belikh/jupiter-ui/kit.tsx";
import { Field, TextInput, RadioCards, Slider, Switch, KeyValueEditor, Select } from "@belikh/jupiter-ui/inputs.tsx";
import { Spot } from "@belikh/jupiter-ui/Icon.tsx";

export function Wizard() {
  // The step lives in the URL (?step=2: shareable, Back works) and the answers are kept as a draft, so a reload or a later visit resumes here.
  const [sp, setSp] = useSearchParams(); const step = Math.min(3, Math.max(0, Number(sp.get("step")) || 0)); const setStep = (n: number | ((s: number) => number)) => setSp({ step: String(typeof n === "function" ? n(step) : n) });
  const [done, setDone] = useState(false);
  const draft = useDraft("wizard-project", { name: "", region: "ap-southeast-2", plan: "pro" as "free" | "pro" | "team", cpu: 2, ha: true, ownerEmail: "", billingEmail: "", sameBilling: true, env: [{ k: "NODE_ENV", v: "production" }] }); const d = draft.value; const setD = draft.setValue;
  const [tried, setTried] = useState(false);
  const err = step === 0 && !d.name.match(/^[a-z][a-z0-9-]{2,}$/) ? "Use lowercase letters, numbers and dashes (min 3, start with a letter)" : "";
  const next = () => { setTried(true); if (err) return; setTried(false); setStep((s) => s + 1); };
  if (done) return (<div style={{ maxWidth: 520, margin: "40px auto", textAlign: "center" }} className="adm-stack"><Spot name="rocket" size={160} /><h1>{d.name} is launching</h1><p className="jp-muted">We’re provisioning your {d.plan} environment in {d.region}. This takes about a minute.</p><div className="adm-row" style={{ justifyContent: "center" }}><Btn variant="primary" onClick={() => { setDone(false); setStep(0); setD({ ...d, name: "" }); }}>Create another</Btn><Btn>View project</Btn></div></div>);
  return (
    <>
      <PageHeader title="Create project" crumbs={["Records", "New"]} desc="A four-step wizard with per-step validation and a review screen." />
      <div className="adm-stack" style={{ maxWidth: 760 }}>
        {draft.restored && <Alert s="info" title="Resumed your draft">Your earlier answers were restored. <button type="button" className="adm-link" onClick={() => { draft.discard(); setStep(0); }}>Start over</button></Alert>}
        <Stepper steps={["Basics", "Plan", "Configure", "Review"]} current={step} />
        <Panel>
          {step === 0 && <div className="adm-stack"><Field label="Project name" required error={tried ? err : undefined} hint="Used in URLs">{(id, dd) => <TextInput id={id} aria-describedby={dd} value={d.name} onChange={(v) => setD({ ...d, name: v })} placeholder="my-project" autoFocus state={tried && err ? "error" : undefined} />}</Field>
            <Field label="Region">{(id) => <Select id={id} value={d.region} onChange={(v) => setD({ ...d, region: v })} options={["ap-southeast-2", "ap-southeast-4", "us-east-1", "eu-west-1"]} />}</Field>
            <Field label="Owner email">{(id) => <TextInput id={id} type="email" value={d.ownerEmail} onChange={(v) => setD({ ...d, ownerEmail: v, billingEmail: d.sameBilling ? v : d.billingEmail })} />}</Field>
            <SameAsAbove label="Billing email is the same as the owner email" checked={d.sameBilling} onChange={(v) => setD({ ...d, sameBilling: v, billingEmail: v ? d.ownerEmail : d.billingEmail })} />
            <Field label="Billing email">{(id) => <TextInput id={id} type="email" disabled={d.sameBilling} value={d.sameBilling ? d.ownerEmail : d.billingEmail} onChange={(v) => setD({ ...d, billingEmail: v })} />}</Field></div>}
          {step === 1 && <RadioCards name="plan" value={d.plan} onChange={(v) => setD({ ...d, plan: v })} options={[{ value: "free", title: "Free", desc: "Hobby projects. 1 vCPU, community support.", icon: "leaf" }, { value: "pro", title: "Pro", desc: "Production workloads. Autoscaling, backups.", icon: "bolt", badge: "popular" }, { value: "team", title: "Team", desc: "SSO, audit log and priority support.", icon: "shield" }]} />}
          {step === 2 && <div className="adm-stack"><Field label="vCPUs">{() => <Slider label="vCPUs" value={d.cpu} onChange={(v) => setD({ ...d, cpu: v })} min={1} max={16} marks={[1, 4, 8, 16]} fmt={(v) => `${v} vCPU`} />}</Field><Switch checked={d.ha} onChange={(v) => setD({ ...d, ha: v })} label="High availability (2 replicas)" /><div><div className="jp-label">Environment variables</div><KeyValueEditor rows={d.env} onChange={(r) => setD({ ...d, env: r })} /></div></div>}
          {step === 3 && <div className="adm-stack"><Alert s="info" title="Review your choices">Nothing is created until you press Launch.</Alert><dl className="adm-dl"><dt>Name</dt><dd className="adm-num">{d.name}</dd><dt>Region</dt><dd>{d.region}</dd><dt>Plan</dt><dd><Badge s="info">{d.plan}</Badge></dd><dt>Compute</dt><dd>{d.cpu} vCPU{d.ha ? " × 2 replicas" : ""}</dd><dt>Variables</dt><dd>{d.env.length}</dd></dl></div>}
        </Panel>
        <div className="adm-row" style={{ justifyContent: "space-between" }}><Btn disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Btn>{step < 3 ? <Btn variant="primary" onClick={next}>Continue</Btn> : <Btn variant="primary" icon="send" onClick={() => { draft.clear(); setDone(true); }}>Launch</Btn>}</div>
      </div>
    </>
  );
}
