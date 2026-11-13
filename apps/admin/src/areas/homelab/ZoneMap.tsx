import { useEffect, useRef, useState } from "react";
import { Panel, Btn, Badge } from "@belikh/jupiter-ui/kit.tsx";
import { Editable } from "@belikh/jupiter-ui/editable.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { opts, type Store } from "./lib.tsx";
import type { Zone } from "./cameras.data.ts";
import { MIN, rectBetween, withPoints, moveZone, dragCorner, moveVertex, nudgeVertex, removeVertex, insertVertex, toPolygon, toRect, keyEdit, arrowStep, pathOf, describeGeo, type Pt, type Handle } from "./cameras.geo.ts";

const SX = 4, SY = 2.25; const HANDLES: Handle[] = ["nw", "ne", "sw", "se"];
type Tool = "" | "rect" | "polygon";
type Drag = { mode: "move" | "corner" | "vertex"; id: string; start: Pt; orig: Zone; handle?: Handle; i?: number };
const HELP = "Arrow keys move the selected zone 1 percent (Ctrl for 5). Shift with the arrow keys resizes it. Tab moves between zones and, for a polygon, between its corners. Delete removes a zone or a corner.";

/** The zone map: draw, drag, resize and edit zones with a pointer or entirely from the keyboard. */
export function ZoneMap({ zones, cam, camName }: { zones: Store<Zone>; cam: string; camName: string }) {
  const { toast } = usePrefs(); const svg = useRef<SVGSVGElement>(null); const wrap = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState(""); const [tool, setTool] = useState<Tool>(""); const [pending, setPending] = useState<Pt[]>([]); const [cursor, setCursor] = useState<Pt | null>(null); const [rectDraft, setRectDraft] = useState<{ a: Pt; b: Pt } | null>(null);
  const [draft, setDraftS] = useState<Record<string, Partial<Zone>>>({}); const draftRef = useRef<Record<string, Partial<Zone>>>({}); const drag = useRef<Drag | null>(null); const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [note, setNote] = useState(""); const [vtx, setVtx] = useState(-1); const focusId = useRef("");
  const rowsRef = useRef(zones.rows); rowsRef.current = zones.rows;
  const cur = (id: string): Zone | undefined => { const r = rowsRef.current.find((z) => z.id === id); return r ? { ...r, ...draftRef.current[id] } : undefined; };
  const view = zones.rows.filter((z) => z.cam === cam).map((z) => ({ ...z, ...draft[z.id] })); const z = view.find((x) => x.id === sel);
  const setGeo = (id: string, g: Partial<Zone>) => { draftRef.current = { ...draftRef.current, [id]: g }; setDraftS(draftRef.current); };
  const clearDraft = (id: string) => { const { [id]: _drop, ...rest } = draftRef.current; void _drop; draftRef.current = rest; setDraftS(rest); };
  const commit = async (id: string) => {
    clearTimeout(timers.current[id]); const g = draftRef.current[id]; if (!g) return; const keep = { ...g };
    try { await zones.c.update(id, keep); } catch (e) { toast({ kind: "danger", title: "Couldn't save the zone", body: e instanceof Error ? e.message : undefined }); } finally { if (draftRef.current[id] === g) clearDraft(id); }
  };
  const later = (id: string) => { clearTimeout(timers.current[id]); timers.current[id] = setTimeout(() => void commit(id), 350); };
  useEffect(() => () => { for (const id of Object.keys(draftRef.current)) void commit(id); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (focusId.current) { const el = svg.current?.querySelector<SVGElement>(`[data-zone="${focusId.current}"]`); if (el) { el.focus(); focusId.current = ""; } } });
  /** Pointer position in percent of the frame, via the SVG's own screen matrix (exact whatever the border, scaling or zoom). */
  const point = (e: { clientX: number; clientY: number }): Pt => {
    const el = svg.current!, m = el.getScreenCTM?.(); let x: number, y: number;
    if (m && el.createSVGPoint) { const q = el.createSVGPoint(); q.x = e.clientX; q.y = e.clientY; const u = q.matrixTransform(m.inverse()); x = (u.x / (400)) * 100; y = (u.y / 225) * 100; } else { const r = el.getBoundingClientRect(); x = ((e.clientX - r.left) / r.width) * 100; y = ((e.clientY - r.top) / r.height) * 100; }
    return [Math.min(100, Math.max(0, x)), Math.min(100, Math.max(0, y))];
  };
  const geo = (g: Zone) => ({ shape: g.shape, points: g.points, x: g.x, y: g.y, w: g.w, h: g.h });

  const create = async (shape: "rect" | "polygon", g: Partial<Zone>) => {
    const n = view.length + 1; const base = { rev: 1, cam, name: `Zone ${n}`, shape, points: [] as Pt[], x: 30, y: 30, w: 30, h: 30, mode: "Detect" as const, enabled: true, sensitivity: 50, retentionDays: 14, ...g };
    try { const made = await zones.c.create(base); setSel(made.id); focusId.current = made.id; setNote(`Added ${made.name}, ${describeGeo(made)}. Use the arrow keys to move it.`); } catch (e) { toast({ kind: "danger", title: "Couldn't add the zone", body: e instanceof Error ? e.message : undefined }); }
  };
  const addDefault = (shape: "rect" | "polygon") => void create(shape, shape === "rect" ? {} : { ...withPoints({ shape: "polygon" as const, points: [], x: 0, y: 0, w: 0, h: 0 }, [[35, 60], [50, 30], [65, 60]]) });
  const finishPolygon = (pts: Pt[]) => { setTool(""); setPending([]); setCursor(null); if (pts.length >= 3) void create("polygon", withPoints({ shape: "polygon" as const, points: [], x: 0, y: 0, w: 0, h: 0 }, pts)); else setNote("A polygon needs at least 3 corners. Nothing was added."); };
  const remove = async (id: string) => {
    const row = cur(id); if (!row) return; clearDraft(id); clearTimeout(timers.current[id]);
    try { await zones.c.remove(id); } catch (e) { toast({ kind: "danger", title: "Couldn't remove the zone", body: e instanceof Error ? e.message : undefined }); return; }
    setSel(""); setNote(`Removed ${row.name}.`); wrap.current?.focus();
    toast({ kind: "info", title: `Removed ${row.name}`, undo: () => { void zones.c.create(row as Omit<Zone, "id"> & { id: string }); } });
  };

  const onDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return; const p = point(e);
    if (tool === "rect") { svg.current?.setPointerCapture?.(e.pointerId); setRectDraft({ a: p, b: p }); return; }
    if (tool === "polygon") { if (pending.length >= 3 && Math.hypot((p[0] - pending[0][0]) * SX, (p[1] - pending[0][1]) * SY) < 8) finishPolygon(pending); else setPending([...pending, p]); return; }
    setSel(""); setVtx(-1);
  };
  const startDrag = (e: React.PointerEvent, mode: Drag["mode"], id: string, extra: Partial<Drag> = {}) => {
    if (e.button !== 0 || tool) return; e.stopPropagation(); const orig = cur(id); if (!orig) return; setSel(id); drag.current = { mode, id, orig, start: point(e), ...extra }; svg.current?.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const p = point(e); if (rectDraft) { setRectDraft({ ...rectDraft, b: p }); return; } if (tool === "polygon") { setCursor(p); return; }
    const d = drag.current; if (!d) return; const o = d.orig;
    const next = d.mode === "move" ? moveZone(o, p[0] - d.start[0], p[1] - d.start[1]) : d.mode === "corner" ? dragCorner(o, d.handle!, p[0], p[1]) : moveVertex(o, d.i!, p[0], p[1]);
    setGeo(d.id, geo(next));
  };
  const onUp = () => {
    if (rectDraft) { const r = rectBetween(rectDraft.a, rectDraft.b); setRectDraft(null); setTool(""); if (r.w >= MIN && r.h >= MIN) void create("rect", r); else setNote("That rectangle was too small. Nothing was added."); return; }
    const d = drag.current; drag.current = null; if (d && draftRef.current[d.id]) { void commit(d.id); const n = cur(d.id); if (n) setNote(`${n.name}: ${describeGeo(n)}`); }
  };
  const onCancel = () => { setRectDraft(null); const d = drag.current; drag.current = null; if (d) clearDraft(d.id); };
  const onKeyRoot = (e: React.KeyboardEvent) => { if (e.key === "Escape" && (tool || pending.length)) { setTool(""); setPending([]); setCursor(null); setNote("Drawing cancelled."); e.stopPropagation(); } else if (e.key === "Enter" && tool === "polygon" && pending.length >= 3) { e.preventDefault(); finishPolygon(pending); } };

  const onZoneKey = (e: React.KeyboardEvent, id: string) => {
    const row = cur(id); if (!row) return;
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); void remove(id); return; }
    if (e.key === "Escape") { setSel(""); return; }
    const n = keyEdit(row, e.key, { shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey }); if (!n) return; e.preventDefault(); setGeo(id, geo(n)); later(id); setNote(`${n.name}: ${describeGeo(n)}`);
  };
  const onVertexKey = (e: React.KeyboardEvent, id: string, i: number) => {
    const row = cur(id); if (!row) return; e.stopPropagation();
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); if (row.points.length <= 3) { setNote("A polygon needs at least 3 corners."); return; } const n = removeVertex(row, i); setGeo(id, geo(n)); void commit(id); setVtx(-1); setNote(`Removed corner ${i + 1}; ${n.points.length} corners left.`); focusId.current = id; return; }
    if (e.key === "Insert" || e.key === "+") { e.preventDefault(); const n = insertVertex(row, i); setGeo(id, geo(n)); void commit(id); setNote(`Added a corner after ${i + 1}; ${n.points.length} corners.`); return; }
    const st = arrowStep(e.key, e.ctrlKey || e.metaKey); if (!st) return; e.preventDefault(); const n = nudgeVertex(row, i, st[0], st[1]); setGeo(id, geo(n)); later(id); setNote(`Corner ${i + 1} at x ${Math.round(n.points[i][0])} y ${Math.round(n.points[i][1])}`);
  };
  const toggleShape = () => { if (!z) return; const n = z.shape === "rect" ? toPolygon(z) : toRect(z); setGeo(z.id, geo(n)); void commit(z.id); setNote(`${z.name} is now a ${n.shape === "rect" ? "rectangle" : "polygon"}.`); };
  const addCorner = () => { if (!z || z.shape !== "polygon") return; const n = insertVertex(z, vtx >= 0 ? vtx : z.points.length - 1); setGeo(z.id, geo(n)); void commit(z.id); setNote(`${n.points.length} corners.`); };

  const fill = (m: Zone["mode"]) => (m === "Detect" ? "var(--adm-c1)" : "var(--adm-c5)");
  const live = view.map((v) => `${v.name} (${v.mode}${v.enabled ? "" : ", off"})`).join(", ");
  return (
    <Panel title="Zone map" actions={<>
      <Btn sm onClick={() => addDefault("rect")}>Add rectangle</Btn><Btn sm onClick={() => addDefault("polygon")}>Add polygon</Btn>
      <Btn sm aria-pressed={tool === "rect"} onClick={() => { setTool(tool === "rect" ? "" : "rect"); setPending([]); }}>{tool === "rect" ? "Drawing rectangle: drag on the map" : "Draw rectangle"}</Btn>
      <Btn sm aria-pressed={tool === "polygon"} onClick={() => { setTool(tool === "polygon" ? "" : "polygon"); setPending([]); }}>{tool === "polygon" ? "Drawing polygon: click corners" : "Draw polygon"}</Btn>
      {tool === "polygon" && <Btn sm variant="primary" disabled={pending.length < 3} onClick={() => finishPolygon(pending)}>Finish polygon</Btn>}</>}>
      <div className="adm-stack">
        <div ref={wrap} tabIndex={-1} className="hg-zonewrap" onKeyDown={onKeyRoot}>
          <svg ref={svg} className={`hg-svg hg-zonemap${tool ? " is-drawing" : ""}`} viewBox="0 0 400 225" role="group" aria-label={`Detection zones for ${camName}: ${live || "none"}`} aria-describedby="hg-zone-help"
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onCancel} onDoubleClick={() => { if (tool === "polygon" && pending.length >= 3) finishPolygon(pending.slice(0, -1).length >= 3 ? pending.slice(0, -1) : pending); }}>
            {view.map((v) => (
              <g key={v.id}>
                <g data-zone={v.id} className={`hg-zone${sel === v.id ? " is-sel" : ""}${v.enabled ? "" : " is-off"}`} role="button" tabIndex={0} aria-pressed={sel === v.id} aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowRight Delete"
                  aria-label={`${v.name}, ${v.mode}${v.enabled ? "" : ", off"}, ${describeGeo(v)}, sensitivity ${v.sensitivity}, keep ${v.retentionDays} days`}
                  onFocus={() => { if (!drag.current) setSel(v.id); }} onBlur={() => { if (draftRef.current[v.id]) void commit(v.id); }} onKeyDown={(e) => onZoneKey(e, v.id)} onPointerDown={(e) => startDrag(e, "move", v.id)}>
                  <path d={pathOf(v, SX, SY)} style={{ fill: fill(v.mode), fillOpacity: v.enabled ? 0.3 : 0.08, stroke: fill(v.mode), strokeDasharray: v.enabled ? "0" : "6 4" }} /><text x={v.x * SX + 6} y={v.y * SY + 16}>{v.name}</text></g>
                {sel === v.id && !tool && <g className="hg-handles">
                  {v.shape === "rect" ? HANDLES.map((h) => <circle key={h} aria-hidden data-handle={h} className="hg-handle" r={5} cx={(h.includes("w") ? v.x : v.x + v.w) * SX} cy={(h.includes("n") ? v.y : v.y + v.h) * SY} onPointerDown={(e) => startDrag(e, "corner", v.id, { handle: h })} />)
                    : v.points.map(([a, b], i) => <circle key={i} data-vertex={i} className={`hg-handle${vtx === i ? " is-on" : ""}`} r={5} cx={a * SX} cy={b * SY} role="button" tabIndex={0} aria-label={`${v.name} corner ${i + 1} of ${v.points.length}, x ${Math.round(a)} y ${Math.round(b)}`} aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Delete Insert"
                      onFocus={() => setVtx(i)} onBlur={() => { if (draftRef.current[v.id]) void commit(v.id); }} onKeyDown={(e) => onVertexKey(e, v.id, i)} onPointerDown={(e) => startDrag(e, "vertex", v.id, { i })} />)}</g>}
              </g>))}
            {rectDraft && (() => { const r = rectBetween(rectDraft.a, rectDraft.b); return <rect className="hg-draft" x={r.x * SX} y={r.y * SY} width={r.w * SX} height={r.h * SY} />; })()}
            {tool === "polygon" && pending.length > 0 && <g><polyline className="hg-draft" points={[...pending, ...(cursor ? [cursor] : [])].map(([a, b]) => `${a * SX},${b * SY}`).join(" ")} />{pending.map(([a, b], i) => <circle key={i} className="hg-handle" r={i === 0 ? 6 : 4} cx={a * SX} cy={b * SY} />)}</g>}
          </svg>
        </div>
        <p id="hg-zone-help" className="hg-muted">Drag a zone to move it, drag a corner to resize. {HELP} To draw with a pointer use Draw rectangle or Draw polygon (double-click or Enter to finish, Escape to cancel); with a keyboard use Add rectangle or Add polygon, then the arrow keys.</p>
        <p className="hg-sr" role="status" aria-live="polite">{note}</p>
        {z ? <div className="hg-row hg-zonebar" role="group" aria-label={`Selected zone ${z.name}`}>
          <Editable label="Zone name" value={z.name} editor={{ type: "text", maxLength: 40 }} validate={(v) => (String(v).trim() ? null : "A name is required")} onSave={(v) => zones.save(z, "name", v)} />
          <Editable label="Mode" value={z.mode} editor={{ type: "select", options: opts("Detect", "Ignore") }} onSave={(v) => zones.save(z, "mode", v)} />
          <Editable label="Sensitivity" value={z.sensitivity} editor={{ type: "number", min: 0, max: 100 }} display={<span>Sensitivity {z.sensitivity}</span>} onSave={(v) => zones.save(z, "sensitivity", v)} />
          <Editable label="Retention days" value={z.retentionDays} editor={{ type: "number", min: 1, max: 365 }} display={<span>Keep {z.retentionDays} d</span>} validate={(v) => (Number(v) >= 1 ? null : "Keep at least one day")} onSave={(v) => zones.save(z, "retentionDays", v)} />
          <Editable label="Enabled" value={z.enabled} editor={{ type: "boolean" }} display={<Badge s={z.enabled ? "ok" : "info"}>{z.enabled ? "on" : "off"}</Badge>} onSave={(v) => zones.save(z, "enabled", v)} />
          <Btn sm onClick={toggleShape}>{z.shape === "rect" ? "Convert to polygon" : "Convert to rectangle"}</Btn>
          {z.shape === "polygon" && <Btn sm onClick={addCorner}>Add corner</Btn>}
          <Btn sm variant="ghost" onClick={() => void remove(z.id)}>Delete zone</Btn></div> : <p className="hg-muted">Select a zone on the map (or Tab to it) to edit its mode, sensitivity and retention here.</p>}
      </div>
    </Panel>
  );
}
