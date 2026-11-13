import { C, Chart, csvRows, fmt, legendOf, T, YAxis, type FrameState } from "./kit.tsx";
import { areaPath, cycleSplit, fanBands, horizonBands, linePath, stack, type Offset } from "./stack.ts";
import { niceDomain } from "../charts/shared.tsx";

const M = { l: 44, r: 12, t: 12, b: 26 };
/** x positions for n points across the plot width. */
const xsOf = (n: number, w: number, l = M.l, r = M.r) => Array.from({ length: n }, (_, i) => l + (n === 1 ? (w - l - r) / 2 : (i / (n - 1)) * (w - l - r)));
/** x tick labels: at most ~8 evenly picked. */
function XLabels({ xs, labels, y }: { xs: number[]; labels: string[]; y: number }) { const step = Math.max(1, Math.ceil(labels.length / 8)); return <>{labels.map((l, i) => (i % step === 0 ? <T key={i} x={xs[i]} y={y}>{l}</T> : null))}</>; }

/* ---------- D002: area, stacked area, 100% stacked area, streamgraph ---------- */
export type AreaMode = "area" | "stacked" | "percent" | "stream";
export function AreaChart({ title = "Area", id = "D002", mode, labels, names, series, height = 260, state, unit = "" }: { title?: string; id?: string; mode: AreaMode; labels: string[]; names: string[]; series: number[][]; height?: number; state?: FrameState; unit?: string }) {
  const off: Offset = mode === "percent" ? "expand" : mode === "stream" ? "wiggle" : "none";
  const layers = mode === "area" ? series.map((s) => ({ y0: s.map(() => 0), y1: s })) : stack(series, off);
  const totals = labels.map((_, j) => series.reduce((a, s) => a + (s[j] ?? 0), 0));
  const items = labels.map((l, j) => `${l}: ${names.map((n, i) => `${n} ${mode === "percent" ? `${totals[j] ? Math.round((series[i][j] / totals[j]) * 100) : 0}%` : fmt(series[i][j]) + unit}`).join(", ")}${mode === "area" ? "" : `, total ${fmt(totals[j])}${unit}`}`);
  const lo = mode === "stream" ? Math.min(...layers.map((l) => Math.min(...l.y0))) : 0, hi = mode === "percent" ? 1 : Math.max(...layers.map((l) => Math.max(...l.y1)));
  return (
    <Chart title={title} id={id} height={height} state={state} items={items} count={labels.length && series.length ? 1 : 0} legend={legendOf(names)}
      summary={`${mode === "percent" ? "100% stacked area" : mode === "stream" ? "Streamgraph with a wiggle baseline" : mode === "stacked" ? "Stacked area" : "Area"} of ${names.join(", ")} across ${labels.length} periods, from ${labels[0]} to ${labels[labels.length - 1]}.`}
      table={{ head: ["Period", ...names, "Total"], rows: labels.map((l, j) => [l, ...series.map((s) => s[j]), totals[j]]) }}
      build={(w, pk) => {
        const xs = xsOf(labels.length, w), nd = mode === "percent" ? { lo: 0, hi: 1, ticks: [0, 0.25, 0.5, 0.75, 1] } : niceDomain(mode === "stream" ? lo : 0, hi, 4), top = M.t, bot = height - M.b;
        const y = (v: number) => bot - ((v - nd.lo) / (nd.hi - nd.lo || 1)) * (bot - top); const smooth = mode === "stream";
        return (
          <>
            {mode !== "stream" && <YAxis ticks={nd.ticks} y={y} x0={M.l} x1={w - M.r} fmtT={mode === "percent" ? (v) => `${Math.round(v * 100)}%` : fmt} />}
            {mode === "stream" && <T x={M.l - 6} y={M.t + 8} anchor="end">centred</T>}
            {layers.map((l, i) => <path key={i} d={areaPath(xs, l.y0.map(y), l.y1.map(y), smooth)} fill={C(i)} fillOpacity={mode === "area" ? 0.35 : 0.9} className="lab-edge" stroke={mode === "area" ? C(i) : undefined} strokeWidth={mode === "area" ? 2 : 1.5} />)}
            <XLabels xs={xs} labels={labels} y={height - 8} />
            {pk.i !== null && <line x1={xs[pk.i]} x2={xs[pk.i]} y1={top} y2={bot} className="lab-ink" />}
            {xs.map((x, j) => <rect key={j} x={x - (w - M.l - M.r) / Math.max(1, labels.length - 1) / 2} y={top} width={(w - M.l - M.r) / Math.max(1, labels.length - 1)} height={bot - top} fill="transparent" onMouseEnter={pk.mark(j).onMouseEnter} />)}
          </>
        );
      }}
    />
  );
}

