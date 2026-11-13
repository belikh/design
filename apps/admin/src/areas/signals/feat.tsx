import { useMemo, useRef, useState } from "react";
import { C } from "@belikh/jupiter-ui/Charts.tsx";
import { Segmented } from "@belikh/jupiter-ui/inputs.tsx";
import { Badge, Btn } from "@belikh/jupiter-ui/kit.tsx";
import { asciiChart, asciiSpark, breaches, crossFilter, logPos, toPercent, type ThresholdBand } from "./features.ts";
import { logFloor, logTicks, percentChange, scalePos, selectInPolygon, type Pt } from "./interact.ts";
import { FreshnessBar, useChartInteractions, type ChartIx, type Meta } from "./useChartInteractions.tsx";
import { Fig, M, Patterns, XLabels, YAxis, f1, lin, patUrl, pathOf, table, ticks } from "./shared.tsx";

const seen = (ix: ChartIx, a: number, b: number) => ({ active: ix.cursor === null || ix.cursor < a || ix.cursor > b ? null : ix.cursor - a, set: (i: number | null) => ix.setCursor(i === null ? null : i + a) });
/**
 * Line chart with every D074 option, built on `useChartInteractions`: drag-to-zoom with a visible range control, a crosshair shared by every chart with the same `group`,
 * lasso select (pointer polygon, or keyboard: Space adds vertices, Enter closes), threshold bands with alert markers, a ghost series, linear/log and absolute/percent-change toggles,
 * and (with `meta`) a last-updated stamp and query inspector. In percent mode every series is a change from its own first visible point and bands are converted with the main series' base.
 */
