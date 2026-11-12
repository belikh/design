import { useMemo, useState } from "react";
import { Field, TextInput, TextArea, Select, Checkbox, Segmented, Switch } from "@belikh/jupiter-ui/inputs.tsx";
import { Btn, Badge, Alert } from "@belikh/jupiter-ui/kit.tsx";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";
import { OPS, PERM_PRESETS, breaches, completeness, defaultsFor, describeFilter, describeRule, evalFilter, evalRule, matchTokens, normalisePerms, parseCsv, parseQuery, parseSchema, permDiff, placeholderIssues, suggestMapping, validateSchema, type Cond, type Filter, type FieldType, type Messages, type Perms, type RuleGroup, type Schema, type TargetField } from "./logic-data.ts";
import "./in2.css";

let uid = 0; const nid = (p = "x") => `${p}${++uid}`;
const move = <T,>(a: T[], from: number, to: number) => { if (to < 0 || to >= a.length || from === to) return a; const n = [...a]; const [x] = n.splice(from, 1); n.splice(to, 0, x); return n; };

/* ---------- JSON-schema driven form ---------- */
export const SAMPLE_SCHEMA: Schema = { type: "object", title: "Webhook", required: ["name", "url", "events"], properties: {
  name: { type: "string", title: "Name", minLength: 3, maxLength: 40 }, url: { type: "string", title: "Endpoint URL", format: "uri", description: "Must be https" },
  contact: { type: "string", title: "Contact email", format: "email" }, retries: { type: "integer", title: "Retries", minimum: 0, maximum: 10, default: 3 },
  mode: { type: "string", title: "Delivery", enum: ["immediate", "batched", "daily"], default: "immediate" }, active: { type: "boolean", title: "Active", default: true },
  events: { type: "array", title: "Events", minItems: 1, uniqueItems: true, items: { type: "string", enum: ["order.created", "order.paid", "refund.issued", "user.invited"] } },
  notes: { type: "string", title: "Notes", format: "textarea", maxLength: 200 } } };
function SchemaField({ name, s, value, onChange, error, required }: { name: string; s: Schema; value: unknown; onChange: (v: unknown) => void; error?: string; required: boolean }) {
  const label = (s.title ?? name) + (required ? "" : " (optional)");
  if (s.type === "boolean") return <div><Switch checked={!!value} onChange={onChange} label={s.title ?? name} /></div>;
  if (s.type === "array" && s.items?.enum) { const cur = (value as string[]) ?? []; return <Field label={label} error={error} hint={s.description}>{() => <div role="group" aria-label={label} className="in2-stack">{s.items!.enum!.map((o) => <Checkbox key={String(o)} checked={cur.includes(String(o))} onChange={(c) => onChange(c ? [...cur, String(o)] : cur.filter((x) => x !== o))} label={String(o)} />)}</div>}</Field>; }
  if (s.enum) return <Field label={label} error={error}>{(id) => <Select id={id} value={String(value ?? "")} onChange={onChange} options={s.enum!.map((o) => ({ value: String(o), label: String(o) }))} />}</Field>;
  if (s.type === "number" || s.type === "integer") return <Field label={label} error={error} hint={s.minimum !== undefined || s.maximum !== undefined ? `${s.minimum ?? ""} to ${s.maximum ?? ""}` : undefined}>{(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!error || undefined} className="jp-input" type="number" value={value === undefined || value === "" ? "" : String(value)} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} />}</Field>;
  if (s.format === "textarea") return <Field label={label} error={error}>{(id, d) => <TextArea id={id} aria-describedby={d} rows={3} value={String(value ?? "")} onChange={onChange} />}</Field>;
  return <Field label={label} error={error} hint={s.description}>{(id, d) => <TextInput id={id} aria-describedby={d} value={String(value ?? "")} onChange={onChange} state={error ? "error" : undefined} />}</Field>;
}
export function SchemaForm() {
  const [text, setText] = useState(JSON.stringify(SAMPLE_SCHEMA, null, 2)); const parsed = useMemo(() => parseSchema(text), [text]);
  const [vals, setVals] = useState<Record<string, unknown>>(() => defaultsFor(SAMPLE_SCHEMA) as Record<string, unknown>); const [shown, setShown] = useState(false); const [done, setDone] = useState<string | null>(null);
  const errs = parsed.schema ? validateSchema(parsed.schema, vals) : {}; const n = Object.keys(errs).length;
  return (
    <div className="in2-grid">
      <div className="in2-stack"><b>Schema</b><Field label="JSON schema (edit me)" error={parsed.error}>{(id, d) => <TextArea id={id} aria-describedby={d} className="in2-mono" rows={16} value={text} onChange={(v) => { setText(v); const p = parseSchema(v); if (p.schema) setVals(defaultsFor(p.schema) as Record<string, unknown>); setDone(null); }} />}</Field></div>
      <form className="in2-stack" noValidate onSubmit={(e) => { e.preventDefault(); setShown(true); if (!n) setDone(JSON.stringify(vals)); }} aria-label={parsed.schema?.title ?? "Generated form"}>
        <b>{parsed.schema?.title ?? "Form"}</b>
        {parsed.schema && Object.entries(parsed.schema.properties ?? {}).map(([k, s]) => <SchemaField key={k} name={k} s={s} required={!!parsed.schema!.required?.includes(k)} value={vals[k]} error={shown ? errs["/" + k] : undefined} onChange={(v) => { setVals({ ...vals, [k]: v }); setDone(null); }} />)}
        {shown && n > 0 && <span role="alert" className="in2-bad">{n} problem{n > 1 ? "s" : ""} to fix</span>}
        <div className="in2-row"><Btn variant="primary" type="submit">Save</Btn></div>{done && <Alert s="ok" title="Valid">Saved: <code className="in2-mono">{done}</code></Alert>}
      </form>
    </div>
  );
}

