import { useState } from "react";
import { C } from "@belikh/jupiter-ui/Charts.tsx";
import { Segmented } from "@belikh/jupiter-ui/inputs.tsx";
import { ageingBuckets, bridgeSteps, budgetVariance, candleGeom, controlLimits, controlSignals, depthCurves, errorStats, midPrice, type BridgeStep, type BudgetRow, type Candle, type Invoice, type Level } from "./finance.ts";
import { useChartInteractions, type Meta } from "./useChartInteractions.tsx";
import { Fig, M, Patterns, XLabels, YAxis, f1, lin, patUrl, pathOf, table, ticks } from "./shared.tsx";

/** D060: candlestick / OHLC. Up = hollow body, down = solid body (never colour alone, never red/green). */
export function Candlestick({ candles, mode: m0 = "candle", title = "Price, daily" }: { candles: Candle[]; mode?: "candle" | "ohlc"; title?: string }) {
  const [mode, setMode] = useState(m0);
  const lo = Math.min(...candles.map((c) => c.l)), hi = Math.max(...candles.map((c) => c.h)), t = ticks(lo, hi, 5);
  return (
    <div>
      <div className="p3-controls"><Segmented label="Candle style" value={mode} onChange={setMode} options={[{ value: "candle", label: "Candles" }, { value: "ohlc", label: "OHLC bars" }]} /></div>
      <Fig title={title} empty={!candles.length} count={candles.length} height={280}
        summary={`${title}: ${candles.length} periods from ${candles[0]?.t} to ${candles.at(-1)?.t}; closed ${f1(candles.at(-1)?.c ?? 0)}, range ${f1(lo)} to ${f1(hi)}. Hollow body means up, solid means down.`}
        table={table(["Period", "Open", "High", "Low", "Close"], candles.map((c) => [c.t, c.o, c.h, c.l, c.c]))}
        legend={[{ name: "Up (hollow)", color: C(0) }, { name: "Down (solid)", color: C(2) }]}
        describe={(i) => { const c = candles[i]; return `${c.t}: open ${c.o}, high ${c.h}, low ${c.l}, close ${c.c} (${c.c >= c.o ? "up" : "down"})`; }}
        render={({ w, h, active, setActive }) => {
          const y = lin(t[0] - 1, t.at(-1)! + 1, h - M.b, M.t), step = (w - M.l - M.r) / candles.length, bw = Math.max(2, Math.min(18, step * 0.6)), x = (i: number) => M.l + step * (i + 0.5);
          return <><YAxis t={t} y={y} w={w} /><XLabels labels={candles.map((c) => c.t)} x={x} h={h} />
            {candles.map((c, i) => { const g = candleGeom(c, y), col = g.up ? C(0) : C(2); return (
              <g key={i} onPointerEnter={() => setActive(i)} data-up={g.up}>
                <line x1={x(i)} x2={x(i)} y1={g.wickTop} y2={g.wickBottom} stroke={col} strokeWidth={1.5} />
                {mode === "candle" ? <rect x={x(i) - bw / 2} y={g.bodyTop} width={bw} height={g.bodyH} fill={g.up ? "var(--jp-surface-raised)" : col} stroke={col} strokeWidth={1.5} />
                  : <path d={`M${x(i) - bw / 2},${y(c.o)}H${x(i)}M${x(i)},${y(c.c)}H${x(i) + bw / 2}`} stroke={col} strokeWidth={1.5} fill="none" />}
                {active === i && <rect className="p3-hi" fill="none" x={x(i) - step / 2} y={M.t} width={step} height={h - M.t - M.b} />}
              </g>); })}</>;
        }} />
    </div>
  );
}

