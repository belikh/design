import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Delta } from "./kit.tsx";
import { ChartTools, ChartTable } from "./chartTools.tsx";
import "./styles/charts.css";

/** Categorical colours come from CSS (tokens), so charts follow light/dark automatically. */
export const C = (i: number) => `var(--adm-c${(((i % 8) + 8) % 8) + 1})`;
export const nice = (max: number) => { const p = 10 ** Math.floor(Math.log10(max || 1)); const n = max / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; };
export const fmtDefault = (v: number) => (Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1) + "M" : Math.abs(v) >= 1e3 ? (v / 1e3).toFixed(1) + "k" : String(Math.round(v * 10) / 10));

/** Measure the container so SVG text is never stretched: 1 viewBox unit = 1 CSS pixel. */
export function useWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null); const [w, setW] = useState(640);
  useEffect(() => { const el = ref.current; if (!el) return; const ro = new ResizeObserver(([e]) => setW(Math.max(220, Math.round(e.contentRect.width)))); ro.observe(el); return () => ro.disconnect(); }, []);
  return [ref, w];
}

export type Series = { name: string; data: number[]; color?: string; axis?: 1 | 2 };

export function Legend({ items, hidden, onToggle }: { items: { name: string; color: string }[]; hidden?: Set<string>; onToggle?: (n: string) => void }) {
  return (
    <ul className="adm-legend">
      {items.map((it) => (
        <li key={it.name}><button type="button" aria-pressed={!hidden?.has(it.name)} className={hidden?.has(it.name) ? "is-off" : ""} onClick={() => onToggle?.(it.name)} disabled={!onToggle}>
          <i style={{ background: it.color }} />{it.name}</button></li>
      ))}
    </ul>
  );
}

