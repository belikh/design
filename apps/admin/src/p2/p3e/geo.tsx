import { useEffect, useMemo, useState } from "react";
import { Segmented, Select } from "@belikh/jupiter-ui/inputs.tsx";
import { STATE_NAMES, STATE_ORDER, labelPoint, loadLgas, loadStates, ringsBox, sampleOnline, type Lga } from "./au.ts";
import { buildGraph, routeTo, shortestTimes, timeToPoint } from "./roads.ts";
import { fenceTrack, hexCorners, hexToPixel, parseHexGrid, trackStats, type Fix, type Pt } from "./geo.ts";
import { C, Chart, HeatScale, Legend, Note, Readout, Scroll, Svg, fmt, heat, onHeat, hhmm, pct, sum, useGridCursor, useHits } from "./kit.tsx";
import type { FrameState } from "../charts/frame.tsx";

type Common = { title?: string; state?: FrameState };
type Box = { minX: number; maxX: number; minY: number; maxY: number };
/** Equirectangular projection with a cos(latitude) correction on x, so shapes are not stretched. Returns the pixel height for a given width. */
const projection = (b: Box, w: number, pad = 8) => { const k = Math.cos(((b.minY + b.maxY) / 2) * Math.PI / 180); const spanX = (b.maxX - b.minX) * k, spanY = b.maxY - b.minY; const s = (w - 2 * pad) / spanX; return { h: Math.round(spanY * s + 2 * pad), p: ([lon, lat]: Pt): Pt => [pad + (lon - b.minX) * k * s, pad + (b.maxY - lat) * s] }; };
const poly = (pts: Pt[], p: (q: Pt) => Pt) => pts.map((q, i) => `${i ? "L" : "M"}${p(q).map((v) => v.toFixed(1)).join(",")}`).join("") + "Z";

/** D059 Hex tile map: every state is a cluster of equal hexagons, about one tile per million people, so small states are not lost. */
export function HexTileMap({ rows, names, population, internet, title = "Hex tile map: Australian states", state }: Common & { rows: string[]; names: Record<string, string>; population: Record<string, number>; internet: Record<string, number> }) {
  const [metric, setMetric] = useState<"pop" | "net">("net"); const { sel, text, hit } = useHits(); const tiles = useMemo(() => parseHexGrid(rows), [rows]); const vals = metric === "pop" ? population : internet;
  const lo = Math.min(...Object.values(vals)), hi = Math.max(...Object.values(vals)); const t = (k: string) => (hi === lo ? 0.5 : (vals[k] - lo) / (hi - lo)); const unit = metric === "pop" ? "M people" : "% of households online";
  const groups = [...new Set(tiles.map((x) => x.ch))];
  return (
    <>
      <div className="p3e-controls"><Segmented label="Colour by" value={metric} onChange={setMetric} options={[{ value: "net", label: "Internet access" }, { value: "pop", label: "Population" }]} /></div>
      <Chart title={title} n={tiles.length} state={state} height={300} table={{ head: ["State", "Hex tiles", "Population (M)", "Households online (%)"], rows: groups.map((g) => [names[g], tiles.filter((x) => x.ch === g).length, population[names[g]], internet[names[g]]]) }}>
        {(w) => {
          const size = Math.max(14, Math.min(34, (w - 20) / 7 / Math.sqrt(3))); const px = tiles.map((x) => ({ ...x, ...hexToPixel(x, size) })); const minX = Math.min(...px.map((x) => x.x)) - size, minY = Math.min(...px.map((x) => x.y)) - size; const W = Math.max(...px.map((x) => x.x)) - minX + size, H = Math.max(...px.map((x) => x.y)) - minY + size;
          return (
            <>
              <Svg w={W + 4} h={H + 4} label={`${title}. ${groups.length} states and territories drawn as ${tiles.length} hexagons. ${groups.map((g) => `${names[g]}: ${vals[names[g]]} ${unit}`).join("; ")}.`}>
                <g transform={`translate(${2 - minX},${2 - minY})`}>
                  {groups.map((g) => { const nm = names[g]; const mine = px.filter((x) => x.ch === g); const lead = mine[0]; return (
                    <g key={g} {...hit(nm, `${nm}: ${vals[nm]} ${unit}; ${mine.length} tile${mine.length > 1 ? "s" : ""}`)}>
                      <g>{mine.map((x) => <path key={`${x.q},${x.r}`} d={"M" + hexCorners(x, size - 1.5).map((c) => c.map((v) => v.toFixed(1)).join(",")).join("L") + "Z"} fill={heat(0.1 + 0.9 * t(nm))} stroke={sel === nm ? "var(--jp-text)" : "var(--jp-surface-raised)"} strokeWidth={sel === nm ? 3 : 1.5} />)}</g>
                      <text x={lead.x} y={lead.y} dy="0.35em" textAnchor="middle" className="p3e-b" style={{ fill: onHeat(0.1 + 0.9 * t(nm)) }}>{nm}</text>
                    </g>); })}
                </g>
              </Svg>
              <Readout>{text}</Readout>
              <div className="p3e-controls"><HeatScale lo={`${lo}`} hi={`${hi} ${unit}`} /></div>
            </>
          );
        }}
      </Chart>
      <Note>Cartogram: tile counts follow population (NSW 8, VIC 7, QLD 5, WA 3, SA 2, TAS 1, ACT 1, NT 1), positions follow geography loosely. Distances and areas are not to scale.</Note>
    </>
  );
}