/** D060: market depth chart (cumulative bids and asks around the mid price). */
export function DepthChart({ bids, asks, title = "Order book depth" }: { bids: Level[]; asks: Level[]; title?: string }) {
  const d = depthCurves(bids, asks), all = [...d.bids.map((b) => ({ ...b, side: "Bid" })), ...[...d.asks].map((b) => ({ ...b, side: "Ask" }))], mid = midPrice(bids, asks);
  return (
    <Fig title={title} empty={!bids.length && !asks.length} count={all.length} height={240}
      summary={`${title}: mid price ${f1(mid)}, ${bids.length} bid and ${asks.length} ask levels; total bid depth ${f1(d.bids.at(-1)?.cum ?? 0)}, total ask depth ${f1(d.asks.at(-1)?.cum ?? 0)}.`}
      table={table(["Side", "Price", "Cumulative"], all.map((a) => [a.side, a.p, a.cum]))} legend={[{ name: "Bids", color: C(1) }, { name: "Asks", color: C(3) }]}
      describe={(i) => `${all[i].side} ${all[i].p}: cumulative volume ${all[i].cum}`}
      render={({ w, h, active, setActive }) => {
        const pmin = d.bids.at(-1)?.p ?? mid, pmax = d.asks.at(-1)?.p ?? mid, vmax = Math.max(d.bids.at(-1)?.cum ?? 0, d.asks.at(-1)?.cum ?? 0, 1);
        const x = lin(pmin, pmax, M.l, w - M.r), y = lin(0, vmax, h - M.b, M.t);
        const step = (lv: { p: number; cum: number }[]) => lv.map((l, i) => `${i ? "L" : "M"}${x(l.p)},${y(i ? lv[i - 1].cum : 0)}L${x(l.p)},${y(l.cum)}`).join("");
        const area = (lv: { p: number; cum: number }[]) => lv.length ? `${step(lv)}L${x(lv.at(-1)!.p)},${y(0)}L${x(lv[0].p)},${y(0)}Z` : "";
        return <><YAxis t={ticks(0, vmax, 4)} y={y} w={w} />
          <path d={area(d.bids)} fill={C(1)} fillOpacity={0.3} stroke={C(1)} strokeWidth={2} /><path d={area(d.asks)} fill={C(3)} fillOpacity={0.3} stroke={C(3)} strokeWidth={2} strokeDasharray="6 3" />
          <line className="p3-cross" x1={x(mid)} x2={x(mid)} y1={M.t} y2={h - M.b} strokeDasharray="3 3" /><text className="p3-ax" x={x(mid)} y={h - 8} textAnchor="middle">mid {f1(mid)}</text>
          <text className="p3-ax" x={M.l} y={h - 8}>{f1(pmin)}</text><text className="p3-ax" x={w - M.r} y={h - 8} textAnchor="end">{f1(pmax)}</text>
          {all.map((a, i) => <circle key={i} cx={x(a.p)} cy={y(a.cum)} r={active === i ? 6 : 8} fill={active === i ? C(a.side === "Bid" ? 1 : 3) : "transparent"} stroke={active === i ? "var(--jp-text)" : "none"} strokeWidth={2} onPointerEnter={() => setActive(i)} />)}</>;
      }} />
  );
}

