import { useState, type KeyboardEvent, type ReactNode } from "react";
import { C, Legend } from "@belikh/jupiter-ui/Charts.tsx";
import type { ChartTableData } from "@belikh/jupiter-ui/chartTools.tsx";
import { ChartFrame, Readout, type FrameState } from "../charts/frame.tsx";
import { autoState } from "../charts/shared.tsx";
import "./charts-more.css";

export { C };
export type { FrameState };
export const fmt = (v: number, d = 1) => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(d)}M` : Math.abs(v) >= 1e4 ? `${(v / 1e3).toFixed(d)}k` : String(Math.round(v * 10 ** d) / 10 ** d));
export const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
export const r2 = (v: number) => Math.round(v * 100) / 100;

/** Hover/focus selection shared by every mark: one active index, arrow-key stepping, readout text. */
export type Pick = { i: number | null; mark: (k: number, cls?: string) => { className: string; onMouseEnter: () => void; onMouseLeave: () => void; "data-on"?: "" }; on: (k: number) => boolean; any: boolean };
function usePick(n: number) {
  const [i, set] = useState<number | null>(null);
  const pick: Pick = { i, any: i !== null, on: (k) => i === k, mark: (k, cls = "") => ({ className: `lab-m ${cls} ${i === k ? "is-on" : i !== null ? "is-dim" : ""}`.trim(), onMouseEnter: () => set(k), onMouseLeave: () => set(null) }) };
  const key = (e: KeyboardEvent) => {
    if (!n) return; const k = e.key;
    if (k === "ArrowRight" || k === "ArrowDown") set(i === null ? 0 : Math.min(n - 1, i + 1));
    else if (k === "ArrowLeft" || k === "ArrowUp") set(i === null ? n - 1 : Math.max(0, i - 1));
    else if (k === "Home") set(0); else if (k === "End") set(n - 1); else if (k === "Escape") set(null); else return;
    e.preventDefault();
  };
  return { pick, key, clear: () => set(null) };
}

function Body({ w, height: heightIn, title, summary, items, build }: { w: number; height: Height; title: string; summary: string; items: string[]; build: (w: number, pk: Pick) => ReactNode }) {
  const { pick, key, clear } = usePick(items.length); const height = resolve(heightIn, w);
  return (
    <>
      <svg className="lab-svg" viewBox={`0 0 ${w} ${height}`} style={{ inlineSize: "100%", blockSize: height }} role="img" tabIndex={0} aria-label={`${title}. ${summary} Use arrow keys to step through ${items.length} items.`} onKeyDown={key} onBlur={clear} onMouseLeave={clear}>{build(w, pick)}</svg>
      <Readout>{pick.i !== null ? items[pick.i] : "Hover, or focus the chart and use the arrow keys, to read values."}</Readout>
    </>
  );
}

export type Height = number | ((w: number) => number);
const resolve = (h: Height, w: number) => (typeof h === "function" ? h(w) : h);

/** Frame + svg + readout + legend used by every chart in this area. `items` are the readout sentences (one per navigable mark). */
export function Chart({ title, id, summary, table, items, height = 260, state, legend, count, build }: {
  title: string; id: string; summary: string; table: ChartTableData; items: string[]; height?: Height; state?: FrameState; legend?: { name: string; color: string }[]; count?: number; build: (w: number, pk: Pick) => ReactNode;
}) {
  return (
    <div className="lab-chart" data-chart-id={id}>
      <ChartFrame title={title} state={autoState(state, count ?? items.length)} height={resolve(height, 640)} table={table}>
        {(w) => <Body w={w} height={height} title={title} summary={summary} items={items} build={build} />}
      </ChartFrame>
      {legend && legend.length > 1 && <Legend items={legend} />}
    </div>
  );
}

/** Y-axis ticks + gridlines. */
export function YAxis({ ticks, y, x0, x1, fmtT = fmt }: { ticks: number[]; y: (v: number) => number; x0: number; x1: number; fmtT?: (v: number) => string }) {
  return <>{ticks.map((t) => <g key={t}><line x1={x0} x2={x1} y1={y(t)} y2={y(t)} className="adm-gl" /><text x={x0 - 6} y={y(t)} textAnchor="end" dominantBaseline="middle" className="lab-t">{fmtT(t)}</text></g>)}</>;
}
export const T = ({ x, y, children, anchor = "middle", cls = "lab-t", ...r }: { x: number; y: number; children: ReactNode; anchor?: "start" | "middle" | "end"; cls?: string } & React.SVGAttributes<SVGTextElement>) => <text x={x} y={y} textAnchor={anchor} className={cls} {...r}>{children}</text>;
/** Evenly spaced "nice" ticks for [0, max]. */
export function ticksTo(max: number, n = 4) { const raw = max / n || 1, mag = 10 ** Math.floor(Math.log10(raw)), step = ([1, 2, 2.5, 5, 10].find((m) => raw <= m * mag) ?? 10) * mag; const out: number[] = []; for (let v = 0; v <= max + step * 0.01; v += step) out.push(Math.round(v / step) * step); return out; }
export const legendOf = (names: string[], offset = 0) => names.map((name, i) => ({ name, color: C(i + offset) }));
export const csvRows = (labels: string[], cols: { name: string; data: (number | string)[] }[]) => ({ head: ["Label", ...cols.map((c) => c.name)], rows: labels.map((l, i) => [l, ...cols.map((c) => c.data[i])]) });