/** Loads a lazily imported dataset; `null` while loading. */
function useLoaded<T>(load: () => Promise<T>) { const [d, setD] = useState<T | null>(null); useEffect(() => { let ok = true; void load().then((v) => ok && setD(v)); return () => { ok = false; }; }, [load]); return d; }
const dur = (min: number) => (Number.isFinite(min) ? `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, "0")} min` : "not reachable");

/** D059 Isochrone: Dijkstra over an explicit Queensland road graph (roads.ts documents the cost model). Local government areas are shaded by drive time to their centroid (nearest town plus an off-road leg). */
export function RoadIsochrone({ originId = "bne", bands = [3, 6, 12, 18], title = "Isochrone: drive time over the Queensland road graph", state }: Common & { originId?: string; bands?: number[] }) {
  const lgas = useLoaded(loadLgas); const g = useMemo(() => buildGraph(), []);
  const [origin, setOrigin] = useState(originId), [limit, setLimit] = useState(String(bands[bands.length - 1])), [dest, setDest] = useState("");
  const oi = Math.max(0, g.towns.findIndex((t) => t.id === origin)); const sp = useMemo(() => shortestTimes(g, oi), [g, oi]);
  const qld = useMemo(() => (lgas ?? []).filter((l) => l.state === "QLD"), [lgas]);
  const lt = useMemo(() => qld.map((l) => timeToPoint(g, sp.dist, l.centroid) / 60), [qld, g, sp]);
  const di = g.towns.findIndex((t) => t.id === dest), route = di >= 0 ? routeTo(sp.prev, di) : [];
  const shares = bands.map((b) => lt.filter((v) => v <= b).length); const lim = +limit;
  const readout = di >= 0 ? `${g.towns[oi].name} to ${g.towns[di].name}: ${dur(sp.dist[di])}, about ${Math.round(sp.km[di])} km via ${route.map((r) => g.towns[r].name).join(", ")}.` : "";
  const box = useMemo(() => ringsBox(qld.flatMap((l) => l.rings)), [qld]);
  const bandOfH = (h: number) => { const b = bands.findIndex((x) => h <= x); return b < 0 ? bands.length : b; };
  return (
    <>
      <div className="p3e-controls">
        <label>Start <Select value={origin} onChange={(v) => { setOrigin(v); setDest(""); }} options={g.towns.map((t) => ({ value: t.id, label: t.name }))} aria-label="Start town" /></label>
        <Segmented label="Highlight reach within" value={limit} onChange={setLimit} options={bands.map((b) => ({ value: String(b), label: `${b} h` }))} />
        <label>Route to <Select value={dest} onChange={setDest} options={[{ value: "", label: "(none)" }, ...g.towns.filter((t) => t.id !== origin).map((t) => ({ value: t.id, label: t.name }))]} aria-label="Route to town" /></label>
        {qld.length > 0 && <span className="p3e-badge">{pct(lt.filter((v) => v <= lim).length / qld.length, 0)} of {qld.length} council areas within {lim} h</span>}
      </div>
      {!lgas && state !== "empty" ? <p role="status" className="pc-note">Loading council boundaries…</p> : <Chart title={title} n={g.towns.length} state={state} height={520} table={{ head: ["Town", "Drive time", "Km on route", "Route"], rows: g.towns.map((t, i) => [t.name, dur(sp.dist[i]), Math.round(sp.km[i]), routeTo(sp.prev, i).map((r) => g.towns[r].name).join(" > ")]) }}>
        {(w) => {
          const { p: P, h } = projection(box, Math.min(w, 560), 8), W = Math.min(w, 560);
          return (
            <>
              <Svg w={W} h={h} label={`${title}. From ${g.towns[oi].name}: ${bands.map((b, i) => `${shares[i]} of ${qld.length} council areas within ${b} hours`).join(", ")}.`}>
                {qld.map((l, i) => { const b = bandOfH(lt[i]); return <path key={l.code} d={l.rings.map((r) => poly(r, P)).join("")} fill={b >= bands.length ? "var(--jp-surface)" : heat(0.95 - 0.28 * b)} opacity={lt[i] > lim ? 0.3 : 1} stroke={b >= bands.length ? "var(--jp-border)" : "var(--jp-surface-raised)"} strokeWidth={0.6} strokeLinejoin="round" />; })}
                {g.roads.map((r, k) => { const a = g.towns.find((t) => t.id === r.a)!, b = g.towns.find((t) => t.id === r.b)!; const on = route.length > 1 && route.some((x, i) => i > 0 && ((g.towns[x].id === r.a && g.towns[route[i - 1]].id === r.b) || (g.towns[x].id === r.b && g.towns[route[i - 1]].id === r.a))); const [x1, y1] = P([a.lon, a.lat]), [x2, y2] = P([b.lon, b.lat]); return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke={on ? "var(--adm-c3)" : "var(--jp-text)"} strokeWidth={on ? 4 : r.cls === "motorway" ? 2 : 1.2} strokeLinecap="round" opacity={on ? 1 : 0.65} />; })}
                {g.towns.map((t, i) => { const [x, y] = P([t.lon, t.lat]); const big = t.size !== "town"; return (
                  <g key={t.id} onPointerEnter={() => setDest(t.id === origin ? "" : t.id)} style={{ cursor: "pointer" }}>
                    <circle cx={x} cy={y} r={i === oi ? 7 : big ? 5 : 3.5} fill={i === oi ? "var(--jp-surface-raised)" : "var(--jp-text)"} stroke="var(--jp-surface-raised)" strokeWidth={i === oi ? 3 : 1.5} />
                    {i === oi && <circle cx={x} cy={y} r={7} fill="none" stroke="var(--jp-text)" strokeWidth={3} />}
                    {(t.size === "city" || i === oi || t.id === dest || route.includes(i)) && <text x={i === oi ? x - 11 : x + 9} y={y} textAnchor={i === oi ? "end" : "start"} dy="0.35em" className="p3e-halo">{t.name}{Number.isFinite(sp.dist[i]) && i !== oi ? ` ${Math.round(sp.dist[i] / 60)} h` : ""}</text>}
                  </g>); })}
              </Svg>
              <Readout>{readout}</Readout>
            </>
          );
        }}
      </Chart>}
      <Legend items={[...bands.map((b, i) => ({ label: `within ${b} h`, color: heat(0.95 - 0.28 * i) })), { label: "slower than that", color: "var(--jp-surface)", cls: "p3e-outline" }, { label: "route to chosen town", color: "var(--adm-c3)" }]} />
      <Note>Dijkstra over {g.towns.length} towns and {g.roads.length} highway links (explicit sample graph, approximate coordinates). Cost model: straight-line km x winding factor (1.10 motorway, 1.12 highway, 1.18 rural) at 110, 100 and 90 km/h, plus 8, 4 or 2 minutes each time a trip passes through a city, regional centre or town. No traffic, rest stops or ferries. Council areas are shaded by time to their centroid: nearest town plus an off-road leg at 60 km/h x 1.25 detour. Boundaries: ABS 2021 LGAs, simplified.</Note>
    </>
  );
}