/* ---------- D009: min-max band ---------- */
export function MinMaxBand({ title = "Min-max band", id = "D009", labels, min, mean, max, unit = "ms", height = 240, state }: { title?: string; id?: string; labels: string[]; min: number[]; mean: number[]; max: number[]; unit?: string; height?: number; state?: FrameState }) {
  return (
    <Chart title={title} id={id} height={height} state={state} count={labels.length}
      items={labels.map((l, i) => `${l}: min ${min[i]}${unit}, mean ${mean[i]}${unit}, max ${max[i]}${unit}`)}
      summary={`Daily mean with the minimum to maximum range shaded. Overall range ${Math.min(...min)} to ${Math.max(...max)} ${unit}.`}
      table={{ head: ["Day", `Min (${unit})`, `Mean (${unit})`, `Max (${unit})`], rows: labels.map((l, i) => [l, min[i], mean[i], max[i]]) }}
      legend={[{ name: "Min to max", color: "var(--adm-c1)" }, { name: "Mean", color: "var(--jp-text)" }]}
      build={(w, pk) => {
        const xs = xsOf(labels.length, w), nd = niceDomain(0, Math.max(...max)), top = M.t, bot = height - M.b, y = (v: number) => bot - ((v - nd.lo) / (nd.hi - nd.lo)) * (bot - top);
        return (<>
          <YAxis ticks={nd.ticks} y={y} x0={M.l} x1={w - M.r} />
          <path d={areaPath(xs, min.map(y), max.map(y))} fill="var(--adm-c1)" fillOpacity={0.22} stroke="var(--adm-c1)" strokeWidth={1} />
          <path d={linePath(xs, mean.map(y))} className="lab-ink" />
          <XLabels xs={xs} labels={labels} y={height - 8} />
          {pk.i !== null && <><line x1={xs[pk.i]} x2={xs[pk.i]} y1={y(max[pk.i])} y2={y(min[pk.i])} className="lab-ink" strokeWidth={3} /><circle cx={xs[pk.i]} cy={y(mean[pk.i])} r={5} fill="var(--jp-text)" /></>}
          {xs.map((x, j) => <rect key={j} x={x - 8} y={top} width={16} height={bot - top} fill="transparent" onMouseEnter={pk.mark(j).onMouseEnter} />)}
        </>);
      }} />
  );
}

