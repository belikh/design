import { useEffect, useMemo, useRef, useState } from "react";
import { C, Gauge, Legend, LineChart, Spark } from "@belikh/jupiter-ui/Charts.tsx";
import { Avatar } from "@belikh/jupiter-ui/kit.tsx";
import { ChartFrame, Readout, type FrameState } from "./frame.tsx";
import { autoState, fmt1, niceDomain } from "./shared.tsx";
import { budgetCurve, clamp, downtimeAllowed, fmtDuration, linreg, mean, pct, percentRank, projectCompletion, raceFrames, rankChange, rollingBurn, sum } from "./lib.ts";

type Common = { title?: string; state?: FrameState };
const arrow = (d: number) => (d > 0 ? `▲ ${d}` : d < 0 ? `▼ ${-d}` : "–");

/* ---------- D034: leaderboard ---------- */
export function Leaderboard({ rows, prev, unit = "", title = "Leaderboard", state, limit = 8 }: Common & { rows: { name: string; value: number }[]; prev?: Record<string, number>; unit?: string; limit?: number }) {
  const sorted = useMemo(() => [...rows].sort((a, b) => b.value - a.value || a.name.localeCompare(b.name)), [rows]); const top = sorted.slice(0, limit);
  const prevOrder = prev ? Object.keys(prev).sort((a, b) => prev[b] - prev[a]) : []; const ch = prev ? rankChange(prevOrder, sorted.map((r) => r.name)) : {};
  return (
    <ChartFrame title={title} svg={false} state={autoState(state, rows.length)} table={{ head: ["Rank", "Name", `Value${unit ? ` (${unit})` : ""}`, ...(prev ? ["Places moved"] : [])], rows: sorted.map((r, i) => [i + 1, r.name, r.value, ...(prev ? [ch[r.name] ?? 0] : [])]) }}>
      {() => <RaceList order={top.map((r) => r.name)} values={Object.fromEntries(top.map((r) => [r.name, r.value]))} unit={unit} changes={ch} colorOf={(n) => C(sorted.findIndex((r) => r.name === n))} showAvatar />}
    </ChartFrame>
  );
}
const ROW = 34;
function RaceList({ order, values, unit, changes, colorOf, showAvatar }: { order: string[]; values: Record<string, number>; unit: string; changes?: Record<string, number>; colorOf: (n: string) => string; showAvatar?: boolean }) {
  const mx = Math.max(1, ...order.map((n) => values[n]));
  return (
    <ol className="pc-lb" style={{ height: order.length * ROW }} aria-label="Ranking">
      {order.map((n, i) => (
        <li key={n} style={{ transform: `translateY(${i * ROW}px)`, height: ROW - 4 }}>
          <b className="adm-num">{i + 1}</b>{showAvatar ? <Avatar name={n} size={24} /> : <span />}<span style={{ fontWeight: 600 }}>{n}</span>
          <div><div className="pc-lb__bar" style={{ width: `${(values[n] / mx) * 100}%`, background: colorOf(n) }} /></div>
          <span className="adm-num" style={{ textAlign: "end" }}>{fmt1(values[n])}{unit}{changes && changes[n] !== undefined && <span className={`pc-rank ${changes[n] > 0 ? "is-up" : "is-down"}`} style={{ marginInlineStart: 6 }} aria-label={changes[n] > 0 ? `up ${changes[n]} places` : changes[n] < 0 ? `down ${-changes[n]} places` : "no change"}>{arrow(changes[n])}</span>}</span>
        </li>))}
    </ol>
  );
}