/* ---------- filter pills ---------- */
const FIELDS: { key: string; label: string; type: FieldType; options?: string[] }[] = [{ key: "name", label: "Name", type: "text" }, { key: "status", label: "Status", type: "enum", options: ["Active", "Paused", "Churned"] }, { key: "mrr", label: "MRR", type: "number" }, { key: "joined", label: "Joined", type: "date" }, { key: "plan", label: "Plan", type: "enum", options: ["Free", "Pro", "Team"] }];
export const ACCOUNTS: Record<string, unknown>[] = [["Acme Pty", "Active", 1200, "2026-02-14", "Team"], ["Birch & Co", "Paused", 90, "2026-06-30", "Pro"], ["Cobalt Labs", "Active", 450, "2025-11-03", "Pro"], ["Dune Foods", "Churned", 0, "2025-04-19", "Free"], ["Ember Studio", "Active", 75, "2026-10-21", "Pro"], ["Fjord Freight", "Active", 2300, "2024-08-09", "Team"], ["Gum Tree Cafe", "Paused", 30, "2026-09-02", "Free"], ["Harbour IT", "Active", 640, "2026-01-27", "Team"]].map(([name, status, mrr, joined, plan]) => ({ name, status, mrr, joined, plan }));
export function FilterPills({ today = new Date(2026, 10, 12) }: { today?: Date }) {
  const [filters, setFilters] = useState<Filter[]>([{ id: "f0", field: "status", op: "is", value: "Active" }]); const [editing, setEditing] = useState<string | null>(null);
  const ft = (k: string) => FIELDS.find((f) => f.key === k)!; const rows = ACCOUNTS.filter((r) => filters.every((f) => evalFilter(f, r, ft(f.field).type, today)));
  const add = () => { const f: Filter = { id: nid("f"), field: "name", op: "contains", value: "" }; setFilters([...filters, f]); setEditing(f.id); };
  const upd = (id: string, p: Partial<Filter>) => setFilters(filters.map((f) => (f.id === id ? { ...f, ...p } : f)));
  return (
    <div className="in2-stack">
      <div className="in2-row" role="group" aria-label="Active filters">
        {filters.map((f) => { const t = ft(f.field); return editing === f.id ? (
          <div key={f.id} className="in2-box in2-row" role="group" aria-label={`Edit filter ${t.label}`}>
            <Select aria-label="Field" value={f.field} onChange={(v) => { const nt = ft(v); upd(f.id, { field: v, op: OPS[nt.type][0].op, value: nt.options?.[0] ?? "", value2: undefined }); }} options={FIELDS.map((x) => ({ value: x.key, label: x.label }))} />
            <Select aria-label="Operator" value={f.op} onChange={(v) => upd(f.id, { op: v as Filter["op"] })} options={OPS[t.type].map((o) => ({ value: o.op, label: o.label }))} />
            {f.op !== "empty" && (t.type === "enum" && f.op !== "any" ? <Select aria-label="Value" value={f.value} onChange={(v) => upd(f.id, { value: v })} options={t.options!.map((o) => ({ value: o, label: o }))} /> : <input className="jp-input" aria-label="Value" style={{ width: 130 }} type={t.type === "date" && f.op !== "inlast" ? "date" : t.type === "number" || f.op === "inlast" ? "number" : "text"} value={f.value} onChange={(e) => upd(f.id, { value: e.target.value })} />)}
            {f.op === "between" && <input className="jp-input" aria-label="Upper value" style={{ width: 100 }} type="number" value={f.value2 ?? ""} onChange={(e) => upd(f.id, { value2: e.target.value })} />}
            <Btn sm variant="primary" onClick={() => setEditing(null)}>Done</Btn></div>
        ) : (<span key={f.id} className="in2-pill in2-pill--ok"><button type="button" onClick={() => setEditing(f.id)} aria-label={`Edit filter: ${describeFilter(f, t.label)}`}>{describeFilter(f, t.label)}</button><button type="button" aria-label={`Remove filter ${t.label}`} onClick={() => setFilters(filters.filter((x) => x.id !== f.id))}>×</button></span>); })}
        <Btn sm icon="plus" onClick={add}>Add filter</Btn>{filters.length > 0 && <Btn sm variant="ghost" onClick={() => setFilters([])}>Clear all</Btn>}
      </div>
      <div className="in2-note" aria-live="polite">{rows.length} of {ACCOUNTS.length} accounts match</div>
      <table className="in2-tz" aria-label="Filtered accounts"><thead><tr>{FIELDS.map((f) => <th key={f.key}>{f.label}</th>)}</tr></thead><tbody>{rows.map((r) => <tr key={String(r.name)}>{FIELDS.map((f) => <td key={f.key}>{String(r[f.key])}</td>)}</tr>)}{!rows.length && <tr><td colSpan={5} className="in2-note">No accounts match these filters.</td></tr>}</tbody></table>
    </div>
  );
}

