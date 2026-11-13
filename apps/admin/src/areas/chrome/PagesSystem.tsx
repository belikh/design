import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { generateEmailHTML, DEFAULT_TOKENS } from "@belikh/jupiter-tokens";
import "./chrome.css";
import { Alert, Badge, Btn, ConfirmDelete, Modal, PageHeader, Panel, Dot } from "@belikh/jupiter-ui/kit.tsx";
import { DiffViewer } from "@belikh/jupiter-ui/extra.tsx";
import { Combobox, Field, Segmented, Select, Switch, TextArea, TextInput, Radio } from "@belikh/jupiter-ui/inputs.tsx";
import { LineChart } from "@belikh/jupiter-ui/Charts.tsx";
import { exportPng } from "@belikh/jupiter-ui/chartTools.tsx";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";
import { orders, money, days, series } from "../../data/fixtures.ts";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { audit, cancelTask, clearFinished, envOf, retryTask, startTask, system, useCan, useSystem, workspaceOf, WORKSPACES } from "./system.ts";
import { Can } from "./guided.tsx";
import { PdfEmbed } from "./media.tsx";
import { can, commit, history, merge3, PERMS, redo, ROLE_MATRIX, undo, type Rec, type Role } from "./engine.ts";
import { useShortcut } from "./shortcuts.ts";

/* ===== E016: environment, banners, impersonation, consent ===== */
export function BannersPage() {
  const s = useSystem(); const [msg, setMsg] = useState(s.maintenance.message); const [who, setWho] = useState("Noah Smith"); const write = useCan("orders.edit"); const { toast } = usePrefs();
  return (
    <>
      <PageHeader title="Environment and banners" crumbs={["System", "Banners"]} desc="These switches change real app state: watch the top of the page, the sidebar brand, the status bar and the workspace menu." status={<Badge s={envOf(s) === "production" ? "danger" : envOf(s) === "staging" ? "warn" : "info"}>{envOf(s)}</Badge>} />
      <div className="adm-grid adm-grid--2">
        <Panel title="Workspace and environment"><div className="adm-stack">
          <Segmented label="Workspace" value={s.workspace} onChange={system.setWorkspace} options={WORKSPACES.map((w) => ({ value: w.id, label: `${w.name} · ${w.env}` }))} />
          <p className="jp-muted">The environment badge is always visible in the top bar. Production also tags the brand “PROD” and asks for extra confirmation on destructive actions (see Access).</p></div></Panel>
        <Panel title="Maintenance banner"><div className="adm-stack"><Field label="Message">{(id) => <TextArea id={id} value={msg} onChange={setMsg} rows={2} />}</Field><div className="adm-row"><Btn variant="primary" onClick={() => system.setMaintenance(true, msg)}>Announce</Btn><Btn onClick={() => system.setMaintenance(false)} disabled={!s.maintenance.on}>Clear</Btn>{s.maintenance.on && <Badge s="warn">showing</Badge>}</div></div></Panel>
        <Panel title="Read-only mode"><div className="adm-stack"><Switch checked={s.readOnly} onChange={system.setReadOnly} label="Read-only mode" /><p className="jp-muted">Controls wrapped in <code>data-write</code> or <code>&lt;Can&gt;</code> become inert. Try the buttons below.</p>
          <div className="adm-row"><span data-write><Btn variant="primary" onClick={() => toast({ kind: "ok", title: "Saved" })}>Save (data-write)</Btn></span><Can perm="orders.edit"><Btn onClick={() => toast({ kind: "ok", title: "Edited" })}>Edit order</Btn></Can>{!write.allowed && <Badge>{write.reason}</Badge>}</div></div></Panel>
        <Panel title="Impersonation"><div className="adm-stack"><Field label="View the app as">{(id) => <Select id={id} value={who} onChange={setWho} options={["Noah Smith", "Mia Patel", "Liam Williams"]} />}</Field><div className="adm-row"><Btn variant="primary" onClick={() => system.impersonate(who)} disabled={!!s.impersonating}>Start impersonating</Btn><Btn onClick={() => system.impersonate(null)} disabled={!s.impersonating}>Stop</Btn></div><p className="jp-muted">While active, a red banner shows everywhere and audit entries are written under the impersonated name.</p></div></Panel>
        <Panel title="Connection"><div className="adm-stack"><Segmented label="Connection" value={s.connection} onChange={system.setConnection} options={[{ value: "online", label: "Online" }, { value: "degraded", label: "Slow" }, { value: "offline", label: "Offline" }]} /><p className="jp-muted">Also available from the status bar at the bottom of the window.</p></div></Panel>
        <Panel title="Cookie consent"><div className="adm-stack"><p>Current choice: <Badge s={s.consent === "unset" ? "warn" : "ok"}>{s.consent}</Badge></p><Btn onClick={() => system.setConsent("unset")}>Show the consent bar again</Btn></div></Panel>
      </div>
      <div style={{ marginTop: 16 }}><Alert s="info" title="Everything is stored in this browser">State persists in localStorage; clearing site data resets it.</Alert></div>
    </>
  );
}

