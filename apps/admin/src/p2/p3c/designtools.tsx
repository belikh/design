import { useRef, useState } from "react";
import { Btn } from "@belikh/jupiter-ui/kit.tsx";
import { Checkbox, Select } from "@belikh/jupiter-ui/inputs.tsx";
import { EASINGS, bezierAt, bezierCss, parseBezier, type Bezier } from "./geometry.ts";
import { CopyBtn, Note, Row, Stack, clamp, startDrag, useReducedMotion } from "./ui.tsx";

/* ---------------- C045 box-model spacing editor ---------------- */
type Sides = [number, number, number, number]; // top right bottom left
const SIDE_NAMES = ["top", "right", "bottom", "left"] as const;
export const boxCss = (prop: string, s: Sides): string => { const [t, r, b, l] = s; if (t === r && r === b && b === l) return `${prop}: ${t}px;`; if (t === b && r === l) return `${prop}: ${t}px ${r}px;`; if (r === l) return `${prop}: ${t}px ${r}px ${b}px;`; return `${prop}: ${t}px ${r}px ${b}px ${l}px;`; };
export function BoxModelEditor() {
  const [box, setBox] = useState<Record<"margin" | "border" | "padding", Sides>>({ margin: [16, 16, 16, 16], border: [1, 1, 1, 1], padding: [12, 20, 12, 20] }); const [link, setLink] = useState<Record<string, boolean>>({ margin: true, border: true, padding: false }); const [content, setContent] = useState<[number, number]>([200, 60]);
  const set = (layer: keyof typeof box, i: number, v: number) => setBox((b) => ({ ...b, [layer]: link[layer] ? ([v, v, v, v] as Sides) : (b[layer].map((x, j) => (j === i ? v : x)) as Sides) }));
  const field = (layer: keyof typeof box, i: number) => <input key={i} className={`p3-box__in p3-box__in--${SIDE_NAMES[i]}`} type="number" min={0} max={96} aria-label={`${layer} ${SIDE_NAMES[i]}`} value={box[layer][i]} onChange={(e) => set(layer, i, clamp(Math.round(Number(e.target.value) || 0), 0, 96))} />;
  const layer = (k: keyof typeof box, child: React.ReactNode) => <div className={`p3-box p3-box--${k}`}><span className="p3-box__label">{k}</span>{[0, 1, 2, 3].map((i) => field(k, i))}<div className="p3-box__inner">{child}</div></div>;
  const css = [boxCss("margin", box.margin), boxCss("border-width", box.border), boxCss("padding", box.padding), `width: ${content[0]}px; height: ${content[1]}px;`].join("\n");
  return (
    <Stack>
      <div className="p3-boxgrid">
        <div>{layer("margin", layer("border", layer("padding", <div className="p3-box__content" aria-label="Content size">{content[0]} × {content[1]}</div>)))}</div>
        <div className="p3-stack">
          {(["margin", "border", "padding"] as const).map((k) => <Checkbox key={k} checked={link[k]} onChange={(v) => { setLink({ ...link, [k]: v }); if (v) set(k, 0, box[k][0]); }} label={`Link all ${k} sides`} />)}
          <label className="p3-field"><span className="jp-label">Content width {content[0]}px</span><input type="range" min={40} max={320} value={content[0]} onChange={(e) => setContent([Number(e.target.value), content[1]])} /></label>
          <label className="p3-field"><span className="jp-label">Content height {content[1]}px</span><input type="range" min={20} max={120} value={content[1]} onChange={(e) => setContent([content[0], Number(e.target.value)])} /></label>
          <div className="p3-preview-outer"><div className="p3-preview" style={{ margin: box.margin.map((x) => `${x / 4}px`).join(" "), borderWidth: box.border.map((x) => `${x}px`).join(" "), padding: box.padding.map((x) => `${x / 4}px`).join(" "), width: content[0] / 2, minHeight: content[1] / 2 }}>Preview (scaled)</div></div>
        </div>
      </div>
      <pre className="p3-code" aria-label="Generated CSS">{css}</pre>
      <Row><CopyBtn text={css} label="Copy CSS" /><Btn sm variant="ghost" onClick={() => setBox({ margin: [0, 0, 0, 0], border: [0, 0, 0, 0], padding: [0, 0, 0, 0] })}>Zero all</Btn><span className="p3-note">Total box: {content[0] + box.padding[1] + box.padding[3] + box.border[1] + box.border[3] + box.margin[1] + box.margin[3]} × {content[1] + box.padding[0] + box.padding[2] + box.border[0] + box.border[2] + box.margin[0] + box.margin[2]} px</span></Row>
    </Stack>
  );
}