/* ---------- D034: bar chart race ---------- */
export function BarRace({ series, labels, unit = "", title = "Bar chart race", state, topK = 6, intervalMs = 140 }: Common & { series: Record<string, number[]>; labels: string[]; unit?: string; topK?: number; intervalMs?: number }) {
  const frames = useMemo(() => raceFrames(series, 5), [series]); const names = Object.keys(series); const [i, setI] = useState(0); const [playing, setPlaying] = useState(false); const timer = useRef<number>(0);
  useEffect(() => { if (!playing) return; timer.current = window.setInterval(() => setI((x) => { if (x >= frames.length - 1) { setPlaying(false); return x; } return x + 1; }), intervalMs); return () => clearInterval(timer.current); }, [playing, frames.length, intervalMs]);
  const f = frames[Math.min(i, frames.length - 1)];
  return (
    <ChartFrame title={title} svg={false} state={autoState(state, frames.length)} table={{ head: ["Period", ...names], rows: labels.map((l, k) => [l, ...names.map((n) => series[n][k])]) }}>
      {() => f && (
        <>
          <div className="adm-row" style={{ marginBottom: 8 }}>
            <button className="jp-btn jp-btn--secondary jp-btn--sm" onClick={() => { if (i >= frames.length - 1) setI(0); setPlaying(!playing); }} aria-label={playing ? "Pause" : "Play"}>{playing ? "❚❚ Pause" : "▶ Play"}</button>
            <button className="jp-btn jp-btn--ghost jp-btn--sm" onClick={() => { setPlaying(false); setI(0); }}>Restart</button>
            <input type="range" min={0} max={frames.length - 1} value={i} onChange={(e) => { setPlaying(false); setI(Number(e.target.value)); }} aria-label="Time" style={{ flex: 1, minWidth: 120, accentColor: "var(--jp-accent)" }} />
            <b className="adm-num" style={{ minWidth: 72, textAlign: "end" }}>{labels[Math.min(labels.length - 1, Math.floor(f.t))]}</b>
          </div>
          <RaceList order={f.order.slice(0, topK)} values={f.values} unit={unit} colorOf={(n) => C(names.indexOf(n))} />
        </>
      )}
    </ChartFrame>
  );
}

/* ---------- D035: actual vs target (bar-in-bar) ---------- */
export function BarInBar({ items, unit = "", title = "Actual vs target", state }: Common & { items: { label: string; actual: number; target: number }[]; unit?: string }) {
  return (
    <ChartFrame title={title} state={autoState(state, items.length)} table={{ head: ["Label", "Actual", "Target", "Attainment"], rows: items.map((i) => [i.label, i.actual, i.target, pct(i.target ? i.actual / i.target : 0)]) }}>
      {(w) => {
        const d = niceDomain(0, Math.max(1, ...items.flatMap((i) => [i.actual, i.target]))), lw = Math.min(120, w * 0.26), rowH = 34, H = items.length * rowH + 40, x = (v: number) => lw + (v / d.hi) * (w - lw - 70);
        return (
          <svg viewBox={`0 0 ${w} ${H}`} style={{ width: "100%", height: H }} role="img" aria-label={`${title}: ${items.map((i) => `${i.label} ${pct(i.target ? i.actual / i.target : 0)} of target`).join(", ")}`}>
            {d.ticks.map((t) => <g key={t}><line x1={x(t)} x2={x(t)} y1={4} y2={H - 28} className="adm-gl" /><text x={x(t)} y={H - 12} textAnchor="middle" className="adm-axis">{fmt1(t)}</text></g>)}
            {items.map((it, i) => { const y = 8 + i * rowH, met = it.actual >= it.target;
              return (<g key={it.label}><text x={lw - 8} y={y + 18} textAnchor="end" className="adm-axis">{it.label}</text><rect x={lw} y={y + 2} width={Math.max(1, x(it.target) - lw)} height={24} rx="3" fill="var(--jp-surface)" stroke="var(--jp-border)" />
                <rect x={lw} y={y + 8} width={Math.max(1, x(it.actual) - lw)} height={12} rx="2" fill={met ? C(0) : C(1)} /><text x={Math.max(x(it.target), x(it.actual)) + 6} y={y + 18} className="adm-axis" fontWeight="700">{fmt1(it.actual)}{unit} {met ? "✓" : `(${pct(it.actual / (it.target || 1))})`}</text></g>); })}
          </svg>
        );
      }}
    </ChartFrame>
  );
}

