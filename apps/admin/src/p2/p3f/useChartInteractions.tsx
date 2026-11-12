import { useCallback, useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { Segmented } from "@belikh/jupiter-ui/inputs.tsx";
import { Badge, Btn } from "@belikh/jupiter-ui/kit.tsx";
import { clampRange, indexAtX, keyRange, panBy, rangeFromDrag, thin, zoomBy, type Pt, type Range, type Scale } from "./interact.ts";

/* ---- groups: charts that share a group id share a crosshair (and, with syncZoom, a zoom window) ---- */
type GroupState = { cursor: number | null; range: Range | null };
const groups = new Map<string, { state: GroupState; subs: Set<() => void> }>(); const NONE: GroupState = { cursor: null, range: null };
const slot = (id: string) => { let g = groups.get(id); if (!g) { g = { state: NONE, subs: new Set() }; groups.set(id, g); } return g; };
function useGroup(id?: string): [GroupState, (p: Partial<GroupState>) => void] {
  const subscribe = useCallback((f: () => void) => { if (!id) return () => {}; const g = slot(id); g.subs.add(f); return () => { g.subs.delete(f); }; }, [id]);
  const state = useSyncExternalStore(subscribe, () => (id ? slot(id).state : NONE), () => NONE);
  const set = useCallback((p: Partial<GroupState>) => { if (!id) return; const g = slot(id); const next = { ...g.state, ...p }; if (next.cursor === g.state.cursor && next.range?.[0] === g.state.range?.[0] && next.range?.[1] === g.state.range?.[1]) return; g.state = next; g.subs.forEach((f) => f()); }, [id]);
  return [state, set];
}

export type Meta = { updated: Date; now: Date; query: string; rows: number; ms: number; cached?: boolean; onRefresh?: () => void };
export type Plot = { l: number; r: number; t: number; b: number };
export type Options = {
  /** number of points in the full x domain */ n: number;
  /** x labels, used in the range read-out */ labels?: string[];
  /** charts with the same id share a crosshair */ group?: string;
  /** also share the zoom window with the group (charts must have the same x domain) */ syncZoom?: boolean;
  minSpan?: number;
  /** offer linear/log and absolute/percent toggles (the chart applies `scale` and `units`) */ scales?: boolean | { log?: boolean; percent?: boolean };
  /** offer a lasso drag mode (the chart passes an `onLasso` to `plotProps`) */ lasso?: boolean;
  /** last-updated stamp and query inspector */ meta?: Meta;
  /** false for charts without an ordered x domain (scatter): no zoom, lasso only */ zoom?: boolean;
  /** false hides the control rows (use when another chart of the group already shows them) */ controls?: boolean;
};
export type ChartIx = ReturnType<typeof useChartInteractions>;

/**
 * Interactions for any SVG chart that has an x domain of `n` points.
 *  - drag-to-zoom: pointer drag on the plot selects a range, double-click resets; keyboard on the focusable frame: + / - zoom, arrows pan, Home / End, Escape resets
 *  - synced crosshair: `cursor` is shared by every chart with the same `group`
 *  - lasso: pointer polygon (mode "lasso") or keyboard (arrows move a point, Space adds a vertex, Enter closes, Escape cancels)
 *  - scale toggles: `scale` (linear/log) and `units` (abs/pct) state for the chart to apply (see interact.ts)
 * Wire-up: spread `frameProps` on the focusable wrapper (Fig does when given `ix`), put `<rect {...plotProps(plot)} />` on top of the plot and render `overlay(plot)`.
 */
export function useChartInteractions(o: Options) {
  const { n, minSpan = 2 } = o; const [g, setG] = useGroup(o.group);
  const [own, setOwn] = useState<Range>([0, Math.max(0, n - 1)]); const [ownCursor, setOwnCursor] = useState<number | null>(null);
  const shareZoom = !!o.group && !!o.syncZoom;
  const range = clampRange(shareZoom ? g.range ?? [0, n - 1] : own, n, minSpan);
  const setRange = (r: Range) => { const c = clampRange(r, n, minSpan); if (shareZoom) setG({ range: c }); else setOwn(c); };
  const cursor = o.group ? g.cursor : ownCursor; const setCursor = (i: number | null) => { if (o.group) setG({ cursor: i }); else setOwnCursor(i); };
  const [scale, setScale] = useState<Scale>("linear"), [units, setUnits] = useState<"abs" | "pct">("abs"), [mode, setMode] = useState<"zoom" | "lasso">(o.zoom === false ? "lasso" : "zoom");
  const [brush, setBrush] = useState<[number, number] | null>(null), [poly, setPoly] = useState<Pt[]>([]), [kb, setKb] = useState<Pt | null>(null), [status, setStatus] = useState("");
  const polyRef = useRef<Pt[]>([]), plot = useRef<Plot>({ l: 0, r: 1, t: 0, b: 1 }), drag = useRef<{ x0: number; id: number } | null>(null), cb = useRef<((poly: Pt[]) => void) | undefined>(undefined);
  const zoomed = range[0] > 0 || range[1] < n - 1, label = (i: number) => o.labels?.[i] ?? String(i + 1);
  const say = (r: Range) => setStatus(`Showing ${label(r[0])} to ${label(r[1])}, ${r[1] - r[0] + 1} of ${n} points`);
  const apply = (r: Range) => { setRange(r); say(clampRange(r, n, minSpan)); };
  const reset = () => { apply([0, n - 1]); setBrush(null); };
  const finishLasso = (p: Pt[]) => { const t = thin(p); if (t.length >= 3) { polyRef.current = t; setPoly(t); cb.current?.(t); setStatus("Lasso applied"); } else { polyRef.current = []; setPoly([]); } setKb(null); };
  const clearLasso = () => { polyRef.current = []; setPoly([]); setKb(null); cb.current?.([]); setStatus("Lasso cleared"); };

  const local = (e: PointerEvent): Pt => { const r = (e.currentTarget as SVGElement).ownerSVGElement!.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  /** Props for the transparent rect that covers the plot area. `onLasso` receives the closed polygon (svg pixels) or an empty array when cleared. */
  const plotProps = (p: Plot, onLasso?: (poly: Pt[]) => void) => {
    plot.current = p; cb.current = onLasso;
    return {
      x: p.l, y: p.t, width: Math.max(0, p.r - p.l), height: Math.max(0, p.b - p.t), fill: "transparent", style: { touchAction: "none" as const, cursor: mode === "lasso" ? "crosshair" : "col-resize" },
      onPointerDown: (e: PointerEvent) => { const pt = local(e); (e.currentTarget as Element).setPointerCapture?.(e.pointerId); if (mode === "lasso") { drag.current = { x0: pt[0], id: e.pointerId }; polyRef.current = [pt]; setPoly([pt]); } else drag.current = { x0: pt[0], id: e.pointerId }; },
      onPointerMove: (e: PointerEvent) => { const pt = local(e); if (drag.current) { if (mode === "lasso") { polyRef.current = [...polyRef.current, pt]; setPoly(polyRef.current); } else setBrush([drag.current.x0, pt[0]]); } if (o.zoom !== false) setCursor(indexAtX(pt[0], p.l, p.r, range)); },
      onPointerUp: (e: PointerEvent) => { const d = drag.current; drag.current = null; if (!d) return; const x = local(e)[0];
        if (mode === "lasso") { finishLasso(polyRef.current); return; }
        setBrush(null); const f = (v: number) => (Math.max(p.l, Math.min(p.r, v)) - p.l) / (p.r - p.l || 1); const r = rangeFromDrag(range, f(d.x0), f(x), minSpan); if (r) apply(r); },
      onDoubleClick: () => reset(),
    };
  };
  /** Keyboard handling for the focusable wrapper around the SVG. */
  const onKeyDown = (e: KeyboardEvent) => {
    if (mode === "lasso") { const p = plot.current, step = e.shiftKey ? 32 : 8; const cur = kb ?? ([(p.l + p.r) / 2, (p.t + p.b) / 2] as Pt);
      const mv = (dx: number, dy: number) => { setKb([Math.max(p.l, Math.min(p.r, cur[0] + dx)), Math.max(p.t, Math.min(p.b, cur[1] + dy))]); if (!kb && !poly.length) setPoly([]); };
      if (e.key === "ArrowLeft") mv(-step, 0); else if (e.key === "ArrowRight") mv(step, 0); else if (e.key === "ArrowUp") mv(0, -step); else if (e.key === "ArrowDown") mv(0, step);
      else if (e.key === " ") { polyRef.current = [...polyRef.current, cur]; setPoly(polyRef.current); setKb(cur); setStatus(`Vertex ${polyRef.current.length} added`); } else if (e.key === "Enter") { if (polyRef.current.length >= 3) finishLasso(polyRef.current); else setStatus("Add at least 3 vertices with Space"); }
      else if (e.key === "Escape") { polyRef.current = []; setPoly([]); setKb(null); setStatus("Lasso cancelled"); } else return; e.preventDefault(); return; }
    if (e.key === "Escape") { if (zoomed) { reset(); e.preventDefault(); } return; }
    const r = keyRange(range, n, e.key, minSpan); if (r) { e.preventDefault(); apply(r); }
  };
  const hint = mode === "lasso" ? "Lasso mode: arrow keys move the point, Space adds a vertex, Enter closes the lasso, Escape cancels." : "Plus and minus zoom, left and right arrows pan, Home and End jump, Escape resets the zoom.";
  const frameProps = { tabIndex: 0, role: "group" as const, onKeyDown, className: "p3-frame" };
  const xOf = (p: Plot) => (i: number) => p.l + ((i - range[0]) / Math.max(1, range[1] - range[0])) * (p.r - p.l);
  const overlay = (p: Plot): ReactNode => (
    <g pointerEvents="none">
      {brush && <rect className="p3-brush" x={Math.max(p.l, Math.min(brush[0], brush[1]))} y={p.t} width={Math.abs(Math.min(p.r, Math.max(p.l, brush[1])) - Math.min(p.r, Math.max(p.l, brush[0])))} height={p.b - p.t} />}
      {poly.length > 1 && <path className="p3-brush" d={`${poly.map((q, i) => `${i ? "L" : "M"}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join("")}${drag.current ? "" : "Z"}`} />}
      {kb && <path className="p3-ink" d={`M${kb[0] - 7},${kb[1]}H${kb[0] + 7}M${kb[0]},${kb[1] - 7}V${kb[1] + 7}`} strokeWidth={2} />}
    </g>
  );
  return { n, range, setRange: apply, reset, zoomed, zoomIn: () => apply(zoomBy(range, n, 0.5, 0.5, minSpan)), zoomOut: () => apply(zoomBy(range, n, 2, 0.5, minSpan)), pan: (d: number) => apply(panBy(range, n, d)), cursor, setCursor, scale: o.scales && (typeof o.scales === "boolean" || o.scales.log !== false) && units === "abs" ? scale : ("linear" as Scale), setScale, units, setUnits, mode, setMode, poly, clearLasso, status, hint, plotProps, frameProps, overlay, xOf, opts: o, label, minSpan };
}

/** Visible range control, drag mode, scale toggles, last-updated stamp and query inspector for a chart using `useChartInteractions`. */
export function ChartControls({ ix, title }: { ix: ChartIx; title: string }) {
  const o = ix.opts, [a, b] = ix.range, sc = typeof o.scales === "object" ? o.scales : { log: true, percent: true };
  return (
    <div className="p3-ix" role="group" aria-label={`${title}: zoom and display options`}>
      {o.controls !== false && <><div className="p3-controls">
        {o.lasso && o.zoom !== false && <Segmented label="Drag mode" value={ix.mode} onChange={ix.setMode} options={[{ value: "zoom", label: "Zoom" }, { value: "lasso", label: "Lasso" }]} />}
        {o.zoom !== false && <><span className="p3-ixbtns"><Btn sm aria-label="Zoom in" onClick={ix.zoomIn} disabled={b - a + 1 <= ix.minSpan}>+</Btn><Btn sm aria-label="Zoom out" onClick={ix.zoomOut} disabled={!ix.zoomed}>-</Btn><Btn sm aria-label="Pan left" onClick={() => ix.pan(-Math.max(1, Math.round((b - a) * 0.25)))} disabled={a === 0}>←</Btn><Btn sm aria-label="Pan right" onClick={() => ix.pan(Math.max(1, Math.round((b - a) * 0.25)))} disabled={b >= ix.n - 1}>→</Btn><Btn sm onClick={ix.reset} disabled={!ix.zoomed}>Reset zoom</Btn></span>
        <span className="p3-range" aria-hidden="true">{ix.label(a)} to {ix.label(b)} ({b - a + 1} of {ix.n})</span></>}
      </div>
      <div className="p3-controls">
        {o.zoom !== false && <><label className="p3-inspect">Zoom start<input type="range" min={0} max={Math.max(0, b - ix.minSpan + 1)} value={a} aria-label={`${title}: visible range start`} aria-valuetext={ix.label(a)} onChange={(e) => ix.setRange([Number(e.target.value), b])} /></label>
        <label className="p3-inspect">Zoom end<input type="range" min={Math.min(ix.n - 1, a + ix.minSpan - 1)} max={Math.max(0, ix.n - 1)} value={b} aria-label={`${title}: visible range end`} aria-valuetext={ix.label(b)} onChange={(e) => ix.setRange([a, Number(e.target.value)])} /></label></>}
        {o.scales && sc.log !== false && ix.units === "abs" && <Segmented label="Axis scale" value={ix.scale} onChange={ix.setScale} options={[{ value: "linear", label: "Linear" }, { value: "log", label: "Log" }]} />}
        {o.scales && sc.percent !== false && <Segmented label="Units" value={ix.units} onChange={ix.setUnits} options={[{ value: "abs", label: "Absolute" }, { value: "pct", label: "Percent change" }]} />}
        {ix.poly.length > 2 && <Btn sm onClick={ix.clearLasso}>Clear lasso</Btn>}
      </div></>}
      <p className="adm-sr" aria-live="polite">{ix.status}</p>
      {o.meta && <FreshnessBar {...o.meta} />}
    </div>
  );
}

/** Last-updated stamp and query inspector, as a footer for any chart. `now` is injectable so the demo is deterministic. */
export function FreshnessBar({ updated, now, query, rows, ms, cached, onRefresh }: Meta) {
  const [open, setOpen] = useState(false), age = Math.max(0, Math.round((now.getTime() - updated.getTime()) / 60000)), stale = age >= 5;
  return (
    <div>
      <div className="p3-controls">
        <span className="p3-stamp">Updated <time dateTime={updated.toISOString()}>{updated.toISOString().slice(0, 16).replace("T", " ")} UTC</time> ({age < 1 ? "just now" : `${age} min ago`})</span>
        {stale && <Badge s="warn">Stale</Badge>}{cached && <Badge s="info">Cached</Badge>}
        <Btn sm icon="loader" onClick={onRefresh}>Refresh</Btn><Btn sm aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Hide query" : "Inspect query"}</Btn>
      </div>
      {open && <div role="region" aria-label="Query inspector"><pre className="p3-query">{query}</pre><p className="p3-stats"><span>Rows <b>{rows}</b></span><span>Duration <b>{ms} ms</b></span><span>Source <b>{cached ? "cache" : "warehouse"}</b></span></p></div>}
    </div>
  );
}
