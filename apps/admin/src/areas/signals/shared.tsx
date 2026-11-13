import { useId, useState, type ReactNode } from "react";
import { Panel } from "@belikh/jupiter-ui/kit.tsx";
import { Legend, C, nice } from "@belikh/jupiter-ui/Charts.tsx";
import type { ChartTableData } from "@belikh/jupiter-ui/chartTools.tsx";
import { ChartFrame, type FrameState } from "../charts/frame.tsx";
import { ChartControls, type ChartIx } from "./useChartInteractions.tsx";
import "./signals.css";

export const M = { t: 10, r: 14, b: 26, l: 46 };
export const lin = (d0: number, d1: number, r0: number, r1: number) => (v: number) => r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0);
export const f1 = (v: number) => (Math.abs(v) >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10));
/** About `n` round tick values covering lo..hi. */
export function ticks(lo: number, hi: number, n = 5) { const step = nice((hi - lo) / n || 1), out: number[] = []; for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10)); return out; }
export const pathOf = (pts: [number, number][]) => pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");

export function YAxis({ t, y, w, fmt = f1, grid = true }: { t: number[]; y: (v: number) => number; w: number; fmt?: (v: number) => string; grid?: boolean }) {
  return <g>{t.map((v) => <g key={v}>{grid && <line className="lab-gl" x1={M.l} x2={w - M.r} y1={y(v)} y2={y(v)} />}<text className="lab-ax" x={M.l - 6} y={y(v)} textAnchor="end" dominantBaseline="middle">{fmt(v)}</text></g>)}</g>;
}
export function XLabels({ labels, x, h, every }: { labels: string[]; x: (i: number) => number; h: number; every?: number }) {
  const e = every ?? Math.max(1, Math.ceil(labels.length / 8));
  return <g>{labels.map((l, i) => (i % e === 0 ? <text key={i} className="lab-ax" x={x(i)} y={h - 8} textAnchor="middle">{l}</text> : null))}</g>;
}

/** SVG pattern fills so series differ by texture as well as colour (print, greyscale, colour-vision). */
export function Patterns({ id }: { id: string }) {
  const s = (i: number) => ({ stroke: C(i), strokeWidth: 1.6, fill: "none" });
  return (
    <defs>
      <pattern id={`${id}-p0`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--jp-surface-raised)" /><line x1="0" y1="0" x2="0" y2="6" {...s(0)} strokeWidth={3} /></pattern>
      <pattern id={`${id}-p1`} width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="var(--jp-surface-raised)" /><circle cx="3" cy="3" r="1.5" fill={C(1)} /></pattern>
      <pattern id={`${id}-p2`} width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="var(--jp-surface-raised)" /><path d="M0 3H6M3 0V6" {...s(2)} /></pattern>
      <pattern id={`${id}-p3`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="6" height="6" fill="var(--jp-surface-raised)" /><line x1="0" y1="0" x2="0" y2="6" {...s(3)} strokeWidth={3} /></pattern>
      <pattern id={`${id}-p4`} width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="var(--jp-surface-raised)" /><path d="M0 1H6" {...s(4)} strokeWidth={3} /></pattern>
      <pattern id={`${id}-p5`} width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="var(--jp-surface-raised)" /><path d="M1 0V6" {...s(5)} strokeWidth={3} /></pattern>
    </defs>
  );
}
export const patUrl = (id: string, i: number) => `url(#${id}-p${((i % 6) + 6) % 6})`;
export const useSvgId = () => useId().replace(/[^a-zA-Z0-9]/g, "");

export type FigCtx = { w: number; h: number; active: number | null; setActive: (i: number | null) => void; uid: string };
/**
 * Frame for every signal chart: toolbar (data table, export), role="img" SVG with a text summary, a keyboard-reachable inspector
 * (a labelled slider that walks the data points and updates a live readout), optional legend and an empty state.
 */
export function Fig({ title, summary, table, height = 260, count, describe, legend, render, empty, state, footer, shared, ix }: {
  title: string; summary: string; table: ChartTableData; height?: number; count: number; describe: (i: number) => string; legend?: { name: string; color: string }[];
  render: (c: FigCtx) => ReactNode; empty?: boolean; state?: FrameState; footer?: ReactNode; /** controlled cursor, to sync crosshairs across charts */ shared?: { active: number | null; set: (i: number | null) => void };
  /** interactions from `useChartInteractions`: adds the focusable frame (keyboard zoom / lasso) and the range, scale and freshness controls */ ix?: ChartIx;
}) {
  const [own, setOwn] = useState<number | null>(null); const active = shared ? shared.active : own, setActive = shared ? shared.set : setOwn; const uid = useSvgId(); const st: FrameState = empty ? "empty" : state ?? "ready";
  const a = active === null ? null : Math.min(active, Math.max(0, count - 1));
  return (
    <div className="lab-fig">
      <ChartFrame title={title} table={table} state={st} height={height}
        footer={st === "ready" ? <>
          {legend && <Legend items={legend} />}
          {count > 0 && <label className="lab-inspect">Inspect values<input type="range" min={0} max={count - 1} step={1} value={a ?? 0} aria-label={`Inspect ${title}`} aria-valuetext={describe(a ?? 0)} onChange={(e) => setActive(Number(e.target.value))} onFocus={() => a === null && setActive(0)} /></label>}
          <p className="lab-readout" aria-live="polite">{a === null ? (count > 0 ? "Hover the chart or use the slider to read values." : "") : describe(a)}</p>
          {ix && <ChartControls ix={ix} title={title} />}
          {footer}
        </> : undefined}>
        {(w) => { const svg = <svg viewBox={`0 0 ${w} ${height}`} width={w} height={height} role="img" aria-label={summary} onPointerLeave={() => setActive(null)}>{render({ w, h: height, active: a, setActive, uid })}</svg>; return ix ? <div {...ix.frameProps} aria-label={`${title}. ${ix.hint}`}>{svg}</div> : svg; }}
      </ChartFrame>
    </div>
  );
}
export const P = ({ id, title, children }: { id: string; title: string; children: ReactNode }) => <Panel title={<>{title}<span className="lab-id">{id}</span></>}>{children}</Panel>;
export const table = (head: string[], rows: (string | number)[][]): ChartTableData => ({ head, rows });
export const pct = (v: number) => `${Math.round(v * 100)}%`;
