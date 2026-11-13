import { useId, useRef, useState } from "react";
import { Btn, Badge } from "@belikh/jupiter-ui/kit.tsx";
import { Checkbox, Select } from "@belikh/jupiter-ui/inputs.tsx";
import { clampBox, nearestOrder, normBox, perimeter, pointInPolygon, polygonArea, rackFits, rackFree, routeLength, snap, type Box, type Pt, type RackDevice } from "./geometry.ts";
import { CopyBtn, Note, Row, Stack, clamp, rovingKeys } from "./ui.tsx";

const W = 300, H = 200, M = 0.1; // viewBox units, metres per unit
const r1 = (n: number) => Math.round(n * 10) / 10;
function Plan({ children, svgRef, onPointerDown, label, onClick }: { children: React.ReactNode; svgRef: React.RefObject<SVGSVGElement | null>; onPointerDown?: (e: React.PointerEvent<SVGSVGElement>) => void; onClick?: (e: React.MouseEvent<SVGSVGElement>) => void; label: string }) {
  const pid = `hlp${useId().replace(/\W/g, "")}`;
  return (
  <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="lab-plan" role="group" aria-label={label} onPointerDown={onPointerDown} onClick={onClick}>
    <defs><pattern id={pid} width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" className="lab-plan__gl" /></pattern></defs><rect width={W} height={H} className="lab-plan__bg" /><rect width={W} height={H} fill={`url(#${pid})`} />{children}
  </svg>);
}
const toPt = (svg: SVGSVGElement | null, e: { clientX: number; clientY: number }): Pt => { const r = svg?.getBoundingClientRect(); if (!r || !r.width) return { x: 150, y: 100 }; return { x: clamp(((e.clientX - r.left) / r.width) * W, 0, W), y: clamp(((e.clientY - r.top) / r.height) * H, 0, H) }; };
const arrow = (e: React.KeyboardEvent): [number, number] | null => { const s = e.shiftKey ? 20 : 5; return ({ ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] } as Record<string, [number, number]>)[e.key] ?? null; };
const num = (v: string, max: number) => clamp(Math.round(Number(v) || 0), 0, max);

