import { C, Chart, fmt, legendOf, pct, T, ticksTo, YAxis, type FrameState } from "./kit.tsx";
import { bumpRanks, funnel, marimekko, pareto, waterfall, type WStep } from "./flow.ts";
import { linePath } from "./stack.ts";
import { niceDomain } from "../charts/shared.tsx";

type Common = { id?: string; height?: number; state?: FrameState };
const M = { l: 48, r: 14, t: 18, b: 30 };
const sgn = (v: number) => (v > 0 ? "+" : v < 0 ? "−" : "") + fmt(Math.abs(v));

/* ---------- D022: waterfall ---------- */
export function WaterfallChart({ title = "Waterfall", id = "D022", steps, unit = "$k", height = 280, state }: { title?: string; steps: WStep[]; unit?: string } & Common) {
  const bars = waterfall(steps), lo = Math.min(0, ...bars.flatMap((b) => [b.start, b.end])), hi = Math.max(0, ...bars.flatMap((b) => [b.start, b.end])), nd = niceDomain(lo, hi);
  return (
    <Chart title={title} id={id} height={height} state={state} count={steps.length}
      items={bars.map((b) => (b.total ? `${b.label}: running total ${fmt(b.end)}${unit}` : `${b.label}: ${sgn(b.delta)}${unit}, running total ${fmt(b.end)}${unit}`))}
      summary={`Waterfall from ${fmt(bars[0]?.end ?? 0)} to ${fmt(bars[bars.length - 1]?.end ?? 0)} ${unit} across ${steps.length} steps; increases and decreases are marked with + and minus signs as well as colour.`}
      legend={[{ name: "Increase (+)", color: "var(--adm-c1)" }, { name: "Decrease (−)", color: "var(--adm-c2)" }, { name: "Total", color: "var(--adm-c4)" }]}
      table={{ head: ["Step", `Change (${unit})`, `Running total (${unit})`], rows: bars.map((b) => [b.label, b.total ? "total" : b.delta, b.end]) }}
      build={(w, pk) => {
        const bw = (w - M.l - M.r) / bars.length, bot = height - M.b, y = (v: number) => bot - ((v - nd.lo) / (nd.hi - nd.lo)) * (bot - M.t), bx = Math.min(64, bw * 0.7);
        return (<>
          <YAxis ticks={nd.ticks} y={y} x0={M.l} x1={w - M.r} />
          {bars.map((b, i) => { const cx = M.l + bw * (i + 0.5), top = Math.min(y(b.start), y(b.end)), h = Math.max(1, Math.abs(y(b.start) - y(b.end))); return (<g key={i}>
            {i > 0 && <line x1={cx - bw + bx / 2} x2={cx - bx / 2} y1={y(bars[i - 1].end)} y2={y(bars[i - 1].end)} className="p3-ref" />}
            <rect {...pk.mark(i)} x={cx - bx / 2} width={bx} y={top} height={h} fill={b.total ? "var(--adm-c4)" : b.delta >= 0 ? "var(--adm-c1)" : "var(--adm-c2)"} />
            <T x={cx} y={top - 5} cls="p3-tl">{b.total ? fmt(b.end) : sgn(b.delta)}</T>
            <T x={cx} y={height - 10}>{b.label}</T></g>); })}
        </>);
      }} />
  );
}

