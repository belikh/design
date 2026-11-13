import { useMemo, useState } from "react";
import "./chrome.css";
import { Badge, Btn, EmptyState, Menu, PageHeader, Panel, Tabs } from "@belikh/jupiter-ui/kit.tsx";
import { Segmented, Slider } from "@belikh/jupiter-ui/inputs.tsx";
import { Graphic, Icon } from "@belikh/jupiter-ui/Icon.tsx";
import { MetricList, KpiCard, EntityChip, ENTITIES, Timeline, type TLEvent } from "./entities.tsx";
import { AudioPlayer, Carousel, DocViewer, Lightbox, PdfEmbed, VideoPlayer, type Img } from "./media.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { series } from "../../data/fixtures.ts";
import { group, NOTIF_META, snoozeUntil, snoozed, visible, type Notif, type SnoozePreset } from "./engine.ts";

/* ===== E022: notification types, grouping, snooze ===== */
const NOW0 = new Date(2026, 10, 12, 16, 52).getTime(); const H = 3_600_000;
const SEED: Notif[] = [
  { id: "n1", type: "security", title: "New sign-in from an unrecognised device", body: "Firefox on Windows 98 (VM), 10.1.1.50", at: NOW0 - 0.2 * H, source: "auth" }, { id: "n2", type: "approval", title: "Noah Smith requests access to billing", body: "Needs the Editor role for 7 days.", at: NOW0 - 0.5 * H, source: "access" },
  { id: "n3", type: "mention", title: "Mia Patel mentioned you in #infra", body: "“Can you review the GTK widgets CSS before the release?”", at: NOW0 - 1.1 * H, source: "chat" }, { id: "n4", type: "progress", title: "Rebuilding the search index", body: "Indexing 240 orders…", at: NOW0 - 1.4 * H, source: "jobs", progress: 62 },
  { id: "n5", type: "system", title: "Deploy v4.12.0 finished", body: "3/3 pods healthy in ap-southeast-2.", at: NOW0 - 2.5 * H, source: "deploy" }, { id: "n6", type: "digest", title: "Your daily digest", body: "12 deploys, 2 incidents, 99.94% uptime.", at: NOW0 - 8.5 * H, source: "reports" },
  { id: "n7", type: "approval", title: "Refund of $182.00 needs approval", body: "ORD-10199 · requested by Zoe Chen.", at: NOW0 - 9 * H, source: "billing" }, { id: "n8", type: "system", title: "Certificate renews in 9 days", body: "jupiter.au (Let’s Encrypt).", at: NOW0 - 20 * H, source: "certs" },
  { id: "n9", type: "mention", title: "Leo Walker replied to your comment", body: "“Looks good, ship it.”", at: NOW0 - 27 * H, source: "chat" }, { id: "n10", type: "security", title: "Password changed", body: "If this wasn’t you, reset it now.", at: NOW0 - 30 * H, source: "auth", read: true }, { id: "n11", type: "digest", title: "Your weekly digest", body: "Revenue up 4.1%, latency p95 +14 ms.", at: NOW0 - 52 * H, source: "reports", read: true },
];
export function NotificationsPage() {
  const { toast } = usePrefs(); const [items, setItems] = useState<Notif[]>(SEED); const [skew, setSkew] = useState(0); const [by, setBy] = useState<"type" | "day" | "source">("type"); const [collapsed, setCollapsed] = useState<Set<string>>(new Set()); const now = NOW0 + skew;
  const vis = visible(items, now), sn = snoozed(items, now); const groups = useMemo(() => group(vis, by, now), [vis, by, now]);
  const upd = (id: string, p: Partial<Notif>) => setItems((x) => x.map((n) => (n.id === id ? { ...n, ...p } : n)));
  const presets: { id: SnoozePreset; label: string }[] = [{ id: "1h", label: "1 hour" }, { id: "3h", label: "3 hours" }, { id: "tonight", label: "Tonight 6pm" }, { id: "tomorrow", label: "Tomorrow 9am" }, { id: "monday", label: "Next Monday" }];
  const snoozeIt = (ids: string[], p: SnoozePreset) => { const until = snoozeUntil(p, now); setItems((x) => x.map((n) => (ids.includes(n.id) ? { ...n, snoozedUntil: until } : n))); toast({ kind: "info", title: `Snoozed ${ids.length} until ${new Date(until).toLocaleString("en-AU", { weekday: "short", hour: "2-digit", minute: "2-digit" })}` }); };
  const unread = vis.filter((n) => !n.read).length;
  return (
    <>
      <PageHeader title="Notifications v2" crumbs={["System", "Notifications"]} desc="Typed notifications with inline actions, grouping by type, day or source, and snooze with presets. Fast-forward the clock to watch snoozed items come back." status={<Badge s={unread ? "info" : "ok"}>{unread} unread</Badge>}
        actions={<><Segmented label="Group by" value={by} onChange={setBy} options={[{ value: "type", label: "Type" }, { value: "day", label: "Day" }, { value: "source", label: "Source" }]} /><Btn onClick={() => setItems((x) => x.map((n) => ({ ...n, read: true })))}>Mark all read</Btn><Btn icon="clock" onClick={() => setSkew((s) => s + H)}>+1 hour ({new Date(now).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })})</Btn></>} />
      <div style={{ maxWidth: 820 }} className="adm-stack">
        {groups.length === 0 && <EmptyState spot="inbox-zero" title="All caught up">Nothing visible. Snoozed items return later.</EmptyState>}
        {groups.map((g) => { const open = !collapsed.has(g.key);
          return (
            <Panel key={g.key} flush title={<button className="adm-gh" aria-expanded={open} onClick={() => setCollapsed((c) => { const n = new Set(c); open ? n.add(g.key) : n.delete(g.key); return n; })}><Icon name={open ? "chevron-down" : "chevron-right"} size={14} /> {by === "type" && <Icon name={NOTIF_META[g.key as keyof typeof NOTIF_META].icon} size={14} />} {g.label} <span className="adm-count">{g.items.length}</span></button>}
              actions={<Menu label="Snooze all" icon="clock" items={presets.map((p) => ({ label: p.label, onSelect: () => snoozeIt(g.items.map((n) => n.id), p.id) }))} />}>
              {open && <ul className="adm-list">{g.items.map((n) => { const m = NOTIF_META[n.type];
                return (
                  <li key={n.id} style={{ alignItems: "flex-start", opacity: n.read ? 0.7 : 1 }}>
                    <span className={`adm-nicon is-${m.tone}`}><Icon name={m.icon} size={18} /></span>
                    <div className="adm-list__main"><span className="adm-row"><b>{n.title}</b>{!n.read && <span className="adm-dot adm-dot--info" aria-label="unread" />}<Badge>{m.label}</Badge></span><span className="jp-muted">{n.body}</span>
                      {n.type === "progress" && <div className="adm-progress__track" style={{ marginTop: 6, maxWidth: 280 }}><span style={{ width: `${n.progress}%` }} /></div>}
                      <span className="adm-row" style={{ marginTop: 6 }}>
                        {n.type === "approval" && (n.resolved ? <Badge s={n.resolved === "approved" ? "ok" : "danger"}>{n.resolved}</Badge> : <><Btn sm variant="primary" onClick={() => { upd(n.id, { resolved: "approved", read: true }); toast({ kind: "ok", title: "Approved" }); }}>Approve</Btn><Btn sm onClick={() => upd(n.id, { resolved: "denied", read: true })}>Deny</Btn></>)}
                        {n.type === "mention" && <Btn sm onClick={() => toast({ kind: "info", title: "Reply opened" })}>Reply</Btn>}{n.type === "security" && <Btn sm onClick={() => toast({ kind: "warn", title: "Sessions opened" })}>Review sessions</Btn>}
                        <button className="adm-link" onClick={() => upd(n.id, { read: !n.read })}>{n.read ? "Mark unread" : "Mark read"}</button></span></div>
                    <span className="jp-muted adm-num" style={{ fontSize: "var(--jp-fs-xs)", whiteSpace: "nowrap" }}>{new Date(n.at).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}</span>
                    <Menu label="Snooze" icon="clock" items={presets.map((p) => ({ label: p.label, onSelect: () => snoozeIt([n.id], p.id) }))} />
                  </li>); })}</ul>}
            </Panel>); })}
        {sn.length > 0 && <Panel title={`Snoozed (${sn.length})`} flush><ul className="adm-list">{sn.map((n) => <li key={n.id}><Icon name="clock" size={16} /><div className="adm-list__main"><b>{n.title}</b><span className="jp-muted">returns {new Date(n.snoozedUntil!).toLocaleString("en-AU", { weekday: "short", hour: "2-digit", minute: "2-digit" })}</span></div><Btn sm onClick={() => upd(n.id, { snoozedUntil: undefined })}>Wake now</Btn></li>)}</ul></Panel>}
      </div>
    </>
  );
}

