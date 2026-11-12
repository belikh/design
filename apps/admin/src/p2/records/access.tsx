import { useMemo, useState } from "react";
import "./records.css";
import { PageHeader, Panel, Btn, Badge, Modal, ConfirmDelete, Avatar, Dot, Alert, Tabs, EmptyState, Menu } from "@belikh/jupiter-ui/kit.tsx";
import { Checkbox, Field, Select, TextArea, TextInput, Switch } from "@belikh/jupiter-ui/inputs.tsx";
import { ProgressBar } from "@belikh/jupiter-ui/Charts.tsx";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { ACTIONS, can, source, wouldCycle, type Role } from "./logic.ts";
import { CHANNELS, EVENTS, canChangeRole, countOn, deliver, preset, seatsLeft, parseEmails, type Matrix, type Member } from "./access.logic.ts";
import { people } from "../../data/fixtures.ts";

/* ---------- A064 roles matrix ---------- */
const RESOURCES = ["orders", "customers", "invoices", "settings", "audit", "api-keys"];
const ROLES0: Role[] = [
  { id: "viewer", name: "Viewer", grants: { orders: ["read"], customers: ["read"], invoices: ["read"] } },
  { id: "editor", name: "Editor", inherits: "viewer", grants: { orders: ["create", "update"], customers: ["create", "update"] } },
  { id: "billing", name: "Billing", inherits: "viewer", grants: { invoices: ["create", "update", "delete"] } },
  { id: "admin", name: "Admin", inherits: "editor", grants: { orders: ["delete", "admin"], customers: ["delete"], settings: ["read", "update", "admin"], audit: ["read"], "api-keys": ["read", "create", "delete"] } },
];
export function RolesMatrix() {
  const { toast } = usePrefs(); const [roles, setRoles] = useState(ROLES0); const [sel, setSel] = useState("editor"); const [newOpen, setNewOpen] = useState(false); const [name, setName] = useState(""); const [del, setDel] = useState<Role | null>(null);
  const [probe, setProbe] = useState({ res: "orders", act: "delete" }); const role = roles.find((r) => r.id === sel)!;
  const toggle = (res: string, act: string, on: boolean) => setRoles((rs) => rs.map((r) => { if (r.id !== sel) return r; const cur = new Set(r.grants[res] ?? []); on ? cur.add(act) : cur.delete(act); return { ...r, grants: { ...r.grants, [res]: [...cur] } }; }));
  const setParent = (p: string) => { if (p && wouldCycle(roles, sel, p)) { toast({ kind: "danger", title: "That would create a cycle", body: `${roles.find((r) => r.id === p)?.name} already inherits from ${role.name}.` }); return; } setRoles((rs) => rs.map((r) => (r.id === sel ? { ...r, inherits: p || undefined } : r))); };
  const why = source(roles, sel, probe.res, probe.act); const allowed = can(roles, sel, probe.res, probe.act);
  const members = people.slice(0, 6).map((p, i) => ({ p, role: ["admin", "editor", "editor", "billing", "viewer", "viewer"][i] }));
  return (
    <>
      <PageHeader title="Roles and permissions" crumbs={["Records", "Roles"]} desc="A role × resource × action matrix with inheritance. Inherited permissions are locked and show where they come from." actions={<Btn variant="primary" icon="plus" onClick={() => setNewOpen(true)}>New role</Btn>} />
      <div className="adm-grid adm-grid--12">
        <Panel title="Roles" flush><ul className="adm-list" role="listbox" aria-label="Roles">{roles.map((r) => <li key={r.id} role="option" aria-selected={sel === r.id} tabIndex={0} className={sel === r.id ? "is-sel" : ""} style={{ cursor: "pointer" }} onClick={() => setSel(r.id)} onKeyDown={(e) => e.key === "Enter" && setSel(r.id)}><div className="adm-list__main"><b>{r.name}</b><span className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>{r.inherits ? `inherits ${roles.find((x) => x.id === r.inherits)?.name}` : "base role"} · {members.filter((m) => m.role === r.id).length} members</span></div></li>)}</ul></Panel>
        <div className="adm-stack">
          <Panel className="rec-wrapbar" title={`${role.name}: permissions`} actions={<div className="adm-row"><span className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>Inherits from</span><div style={{ width: 150 }}><Select value={role.inherits ?? ""} onChange={setParent} aria-label="Inherits from" options={[{ value: "", label: "(none)" }, ...roles.filter((r) => r.id !== sel).map((r) => ({ value: r.id, label: r.name }))]} /></div><Btn sm variant="ghost" className="adm-danger-text" onClick={() => setDel(role)}>Delete role</Btn></div>} flush>
            <div className="adm-dt__wrap"><table className="jp-table adm-table"><thead><tr><th>Resource</th>{ACTIONS.map((a) => <th key={a} style={{ textAlign: "center" }}>{a}</th>)}</tr></thead>
              <tbody>{RESOURCES.map((res) => <tr key={res}><th scope="row" className="adm-num" style={{ fontWeight: 600 }}>{res}</th>{ACTIONS.map((a) => { const src = source(roles, sel, res, a); const own = src === "own"; return <td key={a} style={{ textAlign: "center" }} title={src && !own ? `Inherited from ${src}` : undefined}><Checkbox checked={!!src} disabled={!!src && !own} onChange={(v) => toggle(res, a, v)} label={<span className="adm-sr">{role.name} {a} {res}{src && !own ? ` (inherited from ${src})` : ""}</span>} />{src && !own && <div className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>↳ {src}</div>}</td>; })}</tr>)}</tbody></table></div>
          </Panel>
          <Panel title="Can this role…? (explain)"><div className="adm-row"><span>Can <b>{role.name}</b></span><div style={{ width: 110 }}><Select value={probe.act} onChange={(act) => setProbe({ ...probe, act })} aria-label="Action" options={[...ACTIONS]} /></div><div style={{ width: 140 }}><Select value={probe.res} onChange={(res) => setProbe({ ...probe, res })} aria-label="Resource" options={RESOURCES} /></div><span>?</span><Badge s={allowed ? "ok" : "danger"}>{allowed ? "Yes" : "No"}</Badge><span className="jp-muted">{allowed ? (why === "own" ? "granted directly" : `inherited from ${why}`) : "no grant on this role or its ancestors"}</span></div></Panel>
        </div>
      </div>
      <Modal open={newOpen} onClose={() => setNewOpen(false)} size="sm" title="New role" footer={<><Btn onClick={() => setNewOpen(false)}>Cancel</Btn><Btn variant="primary" disabled={!name.trim() || roles.some((r) => r.name.toLowerCase() === name.trim().toLowerCase())} onClick={() => { const id = name.trim().toLowerCase().replace(/\W+/g, "-"); setRoles([...roles, { id, name: name.trim(), inherits: "viewer", grants: {} }]); setSel(id); setNewOpen(false); setName(""); toast({ kind: "ok", title: "Role created", body: "It inherits Viewer to start with." }); }}>Create</Btn></>}>
        <Field label="Role name" required error={roles.some((r) => r.name.toLowerCase() === name.trim().toLowerCase()) && name ? "A role with this name exists" : undefined}>{(id) => <TextInput id={id} value={name} onChange={setName} autoFocus />}</Field>
      </Modal>
      <ConfirmDelete open={!!del} what={del?.name ?? ""} onClose={() => setDel(null)} onConfirm={() => { if (!del) return; const users = members.filter((m) => m.role === del.id).length; if (users || roles.some((r) => r.inherits === del.id)) { toast({ kind: "danger", title: "Can’t delete", body: users ? `${users} member(s) still have this role.` : "Another role inherits from it." }); } else { setRoles(roles.filter((r) => r.id !== del.id)); setSel("viewer"); toast({ kind: "warn", title: "Role deleted" }); } setDel(null); }} />
    </>
  );
}