/** D060 / quality: Shewhart control chart with mean ± 3σ limits and out-of-control signals. */
export function ControlChart({ values: all, title = "Fill weight (g)", baseline, group, meta }: { values: number[]; title?: string; baseline?: number; /** share the crosshair with other charts of this group */ group?: string; meta?: Meta }) {
  const ix = useChartInteractions({ n: all.length, labels: all.map((_, i) => `sample ${i + 1}`), group, meta }), [lo0, hi0] = ix.range, values = all.slice(lo0, hi0 + 1);
  const lim = controlLimits(all, baseline), sig = new Set(controlSignals(all, lim)), inWin = [...sig].filter((i) => i >= lo0 && i <= hi0).length;
  return (
    <Fig title={title} empty={!all.length} count={values.length} height={260} ix={ix} shared={{ active: ix.cursor === null || ix.cursor < lo0 || ix.cursor > hi0 ? null : ix.cursor - lo0, set: (i) => ix.setCursor(i === null ? null : i + lo0) }}
      summary={`${title}: ${values.length} of ${all.length} samples shown, centre ${f1(lim.mean)}, control limits ${f1(lim.lcl)} to ${f1(lim.ucl)} (mean ± 3 sigma); ${inWin} signal${inWin === 1 ? "" : "s"} in view.`}
      table={table(["Sample", "Value", "Signal"], values.map((v, i) => [lo0 + i + 1, v, sig.has(lo0 + i) ? "out of control" : ""]))} legend={[{ name: "Measurement", color: C(0) }, { name: "Signal (diamond)", color: C(5) }]}
      describe={(i) => `Sample ${lo0 + i + 1}: ${values[i]}${sig.has(lo0 + i) ? ", signal" : ", in control"}; centre ${f1(lim.mean)}, limits ${f1(lim.lcl)} to ${f1(lim.ucl)}`}
      render={({ w, h, active }) => {
        const lo = Math.min(lim.lcl, ...all), hi = Math.max(lim.ucl, ...all), y = lin(lo - 0.5, hi + 0.5, h - M.b, M.t), x = (i: number) => M.l + (i * (w - M.l - M.r)) / Math.max(1, values.length - 1), plot = { l: M.l, r: w - M.r, t: M.t, b: h - M.b };
        const L = (v: number, name: string, dash?: string) => <g><line x1={M.l} x2={w - M.r} y1={y(v)} y2={y(v)} stroke="var(--jp-text-muted)" strokeDasharray={dash} strokeWidth={1.5} /><text className="p3-ax" x={w - M.r} y={y(v) - 4} textAnchor="end">{name} {f1(v)}</text></g>;
        return <><YAxis t={ticks(lo, hi, 5)} y={y} w={w} grid={false} />{L(lim.ucl, "UCL", "6 3")}{L(lim.lcl, "LCL", "6 3")}{L(lim.mean, "mean")}{L(lim.uwl, "+2σ", "1 4")}{L(lim.lwl, "-2σ", "1 4")}
          <path className="p3-line" stroke={C(0)} d={pathOf(values.map((v, i) => [x(i), y(v)]))} />
          {values.map((v, i) => sig.has(lo0 + i) ? <path key={i} d={`M${x(i)},${y(v) - 7}l6,7l-6,7l-6,-7z`} fill={C(5)} stroke="var(--jp-text)" strokeWidth={1.5} /> : <circle key={i} cx={x(i)} cy={y(v)} r={active === i ? 5 : 2.5} fill={C(0)} />)}
          {active !== null && <line className="p3-cross" x1={x(active)} x2={x(active)} y1={M.t} y2={h - M.b} />}
          <rect {...ix.plotProps(plot)} />{ix.overlay(plot)}</>;
      }} />
  );
}

/** D060: error bars (SD, SE or 95% interval) with the raw observations as faint dots. */
export function ErrorBars({ groups, title = "Response by treatment" }: { groups: { name: string; values: number[] }[]; title?: string }) {
  const [kind, setKind] = useState<"sd" | "se" | "ci">("ci"); const st = groups.map((g) => ({ name: g.name, values: g.values, ...errorStats(g.values) }));
  const half = (s: (typeof st)[number]) => (kind === "sd" ? s.sd : kind === "se" ? s.se : 1.96 * s.se), kl = { sd: "standard deviation", se: "standard error", ci: "95% interval" }[kind];
  return (
    <div>
      <div className="p3-controls"><Segmented label="Error bar type" value={kind} onChange={setKind} options={[{ value: "sd", label: "SD" }, { value: "se", label: "SE" }, { value: "ci", label: "95% CI" }]} /></div>
      <Fig title={title} empty={!groups.length} count={st.length} height={260}
        summary={`${title}: ${st.length} groups with means and ${kl} bars; means from ${f1(Math.min(...st.map((s) => s.mean)))} to ${f1(Math.max(...st.map((s) => s.mean)))}.`}
        table={table(["Group", "n", "Mean", "SD", "SE", "CI low", "CI high"], st.map((s) => [s.name, s.n, +s.mean.toFixed(2), +s.sd.toFixed(2), +s.se.toFixed(2), +s.lo.toFixed(2), +s.hi.toFixed(2)]))}
        describe={(i) => `${st[i].name}: mean ${f1(st[i].mean)} ± ${f1(half(st[i]))} (${kl}), n = ${st[i].n}`}
        render={({ w, h, active, setActive }) => {
          const all = st.flatMap((s) => s.values), t = ticks(Math.min(...all), Math.max(...all), 5), y = lin(t[0], t.at(-1)!, h - M.b, M.t), step = (w - M.l - M.r) / st.length, x = (i: number) => M.l + step * (i + 0.5);
          return <><YAxis t={t} y={y} w={w} />{st.map((s, i) => <g key={s.name} onPointerEnter={() => setActive(i)}>
            {s.values.map((v, k) => <circle key={k} cx={x(i) + ((k % 5) - 2) * 6} cy={y(v)} r={2.5} fill={C(i)} opacity={0.35} />)}
            <line x1={x(i)} x2={x(i)} y1={y(s.mean - half(s))} y2={y(s.mean + half(s))} stroke="var(--jp-text)" strokeWidth={2} /><line x1={x(i) - 8} x2={x(i) + 8} y1={y(s.mean - half(s))} y2={y(s.mean - half(s))} stroke="var(--jp-text)" strokeWidth={2} /><line x1={x(i) - 8} x2={x(i) + 8} y1={y(s.mean + half(s))} y2={y(s.mean + half(s))} stroke="var(--jp-text)" strokeWidth={2} />
            <rect x={x(i) - 5} y={y(s.mean) - 5} width={10} height={10} fill={C(i)} stroke={active === i ? "var(--jp-text)" : "var(--jp-surface-raised)"} strokeWidth={2} />
            <text className="p3-ax" x={x(i)} y={h - 8} textAnchor="middle">{s.name}</text></g>)}</>;
        }} />
    </div>
  );
}