/* ===== E023: entity chips with hover cards ===== */
export function EntitiesPage() {
  const [type, setType] = useState("all"); const list = ENTITIES.filter((e) => type === "all" || e.type === type); const by = (id: string) => ENTITIES.find((e) => e.id === id)!;
  return (
    <>
      <PageHeader title="Entity chips and hover cards" crumbs={["System", "Entities"]} desc="Users, devices, services and hosts as compact chips. Hover or focus one for a card with status, details, a trend and quick actions." />
      <Panel title="In running text"><p style={{ lineHeight: 2.1 }}>The deploy of <EntityChip entity={by("s-api")} /> finished on <EntityChip entity={by("h-nix1")} />, triggered by <EntityChip entity={by("u-ava")} />. <EntityChip entity={by("s-pxe")} /> has been unreachable since the router <EntityChip entity={by("h-udm")} /> rebooted, and <EntityChip entity={by("u-noah")} /> is looking at power on <EntityChip entity={by("d-ups")} />. The living-room sensor <EntityChip entity={by("d-esp-living")} /> is fine.</p><p className="jp-muted">Tab to a chip and the card opens on focus too.</p></Panel>
      <Panel title="Directory" className="adm-section" actions={<Segmented label="Type" value={type} onChange={setType} options={[{ value: "all", label: "All" }, { value: "user", label: "Users" }, { value: "device", label: "Devices" }, { value: "service", label: "Services" }, { value: "host", label: "Hosts" }]} />} flush>
        <table className="jp-table"><thead><tr><th>Entity</th><th>Type</th><th>Status</th><th>First detail</th></tr></thead><tbody>{list.map((e) => <tr key={e.id}><td><EntityChip entity={e} /></td><td>{e.type}</td><td><Badge s={e.status === "off" ? undefined : e.status}>{e.status === "ok" ? "healthy" : e.status === "warn" ? "degraded" : e.status === "danger" ? "down" : "offline"}</Badge></td><td className="jp-muted">{e.meta[0].join(": ")}</td></tr>)}</tbody></table>
      </Panel>
      <Panel title="Compact (icon only)" className="adm-section"><div className="adm-row">{ENTITIES.map((e) => <EntityChip key={e.id} entity={e} compact />)}</div></Panel>
    </>
  );
}

