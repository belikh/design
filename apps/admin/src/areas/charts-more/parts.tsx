import { C, Chart, fmt, legendOf, pct, T, ticksTo, type FrameState } from "./kit.tsx";
import { arcPath } from "./hier.ts";
import { gaugeAngle, hourAngle, likert, nps, ringAngles, roseRadius, TAU, waffleCounts } from "./radial.ts";
import { Marker, SHAPES } from "../charts/shared.tsx";

type Common = { id?: string; height?: number; state?: FrameState };
type Part = { label: string; value: number };
const sum = (p: Part[]) => p.reduce((a, b) => a + Math.max(0, b.value), 0);
const tableOf = (parts: Part[], counts: number[], cells: number) => ({ head: ["Part", "Value", "Share", `Cells (of ${cells})`], rows: parts.map((p, i) => [p.label, p.value, pct(p.value / (sum(parts) || 1), 1), counts[i]]) });

/* ---------- D025: waffle ---------- */
export function WaffleChart({ title = "Waffle", id = "D025", parts, cells = 100, cols = 10, height, state }: { title?: string; parts: Part[]; cells?: number; cols?: number } & Common) {
  const counts = waffleCounts(parts.map((p) => p.value), cells), rows = Math.ceil(cells / cols), S = 22, H = height ?? rows * S + 8, owner = counts.flatMap((c, i) => Array(c).fill(i) as number[]);
  return (
    <Chart title={title} id={id} height={H} state={state} count={sum(parts) > 0 ? 1 : 0} legend={legendOf(parts.map((p) => p.label))}
      items={parts.map((p, i) => `${p.label}: ${p.value} (${pct(p.value / sum(parts), 1)}), ${counts[i]} of ${cells} squares`)}
      summary={`Waffle of ${cells} squares: ${parts.map((p, i) => `${p.label} ${counts[i]}`).join(", ")}. Each square is ${pct(1 / cells, 1)}; counts use largest-remainder rounding so they total ${cells}.`}
      table={tableOf(parts, counts, cells)}
      build={(_w, pk) => (<>
        {owner.map((o, k) => <rect key={k} {...pk.mark(o)} x={4 + (k % cols) * S} y={4 + (rows - 1 - Math.floor(k / cols)) * S} width={S - 3} height={S - 3} rx={3} fill={C(o)} />)}
        {parts.map((p, i) => <g key={i}><rect x={cols * S + 30} y={8 + i * 26} width={14} height={14} rx={3} fill={C(i)} /><T x={cols * S + 52} y={19 + i * 26} anchor="start" cls="lab-tl">{p.label} {counts[i]}</T></g>)}
      </>)} />
  );
}

/* ---------- D025: pictogram ---------- */
export function Pictogram({ title = "Pictogram", id = "D025", parts, icons = 50, cols = 10, height, state }: { title?: string; parts: Part[]; icons?: number; cols?: number } & Common) {
  const counts = waffleCounts(parts.map((p) => p.value), icons), rows = Math.ceil(icons / cols), S = 30, H = height ?? rows * S + 8, owner = counts.flatMap((c, i) => Array(c).fill(i) as number[]), per = sum(parts) / icons;
  return (
    <Chart title={title} id={id} height={H} state={state} count={sum(parts) > 0 ? 1 : 0}
      items={parts.map((p, i) => `${p.label}: ${p.value}, shown as ${counts[i]} ${SHAPES[i % 4]} icons`)}
      summary={`Pictogram: ${icons} icons, one icon is about ${fmt(per)} units. ${parts.map((p, i) => `${p.label} ${counts[i]} icons (${SHAPES[i % 4]})`).join(", ")}. Each category has its own shape as well as colour.`}
      table={tableOf(parts, counts, icons)}
      build={(_w, pk) => (<>
        {owner.map((o, k) => { const x = 4 + (k % cols) * S + S / 2, y = 4 + Math.floor(k / cols) * S + S / 2; return <g key={k} {...pk.mark(o)}><circle cx={x} cy={y - 5} r={5} fill={C(o)} /><Marker shape={SHAPES[o % 4]} x={x} y={y + 7} r={5.5} fill={C(o)} /></g>; })}
        {parts.map((p, i) => <g key={i}><Marker shape={SHAPES[i % 4]} x={cols * S + 38} y={16 + i * 26} r={6} fill={C(i)} /><T x={cols * S + 52} y={20 + i * 26} anchor="start" cls="lab-tl">{p.label} ({counts[i]})</T></g>)}
        <T x={cols * S + 38} y={H - 8} anchor="start">1 icon = {fmt(per)}</T>
      </>)} />
  );
}