/* ---------- D022: Pareto ---------- */
export function ParetoChart({ title = "Pareto", id = "D022", items, unit = "", cut = 0.8, height = 280, state }: { title?: string; items: { label: string; value: number }[]; unit?: string; cut?: number } & Common) {
  const { rows, vitalFew } = pareto(items, cut), tot = rows.reduce((a, r) => a + r.value, 0);
  return (
    <Chart title={title} id={id} height={height} state={state} count={rows.length}
      items={rows.map((r, i) => `${r.label}: ${r.value}${unit} (${pct(r.share, 1)}), cumulative ${pct(r.cum, 1)}${i < vitalFew ? ", among the vital few" : ""}`)}
      summary={`Pareto: ${rows.length} causes sorted by size; the first ${vitalFew} account for ${pct(rows[vitalFew - 1]?.cum ?? 0)} of ${fmt(tot)} total.`}
      legend={[{ name: `Vital few (to ${pct(cut)})`, color: "var(--adm-c1)" }, { name: "Remaining causes", color: "var(--adm-c7)" }, { name: "Cumulative %", color: "var(--jp-text)" }]}
      table={{ head: ["Cause", "Count", "Share", "Cumulative"], rows: rows.map((r) => [r.label, r.value, pct(r.share, 1), pct(r.cum, 1)]) }}
      build={(w, pk) => {
        const nd = { hi: ticksTo(rows[0].value).slice(-1)[0] }, bw = (w - M.l - 44) / rows.length, bot = height - M.b - 6, y = (v: number) => bot - (v / nd.hi) * (bot - M.t), yp = (p: number) => bot - p * (bot - M.t), bx = Math.min(70, bw * 0.7), cxs = rows.map((_, i) => M.l + bw * (i + 0.5));
        return (<>
          <YAxis ticks={ticksTo(nd.hi)} y={y} x0={M.l} x1={w - 44} />
          {[0, 0.5, 1].map((p) => <T key={p} x={w - 40} y={yp(p) + 4} anchor="start">{pct(p)}</T>)}
          <line x1={M.l} x2={w - 44} y1={yp(cut)} y2={yp(cut)} className="p3-ref" /><T x={w - 40} y={yp(cut) + 4} anchor="start">{pct(cut)}</T>
          {rows.map((r, i) => <g key={i}><rect {...pk.mark(i)} x={cxs[i] - bx / 2} width={bx} y={y(r.value)} height={bot - y(r.value)} fill={i < vitalFew ? "var(--adm-c1)" : "var(--adm-c7)"} /><T x={cxs[i]} y={height - 10}>{r.label.length > bw / 7 ? r.label.slice(0, Math.max(3, Math.floor(bw / 7))) + "…" : r.label}</T></g>)}
          <path d={linePath(cxs, rows.map((r) => yp(r.cum)))} className="p3-ink" strokeWidth={2} />
          {rows.map((r, i) => <circle key={`c${i}`} cx={cxs[i]} cy={yp(r.cum)} r={pk.on(i) ? 5 : 3} fill="var(--jp-text)" />)}
        </>);
      }} />
  );
}

/* ---------- D022: funnel ---------- */
export function FunnelChart({ title = "Funnel", id = "D022", steps, height, state }: { title?: string; steps: { label: string; value: number }[] } & Common) {
  const f = funnel(steps), H = height ?? f.length * 52 + 8;
  return (
    <Chart title={title} id={id} height={H} state={state} count={steps.length}
      items={f.map((s, i) => `${s.label}: ${s.value.toLocaleString("en")}, ${pct(s.ofFirst, 1)} of the top${i ? `, ${pct(s.ofPrev, 1)} of the previous step, ${s.lost.toLocaleString("en")} lost` : ""}`)}
      summary={`Funnel of ${f.length} steps from ${steps[0]?.value.toLocaleString("en")} down to ${steps[steps.length - 1]?.value.toLocaleString("en")} (${pct(f[f.length - 1]?.ofFirst ?? 0, 1)} overall).`}
      table={{ head: ["Step", "Count", "% of top", "% of previous"], rows: f.map((s) => [s.label, s.value, pct(s.ofFirst, 1), pct(s.ofPrev, 1)]) }}
      build={(w, pk) => {
        const max = f[0].value || 1, cx = (w - 150) / 2 + 4, W = w - 160, rh = (H - 8) / f.length;
        return (<>{f.map((s, i) => { const a = (s.value / max) * W, b = ((f[i + 1]?.value ?? s.value * 0.85) / max) * W, y0 = 4 + i * rh; return (<g key={i}>
          <path {...pk.mark(i)} d={`M${cx - a / 2},${y0}L${cx + a / 2},${y0}L${cx + b / 2},${y0 + rh - 4}L${cx - b / 2},${y0 + rh - 4}Z`} fill={C(i)} fillOpacity={0.88} />
          <T x={cx} y={y0 + rh / 2 + 2} cls="p3-tw" pointerEvents="none">{s.label}</T>
          <T x={w - 150 + 16} y={y0 + rh / 2 - 2} anchor="start" cls="p3-tl">{s.value.toLocaleString("en")}</T><T x={w - 150 + 16} y={y0 + rh / 2 + 14} anchor="start">{pct(s.ofFirst, 1)}{i ? ` · ${pct(s.ofPrev, 0)} of prev` : ""}</T></g>); })}</>);
      }} />
  );
}

