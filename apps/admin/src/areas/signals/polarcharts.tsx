import { useState } from "react";
import { C } from "@belikh/jupiter-ui/Charts.tsx";
import { Segmented } from "@belikh/jupiter-ui/inputs.tsx";
import { parallelNormalise, polarAreaWedges, polarPoint, radarVertices, ringPath } from "./polar.ts";
import { layoutCloud, sizeScale, type CloudWord } from "./wordcloud.ts";
import { Fig, f1, lin, pathOf, table } from "./shared.tsx";

/** D061: radar / spider chart. Each series is a polygon; series also differ by dash pattern and marker shape. */
export function Radar({ axes, series, max = 100, title = "Plan comparison" }: { axes: string[]; series: { name: string; values: number[] }[]; max?: number; title?: string }) {
  const dash = ["", "6 3", "2 3", "8 3 2 3"];
  return (
    <Fig title={title} empty={!axes.length || !series.length} count={axes.length} height={320}
      summary={`${title}: ${series.length} series on ${axes.length} axes (${axes.join(", ")}); ${series.map((s) => `${s.name} peaks on ${axes[s.values.indexOf(Math.max(...s.values))]}`).join("; ")}.`}
      table={table(["Axis", ...series.map((s) => s.name)], axes.map((a, i) => [a, ...series.map((s) => s.values[i])]))} legend={series.map((s, i) => ({ name: s.name, color: C(i) }))}
      describe={(i) => `${axes[i]}: ${series.map((s) => `${s.name} ${s.values[i]}`).join(", ")} (scale 0 to ${max})`}
      render={({ w, h, active, setActive }) => {
        const cx = w / 2, cy = h / 2 + 4, R = Math.min(w / 2 - 54, h / 2 - 28), n = axes.length;
        return <>{[0.25, 0.5, 0.75, 1].map((f) => <path key={f} className="lab-gl" d={ringPath(axes.map((_, i) => polarPoint(cx, cy, R * f, (360 * i) / n)))} />)}
          {axes.map((a, i) => { const p = polarPoint(cx, cy, R, (360 * i) / n), q = polarPoint(cx, cy, R + 16, (360 * i) / n); return <g key={a} onPointerEnter={() => setActive(i)}><line className="lab-gl" x1={cx} y1={cy} x2={p[0]} y2={p[1]} /><text className={`lab-ax${active === i ? " lab-ax--strong" : ""}`} x={q[0]} y={q[1]} textAnchor={Math.abs(q[0] - cx) < 6 ? "middle" : q[0] > cx ? "start" : "end"} dominantBaseline="middle">{a}</text></g>; })}
          {series.map((s, k) => { const v = radarVertices(s.values, max, cx, cy, R); return <g key={s.name}><path d={ringPath(v)} fill={C(k)} fillOpacity={0.14} stroke={C(k)} strokeWidth={2} strokeDasharray={dash[k % 4]} />{v.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={active === i ? 5 : 3} fill={C(k)} />)}</g>; })}
          <text className="lab-ax" x={cx + 4} y={cy - R - 2}>{max}</text></>;
      }} />
  );
}

/** D061: polar area (coxcomb): equal angles, area proportional to value. */
export function PolarArea({ labels, values, title = "Monthly incidents" }: { labels: string[]; values: number[]; title?: string }) {
  return (
    <Fig title={title} empty={!values.length} count={values.length} height={320}
      summary={`${title}: ${values.length} sectors; highest ${labels[values.indexOf(Math.max(...values))]} (${Math.max(...values)}), lowest ${labels[values.indexOf(Math.min(...values))]} (${Math.min(...values)}). Wedge area is proportional to value.`}
      table={table(["Sector", "Value"], labels.map((l, i) => [l, values[i]]))}
      describe={(i) => `${labels[i]}: ${values[i]}`}
      render={({ w, h, active, setActive }) => {
        const cx = w / 2, cy = h / 2, R = Math.min(w / 2, h / 2) - 22, wd = polarAreaWedges(values, cx, cy, R);
        return <>{[0.5, 1].map((f) => <circle key={f} className="lab-gl" cx={cx} cy={cy} r={R * f} />)}
          {wd.map((x, i) => <path key={i} d={x.path} fill={C(i)} fillOpacity={0.75} stroke={active === i ? "var(--jp-text)" : "var(--jp-surface-raised)"} strokeWidth={active === i ? 3 : 1.5} onPointerEnter={() => setActive(i)} />)}
          {labels.map((l, i) => { const p = polarPoint(cx, cy, R + 12, (360 * (i + 0.5)) / labels.length); return <text key={l} className="lab-ax" x={p[0]} y={p[1]} textAnchor="middle" dominantBaseline="middle">{l}</text>; })}</>;
      }} />
  );
}