/** D059 GPS track with elevation: drag the slider (or arrow keys) to move a marker along the map and the elevation profile together. */
export function GpsTrack({ track, title = "GPS track with elevation", state }: Common & { track: Fix[] }) {
  const s = useMemo(() => trackStats(track), [track]); const [i, setI] = useState(0); const { text, hit } = useHits<string>(); const p = track[i];
  const ptxt = `${(s.cum[i] / 1000).toFixed(2)} km, ${p.ele.toFixed(0)} m, ${hhmm(p.t / 60)} elapsed`;
  return (
    <>
      <div className="p3e-stats"><div><b>{(s.distance / 1000).toFixed(1)} km</b><span>distance</span></div><div><b>+{s.gain.toFixed(0)} m</b><span>climb</span></div><div><b>-{s.loss.toFixed(0)} m</b><span>descent</span></div><div><b>{(s.maxGrade * 100).toFixed(1)}%</b><span>steepest segment</span></div><div><b>{Math.round(s.seconds / 60)} min</b><span>elapsed</span></div></div>
      <div className="p3e-controls"><label>Position <input type="range" min={0} max={track.length - 1} value={i} onChange={(e) => setI(+e.target.value)} aria-valuetext={ptxt} /></label><span className="p3e-badge">{ptxt}</span></div>
      <Chart title={title} n={track.length} state={state} height={380} table={{ head: ["Fix", "Distance (km)", "Elevation (m)", "Elapsed (min)"], rows: track.filter((_, k) => k % 10 === 0).map((q, k) => [k * 10, +(s.cum[k * 10] / 1000).toFixed(2), Math.round(q.ele), Math.round(q.t / 60)]) }}>
        {(w) => {
          const b: Box = { minX: Math.min(...track.map((q) => q.lon)), maxX: Math.max(...track.map((q) => q.lon)), minY: Math.min(...track.map((q) => q.lat)), maxY: Math.max(...track.map((q) => q.lat)) }; const { p: P, h: mapH } = projection(b, w, 14); const hm = Math.min(mapH, 300);
          const pe = 90, L = 34, X = (d: number) => L + (d / s.distance) * (w - L - 8), Y = (e: number) => 8 + (1 - (e - s.min) / (s.max - s.min || 1)) * (pe - 20);
          return (
            <>
              <Svg w={w} h={hm + pe + 38} label={`${title}: ${(s.distance / 1000).toFixed(1)} km loop, ${s.gain.toFixed(0)} metres of climb, elevation ${s.min.toFixed(0)} to ${s.max.toFixed(0)} metres. Marker at ${ptxt}.`}>
                <g {...hit("map", `Map of the track: ${(s.distance / 1000).toFixed(1)} km loop`)}>
                  <path d={poly(track.map((q) => [q.lon, q.lat]), P).replace(/Z$/, "")} fill="none" stroke="var(--adm-c1)" strokeWidth="3.5" strokeLinejoin="round" />
                </g>
                <circle cx={P([track[0].lon, track[0].lat])[0]} cy={P([track[0].lon, track[0].lat])[1]} r="6" fill="var(--jp-surface-raised)" stroke="var(--jp-text)" strokeWidth="2.5" /><text x={P([track[0].lon, track[0].lat])[0] + 9} y={P([track[0].lon, track[0].lat])[1]} className="p3e-halo">start / finish</text>
                <circle cx={P([p.lon, p.lat])[0]} cy={P([p.lon, p.lat])[1]} r="8" fill="var(--adm-c2)" stroke="var(--jp-text)" strokeWidth="2.5" />
                <g transform={`translate(0,${hm + 14})`}>
                  <path d={`M${X(0)},${Y(s.min) + 12}` + track.map((q, k) => `L${X(s.cum[k]).toFixed(1)},${Y(q.ele).toFixed(1)}`).join("") + `L${X(s.distance)},${Y(s.min) + 12}Z`} fill="var(--adm-c1)" fillOpacity="0.22" stroke="var(--adm-c1)" strokeWidth="2" />
                  <line x1={X(s.cum[i])} x2={X(s.cum[i])} y1="0" y2={pe} stroke="var(--jp-text)" strokeWidth="2" strokeDasharray="4 3" />
                  {[s.min, s.max].map((e) => <text key={e} x={L - 4} y={Y(e)} dy="0.35em" textAnchor="end" className="p3e-mute">{Math.round(e)} m</text>)}<text x={w - 8} y={pe + 26} textAnchor="end" className="p3e-mute">distance along track (km): 0 to {(s.distance / 1000).toFixed(1)}</text>
                </g>
              </Svg>
              <Readout>{text || ptxt}</Readout>
            </>
          );
        }}
      </Chart>
      <Note>Climb and descent ignore wobbles under 3 m so GPS noise is not counted as hills. The map is an unprojected sketch of the track, with no base map or tiles.</Note>
    </>
  );
}

