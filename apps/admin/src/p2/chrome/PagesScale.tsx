import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_TOKENS, generateEmailHTML } from "@belikh/jupiter-tokens";
import "./chrome.css";
import { Alert, Badge, Btn, Menu, PageHeader, Panel, Spinner } from "@belikh/jupiter-ui/kit.tsx";
import { Checkbox, Field, Segmented, Select, Switch, TextInput } from "@belikh/jupiter-ui/inputs.tsx";
import { DataTable, type Col } from "@belikh/jupiter-ui/DataTable.tsx";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { rng, regions } from "../../data/fixtures.ts";
import { checkTarget, DEFAULT_DELIVERY, isQuiet, lttb, measure, MIN_TARGET, NOTIF_META, routeEvent, swipeDir, time, type Budget, type Channel, type DeliveryConfig, type Measure, type NotifType, type TargetReport } from "./engine.ts";

/* ===== F013: large data and performance budgets ===== */
type Row = { id: string; name: string; region: string; amount: number; status: string };
const BUDGETS: Budget[] = [{ id: "rows", label: "Generate rows", limitMs: 800 }, { id: "points", label: "Generate points", limitMs: 600 }, { id: "lttb", label: "Downsample (LTTB) to 1,200", limitMs: 200 }, { id: "draw", label: "Draw chart (canvas)", limitMs: 120 }, { id: "frame", label: "Average frame while scrolling the table", limitMs: 24 }];
const genRows = (n: number): Row[] => { const g = rng(5); const st = ["paid", "pending", "refunded", "failed"]; return Array.from({ length: n }, (_, i) => ({ id: `R${String(i).padStart(7, "0")}`, name: `Customer ${(i * 7919) % 100000}`, region: regions[i % regions.length], amount: Math.round(g() * 250000) / 100, status: st[i % 4] })); };
const genPoints = (n: number): Float32Array => { const g = rng(9); const y = new Float32Array(n); let v = 100; for (let i = 0; i < n; i++) { v += (g() - 0.5) * 2; y[i] = v + Math.sin(i / 5000) * 30 + (i % 250_000 === 0 ? 60 : 0); } return y; };
function draw(cv: HTMLCanvasElement | null, y: Float32Array, idx: number[]) {
  const g = cv?.getContext?.("2d"); if (!cv || !g) return; const css = getComputedStyle(cv); const col = (v: string) => css.getPropertyValue(v).trim() || "#888"; const W = cv.width, H = cv.height; g.fillStyle = col("--jp-surface"); g.fillRect(0, 0, W, H);
  let lo = Infinity, hi = -Infinity; for (let i = 0; i < y.length; i += Math.max(1, y.length >> 14)) { lo = Math.min(lo, y[i]); hi = Math.max(hi, y[i]); } const Y = (v: number) => H - 10 - ((v - lo) / (hi - lo || 1)) * (H - 20);
  const bucket = Math.max(1, Math.floor(y.length / W)); g.fillStyle = col("--adm-c6"); g.globalAlpha = 0.35; for (let x = 0; x < W; x++) { let a = Infinity, b = -Infinity; for (let i = x * bucket; i < Math.min(y.length, (x + 1) * bucket); i += Math.max(1, bucket >> 6)) { a = Math.min(a, y[i]); b = Math.max(b, y[i]); } if (a <= b) g.fillRect(x, Y(b), 1, Math.max(1, Y(a) - Y(b))); } g.globalAlpha = 1;
  g.strokeStyle = col("--jp-accent"); g.lineWidth = 1.5; g.beginPath(); idx.forEach((i, k) => { const px = (i / (y.length - 1)) * W; k ? g.lineTo(px, Y(y[i])) : g.moveTo(px, Y(y[i])); }); g.stroke();
}
export function ScalePage() {
  const [nRows, setNRows] = useState("100000"); const [nPts, setNPts] = useState("1000000"); const [rows, setRows] = useState<Row[]>(() => genRows(2000)); const [pts, setPts] = useState<Float32Array | null>(null); const [res, setRes] = useState<Measure[]>([]); const [busy, setBusy] = useState(false); const cv = useRef<HTMLCanvasElement>(null); const [info, setInfo] = useState("");
  const wrap = useRef<HTMLDivElement>(null);
  const cols: Col<Row>[] = useMemo(() => [{ key: "id", header: "ID", width: 120 }, { key: "name", header: "Customer", width: 180, filter: "text" }, { key: "region", header: "Region", width: 130, filter: "select" }, { key: "status", header: "Status", width: 110 }, { key: "amount", header: "Amount", width: 120, align: "right", agg: "sum", fmt: (v) => v.toLocaleString("en-AU", { style: "currency", currency: "AUD" }) }], []);
  const tick = () => new Promise<void>((r) => setTimeout(r, 30));
  const frames = async (): Promise<number> => {
    const el = wrap.current?.querySelector(".adm-dt__wrap") as HTMLElement | null; if (!el || typeof requestAnimationFrame === "undefined") return 0; let last = performance.now(), sum = 0, n = 0;
    await new Promise<void>((res) => { const step = (t: number) => { if (n > 0) sum += t - last; last = t; el.scrollTop += 600; if (++n > 40) res(); else requestAnimationFrame(step); }; requestAnimationFrame(step); }); return sum / Math.max(1, n - 1);
  };
  const run = async () => {
    setBusy(true); const out: Measure[] = []; const B = (id: string) => BUDGETS.find((b) => b.id === id)!;
    await tick(); const r = time(() => genRows(Number(nRows))); out.push(measure(B("rows"), r.ms)); setRows(r.value); await tick();
    const p = time(() => genPoints(Number(nPts))); out.push(measure(B("points"), p.ms)); setPts(p.value); const l = time(() => lttb(p.value, 1200)); out.push(measure(B("lttb"), l.ms));
    const d = time(() => draw(cv.current, p.value, l.value)); out.push(measure(B("draw"), d.ms)); setInfo(`${Number(nPts).toLocaleString()} points reduced to ${l.value.length.toLocaleString()} (${(Number(nPts) / l.value.length).toFixed(0)}:1), peaks preserved`);
    await tick(); out.push(measure(B("frame"), await frames())); setRes(out); setBusy(false);
  };
  useEffect(() => { const y = genPoints(200_000); setPts(y); draw(cv.current, y, lttb(y, 1200)); setInfo("200,000 points shown. Press “Run budgets” for the full-size data."); }, []);
  const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  return (
    <>
      <PageHeader title="Large data and performance budgets" crumbs={["System", "Scale"]} desc="Generate 100k table rows and a 1M-point series, render them with virtualisation and downsampling, and check the timings against budgets. Budgets are machine-dependent: they’re guard rails, not guarantees." actions={<><Segmented label="Rows" value={nRows} onChange={setNRows} options={[{ value: "10000", label: "10k rows" }, { value: "100000", label: "100k rows" }]} /><Segmented label="Points" value={nPts} onChange={setNPts} options={[{ value: "100000", label: "100k pts" }, { value: "1000000", label: "1M pts" }]} /><Btn variant="primary" disabled={busy} onClick={run}>{busy ? <><Spinner /> Running…</> : "Run budgets"}</Btn></>} />
      <div className="adm-grid adm-grid--2">
        <Panel title="Budgets" flush><table className="jp-table"><thead><tr><th>Check</th><th className="jp-num">Limit</th><th className="jp-num">Measured</th><th>Result</th></tr></thead><tbody>{BUDGETS.map((b) => { const m = res.find((x) => x.id === b.id); return <tr key={b.id}><td>{b.label}</td><td className="jp-num">{b.limitMs} ms</td><td className="jp-num adm-num">{m ? `${m.ms.toFixed(1)} ms` : "—"}</td><td>{m ? <Badge s={m.pass ? "ok" : "danger"}>{m.pass ? "within budget" : "over budget"}</Badge> : <span className="jp-muted">not run</span>}</td></tr>; })}</tbody></table>{mem && <p className="jp-muted" style={{ padding: "8px 16px" }}>JS heap in use: {(mem.usedJSHeapSize / 1e6).toFixed(0)} MB</p>}</Panel>
        <Panel title="1M-point series (canvas)"><div className="adm-stack"><canvas ref={cv} width={640} height={220} className="adm-bigcanvas" role="img" aria-label="Large series, downsampled with LTTB, with min/max envelope" /><p className="jp-muted">{info}</p><p className="jp-muted">The shaded band is the per-pixel min/max, so spikes survive; the line is the LTTB-chosen shape.</p></div></Panel>
      </div>
      <Panel title={`Virtualised table (${rows.length.toLocaleString()} rows)`} className="adm-section" flush><div ref={wrap}><DataTable<Row> rows={rows} cols={cols} virtual selectable={false} exportName="large-table" /></div></Panel>
      <div style={{ marginTop: 12 }}><Alert s="info" title="How it stays fast">Only the visible rows are in the DOM, sorting and filtering run on the data array, and the chart draws at most one column per pixel instead of one element per point.</Alert></div>
    </>
  );
}