/** D061: parallel coordinates. Click a group in the legend row to emphasise it; the slider highlights one record. */
export function ParallelCoords({ dims, rows, groups, invert = [], title = "Vehicle comparison" }: { dims: string[]; rows: { name: string; group: number; values: number[] }[]; groups: string[]; invert?: boolean[]; title?: string }) {
  const [g, setG] = useState("all"); const norm = parallelNormalise(rows.map((r) => r.values), invert);
  return (
    <div>
      <div className="lab-controls"><Segmented label="Emphasise group" value={g} onChange={setG} options={[{ value: "all", label: "All" }, ...groups.map((n, i) => ({ value: String(i), label: n }))]} /></div>
      <Fig title={title} empty={!rows.length} count={rows.length} height={300}
        summary={`${title}: ${rows.length} records across ${dims.length} dimensions (${dims.join(", ")}) in ${groups.length} groups.`}
        table={table(["Record", "Group", ...dims], rows.map((r) => [r.name, groups[r.group], ...r.values]))} legend={groups.map((n, i) => ({ name: n, color: C(i) }))}
        describe={(i) => `${rows[i].name} (${groups[rows[i].group]}): ${dims.map((d, k) => `${d} ${rows[i].values[k]}`).join(", ")}`}
        render={({ w, h, active, setActive }) => {
          const l = 28, r = w - 28, x = (d: number) => lin(0, dims.length - 1, l, r)(d), y = lin(0, 1, h - 30, 24);
          return <>{dims.map((d, k) => <g key={d}><line className="lab-ink" x1={x(k)} x2={x(k)} y1={y(0)} y2={y(1)} /><text className="lab-ax lab-ax--strong" x={x(k)} y={h - 8} textAnchor={k === 0 ? "start" : k === dims.length - 1 ? "end" : "middle"}>{d}</text>
            <text className="lab-ax" x={x(k)} y={14} textAnchor="middle">{f1(invert[k] ? norm.lo[k] : norm.hi[k])}</text></g>)}
            {rows.map((row, i) => { const on = g === "all" || g === String(row.group) || active === i; return <path key={i} className="lab-line" d={pathOf(norm.rows[i].map((v, k) => [x(k), y(v)]))} stroke={C(row.group)} strokeWidth={active === i ? 4 : 1.6} opacity={on ? 0.9 : 0.12} onPointerEnter={() => setActive(i)} />; })}</>;
        }} />
    </div>
  );
}

/** D062: word cloud. Words are placed by a deterministic spiral packer (no overlaps); size encodes weight, colour encodes only rank band. */
export function WordCloud({ words, title = "Support topics" }: { words: CloudWord[]; title?: string }) {
  const [sel, setSel] = useState<string | null>(null);
  return (
    <Fig title={title} empty={!words.length} count={words.length} height={320}
      summary={`${title}: ${words.length} terms; largest ${[...words].sort((a, b) => b.weight - a.weight).slice(0, 3).map((x) => x.text).join(", ")}. Size shows weight.`}
      table={table(["Term", "Weight"], [...words].sort((a, b) => b.weight - a.weight).map((x) => [x.text, x.weight]))}
      describe={(i) => { const s = [...words].sort((a, b) => b.weight - a.weight)[i]; return `${s.text}: weight ${s.weight}`; }}
      footer={sel ? <p className="lab-note">Selected: <b>{sel}</b></p> : undefined}
      render={({ w, h, active, setActive }) => {
        const { placed } = layoutCloud(words, w, h, 12, 40), order = [...words].sort((a, b) => b.weight - a.weight).map((x) => x.text);
        return <>{placed.map((p, k) => <text key={p.text} className="lab-word" x={p.x + 1} y={p.y + p.h * 0.8} style={{ fontSize: p.size }} fill={C(Math.floor((k * 8) / placed.length))} stroke={active === order.indexOf(p.text) ? "var(--jp-text)" : "none"} strokeWidth={0.6} onPointerEnter={() => setActive(order.indexOf(p.text))} onClick={() => setSel(p.text)}>{p.text}</text>)}</>;
      }} />
  );
}

/** D062: tag cloud as real buttons (keyboard and screen-reader friendly), alphabetical, size on a log scale. */
export function TagCloud({ words, onPick, title = "Tags" }: { words: CloudWord[]; onPick?: (t: string | null) => void; title?: string }) {
  const [sel, setSel] = useState<string | null>(null);
  if (!words.length) return <p className="lab-note" role="status">No data. No tags to show.</p>;
  const s = sizeScale(words.map((w) => w.weight), 0.85, 2.1), sorted = [...words].sort((a, b) => a.text.localeCompare(b.text));
  return (
    <figure style={{ margin: 0 }}>
      <div className="lab-tags" role="group" aria-label={title}>
        {sorted.map((w) => <button type="button" key={w.text} className="lab-tag" aria-pressed={sel === w.text} aria-label={`${w.text}, ${w.weight} items`} style={{ fontSize: `${s(w.weight).toFixed(2)}rem`, fontWeight: w.weight > 60 ? 700 : 400 }} onClick={() => { const n = sel === w.text ? null : w.text; setSel(n); onPick?.(n); }}>{w.text}</button>)}
      </div>
      <figcaption className="lab-note" aria-live="polite">{sel ? `Filtering by ${sel} (${words.find((w) => w.text === sel)?.weight} items). Press again to clear.` : "Size shows how many items carry the tag. Select a tag to filter."}</figcaption>
    </figure>
  );
}
