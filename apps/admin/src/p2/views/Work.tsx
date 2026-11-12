import { useEffect, useMemo, useState } from "react";
import "./views.css";
import { PageHeader, Panel, Badge, Btn, Avatar, Tabs, Menu, Modal, Drawer, EmptyState, Alert, type Status } from "@belikh/jupiter-ui/kit.tsx";
import { ProgressBar, StatTile } from "@belikh/jupiter-ui/Charts.tsx";
import { Segmented, TextInput, TextArea, Select, Checkbox, Field } from "@belikh/jupiter-ui/inputs.tsx";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";
import { money } from "../../data/fixtures.ts";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { ago, NOW0, useSimNow } from "./shared.tsx";
import { useWs, wsActions, getWs } from "./workspace.ts";
import { approvals as apSeed, people, STAGES, taskTree, tickets as tkSeed, type Approval, type Ticket } from "./data.ts";
import { fmtMin, move, rollup, setDone, slaState, SLA_MIN, type Contact, type Priority, type SubTask } from "./logic.ts";

/* ============ A038 Approval queue ============ */
const riskS: Record<Approval["risk"], Status> = { low: "ok", med: "warn", high: "danger" };
export function Approvals() {
  const { toast } = usePrefs(); const [items, setItems] = useState(apSeed); const [tab, setTab] = useState("pending"); const [kind, setKind] = useState("all"); const [sel, setSel] = useState<Set<string>>(new Set()); const [rej, setRej] = useState<Approval | null>(null); const [reason, setReason] = useState(""); const [open, setOpen] = useState<Approval | null>(null);
  const list = items.filter((a) => a.status === tab && (kind === "all" || a.kind === kind));
  const decide = (ids: string[], status: "approved" | "rejected", why?: string) => { const old = items; setItems((x) => x.map((a) => (ids.includes(a.id) ? { ...a, status, reason: why } : a))); setSel(new Set()); toast({ kind: status === "approved" ? "ok" : "warn", title: `${ids.length} ${status}`, undo: () => setItems(old) }); };
  const lowRisk = list.filter((a) => a.risk === "low" && !a.amount || (a.risk === "low" && (a.amount ?? 0) < 500));
  return (
    <>
      <PageHeader title="Approval queue" crumbs={["Views", "Approvals"]} desc="Decide, delegate or reject with a reason. High-risk items can't be bulk approved." tabs={<Tabs value={tab} onChange={(t) => { setTab(t); setSel(new Set()); }} tabs={[{ id: "pending", label: "Pending", count: items.filter((a) => a.status === "pending").length }, { id: "approved", label: "Approved", count: items.filter((a) => a.status === "approved").length }, { id: "rejected", label: "Rejected", count: items.filter((a) => a.status === "rejected").length }]} />}
        actions={<><Select value={kind} onChange={setKind} aria-label="Kind" options={["all", "Expense", "Access", "Change", "Leave", "Purchase"]} />{tab === "pending" && <Btn disabled={!lowRisk.length} onClick={() => decide(lowRisk.map((a) => a.id), "approved")}>Approve {lowRisk.length} low-risk</Btn>}</>} />
      {tab === "pending" && sel.size > 0 && <div className="adm-bulk" style={{ marginBottom: 12, borderRadius: 6 }}><b>{sel.size} selected</b><span className="adm-spacer" /><Btn sm disabled={[...sel].some((id) => items.find((a) => a.id === id)?.risk === "high")} onClick={() => decide([...sel], "approved")}>Approve</Btn><Btn sm onClick={() => { setRej(items.find((a) => a.id === [...sel][0]) ?? null); }}>Reject…</Btn></div>}
      {list.length === 0 ? <EmptyState spot={tab === "pending" ? "inbox-zero" : "empty"} title={tab === "pending" ? "Nothing waiting on you" : "No items"}>{tab === "pending" ? "Approvals appear here as they are requested." : "Decided items land here."}</EmptyState>
        : <Panel flush><ul className="adm-list">{list.map((a) => (
          <li key={a.id} style={{ alignItems: "flex-start" }}>{tab === "pending" && <Checkbox checked={sel.has(a.id)} onChange={(v) => setSel((s) => { const n = new Set(s); v ? n.add(a.id) : n.delete(a.id); return n; })} label={<span className="adm-sr">Select {a.id}</span>} />}<Avatar name={a.by} size={32} />
            <div className="adm-list__main"><span><b>{a.title}</b></span><span className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>{a.id} · {a.kind} · requested by {a.by} · {ago(a.at)}{a.amount ? ` · ${money(a.amount)}` : ""}</span>{a.reason && <span style={{ fontSize: "var(--jp-fs-xs)" }}>Reason: {a.reason}</span>}</div>
            <Badge s={riskS[a.risk]}>{a.risk} risk</Badge>
            {tab === "pending" ? <div className="adm-row"><Btn sm variant="primary" onClick={() => decide([a.id], "approved")}>Approve</Btn><Btn sm onClick={() => { setRej(a); setReason(""); }}>Reject…</Btn><Menu label="More" items={[{ label: "Details", onSelect: () => setOpen(a) }, { label: "Delegate to Noah Smith", onSelect: () => toast({ kind: "info", title: `${a.id} delegated to Noah Smith` }) }]} /></div> : <Btn sm variant="ghost" onClick={() => { const old = items; setItems((x) => x.map((y) => (y.id === a.id ? { ...y, status: "pending", reason: undefined } : y))); toast({ kind: "info", title: "Moved back to pending", undo: () => setItems(old) }); }}>Reopen</Btn>}</li>))}</ul></Panel>}
      <Modal open={!!rej} onClose={() => setRej(null)} title={sel.size > 1 ? `Reject ${sel.size} requests` : `Reject ${rej?.id}`} size="sm" footer={<><Btn onClick={() => setRej(null)}>Cancel</Btn><Btn variant="primary" className="adm-danger" disabled={reason.trim().length < 5} onClick={() => { decide(sel.size > 1 ? [...sel] : rej ? [rej.id] : [], "rejected", reason.trim()); setRej(null); setReason(""); }}>Reject</Btn></>}><Field label="Reason (shown to the requester)" required hint="At least 5 characters">{(id) => <TextArea id={id} value={reason} onChange={setReason} autoFocus />}</Field></Modal>
      <Drawer open={!!open} onClose={() => setOpen(null)} title={open?.id ?? ""} footer={<Btn onClick={() => setOpen(null)}>Close</Btn>}>{open && <div className="adm-stack"><h3>{open.title}</h3><dl className="adm-dl"><dt>Requester</dt><dd>{open.by}</dd><dt>Kind</dt><dd>{open.kind}</dd><dt>Amount</dt><dd>{open.amount ? money(open.amount) : "—"}</dd><dt>Risk</dt><dd><Badge s={riskS[open.risk]}>{open.risk}</Badge></dd></dl>{open.risk === "high" && <Alert s="warn" title="High risk">Requires a second approver.</Alert>}</div>}</Drawer>
    </>
  );
}

