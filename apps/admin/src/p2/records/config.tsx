import { useMemo, useState } from "react";
import "./records.css";
import { PageHeader, Panel, Btn, Badge, Alert, Tabs, Modal, EmptyState, Dot, ConfirmDelete, Avatar } from "@belikh/jupiter-ui/kit.tsx";
import { Field, TextInput, TextArea, Select, Switch } from "@belikh/jupiter-ui/inputs.tsx";
import { DiffViewer, Markdown } from "@belikh/jupiter-ui/extra.tsx";
import { DataTable, type Col } from "@belikh/jupiter-ui/DataTable.tsx";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { people } from "../../data/fixtures.ts";
import { apply, diffConfig, newStore, parseText, rollback, stage, toText } from "./logic.ts";
import { diffJson, envGaps, looksSecret, redactJson, rotationState, type EnvVars } from "./lifecycle.logic.ts";
import { escapeHtml, renderTemplate, variablesIn } from "./logic.ts";
import { makeKey } from "./platform.logic.ts";

/* ---------- A075 config editor ---------- */
const LIVE = { "app.name": "jupiter", "app.port": "8080", "cache.ttl": "300", "db.pool": "10", "feature.beta": "false", "log.level": "info" };
export function ConfigEditor() {
  const { toast } = usePrefs(); const [store, setStore] = useState(() => newStore(LIVE, "system")); const [text, setText] = useState(() => toText(LIVE)); const [note, setNote] = useState(""); const [tab, setTab] = useState("edit"); const [conf, setConf] = useState(false); const [rb, setRb] = useState<number | null>(null); const [clock, setClock] = useState(2);
  const parsed = useMemo(() => parseText(text), [text]); const changes = diffConfig(store.live, parsed.cfg);
  const stageNow = () => { if (parsed.errors.length) { toast({ kind: "danger", title: "Fix the errors first" }); return false; } setStore((s) => stage(s, parsed.cfg)); return true; };
  const doApply = () => { setStore((s) => apply(stage(s, parsed.cfg), "Ava Nguyen", `2026-11-12 ${String(9 + clock).padStart(2, "0")}:00`, note)); setClock(clock + 1); setNote(""); setConf(false); toast({ kind: "ok", title: "Applied", body: `${changes.length} change${changes.length === 1 ? "" : "s"} are live` }); };
  const doRollback = () => { if (rb === null) return; const r = rollback(store, rb, "Ava Nguyen", `2026-11-12 ${String(9 + clock).padStart(2, "0")}:00`); setStore(r); setText(toText(r.live)); setClock(clock + 1); setRb(null); toast({ kind: "warn", title: `Rolled back to r${rb}` }); };
  return (
    <>
      <PageHeader title="Config editor" crumbs={["Records", "Config"]} desc="Edit KEY=value config in a staging area, review the diff, apply with a note, and roll back to any revision (history is append-only)." status={changes.length ? <Badge s="warn">{changes.length} staged change{changes.length === 1 ? "" : "s"}</Badge> : <Badge s="ok">in sync with live</Badge>}
        actions={<><Btn disabled={!changes.length} onClick={() => setText(toText(store.live))}>Discard changes</Btn><Btn variant="primary" disabled={!changes.length || parsed.errors.length > 0} onClick={() => { setTab("review"); setConf(true); }}>Review and apply</Btn></>}
        tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: "edit", label: "Edit" }, { id: "review", label: "Diff", count: changes.length }, { id: "history", label: "History", count: store.history.length }]} />} />
      {tab === "edit" && <div className="adm-grid adm-grid--21"><Panel title="Staged config (KEY=value, # for comments)"><TextArea value={text} onChange={setText} rows={12} aria-label="Config" />{parsed.errors.length > 0 && <div className="adm-stack" style={{ marginTop: 8 }}>{parsed.errors.map((e) => <span key={e.line} className="adm-err" role="alert">Line {e.line}: {e.msg}</span>)}</div>}</Panel>
        <Panel title="Live config" flush><table className="jp-table"><tbody>{Object.entries(store.live).map(([k, v]) => <tr key={k}><td className="adm-num">{k}</td><td className="adm-num" style={{ color: parsed.cfg[k] !== v ? "var(--jp-warn)" : undefined }}>{v}</td></tr>)}</tbody></table></Panel></div>}
      {tab === "review" && (changes.length ? <div className="adm-stack"><Panel title="Changes" flush><table className="jp-table"><thead><tr><th>Key</th><th>Change</th><th>Before</th><th>After</th></tr></thead><tbody>{changes.map((c) => <tr key={c.key}><td className="adm-num">{c.key}</td><td><Badge s={c.kind === "add" ? "ok" : c.kind === "remove" ? "danger" : "warn"}>{c.kind}</Badge></td><td className="adm-num">{c.from ?? "—"}</td><td className="adm-num">{c.to ?? "—"}</td></tr>)}</tbody></table></Panel><DiffViewer before={toText(store.live)} after={toText(parsed.cfg)} labels={["live", "staged"]} /></div> : <EmptyState spot="done" title="Nothing to apply">The staged config matches live.</EmptyState>)}
      {tab === "history" && <Panel title="Revisions" flush><ul className="adm-list">{store.history.map((h, i) => <li key={h.id}><span className="adm-num" style={{ width: 36 }}>r{h.id}</span><div className="adm-list__main"><b>{h.note}</b><span className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>{h.at} · {h.by}</span></div>{i === 0 ? <Badge s="ok">live</Badge> : <Btn sm onClick={() => setRb(h.id)}>Roll back to this</Btn>}</li>)}</ul></Panel>}
      <Modal open={conf && changes.length > 0} onClose={() => setConf(false)} title={`Apply ${changes.length} change${changes.length === 1 ? "" : "s"}?`} footer={<><Btn onClick={() => setConf(false)}>Cancel</Btn><Btn variant="primary" onClick={doApply}>Apply to live</Btn></>}><div className="adm-stack"><ul>{changes.map((c) => <li key={c.key}><code>{c.key}</code>: {c.kind === "add" ? `add ${c.to}` : c.kind === "remove" ? "remove" : `${c.from} → ${c.to}`}</li>)}</ul><Field label="Change note">{(id) => <TextInput id={id} value={note} onChange={setNote} placeholder="Why are you changing this?" />}</Field></div></Modal>
      <ConfirmDelete open={rb !== null} what="rollback" onClose={() => setRb(null)} onConfirm={doRollback} />
    </>
  );
}

