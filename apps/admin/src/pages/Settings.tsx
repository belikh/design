import { useMemo, useState } from "react";
import { PageHeader, Panel, Btn, Badge, Tabs, Alert, ConfirmDelete, Avatar, Dot, CodeBlock } from "@belikh/jupiter-ui/kit.tsx";
import { Field, TextInput, PasswordInput, Switch, Checkbox, Select, OtpInput, TextArea } from "@belikh/jupiter-ui/inputs.tsx";
import { Donut, ProgressBar } from "@belikh/jupiter-ui/Charts.tsx";
import { people, money } from "../data/fixtures.ts";
import { PricingCards } from "@belikh/jupiter-ui/extra.tsx";
import { Segmented } from "@belikh/jupiter-ui/inputs.tsx";
import { LANGS } from "@belikh/jupiter-ui/i18n.ts";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { SaveStatusText, useAutosave, useDraft, useUnsavedGuard } from "@belikh/jupiter-ui/forms.tsx";
import { createCollection } from "@belikh/jupiter-ui/mock.ts";

/** Autosaving settings: no Save button. Edits are kept as a draft until saved, so a reload or a stray click doesn't lose them. */
const settingsStore = createCollection([{ id: "general", name: "Jupiter", description: "Household fleet and design system.", region: "ap-southeast-2" }]);
export function GeneralSettings() {
  const { value, setValue, restored, discard, clear } = useDraft("settings-general", { name: "Jupiter", description: "Household fleet and design system.", region: "ap-southeast-2" });
  const { status, error, retry } = useAutosave(value, async (v) => { if (!v.name.trim()) return "Workspace name is required"; await settingsStore.update("general", v); clear(); return null; });
  useUnsavedGuard(status === "saving" || status === "error");
  const set = (k: keyof typeof value) => (v: string) => setValue((x) => ({ ...x, [k]: v }));
  return (
    <Panel title="General" actions={<SaveStatusText status={status} error={error} onRetry={retry} />}>
      <div className="adm-stack">
        {restored && <Alert s="info" title="Restored your unsaved changes">These edits were kept from your last visit. <button type="button" className="adm-link" onClick={discard}>Discard them</button></Alert>}
        <Field label="Workspace name">{(id) => <TextInput id={id} value={value.name} onChange={set("name")} />}</Field>
        <Field label="Description">{(id) => <TextArea id={id} value={value.description} onChange={set("description")} />}</Field>
        <Field label="Default region">{(id) => <Select id={id} value={value.region} onChange={set("region")} options={["ap-southeast-2", "us-east-1"]} />}</Field>
        <p className="jp-muted">Changes save automatically.</p>
      </div>
    </Panel>
  );
}

