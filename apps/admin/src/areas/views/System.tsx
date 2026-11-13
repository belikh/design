import { useEffect, useMemo, useState } from "react";
import "./views.css";
import { PageHeader, Panel, Badge, Btn, Tabs, Modal, Alert, EmptyState, Accordion, type Status } from "@belikh/jupiter-ui/kit.tsx";
import { AnchorNav } from "@belikh/jupiter-ui/extra.tsx";
import { Segmented, TextInput, TextArea, Select, Checkbox, Switch, Field, Combobox, FileDrop, RadioCards } from "@belikh/jupiter-ui/inputs.tsx";
import { Icon, Spot } from "@belikh/jupiter-ui/Icon.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { useStored } from "./shared.tsx";
import { changelog } from "./data.ts";

/* ============ A127 Account locked, session expired, consent ============ */
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
type Consent = { necessary: true; analytics: boolean; marketing: boolean; at?: string };
export function AccountStates() {
  const { toast } = usePrefs(); const [tab, setTab] = useState("locked"); const [lock, setLock] = useState(15 * 60); const [cool, setCool] = useState(0); const [sent, setSent] = useState(false);
  const [idle, setIdle] = useState(false); const [left, setLeft] = useState(60); const [expired, setExpired] = useState(false);
  const [consent, setConsent] = useStored<Consent | null>("vw-consent", null); const [manage, setManage] = useState(false); const [draft, setDraft] = useState<Consent>({ necessary: true, analytics: false, marketing: false });
  useEffect(() => { const i = setInterval(() => { setLock((l) => Math.max(0, l - 1)); setCool((c) => Math.max(0, c - 1)); }, 1000); return () => clearInterval(i); }, []);
  useEffect(() => { if (!idle) return; const i = setInterval(() => setLeft((l) => { if (l <= 1) { setIdle(false); setExpired(true); setTab("expired"); return 60; } return l - 1; }), 1000); return () => clearInterval(i); }, [idle]);
  const save = (c: Consent) => { const v = { ...c, at: "2026-11-12 16:52" }; setConsent(v); setManage(false); toast({ kind: "ok", title: "Consent saved", body: `Analytics ${v.analytics ? "on" : "off"}, marketing ${v.marketing ? "on" : "off"}` }); };
  return (
    <>
      <PageHeader title="Account states" crumbs={["Views", "Account states"]} desc="The screens people hit when something about their account stops them: a lockout, an expired session, and consent." tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: "locked", label: "Account locked" }, { id: "expired", label: "Session expired" }, { id: "consent", label: "Consent" }]} />} />
      {tab === "locked" && <div className="vw-frame"><div className="vw-center"><Spot name="locked" size={140} /><h1>Your account is locked</h1>
        <p className="jp-muted">Too many failed sign-in attempts. {lock > 0 ? <>It unlocks automatically in <b className="adm-num">{mmss(lock)}</b>.</> : <b>You can sign in again now.</b>}</p>
        {lock > 0 ? <ProgressNote pct={100 - (lock / 900) * 100} /> : <Btn variant="primary" onClick={() => { setLock(15 * 60); toast({ kind: "info", title: "Back to sign in (demo)" }); }}>Sign in</Btn>}
        <div className="adm-row" style={{ justifyContent: "center" }}><Btn disabled={cool > 0} onClick={() => { setSent(true); setCool(30); }}>{cool > 0 ? `Resend in ${cool}s` : sent ? "Resend unlock email" : "Email me an unlock link"}</Btn><Btn variant="ghost">Contact an admin</Btn></div>{sent && <Alert s="ok" title="Check your inbox">We sent a one-time unlock link to your registered email.</Alert>}</div></div>}
      {tab === "expired" && <div className="vw-frame"><div className="vw-center"><Spot name="offline" size={140} /><h1>{expired ? "You were signed out" : "Session expired"}</h1><p className="jp-muted">{expired ? "You were inactive for too long, so we signed you out to keep your account safe." : "Your session ended. Sign in again to continue where you left off."}</p>
        <div className="adm-row" style={{ justifyContent: "center" }}><Btn variant="primary" onClick={() => { setExpired(false); toast({ kind: "ok", title: "Signed in again (demo)", body: "Returning you to /orders" }); }}>Sign in again</Btn></div>
        <p className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>We'll take you back to <code>/orders</code>. Unsaved changes in other tabs may be lost.</p>
        <Btn variant="ghost" onClick={() => { setIdle(true); setLeft(10); }}>Preview the idle warning</Btn></div></div>}
      {tab === "consent" && <div className="adm-stack" style={{ maxWidth: 720 }}>
        <Panel title="Your choices">{consent ? <div className="adm-stack"><dl className="adm-dl"><dt>Necessary</dt><dd>Always on</dd><dt>Analytics</dt><dd>{consent.analytics ? "Allowed" : "Not allowed"}</dd><dt>Marketing</dt><dd>{consent.marketing ? "Allowed" : "Not allowed"}</dd><dt>Recorded</dt><dd>{consent.at}</dd></dl><div className="adm-row"><Btn onClick={() => { setDraft({ ...consent }); setManage(true); }}>Change choices</Btn><Btn variant="ghost" onClick={() => setConsent(null)}>Withdraw and ask again</Btn></div></div> : <p className="jp-muted">No choice recorded yet. The banner below is waiting for one.</p>}</Panel>
        <p className="jp-muted">Choices are stored in this browser (demo). Rejecting is as easy as accepting.</p></div>}
      {!consent && <div className="vw-consent" role="dialog" aria-label="Privacy choices"><div><b>We use cookies</b><p className="jp-muted" style={{ marginTop: 4 }}>Necessary cookies keep the site working. Optional analytics and marketing cookies are off unless you allow them.</p></div><div className="adm-row"><Btn onClick={() => save({ necessary: true, analytics: false, marketing: false })}>Reject optional</Btn><Btn onClick={() => { setDraft({ necessary: true, analytics: false, marketing: false }); setManage(true); }}>Manage</Btn><Btn variant="primary" onClick={() => save({ necessary: true, analytics: true, marketing: true })}>Accept all</Btn></div></div>}
      <Modal open={manage} onClose={() => setManage(false)} title="Manage preferences" size="sm" footer={<><Btn onClick={() => setManage(false)}>Cancel</Btn><Btn variant="primary" onClick={() => save(draft)}>Save choices</Btn></>}><div className="adm-stack"><Checkbox checked disabled label="Necessary (always on)" onChange={() => {}} /><Switch checked={draft.analytics} onChange={(v) => setDraft({ ...draft, analytics: v })} label="Analytics: helps us improve" /><Switch checked={draft.marketing} onChange={(v) => setDraft({ ...draft, marketing: v })} label="Marketing: personalised offers" /></div></Modal>
      <Modal open={idle} onClose={() => setIdle(false)} title="Still there?" size="sm" footer={<><Btn onClick={() => { setIdle(false); setExpired(true); setTab("expired"); }}>Sign out now</Btn><Btn variant="primary" onClick={() => { setIdle(false); toast({ kind: "ok", title: "Session extended" }); }}>Stay signed in</Btn></>}><p>You've been inactive. For your security you'll be signed out in <b className="adm-num">{left}s</b>.</p></Modal>
    </>
  );
}
const ProgressNote = ({ pct }: { pct: number }) => <div className="adm-progress__track" style={{ width: 260 }} role="progressbar" aria-valuenow={Math.round(pct)} aria-label="Lockout elapsed"><span style={{ width: `${pct}%` }} /></div>;