export function TrendFig({ title, labels, values, prev, bands = [], height = 240, unit = "", group, syncZoom, meta, controls }: { title: string; labels: string[]; values: number[]; prev?: number[]; bands?: ThresholdBand[]; height?: number; unit?: string; group?: string; syncZoom?: boolean; meta?: Meta; controls?: boolean }) {
  const ix = useChartInteractions({ n: values.length, labels, group, syncZoom, scales: true, lasso: true, meta, controls }), [a, b] = ix.range, [sel, setSel] = useState<number[]>([]);
  const L = labels.slice(a, b + 1), V = values.slice(a, b + 1), Pv = prev?.slice(a, b + 1), alerts = useMemo(() => breaches(V, bands), [V, bands]), pctMode = ix.units === "pct", log = ix.scale === "log";
  const base = V[0] ?? 0, tf = (v: number) => (pctMode ? percentChange([v], base)[0] : v), tv = V.map(tf), tpv = Pv ? (pctMode ? percentChange(Pv) : Pv) : undefined, suffix = pctMode ? "%" : unit, chosen = sel.filter((i) => i >= a && i <= b);
  return (
    <Fig title={title} empty={!V.length} count={V.length} height={height} ix={ix} shared={seen(ix, a, b)}
      summary={`${title}: ${V.length} of ${values.length} points from ${L[0]} to ${L.at(-1)}, range ${f1(Math.min(...tv))} to ${f1(Math.max(...tv))}${suffix}${log ? " on a log axis" : ""}; ${alerts.length} alert${alerts.length === 1 ? "" : "s"}${alerts.length ? ` (${alerts.map((x) => `${x.band.label} at ${L[x.start]}`).join("; ")})` : ""}${Pv ? "; previous period shown as a dashed grey line" : ""}.`}
      table={table(["Time", `Value${unit ? ` (${unit.trim()})` : ""}`, ...(pctMode ? ["Change from first shown (%)"] : []), ...(Pv ? ["Previous period"] : []), "Alert", "Selected"], L.map((l, i) => [l, V[i], ...(pctMode ? [+tv[i].toFixed(2)] : []), ...(Pv ? [Pv[i]] : []), bands.find((x) => V[i] >= x.from && V[i] < x.to)?.label ?? "", sel.includes(a + i) ? "yes" : ""]))}
      legend={[{ name: "Current", color: C(0) }, ...(Pv ? [{ name: "Previous period (dashed)", color: "var(--jp-text-muted)" }] : [])]}
      footer={sel.length > 0 ? <p className="p3-stats">Lasso: <b>{chosen.length}</b> in view of <b>{sel.length}</b> selected{chosen.length > 0 && <> mean <b>{f1(chosen.reduce((s, i) => s + values[i], 0) / chosen.length)}{unit}</b>, max <b>{f1(Math.max(...chosen.map((i) => values[i])))}{unit}</b></>}</p> : undefined}
      describe={(i) => `${L[i]}: ${V[i]}${unit}${pctMode ? ` (${tv[i] >= 0 ? "+" : ""}${f1(tv[i])}%)` : ""}${Pv ? `, previous ${Pv[i]}${unit} (${V[i] - Pv[i] >= 0 ? "+" : ""}${f1(V[i] - Pv[i])})` : ""}${bands.find((x) => V[i] >= x.from && V[i] < x.to) ? `, ${bands.find((x) => V[i] >= x.from && V[i] < x.to)!.label}` : ""}${sel.includes(a + i) ? ", selected" : ""}`}
      render={({ w, h, active, uid }) => {
        const edges = bands.flatMap((x) => [x.from, x.to < 1e8 ? x.to : NaN]).filter(Number.isFinite).map(tf), all = [...tv, ...(tpv ?? [])], plot = { l: M.l, r: w - M.r, t: M.t, b: h - M.b };
        let lo = Math.min(...all), hi = Math.max(...all, ...(pctMode ? edges : bands.map((x) => (x.to < 1e8 ? x.to : 0)))), tk: number[], y: (v: number) => number;
        if (log) { const lt = logTicks(logFloor(all), hi * 1.05); tk = lt.ticks; lo = lt.lo; hi = lt.hi; y = (v) => M.t + (1 - scalePos(v, lo, hi, "log")) * (h - M.t - M.b); }
        else { hi = hi * (hi > 0 ? 1.05 : 0.95); lo = pctMode ? lo - Math.abs(lo) * 0.1 - 1 : lo * 0.9; tk = ticks(lo, hi, 5); y = lin(lo, hi, h - M.b, M.t); }
        const x = ix.xOf({ ...plot }), px = (i: number) => x(a + i), onLasso = (poly: Pt[]) => setSel(selectInPolygon(V.map((v, i) => [px(i), y(tf(v))] as Pt), poly).map((i) => i + a));
        const clampY = (v: number) => Math.max(M.t, Math.min(h - M.b, y(v)));
        return <><Patterns id={uid} />{bands.map((bd) => { const t = clampY(tf(Math.min(bd.to, 1e12))), btm = clampY(tf(bd.from)); return btm > t ? <g key={bd.label}><rect x={M.l} y={t} width={w - M.l - M.r} height={btm - t} fill={bd.level === "danger" ? patUrl(uid, 3) : "var(--jp-warn)"} opacity={bd.level === "danger" ? 0.5 : 0.14} /><text className="p3-ax" x={M.l + 4} y={t + 11}>{bd.label}</text></g> : null; })}
          <YAxis t={tk} y={y} w={w} fmt={pctMode ? (v) => `${v}%` : (v) => (log && v >= 1000 ? `${v / 1000}k` : f1(v))} /><XLabels labels={L} x={px} h={h} every={Math.ceil(V.length / 7)} />
          {tpv && <path className="p3-line" stroke="var(--jp-text-muted)" strokeDasharray="5 4" opacity={0.8} d={pathOf(tpv.map((v, i) => [px(i), y(v)]))} />}
          <path className="p3-line" stroke={C(0)} d={pathOf(tv.map((v, i) => [px(i), y(v)]))} />
          {sel.length > 0 && tv.map((v, i) => (sel.includes(a + i) ? <circle key={i} cx={px(i)} cy={y(v)} r={5} fill={C(3)} stroke="var(--jp-text)" strokeWidth={1.5} /> : null))}
          {alerts.map((al, k) => <g key={k} transform={`translate(${px(al.start)},${y(tf(al.peak)) - 12})`}>{al.band.level === "danger" ? <rect x={-6} y={-6} width={12} height={12} fill="var(--jp-danger)" stroke="var(--jp-text)" /> : <path d="M0,-7L7,6H-7Z" fill="var(--jp-warn)" stroke="var(--jp-text)" />}<text className="p3-ax p3-ax--strong" y={4} textAnchor="middle" style={{ fill: "var(--jp-surface-raised)" }}>!</text></g>)}
          {active !== null && V[active] !== undefined && <><line className="p3-cross" x1={px(active)} x2={px(active)} y1={M.t} y2={h - M.b} /><circle cx={px(active)} cy={y(tv[active])} r={5} fill={C(0)} /></>}
          <rect {...ix.plotProps(plot, onLasso)} />{ix.overlay(plot)}</>;
      }} />
  );
}

