import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as RPE } from "react";
import { Btn } from "@belikh/jupiter-ui/kit.tsx";
import { Checkbox, Segmented } from "@belikh/jupiter-ui/inputs.tsx";
import type { Pt } from "./geometry.ts";
import { pointCount, signatureOk, strokesToSvg, inkLength, type Stroke } from "./ink.ts";
import { Note, Row, Stack } from "./ui.tsx";

/** Canvas that records strokes as data. Pointer drawing plus a keyboard pen (arrows move, Space lifts/lowers). */
export function InkCanvas({ strokes, onChange, width = 480, height = 200, color, lineWidth, tool = "pen", label, guide, onPen }: { strokes: Stroke[]; onChange: (s: Stroke[]) => void; width?: number; height?: number; color: string; lineWidth: number; tool?: "pen" | "eraser"; label: string; guide?: boolean; onPen?: (down: boolean) => void }) {
  const ref = useRef<HTMLCanvasElement>(null); const live = useRef<Stroke | null>(null); const [pen, setPen] = useState<{ p: Pt; down: boolean }>({ p: { x: width / 2, y: height / 2 }, down: false }); const [focused, setFocused] = useState(false);
  const css = useRef({ line: "", bg: "" });
  /** Canvas and exported SVG cannot read var(); resolve the colour once, when the stroke starts. */
  const resolved = () => { const cv = ref.current; if (!cv) return color; cv.style.color = color; return getComputedStyle(cv).color || color; };
  const draw = useCallback((all: Stroke[], extra?: Stroke | null) => {
    const cv = ref.current; const ctx = cv?.getContext?.("2d"); if (!cv || !ctx) return;
    const cs = getComputedStyle(cv); css.current = { line: cs.getPropertyValue("--jp-border").trim(), bg: cs.getPropertyValue("--jp-surface-raised").trim() };
    ctx.clearRect(0, 0, cv.width, cv.height); ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (guide) { ctx.strokeStyle = css.current.line || "gray"; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(16, height - 40); ctx.lineTo(width - 16, height - 40); ctx.stroke(); ctx.setLineDash([]); }
    for (const s of [...all, ...(extra ? [extra] : [])]) { if (!s.pts.length) continue; ctx.globalCompositeOperation = s.erase ? "destination-out" : "source-over"; ctx.strokeStyle = s.color; ctx.lineWidth = s.width; ctx.beginPath(); s.pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); if (s.pts.length === 1) ctx.lineTo(s.pts[0].x + 0.01, s.pts[0].y); ctx.stroke(); }
    ctx.globalCompositeOperation = "source-over";
  }, [guide, height, width]);
  useEffect(() => draw(strokes), [strokes, draw]);
  const pos = (e: RPE) => { const r = e.currentTarget.getBoundingClientRect(); return { x: ((e.clientX - r.left) / (r.width || width)) * width, y: ((e.clientY - r.top) / (r.height || height)) * height }; };
  const down = (e: RPE<HTMLCanvasElement>) => { e.currentTarget.setPointerCapture?.(e.pointerId); live.current = { pts: [pos(e)], color: resolved(), width: lineWidth, erase: tool === "eraser" }; draw(strokes, live.current); };
  const move = (e: RPE<HTMLCanvasElement>) => { if (!live.current) return; live.current.pts.push(pos(e)); draw(strokes, live.current); };
  const up = () => { if (live.current) { onChange([...strokes, live.current]); live.current = null; } };
  const keyDown = (e: KeyboardEvent<HTMLCanvasElement>) => {
    const step = e.shiftKey ? 24 : 8; const m: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (!pen.down) { live.current = { pts: [pen.p], color: resolved(), width: lineWidth, erase: tool === "eraser" }; } else up(); setPen({ ...pen, down: !pen.down }); onPen?.(!pen.down); return; }
    if (!m[e.key]) return; e.preventDefault(); const p = { x: Math.max(0, Math.min(width, pen.p.x + m[e.key][0])), y: Math.max(0, Math.min(height, pen.p.y + m[e.key][1])) }; if (pen.down && live.current) { live.current.pts.push(p); draw(strokes, live.current); } setPen({ ...pen, p });
  };
  return (
    <div className="lab-ink" style={{ aspectRatio: `${width} / ${height}` }}>
      <canvas ref={ref} width={width} height={height} tabIndex={0} aria-label={`${label}. Draw with a pointer, or use the arrow keys to move the pen and Space to put it down or lift it.`} role="application" className="lab-ink__cv" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} onKeyDown={keyDown} onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); if (pen.down) { up(); setPen({ ...pen, down: false }); } }} />
      {focused && <span className={`lab-ink__pen ${pen.down ? "is-down" : ""}`} aria-hidden style={{ insetInlineStart: `${(pen.p.x / width) * 100}%`, insetBlockStart: `${(pen.p.y / height) * 100}%` }} />}
    </div>
  );
}