/* ---------- tokenised search + saved queries ---------- */
const SEARCH_FIELDS = ["name", "status", "plan", "mrr"];
export function TokenSearch() {
  const [q, setQ] = useState("status:active plan:team"); const [saved, setSaved] = useState<{ name: string; q: string }[]>([{ name: "Big accounts", q: "mrr>500 -status:churned" }, { name: "At risk", q: "status:paused" }]); const [sname, setSname] = useState("");
  const toks = useMemo(() => parseQuery(q), [q]); const rows = ACCOUNTS.filter((r) => matchTokens(r, toks, SEARCH_FIELDS)); const bad = toks.filter((t) => t.kind === "field" && !SEARCH_FIELDS.includes(t.field!));
  const frag = q.split(/\s+/).pop() ?? ""; const sugg = frag && !frag.includes(":") ? SEARCH_FIELDS.filter((f) => f.startsWith(frag.replace(/^-/, "")) && f !== frag).map((f) => f + ":") : [];
  return (
    <div className="in2-stack">
      <Field label="Search" hint={`Scopes: ${SEARCH_FIELDS.join(", ")}. Use field:value, mrr>500, -field:value to exclude`} error={bad.length ? `Unknown scope “${bad[0].field}”` : undefined}>{(id, d) => <TextInput id={id} aria-describedby={d} value={q} onChange={setQ} state={bad.length ? "error" : undefined} />}</Field>
      <div className="in2-row" aria-label="Parsed query">{toks.map((t, i) => <span key={i} className={`in2-pill ${t.kind === "field" && !SEARCH_FIELDS.includes(t.field!) ? "in2-pill--warn" : t.neg ? "in2-pill--warn" : "in2-pill--ok"}`}>{t.raw}</span>)}{sugg.map((s) => <button key={s} type="button" className="in2-pill" onClick={() => setQ(q.slice(0, q.length - frag.length) + (frag.startsWith("-") ? "-" : "") + s)}>{s}</button>)}</div>
      <div className="in2-note" aria-live="polite">{rows.length} result{rows.length === 1 ? "" : "s"}: {rows.map((r) => String(r.name)).join(", ") || "none"}</div>
      <div className="in2-box in2-stack"><b>Saved queries</b><div className="in2-row">{saved.map((s) => <span key={s.name} className="in2-pill"><button type="button" onClick={() => setQ(s.q)}>{s.name}</button><button type="button" aria-label={`Delete saved query ${s.name}`} onClick={() => setSaved(saved.filter((x) => x !== s))}>×</button></span>)}{!saved.length && <span className="in2-note">None saved</span>}</div>
        <div className="in2-row"><input className="jp-input" style={{ width: 200 }} aria-label="Name for this query" placeholder="Name this query" value={sname} onChange={(e) => setSname(e.target.value)} /><Btn sm disabled={!sname.trim() || !q.trim()} onClick={() => { setSaved([...saved.filter((s) => s.name !== sname.trim()), { name: sname.trim(), q }]); setSname(""); }}>Save current</Btn></div></div>
    </div>
  );
}

