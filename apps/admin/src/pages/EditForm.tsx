import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader, Panel, Btn, Alert, Badge, Modal } from "@belikh/jupiter-ui/kit.tsx";
import { usePasteFill } from "@belikh/jupiter-ui/forms.tsx";
import { Disclosure } from "@belikh/jupiter-ui/kit.tsx";
import { Field, TextInput, TextArea, Select, Switch, Combobox, Segmented, NumberStepper, KeyValueEditor, Checkbox } from "@belikh/jupiter-ui/inputs.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";

const init = { name: "Ava Nguyen", email: "ava@example.com", site: "https://jupiter.au", bio: "Builds and runs the household fleet.", role: "admin", tz: "Australia/Brisbane", tags: ["nixos", "rust"], digest: true, level: "weekly", seats: 5, env: [{ k: "API_URL", v: "https://api.jupiter.au" }, { k: "LOG_LEVEL", v: "info" }], terms: false };
type F = typeof init;
export function EditForm() {
  const { toast } = usePrefs(); const [f, setF] = useState<F>(init); const [saved, setSaved] = useState<F>(init); const [touched, setTouched] = useState<Record<string, boolean>>({}); const [submitted, setSubmitted] = useState(false); const [saving, setSaving] = useState(false); const [auto, setAuto] = useState<string>("");
  const root = useRef<HTMLFormElement>(null); usePasteFill(root, (n, skipped) => toast({ kind: "ok", title: `Filled ${n} ${n === 1 ? "field" : "fields"} from the clipboard`, body: skipped.length ? `Not found: ${skipped.join(", ")}` : undefined })); const [pasteOpen, setPasteOpen] = useState(false); const [pasteTxt, setPasteTxt] = useState(""); const [pasteErr, setPasteErr] = useState("");
  const applyPaste = () => { try { const j = JSON.parse(pasteTxt) as Record<string, unknown>; if (!j || typeof j !== "object" || Array.isArray(j)) throw new Error("Expected a JSON object"); const next = { ...f } as Record<string, unknown>; const known = Object.keys(init) as (keyof F)[]; const bad: string[] = []; for (const k of known) if (k in j) { if (typeof j[k] === typeof init[k] || (k === "tags" && Array.isArray(j[k])) || (k === "env" && Array.isArray(j[k]))) next[k] = j[k]; else bad.push(k); } if (bad.length) throw new Error(`Wrong type for: ${bad.join(", ")}`); setF(next as F); setPasteOpen(false); setPasteTxt(""); setPasteErr(""); toast({ kind: "ok", title: "Form filled from JSON" }); } catch (err) { setPasteErr(err instanceof Error ? err.message : "Invalid JSON"); } };
  const errors = useMemo(() => {
    const e: Partial<Record<keyof F, string>> = {};
    if (!f.name.trim()) e.name = "Name is required"; else if (f.name.length < 3) e.name = "Use at least 3 characters";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) e.email = "Enter a valid email address";
    if (f.site && !/^https?:\/\/.+\..+/.test(f.site)) e.site = "Must start with http:// or https://";
    if (f.bio.length > 120) e.bio = "Bio is too long";
    if (f.role === "admin" && f.seats < 2) e.seats = "Admins need at least 2 seats (cross-field rule)";
    if (!f.terms) e.terms = "Accept the terms to continue";
    return e;
  }, [f]);
  const dirty = JSON.stringify(f) !== JSON.stringify(saved); const set = <K extends keyof F>(k: K, v: F[K]) => setF((x) => ({ ...x, [k]: v }));
  const show = (k: keyof F) => (touched[k] || submitted ? errors[k] : undefined);
  const blur = (k: string) => setTouched((t) => ({ ...t, [k]: true }));
  useEffect(() => { const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } }; window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h); }, [dirty]);
  useEffect(() => { if (!dirty) return; const t = setTimeout(() => setAuto(`Draft saved ${new Date().toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`), 1200); return () => clearTimeout(t); }, [f, dirty]);
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setSubmitted(true);
    const first = Object.keys(errors)[0]; if (first) { (root.current?.querySelector(`[data-f="${first}"] input, [data-f="${first}"] textarea, [data-f="${first}"] select`) as HTMLElement | null)?.focus(); return; }
    setSaving(true); setTimeout(() => { setSaving(false); setSaved(f); setAuto(""); toast({ kind: "ok", title: "Profile saved" }); }, 900);
  };
  return (
    <form ref={root} onSubmit={submit} noValidate>
      <PageHeader title="Edit profile" crumbs={["Records", "Edit"]} desc="Validation on blur and submit, cross-field rules, dirty tracking, autosave status and a sticky save bar." status={dirty ? <Badge s="warn">unsaved changes</Badge> : <Badge s="ok">saved</Badge>} actions={<Btn type="button" icon="code" onClick={() => setPasteOpen(true)}>Paste JSON</Btn>} />
      {submitted && Object.keys(errors).length > 0 && <div style={{ marginBottom: 16 }}><Alert s="danger" title={`${Object.keys(errors).length} problems to fix`}>{Object.values(errors).join(" · ")}</Alert></div>}
      <div className="adm-grid adm-grid--21">
        <div className="adm-stack">
          <Panel title="Identity"><div className="adm-grid adm-grid--2">
            <div data-f="name"><Field label="Full name" required error={show("name")} hint="As it appears on invoices">{(id, d) => <TextInput id={id} aria-describedby={d} value={f.name} onChange={(v) => set("name", v)} onBlur={() => blur("name")} state={show("name") ? "error" : f.name.length > 2 ? "success" : undefined} />}</Field></div>
            <div data-f="email"><Field label="Email" required error={show("email")}>{(id, d) => <TextInput id={id} aria-describedby={d} type="email" value={f.email} onChange={(v) => set("email", v)} onBlur={() => blur("email")} state={show("email") ? "error" : undefined} />}</Field></div>
            <div data-f="site"><Field label="Website" error={show("site")} warn={f.site.startsWith("http://") ? "http:// is not secure" : undefined}>{(id, d) => <TextInput id={id} aria-describedby={d} value={f.site} onChange={(v) => set("site", v)} onBlur={() => blur("site")} prefix="url" state={show("site") ? "error" : undefined} />}</Field></div>
            <Field label="Time zone">{(id) => <Select id={id} value={f.tz} onChange={(v) => set("tz", v)} options={["Australia/Brisbane", "Australia/Sydney", "Australia/Perth", "UTC"]} />}</Field>
            <div data-f="bio" style={{ gridColumn: "1 / -1" }}><Field label="Bio" counter={[f.bio.length, 120]} error={show("bio")}>{(id) => <TextArea id={id} value={f.bio} onChange={(v) => set("bio", v)} onBlur={() => blur("bio")} max={120} />}</Field></div>
          </div></Panel>
          <Panel title="Access"><div className="adm-grid adm-grid--2">
            <Field label="Role">{(id) => <Select id={id} value={f.role} onChange={(v) => set("role", v)} options={[{ value: "viewer", label: "Viewer" }, { value: "editor", label: "Editor" }, { value: "admin", label: "Admin" }]} />}</Field>
            <div data-f="seats"><Field label="Seats" error={show("seats")}>{() => <NumberStepper value={f.seats} onChange={(v) => { set("seats", v); blur("seats"); }} min={0} max={50} />}</Field></div>
            <div style={{ gridColumn: "1 / -1" }}><Field label="Tags">{(id) => <Combobox id={id} multi creatable options={["nixos", "rust", "go", "unifi", "esphome", "fpga", "retro"]} value={f.tags} onChange={(v) => set("tags", v)} placeholder="Add tags…" />}</Field></div>
          </div></Panel>
          <Disclosure label="Advanced: environment variables"><Panel title="Environment variables"><KeyValueEditor rows={f.env} onChange={(r) => set("env", r)} /></Panel></Disclosure>
        </div>
        <div className="adm-stack">
          <Panel title="Notifications"><div className="adm-stack"><Switch checked={f.digest} onChange={(v) => set("digest", v)} label="Email me a digest" /><div><div className="jp-label">Frequency</div><Segmented label="Frequency" value={f.level} onChange={(v) => set("level", v)} options={[{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }]} /></div></div></Panel>
          <Panel title="Terms"><div data-f="terms"><Checkbox checked={f.terms} onChange={(v) => { set("terms", v); blur("terms"); }} label="I accept the terms of service" />{show("terms") && <div className="adm-err" role="alert">{errors.terms}</div>}</div></Panel>
        </div>
      </div>
      <div className="adm-savebar" role="region" aria-label="Save bar"><span className="jp-muted">{saving ? "Saving…" : dirty ? (auto || "Unsaved changes") : "All changes saved"}</span><span className="adm-spacer" />
        <Btn type="button" disabled={!dirty || saving} onClick={() => { setF(saved); setTouched({}); setSubmitted(false); }}>Discard</Btn><Btn type="submit" variant="primary" disabled={!dirty || saving}>{saving ? "Saving…" : "Save changes"}</Btn></div>
      <Modal open={pasteOpen} onClose={() => setPasteOpen(false)} title="Fill the form from JSON" footer={<><Btn type="button" onClick={() => setPasteOpen(false)}>Cancel</Btn><Btn type="button" variant="primary" onClick={applyPaste}>Apply</Btn></>}>
        <p className="jp-muted" style={{ marginBottom: 8 }}>Paste an object with any of: name, email, site, bio, role, tz, tags, digest, level, seats, env. Types are checked.</p>
        <TextArea value={pasteTxt} onChange={setPasteTxt} rows={8} placeholder={'{ "name": "Noah Smith", "email": "noah@example.com", "seats": 3 }'} aria-label="JSON" />{pasteErr && <div className="adm-err" role="alert" style={{ marginTop: 6 }}>{pasteErr}</div>}
      </Modal>
    </form>
  );
}