/* ============ A039 Task list with subtasks ============ */
export function Tasks() {
  const { toast } = usePrefs(); const [tasks, setTasks] = useState<SubTask[]>(taskTree); const [hideDone, setHideDone] = useState(false); const [collapsed, setCollapsed] = useState<Set<string>>(new Set()); const [adding, setAdding] = useState<string | null>(null); const [text, setText] = useState("");
  const add = (parent: string | null) => { if (!text.trim()) return; const n: SubTask = { id: `n${Date.now()}`, title: text.trim(), done: false }; const ins = (l: SubTask[]): SubTask[] => (parent === null ? [...l, n] : l.map((t) => (t.id === parent ? { ...t, done: false, sub: [...(t.sub ?? []), n] } : { ...t, sub: t.sub ? ins(t.sub) : undefined }))); setTasks(ins(tasks)); setText(""); setAdding(null); };
  const remove = (id: string) => { const old = tasks; const rm = (l: SubTask[]): SubTask[] => l.filter((t) => t.id !== id).map((t) => ({ ...t, sub: t.sub ? rm(t.sub) : undefined })); setTasks(rm(tasks)); toast({ kind: "warn", title: "Task removed", undo: () => setTasks(old) }); };
  const total = tasks.map(rollup).reduce((a, b) => ({ done: a.done + b.done, total: a.total + b.total }), { done: 0, total: 0 });
  const Row = ({ t, depth }: { t: SubTask; depth: number }) => { const r = rollup(t); const has = !!t.sub?.length; const col = collapsed.has(t.id); if (hideDone && r.done === r.total && r.total > 0) return null; return (<>
    <li style={{ paddingInlineStart: 16 + depth * 26, alignItems: "center" }}>
      {has ? <button className="adm-x" aria-expanded={!col} aria-label={`${col ? "Expand" : "Collapse"} ${t.title}`} onClick={() => setCollapsed((s) => { const n = new Set(s); n.has(t.id) ? n.delete(t.id) : n.add(t.id); return n; })}><Icon name={col ? "chevron-right" : "chevron-down"} size={14} /></button> : <span style={{ width: 26 }} />}
      <Checkbox checked={r.total > 0 && r.done === r.total} indeterminate={r.done > 0 && r.done < r.total} onChange={(v) => setTasks(setDone(tasks, t.id, v))} label={<span style={{ textDecoration: r.done === r.total && r.total ? "line-through" : undefined }}>{t.title}</span>} />
      <span className="adm-spacer" />{has && <><span className="jp-muted adm-num" style={{ fontSize: "var(--jp-fs-xs)" }}>{r.done}/{r.total}</span><div style={{ width: 80 }}><ProgressBar value={r.done} max={r.total} s={r.done === r.total ? "ok" : undefined} label={`${t.title} progress`} /></div></>}
      <Menu label="•••" items={[{ label: "Add subtask", onSelect: () => { setAdding(t.id); setText(""); } }, { label: "Delete", danger: true, onSelect: () => remove(t.id) }]} /></li>
    {adding === t.id && <li style={{ paddingInlineStart: 16 + (depth + 1) * 26 }}><form style={{ display: "flex", gap: 8, flex: 1 }} onSubmit={(e) => { e.preventDefault(); add(t.id); }}><div style={{ flex: 1 }}><TextInput value={text} onChange={setText} placeholder="Subtask title, Enter to add" aria-label="New subtask" autoFocus /></div><Btn type="submit" sm variant="primary">Add</Btn><Btn type="button" sm onClick={() => setAdding(null)}>Cancel</Btn></form></li>}
    {has && !col && t.sub!.map((s) => <Row key={s.id} t={s} depth={depth + 1} />)}</>); };
  return (
    <>
      <PageHeader title="Tasks" crumbs={["Views", "Tasks"]} desc="Nested subtasks that roll up: tick a parent to complete everything under it; finishing every child completes the parent." actions={<><Checkbox checked={hideDone} onChange={setHideDone} label="Hide completed" /><Btn variant="primary" icon="plus" onClick={() => { setAdding("top"); setText(""); }}>New task</Btn></>} />
      <div className="adm-grid adm-grid--3" style={{ marginBottom: 16 }}><StatTile label="Overall" value={`${Math.round((total.done / Math.max(1, total.total)) * 100)}%`} sub={`${total.done} of ${total.total} steps`} /></div>
      <Panel flush>{adding === "top" && <form style={{ display: "flex", gap: 8, padding: 12, borderBottom: "1px solid var(--jp-border)" }} onSubmit={(e) => { e.preventDefault(); add(null); }}><div style={{ flex: 1 }}><TextInput value={text} onChange={setText} placeholder="Task title" aria-label="New task" autoFocus /></div><Btn type="submit" variant="primary" sm>Add</Btn><Btn type="button" sm onClick={() => setAdding(null)}>Cancel</Btn></form>}
        {tasks.length ? <ul className="adm-list">{tasks.map((t) => <Row key={t.id} t={t} depth={0} />)}</ul> : <EmptyState spot="done" title="No tasks">Create one to get started.</EmptyState>}</Panel>
    </>
  );
}