/* ---------- A076 environment and secrets ---------- */
const ENV0: EnvVars = { dev: { API_URL: "https://dev.api.jupiter.au", DB_PASSWORD: "dev-pass-1", LOG_LEVEL: "debug", FEATURE_X: "on" }, staging: { API_URL: "https://stg.api.jupiter.au", DB_PASSWORD: "stg-pass-9", LOG_LEVEL: "info" }, prod: { API_URL: "https://api.jupiter.au", DB_PASSWORD: "prod-pass-7", LOG_LEVEL: "warn", SENTRY_DSN: "https://x@sentry.io/1" } };
type SecretMeta = Record<string, { age: number; by: string }>;
export function Secrets() {
  const { toast } = usePrefs(); const [env, setEnv] = useState<EnvVars>(ENV0); const [cur, setCur] = useState("staging"); const [reveal, setReveal] = useState<Set<string>>(new Set()); const [k, setK] = useState(""); const [v, setV] = useState(""); const [meta, setMeta] = useState<SecretMeta>({ "staging:DB_PASSWORD": { age: 88, by: "Ava" }, "prod:DB_PASSWORD": { age: 41, by: "Noah" }, "dev:DB_PASSWORD": { age: 12, by: "Ava" } }); const [tab, setTab] = useState("vars"); const [del, setDel] = useState<string | null>(null);
  const gaps = envGaps(env); const rows = Object.entries(env[cur]).map(([key, value]) => ({ id: key, key, value, secret: looksSecret(key) }));
  const kErr = k && !/^[A-Z][A-Z0-9_]*$/.test(k) ? "Use UPPER_SNAKE_CASE" : k && k in env[cur] ? "Already defined here" : undefined;
  const cols: Col<(typeof rows)[number]>[] = [{ key: "key", header: "Key", width: 200, render: (r) => <span className="adm-num"><Icon name={r.secret ? "lock" : "code"} size={13} /> {r.key}</span> }, { key: "value", header: "Value", width: 320, sortable: false, render: (r) => <span className="adm-num">{r.secret && !reveal.has(`${cur}:${r.key}`) ? "••••••••••" : r.value}</span> }, { key: "age", header: "Rotation", width: 150, sortable: false, render: (r) => { const m = meta[`${cur}:${r.key}`]; if (!m) return <span className="jp-muted">—</span>; const s = rotationState(m.age, 90); return <Badge s={s === "ok" ? "ok" : s === "due soon" ? "warn" : "danger"}>{m.age}d · {s}</Badge>; } }, { key: "act", header: "", width: 220, sortable: false, render: (r) => <span className="adm-row">{r.secret && <Btn sm variant="ghost" onClick={() => setReveal((s) => { const n = new Set(s); const id = `${cur}:${r.key}`; n.has(id) ? n.delete(id) : n.add(id); return n; })}>{reveal.has(`${cur}:${r.key}`) ? "Hide" : "Reveal"}</Btn>}{r.secret && <Btn sm variant="ghost" onClick={() => { setEnv((e) => ({ ...e, [cur]: { ...e[cur], [r.key]: `rotated-${makeKey(r.key.length + 3).slice(8, 18)}` } })); setMeta((m) => ({ ...m, [`${cur}:${r.key}`]: { age: 0, by: "Ava" } })); toast({ kind: "warn", title: `${r.key} rotated in ${cur}`, body: "Restart dependent services." }); }}>Rotate</Btn>}<Btn sm variant="ghost" className="adm-danger-text" onClick={() => setDel(r.key)}>Delete</Btn></span> }];
  return (
    <>
      <PageHeader title="Environment and secrets" crumbs={["Records", "Secrets"]} desc="Per-environment variables with masked secrets, rotation age, and a cross-environment gap report." tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: "vars", label: "Variables" }, { id: "gaps", label: "Environment gaps", count: gaps.filter((g) => g.missing.length).length }]} />} actions={<div style={{ width: 160 }}><Select value={cur} onChange={setCur} aria-label="Environment" options={Object.keys(env)} /></div>} />
      {tab === "vars" && <div className="adm-stack"><Panel title={`Variables in ${cur}`} flush><DataTable rows={rows} cols={cols} selectable={false} pageSize={10} exportName={`env-${cur}`} /></Panel>
        <Panel title="Add a variable"><div className="adm-grid adm-grid--2"><Field label="Key" error={kErr} hint={k && looksSecret(k) ? "Looks sensitive: it will be masked" : undefined}>{(id) => <TextInput id={id} value={k} onChange={(x) => setK(x.toUpperCase())} state={kErr ? "error" : undefined} />}</Field><Field label="Value">{(id) => <TextInput id={id} value={v} onChange={setV} type={looksSecret(k) ? "password" : "text"} autoComplete="off" />}</Field></div><Btn variant="primary" disabled={!k || !!kErr || !v} onClick={() => { setEnv((e) => ({ ...e, [cur]: { ...e[cur], [k]: v } })); if (looksSecret(k)) setMeta((m) => ({ ...m, [`${cur}:${k}`]: { age: 0, by: "Ava" } })); setK(""); setV(""); toast({ kind: "ok", title: "Variable added" }); }}>Add</Btn></Panel></div>}
      {tab === "gaps" && <Panel title="Same key, every environment" flush><div className="adm-dt__wrap"><table className="jp-table adm-table"><thead><tr><th>Key</th>{Object.keys(env).map((n) => <th key={n}>{n}</th>)}<th>Status</th></tr></thead><tbody>{gaps.map((g) => <tr key={g.key} className={g.missing.length ? "sev-warn" : ""}><td className="adm-num">{g.key}</td>{Object.keys(env).map((n) => <td key={n}>{g.key in env[n] ? <Dot s="ok" /> : <span className="adm-err">missing</span>}</td>)}<td>{g.missing.length ? <Badge s="warn">missing in {g.missing.join(", ")}</Badge> : g.differs ? <Badge>differs by env</Badge> : <Badge s="ok">identical</Badge>}</td></tr>)}</tbody></table></div></Panel>}
      <ConfirmDelete open={!!del} what={del ?? ""} onClose={() => setDel(null)} onConfirm={() => { const old = env; setEnv((e) => { const n = { ...e[cur] }; delete n[del!]; return { ...e, [cur]: n }; }); setDel(null); toast({ kind: "warn", title: "Variable deleted", undo: () => setEnv(old) }); }} />
    </>
  );
}

