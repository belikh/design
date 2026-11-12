import { useMemo, useRef, useState } from "react";
import { C, Legend } from "@belikh/jupiter-ui/Charts.tsx";
import { ChartFrame, Readout, type FrameState } from "./frame.tsx";
import { autoState, fmt1 } from "./shared.tsx";
import { arcPath, clamp, clusterPoints, densityGrid, projector, type Bounds } from "./lib.ts";

type Common = { title?: string; state?: FrameState };
/** Coarse hand-drawn outline of mainland Australia and Tasmania (lon, lat). Schematic, good to roughly 50 km: not for navigation. */
export const AU_MAIN: [number, number][] = [[142.5, -10.7], [143.6, -13.9], [144.5, -14.3], [145.3, -15], [146, -17], [146.3, -18.9], [148, -20], [149.2, -21.1], [150.5, -22.5], [152, -24], [153.2, -25], [153.1, -26.8], [153.6, -28.2], [153.1, -30], [152.5, -32], [151.3, -33.9], [150.2, -35.5], [150, -37.4], [147.8, -37.9], [146.3, -39.1], [144.9, -38.4], [143.5, -38.8], [141.6, -38.2], [140, -37.4], [139.7, -36], [138.5, -35.6], [138.1, -34.4], [137.8, -33], [137, -34], [135.9, -34.8], [135, -34.4], [134.2, -32.9], [131, -31.5], [128.5, -31.7], [126, -32.3], [123.9, -33.8], [121, -33.9], [118, -35], [116, -34.9], [115, -34.3], [115.7, -32.5], [115, -30.5], [114, -28], [113.5, -26], [114.1, -24], [114.9, -21.9], [116.7, -20.7], [119, -20], [121, -19.5], [122.3, -18], [123.7, -16.7], [125, -15.2], [126.5, -14], [128, -15], [129.5, -14.8], [130.3, -12.9], [130.8, -12.4], [132.5, -11.6], [135, -12.2], [136.9, -12.2], [136.5, -13.8], [135.4, -15], [136.7, -15.9], [139, -17.3], [140.8, -17.4], [141.5, -15], [141.6, -12.8]];
export const AU_TAS: [number, number][] = [[144.7, -40.7], [146.8, -41], [148.3, -40.9], [148.2, -42.2], [147, -43.6], [145.9, -43.5], [145.2, -42.2]];
export const AU_BOUNDS: Bounds = { minLon: 112.5, maxLon: 154.5, minLat: -44.5, maxLat: -10 };
export const CITIES = [{ name: "Sydney", lon: 151.2, lat: -33.87, pop: 5.3 }, { name: "Melbourne", lon: 144.96, lat: -37.81, pop: 5.1 }, { name: "Brisbane", lon: 153.03, lat: -27.47, pop: 2.6 }, { name: "Perth", lon: 115.86, lat: -31.95, pop: 2.2 }, { name: "Adelaide", lon: 138.6, lat: -34.93, pop: 1.4 }, { name: "Gold Coast", lon: 153.4, lat: -28, pop: 0.7 }, { name: "Newcastle", lon: 151.78, lat: -32.93, pop: 0.5 }, { name: "Canberra", lon: 149.13, lat: -35.28, pop: 0.45 }, { name: "Townsville", lon: 146.82, lat: -19.26, pop: 0.19 }, { name: "Cairns", lon: 145.77, lat: -16.92, pop: 0.15 }, { name: "Darwin", lon: 130.84, lat: -12.46, pop: 0.15 }, { name: "Hobart", lon: 147.33, lat: -42.88, pop: 0.25 }, { name: "Alice Springs", lon: 133.88, lat: -23.7, pop: 0.03 }];
const poly = (pts: [number, number][], p: (lon: number, lat: number) => [number, number]) => pts.map(([lo, la], i) => { const [x, y] = p(lo, la); return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`; }).join("") + "Z";
export const mapH = (w: number) => Math.round(w * 0.78);
const Outline = ({ p, id }: { p: (lon: number, lat: number) => [number, number]; id?: string }) => <><path id={id} d={poly(AU_MAIN, p)} fill="var(--jp-surface)" stroke="var(--jp-text-muted)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" /><path d={poly(AU_TAS, p)} fill="var(--jp-surface)" stroke="var(--jp-text-muted)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" /></>;

/* ---------- choropleth as a tile cartogram ---------- */
export const STATE_TILES: Record<string, [number, number, string]> = { NT: [2, 0, "Northern Territory"], QLD: [3, 0, "Queensland"], WA: [1, 1, "Western Australia"], SA: [2, 1, "South Australia"], NSW: [3, 1, "New South Wales"], ACT: [4, 1, "ACT"], VIC: [3, 2, "Victoria"], TAS: [3, 3, "Tasmania"] };
export function TileChoropleth({ values, unit = "", title = "Choropleth (tile map)", state }: Common & { values: Record<string, number>; unit?: string }) {
  const [sel, setSel] = useState<string | null>(null); const vs = Object.values(values), lo = Math.min(...vs), hi = Math.max(...vs);
  return (
    <ChartFrame title={title} state={autoState(state, vs.length)} height={320} table={{ head: ["State", `Value${unit ? ` (${unit})` : ""}`], rows: Object.entries(values).map(([k, v]) => [STATE_TILES[k]?.[2] ?? k, v]) }}>
      {(w) => {
        const size = Math.min(84, (w - 20) / 5), H = size * 4 + 30;
        return (
          <>
            <svg viewBox={`0 0 ${w} ${H}`} style={{ width: "100%", height: H }} role="img" aria-label={`${title}: ${Object.entries(values).map(([k, v]) => `${k} ${fmt1(v)}`).join(", ")}`}>
              {Object.entries(STATE_TILES).map(([k, [c, r, name]]) => { const v = values[k]; const t = v === undefined ? 0 : hi === lo ? 0.5 : (v - lo) / (hi - lo); return (
                <g key={k} className="pc-pt" tabIndex={0} role="img" aria-label={`${name}: ${v === undefined ? "no data" : fmt1(v) + unit}`} onMouseEnter={() => setSel(k)} onFocus={() => setSel(k)} onMouseLeave={() => setSel(null)} onBlur={() => setSel(null)}>
                  <rect x={10 + c * size} y={10 + r * size} width={size - 4} height={size - 4} rx="8" fill={v === undefined ? "var(--jp-surface)" : "var(--jp-accent)"} fillOpacity={v === undefined ? 1 : 0.1 + 0.9 * t} stroke={sel === k ? "var(--jp-text)" : "var(--jp-border)"} strokeWidth={sel === k ? 3 : 1} />
                  <text x={10 + c * size + (size - 4) / 2} y={10 + r * size + size / 2 - 4} textAnchor="middle" fontWeight="800" fontSize="16" fill={t > 0.55 ? "var(--jp-on-accent)" : "var(--jp-text)"}>{k}</text><text x={10 + c * size + (size - 4) / 2} y={10 + r * size + size / 2 + 12} textAnchor="middle" fontSize="13" fill={t > 0.55 ? "var(--jp-on-accent)" : "var(--jp-text-muted)"}>{v === undefined ? "–" : fmt1(v)}</text></g>); })}
            </svg>
            <div className="adm-row"><span className="pc-note" style={{ margin: 0 }}>{fmt1(lo)}</span><svg width="120" height="10" aria-hidden><defs><linearGradient id="pc-lg"><stop offset="0" stopColor="var(--jp-accent)" stopOpacity=".1" /><stop offset="1" stopColor="var(--jp-accent)" /></linearGradient></defs><rect width="120" height="10" rx="2" fill="url(#pc-lg)" /></svg><span className="pc-note" style={{ margin: 0 }}>{fmt1(hi)}{unit}</span><span className="pc-note" style={{ margin: 0 }}>Tile cartogram: each state is one equal-sized tile, so small states stay visible. Not to scale.</span></div>
            <Readout>{sel ? `${STATE_TILES[sel][2]}: ${values[sel] === undefined ? "no data" : fmt1(values[sel]) + unit}` : ""}</Readout>
          </>
        );
      }}
    </ChartFrame>
  );
}

/* ---------- bubble map ---------- */
export function BubbleMap({ cities = CITIES, unit = "M people", title = "Bubble map", state }: Common & { cities?: { name: string; lon: number; lat: number; pop: number }[]; unit?: string }) {
  const [sel, setSel] = useState<string | null>(null); const mx = Math.max(0.01, ...cities.map((c) => c.pop));
  return (
    <ChartFrame title={title} state={autoState(state, cities.length)} height={380} table={{ head: ["Place", unit, "Longitude", "Latitude"], rows: cities.map((c) => [c.name, c.pop, c.lon, c.lat]) }}>
      {(w) => { const H = mapH(w), p = projector(AU_BOUNDS, w, H); return (
        <>
          <svg viewBox={`0 0 ${w} ${H}`} style={{ width: "100%", height: H }} role="img" aria-label={`${title}: ${cities.length} places sized by ${unit}`}><Outline p={p} />
            {[...cities].sort((a, b) => b.pop - a.pop).map((c) => { const [x, y] = p(c.lon, c.lat), r = 4 + Math.sqrt(c.pop / mx) * 26; return <g key={c.name} className="pc-pt" tabIndex={0} role="img" aria-label={`${c.name}: ${c.pop} ${unit}`} onMouseEnter={() => setSel(c.name)} onFocus={() => setSel(c.name)} onMouseLeave={() => setSel(null)} onBlur={() => setSel(null)}><circle cx={x} cy={y} r={r} fill="var(--jp-accent)" fillOpacity=".4" stroke="var(--jp-accent)" strokeWidth={sel === c.name ? 3 : 1.5} />{r > 10 && <text x={x} y={y + 4} textAnchor="middle" fontSize="12.5" fontWeight="700" fill="var(--jp-text)" style={{ pointerEvents: "none" }}>{c.name}</text>}</g>; })}
          </svg><Readout>{sel ? `${sel}: ${cities.find((c) => c.name === sel)?.pop} ${unit}` : "Bubble area is proportional to the value."}</Readout>
        </>); }}
    </ChartFrame>
  );
}

/* ---------- marker clusters with zoom + pan ---------- */
export type Dev = { id: string; lon: number; lat: number; status?: "ok" | "warn" | "danger" };
export function ClusterMap({ points, title = "Marker clusters", state }: Common & { points: Dev[] }) {
  const [z, setZ] = useState(1); const [ctr, setCtr] = useState<[number, number] | null>(null); const [sel, setSel] = useState<string | null>(null); const drag = useRef<{ x: number; y: number; c: [number, number] } | null>(null);
  return (
    <ChartFrame title={title} state={autoState(state, points.length)} height={400} table={{ head: ["Device", "Status", "Longitude", "Latitude"], rows: points.map((p) => [p.id, p.status ?? "ok", p.lon, p.lat]) }}>
      {(w) => {
        const H = mapH(w), p = projector(AU_BOUNDS, w, H), c = ctr ?? [w / 2, H / 2]; const base = points.map((d) => ({ ...d, bx: p(d.lon, d.lat)[0], by: p(d.lon, d.lat)[1] }));
        const scr = base.map((d) => ({ ...d, x: (d.bx - c[0]) * z + w / 2, y: (d.by - c[1]) * z + H / 2 })).filter((d) => d.x > -20 && d.x < w + 20 && d.y > -20 && d.y < H + 20);
        const cl = clusterPoints(scr, 46); const bad = (m: typeof scr) => m.filter((x) => x.status === "danger").length;
        const zoomTo = (k: number, at?: [number, number]) => { const nz = clamp(k, 1, 10); setZ(nz); setCtr(nz === 1 ? null : at ?? c); };
        return (
          <>
            <div className="adm-row" style={{ marginBottom: 6 }}><button className="jp-btn jp-btn--secondary jp-btn--sm" aria-label="Zoom in" onClick={() => zoomTo(z * 2)}>+</button><button className="jp-btn jp-btn--secondary jp-btn--sm" aria-label="Zoom out" onClick={() => zoomTo(z / 2)}>−</button><button className="jp-btn jp-btn--ghost jp-btn--sm" onClick={() => zoomTo(1)}>Reset</button><span className="pc-note" style={{ margin: 0 }}>{z}× · {cl.length} markers for {scr.length} devices in view. Click a cluster to zoom into it; drag to pan.</span></div>
            <svg viewBox={`0 0 ${w} ${H}`} style={{ width: "100%", height: H, cursor: z > 1 ? "grab" : "default", touchAction: "none" }} role="group" aria-label={`${title}: ${points.length} devices`}
              onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, c }; }} onPointerMove={(e) => { if (!drag.current || z === 1) return; setCtr([drag.current.c[0] - (e.clientX - drag.current.x) / z, drag.current.c[1] - (e.clientY - drag.current.y) / z]); }} onPointerUp={() => { drag.current = null; }} onPointerLeave={() => { drag.current = null; }}>
              <g transform={`translate(${w / 2},${H / 2}) scale(${z}) translate(${-c[0]},${-c[1]})`}><Outline p={p} /></g>
              {cl.map((k, i) => { const r = k.count === 1 ? 6 : 12 + Math.sqrt(k.count) * 2.5, hot = bad(k.members); return (
                <g key={i} className="pc-pt" tabIndex={0} role="button" aria-label={k.count === 1 ? `Device ${k.members[0].id}` : `${k.count} devices, click to zoom`} onClick={(e) => { e.stopPropagation(); if (k.count === 1) setSel(k.members[0].id); else zoomTo(z * 2.5, [(k.x - w / 2) / z + c[0], (k.y - H / 2) / z + c[1]]); }} onKeyDown={(e) => { if (e.key === "Enter") { if (k.count === 1) setSel(k.members[0].id); else zoomTo(z * 2.5, [(k.x - w / 2) / z + c[0], (k.y - H / 2) / z + c[1]]); } }}>
                  {k.count === 1 ? <circle cx={k.x} cy={k.y} r={r} fill={hot ? "var(--jp-danger)" : "var(--jp-accent)"} stroke="var(--jp-surface-raised)" strokeWidth="2" /> : <><circle cx={k.x} cy={k.y} r={r} fill="var(--jp-accent)" fillOpacity=".25" stroke="var(--jp-accent)" strokeWidth={hot ? 4 : 2} strokeDasharray={hot ? "3 2" : undefined} /><text x={k.x} y={k.y + 4} textAnchor="middle" fontSize="14" fontWeight="800" fill="var(--jp-text)" style={{ pointerEvents: "none" }}>{k.count}</text></>}</g>); })}
            </svg>
            <Readout>{sel ? `Device ${sel}: ${points.find((d) => d.id === sel)?.status ?? "ok"}` : "Dashed ring = cluster contains a device that is down."}</Readout>
          </>
        );
      }}
    </ChartFrame>
  );
}

/* ---------- route and flow lines ---------- */
export function FlowMap({ flows, unit = "units", title = "Flow map", state }: Common & { flows: { from: string; to: string; value: number }[]; unit?: string }) {
  const [sel, setSel] = useState<number | null>(null); const city = (n: string) => CITIES.find((c) => c.name === n); const mx = Math.max(1, ...flows.map((f) => f.value));
  return (
    <ChartFrame title={title} state={autoState(state, flows.length)} height={380} table={{ head: ["From", "To", unit], rows: [...flows].sort((a, b) => b.value - a.value).map((f) => [f.from, f.to, f.value]) }}>
      {(w) => { const H = mapH(w), p = projector(AU_BOUNDS, w, H); const used = new Set(flows.flatMap((f) => [f.from, f.to])); return (
        <>
          <svg viewBox={`0 0 ${w} ${H}`} style={{ width: "100%", height: H }} role="img" aria-label={`${title}: ${flows.length} routes`}><defs><marker markerUnits="userSpaceOnUse" id="pc-fm" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--jp-accent)" /></marker></defs><Outline p={p} />
            {flows.map((f, i) => { const a = city(f.from), b = city(f.to); if (!a || !b) return null; const pa = p(a.lon, a.lat), pb = p(b.lon, b.lat); return <path key={i} d={arcPath(pa, pb, 0.22)} fill="none" stroke="var(--jp-accent)" strokeOpacity={sel === null || sel === i ? 0.75 : 0.15} strokeWidth={1.5 + (f.value / mx) * 7} className="pc-flow" markerEnd="url(#pc-fm)" tabIndex={0} onMouseEnter={() => setSel(i)} onFocus={() => setSel(i)} onMouseLeave={() => setSel(null)} onBlur={() => setSel(null)} aria-label={`${f.from} to ${f.to}: ${f.value} ${unit}`}><title>{`${f.from} → ${f.to}: ${f.value} ${unit}`}</title></path>; })}
            {[...used].map((n) => { const c = city(n); if (!c) return null; const [x, y] = p(c.lon, c.lat); return <g key={n}><circle cx={x} cy={y} r="4.5" fill="var(--jp-text)" stroke="var(--jp-surface-raised)" strokeWidth="1.5" /><text x={x + 7} y={y + 4} fontSize="12.5" fill="var(--jp-text)" fontWeight="600">{n}</text></g>; })}
          </svg><Readout>{sel !== null ? `${flows[sel].from} → ${flows[sel].to}: ${flows[sel].value} ${unit}` : "Line width is proportional to volume; arrows show direction."}</Readout>
        </>); }}
    </ChartFrame>
  );
}

/* ---------- heat layer ---------- */
export function HeatLayer({ points, title = "Heat layer", state }: Common & { points: { lon: number; lat: number }[] }) {
  const [bw, setBw] = useState(18);
  return (
    <ChartFrame title={title} state={autoState(state, points.length)} height={380} table={{ head: ["Longitude", "Latitude"], rows: points.map((q) => [q.lon, q.lat]) }}
      footer={<label className="adm-row" style={{ marginTop: 6 }}><span className="jp-muted">Smoothing</span><input type="range" min={6} max={50} value={bw} onChange={(e) => setBw(Number(e.target.value))} aria-label="Smoothing radius" style={{ accentColor: "var(--jp-accent)" }} /><span className="pc-note" style={{ margin: 0 }}>{bw}px kernel</span></label>}>
      {(w) => { const H = mapH(w), p = projector(AU_BOUNDS, w, H), cols = 56, rows = Math.round(cols * (H / w)); const pts = points.map((q) => { const [x, y] = p(q.lon, q.lat); return { x, y }; }); const g = densityGrid(pts, w, H, cols, rows, bw); return (
        <svg viewBox={`0 0 ${w} ${H}`} style={{ width: "100%", height: H }} role="img" aria-label={`${title}: density of ${points.length} points`}><defs><clipPath id="pc-clip"><path d={poly(AU_MAIN, p)} /><path d={poly(AU_TAS, p)} /></clipPath></defs><Outline p={p} />
          <g clipPath="url(#pc-clip)">{g.map((row, r) => row.map((v, c) => v > 0.03 && <rect key={`${r}-${c}`} x={(c * w) / cols} y={(r * H) / rows} width={w / cols + 0.5} height={H / rows + 0.5} fill="var(--jp-accent)" fillOpacity={0.08 + 0.85 * v} />))}</g></svg>); }}
    </ChartFrame>
  );
}

/* ---------- floor plan / room map ---------- */
export type Room = { id: string; name: string; x: number; y: number; w: number; h: number; temp: number; people: number; co2: number };
const FP_METRICS = { temp: { label: "Temperature (°C)", lo: 17, hi: 28, get: (r: Room) => r.temp }, people: { label: "Occupancy (people)", lo: 0, hi: 6, get: (r: Room) => r.people }, co2: { label: "CO₂ (ppm)", lo: 400, hi: 1400, get: (r: Room) => r.co2 } } as const;
export function FloorPlan({ rooms, title = "Floor plan", state }: Common & { rooms: Room[] }) {
  const [metric, setMetric] = useState<keyof typeof FP_METRICS>("temp"); const [sel, setSel] = useState<string | null>(null); const M = FP_METRICS[metric]; const cur = rooms.find((r) => r.id === sel);
  return (
    <ChartFrame title={title} state={autoState(state, rooms.length)} height={320} table={{ head: ["Room", "Temperature (°C)", "People", "CO₂ (ppm)"], rows: rooms.map((r) => [r.name, r.temp, r.people, r.co2]) }}
      footer={<div className="adm-row" style={{ marginTop: 6 }}><span className="jp-muted">Colour by</span>{(Object.keys(FP_METRICS) as (keyof typeof FP_METRICS)[]).map((k) => <button key={k} className={`adm-pill ${metric === k ? "is-on" : ""}`} aria-pressed={metric === k} onClick={() => setMetric(k)}>{FP_METRICS[k].label}</button>)}</div>}>
      {(w) => { const W = Math.min(w, 560), s = W / 100, H = 66 * s + 8; return (
        <>
          <svg viewBox={`0 0 ${w} ${H}`} style={{ width: "100%", height: H }} role="img" aria-label={`${title}: ${rooms.length} rooms coloured by ${M.label}`}><g transform={`translate(${(w - W) / 2},4)`}>
            {rooms.map((r) => { const t = clamp((M.get(r) - M.lo) / (M.hi - M.lo), 0, 1); return (
              <g key={r.id} className="pc-pt" tabIndex={0} role="img" aria-label={`${r.name}: ${fmt1(M.get(r))}`} onMouseEnter={() => setSel(r.id)} onFocus={() => setSel(r.id)} onMouseLeave={() => setSel(null)} onBlur={() => setSel(null)}>
                <rect x={r.x * s} y={r.y * s} width={r.w * s} height={r.h * s} fill="var(--jp-accent)" fillOpacity={0.08 + 0.85 * t} stroke="var(--jp-text)" strokeWidth={sel === r.id ? 4 : 2.5} />
                <text x={(r.x + r.w / 2) * s} y={(r.y + r.h / 2) * s - 2} textAnchor="middle" fontSize="14" fontWeight="700" fill={t > 0.55 ? "var(--jp-on-accent)" : "var(--jp-text)"}>{r.name}</text><text x={(r.x + r.w / 2) * s} y={(r.y + r.h / 2) * s + 14} textAnchor="middle" fontSize="13" fill={t > 0.55 ? "var(--jp-on-accent)" : "var(--jp-text-muted)"}>{fmt1(M.get(r))}</text></g>); })}</g>
          </svg><Readout>{cur ? `${cur.name}: ${cur.temp}°C, ${cur.people} ${cur.people === 1 ? "person" : "people"}, CO₂ ${cur.co2} ppm${cur.co2 > 1000 ? " (ventilate)" : ""}` : `Scale ${M.lo}–${M.hi}. Hover or focus a room for details.`}</Readout>
        </>); }}
    </ChartFrame>
  );
}

/* ---------- rack diagram ---------- */
export type RackDev = { id: string; name: string; u: number; height: number; kind: "switch" | "server" | "storage" | "ups" | "patch"; watts: number; status: "ok" | "warn" | "danger" };
export function RackDiagram({ devices, units = 42, title = "Rack diagram", state }: Common & { devices: RackDev[]; units?: number }) {
  const [sel, setSel] = useState<string | null>(null); const used = useMemo(() => devices.reduce((a, d) => a + d.height, 0), [devices]), watts = devices.reduce((a, d) => a + d.watts, 0), kinds = [...new Set(devices.map((d) => d.kind))]; const cur = devices.find((d) => d.id === sel);
  const clash = devices.some((a, i) => devices.some((b, j) => j > i && a.u < b.u + b.height && b.u < a.u + a.height));
  return (
    <ChartFrame title={title} svg={false} state={autoState(state, devices.length)} table={{ head: ["Device", "Kind", "Position (U)", "Height (U)", "Power (W)", "Status"], rows: [...devices].sort((a, b) => b.u - a.u).map((d) => [d.name, d.kind, `U${d.u}${d.height > 1 ? `–U${d.u + d.height - 1}` : ""}`, d.height, d.watts, d.status]) }}>
      {() => (
        <div className="adm-row" style={{ alignItems: "flex-start", gap: 24 }}>
          <div className="pc-rack" style={{ width: 300, maxWidth: "100%" }} role="group" aria-label={`${title}: ${units}U rack`}>
            <div>{Array.from({ length: units }, (_, i) => <div key={i} className="pc-rack__u">{units - i}</div>)}</div>
            <div style={{ position: "relative", height: units * 18 }}>{devices.map((d) => <button key={d.id} className={`pc-dev ${d.status === "warn" ? "is-warn" : d.status === "danger" ? "is-danger" : ""} ${sel === d.id ? "is-sel" : ""}`} style={{ position: "absolute", left: 0, right: 0, top: (units - (d.u + d.height - 1)) * 18, height: d.height * 18, borderInlineStartColor: d.status === "ok" ? C(kinds.indexOf(d.kind)) : undefined }} onClick={() => setSel(sel === d.id ? null : d.id)} aria-pressed={sel === d.id} aria-label={`${d.name}, U${d.u}${d.height > 1 ? ` to U${d.u + d.height - 1}` : ""}, ${d.watts} watts, ${d.status}`}><span>{d.status === "danger" ? "▲ " : d.status === "warn" ? "◆ " : ""}{d.name}</span><span className="jp-muted">{d.watts}W</span></button>)}</div>
          </div>
          <div className="adm-stack" style={{ flex: 1, minWidth: 220 }}>
            <div className="pc-chips"><span className="pc-chip">{used}/{units}U used</span><span className="pc-chip">{units - used}U free</span><span className="pc-chip">{fmt1(watts)} W</span>{clash && <span className="pc-chip is-bad">⚠ overlapping devices</span>}</div>
            <Legend items={kinds.map((k, i) => ({ name: k, color: C(i) }))} />
            {cur ? <div className="pc-tile" role="status"><b>{cur.name}</b><span className="jp-muted">{cur.kind} · U{cur.u}{cur.height > 1 ? `–U${cur.u + cur.height - 1}` : ""} · {cur.watts} W</span><span className={`pc-status is-${cur.status}`}><i />{cur.status === "ok" ? "Healthy" : cur.status === "warn" ? "Warning" : "Fault"}</span></div> : <p className="pc-note">Select a device for details. Left stripe colour shows the kind; ◆ and ▲ mark warnings and faults.</p>}
          </div>
        </div>
      )}
    </ChartFrame>
  );
}