/* ---------- D022: pyramid (population) ---------- */
export function PyramidChart({ title = "Population pyramid", id = "D022", groups, left, right, unit = "%", height, state }: { title?: string; groups: string[]; left: { name: string; data: number[] }; right: { name: string; data: number[] }; unit?: string } & Common) {
  const H = height ?? groups.length * 28 + 56, max = Math.max(1, ...left.data, ...right.data), mx = ticksTo(max).slice(-1)[0];
  return (
    <Chart title={title} id={id} height={H} state={state} count={groups.length} legend={legendOf([left.name, right.name])}
      items={groups.map((g, i) => `${g}: ${left.name} ${left.data[i]}${unit}, ${right.name} ${right.data[i]}${unit}`)}
      summary={`Population pyramid across ${groups.length} age groups; ${left.name} extend left and ${right.name} right, largest bar ${fmt(max)}${unit}.`}
      table={{ head: ["Group", `${left.name} (${unit})`, `${right.name} (${unit})`], rows: groups.map((g, i) => [g, left.data[i], right.data[i]]) }}
      build={(w, pk) => {
        const mid = w / 2, half = mid - 44, rh = (H - 40) / groups.length, sx = (v: number) => (v / mx) * half;
        return (<>
          {ticksTo(mx).map((t) => <g key={t}>{[-1, 1].map((s) => <g key={s}><line x1={mid + s * sx(t)} x2={mid + s * sx(t)} y1={6} y2={H - 28} className="adm-gl" /><T x={mid + s * sx(t)} y={H - 12}>{t}</T></g>)}</g>)}
          {groups.map((g, i) => { const gy = 6 + (groups.length - 1 - i) * rh; return (<g key={g} {...pk.mark(i)}>
            <rect x={mid - sx(left.data[i])} width={sx(left.data[i])} y={gy + 2} height={rh - 4} fill="var(--adm-c1)" /><rect x={mid} width={sx(right.data[i])} y={gy + 2} height={rh - 4} fill="var(--adm-c2)" />
            <T x={mid} y={gy + rh / 2 + 4} cls="p3-tw" pointerEvents="none">{g}</T></g>); })}
        </>);
      }} />
  );
}

