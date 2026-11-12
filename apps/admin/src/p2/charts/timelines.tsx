import { useMemo, useState } from "react";
import { C, Legend, Spark, Treemap } from "@belikh/jupiter-ui/Charts.tsx";
import { ChartFrame, Readout, type FrameState } from "./frame.tsx";
import { autoState, fmt1, niceDomain } from "./shared.tsx";
import { clamp, clusterLogs, lanePack, percentile, pct, sankeyLayout, spreadLabels, stackByTime, sum } from "./lib.ts";

type Common = { title?: string; state?: FrameState };
const dayLabel = (base: number, d: number) => new Date(base + d * 86400000).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(Math.round(m % 60)).padStart(2, "0")}`;

/* ---------- D048: Gantt / swimlane ---------- */
export type GTask = { id: string; name: string; lane?: string; start: number; end: number; progress: number; deps?: string[] };
export function Gantt({ tasks, baseDate, today, mode = "gantt", title = "Gantt chart", state }: Common & { tasks: GTask[]; baseDate: number; today: number; mode?: "gantt" | "swimlane" }) {
  return (
    <ChartFrame title={`${title} (${mode})`} state={autoState(state, tasks.length)} table={{ head: ["Task", "Lane", "Start", "End", "Progress", "Depends on"], rows: tasks.map((t) => [t.name, t.lane ?? "", dayLabel(baseDate, t.start), dayLabel(baseDate, t.end), pct(t.progress), (t.deps ?? []).join(", ")]) }}>
      {(w) => <GanttBody w={w} tasks={tasks} baseDate={baseDate} today={today} mode={mode} title={title} />}
    </ChartFrame>
  );
}
function GanttBody({ w, tasks, baseDate, today, mode, title }: { w: number; tasks: GTask[]; baseDate: number; today: number; mode: "gantt" | "swimlane"; title: string }) {
  const [sel, setSel] = useState<string | null>(null); const [ppd, setPpd] = useState(0); const lo = Math.min(...tasks.map((t) => t.start)), hi = Math.max(...tasks.map((t) => t.end), today); const span = Math.max(1, hi - lo);
  const lw = mode === "gantt" ? Math.min(150, w * 0.28) : 90, fit = (w - lw - 16) / span, px = ppd || fit, W = Math.max(w, lw + span * px + 16), x = (d: number) => lw + (d - lo) * px;
  const rows = useMemo(() => {
    if (mode === "gantt") return [...tasks].sort((a, b) => a.start - b.start).map((t, i) => ({ t, row: i, lane: t.name }));
    const lanes = [...new Set(tasks.map((t) => t.lane ?? "Other"))]; let row = 0; const out: { t: GTask; row: number; lane: string }[] = [];
    for (const ln of lanes) { const packed = lanePack(tasks.filter((t) => (t.lane ?? "Other") === ln).map((t) => ({ ...t, start: t.start, end: t.end }))); const rowsIn = Math.max(...packed.map((p) => p.lane)) + 1; packed.forEach((p) => out.push({ t: p as unknown as GTask, row: row + p.lane, lane: ln })); row += rowsIn; }
    return out;
  }, [tasks, mode]);
  const rowH = 30, nRows = Math.max(...rows.map((r) => r.row)) + 1, H = nRows * rowH + 34; const at = new Map(rows.map((r) => [r.t.id, r]));
  const laneLabels = mode === "swimlane" ? [...new Map(rows.map((r) => [r.lane, r.row])).entries()] : [];
  const tickStep = span > 90 ? 14 : span > 40 ? 7 : span > 14 ? 2 : 1; const ticks = Array.from({ length: Math.floor(span / tickStep) + 1 }, (_, i) => lo + i * tickStep);
  const cur = sel ? tasks.find((t) => t.id === sel) : null;
  return (
    <>
      <label className="adm-row" style={{ marginBottom: 6 }}><span className="jp-muted">Zoom</span><input type="range" min={0} max={40} value={ppd ? Math.round(ppd) : 0} onChange={(e) => setPpd(Number(e.target.value) < 6 ? 0 : Number(e.target.value))} aria-label="Pixels per day (0 = fit)" style={{ accentColor: "var(--jp-accent)" }} /><span className="pc-note" style={{ margin: 0 }}>{ppd ? `${Math.round(ppd)} px/day` : "fit to width"}</span></label>
      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ maxWidth: "none" }} role="img" aria-label={`${title}: ${tasks.length} tasks`}>
          <defs><marker id="pc-ga" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--jp-text-muted)" /></marker></defs>
          {ticks.map((d, ti) => <g key={d}><line x1={x(d)} x2={x(d)} y1={22} y2={H - 4} className="adm-gl" />{ti % Math.max(1, Math.ceil(64 / Math.max(1, px * tickStep))) === 0 && <text x={x(d)} y={14} textAnchor="middle" className="adm-axis">{dayLabel(baseDate, d)}</text>}</g>)}
          {mode === "swimlane" && laneLabels.map(([l, r]) => <text key={l} x={6} y={34 + r * rowH + 16} className="adm-axis" fontWeight="700">{l}</text>)}
          {rows.map(({ t, row }) => { const y = 30 + row * rowH, on = sel === t.id; const col = C(mode === "swimlane" ? [...new Set(tasks.map((q) => q.lane ?? "Other"))].indexOf(t.lane ?? "Other") : 0);
            return (<g key={t.id} className="pc-pt" tabIndex={0} role="img" aria-label={`${t.name}: ${dayLabel(baseDate, t.start)} to ${dayLabel(baseDate, t.end)}, ${pct(t.progress)} done`} onMouseEnter={() => setSel(t.id)} onFocus={() => setSel(t.id)} onMouseLeave={() => setSel(null)} onBlur={() => setSel(null)}>
              {mode === "gantt" && <text x={6} y={y + 16} className="adm-axis" fontWeight={on ? 700 : 400}>{t.name.length > 20 ? t.name.slice(0, 19) + "…" : t.name}</text>}
              <rect x={x(t.start)} y={y + 2} width={Math.max(4, (t.end - t.start) * px)} height={20} rx="4" fill={col} fillOpacity=".28" stroke={col} strokeWidth={on ? 3 : 1.5} /><rect x={x(t.start)} y={y + 2} width={Math.max(0, (t.end - t.start) * px * clamp(t.progress, 0, 1))} height={20} rx="4" fill={col} />
              {mode === "swimlane" && (t.end - t.start) * px > 60 && <text x={x(t.start) + 5} y={y + 16} fontSize="12.5" fill="var(--jp-on-accent)" style={{ pointerEvents: "none" }}>{t.name.slice(0, Math.floor(((t.end - t.start) * px) / 6.5))}</text>}</g>); })}
          {tasks.flatMap((t) => (t.deps ?? []).map((d) => { const a = at.get(d), b = at.get(t.id); if (!a || !b) return null; const x1 = x(a.t.end), y1 = 30 + a.row * rowH + 12, x2 = x(b.t.start), y2 = 30 + b.row * rowH + 12; return <path key={`${d}>${t.id}`} d={`M${x1},${y1}H${Math.max(x1 + 6, (x1 + x2) / 2)}V${y2}H${x2 - 2}`} fill="none" stroke="var(--jp-text-muted)" strokeWidth="1.3" markerEnd="url(#pc-ga)" />; }))}
          <line x1={x(today)} x2={x(today)} y1={20} y2={H - 4} stroke="var(--jp-danger)" strokeWidth="2" strokeDasharray="4 3" /><text x={x(today) + 4} y={H - 8} className="adm-axis" fill="var(--jp-danger)">today</text>
        </svg>
      </div>
      <Readout>{cur ? `${cur.name}: ${dayLabel(baseDate, cur.start)} → ${dayLabel(baseDate, cur.end)}, ${pct(cur.progress)} complete${cur.deps?.length ? `, after ${cur.deps.join(", ")}` : ""}` : "Arrows show dependencies; the dashed line is today."}</Readout>
    </>
  );
}

/* ---------- D048: resource schedule with conflicts ---------- */
export type Booking = { id: string; resource: string; start: number; end: number; label: string };
export const findConflicts = (b: Booking[]) => { const out: [Booking, Booking][] = []; for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) if (b[i].resource === b[j].resource && b[i].start < b[j].end && b[j].start < b[i].end) out.push([b[i], b[j]]); return out; };
export function ResourceSchedule({ resources, bookings, hours = [7, 19], title = "Resource schedule", state }: Common & { resources: string[]; bookings: Booking[]; hours?: [number, number] }) {
  const conflicts = useMemo(() => findConflicts(bookings), [bookings]); const bad = new Set(conflicts.flat().map((b) => b.id));
  return (
    <ChartFrame title={title} state={autoState(state, resources.length)} table={{ head: ["Resource", "Booking", "From", "To", "Conflict"], rows: bookings.map((b) => [b.resource, b.label, hhmm(b.start * 60), hhmm(b.end * 60), bad.has(b.id) ? "yes" : ""]) }}
      footer={<p className="pc-note" role="status">{conflicts.length ? `⚠ ${conflicts.length} conflict${conflicts.length > 1 ? "s" : ""}: ${conflicts.map(([a, b]) => `${a.resource}: ${a.label} overlaps ${b.label}`).join("; ")}` : "No double-bookings."}</p>}>
      {(w) => {
        const lw = Math.min(120, w * 0.22), rowH = 40, H = resources.length * rowH + 30, x = (h: number) => lw + ((h - hours[0]) / (hours[1] - hours[0])) * (w - lw - 12);
        return (
          <svg viewBox={`0 0 ${w} ${H}`} style={{ width: "100%", height: H }} role="img" aria-label={`${title}: ${resources.length} resources, ${conflicts.length} conflicts`}>
            <defs><pattern id="pc-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="6" fill="var(--jp-danger)" opacity=".55" /></pattern></defs>
            {Array.from({ length: hours[1] - hours[0] + 1 }, (_, i) => hours[0] + i).map((h, _i, arr) => <g key={h}><line x1={x(h)} x2={x(h)} y1={20} y2={H - 4} className="adm-gl" />{(h - hours[0]) % Math.max(1, Math.ceil(arr.length / Math.max(2, Math.floor(w / 60)))) === 0 && <text x={x(h)} y={14} textAnchor="middle" className="adm-axis">{h}:00</text>}</g>)}
            {resources.map((r, i) => <g key={r}><text x={6} y={30 + i * rowH + 22} className="adm-axis" fontWeight="700">{r}</text>{bookings.filter((b) => b.resource === r).map((b) => <g key={b.id} role="img" aria-label={`${b.label}, ${hhmm(b.start * 60)} to ${hhmm(b.end * 60)}${bad.has(b.id) ? ", conflict" : ""}`}><rect x={x(b.start)} y={30 + i * rowH + 4} width={Math.max(3, x(b.end) - x(b.start))} height={26} rx="4" fill={C(i)} fillOpacity=".85" stroke={bad.has(b.id) ? "var(--jp-danger)" : "none"} strokeWidth="2.5" />{bad.has(b.id) && <rect x={x(b.start)} y={30 + i * rowH + 4} width={Math.max(3, x(b.end) - x(b.start))} height={26} rx="4" fill="url(#pc-hatch)" />}<text x={x(b.start) + 5} y={30 + i * rowH + 21} fontSize="12.5" fill="var(--jp-on-accent)" style={{ pointerEvents: "none" }}>{b.label.slice(0, Math.max(2, Math.floor((x(b.end) - x(b.start)) / 6)))}</text></g>)}</g>)}
          </svg>
        );
      }}
    </ChartFrame>
  );
}

/* ---------- D048: event river (streamgraph) ---------- */
export function EventRiver({ labels, categories, title = "Event river", state }: Common & { labels: string[]; categories: { name: string; data: number[] }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  return (
    <ChartFrame title={title} state={autoState(state, labels.length && categories.length ? 1 : 0)} height={260} table={{ head: ["Time", ...categories.map((c) => c.name)], rows: labels.map((l, i) => [l, ...categories.map((c) => c.data[i])]) }}>
      {(w) => {
        const n = labels.length, m = { l: 12, r: 12, t: 10, b: 26 }, H = 260, x = (i: number) => m.l + (i * (w - m.l - m.r)) / Math.max(1, n - 1);
        const tot = labels.map((_, i) => sum(categories.map((c) => c.data[i] ?? 0))), mx = Math.max(1, ...tot), y = (v: number) => (H - m.t - m.b) / 2 + m.t + (v / mx) * ((H - m.t - m.b) / 2) * 0.95;
        const base = tot.map((t) => -t / 2); const layers = categories.map((c, k) => { const lo = base.slice(), hi = base.map((b, i) => b + (c.data[i] ?? 0)); for (let i = 0; i < n; i++) base[i] = hi[i]; return { k, lo, hi }; });
        const smooth = (pts: [number, number][]) => pts.map(([px, py], i) => { if (!i) return `M${px},${py}`; const cx = (pts[i - 1][0] + px) / 2; return `C${cx},${pts[i - 1][1]} ${cx},${py} ${px},${py}`; }).join("");
        return (
          <>
            <svg viewBox={`0 0 ${w} ${H}`} style={{ width: "100%", height: H }} role="img" aria-label={`${title}: ${categories.map((c) => c.name).join(", ")}`} onMouseLeave={() => setHover(null)} onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHover(clamp(Math.round(((e.clientX - r.left - m.l) / (w - m.l - m.r)) * (n - 1)), 0, n - 1)); }}>
              {layers.map(({ k, lo, hi }) => { const top = hi.map((v, i) => [x(i), y(v)] as [number, number]), bot = lo.map((v, i) => [x(i), y(v)] as [number, number]).reverse(); return <path key={k} d={smooth(top) + "L" + bot[0][0] + "," + bot[0][1] + smooth(bot).slice(smooth(bot).indexOf("C")) + "Z"} fill={C(k)} fillOpacity=".82" stroke="var(--jp-surface-raised)" strokeWidth="1" />; })}
              {labels.map((l, i) => i % Math.max(1, Math.ceil(n / 8)) === 0 && <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : "middle"} className="adm-axis">{l}</text>)}
              {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={H - m.b} className="adm-cross" />}
            </svg>
            <Legend items={categories.map((c, k) => ({ name: c.name, color: C(k) }))} />
            <Readout>{hover !== null ? `${labels[hover]}: ${categories.map((c) => `${c.name} ${c.data[hover]}`).join(" · ")} (total ${tot[hover]})` : "The river widens when more events happen."}</Readout>
          </>
        );
      }}
    </ChartFrame>
  );
}

/* ---------- D051: state timeline strips + event strip + annotation lane ---------- */
export type TState = "up" | "degraded" | "down" | "maintenance" | "unknown";
const STATE_STYLE: Record<TState, { fill: string; pat?: boolean; label: string }> = { up: { fill: "var(--jp-ok)", label: "Up" }, degraded: { fill: "var(--jp-warn)", label: "Degraded" }, down: { fill: "var(--jp-danger)", pat: true, label: "Down" }, maintenance: { fill: "var(--adm-c3)", label: "Maintenance" }, unknown: { fill: "var(--jp-border)", label: "No data" } };
export type Strip = { name: string; segments: { start: number; end: number; state: TState }[] };
export function StateTimeline({ entities, events = [], annotations = [], domain, title = "State timeline", state }: Common & { entities: Strip[]; events?: { t: number; label: string }[]; annotations?: { start: number; end: number; label: string }[]; domain: [number, number] }) {
  const [range, setRange] = useState<[number, number]>(domain); const [drag, setDrag] = useState<[number, number] | null>(null);
  const rows: (string | number)[][] = entities.flatMap((e) => e.segments.map((s) => [e.name, STATE_STYLE[s.state].label, hhmm(s.start), hhmm(s.end), Math.round(s.end - s.start)]));
  return (
    <ChartFrame title={title} state={autoState(state, entities.length)} table={{ head: ["Entity", "State", "From", "To", "Minutes"], rows }}
      footer={<><Legend items={(Object.keys(STATE_STYLE) as TState[]).map((s) => ({ name: `${s === "down" ? "▨ " : ""}${STATE_STYLE[s].label}`, color: STATE_STYLE[s].fill }))} /><div className="adm-row"><span className="pc-note" style={{ margin: 0 }}>Drag across a strip to zoom ({hhmm(range[0])}–{hhmm(range[1])}).</span>{(range[0] !== domain[0] || range[1] !== domain[1]) && <button className="jp-btn jp-btn--ghost jp-btn--sm" onClick={() => setRange(domain)}>Reset zoom</button>}</div></>}>
      {(w) => {
        const lw = Math.min(110, w * 0.2), rowH = 26, aH = annotations.length ? 24 : 0, eH = events.length ? 40 : 0, H = 22 + entities.length * rowH + eH + aH + 10, x = (v: number) => lw + ((v - range[0]) / (range[1] - range[0])) * (w - lw - 10), inv = (px: number) => range[0] + ((px - lw) / (w - lw - 10)) * (range[1] - range[0]);
        const ticks = Array.from({ length: 7 }, (_, i) => range[0] + ((range[1] - range[0]) * i) / 6);
        const evs = events.filter((e) => e.t >= range[0] && e.t <= range[1]); const evY = spreadLabels(evs.map(() => 0), 0); void evY;
        const lanes = lanePack(evs.map((e) => ({ ...e, start: x(e.t), end: x(e.t) + e.label.length * 6 + 16 })));
        return (
          <svg viewBox={`0 0 ${w} ${H}`} style={{ width: "100%", height: H, cursor: "crosshair" }} role="img" aria-label={`${title}: ${entities.length} entities`}
            onMouseDown={(e) => { const r = e.currentTarget.getBoundingClientRect(); const v = inv(e.clientX - r.left); setDrag([v, v]); }} onMouseMove={(e) => { if (!drag) return; const r = e.currentTarget.getBoundingClientRect(); setDrag([drag[0], inv(e.clientX - r.left)]); }} onMouseUp={() => { if (drag && Math.abs(drag[1] - drag[0]) > (range[1] - range[0]) * 0.03) setRange([clamp(Math.min(...drag), domain[0], domain[1]), clamp(Math.max(...drag), domain[0], domain[1])]); setDrag(null); }} onMouseLeave={() => setDrag(null)}>
            <defs><pattern id="pc-dn" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--jp-danger)" /><rect width="2.5" height="6" fill="var(--jp-surface-raised)" opacity=".55" /></pattern></defs>
            {ticks.map((t) => <g key={t}><line x1={x(t)} x2={x(t)} y1={16} y2={H - 4} className="adm-gl" /><text x={x(t)} y={11} textAnchor="middle" className="adm-axis">{hhmm(t)}</text></g>)}
            {entities.map((en, i) => <g key={en.name}><text x={6} y={22 + i * rowH + 17} className="adm-axis" fontWeight="700">{en.name}</text>{en.segments.filter((s) => s.end > range[0] && s.start < range[1]).map((s, k) => { const x1 = x(Math.max(s.start, range[0])), x2 = x(Math.min(s.end, range[1])); return <rect key={k} x={x1} y={22 + i * rowH + 3} width={Math.max(1, x2 - x1)} height={18} fill={STATE_STYLE[s.state].pat ? "url(#pc-dn)" : STATE_STYLE[s.state].fill} fillOpacity={s.state === "unknown" ? 0.6 : 0.9}><title>{`${en.name}: ${STATE_STYLE[s.state].label} ${hhmm(s.start)}–${hhmm(s.end)}`}</title></rect>; })}</g>)}
            {events.length > 0 && <g transform={`translate(0,${22 + entities.length * rowH + 6})`}><text x={6} y={14} className="adm-axis" fontWeight="700">Events</text>{lanes.map((e, k) => <g key={k} transform={`translate(${x(e.t)},${(e.lane % 2) * 16})`}><path d="M0,2l5,5l-5,5l-5,-5z" fill="var(--jp-text)" /><text x={8} y={10} fontSize="12.5" fill="var(--jp-text)">{e.label}</text></g>)}</g>}
            {annotations.length > 0 && <g transform={`translate(0,${22 + entities.length * rowH + eH + 4})`}><text x={6} y={14} className="adm-axis" fontWeight="700">Notes</text>{annotations.filter((a) => a.end > range[0] && a.start < range[1]).map((a, k) => <g key={k}><rect x={x(Math.max(a.start, range[0]))} y={2} width={Math.max(2, x(Math.min(a.end, range[1])) - x(Math.max(a.start, range[0])))} height={16} rx="3" fill="var(--adm-c3)" fillOpacity=".25" stroke="var(--adm-c3)" /><text x={x(Math.max(a.start, range[0])) + 4} y={14} fontSize="12.5" fill="var(--jp-text)">{a.label}</text></g>)}</g>}
            {drag && <rect x={x(Math.min(...drag))} y={16} width={Math.abs(x(drag[1]) - x(drag[0]))} height={H - 20} fill="var(--jp-accent)" opacity=".15" />}
          </svg>
        );
      }}
    </ChartFrame>
  );
}

/* ---------- D052: log volume histogram stacked by level + pattern clusters ---------- */
const LEVELS = ["debug", "info", "warn", "error"] as const; const LEVEL_COLOR = { debug: "var(--adm-c7)", info: "var(--adm-c1)", warn: "var(--adm-c2)", error: "var(--jp-danger)" } as const;
export function LogVolume({ lines, buckets = 24, title = "Log volume by level", state }: Common & { lines: { t: number; level: string; msg: string }[]; buckets?: number }) {
  const [sel, setSel] = useState<number | null>(null); const t0 = Math.min(...lines.map((l) => l.t)), t1 = Math.max(...lines.map((l) => l.t)), span = Math.max(1, t1 - t0);
  const stacks = useMemo(() => stackByTime(lines.map((l) => ({ t: l.t, key: l.level })), [...LEVELS], buckets, t0, t1), [lines, buckets, t0, t1]);
  const shown = sel === null ? lines : lines.filter((l) => Math.min(buckets - 1, Math.floor(((l.t - t0) / span) * buckets)) === sel);
  const clusters = useMemo(() => clusterLogs(shown, 10, sel === null ? t0 : t0 + (sel * span) / buckets, sel === null ? t1 : t0 + ((sel + 1) * span) / buckets), [shown, sel, t0, t1, span, buckets]);
  return (
    <ChartFrame title={title} state={autoState(state, lines.length)} height={300} table={{ head: ["Pattern", "Count", "Levels", "Example"], rows: clusters.map((c) => [c.pattern, c.count, Object.entries(c.levels).map(([k, v]) => `${k} ${v}`).join(", "), c.example]) }}
      footer={<div style={{ marginTop: 10 }}><div className="adm-row" style={{ marginBottom: 6 }}><b>Message patterns</b><span className="jp-muted">{sel === null ? "all time" : `bucket ${sel + 1} of ${buckets}`}: {shown.length} lines, {clusters.length} patterns</span>{sel !== null && <button className="jp-btn jp-btn--ghost jp-btn--sm" onClick={() => setSel(null)}>Clear filter</button>}</div>
        <div style={{ overflow: "auto" }}><table className="pc-table" aria-label="Log patterns"><thead><tr><th>Pattern</th><th className="num">Count</th><th>Over time</th><th>Levels</th></tr></thead><tbody>{clusters.slice(0, 8).map((c) => <tr key={c.pattern}><td title={c.example} style={{ whiteSpace: "normal", maxWidth: 320 }}><code>{c.pattern}</code></td><td className="num">{c.count}</td><td><Spark data={c.series} kind="bar" w={80} h={20} /></td><td>{Object.entries(c.levels).map(([k, v]) => <span key={k} className="pc-chip" style={{ marginInlineEnd: 4 }}>{k} {v}</span>)}</td></tr>)}</tbody></table></div></div>}>
      {(w) => {
        const m = { l: 40, r: 10, t: 10, b: 24 }, H = 300, tot = Array.from({ length: buckets }, (_, i) => sum(stacks.map((s) => s[i]))), d = niceDomain(0, Math.max(1, ...tot)), bw = (w - m.l - m.r) / buckets, y = (v: number) => H - m.b - (v / d.hi) * (H - m.t - m.b);
        return (
          <>
            <svg viewBox={`0 0 ${w} ${H}`} style={{ width: "100%", height: H }} role="img" aria-label={`${title}: ${lines.length} lines in ${buckets} buckets. Select a bar to filter patterns.`}>
              {d.ticks.map((t) => <g key={t}><line x1={m.l} x2={w - m.r} y1={y(t)} y2={y(t)} className="adm-gl" /><text x={m.l - 6} y={y(t) + 4} textAnchor="end" className="adm-axis">{fmt1(t)}</text></g>)}
              {Array.from({ length: buckets }, (_, i) => { let acc = 0; return (
                <g key={i} className="pc-pt" tabIndex={0} role="button" aria-pressed={sel === i} aria-label={`Bucket ${i + 1}: ${tot[i]} lines`} opacity={sel === null || sel === i ? 1 : 0.4} onClick={() => setSel(sel === i ? null : i)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(sel === i ? null : i); } }}>
                  <rect x={m.l + i * bw} y={m.t} width={bw} height={H - m.t - m.b} fill="transparent" />
                  {LEVELS.map((lv, k) => { const v = stacks[k][i]; const yb = y(acc), yt = y(acc + v); acc += v; return <rect key={lv} x={m.l + i * bw + 1} y={yt} width={Math.max(1, bw - 2)} height={Math.max(0, yb - yt)} fill={LEVEL_COLOR[lv]} />; })}</g>); })}
              {[0, Math.floor(buckets / 2), buckets - 1].map((i) => <text key={i} x={m.l + (i + 0.5) * bw} y={H - 8} textAnchor="middle" className="adm-axis">{hhmm(t0 + ((i + 0.5) * span) / buckets)}</text>)}
            </svg>
            <Legend items={LEVELS.map((l) => ({ name: l, color: LEVEL_COLOR[l] }))} />
          </>
        );
      }}
    </ChartFrame>
  );
}

/* ---------- D053: CPU core heat strip ---------- */
export function CoreHeat({ data, labels, title = "CPU core heat strip", state }: Common & { data: number[][]; labels: string[] }) {
  const [cell, setCell] = useState<[number, number] | null>(null);
  return (
    <ChartFrame title={title} state={autoState(state, data.length)} height={Math.max(120, data.length * 20 + 40)} table={{ head: ["Core", ...labels], rows: data.map((r, i) => [`cpu${i}`, ...r.map((v) => Math.round(v))]) }}>
      {(w) => {
        const lw = 46, rowH = Math.max(14, Math.min(22, 220 / data.length)), cw = (w - lw - 8) / (data[0]?.length || 1), H = data.length * rowH + 28;
        return (
          <>
            <svg viewBox={`0 0 ${w} ${H}`} style={{ width: "100%", height: H }} role="img" aria-label={`${title}: ${data.length} cores`} onMouseLeave={() => setCell(null)}>
              {data.map((r, i) => <g key={i}><text x={lw - 6} y={i * rowH + rowH - 4} textAnchor="end" className="adm-axis">cpu{i}</text>{r.map((v, j) => <rect key={j} x={lw + j * cw} y={i * rowH + 1} width={Math.max(1, cw - 0.5)} height={rowH - 2} fill="var(--jp-accent)" fillOpacity={0.05 + 0.95 * clamp(v / 100, 0, 1)} stroke={v >= 90 ? "var(--jp-warn)" : "none"} strokeWidth="1.5" onMouseEnter={() => setCell([i, j])} />)}</g>)}
              {[0, Math.floor(labels.length / 2), labels.length - 1].map((j) => <text key={j} x={lw + (j + 0.5) * cw} y={H - 6} textAnchor="middle" className="adm-axis">{labels[j]}</text>)}
            </svg>
            <Readout>{cell ? `cpu${cell[0]} at ${labels[cell[1]]}: ${Math.round(data[cell[0]][cell[1]])}%${data[cell[0]][cell[1]] >= 90 ? " (hot)" : ""}` : "Darker = busier. Amber outline = 90%+."}</Readout>
          </>
        );
      }}
    </ChartFrame>
  );
}

/* ---------- D053: per-process treemap ---------- */
export function ProcessTreemap({ processes, title = "Process treemap", state }: Common & { processes: { name: string; cpu: number; mem: number }[] }) {
  const [metric, setMetric] = useState<"cpu" | "mem">("cpu");
  return (
    <ChartFrame title={title} state={autoState(state, processes.length)} height={260} table={{ head: ["Process", "CPU (%)", "Memory (MB)"], rows: processes.map((p) => [p.name, p.cpu, p.mem]) }}
      footer={<div className="adm-row" style={{ marginTop: 6 }}><span className="jp-muted">Size by</span>{(["cpu", "mem"] as const).map((m) => <button key={m} className={`adm-pill ${metric === m ? "is-on" : ""}`} aria-pressed={metric === m} onClick={() => setMetric(m)}>{m === "cpu" ? "CPU" : "Memory"}</button>)}</div>}>
      {() => <Treemap height={240} items={processes.map((p) => ({ label: `${p.name} ${metric === "cpu" ? `${p.cpu}%` : `${p.mem} MB`}`, value: Math.max(0.01, metric === "cpu" ? p.cpu : p.mem) }))} />}
    </ChartFrame>
  );
}

/* ---------- D053: thread timeline ---------- */
export type TrState = "running" | "blocked" | "sleeping" | "io";
const TR: Record<TrState, { fill: string; label: string }> = { running: { fill: "var(--adm-c1)", label: "Running" }, blocked: { fill: "var(--adm-c4)", label: "Blocked (lock)" }, sleeping: { fill: "var(--adm-c7)", label: "Sleeping" }, io: { fill: "var(--adm-c3)", label: "I/O wait" } };
export function ThreadTimeline({ threads, title = "Thread timeline", state }: Common & { threads: { name: string; spans: { start: number; end: number; state: TrState }[] }[] }) {
  const [sel, setSel] = useState<string | null>(null); const tot = (t: (typeof threads)[0], s: TrState) => sum(t.spans.filter((p) => p.state === s).map((p) => p.end - p.start));
  const hi = Math.max(1, ...threads.flatMap((t) => t.spans.map((s) => s.end)));
  return (
    <ChartFrame title={title} state={autoState(state, threads.length)} table={{ head: ["Thread", ...(Object.keys(TR) as TrState[]).map((s) => `${TR[s].label} (ms)`)], rows: threads.map((t) => [t.name, ...(Object.keys(TR) as TrState[]).map((s) => Math.round(tot(t, s)))]) }}>
      {(w) => {
        const lw = Math.min(100, w * 0.2), rowH = 24, H = threads.length * rowH + 40, x = (v: number) => lw + (v / hi) * (w - lw - 10);
        return (
          <>
            <svg viewBox={`0 0 ${w} ${H}`} style={{ width: "100%", height: H }} role="img" aria-label={`${title}: ${threads.length} threads over ${Math.round(hi)} ms`}>
              {Array.from({ length: 6 }, (_, i) => (hi * i) / 5).map((t) => <g key={t}><line x1={x(t)} x2={x(t)} y1={16} y2={H - 14} className="adm-gl" /><text x={x(t)} y={H - 2} textAnchor="middle" className="adm-axis">{Math.round(t)} ms</text></g>)}
              {threads.map((t, i) => <g key={t.name}><text x={6} y={16 + i * rowH + 15} className="adm-axis" fontWeight="700">{t.name}</text>{t.spans.map((s, k) => <rect key={k} x={x(s.start)} y={18 + i * rowH} width={Math.max(1, x(s.end) - x(s.start))} height={18} fill={TR[s.state].fill} fillOpacity={s.state === "running" ? 0.95 : 0.75} className="pc-pt" onMouseEnter={() => setSel(`${t.name}: ${TR[s.state].label} ${Math.round(s.start)}–${Math.round(s.end)} ms`)} onMouseLeave={() => setSel(null)} />)}</g>)}
            </svg>
            <Legend items={(Object.keys(TR) as TrState[]).map((s) => ({ name: TR[s].label, color: TR[s].fill }))} /><Readout>{sel}</Readout>
          </>
        );
      }}
    </ChartFrame>
  );
}

/* ---------- D055: step durations (box plot), drop-off reasons, journey paths ---------- */
export function StepDurations({ steps, unit = "s", title = "Step durations", state }: Common & { steps: { name: string; samples: number[] }[]; unit?: string }) {
  const q = (s: number[]) => ({ p10: percentile(s, 10), p25: percentile(s, 25), p50: percentile(s, 50), p75: percentile(s, 75), p90: percentile(s, 90) });
  return (
    <ChartFrame title={title} state={autoState(state, steps.length)} table={{ head: ["Step", "p10", "p25", "Median", "p75", "p90", "Samples"], rows: steps.map((s) => { const r = q(s.samples); return [s.name, r.p10, r.p25, r.p50, r.p75, r.p90, s.samples.length].map((v) => (typeof v === "number" ? Math.round(v * 10) / 10 : v)); }) }}>
      {(w) => {
        const all = steps.flatMap((s) => [q(s.samples).p90]), d = niceDomain(0, Math.max(1, ...all)), lw = Math.min(130, w * 0.26), rowH = 32, H = steps.length * rowH + 36, x = (v: number) => lw + (v / d.hi) * (w - lw - 14); const slow = steps.map((s) => q(s.samples).p50).indexOf(Math.max(...steps.map((s) => q(s.samples).p50)));
        return (
          <svg viewBox={`0 0 ${w} ${H}`} style={{ width: "100%", height: H }} role="img" aria-label={`${title}: ${steps.map((s) => `${s.name} median ${Math.round(q(s.samples).p50)}${unit}`).join(", ")}`}>
            {d.ticks.map((t) => <g key={t}><line x1={x(t)} x2={x(t)} y1={6} y2={H - 26} className="adm-gl" /><text x={x(t)} y={H - 10} textAnchor="middle" className="adm-axis">{fmt1(t)}{unit}</text></g>)}
            {steps.map((s, i) => { const r = q(s.samples), y = 18 + i * rowH; return (<g key={s.name} role="img" aria-label={`${s.name}: median ${r.p50.toFixed(1)}${unit}, p90 ${r.p90.toFixed(1)}${unit}${i === slow ? ", slowest step" : ""}`}><text x={lw - 8} y={y + 4} textAnchor="end" className="adm-axis" fontWeight={i === slow ? 700 : 400}>{s.name}{i === slow ? " ⚠" : ""}</text><line x1={x(r.p10)} x2={x(r.p90)} y1={y} y2={y} stroke="var(--jp-text-muted)" strokeWidth="2" /><rect x={x(r.p25)} y={y - 9} width={Math.max(2, x(r.p75) - x(r.p25))} height={18} rx="3" fill={C(i === slow ? 1 : 0)} fillOpacity=".8" /><line x1={x(r.p50)} x2={x(r.p50)} y1={y - 11} y2={y + 11} stroke="var(--jp-text)" strokeWidth="3" /></g>); })}
          </svg>
        );
      }}
    </ChartFrame>
  );
}
export function DropOff({ steps, reasons, title = "Funnel drop-off and reasons", state }: Common & { steps: { name: string; count: number }[]; reasons: { step: string; reason: string; count: number }[] }) {
  const [sel, setSel] = useState<string | null>(null); const top = steps[0]?.count || 1;
  const rs = (name: string) => reasons.filter((r) => r.step === name).sort((a, b) => b.count - a.count);
  return (
    <ChartFrame title={title} svg={false} state={autoState(state, steps.length)} table={{ head: ["Step", "Reached", "Dropped here", "Top reason"], rows: steps.map((s, i) => [s.name, s.count, i < steps.length - 1 ? s.count - steps[i + 1].count : 0, rs(s.name)[0]?.reason ?? ""]) }}>
      {() => (
        <div className="pc-bars">{steps.map((s, i) => { const drop = i < steps.length - 1 ? s.count - steps[i + 1].count : 0; const r = rs(s.name);
          return (<div key={s.name}><div className="pc-bars__row"><button className="is-link" aria-expanded={sel === s.name} onClick={() => setSel(sel === s.name ? null : s.name)}>{s.name}</button><div><div className="pc-bars__bar" style={{ width: `${(s.count / top) * 100}%` }} /></div><span className="adm-num">{fmt1(s.count)} <span className="jp-muted">{pct(s.count / top)}</span></span></div>
            {i < steps.length - 1 && <div className="pc-note" style={{ margin: "0 0 2px 28%" }}>▼ {fmt1(drop)} left here ({pct(drop / (s.count || 1))})</div>}
            {sel === s.name && <div className="pc-bars" style={{ margin: "4px 0 8px 18px" }}>{r.length ? r.map((x) => <div key={x.reason} className="pc-bars__row"><span className="jp-muted">{x.reason}</span><div><div className="pc-bars__bar" style={{ width: `${(x.count / (r[0].count || 1)) * 100}%`, background: "var(--adm-c2)" }} /></div><span className="adm-num">{fmt1(x.count)}</span></div>) : <span className="jp-muted">No reasons recorded.</span>}</div>}</div>); })}</div>
      )}
    </ChartFrame>
  );
}
export function JourneyPaths({ paths, title = "Journey paths", state }: Common & { paths: { steps: string[]; count: number }[] }) {
  const total = sum(paths.map((p) => p.count)) || 1, depth = Math.max(0, ...paths.map((p) => p.steps.length)); const [sel, setSel] = useState<string | null>(null);
  const cols = useMemo(() => Array.from({ length: depth }, (_, c) => [...new Set(paths.filter((p) => p.steps[c]).map((p) => `${c}:${p.steps[c]}`))]), [paths, depth]);
  const links = useMemo(() => { const m = new Map<string, number>(); for (const p of paths) for (let c = 0; c < p.steps.length - 1; c++) { const k = `${c}:${p.steps[c]}>${c + 1}:${p.steps[c + 1]}`; m.set(k, (m.get(k) ?? 0) + p.count); } return [...m].map(([k, value]) => { const [from, to] = k.split(">"); return { from, to, value }; }); }, [paths]);
  const top = [...paths].sort((a, b) => b.count - a.count).slice(0, 6);
  return (
    <ChartFrame title={title} state={autoState(state, paths.length)} height={300} table={{ head: ["Path", "Sessions", "Share"], rows: [...paths].sort((a, b) => b.count - a.count).map((p) => [p.steps.join(" → "), p.count, pct(p.count / total, 1)]) }}
      footer={<div style={{ marginTop: 8 }}><b>Top paths</b><ol className="pc-bars" style={{ paddingInlineStart: 18, margin: "4px 0" }}>{top.map((p) => <li key={p.steps.join(">")} style={{ cursor: "pointer", fontWeight: sel === p.steps.join(">") ? 700 : 400 }} onClick={() => setSel(sel === p.steps.join(">") ? null : p.steps.join(">"))}>{p.steps.join(" → ")} <span className="jp-muted">{fmt1(p.count)} ({pct(p.count / total, 1)})</span></li>)}</ol></div>}>
      {(w) => {
        const H = 280, S = sankeyLayout(cols, links, H - 24, 12), cw = 92, gap = depth > 1 ? (w - cw - 8) / (depth - 1) : 0, X = (c: number) => 4 + c * gap;
        const selSteps = sel?.split(">"); const inSel = (id: string) => !selSteps || selSteps.some((s, c) => id === `${c}:${s}`);
        return (
          <svg viewBox={`0 0 ${w} ${H}`} style={{ width: "100%", height: H }} role="img" aria-label={`${title}: ${paths.length} distinct paths across ${depth} steps`}>
            {S.links.map((l, i) => { const a = S.nodes.get(l.from)!, b = S.nodes.get(l.to)!, x1 = X(a.col) + cw, x2 = X(b.col), mx = (x1 + x2) / 2; const on = !selSteps || (inSel(l.from) && inSel(l.to)); return <path key={i} d={`M${x1},${l.y0 + l.h / 2 + 12}C${mx},${l.y0 + l.h / 2 + 12} ${mx},${l.y1 + l.h / 2 + 12} ${x2},${l.y1 + l.h / 2 + 12}`} fill="none" stroke={C(a.col)} strokeOpacity={on ? 0.45 : 0.1} strokeWidth={Math.max(1, l.h)}><title>{`${l.from.split(":")[1]} → ${l.to.split(":")[1]}: ${fmt1(l.value)}`}</title></path>; })}
            {[...S.nodes].map(([id, n]) => <g key={id} opacity={inSel(id) ? 1 : 0.35}><rect x={X(n.col)} y={n.y + 12} width={cw} height={Math.max(14, n.h)} rx="3" fill="var(--jp-surface-raised)" stroke={C(n.col)} strokeWidth="2" /><text x={X(n.col) + 6} y={n.y + 12 + Math.max(14, n.h) / 2 + 4} fontSize="12.5" fill="var(--jp-text)" fontWeight="600">{id.split(":")[1].slice(0, 14)}</text></g>)}
          </svg>
        );
      }}
    </ChartFrame>
  );
}
