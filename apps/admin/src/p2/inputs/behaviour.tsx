import { useEffect, useMemo, useState } from "react";
import { Field, TextInput, TextArea, Select, Checkbox } from "@belikh/jupiter-ui/inputs.tsx";
import { Btn, Badge, Alert } from "@belikh/jupiter-ui/kit.tsx";
import { diffFields, nextVersion, type Change, type Version } from "./logic-data.ts";
import "./in2.css";

const store = {
  get(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
  del(k: string) { try { localStorage.removeItem(k); } catch { /* storage unavailable */ } },
};

/* ---------- save & resume (multi-step, autosaved) ---------- */
type App = { name: string; email: string; role: string; years: string; cover: string; agree: boolean };
const EMPTY: App = { name: "", email: "", role: "design", years: "", cover: "", agree: false };
const STEPS = ["About you", "Experience", "Review"];
export const stepErrors = (a: App, step: number): Partial<Record<keyof App, string>> => {
  const e: Partial<Record<keyof App, string>> = {};
  if (step >= 0) { if (!a.name.trim()) e.name = "Enter your name"; if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a.email)) e.email = "Enter a valid email"; }
  if (step >= 1) { if (!/^\d+$/.test(a.years) || +a.years > 60) e.years = "Whole years, 0 to 60"; if (a.cover.trim().length < 20) e.cover = "Write at least 20 characters"; }
  if (step >= 2 && !a.agree) e.agree = "Please confirm before submitting";
  return e;
};
export function SaveResume({ storageKey = "in2-save-resume", debounce = 400 }: { storageKey?: string; debounce?: number }) {
  const saved = useMemo(() => { const s = store.get(storageKey); try { return s ? (JSON.parse(s) as { app: App; step: number; at: string }) : null; } catch { return null; } }, [storageKey]);
  const [app, setApp] = useState<App>(EMPTY); const [step, setStep] = useState(0); const [offer, setOffer] = useState(!!saved); const [shown, setShown] = useState(false); const [status, setStatus] = useState(""); const [done, setDone] = useState(false);
  const dirty = JSON.stringify(app) !== JSON.stringify(EMPTY);
  useEffect(() => { if (!dirty || done) return; const t = setTimeout(() => { const at = new Date().toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }); store.set(storageKey, JSON.stringify({ app, step, at })); setStatus(`Draft saved at ${at}`); }, debounce); return () => clearTimeout(t); }, [app, step, dirty, done, storageKey, debounce]);
  const errs = stepErrors(app, step); const set = <K extends keyof App>(k: K, v: App[K]) => { setApp({ ...app, [k]: v }); setStatus("Saving…"); };
  const next = () => { setShown(true); if (Object.keys(errs).length) return; if (step < 2) { setStep(step + 1); setShown(false); } else { setDone(true); store.del(storageKey); setStatus(""); } };
  if (done) return <Alert s="ok" title="Application submitted">Thanks {app.name}. The saved draft was cleared. <button className="adm-link" type="button" onClick={() => { setApp(EMPTY); setStep(0); setDone(false); setShown(false); }}>Start another</button></Alert>;
  return (
    <div className="in2-stack">
      {offer && saved && <Alert s="info" title="You have an unfinished application">Last saved at {saved.at}. <span className="in2-row" style={{ display: "inline-flex", marginInlineStart: 8 }}><Btn sm variant="primary" onClick={() => { setApp(saved.app); setStep(saved.step); setOffer(false); }}>Resume</Btn><Btn sm onClick={() => { store.del(storageKey); setOffer(false); }}>Discard</Btn></span></Alert>}
      <ol className="in2-row" aria-label="Progress" style={{ listStyle: "none", padding: 0, margin: 0 }}>{STEPS.map((s, i) => <li key={s} aria-current={i === step ? "step" : undefined}><span className={`in2-pill ${i < step ? "in2-pill--ok" : ""}`} style={i === step ? { borderColor: "var(--jp-accent)" } : undefined}>{i + 1}. {s}</span></li>)}</ol>
      <form className="in2-stack" noValidate onSubmit={(e) => { e.preventDefault(); next(); }} aria-label={STEPS[step]}>
        {step === 0 && <><Field label="Full name" error={shown ? errs.name : undefined}>{(id, d) => <TextInput id={id} aria-describedby={d} value={app.name} onChange={(v) => set("name", v)} state={shown && errs.name ? "error" : undefined} />}</Field><Field label="Email" error={shown ? errs.email : undefined}>{(id, d) => <TextInput id={id} aria-describedby={d} value={app.email} onChange={(v) => set("email", v)} state={shown && errs.email ? "error" : undefined} />}</Field><Field label="Role">{(id) => <Select id={id} value={app.role} onChange={(v) => set("role", v)} options={[{ value: "design", label: "Designer" }, { value: "eng", label: "Engineer" }, { value: "ops", label: "Operations" }]} />}</Field></>}
        {step === 1 && <><Field label="Years of experience" error={shown ? errs.years : undefined}>{(id, d) => <TextInput id={id} aria-describedby={d} value={app.years} onChange={(v) => set("years", v)} state={shown && errs.years ? "error" : undefined} />}</Field><Field label="Why this role?" error={shown ? errs.cover : undefined} hint={`${app.cover.trim().length} characters`}>{(id, d) => <TextArea id={id} aria-describedby={d} rows={4} value={app.cover} onChange={(v) => set("cover", v)} />}</Field></>}
        {step === 2 && <><dl className="in2-box" style={{ margin: 0 }}>{([["Name", app.name], ["Email", app.email], ["Role", app.role], ["Experience", `${app.years} years`], ["Statement", app.cover]] as const).map(([a, b]) => <div key={a} className="in2-row"><dt className="in2-note" style={{ width: 90 }}>{a}</dt><dd style={{ margin: 0 }}>{b}</dd></div>)}</dl><Checkbox checked={app.agree} onChange={(v) => set("agree", v)} label="I confirm these details are correct" />{shown && errs.agree && <span role="alert" className="in2-bad">{errs.agree}</span>}</>}
        <div className="in2-row">{step > 0 && <Btn onClick={() => { setStep(step - 1); setShown(false); }}>Back</Btn>}<Btn variant="primary" type="submit">{step < 2 ? "Continue" : "Submit"}</Btn><span className="in2-note" role="status" aria-live="polite">{status}</span></div>
      </form>
      <span className="in2-note">Progress is saved to this browser as you type. Reload the page to see the resume prompt.</span>
    </div>
  );
}