/** Two charts in one group: one crosshair and one zoom window (drag either chart, use its range control or the keyboard). Only the first chart shows the control rows. */
export function SyncedCharts({ labels, a, b, group = "p3f-synced" }: { labels: string[]; a: number[]; b: number[]; group?: string }) {
  return (
    <div>
      <div className="p3-grid p3-grid--1">
        <TrendFig title="Throughput" labels={labels} values={a} group={group} syncZoom height={190} unit=" rps" />
        <TrendFig title="Error rate" labels={labels} values={b} group={group} syncZoom height={190} unit=" %" controls={false} />
      </div>
      <p className="p3-note">Drag across either chart to zoom both, double-click to reset. Moving the pointer or the inspector slider on one chart moves the crosshair on the other.</p>
    </div>
  );
}

type Row = { id: number; region: string; product: string; x: number; y: number; amount: number };
const sum = (rows: Row[], k: "region" | "product") => { const m = new Map<string, number>(); for (const r of rows) m.set(r[k], (m.get(r[k]) ?? 0) + r.amount); return [...m].sort((p, q) => q[1] - p[1]); };
/** Drill-down and cross-filtering: click a bar (or its chip) to filter the other chart; the breadcrumb resets. */
export function CrossFilter({ rows }: { rows: Row[] }) {
  const [f, setF] = useState<{ region?: string; product?: string }>({}), toggle = (k: "region" | "product", v: string) => setF((p) => ({ ...p, [k]: p[k] === v ? undefined : v }));
  const byRegion = sum(crossFilter(rows, { product: f.product }), "region"), byProduct = sum(crossFilter(rows, { region: f.region }), "product"), shown = crossFilter(rows, f);
  const bars = (title: string, k: "region" | "product", data: [string, number][]) => (
    <Fig title={title} empty={!data.length} count={data.length} height={30 + data.length * 30}
      summary={`${title}: ${data.map(([n, v]) => `${n} ${v}`).join(", ")}. ${f[k] ? `Filtered to ${f[k]}.` : "Select a bar to filter the other chart."}`}
      table={table([k, "Amount"], data)} describe={(i) => `${data[i][0]}: ${data[i][1]}${f[k] === data[i][0] ? " (selected)" : ""}`}
      render={({ w, active, setActive }) => { const mx = Math.max(...data.map((d) => d[1]), 1), x = lin(0, mx, 0, w - 130);
        return <>{data.map(([n, v], i) => <g key={n} onPointerEnter={() => setActive(i)} onClick={() => toggle(k, n)} style={{ cursor: "pointer" }} opacity={f[k] && f[k] !== n ? 0.35 : 1}>
          <text className="p3-ax p3-ax--strong" x={70} y={20 + i * 30} textAnchor="end" dominantBaseline="middle">{n}</text><rect x={78} y={8 + i * 30} width={x(v)} height={24} fill={C(k === "region" ? 0 : 3)} stroke={active === i || f[k] === n ? "var(--jp-text)" : "none"} strokeWidth={2.5} /><text className="p3-ax" x={82 + x(v)} y={20 + i * 30} dominantBaseline="middle">{v}</text></g>)}</>; }} />);
  return (
    <div>
      <nav className="p3-controls" aria-label="Active filters"><span>Showing:</span><b>{f.region ?? "All regions"}</b><span aria-hidden>›</span><b>{f.product ?? "All products"}</b><span className="p3-note">({shown.length} of {rows.length} orders, {shown.reduce((a, r) => a + r.amount, 0)} total)</span>
        {(f.region || f.product) && <Btn sm onClick={() => setF({})}>Clear filters</Btn>}</nav>
      <div className="p3-controls" role="group" aria-label="Filter chips">{[...new Set(rows.map((r) => r.region))].map((r) => <Btn key={r} sm variant={f.region === r ? "primary" : "secondary"} aria-pressed={f.region === r} onClick={() => toggle("region", r)}>{r}</Btn>)}{[...new Set(rows.map((r) => r.product))].map((r) => <Btn key={r} sm variant={f.product === r ? "primary" : "secondary"} aria-pressed={f.product === r} onClick={() => toggle("product", r)}>{r}</Btn>)}</div>
      <div className="p3-grid">{bars("Amount by region", "region", byRegion)}{bars(f.region ? `Amount by product in ${f.region}` : "Amount by product", "product", byProduct)}</div>
    </div>
  );
}

