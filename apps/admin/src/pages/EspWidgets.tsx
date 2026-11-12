import { useEffect, useMemo, useState } from "react";
import { DISPLAYS, LEGAL, WIDGETS, composeLambda, composeSvg, dashboard, display, renderSvg, toLambda, toLvgl, type Display, type PaletteId, type WidgetDef } from "@belikh/jupiter-esphome";
import { PageHeader, Panel, Tabs, CodeBlock, Badge } from "@belikh/jupiter-ui/kit.tsx";
import { Segmented, Select, Switch } from "@belikh/jupiter-ui/inputs.tsx";
import "../esp/esp.css";

const PALETTE_LABEL: Record<PaletteId, string> = { colour: "Colour", epaper3: "E-paper 3", epaper4: "E-paper 4", mono: "1-bit" };
const BEZEL_BG = (p: PaletteId) => (p === "epaper3" || p === "epaper4" ? " is-epaper" : "");

function Screen({ svg, w, h, zoom, palette }: { svg: string; w: number; h: number; zoom: number; palette: PaletteId }) {
  return (
    <div className={`esp-bezel${BEZEL_BG(palette)}`}>
      <div className="esp-screen" style={{ width: w * zoom, height: h * zoom }} dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}

function WidgetCard({ w, d, palette, zoom, t }: { w: WidgetDef<any>; d: Display; palette: PaletteId; zoom: number; t: number }) {
  const [tab, setTab] = useState("lambda");
  const size = w.size(d);
  const props = useMemo(() => w.simulate(w.defaults(d), t), [w, d, t]);
  const svg = useMemo(() => renderSvg(w, props, { width: size.w, height: size.h, palette, time: t }), [w, props, size.w, size.h, palette, t]);
  // Code does not depend on the simulated values (sensors are expressions), so build it once from the defaults.
  const lambda = useMemo(() => toLambda(w, w.defaults(d), { x: 0, y: 0, w: size.w, h: size.h }, palette), [w, d, size.w, size.h, palette]);
  const lvgl = useMemo(() => toLvgl(w, w.defaults(d), { x: 0, y: 0, w: size.w, h: size.h }), [w, d, size.w, size.h]);
  return (
    <Panel className="esp-card" title={w.label} actions={<Badge>{size.w}×{size.h}</Badge>}>
      <p className="jp-muted">{w.description}</p>
      <Screen svg={svg} w={size.w} h={size.h} zoom={Math.max(1, Math.min(zoom, Math.floor(300 / size.w)))} palette={palette} />
      <Tabs variant="pill" value={tab} onChange={setTab} tabs={[{ id: "lambda", label: "Display lambda" }, { id: "lvgl", label: "LVGL YAML" }]} />
      <div className="esp-code"><CodeBlock label={tab === "lambda" ? "lambda" : "yaml"} code={tab === "lambda" ? lambda : lvgl} /></div>
    </Panel>
  );
}

export function EspWidgets() {
  const [displayId, setDisplayId] = useState("tft-320x240");
  const d = display(displayId);
  const [override, setOverride] = useState<PaletteId | null>(null);
  const palette = override ?? d.palette;
  const [zoom, setZoom] = useState<1 | 2 | 3>(2);
  const [live, setLive] = useState(true);
  const [t, setT] = useState(0);
  useEffect(() => { if (!live) return; const id = setInterval(() => setT((x) => x + 0.6), 600); return () => clearInterval(id); }, [live]);

  const placements = useMemo(() => dashboard({ ...d, palette }, t), [d, palette, t]);
  const dashSvg = useMemo(() => composeSvg({ ...d, palette }, placements, t), [d, palette, placements, t]);
  const dashLambda = useMemo(() => composeLambda({ ...d, palette }, dashboard({ ...d, palette }, 0)), [d, palette]);
  const heroZoom = Math.max(1, Math.min(zoom, Math.floor(640 / d.width) || 1));

  return (
    <>
      <PageHeader title="ESPHome instruments" crumbs={["Library", "ESPHome"]}
        desc="Instrument widgets (dials, bars, tiles, sparklines…) in the Jupiter look, rendered at true device pixel size. Each one emits an ESPHome display lambda and an LVGL snippet for the ESPHome Designer."
        actions={<><Switch checked={live} onChange={setLive} label="Live values" /></>} />
      <Panel title="Display" className="adm-section">
        <div className="adm-row" style={{ gap: 24, alignItems: "flex-end" }}>
          <div style={{ minWidth: 300 }}><div className="jp-label">Preset</div><Select value={displayId} onChange={(v) => { setDisplayId(v); setOverride(null); }} aria-label="Display preset" options={DISPLAYS.map((x) => ({ value: x.id, label: x.label }))} /></div>
          <div><div className="jp-label">Palette</div><Segmented label="Palette" value={palette} onChange={(v) => setOverride(v)} options={(Object.keys(PALETTE_LABEL) as PaletteId[]).map((p) => ({ value: p, label: PALETTE_LABEL[p] }))} /></div>
          <div><div className="jp-label">Zoom</div><Segmented label="Zoom" value={String(zoom) as "1" | "2" | "3"} onChange={(v) => setZoom(Number(v) as 1 | 2 | 3)} options={[{ value: "1", label: "1×" }, { value: "2", label: "2×" }, { value: "3", label: "3×" }]} /></div>
          <div className="esp-inks" aria-label="Legal inks">{LEGAL[palette].map((c) => <span key={c} className="esp-ink"><i style={{ background: c }} />{c}</span>)}</div>
        </div>
        <p className="jp-muted" style={{ marginTop: 8 }}>{palette === "colour" ? "Full colour: inks come from the Jupiter tokens (dark scheme)." : palette === "mono" ? "1-bit: warn is drawn as a hatched fill, everything else is on/off." : "E-paper: paper is white, ink is black; danger is red" + (palette === "epaper4" ? ", warn is yellow." : ", warn shares red with danger.")} Colours are matched to what the panel can physically show.</p>
      </Panel>

      <section className="adm-section">
        <h2>Layout preview <small>{d.width}×{d.height} · {placements.length} widgets</small></h2>
        <div className="esp-hero">
          <Screen svg={dashSvg} w={d.width} h={d.height} zoom={heroZoom} palette={palette} />
          <div>
            <div className="esp-meta" style={{ marginBottom: 8 }}>Combined display lambda <Badge s="info">{placements.map((p) => p.id).join(" · ")}</Badge></div>
            <div className="esp-code" style={{ maxHeight: 420 }}><CodeBlock label="display lambda" code={dashLambda} /></div>
          </div>
        </div>
      </section>

      <section className="adm-section">
        <h2>Widgets <small>{WIDGETS.length}</small></h2>
        <div className="esp-grid">{WIDGETS.map((w) => <WidgetCard key={`${w.id}-${d.id}-${palette}`} w={w} d={{ ...d, palette }} palette={palette} zoom={zoom} t={t} />)}</div>
      </section>

      <Panel title="Using these in ESPHome" className="adm-section">
        <ol className="jp-prose">
          <li>Merge <code>@belikh/jupiter-tokens/esphome.yaml</code> into your device YAML: it defines the <code>color:</code> ids (<code>jp_text</code>, <code>jp_ok</code>…), the <code>font:</code> ids (<code>jp_mono_12</code>…<code>jp_mono_40</code>) and an <code>lvgl:</code> theme.</li>
          <li>Paste a widget's display lambda into your <code>display:</code> block (or the combined lambda above) and replace the <code>id(...)</code> sensor expressions with your own.</li>
          <li>On e-paper and OLED the lambdas use <code>COLOR_ON</code>/<code>COLOR_OFF</code> and literal <code>Color(...)</code> inks, so no colour ids are needed there; fonts are still required.</li>
        </ol>
        <p className="jp-muted">Generated code uses only these <code>it.*</code> calls: line, rectangle, filled_rectangle, circle, filled_circle, horizontal_line, printf, strftime, fill. It has not been compiled for a real device; preview arcs match the lambda's 3° line segments on 1-bit and e-paper palettes.</p>
      </Panel>
    </>
  );
}