/** D066: budget variance (actual minus budget). Favourable bars are solid, adverse bars are hatched, and both are labelled. */
export function BudgetVariance({ rows, title = "Budget variance (k)" }: { rows: BudgetRow[]; title?: string }) {
  const v = budgetVariance(rows), totalVar = v.reduce((a, r) => a + (r.kind === "revenue" ? r.variance : -r.variance), 0);
  return (
    <Fig title={title} empty={!rows.length} count={v.length} height={Math.max(160, 40 + v.length * 34)}
      summary={`${title}: ${v.length} lines; ${v.filter((r) => r.favourable).length} favourable, ${v.filter((r) => !r.favourable).length} adverse; net effect on profit ${totalVar >= 0 ? "+" : ""}${f1(totalVar)}.`}
      table={table(["Line", "Kind", "Budget", "Actual", "Variance", "Variance %", "Result"], v.map((r) => [r.label, r.kind, r.budget, r.actual, r.variance, `${(r.pct * 100).toFixed(1)}%`, r.favourable ? "favourable" : "adverse"]))}
      legend={[{ name: "Favourable (solid)", color: "var(--jp-ok)" }, { name: "Adverse (hatched)", color: "var(--jp-danger)" }]}
      describe={(i) => `${v[i].label}: budget ${v[i].budget}, actual ${v[i].actual}, variance ${v[i].variance >= 0 ? "+" : ""}${v[i].variance} (${(v[i].pct * 100).toFixed(1)}%), ${v[i].favourable ? "favourable" : "adverse"}`}
      render={({ w, h, active, setActive, uid }) => {
        const ext = Math.max(...v.map((r) => Math.abs(r.variance)), 1), l = 110, x = lin(-ext, ext, l, w - M.r), rh = (h - 24) / v.length;
        return <><Patterns id={uid} /><line className="p3-ink" x1={x(0)} x2={x(0)} y1={6} y2={h - 18} />
          {v.map((r, i) => <g key={r.label} onPointerEnter={() => setActive(i)}>
            <text className="p3-ax p3-ax--strong" x={l - 8} y={8 + rh * i + rh / 2} textAnchor="end" dominantBaseline="middle">{r.label}</text>
            <rect x={Math.min(x(0), x(r.variance))} y={8 + rh * i + 4} width={Math.abs(x(r.variance) - x(0))} height={rh - 8} fill={r.favourable ? "var(--jp-ok)" : patUrl(uid, 3)} stroke={r.favourable ? "var(--jp-ok)" : "var(--jp-danger)"} strokeWidth={active === i ? 3 : 1.5} />
            <text className="p3-ax" x={r.variance >= 0 ? x(r.variance) + 4 : x(r.variance) - 4} y={8 + rh * i + rh / 2} textAnchor={r.variance >= 0 ? "start" : "end"} dominantBaseline="middle">{r.variance >= 0 ? "+" : ""}{r.variance}</text></g>)}
          <text className="p3-ax" x={x(0)} y={h - 4} textAnchor="middle">0</text></>;
      }} />
  );
}