/* ---------------- C064 polygon draw ---------------- */
export function PolygonDraw() {
  const [pts, setPts] = useState<Pt[]>([{ x: 60, y: 50 }, { x: 200, y: 40 }, { x: 230, y: 130 }, { x: 90, y: 150 }]); const [closed, setClosed] = useState(true); const svg = useRef<SVGSVGElement>(null); const [test, setTest] = useState<Pt>({ x: 120, y: 90 }); const [grid, setGrid] = useState(true);
  const place = (p: Pt) => (grid ? { x: snap(p.x, 5), y: snap(p.y, 5) } : { x: Math.round(p.x), y: Math.round(p.y) });
  const move = (i: number, p: Pt) => setPts((a) => a.map((q, j) => (j === i ? { x: clamp(p.x, 0, W), y: clamp(p.y, 0, H) } : q)));
  const area = polygonArea(pts) * M * M, per = perimeter(pts, closed) * M; const inside = closed && pts.length >= 3 && pointInPolygon(test, pts);
  const startDrag = (i: number) => (e: React.PointerEvent) => { e.stopPropagation(); const mv = (ev: PointerEvent) => move(i, place(toPt(svg.current, ev))); const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); }; window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up); };
  return (
    <Stack>
      <Plan svgRef={svg} label="Polygon canvas. Click to add a vertex." onClick={(e) => { if (closed && pts.length >= 3) return; setPts([...pts, place(toPt(svg.current, e))]); }}>
        {pts.length > 1 && (closed && pts.length >= 3 ? <polygon points={pts.map((p) => `${p.x},${p.y}`).join(" ")} className="lab-plan__poly" /> : <polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} className="lab-plan__line" />)}
        {closed && pts.length >= 3 && <circle cx={test.x} cy={test.y} r={4} className={inside ? "lab-plan__test is-in" : "lab-plan__test"} />}
        {pts.map((p, i) => <g key={i} transform={`translate(${p.x} ${p.y})`}><circle r={6} tabIndex={0} role="button" aria-label={`Vertex ${i + 1} at ${r1(p.x * M)}, ${r1(p.y * M)} metres. Arrow keys move it, Delete removes it.`} className="lab-plan__v" onPointerDown={startDrag(i)} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { const a = arrow(e); if (a) { e.preventDefault(); move(i, { x: p.x + a[0], y: p.y + a[1] }); } else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); setPts(pts.filter((_, j) => j !== i)); } }} /><text y={-9} textAnchor="middle" className="lab-plan__t" aria-hidden>{i + 1}</text></g>)}
      </Plan>
      <Row><Btn sm onClick={() => setClosed(!closed)} disabled={pts.length < 3}>{closed ? "Reopen shape" : "Close shape"}</Btn><Btn sm onClick={() => setPts(pts.slice(0, -1))} disabled={!pts.length}>Undo last point</Btn><Btn sm onClick={() => { const a = pts.at(-1) ?? { x: 100, y: 100 }; setPts([...pts, { x: clamp(a.x + 20, 0, W), y: clamp(a.y + 15, 0, H) }]); }}>Add point</Btn><Btn sm variant="ghost" onClick={() => { setPts([]); setClosed(false); }}>Clear</Btn><Checkbox checked={grid} onChange={setGrid} label="Snap to 0.5 m grid" /></Row>
      <p className="lab-sentence" role="status">{pts.length} vertices · {closed && pts.length >= 3 ? `area ${area.toFixed(1)} m²` : "open shape"} · {closed ? "perimeter" : "length"} {per.toFixed(1)} m</p>
      <details className="lab-details"><summary>Vertex coordinates (keyboard alternative)</summary>
        <table className="lab-table"><caption className="lab-sr">Vertices</caption><thead><tr><th scope="col">#</th><th scope="col">X (m)</th><th scope="col">Y (m)</th><th scope="col"><span className="lab-sr">Remove</span></th></tr></thead><tbody>{pts.map((p, i) => <tr key={i}><th scope="row">{i + 1}</th><td><input className="jp-input lab-narrow" type="number" step={0.5} min={0} max={30} aria-label={`Vertex ${i + 1} X in metres`} value={r1(p.x * M)} onChange={(e) => move(i, { x: num(String(Number(e.target.value) / M), W), y: p.y })} /></td><td><input className="jp-input lab-narrow" type="number" step={0.5} min={0} max={20} aria-label={`Vertex ${i + 1} Y in metres`} value={r1(p.y * M)} onChange={(e) => move(i, { x: p.x, y: num(String(Number(e.target.value) / M), H) })} /></td><td><Btn sm variant="ghost" aria-label={`Remove vertex ${i + 1}`} onClick={() => setPts(pts.filter((_, j) => j !== i))}>Remove</Btn></td></tr>)}</tbody></table></details>
      <Row><label className="lab-field"><span className="jp-label">Test point X (m)</span><input className="jp-input lab-narrow" type="number" step={0.5} value={r1(test.x * M)} onChange={(e) => setTest({ ...test, x: clamp(Number(e.target.value) / M, 0, W) })} /></label><label className="lab-field"><span className="jp-label">Test point Y (m)</span><input className="jp-input lab-narrow" type="number" step={0.5} value={r1(test.y * M)} onChange={(e) => setTest({ ...test, y: clamp(Number(e.target.value) / M, 0, H) })} /></label><span role="status" className="lab-note">{closed && pts.length >= 3 ? `Point is ${inside ? "inside" : "outside"} the shape` : "Close the shape to test a point"}</span></Row>
      <CopyBtn text={JSON.stringify({ type: "Polygon", coordinates: [[...pts, pts[0]].filter(Boolean).map((p) => [r1(p.x * M), r1(p.y * M)])] })} label="Copy GeoJSON" />
    </Stack>
  );
}