/* ---------- D035: burn-down / burn-up ---------- */
export function BurnDown({ total, done, labels, title = "Burn-down", state }: Common & { total: number; done: number[]; labels: string[] }) {
  const days = labels.length - 1; const ideal = labels.map((_, i) => total - (total * i) / Math.max(1, days)); let left = total; const actual = [total, ...done.map((d) => (left = Math.max(0, left - d)))].slice(0, labels.length);
  const i = actual.length - 1, delta = Math.round(ideal[i] - actual[i]);
  return (
    <>
      <LineChart title={title} labels={labels} height={240} zoomable={false} series={[{ name: "Ideal", data: ideal.map((v) => Math.round(v * 10) / 10), color: "var(--adm-c7)" }, { name: "Remaining", data: actual }]} />
      <Readout>{delta > 0 ? `Ahead of the ideal line by ${delta} (${labels[i]}).` : delta < 0 ? `Behind the ideal line by ${-delta} (${labels[i]}).` : `On the ideal line (${labels[i]}).`}</Readout>
    </>
  );
}
export function BurnUp({ scope, done, labels, title = "Burn-up", state }: Common & { scope: number[]; done: number[]; labels: string[] }) {
  let c = 0; const cum = done.map((d) => (c += d)); const goal = scope[scope.length - 1] ?? 0, eta = projectCompletion(cum, goal); const reg = linreg(cum.map((y, x) => ({ x, y })));
  const n = Math.max(labels.length, eta !== null ? Math.min(eta + 1, labels.length + 10) : labels.length); const lab = Array.from({ length: n }, (_, i) => labels[i] ?? `+${i - labels.length + 1}`);
  const proj = lab.map((_, i) => (i < cum.length - 1 ? NaN : Math.min(goal, Math.max(0, reg.slope * i + reg.intercept))));
  void state;
  return (
    <>
      <LineChart title={title} labels={lab} height={240} zoomable={false} step series={[{ name: "Scope", data: lab.map((_, i) => scope[Math.min(i, scope.length - 1)] ?? 0), color: "var(--adm-c7)" }, { name: "Done", data: lab.map((_, i) => cum[i] ?? NaN) }, { name: "Forecast", data: proj, color: "var(--adm-c2)" }]} />
      <Readout>{eta === null ? "Not enough progress to forecast completion." : eta <= labels.length - 1 ? "Scope already met." : `At the current pace, scope completes around day ${eta + 1} (${eta - labels.length + 1} days after the last data point).`}</Readout>
    </>
  );
}