const EVENTS = ["Deploy finished", "Alert raised", "Invoice paid", "New sign-in", "Weekly digest"]; const CH = ["In-app", "Email", "Push"];
export function Settings() {
  const { toast, theme, setTheme, density, setDensity, contrast, setContrast, lang, setLang, editCommit, setEditCommit } = usePrefs(); const [plan, setPlan] = useState("pro"); const [tab, setTab] = useState("general"); const [q, setQ] = useState("");
  const [matrix, setMatrix] = useState<Record<string, boolean>>({ "0-0": true, "0-1": true, "1-0": true, "1-1": true, "1-2": true, "2-1": true, "3-1": true, "4-1": true });
  const [pw, setPw] = useState(""); const [twofa, setTwofa] = useState(false); const [otp, setOtp] = useState(""); const [reveal, setReveal] = useState(false); const [del, setDel] = useState(false); const [key, setKey] = useState("jp_live_8f2c1d9a47e6b3a0c5d1");
  const [sessions, setSessions] = useState([{ id: 1, dev: "Firefox on CachyOS", ip: "10.1.1.124", cur: true, when: "now" }, { id: 2, dev: "Safari on iPhone", ip: "203.0.113.9", cur: false, when: "2h ago" }, { id: 3, dev: "Chrome on Windows 98 (VM)", ip: "10.1.1.50", cur: false, when: "3d ago" }]);
  const [members, setMembers] = useState(people.slice(0, 5).map((p, i) => ({ name: p, role: ["owner", "admin", "editor", "editor", "viewer"][i] }))); const [invite, setInvite] = useState("");
  const tabs = useMemo(() => [{ id: "general", label: "General" }, { id: "appearance", label: "Appearance" }, { id: "notifications", label: "Notifications" }, { id: "security", label: "Security" }, { id: "api", label: "API keys" }, { id: "billing", label: "Billing" }, { id: "team", label: "Team", count: members.length }, { id: "danger", label: "Danger zone" }].filter((t) => !q || t.label.toLowerCase().includes(q.toLowerCase())), [q, members.length]);
  const cur = tabs.find((t) => t.id === tab) ? tab : tabs[0]?.id;
  return (
    <>
      <PageHeader title="Settings" desc="Vertical tabs, a settings search, notification matrix, security, API keys, billing, team and a danger zone." crumbs={["Records", "Settings"]} />
      <div className="adm-settings">
        <div className="adm-stack"><TextInput value={q} onChange={setQ} placeholder="Search settings…" aria-label="Search settings" /><Tabs variant="vertical" value={cur ?? ""} onChange={setTab} tabs={tabs} /></div>
        <div className="adm-stack">
          {cur === "general" && <GeneralSettings />}
          {cur === "appearance" && <Panel title="Appearance and language"><div className="adm-stack"><div><div className="jp-label">Theme</div><Segmented label="Theme" value={theme} onChange={setTheme} options={[{ value: "auto", label: "Auto" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} /></div><div><div className="jp-label">Density</div><Segmented label="Density" value={density} onChange={setDensity} options={[{ value: "comfortable", label: "Comfortable" }, { value: "compact", label: "Compact" }]} /></div><div><div className="jp-label">Contrast</div><Segmented label="Contrast" value={contrast} onChange={setContrast} options={[{ value: "normal", label: "Normal" }, { value: "high", label: "High contrast" }]} /></div><div><div className="jp-label">Commit edits (inline fields and tables)</div><Segmented label="Commit edits" value={editCommit} onChange={setEditCommit} options={[{ value: "blur", label: "When I click away" }, { value: "explicit", label: "With Save and Cancel" }]} /></div><div><div className="jp-label">Language (Arabic switches to right-to-left)</div><Segmented label="Language" value={lang} onChange={setLang} options={LANGS.map((l) => ({ value: l.code, label: l.label }))} /></div></div></Panel>}
          {cur === "notifications" && <Panel title="Notification preferences" flush><table className="jp-table"><thead><tr><th>Event</th>{CH.map((c) => <th key={c} style={{ textAlign: "center" }}>{c}</th>)}</tr></thead><tbody>{EVENTS.map((e, r) => <tr key={e}><td>{e}</td>{CH.map((c, i) => <td key={c} style={{ textAlign: "center" }}><Checkbox checked={!!matrix[`${r}-${i}`]} onChange={(v) => setMatrix({ ...matrix, [`${r}-${i}`]: v })} label={<span className="adm-sr">{e} via {c}</span>} /></td>)}</tr>)}</tbody></table></Panel>}
          {cur === "security" && <>
            <Panel title="Password"><div className="adm-stack" style={{ maxWidth: 420 }}><Field label="New password">{(id) => <PasswordInput id={id} value={pw} onChange={setPw} />}</Field><Btn variant="primary" disabled={pw.length < 10} onClick={() => { toast({ kind: "ok", title: "Password changed" }); setPw(""); }}>Update password</Btn></div></Panel>
            <Panel title="Two-factor authentication" actions={<Switch checked={twofa} onChange={setTwofa} label={twofa ? "Enabled" : "Disabled"} />}>{twofa ? <div className="adm-stack"><p>Enter the 6-digit code from your authenticator app to confirm.</p><OtpInput value={otp} onChange={setOtp} /><Btn variant="primary" disabled={otp.length < 6} style={{ width: "fit-content" }} onClick={() => toast({ kind: "ok", title: "2FA confirmed" })}>Confirm</Btn></div> : <p className="jp-muted">Add a second step to protect your account.</p>}</Panel>
            <Panel title="Active sessions" flush><ul className="adm-list">{sessions.map((s) => <li key={s.id}><Dot s={s.cur ? "ok" : "off"} /><div className="adm-list__main"><b>{s.dev}</b><span className="jp-muted adm-num">{s.ip} · {s.when}</span></div>{s.cur ? <Badge s="ok">this device</Badge> : <Btn sm onClick={() => { setSessions((x) => x.filter((y) => y.id !== s.id)); toast({ kind: "warn", title: "Session revoked" }); }}>Revoke</Btn>}</li>)}</ul></Panel></>}
          {cur === "api" && <Panel title="API keys"><div className="adm-stack"><Alert s="warn" title="Keep keys secret">Anyone with a key can act as you.</Alert><div className="adm-row"><code className="adm-num" style={{ flex: 1, padding: "6px 10px", background: "var(--jp-surface)", border: "1px solid var(--jp-border)", borderRadius: 6 }}>{reveal ? key : key.slice(0, 8) + "•".repeat(16)}</code><Btn sm onClick={() => setReveal(!reveal)}>{reveal ? "Hide" : "Reveal"}</Btn><Btn sm onClick={() => { navigator.clipboard?.writeText(key); toast({ kind: "ok", title: "Copied to clipboard" }); }}>Copy</Btn><Btn sm onClick={() => { setKey("jp_live_" + Math.random().toString(16).slice(2, 22)); toast({ kind: "warn", title: "Key rotated", body: "The old key stops working in 24h." }); }}>Rotate</Btn></div><CodeBlock label="curl" code={`curl https://api.jupiter.au/v1/orders \\\n  -H "Authorization: Bearer ${reveal ? key : "$JUPITER_KEY"}"`} /></div></Panel>}
          {cur === "billing" && <><div className="adm-grid adm-grid--2"><Panel title="Current plan" actions={<Badge s="info">Pro</Badge>}><div className="adm-stack"><b style={{ fontSize: "var(--jp-fs-xl)" }}>{money(49)}<small className="jp-muted"> / month</small></b><div><div className="adm-row" style={{ justifyContent: "space-between" }}><span>Seats</span><span className="adm-num">5 / 8</span></div><ProgressBar value={5} max={8} label="Seats" /></div><div><div className="adm-row" style={{ justifyContent: "space-between" }}><span>Storage</span><span className="adm-num">83 / 100 GB</span></div><ProgressBar value={83} s="warn" label="Storage" /></div></div></Panel><Panel title="Usage"><div className="adm-row" style={{ justifyContent: "center" }}><Donut size={150} thickness={20} parts={[{ label: "API", value: 62 }, { label: "Storage", value: 23 }, { label: "Egress", value: 15 }]} center={<><b>$61</b><span>this month</span></>} /></div></Panel></div>
            <Panel title="Plans"><PricingCards current={plan} onPick={(id) => { setPlan(id); toast({ kind: "ok", title: `Plan changed to ${id}` }); }} plans={[{ id: "free", name: "Free", price: "$0", desc: "Hobby projects", features: ["1 project", "Community support"] }, { id: "pro", name: "Pro", price: "$49", per: "/ month", desc: "Production", features: ["Unlimited projects", "Backups"], featured: true }, { id: "team", name: "Team", price: "$149", per: "/ month", desc: "SSO and audit log", features: ["Everything in Pro", "SSO"] }]} /></Panel>
            <Panel title="Invoices" flush><table className="jp-table"><tbody>{["INV-0042", "INV-0041", "INV-0040"].map((i, n) => <tr key={i}><td className="adm-num">{i}</td><td className="jp-muted">{["Nov", "Oct", "Sep"][n]} 2026</td><td className="jp-num">{money(49)}</td><td><Badge s="ok">paid</Badge></td></tr>)}</tbody></table></Panel></>}
          {cur === "team" && <Panel title="Members" flush actions={<div className="adm-row"><div style={{ width: 220 }}><TextInput value={invite} onChange={setInvite} placeholder="email to invite" aria-label="Invite email" /></div><Btn sm variant="primary" disabled={!/.+@.+\..+/.test(invite)} onClick={() => { setMembers([...members, { name: invite, role: "viewer" }]); setInvite(""); toast({ kind: "ok", title: "Invite sent" }); }}>Invite</Btn></div>}><ul className="adm-list">{members.map((m, i) => <li key={m.name}><Avatar name={m.name} size={32} /><b style={{ flex: 1 }}>{m.name}</b><div style={{ width: 130 }}><Select value={m.role} onChange={(v) => setMembers(members.map((x, j) => (j === i ? { ...x, role: v } : x)))} aria-label={`Role for ${m.name}`} options={["owner", "admin", "editor", "viewer"]} disabled={m.role === "owner"} /></div></li>)}</ul></Panel>}
          {cur === "danger" && <Panel title="Danger zone" className="adm-danger-zone"><div className="adm-row" style={{ justifyContent: "space-between" }}><div><b>Delete this workspace</b><p className="jp-muted">Removes all projects, keys and members. This cannot be undone.</p></div><Btn variant="primary" className="adm-danger" onClick={() => setDel(true)}>Delete workspace…</Btn></div></Panel>}
        </div>
      </div>
      <ConfirmDelete open={del} what="jupiter" onClose={() => setDel(false)} onConfirm={() => { setDel(false); toast({ kind: "danger", title: "Workspace deleted (demo)" }); }} />
    </>
  );
}