/* ---------- draft & publish with version history ---------- */
type Post = { title: string; body: string; audience: string };
const POST0: Post = { title: "Winter opening hours", body: "We are open 9 to 5 on weekdays.", audience: "everyone" };
export function DraftPublish() {
  const [draft, setDraft] = useState<Post>({ ...POST0, body: "We are open 9 to 5 on weekdays, and 10 to 2 on Saturdays." }); const [live, setLive] = useState<Post>(POST0); const [versions, setVersions] = useState<Version<Post>[]>([{ v: 1, at: "2026-11-10 09:12", by: "Priya", data: POST0, note: "Published" }]); const [clock, setClock] = useState(0); const [confirm, setConfirm] = useState(false);
  const changes = diffFields(live as unknown as Record<string, unknown>, draft as unknown as Record<string, unknown>, "you", "now"); const dirty = changes.length > 0; const stamp = () => `2026-11-12 ${String(10 + Math.floor(clock / 60)).padStart(2, "0")}:${String(clock % 60).padStart(2, "0")}`;
  const publish = () => { setVersions(nextVersion(versions, draft, "You", stamp(), "Published")); setLive(draft); setClock(clock + 7); setConfirm(false); };
  const invalid = !draft.title.trim() || draft.body.trim().length < 10;
  return (
    <div className="in2-grid">
      <div className="in2-stack"><div className="in2-row"><Badge s={dirty ? "warn" : "ok"}>{dirty ? "Draft has unpublished changes" : "Published, no changes"}</Badge><span className="in2-note">Live version v{versions[0].v}</span></div>
        <Field label="Title" error={!draft.title.trim() ? "Required" : undefined}>{(id, d) => <TextInput id={id} aria-describedby={d} value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })} />}</Field>
        <Field label="Body" error={draft.body.trim().length < 10 ? "At least 10 characters" : undefined}>{(id, d) => <TextArea id={id} aria-describedby={d} rows={4} value={draft.body} onChange={(v) => setDraft({ ...draft, body: v })} />}</Field>
        <Field label="Audience">{(id) => <Select id={id} value={draft.audience} onChange={(v) => setDraft({ ...draft, audience: v })} options={[{ value: "everyone", label: "Everyone" }, { value: "staff", label: "Staff only" }]} />}</Field>
        <div className="in2-row">{!confirm ? <Btn variant="primary" disabled={!dirty || invalid} onClick={() => setConfirm(true)}>Publish…</Btn> : <><span role="alert">Publish {changes.length} change{changes.length > 1 ? "s" : ""} to everyone?</span><Btn variant="primary" onClick={publish}>Yes, publish</Btn><Btn onClick={() => setConfirm(false)}>Cancel</Btn></>}<Btn disabled={!dirty} onClick={() => setDraft(live)}>Discard draft</Btn></div></div>
      <div className="in2-stack"><b>Changes since published</b>{dirty ? <ul className="in2-stack" style={{ margin: 0, paddingInlineStart: 16 }}>{changes.map((c) => <li key={c.field}><b>{c.field}</b>: <del className="in2-bad">{c.from}</del> → <ins className="in2-ok" style={{ textDecoration: "none" }}>{c.to}</ins></li>)}</ul> : <span className="in2-note">Nothing to publish.</span>}
        <b>Version history</b><ol className="adm-list in2-box" style={{ margin: 0, padding: 0, listStyle: "none" }}>{versions.map((v) => <li key={v.v}><span className="in2-mono">v{v.v}</span><span style={{ flex: 1 }}>{v.at} · {v.by} · {v.data.title}</span>{v.v === versions[0].v ? <Badge s="ok">live</Badge> : <Btn sm onClick={() => setDraft(v.data)}>Restore to draft</Btn>}</li>)}</ol></div>
    </div>
  );
}