/* ============ A040 Ticket list with SLA timers ============ */
const sev: Record<string, Status> = { ok: "ok", risk: "warn", breached: "danger", met: "ok" };
export function Tickets() {
  const { toast } = usePrefs(); const now = useSimNow(1); const [tk, setTk] = useState<Ticket[]>(tkSeed); const [pri, setPri] = useState("all"); const [st, setSt] = useState("all"); const [sortSla, setSortSla] = useState(true);
  const rows = useMemo(() => tk.map((t) => ({ t, s: slaState(t, now) })).filter(({ t }) => (pri === "all" || t.priority === pri) && (st === "all" || t.status === st)).sort((a, b) => (sortSla ? a.s.remainingMin - b.s.remainingMin : 0)), [tk, now, pri, st, sortSla]);
  const breached = rows.filter((r) => r.s.state === "breached").length, risk = rows.filter((r) => r.s.state === "risk").length;
  const patch = (id: string, f: (t: Ticket) => Ticket, msg: string) => { const old = tk; setTk((x) => x.map((t) => (t.id === id ? f(t) : t))); toast({ kind: "info", title: msg, undo: () => setTk(old) }); };
  return (
    <>
      <PageHeader title="Tickets" crumbs={["Views", "Tickets"]} desc={`SLA targets: ${Object.entries(SLA_MIN).map(([p, m]) => `${p} ${fmtMin(m)}`).join(", ")}. The clock stops while waiting on the customer and when resolved; the demo clock runs at 1 min per second.`}
        actions={<><Select value={pri} onChange={setPri} aria-label="Priority" options={["all", "P1", "P2", "P3", "P4"]} /><Select value={st} onChange={setSt} aria-label="Status" options={["all", "open", "waiting", "resolved"]} /><Checkbox checked={sortSla} onChange={setSortSla} label="Most urgent first" /></>} />
      <div className="adm-grid adm-grid--4" style={{ marginBottom: 16 }}><StatTile label="Breached" value={String(breached)} invert /><StatTile label="At risk" value={String(risk)} /><StatTile label="Open" value={String(tk.filter((t) => t.status !== "resolved").length)} /><StatTile label="Resolved" value={String(tk.filter((t) => t.status === "resolved").length)} /></div>
      {breached > 0 && <div style={{ marginBottom: 12 }}><Alert s="danger" title={`${breached} ticket${breached > 1 ? "s" : ""} past SLA`}>Escalate to the on-call lead or reassign.</Alert></div>}
      <Panel flush><div className="adm-dt__wrap"><table className="jp-table adm-table adm-table--cards"><thead><tr><th>Ticket</th><th>Customer</th><th>Priority</th><th>Status</th><th style={{ minWidth: 180 }}>SLA</th><th>Owner</th><th /></tr></thead><tbody>
        {rows.map(({ t, s }) => <tr key={t.id} className={s.state === "breached" ? "sev-danger" : s.state === "risk" ? "sev-warn" : ""}>
          <td data-label="Ticket"><b className="adm-num">{t.id}</b><div>{t.title}</div></td><td data-label="Customer">{t.customer}</td><td data-label="Priority"><Badge s={t.priority === "P1" ? "danger" : t.priority === "P2" ? "warn" : undefined}>{t.priority}</Badge></td><td data-label="Status">{t.status}</td>
          <td data-label="SLA"><div className="vw-sla"><b className="adm-num" style={{ color: s.state === "breached" ? "var(--jp-danger)" : undefined }}>{t.status === "resolved" ? (s.state === "met" ? "met" : "missed") : t.pausedAt !== undefined ? "paused" : fmtMin(s.remainingMin)}</b><ProgressBar value={s.pct} s={s.state === "breached" ? "danger" : s.state === "risk" ? "warn" : t.status === "resolved" ? "ok" : undefined} label={`${t.id} SLA used`} /></div></td>
          <td data-label="Owner"><span className="adm-row"><Avatar name={t.owner} size={22} />{t.owner.split(" ")[0]}</span></td>
          <td style={{ textAlign: "end" }}>{t.status !== "resolved" && <Menu label="Actions" items={[t.pausedAt === undefined ? { label: "Waiting on customer", onSelect: () => patch(t.id, (x) => ({ ...x, status: "waiting", pausedAt: now }), `${t.id}: SLA clock paused`) } : { label: "Resume SLA clock", onSelect: () => patch(t.id, (x) => ({ ...x, status: "open", pausedMin: (x.pausedMin ?? 0) + (now - (x.pausedAt ?? now)), pausedAt: undefined }), `${t.id}: SLA clock resumed`) }, { label: "Resolve", onSelect: () => patch(t.id, (x) => ({ ...x, status: "resolved", resolvedAt: x.pausedAt ?? now }), `${t.id} resolved`) }, { label: "Escalate to P1", onSelect: () => patch(t.id, (x) => ({ ...x, priority: "P1" as Priority }), `${t.id} escalated to P1`) }]} />}</td></tr>)}
        {!rows.length && <tr><td colSpan={7}><EmptyState spot="inbox-zero" title="No tickets">Nothing matches the filters.</EmptyState></td></tr>}</tbody></table></div></Panel>
    </>
  );
}