/* ===== E024: KPI with target, comparison chips, mini-gauge, metric list ===== */
export function KpiPage() {
  const [target, setTarget] = useState(99.9); const up = 99.94;
  return (
    <>
      <PageHeader title="KPIs, targets and metric lists" crumbs={["System", "KPIs"]} desc="KPI cards show progress to a target, comparison chips against earlier periods and peers, and a trend or mini-gauge. Move the uptime target to see the status change." />
      <div className="adm-grid adm-grid--3">
        <KpiCard label="Uptime" value={String(up)} unit="%" current={up} target={target} spark={series(14, 99, 1, 11)} compare={[{ label: "vs last month", pct: 0.02 }, { label: "vs peers", pct: 0.3 }]} />
        <KpiCard label="Revenue" value="$158k" current={158} target={180} spark={series(14, 30, 8, 3)} compare={[{ label: "vs last month", pct: 12.4 }, { label: "vs target", pct: -12.2 }]} />
        <KpiCard label="Latency p95" value="182" unit="ms" current={182} target={200} higherIsBetter={false} gauge={{ value: 182, max: 300 }} compare={[{ label: "vs last week", pct: 8.2, invert: true }]} />
        <KpiCard label="Storage used" value="83" unit="%" current={83} target={80} higherIsBetter={false} gauge={{ value: 83, max: 100 }} compare={[{ label: "vs last month", pct: 4, invert: true }]} />
        <KpiCard label="NPS" value="52" current={52} target={50} spark={series(14, 30, 6, 9)} compare={[{ label: "vs peers", pct: 6 }]} />
        <KpiCard label="Churn" value="1.8" unit="%" current={1.8} target={2} higherIsBetter={false} spark={series(14, 20, 4, 5)} compare={[{ label: "vs last month", pct: -0.3, invert: true }]} />
      </div>
      <Panel title="Uptime target" className="adm-section"><Slider label="Uptime target" value={target} onChange={setTarget} min={99} max={100} step={0.01} fmt={(v) => `${v.toFixed(2)}%`} /></Panel>
      <div className="adm-grid adm-grid--2" style={{ marginTop: 16 }}>
        <Panel title="Top endpoints (metric list)"><MetricList rows={[{ label: "GET /orders", note: "p95 120 ms", value: "48.2k", delta: 6.1, share: 100 }, { label: "POST /orders", note: "p95 210 ms", value: "12.9k", delta: 3.4, share: 27 }, { label: "GET /status", note: "p95 18 ms", value: "9.8k", delta: -1.2, share: 20 }, { label: "GET /export", note: "p95 940 ms", value: "1.4k", delta: 14, invert: true, share: 3 }]} title="Top endpoints" /></Panel>
        <Panel title="Regions"><MetricList rows={[{ label: "Brisbane", value: "$61k", delta: 9.2, share: 100 }, { label: "Sydney", value: "$48k", delta: 4.1, share: 79 }, { label: "Melbourne", value: "$31k", delta: -2.3, share: 51 }, { label: "Perth", value: "$18k", delta: 1.1, share: 30 }]} title="Regions" /></Panel>
      </div>
    </>
  );
}