/* ---------- permissions matrix ---------- */
const P_ROLES = ["Owner", "Admin", "Editor", "Support", "Viewer"]; const P_ACTIONS = ["view", "create", "edit", "delete"]; const P_RESOURCES = ["Orders", "Customers", "Invoices", "Settings"];
export function PermissionsMatrix() {
  const [role, setRole] = useState("Editor"); const base = useMemo(() => PERM_PRESETS.editor(P_RESOURCES, P_ACTIONS), []); const [perms, setPerms] = useState<Perms>(base); const [saved, setSaved] = useState<Perms>(base);
  const set = (r: string, a: string, v: boolean) => setPerms(normalisePerms({ ...perms, [r]: { ...perms[r], [a]: v } })); const d = permDiff(saved, perms);
  const setRow = (r: string, v: boolean) => setPerms({ ...perms, [r]: Object.fromEntries(P_ACTIONS.map((a) => [a, v])) }); const setCol = (a: string, v: boolean) => setPerms(normalisePerms(Object.fromEntries(P_RESOURCES.map((r) => [r, { ...perms[r], [a]: v }]))));
  return (
    <div className="in2-stack">
      <div className="in2-row"><div style={{ width: 180 }}><Select aria-label="Role" value={role} onChange={setRole} options={P_ROLES.map((r) => ({ value: r, label: r }))} /></div><span className="in2-note">Presets:</span>{(["none", "viewer", "editor", "admin"] as const).map((p) => <button key={p} type="button" className="in2-pill" onClick={() => setPerms(PERM_PRESETS[p](P_RESOURCES, P_ACTIONS))}>{p}</button>)}</div>
      <div style={{ overflowX: "auto" }}><table className="in2-tz" aria-label={`Permissions for ${role}`}><thead><tr><th>Resource</th>{P_ACTIONS.map((a) => <th key={a} style={{ textTransform: "capitalize" }}>{a}<br /><button type="button" className="in2-pill" onClick={() => setCol(a, !P_RESOURCES.every((r) => perms[r][a]))}>all</button></th>)}<th>Row</th></tr></thead>
        <tbody>{P_RESOURCES.map((r) => <tr key={r}><th scope="row">{r}</th>{P_ACTIONS.map((a) => <td key={a}><input type="checkbox" aria-label={`${role} can ${a} ${r}`} checked={!!perms[r][a]} onChange={(e) => set(r, a, e.target.checked)} /></td>)}<td><button type="button" className="in2-pill" onClick={() => setRow(r, !P_ACTIONS.every((a) => perms[r][a]))}>toggle</button></td></tr>)}</tbody></table></div>
      <div className="in2-note">Granting create, edit or delete also grants view.</div>
      <div className="in2-box in2-stack" aria-live="polite"><b>{d.added.length + d.removed.length} unsaved change{d.added.length + d.removed.length === 1 ? "" : "s"}</b>{d.added.map((x) => <span key={x} className="in2-ok">+ {x}</span>)}{d.removed.map((x) => <span key={x} className="in2-bad">− {x}</span>)}<div className="in2-row"><Btn variant="primary" disabled={!d.added.length && !d.removed.length} onClick={() => setSaved(perms)}>Save role</Btn><Btn disabled={!d.added.length && !d.removed.length} onClick={() => setPerms(saved)}>Revert</Btn></div></div>
    </div>
  );
}

/* ---------- drag sort, ranking, question matrix ---------- */
export function SortList({ initial = ["Quality", "Price", "Delivery speed", "Support", "Sustainability"], label = "Rank by importance" }: { initial?: string[]; label?: string }) {
  const [items, setItems] = useState(initial); const [drag, setDrag] = useState<number | null>(null); const [over, setOver] = useState<number | null>(null); const [msg, setMsg] = useState("");
  const mv = (i: number, to: number) => { if (to < 0 || to >= items.length) return; setItems(move(items, i, to)); setMsg(`${items[i]} moved to position ${to + 1} of ${items.length}`); };
  return (
    <div className="in2-stack"><b id="sl-l">{label}</b>
      <ol className="in2-sort" aria-labelledby="sl-l">{items.map((x, i) => <li key={x} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => { e.preventDefault(); setOver(i); }} onDragEnd={() => { setDrag(null); setOver(null); }} onDrop={() => { if (drag !== null) mv(drag, i); setDrag(null); setOver(null); }} className={`${drag === i ? "is-drag" : ""} ${over === i && drag !== null && drag !== i ? "is-over" : ""}`}>
        <span className="in2-note" aria-hidden>⠿</span><b>{i + 1}.</b><span style={{ flex: 1 }}>{x}</span><Btn sm variant="ghost" aria-label={`Move ${x} up`} disabled={i === 0} onClick={() => mv(i, i - 1)}>↑</Btn><Btn sm variant="ghost" aria-label={`Move ${x} down`} disabled={i === items.length - 1} onClick={() => mv(i, i + 1)}>↓</Btn></li>)}</ol>
      <span className="in2-note" aria-live="polite">{msg || "Drag rows, or use the arrow buttons."}</span></div>
  );
}
export function QuestionMatrix() {
  const qs = ["The product is easy to use", "Support responds quickly", "Pricing is fair", "I would recommend it"]; const scale = ["Disagree", "Neutral", "Agree"]; const [ans, setAns] = useState<Record<number, string>>({ 0: "Agree" }); const [shown, setShown] = useState(false); const missing = qs.filter((_, i) => !ans[i]);
  return (
    <form className="in2-stack" noValidate onSubmit={(e) => { e.preventDefault(); setShown(true); }}>
      <div style={{ overflowX: "auto" }}><table className="in2-tz" role="grid" aria-label="Survey matrix"><thead><tr><th>Statement</th>{scale.map((s) => <th key={s}>{s}</th>)}</tr></thead><tbody>{qs.map((q, i) => <tr key={q} className={shown && !ans[i] ? "is-edge" : ""}><th scope="row" id={`qm${i}`}>{q}</th>{scale.map((s) => <td key={s}><input type="radio" name={`qm${i}`} aria-labelledby={`qm${i}`} aria-label={`${q}: ${s}`} checked={ans[i] === s} onChange={() => setAns({ ...ans, [i]: s })} /></td>)}</tr>)}</tbody></table></div>
      {shown && missing.length > 0 && <span role="alert" className="in2-bad">{missing.length} statement{missing.length > 1 ? "s" : ""} still need an answer</span>}{shown && !missing.length && <span role="status" className="in2-ok">Thanks. All answered.</span>}
      <div className="in2-row"><Btn variant="primary" type="submit">Submit</Btn></div></form>
  );
}

