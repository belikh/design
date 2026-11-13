import { useEffect, useRef, useState } from "react";
import { C } from "@belikh/jupiter-ui/Charts.tsx";
import { clampPt, dist, panBy, screenToImage, viewBox, zoomAt, fitView, type Pt, type View } from "./lib/geometry.ts";
import { classIndex, describe, insertOnNearestEdge, minPts, moveBy, setVertex, bbox, type Ann, type Doc, type Kind } from "./lib/annotate.ts";

export type Tool = "select" | "box" | "point" | "polygon" | "polyline" | "pan";
export type FocusReq = { id: string; i: number; n: number } | null;

type Props = {
  doc: Doc; sel: string | null; tool: Tool; view: View; focusReq: FocusReq;
  onView: (v: View) => void; onSelect: (id: string | null) => void; onCreate: (kind: Kind, pts: Pt[]) => void; onToolDone: () => void;
  /** Live edit of one annotation (drags and nudges). The page turns a run of these into ONE undo entry. */
  onChange: (a: Ann, label: string) => void; onEnd: () => void; onDelete: (id: string) => void; onVertexDelete: (id: string, i: number) => void; onInsertAfter: (id: string, i: number) => void;
  onFocusVertex: (id: string, i: number) => void; onNotice: (msg: string) => void;
};
type Drag = { t: "pan"; sx: number; sy: number; v0: View; rw: number; rh: number } | { t: "move"; orig: Ann; start: Pt } | { t: "vertex"; orig: Ann; i: number } | { t: "box"; a: Pt };

const STEP = 5;
/** Nudge vector for an arrow key: 5 image px, Shift = 1 px, Ctrl = 20 px. */
const nudge = (e: React.KeyboardEvent): Pt | null => {
  const s = e.shiftKey ? 1 : e.ctrlKey ? 20 : STEP; return e.key === "ArrowLeft" ? [-s, 0] : e.key === "ArrowRight" ? [s, 0] : e.key === "ArrowUp" ? [0, -s] : e.key === "ArrowDown" ? [0, s] : null;
};

/** The "photo": a line drawing of a rack front, so the page needs no image asset. */
function Rack() {
  return (
    <g className="lab-rack" aria-hidden>
      <rect x="40" y="20" width="300" height="360" rx="6" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <g key={i}><rect x="56" y={36 + i * 42} width="268" height="34" rx="3" />{Array.from({ length: i === 0 ? 24 : 6 }, (_, k) => <rect key={k} x={66 + k * (i === 0 ? 10 : 22)} y={46 + i * 42} width="6" height="8" />)}<circle cx="308" cy={53 + i * 42} r="4" /></g>)}
      <path d="M340,150 C420,150 420,230 500,230 S560,300 600,300" /><path d="M340,170 C400,170 440,260 520,260 S580,330 620,330" /><rect x="470" y="40" width="130" height="80" rx="6" /><path d="M485,60 H585 M485,80 H560 M485,100 H575" />
    </g>
  );
}

