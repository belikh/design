import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { DEFAULT_TOKENS } from "@belikh/jupiter-tokens";
import "./chrome.css";
import { Badge, Btn, Drawer, Dot, Kbd, Menu, Modal } from "@belikh/jupiter-ui/kit.tsx";
import { Markdown } from "@belikh/jupiter-ui/extra.tsx";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";
import { cancelTask, clearFinished, envOf, retryTask, system, useSystem, useSystemAttributes, workspaceOf, WORKSPACES } from "./system.ts";
import { docsFor, searchDocs } from "./help.ts";
import { prettyCombo, STATIC_SHORTCUTS, useShortcutList } from "./shortcuts.ts";
import type { Role } from "./engine.ts";

export const useNow = (every = 30_000) => { const [n, setN] = useState(() => Date.now()); useEffect(() => { const t = setInterval(() => setN(Date.now()), every); return () => clearInterval(t); }, [every]); return n; };
export const ago = (t: number, now: number) => { const s = Math.max(0, Math.round((now - t) / 1000)); return s < 10 ? "just now" : s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)}m ago` : `${Math.round(s / 3600)}h ago`; };

/* ---------- environment badge + workspace / view-as-role menu (E016, F011) ---------- */
export function EnvBadge() { const env = envOf(useSystem()); return <Badge s={env === "production" ? "danger" : env === "staging" ? "warn" : "info"}>{env}</Badge>; }
export function WorkspaceMenu() {
  const s = useSystem(); const w = workspaceOf(s);
  const roles: Role[] = ["admin", "editor", "viewer"];
  return (
    <Menu label={s.role !== "admin" ? `${w.name} · as ${s.role}` : w.name} icon="folder" items={[
      ...WORKSPACES.map((x) => ({ label: `${x.id === s.workspace ? "✓ " : "   "}${x.name} (${x.env})`, onSelect: () => system.setWorkspace(x.id) })), "sep" as const,
      ...roles.map((r) => ({ label: `${r === s.role ? "✓ " : "   "}View as ${r}`, onSelect: () => system.setRole(r) })),
    ]} />
  );
}

/* ---------- banners: maintenance, read-only, impersonation, view-as-role, connection (E016) ---------- */
export function Banners() {
  const s = useSystem(); useSystemAttributes();
  const items: { key: string; tone: "warn" | "danger" | "info"; text: string; action?: { label: string; run: () => void } }[] = [];
  if (s.maintenance.on) items.push({ key: "maint", tone: "warn", text: s.maintenance.message, action: { label: "Dismiss", run: () => system.setMaintenance(false) } });
  if (s.readOnly) items.push({ key: "ro", tone: "warn", text: "Read-only mode: you can view everything, but changes are disabled.", action: { label: "Turn off", run: () => system.setReadOnly(false) } });
  if (s.impersonating) items.push({ key: "imp", tone: "danger", text: `Viewing as ${s.impersonating}. Actions are recorded against your account.`, action: { label: "Exit", run: () => system.impersonate(null) } });
  if (s.role !== "admin") items.push({ key: "role", tone: "info", text: `Previewing the app as a ${s.role}. Some controls are hidden or disabled.`, action: { label: "Back to admin", run: () => system.setRole("admin") } });
  if (s.connection === "offline") items.push({ key: "off", tone: "danger", text: "You’re offline. Changes will sync when you reconnect.", action: { label: "Retry", run: () => system.setConnection("online") } });
  else if (s.connection === "degraded") items.push({ key: "deg", tone: "warn", text: "Connection is slow. Live updates may lag.", action: { label: "Dismiss", run: () => system.setConnection("online") } });
  return <div className="adm-banners" role="group" aria-label="System banners">{items.map((b) => <div key={b.key} className={`adm-ban adm-ban--${b.tone}`} role={b.tone === "danger" ? "alert" : "status"}><Icon name={b.tone === "info" ? "info" : "alert"} size={16} /><span>{b.text}</span>{b.action && <button className="adm-link" onClick={b.action.run}>{b.action.label}</button>}</div>)}</div>;
}

/* ---------- consent bar (E016) ---------- */
export function ConsentBar() {
  const s = useSystem(); const [more, setMore] = useState(false);
  if (s.consent !== "unset") return null;
  return (
    <>
      <div className="adm-consent" role="dialog" aria-label="Cookie consent" aria-live="polite">
        <div><b>We store a little data in your browser.</b><p className="jp-muted">Essential storage keeps your theme, layout and sign-in. Optional analytics would help us improve. <button className="adm-link" onClick={() => setMore(true)}>Details</button></p></div>
        <div className="adm-row"><Btn sm onClick={() => system.setConsent("essential")}>Essential only</Btn><Btn sm variant="primary" onClick={() => system.setConsent("accepted")}>Accept all</Btn></div>
      </div>
      <Modal open={more} onClose={() => setMore(false)} title="What we store" size="sm" footer={<Btn onClick={() => setMore(false)}>Close</Btn>}>
        <dl className="adm-dl" style={{ gridTemplateColumns: "110px 1fr" }}><dt>Essential</dt><dd>Theme, density, language, layouts, and these preferences. Always on.</dd><dt>Analytics</dt><dd>Anonymous page-view counts. Only with “Accept all”. (This template sends nothing anywhere.)</dd></dl>
      </Modal>
    </>
  );
}

/* ---------- status bar + trays (E017, E020) ---------- */
function Tray({ open, children, label }: { open: boolean; children: React.ReactNode; label: string }) { return open ? <div className="adm-tray" role="dialog" aria-label={label}>{children}</div> : null; }
export function StatusBar() {
  const s = useSystem(); const now = useNow(15_000); const [tray, setTray] = useState<"" | "tasks" | "clip">(""); const ref = useRef<HTMLDivElement>(null);
  const running = s.tasks.filter((t) => t.status === "running").length; const failed = s.tasks.filter((t) => t.status === "failed").length;
  useEffect(() => { if (!tray) return; const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setTray(""); const k = (e: KeyboardEvent) => e.key === "Escape" && setTray(""); document.addEventListener("mousedown", h); document.addEventListener("keydown", k); return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); }; }, [tray]);
  const conn = { online: ["ok", "Connected"], degraded: ["warn", "Slow connection"], offline: ["danger", "Offline"] }[s.connection] as ["ok" | "warn" | "danger", string];
  return (
    <footer className="adm-status" ref={ref} aria-label="Status bar">
      <Menu label={<span className="adm-row" style={{ gap: 6 }}><Dot s={conn[0]} />{conn[1]}</span>} items={[{ label: "Simulate online", onSelect: () => system.setConnection("online") }, { label: "Simulate slow connection", onSelect: () => system.setConnection("degraded") }, { label: "Simulate offline", onSelect: () => system.setConnection("offline") }]} />
      <button className="adm-status__btn" onClick={() => system.sync()} title="Sync now"><Icon name="refresh" size={13} /> Synced {ago(s.lastSync, now)}</button>
      <span className="adm-status__hide jp-muted">{workspaceOf(s).name} · {envOf(s)} · {s.role}</span>
      <span className="adm-spacer" />
      <span className="adm-status__hide jp-muted adm-num">tokens v{DEFAULT_TOKENS.version} · app v{s.version}</span>
      <button className="adm-status__btn" aria-expanded={tray === "tasks"} onClick={() => setTray(tray === "tasks" ? "" : "tasks")} aria-label={`Background tasks: ${running} running`}><Icon name="loader" size={13} /> Tasks{running > 0 && <b className="adm-pillcount">{running}</b>}{failed > 0 && <b className="adm-pillcount is-bad">{failed}</b>}</button>
      <button className="adm-status__btn" aria-expanded={tray === "clip"} onClick={() => setTray(tray === "clip" ? "" : "clip")} aria-label={`Clipboard tray: ${s.clipboard.length} items`}><Icon name="copy" size={13} /> Clipboard{s.clipboard.length > 0 && <b className="adm-pillcount">{s.clipboard.length}</b>}</button>
      <Tray open={tray === "tasks"} label="Background tasks">
        <div className="adm-tray__head"><b>Background tasks</b><button className="adm-link" onClick={() => clearFinished()}>Clear finished</button></div>
        {s.tasks.length === 0 && <p className="jp-muted" style={{ padding: 12 }}>Nothing running. Start one from System → Status bar.</p>}
        <ul className="adm-tray__list">{s.tasks.map((t) => (
          <li key={t.id}><div className="adm-row" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}><span><b>{t.title}</b><small className="jp-muted"> {t.kind}</small></span>
            {t.status === "running" ? <button className="adm-x" aria-label={`Cancel ${t.title}`} onClick={() => cancelTask(t.id)}>Cancel</button> : t.status === "failed" ? <button className="adm-x" aria-label={`Retry ${t.title}`} onClick={() => retryTask(t.id)}>Retry</button> : <Badge s={t.status === "done" ? "ok" : undefined}>{t.status}</Badge>}</div>
            <div className="adm-progress__track"><span className={t.status === "done" ? "is-ok" : t.status === "failed" ? "is-danger" : ""} style={{ width: `${t.progress}%` }} /></div>{t.error && <div className="adm-err">{t.error}</div>}</li>))}</ul>
      </Tray>
      <Tray open={tray === "clip"} label="Clipboard tray">
        <div className="adm-tray__head"><b>Clipboard tray</b><button className="adm-link" onClick={() => system.clearClips()}>Clear unpinned</button></div>
        {s.clipboard.length === 0 && <p className="jp-muted" style={{ padding: 12 }}>Copy something with the System → Selection page and it appears here.</p>}
        <ul className="adm-tray__list">{s.clipboard.map((c) => (
          <li key={c.id}><div className="adm-row" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}><b>{c.label}</b><span className="adm-row" style={{ gap: 0 }}><button className="adm-x" aria-label={`Copy ${c.label} again`} onClick={() => navigator.clipboard?.writeText(c.text)}>Copy</button><button className="adm-x" aria-pressed={!!c.pinned} aria-label={`${c.pinned ? "Unpin" : "Pin"} ${c.label}`} onClick={() => system.pin(c.id)}>{c.pinned ? "Unpin" : "Pin"}</button><button className="adm-x" aria-label={`Remove ${c.label}`} onClick={() => system.dropClip(c.id)}>×</button></span></div><code className="adm-clip">{c.text.slice(0, 120)}</code></li>))}</ul>
      </Tray>
    </footer>
  );
}

/* ---------- shortcut cheat sheet + context help panel (E027) ---------- */
export function ShortcutSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const list = useShortcutList(); const [q, setQ] = useState("");
  useEffect(() => { if (open) setQ(""); }, [open]);
  const all = [...list.map((s) => ({ combo: prettyCombo(s.combo), description: s.description, scope: s.scope })), ...STATIC_SHORTCUTS];
  const shown = all.filter((x) => !q || (x.combo + x.description + x.scope).toLowerCase().includes(q.toLowerCase())); const scopes = [...new Set(shown.map((x) => x.scope))];
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts" size="md">
      <input className="jp-input" placeholder="Search shortcuts…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search shortcuts" autoFocus />
      <div style={{ marginTop: 12 }}>{scopes.map((sc) => <section key={sc} style={{ marginBottom: 12 }}><div className="adm-nav__h" style={{ padding: "0 0 4px" }}>{sc}</div><dl className="adm-dl" style={{ gridTemplateColumns: "150px 1fr" }}>{shown.filter((x) => x.scope === sc).map((x) => <div key={x.combo + x.description} style={{ display: "contents" }}><dt style={{ textTransform: "none" }}><Kbd>{x.combo}</Kbd></dt><dd>{x.description}</dd></div>)}</dl></section>)}{!shown.length && <p className="jp-muted">No shortcuts match.</p>}</div>
    </Modal>
  );
}
export function HelpPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const loc = useLocation(); const [q, setQ] = useState(""); useEffect(() => { if (open) setQ(""); }, [open]);
  const docs = q ? searchDocs(q) : [docsFor(loc.pathname)];
  return (
    <Drawer open={open} onClose={onClose} title="Help" footer={<span className="jp-muted">F1 toggles this panel</span>}>
      <input className="jp-input" placeholder="Search help…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search help" />
      <div style={{ marginTop: 12 }}>{!q && <p className="jp-muted" style={{ marginBottom: 8 }}>For this page:</p>}{docs.length ? docs.map((d) => <article key={d.match} style={{ marginBottom: 16 }}><Markdown src={d.md} /></article>) : <p className="jp-muted">Nothing found for “{q}”.</p>}</div>
    </Drawer>
  );
}
