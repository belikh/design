import { useMemo, useState } from "react";
import { Segmented } from "@belikh/jupiter-ui/inputs.tsx";
import { Btn } from "@belikh/jupiter-ui/kit.tsx";
import { flameLayout, foldStacks, subtree, waterfall, type Span } from "./trace.ts";
import { C, Chart, Legend, Note, Readout, Scroll, Svg, fmt, useActions, useHits } from "./kit.tsx";
import type { FrameState } from "../charts/frame.tsx";

type Common = { title?: string; state?: FrameState };

/** D049 Trace span waterfall: one row per span, bar position = start offset, length = duration. Critical path spans get a bold outline; errors a hatch and a !. */
export function TraceWaterfall({ spans, title = "Trace waterfall: POST /checkout", state }: Common & { spans: Span[] }) {
  const { text, hit } = useHits(); const [crit, setCrit] = useState(true); const rows = useMemo(() => waterfall(spans), [spans]); const services = [...new Set(spans.map((s) => s.service))];
  const total = Math.max(1, ...spans.map((s) => s.start + s.dur));
  return (
    <>
      <div className="p3e-controls"><label><input type="checkbox" checked={crit} onChange={(e) => setCrit(e.target.checked)} /> Highlight critical path</label></div>
      <Chart title={title} n={spans.length} state={state} height={rows.length * 26 + 50}
        table={{ head: ["Span", "Service", "Start (ms)", "Duration (ms)", "Self (ms)", "Error", "Critical path"], rows: rows.map((r) => [`${"  ".repeat(r.depth)}${r.name}`, r.service, r.start, r.dur, Math.round(r.self * 10) / 10, r.error ? "yes" : "", r.critical ? "yes" : ""]) }}>
        {(w) => {
          const L = Math.min(230, w * 0.38), rowH = 26, X = (t: number) => L + (t / total) * (w - L - 12), H = rows.length * rowH + 30; const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * total);
          return (
            <>
              <Svg w={w} h={H} label={`${title}. ${rows.length} spans across ${services.length} services, total ${fmt(total)} ms. ${rows.filter((r) => r.error).length} with errors.`}>
                <defs><pattern id="p3e-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="6" fill="var(--jp-danger)" fillOpacity="0.55" /></pattern></defs>
                {ticks.map((t) => <g key={t}><line x1={X(t)} x2={X(t)} y1="18" y2={H} stroke="var(--jp-border)" /><text x={X(t)} y="12" textAnchor="middle" className="p3e-mute">{fmt(t)} ms</text></g>)}
                {rows.map((r, i) => { const y = 24 + i * rowH; return (
                  <g key={r.id} {...hit(r.id, `${r.name} in ${r.service}: starts at ${fmt(r.start)} ms, lasts ${fmt(r.dur)} ms (${fmt(r.self)} ms of its own, ${fmt(r.dur - r.self)} ms waiting on children).${r.error ? " This span reported an error." : ""}${r.critical ? " On the critical path." : ""}`)}>
                    <rect x="0" y={y - 3} width={w} height={rowH - 2} fill="transparent" />
                    <text x={6 + r.depth * 12} y={y + 9} dy="0.1em" style={{ fontWeight: r.depth === 0 ? 700 : undefined }}>{(r.name.length > 26 ? r.name.slice(0, 25) + "…" : r.name)}</text>
                    <rect x={X(r.start)} y={y} width={Math.max(2, X(r.start + r.dur) - X(r.start))} height={rowH - 8} rx="3" fill={C(services.indexOf(r.service))} stroke={crit && r.critical ? "var(--jp-text)" : "none"} strokeWidth="2" />
                    {r.error && <rect x={X(r.start)} y={y} width={Math.max(2, X(r.start + r.dur) - X(r.start))} height={rowH - 8} rx="3" fill="url(#p3e-hatch)" stroke="var(--jp-danger)" strokeWidth="2" />}
                    <text x={X(r.start + r.dur) + 4} y={y + 9} dy="0.1em" className="p3e-mute" style={X(r.start + r.dur) > w - 70 ? { display: "none" } : undefined}>{fmt(r.dur)} ms{r.error ? " !" : ""}</text>
                  </g>); })}
              </Svg>
              <Readout>{text}</Readout>
            </>
          );
        }}
      </Chart>
      <Legend items={[...services.map((s, i) => ({ label: s, color: C(i) })), { label: "error (hatched)", cls: "p3e-hatched" }]} />
      <Note>Bars are coloured by service. The critical path follows, at each level, the child that finishes last: shortening anything off it will not make the request faster.</Note>
    </>
  );
}

