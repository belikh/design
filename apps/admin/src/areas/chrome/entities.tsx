import { useMemo, useState, type ReactNode } from "react";
import "./chrome.css";
import { Avatar, Badge, Btn, Dot, type Status } from "@belikh/jupiter-ui/kit.tsx";
import { DiffViewer, HoverCard } from "@belikh/jupiter-ui/extra.tsx";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";
import { Spark } from "@belikh/jupiter-ui/Charts.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";

/* ---------- entity chips with hover cards (E023) ---------- */
export type EntityType = "user" | "device" | "service" | "host";
export type Entity = { id: string; type: EntityType; name: string; status: Status | "off"; meta: [string, string][]; spark?: number[] };
export const ENTITY_ICON: Record<EntityType, string> = { user: "user", device: "cpu", service: "server", host: "rack" };
export const ENTITIES: Entity[] = [
  { id: "u-ava", type: "user", name: "Ava Nguyen", status: "ok", meta: [["Role", "Platform engineer"], ["Team", "Infrastructure"], ["Local time", "16:52 AEST"]] },
  { id: "u-noah", type: "user", name: "Noah Smith", status: "warn", meta: [["Role", "Network engineer"], ["Team", "Infrastructure"], ["Status", "In a meeting until 17:30"]] },
  { id: "d-esp-living", type: "device", name: "esp32-living", status: "ok", meta: [["Firmware", "2026.11.1"], ["Signal", "-58 dBm"], ["Uptime", "12 d 4 h"]], spark: [3, 5, 4, 6, 5, 7, 6] },
  { id: "d-ups", type: "device", name: "ups-rack-1", status: "warn", meta: [["Load", "61%"], ["Battery", "94%"], ["Runtime", "18 min"]], spark: [5, 6, 6, 7, 8, 8, 9] },
  { id: "s-api", type: "service", name: "jupiter-api", status: "ok", meta: [["Version", "4.12.0"], ["Region", "ap-southeast-2"], ["p95", "182 ms"]], spark: [4, 6, 5, 7, 6, 5, 6] },
  { id: "s-pxe", type: "service", name: "pxe-boot", status: "danger", meta: [["Version", "1.3.2"], ["Region", "home"], ["Last seen", "9 min ago"]], spark: [6, 5, 5, 3, 1, 0, 0] },
  { id: "h-nix1", type: "host", name: "nixos-fleet-01", status: "ok", meta: [["OS", "NixOS 26.05"], ["CPU", "8 cores · 31%"], ["Disk", "TANK 83%"]], spark: [3, 4, 4, 5, 4, 5, 5] },
  { id: "h-udm", type: "host", name: "udm-pro", status: "ok", meta: [["Role", "Gateway"], ["Clients", "40"], ["WAN", "165 / 34 Mbit/s"]] },
];
export const entityById = (id: string) => ENTITIES.find((e) => e.id === id);
export function EntityChip({ entity, compact }: { entity: Entity; compact?: boolean }) {
  const { toast } = usePrefs();
  return (
    <HoverCard trigger={<span className="adm-chipent" data-type={entity.type}>{entity.type === "user" ? <Avatar name={entity.name} size={18} /> : <Icon name={ENTITY_ICON[entity.type]} size={14} />}{!compact && <span>{entity.name}</span>}<Dot s={entity.status} /></span>}>
      <div className="adm-stack" style={{ gap: 8, minWidth: 240 }}>
        <div className="adm-row" style={{ flexWrap: "nowrap" }}>{entity.type === "user" ? <Avatar name={entity.name} size={40} s={entity.status === "off" ? "off" : entity.status} /> : <span className="adm-nicon is-info"><Icon name={ENTITY_ICON[entity.type]} size={20} /></span>}<div><b>{entity.name}</b><div className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>{entity.type}</div></div><span className="adm-spacer" /><Badge s={entity.status === "off" ? undefined : entity.status}>{entity.status === "ok" ? "healthy" : entity.status === "warn" ? "degraded" : entity.status === "danger" ? "down" : "offline"}</Badge></div>
        <dl className="adm-dl" style={{ gridTemplateColumns: "80px 1fr", gap: "4px 10px" }}>{entity.meta.map(([k, v]) => <div key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        {entity.spark && <Spark data={entity.spark} kind="area" w={240} h={28} />}
        <div className="adm-row"><Btn sm onClick={() => toast({ kind: "info", title: `Opened ${entity.name}` })}>Open</Btn><Btn sm variant="ghost" onClick={() => { navigator.clipboard?.writeText(entity.id); toast({ kind: "ok", title: "ID copied", body: entity.id }); }}>Copy ID</Btn></div>
      </div>
    </HoverCard>
  );
}

/* ---------- KPI with target, comparison chip, mini-gauge, metric list (E024) ---------- */
export function MiniGauge({ value, max = 100, size = 56 }: { value: number; max?: number; size?: number }) {
  const f = Math.max(0, Math.min(1, value / max)); const r = size / 2 - 5; const c = Math.PI * r; const color = f < 0.6 ? "var(--jp-ok)" : f < 0.85 ? "var(--jp-warn)" : "var(--jp-danger)";
  return (
    <svg width={size} height={size / 2 + 6} viewBox={`0 0 ${size} ${size / 2 + 6}`} role="img" aria-label={`${Math.round(f * 100)}% of ${max}`}>
      <path d={`M5 ${size / 2} A ${r} ${r} 0 0 1 ${size - 5} ${size / 2}`} fill="none" stroke="var(--jp-border)" strokeWidth="6" strokeLinecap="round" />
      <path d={`M5 ${size / 2} A ${r} ${r} 0 0 1 ${size - 5} ${size / 2}`} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${c * f} ${c}`} />
    </svg>
  );
}
export type Compare = { label: string; pct: number; invert?: boolean };
export function CompareChip({ c }: { c: Compare }) { const good = c.invert ? c.pct <= 0 : c.pct >= 0; return <span className={`adm-cmp ${good ? "is-good" : "is-bad"}`} title={c.label}>{c.pct >= 0 ? "▲" : "▼"} {Math.abs(c.pct).toFixed(1)}% <small>{c.label}</small></span>; }
export function KpiCard({ label, value, unit, current, target, higherIsBetter = true, compare, spark, gauge }: { label: string; value: string; unit?: string; current: number; target: number; higherIsBetter?: boolean; compare?: Compare[]; spark?: number[]; gauge?: { value: number; max: number } }) {
  const pct = Math.max(0, Math.min(150, (current / target) * 100)); const met = higherIsBetter ? current >= target : current <= target;
  const status = met ? "ok" : (higherIsBetter ? current / target >= 0.9 : target / current >= 0.9) ? "warn" : "danger";
  return (
    <article className="adm-kpi" aria-label={label}>
      <header><span className="jp-stat__label">{label}</span><Badge s={status}>{met ? "on target" : status === "warn" ? "close" : "off target"}</Badge></header>
      <div className="adm-kpi__main"><div><span className="jp-stat__value">{value}</span>{unit && <span className="jp-muted"> {unit}</span>}</div>{gauge ? <MiniGauge value={gauge.value} max={gauge.max} /> : spark ? <Spark data={spark} kind="area" w={80} h={30} /> : null}</div>
      <div className="adm-kpi__target" role="meter" aria-label={`${label} progress to target`} aria-valuemin={0} aria-valuemax={target} aria-valuenow={current}><div className="adm-kpi__track"><i className={`is-${status}`} style={{ width: `${Math.min(100, pct)}%` }} /><b style={{ left: `${Math.min(100, (100 / Math.max(100, pct)) * 100)}%` }} /></div><span className="adm-num">{Math.round(pct)}% of target</span></div>
      {compare && <div className="adm-row">{compare.map((c) => <CompareChip key={c.label} c={c} />)}</div>}
    </article>
  );
}
export function MetricList({ rows, title }: { rows: { label: string; value: string; delta?: number; invert?: boolean; share?: number; note?: string }[]; title?: string }) {
  return (
    <ul className="adm-metrics" aria-label={title}>
      {rows.map((r) => (
        <li key={r.label}><span className="adm-metrics__l"><b>{r.label}</b>{r.note && <small className="jp-muted">{r.note}</small>}</span><span className="adm-metrics__bar" aria-hidden>{r.share !== undefined && <i style={{ width: `${r.share}%` }} />}</span><span className="adm-num"><b>{r.value}</b></span>{r.delta !== undefined ? <CompareChip c={{ label: "", pct: r.delta, invert: r.invert }} /> : <span />}</li>
      ))}
    </ul>
  );
}

/* ---------- timeline variants (E025) ---------- */
export type TLEvent = { id: string; at: number; title: string; body?: string; kind: Status | "off"; actor?: string; diff?: { before: string; after: string; label?: string } };
const dayLabel = (t: number) => new Date(t).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "short" });
const tm = (t: number) => new Date(t).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
function EventBody({ e }: { e: TLEvent }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="adm-tl__body"><div className="adm-row" style={{ flexWrap: "nowrap" }}><b>{e.title}</b>{e.actor && <span className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>by {e.actor}</span>}<span className="adm-spacer" /><time className="adm-num jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>{tm(e.at)}</time></div>
      {e.body && <p className="jp-muted">{e.body}</p>}
      {e.diff && <><button className="adm-link" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Hide changes" : `Show changes${e.diff.label ? ` (${e.diff.label})` : ""}`}</button>{open && <DiffViewer before={e.diff.before} after={e.diff.after} labels={["before", "after"]} />}</>}</div>
  );
}
export function Timeline({ events, variant = "vertical" }: { events: TLEvent[]; variant?: "vertical" | "horizontal" | "grouped" }) {
  const sorted = useMemo(() => [...events].sort((a, b) => b.at - a.at), [events]);
  if (variant === "horizontal") {
    const asc = [...sorted].reverse();
    return <ol className="adm-tl adm-tl--h" aria-label="Timeline (horizontal)" tabIndex={0}>{asc.map((e) => <li key={e.id}><span className="adm-tl__stamp adm-num">{dayLabel(e.at).slice(0, 10)}</span><span className={`adm-tl__dot adm-dot--${e.kind}`} /><EventBody e={e} /></li>)}</ol>;
  }
  if (variant === "grouped") {
    const days = [...new Set(sorted.map((e) => dayLabel(e.at)))];
    return <div className="adm-tl adm-tl--g">{days.map((d) => <section key={d}><h4 className="adm-tl__day">{d}</h4><ol>{sorted.filter((e) => dayLabel(e.at) === d).map((e) => <li key={e.id}><span className={`adm-tl__dot adm-dot--${e.kind}`} /><EventBody e={e} /></li>)}</ol></section>)}</div>;
  }
  return <ol className="adm-tl adm-tl--v" aria-label="Timeline">{sorted.map((e) => <li key={e.id}><span className={`adm-tl__dot adm-dot--${e.kind}`} /><EventBody e={e} /></li>)}</ol>;
}
export type { ReactNode };