/* ---------- D035: cumulative flow ---------- */
export function CumulativeFlow({ labels, daily, stages, title = "Cumulative flow", state }: Common & { labels: string[]; daily: Record<string, number>[]; stages: string[] }) {
  const cum = useMemo(() => { const run = Object.fromEntries(stages.map((s) => [s, 0])); return daily.map((d) => stages.map((s) => (run[s] += d[s] ?? 0))); }, [daily, stages]);
  const [hover, setHover] = useState<number | null>(null);
  return (
    <ChartFrame title={title} state={autoState(state, daily.length)} height={260} table={{ head: ["Day", ...stages], rows: labels.map((l, i) => [l, ...(cum[i] ?? [])]) }}>
      {(w) => {
        const m = { l: 44, r: 12, t: 10, b: 26 }, H = 260, n = labels.length, mx = niceDomain(0, Math.max(1, ...cum.map((r) => Math.max(...r)))).hi, x = (i: number) => m.l + (i * (w - m.l - m.r)) / Math.max(1, n - 1), y = (v: number) => H - m.b - (v / mx) * (H - m.t - m.b);
        const order = stages.map((_, k) => k).sort((a, b) => Math.max(...cum.map((r) => r[b])) - Math.max(...cum.map((r) => r[a])));
        return (
          <>
            <svg viewBox={`0 0 ${w} ${H}`} style={{ width: "100%", height: H }} role="img" aria-label={`${title}: ${stages.join(", ")}`} onMouseLeave={() => setHover(null)} onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHover(clamp(Math.round(((e.clientX - r.left - m.l) / (w - m.l - m.r)) * (n - 1)), 0, n - 1)); }}>
              {[0, 0.5, 1].map((f) => <g key={f}><line x1={m.l} x2={w - m.r} y1={y(f * mx)} y2={y(f * mx)} className="adm-gl" /><text x={m.l - 6} y={y(f * mx) + 4} textAnchor="end" className="adm-axis">{fmt1(f * mx)}</text></g>)}
              {order.map((k) => <path key={stages[k]} d={cum.map((r, i) => `${i ? "L" : "M"}${x(i)},${y(r[k])}`).join("") + `L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`} fill={C(k)} fillOpacity=".75" stroke="var(--jp-surface-raised)" strokeWidth="1.5" />)}
              {labels.map((l, i) => i % Math.max(1, Math.ceil(n / 8)) === 0 && <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="adm-axis">{l}</text>)}
              {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={H - m.b} className="adm-cross" />}
            </svg>
            <Legend items={stages.map((s, k) => ({ name: s, color: C(k) }))} />
            <Readout>{hover !== null && cum[hover] ? `${labels[hover]}: ${stages.map((s, k) => `${s} ${cum[hover][k]}`).join(" · ")}. Work in progress = vertical gap between bands.` : "Widening bands mean work is piling up in that stage."}</Readout>
          </>
        );
      }}
    </ChartFrame>
  );
}

/* ---------- D036: RED and USE panels ---------- */
export type RedRow = { name: string; rate: number[]; errors: number[]; duration: number[] };
export function RedPanel({ rows, title = "RED: rate, errors, duration", state, errWarn = 1, durWarn = 300 }: Common & { rows: RedRow[]; errWarn?: number; durWarn?: number }) {
  return (
    <ChartFrame title={title} svg={false} state={autoState(state, rows.length)} table={{ head: ["Service", "Rate (req/s)", "Errors (%)", "Duration p95 (ms)"], rows: rows.map((r) => [r.name, r.rate.at(-1) ?? 0, r.errors.at(-1) ?? 0, r.duration.at(-1) ?? 0]) }}>
      {() => (
        <div style={{ overflow: "auto" }}><table className="pc-table" aria-label={title}>
          <thead><tr><th>Service</th><th colSpan={2}>Rate</th><th colSpan={2}>Errors</th><th colSpan={2}>Duration p95</th></tr></thead>
          <tbody>{rows.map((r) => { const e = r.errors.at(-1) ?? 0, d = r.duration.at(-1) ?? 0; return (
            <tr key={r.name}><th scope="row" style={{ fontFamily: "var(--jp-font-mono)", textTransform: "none", color: "var(--jp-text)", fontSize: "inherit" }}>{r.name}</th>
              <td className="num">{fmt1(r.rate.at(-1) ?? 0)}/s</td><td><Spark data={r.rate} kind="area" w={90} h={24} color={C(0)} /></td>
              <td className="num"><span className={`pc-status ${e > errWarn * 2 ? "is-danger" : e > errWarn ? "is-warn" : "is-ok"}`}><i />{e.toFixed(2)}%</span></td><td><Spark data={r.errors} kind="bar" w={90} h={24} color={C(1)} /></td>
              <td className="num"><span className={`pc-status ${d > durWarn * 1.5 ? "is-danger" : d > durWarn ? "is-warn" : "is-ok"}`}><i />{Math.round(d)} ms</span></td><td><Spark data={r.duration} w={90} h={24} color={C(2)} /></td></tr>); })}</tbody></table></div>
      )}
    </ChartFrame>
  );
}
export type UseRow = { name: string; utilisation: number; saturation: number; errors: number; unit?: string };
export function UsePanel({ rows, title = "USE: utilisation, saturation, errors", state }: Common & { rows: UseRow[] }) {
  return (
    <ChartFrame title={title} svg={false} state={autoState(state, rows.length)} table={{ head: ["Resource", "Utilisation (%)", "Saturation (queue)", "Errors"], rows: rows.map((r) => [r.name, r.utilisation, r.saturation, r.errors]) }}>
      {() => (
        <div className="pc-grid2">{rows.map((r) => (
          <div key={r.name} className="pc-tile"><b>{r.name}</b>
            <div className="adm-row" style={{ justifyContent: "space-around" }}><Gauge value={Math.round(r.utilisation)} label="Utilisation" size={120} zones={[0.7, 0.9]} />
              <div className="adm-stack" style={{ gap: 6 }}><span className="pc-chip">Saturation <b>{r.saturation}</b>{r.saturation > 5 ? " ▲ queueing" : ""}</span><span className={`pc-chip ${r.errors ? "is-bad" : "is-good"}`}>Errors <b>{r.errors}</b></span></div></div></div>))}</div>
      )}
    </ChartFrame>
  );
}