/* ---------- A080 team + invites ---------- */
const TEAM0: Member[] = people.slice(0, 5).map((p, i) => ({ id: `m${i}`, name: p, email: `${p.toLowerCase().replace(" ", ".")}@example.com`, role: (["owner", "admin", "editor", "editor", "viewer"] as const)[i] }));
export function Team() {
  const { toast } = usePrefs(); const LIMIT = 8; const [members, setMembers] = useState(TEAM0); const [invites, setInvites] = useState([{ email: "sam@contractor.io", role: "viewer", sent: "2d ago" }]);
  const [open, setOpen] = useState(false); const [text, setText] = useState(""); const [role, setRole] = useState("editor"); const [rm, setRm] = useState<Member | null>(null);
  const parsed = useMemo(() => parseEmails(text, [...members.map((m) => m.email), ...invites.map((i) => i.email)]), [text, members, invites]); const left = seatsLeft(LIMIT, members.length, invites.length); const over = parsed.valid.length > left;
  const change = (id: string, to: string) => { const r = canChangeRole(members, id, to as Member["role"]); if (!r.ok) { toast({ kind: "danger", title: "Can’t change role", body: r.why }); return; } setMembers((m) => m.map((x) => (x.id === id ? { ...x, role: to as Member["role"] } : x))); };
  return (
    <>
      <PageHeader title="Team" crumbs={["Records", "Team"]} desc="Members, roles and pending invites, with seat limits and last-admin protection." actions={<Btn variant="primary" icon="plus" onClick={() => setOpen(true)}>Invite people</Btn>} />
      <div className="adm-grid adm-grid--21">
        <div className="adm-stack">
          <Panel title="Members" flush><ul className="adm-list">{members.map((m) => <li key={m.id}><Avatar name={m.name} size={32} /><div className="adm-list__main"><b>{m.name}</b><span className="jp-muted">{m.email}</span></div><div style={{ width: 130 }}><Select value={m.role} onChange={(v) => change(m.id, v)} aria-label={`Role for ${m.name}`} disabled={m.role === "owner"} options={m.role === "owner" ? ["owner"] : ["admin", "editor", "viewer"]} /></div><Menu label="•••" items={[{ label: "Resend welcome email", onSelect: () => toast({ kind: "info", title: "Email sent" }) }, "sep", { label: "Remove from team", danger: true, onSelect: () => setRm(m) }]} /></li>)}</ul></Panel>
          <Panel title={`Pending invites (${invites.length})`} flush>{invites.length ? <ul className="adm-list">{invites.map((i) => <li key={i.email}><Icon name="mail" size={18} /><div className="adm-list__main"><b>{i.email}</b><span className="jp-muted">{i.role} · sent {i.sent} · expires in 5 days</span></div><Btn sm onClick={() => toast({ kind: "info", title: "Invite resent" })}>Resend</Btn><Btn sm variant="ghost" onClick={() => { setInvites(invites.filter((x) => x.email !== i.email)); toast({ kind: "warn", title: "Invite revoked" }); }}>Revoke</Btn></li>)}</ul> : <EmptyState spot="inbox-zero" title="No pending invites" />}</Panel>
        </div>
        <Panel title="Seats"><div className="adm-stack"><b style={{ fontSize: "var(--jp-fs-xl)" }}>{members.length + invites.length}<small className="jp-muted"> / {LIMIT}</small></b><ProgressBar value={members.length + invites.length} max={LIMIT} s={left === 0 ? "danger" : left <= 1 ? "warn" : undefined} label="Seats used" /><p className="jp-muted">{left} seat{left === 1 ? "" : "s"} left. Pending invites count towards the limit.</p>{left === 0 && <Alert s="warn" title="No seats left">Upgrade your plan to invite more people.</Alert>}</div></Panel>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Invite people" footer={<><Btn onClick={() => setOpen(false)}>Cancel</Btn><Btn variant="primary" disabled={!parsed.valid.length || over} onClick={() => { setInvites([...invites, ...parsed.valid.map((e) => ({ email: e, role, sent: "now" }))]); setOpen(false); setText(""); toast({ kind: "ok", title: `${parsed.valid.length} invite${parsed.valid.length === 1 ? "" : "s"} sent` }); }}>Send {parsed.valid.length || ""} invite{parsed.valid.length === 1 ? "" : "s"}</Btn></>}>
        <div className="adm-stack"><Field label="Email addresses" hint="Separate with commas, spaces or new lines">{(id) => <TextArea id={id} value={text} onChange={setText} placeholder="ava@example.com, noah@example.com" rows={3} />}</Field>
          <div className="adm-row">{parsed.valid.map((e) => <Badge key={e} s="ok">{e}</Badge>)}{parsed.invalid.map((e) => <Badge key={e} s="danger">invalid: {e}</Badge>)}{parsed.already.map((e) => <Badge key={e} s="warn">already invited: {e}</Badge>)}{parsed.dupes.map((e) => <Badge key={e}>duplicate: {e}</Badge>)}</div>
          <Field label="Role">{(id) => <Select id={id} value={role} onChange={setRole} options={["admin", "editor", "viewer"]} />}</Field>{over && <Alert s="danger" title={`Only ${left} seat${left === 1 ? "" : "s"} left`}>Remove some addresses or upgrade your plan.</Alert>}</div>
      </Modal>
      <ConfirmDelete open={!!rm} what={rm?.name ?? ""} onClose={() => setRm(null)} onConfirm={() => { if (!rm) return; if (rm.role === "owner") toast({ kind: "danger", title: "The owner can’t be removed" }); else { setMembers(members.filter((m) => m.id !== rm.id)); toast({ kind: "warn", title: `${rm.name} removed` }); } setRm(null); }} />
    </>
  );
}