/** Lasso select on a scatter: drag a freehand loop with the pointer, or use the keyboard (arrow keys move a point, Space adds a vertex, Enter closes the loop, Escape cancels). Uses `useChartInteractions` in lasso-only mode. */
export function LassoScatter({ rows }: { rows: Row[] }) {
  const [sel, setSel] = useState<Set<number>>(new Set()), ix = useChartInteractions({ n: rows.length, lasso: true, zoom: false });
  const chosen = rows.filter((r) => sel.has(r.id));
  return (
    <div>
      <Fig title="Orders: size vs value" empty={!rows.length} count={rows.length} height={300} ix={ix}
        summary={`Scatter of ${rows.length} orders. ${sel.size} selected${chosen.length ? `, mean amount ${f1(chosen.reduce((a, r) => a + r.amount, 0) / chosen.length)}` : ""}. Draw a loop with the pointer, or focus the chart and use the keyboard.`}
        table={table(["Order", "X", "Y", "Amount", "Selected"], rows.map((r) => [r.id, r.x, r.y, r.amount, sel.has(r.id) ? "yes" : ""]))}
        footer={<p className="p3-stats">Selected <b>{sel.size}</b>{chosen.length > 0 && <> Mean amount <b>{f1(chosen.reduce((a, r) => a + r.amount, 0) / chosen.length)}</b></>}</p>}
        describe={(i) => `Order ${rows[i].id}: x ${rows[i].x}, y ${rows[i].y}, amount ${rows[i].amount}${sel.has(rows[i].id) ? ", selected" : ""}`}
        render={({ w, h, active, setActive }) => {
          const x = lin(0, 100, M.l, w - M.r), y = lin(0, 100, h - M.b, M.t), plot = { l: M.l, r: w - M.r, t: M.t, b: h - M.b };
          const pp = ix.plotProps(plot, (poly) => setSel(new Set(selectInPolygon(rows.map((r) => [x(r.x), y(r.y)] as Pt), poly).map((i) => rows[i].id))));
          return <><YAxis t={[0, 25, 50, 75, 100]} y={y} w={w} /><XLabels labels={["0", "25", "50", "75", "100"]} x={(i) => x(i * 25)} h={h} every={1} />
            {rows.map((r, i) => <circle key={r.id} cx={x(r.x)} cy={y(r.y)} r={active === i ? 6 : 3.5 + (sel.has(r.id) ? 1 : 0)} fill={sel.has(r.id) ? C(3) : C(0)} opacity={sel.size && !sel.has(r.id) ? 0.3 : 0.8} stroke={sel.has(r.id) ? "var(--jp-text)" : "none"} strokeWidth={1.5} />)}
            <rect {...pp} onPointerMove={(e) => { pp.onPointerMove(e); const r0 = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect(); let bi = -1, bd = 400; rows.forEach((r, i) => { const d = (x(r.x) - (e.clientX - r0.left)) ** 2 + (y(r.y) - (e.clientY - r0.top)) ** 2; if (d < bd) { bd = d; bi = i; } }); if (!e.buttons) setActive(bi < 0 ? null : bi); }} />{ix.overlay(plot)}</>;
        }} />
      <p className="p3-note">Drag a loop with the pointer. Keyboard: focus the chart, arrow keys move a point (Shift for bigger steps), Space adds a vertex, Enter closes the loop, Escape cancels.</p>
    </div>
  );
}