/* ---------- field-level permissions ---------- */
type Mode = "edit" | "read" | "hidden";
const FIELDS = [{ key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "salary", label: "Salary" }, { key: "notes", label: "Internal notes" }]; const ROLES = ["HR", "Manager", "Employee"];
export const resolveMode = (policy: Record<string, Record<string, Mode>>, role: string, field: string): Mode => policy[field]?.[role] ?? "hidden";
const POLICY0: Record<string, Record<string, Mode>> = { name: { HR: "edit", Manager: "edit", Employee: "read" }, email: { HR: "edit", Manager: "read", Employee: "edit" }, salary: { HR: "edit", Manager: "hidden", Employee: "read" }, notes: { HR: "edit", Manager: "edit", Employee: "hidden" } };
export function FieldPermissions() {
  const [policy, setPolicy] = useState(POLICY0); const [as, setAs] = useState("Manager"); const [rec, setRec] = useState<Record<string, string>>({ name: "Ava Nguyen", email: "ava@example.com", salary: "$112,000", notes: "Up for review in March" }); const [msg, setMsg] = useState("");
  return (
    <div className="in2-stack">
      <div style={{ overflowX: "auto" }}><table className="in2-tz" aria-label="Field access by role"><thead><tr><th>Field</th>{ROLES.map((r) => <th key={r}>{r}</th>)}</tr></thead><tbody>{FIELDS.map((f) => <tr key={f.key}><th scope="row">{f.label}</th>{ROLES.map((r) => <td key={r}><Select aria-label={`${f.label} for ${r}`} value={resolveMode(policy, r, f.key)} onChange={(v) => setPolicy({ ...policy, [f.key]: { ...policy[f.key], [r]: v as Mode } })} options={[{ value: "edit", label: "Edit" }, { value: "read", label: "Read only" }, { value: "hidden", label: "Hidden" }]} /></td>)}</tr>)}</tbody></table></div>
      <div className="in2-row"><span>Preview the record as</span><div style={{ width: 160 }}><Select aria-label="Preview role" value={as} onChange={(v) => { setAs(v); setMsg(""); }} options={ROLES.map((r) => ({ value: r, label: r }))} /></div></div>
      <form className="in2-box in2-stack" onSubmit={(e) => { e.preventDefault(); setMsg(`Saved by ${as}: only ${FIELDS.filter((f) => resolveMode(policy, as, f.key) === "edit").map((f) => f.label).join(", ") || "nothing"} could change`); }} aria-label={`Employee record as ${as}`}>
        {FIELDS.map((f) => { const m = resolveMode(policy, as, f.key); if (m === "hidden") return null; return <Field key={f.key} label={f.label} hint={m === "read" ? "Read only for your role" : undefined}>{(id, d) => <input id={id} aria-describedby={d} className="jp-input" readOnly={m === "read"} aria-readonly={m === "read" || undefined} value={rec[f.key]} onChange={(e) => setRec({ ...rec, [f.key]: e.target.value })} />}</Field>; })}
        <span className="in2-note">{FIELDS.filter((f) => resolveMode(policy, as, f.key) === "hidden").map((f) => f.label).join(", ") || "No"} field{FIELDS.filter((f) => resolveMode(policy, as, f.key) === "hidden").length === 1 ? "" : "s"} hidden from {as}</span>
        <div className="in2-row"><Btn variant="primary" type="submit">Save</Btn><span role="status" className="in2-ok">{msg}</span></div></form>
    </div>
  );
}

