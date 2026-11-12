import { useMemo, useState } from "react";
import { C, LineChart, Legend } from "@belikh/jupiter-ui/Charts.tsx";
import { EmptyState } from "@belikh/jupiter-ui/kit.tsx";
import { ChartFrame, Readout, type FrameState } from "./frame.tsx";
import { autoState, fmt1, niceDomain } from "./shared.tsx";
import { hexbin, hexPath, histogramByEdges, linreg, logEdges, pearson, percentile } from "./lib.ts";

type Pt = { x: number; y: number; r?: number; g?: number; label?: string };
export type ScatterMode = "scatter" | "bubble" | "hexbin";

/* ---------- D014: scatter / bubble / hexbin with regression ---------- */
export function ScatterPlus({ points, mode, xLabel = "x", yLabel = "y", regression = true, title = "Scatter", state, height = 300 }: { points: Pt[]; mode: ScatterMode; xLabel?: string; yLabel?: string; regression?: boolean; title?: string; state?: FrameState; height?: number }) {
  return (
    <ChartFrame title={`${title} (${mode})`} state={autoState(state, points.length)} height={height} table={{ head: ["Label", xLabel, yLabel, ...(mode === "bubble" ? ["Size"] : [])], rows: points.map((p, i) => [p.label ?? `#${i + 1}`, Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100, ...(mode === "bubble" ? [p.r ?? ""] : [])]) }}>
      {(w) => <ScatterBody w={w} points={points} mode={mode} xLabel={xLabel} yLabel={yLabel} regression={regression} height={height} title={title} />}
    </ChartFrame>
  );
}
function ScatterBody({ w, points, mode, xLabel, yLabel, regression, height, title }: { w: number; points: Pt[]; mode: ScatterMode; xLabel: string; yLabel: string; regression: boolean; height: number; title: string }) {
  const [idx, setIdx] = useState<number | null>(null); const m = { l: 48, r: 14, t: 26, b: 40 }, H = height;
  const dx = niceDomain(Math.min(...points.map((p) => p.x)), Math.max(...points.map((p) => p.x))), dy = niceDomain(Math.min(...points.map((p) => p.y)), Math.max(...points.map((p) => p.y)));
  const X = (v: number) => m.l + ((v - dx.lo) / (dx.hi - dx.lo)) * (w - m.l - m.r), Y = (v: number) => H - m.b - ((v - dy.lo) / (dy.hi - dy.lo)) * (H - m.t - m.b);
  const reg = useMemo(() => linreg(points), [points]); const order = useMemo(() => points.map((p, i) => i).sort((a, b) => points[a].x - points[b].x), [points]);
  const rmax = Math.max(1, ...points.map((p) => p.r ?? 1));
  const hexR = 14, bins = useMemo(() => (mode === "hexbin" ? hexbin(points.map((p) => ({ x: X(p.x) - m.l, y: Y(p.y) - m.t })), hexR) : []), [mode, points, w, height]); // eslint-disable-line react-hooks/exhaustive-deps
  const bmax = Math.max(1, ...bins.map((b) => b.count));
  const near = (e: React.MouseEvent<SVGSVGElement>) => { const r = e.currentTarget.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top; let best = -1, bd = 24 * 24; points.forEach((p, i) => { const d = (X(p.x) - px) ** 2 + (Y(p.y) - py) ** 2; if (d < bd) { bd = d; best = i; } }); setIdx(best < 0 ? null : best); };
  const key = (e: React.KeyboardEvent) => { if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return; e.preventDefault(); const pos = idx === null ? -1 : order.indexOf(idx); const n = e.key === "ArrowRight" ? Math.min(order.length - 1, pos + 1) : Math.max(0, pos - 1); setIdx(order[n < 0 ? 0 : n]); };
  const sel = idx !== null ? points[idx] : null;
  return (
    <>
      <svg viewBox={`0 0 ${w} ${H}`} style={{ width: "100%", height: H }} role="img" tabIndex={0} aria-label={`${title}, ${mode}: ${points.length} points. ${regression ? `Trend slope ${reg.slope.toFixed(2)}, R squared ${reg.r2.toFixed(2)}.` : ""} Use left and right arrows to step through points.`} onMouseMove={near} onMouseLeave={() => setIdx(null)} onKeyDown={key}>
        {dy.ticks.map((t) => <g key={`y${t}`}><line x1={m.l} x2={w - m.r} y1={Y(t)} y2={Y(t)} className="adm-gl" /><text x={m.l - 6} y={Y(t) + 4} textAnchor="end" className="adm-axis">{fmt1(t)}</text></g>)}
        {dx.ticks.map((t) => <text key={`x${t}`} x={X(t)} y={H - m.b + 16} textAnchor="middle" className="adm-axis">{fmt1(t)}</text>)}
        <text x={(m.l + w - m.r) / 2} y={H - 6} textAnchor="middle" className="pc-axis-title">{xLabel}</text><text x={4} y={12} className="pc-axis-title">{yLabel}</text>
        {mode === "hexbin" ? bins.map((b) => <path key={`${b.q},${b.row}`} d={hexPath(b.cx + m.l, b.cy + m.t, hexR - 0.5)} fill="var(--jp-accent)" fillOpacity={0.12 + 0.88 * (b.count / bmax)} stroke="var(--jp-surface-raised)" strokeWidth="1"><title>{b.count} points</title></path>)
          : points.map((p, i) => <circle key={i} cx={X(p.x)} cy={Y(p.y)} r={mode === "bubble" ? 4 + (Math.sqrt((p.r ?? 1) / rmax)) * 16 : 4} fill={C(p.g ?? 0)} fillOpacity={mode === "bubble" ? 0.45 : 0.7} stroke={C(p.g ?? 0)} strokeWidth={idx === i ? 3 : 1} />)}
        {regression && points.length > 1 && <line x1={X(dx.lo)} y1={Y(reg.slope * dx.lo + reg.intercept)} x2={X(dx.hi)} y2={Y(reg.slope * dx.hi + reg.intercept)} className="adm-target" />}
        {sel && <g><circle cx={X(sel.x)} cy={Y(sel.y)} r="9" fill="none" stroke="var(--jp-text)" strokeWidth="2" /></g>}
      </svg>
      <Readout>{sel ? `${sel.label ?? "point"}: ${xLabel} ${fmt1(sel.x)}, ${yLabel} ${fmt1(sel.y)}${mode === "bubble" && sel.r !== undefined ? `, size ${fmt1(sel.r)}` : ""}` : regression ? `Dashed line: y = ${reg.slope.toFixed(2)}x ${reg.intercept < 0 ? "−" : "+"} ${Math.abs(reg.intercept).toFixed(1)}, R² = ${reg.r2.toFixed(2)}` : ""}</Readout>
    </>
  );
}