export function Tooltip({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return <div className="adm-tt" style={{ left: x, top: y }}>{children}</div>;
}

/* ---------- line / area / stacked area ---------- */
/** Line chart: multi-series, area, stacked, stepped, smooth, forecast band, annotations, anomaly marks, log scale, secondary axis, drag-to-zoom, export, data-table view. */
export function LineChart({ labels: labelsIn, series: seriesIn, height = 240, area, stacked, yFmt = fmtDefault, annotations = [], band, smooth, step, yScale = "linear", anomalies, zoomable = true, tools = true, title = "chart", thresholds = [] }: {
  labels: string[]; series: Series[]; height?: number; area?: boolean; stacked?: boolean; yFmt?: (v: number) => string;
  annotations?: { i: number; label: string }[]; band?: { lo: number[]; hi: number[]; name: string }; smooth?: boolean; step?: boolean;
  yScale?: "linear" | "log"; anomalies?: boolean; zoomable?: boolean; tools?: boolean; title?: string; /** horizontal reference lines (SLO targets, limits) */ thresholds?: { value: number; label: string }[];
}) {
  const [wrap, W] = useWidth(); const H = height, hasY2 = seriesIn.some((s) => s.axis === 2), m = { t: 12, r: hasY2 ? 44 : 12, b: 26, l: 44 };
  const [hidden, setHidden] = useState<Set<string>>(new Set()); const [hover, setHover] = useState<number | null>(null);
  const [range, setRange] = useState<[number, number] | null>(null); const [sel, setSel] = useState<[number, number] | null>(null); const [table, setTable] = useState(false);
  const id = useId(); const log = yScale === "log" && !stacked;
  const [r0, r1] = range ?? [0, labelsIn.length - 1];
  const labels = labelsIn.slice(r0, r1 + 1); const slice = (a: number[]) => a.slice(r0, r1 + 1);
  const all = seriesIn.map((s, i) => ({ ...s, data: slice(s.data), color: s.color ?? C(i), axis: s.axis ?? 1 }));
  const shown = all.filter((s) => !hidden.has(s.name)); const n = labels.length;
  const stackedData = useMemo(() => {
    if (!stacked) return shown.map((s) => ({ ...s, base: s.data.map(() => 0), top: s.data }));
    const acc = labels.map(() => 0);
    return shown.map((s) => { const base = [...acc]; const top = s.data.map((v, i) => (acc[i] += v)); return { ...s, base, top }; });
  }, [shown, stacked, labels]);
  const max1 = Math.max(1, ...stackedData.filter((s) => s.axis === 1).flatMap((s) => s.top).filter(Number.isFinite), ...(band ? slice(band.hi) : [0]));
  const max2 = Math.max(1, ...stackedData.filter((s) => s.axis === 2).flatMap((s) => s.top).filter(Number.isFinite));
  const yMax = log ? 10 ** Math.ceil(Math.log10(max1)) : nice(max1), yMax2 = nice(max2);
  const x = (i: number) => m.l + (i * (W - m.l - m.r)) / Math.max(1, n - 1);
  const ph = H - m.t - m.b;
  const y = (v: number) => (log ? m.t + (1 - Math.log10(Math.max(v, 1)) / Math.log10(yMax)) * ph : m.t + (1 - v / yMax) * ph);
  const yy = (v: number, axis: number) => (axis === 2 ? m.t + (1 - v / yMax2) * ph : y(v));
  const path = (vals: number[], axis = 1) => {
    if (vals.some((v) => Number.isNaN(v))) { /* NaN = gap: pen up, restart with M */ let pen = false; return vals.map((v, i) => { if (Number.isNaN(v)) { pen = false; return ""; } const d = !pen ? `M${x(i)},${yy(v, axis)}` : step ? `H${x(i)}V${yy(v, axis)}` : `L${x(i)},${yy(v, axis)}`; pen = true; return d; }).join(""); }
    if (step) return vals.map((v, i) => (i ? `H${x(i)}V${yy(v, axis)}` : `M${x(i)},${yy(v, axis)}`)).join("");
    if (!smooth) return vals.map((v, i) => `${i ? "L" : "M"}${x(i)},${yy(v, axis)}`).join("");
    return vals.map((v, i) => { if (!i) return `M${x(i)},${yy(v, axis)}`; const cx = (x(i - 1) + x(i)) / 2; return `C${cx},${yy(vals[i - 1], axis)} ${cx},${yy(v, axis)} ${x(i)},${yy(v, axis)}`; }).join("");
  };
  const ticks = log ? Array.from({ length: Math.round(Math.log10(yMax)) + 1 }, (_, k) => 10 ** k) : [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax);
  const idxAt = (clientX: number) => { const r = wrap.current!.getBoundingClientRect(); const px = clientX - r.left; return Math.max(0, Math.min(n - 1, Math.round(((px - m.l) / (W - m.l - m.r)) * (n - 1)))); };
  const outliers = useMemo(() => {
    if (!anomalies) return [] as { s: string; i: number }[];
    const out: { s: string; i: number }[] = [];
    for (const s of shown) { const mean = s.data.reduce((a, b) => a + b, 0) / (n || 1); const sd = Math.sqrt(s.data.reduce((a, b) => a + (b - mean) ** 2, 0) / (n || 1)) || 1; s.data.forEach((v, i) => { if (Math.abs(v - mean) / sd > 2.2) out.push({ s: s.name, i }); }); }
    return out;
  }, [anomalies, shown, n]);
  const lblEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(W / 78))));
  const exportName = title.toLowerCase().replace(/\W+/g, "-");
  return (
    <div className="adm-chart">
      {tools && <ChartTools plot={wrap} name={exportName} labels={labels} series={shown} table={table} onTable={setTable} />}
      {range && <button className="jp-btn jp-btn--secondary jp-btn--sm adm-zoomreset" onClick={() => setRange(null)}>Reset zoom</button>}
      {table ? <ChartTable labels={labels} series={shown} caption={`${title}: data`} /> : (
        <div className="adm-chart__plot" ref={wrap} style={{ cursor: zoomable ? "crosshair" : undefined }}
          onMouseMove={(e) => { const i = idxAt(e.clientX); setHover(i); if (sel) setSel([sel[0], i]); }} onMouseLeave={() => { setHover(null); setSel(null); }}
          onMouseDown={(e) => zoomable && e.button === 0 && setSel([idxAt(e.clientX), idxAt(e.clientX)])}
          onMouseUp={() => { if (sel && Math.abs(sel[1] - sel[0]) >= 2) { const [a, b] = [Math.min(...sel), Math.max(...sel)]; setRange([r0 + a, r0 + b]); } setSel(null); }}>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: ${series_names(seriesIn)}${anomalies && outliers.length ? `. ${outliers.length} anomalies` : ""}`} style={{ height }}>
            {ticks.map((t) => (<g key={t}><line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} className="adm-gl" /><text x={m.l - 6} y={y(t) + 4} textAnchor="end" className="adm-axis">{yFmt(t)}</text></g>))}
            {hasY2 && [0, 0.5, 1].map((f) => <text key={f} x={W - m.r + 6} y={yy(f * yMax2, 2) + 4} className="adm-axis">{yFmt(f * yMax2)}</text>)}
            {labels.map((l, i) => i % lblEvery === 0 && <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="adm-axis">{l}</text>)}
            {band && <path d={slice(band.hi).map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join("") + slice(band.lo).map((_, i, a) => `L${x(a.length - 1 - i)},${y(slice(band.lo)[a.length - 1 - i])}`).join("") + "Z"} fill="var(--adm-c1)" opacity="0.12" />}
            {stackedData.map((s, k) => (
              <g key={s.name}>
                {(area || stacked) && (<><defs><linearGradient id={`${id}g${k}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={s.color} stopOpacity={stacked ? 0.55 : 0.28} /><stop offset="1" stopColor={s.color} stopOpacity={stacked ? 0.35 : 0.02} /></linearGradient></defs>
                  <path d={path(s.top, s.axis) + s.base.map((_, i, a) => `L${x(a.length - 1 - i)},${yy(s.base[a.length - 1 - i], s.axis)}`).join("") + "Z"} fill={`url(#${id}g${k})`} /></>)}
                <path d={path(s.top, s.axis)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.axis === 2 ? "6 4" : undefined} vectorEffect="non-scaling-stroke" />
              </g>
            ))}
            {annotations.filter((a) => a.i >= r0 && a.i <= r1).map((a) => (<g key={a.label}><line x1={x(a.i - r0)} x2={x(a.i - r0)} y1={m.t} y2={H - m.b} className="adm-annot" /><text x={x(a.i - r0) + 4} y={m.t + 10} className="adm-axis">{a.label}</text></g>))}
            {thresholds.filter((th) => th.value <= yMax && (!log || th.value >= 1)).map((th) => (<g key={th.label}><line x1={m.l} x2={W - m.r} y1={y(th.value)} y2={y(th.value)} className="adm-target" /><text x={W - m.r - 4} y={y(th.value) - 4} textAnchor="end" className="adm-axis">{th.label}</text></g>))}
            {outliers.map((o) => { const s = stackedData.find((q) => q.name === o.s)!; return <g key={`${o.s}${o.i}`}><circle cx={x(o.i)} cy={yy(s.top[o.i], s.axis)} r="8" fill="none" stroke="var(--jp-danger)" strokeWidth="2" /><circle cx={x(o.i)} cy={yy(s.top[o.i], s.axis)} r="2.5" fill="var(--jp-danger)" /></g>; })}
            {sel && <rect x={x(Math.min(...sel))} y={m.t} width={Math.abs(x(sel[1]) - x(sel[0]))} height={ph} fill="var(--jp-accent)" opacity="0.15" />}
            {hover !== null && !sel && <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={H - m.b} className="adm-cross" />}
            {hover !== null && !sel && stackedData.map((s) => <circle key={s.name} cx={x(hover)} cy={yy(s.top[hover], s.axis)} r="3.5" fill={s.color} stroke="var(--jp-surface-raised)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />)}
          </svg>
          {hover !== null && !sel && (
            <Tooltip x={Math.min(Math.max((x(hover) / W) * 100, 12), 78)} y={0}>
              <b>{labels[hover]}</b>
              {shown.map((s) => <div key={s.name}><i style={{ background: s.color }} />{s.name}{s.axis === 2 ? " (R)" : ""}<span>{yFmt(s.data[hover])}</span></div>)}
              {outliers.filter((o) => o.i === hover).map((o) => <div key={o.s} style={{ color: "var(--jp-danger)" }}>⚠ anomaly in {o.s}</div>)}
            </Tooltip>
          )}
        </div>
      )}
      <Legend items={seriesIn.map((s, i) => ({ name: s.name, color: s.color ?? C(i) }))} hidden={hidden} onToggle={(nm) => setHidden((h) => { const c = new Set(h); c.has(nm) ? c.delete(nm) : c.add(nm); return c; })} />
      {zoomable && !table && <p className="jp-hint" style={{ margin: "2px 0 0" }}>Drag across the plot to zoom{log ? " · log scale" : ""}{hasY2 ? " · dashed series use the right axis" : ""}.</p>}
    </div>
  );
}
const series_names = (s: Series[]) => s.map((x) => x.name).join(", ");

