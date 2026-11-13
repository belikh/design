import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { C } from "@belikh/jupiter-ui/Charts.tsx";
import type { ChartTableData } from "@belikh/jupiter-ui/chartTools.tsx";
import { ChartFrame, Readout, type FrameState } from "../charts/frame.tsx";
import { autoState } from "../charts/shared.tsx";
import "./diagrams.css";

export { C, Readout };
export type { ChartTableData };
export const fmt = (n: number) => n.toLocaleString("en-AU", { maximumFractionDigits: 1 });
export const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
export const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(Math.floor(min % 60)).padStart(2, "0")}`;
export const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

/** Frame + empty state for every diagram. `n` = number of data items (0 shows the empty state instead of NaN geometry). */
export function Chart({ title, table, n, state, height = 320, children, footer }: { title: string; table: ChartTableData; n: number; state?: FrameState; height?: number; children: (w: number) => ReactNode; footer?: ReactNode }) {
  return <ChartFrame title={title} table={table} state={autoState(state, n)} height={height} footer={footer}>{children}</ChartFrame>;
}

/** Hover/focus state for one chart: the selected id and a polite text readout. Spread `hit(id, label)` on a <g>/<rect> that stands for one datum. */
export function useHits<T extends string | number = string>() {
  const [sel, setSel] = useState<T | null>(null); const [text, setText] = useState("");
  const set = (id: T, label: string) => { setSel(id); setText(label); }; const clear = () => { setSel(null); setText(""); };
  const hit = (id: T, label: string) => ({ tabIndex: 0, role: "img" as const, "aria-label": label, className: "dg-pt", onFocus: () => set(id, label), onMouseEnter: () => set(id, label), onBlur: clear, onMouseLeave: clear });
  return { sel, text, hit, set, clear };
}
/** Same, but for datums that can also be activated (zoom, collapse). */
export function useActions<T extends string | number = string>() {
  const h = useHits<T>();
  const act = (id: T, label: string, run: () => void, expanded?: boolean) => ({ ...h.hit(id, label), role: "button" as const, "aria-expanded": expanded, onClick: run, onKeyDown: (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); run(); } } });
  return { ...h, act };
}

/** One focus stop for a large grid; arrow keys move a cursor (Home/End jump along the row). The container gets aria-label; `describe` is read out politely. */
export function useGridCursor(rows: number, cols: number, describe: (r: number, c: number) => string) {
  const [pos, setPos] = useState<[number, number]>([0, 0]); const [on, setOn] = useState(false);
  const onKeyDown = (e: KeyboardEvent) => {
    const [r, c] = pos; let nr = r, nc = c;
    if (e.key === "ArrowRight") nc++; else if (e.key === "ArrowLeft") nc--; else if (e.key === "ArrowDown") nr++; else if (e.key === "ArrowUp") nr--; else if (e.key === "Home") nc = 0; else if (e.key === "End") nc = cols - 1; else return;
    e.preventDefault(); setPos([Math.min(rows - 1, Math.max(0, nr)), Math.min(cols - 1, Math.max(0, nc))]);
  };
  return { pos, setPos, on, props: { tabIndex: 0, role: "group" as const, onKeyDown, onFocus: () => setOn(true), onBlur: () => setOn(false) }, text: on ? describe(pos[0], pos[1]) : "" };
}

/** SVG shell: a labelled group (not role=img, because it contains focusable data), sized in CSS pixels. */
export function Svg({ w, h, label, children }: { w: number; h: number; label: string; children: ReactNode }) {
  return <svg className="dg-svg" viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="group" aria-label={label}>{children}</svg>;
}
/** Wide diagrams scroll sideways instead of shrinking text. */
export const Scroll = ({ label, children }: { label: string; children: ReactNode }) => <div className="dg-scroll" tabIndex={0} role="region" aria-label={`${label} (scrolls sideways)`}>{children}</div>;

export const Legend = ({ items }: { items: { label: ReactNode; color?: string; cls?: string }[] }) => (
  <ul className="dg-legend">{items.map((it, i) => <li key={i}><i className={it.cls} style={it.color ? { background: it.color } : undefined} />{it.label}</li>)}</ul>
);
export const Note = ({ children }: { children: ReactNode }) => <p className="pc-note">{children}</p>;

/** Accent-tinted heat colour for t in 0..1 (single hue, so lightness carries the value). */
export const heat = (t: number) => `color-mix(in oklab, var(--jp-accent) ${Math.round(8 + 85 * Math.min(1, Math.max(0, t)))}%, var(--jp-surface-raised))`;
export const onHeat = (t: number) => (t > 0.55 ? "var(--jp-on-accent)" : "var(--jp-text)");
export const HeatScale = ({ lo, hi }: { lo: string; hi: string }) => <div className="dg-scale" aria-hidden="true"><span>{lo}</span><i /><span>{hi}</span></div>;

export type HeatCell = { t: number | null; text: string; label: string };
/** Heat table: a real <table> with one roving tab stop; arrow keys move between cells and the focused cell is read out. */
export function HeatTable({ caption, corner, rowHeads, colHeads, cell, vertical, extraCols, rowExtra, onRead }: {
  caption: string; corner: string; rowHeads: string[]; colHeads: string[]; cell: (r: number, c: number) => HeatCell; vertical?: boolean; extraCols?: string[]; rowExtra?: (r: number) => ReactNode[]; onRead?: (text: string) => void;
}) {
  const [pos, setPos] = useState<[number, number]>([0, 0]); const ref = useRef<HTMLTableElement>(null);
  const move = (e: KeyboardEvent) => {
    const [r, c] = pos; let nr = r, nc = c;
    if (e.key === "ArrowRight") nc++; else if (e.key === "ArrowLeft") nc--; else if (e.key === "ArrowDown") nr++; else if (e.key === "ArrowUp") nr--; else if (e.key === "Home") nc = 0; else if (e.key === "End") nc = colHeads.length - 1; else return;
    e.preventDefault(); nr = Math.min(rowHeads.length - 1, Math.max(0, nr)); nc = Math.min(colHeads.length - 1, Math.max(0, nc)); setPos([nr, nc]); ref.current?.querySelector<HTMLElement>(`td[data-r="${nr}"][data-c="${nc}"]`)?.focus();
  };
  return (
    <div className="dg-scroll" role="region" aria-label={`${caption} (scrolls sideways)`} tabIndex={-1}>
      <table className={`dg-heat${vertical ? " is-vertical" : ""}`} ref={ref} onKeyDown={move}>
        <caption className="adm-sr">{caption}. Arrow keys move between cells.</caption>
        <thead><tr><th scope="col">{corner}</th>{(extraCols ?? []).map((h) => <th scope="col" key={h} className="dg-num">{h}</th>)}{colHeads.map((h) => <th scope="col" key={h} className={vertical ? "dg-vert" : "dg-num"}><span>{h}</span></th>)}</tr></thead>
        <tbody>{rowHeads.map((rh, r) => (
          <tr key={rh}><th scope="row">{rh}</th>{(rowExtra?.(r) ?? []).map((x, i) => <td key={i} className="dg-num dg-plain">{x}</td>)}
            {colHeads.map((_, c) => { const d = cell(r, c); return (
              <td key={c} data-r={r} data-c={c} tabIndex={r === pos[0] && c === pos[1] ? 0 : -1} aria-label={d.label} className={d.t === null ? "is-empty" : undefined} style={d.t === null ? undefined : { background: heat(d.t), color: onHeat(d.t) }}
                onFocus={() => { setPos([r, c]); onRead?.(d.label); }} onMouseEnter={() => onRead?.(d.label)} onBlur={() => onRead?.("")}>{d.text}</td>); })}</tr>))}</tbody>
      </table>
    </div>
  );
}
