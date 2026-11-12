import { useMemo, useState } from "react";
import { C } from "@belikh/jupiter-ui/Charts.tsx";
import { Segmented } from "@belikh/jupiter-ui/inputs.tsx";
import { Badge } from "@belikh/jupiter-ui/kit.tsx";
import { chainSegments, iso, marchingSquares, sampleField, surfaceLines } from "./contour.ts";
import { forecast, linearFit, poolUsable, RAID_LABEL, smartMargin, smartState, type RaidLevel } from "./storage.ts";
import { ramp } from "./sig.tsx";
import { Fig, M, Patterns, XLabels, YAxis, f1, lin, patUrl, pathOf, table, ticks } from "./shared.tsx";

/** Two-peak demo field on [-1,1]². */
export const demoField = (n: number) => sampleField(n, (x, y) => Math.exp(-((x + 0.4) ** 2 + (y + 0.2) ** 2) / 0.12) + 0.7 * Math.exp(-((x - 0.45) ** 2 + (y - 0.35) ** 2) / 0.08) + 0.12 * Math.cos(3 * x) * Math.sin(3 * y));

/** D068: contour plot by marching squares over a shaded height field. Level count is selectable; lines are labelled with their level. */
export function ContourPlot({ field, title = "Contour plot" }: { field: number[][]; title?: string }) {
  const [count, setCount] = useState("8"); const flat = field.flat(), lo = Math.min(...flat), hi = Math.max(...flat), k = Number(count);
  const levels = useMemo(() => (field.length ? Array.from({ length: k }, (_, i) => lo + ((i + 1) * (hi - lo)) / (k + 1)) : []), [field, k, lo, hi]);
  const lines = useMemo(() => levels.map((l) => chainSegments(marchingSquares(field, l))), [levels, field]);
  return (
    <div>
      <div className="p3-controls"><Segmented label="Contour levels" value={count} onChange={setCount} options={["4", "8", "12"].map((v) => ({ value: v, label: v }))} /></div>
      <Fig title={title} empty={!field.length} count={levels.length} height={340}
        summary={`${title}: ${field.length} by ${field[0]?.length} grid, values ${f1(lo)} to ${f1(hi)}, ${levels.length} contour levels drawn by marching squares.`}
        table={table(["Level", "Contour lines", "Segments"], levels.map((l, i) => [+l.toFixed(3), lines[i].length, lines[i].reduce((a, p) => a + p.length - 1, 0)]))}
        describe={(i) => `Level ${levels[i].toFixed(2)}: ${lines[i].length} contour line${lines[i].length === 1 ? "" : "s"}`}
        render={({ w, h, active, setActive }) => {
          const n = field.length, s = Math.min(w - M.l - M.r, h - 30), x0 = (w - s) / 2, y0 = 10, c = s / (n - 1), P = ([gx, gy]: [number, number]) => [x0 + gx * c, y0 + gy * c] as [number, number];
          return <>{field.slice(0, -1).map((row, j) => row.slice(0, -1).map((v, i) => <rect key={`${j}-${i}`} x={x0 + i * c} y={y0 + j * c} width={c + 0.5} height={c + 0.5} fill={ramp((v - lo) / (hi - lo) * 0.7)} />))}
            {lines.map((ls, i) => ls.map((l, j) => <path key={`${i}-${j}`} d={pathOf(l.map(P))} fill="none" stroke="var(--jp-text)" strokeWidth={active === i ? 3.5 : 1.2} opacity={active === null || active === i ? 1 : 0.5} onPointerEnter={() => setActive(i)} />))}
            {lines.map((ls, i) => ls[0] && ls[0].length > 6 ? (() => { const p = P(ls[0][Math.floor(ls[0].length / 3)]); return <text key={i} className="p3-ax p3-ax--strong" x={p[0]} y={p[1]} paintOrder="stroke" stroke="var(--jp-surface-raised)" strokeWidth={3}>{levels[i].toFixed(2)}</text>; })() : null)}
            <rect x={x0} y={y0} width={s} height={s} fill="none" stroke="var(--jp-border)" /></>;
        }} />
    </div>
  );
}

