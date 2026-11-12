import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import "./chrome.css";
import { Badge, Btn, PageHeader, Panel, EmptyState } from "@belikh/jupiter-ui/kit.tsx";
import { Popover } from "@belikh/jupiter-ui/extra.tsx";
import { Combobox, Field as BaseField, Segmented, Select, TextInput, Checkbox } from "@belikh/jupiter-ui/inputs.tsx";
import { useId } from "react";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { Coachmark, DangerZone, ProductTour, resetCoachmarks, ReviewSummary, StepRail, SuccessScreen, tourSeen, markTourSeen, UndoBar, useUndoWindow, type RailStep, type TourStep } from "./guided.tsx";
import { HelpPanel, ShortcutSheet } from "./shellparts.tsx";
import { useShortcut, useShortcutList, prettyCombo } from "./shortcuts.ts";
import { daysLeft, purgeExpired, restore, softDelete, type SoftItem } from "./engine.ts";
import { audit } from "./system.ts";

/** Field with a node label (shared Field takes a string): label + inline docs tip. */
function Field({ label, tip, children, ...rest }: { label: string; tip?: ReactNode; required?: boolean; error?: string; hint?: string; children: (id: string, d: string) => ReactNode }) {
  const id = useId(); const d = `${id}-d`;
  if (!tip) return <BaseField label={label} {...rest}>{children}</BaseField>;
  return <div className="adm-field"><div className="adm-row" style={{ gap: 4 }}><label htmlFor={id} className="jp-label">{label}</label>{tip}</div>{children(id, d)}<div className="adm-field__foot" id={d}>{rest.error ? <span className="adm-err" role="alert">{rest.error}</span> : rest.hint ? <span className="jp-hint">{rest.hint}</span> : <span />}</div></div>;
}
/* inline docs popover: a small (i) next to a label that explains a setting */
export function DocTip({ title, children, href }: { title: string; children: ReactNode; href?: string }) {
  return <Popover label={`About ${title}`} trigger={<Icon name="info" size={14} />}><div className="adm-stack" style={{ gap: 6, maxWidth: 280 }}><b>{title}</b><div className="jp-muted">{children}</div>{href && <a href={href} onClick={(e) => e.preventDefault()}>Read more →</a>}</div></Popover>;
}

/* ===== E027: shortcuts, searchable help panel, inline docs ===== */
export function HelpPage() {
  const { setTheme, theme } = usePrefs(); const [sheet, setSheet] = useState(false); const [panel, setPanel] = useState(false); const list = useShortcutList(); const [region, setRegion] = useState("ap-southeast-2");
  useShortcut("demo-theme", "mod+shift+d", "Toggle dark theme (System demo)", () => setTheme(theme === "dark" ? "light" : "dark"), "System demo");
  return (
    <>
      <PageHeader title="Shortcuts and help" crumbs={["System", "Help"]} desc="The cheat sheet is generated from the shortcuts components register, so it never drifts. The help panel is searchable and shows docs for the page you’re on." actions={<><Btn icon="code" onClick={() => setSheet(true)}>Shortcut cheat sheet (?)</Btn><Btn icon="help" onClick={() => setPanel(true)}>Help panel (F1)</Btn></>} />
      <div className="adm-grid adm-grid--2">
        <Panel title={`Registered right now (${list.length})`} flush><table className="jp-table"><thead><tr><th>Keys</th><th>Action</th><th>Scope</th></tr></thead><tbody>{list.map((s) => <tr key={s.id}><td><kbd className="adm-kbd">{prettyCombo(s.combo)}</kbd></td><td>{s.description}</td><td className="jp-muted">{s.scope}</td></tr>)}</tbody></table></Panel>
        <Panel title="Inline docs popover"><div className="adm-stack">
          <Field label="Region" tip={<DocTip title="Region" href="/help">Where your data is stored. Pick the closest one to your users; moving later means a migration.</DocTip>}>{(id) => <Select id={id} value={region} onChange={setRegion} options={["ap-southeast-2", "ap-southeast-4", "us-east-1"]} />}</Field>
          <Field label="Retention" tip={<DocTip title="Retention">How long logs are kept before they’re deleted. Longer retention costs more storage.</DocTip>}>{(id) => <TextInput id={id} value="30 days" onChange={() => {}} />}</Field>
          <p className="jp-muted">Mount <code>useShortcut</code> in any component and it appears in the sheet while it’s mounted. Try <kbd className="adm-kbd">{prettyCombo("mod+shift+d")}</kbd> on this page.</p></div></Panel>
      </div>
      <ShortcutSheet open={sheet} onClose={() => setSheet(false)} /><HelpPanel open={panel} onClose={() => setPanel(false)} />
    </>
  );
}
export type { RailStep };

