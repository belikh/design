import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader, Panel, Btn, Badge, Disclosure, CodeBlock, Alert } from "@belikh/jupiter-ui/kit.tsx";
import { Field, Segmented, Select, Slider, TextInput } from "@belikh/jupiter-ui/inputs.tsx";
import { Editable } from "@belikh/jupiter-ui/editable.tsx";
import { C } from "@belikh/jupiter-ui/Charts.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { inTextField, pushUndo, redo, undo, useUndoState } from "@belikh/jupiter-ui/undo.ts";
import { AnnotCanvas, type FocusReq, type Tool } from "./AnnotCanvas.tsx";
import { MAX_CLASSES, MAX_IMAGE_BYTES, SAMPLE, bbox, classIndex, defaultShape, describe, fromCoco, fromCsv, insertVertex, minPts, nextId, normalize, removeVertex, seedDoc, toCoco, toCsv, type Ann, type Doc, type Kind } from "./lib/annotate.ts";
import { fitView, round2, setZoomKeepCentre, type Pt, type View } from "./lib/geometry.ts";
import { download } from "./ShellPlayer.tsx";
import "./devtools.css";

const readText = (f: File): Promise<string> => (typeof f.text === "function" ? f.text() : new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsText(f); }));
const baseName = (n: string) => n.replace(/\.[^.]+$/, "") || "annotations";