/* ---------- field history ---------- */
export function FieldHistory() {
  const [rec, setRec] = useState({ title: "Q4 roadmap", owner: "Priya", status: "Planning" }); const [vers, setVers] = useState<Version<typeof rec>[]>([{ v: 2, at: "2026-11-05 14:02", by: "Sam", data: { title: "Q4 roadmap", owner: "Priya", status: "Planning" }, note: "Status → Planning" }, { v: 1, at: "2026-10-28 09:40", by: "Priya", data: { title: "Q4 plan", owner: "Priya", status: "Draft" }, note: "Created" }]);
  const [open, setOpen] = useState<string | null>(null); const [tick, setTick] = useState(0);
  const history = useMemo(() => { const out: Change[] = []; for (let i = 0; i < vers.length - 1; i++) out.push(...diffFields(vers[i + 1].data, vers[i].data, vers[i].by, vers[i].at)); return out; }, [vers]);
  const save = (field: keyof typeof rec, value: string) => { if (value === rec[field]) return; const data = { ...rec, [field]: value }; setRec(data); setTick(tick + 1); setVers(nextVersion(vers, data, "You", `2026-11-12 11:${String(tick * 5).padStart(2, "0")}`, `${field} changed`)); };
  const forField = (f: string) => history.filter((c) => c.field === f);
  return (
    <div className="in2-stack">{(Object.keys(rec) as (keyof typeof rec)[]).map((f) => <div key={f} className="in2-stack" style={{ gap: 4 }}><Field label={f[0].toUpperCase() + f.slice(1)}>{(id) => <div className="in2-row" style={{ flexWrap: "nowrap" }}><input id={id} className="jp-input" defaultValue={rec[f]} key={rec[f]} onBlur={(e) => save(f, e.target.value)} /><Btn sm variant="ghost" aria-expanded={open === f} aria-controls={`hist-${f}`} onClick={() => setOpen(open === f ? null : f)}>History ({forField(f).length})</Btn></div>}</Field>
      {open === f && <ul id={`hist-${f}`} className="adm-list in2-box" style={{ padding: 0, margin: 0 }} aria-label={`${f} history`}>{forField(f).map((c, i) => <li key={i}><span style={{ flex: 1 }}><del className="in2-bad">{c.from || "(empty)"}</del> → <b>{c.to}</b></span><span className="in2-note">{c.by} · {c.at}</span><Btn sm onClick={() => save(f, c.from)}>Revert</Btn></li>)}{!forField(f).length && <li className="in2-note">No changes recorded.</li>}</ul>}</div>)}
      <span className="in2-note">Edit a field and leave it to record a new version. {vers.length} versions stored.</span></div>
  );
}