/* ---------- D014: scatter matrix ---------- */
export function ScatterMatrix({ vars, title = "Scatter matrix", state }: { vars: { name: string; values: number[] }[]; title?: string; state?: FrameState }) {
  return (
    <ChartFrame title={title} state={autoState(state, vars.length && vars[0].values.length ? 1 : 0)} height={420} table={{ head: ["Row", ...vars.map((v) => v.name)], rows: vars.map((a) => [a.name, ...vars.map((b) => { const r = pearson(a.values, b.values); return Number.isNaN(r) ? "n/a" : Math.round(r * 100) / 100; })]) }}>
      {(w) => {
        const k = vars.length, lw = 60, size = Math.max(60, Math.min(170, Math.floor((w - lw) / k))), pad = 6, H = size * k + 24;
        return (
          <svg viewBox={`0 0 ${w} ${H}`} style={{ width: "100%", height: H }} role="img" aria-label={`${title}: ${vars.map((v) => v.name).join(", ")}. Upper triangle shows correlation.`}>
            {vars.map((a, i) => vars.map((b, j) => {
              const ox = lw + j * size, oy = 20 + i * size; const ex = (v: { values: number[] }) => ({ lo: Math.min(...v.values), hi: Math.max(...v.values) }); const ea = ex(a), eb = ex(b);
              const px = (v: number) => ox + pad + (eb.hi === eb.lo ? 0.5 : (v - eb.lo) / (eb.hi - eb.lo)) * (size - pad * 2), py = (v: number) => oy + size - pad - (ea.hi === ea.lo ? 0.5 : (v - ea.lo) / (ea.hi - ea.lo)) * (size - pad * 2);
              const r = pearson(a.values, b.values);
              return (
                <g key={`${i}-${j}`}><rect x={ox} y={oy} width={size} height={size} fill="none" stroke="var(--jp-border)" />
                  {i === j ? (() => { const edges = Array.from({ length: 9 }, (_, q) => eb.lo + ((eb.hi - eb.lo || 1) * q) / 8); const c = histogramByEdges(a.values, edges), mx = Math.max(1, ...c); return c.map((n, q) => <rect key={q} x={ox + pad + (q * (size - pad * 2)) / c.length} y={oy + size - pad - (n / mx) * (size - pad * 2)} width={(size - pad * 2) / c.length - 1} height={(n / mx) * (size - pad * 2)} fill={C(i)} opacity=".8" />); })()
                    : i < j ? <text x={ox + size / 2} y={oy + size / 2 + 6} textAnchor="middle" fontSize={14 + Math.abs(Number.isNaN(r) ? 0 : r) * 10} fontWeight="700" fill="var(--jp-text)" opacity={0.35 + 0.65 * Math.abs(Number.isNaN(r) ? 0 : r)}>{Number.isNaN(r) ? "n/a" : r.toFixed(2)}</text>
                    : a.values.map((_, q) => <circle key={q} cx={px(b.values[q])} cy={py(a.values[q])} r="2.2" fill={C(0)} opacity=".55" />)}</g>
              );
            }))}
            {vars.map((v, i) => <g key={v.name}><text x={lw - 6} y={20 + i * size + size / 2 + 4} textAnchor="end" className="adm-axis">{v.name}</text><text x={lw + i * size + size / 2} y={14} textAnchor="middle" className="adm-axis">{v.name}</text></g>)}
          </svg>
        );
      }}
    </ChartFrame>
  );
}