/* ---------- D025: unit chart ---------- */
export function UnitChart({ title = "Unit chart", id = "D025", rows, per = 1, unit = "tickets", state }: { title?: string; rows: Part[]; per?: number; unit?: string } & Common) {
  const hf = () => rows.length * 30 + 12;
  return (
    <Chart title={title} id={id} height={hf} state={state} count={rows.length}
      items={rows.map((r) => `${r.label}: ${r.value} ${unit} (${Math.floor(r.value / per)} full squares${r.value % per ? " and one partial" : ""})`)}
      summary={`Unit chart: one square is ${per} ${unit}. ${rows.map((r) => `${r.label} ${r.value}`).join(", ")}.`}
      table={{ head: ["Row", unit, "Squares"], rows: rows.map((r) => [r.label, r.value, Math.round((r.value / per) * 100) / 100]) }}
      build={(w, pk) => {
        const l = 110, max = Math.max(1, ...rows.map((r) => Math.ceil(r.value / per))), sq = Math.max(6, Math.min(20, Math.floor((w - l - 50) / max) - 3));
        return (<>{rows.map((r, i) => { const n = r.value / per, y = 8 + i * 30; return (<g key={r.label} {...pk.mark(i)}>
          <T x={l - 8} y={y + sq / 2 + 3} anchor="end" cls="lab-tl">{r.label}</T>
          {Array.from({ length: Math.ceil(n) }, (_, k) => { const f = Math.min(1, n - k); return <g key={k}><rect x={l + k * (sq + 3)} y={y} width={sq} height={sq} rx={2} className="lab-flat" /><rect x={l + k * (sq + 3)} y={y} width={sq * f} height={sq} rx={2} fill={C(i)} /></g>; })}
          <T x={l + Math.ceil(n) * (sq + 3) + 4} y={y + sq / 2 + 3} anchor="start">{r.value}</T></g>); })}</>);
      }} />
  );
}

/* ---------- D026: rose chart ---------- */
export function RoseChart({ title = "Rose chart", id = "D026", labels, values, unit = "incidents", height = 320, state }: { title?: string; labels: string[]; values: number[]; unit?: string } & Common) {
  const max = Math.max(0, ...values), n = values.length, season = (i: number) => Math.floor(((i + 1) % 12) / 3);
  return (
    <Chart title={title} id={id} height={height} state={state} count={max > 0 ? 1 : 0} legend={n === 12 ? legendOf(["Winter", "Spring", "Summer", "Autumn"]) : undefined}
      items={labels.map((l, i) => `${l}: ${values[i]} ${unit} (${pct(values[i] / (values.reduce((a, b) => a + b, 0) || 1), 1)} of year)`)}
      summary={`Rose chart of ${n} ${unit} by month; slice area is proportional to value. Peak ${labels[values.indexOf(max)]} with ${max}, lowest ${labels[values.indexOf(Math.min(...values))]} with ${Math.min(...values)}.`}
      table={{ head: ["Month", unit], rows: labels.map((l, i) => [l, values[i]]) }}
      build={(w, pk) => {
        const cx = w / 2, cy = height / 2, R = Math.min(w, height) / 2 - 26, tk = ticksTo(max, 3);
        return (<>
          {tk.slice(1).map((t) => <g key={t}><circle cx={cx} cy={cy} r={roseRadius(t, max, R)} fill="none" className="adm-gl" /><T x={cx + 3} y={cy - roseRadius(t, max, R) - 2} anchor="start">{t}</T></g>)}
          {values.map((v, i) => { const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU, mid = (a0 + a1) / 2; return (<g key={i}>
            <path {...pk.mark(i)} d={arcPath(cx, cy, 0, Math.max(1, roseRadius(v, max, R)), a0 + 0.01, a1 - 0.01)} fill={C(n === 12 ? season(i) : i)} fillOpacity={0.85} stroke="var(--jp-surface-raised)" strokeWidth={1.5} />
            <T x={cx + (R + 14) * Math.sin(mid)} y={cy - (R + 14) * Math.cos(mid) + 4}>{labels[i]}</T></g>); })}
        </>);
      }} />
  );
}