/* ===== E017: status bar and background tasks ===== */
export function StatusPage() {
  const s = useSystem();
  return (
    <>
      <PageHeader title="Status bar and background tasks" crumbs={["System", "Status bar"]} desc="The bar at the bottom of the window shows connection, last sync, version, running tasks and the clipboard tray. Start some work and open the Tasks tray." />
      <div className="adm-grid adm-grid--2">
        <Panel title="Start background tasks"><div className="adm-stack"><div className="adm-row"><Btn icon="upload" onClick={() => startTask({ title: "Upload backup.tar.zst", kind: "upload", ms: 7000 })}>Upload</Btn><Btn icon="download" onClick={() => startTask({ title: "Export orders (CSV)", kind: "export", ms: 4000 })}>Export</Btn><Btn icon="refresh" onClick={() => startTask({ title: "Sync devices", kind: "sync", ms: 5000 })}>Sync</Btn><Btn icon="alert" onClick={() => startTask({ title: "Rebuild search index", kind: "job", ms: 6000, fail: true })}>A job that fails</Btn></div><p className="jp-muted">Tasks tick in the background while you browse other pages. Failed tasks offer Retry; running ones can be cancelled.</p></div></Panel>
        <Panel title="Connection and sync" actions={<Btn sm onClick={() => system.sync()}>Sync now</Btn>}><div className="adm-stack"><div className="adm-row"><Dot s={s.connection === "online" ? "ok" : s.connection === "degraded" ? "warn" : "danger"} /> <b>{s.connection}</b> · last sync {new Date(s.lastSync).toLocaleTimeString("en-AU")}</div><Segmented label="Simulate" value={s.connection} onChange={system.setConnection} options={[{ value: "online", label: "Online" }, { value: "degraded", label: "Slow" }, { value: "offline", label: "Offline" }]} /></div></Panel>
      </div>
      <Panel title={`Tasks (${s.tasks.length})`} className="adm-section" actions={<Btn sm onClick={() => clearFinished()}>Clear finished</Btn>} flush>
        {s.tasks.length === 0 ? <p className="jp-muted" style={{ padding: 16 }}>No tasks yet.</p> : <ul className="adm-list">{s.tasks.map((t) => <li key={t.id}><Icon name={t.kind === "upload" ? "upload" : t.kind === "export" ? "download" : "loader"} size={16} /><div className="adm-list__main"><b>{t.title}</b><div className="adm-progress__track" style={{ marginTop: 6 }}><span className={t.status === "done" ? "is-ok" : t.status === "failed" ? "is-danger" : ""} style={{ width: `${t.progress}%` }} /></div>{t.error && <span className="adm-err">{t.error}</span>}</div><Badge s={t.status === "done" ? "ok" : t.status === "failed" ? "danger" : undefined}>{t.status}</Badge>{t.status === "running" && <Btn sm onClick={() => cancelTask(t.id)}>Cancel</Btn>}{t.status === "failed" && <Btn sm onClick={() => retryTask(t.id)}>Retry</Btn>}</li>)}</ul>}
      </Panel>
    </>
  );
}

