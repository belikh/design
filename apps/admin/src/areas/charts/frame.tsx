import { useRef, useState, type ReactNode } from "react";
import { Btn, EmptyState, Menu, Skeleton } from "@belikh/jupiter-ui/kit.tsx";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";
import { download, exportPng, exportSvg, GenericTable, tableToCsv, type ChartTableData } from "@belikh/jupiter-ui/chartTools.tsx";
import { useWidth } from "@belikh/jupiter-ui/Charts.tsx";
import "./charts.css";

export type FrameState = "ready" | "loading" | "empty" | "error";
export const slug = (s: string) => s.toLowerCase().replace(/\W+/g, "-").replace(/^-|-$/g, "");

/**
 * Shared frame for every P2 chart: toolbar (data table, fullscreen, export SVG/PNG/CSV), measured width for pixel-true SVG,
 * and the loading / empty / error states. `table` is the accessible equivalent of the chart and also feeds the CSV export.
 */
export function ChartFrame({ title, table, state = "ready", height = 240, children, svg = true, footer, onRetry }: {
  title: string; table: ChartTableData; state?: FrameState; height?: number; children: (w: number) => ReactNode; svg?: boolean; footer?: ReactNode; onRetry?: () => void;
}) {
  const [wrap, w] = useWidth(); const root = useRef<HTMLDivElement>(null); const [view, setView] = useState(false); const [fs, setFs] = useState(false);
  const grab = () => wrap.current?.querySelector("svg") as SVGSVGElement | null;
  const items = [
    ...(svg ? [{ label: "Download SVG", onSelect: () => { const s = grab(); if (s) exportSvg(s, slug(title)); } }, { label: "Download PNG", onSelect: () => { const s = grab(); if (s) exportPng(s, slug(title)); } }] : []),
    { label: "Download CSV", onSelect: () => download(`${slug(title)}.csv`, new Blob([tableToCsv(table)], { type: "text/csv" })) },
    "sep" as const, { label: "Copy CSV", onSelect: () => navigator.clipboard?.writeText(tableToCsv(table)) },
  ];
  return (
    <div className="adm-chart pc-frame" ref={root} data-chart={slug(title)}>
      <div className="adm-ctools">
        <button className="adm-x" aria-pressed={view} aria-label={view ? "Show chart" : "Show data table"} title={view ? "Show chart" : "Show data table"} onClick={() => setView(!view)} disabled={state !== "ready"}><Icon name="menu" size={15} /></button>
        <button className="adm-x" aria-label="Toggle fullscreen" title="Fullscreen" onClick={() => { const el = root.current; if (!el) return; if (document.fullscreenElement) { void document.exitFullscreen(); setFs(false); } else { void el.requestFullscreen?.(); setFs(true); } }}><Icon name={fs ? "minus" : "plus"} size={15} /></button>
        <Menu label="Export" icon="download" items={items} />
      </div>
      {state === "loading" && <div className="adm-stack" aria-busy="true" aria-label={`${title}: loading`}><Skeleton h={height} r={6} /><Skeleton w="40%" /></div>}
      {state === "empty" && <EmptyState spot="no-results" title="No data">Nothing to plot for the current filters.</EmptyState>}
      {state === "error" && <EmptyState spot="unplugged" title="Couldn’t load this chart" action={<Btn sm onClick={onRetry}>Retry</Btn>}>The query timed out.</EmptyState>}
      {state === "ready" && (view ? <GenericTable table={table} caption={`${title}: data`} /> : <div className="adm-chart__plot" ref={wrap} style={{ minHeight: svg ? 40 : undefined }}>{children(w)}</div>)}
      {footer}
    </div>
  );
}

/** Live readout under a chart: the focused or hovered datum, announced politely to screen readers. */
export const Readout = ({ children }: { children: ReactNode }) => <p className="pc-readout" aria-live="polite">{children ?? " "}</p>;