/** D068: isometric wireframe surface. Rows are painted back to front so nearer rows hide farther ones. */
export function SurfacePlot({ field, title = "Surface plot" }: { field: number[][]; title?: string }) {
  const [gain, setGain] = useState("1"); const n = field.length, flat = field.flat(), hi = Math.max(...flat, 0), lo = Math.min(...flat, 0);
  return (
    <div>
      <div className="p3-controls"><Segmented label="Height exaggeration" value={gain} onChange={setGain} options={[{ value: "0.6", label: "Low" }, { value: "1", label: "Normal" }, { value: "1.5", label: "High" }]} /></div>
      <Fig title={title} empty={!n} count={n} height={340}
        summary={`${title}: ${n} by ${field[0]?.length} height field from ${f1(lo)} to ${f1(hi)}, drawn as an isometric wireframe. Rows are numbered from the back.`}
        table={table(["Row", "Min", "Max", "Mean"], field.map((r, i) => [i, +Math.min(...r).toFixed(3), +Math.max(...r).toFixed(3), +(r.reduce((a, b) => a + b, 0) / r.length).toFixed(3)]))}
        describe={(i) => `Row ${i}: heights ${Math.min(...field[i]).toFixed(2)} to ${Math.max(...field[i]).toFixed(2)}`}
        render={({ w, h, active, setActive }) => {
          const g = Number(gain), sx = Math.min((w - 40) / (n * 1.74), (h - 40) / (n * 0.9)), sz = (sx * n * 0.5 * g) / Math.max(hi - lo, 1e-6), { rows } = surfaceLines(field, sx, sz);
          const all = rows.flat(), minX = Math.min(...all.map((p) => p[0])), maxX = Math.max(...all.map((p) => p[0])), minY = Math.min(...all.map((p) => p[1])), maxY = Math.max(...all.map((p) => p[1])), dx = (w - (maxX - minX)) / 2 - minX, dy = (h - (maxY - minY)) / 2 - minY;
          const T = (p: [number, number]) => [p[0] + dx, p[1] + dy] as [number, number];
          return <>{rows.map((r, y) => { const pts = r.map(T), last = n - 1, floor = [T(iso(last, y, lo, sx, sz)), T(iso(0, y, lo, sx, sz))];
            return <g key={y} onPointerEnter={() => setActive(y)}><path d={`${pathOf(pts)}L${floor[0][0]},${floor[0][1]}L${floor[1][0]},${floor[1][1]}Z`} fill="var(--jp-surface-raised)" stroke="none" />
              <path d={pathOf(pts)} fill="none" stroke={active === y ? "var(--jp-accent)" : C(0)} strokeWidth={active === y ? 3 : 1.2} /></g>; })}</>;
        }} />
    </div>
  );
}

type Disk = { id: string; tb: number; pool: string; temp: number; state: string };
/** D069: storage pool layout: usable vs redundancy per pool for the chosen RAID level, with per-disk cards. */
export function PoolLayout({ disks, title = "Storage pools" }: { disks: Disk[]; title?: string }) {
  const [level, setLevel] = useState<RaidLevel>("raid5"); const pools = [...new Set(disks.map((d) => d.pool))].filter((p) => p !== "spare");
  const calc = pools.map((p) => { const ds = disks.filter((d) => d.pool === p), lv: RaidLevel = p === "tank" ? level : "stripe"; return { name: p, ds, lv, u: poolUsable(ds.map((d) => d.tb), lv) }; });
  const spare = disks.filter((d) => d.pool === "spare");
  return (
    <div>
      <div className="p3-controls"><Segmented label="Tank redundancy" value={level} onChange={setLevel} options={(["mirror", "raid5", "raid6"] as RaidLevel[]).map((v) => ({ value: v, label: v === "mirror" ? "Mirror" : v === "raid5" ? "RAID 5" : "RAID 6" }))} /></div>
      <Fig title={title} empty={!disks.length} count={calc.length} height={40 + calc.length * 52}
        summary={`${title}: ${calc.map((c) => `${c.name} ${c.ds.length} disks, ${c.u ? `${c.u.usableTb} of ${c.u.rawTb} TB usable, tolerates ${c.u.tolerates} failure${c.u.tolerates === 1 ? "" : "s"}` : "too few disks for the level"}`).join("; ")}; ${spare.length} spare.`}
        table={table(["Pool", "Level", "Disks", "Raw (TB)", "Usable (TB)", "Failures tolerated"], calc.map((c) => [c.name, RAID_LABEL[c.lv], c.ds.length, c.u?.rawTb ?? 0, c.u?.usableTb ?? 0, c.u?.tolerates ?? "n/a"]))} legend={[{ name: "Usable (solid)", color: C(0) }, { name: "Redundancy or lost to smallest disk (hatched)", color: C(3) }]}
        describe={(i) => `${calc[i].name}: ${RAID_LABEL[calc[i].lv]}, ${calc[i].ds.length} disks, ${calc[i].u ? `${calc[i].u!.usableTb} TB usable of ${calc[i].u!.rawTb} TB raw` : "invalid layout"}`}
        footer={<div className="p3-disks" role="group" aria-label="Disks">{disks.map((d) => <div key={d.id} className={`p3-disk${d.state === "warn" ? " is-warn" : ""}`}><b>{d.id}</b><span>{d.tb} TB · {d.pool}</span><span>{d.temp} °C {d.state === "warn" ? <Badge s="warn">hot</Badge> : null}</span></div>)}</div>}
        render={({ w, h, active, setActive, uid }) => {
          const mx = Math.max(...calc.map((c) => c.u?.rawTb ?? 0), 1), x = lin(0, mx, M.l + 40, w - M.r);
          return <><Patterns id={uid} />{calc.map((c, i) => { const raw = c.u?.rawTb ?? 0, use = c.u?.usableTb ?? 0, y = 14 + i * 52;
            return <g key={c.name} onPointerEnter={() => setActive(i)}><text className="p3-ax p3-ax--strong" x={M.l + 34} y={y + 16} textAnchor="end">{c.name}</text>
              {c.u ? <><rect x={x(0)} y={y} width={x(use) - x(0)} height={26} fill={C(0)} stroke={active === i ? "var(--jp-text)" : "none"} strokeWidth={2} /><rect x={x(use)} y={y} width={x(raw) - x(use)} height={26} fill={patUrl(uid, 3)} stroke={C(3)} />
                {c.ds.map((d, k) => { const a = c.ds.slice(0, k).reduce((s, q) => s + q.tb, 0); return <line key={d.id} x1={x(a)} x2={x(a)} y1={y} y2={y + 26} stroke="var(--jp-surface-raised)" strokeWidth={2} />; })}
                <text className="p3-ax" x={x(raw) + 4} y={y + 13} dominantBaseline="middle">{use}/{raw} TB · {RAID_LABEL[c.lv].split(" (")[0]}</text></>
                : <text className="p3-ax" x={x(0)} y={y + 13}>Too few disks for {RAID_LABEL[c.lv]}</text>}</g>; })}</>;
        }} />
    </div>
  );
}