/* ---------- D037: SLO burn rate + nines table ---------- */
export function SloBurn({ errors, total, labels, slo, intervalMin, title = "SLO burn rate", state }: Common & { errors: number[]; total: number[]; labels: string[]; slo: number; intervalMin: number }) {
  const wins = [{ name: "1 h", n: Math.max(1, Math.round(60 / intervalMin)) }, { name: "6 h", n: Math.max(1, Math.round(360 / intervalMin)) }, { name: "24 h", n: Math.max(1, Math.round(1440 / intervalMin)) }];
  const series = wins.map((w) => ({ name: `burn ${w.name}`, data: rollingBurn(errors, total, slo, w.n).map((v) => Math.round(v * 100) / 100) }));
  const now = series.map((s) => s.data.at(-1) ?? 0), status = now[0] > 14.4 && now[1] > 14.4 ? "Page now: the 30-day budget would be gone in about 2 days." : now[1] > 6 && now[2] > 6 ? "Ticket: sustained burn above 6×." : now[2] > 1 ? "Watch: burning faster than budget." : "Healthy: within budget.";
  void state;
  return (
    <>
      <LineChart title={title} labels={labels} height={260} series={series} thresholds={[{ value: 14.4, label: "14.4× page" }, { value: 6, label: "6× ticket" }, { value: 1, label: "1× budget" }]} yFmt={(v) => `${v.toFixed(v < 10 ? 1 : 0)}×`} yScale="log" />
      <Readout>{status}</Readout>
    </>
  );
}
export function BudgetChart({ errors, periodTotal, labels, slo, title = "Error budget remaining", state }: Common & { errors: number[]; periodTotal: number; labels: string[]; slo: number }) {
  const data = budgetCurve(errors, periodTotal, slo).map((v) => Math.round(v * 1000) / 10); void state;
  return <LineChart title={title} labels={labels} height={200} zoomable={false} area series={[{ name: "Budget left (%)", data }]} yFmt={(v) => `${Math.round(v)}%`} thresholds={[{ value: 25, label: "25% alert" }]} />;
}
export const NINES = [99, 99.5, 99.9, 99.95, 99.99, 99.999];
export function NinesTable({ target, observed, title = "Availability nines", state }: Common & { target: number; observed: number }) {
  const periods: [string, number][] = [["day", 1440], ["week", 10080], ["30 days", 43200], ["year", 525600]];
  return (
    <ChartFrame title={title} svg={false} state={autoState(state, 1)} table={{ head: ["Availability", ...periods.map((p) => `Downtime per ${p[0]}`)], rows: NINES.map((n) => [`${n}%`, ...periods.map(([, m]) => fmtDuration(downtimeAllowed(n, m)))]) }}>
      {() => (
        <div style={{ overflow: "auto" }}><table className="pc-table" aria-label={title}><thead><tr><th>Target</th>{periods.map(([p]) => <th key={p} className="num">per {p}</th>)}<th>vs observed {observed}%</th></tr></thead>
          <tbody>{NINES.map((n) => (<tr key={n} style={n === target ? { background: "color-mix(in oklab, var(--jp-accent) 10%, transparent)", fontWeight: 700 } : undefined}><th scope="row" className="num" style={{ color: "var(--jp-text)", fontSize: "inherit" }}>{n}%{n === target ? " (target)" : ""}</th>{periods.map(([p, m]) => <td key={p} className="num">{fmtDuration(downtimeAllowed(n, m))}</td>)}<td><span className={`pc-status ${observed >= n ? "is-ok" : "is-warn"}`}><i />{observed >= n ? "met" : "missed"}</span></td></tr>))}</tbody></table></div>
      )}
    </ChartFrame>
  );
}