/* ---------- D026: 24-hour radial clock ---------- */
export function ClockChart({ title = "24-hour clock", id = "D026", byHour, unit = "events", height = 340, state }: { title?: string; byHour: number[]; unit?: string } & Common) {
  const max = Math.max(0, ...byHour), peak = byHour.indexOf(max), hh = (h: number) => `${String(h % 24).padStart(2, "0")}:00`;
  return (
    <Chart title={title} id={id} height={height} state={state} count={max > 0 ? 1 : 0} legend={[{ name: "Hourly count (radius)", color: "var(--adm-c1)" }, { name: "Busiest hour", color: "var(--adm-c2)" }]}
      items={byHour.map((v, h) => `${hh(h)} to ${hh(h + 1)}: ${v} ${unit}${h === peak ? " (busiest hour)" : ""}`)}
      summary={`24-hour radial clock, midnight at the top, clockwise. Busiest hour ${hh(peak)} with ${max} ${unit}; quietest ${hh(byHour.indexOf(Math.min(...byHour)))}.`}
      table={{ head: ["Hour", unit], rows: byHour.map((v, h) => [hh(h), v]) }}
      build={(w, pk) => {
        const cx = w / 2, cy = height / 2, R = Math.min(w, height) / 2 - 28, r0 = R * 0.3;
        return (<>
          <circle cx={cx} cy={cy} r={R} className="lab-flat" /><path d={arcPath(cx, cy, r0, R, hourAngle(6), hourAngle(18))} fill="var(--jp-surface-raised)" opacity={0.6} />
          {[0.5, 1].map((f) => <circle key={f} cx={cx} cy={cy} r={r0 + (R - r0) * f} fill="none" className="adm-gl" />)}
          {byHour.map((v, h) => <path key={h} {...pk.mark(h)} d={arcPath(cx, cy, r0, r0 + Math.max(1.5, ((R - r0) * v) / (max || 1)), hourAngle(h) + 0.012, hourAngle(h + 1) - 0.012)} fill={h === peak ? "var(--adm-c2)" : "var(--adm-c1)"} />)}
          {Array.from({ length: 8 }, (_, k) => k * 3).map((h) => <T key={h} x={cx + (R + 15) * Math.sin(hourAngle(h))} y={cy - (R + 15) * Math.cos(hourAngle(h)) + 4}>{String(h).padStart(2, "0")}</T>)}
          <T x={cx} y={cy - 2} cls="lab-tc">{pk.i === null ? hh(peak) : hh(pk.i)}</T><T x={cx} y={cy + 14}>{pk.i === null ? "peak" : `${byHour[pk.i]} ${unit}`}</T>
        </>);
      }} />
  );
}