const SERIES = [{ name: "Edge", data: [12, 18, 30, 55, 90, 150, 230, 380, 520, 800, 1250, 1900] }, { name: "Core", data: [300, 340, 360, 400, 420, 470, 520, 560, 640, 700, 760, 840] }, { name: "Batch", data: [3, 4, 4, 6, 9, 11, 17, 24, 31, 44, 60, 95] }];
/** Linear/log and absolute/percent switches on one chart. Log applies to the line layout (zero and negative values clamp to the floor); percent applies to the stacked layout. */
export function ScaleSwitch({ labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], series = SERIES }: { labels?: string[]; series?: { name: string; data: number[] }[] }) {
  const [layout, setLayout] = useState("lines"), [scale, setScale] = useState("linear"), [units, setUnits] = useState("abs"), n = labels.length, pc = toPercent(series.map((s) => s.data)), stacked = layout === "stacked";
  return (
    <div>
      <div className="p3-controls"><Segmented label="Layout" value={layout} onChange={setLayout} options={[{ value: "lines", label: "Lines" }, { value: "stacked", label: "Stacked" }]} />
        {!stacked && <Segmented label="Axis scale" value={scale} onChange={setScale} options={[{ value: "linear", label: "Linear" }, { value: "log", label: "Log" }]} />}
        {stacked && <Segmented label="Units" value={units} onChange={setUnits} options={[{ value: "abs", label: "Absolute" }, { value: "pct", label: "Percent" }]} />}</div>
      <Fig title="Traffic by tier" empty={!n} count={n} height={260}
        summary={`Traffic by tier over ${n} months, ${stacked ? (units === "pct" ? "stacked as percent of the monthly total" : "stacked absolute values") : `lines on a ${scale} axis`}.`}
        table={table(["Month", ...series.map((s) => s.name)], labels.map((l, i) => [l, ...series.map((s, k) => (stacked && units === "pct" ? +pc[k][i].toFixed(1) : s.data[i]))]))} legend={series.map((s, i) => ({ name: s.name, color: C(i) }))}
        describe={(i) => `${labels[i]}: ${series.map((s, k) => `${s.name} ${stacked && units === "pct" ? `${f1(pc[k][i])}%` : s.data[i]}`).join(", ")}`}
        render={({ w, h, active, setActive }) => {
          const x = (i: number) => M.l + ((i + 0.5) * (w - M.l - M.r)) / n, bw = (w - M.l - M.r) / n * 0.7;
          const hi = stacked ? (units === "pct" ? 100 : Math.max(...labels.map((_, i) => series.reduce((a, s) => a + s.data[i], 0)))) : Math.max(...series.flatMap((s) => s.data)), top = scale === "log" && !stacked ? 10 ** Math.ceil(Math.log10(hi)) : ticks(0, hi, 5).at(-1)!, lo = 1;
          const y = (v: number) => (scale === "log" && !stacked ? M.t + (1 - logPos(v, lo, top)) * (h - M.t - M.b) : lin(0, top, h - M.b, M.t)(v)), tk = scale === "log" && !stacked ? Array.from({ length: Math.round(Math.log10(top)) + 1 }, (_, k) => 10 ** k) : ticks(0, top, 5);
          return <><YAxis t={tk} y={y} w={w} fmt={(v) => (stacked && units === "pct" ? `${v}%` : v >= 1000 ? `${v / 1000}k` : String(v))} /><XLabels labels={labels} x={x} h={h} every={1} />
            {stacked ? labels.map((_, i) => { let acc = 0; return <g key={i} onPointerEnter={() => setActive(i)}>{series.map((s, k) => { const v = units === "pct" ? pc[k][i] : s.data[i], y0 = y(acc), y1 = y((acc += v)); return <rect key={k} x={x(i) - bw / 2} y={y1} width={bw} height={y0 - y1} fill={C(k)} stroke={active === i ? "var(--jp-text)" : "var(--jp-surface-raised)"} />; })}</g>; })
              : series.map((s, k) => <g key={s.name}><path className="p3-line" stroke={C(k)} strokeDasharray={["", "6 3", "2 3"][k % 3]} d={pathOf(s.data.map((v, i) => [x(i), y(v)]))} />{s.data.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={active === i ? 5 : 2.5} fill={C(k)} onPointerEnter={() => setActive(i)} />)}</g>)}</>;
        }} />
    </div>
  );
}