/* ---------- D038: KPI table ---------- */
export type Kpi = { name: string; value: number; target: number; unit?: string; trend: number[]; better?: "up" | "down" };
export const kpiStatus = (k: Kpi): "ok" | "warn" | "danger" => { const r = (k.better ?? "up") === "up" ? k.value / (k.target || 1) : (k.target || 1) / (k.value || 1); return r >= 1 ? "ok" : r >= 0.9 ? "warn" : "danger"; };
export function KpiTable({ rows, title = "KPI table", state }: Common & { rows: Kpi[] }) {
  const label = { ok: "On track", warn: "At risk", danger: "Off track" } as const;
  return (
    <ChartFrame title={title} svg={false} state={autoState(state, rows.length)} table={{ head: ["KPI", "Value", "Target", "Status", "Change"], rows: rows.map((k) => [k.name, k.value, k.target, label[kpiStatus(k)], pct((k.trend.at(-1) ?? 0) / (k.trend[0] || 1) - 1, 1)]) }}>
      {() => (
        <div style={{ overflow: "auto" }}><table className="pc-table" aria-label={title}><thead><tr><th>KPI</th><th className="num">Value</th><th>Progress to target</th><th>Status</th><th>Trend</th></tr></thead>
          <tbody>{rows.map((k) => { const s = kpiStatus(k), up = (k.better ?? "up") === "up", ratio = up ? k.value / (k.target || 1) : (k.target || 1) / (k.value || 1), first = k.trend[0] || 1, change = (k.trend.at(-1) ?? first) / first - 1, good = up ? change >= 0 : change <= 0;
            return (<tr key={k.name}><th scope="row" style={{ fontFamily: "var(--jp-font-sans)", textTransform: "none", color: "var(--jp-text)", fontSize: "inherit" }}>{k.name}</th><td className="num"><b>{fmt1(k.value)}{k.unit}</b> <span className="jp-muted">/ {fmt1(k.target)}{k.unit}</span></td>
              <td><div className="pc-inbar" role="img" aria-label={`${pct(ratio)} of target`}><i style={{ width: `${clamp(ratio, 0, 1.2) / 1.2 * 100}%`, background: s === "ok" ? "var(--adm-c3)" : s === "warn" ? "var(--adm-c2)" : "var(--adm-c4)" }} /><span style={{ left: `${(1 / 1.2) * 100}%`, insetInlineEnd: "auto", borderInlineStart: "2px solid var(--jp-text)", paddingInlineStart: 2 }} /></div></td>
              <td><span className={`pc-status is-${s}`}><i />{label[s]}</span></td><td><span className="adm-row" style={{ gap: 8, flexWrap: "nowrap" }}><Spark data={k.trend} w={70} h={22} /><span className="pc-rank" aria-label={`${change >= 0 ? "up" : "down"} ${Math.abs(change * 100).toFixed(1)} percent, ${good ? "good" : "bad"}`}>{change >= 0 ? "▲" : "▼"} {Math.abs(change * 100).toFixed(1)}% {good ? "" : "(worse)"}</span></span></td></tr>); })}</tbody></table></div>
      )}
    </ChartFrame>
  );
}

