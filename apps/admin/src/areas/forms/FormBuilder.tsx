import { useRef, useState } from "react";
import { Alert, Badge, Btn, EmptyState, PageHeader, Panel, Tabs } from "@belikh/jupiter-ui/kit.tsx";
import { Checkbox, Field, Select, TextArea, TextInput } from "@belikh/jupiter-ui/inputs.tsx";
import { Editable } from "@belikh/jupiter-ui/editable.tsx";
import { FormSummary, useDraft } from "@belikh/jupiter-ui/forms.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { COND_OPS, FIELD_TYPES, SEED_FIELDS, condError, isVisible, move, newField, validateForm, type BField, type CondOp, type FieldType, type FormValues } from "./lib.ts";
import "./forms.css";

export function FormBuilder() {
  const { toast } = usePrefs();
  const draft = useDraft<BField[]>("frm-form-fields", SEED_FIELDS); const fields = draft.value, setFields = draft.setValue; const [sel, setSel] = useState<string | null>(fields[0]?.id ?? null);
  const [tab, setTab] = useState("build"); const [title, setTitle] = useState("Equipment request"); const drag = useRef<{ kind: "new"; type: FieldType } | { kind: "move"; from: number } | null>(null); const [over, setOver] = useState<number | null>(null);
  const idx = fields.findIndex((f) => f.id === sel); const cur = fields[idx];
  const errs = fields.map((_, i) => condError(fields, i)); const bad = errs.filter(Boolean).length;
  const patch = (id: string, p: Partial<BField>) => setFields(fields.map((f) => (f.id === id ? { ...f, ...p } : f)));
  const insert = (type: FieldType, at = fields.length) => { const f = newField(type); const next = [...fields]; next.splice(at, 0, f); setFields(next); setSel(f.id); };
  const remove = (i: number) => { const prev = fields, was = sel; setFields(fields.filter((_, j) => j !== i)); setSel(fields[i + 1]?.id ?? fields[i - 1]?.id ?? null); toast({ kind: "info", title: `Removed “${prev[i].label}”`, undo: () => { setFields(prev); setSel(was); } }); };
  const drop = (at: number) => { const d = drag.current; drag.current = null; setOver(null); if (!d) return; if (d.kind === "new") insert(d.type, at); else setFields(move(fields, d.from, at > d.from ? at - 1 : at)); };
  const priorFields = fields.slice(0, Math.max(0, idx));
  const srcField = cur?.cond ? fields.find((f) => f.id === cur.cond!.field) : undefined;
  return (
    <>
      <PageHeader title={<Editable value={title} editor={{ type: "text", maxLength: 80 }} label="Form title" onSave={(v) => setTitle(String(v))} />} crumbs={["Forms", "Form builder"]}
        desc="Drag fields from the palette onto the canvas, or press the Add button. Use Move up and Move down to reorder with the keyboard."
        status={bad ? <Badge s="danger">{bad} logic issue{bad > 1 ? "s" : ""}</Badge> : <Badge s="ok">{fields.length} fields</Badge>}
        tabs={<Tabs tabs={[{ id: "build", label: "Build" }, { id: "preview", label: "Preview" }]} value={tab} onChange={setTab} />} />
      {draft.restored && <Alert s="info" title="Restored your unsaved draft"><Btn sm onClick={() => { draft.discard(); setSel(SEED_FIELDS[0].id); }}>Start over</Btn></Alert>}
      {tab === "preview" ? <Preview fields={fields} title={title} /> : (
        <div className="frm-builder">
          <Panel title="Field types"><ul className="frm-palette" aria-label="Field types">{FIELD_TYPES.map((t) => (
            <li key={t.type} draggable onDragStart={(e) => { drag.current = { kind: "new", type: t.type }; e.dataTransfer.effectAllowed = "copy"; }} onDragEnd={() => { drag.current = null; setOver(null); }}>
              <span>{t.label}</span><Btn sm variant="ghost" aria-label={`Add ${t.label} field`} onClick={() => insert(t.type, idx >= 0 ? idx + 1 : fields.length)}>Add</Btn></li>))}</ul></Panel>
          <Panel title="Canvas">
            {fields.length === 0 ? <EmptyState title="No fields yet" action={<Btn variant="primary" onClick={() => insert("text")}>Add a text field</Btn>}>Drag a field type here or use its Add button.</EmptyState> :
              <ol className="frm-canvas" onDragOver={(e) => e.preventDefault()}>{fields.map((f, i) => (
                <li key={f.id} className={`${f.id === sel ? "is-sel" : ""} ${over === i ? "is-over" : ""}`} draggable onDragStart={(e) => { drag.current = { kind: "move", from: i }; e.dataTransfer.effectAllowed = "move"; }} onDragOver={(e) => { e.preventDefault(); setOver(i); }} onDrop={(e) => { e.preventDefault(); drop(i); }} onDragEnd={() => setOver(null)}>
                  <button className="frm-pick" aria-pressed={f.id === sel} onClick={() => setSel(f.id)}><b>{f.label || "Untitled"}</b>{f.required && <span aria-hidden> *</span>}<small className="jp-muted">{FIELD_TYPES.find((t) => t.type === f.type)!.label}{f.cond ? " · conditional" : ""}</small></button>
                  {errs[i] && <Badge s="danger">{errs[i]}</Badge>}
                  <span className="adm-row"><Btn sm variant="ghost" aria-label={`Move ${f.label} up`} disabled={i === 0} onClick={() => setFields(move(fields, i, i - 1))}>Up</Btn><Btn sm variant="ghost" aria-label={`Move ${f.label} down`} disabled={i === fields.length - 1} onClick={() => setFields(move(fields, i, i + 1))}>Down</Btn><Btn sm variant="ghost" aria-label={`Delete ${f.label}`} onClick={() => remove(i)}>Delete</Btn></span>
                </li>))}
                <li className={`frm-end ${over === fields.length ? "is-over" : ""}`} onDragOver={(e) => { e.preventDefault(); setOver(fields.length); }} onDrop={(e) => { e.preventDefault(); drop(fields.length); }}>Drop here to add at the end</li></ol>}
          </Panel>
          <Panel title="Field settings">
            {!cur ? <p className="jp-muted">Select a field to edit it.</p> : (
              <div className="adm-stack" key={cur.id}>
                <Field label="Label">{(id) => <TextInput id={id} value={cur.label} onChange={(v) => patch(cur.id, { label: v })} />}</Field>
                <Field label="Type">{(id) => <Select id={id} value={cur.type} onChange={(v) => patch(cur.id, { type: v as FieldType, options: v === "select" && !cur.options.length ? ["Option 1", "Option 2"] : cur.options })} options={FIELD_TYPES.map((t) => ({ value: t.type, label: t.label }))} />}</Field>
                <Checkbox checked={cur.required} onChange={(v) => patch(cur.id, { required: v })} label="Required" />
                {cur.type === "select" && <Field label="Options (one per line)">{(id) => <TextArea id={id} rows={4} value={cur.options.join("\n")} onChange={(v) => patch(cur.id, { options: v.split("\n") })} />}</Field>}
                {cur.type === "number" && <div className="adm-row"><Field label="Minimum">{(id) => <TextInput id={id} inputMode="numeric" value={cur.min?.toString() ?? ""} onChange={(v) => patch(cur.id, { min: v === "" ? undefined : Number(v) })} />}</Field><Field label="Maximum">{(id) => <TextInput id={id} inputMode="numeric" value={cur.max?.toString() ?? ""} onChange={(v) => patch(cur.id, { max: v === "" ? undefined : Number(v) })} />}</Field></div>}
                <fieldset className="frm-logic"><legend>Conditional logic</legend>
                  <Checkbox checked={!!cur.cond} disabled={!priorFields.length} onChange={(on) => patch(cur.id, { cond: on ? { field: priorFields[priorFields.length - 1].id, op: "eq", value: "" } : null })} label="Only show this field when…" />
                  {!priorFields.length && <p className="jp-muted">Move this field below another to use it as a condition.</p>}
                  {cur.cond && (<>
                    <Field label="Field">{(id) => <Select id={id} value={cur.cond!.field} onChange={(v) => patch(cur.id, { cond: { ...cur.cond!, field: v } })} options={fields.filter((f) => f.id !== cur.id).map((f) => ({ value: f.id, label: f.label }))} />}</Field>
                    <Field label="Operator">{(id) => <Select id={id} value={cur.cond!.op} onChange={(v) => patch(cur.id, { cond: { ...cur.cond!, op: v as CondOp } })} options={COND_OPS} />}</Field>
                    {cur.cond.op !== "filled" && <Field label="Value" error={errs[idx] ?? undefined}>{(id) => srcField?.type === "select" && cur.cond!.op !== "gt" ? <Select id={id} value={cur.cond!.value} onChange={(v) => patch(cur.id, { cond: { ...cur.cond!, value: v } })} options={["", ...srcField.options]} /> : <TextInput id={id} value={cur.cond!.value} onChange={(v) => patch(cur.id, { cond: { ...cur.cond!, value: v } })} />}</Field>}
                    {errs[idx] && cur.cond.op === "filled" && <Alert s="danger" title={errs[idx]!} />}
                  </>)}
                </fieldset>
              </div>)}
          </Panel>
        </div>)}
    </>
  );
}