/* ============ A041 Contacts list with pipeline stages ============ */
export function Contacts() {
  const { toast } = usePrefs(); const ws = useWs(); const [tab, setTab] = useState("pipeline"); const [q, setQ] = useState(""); const [edit, setEdit] = useState<Contact | null>(null); const [drag, setDrag] = useState<string | null>(null); const [over, setOver] = useState<string | null>(null);
  const list = ws.contacts.filter((c) => (c.name + c.company + c.email).toLowerCase().includes(q.toLowerCase()));
  const setStage = (id: string, stage: string) => wsActions.setContacts(ws.contacts.map((c) => (c.id === id ? { ...c, stage } : c)));
  const won = ws.contacts.filter((c) => c.stage === "Won").length, lost = ws.contacts.filter((c) => c.stage === "Lost").length;
  const save = () => { if (!edit) return; wsActions.setContacts(ws.contacts.map((c) => (c.id === edit.id ? edit : c))); setEdit(null); toast({ kind: "ok", title: "Contact saved" }); };
  const del = (id: string) => { wsActions.deleteContact(id); const tid = getWs().trash[0].id; setEdit(null); toast({ kind: "warn", title: "Moved to Trash", undo: () => wsActions.restore(tid) }); };
  return (
    <>
      <PageHeader title="Contacts" crumbs={["Views", "Contacts"]} desc="A pipeline you can drag (or use the stage menu), and a searchable list. Shares data with Duplicates and Trash." tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: "pipeline", label: "Pipeline" }, { id: "list", label: "List", count: ws.contacts.length }]} />} actions={<div style={{ width: 220 }}><TextInput value={q} onChange={setQ} placeholder="Search contacts…" aria-label="Search contacts" prefix={<Icon name="search" size={14} />} /></div>} />
      {tab === "pipeline" ? <>
        <p className="jp-muted" style={{ marginBottom: 8 }}>Win rate {won + lost ? Math.round((won / (won + lost)) * 100) : 0}% ({won} won, {lost} lost)</p>
        <div className="vw-stage">{STAGES.map((s) => { const cs = list.filter((c) => c.stage === s); return (
          <section key={s} className="adm-kcol" style={over === s ? { outline: "2px dashed var(--jp-accent)" } : undefined} aria-label={s} onDragOver={(e) => { e.preventDefault(); setOver(s); }} onDragLeave={() => setOver(null)} onDrop={() => { if (drag) setStage(drag, s); setDrag(null); setOver(null); }}>
            <header><b>{s}</b><span className="adm-count">{cs.length}</span></header>
            <div className="adm-kcol__list">{cs.map((c) => <article key={c.id} className="adm-kcard" draggable onDragStart={() => setDrag(c.id)} onDragEnd={() => setDrag(null)}><b>{c.name}</b><span className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>{c.company}</span><div className="adm-row" style={{ justifyContent: "space-between" }}><Avatar name={c.name} size={20} /><span className="adm-row"><Menu label="Stage" items={STAGES.filter((x) => x !== s).map((x) => ({ label: `Move to ${x}`, onSelect: () => setStage(c.id, x) }))} /><Btn sm variant="ghost" onClick={() => setEdit(c)}>Edit</Btn></span></div></article>)}{!cs.length && <p className="jp-muted" style={{ padding: 8, fontSize: "var(--jp-fs-xs)" }}>Drop contacts here</p>}</div></section>); })}</div></>
        : <Panel flush><table className="jp-table"><thead><tr><th>Name</th><th>Company</th><th>Email</th><th>Phone</th><th>Stage</th><th /></tr></thead><tbody>{list.map((c) => <tr key={c.id}><td><span className="adm-row"><Avatar name={c.name} size={22} />{c.name}</span></td><td>{c.company}</td><td>{c.email || <span className="jp-muted">—</span>}</td><td className="adm-num">{c.phone || "—"}</td><td><Badge>{c.stage}</Badge></td><td style={{ textAlign: "end" }}><Btn sm variant="ghost" onClick={() => setEdit(c)}>Edit</Btn></td></tr>)}</tbody></table>{!list.length && <EmptyState spot="no-results" title="No contacts match">Try another search.</EmptyState>}</Panel>}
      <Drawer open={!!edit} onClose={() => setEdit(null)} title="Edit contact" footer={<><Btn variant="primary" className="adm-danger" onClick={() => edit && del(edit.id)}>Delete</Btn><span className="adm-spacer" /><Btn onClick={() => setEdit(null)}>Cancel</Btn><Btn variant="primary" onClick={save}>Save</Btn></>}>{edit && <div className="adm-stack">{(["name", "email", "phone", "company"] as const).map((k) => <Field key={k} label={k[0].toUpperCase() + k.slice(1)}>{(id) => <TextInput id={id} value={edit[k]} onChange={(v) => setEdit({ ...edit, [k]: v })} />}</Field>)}<Field label="Stage">{(id) => <Select id={id} value={edit.stage ?? "Lead"} onChange={(v) => setEdit({ ...edit, stage: v })} options={[...STAGES]} />}</Field><Field label="Notes">{(id) => <TextArea id={id} value={edit.notes ?? ""} onChange={(v) => setEdit({ ...edit, notes: v })} />}</Field></div>}</Drawer>
    </>
  );
}