/* ---------- bars ---------- */
export function BarChart({ labels, series, height = 240, mode = "grouped", horizontal, target, yFmt = fmtDefault, diverging, tools = true, title = "bars" }: {
  labels: string[]; series: Series[]; height?: number; mode?: "grouped" | "stacked" | "percent"; horizontal?: boolean; target?: number; yFmt?: (v: number) => string; diverging?: boolean; tools?: boolean; title?: string;
}) {
  const [table, setTable] = useState(false);
  const [wrapB, W] = useWidth(); const H = height, m = { t: 10, r: 12, b: horizontal ? 18 : 26, l: horizontal ? 90 : 44 };
  const [hover, setHover] = useState<number | null>(null);
  const tot = labels.map((_, i) => series.reduce((a, s) => a + Math.abs(s.data[i]), 0));
  const val = (s: Series, i: number) => (mode === "percent" ? (s.data[i] / (tot[i] || 1)) * 100 : s.data[i]);
  const maxV = mode === "percent" ? 100 : nice(Math.max(1, ...(mode === "stacked" ? tot : series.flatMap((s) => s.data.map(Math.abs))), target ?? 0));
  const minV = diverging ? -maxV : 0;
  const bw = ((horizontal ? H - m.t - m.b : W - m.l - m.r) / labels.length);
  const pos = (v: number) => (horizontal ? m.l + ((v - minV) / (maxV - minV)) * (W - m.l - m.r) : m.t + (1 - (v - minV) / (maxV - minV)) * (H - m.t - m.b));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => minV + f * (maxV - minV));
  return (
    <div className="adm-chart">
      {tools && <ChartTools plot={wrapB} name={title.toLowerCase().replace(/\W+/g, "-")} labels={labels} series={series} table={table} onTable={setTable} />}
      {table ? <ChartTable labels={labels} series={series} caption={`${title}: data`} /> : <div className="adm-chart__plot" ref={wrapB}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Bar chart: ${series.map((s) => s.name).join(", ")}`} style={{ height }}>
          {ticks.map((t) => horizontal
            ? <g key={t}><line y1={m.t} y2={H - m.b} x1={pos(t)} x2={pos(t)} className="adm-gl" /><text x={pos(t)} y={H - 4} textAnchor="middle" className="adm-axis">{yFmt(t)}{mode === "percent" ? "%" : ""}</text></g>
            : <g key={t}><line x1={m.l} x2={W - m.r} y1={pos(t)} y2={pos(t)} className="adm-gl" /><text x={m.l - 6} y={pos(t) + 4} textAnchor="end" className="adm-axis">{yFmt(t)}{mode === "percent" ? "%" : ""}</text></g>)}
          {labels.map((l, i) => {
            let acc = 0; const g = series.length;
            const bandStart = (horizontal ? m.t : m.l) + i * bw, inner = bw * 0.66, off = (bw - inner) / 2;
            return (
              <g key={l} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} opacity={hover === null || hover === i ? 1 : 0.55}>
                <rect x={horizontal ? m.l : bandStart} y={horizontal ? bandStart : m.t} width={horizontal ? W - m.l - m.r : bw} height={horizontal ? bw : H - m.t - m.b} fill="transparent" />
                {series.map((s, k) => {
                  const v = val(s, i); const color = s.color ?? C(k);
                  const a = mode === "grouped" ? 0 : acc; const b = mode === "grouped" ? v : (acc += v);
                  const sz = mode === "grouped" ? inner / g : inner, o = mode === "grouped" ? off + k * sz : off;
                  const p0 = pos(Math.min(a, b)), p1 = pos(Math.max(a, b));
                  return horizontal
                    ? <rect key={s.name} x={pos(Math.min(a, b))} y={bandStart + o} width={Math.max(0, pos(Math.max(a, b)) - p0 - (mode === "grouped" ? 0 : 1))} height={sz - 2} rx="2" fill={color} />
                    : <rect key={s.name} x={bandStart + o} y={p1} width={sz - 2} height={Math.max(0, p0 - p1 - (mode === "grouped" ? 0 : 1))} rx="2" fill={color} />;
                })}
                {(horizontal || i % Math.max(1, Math.ceil(46 / bw)) === 0) && <text x={horizontal ? m.l - 6 : bandStart + bw / 2} y={horizontal ? bandStart + bw / 2 + 4 : H - 8} textAnchor={horizontal ? "end" : "middle"} className="adm-axis">{l}</text>}
              </g>
            );
          })}
          {target !== undefined && (horizontal ? <line y1={m.t} y2={H - m.b} x1={pos(target)} x2={pos(target)} className="adm-target" /> : <line x1={m.l} x2={W - m.r} y1={pos(target)} y2={pos(target)} className="adm-target" />)}
        </svg>
        {hover !== null && <Tooltip x={Math.min(Math.max(((horizontal ? 50 : ((m.l + (hover + 0.5) * bw) / W) * 100)), 14), 78)} y={0}><b>{labels[hover]}</b>{series.map((s, k) => <div key={s.name}><i style={{ background: s.color ?? C(k) }} />{s.name}<span>{yFmt(s.data[hover])}</span></div>)}</Tooltip>}
      </div>}
      {series.length > 1 && <Legend items={series.map((s, i) => ({ name: s.name, color: s.color ?? C(i) }))} />}
    </div>
  );
}

/* ---------- donut / pie ---------- */
export function Donut({ parts, size = 180, thickness = 26, center, pie, semi }: { parts: { label: string; value: number; color?: string }[]; size?: number; thickness?: number; center?: ReactNode; pie?: boolean; semi?: boolean }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const r = size / 2 - 2, ir = pie ? 0 : r - thickness;
  const [hov, setHov] = useState<number | null>(null);
  const span = semi ? Math.PI : Math.PI * 2, start0 = semi ? -Math.PI : -Math.PI / 2;
  let a = start0;
  const arcs = parts.map((p, i) => {
    const a0 = a, a1 = (a += (p.value / total) * span);
    const pt = (ang: number, rad: number) => [size / 2 + rad * Math.cos(ang), size / 2 + rad * Math.sin(ang)];
    const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1 - 0.0001, r), [x2, y2] = pt(a1 - 0.0001, ir), [x3, y3] = pt(a0, ir);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const d = `M${x0},${y0}A${r},${r} 0 ${large} 1 ${x1},${y1}L${x2},${y2}${ir ? `A${ir},${ir} 0 ${large} 0 ${x3},${y3}` : `L${size / 2},${size / 2}`}Z`;
    return { d, color: p.color ?? C(i), p };
  });
  return (
    <div className="adm-donut" style={{ width: size }}>
      <svg viewBox={`0 0 ${size} ${semi ? size / 2 + 6 : size}`} width={size} height={semi ? size / 2 + 6 : size} role="img" aria-label={`Breakdown: ${parts.map((p) => `${p.label} ${Math.round((p.value / total) * 100)}%`).join(", ")}`}>
        {arcs.map((x, i) => <path key={i} d={x.d} fill={x.color} stroke="var(--jp-surface-raised)" strokeWidth="1.5" opacity={hov === null || hov === i ? 1 : 0.5} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} />)}
      </svg>
      {!pie && <div className="adm-donut__c" style={semi ? { top: "auto", bottom: 0, height: "auto" } : undefined}>{hov !== null ? <><b>{Math.round((parts[hov].value / total) * 100)}%</b><span>{parts[hov].label}</span></> : center}</div>}
    </div>
  );
}

/* ---------- sparkline ---------- */
export function Spark({ data, kind = "line", color = "var(--jp-accent)", w = 96, h = 28 }: { data: number[]; kind?: "line" | "area" | "bar" | "winloss"; color?: string; w?: number; h?: number }) {
  const min = Math.min(...data, kind === "bar" ? 0 : Infinity), max = Math.max(...data), span = max - min || 1;
  const x = (i: number) => 1 + (i * (w - 2)) / Math.max(1, data.length - 1), y = (v: number) => h - 2 - ((v - min) / span) * (h - 4);
  if (kind === "bar") return <svg width={w} height={h} aria-hidden>{data.map((v, i) => <rect key={i} x={1 + (i * (w - 2)) / data.length} width={(w - 2) / data.length - 1.5} y={y(v)} height={h - 2 - y(v)} fill={color} rx="1" />)}</svg>;
  if (kind === "winloss") return <svg width={w} height={h} aria-hidden>{data.map((v, i) => <rect key={i} x={1 + (i * (w - 2)) / data.length} width={(w - 2) / data.length - 1.5} y={v >= 0 ? h / 2 - 7 : h / 2 + 1} height={6} fill={v >= 0 ? "var(--jp-ok)" : "var(--jp-danger)"} rx="1" />)}</svg>;
  const d = data.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join("");
  return <svg width={w} height={h} aria-hidden>{kind === "area" && <path d={`${d}L${x(data.length - 1)},${h}L${x(0)},${h}Z`} fill={color} opacity="0.15" />}<path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}

/* ---------- stat tile ---------- */
export function StatTile({ label, value, unit, delta, trend, invert, spark, sub, testId }: { label: string; value: string; /** Small unit after the value, e.g. "ms". */ unit?: string; delta?: number; /** A delta already formatted as text, with its direction (up is good). Use instead of `delta`. */ trend?: { dir: "up" | "down"; text: string }; invert?: boolean; spark?: number[]; sub?: string; testId?: string }) {
  return (
    <div className="jp-stat adm-stat" data-testid={testId}>
      <span className="jp-stat__label">{label}</span>
      <span className="jp-stat__value" data-testid={testId ? `${testId}-value` : undefined}>{value}{unit && <small>{unit}</small>}</span>
      <div className="adm-stat__meta">
        <span className="jp-stat__meta">{delta !== undefined && <Delta v={delta} invert={invert} />}{trend && <span className={`jp-delta--${trend.dir}`}>{trend.text}</span>} {sub}</span>
        {spark && <Spark data={spark} kind="area" w={80} h={24} />}
      </div>
    </div>
  );
}

/* ---------- gauge & progress ---------- */
export function Gauge({ value, max = 100, label, unit = "%", zones = [0.6, 0.85], size = 160 }: { value: number; max?: number; label: string; unit?: string; zones?: [number, number]; size?: number }) {
  const f = Math.min(1, value / max), r = size / 2 - 12, cx = size / 2, cy = size / 2 + 4;
  const pt = (t: number, rad = r) => [cx + rad * Math.cos(Math.PI * (1 + t)), cy + rad * Math.sin(Math.PI * (1 + t))];
  const arc = (t0: number, t1: number) => { const [a, b] = pt(t0), [c, d] = pt(t1); return `M${a},${b}A${r},${r} 0 0 1 ${c},${d}`; };
  const color = f < zones[0] ? "var(--jp-ok)" : f < zones[1] ? "var(--jp-warn)" : "var(--jp-danger)";
  const [nx, ny] = pt(f, r - 16);
  return (
    <figure className="adm-gauge" style={{ width: size }} aria-label={`${label}: ${value}${unit}`}>
      <svg viewBox={`0 0 ${size} ${size / 2 + 22}`} width={size}>
        <path d={arc(0, 1)} stroke="var(--jp-border)" strokeWidth="10" fill="none" strokeLinecap="round" />
        <path d={arc(0, Math.max(0.001, f))} stroke={color} strokeWidth="10" fill="none" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="var(--jp-text)" strokeWidth="2" strokeLinecap="round" /><circle cx={cx} cy={cy} r="4" fill="var(--jp-text)" />
      </svg>
      <figcaption><b>{value}{unit}</b><span className="jp-muted">{label}</span></figcaption>
    </figure>
  );
}
export function ProgressBar({ value, max = 100, s, label, segments }: { value: number; max?: number; s?: "ok" | "warn" | "danger"; label?: string; segments?: { v: number; color: string; name: string }[] }) {
  const f = Math.min(100, (value / max) * 100);
  return (
    <div className="adm-progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
      <div className="adm-progress__track">{segments ? segments.map((sg) => <span key={sg.name} title={sg.name} style={{ width: `${(sg.v / max) * 100}%`, background: sg.color }} />) : <span className={s ? `is-${s}` : ""} style={{ width: `${f}%` }} />}</div>
    </div>
  );
}
export function Ring({ value, max = 100, size = 64, label }: { value: number; max?: number; size?: number; label?: string }) {
  const r = size / 2 - 5, c = 2 * Math.PI * r, f = Math.min(1, value / max);
  return (
    <svg width={size} height={size} role="img" aria-label={label ?? `${Math.round(f * 100)}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--jp-border)" strokeWidth="6" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--jp-accent)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${c * f} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="adm-ringtxt">{Math.round(f * 100)}%</text>
    </svg>
  );
}