/* ============ A130 Changelog / what's new ============ */
const typeS: Record<string, Status> = { feature: "ok", fix: "info", improvement: "info", breaking: "danger" };
export function Changelog() {
  const { toast } = usePrefs(); const [type, setType] = useState("all"); const [q, setQ] = useState(""); const [seen, setSeen] = useStored("vw-changelog-seen", "1.0.2"); const [email, setEmail] = useState(""); const [err, setErr] = useState("");
  const list = changelog.filter((c) => (type === "all" || c.type === type) && (c.title + c.body).toLowerCase().includes(q.toLowerCase())); const versions = [...new Set(list.map((c) => c.v))];
  const isNew = (v: string) => v.localeCompare(seen, undefined, { numeric: true }) > 0;
  return (
    <>
      <PageHeader title="What's new" crumbs={["Views", "Changelog"]} desc="Release notes grouped by version, with what's new since you last looked." actions={<Btn variant="ghost" disabled={!isNew(changelog[0].v)} onClick={() => setSeen(changelog[0].v)}>Mark all as seen</Btn>} />
      <div className="adm-row" style={{ marginBottom: 16 }}><div style={{ width: 220 }}><TextInput value={q} onChange={setQ} placeholder="Search release notes…" aria-label="Search release notes" prefix={<Icon name="search" size={14} />} /></div><Segmented label="Type" value={type} onChange={setType} options={["all", "feature", "improvement", "fix", "breaking"].map((v) => ({ value: v, label: v }))} /></div>
      <div className="adm-grid adm-grid--21"><div className="adm-stack">{versions.length ? versions.map((v) => <Panel key={v} title={<span className="adm-row">v{v} {isNew(v) && <Badge s="info">new</Badge>}</span>} actions={<span className="jp-muted adm-num">{list.find((c) => c.v === v)?.date}</span>}><ul className="adm-list" style={{ margin: "-8px -16px" }}>{list.filter((c) => c.v === v).map((c, i) => <li key={i} style={{ alignItems: "flex-start" }}><Badge s={typeS[c.type]}>{c.type}</Badge><div className="adm-list__main"><b>{c.title}</b><span className="jp-muted">{c.body}</span></div></li>)}</ul></Panel>) : <EmptyState spot="no-results" title="No notes match">Try a different filter.</EmptyState>}</div>
        <Panel title="Get updates"><form className="adm-stack" onSubmit={(e) => { e.preventDefault(); if (!/.+@.+\..+/.test(email)) { setErr("Enter a valid email address"); return; } setErr(""); toast({ kind: "ok", title: "Subscribed", body: email }); setEmail(""); }} noValidate><Field label="Email" error={err}>{(id) => <TextInput id={id} type="email" value={email} onChange={setEmail} state={err ? "error" : undefined} />}</Field><Btn type="submit" variant="primary">Subscribe</Btn><Btn type="button" variant="ghost" onClick={() => { void navigator.clipboard?.writeText(`${location.origin}/p2/views/changelog`); toast({ kind: "info", title: "Link copied" }); }}>Copy link</Btn></form></Panel></div>
    </>
  );
}