/* ===== E015 + F009 + F011: permission-aware UI, audit trail, workspace scoping ===== */
export function AccessPage() {
  const s = useSystem(); const { toast } = usePrefs(); const [del, setDel] = useState(false); const [fAction, setFAction] = useState("");
  const wsMod = { "jupiter-prod": 1, "jupiter-staging": 4, sandbox: 20 }[s.workspace] ?? 1; const scoped = useMemo(() => orders.filter((_, i) => i % wsMod === 0), [wsMod]);
  const prod = envOf(s) === "production"; const delPerm = useCan("orders.delete");
  const rows = s.audit.filter((a) => !fAction || a.action.toLowerCase().includes(fAction.toLowerCase()));
  const csv = () => { const head = "time,actor,role,action,target,env,workspace"; const body = rows.map((a) => [new Date(a.at).toISOString(), a.actor, a.role, a.action, a.target ?? "", a.env, a.workspace].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n"); const el = document.createElement("a"); el.href = URL.createObjectURL(new Blob([`${head}\n${body}`], { type: "text/csv" })); el.download = "audit-trail.csv"; el.click(); audit("Exported audit trail", `${rows.length} rows`); };
  const canAudit = can(s.role, "audit.view");
  return (
    <>
      <PageHeader title="Access, audit and scoping" crumbs={["System", "Access"]} desc="Permission-aware controls, the role matrix, an audit trail of what you do here, and workspace-scoped data." actions={<Segmented label="View as role" value={s.role} onChange={(r) => system.setRole(r as Role)} options={[{ value: "admin", label: "Admin" }, { value: "editor", label: "Editor" }, { value: "viewer", label: "Viewer" }]} />} />
      <div className="adm-grid adm-grid--2">
        <Panel title="Permission-aware controls: disabled, hidden, upsell"><div className="adm-stack">
          <div className="adm-row"><Can perm="orders.edit"><Btn variant="primary">Edit order (disabled when denied)</Btn></Can></div>
          <div className="adm-row"><Can perm="billing.edit" mode="upsell" upsell={PERMS.find((p) => p.id === "billing.edit")!.upsell}><Btn>Change plan (upsell)</Btn></Can></div>
          <div className="adm-row"><Can perm="members.manage" mode="hide"><Btn>Invite member (hidden when denied)</Btn></Can><span className="jp-muted">{can(s.role, "members.manage") ? "" : "← hidden for your role"}</span></div>
          <p className="jp-muted">Switch role above, or turn on read-only mode on the Banners page, and watch these change. Disabled controls are <code>inert</code>, so they can’t be focused or clicked, and they carry the reason as a tooltip.</p></div></Panel>
        <Panel title="Role matrix" flush><table className="jp-table"><thead><tr><th>Permission</th>{(["admin", "editor", "viewer"] as Role[]).map((r) => <th key={r} style={{ textAlign: "center", ...(r === s.role ? { color: "var(--jp-accent)" } : {}) }}>{r}</th>)}</tr></thead><tbody>{PERMS.map((p) => <tr key={p.id}><td>{p.label}</td>{(["admin", "editor", "viewer"] as Role[]).map((r) => <td key={r} style={{ textAlign: "center" }}>{ROLE_MATRIX[r].includes(p.id) ? <span aria-label="allowed" style={{ color: "var(--jp-ok)" }}>✓</span> : <span aria-label="denied" className="jp-muted">–</span>}</td>)}</tr>)}</tbody></table></Panel>
      </div>
      <Panel title={`Orders in ${workspaceOf(s).name} (${envOf(s)})`} className="adm-section" actions={<Btn sm variant="primary" className="adm-danger" disabled={!delPerm.allowed} title={delPerm.reason} onClick={() => setDel(true)}>{prod ? "Delete order (production)…" : "Delete order…"}</Btn>}>
        <div className="adm-row" style={{ gap: 24 }}><div><div className="jp-stat__label">Orders</div><div className="jp-stat__value">{scoped.length}</div></div><div><div className="jp-stat__label">Revenue</div><div className="jp-stat__value">{money(scoped.reduce((a, o) => a + o.amount, 0))}</div></div><p className="jp-muted" style={{ flex: 1 }}>Data is scoped to the selected workspace: production shows everything, staging a quarter of it and the sandbox a handful. Change workspace from the top bar menu.</p></div>
      </Panel>
      <ConfirmDelete open={del} what={prod ? "production" : "order"} onClose={() => setDel(false)} onConfirm={() => { setDel(false); audit("Deleted order", scoped[0]?.id); toast({ kind: "warn", title: `Deleted ${scoped[0]?.id}`, body: prod ? "Recorded in the audit trail with a production flag." : undefined }); }} />
      <Panel title={`Audit trail (${rows.length})`} className="adm-section" actions={<div className="adm-row"><div style={{ width: 180 }}><TextInput value={fAction} onChange={setFAction} placeholder="Filter actions…" aria-label="Filter audit" /></div><Btn sm icon="download" disabled={!rows.length || !can(s.role, "data.export")} onClick={csv}>CSV</Btn><Btn sm onClick={() => { audit("Opened order", scoped[1]?.id); audit("Changed setting", "default region"); audit("Invited member", "casey@example.com"); }}>Generate sample events</Btn><Btn sm variant="ghost" onClick={() => system.clearAudit()}>Clear</Btn></div>} flush>
        {!canAudit ? <p className="jp-muted" style={{ padding: 16 }}>Your role can’t read the audit trail.</p> : rows.length === 0 ? <p className="jp-muted" style={{ padding: 16 }}>Nothing recorded yet. Switch role, toggle read-only, or press “Generate sample events”.</p> : <div className="adm-dt__wrap"><table className="jp-table"><thead><tr><th>Time</th><th>Actor</th><th>Role</th><th>Action</th><th>Target</th><th>Env</th></tr></thead><tbody>{rows.slice(0, 40).map((a) => <tr key={a.id}><td className="adm-num">{new Date(a.at).toLocaleTimeString("en-AU")}</td><td>{a.actor}</td><td><Badge>{a.role}</Badge></td><td>{a.action}</td><td className="adm-num">{a.target}</td><td><Badge s={a.env === "production" ? "danger" : a.env === "staging" ? "warn" : "info"}>{a.env}</Badge></td></tr>)}</tbody></table></div>}
      </Panel>
    </>
  );
}

/* ===== F007: undo / redo, optimistic updates, conflict handling ===== */
const START: Rec = { name: "Brisbane gateway", status: "active", qty: 3, note: "Primary uplink" };
export function UndoPage() {
  const { toast } = usePrefs();
  const [h, setH] = useState(() => history<Rec>(START)); const [server, setServer] = useState<{ rec: Rec; version: number }>({ rec: START, version: 1 }); const [base, setBase] = useState<{ rec: Rec; version: number }>({ rec: START, version: 1 });
  const [saving, setSaving] = useState(false); const [failNext, setFailNext] = useState(false); const [conflict, setConflict] = useState<ReturnType<typeof merge3> | null>(null); const [choice, setChoice] = useState<Record<string, "mine" | "theirs">>({});
  const cur = h.present; const dirty = JSON.stringify(cur) !== JSON.stringify(base.rec);
  const edit = (k: string, v: string | number) => setH((x) => commit(x, { ...x.present, [k]: v }));
  const doUndo = () => setH((x) => undo(x)); const doRedo = () => setH((x) => redo(x));
  useShortcut("undo", "mod+z", "Undo", doUndo, "Editor"); useShortcut("redo", "mod+shift+z", "Redo", doRedo, "Editor");
  const sendToServer = (rec: Rec, fromVersion: number) => {
    setSaving(true); const optimistic = base; setBase({ rec, version: fromVersion + 1 }); // optimistic: the UI already shows it as saved
    setTimeout(() => {
      setSaving(false);
      if (failNext) { setFailNext(false); setBase(optimistic); toast({ kind: "danger", title: "Save failed", body: "The server rejected the change. Your edits were kept so you can retry." }); return; }
      setServer({ rec, version: fromVersion + 1 }); setBase({ rec, version: fromVersion + 1 }); toast({ kind: "ok", title: "Saved" });
    }, 800);
  };
  const save = () => {
    if (server.version !== base.version) { const m = merge3(base.rec, cur, server.rec); if (m.conflicts.length) { setConflict(m); setChoice(Object.fromEntries(m.conflicts.map((c) => [c.key, "mine"]))); return; } toast({ kind: "info", title: "Merged automatically", body: `${m.autoMerged.join(", ")} came from a teammate` }); setH((x) => commit(x, m.merged)); sendToServer(m.merged, server.version); return; }
    sendToServer(cur, server.version);
  };
  const resolve = () => { if (!conflict) return; const out: Rec = { ...conflict.merged }; for (const c of conflict.conflicts) { const v = choice[c.key] === "theirs" ? c.theirs : c.mine; if (v === undefined) delete out[c.key]; else out[c.key] = v; } setConflict(null); setH((x) => commit(x, out)); sendToServer(out, server.version); };
  const teammate = () => { const rec = { ...server.rec, qty: Number(server.rec.qty) + 2, note: "Updated by Noah: moved to rack 2" }; setServer({ rec, version: server.version + 1 }); toast({ kind: "info", title: "Noah Smith saved a change", body: "The server record is now newer than yours." }); };
  const keys = Object.keys(START);
  return (
    <>
      <PageHeader title="Undo, optimistic updates and conflicts" crumbs={["System", "Undo"]} desc="Edits go on an undo stack (Ctrl/Cmd+Z, Shift+Z). Saving is optimistic, and a teammate’s edit triggers a three-way merge." status={dirty ? <Badge s="warn">unsaved</Badge> : <Badge s="ok">saved</Badge>}
        actions={<><Btn icon="undo" disabled={!h.past.length} onClick={doUndo}>Undo</Btn><Btn icon="redo" disabled={!h.future.length} onClick={doRedo}>Redo</Btn></>} />
      <div className="adm-grid adm-grid--2">
        <Panel title="Record"><div className="adm-stack">
          <Field label="Name">{(id) => <TextInput id={id} value={String(cur.name)} onChange={(v) => edit("name", v)} />}</Field>
          <Field label="Status">{(id) => <Select id={id} value={String(cur.status)} onChange={(v) => edit("status", v)} options={["active", "paused", "retired"]} />}</Field>
          <Field label="Quantity">{(id) => <TextInput id={id} type="number" value={String(cur.qty)} onChange={(v) => edit("qty", Number(v))} />}</Field>
          <Field label="Note">{(id) => <TextInput id={id} value={String(cur.note)} onChange={(v) => edit("note", v)} />}</Field>
          <div className="adm-row"><Btn variant="primary" disabled={!dirty || saving} onClick={save}>{saving ? "Saving…" : "Save"}</Btn><Switch checked={failNext} onChange={setFailNext} label="Next save fails" /><Btn onClick={teammate}>Simulate teammate edit</Btn></div>
          <p className="jp-muted">Base v{base.version} · server v{server.version}{server.version !== base.version ? " (newer: saving will merge)" : ""}</p></div></Panel>
        <div className="adm-stack">
          <Panel title={`History (${h.past.length} past, ${h.future.length} undone)`} flush><ol className="adm-list adm-list--tight" style={{ maxHeight: 220, overflow: "auto" }}>{[...h.past, h.present].map((r, i, a) => <li key={i} className={i === a.length - 1 ? "is-sel" : ""}><span className="adm-num jp-muted" style={{ width: 22 }}>{i}</span><span>{i === 0 ? "Loaded" : `${String(r.name)} · ${String(r.status)} · qty ${String(r.qty)}`}</span></li>)}</ol></Panel>
          <Panel title="Server copy"><pre className="adm-pre">{JSON.stringify(server.rec, null, 2)}</pre></Panel>
        </div>
      </div>
      <Modal open={!!conflict} onClose={() => setConflict(null)} title="Someone else changed this record" size="lg" footer={<><Btn onClick={() => setConflict(null)}>Cancel</Btn><Btn variant="primary" onClick={resolve}>Save resolved version</Btn></>}>
        {conflict && <div className="adm-stack"><p>{conflict.autoMerged.length ? <>These merged cleanly: <b>{conflict.autoMerged.join(", ")}</b>. </> : null}Choose a value for each real conflict:</p>
          {conflict.conflicts.map((c) => <fieldset key={c.key} className="adm-conflict"><legend>{c.key}</legend><Radio name={`c-${c.key}`} value="mine" current={choice[c.key]} onChange={() => setChoice({ ...choice, [c.key]: "mine" })} label={<>Mine: <code>{String(c.mine)}</code></>} /><Radio name={`c-${c.key}`} value="theirs" current={choice[c.key]} onChange={() => setChoice({ ...choice, [c.key]: "theirs" })} label={<>Theirs: <code>{String(c.theirs)}</code></>} /></fieldset>)}
          <DiffViewer labels={["server", "mine"]} before={JSON.stringify(server.rec, null, 2)} after={JSON.stringify(cur, null, 2)} /></div>}
      </Modal>
    </>
  );
}

/* ===== F010: export and share, scheduled email ===== */
type Sched = { id: string; name: string; freq: string; at: string; to: string[]; format: string };
const loadScheds = (): Sched[] => { try { return JSON.parse(localStorage.getItem("adm-schedules") || "[]") as Sched[]; } catch { return []; } };
export function SharePage() {
  const { toast } = usePrefs(); const loc = useLocation(); const rows = useMemo(() => orders.slice(0, 12), []);
  const [range, setRange] = useState("30d"); const [scheds, setScheds] = useState<Sched[]>(loadScheds); const [name, setName] = useState("Weekly orders"); const [freq, setFreq] = useState("weekly"); const [at, setAt] = useState("08:00"); const [to, setTo] = useState<string[]>(["ava@example.com"]); const [format, setFormat] = useState("csv"); const [tab, setTab] = useState<"table" | "pdf">("table");
  useEffect(() => { try { localStorage.setItem("adm-schedules", JSON.stringify(scheds)); } catch { /* ignore */ } }, [scheds]);
  const csv = () => { const body = ["id,customer,status,amount,region", ...rows.map((r) => [r.id, r.customer, r.status, r.amount, r.region].join(","))].join("\n"); return body; };
  const dl = (name: string, text: string, type: string) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); audit(`Exported ${name.split(".").pop()?.toUpperCase()}`, name); };
  const link = `${location.origin}${loc.pathname}?share=${btoa(JSON.stringify({ range, rows: rows.length }))}`;
  const md = ["| id | customer | status | amount |", "| --- | --- | --- | ---: |", ...rows.map((r) => `| ${r.id} | ${r.customer} | ${r.status} | ${money(r.amount)} |`)].join("\n");
  const html = useMemo(() => generateEmailHTML(DEFAULT_TOKENS), []);
  return (
    <>
      <PageHeader title="Export and share" crumbs={["System", "Share"]} desc="CSV, JSON, Markdown, PNG and PDF exports, a shareable link, and scheduled email." />
      <div className="adm-grid adm-grid--2">
        <Panel title="Export this view" actions={<Segmented label="Range" value={range} onChange={setRange} options={[{ value: "7d", label: "7d" }, { value: "30d", label: "30d" }]} />}>
          <div className="adm-stack"><div className="adm-row">
            <Can perm="data.export"><Btn icon="download" onClick={() => dl("orders.csv", csv(), "text/csv")}>CSV</Btn><Btn icon="download" onClick={() => dl("orders.json", JSON.stringify(rows, null, 2), "application/json")}>JSON</Btn><Btn icon="copy" onClick={() => { navigator.clipboard?.writeText(md); system.clip("Markdown table", md); toast({ kind: "ok", title: "Copied as Markdown" }); }}>Markdown</Btn>
            <Btn icon="image" onClick={() => { const svg = document.querySelector("#share-chart svg") as SVGSVGElement | null; if (svg) exportPng(svg, "orders-trend"); }}>Chart PNG</Btn><Btn icon="file" onClick={() => { setTab("pdf"); }}>PDF</Btn><Btn onClick={() => window.print()}>Print…</Btn></Can></div>
            <p className="jp-muted">PDF here is a real generated document (below) and Print uses the print stylesheet, so you can also “Save as PDF” from the browser dialog. Exports are disabled for roles without <code>data.export</code>, and each one writes an audit entry.</p></div></Panel>
        <Panel title="Share a link"><div className="adm-stack"><div className="adm-input"><input className="jp-input jp-input--mono" readOnly value={link} aria-label="Share link" onFocus={(e) => e.currentTarget.select()} /></div><div className="adm-row"><Btn variant="primary" icon="link" onClick={() => { navigator.clipboard?.writeText(link); audit("Copied share link"); toast({ kind: "ok", title: "Link copied" }); }}>Copy link</Btn><Badge>view-only</Badge><Badge s="info">expires in 7 days</Badge></div><p className="jp-muted">The link carries the view state (range, rows) in the URL. There is no server in this demo, so it only works in this browser.</p></div></Panel>
      </div>
      <Panel title="Trend and data" className="adm-section" actions={<Segmented label="View" value={tab} onChange={setTab} options={[{ value: "table", label: "Chart + table" }, { value: "pdf", label: "PDF preview" }]} />}>
        {tab === "table" ? <div className="adm-stack"><div id="share-chart"><LineChart title="Orders trend" labels={days(14)} height={180} series={[{ name: "Orders", data: series(14, 40, 12, 5) }]} tools={false} zoomable={false} /></div>
          <div className="adm-dt__wrap"><table className="jp-table"><thead><tr><th>Order</th><th>Customer</th><th>Status</th><th className="jp-num">Amount</th></tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td className="adm-num">{r.id}</td><td>{r.customer}</td><td>{r.status}</td><td className="jp-num">{money(r.amount)}</td></tr>)}</tbody></table></div></div>
          : <PdfEmbed title="Orders report" pages={[[`Generated ${new Date().toLocaleDateString("en-AU")}`, "", ...rows.slice(0, 6).map((r) => `${r.id}  ${r.customer}  ${r.status}  ${money(r.amount)}`)], ["Notes", "", "This PDF is generated in the browser with no library.", "Each page is plain Helvetica text."]]} />}
      </Panel>
      <div className="adm-grid adm-grid--2" style={{ marginTop: 16 }}>
        <Panel title="Schedule an email report"><div className="adm-stack">
          <Field label="Name">{(id) => <TextInput id={id} value={name} onChange={setName} />}</Field>
          <div className="adm-grid adm-grid--2"><Field label="Frequency">{(id) => <Select id={id} value={freq} onChange={setFreq} options={["daily", "weekly", "monthly"]} />}</Field><Field label="Send at">{(id) => <TextInput id={id} type="time" value={at} onChange={setAt} />}</Field></div>
          <Field label="Recipients">{(id) => <Combobox id={id} multi creatable options={["ava@example.com", "noah@example.com", "mia@example.com"]} value={to} onChange={setTo} placeholder="Add email…" />}</Field>
          <Field label="Attachment">{(id) => <Select id={id} value={format} onChange={setFormat} options={["csv", "json", "pdf"]} />}</Field>
          <div className="adm-row"><Btn variant="primary" disabled={!name.trim() || !to.length} onClick={() => { setScheds([{ id: String(Date.now()), name, freq, at, to, format }, ...scheds]); audit("Scheduled email report", name); toast({ kind: "ok", title: "Scheduled", body: `${name}: ${freq} at ${at}` }); }}>Schedule</Btn></div></div></Panel>
        <Panel title={`Scheduled (${scheds.length})`} flush>{scheds.length === 0 ? <p className="jp-muted" style={{ padding: 16 }}>Nothing scheduled.</p> : <ul className="adm-list">{scheds.map((s) => <li key={s.id}><Icon name="mail" size={16} /><div className="adm-list__main"><b>{s.name}</b><span className="jp-muted">{s.freq} at {s.at} · {s.to.join(", ")} · {s.format.toUpperCase()}</span></div><Btn sm variant="ghost" onClick={() => setScheds(scheds.filter((x) => x.id !== s.id))}>Remove</Btn></li>)}</ul>}</Panel>
      </div>
      <Panel title="Email template (from @belikh/jupiter-tokens)" className="adm-section"><p className="jp-muted" style={{ marginBottom: 8 }}>Scheduled reports use the same generated, inline-styled template as every other Jupiter email.</p><iframe title="Email preview" className="adm-emailframe" sandbox="" srcDoc={html} /></Panel>
    </>
  );
}