/* ---------------- C064 bounding boxes ---------------- */
type Bx = Box & { id: number; label: string };
export function BBoxDraw() {
  const [boxes, setBoxes] = useState<Bx[]>([{ id: 1, label: "person", x: 40, y: 50, w: 50, h: 90 }, { id: 2, label: "vehicle", x: 140, y: 90, w: 110, h: 60 }]); const [sel, setSel] = useState<number | null>(1); const [label, setLabel] = useState("person"); const svg = useRef<SVGSVGElement>(null); const [draft, setDraft] = useState<Box | null>(null); const id = useRef(2);
  const upd = (i: number, patch: Partial<Box>) => setBoxes((b) => b.map((x) => (x.id === i ? { ...x, ...clampBox({ ...x, ...patch }, W, H) } : x)));
  const down = (e: React.PointerEvent<SVGSVGElement>) => { if ((e.target as Element).closest("[data-box]")) return; const a = toPt(svg.current, e); const mv = (ev: PointerEvent) => setDraft(normBox(a, toPt(svg.current, ev))); const up = (ev: PointerEvent) => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); const b = normBox(a, toPt(svg.current, ev)); setDraft(null); if (b.w > 8 && b.h > 8) { const n = { ...b, id: ++id.current, label }; setBoxes((x) => [...x, n]); setSel(n.id); } }; window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up); };
  const cur = boxes.find((b) => b.id === sel); const LABELS = ["person", "vehicle", "animal", "package"];
  return (
    <Stack>
      <Row><label className="lab-field"><span className="jp-label">Label for new boxes</span><Select value={label} onChange={setLabel} options={LABELS} aria-label="Label for new boxes" /></label><Btn sm onClick={() => { const n = { id: ++id.current, label, x: 100, y: 60, w: 60, h: 60 }; setBoxes([...boxes, n]); setSel(n.id); }}>Add box</Btn><Btn sm variant="ghost" disabled={!cur} onClick={() => { setBoxes(boxes.filter((b) => b.id !== sel)); setSel(null); }}>Delete selected</Btn></Row>
      <Plan svgRef={svg} label="Bounding box canvas. Drag to draw a box." onPointerDown={down}>
        {boxes.map((b) => <g key={b.id} data-box><rect x={b.x} y={b.y} width={b.w} height={b.h} tabIndex={0} role="button" aria-pressed={sel === b.id} aria-label={`Box ${b.id}, ${b.label}, ${Math.round(b.w)} by ${Math.round(b.h)}. Arrow keys move, Shift plus arrows resize, Delete removes.`} className={`lab-plan__box ${sel === b.id ? "is-sel" : ""}`} onFocus={() => setSel(b.id)} onClick={() => setSel(b.id)}
          onPointerDown={(e) => { setSel(b.id); const a = toPt(svg.current, e); const o = { x: b.x, y: b.y }; const mv = (ev: PointerEvent) => { const p = toPt(svg.current, ev); upd(b.id, { x: o.x + p.x - a.x, y: o.y + p.y - a.y }); }; const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); }; window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up); }}
          onKeyDown={(e) => { const a = arrow(e); if (a) { e.preventDefault(); e.altKey ? upd(b.id, { w: b.w + a[0], h: b.h + a[1] }) : e.shiftKey ? upd(b.id, { w: b.w + a[0] / 4, h: b.h + a[1] / 4 }) : upd(b.id, { x: b.x + a[0], y: b.y + a[1] }); } else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); setBoxes(boxes.filter((x) => x.id !== b.id)); setSel(null); } }} /><text x={b.x + 3} y={b.y - 3} className="lab-plan__t" aria-hidden>{b.label}</text></g>)}
        {draft && <rect x={draft.x} y={draft.y} width={draft.w} height={draft.h} className="lab-plan__box is-draft" />}
      </Plan>
      {cur ? <fieldset className="lab-fieldset"><legend className="jp-label">Box {cur.id}</legend><Row>
        <Select value={cur.label} onChange={(v) => setBoxes(boxes.map((b) => (b.id === cur.id ? { ...b, label: v } : b)))} options={LABELS} aria-label="Selected box label" />
        {(["x", "y", "w", "h"] as const).map((k) => <label key={k} className="lab-field"><span className="jp-label">{k.toUpperCase()}</span><input className="jp-input lab-narrow" type="number" min={0} max={k === "x" || k === "w" ? W : H} value={Math.round(cur[k])} onChange={(e) => upd(cur.id, { [k]: num(e.target.value, k === "x" || k === "w" ? W : H) })} /></label>)}</Row></fieldset> : <Note>Select a box to edit its label and coordinates.</Note>}
      <p className="lab-note" role="status">{boxes.length} box{boxes.length === 1 ? "" : "es"}: {boxes.map((b) => b.label).join(", ") || "none"}</p>
      <CopyBtn text={JSON.stringify(boxes.map((b) => ({ label: b.label, bbox: [b.x, b.y, b.w, b.h].map(Math.round) })))} label="Copy as JSON" />
    </Stack>
  );
}