/* ---------- A077 template editor ---------- */
const TPL0 = "Hi {{name}},\n\nYour invoice {{invoice.number}} for {{amount}} is due on {{due}}.\n\nPay online: {{link}}\n\nThanks,\n{{company}}";
export function TemplateEditor() {
  const { toast } = usePrefs(); const [subject, setSubject] = useState("Invoice {{invoice.number}} from {{company}}"); const [body, setBody] = useState(TPL0); const [vars, setVars] = useState<Record<string, string>>({ name: "Ava Nguyen", "invoice.number": "INV-0042", amount: "$3,091.55", due: "26 Nov 2026", link: "https://pay.example.com/42", company: "Jupiter <Systems>" }); const [mode, setMode] = useState("preview");
  const used = useMemo(() => [...new Set([...variablesIn(subject), ...variablesIn(body)])], [subject, body]); const rs = renderTemplate(subject, vars, false); const rb = renderTemplate(body, vars); const missing = [...new Set([...rs.missing, ...rb.missing])];
  const insert = (name: string) => setBody((b) => `${b}{{${name}}}`);
  const bodyHtml = rb.out.split("\n").map((l) => l || "<br>").join("<br>");
  return (
    <>
      <PageHeader title="Template editor" crumbs={["Records", "Templates"]} desc="Write a message with {{variables}}, fill sample values, and see a live preview. Values are HTML-escaped; unfilled variables are flagged." actions={<><Btn onClick={() => { void navigator.clipboard?.writeText(`${rs.out}\n\n${renderTemplate(body, vars, false).out}`); toast({ kind: "ok", title: "Rendered text copied" }); }}>Copy rendered</Btn><Btn variant="primary" disabled={missing.length > 0} onClick={() => toast({ kind: "ok", title: "Template saved" })}>Save template</Btn></>} />
      {missing.length > 0 && <div style={{ marginBottom: 12 }}><Alert s="warn" title={`${missing.length} variable${missing.length === 1 ? " has" : "s have"} no sample value`}>{missing.map((m) => <code key={m} style={{ marginInlineEnd: 6 }}>{`{{${m}}}`}</code>)}</Alert></div>}
      <div className="adm-grid adm-grid--2"><div className="adm-stack"><Panel title="Template"><div className="adm-stack"><Field label="Subject">{(id) => <TextInput id={id} value={subject} onChange={setSubject} />}</Field><Field label="Body">{(id) => <TextArea id={id} value={body} onChange={setBody} rows={9} />}</Field><div><div className="jp-label">Insert variable</div><div className="adm-row">{Object.keys(vars).map((n) => <button key={n} className="adm-pill" onClick={() => insert(n)}>{n}</button>)}</div></div></div></Panel>
        <Panel title="Sample values"><div className="adm-stack">{used.map((n) => <Field key={n} label={n} warn={!vars[n] ? "No value yet" : undefined}>{(id) => <TextInput id={id} value={vars[n] ?? ""} onChange={(x) => setVars({ ...vars, [n]: x })} />}</Field>)}{!used.length && <span className="jp-muted">No variables in use.</span>}</div></Panel></div>
        <Panel title="Preview" actions={<div className="adm-row"><Btn sm variant={mode === "preview" ? "primary" : "secondary"} onClick={() => setMode("preview")}>Email</Btn><Btn sm variant={mode === "source" ? "primary" : "secondary"} onClick={() => setMode("source")}>HTML source</Btn></div>}>
          {mode === "preview" ? <div className="rec-mail"><div className="rec-mail__head"><b>{rs.out}</b><span className="jp-muted">from {escapeHtml("billing@example.com")}</span></div><div className="rec-mail__body" dangerouslySetInnerHTML={{ __html: bodyHtml }} /></div> : <pre className="adm-pre jp-code" style={{ padding: 12, whiteSpace: "pre-wrap" }}>{bodyHtml}</pre>}<p className="jp-muted" style={{ marginTop: 8 }}><Markdown src={"Variables use `{{name}}` or dotted paths like `{{invoice.number}}`."} /></p></Panel></div>
    </>
  );
}