/* ===== E028: wizard parts: step rail, review summary, success ===== */
const STEPS = ["Details", "Region and size", "Access", "Review"];
export function WizardPage() {
  const { toast } = usePrefs(); const [step, setStep] = useState(0); const [done, setDone] = useState(false); const [visited, setVisited] = useState<number[]>([0]); const [tried, setTried] = useState(false);
  const [d, setD] = useState({ name: "", owner: "Ava Nguyen", region: "ap-southeast-2", size: "m", members: ["ava@example.com"], tos: false });
  const errors: (string | null)[] = [/^[a-z][a-z0-9-]{2,}$/.test(d.name) ? null : "Use lowercase letters, numbers and dashes (3+ characters).", null, d.members.length ? null : "Add at least one member.", d.tos ? null : "Accept the terms to launch."];
  const rail: RailStep[] = STEPS.map((label, i) => ({ id: label, label, hint: errors[i] && visited.includes(i) && i !== step ? errors[i]! : i === 3 ? "Check and launch" : undefined, state: i === step ? "current" : visited.includes(i) && errors[i] ? "error" : i < step ? "done" : visited.includes(i) ? "done" : i === step + 1 ? "todo" : "locked" }));
  const go = (n: number) => { setTried(false); setStep(n); setVisited((v) => (v.includes(n) ? v : [...v, n])); };
  const next = () => { if (errors[step]) { setTried(true); toast({ kind: "warn", title: errors[step]! }); return; } go(step + 1); };
  if (done) return <SuccessScreen title={`${d.name} is ready`} body={`Provisioned in ${d.region} (${d.size.toUpperCase()}). ${d.members.length} member(s) were emailed an invite.`} steps={["Open the project dashboard", "Connect your first device", "Invite teammates later from Settings → Team"]} action={<Btn variant="primary" onClick={() => audit("Created project", d.name)}>Open project</Btn>} secondary={<Btn onClick={() => { setDone(false); setStep(0); setVisited([0]); setD({ ...d, name: "", tos: false }); }}>Create another</Btn>} />;
  return (
    <>
      <PageHeader title="Provision a project" crumbs={["System", "Wizard"]} desc="A reusable wizard: a step rail (done, current, error, locked), per-step validation, a review summary with edit links, and a success screen." />
      <div className="adm-wiz">
        <aside><StepRail steps={rail} onSelect={(i) => go(i)} /></aside>
        <Panel title={`${step + 1}. ${STEPS[step]}`}>
          {step === 0 && <div className="adm-stack"><Field label="Project name" required error={tried && errors[0] ? errors[0] : undefined} hint="Lowercase, used in URLs">{(id) => <TextInput id={id} value={d.name} onChange={(v) => setD({ ...d, name: v })} autoFocus placeholder="my-project" state={errors[0] && d.name ? "error" : undefined} />}</Field>{errors[0] && d.name && <div className="adm-err" role="alert">{errors[0]}</div>}<Field label="Owner">{(id) => <Select id={id} value={d.owner} onChange={(v) => setD({ ...d, owner: v })} options={["Ava Nguyen", "Noah Smith", "Mia Patel"]} />}</Field></div>}
          {step === 1 && <div className="adm-stack"><Field label="Region">{(id) => <Select id={id} value={d.region} onChange={(v) => setD({ ...d, region: v })} options={["ap-southeast-2", "ap-southeast-4", "us-east-1", "eu-west-1"]} />}</Field><div><div className="jp-label">Size</div><Segmented label="Size" value={d.size} onChange={(v) => setD({ ...d, size: v })} options={[{ value: "s", label: "S" }, { value: "m", label: "M" }, { value: "l", label: "L" }]} /></div></div>}
          {step === 2 && <div className="adm-stack"><Field label="Members" error={errors[2] ?? undefined}>{(id) => <Combobox id={id} multi creatable options={["ava@example.com", "noah@example.com", "mia@example.com"]} value={d.members} onChange={(v) => setD({ ...d, members: v })} placeholder="Add email…" />}</Field></div>}
          {step === 3 && <div className="adm-stack"><ReviewSummary onEdit={(s) => go(s)} sections={[{ title: "Details", step: 0, rows: [["Name", <span className="adm-num">{d.name || "—"}</span>], ["Owner", d.owner]] }, { title: "Region and size", step: 1, rows: [["Region", d.region], ["Size", d.size.toUpperCase()]] }, { title: "Access", step: 2, rows: [["Members", d.members.join(", ") || "—"]] }]} /><Checkbox checked={d.tos} onChange={(v) => setD({ ...d, tos: v })} label="I accept the terms of service" />{errors[3] && !d.tos && <div className="adm-err">{errors[3]}</div>}</div>}
          <div className="adm-row" style={{ justifyContent: "space-between", marginTop: 16 }}><Btn disabled={step === 0} onClick={() => go(step - 1)}>Back</Btn>{step < 3 ? <Btn variant="primary" onClick={next}>Continue</Btn> : <Btn variant="primary" disabled={errors.some((e, i) => e && i !== step) || !!errors[3]} onClick={() => { audit("Provisioned project", d.name); setDone(true); }}>Launch</Btn>}</div>
        </Panel>
      </div>
    </>
  );
}