/* ===== F018: touch targets, gestures, non-drag alternatives ===== */
const TKEY = "adm-touch";
export const applyTouchMode = (on: boolean) => { document.documentElement.dataset.touch = String(on); try { localStorage.setItem(TKEY, String(on)); } catch { /* ignore */ } };
export const touchModeSaved = () => { try { return localStorage.getItem(TKEY) === "true"; } catch { return false; } };
function SwipeRow({ children, onLeft, onRight, leftLabel, rightLabel }: { children: React.ReactNode; onLeft: () => void; onRight: () => void; leftLabel: string; rightLabel: string }) {
  const [dx, setDx] = useState(0); const start = useRef<[number, number] | null>(null); const press = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  return (
    <div className="adm-swipe" role="group" aria-label={`Swipe left to ${leftLabel.toLowerCase()}, right to ${rightLabel.toLowerCase()}`}>
      <div className="adm-swipe__bg"><span>{rightLabel}</span><span>{leftLabel}</span></div>
      <div className="adm-swipe__fg" style={{ transform: `translateX(${dx}px)`, transition: start.current ? "none" : "transform .2s" }}
        onPointerDown={(e) => { start.current = [e.clientX, e.clientY]; press.current = setTimeout(() => { start.current = null; setDx(0); }, 600); }}
        onPointerMove={(e) => { if (start.current) { const d = e.clientX - start.current[0]; setDx(Math.max(-120, Math.min(120, d))); if (Math.abs(d) > 8) clearTimeout(press.current); } }}
        onPointerUp={(e) => { clearTimeout(press.current); if (!start.current) return; const dir = swipeDir(e.clientX - start.current[0], e.clientY - start.current[1], 60); start.current = null; setDx(0); if (dir === "left") onLeft(); else if (dir === "right") onRight(); }}
        onPointerCancel={() => { start.current = null; setDx(0); }}>{children}</div>
    </div>
  );
}
export function TouchPage() {
  const { toast } = usePrefs(); const [touch, setTouch] = useState(touchModeSaved); const [rep, setRep] = useState<TargetReport[] | null>(null);
  const [items, setItems] = useState(["Replace UPS battery", "Rotate WireGuard keys", "Update ESP32 firmware", "Check ZFS scrub", "Renew certificate"]); const [pinned, setPinned] = useState<string[]>([]); const [refreshed, setRefreshed] = useState(new Date());
  const root = useRef<HTMLDivElement>(null); const toggle = (v: boolean) => { setTouch(v); applyTouchMode(v); };
  const audit = () => { const out: TargetReport[] = []; document.querySelectorAll<HTMLElement>("main a[href], main button, main input:not([type=hidden]), main select, main [role=button], main [role=tab], main [role=switch]").forEach((el) => { const r = el.getBoundingClientRect(); if (r.width === 0 && r.height === 0) return; const label = el.getAttribute("aria-label") || el.textContent?.trim().slice(0, 30) || el.tagName.toLowerCase(); out.push(checkTarget(label, r.width, r.height)); }); setRep(out); };
  const move = (i: number, d: number) => setItems((x) => { const j = i + d; if (j < 0 || j >= x.length) return x; const n = [...x]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const [drag, setDrag] = useState<number | null>(null);
  const bad = rep?.filter((r) => !r.ok) ?? [];
  return (
    <div ref={root}>
      <PageHeader title="Touch targets, gestures and alternatives" crumbs={["System", "Touch"]} desc={`Targets should be at least ${MIN_TARGET}px. Touch mode enlarges every control app-wide; every gesture here has a button or key alternative.`} actions={<Switch checked={touch} onChange={toggle} label="Touch mode (44px targets)" />} />
      <div className="adm-grid adm-grid--2">
        <Panel title="Target size audit" actions={<Btn sm variant="primary" onClick={audit}>Audit this page</Btn>}>{!rep ? <p className="jp-muted">Scans every control on this page and measures it. Try it with touch mode off, then on.</p> : <div className="adm-stack"><div className="adm-row"><Badge s={bad.length ? "warn" : "ok"}>{rep.length - bad.length} of {rep.length} meet {MIN_TARGET}px</Badge></div>{bad.length > 0 && <ul className="adm-tl--plain">{bad.slice(0, 10).map((b, i) => <li key={i}><code>{b.label}</code> <span className="jp-muted adm-num">{b.w}×{b.h}px</span></li>)}{bad.length > 10 && <li className="jp-muted">…and {bad.length - 10} more</li>}</ul>}</div>}</Panel>
        <Panel title="Pull to refresh, with a button"><div className="adm-stack"><p>Last refreshed <b className="adm-num">{refreshed.toLocaleTimeString("en-AU")}</b></p><Btn icon="refresh" onClick={() => { setRefreshed(new Date()); toast({ kind: "ok", title: "Refreshed" }); }}>Refresh</Btn><p className="jp-muted">On a touch screen you could drag down to refresh; the button is always there for keyboards and assistive tech.</p></div></Panel>
      </div>
      <Panel title="Swipe rows (left: archive, right: pin) with button alternatives" className="adm-section" flush>
        <ul className="adm-list" style={{ overflow: "hidden" }}>{items.map((t, i) => <li key={t} style={{ padding: 0, display: "block" }}><SwipeRow leftLabel="Archive" rightLabel="Pin" onLeft={() => { setItems((x) => x.filter((y) => y !== t)); toast({ kind: "info", title: `Archived “${t}”`, undo: () => setItems((x) => [...x, t]) }); }} onRight={() => setPinned((p) => (p.includes(t) ? p.filter((y) => y !== t) : [...p, t]))}>
          <div className="adm-row" style={{ padding: "10px 16px", flexWrap: "nowrap" }}><span style={{ flex: 1 }}>{pinned.includes(t) && <Icon name="pin" size={13} />} {t}</span><Menu label="Actions" items={[{ label: pinned.includes(t) ? "Unpin" : "Pin", onSelect: () => setPinned((p) => (p.includes(t) ? p.filter((y) => y !== t) : [...p, t])) }, { label: "Archive", onSelect: () => setItems((x) => x.filter((y) => y !== t)) }]} /></div></SwipeRow></li>)}
          {items.length === 0 && <li style={{ padding: 16 }} className="jp-muted">All archived. <button className="adm-link" onClick={() => setItems(["Replace UPS battery", "Rotate WireGuard keys"])}>Restore samples</button></li>}</ul>
      </Panel>
      <Panel title="Reorder without dragging" className="adm-section"><ol className="adm-reorderlist">{items.map((t, i) => <li key={t} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag !== null && drag !== i) setItems((x) => { const n = [...x]; const [m] = n.splice(drag, 1); n.splice(i, 0, m); return n; }); setDrag(null); }}><span className="adm-x" aria-hidden>⠿</span><span style={{ flex: 1 }}>{t}</span><button className="adm-x" aria-label={`Move ${t} up`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button><button className="adm-x" aria-label={`Move ${t} down`} disabled={i === items.length - 1} onClick={() => move(i, 1)}>↓</button></li>)}</ol><p className="jp-muted" style={{ marginTop: 8 }}>Drag the handle, or use the arrow buttons. Both change the same order.</p></Panel>
    </div>
  );
}