export function ImageAnnotator() {
  const { toast } = usePrefs(); const us = useUndoState();
  const [doc, setDoc] = useState<Doc>(seedDoc); const docRef = useRef(doc);
  const [sel, setSel] = useState<string | null>(null); const [tool, setTool] = useState<Tool>("select"); const [cls, setCls] = useState("Device"); const [view, setView] = useState<View>(() => fitView(SAMPLE));
  const [focusReq, setFocusReq] = useState<FocusReq>(null); const [err, setErr] = useState<string | null>(null); const [newClass, setNewClass] = useState(""); const [classErr, setClassErr] = useState<string | undefined>();
  const [drop, setDrop] = useState(false); const [note, setNote] = useState(""); const fileRef = useRef<HTMLInputElement>(null); const annRef = useRef<HTMLInputElement>(null); const urls = useRef<string[]>([]); const focusN = useRef(0);
  const bounds = { w: doc.image.w, h: doc.image.h }; const curCls = doc.classes.includes(cls) ? cls : doc.classes[0];

  const apply = useCallback((d: Doc) => { docRef.current = d; setDoc(d); }, []);
  // A run of live edits (a drag, a burst of arrow keys) becomes ONE undo entry, pushed when the first change happens.
  const gesture = useRef<{ label: string; base: Doc; final: Doc; timer?: ReturnType<typeof setTimeout> } | null>(null);
  const endGesture = useCallback(() => { const g = gesture.current; if (g?.timer) clearTimeout(g.timer); gesture.current = null; }, []);
  const liveEdit = (label: string, next: Doc, auto = false) => {
    let g = gesture.current;
    if (g && g.label !== label) { endGesture(); g = null; }
    if (!g) { const ng = { label, base: docRef.current, final: next } as NonNullable<typeof gesture.current>; gesture.current = ng; g = ng; pushUndo({ label, undo: () => { if (gesture.current === ng) endGesture(); apply(ng.base); }, redo: () => apply(ng.final) }); }
    g.final = next; apply(next);
    if (auto) { if (g.timer) clearTimeout(g.timer); g.timer = setTimeout(endGesture, 700); }
  };
  const commit = (label: string, next: Doc) => { endGesture(); const base = docRef.current; apply(next); pushUndo({ label, undo: () => apply(base), redo: () => apply(next) }); };
  const replaceAnn = (a: Ann) => ({ ...docRef.current, anns: docRef.current.anns.map((x) => (x.id === a.id ? a : x)) });

  useEffect(() => () => { urls.current.forEach((u) => URL.revokeObjectURL(u)); }, []);
  useEffect(() => { if (sel && !doc.anns.some((a) => a.id === sel)) setSel(null); }, [doc, sel]);
  useEffect(() => { setView((v) => (v.zoom === 1 ? fitView(bounds) : v)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [doc.image.w, doc.image.h]);

  const create = (kind: Kind, pts: Pt[]) => {
    const d = docRef.current; const id = nextId(d.anns); const a = normalize({ id, kind, cls: curCls, note: "", pts }, { w: d.image.w, h: d.image.h });
    commit(`Add ${kind}`, { ...d, anns: [...d.anns, a] }); setSel(id);
  };
  const addDefault = (kind: Kind) => { const vbc: Pt = [view.cx, view.cy]; create(kind, defaultShape(kind, vbc, bounds)); };
  const remove = (id: string) => {
    const d = docRef.current; const a = d.anns.find((x) => x.id === id); if (!a) return; commit("Delete annotation", { ...d, anns: d.anns.filter((x) => x.id !== id) }); setSel(null);
    toast({ kind: "warn", title: "Annotation deleted", body: describe(a), undo: () => { void undo(); } });
  };
  const patch = (id: string, p: Partial<Ann>, label: string) => { const a = docRef.current.anns.find((x) => x.id === id); if (a) commit(label, replaceAnn({ ...a, ...p })); };
  const delVertex = (id: string, i: number) => { const a = docRef.current.anns.find((x) => x.id === id); if (!a) return; const n = removeVertex(a, i); if (!n) { setNote(`A ${a.kind} needs at least ${minPts(a.kind)} vertices.`); return; } commit("Delete vertex", replaceAnn(n)); setFocusReq({ id, i: Math.min(i, n.pts.length - 1), n: ++focusN.current }); };
  const addVertex = (id: string, i: number) => { const a = docRef.current.anns.find((x) => x.id === id); if (!a) return; const n = insertVertex(a, i, undefined, bounds); if (n === a) { setNote("Only polygons and polylines have a variable number of vertices."); return; } commit("Add vertex", replaceAnn(n)); setFocusReq({ id, i: i + 1, n: ++focusN.current }); };
  const setVertexXY = (id: string, i: number, axis: 0 | 1, v: number) => { const a = docRef.current.anns.find((x) => x.id === id); if (!a) return; const pts = a.pts.map((q, j) => (j === i ? (axis === 0 ? [v, q[1]] : [q[0], v]) as Pt : q)); commit("Edit vertex", replaceAnn(normalize({ ...a, pts }, bounds))); };

  // ---- classes
  const addClass = () => {
    const n = newClass.trim(); const d = docRef.current;
    if (!n) { setClassErr("Enter a class name."); return; } if (n.length > 40) { setClassErr("Use at most 40 characters."); return; }
    if (d.classes.some((c) => c.toLowerCase() === n.toLowerCase())) { setClassErr("That class already exists."); return; } if (d.classes.length >= MAX_CLASSES) { setClassErr(`At most ${MAX_CLASSES} classes.`); return; }
    commit("Add class", { ...d, classes: [...d.classes, n] }); setCls(n); setNewClass(""); setClassErr(undefined);
  };
  const removeClass = (c: string) => { const d = docRef.current; if (d.anns.some((a) => a.cls === c) || d.classes.length <= 1) return; commit("Remove class", { ...d, classes: d.classes.filter((x) => x !== c) }); };

  // ---- image: file picker, drop, paste. Files are read in this tab (object URL) and never uploaded.
  const loadImage = useCallback((f: File) => {
    setErr(null);
    if (!f.type.startsWith("image/")) { setErr(`${f.name} is not an image file.`); return; }
    if (f.size > MAX_IMAGE_BYTES) { setErr(`${f.name} is larger than 25 MB.`); return; }
    const url = URL.createObjectURL(f); const img = new Image();
    img.onload = () => {
      urls.current.push(url); const w = img.naturalWidth || 800, h = img.naturalHeight || 600; const d = docRef.current;
      commit("Replace image", { ...d, image: { name: f.name, w, h, url }, anns: [] }); setSel(null); setView(fitView({ w, h }));
      toast({ kind: "ok", title: "Image loaded", body: `${f.name}, ${w} × ${h}. Annotations were cleared (Undo restores them).` });
    };
    img.onerror = () => { URL.revokeObjectURL(url); setErr(`${f.name} could not be decoded as an image.`); };
    img.src = url;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => { if (inTextField(e.target)) return; const f = [...(e.clipboardData?.files ?? [])].find((x) => x.type.startsWith("image/")); if (f) { e.preventDefault(); loadImage(f); } };
    document.addEventListener("paste", onPaste); return () => document.removeEventListener("paste", onPaste);
  }, [loadImage]);
  const useSample = () => { const d = docRef.current; if (d.image.url == null) return; commit("Use sample image", { ...d, image: SAMPLE, anns: seedDoc().anns }); setSel(null); setView(fitView(SAMPLE)); };

  // ---- import / export
  const importAnns = async (f: File) => {
    setErr(null); if (f.size > 5 * 1024 * 1024) { setErr(`${f.name} is larger than 5 MB.`); return; }
    const text = await readText(f); const d = docRef.current; const csv = /\.csv$/i.test(f.name) || !/^\s*[{[]/.test(text);
    const r = csv ? fromCsv(text, bounds, d.classes) : fromCoco(text, bounds);
    if (!r.ok) { setErr(`${f.name}: ${r.error}`); return; }
    const classes = [...d.classes]; for (const c of r.classes) if (!classes.includes(c)) classes.push(c);
    commit("Import annotations", { ...d, classes, anns: r.anns }); setSel(null);
    toast({ kind: r.warnings.length ? "warn" : "ok", title: `Imported ${r.anns.length} annotation${r.anns.length === 1 ? "" : "s"}`, body: r.warnings.join(" ") || `Replaced the previous annotations (Undo restores them).` });
  };

  const zoomTo = (z: number) => setView((v) => setZoomKeepCentre(v, bounds, z));
  const selected = doc.anns.find((a) => a.id === sel);
  const sw = (c: string) => <i className="lab-sw" style={{ background: C(classIndex(doc.classes, c)) }} />;
  const json = toCoco(doc);

  return (
    <>
      <PageHeader title="Image annotation" crumbs={["Builders", "Image annotation"]} desc="Label an image with boxes, points, polygons and polylines. Open an image from your computer (it stays in this tab), draw with the pointer or add shapes with the buttons, edit vertices, then export COCO JSON or CSV."
        status={<Badge s="info">{doc.anns.length} annotation{doc.anns.length === 1 ? "" : "s"}</Badge>}
        actions={<><Btn icon="upload" onClick={() => fileRef.current?.click()}>Open image</Btn><input ref={fileRef} type="file" hidden accept="image/*" aria-label="Open image file" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) loadImage(f); }} />
          {doc.image.url != null && <Btn onClick={useSample}>Use sample image</Btn>}</>} />
      {err && <Alert s="danger" title="Could not load that file" onClose={() => setErr(null)}>{err}</Alert>}
      <div className="lab-split">
        <Panel title={`Image: ${doc.image.name}`} actions={<div className="adm-row"><Segmented<Tool> label="Tool" value={tool} onChange={setTool} options={[{ value: "select", label: "Select" }, { value: "box", label: "Box" }, { value: "point", label: "Point" }, { value: "polygon", label: "Polygon" }, { value: "polyline", label: "Polyline" }, { value: "pan", label: "Pan" }]} /><Select aria-label="Class for new annotations" value={curCls} onChange={setCls} options={doc.classes} /></div>}>
          <div className={`lab-dropzone ${drop ? "is-over" : ""}`} onDragOver={(e) => { if ([...e.dataTransfer.types].includes("Files")) { e.preventDefault(); setDrop(true); } }} onDragLeave={() => setDrop(false)}
            onDrop={(e) => { e.preventDefault(); setDrop(false); const f = [...e.dataTransfer.files][0]; if (f) loadImage(f); }}>
            <AnnotCanvas doc={doc} sel={sel} tool={tool} view={view} focusReq={focusReq} onView={setView} onSelect={setSel} onCreate={create} onToolDone={() => setTool("select")}
              onChange={(a, label) => liveEdit(label, replaceAnn(a), true)} onEnd={endGesture} onDelete={remove} onVertexDelete={delVertex} onInsertAfter={addVertex} onFocusVertex={(id, i) => setFocusReq({ id, i, n: ++focusN.current })} onNotice={setNote} />
          </div>
          <p className="lab-note jp-muted" data-testid="annot-note" aria-live="polite">{note || (tool === "polygon" || tool === "polyline" ? "Click to place vertices. Enter or double-click finishes, Backspace removes the last, Escape cancels." : tool === "pan" ? "Drag to pan." : "Drop or paste an image to replace it. Ctrl+wheel zooms.")}</p>
          <div className="adm-row">
            <Btn sm aria-label="Zoom out" onClick={() => zoomTo(view.zoom / 1.25)}>−</Btn><Btn sm aria-label="Zoom in" onClick={() => zoomTo(view.zoom * 1.25)}>+</Btn><Btn sm onClick={() => setView(fitView(bounds))}>Fit</Btn>
            <div className="lab-grow"><Slider label="Zoom" value={Math.round(view.zoom * 100)} onChange={(v) => zoomTo(v / 100)} min={100} max={800} step={25} fmt={(v) => `${v}%`} /></div>
            <Btn sm disabled={!us.canUndo} onClick={() => { endGesture(); void undo(); }}>Undo{us.undoLabel ? `: ${us.undoLabel}` : ""}</Btn><Btn sm disabled={!us.canRedo} onClick={() => { endGesture(); void redo(); }}>Redo</Btn>
          </div>
          <div className="adm-row lab-addrow"><span className="jp-muted">Add without the pointer:</span>{(["box", "point", "polygon", "polyline"] as Kind[]).map((k) => <Btn key={k} sm icon="plus" onClick={() => addDefault(k)}>{`Add ${k}`}</Btn>)}</div>
        </Panel>
        <div className="adm-stack">
          <Panel title="Selected">
            {selected ? <div className="adm-stack" key={selected.id}>
              <Field label="Class">{() => <Editable value={selected.cls} label="Class" editor={{ type: "select", options: doc.classes.map((c) => ({ value: c, label: c })) }} undo={false} onSave={(v) => patch(selected.id, { cls: String(v) }, "Change class")} />}</Field>
              <Field label="Note">{() => <Editable value={selected.note} label="Note" editor={{ type: "text", placeholder: "What is this?", maxLength: 200 }} undo={false} placeholderEmpty="Add a note" onSave={(v) => patch(selected.id, { note: String(v) }, "Edit note")} />}</Field>
              <div className="jp-muted adm-num">{selected.kind}{selected.kind !== "point" ? `, ${bbox(selected).w.toFixed(0)} × ${bbox(selected).h.toFixed(0)}` : ""}. Arrow keys nudge it (Shift 1 px, Ctrl 20 px); Enter edits its vertices.</div>
              {selected.kind !== "point" && <Disclosure label={`Vertices (${selected.pts.length})`}>
                <ul className="lab-verts" aria-label="Vertices">{selected.pts.slice(0, 60).map((q, i) => <li key={i}><span className="adm-num">{i + 1}</span>
                  <Editable value={round2(q[0])} label={`Vertex ${i + 1} x`} editor={{ type: "number", min: 0, max: doc.image.w, step: 1 }} undo={false} compact onSave={(v) => setVertexXY(selected.id, i, 0, Number(v))} />
                  <Editable value={round2(q[1])} label={`Vertex ${i + 1} y`} editor={{ type: "number", min: 0, max: doc.image.h, step: 1 }} undo={false} compact onSave={(v) => setVertexXY(selected.id, i, 1, Number(v))} />
                  {(selected.kind === "polygon" || selected.kind === "polyline") && <><Btn sm aria-label={`Add vertex after ${i + 1}`} onClick={() => addVertex(selected.id, i)}>+</Btn><Btn sm aria-label={`Delete vertex ${i + 1}`} disabled={selected.pts.length <= minPts(selected.kind)} onClick={() => delVertex(selected.id, i)}>×</Btn></>}</li>)}</ul>
              </Disclosure>}
              <Btn variant="ghost" onClick={() => remove(selected.id)}>Delete annotation</Btn>
            </div> : <p className="jp-muted">Select an annotation (click it, or Tab to it), or draw a new one.</p>}
          </Panel>
          <Panel title="Classes">
            <ul className="lab-tree" aria-label="Classes">{doc.classes.map((c) => { const n = doc.anns.filter((a) => a.cls === c).length; return <li key={c} className="lab-rec"><span className="lab-clsrow">{sw(c)}{c}<span className="jp-muted adm-num">{n}</span></span><button className="adm-x" aria-label={`Remove class ${c}`} disabled={n > 0 || doc.classes.length <= 1} title={n > 0 ? "In use" : undefined} onClick={() => removeClass(c)}>×</button></li>; })}</ul>
            <form className="lab-term-form lab-pad" onSubmit={(e) => { e.preventDefault(); addClass(); }}><Field label="New class" error={classErr}>{(id) => <TextInput id={id} value={newClass} onChange={(v) => { setNewClass(v); setClassErr(undefined); }} placeholder="e.g. Port" />}</Field><Btn type="submit">Add</Btn></form>
          </Panel>
          <Panel title="All annotations" flush>
            {doc.anns.length === 0 ? <p className="jp-muted lab-pad">Nothing yet.</p> : <ul className="lab-tree" aria-label="Annotations">{doc.anns.map((a) => <li key={a.id}><button className={sel === a.id ? "is-on" : ""} aria-current={sel === a.id ? "true" : undefined} onClick={() => setSel(a.id)}><span>{sw(a.cls)}{a.cls} {a.kind}</span><span className="jp-muted">{a.note || "no note"}</span></button></li>)}</ul>}
          </Panel>
          <Panel title="Export and import">
            <div className="adm-stack"><div className="adm-row">
              <Btn icon="download" onClick={() => download(`${baseName(doc.image.name)}.coco.json`, json)}>COCO JSON</Btn><Btn icon="download" onClick={() => download(`${baseName(doc.image.name)}.csv`, toCsv(doc.anns))}>CSV</Btn>
              <Btn icon="upload" onClick={() => annRef.current?.click()}>Import</Btn><input ref={annRef} type="file" hidden accept=".json,.csv,application/json,text/csv" aria-label="Import annotations file" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void importAnns(f); }} />
            </div><p className="lab-note jp-muted">Import replaces the current annotations (Undo restores them). Polylines and points are stored in COCO as attributes and keypoints.</p></div>
            <Disclosure label="Preview COCO JSON"><CodeBlock label="coco json" code={json} maxHeight="16rem" /></Disclosure>
          </Panel>
        </div>
      </div>
    </>
  );
}