/* ===== E029: danger zone, soft delete, undo window, cooldown ===== */
const DAY = 86_400_000;
export function DangerPage() {
  const { toast } = usePrefs(); const { pending, start, undo, now } = useUndoWindow(); const [clock, setClock] = useState(0); const t = Date.now() + clock;
  const [items, setItems] = useState<SoftItem[]>([{ id: "p1", name: "Brisbane gateway" }, { id: "p2", name: "PXE boot server" }, { id: "p3", name: "Media archive" }, { id: "p4", name: "Camera network" }]); const [retention, setRetention] = useState(30);
  useEffect(() => { setItems((x) => purgeExpired(x, t, retention * DAY)); }, [clock, retention]); // eslint-disable-line react-hooks/exhaustive-deps
  const remove = (it: SoftItem) => { setItems((x) => x.filter((y) => y.id !== it.id)); start(`Deleted “${it.name}”`, () => { setItems((x) => softDelete([...x, it], it.id, Date.now() + clock)); audit("Moved to trash", it.name); }, () => { setItems((x) => (x.some((y) => y.id === it.id) ? x : [...x, it])); toast({ kind: "info", title: "Restored" }); }); };
  const live = items.filter((i) => i.deletedAt === undefined), trash = items.filter((i) => i.deletedAt !== undefined);
  return (
    <>
      <PageHeader title="Danger zone, soft delete and undo" crumbs={["System", "Danger zone"]} desc="Destructive actions are slowed on purpose: an undo window before anything is committed, a trash with retention instead of hard delete, type-to-confirm, an arming delay and a cooldown." />
      <div className="adm-grid adm-grid--2">
        <Panel title={`Projects (${live.length})`} flush>{live.length === 0 ? <EmptyState spot="empty" title="No projects">Everything is in the trash.</EmptyState> : <ul className="adm-list">{live.map((i) => <li key={i.id}><Icon name="folder" size={16} /><b style={{ flex: 1 }}>{i.name}</b><Btn sm className="adm-danger" variant="primary" onClick={() => remove(i)}>Delete</Btn></li>)}</ul>}<p className="jp-muted" style={{ padding: "8px 16px" }}>Delete removes it from the list and starts a 6-second undo window; after that it goes to the trash.</p></Panel>
        <Panel title={`Trash (${trash.length})`} flush actions={<div className="adm-row"><span className="jp-muted">Keep for</span><Segmented label="Retention" value={String(retention)} onChange={(v) => setRetention(Number(v))} options={[{ value: "7", label: "7d" }, { value: "30", label: "30d" }]} /><Btn sm onClick={() => setClock((c) => c + 31 * DAY)}>Skip 31 days</Btn></div>}>{trash.length === 0 ? <p className="jp-muted" style={{ padding: 16 }}>Trash is empty.</p> : <ul className="adm-list">{trash.map((i) => <li key={i.id}><Icon name="trash" size={16} /><div className="adm-list__main"><b>{i.name}</b><span className="jp-muted">purged in {daysLeft(i, t, retention * DAY)} day(s)</span></div><Btn sm onClick={() => setItems((x) => restore(x, i.id))}>Restore</Btn><Btn sm variant="ghost" onClick={() => setItems((x) => x.filter((y) => y.id !== i.id))}>Purge now</Btn></li>)}</ul>}</Panel>
      </div>
      <div style={{ marginTop: 16 }}><DangerZone actions={[
        { id: "archive", title: "Archive this workspace", description: "Hides it from everyone. You can unarchive within 30 days. Cooldown: 10 s between uses.", button: "Archive workspace…", cooldownMs: 10_000, run: () => { audit("Archived workspace"); toast({ kind: "warn", title: "Workspace archived" }); } },
        { id: "transfer", title: "Transfer ownership", description: "Hands the workspace to another admin. The confirm button unlocks after a 3 second pause.", button: "Transfer…", run: () => { audit("Transferred ownership"); toast({ kind: "warn", title: "Ownership transfer started" }); } },
        { id: "delete", title: "Delete this workspace", description: "Removes all projects and keys. You must type the workspace name to confirm.", button: "Delete workspace…", confirmText: "jupiter", run: () => { audit("Deleted workspace", "jupiter"); toast({ kind: "danger", title: "Workspace deleted (demo)" }); } },
      ]} /></div>
      <UndoBar pending={pending} now={now} onUndo={undo} />
    </>
  );
}