/* ---------- D027: nested donut ---------- */
export function NestedDonut({ title = "Nested donut", id = "D027", inner, outer, unit = "%", height = 320, state }: { title?: string; inner: Part[]; outer: (Part & { parent: number })[]; unit?: string } & Common) {
  const ti = sum(inner), ai = ringAngles(inner.map((p) => p.value)), ao = ringAngles(outer.map((p) => p.value)), items = [...inner.map((p) => `${p.label}: ${p.value}${unit}, ${pct(p.value / ti, 1)} of total (inner ring)`), ...outer.map((p) => `${inner[p.parent]?.label} / ${p.label}: ${p.value}${unit}, ${pct(p.value / ti, 1)} of total (outer ring)`)];
  return (
    <Chart title={title} id={id} height={height} state={state} count={ti > 0 ? 1 : 0} items={items} legend={legendOf(inner.map((p) => p.label))}
      summary={`Nested donut: inner ring ${inner.map((p) => `${p.label} ${p.value}${unit}`).join(", ")}; outer ring splits each into ${outer.length} sub-parts.`}
      table={{ head: ["Ring", "Part", "Parent", "Value"], rows: [...inner.map((p) => ["inner", p.label, "", p.value]), ...outer.map((p) => ["outer", p.label, inner[p.parent]?.label ?? "", p.value])] }}
      build={(w, pk) => {
        const cx = w / 2, cy = height / 2, R = Math.min(w, height) / 2 - 6, h = R * 0.3, r0 = R * 0.3;
        return (<>
          {inner.map((p, i) => <path key={i} {...pk.mark(i)} d={arcPath(cx, cy, r0, r0 + h - 2, ai[i].a0, ai[i].a1)} fill={C(i)} stroke="var(--jp-surface-raised)" strokeWidth={1.5} />)}
          {outer.map((p, i) => <path key={`o${i}`} {...pk.mark(inner.length + i)} d={arcPath(cx, cy, r0 + h + 2, R, ao[i].a0, ao[i].a1)} fill={C(p.parent)} fillOpacity={0.5 + 0.18 * (outer.slice(0, i).filter((q) => q.parent === p.parent).length % 3)} stroke="var(--jp-surface-raised)" strokeWidth={1.5} />)}
          <T x={cx} y={cy + 4} cls="lab-tc">{ti}{unit}</T>
        </>);
      }} />
  );
}

/* ---------- D027: gauge cluster ---------- */
export type GaugeSpec = { label: string; value: number; max: number; unit: string; zones: [number, number] };
const zoneOf = (g: GaugeSpec) => (g.value / g.max >= g.zones[1] ? "critical" : g.value / g.max >= g.zones[0] ? "warning" : "normal");
export function GaugeCluster({ title = "Gauge cluster", id = "D027", gauges, state }: { title?: string; gauges: GaugeSpec[] } & Common) {
  const colsOf = (w: number) => (w >= 560 ? Math.min(4, gauges.length) : 2), hf = (w: number) => Math.ceil(gauges.length / colsOf(w)) * 150 + 8;
  return (
    <Chart title={title} id={id} height={hf} state={state} count={gauges.length}
      items={gauges.map((g) => `${g.label}: ${g.value}${g.unit} of ${g.max}${g.unit}, ${zoneOf(g)}`)}
      summary={`Cluster of ${gauges.length} gauges: ${gauges.map((g) => `${g.label} ${g.value}${g.unit} (${zoneOf(g)})`).join(", ")}. Zone is also written under each dial.`}
      legend={[{ name: "Normal", color: "var(--jp-ok)" }, { name: "Warning", color: "var(--jp-warn)" }, { name: "Critical", color: "var(--jp-danger)" }]}
      table={{ head: ["Gauge", "Value", "Max", "Unit", "Zone"], rows: gauges.map((g) => [g.label, g.value, g.max, g.unit, zoneOf(g)]) }}
      build={(w, pk) => {
        const cols = colsOf(w), cw = (w - 8) / cols, A = 2.1;
        return (<>{gauges.map((g, i) => {
          const cx = 4 + (i % cols) * cw + cw / 2, cy = 4 + Math.floor(i / cols) * 150 + 86, R = Math.min(cw / 2 - 8, 64), a = gaugeAngle(g.value, 0, g.max, -A, A), z = [gaugeAngle(g.zones[0] * g.max, 0, g.max, -A, A), gaugeAngle(g.zones[1] * g.max, 0, g.max, -A, A)];
          return (<g key={g.label} {...pk.mark(i)}>
            <path d={arcPath(cx, cy, R - 12, R, -A, z[0])} fill="var(--jp-ok)" opacity={0.75} /><path d={arcPath(cx, cy, R - 12, R, z[0], z[1])} fill="var(--jp-warn)" opacity={0.75} /><path d={arcPath(cx, cy, R - 12, R, z[1], A)} fill="var(--jp-danger)" opacity={0.75} />
            <line x1={cx} y1={cy} x2={cx + (R - 6) * Math.sin(a)} y2={cy - (R - 6) * Math.cos(a)} stroke="var(--jp-text)" strokeWidth={3} strokeLinecap="round" /><circle cx={cx} cy={cy} r={5} fill="var(--jp-text)" />
            <T x={cx} y={cy + 28} cls="lab-tc">{g.value}{g.unit}</T><T x={cx} y={cy + 44} cls="lab-tl">{g.label}</T><T x={cx} y={cy + 58}>{zoneOf(g)}</T>
          </g>);
        })}</>);
      }} />
  );
}