const FSTATE = { inside: "Inside", dwelling: "Dwelling", outside: "Outside" } as const;
/** D059 Geofence states: scrub through the track; each fence is inside, dwelling (inside long enough to count as a stop) or outside, with an enter/exit event log. */
export function Geofences({ track, fences, dwell = 180, title = "Geofence states along a track", state }: Common & { track: Fix[]; fences: { id: string; name: string; poly: Pt[] }[]; dwell?: number }) {
  const [i, setI] = useState(0); const { text, hit } = useHits<string>(); const path = useMemo(() => track.map((q) => ({ t: q.t, p: [q.lon, q.lat] as Pt })), [track]);
  const res = useMemo(() => fenceTrack(path.slice(0, i + 1), fences, dwell), [path, fences, dwell, i]); const full = useMemo(() => fenceTrack(path, fences, dwell), [path, fences, dwell]);
  return (
    <>
      <div className="p3e-controls"><label>Time <input type="range" min={0} max={track.length - 1} value={i} onChange={(e) => setI(+e.target.value)} aria-valuetext={`${hhmm(track[i].t / 60)} elapsed`} /></label><span className="p3e-badge">{hhmm(track[i].t / 60)} elapsed</span>
        {fences.map((f) => <span key={f.id} className={`p3e-badge ${res.state[f.id] === "dwelling" ? "is-warn" : res.state[f.id] === "inside" ? "is-ok" : ""}`}>{f.name}: {FSTATE[res.state[f.id]]}</span>)}</div>
      <Chart title={title} n={track.length} state={state} height={340} table={{ head: ["Time (min)", "Fence", "Event"], rows: full.events.map((e) => [Math.round(e.t / 60), fences.find((f) => f.id === e.fence)?.name ?? e.fence, e.kind]) }}>
        {(w) => {
          const all = [...track.map((q): Pt => [q.lon, q.lat]), ...fences.flatMap((f) => f.poly)]; const b: Box = { minX: Math.min(...all.map((q) => q[0])), maxX: Math.max(...all.map((q) => q[0])), minY: Math.min(...all.map((q) => q[1])), maxY: Math.max(...all.map((q) => q[1])) }; const { p: P, h } = projection(b, w, 16); const cur = P([track[i].lon, track[i].lat]);
          return (
            <>
              <Svg w={w} h={Math.min(h, 360)} label={`${title}. ${fences.length} fences. At ${hhmm(track[i].t / 60)}: ${fences.map((f) => `${f.name} ${FSTATE[res.state[f.id]].toLowerCase()}`).join(", ")}.`}>
                {fences.map((f, k) => { const st = res.state[f.id]; const c = P([sum(f.poly.map((q) => q[0])) / f.poly.length, sum(f.poly.map((q) => q[1])) / f.poly.length]); return (
                  <g key={f.id} {...hit(f.id, `${f.name}: ${FSTATE[st].toLowerCase()} now; ${full.events.filter((e) => e.fence === f.id).length} enter/exit events in the whole track`)}>
                    <path d={poly(f.poly, P)} fill={C(k + 2)} fillOpacity={st === "outside" ? 0.1 : st === "inside" ? 0.35 : 0.6} stroke={C(k + 2)} strokeWidth={st === "dwelling" ? 4 : 2} strokeDasharray={st === "outside" ? "6 4" : undefined} />
                    <text x={c[0]} y={c[1]} dy="0.35em" textAnchor="middle" className="p3e-halo p3e-b">{f.name}</text>
                  </g>); })}
                <path d={poly(track.map((q) => [q.lon, q.lat]), P).replace(/Z$/, "")} fill="none" stroke="var(--jp-text-muted)" strokeWidth="2" />
                <path d={poly(track.slice(0, i + 1).map((q) => [q.lon, q.lat]), P).replace(/Z$/, "")} fill="none" stroke="var(--adm-c1)" strokeWidth="4" />
                <circle cx={cur[0]} cy={cur[1]} r="8" fill="var(--adm-c2)" stroke="var(--jp-text)" strokeWidth="2.5" />
              </Svg>
              <Readout>{text}</Readout>
            </>
          );
        }}
      </Chart>
      <Legend items={[{ label: "Outside: dashed, faint", cls: "p3e-ring" }, { label: "Inside: solid, light fill" }, { label: `Dwelling (inside ${hhmm(dwell / 60)} or more): heavy outline, dark fill` }]} />
      <Note>{`Events so far: ${res.events.map((e) => `${fences.find((f) => f.id === e.fence)?.name} ${e.kind} at ${hhmm(e.t / 60)}`).join("; ") || "none"}.`}</Note>
    </>
  );
}

