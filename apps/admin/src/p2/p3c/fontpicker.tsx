import { useEffect, useMemo, useState } from "react";
import { Alert, Badge } from "@belikh/jupiter-ui/kit.tsx";
import { Segmented, Select } from "@belikh/jupiter-ui/inputs.tsx";
import { FONTS, WEIGHT_NAMES, availabilityFromFaces, fontShorthand, isInstalled, type Availability, type FontEntry } from "./fonts.ts";
import { CopyBtn, Note, Row, Stack } from "./ui.tsx";

type FontSet = { load?: (font: string, text?: string) => Promise<{ status: string }[]> };
const fontSet = (): FontSet | null => (typeof document !== "undefined" ? ((document as unknown as { fonts?: FontSet }).fonts ?? null) : null);
/** Ask the browser to load the exact face (weight and style); available only when a face reached "loaded". */
export async function probeFace(family: string, weight: number, italic: boolean): Promise<Availability> {
  const fs = fontSet(); if (!fs?.load) return "unknown";
  try { return availabilityFromFaces(await fs.load(`${italic ? "italic " : ""}${weight} 16px "${family}"`, "Aa")); } catch { return "missing"; }
}
/** Canvas width comparison for installed system fonts; null where canvas text is unavailable (for example jsdom). */
export function systemFontCheck(family: string): Availability {
  try { const ctx = document.createElement("canvas").getContext("2d"); if (!ctx || typeof ctx.measureText !== "function") return "unknown"; return isInstalled((ff) => { ctx.font = `72px ${ff}`; return ctx.measureText("mmmmmmmmmmlli1WQ@").width; }, family) ? "available" : "missing"; } catch { return "unknown"; }
}
const BADGE: Record<Availability, { s: "ok" | "warn" | "info"; t: string }> = { available: { s: "ok", t: "Available" }, missing: { s: "warn", t: "Not found" }, checking: { s: "info", t: "Checking" }, unknown: { s: "info", t: "Not checked" } };
const SIZES = [12, 14, 16, 20, 28, 40, 56, 72];
const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

export function FontPicker() {
  const [q, setQ] = useState(""); const [cat, setCat] = useState("All"); const [selId, setSelId] = useState(FONTS[0].id); const [weight, setWeight] = useState(400); const [size, setSize] = useState(20); const [italic, setItalic] = useState(false);
  const [sample, setSample] = useState("The quick brown fox jumps over the lazy dog"); const [avail, setAvail] = useState<Record<string, Availability>>({}); const [face, setFace] = useState<Availability>("checking");
  const sel = FONTS.find((f) => f.id === selId) as FontEntry;
  const list = useMemo(() => FONTS.filter((f) => (cat === "All" || f.cat === cat) && f.name.toLowerCase().includes(q.toLowerCase())), [q, cat]);
  useEffect(() => { let live = true; (async () => { for (const f of FONTS) { const a = f.source === "shipped" ? await probeFace(f.family, 400, false) : systemFontCheck(f.family); if (live) setAvail((p) => ({ ...p, [f.id]: a })); } })(); return () => { live = false; }; }, []);
  useEffect(() => { let live = true; setFace("checking"); (sel.source === "shipped" ? probeFace(sel.family, weight, italic) : Promise.resolve(systemFontCheck(sel.family))).then((a) => { if (live) setFace(a); }); return () => { live = false; }; }, [sel, weight, italic]);
  const shipsWeight = sel.weights.includes(weight);
  return (
    <Stack>
      <Row><label className="p3-field p3-grow"><span className="jp-label">Search fonts</span><input className="jp-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} /></label><div className="p3-field"><span className="jp-label">Category</span><Segmented label="Font category" value={cat} onChange={setCat} options={["All", "Sans", "Serif", "Mono", "Script"].map((x) => ({ value: x, label: x }))} /></div></Row>
      <div className="p3-fontlist" role="radiogroup" aria-label="Font family">
        {list.map((f) => { const a = avail[f.id] ?? "checking"; const b = BADGE[a]; return (
          <button key={f.id} type="button" role="radio" aria-checked={sel.id === f.id} className={sel.id === f.id ? "is-on" : ""} onClick={() => setSelId(f.id)}>
            <span className="p3-fontlist__n">{f.name} <Badge s={f.source === "shipped" ? "info" : "ok"}>{f.source === "shipped" ? "Design system" : "System"}</Badge> <Badge s={b.s}>{f.source === "system" && a === "available" && ["system-ui", "ui-rounded", "ui-monospace"].includes(f.family) ? "Generic" : b.t}</Badge></span>
            <span style={{ fontFamily: f.stack }} className="p3-fontlist__s">Aa Bb 123</span>
          </button>); })}
        {!list.length && <p className="p3-note">No font matches.</p>}
      </div>
      <Row><label className="p3-field"><span className="jp-label">Weight</span><Select value={String(weight)} onChange={(v) => setWeight(Number(v))} options={WEIGHTS.map((w) => ({ value: String(w), label: `${w} ${WEIGHT_NAMES[w]}` }))} aria-label="Weight" /></label>
        <label className="p3-field"><span className="jp-label">Size</span><Select value={String(size)} onChange={(v) => setSize(Number(v))} options={SIZES.map((s) => String(s))} aria-label="Size" /></label>
        <label className="adm-check"><input type="checkbox" checked={italic} onChange={(e) => setItalic(e.target.checked)} /><span>Italic</span></label></Row>
      <label className="p3-field"><span className="jp-label">Preview text</span><input className="jp-input" value={sample} onChange={(e) => setSample(e.target.value)} /></label>
      {sel.source === "shipped" && face === "missing" && <Alert s="warn" title={`${sel.name} ${weight}${italic ? " italic" : ""} is not available`}>{sel.note} The preview below is using the fallback in the stack.</Alert>}
      <p className="p3-fontprev" aria-label={`Preview in ${sel.name}`} style={{ fontFamily: sel.stack, fontWeight: weight, fontSize: `${size / 16}rem`, fontStyle: italic ? "italic" : "normal" }}>{sample}</p>
      <p className="p3-note" role="status">{sel.name} at {weight}{italic ? " italic" : ""}: <b>{BADGE[face].t.toLowerCase()}</b>{sel.source === "shipped" ? (shipsWeight ? "" : `. The design system ships weights ${sel.weights.join(", ")} only; the browser will use the nearest or synthesise it`) : ""}.{sel.file ? ` Source: ${sel.file}.` : ""}</p>
      <Row><code className="p3-code">font: {fontShorthand(sel.stack, weight, size, italic)};</code><CopyBtn text={`font-family: ${sel.stack};\nfont-weight: ${weight};`} /></Row>
      <Note>Availability is measured in this browser: shipped families are loaded with the FontFace API at the chosen weight and style, system fonts are detected by text width against generic fallbacks. Each stack ends in a generic family as a fallback.</Note>
    </Stack>
  );
}