type Smart = { name: string; data: number[]; thresh: number };
/** D069: SMART attribute trends, one small panel per attribute, each against its failure threshold. Normalised attributes fall towards the threshold; temperature rises towards it. */
export function SmartTrend({ attrs, labels, title = "SMART trend" }: { attrs: Smart[]; labels: string[]; title?: string }) {
  const n = labels.length, rise = (a: Smart) => a.name.toLowerCase().includes("temp"), state = (a: Smart) => (rise(a) ? (a.data.at(-1)! >= a.thresh ? "fail" : a.thresh - a.data.at(-1)! < 10 ? "warn" : "ok") : smartState(a.data.at(-1)!, a.thresh));
  return (
    <Fig title={title} empty={!n || !attrs.length} count={n} height={attrs.length * 96 + 24}
      summary={`${title}: ${attrs.length} attributes over ${n} days; ${attrs.map((a) => `${a.name} ${a.data.at(-1)} (${state(a)})`).join("; ")}.`}
      table={table(["Day", ...attrs.map((a) => a.name)], labels.map((l, i) => [l, ...attrs.map((a) => a.data[i])]))}
      footer={<p className="p3-stats">{attrs.map((a) => <span key={a.name}>{a.name.split(" (")[0]} <Badge s={state(a) === "ok" ? "ok" : state(a) === "warn" ? "warn" : "danger"}>{state(a)}</Badge>{!rise(a) && <> margin <b>{Math.round(smartMargin(a.data.at(-1)!, a.thresh) * 100)}%</b></>}</span>)}</p>}
      describe={(i) => `${labels[i]}: ${attrs.map((a) => `${a.name.split(" (")[0]} ${a.data[i]}`).join(", ")}`}
      render={({ w, h, active, setActive }) => {
        const x = (i: number) => M.l + (i * (w - M.l - M.r)) / (n - 1), ph = 70;
        return <>{attrs.map((a, k) => { const top = 14 + k * 96, lo = Math.min(...a.data, a.thresh) - 2, hi = Math.max(...a.data, a.thresh) + 2, y = lin(lo, hi, top + ph, top);
          return <g key={a.name}><text className="p3-ax p3-ax--strong" x={M.l} y={top - 3}>{a.name}</text><rect x={M.l} y={top} width={w - M.l - M.r} height={ph} fill="none" stroke="var(--jp-border)" />
            <line x1={M.l} x2={w - M.r} y1={y(a.thresh)} y2={y(a.thresh)} stroke="var(--jp-danger)" strokeDasharray="6 3" strokeWidth={1.5} /><text className="p3-ax" x={w - M.r - 2} y={y(a.thresh) - 3} textAnchor="end">threshold {a.thresh}</text>
            <path className="p3-line" stroke={C(k)} d={pathOf(a.data.map((v, i) => [x(i), y(v)]))} /><text className="p3-ax" x={M.l - 4} y={y(a.data.at(-1)!)} textAnchor="end" dominantBaseline="middle">{a.data.at(-1)}</text></g>; })}
          <XLabels labels={labels} x={x} h={h + 4} every={Math.ceil(n / 6)} />
          {active !== null && <line className="p3-cross" x1={x(active)} x2={x(active)} y1={8} y2={h - 18} />}
          <rect x={M.l} y={8} width={w - M.l - M.r} height={h - 26} fill="transparent" onPointerMove={(e) => { const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect(); setActive(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left - M.l) / (w - M.l - M.r)) * (n - 1))))); }} /></>;
      }} />
  );
}