/* ---------- D039: comparison tiles + percentile rank bar ---------- */
export function PercentileRankBar({ peers, value, better = "up", unit = "" }: { peers: number[]; value: number; better?: "up" | "down"; unit?: string }) {
  const lo = Math.min(...peers, value), hi = Math.max(...peers, value), W = 260, x = (v: number) => 8 + (hi === lo ? 0.5 : (v - lo) / (hi - lo)) * (W - 16); const pr = percentRank(peers, value), top = better === "up" ? 1 - pr : pr;
  return (
    <div role="img" aria-label={`Better than ${Math.round((better === "up" ? pr : 1 - pr) * 100)}% of peers (top ${Math.max(1, Math.round(top * 100))}%)`}>
      <svg width="100%" viewBox={`0 0 ${W} 30`} height="30"><line x1="8" x2={W - 8} y1="14" y2="14" stroke="var(--jp-border)" strokeWidth="2" />{peers.map((p, i) => <circle key={i} cx={x(p)} cy="14" r="3" fill="var(--adm-c7)" opacity=".6" />)}<path d={`M${x(value)},4 l6,-4 h-12z`} transform="translate(0,6)" fill="var(--jp-accent)" /><circle cx={x(value)} cy="14" r="5.5" fill="var(--jp-accent)" stroke="var(--jp-surface-raised)" strokeWidth="2" /></svg>
      <div className="pc-note" style={{ marginTop: 0 }}>{fmt1(value)}{unit}: top {Math.max(1, Math.round(top * 100))}% of {peers.length} peers</div>
    </div>
  );
}
export type Tile = { label: string; value: number; prev: number; target: number; peers: number[]; unit?: string; better?: "up" | "down" };
export function ComparisonTiles({ tiles, title = "Comparison tiles", state }: Common & { tiles: Tile[] }) {
  return (
    <ChartFrame title={title} svg={false} state={autoState(state, tiles.length)} table={{ head: ["Metric", "Value", "Previous", "Target", "Peer median"], rows: tiles.map((t) => [t.label, t.value, t.prev, t.target, Math.round(mean([...t.peers].sort((a, b) => a - b).slice(Math.floor(t.peers.length / 2), Math.floor(t.peers.length / 2) + 1)) * 100) / 100]) }}>
      {() => (
        <div className="pc-grid2">{tiles.map((t) => { const up = (t.better ?? "up") === "up", dPrev = t.prev ? (t.value - t.prev) / t.prev : 0, dTgt = t.target ? (t.value - t.target) / t.target : 0; const goodPrev = up ? dPrev >= 0 : dPrev <= 0, goodTgt = up ? dTgt >= 0 : dTgt <= 0;
          return (<div key={t.label} className="pc-tile"><span className="jp-muted" style={{ fontFamily: "var(--jp-font-mono)", fontSize: "var(--jp-fs-xs)", textTransform: "uppercase" }}>{t.label}</span><b className="big">{fmt1(t.value)}{t.unit}</b>
            <div className="pc-chips"><span className={`pc-chip ${goodPrev ? "is-good" : "is-bad"}`}>vs last period {dPrev >= 0 ? "▲" : "▼"} {Math.abs(dPrev * 100).toFixed(1)}%</span><span className={`pc-chip ${goodTgt ? "is-good" : "is-bad"}`}>vs target {goodTgt ? "✓ " : ""}{dTgt >= 0 ? "+" : "−"}{Math.abs(dTgt * 100).toFixed(1)}%</span></div>
            <PercentileRankBar peers={t.peers} value={t.value} better={t.better} unit={t.unit} /></div>); })}</div>
      )}
    </ChartFrame>
  );
}