/* ---------- D028: diverging Likert ---------- */
export function LikertChart({ title = "Diverging Likert", id = "D028", cats, rows, height, state }: { title?: string; cats: string[]; rows: { label: string; counts: number[] }[] } & Common) {
  const L = rows.map((r) => likert(r.counts)), ext = Math.max(10, Math.ceil(Math.max(...L.map((l) => Math.max(l.neg, l.pos)), 0) / 10) * 10), H = height ?? rows.length * 44 + 44, mid = Math.floor(cats.length / 2), odd = cats.length % 2 === 1;
  const shade = (c: number) => (odd && c === mid ? { fill: "var(--jp-border)", op: 1 } : c < mid ? { fill: "var(--adm-c2)", op: 0.45 + 0.55 * ((mid - 1 - c) / Math.max(1, mid - 1)) } : { fill: "var(--adm-c1)", op: 0.45 + 0.55 * ((c - (odd ? mid + 1 : mid)) / Math.max(1, cats.length - 1 - (odd ? mid + 1 : mid))) });
  return (
    <Chart title={title} id={id} height={H} state={state} count={rows.length} legend={cats.map((name, c) => ({ name, color: shade(c).fill }))}
      items={rows.map((r, i) => `${r.label}: ${pct(L[i].segs.slice(mid + (odd ? 1 : 0)).reduce((a, s) => a + s.pct, 0) / 100)} agree, ${pct(L[i].segs.slice(0, mid).reduce((a, s) => a + s.pct, 0) / 100)} disagree, ${odd ? `${pct(L[i].segs[mid].pct / 100)} neutral, ` : ""}n=${r.counts.reduce((a, b) => a + b, 0)}`)}
      summary={`Diverging Likert bars for ${rows.length} statements on a ${cats.length}-point scale (${cats[0]} to ${cats[cats.length - 1]}); disagreement extends left, agreement right, neutral straddles zero.`}
      table={{ head: ["Statement", ...cats.map((c) => `${c} (%)`)], rows: rows.map((r, i) => [r.label, ...L[i].segs.map((s) => Math.round(s.pct * 10) / 10)]) }}
      build={(w, pk) => {
        const l = Math.min(210, w * 0.34), x = (v: number) => l + ((v + ext) / (2 * ext)) * (w - l - 10), rh = 44;
        return (<>
          {[-ext, -ext / 2, 0, ext / 2, ext].map((t) => <g key={t}><line x1={x(t)} x2={x(t)} y1={4} y2={H - 28} className={t === 0 ? "lab-ink" : "adm-gl"} /><T x={x(t)} y={H - 12}>{Math.abs(t)}%</T></g>)}
          {rows.map((r, i) => { const y = 8 + i * rh; return (<g key={r.label} {...pk.mark(i)}>
            <T x={l - 10} y={y + rh / 2 - 2} anchor="end" cls="lab-tl">{r.label.length > l / 7 ? r.label.slice(0, Math.floor(l / 7) - 1) + "…" : r.label}</T>
            {L[i].segs.map((s) => { const sh = shade(s.cat); return <rect key={s.cat} x={x(s.x0)} width={Math.max(0, x(s.x1) - x(s.x0))} y={y + 6} height={rh - 18} fill={sh.fill} fillOpacity={sh.op} stroke="var(--jp-surface-raised)" />; })}
          </g>); })}
        </>);
      }} />
  );
}