/* ---------- D024: bump chart ---------- */
export function BumpChart({ title = "Bump chart", id = "D024", labels, series, height, state }: { title?: string; labels: string[]; series: { name: string; values: number[] }[] } & Common) {
  const ranks = bumpRanks(series), n = series.length, H = height ?? n * 40 + 50;
  return (
    <Chart title={title} id={id} height={H} state={state} count={series.length} legend={legendOf(series.map((s) => s.name))}
      items={series.map((s, i) => `${s.name}: rank ${ranks[i].join(", ")} across ${labels.join(", ")}; ${ranks[i][0] === ranks[i][labels.length - 1] ? "unchanged overall" : ranks[i][labels.length - 1] < ranks[i][0] ? `up ${ranks[i][0] - ranks[i][labels.length - 1]} places` : `down ${ranks[i][labels.length - 1] - ranks[i][0]} places`}`)}
      summary={`Bump chart of rank over ${labels.length} periods for ${n} series (1 is best). Final order: ${series.map((s, i) => ({ s, r: ranks[i][labels.length - 1] })).sort((a, b) => a.r - b.r).map((e) => e.s.name).join(", ")}.`}
      table={{ head: ["Series", ...labels.map((l) => `Rank ${l}`)], rows: series.map((s, i) => [s.name, ...ranks[i]]) }}
      build={(w, pk) => {
        const l = 80, r = 80, T0 = 24, xs = labels.map((_, k) => l + (k / (labels.length - 1 || 1)) * (w - l - r)), y = (rk: number) => T0 + ((rk - 1) / (n - 1 || 1)) * (H - T0 - 22);
        return (<>
          {labels.map((lb, k) => <T key={lb} x={xs[k]} y={12}>{lb}</T>)}
          {series.map((s, i) => (<g key={s.name} {...pk.mark(i)}>
            <path d={linePath(xs, ranks[i].map(y), true)} stroke={C(i)} strokeWidth={pk.on(i) ? 5 : 3.5} fill="none" strokeLinecap="round" />
            {ranks[i].map((rk, k) => <g key={k}><circle cx={xs[k]} cy={y(rk)} r={9} fill={C(i)} stroke="var(--jp-surface-raised)" strokeWidth={1.5} /><T x={xs[k]} y={y(rk) + 3.5} cls="p3-tw" pointerEvents="none">{rk}</T></g>)}
            <T x={l - 18} y={y(ranks[i][0]) + 4} anchor="end" cls="p3-tl">{s.name}</T><T x={w - r + 18} y={y(ranks[i][labels.length - 1]) + 4} anchor="start" cls="p3-tl">{s.name}</T>
          </g>))}
        </>);
      }} />
  );
}

/* ---------- D024: Marimekko ---------- */
export function MarimekkoChart({ title = "Marimekko", id = "D024", cols, unit = "$k", height = 320, state }: { title?: string; cols: { label: string; parts: { label: string; value: number }[] }[]; unit?: string } & Common) {
  const { cells, colWidths } = marimekko(cols), rowNames = [...new Set(cells.map((c) => c.row))], grand = cells.reduce((a, c) => a + c.value, 0);
  return (
    <Chart title={title} id={id} height={height} state={state} count={grand > 0 ? 1 : 0} legend={legendOf(rowNames)}
      items={cells.map((c) => `${c.col}, ${c.row}: ${fmt(c.value)}${unit}; ${pct(c.h, 0)} of ${c.col}; ${pct(c.value / grand, 1)} of all`)}
      summary={`Marimekko: column width is each region's share of ${fmt(grand)}${unit} (${cols.map((c, i) => `${c.label} ${pct(colWidths[i])}`).join(", ")}); segment height is the product mix within it.`}
      table={{ head: ["Column", "Segment", unit, "% of column", "% of total"], rows: cells.map((c) => [c.col, c.row, c.value, pct(c.h, 1), pct(c.value / grand, 1)]) }}
      build={(w, pk) => {
        const l = 4, top = 34, bw = w - l - 4, bh = height - top - 4;
        return (<>
          {colWidths.map((cw, i) => { const x = l + cells.find((c) => c.col === cols[i].label)!.x * bw; return <T key={i} x={x + (cw * bw) / 2} y={14} cls="p3-tl">{cw * bw > 70 ? cols[i].label : ""}</T>; })}
          {colWidths.map((cw, i) => { const x = l + cells.find((c) => c.col === cols[i].label)!.x * bw; return <T key={`p${i}`} x={x + (cw * bw) / 2} y={28}>{pct(cw)}</T>; })}
          {cells.map((c, i) => <g key={i}><rect {...pk.mark(i)} x={l + c.x * bw} y={top + c.y * bh} width={Math.max(0, c.w * bw - 2)} height={Math.max(0, c.h * bh - 2)} fill={C(rowNames.indexOf(c.row))} fillOpacity={0.88} />
            {c.w * bw > 64 && c.h * bh > 24 && <T x={l + c.x * bw + (c.w * bw) / 2 - 1} y={top + c.y * bh + (c.h * bh) / 2 + 3} cls="p3-tw" pointerEvents="none">{pct(c.h)}</T>}</g>)}
        </>);
      }} />
  );
}