/* ============ A131 Help centre / support request form ============ */
const KB = [["Reset my password", "Use “Forgot password” on the sign-in page; the link lasts 30 minutes."], ["Export my data", "Settings → General → Export. You'll get an email when it's ready."], ["Dock board is empty", "Turn on “Simulate arrivals”, or check a truck in at the driver kiosk."], ["Invoice is wrong", "Open the order, check the GST line, then raise a billing request here."], ["Chart export is blank", "Use the Export menu on the chart toolbar and choose SVG, PNG or CSV."]];
type Req = { id: string; subject: string; cat: string; sev: string; status: "open" | "answered" | "closed" };
export function Support() {
  const { toast } = usePrefs(); const [reqs, setReqs] = useStored<Req[]>("vw-support", [{ id: "SR-1021", subject: "Kiosk keyboard layout", cat: "Feedback", sev: "low", status: "answered" }, { id: "SR-1019", subject: "Cannot export orders", cat: "Bug", sev: "high", status: "open" }]);
  const [f, setF] = useState({ cat: "Bug", sev: "normal", subject: "", body: "", svc: [] as string[], contact: "email" as "email" | "phone" }); const [tried, setTried] = useState(false); const [done, setDone] = useState<string | null>(null);
  const hints = useMemo(() => (f.subject.trim().length < 3 ? [] : KB.filter(([t, b]) => (t + b).toLowerCase().split(/\W+/).some((w) => w.length > 3 && f.subject.toLowerCase().includes(w)))), [f.subject]);
  const errs = { subject: f.subject.trim().length < 5 ? "Give it a short, specific subject (5+ characters)" : "", body: f.body.trim().length < 20 ? "Describe what happened (at least 20 characters)" : "" };
  const submit = (e: React.FormEvent) => { e.preventDefault(); setTried(true); if (errs.subject || errs.body) return; const id = `SR-${1022 + reqs.length}`; setReqs([{ id, subject: f.subject.trim(), cat: f.cat, sev: f.sev, status: "open" }, ...reqs]); setDone(id); setF({ ...f, subject: "", body: "" }); setTried(false); toast({ kind: "ok", title: `Request ${id} created` }); };
  return (
    <>
      <PageHeader title="Contact support" crumbs={["Views", "Support"]} desc="Describe the problem; we suggest answers as you type the subject. The Help centre has the docs." actions={<a className="jp-btn jp-btn--secondary" href="/help">Help centre</a>} />
      <div className="adm-grid adm-grid--21">
        <Panel title="New request">{done && <div style={{ marginBottom: 12 }}><Alert s="ok" title={`Request ${done} received`} onClose={() => setDone(null)}>We'll reply by {f.contact}. Typical first response: 4 hours.</Alert></div>}
          <form className="adm-stack" onSubmit={submit} noValidate>
            <div className="adm-grid adm-grid--2"><Field label="Category">{(id) => <Select id={id} value={f.cat} onChange={(v) => setF({ ...f, cat: v })} options={["Bug", "Billing", "Account", "Feedback", "Other"]} />}</Field><Field label="Affected services">{(id) => <Combobox id={id} multi options={["jupiter-api", "media-archive", "dock board", "kiosk", "billing"]} value={f.svc} onChange={(v) => setF({ ...f, svc: v })} />}</Field></div>
            <div><div className="jp-label" style={{ marginBottom: 6 }}>Severity</div><RadioCards name="sev" value={f.sev} onChange={(v) => setF({ ...f, sev: v })} options={[{ value: "low", title: "Low", desc: "A question or small annoyance" }, { value: "normal", title: "Normal", desc: "Something is broken but there's a workaround" }, { value: "high", title: "High", desc: "Blocking my work" }]} /></div>
            <Field label="Subject" required error={tried ? errs.subject : undefined}>{(id) => <TextInput id={id} value={f.subject} onChange={(v) => setF({ ...f, subject: v })} state={tried && errs.subject ? "error" : undefined} />}</Field>
            {hints.length > 0 && <Alert s="info" title="These might help">{hints.map(([t, b]) => <div key={t}><b>{t}:</b> {b}</div>)}</Alert>}
            <Field label="What happened?" required counter={[f.body.length, 1000]} error={tried ? errs.body : undefined}>{(id) => <TextArea id={id} value={f.body} onChange={(v) => setF({ ...f, body: v })} max={1000} />}</Field>
            <div><div className="jp-label" style={{ marginBottom: 6 }}>Attachments</div><FileDrop /></div>
            <Segmented label="Contact me by" value={f.contact} onChange={(v) => setF({ ...f, contact: v })} options={[{ value: "email", label: "Email" }, { value: "phone", label: "Phone" }]} />
            <div className="adm-row"><Btn type="submit" variant="primary" icon="send">Send request</Btn></div></form></Panel>
        <div className="adm-stack"><Panel title="Your requests" flush><ul className="adm-list">{reqs.map((r) => <li key={r.id}><div className="adm-list__main"><b>{r.subject}</b><span className="jp-muted adm-num" style={{ fontSize: "var(--jp-fs-xs)" }}>{r.id} · {r.cat}</span></div><Badge s={r.sev === "high" ? "danger" : undefined}>{r.sev}</Badge><Badge s={r.status === "open" ? "warn" : "ok"}>{r.status}</Badge></li>)}</ul></Panel><Panel title="Quick answers"><Accordion items={KB.map(([t, b], i) => ({ id: String(i), title: t, body: b }))} /></Panel></div>
      </div>
    </>
  );
}

/* ============ A132 Legal / terms / privacy long-form reading layout ============ */
const LEGAL: [string, string][] = [["definitions", "1. Definitions"], ["using", "2. Using the service"], ["accounts", "3. Accounts and security"], ["content", "4. Your content"], ["privacy", "5. Privacy and data"], ["payment", "6. Payment and refunds"], ["liability", "7. Liability"], ["changes", "8. Changes to these terms"]];
const BODY = (t: string) => `${t} sets out how this service is provided and what we each agree to. It is written to be read: short sentences, plain words, and examples where a rule might surprise you. If something here is unclear, contact support and we will explain it and, where it helps, fix the wording. This is placeholder text for a design-system demo; it is not a legal document.`;
export function Legal() {
  const { toast } = usePrefs(); const [read, setRead] = useState(0); const [ok, setOk] = useState(false); const words = LEGAL.length * BODY("").split(" ").length;
  useEffect(() => { const el = document.getElementById("main"); if (!el) return; const h = () => setRead(Math.min(100, Math.round((el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight)) * 100))); el.addEventListener("scroll", h); return () => el.removeEventListener("scroll", h); }, []);
  return (
    <>
      <div className="adm-progress__track vw-noprint" style={{ position: "sticky", top: 0, zIndex: 5, height: 4, borderRadius: 0 }} role="progressbar" aria-valuenow={read} aria-label="Reading progress"><span style={{ width: `${read}%` }} /></div>
      <PageHeader title="Terms of service" crumbs={["Views", "Legal"]} desc={`Version 3.2 · last updated 1 Nov 2026 · about ${Math.max(1, Math.round(words / 220))} min read`} actions={<><Btn icon="download" onClick={() => window.print()}>Print</Btn><Btn onClick={() => { void navigator.clipboard?.writeText(location.href); toast({ kind: "info", title: "Link copied" }); }}>Copy link</Btn></>} />
      <div className="vw-legal"><aside className="vw-noprint"><AnchorNav items={LEGAL.map(([id, label]) => ({ id, label }))} /></aside>
        <article>{LEGAL.map(([id, label]) => <section key={id}><h2 id={id}>{label}</h2><p>{BODY(label.replace(/^\d+\. /, ""))}</p><p>{BODY("Section detail")}</p></section>)}
          <hr /><div className="adm-stack vw-noprint"><Checkbox checked={ok} onChange={setOk} label="I have read and agree to these terms" /><div className="adm-row"><Btn variant="primary" disabled={!ok} onClick={() => toast({ kind: "ok", title: "Terms accepted", body: "Version 3.2 recorded" })}>Accept and continue</Btn><Btn variant="ghost">Decline</Btn></div></div></article></div>
    </>
  );
}
void Icon; void Spot;