/* ===== E014: product tour, coachmarks, empty-state call to action ===== */
const TOUR: TourStep[] = [
  { target: "tour-actions", title: "Start here", body: "These buttons start the tour, offer it again later, and reset the hints." }, { target: "tour-checklist", title: "Setup checklist", body: "Progress is saved in your browser; finished steps are ticked off." },
  { target: "tour-search", title: "Find anything", body: "Press Cmd/Ctrl+K anywhere to search pages and run actions." }, { target: "tour-coach", title: "Coachmarks", body: "Pulsing dots point out features quietly. Dismiss one and it stays away." },
];
const CKEY = "adm-onboard-checklist";
export function OnboardingPage() {
  const [sp] = useSearchParams(); const [open, setOpen] = useState(false); const [seen, setSeen] = useState(tourSeen());
  const [done, setDone] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(CKEY) || "[]") as string[]; } catch { return []; } }); const [empty, setEmpty] = useState(true);
  useEffect(() => { if (sp.get("tour")) setOpen(true); }, [sp]);
  useEffect(() => { try { localStorage.setItem(CKEY, JSON.stringify(done)); } catch { /* ignore */ } }, [done]);
  const items = [["profile", "Complete your profile"], ["theme", "Pick a theme"], ["invite", "Invite a teammate"], ["alert", "Create your first alert"]];
  const pct = Math.round((done.length / items.length) * 100);
  return (
    <>
      <PageHeader title="Onboarding" crumbs={["System", "Onboarding"]} desc="A keyboard-friendly product tour (←/→, Esc), quiet coachmarks, a persistent checklist, and an empty state with a clear next step." actions={<span data-tour="tour-actions" className="adm-row"><Btn variant="primary" icon="flag" onClick={() => setOpen(true)}>Start the tour</Btn><Btn onClick={() => { markTourSeen(false); setSeen(false); resetCoachmarks(); location.reload(); }}>Reset hints</Btn></span>} />
      {!seen && <div style={{ marginBottom: 16 }}><Panel><div className="adm-row" style={{ justifyContent: "space-between" }}><span><b>New here?</b> <span className="jp-muted">Take a 30-second tour of this page.</span></span><span className="adm-row"><Btn sm variant="primary" onClick={() => setOpen(true)}>Take the tour</Btn><Btn sm variant="ghost" onClick={() => { markTourSeen(); setSeen(true); }}>No thanks</Btn></span></div></Panel></div>}
      <div className="adm-grid adm-grid--2">
        <div data-tour="tour-checklist"><Panel title={`Setup checklist · ${pct}%`}><div className="adm-stack"><div className="adm-progress__track"><span style={{ width: `${pct}%` }} className={pct === 100 ? "is-ok" : ""} /></div>{items.map(([id, label]) => <Checkbox key={id} checked={done.includes(id)} onChange={(v) => setDone((d) => (v ? [...d, id] : d.filter((x) => x !== id)))} label={label} />)}{pct === 100 && <Badge s="ok">All done</Badge>}</div></Panel></div>
        <Panel title="Quick find"><div className="adm-stack"><span data-tour="tour-search"><TextInput value="" onChange={() => {}} placeholder="Press Cmd/Ctrl+K to search…" aria-label="Search" prefix={<Icon name="search" size={14} />} /></span><div data-tour="tour-coach" className="adm-row"><Coachmark id="export" text="New: export any table as CSV from its toolbar."><Btn icon="download">Export</Btn></Coachmark><Coachmark id="share" text="Share a view with a link."><Btn icon="link">Share</Btn></Coachmark></div></div></Panel>
      </div>
      <Panel title="Empty state with a call to action" className="adm-section" actions={<Btn sm onClick={() => setEmpty(!empty)}>{empty ? "Add a sample alert" : "Clear"}</Btn>}>{empty ? <EmptyState spot="bell" title="No alerts yet" action={<Btn variant="primary" icon="plus" onClick={() => { setEmpty(false); setDone((d) => (d.includes("alert") ? d : [...d, "alert"])); }}>Create your first alert</Btn>}>Alerts tell you when something needs attention. It takes about a minute to set one up.</EmptyState> : <p style={{ padding: 8 }}><Badge s="ok">1 alert</Badge> “Disk above 80%” is active.</p>}</Panel>
      <ProductTour steps={TOUR} open={open} onClose={() => setOpen(false)} onDone={() => setSeen(true)} />
    </>
  );
}