export { FreshnessBar };

/** Print-safe bars: with patterns on, every series has its own SVG texture and a black outline, so a greyscale print still separates them. */
export function PatternBars({ labels = ["Q1", "Q2", "Q3", "Q4"], series = [{ name: "North", data: [42, 51, 47, 60] }, { name: "South", data: [30, 35, 41, 39] }, { name: "East", data: [22, 28, 25, 33] }, { name: "West", data: [15, 19, 24, 27] }] }: { labels?: string[]; series?: { name: string; data: number[] }[] }) {
  const [print, setPrint] = useState("on"), on = print === "on";
  return (
    <div>
      <div className="p3-controls"><Segmented label="Print mode" value={print} onChange={setPrint} options={[{ value: "on", label: "Patterns" }, { value: "off", label: "Colour only" }]} /></div>
      <Fig title="Revenue by region" empty={!series.length} count={labels.length} height={240}
        summary={`Revenue by region over ${labels.length} quarters for ${series.map((s) => s.name).join(", ")}. ${on ? "Each region has its own pattern." : "Regions are told apart by colour."}`}
        table={table(["Quarter", ...series.map((s) => s.name)], labels.map((l, i) => [l, ...series.map((s) => s.data[i])]))}
        legend={series.map((s, i) => ({ name: s.name, color: C(i) }))}
        describe={(i) => `${labels[i]}: ${series.map((s) => `${s.name} ${s.data[i]}`).join(", ")}`}
        render={({ w, h, active, setActive, uid }) => {
          const hi = Math.max(...series.flatMap((s) => s.data)), tk = ticks(0, hi, 4), y = lin(0, tk.at(-1)!, h - M.b, M.t), gw = (w - M.l - M.r) / labels.length, bw = (gw * 0.8) / series.length;
          return <><Patterns id={uid} /><YAxis t={tk} y={y} w={w} />{labels.map((l, i) => <g key={l} onPointerEnter={() => setActive(i)}>
            {series.map((s, k) => <rect key={k} x={M.l + gw * i + gw * 0.1 + bw * k} y={y(s.data[i])} width={bw - 1} height={y(0) - y(s.data[i])} fill={on ? patUrl(uid, k) : C(k)} stroke={on ? "var(--jp-text)" : active === i ? "var(--jp-text)" : "none"} strokeWidth={on ? 1.2 : 2} />)}
            <text className="p3-ax" x={M.l + gw * (i + 0.5)} y={h - 8} textAnchor="middle">{l}</text></g>)}</>;
        }} />
    </div>
  );
}

/** ASCII preview for terminal UIs: the same series as text blocks. */
export function AsciiPreview({ values, title = "CPU load, last 60 samples" }: { values: number[]; title?: string }) {
  const [mode, setMode] = useState("chart"), [cols, setCols] = useState("60"), [copied, setCopied] = useState(false), w = Number(cols);
  const text = !values.length ? "" : mode === "spark" ? asciiSpark(values, w) : asciiChart(values, 6, w).join("\n");
  return (
    <div>
      <div className="p3-controls"><Segmented label="ASCII style" value={mode} onChange={setMode} options={[{ value: "chart", label: "Columns" }, { value: "spark", label: "Sparkline" }]} /><Segmented label="Width" value={cols} onChange={setCols} options={["30", "60"].map((v) => ({ value: v, label: `${v} cols` }))} />
        <Btn sm icon="copy" onClick={() => { void navigator.clipboard?.writeText(text); setCopied(true); }}>{copied ? "Copied" : "Copy text"}</Btn></div>
      {values.length ? <pre className="p3-pre" role="img" aria-label={`${title}: ${values.length} samples from ${f1(Math.min(...values))} to ${f1(Math.max(...values))}, rendered as text blocks`}>{text}</pre> : <p className="p3-note" role="status">No data. Nothing to render.</p>}
      <p className="p3-note">Each block is an eighth of a row; paste it into a terminal, a log or a TUI panel. Generated by <code>asciiChart()</code> and <code>asciiSpark()</code>.</p>
    </div>
  );
}