/* ---------- D009: fan chart ---------- */
export function FanChart({ title = "Fan chart", id = "D009", labels, median, histLen, spread, unit = "", height = 260, state }: { title?: string; id?: string; labels: string[]; median: number[]; histLen: number; spread: number; unit?: string; height?: number; state?: FrameState }) {
  const fut = median.slice(histLen - 1), bands = fanBands(fut, spread);
  const items = labels.map((l, i) => { if (i < histLen) return `${l}: actual ${median[i]}${unit}`; const k = i - histLen + 1; return `${l}: median forecast ${median[i]}${unit}; 50% range ${fmt(bands[0].lo[k])} to ${fmt(bands[0].hi[k])}; 80% ${fmt(bands[1].lo[k])} to ${fmt(bands[1].hi[k])}; 95% ${fmt(bands[2].lo[k])} to ${fmt(bands[2].hi[k])}${unit}`; });
  return (
    <Chart title={title} id={id} height={height} state={state} count={labels.length} items={items}
      summary={`Forecast fan: ${histLen} observed periods then ${median.length - histLen} forecast periods with 50, 80 and 95 percent bands that widen with the horizon.`}
      table={{ head: ["Period", "Median", "50% low", "50% high", "80% low", "80% high", "95% low", "95% high"], rows: labels.map((l, i) => { const k = i - histLen + 1; const b = (n: number, s: "lo" | "hi") => (k >= 0 ? Math.round(bands[n][s][k] * 10) / 10 : ""); return [l, median[i], b(0, "lo"), b(0, "hi"), b(1, "lo"), b(1, "hi"), b(2, "lo"), b(2, "hi")]; }) }}
      legend={[{ name: "Actual", color: "var(--jp-text)" }, { name: "Forecast median (dashed)", color: "var(--adm-c1)" }, { name: "50 / 80 / 95% bands", color: "var(--adm-c1)" }]}
      build={(w, pk) => {
        const xs = xsOf(labels.length, w), all = [...median, ...bands[2].lo, ...bands[2].hi], nd = niceDomain(Math.min(...all), Math.max(...all)), top = M.t, bot = height - M.b, y = (v: number) => bot - ((v - nd.lo) / (nd.hi - nd.lo)) * (bot - top), fx = xs.slice(histLen - 1);
        return (<>
          <YAxis ticks={nd.ticks} y={y} x0={M.l} x1={w - M.r} />
          {[2, 1, 0].map((b) => <path key={b} d={areaPath(fx, bands[b].lo.map(y), bands[b].hi.map(y))} fill="var(--adm-c1)" fillOpacity={[0.3, 0.2, 0.12][b]} />)}
          <path d={linePath(xs.slice(0, histLen), median.slice(0, histLen).map(y))} className="lab-ink" strokeWidth={2.5} />
          <path d={linePath(fx, fut.map(y))} stroke="var(--adm-c1)" strokeWidth={2.5} strokeDasharray="6 4" fill="none" />
          <line x1={xs[histLen - 1]} x2={xs[histLen - 1]} y1={top} y2={bot} className="lab-ref" /><T x={xs[histLen - 1] + 4} y={top + 8} anchor="start">forecast</T>
          <XLabels xs={xs} labels={labels} y={height - 8} />
          {pk.i !== null && <circle cx={xs[pk.i]} cy={y(median[pk.i])} r={5} fill="var(--jp-text)" />}
          {xs.map((x, j) => <rect key={j} x={x - 10} y={top} width={20} height={bot - top} fill="transparent" onMouseEnter={pk.mark(j).onMouseEnter} />)}
        </>);
      }} />
  );
}

/* ---------- D010: horizon chart ---------- */
export function HorizonChart({ title = "Horizon chart", id = "D010", labels, names, series, bands = 3, rowH = 34, unit = "%", state }: { title?: string; id?: string; labels: string[]; names: string[]; series: number[][]; bands?: number; rowH?: number; unit?: string; state?: FrameState }) {
  const maxAbs = Math.max(0, ...series.flat().map((v) => Math.abs(v))), height = names.length * (rowH + 6) + 24;
  const items = labels.map((l, j) => `${l}: ${names.map((n, i) => `${n} ${series[i][j] > 0 ? "+" : ""}${series[i][j]}${unit}`).join(", ")}`);
  return (
    <Chart title={title} id={id} height={height} state={state} count={series.length ? labels.length : 0} items={items}
      summary={`Horizon chart of deviation from baseline for ${names.join(", ")}. Each band of colour is ${fmt(maxAbs / bands)}${unit}. Darker stacked bands are larger deviations; the first hue is above zero and the second hue below.`}
      table={{ head: ["Time", ...names], rows: labels.map((l, j) => [l, ...series.map((s) => s[j])]) }}
      legend={[{ name: `Above baseline (each shade ${fmt(maxAbs / bands)}${unit})`, color: "var(--adm-c1)" }, { name: "Below baseline", color: "var(--adm-c2)" }]}
      build={(w, pk) => {
        const l = 76, xs = xsOf(labels.length, w, l, 8);
        return (<>
          {names.map((n, i) => {
            const base = 6 + i * (rowH + 6) + rowH, hz = horizonBands(series[i], bands, maxAbs);
            return (<g key={n}>
              <T x={l - 8} y={base - rowH / 2} anchor="end" dominantBaseline="middle" cls="lab-tl">{n}</T>
              <rect x={l} y={base - rowH} width={w - l - 8} height={rowH} className="lab-flat" />
              {hz.pos.map((layer, k) => <path key={`p${k}`} d={areaPath(xs, layer.map(() => base), layer.map((v) => base - v * rowH))} fill="var(--adm-c1)" fillOpacity={0.38} />)}
              {hz.neg.map((layer, k) => <path key={`n${k}`} d={areaPath(xs, layer.map(() => base - rowH), layer.map((v) => base - rowH + v * rowH))} fill="var(--adm-c2)" fillOpacity={0.38} />)}
            </g>);
          })}
          <XLabels xs={xs} labels={labels.map((s) => `${s}h`)} y={height - 6} />
          {pk.i !== null && <line x1={xs[pk.i]} x2={xs[pk.i]} y1={4} y2={height - 20} className="lab-ink" />}
          {xs.map((x, j) => <rect key={j} x={x - 3} y={0} width={6} height={height - 20} fill="transparent" onMouseEnter={pk.mark(j).onMouseEnter} />)}
        </>);
      }} />
  );
}