/* ---------- heatmaps ---------- */
export function Heatmap({ rows, cols, data, fmt = (v: number) => String(v) }: { rows: string[]; cols: string[]; data: number[][]; fmt?: (v: number) => string }) {
  const flat = data.flat(), min = Math.min(...flat), max = Math.max(...flat);
  return (
    <div className="adm-heat" style={{ gridTemplateColumns: `auto repeat(${cols.length}, 1fr)` }} role="table" aria-label="Heatmap">
      <span />{cols.map((c) => <span key={c} className="adm-heat__h">{c}</span>)}
      {rows.map((r, i) => (<>{<span key={`r${i}`} className="adm-heat__h adm-heat__r">{r}</span>}{data[i].map((v, j) => <span key={`${i}-${j}`} className="adm-heat__c" title={`${r} / ${cols[j]}: ${fmt(v)}`} style={{ ["--t" as string]: ((v - min) / (max - min || 1)).toFixed(3) }}>{cols.length <= 10 ? fmt(v) : ""}</span>)}</>))}
    </div>
  );
}
export function CalendarHeat({ values, weeks = 26 }: { values: number[]; weeks?: number }) {
  const max = Math.max(...values, 1);
  const cols = Array.from({ length: weeks }, (_, w) => values.slice(w * 7, w * 7 + 7));
  return (
    <div className="adm-calheat" role="img" aria-label="Activity by day">
      {cols.map((c, w) => <div key={w}>{c.map((v, d) => <i key={d} title={`${v} events`} style={{ ["--t" as string]: (v / max).toFixed(2) }} />)}</div>)}
    </div>
  );
}