/* ---------- A079 sessions and devices ---------- */
type Sess = { id: number; dev: string; browser: string; where: string; ip: string; last: string; current?: boolean; risk?: string; trusted?: boolean };
const SESS0: Sess[] = [{ id: 1, dev: "CachyOS desktop", browser: "Firefox 140", where: "Brisbane, AU", ip: "10.1.1.124", last: "now", current: true, trusted: true }, { id: 2, dev: "iPhone 15", browser: "Safari", where: "Brisbane, AU", ip: "203.0.113.9", last: "2h ago", trusted: true }, { id: 3, dev: "Windows 98 VM", browser: "Netscape 4.7", where: "Brisbane, AU", ip: "10.1.1.50", last: "3d ago" }, { id: 4, dev: "Unknown Linux", browser: "curl/8", where: "Frankfurt, DE", ip: "198.51.100.7", last: "5h ago", risk: "New country" }];
const HIST = [["Today 16:02", "Sign in", "Brisbane, AU", "success"], ["Today 11:40", "Sign in", "Frankfurt, DE", "blocked"], ["Yesterday 09:15", "Sign in", "Brisbane, AU", "success"], ["Mon 20:31", "Password check", "Brisbane, AU", "failed"], ["Mon 20:32", "Sign in", "Brisbane, AU", "success"]];
export function Sessions() {
  const { toast } = usePrefs(); const [ss, setSs] = useState(SESS0); const [confirm, setConfirm] = useState(false); const [tab, setTab] = useState("sessions");
  const revoke = (id: number) => { const old = ss; setSs(ss.filter((s) => s.id !== id)); toast({ kind: "warn", title: "Session revoked", undo: () => setSs(old) }); };
  return (
    <>
      <PageHeader title="Sessions and devices" crumbs={["Records", "Sessions"]} desc="See where you’re signed in, revoke anything you don’t recognise, and review sign-in history." actions={<Btn variant="primary" className="adm-danger" disabled={ss.length <= 1} onClick={() => setConfirm(true)}>Sign out all other sessions</Btn>}
        tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: "sessions", label: "Active", count: ss.length }, { id: "history", label: "Sign-in history" }]} />} />
      {ss.some((s) => s.risk) && <div style={{ marginBottom: 12 }}><Alert s="warn" title="Unrecognised session">A session from Frankfurt, DE looks unusual. Revoke it if it isn’t you.</Alert></div>}
      {tab === "sessions" ? <Panel flush><ul className="adm-list">{ss.map((s) => <li key={s.id}><Dot s={s.current ? "ok" : s.risk ? "danger" : "off"} /><div className="adm-list__main"><span className="adm-row"><b>{s.dev}</b>{s.current && <Badge s="ok">this device</Badge>}{s.risk && <Badge s="danger">{s.risk}</Badge>}</span><span className="jp-muted adm-num" style={{ fontSize: "var(--jp-fs-xs)" }}>{s.browser} · {s.where} · {s.ip} · {s.last}</span></div>
        {!s.current && <Switch checked={!!s.trusted} onChange={(v) => setSs(ss.map((x) => (x.id === s.id ? { ...x, trusted: v } : x)))} label="Trusted" />}{!s.current && <Btn sm onClick={() => revoke(s.id)}>Revoke</Btn>}</li>)}</ul></Panel>
        : <Panel flush><table className="jp-table"><thead><tr><th>When</th><th>Event</th><th>Where</th><th>Outcome</th></tr></thead><tbody>{HIST.map(([w, e, p, o]) => <tr key={w + e}><td className="adm-num">{w}</td><td>{e}</td><td>{p}</td><td><Badge s={o === "success" ? "ok" : o === "blocked" ? "danger" : "warn"}>{o}</Badge></td></tr>)}</tbody></table></Panel>}
      <Modal open={confirm} onClose={() => setConfirm(false)} size="sm" title="Sign out other sessions?" footer={<><Btn onClick={() => setConfirm(false)}>Cancel</Btn><Btn variant="primary" className="adm-danger" onClick={() => { const old = ss; setSs(ss.filter((s) => s.current)); setConfirm(false); toast({ kind: "warn", title: `${old.length - 1} sessions signed out`, undo: () => setSs(old) }); }}>Sign out {ss.length - 1}</Btn></>}><p>Every device except this one will need to sign in again.</p></Modal>
    </>
  );
}