/* ---------- D040: live counter, countdown, world clocks, rate meter ---------- */
export function useNow(ms = 1000, start = Date.now()) { const [now, setNow] = useState(start); useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]); return now; }
export const splitDuration = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }; };
export function formatZone(ms: number, tz: string) { try { return new Intl.DateTimeFormat("en-AU", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, weekday: "short" }).format(ms); } catch { return new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, weekday: "short" }).format(ms) + " (UTC)"; } }
export function LiveCounters({ countdownTo, zones, ratePerSec, counterStart = 1_204_338, title = "Live counters", state }: Common & { countdownTo: number; zones: { label: string; tz: string }[]; ratePerSec: number; counterStart?: number }) {
  const now = useNow(250); const t0 = useRef(now); const dur = splitDuration(countdownTo - now); const reached = countdownTo - now <= 0;
  const counter = Math.floor(counterStart + ((now - t0.current) / 1000) * ratePerSec);
  const [samples, setSamples] = useState<number[]>(() => Array(40).fill(ratePerSec)); const tick = useRef(0);
  useEffect(() => { tick.current++; const v = Math.max(0, ratePerSec * (1 + 0.35 * Math.sin(tick.current / 3) + 0.15 * Math.sin(tick.current * 1.7))); setSamples((s) => [...s.slice(-39), v]); }, [Math.floor(now / 500)]); // eslint-disable-line react-hooks/exhaustive-deps
  const cur = samples.at(-1) ?? 0;
  return (
    <ChartFrame title={title} svg={false} state={autoState(state, 1)} table={{ head: ["Counter", "Value"], rows: [["Events counted", counter], ["Countdown", reached ? "reached" : `${dur.d}d ${dur.h}h ${dur.m}m ${dur.s}s`], ["Rate (events/s)", Math.round(cur)], ...zones.map((z) => [z.label, formatZone(now, z.tz)] as (string | number)[])] }}>
      {() => (
        <div className="pc-grid2">
          <div className="pc-tile"><span className="jp-muted">Events counted</span><span className="pc-live" aria-live="off" aria-label={`${counter.toLocaleString("en-AU")} events`}>{counter.toLocaleString("en-AU")}</span><span className="pc-note">+{fmt1(ratePerSec)}/s, updating live</span></div>
          <div className="pc-tile"><span className="jp-muted">Countdown</span>{reached ? <b className="big" role="status">Reached</b> : <span className="pc-live" role="timer" aria-label={`${dur.d} days ${dur.h} hours ${dur.m} minutes ${dur.s} seconds`}>{dur.d}d {String(dur.h).padStart(2, "0")}:{String(dur.m).padStart(2, "0")}:{String(dur.s).padStart(2, "0")}</span>}<span className="pc-note">to {new Date(countdownTo).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}</span></div>
          <div className="pc-tile"><span className="jp-muted">World clocks</span><div className="adm-row">{zones.map((z) => <div key={z.tz} className="pc-clock"><span className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>{z.label}</span><b>{formatZone(now, z.tz).replace(/^\w+,?\s*/, "")}</b><span className="pc-note" style={{ margin: 0 }}>{formatZone(now, z.tz).match(/^\w+/)?.[0]}</span></div>)}</div></div>
          <div className="pc-tile"><span className="jp-muted">Rate meter (events/s)</span><div className="adm-row"><Gauge value={Math.round(cur)} max={Math.round(ratePerSec * 2)} unit="" label="events/s" size={150} zones={[0.65, 0.9]} /><Spark data={samples} kind="area" w={120} h={50} /></div></div>
        </div>
      )}
    </ChartFrame>
  );
}