/* ---------------- C064 route waypoints ---------------- */
type Wp = Pt & { id: number; name: string };
export function RouteWaypoints() {
  const [wps, setWps] = useState<Wp[]>([{ id: 1, name: "Depot", x: 30, y: 160 }, { id: 2, name: "Stop A", x: 220, y: 150 }, { id: 3, name: "Stop B", x: 90, y: 60 }, { id: 4, name: "Stop C", x: 260, y: 40 }]); const [mode, setMode] = useState("walk"); const svg = useRef<SVGSVGElement>(null); const id = useRef(4);
  const dist = routeLength(wps) * M; const speed = mode === "walk" ? 1.4 : mode === "bike" ? 4.5 : 11; const mins = dist / speed / 60;
  const mv = (i: number, d: number) => setWps((w) => { const n = [...w]; const j = i + d; if (j < 0 || j >= n.length) return w; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const upd = (i: number, p: Pt) => setWps((w) => w.map((x, j) => (j === i ? { ...x, x: clamp(Math.round(p.x), 0, W), y: clamp(Math.round(p.y), 0, H) } : x)));
  const add = (p: Pt) => setWps((w) => [...w, { id: ++id.current, name: `Stop ${String.fromCharCode(64 + w.length)}`, x: Math.round(p.x), y: Math.round(p.y) }]);
  return (
    <Stack>
      <Plan svgRef={svg} label="Route canvas. Click to add a waypoint." onClick={(e) => add(toPt(svg.current, e))}>
        <polyline points={wps.map((p) => `${p.x},${p.y}`).join(" ")} className="lab-plan__line is-route" />
        {wps.map((p, i) => <g key={p.id} transform={`translate(${p.x} ${p.y})`}><circle r={8} tabIndex={0} role="button" aria-label={`Waypoint ${i + 1}, ${p.name}. Arrow keys move it, Delete removes it.`} className={`lab-plan__v ${i === 0 ? "is-start" : i === wps.length - 1 ? "is-end" : ""}`} onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => { e.stopPropagation(); const m = (ev: PointerEvent) => upd(i, toPt(svg.current, ev)); const u = () => { window.removeEventListener("pointermove", m); window.removeEventListener("pointerup", u); }; window.addEventListener("pointermove", m); window.addEventListener("pointerup", u); }}
          onKeyDown={(e) => { const a = arrow(e); if (a) { e.preventDefault(); upd(i, { x: p.x + a[0], y: p.y + a[1] }); } else if (e.key === "Delete") { e.preventDefault(); setWps(wps.filter((_, j) => j !== i)); } }} /><text textAnchor="middle" y={3.5} className="lab-plan__n" aria-hidden>{i + 1}</text></g>)}
      </Plan>
      <Row><Select value={mode} onChange={setMode} options={[{ value: "walk", label: "Walking" }, { value: "bike", label: "Cycling" }, { value: "drive", label: "Driving" }]} aria-label="Travel mode" /><Btn sm onClick={() => add({ x: wps.length ? clamp((wps.at(-1)!.x + 40) % W, 0, W) : 40, y: wps.length ? clamp((wps.at(-1)!.y + 30) % H, 0, H) : 40 })}>Add waypoint</Btn><Btn sm onClick={() => setWps(nearestOrder(wps))} disabled={wps.length < 3}>Optimise order</Btn><Btn sm onClick={() => setWps([...wps].reverse())}>Reverse</Btn><Btn sm variant="ghost" onClick={() => setWps([])}>Clear</Btn></Row>
      <p className="lab-sentence" role="status">{wps.length} waypoints · {dist.toFixed(1)} m · about {mins < 1 ? "under a minute" : `${Math.round(mins)} min`} ({mode === "walk" ? "walking" : mode === "bike" ? "cycling" : "driving"})</p>
      <ol className="lab-wplist" aria-label="Waypoints">{wps.map((p, i) => <li key={p.id}><input className="jp-input" aria-label={`Waypoint ${i + 1} name`} value={p.name} onChange={(e) => setWps(wps.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)))} /><Btn sm variant="ghost" aria-label={`Move ${p.name} up`} disabled={i === 0} onClick={() => mv(i, -1)}>↑</Btn><Btn sm variant="ghost" aria-label={`Move ${p.name} down`} disabled={i === wps.length - 1} onClick={() => mv(i, 1)}>↓</Btn><Btn sm variant="ghost" aria-label={`Remove ${p.name}`} onClick={() => setWps(wps.filter((x) => x.id !== p.id))}>Remove</Btn></li>)}</ol>
    </Stack>
  );
}