/* ===== E025: timeline variants ===== */
const T0 = new Date(2026, 10, 12, 16, 40).getTime();
const EVENTS: TLEvent[] = [
  { id: "e1", at: T0 - 5 * 60_000, title: "Alert raised: pxe-boot unreachable", body: "5 consecutive health checks failed.", kind: "danger", actor: "monitor" },
  { id: "e2", at: T0 - 22 * 60_000, title: "Firewall rule changed", kind: "warn", actor: "Noah Smith", diff: { label: "rule 14", before: "action: allow\nsource: 10.1.20.0/24\nport: 69/udp\nlog: off", after: "action: allow\nsource: 10.1.20.0/24\nport: 69/udp\nlog: on\nexpires: 2026-11-19" } },
  { id: "e3", at: T0 - 2.5 * 3_600_000, title: "Deploy v4.12.0 finished", body: "3/3 pods healthy.", kind: "ok", actor: "Ava Nguyen" },
  { id: "e4", at: T0 - 3 * 3_600_000, title: "Config updated: retention", kind: "info", actor: "Ava Nguyen", diff: { label: "retention.yaml", before: "logs: 14d\nmetrics: 90d", after: "logs: 30d\nmetrics: 90d\ntraces: 7d" } },
  { id: "e5", at: T0 - 26 * 3_600_000, title: "ZFS scrub finished", body: "0 errors on tank.", kind: "ok", actor: "system" },
  { id: "e6", at: T0 - 27 * 3_600_000, title: "Member invited", body: "casey@example.com as Viewer", kind: "info", actor: "Mia Patel" },
  { id: "e7", at: T0 - 49 * 3_600_000, title: "Certificate renewed", kind: "ok", actor: "cert-manager" },
];
export function TimelinePage() {
  const [v, setV] = useState<"vertical" | "horizontal" | "grouped">("grouped");
  return (
    <>
      <PageHeader title="Timeline variants" crumbs={["System", "Timeline"]} desc="Vertical, horizontal, and grouped-by-day (with sticky day headers). Events that changed something can expand to show a diff." actions={<Segmented label="Variant" value={v} onChange={setV} options={[{ value: "vertical", label: "Vertical" }, { value: "horizontal", label: "Horizontal" }, { value: "grouped", label: "By day" }]} />} />
      <Panel><div style={{ maxHeight: v === "grouped" ? 520 : undefined, overflow: v === "grouped" ? "auto" : undefined }}><Timeline events={EVENTS} variant={v} /></div></Panel>
    </>
  );
}