/** D059 Australian choropleth on real boundaries: Natural Earth admin-1 states, and ABS 2021 local government areas (all of Australia, simplified to about 1 km). Council values are sample data. */
export function AuChoropleth({ states, unit = "% online", title = "Choropleth: states and councils", state }: Common & { states: Record<string, number>; unit?: string }) {
  const [lvl, setLvl] = useState<"state" | "council">("state"); const [zoom, setZoom] = useState("ALL"); const { sel, text, hit, set, clear } = useHits();
  const shapes = useLoaded(loadStates); const lgas = useLoaded(loadLgas); const ready = lvl === "state" ? shapes : lgas;
  const sv = Object.values(states); const cv = useMemo(() => (lgas ?? []).map(sampleOnline), [lgas]);
  const lo = lvl === "state" ? Math.min(...sv) : Math.min(...cv), hi = lvl === "state" ? Math.max(...sv) : Math.max(...cv); const t = (v: number) => (hi === lo ? 0.5 : 0.1 + 0.9 * ((v - lo) / (hi - lo)));
  const shown = useMemo(() => (lgas ?? []).filter((l) => zoom === "ALL" || l.state === zoom).sort((a, b) => a.name.localeCompare(b.name)), [lgas, zoom]);
  const box = useMemo(() => ringsBox(zoom === "ALL" ? (shapes ?? []).flatMap((s) => s.rings) : shown.flatMap((l) => l.rings)), [zoom, shapes, shown]);
  const byCode = useMemo(() => new Map((lgas ?? []).map((l, i) => [l.code, cv[i]])), [lgas, cv]);
  const cur = shown.find((l) => l.code === sel);
  const lgaText = (l: Lga) => `${l.name} (${l.state}): ${byCode.get(l.code)}${unit} (sample), ${fmt(l.areaKm2)} km2`;
  const step = (d: number) => { if (!shown.length) return; const i = cur ? shown.indexOf(cur) : -1; const n = shown[(i + d + shown.length) % shown.length]; set(n.code, lgaText(n)); };
  const onKey = (e: React.KeyboardEvent) => { if (e.key === "ArrowRight" || e.key === "ArrowDown") step(1); else if (e.key === "ArrowLeft" || e.key === "ArrowUp") step(-1); else if (e.key === "Home") { if (shown.length) set(shown[0].code, lgaText(shown[0])); } else if (e.key === "End") { if (shown.length) { const n = shown[shown.length - 1]; set(n.code, lgaText(n)); } } else if (e.key === "Escape") clear(); else return; e.preventDefault(); };
  return (
    <>
      <div className="p3e-controls">
        <Segmented label="Level" value={lvl} onChange={(v) => { setLvl(v); clear(); }} options={[{ value: "state", label: "States and territories" }, { value: "council", label: "Council areas (LGAs)" }]} />
        {lvl === "council" && <label>Zoom to <Select value={zoom} onChange={(v) => { setZoom(v); clear(); }} options={[{ value: "ALL", label: "All of Australia" }, ...STATE_ORDER.filter((k) => k !== "ACT").concat("ACT").map((k) => ({ value: k, label: STATE_NAMES[k] }))]} aria-label="Zoom to state" /></label>}
        {lvl === "council" && <label>Find council <Select value={sel ?? ""} onChange={(v) => { const l = shown.find((x) => x.code === v); if (l) set(l.code, lgaText(l)); else clear(); }} options={[{ value: "", label: "(none)" }, ...shown.map((l) => ({ value: l.code, label: l.name }))]} aria-label="Find council" /></label>}
      </div>
      {!ready && state !== "empty" ? <p role="status" className="pc-note">Loading boundaries…</p> : <Chart title={`${title} (${lvl === "state" ? "states" : "councils"})`} n={lvl === "state" ? sv.length : (lgas?.length ?? 1)} state={state} height={420}
        table={lvl === "state" ? { head: ["State", `Value (${unit})`], rows: STATE_ORDER.map((k) => [STATE_NAMES[k], states[k]]) } : { head: ["Council", "State", "Area (km2)", `Sample value (${unit})`], rows: shown.map((l) => [l.name, l.state, Math.round(l.areaKm2), byCode.get(l.code) ?? ""]) }}>
        {(w) => {
          if (!shapes || !lgas) return null; const W = Math.min(w, 760), { p: P, h } = projection(box, W, 10);
          if (lvl === "state") {
            const acti = P([149.12, -35.3]); const lbl = (k: string): Pt => (k === "TAS" ? [146.6, -42.0] : labelPoint(shapes.find((s) => s.code === k)!.rings));
            return (
              <>
                <Svg w={W} h={h} label={`Choropleth of ${STATE_ORDER.length} states and territories. ${STATE_ORDER.map((k) => `${STATE_NAMES[k]} ${states[k]}${unit}`).join("; ")}.`}>
                  {shapes.filter((s) => s.code !== "ACT").map((s) => <g key={s.code} {...hit(s.code, `${STATE_NAMES[s.code]}: ${states[s.code]}${unit}`)}><path d={s.rings.map((r) => poly(r, P)).join("")} fill={heat(t(states[s.code]))} stroke={sel === s.code ? "var(--jp-text)" : "var(--jp-surface-raised)"} strokeWidth={sel === s.code ? 3 : 1.2} strokeLinejoin="round" /></g>)}
                  <g {...hit("ACT", `${STATE_NAMES.ACT}: ${states.ACT}${unit}. Real outline is about 8 pixels wide here, so an enlarged marker is added.`)}><path d={shapes.find((s) => s.code === "ACT")!.rings.map((r) => poly(r, P)).join("")} fill={heat(t(states.ACT))} stroke="var(--jp-text)" strokeWidth={1} /><circle cx={acti[0] + 22} cy={acti[1] + 8} r="9" fill={heat(t(states.ACT))} stroke="var(--jp-text)" strokeWidth="2" /><path d={`M${acti[0] + 13},${acti[1] + 5}L${acti[0] + 3},${acti[1]}`} stroke="var(--jp-text)" /></g>
                  {STATE_ORDER.filter((k) => k !== "ACT").map((k) => { const [x, y] = P(lbl(k)); return <text key={k} x={x} y={y} textAnchor="middle" dy="0.35em" className="p3e-b" style={{ fill: onHeat(t(states[k])), pointerEvents: "none" }}>{k}</text>; })}
                  <text x={acti[0] + 36} y={acti[1] + 8} dy="0.35em" className="p3e-halo">ACT</text>
                </Svg>
                <Readout>{text}</Readout>
              </>
            );
          }
          return (
            <>
              <div className="p3e-focus-grid" tabIndex={0} role="group" aria-label={`Council areas map, ${shown.length} areas. Arrow keys step through councils in name order, Home and End jump, Escape clears.`} onKeyDown={onKey} onBlur={clear}>
                <Svg w={W} h={h} label={`Council areas in ${zoom === "ALL" ? "Australia" : STATE_NAMES[zoom]}: ${shown.length} local government areas shaded by a sample value.`}>
                  {shown.map((l) => { const v = byCode.get(l.code)!; return <path key={l.code} d={l.rings.map((r) => poly(r, P)).join("")} fill={heat(t(v))} stroke={sel === l.code ? "var(--jp-text)" : "var(--jp-surface-raised)"} strokeWidth={sel === l.code ? 2.5 : 0.5} strokeLinejoin="round" onPointerEnter={() => set(l.code, lgaText(l))} onPointerLeave={clear} />; })}
                  {cur && <path d={cur.rings.map((r) => poly(r, P)).join("")} fill="none" stroke="var(--jp-text)" strokeWidth={2.5} strokeLinejoin="round" pointerEvents="none" />}
                </Svg>
              </div>
              <Readout>{text}</Readout>
            </>
          );
        }}
      </Chart>}
      {Number.isFinite(lo) && <div className="p3e-controls"><HeatScale lo={`${lo}`} hi={`${hi}${unit}`} /></div>}
      <Note>{lvl === "state" ? "Boundaries: Natural Earth 1:10m admin-1 (public domain), simplified to 0.02 degrees (about 2 km). Jervis Bay, Lord Howe and Macquarie Islands are omitted. Values are sample data. The ACT is outlined and also marked with an enlarged circle." : "Boundaries: ABS ASGS 2021 local government areas (CC BY 4.0), simplified to 0.01 degree (about 1 km); a few tiny councils are drawn as boxes. The value is a sample figure modelled from council area, not a statistic."}</Note>
    </>
  );
}