/* ---------- A078 notification preferences matrix ---------- */
export function NotificationMatrix() {
  const { toast } = usePrefs(); const [base, setBase] = useState<Matrix>(preset("all")); const [proj, setProj] = useState<Matrix>(preset("essential")); const [override, setOverride] = useState(false); const [digest, setDigest] = useState<Record<string, string>>({ "Weekly digest": "weekly" });
  const [quiet, setQuiet] = useState({ on: true, from: "22:00", to: "07:00" }); const [muted, setMuted] = useState(false); const [test, setTest] = useState({ ev: "Alert raised", ch: "Email", at: "23:00" });
  const m = override ? proj : base; const set = override ? setProj : setBase; const flip = (e: string, c: string, v: boolean) => set((x) => ({ ...x, [e]: { ...x[e], [c]: v } }));
  const would = !muted && deliver(m, test.ev, test.ch, test.at, quiet);
  return (
    <>
      <PageHeader title="Notification preferences" crumbs={["Records", "Notifications"]} desc="Event × channel matrix with presets, a per-project override, digests, quiet hours and a delivery tester." actions={<Switch checked={muted} onChange={setMuted} label="Mute everything" />} />
      <div className="adm-row" style={{ marginBottom: 12 }}>
        <Btn sm onClick={() => set(preset("all"))}>All</Btn><Btn sm onClick={() => set(preset("essential"))}>Essential only</Btn><Btn sm onClick={() => set(preset("none"))}>None</Btn><span className="adm-spacer" /><Switch checked={override} onChange={setOverride} label="Override for project “Jupiter”" /><Badge>{countOn(m)} of {EVENTS.length * CHANNELS.length} on</Badge>
      </div>
      <div style={{ opacity: muted ? 0.5 : 1 }}><Panel flush><div className="adm-dt__wrap"><table className="jp-table adm-table"><thead><tr><th>Event</th>{CHANNELS.map((c) => <th key={c} style={{ textAlign: "center" }}>{c}</th>)}<th>Frequency</th></tr></thead>
        <tbody>{EVENTS.map((e) => <tr key={e}><th scope="row" style={{ fontWeight: 600 }}>{e}</th>{CHANNELS.map((c) => <td key={c} style={{ textAlign: "center" }}><Checkbox checked={!!m[e][c]} disabled={muted} onChange={(v) => flip(e, c, v)} label={<span className="adm-sr">{e} via {c}</span>} /></td>)}<td style={{ width: 130 }}><Select value={digest[e] ?? "instant"} onChange={(v) => setDigest({ ...digest, [e]: v })} aria-label={`Frequency for ${e}`} options={["instant", "hourly", "daily", "weekly"]} /></td></tr>)}</tbody></table></div></Panel></div>
      <div className="adm-grid adm-grid--2" style={{ marginTop: 16 }}>
        <Panel title="Quiet hours"><div className="adm-stack"><Switch checked={quiet.on} onChange={(on) => setQuiet({ ...quiet, on })} label="Silence non-essential notifications" /><div className="adm-row"><Field label="From">{(id) => <input id={id} type="time" className="jp-input" value={quiet.from} onChange={(e) => setQuiet({ ...quiet, from: e.target.value })} />}</Field><Field label="To">{(id) => <input id={id} type="time" className="jp-input" value={quiet.to} onChange={(e) => setQuiet({ ...quiet, to: e.target.value })} />}</Field></div><p className="jp-muted">Alerts and new sign-ins always get through.</p></div></Panel>
        <Panel title="Will it be delivered?"><div className="adm-stack"><div className="adm-row"><div style={{ width: 160 }}><Select value={test.ev} onChange={(ev) => setTest({ ...test, ev })} aria-label="Event" options={[...EVENTS]} /></div><div style={{ width: 110 }}><Select value={test.ch} onChange={(ch) => setTest({ ...test, ch })} aria-label="Channel" options={[...CHANNELS]} /></div><input type="time" aria-label="At time" className="jp-input" style={{ width: 120 }} value={test.at} onChange={(e) => setTest({ ...test, at: e.target.value })} /></div><div className="adm-row"><Badge s={would ? "ok" : "danger"}>{would ? "Delivered" : "Held back"}</Badge><span className="jp-muted">{muted ? "Everything is muted." : !m[test.ev][test.ch] ? "That channel is off for this event." : would ? "Matches your settings." : "Quiet hours are on and this isn’t essential."}</span></div><Btn sm onClick={() => toast({ kind: would ? "ok" : "warn", title: would ? `Test ${test.ch} notification sent` : "Test notification held back" })}>Send a test</Btn></div></Panel>
      </div>
    </>
  );
}