/* ===== F019: delivery channels, quiet hours, digests ===== */
const CHANNELS: { id: Channel; label: string }[] = [{ id: "inapp", label: "In-app" }, { id: "email", label: "Email" }, { id: "push", label: "Push" }, { id: "digest", label: "Digest" }];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export function DeliveryPage() {
  const [cfg, setCfg] = useState<DeliveryConfig>(() => { try { return { ...DEFAULT_DELIVERY, ...(JSON.parse(localStorage.getItem("adm-delivery") || "null") ?? {}) } as DeliveryConfig; } catch { return DEFAULT_DELIVERY; } });
  useEffect(() => { try { localStorage.setItem("adm-delivery", JSON.stringify(cfg)); } catch { /* ignore */ } }, [cfg]);
  const [type, setType] = useState<NotifType>("mention"); const [when, setWhen] = useState("2026-11-12T23:30");
  const date = new Date(when); const r = routeEvent(type, cfg, date); const quiet = isQuiet(cfg.quiet, date);
  const toggle = (t: NotifType, c: Channel) => setCfg((x) => ({ ...x, channels: { ...x.channels, [t]: x.channels[t].includes(c) ? x.channels[t].filter((y) => y !== c) : [...x.channels[t], c] } }));
  const day = useMemo(() => Array.from({ length: 24 }, (_, h) => { const d = new Date(date); d.setHours(h, 0, 0, 0); return { h, q: isQuiet(cfg.quiet, d) }; }), [cfg.quiet, when]); // eslint-disable-line react-hooks/exhaustive-deps
  const sample: { t: NotifType; title: string }[] = [{ t: "mention", title: "Mia mentioned you" }, { t: "approval", title: "Refund needs approval" }, { t: "security", title: "New sign-in" }, { t: "system", title: "Deploy finished" }, { t: "progress", title: "Export ready" }];
  const deferred = sample.filter((s) => routeEvent(s.t, cfg, date).deferred.length);
  const html = useMemo(() => generateEmailHTML(DEFAULT_TOKENS), []);
  return (
    <>
      <PageHeader title="Delivery channels" crumbs={["System", "Delivery"]} desc="Choose where each kind of notification goes, set quiet hours, and see exactly what would happen to an event at a given time." />
      <div className="adm-grid adm-grid--2">
        <Panel title="Channels per notification type" flush><table className="jp-table"><thead><tr><th>Type</th>{CHANNELS.map((c) => <th key={c.id} style={{ textAlign: "center" }}>{c.label}</th>)}</tr></thead><tbody>{(Object.keys(NOTIF_META) as NotifType[]).map((t) => <tr key={t}><td><Icon name={NOTIF_META[t].icon} size={14} /> {NOTIF_META[t].label}</td>{CHANNELS.map((c) => <td key={c.id} style={{ textAlign: "center" }}><Checkbox checked={cfg.channels[t].includes(c.id)} onChange={() => toggle(t, c.id)} label={<span className="adm-sr">{NOTIF_META[t].label} via {c.label}</span>} /></td>)}</tr>)}</tbody></table></Panel>
        <Panel title="Quiet hours"><div className="adm-stack">
          <Switch checked={cfg.quiet.on} onChange={(on) => setCfg({ ...cfg, quiet: { ...cfg.quiet, on } })} label="Hold interruptions during quiet hours" />
          <div className="adm-grid adm-grid--2"><Field label="From">{(id) => <TextInput id={id} type="time" value={cfg.quiet.from} onChange={(from) => setCfg({ ...cfg, quiet: { ...cfg.quiet, from } })} />}</Field><Field label="Until">{(id) => <TextInput id={id} type="time" value={cfg.quiet.to} onChange={(to) => setCfg({ ...cfg, quiet: { ...cfg.quiet, to } })} />}</Field></div>
          <div className="adm-row" role="group" aria-label="Days">{DAYS.map((d, i) => <button key={d} type="button" aria-pressed={cfg.quiet.days.includes(i)} className={`adm-pill ${cfg.quiet.days.includes(i) ? "is-on" : ""}`} onClick={() => setCfg({ ...cfg, quiet: { ...cfg.quiet, days: cfg.quiet.days.includes(i) ? cfg.quiet.days.filter((x) => x !== i) : [...cfg.quiet.days, i] } })}>{d}</button>)}</div>
          <Checkbox checked={cfg.quiet.urgentBypass} onChange={(urgentBypass) => setCfg({ ...cfg, quiet: { ...cfg.quiet, urgentBypass } })} label="Security events bypass quiet hours" />
          <Field label="Digest sent at">{(id) => <Select id={id} value={String(cfg.digestHour)} onChange={(v) => setCfg({ ...cfg, digestHour: Number(v) })} options={["6", "7", "8", "9"].map((h) => ({ value: h, label: `${h.padStart(2, "0")}:00` }))} />}</Field>
          <div><div className="jp-label">The day (shaded = quiet)</div><div className="adm-daybar" role="img" aria-label="Quiet hours across the day">{day.map((d) => <i key={d.h} className={d.q ? "is-quiet" : ""} title={`${String(d.h).padStart(2, "0")}:00`} />)}</div></div></div></Panel>
      </div>
      <Panel title="What would happen?" className="adm-section"><div className="adm-grid adm-grid--2"><div className="adm-stack"><Field label="Event type">{(id) => <Select id={id} value={type} onChange={(v) => setType(v as NotifType)} options={(Object.keys(NOTIF_META) as NotifType[]).map((t) => ({ value: t, label: NOTIF_META[t].label }))} />}</Field><Field label="When">{(id) => <TextInput id={id} type="datetime-local" value={when} onChange={setWhen} />}</Field></div>
        <div className="adm-stack" aria-live="polite"><div className="adm-row"><Badge s={quiet ? "warn" : "ok"}>{quiet ? "quiet hours" : "normal hours"}</Badge></div><div><b>Delivered now:</b> {r.deliver.length ? r.deliver.map((c) => <Badge key={c} s="ok">{c}</Badge>) : <span className="jp-muted">nothing</span>}</div><div><b>Held for the digest:</b> {r.deferred.length ? r.deferred.map((c) => <Badge key={c} s="warn">{c}</Badge>) : <span className="jp-muted">nothing</span>}</div><p className="jp-muted">{r.reason}</p></div></div></Panel>
      <div className="adm-grid adm-grid--2" style={{ marginTop: 16 }}>
        <Panel title={`Digest queue at ${date.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })} (${deferred.length})`} flush>{deferred.length === 0 ? <p className="jp-muted" style={{ padding: 16 }}>Nothing is being held at this time.</p> : <ul className="adm-list">{deferred.map((s) => <li key={s.t}><Icon name={NOTIF_META[s.t].icon} size={16} /><span style={{ flex: 1 }}>{s.title}</span><Badge s="warn">in {String(cfg.digestHour).padStart(2, "0")}:00 digest</Badge></li>)}</ul>}</Panel>
        <Panel title="Email template (from @belikh/jupiter-tokens)"><p className="jp-muted" style={{ marginBottom: 8 }}>Email and digest messages use the same generated, inline-styled template as every other Jupiter email.</p><iframe title="Email template preview" className="adm-emailframe" sandbox="" srcDoc={html} style={{ height: 300 }} /></Panel>
      </div>
    </>
  );
}

