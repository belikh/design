import { useState } from "react";
import { Btn } from "@belikh/jupiter-ui/kit.tsx";
import { Segmented } from "@belikh/jupiter-ui/inputs.tsx";
import { DEFAULT_COLOUR, DEFAULT_GRADIENT, SWATCHES } from "./palette-data.ts";
import { gradientCss, harmonies, hsvToHex, hsvToRgb, parseColour, parseHex, ramp, rgbCss, rgbToHsl, rgbToHsv, hslToRgb, toHex, toHexA, type GradientSpec, type HSV } from "./colour.ts";
import { SvPad } from "./colourpad.tsx";
import { CopyBtn, Note, Row, Stack, clamp } from "./ui.tsx";

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };
type C = HSV & { a: number };
const fromParsed = (p: { rgb: { r: number; g: number; b: number }; a: number }, prev?: C): C => { const hsv = rgbToHsv(p.rgb); return { h: prev && (hsv.s === 0 || hsv.v === 0) ? prev.h : hsv.h, s: hsv.s, v: hsv.v, a: p.a }; };

/* ---------------- C042 colour picker ---------------- */
export function ColourPicker({ initial = DEFAULT_COLOUR, onChange }: { initial?: string; onChange?: (hex: string) => void }) {
  const [c, setCs] = useState<C>(() => fromParsed(parseColour(initial) ?? parseColour(DEFAULT_COLOUR)!)); const rgb = hsvToRgb(c); const hex = toHexA(rgb, c.a); const hsl = rgbToHsl(rgb);
  const [text, setText] = useState(hex); const [recent, setRecent] = useState<string[]>([]); const [tab, setTab] = useState<"solid" | "gradient">("solid"); const [live, setLive] = useState("");
  const valid = parseColour(text) !== null;
  const setC = (n: C, remember = false, syncText = true) => { const nr = hsvToRgb(n); const h = toHexA(nr, n.a); setCs(n); if (syncText) setText(h); onChange?.(h); if (remember) setRecent((r) => [h, ...r.filter((x) => x !== h)].slice(0, 6)); };
  const apply = (s: string, remember = false, syncText = true) => { const p = parseColour(s); if (p) setC(fromParsed(p, c), remember, syncText); };
  const setRgb = (k: "r" | "g" | "b", v: number) => setC(fromParsed({ rgb: { ...rgb, [k]: clamp(Math.round(v) || 0, 0, 255) }, a: c.a }, c));
  const setHsl = (k: "h" | "s" | "l", v: number) => { const n = { ...hsl, [k]: clamp(Math.round(v) || 0, 0, k === "h" ? 360 : 100) }; setC(fromParsed({ rgb: hslToRgb(n), a: c.a }, { ...c, h: n.h })); };
  const Eye = (globalThis as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper;
  const pick = () => { if (!Eye) return; new Eye().open().then((r) => { apply(r.sRGBHex, true); setLive(`Picked ${r.sRGBHex}`); }).catch(() => setLive("Eyedropper cancelled")); };
  const [grad, setGrad] = useState<GradientSpec>(DEFAULT_GRADIENT);
  const css = gradientCss(grad); const setStop = (i: number, patch: Partial<GradientSpec["stops"][0]>) => setGrad({ ...grad, stops: grad.stops.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const hueRail = `linear-gradient(to right, ${[0, 60, 120, 180, 240, 300, 360].map((h) => hsvToHex({ h, s: 100, v: 100 })).join(", ")})`;
  const num = (label: string, value: number, max: number, on: (v: number) => void) => <label key={label} className="lab-field"><span className="jp-label">{label}</span><input className="jp-input lab-mono lab-num" type="number" min={0} max={max} value={value} aria-label={label} onChange={(e) => on(Number(e.target.value))} /></label>;
  return (
    <Stack>
      <Segmented label="Colour type" value={tab} onChange={setTab} options={[{ value: "solid", label: "Solid" }, { value: "gradient", label: "Gradient" }]} />
      {tab === "solid" ? <>
        <div className="lab-colour">
          <SvPad h={c.h} s={c.s} v={c.v} onChange={(s, v) => setC({ ...c, s, v })} />
          <div className="lab-stack lab-grow">
            <div className="lab-colour__preview lab-checker" role="img" aria-label={`Current colour ${hex}`}><span style={{ background: hex }} /></div>
            <label className="lab-slider"><span>Hue</span><input type="range" min={0} max={360} value={Math.round(c.h)} aria-label="Hue" style={{ background: hueRail }} className="lab-slider__rail" onChange={(e) => setC({ ...c, h: Number(e.target.value) })} /><output>{Math.round(c.h)}°</output></label>
            <label className="lab-slider"><span>Alpha</span><input type="range" min={0} max={100} value={Math.round(c.a * 100)} aria-label="Alpha" aria-valuetext={`${Math.round(c.a * 100)}% opaque`} style={{ background: `linear-gradient(to right, transparent, ${hsvToHex(c)})` }} className="lab-slider__rail lab-slider__rail--alpha" onChange={(e) => setC({ ...c, a: Number(e.target.value) / 100 })} /><output>{Math.round(c.a * 100)}%</output></label>
          </div></div>
        <Row><label className="lab-field"><span className="jp-label">Hex</span><input className="jp-input lab-mono lab-narrow" value={text} aria-invalid={!valid} onChange={(e) => { setText(e.target.value); if (parseColour(e.target.value)) apply(e.target.value, false, false); }} onBlur={() => (valid ? apply(text) : setText(hex))} spellCheck={false} /></label>
          <label className="lab-field"><span className="jp-label">System picker</span><input type="color" className="lab-colorinput" aria-label="System colour picker" value={toHex(rgb)} onChange={(e) => apply(e.target.value + (c.a < 1 ? Math.round(c.a * 255).toString(16).padStart(2, "0") : ""), true)} /></label>
          {Eye && <Btn sm onClick={pick}>Eyedropper</Btn>}<CopyBtn text={hex} /></Row>
        {!Eye && <Note>The eyedropper needs the EyeDropper API (Chromium browsers); it is hidden here because this browser does not provide it.</Note>}
        <span className="lab-sr" role="status">{live}</span>
        {!valid && <span className="lab-bad" role="alert">Enter a hex (3, 4, 6 or 8 digits) or rgb() colour.</span>}
        <Row className="lab-numrow">{num("Red", rgb.r, 255, (v) => setRgb("r", v))}{num("Green", rgb.g, 255, (v) => setRgb("g", v))}{num("Blue", rgb.b, 255, (v) => setRgb("b", v))}
          {num("HSL hue", Math.round(hsl.h), 360, (v) => setHsl("h", v))}{num("HSL saturation", Math.round(hsl.s), 100, (v) => setHsl("s", v))}{num("HSL lightness", Math.round(hsl.l), 100, (v) => setHsl("l", v))}</Row>
        <div className="lab-swatches" role="radiogroup" aria-label="Swatches">{SWATCHES.map((s) => <button key={s} type="button" role="radio" aria-checked={toHex(rgb) === s} aria-label={s} title={s} className={toHex(rgb) === s ? "is-on" : ""} style={{ background: s }} onClick={() => apply(s + (c.a < 1 ? Math.round(c.a * 255).toString(16).padStart(2, "0") : ""), true)} />)}</div>
        {recent.length > 0 && <div><span className="lab-note">Recent</span><div className="lab-swatches" role="group" aria-label="Recent colours">{recent.map((s) => <button key={s} type="button" aria-label={`Recent ${s}`} style={{ background: s }} onClick={() => apply(s)} />)}</div></div>}
        <div><span className="lab-note">Tints and shades</span><div className="lab-swatches" role="group" aria-label="Tints and shades">{ramp(toHex(rgb), 9).map((s) => <button key={s} type="button" aria-label={`Tint ${s}`} style={{ background: s }} onClick={() => apply(s)} />)}</div></div>
        <dl className="lab-kv"><dt>HEX</dt><dd className="lab-mono">{hex}</dd><dt>RGB</dt><dd className="lab-mono">{rgbCss(rgb, c.a)}</dd><dt>HSL</dt><dd className="lab-mono">{`hsl(${Math.round(hsl.h)} ${Math.round(hsl.s)}% ${Math.round(hsl.l)}%${c.a < 1 ? ` / ${Math.round(c.a * 100) / 100}` : ""})`}</dd><dt>HSV</dt><dd className="lab-mono">{`${Math.round(c.h)}°, ${Math.round(c.s)}%, ${Math.round(c.v)}%`}</dd>
          <dt>Harmony</dt><dd>{Object.entries(harmonies(toHex(rgb))).map(([k, v]) => <span key={k} className="lab-harm">{k}: {v.map((x) => <i key={x} style={{ background: x }} title={x} />)} </span>)}</dd></dl></>
      : <>
        <div className="lab-gradprev" style={{ background: css }} role="img" aria-label={`Gradient preview: ${css}`} />
        <Row><Segmented label="Gradient kind" value={grad.kind} onChange={(kind) => setGrad({ ...grad, kind })} options={[{ value: "linear", label: "Linear" }, { value: "radial", label: "Radial" }]} />
          {grad.kind === "linear" && <label className="lab-slider"><span>Angle</span><input type="range" min={0} max={360} value={grad.angle} aria-label="Angle" onChange={(e) => setGrad({ ...grad, angle: Number(e.target.value) })} /><output>{grad.angle}°</output></label>}</Row>
        <ul className="lab-stops" aria-label="Colour stops">{grad.stops.map((s, i) => <li key={i}><input type="color" aria-label={`Stop ${i + 1} colour`} value={s.hex} onChange={(e) => setStop(i, { hex: e.target.value })} /><input className="jp-input lab-mono lab-narrow" aria-label={`Stop ${i + 1} hex`} value={s.hex} onChange={(e) => parseHex(e.target.value) && setStop(i, { hex: toHex(parseHex(e.target.value)!) })} /><input type="range" aria-label={`Stop ${i + 1} position`} min={0} max={100} value={s.at} onChange={(e) => setStop(i, { at: Number(e.target.value) })} /><output>{s.at}%</output><Btn sm variant="ghost" aria-label={`Remove stop ${i + 1}`} disabled={grad.stops.length <= 2} onClick={() => setGrad({ ...grad, stops: grad.stops.filter((_, j) => j !== i) })}>Remove</Btn></li>)}</ul>
        <Row><Btn sm disabled={grad.stops.length >= 5} onClick={() => setGrad({ ...grad, stops: [...grad.stops, { at: 50, hex }] })}>Add stop</Btn><CopyBtn text={`background: ${css};`} label="Copy CSS" /></Row><code className="lab-code">background: {css};</code></>}
    </Stack>
  );
}