/* ---------------- C045 easing curve editor ---------------- */
const W = 240, H = 240, PAD = 40; const X = (v: number) => PAD + v * (W - 2 * PAD); const Y = (v: number) => H - PAD - v * (H - 2 * PAD);
export function EasingEditor() {
  const [b, setB] = useState<Bezier>([0.42, 0, 0.58, 1]); const [dur, setDur] = useState(800); const [run, setRun] = useState(0); const svg = useRef<SVGSVGElement>(null); const reduce = useReducedMotion(); const [text, setText] = useState("");
  const round = (n: number) => Math.round(n * 100) / 100; const css = bezierCss(b);
  const upd = (i: number, v: number) => setB((c) => c.map((x, j) => (j === i ? (i % 2 === 0 ? clamp(round(v), 0, 1) : clamp(round(v), -1, 2)) : x)) as Bezier);
  const drag = (p: 0 | 1) => (e: React.PointerEvent) => { const el = svg.current; startDrag(e, el, (x, y, w, h) => { const sx = (x / w) * W, sy = (y / h) * H; upd(p * 2, (sx - PAD) / (W - 2 * PAD)); upd(p * 2 + 1, (H - PAD - sy) / (H - 2 * PAD)); }); };
  const key = (p: 0 | 1) => (e: React.KeyboardEvent) => { const s = e.shiftKey ? 0.1 : 0.01; const m: Record<string, [number, number]> = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, s], ArrowDown: [0, -s] }; if (!m[e.key]) return; e.preventDefault(); upd(p * 2, b[p * 2] + m[e.key][0]); upd(p * 2 + 1, b[p * 2 + 1] + m[e.key][1]); };
  const path = `M${X(0)} ${Y(0)} C${X(b[0])} ${Y(b[1])} ${X(b[2])} ${Y(b[3])} ${X(1)} ${Y(1)}`; const parsed = text ? parseBezier(text) : null;
  const name = Object.entries(EASINGS).find(([, v]) => v.every((x, i) => Math.abs(x - b[i]) < 0.005))?.[0];
  return (
    <Stack>
      <div className="p3-easing">
        <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="p3-easing__svg" role="group" aria-label={`Easing curve ${css}`}>
          <rect x={X(0)} y={Y(1)} width={X(1) - X(0)} height={Y(0) - Y(1)} className="p3-easing__box" /><line x1={X(0)} y1={Y(0)} x2={X(1)} y2={Y(1)} className="p3-easing__lin" />
          <line x1={X(0)} y1={Y(0)} x2={X(b[0])} y2={Y(b[1])} className="p3-easing__arm" /><line x1={X(1)} y1={Y(1)} x2={X(b[2])} y2={Y(b[3])} className="p3-easing__arm" />
          <path d={path} className="p3-easing__curve" />
          {([0, 1] as const).map((p) => <circle key={p} cx={X(b[p * 2])} cy={Y(b[p * 2 + 1])} r={8} tabIndex={0} role="button" aria-label={`Control point ${p + 1}, x ${b[p * 2]}, y ${b[p * 2 + 1]}. Arrow keys move it.`} className="p3-easing__h" onPointerDown={drag(p)} onKeyDown={key(p)} />)}
        </svg>
        <div className="p3-stack p3-grow">
          <div className="p3-fourin">{(["x1", "y1", "x2", "y2"] as const).map((n, i) => <label key={n} className="p3-field"><span className="jp-label">{n}</span><input className="jp-input" type="number" step={0.01} min={i % 2 ? -1 : 0} max={i % 2 ? 2 : 1} value={b[i]} onChange={(e) => upd(i, Number(e.target.value))} /></label>)}</div>
          <label className="p3-field"><span className="jp-label">Preset</span><Select value={name ?? ""} onChange={(v) => v && setB(EASINGS[v])} options={[{ value: "", label: "Custom" }, ...Object.keys(EASINGS)]} aria-label="Preset" /></label>
          <label className="p3-field"><span className="jp-label">Duration {dur} ms</span><input type="range" min={200} max={2000} step={50} value={dur} onChange={(e) => setDur(Number(e.target.value))} /></label>
        </div>
      </div>
      <div className="p3-track" aria-hidden><span key={run} className="p3-track__ball" style={reduce ? { insetInlineStart: "calc(100% - 1.25rem)" } : { animation: `p3-slide ${dur}ms ${css} forwards` }} /></div>
      <Row><Btn sm icon="play" onClick={() => setRun(run + 1)}>Play</Btn><code className="p3-code">transition-timing-function: {css};</code><CopyBtn text={css} /></Row>
      <p className="p3-note">Midpoint progress {Math.round(bezierAt(b, 0.5) * 100)}%{b[1] > 1 || b[3] < 0 || b[1] < 0 || b[3] > 1 ? ", overshoots (springy)" : ""}.</p>
      <label className="p3-field"><span className="jp-label">Paste a cubic-bezier()</span><input className="jp-input p3-mono" value={text} aria-invalid={!!text && !parsed} placeholder="cubic-bezier(0.2, 0.8, 0.2, 1)" onChange={(e) => { setText(e.target.value); const p = parseBezier(e.target.value); if (p) setB(p); }} /></label>
      {text && !parsed && <span className="p3-bad" role="alert">x values must be between 0 and 1.</span>}
      <Note>Drag a handle, or focus it and use the arrow keys (Shift for bigger steps); the number fields do the same without a pointer.</Note>
    </Stack>
  );
}
