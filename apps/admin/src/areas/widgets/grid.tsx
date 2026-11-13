import { useCallback, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { Btn } from "@belikh/jupiter-ui/kit.tsx";
import { colName, computeSheet, fillRange, isErr, key, pasteTSV, show, toTSV, type Raw, type Rect } from "./formula.ts";
import { Note, Row, Stack } from "./ui.tsx";

const COLS = 8, ROWS = 12;
export const DEMO_SHEET: Raw = {
  A1: "Item", B1: "Qty", C1: "Unit", D1: "Total", A2: "Rack rails", B2: "4", C2: "28.5", D2: "=B2*C2", A3: "Patch leads", B3: "24", C3: "3.2", D3: "=B3*C3",
  A4: "Switch 24p", B4: "2", C4: "412", D4: "=B4*C4", A5: "UPS 1500VA", B5: "1", C5: "689", D5: "=B5*C5", A6: "Labels", B6: "1", C6: "9.9", D6: "=B6*C6",
  A8: "Subtotal", D8: "=SUM(D2:D6)", A9: "GST 10%", D9: "=D8*10%", A10: "Total", D10: "=D8+D9", B8: "Items", C8: "=COUNT(B2:B6)",
};
const norm = (a: { r: number; c: number }, b: { r: number; c: number }): Rect => ({ r0: Math.min(a.r, b.r), c0: Math.min(a.c, b.c), r1: Math.max(a.r, b.r), c1: Math.max(a.c, b.c) });

export function SpreadsheetGrid({ initial = DEMO_SHEET }: { initial?: Raw }) {
  const [raw, setRaw] = useState<Raw>(initial); const [hist, setHist] = useState<Raw[]>([]); const [redo, setRedo] = useState<Raw[]>([]);
  const [anchor, setAnchor] = useState({ r: 0, c: 0 }); const [focus, setFocus] = useState({ r: 0, c: 0 }); const [editKey, setEditKey] = useState<string | null>(null); const [draft, setDraft] = useState("");
  const [fillTo, setFillTo] = useState<Rect | null>(null); const dragging = useRef<"select" | "fill" | null>(null); const clip = useRef<{ text: string; origin: { row: number; col: number } } | null>(null);
  const [msg, setMsg] = useState("");
  const computed = useMemo(() => computeSheet(raw), [raw]); const rect = norm(anchor, focus); const gridRef = useRef<HTMLDivElement>(null);
  const commit = useCallback((patch: Raw) => { setHist((h) => [...h.slice(-49), raw]); setRedo([]); setRaw((r) => { const n = { ...r }; for (const [k, v] of Object.entries(patch)) { if (v === "") delete n[k]; else n[k] = v; } return n; }); }, [raw]);
  const undo = () => { const p = hist.at(-1); if (!p) return; setRedo((r) => [...r, raw]); setRaw(p); setHist((h) => h.slice(0, -1)); setMsg("Undone"); };
  const redoIt = () => { const n = redo.at(-1); if (!n) return; setHist((h) => [...h, raw]); setRaw(n); setRedo((r) => r.slice(0, -1)); setMsg("Redone"); };
  const move = (dr: number, dc: number, extend: boolean) => { const f = { r: Math.max(0, Math.min(ROWS - 1, focus.r + dr)), c: Math.max(0, Math.min(COLS - 1, focus.c + dc)) }; setFocus(f); if (!extend) setAnchor(f); };
  const focusCell = () => window.setTimeout(() => gridRef.current?.focus(), 0);
  const startEdit = (k: string, initialText?: string) => { setEditKey(k); setDraft(initialText ?? raw[k] ?? ""); };
  const finish = (save: boolean, then?: [number, number]) => { if (editKey && save && draft !== (raw[editKey] ?? "")) commit({ [editKey]: draft }); setEditKey(null); if (then) move(then[0], then[1], false); focusCell(); };
  const clear = () => { const p: Raw = {}; for (let r = rect.r0; r <= rect.r1; r++) for (let c = rect.c0; c <= rect.c1; c++) p[key(c, r)] = ""; commit(p); };
  const fill = (dir: "down" | "right") => { const src: Rect = dir === "down" ? { ...rect, r1: rect.r0 } : { ...rect, c1: rect.c0 }; const target = rect; if (dir === "down" && rect.r0 === rect.r1) { commit(fillRange(raw, { r0: rect.r0, c0: rect.c0, r1: rect.r0, c1: rect.c1 }, { ...rect, r1: Math.min(ROWS - 1, rect.r0 + 1) })); move(1, 0, false); return; } commit(fillRange(raw, src, target)); setMsg(`Filled ${dir}`); };
  const doCopy = (cut = false) => { const text = toTSV(raw, computed, rect, true); clip.current = { text, origin: { row: rect.r0, col: rect.c0 } }; void navigator.clipboard?.writeText(text).catch(() => undefined); setMsg(`${cut ? "Cut" : "Copied"} ${(rect.r1 - rect.r0 + 1) * (rect.c1 - rect.c0 + 1)} cells`); return text; };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (editKey) return; const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); fill("down"); return; } if (mod && e.key.toLowerCase() === "r") { e.preventDefault(); fill("right"); return; }
    if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redoIt() : undo(); return; } if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redoIt(); return; }
    if (mod && e.key.toLowerCase() === "a") { e.preventDefault(); setAnchor({ r: 0, c: 0 }); setFocus({ r: ROWS - 1, c: COLS - 1 }); return; }
    if (mod) return;
    const arrows: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (arrows[e.key]) { e.preventDefault(); move(...arrows[e.key], e.shiftKey); }
    else if (e.key === "Tab") { e.preventDefault(); move(0, e.shiftKey ? -1 : 1, false); }
    else if (e.key === "Enter" || e.key === "F2") { e.preventDefault(); startEdit(key(focus.c, focus.r)); }
    else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); clear(); }
    else if (e.key === "Home") { e.preventDefault(); const f = { r: focus.r, c: 0 }; setFocus(f); if (!e.shiftKey) setAnchor(f); }
    else if (e.key.length === 1) { e.preventDefault(); startEdit(key(focus.c, focus.r), e.key); }
  };
  const onPaste = (e: ClipboardEvent) => { if (editKey) return; e.preventDefault(); const text = e.clipboardData.getData("text/plain"); if (!text) return; const own = clip.current && clip.current.text === text ? clip.current.origin : undefined; const p = pasteTSV(text, { row: rect.r0, col: rect.c0 }, own); const ok: Raw = {}; for (const [k, v] of Object.entries(p)) { const m = /^([A-Z]+)(\d+)$/.exec(k)!; const col = [...m[1]].reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1; if (col < COLS && Number(m[2]) <= ROWS) ok[k] = v; } commit(ok); setMsg(`Pasted ${Object.keys(ok).length} cells`); };
  const onCopy = (e: ClipboardEvent) => { if (editKey) return; e.preventDefault(); e.clipboardData.setData("text/plain", doCopy()); };
  const onCut = (e: ClipboardEvent) => { if (editKey) return; e.preventDefault(); e.clipboardData.setData("text/plain", doCopy(true)); clear(); };
  const inRect = (r: number, c: number, x: Rect) => r >= x.r0 && r <= x.r1 && c >= x.c0 && c <= x.c1;
  const enter = (r: number, c: number) => { if (dragging.current === "select") setFocus({ r, c }); else if (dragging.current === "fill") setFillTo({ r0: rect.r0, c0: rect.c0, r1: Math.max(rect.r1, r), c1: rect.c1 }); };
  const endDrag = () => { if (dragging.current === "fill" && fillTo) { commit(fillRange(raw, rect, fillTo)); setAnchor({ r: fillTo.r0, c: fillTo.c0 }); setFocus({ r: fillTo.r1, c: fillTo.c1 }); setMsg("Filled down"); } dragging.current = null; setFillTo(null); window.removeEventListener("mouseup", endDrag); };
  const begin = (kind: "select" | "fill") => { dragging.current = kind; window.addEventListener("mouseup", endDrag); };
  const activeKey = key(focus.c, focus.r); const cellValue = computed[activeKey];
  const sel = useMemo(() => { const nums: number[] = []; for (let r = rect.r0; r <= rect.r1; r++) for (let c = rect.c0; c <= rect.c1; c++) { const v = computed[key(c, r)]; if (typeof v === "number") nums.push(v); } return nums; }, [computed, rect.r0, rect.r1, rect.c0, rect.c1]);
  return (
    <Stack>
      <Row>
        <label className="p3-formulabar"><span className="p3-cellname">{activeKey}</span><span className="p3-sr">Formula bar</span>
          <input className="jp-input p3-mono" aria-label="Formula bar" value={editKey ? draft : raw[activeKey] ?? ""} onFocus={() => !editKey && startEdit(activeKey)} onChange={(e) => { if (!editKey) setEditKey(activeKey); setDraft(e.target.value); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); finish(true, [1, 0]); } if (e.key === "Escape") finish(false); }} onBlur={() => editKey === activeKey && finish(true)} /></label>
        <Btn sm icon="undo" onClick={undo} disabled={!hist.length}>Undo</Btn><Btn sm onClick={redoIt} disabled={!redo.length}>Redo</Btn><Btn sm onClick={() => fill("down")}>Fill down</Btn><Btn sm onClick={() => fill("right")}>Fill right</Btn>
      </Row>
      <div className="p3-sheetwrap">
        <div ref={gridRef} className="p3-sheet" role="grid" aria-label="Spreadsheet" aria-rowcount={ROWS + 1} aria-colcount={COLS + 1} aria-multiselectable tabIndex={0} aria-activedescendant={`p3sh-${activeKey}`} onKeyDown={onKey} onPaste={onPaste} onCopy={onCopy} onCut={onCut} onMouseUp={() => undefined}>
          <div role="row" className="p3-sheet__row"><span role="columnheader" className="p3-sheet__corner"><span className="p3-sr">Row</span></span>{Array.from({ length: COLS }, (_, c) => <span key={c} role="columnheader" className={`p3-sheet__h ${c >= rect.c0 && c <= rect.c1 ? "is-on" : ""}`}>{colName(c)}</span>)}</div>
          {Array.from({ length: ROWS }, (_, r) => (
            <div role="row" key={r} className="p3-sheet__row" aria-rowindex={r + 2}>
              <span role="rowheader" className={`p3-sheet__h ${r >= rect.r0 && r <= rect.r1 ? "is-on" : ""}`}>{r + 1}</span>
              {Array.from({ length: COLS }, (_, c) => { const k = key(c, r); const v = computed[k]; const selected = inRect(r, c, rect); const isActive = r === focus.r && c === focus.c; const err = isErr(v); const text = show(v); const isNum = typeof v === "number";
                return (
                  <span key={k} id={`p3sh-${k}`} role="gridcell" aria-selected={selected} aria-colindex={c + 2} aria-label={`${k}${raw[k]?.startsWith("=") ? ", formula" : ""}`} className={`p3-cell ${selected ? "is-sel" : ""} ${isActive ? "is-active" : ""} ${err ? "is-err" : ""} ${isNum ? "is-num" : ""} ${fillTo && inRect(r, c, fillTo) && !selected ? "is-fill" : ""}`}
                    onMouseDown={(e) => { if (editKey === k) return; if (editKey) finish(true); const f = { r, c }; setFocus(f); if (!e.shiftKey) setAnchor(f); begin("select"); gridRef.current?.focus(); }} onMouseEnter={() => enter(r, c)} onDoubleClick={() => startEdit(k)}>
                    {editKey === k ? <input className="p3-cell__input" aria-label={`Edit ${k}`} autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => finish(true)} onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") { e.preventDefault(); finish(true, [1, 0]); } else if (e.key === "Tab") { e.preventDefault(); finish(true, [0, e.shiftKey ? -1 : 1]); } else if (e.key === "Escape") { e.preventDefault(); finish(false); } }} /> : <span className="p3-cell__v" title={err ? "Formula error" : undefined}>{text}</span>}
                    {r === rect.r1 && c === rect.c1 && !editKey && <span className="p3-fill" aria-hidden onMouseDown={(e) => { e.stopPropagation(); begin("fill"); }} />}
                  </span>);
              })}
            </div>))}
        </div>
      </div>
      <Row className="p3-sheetstat"><span className="p3-note" role="status">{msg || `Selected ${activeKey}${rect.r0 !== rect.r1 || rect.c0 !== rect.c1 ? `:${key(rect.c1, rect.r1)}` : ""}`}</span>{sel.length > 1 && <span className="p3-note">Sum {Math.round(sel.reduce((a, b) => a + b, 0) * 100) / 100} · Average {Math.round((sel.reduce((a, b) => a + b, 0) / sel.length) * 100) / 100} · Count {sel.length}</span>}{isErr(cellValue) && <span className="p3-bad">{cellValue.error}</span>}</Row>
      <Note>Click or drag to select; arrows (Shift extends), Enter or typing edits, Delete clears, Ctrl+C / X / V copy, cut and paste (formulas shift when pasted inside the grid; tab-separated text from other apps works), Ctrl+D / Ctrl+R fill, or drag the handle at the corner of the selection. Formulas: + - * / ^ &amp; comparisons, SUM AVERAGE MIN MAX COUNT ROUND IF and more.</Note>
    </Stack>
  );
}