/* ===== E011: media ===== */
const IMGS: Img[] = [
  { id: "scene-skyline", title: "Brisbane skyline", caption: "A single continuous stroke, scalable without loss." }, { id: "scene-horizon", title: "Horizon" }, { id: "scene-village", title: "Village" }, { id: "scene-sea", title: "Sea" },
  { id: "spot-kangaroo", title: "Kangaroo" }, { id: "spot-koala", title: "Koala" }, { id: "spot-sgi-indy", title: "SGI Indy" },
];
export function MediaPage() {
  const [tab, setTab] = useState("images"); const [lb, setLb] = useState<number | null>(null);
  const pages = useMemo(() => [0, 1, 2].map((i) => <div key={i} className="adm-stack"><h3>Chapter {i + 1}</h3><p className="jp-muted">Page {i + 1} of 3. The viewer pages, zooms and shows thumbnails; it also responds to PageUp/PageDown, Home and End.</p>{Array.from({ length: 6 }, (_, k) => <div key={k} className="adm-skel" style={{ height: 10, width: `${95 - ((k * 11 + i * 7) % 40)}%` }} />)}<Graphic id={["spot-koala", "spot-wombat", "spot-emu"][i]} size={140} /></div>), []);
  return (
    <>
      <PageHeader title="Media" crumbs={["System", "Media"]} desc="An image viewer, a carousel, document viewers (including a real generated PDF), and audio and video players with custom, keyboard-accessible controls." tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: "images", label: "Image viewer" }, { id: "carousel", label: "Carousel" }, { id: "docs", label: "Documents / PDF" }, { id: "av", label: "Audio and video" }]} />} />
      {tab === "images" && <><div className="adm-imggrid">{IMGS.map((im, i) => <button key={im.id} className="adm-imgtile" onClick={() => setLb(i)} aria-label={`Open ${im.title}`}><Graphic id={im.id} size="100%" /><span>{im.title}</span></button>)}</div>{lb !== null && <Lightbox images={IMGS} index={lb} onIndex={setLb} onClose={() => setLb(null)} />}<p className="jp-muted" style={{ marginTop: 8 }}>Open an image: ← / → to browse, + / − / 0 or the mouse wheel to zoom, Esc to close.</p></>}
      {tab === "carousel" && <Carousel label="Featured illustrations" slides={IMGS.slice(0, 5).map((im) => ({ id: im.id, title: im.title, node: <div className="adm-row" style={{ justifyContent: "center", flexDirection: "column" }}><Graphic id={im.id} size={im.id.startsWith("scene") ? 380 : 190} title={im.title} /><b>{im.title}</b></div> }))} />}
      {tab === "docs" && <div className="adm-grid adm-grid--2"><Panel title="Paged document viewer"><DocViewer title="Handbook (rendered pages)" pages={pages} /></Panel><Panel title="PDF (generated in the browser)"><PdfEmbed title="Jupiter handbook" pages={[["Chapter 1", "", "A real PDF 1.4 file built in the browser,", "shown by your browser’s own viewer."], ["Chapter 2", "", "Use the browser toolbar to zoom,", "search and download."]]} /></Panel></div>}
      {tab === "av" && <div className="adm-grid adm-grid--2"><Panel title="Audio (a generated melody)"><AudioPlayer /><p className="jp-muted" style={{ marginTop: 8 }}>Click the waveform to seek; focus it and use ←/→ (±2s) and Space.</p></Panel><Panel title="Video-style player (canvas animation)"><VideoPlayer /><p className="jp-muted" style={{ marginTop: 8 }}>No video file ships with the template; this animates on a canvas but uses the same controls you’d wire to a real <code>&lt;video&gt;</code>.</p></Panel></div>}
    </>
  );
}