/* ---------- D028: NPS gauge ---------- */
export function NpsGauge({ title = "Net Promoter Score", id = "D028", scores, height = 300, state }: { title?: string; scores: number[] } & Common) {
  const r = nps(scores), band = r.score < 0 ? "poor" : r.score < 30 ? "fair" : "good", segs = [{ label: "Detractors (0-6)", v: r.detractors }, { label: "Passives (7-8)", v: r.passives }, { label: "Promoters (9-10)", v: r.promoters }];
  return (
    <Chart title={title} id={id} height={height} state={state} count={scores.length}
      items={[`NPS ${Math.round(r.score)} (${band}) from ${r.n} responses`, ...segs.map((s) => `${s.label}: ${s.v.toFixed(1)}%`)]}
      summary={`Net Promoter Score ${Math.round(r.score)} on a scale of -100 to 100 (${band}), from ${r.n} responses: ${segs.map((s) => `${s.label} ${s.v.toFixed(0)}%`).join(", ")}.`}
      legend={segs.map((s, i) => ({ name: s.label, color: C([2, 3, 0][i]) }))}
      table={{ head: ["Group", "Share (%)"], rows: [...segs.map((s) => [s.label, Math.round(s.v * 10) / 10]), ["NPS", Math.round(r.score * 10) / 10]] }}
      build={(w, pk) => {
        const cx = w / 2, cy = 150, R = Math.min(w / 2 - 20, 130), a = (v: number) => gaugeAngle(v, -100, 100, -Math.PI / 2, Math.PI / 2), bx = Math.min(w - 40, 420), x0 = (w - bx) / 2; let acc = 0;
        return (<>
          <path d={arcPath(cx, cy, R - 22, R, a(-100), a(0))} fill="var(--jp-danger)" opacity={0.75} /><path d={arcPath(cx, cy, R - 22, R, a(0), a(30))} fill="var(--jp-warn)" opacity={0.75} /><path d={arcPath(cx, cy, R - 22, R, a(30), a(100))} fill="var(--jp-ok)" opacity={0.75} />
          {[-100, 0, 100].map((t) => <T key={t} x={cx + (R + 14) * Math.sin(a(t))} y={cy - (R + 14) * Math.cos(a(t)) + (t === 0 ? -2 : 14)}>{t}</T>)}
          <line x1={cx} y1={cy} x2={cx + (R - 10) * Math.sin(a(r.score))} y2={cy - (R - 10) * Math.cos(a(r.score))} stroke="var(--jp-text)" strokeWidth={4} strokeLinecap="round" /><circle cx={cx} cy={cy} r={6} fill="var(--jp-text)" />
          <T x={cx} y={cy + 30} cls="lab-tc">NPS {Math.round(r.score)}</T><T x={cx} y={cy + 46}>{band}</T>
          {segs.map((s, i) => { const x = x0 + (acc / 100) * bx, ww = (s.v / 100) * bx; acc += s.v; return <g key={i}><rect {...pk.mark(i + 1)} x={x} y={cy + 62} width={Math.max(0, ww - 1)} height={22} fill={C([2, 3, 0][i])} />{ww > 36 && <T x={x + ww / 2} y={cy + 77} cls="lab-tw" pointerEvents="none">{Math.round(s.v)}%</T>}</g>; })}
        </>);
      }} />
  );
}