/* ============ A053 Backlog with drag prioritisation ============ */
type BItem = { id: string; title: string; pts: number; tag: string };
const B0: BItem[] = [["Add SSO to admin", 8, "auth"], ["Dock 8 leveller repair workflow", 3, "ops"], ["Export report as PDF", 5, "reports"], ["ESPHome OTA progress UI", 5, "esp"], ["Saved views in orders table", 3, "tables"], ["Dark-mode screenshots in CI", 2, "ci"], ["Kiosk idle-timeout setting", 1, "kiosk"], ["Webhook retries dashboard", 5, "tools"], ["Fix calendar week view on mobile", 2, "bug"]].map(([title, pts, tag], i) => ({ id: `b${i}`, title: title as string, pts: pts as number, tag: tag as string }));
export function Backlog() {
  const { toast } = usePrefs(); const [items, setItems] = useState(B0); const [cap, setCap] = useState(12); const [drag, setDrag] = useState<number | null>(null); const [over, setOver] = useState<number | null>(null); const [text, setText] = useState("");
  let run = 0; const cut = items.findIndex((i) => (run += i.pts) > cap);
  const mv = (from: number, to: number) => { setItems((x) => move(x, from, to)); };
  const onKey = (e: React.KeyboardEvent, i: number) => { if (e.altKey && e.key === "ArrowUp") { e.preventDefault(); mv(i, i - 1); } if (e.altKey && e.key === "ArrowDown") { e.preventDefault(); mv(i, i + 1); } };
  return (
    <>
      <PageHeader title="Backlog" crumbs={["Views", "Backlog"]} desc="Rank by dragging the grip, or focus a row and press Alt+↑ / Alt+↓. Everything above the line fits the sprint." actions={<div style={{ width: 200 }}><Segmented label="Sprint capacity" value={String(cap)} onChange={(v) => setCap(Number(v))} options={[{ value: "8", label: "8 pts" }, { value: "12", label: "12 pts" }, { value: "20", label: "20 pts" }]} /></div>} />
      <Panel flush><ul className="adm-list vw-backlog">{items.map((it, i) => (<>
        {i === cut && <li key={`cut${i}`} style={{ padding: "4px 16px", background: "var(--jp-surface)", color: "var(--jp-text-muted)", fontSize: "var(--jp-fs-xs)" }}>— sprint line: {cap} pts capacity —</li>}
        <li key={it.id} className={`${drag === i ? "is-drag" : ""} ${over === i ? "is-over" : ""}`} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => { e.preventDefault(); setOver(i); }} onDragLeave={() => setOver(null)} onDrop={() => { if (drag !== null) mv(drag, i); setDrag(null); setOver(null); }} onDragEnd={() => { setDrag(null); setOver(null); }} tabIndex={0} onKeyDown={(e) => onKey(e, i)} aria-label={`${i + 1}. ${it.title}, ${it.pts} points`} style={{ opacity: cut >= 0 && i >= cut ? 0.7 : 1 }}>
          <span className="vw-grip" aria-hidden>⠿</span><b className="adm-num" style={{ width: 24 }}>{i + 1}</b><span style={{ flex: 1 }}>{it.title}</span><Badge>{it.tag}</Badge><Badge pill>{it.pts} pt</Badge>
          <Btn sm variant="ghost" aria-label={`Move ${it.title} up`} disabled={i === 0} onClick={() => mv(i, i - 1)}>↑</Btn><Btn sm variant="ghost" aria-label={`Move ${it.title} down`} disabled={i === items.length - 1} onClick={() => mv(i, i + 1)}>↓</Btn><Btn sm variant="ghost" onClick={() => mv(i, 0)}>Top</Btn>
          <button className="adm-x" aria-label={`Remove ${it.title}`} onClick={() => { const old = items; setItems(items.filter((x) => x.id !== it.id)); toast({ kind: "warn", title: "Removed from backlog", undo: () => setItems(old) }); }}>×</button></li></>))}</ul></Panel>
      <form className="adm-row" style={{ marginTop: 12 }} onSubmit={(e) => { e.preventDefault(); if (text.trim()) { setItems((x) => [...x, { id: `b${Date.now()}`, title: text.trim(), pts: 3, tag: "new" }]); setText(""); } }}><div style={{ width: 340 }}><TextInput value={text} onChange={setText} placeholder="Add an item to the bottom…" aria-label="New backlog item" /></div><Btn type="submit">Add</Btn><span className="jp-muted adm-num">{items.reduce((a, i) => a + i.pts, 0)} pts total</span></form>
    </>
  );
}
void useEffect; void NOW0; void people;