/* ---------- per-locale translations ---------- */
const LOCALES = [{ code: "en", name: "English (source)" }, { code: "fr", name: "Français" }, { code: "de", name: "Deutsch" }, { code: "ja", name: "日本語" }];
export function TranslationsEditor() {
  const [m, setM] = useState<Messages>({ "cart.title": { en: "Your cart", fr: "Votre panier", de: "Warenkorb", ja: "" }, "cart.items": { en: "{count} items in your cart", fr: "{count} articles", de: "{n} Artikel", ja: "" }, "checkout.pay": { en: "Pay {amount}", fr: "", de: "", ja: "" }, "empty.title": { en: "Nothing here yet", fr: "Rien ici pour l’instant", de: "", ja: "" } });
  const [loc, setLoc] = useState("fr"); const comp = completeness(m, LOCALES.map((l) => l.code)); const [onlyMissing, setOnly] = useState(false);
  const keys = Object.keys(m).filter((k) => !onlyMissing || !(m[k][loc] ?? "").trim());
  return (
    <div className="in2-stack">
      <div className="in2-row">{LOCALES.slice(1).map((l) => <button key={l.code} type="button" className="in2-pill" aria-pressed={loc === l.code} style={loc === l.code ? { borderColor: "var(--jp-accent)" } : undefined} onClick={() => setLoc(l.code)}>{l.name} <b>{comp[l.code]}%</b></button>)}<Checkbox checked={onlyMissing} onChange={setOnly} label="Only missing" /></div>
      <div className="in2-prog" role="progressbar" aria-label={`${loc} completeness`} aria-valuenow={comp[loc]} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${comp[loc]}%` }} /></div>
      <div className="in2-stack">{keys.map((k) => { const issues = placeholderIssues(m[k].en, m[k][loc] ?? ""); return (
        <div key={k} className="in2-box in2-stack"><code className="in2-mono in2-note">{k}</code><div className="in2-note">{m[k].en}</div>
          <Field label={`${LOCALES.find((l) => l.code === loc)!.name}`} error={issues[0]}>{(id, d) => <TextInput id={id} aria-describedby={d} lang={loc} value={m[k][loc] ?? ""} onChange={(v) => setM({ ...m, [k]: { ...m[k], [loc]: v } })} state={issues.length ? "error" : undefined} />}</Field></div>); })}{!keys.length && <span className="in2-ok">Nothing missing for this language.</span>}</div>
    </div>
  );
}

/* ---------- editable grid as a field + checkbox/radio matrix ---------- */
type Line = { id: string; sku: string; qty: string; price: string };
export function EditableGridField() {
  const [rows, setRows] = useState<Line[]>([{ id: "g1", sku: "JP-100", qty: "2", price: "49.00" }, { id: "g2", sku: "JP-220", qty: "1", price: "120.00" }]); const [shown, setShown] = useState(false);
  const err = (r: Line) => ({ sku: !r.sku.trim() ? "Required" : /^[A-Z]{2}-\d{3}$/.test(r.sku) ? "" : "Format AA-123", qty: /^\d+$/.test(r.qty) && +r.qty > 0 ? "" : "Whole number ≥ 1", price: /^\d+(\.\d{1,2})?$/.test(r.price) ? "" : "Amount like 12.50" });
  const total = rows.reduce((a, r) => a + (Number(r.qty) || 0) * (Number(r.price) || 0), 0); const bad = rows.some((r) => Object.values(err(r)).some(Boolean));
  const upd = (id: string, p: Partial<Line>) => setRows(rows.map((r) => (r.id === id ? { ...r, ...p } : r)));
  return (
    <div className="in2-stack">
      <div style={{ overflowX: "auto" }}><table className="in2-tz" aria-label="Order lines"><thead><tr><th>SKU</th><th>Qty</th><th>Unit price</th><th>Line total</th><th><span className="sr-only">Remove</span></th></tr></thead><tbody>{rows.map((r, i) => { const e = err(r); return (
        <tr key={r.id}>{(["sku", "qty", "price"] as const).map((c) => <td key={c}><input className="jp-input" style={{ width: c === "sku" ? 110 : 90 }} aria-label={`${c} row ${i + 1}`} aria-invalid={(shown && !!e[c]) || undefined} value={r[c]} onChange={(ev) => upd(r.id, { [c]: ev.target.value })} onKeyDown={(ev) => { if (ev.key === "Enter" && i === rows.length - 1 && c === "price") { ev.preventDefault(); setRows([...rows, { id: nid("g"), sku: "", qty: "1", price: "" }]); } }} />{shown && e[c] && <div role="alert" className="in2-bad" style={{ fontSize: "var(--jp-fs-xs)" }}>{e[c]}</div>}</td>)}<td className="in2-mono">{((Number(r.qty) || 0) * (Number(r.price) || 0)).toFixed(2)}</td><td><Btn sm variant="ghost" aria-label={`Remove row ${i + 1}`} onClick={() => setRows(rows.filter((x) => x.id !== r.id))}>×</Btn></td></tr>); })}</tbody><tfoot><tr><th colSpan={3} style={{ textAlign: "end" }}>Total</th><td className="in2-mono"><b>{total.toFixed(2)}</b></td><td /></tr></tfoot></table></div>
      <div className="in2-row"><Btn sm icon="plus" onClick={() => setRows([...rows, { id: nid("g"), sku: "", qty: "1", price: "" }])}>Add line</Btn><Btn variant="primary" onClick={() => setShown(true)}>Validate</Btn>{shown && <span role="status" className={bad ? "in2-bad" : "in2-ok"}>{bad ? "Fix the highlighted cells" : "All lines valid"}</span>}</div>
      <span className="in2-note">Press Enter in the last price cell to add a row.</span>
    </div>
  );
}
export function CheckMatrix() {
  const rows = ["Order shipped", "Invoice due", "Weekly digest"]; const cols = ["Email", "SMS", "Push"]; const [on, setOn] = useState<Record<string, boolean>>({ "0:0": true, "1:0": true, "1:1": true, "2:0": true });
  return <div style={{ overflowX: "auto" }}><table className="in2-tz" aria-label="Notification channels"><thead><tr><th>Notify me when…</th>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={r}><th scope="row">{r}</th>{cols.map((c, j) => <td key={c}><input type="checkbox" aria-label={`${r} by ${c}`} checked={!!on[`${i}:${j}`]} onChange={(e) => setOn({ ...on, [`${i}:${j}`]: e.target.checked })} /></td>)}</tr>)}</tbody></table></div>;
}

/* ---------- rule builder + threshold on chart ---------- */
const RULE_FIELDS = ["severity", "latency_ms", "error_rate", "region", "service"];
export const SAMPLE_EVENT: Record<string, string | number> = { severity: 3, latency_ms: 840, error_rate: 2.4, region: "ap-southeast-2", service: "checkout" };
export function RuleBuilder() {
  const [g, setG] = useState<RuleGroup>({ join: "all", conds: [{ field: "latency_ms", op: ">", value: "500" }, { field: "service", op: "=", value: "checkout" }] }); const [ev, setEv] = useState(SAMPLE_EVENT);
  const upd = (i: number, p: Partial<Cond>) => setG({ ...g, conds: g.conds.map((c, j) => (j === i ? { ...c, ...p } : c)) }); const hit = evalRule(g, ev);
  const numericOp = (c: Cond) => [">", "<", ">=", "<="].includes(c.op); const badCond = (c: Cond) => (numericOp(c) && c.value.trim() !== "" && Number.isNaN(Number(c.value)) ? "Needs a number" : c.value.trim() === "" ? "Required" : "");
  return (
    <div className="in2-grid"><div className="in2-stack">
      <div className="in2-row"><span>Match</span><Segmented label="Join" value={g.join} onChange={(v) => setG({ ...g, join: v })} options={[{ value: "all", label: "all" }, { value: "any", label: "any" }]} /><span>of these conditions</span></div>
      {g.conds.map((c, i) => <div key={i} className="in2-row" role="group" aria-label={`Condition ${i + 1}`}><Select aria-label="Field" value={c.field} onChange={(v) => upd(i, { field: v })} options={RULE_FIELDS.map((f) => ({ value: f, label: f }))} /><Select aria-label="Operator" value={c.op} onChange={(v) => upd(i, { op: v as Cond["op"] })} options={[">", "<", ">=", "<=", "=", "!=", "contains"].map((o) => ({ value: o, label: o }))} /><input className="jp-input" style={{ width: 120 }} aria-label="Value" aria-invalid={!!badCond(c) || undefined} value={c.value} onChange={(e) => upd(i, { value: e.target.value })} /><Btn sm variant="ghost" aria-label={`Remove condition ${i + 1}`} onClick={() => setG({ ...g, conds: g.conds.filter((_, j) => j !== i) })}>×</Btn>{badCond(c) && <span role="alert" className="in2-bad">{badCond(c)}</span>}</div>)}
      <div className="in2-row"><Btn sm icon="plus" onClick={() => setG({ ...g, conds: [...g.conds, { field: "severity", op: ">=", value: "3" }] })}>Add condition</Btn></div>
      <div className="in2-box"><b>Rule</b>: <span className="in2-mono">{describeRule(g)}</span></div></div>
      <div className="in2-stack"><b>Test it against an event</b>{RULE_FIELDS.map((f) => <div key={f} className="in2-row"><label style={{ width: 100 }} htmlFor={`ev-${f}`} className="in2-mono">{f}</label><input id={`ev-${f}`} className="jp-input" style={{ width: 160 }} value={String(ev[f])} onChange={(e) => setEv({ ...ev, [f]: e.target.value })} /></div>)}
        <div role="status" aria-live="polite" className={hit ? "in2-ok" : "in2-bad"}><b>{hit ? "Rule would fire" : "Rule would not fire"}</b></div></div></div>
  );
}
export function ThresholdChart({ data: d0 }: { data?: number[] }) {
  const data = useMemo(() => d0 ?? Array.from({ length: 48 }, (_, i) => Math.round(55 + 22 * Math.sin(i / 5) + 14 * Math.sin(i / 1.7) + (i > 30 && i < 38 ? 18 : 0))), [d0]);
  const [limit, setLimit] = useState(78); const [forPts, setFor] = useState(2); const [below, setBelow] = useState(false); const W = 560, H = 200, lo = 0, hi = 110; const y = (v: number) => H - ((v - lo) / (hi - lo)) * H; const x = (i: number) => (i / (data.length - 1)) * W;
  const bs = breaches(data, limit, forPts, below); const setFromEvent = (e: React.PointerEvent<SVGSVGElement>) => { const r = e.currentTarget.getBoundingClientRect(); const v = hi - ((e.clientY - r.top) / r.height) * (hi - lo); setLimit(Math.round(Math.min(hi, Math.max(lo, v)))); };
  return (
    <div className="in2-stack">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Series with a threshold at ${limit}. ${bs.length} breaches.`} style={{ width: "100%", maxWidth: W, touchAction: "none", cursor: "ns-resize" }} onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); setFromEvent(e); }} onPointerMove={(e) => e.buttons === 1 && setFromEvent(e)}>
        {bs.map((b, i) => <rect key={i} x={x(b.start)} width={Math.max(4, x(b.end) - x(b.start))} y={0} height={H} fill="var(--adm-c7, var(--jp-danger))" opacity={0.18} />)}
        <polyline fill="none" stroke="var(--jp-accent)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" points={data.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
        <line x1={0} x2={W} y1={y(limit)} y2={y(limit)} stroke="var(--jp-danger)" strokeWidth={1} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
        <circle cx={W - 8} cy={y(limit)} r={6} fill="var(--jp-danger)" /></svg>
      <div className="in2-row"><div style={{ width: 120 }}><Field label="Threshold">{(id) => <input id={id} type="number" className="jp-input" value={limit} onChange={(e) => setLimit(Number(e.target.value))} />}</Field></div><div style={{ width: 120 }}><Field label="For N points">{(id) => <input id={id} type="number" min={1} className="jp-input" value={forPts} onChange={(e) => setFor(Math.max(1, Number(e.target.value)))} />}</Field></div><Checkbox checked={below} onChange={setBelow} label="Alert when below" /></div>
      <div role="status" aria-live="polite" className={bs.length ? "in2-bad" : "in2-ok"}>{bs.length ? `${bs.length} alert${bs.length > 1 ? "s" : ""} would have fired (${bs.map((b) => `${b.start}–${b.end}`).join(", ")})` : "No breaches in this window"}</div>
      <span className="in2-note">Click or drag on the chart to set the line; the shaded bands show when the rule would have fired.</span>
    </div>
  );
}