/** D066: invoice ageing buckets by days past due. */
export function InvoiceAgeing({ invoices, asOf, title = "Receivables ageing" }: { invoices: Invoice[]; asOf: number; title?: string }) {
  const b = ageingBuckets(invoices, asOf), total = b.reduce((a, x) => a + x.amount, 0), overdue = total - b[0].amount;
  return (
    <Fig title={title} empty={!invoices.length} count={b.length} height={240}
      summary={`${title}: ${invoices.length} open invoices totalling ${total.toLocaleString("en")}; ${overdue.toLocaleString("en")} (${total ? Math.round((100 * overdue) / total) : 0}%) is overdue.`}
      table={table(["Bucket", "Invoices", "Amount", "Share"], b.map((x) => [x.label, x.count, x.amount, `${total ? Math.round((100 * x.amount) / total) : 0}%`]))}
      describe={(i) => `${b[i].label}: ${b[i].count} invoices, ${b[i].amount.toLocaleString("en")} (${total ? Math.round((100 * b[i].amount) / total) : 0}% of total)`}
      footer={<p className="p3-stats">Total <b>{total.toLocaleString("en")}</b> Overdue <b>{overdue.toLocaleString("en")}</b></p>}
      render={({ w, h, active, setActive, uid }) => {
        const max = Math.max(...b.map((x) => x.amount), 1), t = ticks(0, max, 4), y = lin(0, t.at(-1)!, h - M.b, M.t + 14), step = (w - M.l - M.r) / b.length;
        return <><Patterns id={uid} /><YAxis t={t} y={y} w={w} fmt={(v) => `${f1(v / 1000)}k`} />{b.map((x, i) => <g key={x.label} onPointerEnter={() => setActive(i)}>
          <rect x={M.l + step * i + step * 0.18} y={y(x.amount)} width={step * 0.64} height={y(0) - y(x.amount)} fill={i === 4 ? patUrl(uid, 3) : `color-mix(in oklab, var(--jp-warn) ${i * 22}%, var(--adm-c1))`} stroke={i === 4 ? "var(--jp-danger)" : "var(--jp-text)"} strokeWidth={active === i ? 3 : 1} />
          <text className="p3-ax p3-ax--strong" x={M.l + step * (i + 0.5)} y={y(x.amount) - 5} textAnchor="middle">{total ? Math.round((100 * x.amount) / total) : 0}%</text>
          <text className="p3-ax" x={M.l + step * (i + 0.5)} y={h - 8} textAnchor="middle">{x.label.replace(" days", "d")}</text></g>)}</>;
      }} />
  );
}

/** D066: cash-flow bridge (waterfall from opening to closing balance). */
export function CashBridge({ steps, title = "Cash-flow bridge (k)" }: { steps: BridgeStep[]; title?: string }) {
  const s = bridgeSteps(steps);
  return (
    <Fig title={title} empty={!steps.length} count={s.length} height={260}
      summary={`${title}: from ${s[0]?.to} to ${s.at(-1)?.to} over ${s.length - 2 > 0 ? s.length - 2 : 0} movements.`}
      table={table(["Step", "Change", "Running total"], s.map((x) => [x.label, x.total ? "" : x.delta, x.to]))} legend={[{ name: "Total", color: C(0) }, { name: "Inflow", color: C(1) }, { name: "Outflow (hatched)", color: C(3) }]}
      describe={(i) => `${s[i].label}: ${s[i].total ? "balance" : `${s[i].delta >= 0 ? "+" : ""}${s[i].delta}, balance`} ${s[i].to}`}
      render={({ w, h, active, setActive, uid }) => {
        const hi = Math.max(...s.flatMap((x) => [x.from, x.to]), 1), lo = Math.min(0, ...s.flatMap((x) => [x.from, x.to])), t = ticks(lo, hi, 5), y = lin(t[0], t.at(-1)!, h - M.b, M.t), step = (w - M.l - M.r) / s.length;
        return <><Patterns id={uid} /><YAxis t={t} y={y} w={w} />{s.map((x, i) => { const up = x.to >= x.from, col = x.total ? C(0) : up ? C(1) : C(3), x0 = M.l + step * i + step * 0.15;
          return <g key={i} onPointerEnter={() => setActive(i)}>
            <rect x={x0} y={y(Math.max(x.from, x.to))} width={step * 0.7} height={Math.max(1, Math.abs(y(x.from) - y(x.to)))} fill={x.total || up ? col : patUrl(uid, 3)} stroke={col} strokeWidth={active === i ? 3 : 1.5} />
            {i < s.length - 1 && <line className="p3-gl" x1={x0 + step * 0.7} x2={x0 + step} y1={y(x.to)} y2={y(x.to)} />}
            <text className="p3-ax" x={x0 + step * 0.35} y={h - 8} textAnchor="middle">{x.label.split(" ")[0]}</text></g>; })}</>;
      }} />
  );
}