/* ---------------- C064 room picker ---------------- */
export type Room = { id: string; name: string; seats: number; features: string[]; busy: boolean; area: string };
export const ROOMS: Room[] = [
  { id: "r1", name: "Banksia", seats: 4, features: ["screen"], busy: false, area: "a" }, { id: "r2", name: "Wattle", seats: 8, features: ["screen", "video"], busy: true, area: "b" }, { id: "r3", name: "Boab", seats: 12, features: ["screen", "video", "whiteboard"], busy: false, area: "c" },
  { id: "r4", name: "Mallee", seats: 2, features: [], busy: false, area: "d" }, { id: "r5", name: "Jarrah", seats: 6, features: ["whiteboard"], busy: false, area: "e" }, { id: "r6", name: "Coolibah", seats: 20, features: ["screen", "video", "whiteboard"], busy: true, area: "f" },
];
export const filterRooms = (rooms: Room[], seats: number, feature: string, freeOnly: boolean) => rooms.filter((r) => r.seats >= seats && (!feature || r.features.includes(feature)) && (!freeOnly || !r.busy));
export function RoomPicker() {
  const [seats, setSeats] = useState(4); const [feature, setFeature] = useState(""); const [free, setFree] = useState(true); const [sel, setSel] = useState<string | null>(null); const ok = new Set(filterRooms(ROOMS, seats, feature, free).map((r) => r.id)); const cur = ROOMS.find((r) => r.id === sel);
  return (
    <Stack>
      <Row><label className="lab-field"><span className="jp-label">Seats needed: {seats}</span><input type="range" min={1} max={20} value={seats} onChange={(e) => setSeats(Number(e.target.value))} /></label><label className="lab-field"><span className="jp-label">Feature</span><Select value={feature} onChange={setFeature} options={[{ value: "", label: "Any" }, "screen", "video", "whiteboard"]} aria-label="Feature" /></label><Checkbox checked={free} onChange={setFree} label="Free now only" /></Row>
      <div className="lab-rooms" role="group" aria-label="Floor plan rooms">
        {ROOMS.map((r) => <button key={r.id} type="button" style={{ gridArea: r.area }} aria-pressed={sel === r.id} disabled={r.busy || !ok.has(r.id)} className={`lab-room ${sel === r.id ? "is-on" : ""} ${r.busy ? "is-busy" : ""}`} onClick={() => setSel(r.id)} aria-label={`${r.name}, ${r.seats} seats${r.features.length ? `, ${r.features.join(", ")}` : ""}, ${r.busy ? "busy" : ok.has(r.id) ? "free" : "does not match filters"}`}><b>{r.name}</b><span>{r.seats} seats</span><span>{r.busy ? "Busy" : r.features.join(" · ") || "No equipment"}</span></button>)}
      </div>
      <p className="lab-note" role="status">{cur ? `Selected ${cur.name} (${cur.seats} seats).` : `${ok.size} room${ok.size === 1 ? "" : "s"} match. Choose one.`}</p>
    </Stack>
  );
}