function Preview({ fields, title }: { fields: BField[]; title: string }) {
  const { toast } = usePrefs(); const [vals, setVals] = useState<FormValues>({}); const [sent, setSent] = useState(false);
  const [shown, setShown] = useState<Record<string, string>>({});
  const errors = validateForm(fields, vals);
  const set = (id: string, v: string | boolean) => setVals((x) => ({ ...x, [id]: v }));
  const submit = (e: React.FormEvent) => { e.preventDefault(); setShown(errors); if (Object.keys(errors).length === 0) { setSent(true); toast({ kind: "ok", title: "Preview submitted", body: "Nothing was saved; this is a preview." }); } };
  const visible = fields.filter((x) => isVisible(x, vals, fields));
  return (
    <Panel title={`Preview: ${title}`}>
      {sent ? <Alert s="ok" title="Thanks, your response was recorded"><Btn sm onClick={() => { setSent(false); setVals({}); setShown({}); }}>Fill in again</Btn></Alert> : (
        <form className="frm-preview adm-stack" onSubmit={submit} noValidate aria-label={title}>
          {Object.keys(shown).length > 0 && <FormSummary items={Object.entries(shown)} />}
          {visible.map((x) => (
            <Field key={x.id} label={x.label} required={x.required} error={shown[x.id]}>{(id, d) => {
              const v = vals[x.id]; const common = { id, "aria-describedby": d };
              if (x.type === "textarea") return <TextArea {...common} value={String(v ?? "")} onChange={(t) => set(x.id, t)} />;
              if (x.type === "select") return <Select {...common} value={String(v ?? "")} onChange={(t) => set(x.id, t)} options={["", ...x.options.filter(Boolean)]} />;
              if (x.type === "checkbox") return <Checkbox checked={v === true} onChange={(t) => set(x.id, t)} label={x.label} />;
              if (x.type === "date") return <TextInput {...common} type="date" value={String(v ?? "")} onChange={(t) => set(x.id, t)} />;
              return <TextInput {...common} inputMode={x.type === "number" ? "numeric" : undefined} value={String(v ?? "")} onChange={(t) => set(x.id, t)} />;
            }}</Field>))}
          {visible.length === 0 && <p className="jp-muted">This form has no visible fields.</p>}
          <div><Btn variant="primary" type="submit">Submit</Btn></div>
        </form>)}
    </Panel>
  );
}