/* ---------- uptime ---------- */
export function UptimeBars({ days }: { days: ("ok" | "warn" | "danger" | "none")[] }) {
  return <div className="adm-uptime" role="img" aria-label={`Uptime, last ${days.length} days`}>{days.map((d, i) => <i key={i} className={`is-${d}`} title={`${days.length - i}d ago: ${d === "none" ? "no data" : d === "ok" ? "operational" : d === "warn" ? "degraded" : "outage"}`} />)}</div>;
}

/* ---------- scatter / bubble ---------- */
export function Scatter({ points, height = 260, xLabel, yLabel }: { points: { x: number; y: number; r?: number; g?: number; label?: string }[]; height?: number; xLabel?: string; yLabel?: string }) {
  const [wrapS, W] = useWidth(); const H = height, m = { t: 10, r: 12, b: 30, l: 44 };
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const xMax = nice(Math.max(...xs)), yMax = nice(Math.max(...ys));
  const X = (v: number) => m.l + (v / xMax) * (W - m.l - m.r), Y = (v: number) => m.t + (1 - v / yMax) * (H - m.t - m.b);
  const n = points.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  const sxy = points.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0), sxx = points.reduce((a, p) => a + (p.x - mx) ** 2, 0) || 1;
  const k = sxy / sxx, b0 = my - k * mx;
  return (
    <div className="adm-chart"><div className="adm-chart__plot" ref={wrapS}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ height }} role="img" aria-label="Scatter plot">
        {[0, 0.5, 1].map((f) => <g key={f}><line x1={m.l} x2={W - m.r} y1={Y(f * yMax)} y2={Y(f * yMax)} className="adm-gl" /><text x={m.l - 6} y={Y(f * yMax) + 4} textAnchor="end" className="adm-axis">{fmtDefault(f * yMax)}</text><text x={X(f * xMax)} y={H - 12} textAnchor="middle" className="adm-axis">{fmtDefault(f * xMax)}</text></g>)}
        {points.map((p, i) => <circle key={i} cx={X(p.x)} cy={Y(p.y)} r={p.r ?? 4} fill={C(p.g ?? 0)} fillOpacity="0.6" stroke={C(p.g ?? 0)}><title>{p.label ?? `${p.x}, ${p.y}`}</title></circle>)}
        <line x1={X(0)} y1={Y(b0)} x2={X(xMax)} y2={Y(k * xMax + b0)} className="adm-target" />
        {xLabel && <text x={W / 2} y={H - 1} textAnchor="middle" className="adm-axis">{xLabel}</text>}
        {yLabel && <text x={10} y={m.t + 6} className="adm-axis">{yLabel}</text>}
      </svg></div></div>
  );
}