const SCRIPT = `"Segoe Script", "Brush Script MT", "Lucida Handwriting", cursive`;
export function SignaturePad({ onAccept }: { onAccept?: (svgOrText: string) => void }) {
  const [mode, setMode] = useState<"draw" | "type">("draw"); const [strokes, setStrokes] = useState<Stroke[]>([]); const [redo, setRedo] = useState<Stroke[]>([]); const [typed, setTyped] = useState(""); const [agree, setAgree] = useState(false); const [accepted, setAccepted] = useState<{ at: string; svg: string; kind: string } | null>(null);
  const ok = mode === "draw" ? signatureOk(strokes) : typed.trim().length >= 2;
  const accept = () => { const at = new Date().toISOString().slice(0, 16).replace("T", " "); const svg = mode === "draw" ? strokesToSvg(strokes, 480, 200) : typed.trim(); setAccepted({ at, svg, kind: mode }); onAccept?.(svg); };
  return (
    <Stack>
      <Segmented label="Signature method" value={mode} onChange={(m) => { setMode(m); setAccepted(null); }} options={[{ value: "draw", label: "Draw" }, { value: "type", label: "Type" }]} />
      {mode === "draw" ? <>
        <InkCanvas strokes={strokes} onChange={(s) => { setStrokes(s); setRedo([]); setAccepted(null); }} color="currentColor" lineWidth={2.5} label="Signature pad" guide />
        <Row><Btn sm icon="undo" disabled={!strokes.length} onClick={() => { setRedo((r) => [...r, strokes.at(-1)!]); setStrokes(strokes.slice(0, -1)); }}>Undo stroke</Btn><Btn sm disabled={!redo.length} onClick={() => { setStrokes([...strokes, redo.at(-1)!]); setRedo(redo.slice(0, -1)); }}>Redo</Btn><Btn sm variant="ghost" disabled={!strokes.length} onClick={() => { setStrokes([]); setRedo([]); }}>Clear</Btn><span className="lab-note" aria-live="polite">{strokes.length} stroke{strokes.length === 1 ? "" : "s"}, {Math.round(inkLength(strokes))} units of ink{strokes.length && !ok ? " (a little more, please)" : ""}</span></Row></>
        : <><label className="lab-field"><span className="jp-label">Type your full name</span><input className="jp-input" value={typed} onChange={(e) => { setTyped(e.target.value); setAccepted(null); }} /></label><div className="lab-typedsig" style={{ fontFamily: SCRIPT }} aria-hidden>{typed || "Your name"}</div></>}
      <Checkbox checked={agree} onChange={setAgree} label="I agree this is my signature for this document" />
      <Row><Btn variant="primary" disabled={!ok || !agree} onClick={accept}>Accept signature</Btn>{accepted && <span className="lab-ok" role="status">Signed {accepted.at} ({accepted.kind === "draw" ? `${pointCount(strokes)} points captured` : "typed"})</span>}</Row>
    </Stack>
  );
}

const COLOURS = ["currentColor", "var(--adm-c1)", "var(--adm-c2)", "var(--adm-c3)", "var(--adm-c4)", "var(--adm-c5)"];
export function DrawingCanvas() {
  const [strokes, setStrokes] = useState<Stroke[]>([]); const [redo, setRedo] = useState<Stroke[]>([]); const [color, setColor] = useState(COLOURS[1]); const [w, setW] = useState(4); const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const svg = useMemo(() => strokesToSvg(strokes, 480, 280), [strokes]);
  return (
    <Stack>
      <Row>
        <Segmented label="Tool" value={tool} onChange={setTool} options={[{ value: "pen", label: "Pen" }, { value: "eraser", label: "Eraser" }]} />
        <div className="lab-swatches" role="radiogroup" aria-label="Ink colour">{COLOURS.map((c, i) => <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={`Colour ${i + 1}`} style={{ background: c === "currentColor" ? "var(--jp-text)" : c }} className={color === c ? "is-on" : ""} onClick={() => { setColor(c); setTool("pen"); }} />)}</div>
        <label className="lab-field lab-inline"><span className="jp-label">Width {w}</span><input type="range" min={1} max={24} value={w} onChange={(e) => setW(Number(e.target.value))} /></label>
      </Row>
      <InkCanvas strokes={strokes} onChange={(s) => { setStrokes(s); setRedo([]); }} width={480} height={280} color={color} lineWidth={tool === "eraser" ? w * 3 : w} tool={tool} label="Drawing canvas" />
      <Row><Btn sm icon="undo" disabled={!strokes.length} onClick={() => { setRedo((r) => [...r, strokes.at(-1)!]); setStrokes(strokes.slice(0, -1)); }}>Undo</Btn><Btn sm disabled={!redo.length} onClick={() => { setStrokes([...strokes, redo.at(-1)!]); setRedo(redo.slice(0, -1)); }}>Redo</Btn><Btn sm variant="ghost" disabled={!strokes.length} onClick={() => { setStrokes([]); setRedo([]); }}>Clear</Btn>
        <a className={`jp-btn jp-btn--sm jp-btn--secondary ${strokes.length ? "" : "is-disabled"}`} aria-disabled={!strokes.length} href={strokes.length ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : undefined} download="drawing.svg">Export SVG</a><span className="lab-note" aria-live="polite">{strokes.length} stroke{strokes.length === 1 ? "" : "s"}</span></Row>
      <Note>Eraser strokes are kept in the history so Undo restores what they removed; the SVG export includes only visible ink strokes (eraser results are not baked in).</Note>
    </Stack>
  );
}