/* ---------------- C064 rack unit picker ---------------- */
const RACK: RackDevice[] = [{ name: "Patch panel", u: 41, h: 1 }, { name: "Core switch", u: 39, h: 2 }, { name: "Firewall", u: 37, h: 1 }, { name: "NAS", u: 30, h: 4 }, { name: "Server A", u: 24, h: 2 }, { name: "UPS", u: 1, h: 6 }];
export function RackPicker() {
  const [h, setH] = useState("2"); const [start, setStart] = useState<number | null>(null); const [placed, setPlaced] = useState<RackDevice[]>([]); const [name, setName] = useState("New server"); const all = [...RACK, ...placed]; const height = Number(h);
  const fit = start ? rackFits(all, start, height) : null; const owner = (u: number) => all.find((d) => u >= d.u && u <= d.u + d.h - 1); const units = Array.from({ length: 42 }, (_, i) => 42 - i);
  return (
    <Stack>
      <Row><label className="lab-field"><span className="jp-label">Device height</span><Select value={h} onChange={(v) => { setH(v); }} options={["1", "2", "3", "4"].map((x) => ({ value: x, label: `${x}U` }))} aria-label="Device height" /></label><label className="lab-field"><span className="jp-label">Device name</span><input className="jp-input" value={name} onChange={(e) => setName(e.target.value)} /></label><Badge s="info">{rackFree(all)}U free</Badge></Row>
      <div className="lab-rack" role="group" aria-label="42U rack, unit 42 at the top" onKeyDown={rovingKeys(1)}>
        {units.map((u, i) => { const o = owner(u); const inSel = start !== null && u >= start && u <= start + height - 1; return (
          <button key={u} type="button" data-roving tabIndex={i === 0 ? 0 : -1} disabled={!!o} aria-pressed={inSel} aria-label={`Unit ${u}${o ? `, ${o.name}` : ", free"}`} className={`lab-rack__u ${o ? "is-used" : ""} ${inSel ? (fit?.ok ? "is-pick" : "is-bad") : ""}`} onClick={() => setStart(u)}><span className="lab-rack__n">{u}</span><span>{o ? (o.u + o.h - 1 === u ? o.name : "") : ""}</span></button>); })}
      </div>
      <p className={fit && !fit.ok ? "lab-bad" : "lab-note"} role="status">{start === null ? "Click a free unit for the bottom of the device." : fit!.ok ? `${name} would occupy U${start}${height > 1 ? `-U${start + height - 1}` : ""}.` : fit!.reason}</p>
      <Row><Btn variant="primary" disabled={!fit?.ok} onClick={() => { setPlaced([...placed, { name, u: start!, h: height }]); setStart(null); }}>Place device</Btn>{placed.length > 0 && <Btn sm variant="ghost" onClick={() => setPlaced([])}>Remove placed devices</Btn>}</Row>
    </Stack>
  );
}