/* ---------- funnel / treemap / waterfall / bullet ---------- */
export function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const top = steps[0].value;
  return (
    <ol className="adm-funnel">
      {steps.map((s, i) => (
        <li key={s.label}><div className="adm-funnel__bar" style={{ width: `${(s.value / top) * 100}%`, background: C(0), opacity: 1 - i * 0.14 }}>{s.label}</div>
          <span><b>{fmtDefault(s.value)}</b>{i > 0 && <span className="jp-muted"> {((s.value / steps[i - 1].value) * 100).toFixed(0)}% of prev</span>}</span></li>
      ))}
    </ol>
  );
}
export function Treemap({ items, height = 220 }: { items: { label: string; value: number }[]; height?: number }) {
  const [wrapT, W] = useWidth(); const total = items.reduce((a, i) => a + i.value, 0);
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const rects: { x: number; y: number; w: number; h: number; it: (typeof items)[0]; i: number }[] = [];
  const lay = (arr: typeof sorted, x: number, y: number, w: number, h: number, base: number) => {
    if (!arr.length) return;
    if (arr.length === 1) { rects.push({ x, y, w, h, it: arr[0], i: base }); return; }
    const sum = arr.reduce((a, i) => a + i.value, 0); let acc = 0, k = 0;
    while (k < arr.length - 1 && acc + arr[k].value < sum / 2) acc += arr[k++].value;
    k = Math.max(1, k); const a = arr.slice(0, k), b = arr.slice(k), fa = a.reduce((s, i) => s + i.value, 0) / sum;
    if (w >= h) { lay(a, x, y, w * fa, h, base); lay(b, x + w * fa, y, w * (1 - fa), h, base + k); } else { lay(a, x, y, w, h * fa, base); lay(b, x, y + h * fa, w, h * (1 - fa), base + k); }
  };
  lay(sorted, 0, 0, W, height, 0);
  return (
    <div ref={wrapT}><svg viewBox={`0 0 ${W} ${height}`} style={{ width: "100%", height }} role="img" aria-label="Treemap">
      {rects.map((r) => (<g key={r.it.label}><rect x={r.x + 1} y={r.y + 1} width={Math.max(0, r.w - 2)} height={Math.max(0, r.h - 2)} rx="3" fill={C(r.i)} fillOpacity="0.8" />
        {r.w > 60 && r.h > 30 && <text x={r.x + 8} y={r.y + 20} className="adm-tmtext">{r.it.label}</text>}{r.w > 60 && r.h > 44 && <text x={r.x + 8} y={r.y + 36} className="adm-tmtext adm-tmtext--s">{((r.it.value / total) * 100).toFixed(0)}%</text>}</g>))}
    </svg></div>
  );
}
export function Waterfall({ steps, height = 220 }: { steps: { label: string; value: number; total?: boolean }[]; height?: number }) {
  const [wrapW, W] = useWidth(); const m = { t: 10, r: 8, b: 26, l: 40 };
  let run = 0; const bars = steps.map((s) => { const a = s.total ? 0 : run; const b = s.total ? s.value : (run += s.value); if (s.total) run = s.value; return { ...s, lo: Math.min(a, b), hi: Math.max(a, b) }; });
  const max = nice(Math.max(...bars.map((b) => b.hi))); const bw = (W - m.l - m.r) / bars.length;
  const Y = (v: number) => m.t + (1 - v / max) * (height - m.t - m.b);
  return (
    <div ref={wrapW}><svg viewBox={`0 0 ${W} ${height}`} style={{ width: "100%", height }} role="img" aria-label="Waterfall chart">
      {[0, 0.5, 1].map((f) => <g key={f}><line x1={m.l} x2={W - m.r} y1={Y(f * max)} y2={Y(f * max)} className="adm-gl" /><text x={m.l - 6} y={Y(f * max) + 4} textAnchor="end" className="adm-axis">{fmtDefault(f * max)}</text></g>)}
      {bars.map((b, i) => (<g key={b.label}><rect x={m.l + i * bw + 6} width={bw - 12} y={Y(b.hi)} height={Math.max(1, Y(b.lo) - Y(b.hi))} rx="2" fill={b.total ? "var(--adm-c1)" : b.value >= 0 ? "var(--jp-ok)" : "var(--jp-danger)"} /><text x={m.l + i * bw + bw / 2} y={height - 8} textAnchor="middle" className="adm-axis">{b.label}</text></g>))}
    </svg></div>
  );
}
export function Bullet({ label, value, target, ranges, max }: { label: string; value: number; target: number; ranges: [number, number, number]; max: number }) {
  const p = (v: number) => `${(v / max) * 100}%`;
  return (
    <div className="adm-bullet"><span>{label}</span>
      <div role="img" aria-label={`${label}: ${value} of target ${target}`}><i style={{ width: p(ranges[2]) }} /><i style={{ width: p(ranges[1]) }} /><i style={{ width: p(ranges[0]) }} /><b style={{ width: p(value) }} /><u style={{ left: p(target) }} /></div>
      <em>{value}</em></div>
  );
}