/* ===== parity: which views exist on which surface ===== */
const Y = "●", P = "◐", N = "–";
const PARITY: [string, string, string, string, string, string, string][] = [
  ["Design tokens (colours, type, spacing)", Y, Y, Y, Y, Y, "One tokens JSON generates every target"],
  ["Dashboard: stat tiles + service table", Y, P, Y, Y, N, "TUI has the Lip Gloss palette only; no TUI app screens are built"],
  ["Empty state with illustration", Y, N, Y, Y, N, "Slint and GTK demos use the koala spot"],
  ["Dark / light switch", Y, Y, Y, Y, N, "TUI: choose Light or Dark palette in code"],
  ["Data table (sort, filter, edit)", Y, N, N, N, N, "Web only"],
  ["Charts (line, bar, gauges)", Y, N, N, N, N, "Web (SVG). ESPHome has its own gauge/spark widgets"],
  ["Forms and validation", Y, N, N, N, N, "Web only"],
  ["Warehouse kiosk / lobby / dock board", Y, N, N, N, N, "Web only (touch kiosk)"],
  ["Notifications and delivery rules", Y, N, N, N, N, "Web only; the email template is shared"],
  ["Invoice / report / letter documents", N, N, N, N, Y, "LaTeX classes in packages/latex"],
  ["Device instrument widgets", Y, N, N, N, N, "@belikh/jupiter-esphome renders for ESP displays; previewed on the web"],
  ["Email (inline-styled template)", Y, N, N, N, N, "jupiter-email.html; previewed on Share and Delivery pages"],
];
export function ParityPage() {
  const [filter, setFilter] = useState("all"); const rows = PARITY.filter((r) => filter === "all" || (filter === "gaps" ? r.slice(1, 6).includes(N) : r.slice(1, 6).every((c) => c !== N)));
  return (
    <>
      <PageHeader title="Surface parity" crumbs={["System", "Parity"]} desc="Where each view or feature exists today. ● built · ◐ theme or partial · – not built. Compiled by hand from the repo, so it can go stale." actions={<Segmented label="Show" value={filter} onChange={setFilter} options={[{ value: "all", label: "All" }, { value: "gaps", label: "Has gaps" }, { value: "full", label: "Complete" }]} />} />
      <Panel flush><div className="adm-dt__wrap"><table className="jp-table"><thead><tr><th>View or feature</th><th>Web</th><th>TUI (Go)</th><th>Slint</th><th>GTK</th><th>LaTeX</th><th>Notes</th></tr></thead><tbody>{rows.map((r) => <tr key={r[0]}><td>{r[0]}</td>{r.slice(1, 6).map((c, i) => <td key={i} style={{ textAlign: "center", color: c === Y ? "var(--jp-ok)" : c === P ? "var(--jp-warn)" : "var(--jp-text-muted)" }} aria-label={c === Y ? "built" : c === P ? "partial" : "not built"}>{c}</td>)}<td className="jp-muted" style={{ whiteSpace: "normal" }}>{r[6]}</td></tr>)}</tbody></table></div></Panel>
    </>
  );
}
