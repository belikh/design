import { useEffect, useState } from "react";
import { Btn, Badge } from "@belikh/jupiter-ui/kit.tsx";
import { BLACK, START_PALETTE, type Swatch } from "./palette-data.ts";
import { contrast, grade, parseHex, suggestFg, toHex } from "./colour.ts";
import { CopyBtn, Note, Row, Stack } from "./ui.tsx";
export { START_PALETTE };
export type { Swatch };

export { ColourPicker } from "./colourpicker.tsx";
export { FontPicker } from "./fontpicker.tsx";

/* ---------------- C044 palette editor ---------------- */
export const PAIRS: { fg: string; bg: string; label: string; need: number }[] = [{ fg: "text", bg: "bg", label: "Body text", need: 4.5 }, { fg: "text", bg: "surface", label: "Text on surface", need: 4.5 }, { fg: "muted", bg: "bg", label: "Muted text", need: 4.5 }, { fg: "onaccent", bg: "accent", label: "Button label", need: 4.5 }, { fg: "accent", bg: "bg", label: "Link", need: 4.5 }, { fg: "danger", bg: "bg", label: "Error text", need: 4.5 }, { fg: "accent", bg: "surface", label: "Focus ring / UI", need: 3 }];
export function PaletteEditor({ initial = START_PALETTE }: { initial?: Swatch[] }) {
  const [pal, setPal] = useState<Swatch[]>(initial); const [drafts, setDrafts] = useState<Record<string, string>>({}); const hex = (id: string) => pal.find((p) => p.id === id)?.hex ?? BLACK;
  useEffect(() => setDrafts({}), [initial]);
  const set = (id: string, v: string) => setPal((p) => p.map((s) => (s.id === id ? { ...s, hex: v } : s)));
  const rows = PAIRS.map((p) => ({ ...p, g: grade(hex(p.fg), hex(p.bg)) }));
  const failing = rows.filter((r) => r.g && r.g.ratio < r.need).length;
  const fix = (fgId: string, bgId: string, need: number) => { const s = suggestFg(hex(fgId), hex(bgId), need); if (s) set(fgId, s); };
  const css = pal.map((s) => `  --${s.id}: ${s.hex};`).join("\n");
  return (
    <Stack>
      <div className="lab-palette">
        {pal.map((s) => (
          <div key={s.id} className="lab-palette__row"><span className="lab-palette__sw" style={{ background: s.hex }} aria-hidden /><span className="lab-palette__n">{s.name}</span>
            <input type="color" aria-label={`${s.name} picker`} value={s.hex} onChange={(e) => set(s.id, e.target.value)} />
            <input className="jp-input lab-mono lab-narrow" aria-label={`${s.name} hex`} aria-invalid={drafts[s.id] !== undefined && !parseHex(drafts[s.id])} value={drafts[s.id] ?? s.hex} onChange={(e) => { setDrafts({ ...drafts, [s.id]: e.target.value }); if (parseHex(e.target.value)) set(s.id, toHex(parseHex(e.target.value)!)); }} onBlur={() => setDrafts(({ [s.id]: _x, ...rest }) => rest)} /></div>))}
      </div>
      <table className="lab-table"><caption>Contrast checks (WCAG 2.2)</caption><thead><tr><th scope="col">Pair</th><th scope="col">Sample</th><th scope="col">Ratio</th><th scope="col">Result</th><th scope="col"><span className="lab-sr">Fix</span></th></tr></thead>
        <tbody>{rows.map((r) => { const pass = r.g && r.g.ratio >= r.need; return (
          <tr key={r.label}><th scope="row">{r.label}</th><td><span className="lab-sample" style={{ color: hex(r.fg), background: hex(r.bg) }}>Aa sample</span></td><td className="lab-mono">{r.g ? r.g.ratio.toFixed(2) : "-"}:1</td>
            <td>{r.g && <Badge s={pass ? "ok" : "danger"}>{pass ? (r.g.aaaNormal ? "AAA" : r.need === 3 ? "Pass 3:1" : "AA") : `Fails ${r.need}:1`}</Badge>}</td>
            <td>{!pass && <Btn sm onClick={() => fix(r.fg, r.bg, r.need)} aria-label={`Fix ${r.label}`}>Fix</Btn>}</td></tr>); })}</tbody></table>
      <p className={failing ? "lab-bad" : "lab-ok"} role="status">{failing ? `${failing} pair${failing === 1 ? "" : "s"} below the target.` : "All pairs meet their targets."}</p>
      <Row><CopyBtn text={`:root {\n${css}\n}`} label="Copy CSS variables" /><Btn sm variant="ghost" onClick={() => setPal(START_PALETTE)}>Reset</Btn><span className="lab-note">Lowest ratio {Math.min(...rows.map((r) => contrast(hex(r.fg), hex(r.bg)) ?? 21)).toFixed(2)}:1</span></Row>
      <Note>"Fix" nudges only the foreground lightness (keeping hue and saturation) until the pair passes.</Note>
    </Stack>
  );
}