/* ---------- thermometer / battery ---------- */
export function Thermometer({ value, min = -10, max = 50, unit = "°C", label = "Temperature", zones = [0.35, 0.7] }: { value: number; min?: number; max?: number; unit?: string; label?: string; zones?: [number, number] }) {
  const f = Math.max(0, Math.min(1, (value - min) / (max - min))); const color = f < zones[0] ? "var(--jp-info)" : f < zones[1] ? "var(--jp-ok)" : "var(--jp-danger)"; const H = 150, top = 12, bulb = 16, h = H - top - bulb * 2;
  return (
    <figure className="adm-thermo" aria-label={`${label}: ${value}${unit}`}>
      <svg width="84" height={H + 8} viewBox={`0 0 84 ${H + 8}`}><rect x="24" y={top} width="16" height={h + bulb} rx="8" fill="none" stroke="var(--jp-border)" strokeWidth="2" /><circle cx="32" cy={H - bulb + 4} r={bulb} fill={color} /><rect x="29" y={top + h * (1 - f) + 4} width="6" height={h * f + bulb} rx="3" fill={color} />
        {[0, 0.25, 0.5, 0.75, 1].map((t) => <g key={t}><line x1="44" x2="52" y1={top + 4 + h * (1 - t)} y2={top + 4 + h * (1 - t)} stroke="var(--jp-text-muted)" /><text x="55" y={top + 8 + h * (1 - t)} className="adm-axis" fontSize="11">{Math.round(min + t * (max - min))}</text></g>)}</svg>
      <figcaption><b>{value}{unit}</b><span className="jp-muted">{label}</span></figcaption>
    </figure>
  );
}
export function Battery({ value, charging, label = "Battery" }: { value: number; charging?: boolean; label?: string }) {
  const color = value < 20 ? "var(--jp-danger)" : value < 40 ? "var(--jp-warn)" : "var(--jp-ok)";
  return (
    <figure className="adm-battery" aria-label={`${label}: ${value}%${charging ? ", charging" : ""}`}>
      <svg width="96" height="44" viewBox="0 0 96 44"><rect x="2" y="4" width="84" height="36" rx="6" fill="none" stroke="var(--jp-text)" strokeWidth="2.5" /><rect x="88" y="14" width="6" height="16" rx="2" fill="var(--jp-text)" /><rect x="6" y="8" width={Math.max(0, 76 * (value / 100))} height="28" rx="3" fill={color} />{charging && <path d="M46 6 L36 24 H46 L42 38 L58 18 H48 Z" fill="var(--jp-bg)" stroke="var(--jp-text)" strokeWidth="1.5" strokeLinejoin="round" />}</svg>
      <figcaption><b>{value}%</b><span className="jp-muted">{label}{charging ? " · charging" : ""}</span></figcaption>
    </figure>
  );
}