/** D069: capacity forecast: least-squares trend extended ahead with an uncertainty band, the capacity line and days until full. */
export function CapacityForecast({ usage, capacity, horizon = 120, unit = "TB", title = "Capacity forecast" }: { usage: number[]; capacity: number; horizon?: number; unit?: string; title?: string }) {
  const fc = forecast(usage, horizon, capacity), fit = linearFit(usage), resid = usage.length ? Math.sqrt(usage.reduce((a, v, i) => a + (v - (fit.intercept + fit.slope * i)) ** 2, 0) / usage.length) : 0, n = usage.length, total = n + horizon;
  const trend = (i: number) => fit.intercept + fit.slope * i;
  return (
    <Fig title={title} empty={n < 2} count={total} height={280}
      summary={`${title}: using ${f1(usage.at(-1) ?? 0)} of ${capacity} ${unit}, growing ${fit.slope.toFixed(2)} ${unit} per day; ${fc.toFull === null ? "no growth, so no full date" : `full in about ${Math.round(fc.toFull)} days`}.`}
      table={table(["Day", `Used (${unit})`, `Trend (${unit})`], Array.from({ length: total }, (_, i) => [i < n ? `d${i + 1}` : `+${i - n + 1}`, i < n ? usage[i] : "", +trend(i).toFixed(2)]))} legend={[{ name: "Observed", color: C(0) }, { name: "Forecast (dashed, band ±1.96σ)", color: C(2) }, { name: "Capacity", color: C(5) }]}
      footer={<p className="p3-stats">Growth <b>{fit.slope.toFixed(2)} {unit}/day</b> {fc.toFull !== null && <>Full in <b>{Math.round(fc.toFull)} days</b></>}</p>}
      describe={(i) => `${i < n ? `Day ${i + 1}: used ${usage[i]}, ` : `${i - n + 1} days ahead: `}trend ${trend(i).toFixed(1)} ${unit}${trend(i) >= capacity ? ", at or over capacity" : ""}`}
      render={({ w, h, active, setActive }) => {
        const hi = Math.max(capacity, trend(total - 1) + 2 * resid) * 1.05, tk = ticks(0, hi, 5), y = lin(0, tk.at(-1)!, h - M.b, M.t), x = (i: number) => M.l + (i * (w - M.l - M.r)) / (total - 1);
        const ahead = Array.from({ length: horizon + 1 }, (_, k) => n - 1 + k);
        return <><YAxis t={tk} y={y} w={w} /><XLabels labels={Array.from({ length: total }, (_, i) => (i < n ? `d${i + 1}` : `+${i - n + 1}`))} x={x} h={h} every={Math.ceil(total / 7)} />
          <path d={`${pathOf(ahead.map((i) => [x(i), y(trend(i) + 1.96 * resid)]))}${[...ahead].reverse().map((i) => `L${x(i)},${y(trend(i) - 1.96 * resid)}`).join("")}Z`} fill={C(2)} opacity={0.18} />
          <line x1={M.l} x2={w - M.r} y1={y(capacity)} y2={y(capacity)} stroke={C(5)} strokeWidth={2} strokeDasharray="8 3" /><text className="p3-ax" x={M.l + 4} y={y(capacity) - 4}>capacity {capacity} {unit}</text>
          <path className="p3-line" stroke={C(2)} strokeDasharray="6 4" d={pathOf(ahead.map((i) => [x(i), y(trend(i))]))} /><path className="p3-line" stroke={C(0)} d={pathOf(usage.map((v, i) => [x(i), y(v)]))} />
          {active !== null && <line className="p3-cross" x1={x(active)} x2={x(active)} y1={M.t} y2={h - M.b} />}
          <rect x={M.l} y={M.t} width={w - M.l - M.r} height={h - M.t - M.b} fill="transparent" onPointerMove={(e) => { const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect(); setActive(Math.max(0, Math.min(total - 1, Math.round(((e.clientX - r.left - M.l) / (w - M.l - M.r)) * (total - 1))))); }} /></>;
      }} />
  );
}