/* ---------- D010: cycle plot ---------- */
export function CyclePlot({ title = "Cycle plot", id = "D010", values, period, seasons, cycleNames, height = 250, state }: { title?: string; id?: string; values: number[]; period: number; seasons: string[]; cycleNames: string[]; height?: number; state?: FrameState }) {
  const { cycles, means } = cycleSplit(values, period);
  const items = seasons.map((s, c) => `${s}: ${cycleNames.map((y, k) => `${y} ${cycles[c][k]}`).join(", ")}; average ${Math.round(means[c] * 10) / 10}`);
  return (
    <Chart title={title} id={id} height={height} state={state} count={values.length} items={items} legend={[{ name: "Each season across years", color: "var(--adm-c1)" }, { name: "Season average", color: "var(--jp-text-muted)" }]}
      summary={`Cycle plot: ${period} seasons, each showing ${cycleNames.length} cycles (${cycleNames[0]} to ${cycleNames[cycleNames.length - 1]}) as a small line against the season average.`}
      table={{ head: ["Season", ...cycleNames, "Average"], rows: seasons.map((s, c) => [s, ...cycles[c], Math.round(means[c] * 10) / 10]) }}
      build={(w, pk) => {
        const nd = niceDomain(Math.min(...values), Math.max(...values)), top = M.t, bot = height - M.b, y = (v: number) => bot - ((v - nd.lo) / (nd.hi - nd.lo)) * (bot - top), pw = (w - M.l - M.r) / period, pad = Math.min(6, pw * 0.12);
        return (<>
          <YAxis ticks={nd.ticks} y={y} x0={M.l} x1={w - M.r} />
          {seasons.map((s, c) => {
            const x0 = M.l + c * pw + pad, x1 = M.l + (c + 1) * pw - pad, xs = cycles[c].map((_, k) => (cycles[c].length === 1 ? (x0 + x1) / 2 : x0 + (k / (cycles[c].length - 1)) * (x1 - x0)));
            return (<g key={s} {...pk.mark(c)}>
              <rect x={M.l + c * pw} y={top} width={pw} height={bot - top} fill={pk.on(c) ? "var(--jp-surface)" : "transparent"} />
              <line x1={x0} x2={x1} y1={y(means[c])} y2={y(means[c])} className="lab-ref" />
              <path d={linePath(xs, cycles[c].map(y))} stroke="var(--adm-c1)" strokeWidth={2} fill="none" />
              {cycles[c].map((v, k) => <circle key={k} cx={xs[k]} cy={y(v)} r={2.5} fill="var(--adm-c1)" />)}
              <T x={(x0 + x1) / 2} y={height - 8}>{s}</T>
            </g>);
          })}
        </>);
      }} />
  );
}