/** D049 Flame graph and icicle: width = samples. Flame is bottom-up with siblings sorted by name; icicle is top-down with the largest sibling first. Enter or click zooms into a frame. */
export function FlameGraph({ stacks, title = "Flame graph: CPU samples", state }: Common & { stacks: [string, number][] }) {
  const [mode, setMode] = useState<"flame" | "icicle">("flame"); const [zoom, setZoom] = useState<string[]>(["all"]); const { text, act } = useActions();
  const root = useMemo(() => foldStacks(stacks), [stacks]); const sub = subtree(root, zoom); const rects = useMemo(() => flameLayout(sub, mode === "flame" ? "name" : "size"), [sub, mode]);
  const top = [...new Set(root.children.flatMap((c) => c.children.map((x) => x.name)).concat(root.children.map((c) => c.name)))];
  const colourOf = (path: string[]) => C(Math.max(0, top.indexOf(path[2] ?? path[1] ?? "")));
  const total = sub.value;
  return (
    <>
      <div className="p3e-controls"><Segmented label="Orientation" value={mode} onChange={setMode} options={[{ value: "flame", label: "Flame (bottom-up)" }, { value: "icicle", label: "Icicle (top-down)" }]} />{zoom.length > 1 && <Btn sm onClick={() => setZoom(["all"])}>Reset zoom ({zoom.slice(1).join(" › ")})</Btn>}</div>
      <Chart title={title} n={stacks.length} state={state} height={300}
        table={{ head: ["Frame path", "Samples (with callees)", "Self samples", "Share of view"], rows: rects.map((r) => [r.path.join(";"), r.value, r.self, `${((r.value / total) * 100).toFixed(1)}%`]) }}>
        {(w) => {
          const rowH = 22, depth = Math.max(...rects.map((r) => r.depth)) + 1, H = depth * rowH + 8; const Y = (d: number) => (mode === "flame" ? H - 4 - (d + 1) * rowH : 4 + d * rowH);
          return (
            <>
              <Svg w={w} h={H} label={`${title}. ${total} samples, ${rects.length} frames, ${depth} levels deep. Press Enter on a frame to zoom into it.`}>
                {rects.map((r) => { const x = r.x0 * (w - 8) + 4, ww = (r.x1 - r.x0) * (w - 8); const chars = Math.floor((ww - 8) / 7.4); const lbl = `${r.name}: ${r.value} samples (${((r.value / total) * 100).toFixed(1)}%), ${r.self} self`; return (
                  <g key={r.path.join(";")} {...act(r.path.join(";"), lbl, () => setZoom(joinPath(zoom, r.path)))}>
                    <rect x={x} y={Y(r.depth)} width={Math.max(1, ww - 1)} height={rowH - 2} rx="2" fill={r.depth === 0 ? "var(--jp-surface)" : colourOf(joinPath(zoom, r.path))} stroke="var(--jp-surface-raised)" />
                    {chars >= 3 && <text x={x + 4} y={Y(r.depth) + 11} dy="0.1em" style={{ fill: "var(--jp-text)" }} className="p3e-halo">{r.name.length > chars ? r.name.slice(0, chars - 1) + "…" : r.name}</text>}
                  </g>); })}
              </Svg>
              <Readout>{text}</Readout>
            </>
          );
        }}
      </Chart>
      <Note>Width is the share of samples, not time on screen. Frames wider than their parent's remaining space cannot exist, so a wide frame near the top that tapers into thin children is cheap in itself, while a wide frame with nothing above it is where the time is spent.</Note>
    </>
  );
}
const joinPath = (zoom: string[], path: string[]) => [...zoom.slice(0, -1), ...path];