export function AnnotCanvas(p: Props) {
  const { doc, sel, tool, view } = p; const W = doc.image.w, H = doc.image.h; const bounds = { w: W, h: H };
  const svg = useRef<SVGSVGElement>(null); const wrap = useRef<HTMLDivElement>(null); const drag = useRef<Drag | null>(null); const space = useRef(false);
  const [box, setBox] = useState<{ a: Pt; b: Pt } | null>(null); const [poly, setPoly] = useState<{ pts: Pt[]; cur: Pt } | null>(null); const polyRef = useRef(poly); polyRef.current = poly;
  const [px, setPx] = useState({ w: W, h: H }); const vb = viewBox(view, bounds);
  const k = Math.max(vb.w / (px.w || vb.w), vb.h / (px.h || vb.h)); // image units per CSS pixel
  const live = useRef(p); live.current = p;

  useEffect(() => { // measure the svg so handle sizes stay constant on screen
    const el = svg.current; if (!el) return; const measure = () => { const r = el.getBoundingClientRect(); if (r.width) setPx({ w: r.width, h: r.height }); }; measure();
    if (typeof ResizeObserver === "undefined") return; const ro = new ResizeObserver(measure); ro.observe(el); return () => ro.disconnect();
  }, []);
  useEffect(() => { // Ctrl/Cmd + wheel (and trackpad pinch) zooms about the pointer; needs a non-passive listener
    const el = svg.current; if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); const q = live.current; const r = el.getBoundingClientRect(); const at = toImage(e.clientX, e.clientY);
      q.onView(zoomAt(q.view, { w: q.doc.image.w, h: q.doc.image.h }, q.view.zoom * Math.exp(-e.deltaY * 0.002), at, (e.clientX - r.left) / (r.width || 1), (e.clientY - r.top) / (r.height || 1)));
    };
    el.addEventListener("wheel", onWheel, { passive: false }); return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { // keyboard users: move focus onto a vertex handle the page asked for
    if (!p.focusReq) return; const el = svg.current?.querySelector<SVGElement>(`[data-ann="${p.focusReq.id}"][data-v="${p.focusReq.i}"]`); el?.focus();
  }, [p.focusReq]);
  useEffect(() => { if (tool !== "polygon" && tool !== "polyline") setPoly(null); if (tool !== "box") setBox(null); }, [tool]);

  /** Client point to image point. Uses the SVG's own transform when it has one (handles letterboxing), else the plain view maths. */
  function toImage(cx: number, cy: number): Pt {
    const el = svg.current; const q = live.current; const m = el?.getScreenCTM?.();
    if (el && m) { const i = m.inverse(); return [i.a * cx + i.c * cy + i.e, i.b * cx + i.d * cy + i.f]; }
    return screenToImage(q.view, { w: q.doc.image.w, h: q.doc.image.h }, el?.getBoundingClientRect() ?? { left: 0, top: 0, width: 0, height: 0 }, cx, cy);
  }
  const at = (e: { clientX: number; clientY: number }) => toImage(e.clientX, e.clientY);
  const capture = (e: React.PointerEvent) => { try { svg.current?.setPointerCapture(e.pointerId); } catch { /* not supported (tests) */ } };

  const finishPoly = (pts: Pt[], kind: Kind) => {
    setPoly(null);
    if (pts.length < minPts(kind)) p.onNotice(`A ${kind} needs at least ${minPts(kind)} points; nothing was added.`); else p.onCreate(kind, pts);
    p.onToolDone();
  };
  const addPolyVertex = (pt: Pt, kind: Kind) => {
    const cur = polyRef.current?.pts ?? []; const c = clampPt(pt, bounds);
    if (cur.length && dist(cur[cur.length - 1], c) < 3 * k) return; // the second click of a double click
    if (kind === "polygon" && cur.length >= 3 && dist(cur[0], c) < 10 * k) { finishPoly(cur, kind); return; }
    const next = { pts: [...cur, c], cur: c }; polyRef.current = next; setPoly(next);
  };

  const down = (e: React.PointerEvent) => {
    if (e.button === 1 || tool === "pan" || (e.button === 0 && space.current)) { capture(e); const r = svg.current!.getBoundingClientRect(); drag.current = { t: "pan", sx: e.clientX, sy: e.clientY, v0: view, rw: r.width || 1, rh: r.height || 1 }; return; }
    if (e.button !== 0) return; const pt = at(e);
    if (tool === "select") { p.onSelect(null); if (view.zoom > 1) { capture(e); const r = svg.current!.getBoundingClientRect(); drag.current = { t: "pan", sx: e.clientX, sy: e.clientY, v0: view, rw: r.width || 1, rh: r.height || 1 }; } }
    else if (tool === "point") { p.onCreate("point", [clampPt(pt, bounds)]); p.onToolDone(); }
    else if (tool === "box") { capture(e); drag.current = { t: "box", a: clampPt(pt, bounds) }; setBox({ a: clampPt(pt, bounds), b: clampPt(pt, bounds) }); }
    else addPolyVertex(pt, tool);
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current; const pt = at(e);
    if (!d) { if (polyRef.current) setPoly({ pts: polyRef.current.pts, cur: pt }); return; }
    if (d.t === "pan") p.onView(panBy(d.v0, bounds, -((e.clientX - d.sx) / d.rw) * vb.w, -((e.clientY - d.sy) / d.rh) * vb.h));
    else if (d.t === "move") { const s = d.start; p.onChange(moveBy(d.orig, pt[0] - s[0], pt[1] - s[1], bounds), "Move annotation"); }
    else if (d.t === "vertex") p.onChange(setVertex(d.orig, d.i, pt, bounds), "Move vertex");
    else if (d.t === "box") setBox({ a: d.a, b: clampPt(pt, bounds) });
  };
  const up = (e: React.PointerEvent) => {
    const d = drag.current; drag.current = null; if (!d) return;
    if (d.t === "move" || d.t === "vertex") p.onEnd();
    else if (d.t === "box") { const b = clampPt(at(e), bounds); setBox(null); if (Math.abs(b[0] - d.a[0]) > 6 * k && Math.abs(b[1] - d.a[1]) > 6 * k) { p.onCreate("box", [d.a, b]); p.onToolDone(); } }
  };
  const cancel = () => { drag.current = null; setBox(null); p.onEnd(); };

  const wrapKey = (e: React.KeyboardEvent) => {
    if (e.key === " " && e.target === e.currentTarget) space.current = true;
    if (e.key === "Escape") { if (polyRef.current) { e.preventDefault(); setPoly(null); } else if (box) { setBox(null); drag.current = null; } return; }
    if (polyRef.current && (tool === "polygon" || tool === "polyline")) {
      if (e.key === "Enter") { e.preventDefault(); finishPoly(polyRef.current.pts, tool); return; }
      if (e.key === "Backspace") { e.preventDefault(); const pts = polyRef.current.pts.slice(0, -1); const n = pts.length ? { pts, cur: polyRef.current.cur } : null; polyRef.current = n; setPoly(n); return; }
    }
    if (e.target !== e.currentTarget) return;
    const n = nudge(e);
    if (n) { e.preventDefault(); const f = 0.1; p.onView(panBy(view, bounds, n[0] * (vb.w * f) / STEP, n[1] * (vb.h * f) / STEP)); }
    else if (e.key === "+" || e.key === "=") { e.preventDefault(); p.onView(zoomAt(view, bounds, view.zoom * 1.25, [view.cx, view.cy], 0.5, 0.5)); }
    else if (e.key === "-" || e.key === "_") { e.preventDefault(); p.onView(zoomAt(view, bounds, view.zoom / 1.25, [view.cx, view.cy], 0.5, 0.5)); }
    else if (e.key === "0") { e.preventDefault(); p.onView(fitView(bounds)); }
  };

  const annKey = (e: React.KeyboardEvent, a: Ann) => {
    const n = nudge(e);
    if (n) { e.preventDefault(); e.stopPropagation(); if (e.altKey && a.kind === "box") p.onChange(setVertex(a, 1, [a.pts[1][0] + n[0], a.pts[1][1] + n[1]], bounds), "Resize annotation"); else p.onChange(moveBy(a, n[0], n[1], bounds), "Move annotation"); return; }
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); e.stopPropagation(); p.onDelete(a.id); }
    else if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); p.onFocusVertex(a.id, 0); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); wrap.current?.focus(); }
  };
  const vtxKey = (e: React.KeyboardEvent, a: Ann, i: number) => {
    const n = nudge(e); const go = (j: number) => svg.current?.querySelector<SVGElement>(`[data-ann="${a.id}"][data-v="${j}"]`)?.focus();
    if (n) { e.preventDefault(); e.stopPropagation(); p.onChange(setVertex(a, i, [a.pts[i][0] + n[0], a.pts[i][1] + n[1]], bounds), "Move vertex"); }
    else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); e.stopPropagation(); p.onVertexDelete(a.id, i); }
    else if (e.key === "Insert" || e.key === "+") { e.preventDefault(); e.stopPropagation(); p.onInsertAfter(a.id, i); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); svg.current?.querySelector<SVGElement>(`[data-annid="${a.id}"]`)?.focus(); }
    else if (e.key === "Tab" && !e.shiftKey && i < a.pts.length - 1) { e.preventDefault(); e.stopPropagation(); go(i + 1); }
    else if (e.key === "Tab" && e.shiftKey) { e.preventDefault(); e.stopPropagation(); if (i > 0) go(i - 1); else svg.current?.querySelector<SVGElement>(`[data-annid="${a.id}"]`)?.focus(); }
  };

  const strokeW = { vectorEffect: "non-scaling-stroke" } as const;
  const selAnn = doc.anns.find((a) => a.id === sel);
  const pts = (a: Ann) => a.pts.map((q) => q.join(",")).join(" ");
  const fs = { fontSize: `calc(var(--jp-fs-xs) * ${k})` };
  const drawing = tool !== "select" && tool !== "pan";
  return (
    <div ref={wrap} className="lab-imgwrap" role="group" tabIndex={0} aria-label={`Image canvas, ${doc.image.name}, ${doc.image.w} by ${doc.image.h}. Arrow keys pan, plus and minus zoom, 0 fits.`}
      onKeyDown={wrapKey} onKeyUp={(e) => { if (e.key === " ") space.current = false; }} onDoubleClick={() => { const q = polyRef.current; if (q && (tool === "polygon" || tool === "polyline")) finishPoly(q.pts, tool); }}>
      <svg ref={svg} className={`lab-img ${drawing ? "is-draw" : ""} ${tool === "pan" ? "is-pan" : ""}`} style={{ aspectRatio: `${W} / ${H}` }} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} data-testid="annot-svg"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel}>
        <rect width={W} height={H} className="lab-img-bg" />
        {doc.image.url ? <image href={doc.image.url} width={W} height={H} preserveAspectRatio="none" /> : <Rack />}
        {doc.anns.map((a) => {
          const col = C(classIndex(doc.classes, a.cls)); const bb = bbox(a); const on = sel === a.id;
          return (
            <g key={a.id} data-annid={a.id} className={`lab-ann lab-ann--${a.kind} ${on ? "is-sel" : ""}`} style={{ color: col }} tabIndex={0} role="button" aria-pressed={on} aria-label={describe(a)}
              onFocus={() => p.onSelect(a.id)} onKeyDown={(e) => annKey(e, a)}
              onPointerDown={(e) => { if (tool !== "select" || e.button !== 0) return; e.stopPropagation(); capture(e); p.onSelect(a.id); drag.current = { t: "move", orig: a, start: at(e) }; }}
              onDoubleClick={(e) => { if (tool !== "select") return; e.stopPropagation(); const r = insertOnNearestEdge(a, at(e), bounds); if (r) { p.onChange(r.ann, "Add vertex"); p.onEnd(); } }}>
              {a.kind === "box" && <rect x={a.pts[0][0]} y={a.pts[0][1]} width={bb.w} height={bb.h} rx="3" {...strokeW} />}
              {a.kind === "point" && <><circle cx={a.pts[0][0]} cy={a.pts[0][1]} r={9 * k} /><circle cx={a.pts[0][0]} cy={a.pts[0][1]} r={2 * k} className="lab-dot" /></>}
              {a.kind === "polygon" && <polygon points={pts(a)} {...strokeW} />}
              {a.kind === "polyline" && <><polyline points={pts(a)} fill="none" {...strokeW} /><polyline points={pts(a)} className="lab-hit" fill="none" {...strokeW} /></>}
              <text x={bb.x + (a.kind === "point" ? 12 * k : 4 * k)} y={bb.y + (a.kind === "point" ? 4 * k : -5 * k)} style={fs}>{a.cls}</text>
            </g>
          );
        })}
        {box && <rect className="lab-draft" x={Math.min(box.a[0], box.b[0])} y={Math.min(box.a[1], box.b[1])} width={Math.abs(box.b[0] - box.a[0])} height={Math.abs(box.b[1] - box.a[1])} {...strokeW} />}
        {poly && <g className="lab-draft-g" aria-hidden><polyline points={[...poly.pts, poly.cur].map((q) => q.join(",")).join(" ")} className="lab-draft" fill="none" {...strokeW} />{poly.pts.map((q, i) => <circle key={i} cx={q[0]} cy={q[1]} r={(i === 0 && tool === "polygon" ? 6 : 3.5) * k} className="lab-vtx-dot" />)}</g>}
        {selAnn && tool === "select" && <g className="lab-vtxs" style={{ color: C(classIndex(doc.classes, selAnn.cls)) }}>
          {selAnn.kind !== "point" && selAnn.pts.map((q, i) => (
            <g key={i} className="lab-vtx" data-ann={selAnn.id} data-v={i} tabIndex={-1} role="button" aria-label={`Vertex ${i + 1} of ${selAnn.pts.length} at ${Math.round(q[0])}, ${Math.round(q[1])}. Arrows move, Insert adds, Delete removes, Escape returns.`}
              onKeyDown={(e) => vtxKey(e, selAnn, i)}
              onPointerDown={(e) => { if (e.button !== 0) return; e.stopPropagation(); capture(e); (e.currentTarget as SVGElement).focus(); drag.current = { t: "vertex", orig: selAnn, i }; }}>
              <circle cx={q[0]} cy={q[1]} r={12 * k} className="lab-vtx-hit" /><circle cx={q[0]} cy={q[1]} r={5 * k} className="lab-vtx-dot" />
            </g>))}
        </g>}
      </svg>
      <span className="lab-sr" aria-live="polite">{poly ? `${poly.pts.length} points placed. Enter finishes, Escape cancels.` : ""}</span>
    </div>
  );
}