/* ---------- D016: percentile latency chart ---------- */
export function PercentileChart({ samples, labels, slo, unit = "ms", title = "Latency percentiles", state }: { samples: number[][]; labels: string[]; slo?: number; unit?: string; title?: string; state?: FrameState }) {
  const s = autoState(state, samples.length);
  const series = useMemo(() => [50, 90, 95, 99].map((p) => ({ name: `p${p}`, data: samples.map((b) => percentile(b, p)).map((v) => (Number.isNaN(v) ? 0 : Math.round(v * 10) / 10)) })), [samples]);
  if (s === "empty") return <EmptyState spot="no-results" title="No data">No latency samples in this window.</EmptyState>;
  if (s !== "ready") return <ChartFrame title={title} state={s} table={{ head: ["Label"], rows: [] }}>{() => null}</ChartFrame>;
  return <LineChart title={title} labels={labels} series={series} height={260} smooth yFmt={(v) => `${Math.round(v)}${unit}`} thresholds={slo ? [{ value: slo, label: `SLO ${slo}${unit}` }] : []} annotations={[]} />;
}

/* ---------- D017: latency bucket heatmap over time ---------- */
export function LatencyHeatmap({ samples, labels, buckets = 14, unit = "ms", title = "Latency distribution over time", state }: { samples: number[][]; labels: string[]; buckets?: number; unit?: string; title?: string; state?: FrameState }) {
  const all = samples.flat(); const edges = useMemo(() => (all.length ? logEdges(Math.max(1, Math.min(...all)), Math.max(2, Math.max(...all)) * 1.001, buckets) : []), [all.length, buckets]); // eslint-disable-line react-hooks/exhaustive-deps
  const grid = useMemo(() => samples.map((s) => histogramByEdges(s, edges)), [samples, edges]);
  const range = (b: number) => `${Math.round(edges[b])}–${Math.round(edges[b + 1])} ${unit}`;
  return (
    <ChartFrame title={title} state={autoState(state, all.length)} height={300} table={{ head: ["Time", ...Array.from({ length: buckets }, (_, b) => (edges.length ? range(b) : ""))], rows: labels.map((l, i) => [l, ...(grid[i] ?? [])]) }}>
      {(w) => <HeatBody w={w} samples={samples} labels={labels} edges={edges} grid={grid} unit={unit} title={title} />}
    </ChartFrame>
  );
}
function HeatBody({ w, samples, labels, edges, grid, unit, title }: { w: number; samples: number[][]; labels: string[]; edges: number[]; grid: number[][]; unit: string; title: string }) {
  const [cell, setCell] = useState<[number, number] | null>(null); const nb = edges.length - 1, nt = samples.length, m = { l: 52, r: 12, t: 10, b: 28 }, H = 300, cw = (w - m.l - m.r) / nt, ch = (H - m.t - m.b) / nb;
  const mx = Math.max(1, ...grid.flat().map((c) => c)), t = (c: number) => Math.log1p(c) / Math.log1p(mx), ly = (v: number) => H - m.b - (Math.log(Math.max(v, edges[0]) / edges[0]) / Math.log(edges[nb] / edges[0])) * (H - m.t - m.b);
  const pLine = (p: number) => samples.map((s, i) => `${i ? "L" : "M"}${m.l + (i + 0.5) * cw},${ly(percentile(s, p))}`).join("");
  const every = Math.max(1, Math.ceil(nt / Math.max(2, Math.floor(w / 60))));
  return (
    <>
      <svg viewBox={`0 0 ${w} ${H}`} style={{ width: "100%", height: H }} role="img" aria-label={`${title}: ${nt} time buckets by ${nb} latency ranges, with p50 and p95 overlaid`} onMouseLeave={() => setCell(null)}>
        {grid.map((col, i) => col.map((c, b) => <rect key={`${i}-${b}`} x={m.l + i * cw} y={H - m.b - (b + 1) * ch} width={Math.max(1, cw - 1)} height={Math.max(1, ch - 1)} fill="var(--jp-accent)" fillOpacity={c ? 0.08 + 0.92 * t(c) : 0.03} onMouseEnter={() => setCell([i, b])} stroke={cell && cell[0] === i && cell[1] === b ? "var(--jp-text)" : "none"} />))}
        <path d={pLine(50)} fill="none" stroke="var(--jp-text)" strokeWidth="2" /><path d={pLine(95)} fill="none" stroke="var(--adm-c2)" strokeWidth="2" strokeDasharray="6 4" />
        {[0, Math.floor(nb / 2), nb].map((b) => <text key={b} x={m.l - 6} y={H - m.b - b * ch + 4} textAnchor="end" className="adm-axis">{Math.round(edges[b])}</text>)}
        {labels.map((l, i) => i % every === 0 && <text key={i} x={m.l + (i + 0.5) * cw} y={H - 8} textAnchor="middle" className="adm-axis">{l}</text>)}
      </svg>
      <div className="adm-row" style={{ gap: 14 }}><Legend items={[{ name: "p50", color: "var(--jp-text)" }, { name: "p95 (dashed)", color: "var(--adm-c2)" }]} /><span className="pc-note" style={{ margin: 0 }}>Darker = more requests (log scale). Y axis in {unit}, log scale.</span></div>
      <Readout>{cell ? `${labels[cell[0]]}, ${Math.round(edges[cell[1]])}–${Math.round(edges[cell[1] + 1])} ${unit}: ${grid[cell[0]][cell[1]]} requests` : ""}</Readout>
    </>
  );
}