/* ---------- A081 audit event detail ---------- */
type Ev = { id: string; at: string; actor: string; action: string; target: string; ip: string; before: unknown; after: unknown };
const EVENTS: Ev[] = [
  { id: "evt_1041", at: "2026-11-12 16:02", actor: people[0], action: "role.updated", target: "user:noah.smith", ip: "10.1.1.124", before: { role: "viewer", teams: ["ops"], mfa: false }, after: { role: "editor", teams: ["ops", "design"], mfa: false } },
  { id: "evt_1040", at: "2026-11-12 15:40", actor: "System", action: "key.rotated", target: "api-key:ci-pipeline", ip: "-", before: { apiKey: "jp_live_old123", scopes: ["orders:read"], createdAt: "2026-09-02" }, after: { apiKey: "jp_live_new456", scopes: ["orders:read"], createdAt: "2026-11-12" } },
  { id: "evt_1039", at: "2026-11-12 11:12", actor: people[2], action: "config.applied", target: "config:prod", ip: "10.1.1.50", before: { "cache.ttl": "300", "db.pool": 10 }, after: { "cache.ttl": "600", "db.pool": 20, "log.level": "warn" } },
  { id: "evt_1038", at: "2026-11-11 20:31", actor: people[1], action: "signin.failed", target: "user:ava.nguyen", ip: "198.51.100.7", before: null, after: { reason: "bad_password", attempts: 3 } },
  { id: "evt_1037", at: "2026-11-11 09:15", actor: people[0], action: "customer.deleted", target: "customer:C-1180", ip: "10.1.1.124", before: { name: "Test Co", email: "x@test.co", card: "4242424242424242" }, after: null },
];
export function AuditDetail() {
  const [sel, setSel] = useState(EVENTS[0].id); const [q, setQ] = useState(""); const [raw, setRaw] = useState(false); const e = EVENTS.find((x) => x.id === sel)!; const changes = diffJson(e.before ?? {}, e.after ?? {});
  const list = EVENTS.filter((x) => `${x.actor} ${x.action} ${x.target}`.toLowerCase().includes(q.toLowerCase()));
  const j = (v: unknown) => JSON.stringify(raw ? v : redactJson(v), null, 2) ?? "null";
  return (
    <>
      <PageHeader title="Audit log" crumbs={["Records", "Audit"]} desc="Who did what, to what, from where, with a precise before/after diff. Sensitive values are redacted unless you choose to view raw." actions={<Switch checked={raw} onChange={setRaw} label="Show sensitive values" />} />
      <div className="adm-grid adm-grid--12">
        <Panel title="Events" flush><div style={{ padding: 8 }}><TextInput value={q} onChange={setQ} placeholder="Filter by actor, action or target" aria-label="Filter events" prefix={<Icon name="search" size={14} />} /></div><ul className="adm-list" role="listbox" aria-label="Audit events">{list.map((x) => <li key={x.id} role="option" aria-selected={sel === x.id} tabIndex={0} className={sel === x.id ? "is-sel" : ""} style={{ cursor: "pointer" }} onClick={() => setSel(x.id)} onKeyDown={(k) => k.key === "Enter" && setSel(x.id)}><div className="adm-list__main"><b className="adm-num">{x.action}</b><span className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>{x.actor} · {x.at}</span></div></li>)}{!list.length && <li className="jp-muted">No events match.</li>}</ul></Panel>
        <div className="adm-stack"><Panel title={e.action}><dl className="adm-dl"><dt>Event</dt><dd className="adm-num">{e.id}</dd><dt>When</dt><dd>{e.at}</dd><dt>Actor</dt><dd className="adm-row"><Avatar name={e.actor} size={22} />{e.actor}</dd><dt>Target</dt><dd className="adm-num">{e.target}</dd><dt>IP</dt><dd className="adm-num">{e.ip}</dd></dl></Panel>
          <Panel title={`What changed (${changes.length})`} flush>{changes.length ? <table className="jp-table"><thead><tr><th>Path</th><th>Change</th><th>Before</th><th>After</th></tr></thead><tbody>{changes.map((c) => <tr key={c.path}><td className="adm-num">{c.path || "(value)"}</td><td><Badge s={c.kind === "add" ? "ok" : c.kind === "remove" ? "danger" : "warn"}>{c.kind}</Badge></td><td className="adm-num">{c.from === undefined ? "—" : JSON.stringify(raw ? c.from : looksSecret(c.path) ? "••••••" : c.from)}</td><td className="adm-num">{c.to === undefined ? "—" : JSON.stringify(raw ? c.to : looksSecret(c.path) ? "••••••" : c.to)}</td></tr>)}</tbody></table> : <EmptyState spot="empty" title="No field changes" />}</Panel>
          <DiffViewer mode="split" before={j(e.before)} after={j(e.after)} labels={["before", "after"]} /></div></div>
    </>
  );
}