/* ---------- column mapping + option-list editor ---------- */
export const IMPORT_TARGETS: TargetField[] = [{ key: "name", label: "Full name", required: true, aliases: ["customer", "contact"] }, { key: "email", label: "Email", required: true, validate: (v) => (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? null : "Invalid email") }, { key: "phone", label: "Phone", aliases: ["mobile", "tel"] }, { key: "plan", label: "Plan" }];
export const SAMPLE_CSV = `Customer,E-mail address,Mobile,Tier,Notes\nAva Nguyen,ava@example.com,0412 345 678,Pro,vip\nBen Okafor,ben.example.com,0422 111 222,Team,\nCara Lind,cara@example.com,,Free,new`;
export function ColumnMapper() {
  const [csv, setCsv] = useState(SAMPLE_CSV); const rows = useMemo(() => parseCsv(csv).filter((r) => r.some((c) => c.trim())), [csv]); const head = rows[0] ?? []; const body = rows.slice(1);
  const [map, setMap] = useState<Record<string, string | null>>(() => suggestMapping(parseCsv(SAMPLE_CSV)[0], IMPORT_TARGETS)); const [done, setDone] = useState<string | null>(null);
  const colOf = (key: string) => head.findIndex((h) => map[h] === key); const missing = IMPORT_TARGETS.filter((t) => t.required && colOf(t.key) < 0);
  const cellErr = (t: TargetField, r: string[]) => { const i = colOf(t.key); if (i < 0) return null; const v = (r[i] ?? "").trim(); if (t.required && !v) return "Required"; return v && t.validate ? t.validate(v) : null; };
  const errors = body.flatMap((r, ri) => IMPORT_TARGETS.map((t) => ({ ri, t, e: cellErr(t, r) })).filter((x) => x.e)); const ok = body.filter((_, ri) => !errors.some((e) => e.ri === ri)).length;
  return (
    <div className="in2-stack">
      <Field label="Paste CSV (first row is the header)">{(id) => <TextArea id={id} className="in2-mono" rows={5} value={csv} onChange={(v) => { setCsv(v); const h = parseCsv(v)[0] ?? []; setMap(suggestMapping(h, IMPORT_TARGETS)); setDone(null); }} />}</Field>
      <div className="in2-stack"><b>Map columns</b>{head.map((h) => <div key={h} className="in2-row"><span className="in2-mono" style={{ width: 170 }}>{h}</span><span aria-hidden>→</span><div style={{ width: 200 }}><Select aria-label={`Map column ${h}`} value={map[h] ?? ""} onChange={(v) => setMap({ ...map, [h]: v || null })} options={[{ value: "", label: "Don’t import" }, ...IMPORT_TARGETS.map((t) => ({ value: t.key, label: t.label + (t.required ? " *" : "") }))]} /></div>{map[h] && <Badge s="ok">mapped</Badge>}</div>)}</div>
      {missing.length > 0 && <span role="alert" className="in2-bad">Required field not mapped: {missing.map((m) => m.label).join(", ")}</span>}
      <div style={{ overflowX: "auto" }}><table className="in2-tz" aria-label="Import preview"><thead><tr>{IMPORT_TARGETS.map((t) => <th key={t.key}>{t.label}</th>)}</tr></thead><tbody>{body.map((r, ri) => <tr key={ri}>{IMPORT_TARGETS.map((t) => { const e = cellErr(t, r); const i = colOf(t.key); return <td key={t.key} className={e ? "in2-bad" : ""} title={e ?? undefined}>{i < 0 ? <span className="in2-note">–</span> : (r[i] ?? "") || <span className="in2-note">empty</span>}{e && <div style={{ fontSize: "var(--jp-fs-xs)" }}>{e}</div>}</td>; })}</tr>)}</tbody></table></div>
      <div className="in2-row" aria-live="polite"><span className="in2-note">{ok} of {body.length} rows ready, {errors.length} problem{errors.length === 1 ? "" : "s"}</span><Btn variant="primary" disabled={missing.length > 0 || ok === 0} onClick={() => setDone(`Imported ${ok} row${ok === 1 ? "" : "s"}; ${body.length - ok} skipped`)}>Import valid rows</Btn></div>{done && <Alert s="ok" title="Done">{done}</Alert>}
    </div>
  );
}
type Opt = { id: string; value: string; label: string; color: string };
export function OptionListEditor() {
  const [opts, setOpts] = useState<Opt[]>([{ id: "o1", value: "open", label: "Open", color: "1" }, { id: "o2", value: "doing", label: "In progress", color: "2" }, { id: "o3", value: "done", label: "Done", color: "3" }]);
  const dup = (o: Opt) => opts.filter((x) => x.value.trim() && x.value.trim().toLowerCase() === o.value.trim().toLowerCase()).length > 1; const upd = (id: string, p: Partial<Opt>) => setOpts(opts.map((o) => (o.id === id ? { ...o, ...p } : o))); const bad = opts.some((o) => !o.label.trim() || !o.value.trim() || dup(o));
  return (
    <div className="in2-stack">{opts.map((o, i) => <div key={o.id} className="in2-row" role="group" aria-label={`Option ${i + 1}`}><span className="in2-swatch" style={{ background: `var(--adm-c${o.color})` }} aria-hidden /><input className="jp-input" style={{ width: 150 }} aria-label={`Label ${i + 1}`} aria-invalid={!o.label.trim() || undefined} value={o.label} onChange={(e) => upd(o.id, { label: e.target.value, value: o.value === o.label.toLowerCase().replace(/\W+/g, "-") || !o.value ? e.target.value.toLowerCase().replace(/\W+/g, "-") : o.value })} /><input className="jp-input in2-mono" style={{ width: 130 }} aria-label={`Value ${i + 1}`} aria-invalid={dup(o) || undefined} value={o.value} onChange={(e) => upd(o.id, { value: e.target.value })} /><Select aria-label={`Colour ${i + 1}`} value={o.color} onChange={(v) => upd(o.id, { color: v })} options={[1, 2, 3, 4, 5, 6, 7, 8].map((c) => ({ value: String(c), label: `Colour ${c}` }))} /><Btn sm variant="ghost" aria-label={`Move option ${i + 1} up`} disabled={i === 0} onClick={() => setOpts(move(opts, i, i - 1))}>↑</Btn><Btn sm variant="ghost" aria-label={`Move option ${i + 1} down`} disabled={i === opts.length - 1} onClick={() => setOpts(move(opts, i, i + 1))}>↓</Btn><Btn sm variant="ghost" aria-label={`Delete option ${i + 1}`} onClick={() => setOpts(opts.filter((x) => x.id !== o.id))}>×</Btn>{dup(o) && <span role="alert" className="in2-bad">Duplicate value</span>}</div>)}
      <div className="in2-row"><Btn sm icon="plus" onClick={() => setOpts([...opts, { id: nid("o"), value: "", label: "", color: String((opts.length % 8) + 1) }])}>Add option</Btn></div>
      <div className="in2-box in2-stack"><b>Preview</b><div className="in2-row">{opts.filter((o) => o.label).map((o) => <span key={o.id} className="in2-pill"><span className="in2-swatch" style={{ background: `var(--adm-c${o.color})` }} aria-hidden />{o.label}</span>)}</div><Select aria-label="Preview select" value={opts[0]?.value ?? ""} onChange={() => {}} options={opts.filter((o) => o.value && o.label).map((o) => ({ value: o.value, label: o.label }))} /></div>
      {bad && <span role="alert" className="in2-bad">Every option needs a label and a unique value.</span>}
    </div>
  );
}
void Icon;
