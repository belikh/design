import { useMemo, useState } from "react";
import { C, Legend, LineChart, Tooltip, type Series } from "@belikh/jupiter-ui/Charts.tsx";
import { ChartFrame, Readout, type FrameState } from "./frame.tsx";
import { autoState, fmt1, Marker, niceDomain, SHAPES } from "./shared.tsx";
import { spreadLabels } from "./lib.ts";

type Common = { title?: string; state?: FrameState; fmt?: (v: number) => string };

/* ---------- D004: lollipop ---------- */
export function Lollipop({ items, horizontal = false, title = "Lollipop chart", state, fmt = fmt1, unit = "" }: Common & { items: { label: string; value: number; group?: number }[]; horizontal?: boolean; unit?: string }) {
  return (
    <ChartFrame title={title} state={autoState(state, items.length)} height={260} table={{ head: ["Label", `Value${unit ? ` (${unit})` : ""}`], rows: items.map((i) => [i.label, i.value]) }}>
      {(w) => <LollipopBody w={w} items={items} horizontal={horizontal} fmt={fmt} title={title} />}
    </ChartFrame>
  );
}
function LollipopBody({ w, items, horizontal, fmt, title }: { w: number; items: { label: string; value: number; group?: number }[]; horizontal: boolean; fmt: (v: number) => string; title: string }) {
  const [sel, setSel] = useState<number | null>(null);
  const d = niceDomain(Math.min(0, ...items.map((i) => i.value)), Math.max(0, ...items.map((i) => i.value)));
  const rowH = 28, labelW = Math.min(130, w * 0.3), H = horizontal ? items.length * rowH + 28 : 250, m = { l: horizontal ? labelW : 44, r: 16, t: 10, b: horizontal ? 22 : 40 };
  const along = (v: number) => (horizontal ? m.l + ((v - d.lo) / (d.hi - d.lo)) * (w - m.l - m.r) : H - m.b - ((v - d.lo) / (d.hi - d.lo)) * (H - m.t - m.b));
  const band = (i: number) => (horizontal ? m.t + i * rowH + rowH / 2 : m.l + ((i + 0.5) / items.length) * (w - m.l - m.r));
  return (
    <>
      <svg viewBox={`0 0 ${w} ${H}`} style={{ width: "100%", height: H }} role="img" aria-label={`${title}: ${items.length} items`}>
        {d.ticks.map((t) => <g key={t}>{horizontal ? <><line x1={along(t)} x2={along(t)} y1={m.t} y2={H - m.b} className="adm-gl" /><text x={along(t)} y={H - 6} textAnchor="middle" className="adm-axis">{fmt(t)}</text></> : <><line x1={m.l} x2={w - m.r} y1={along(t)} y2={along(t)} className="adm-gl" /><text x={m.l - 6} y={along(t) + 4} textAnchor="end" className="adm-axis">{fmt(t)}</text></>}</g>)}
        {items.map((it, i) => { const base = along(Math.max(d.lo, Math.min(0, d.hi))), p = along(it.value), c = band(i), col = C(it.group ?? 0);
          const [x1, y1, x2, y2] = horizontal ? [base, c, p, c] : [c, base, c, p];
          return (
            <g key={it.label} className="pc-pt" tabIndex={0} role="img" aria-label={`${it.label}: ${fmt(it.value)}`} onMouseEnter={() => setSel(i)} onFocus={() => setSel(i)} onMouseLeave={() => setSel(null)} onBlur={() => setSel(null)}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth={sel === i ? 3 : 2} />
              <Marker shape={SHAPES[(it.group ?? 0) % 4]} x={x2} y={y2} r={sel === i ? 7 : 5.5} fill={col} />
              <text x={horizontal ? m.l - 8 : c} y={horizontal ? c + 4 : H - m.b + 16} textAnchor={horizontal ? "end" : "middle"} className="adm-axis">{it.label.length > 14 && !horizontal ? it.label.slice(0, 13) + "…" : it.label}</text>
            </g>
          ); })}
      </svg>
      <Readout>{sel !== null ? `${items[sel].label}: ${fmt(items[sel].value)}` : ""}</Readout>
    </>
  );
}

/* ---------- D004: dot plot (Cleveland), several series per row ---------- */
export function DotPlot({ rows, series, title = "Dot plot", state, fmt = fmt1 }: Common & { rows: { label: string; values: number[] }[]; series: string[] }) {
  return (
    <ChartFrame title={title} state={autoState(state, rows.length)} table={{ head: ["Label", ...series], rows: rows.map((r) => [r.label, ...r.values]) }}>
      {(w) => <DotPlotBody w={w} rows={rows} series={series} fmt={fmt} title={title} />}
    </ChartFrame>
  );
}
function DotPlotBody({ w, rows, series, fmt, title }: { w: number; rows: { label: string; values: number[] }[]; series: string[]; fmt: (v: number) => string; title: string }) {
  const [sel, setSel] = useState<string | null>(null); const all = rows.flatMap((r) => r.values); const d = niceDomain(Math.min(...all), Math.max(...all));
  const rowH = 26, lw = Math.min(130, w * 0.3), H = rows.length * rowH + 52, x = (v: number) => lw + ((v - d.lo) / (d.hi - d.lo)) * (w - lw - 16);
  return (
    <>
      <svg viewBox={`0 0 ${w} ${H}`} style={{ width: "100%", height: H }} role="img" aria-label={`${title}: ${rows.length} rows, ${series.length} series`}>
        {d.ticks.map((t) => <g key={t}><line x1={x(t)} x2={x(t)} y1={8} y2={H - 30} className="adm-gl" /><text x={x(t)} y={H - 16} textAnchor="middle" className="adm-axis">{fmt(t)}</text></g>)}
        {rows.map((r, i) => { const y = 18 + i * rowH; const lo = Math.min(...r.values), hi = Math.max(...r.values);
          return (<g key={r.label}><line x1={lw} x2={w - 16} y1={y} y2={y} stroke="var(--jp-border)" strokeDasharray="1 3" /><text x={lw - 8} y={y + 4} textAnchor="end" className="adm-axis">{r.label}</text>
            {r.values.length > 1 && <line x1={x(lo)} x2={x(hi)} y1={y} y2={y} stroke="var(--jp-text-muted)" strokeWidth="2" opacity=".5" />}
            {r.values.map((v, k) => <g key={k} className="pc-pt" tabIndex={0} role="img" aria-label={`${r.label}, ${series[k]}: ${fmt(v)}`} onMouseEnter={() => setSel(`${r.label} · ${series[k]}: ${fmt(v)}`)} onFocus={() => setSel(`${r.label} · ${series[k]}: ${fmt(v)}`)} onMouseLeave={() => setSel(null)} onBlur={() => setSel(null)}><Marker shape={SHAPES[k % 4]} x={x(v)} y={y} r={5.5} fill={C(k)} /></g>)}</g>); })}
      </svg>
      <Legend items={series.map((s, k) => ({ name: s, color: C(k) }))} />
      <Readout>{sel}</Readout>
    </>
  );
}

/* ---------- D004: dumbbell (before / after) ---------- */
export function Dumbbell({ items, aName = "Before", bName = "After", title = "Dumbbell chart", state, fmt = fmt1 }: Common & { items: { label: string; a: number; b: number }[]; aName?: string; bName?: string }) {
  const sorted = useMemo(() => [...items].sort((x, y) => y.b - y.a - (x.b - x.a)), [items]);
  return (
    <ChartFrame title={title} state={autoState(state, items.length)} table={{ head: ["Label", aName, bName, "Change"], rows: sorted.map((i) => [i.label, i.a, i.b, Math.round((i.b - i.a) * 100) / 100]) }}>
      {(w) => <DumbbellBody w={w} items={sorted} aName={aName} bName={bName} fmt={fmt} title={title} />}
    </ChartFrame>
  );
}
function DumbbellBody({ w, items, aName, bName, fmt, title }: { w: number; items: { label: string; a: number; b: number }[]; aName: string; bName: string; fmt: (v: number) => string; title: string }) {
  const [sel, setSel] = useState<string | null>(null); const all = items.flatMap((i) => [i.a, i.b]); const d = niceDomain(Math.min(...all), Math.max(...all));
  const rowH = 28, lw = Math.min(130, w * 0.28), H = items.length * rowH + 52, x = (v: number) => lw + ((v - d.lo) / (d.hi - d.lo)) * (w - lw - 30);
  return (
    <>
      <svg viewBox={`0 0 ${w} ${H}`} style={{ width: "100%", height: H }} role="img" aria-label={`${title}: ${aName} to ${bName}`}>
        {d.ticks.map((t) => <g key={t}><line x1={x(t)} x2={x(t)} y1={8} y2={H - 30} className="adm-gl" /><text x={x(t)} y={H - 16} textAnchor="middle" className="adm-axis">{fmt(t)}</text></g>)}
        {items.map((it, i) => { const y = 18 + i * rowH, diff = it.b - it.a;
          return (<g key={it.label} className="pc-pt" tabIndex={0} role="img" aria-label={`${it.label}: ${fmt(it.a)} to ${fmt(it.b)}, ${diff >= 0 ? "up" : "down"} ${fmt(Math.abs(diff))}`} onMouseEnter={() => setSel(`${it.label}: ${fmt(it.a)} → ${fmt(it.b)} (${diff >= 0 ? "+" : "−"}${fmt(Math.abs(diff))})`)} onFocus={() => setSel(`${it.label}: ${fmt(it.a)} → ${fmt(it.b)}`)} onMouseLeave={() => setSel(null)} onBlur={() => setSel(null)}>
            <text x={lw - 8} y={y + 4} textAnchor="end" className="adm-axis">{it.label}</text><line x1={x(it.a)} x2={x(it.b)} y1={y} y2={y} stroke={diff >= 0 ? C(0) : C(1)} strokeWidth="3" opacity=".6" />
            <Marker shape="circle" x={x(it.a)} y={y} r={5.5} fill={C(2)} /><Marker shape="diamond" x={x(it.b)} y={y} r={5} fill={diff >= 0 ? C(0) : C(1)} /></g>); })}
      </svg>
      <Legend items={[{ name: aName, color: C(2) }, { name: `${bName} (up)`, color: C(0) }, { name: `${bName} (down)`, color: C(1) }]} />
      <Readout>{sel}</Readout>
    </>
  );
}

/* ---------- D004: slope chart (two time points) ---------- */
export function SlopeChart({ items, aLabel, bLabel, title = "Slope chart", state, fmt = fmt1 }: Common & { items: { label: string; a: number; b: number }[]; aLabel: string; bLabel: string }) {
  return (
    <ChartFrame title={title} state={autoState(state, items.length)} height={300} table={{ head: ["Label", aLabel, bLabel, "Change"], rows: items.map((i) => [i.label, i.a, i.b, Math.round((i.b - i.a) * 100) / 100]) }}>
      {(w) => <SlopeBody w={w} items={items} aLabel={aLabel} bLabel={bLabel} fmt={fmt} title={title} />}
    </ChartFrame>
  );
}
function SlopeBody({ w, items, aLabel, bLabel, fmt, title }: { w: number; items: { label: string; a: number; b: number }[]; aLabel: string; bLabel: string; fmt: (v: number) => string; title: string }) {
  const [sel, setSel] = useState<number | null>(null); const all = items.flatMap((i) => [i.a, i.b]), lo = Math.min(...all), hi = Math.max(...all), H = 300, t = 34, b = 14;
  const y = (v: number) => (hi === lo ? (H + t - b) / 2 : t + (1 - (v - lo) / (hi - lo)) * (H - t - b));
  const labW = Math.min(120, w * 0.3), x1 = labW + 40, x2 = w - labW - 40; const ya = spreadLabels(items.map((i) => y(i.a)), 14, t, H - b), yb = spreadLabels(items.map((i) => y(i.b)), 14, t, H - b);
  return (
    <>
      <svg viewBox={`0 0 ${w} ${H}`} style={{ width: "100%", height: H }} role="img" aria-label={`${title}: ${aLabel} to ${bLabel}`}>
        <text x={x1} y={16} textAnchor="middle" className="adm-axis" fontWeight="700">{aLabel}</text><text x={x2} y={16} textAnchor="middle" className="adm-axis" fontWeight="700">{bLabel}</text>
        <line x1={x1} x2={x1} y1={t - 8} y2={H - b + 6} stroke="var(--jp-border)" /><line x1={x2} x2={x2} y1={t - 8} y2={H - b + 6} stroke="var(--jp-border)" />
        {items.map((it, i) => { const up = it.b >= it.a, col = up ? C(0) : C(1), on = sel === null || sel === i;
          return (<g key={it.label} className="pc-pt" tabIndex={0} role="img" opacity={on ? 1 : 0.25} aria-label={`${it.label}: ${fmt(it.a)} to ${fmt(it.b)}`} onMouseEnter={() => setSel(i)} onFocus={() => setSel(i)} onMouseLeave={() => setSel(null)} onBlur={() => setSel(null)}>
            <line x1={x1} y1={y(it.a)} x2={x2} y2={y(it.b)} stroke={col} strokeWidth={sel === i ? 3.5 : 2} strokeDasharray={up ? undefined : "6 3"} /><circle cx={x1} cy={y(it.a)} r="4" fill={col} /><circle cx={x2} cy={y(it.b)} r="4" fill={col} />
            <text x={x1 - 10} y={ya[i] + 4} textAnchor="end" className="adm-axis">{it.label} {fmt(it.a)}</text><text x={x2 + 10} y={yb[i] + 4} className="adm-axis">{fmt(it.b)} {up ? "▲" : "▼"}</text></g>); })}
      </svg>
      <Readout>{sel !== null ? `${items[sel].label}: ${fmt(items[sel].a)} → ${fmt(items[sel].b)} (${items[sel].b >= items[sel].a ? "up" : "down"})` : "Dashed lines went down; solid lines went up."}</Readout>
    </>
  );
}

/* ---------- D005: combo (bars + lines, dual axis) ---------- */
export function ComboChart({ labels, bars, lines, title = "Combo chart", state, fmt = fmt1, fmt2 = fmt1, height = 260 }: Common & { labels: string[]; bars: Series[]; lines: Series[]; fmt2?: (v: number) => string; height?: number }) {
  const all = [...bars, ...lines];
  return (
    <ChartFrame title={title} state={autoState(state, labels.length && all.length ? 1 : 0)} height={height} table={{ head: ["Label", ...all.map((s) => `${s.name}${s.axis === 2 ? " (right axis)" : ""}`)], rows: labels.map((l, i) => [l, ...all.map((s) => s.data[i])]) }}>
      {(w) => <ComboBody w={w} labels={labels} bars={bars} lines={lines} fmt={fmt} fmt2={fmt2} height={height} title={title} />}
    </ChartFrame>
  );
}
function ComboBody({ w, labels, bars, lines, fmt, fmt2, height, title }: { w: number; labels: string[]; bars: Series[]; lines: Series[]; fmt: (v: number) => string; fmt2: (v: number) => string; height: number; title: string }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set()); const [hover, setHover] = useState<number | null>(null);
  const hasR = lines.some((l) => l.axis === 2), m = { l: 48, r: hasR ? 48 : 14, t: 12, b: 26 }, H = height, n = labels.length;
  const vb = bars.filter((s) => !hidden.has(s.name)), vl = lines.filter((s) => !hidden.has(s.name)); const left = [...vb.flatMap((s) => s.data), ...vl.filter((s) => s.axis !== 2).flatMap((s) => s.data)]; const right = vl.filter((s) => s.axis === 2).flatMap((s) => s.data);
  const dl = niceDomain(Math.min(0, ...left), Math.max(1, ...left)), dr = niceDomain(Math.min(0, ...right), Math.max(1, ...right));
  const yl = (v: number) => H - m.b - ((v - dl.lo) / (dl.hi - dl.lo)) * (H - m.t - m.b), yr = (v: number) => H - m.b - ((v - dr.lo) / (dr.hi - dr.lo)) * (H - m.t - m.b);
  const bw = (w - m.l - m.r) / n, inner = bw * 0.7, cx = (i: number) => m.l + bw * (i + 0.5);
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(w / 60))));
  const allS = [...bars, ...lines];
  return (
    <div style={{ position: "relative" }} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${w} ${H}`} style={{ width: "100%", height: H }} role="img" aria-label={`${title}: ${allS.map((s) => s.name).join(", ")}`} onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHover(Math.max(0, Math.min(n - 1, Math.floor(((e.clientX - r.left - m.l) / (w - m.l - m.r)) * n)))); }}>
        {dl.ticks.map((t) => <g key={t}><line x1={m.l} x2={w - m.r} y1={yl(t)} y2={yl(t)} className="adm-gl" /><text x={m.l - 6} y={yl(t) + 4} textAnchor="end" className="adm-axis">{fmt(t)}</text></g>)}
        {hasR && dr.ticks.map((t) => <text key={t} x={w - m.r + 6} y={yr(t) + 4} className="adm-axis">{fmt2(t)}</text>)}
        {labels.map((l, i) => i % every === 0 && <text key={i} x={cx(i)} y={H - 8} textAnchor="middle" className="adm-axis">{l}</text>)}
        {vb.map((s) => { const k = bars.indexOf(s), sw = inner / Math.max(1, vb.length), bi = vb.indexOf(s);
          return s.data.map((v, i) => <rect key={`${s.name}${i}`} x={cx(i) - inner / 2 + bi * sw} y={Math.min(yl(v), yl(0))} width={Math.max(1, sw - 2)} height={Math.abs(yl(v) - yl(0))} rx="2" fill={s.color ?? C(k)} opacity={hover === null || hover === i ? 1 : 0.5} />); })}
        {vl.map((s) => { const k = bars.length + lines.indexOf(s), f = s.axis === 2 ? yr : yl, col = s.color ?? C(k); return <g key={s.name}><path d={s.data.map((v, i) => `${i ? "L" : "M"}${cx(i)},${f(v)}`).join("")} fill="none" stroke={col} strokeWidth="2.5" strokeDasharray={s.axis === 2 ? "7 4" : undefined} strokeLinejoin="round" />{s.data.map((v, i) => <Marker key={i} shape={SHAPES[(k % 3) + 1]} x={cx(i)} y={f(v)} r={3.5} fill={col} />)}</g>; })}
        {hover !== null && <line x1={cx(hover)} x2={cx(hover)} y1={m.t} y2={H - m.b} className="adm-cross" />}
      </svg>
      {hover !== null && <Tooltip x={Math.min(Math.max((cx(hover) / w) * 100, 14), 80)} y={0}><b>{labels[hover]}</b>{allS.filter((s) => !hidden.has(s.name)).map((s, k) => <div key={s.name}><i style={{ background: s.color ?? C(k) }} />{s.name}{s.axis === 2 ? " (R)" : ""}<span>{(s.axis === 2 ? fmt2 : fmt)(s.data[hover])}</span></div>)}</Tooltip>}
      <Legend items={allS.map((s, k) => ({ name: s.name, color: s.color ?? C(k) }))} hidden={hidden} onToggle={(nm) => setHidden((h) => { const c = new Set(h); c.has(nm) ? c.delete(nm) : c.add(nm); return c; })} />
    </div>
  );
}

/* ---------- D007: small multiples ---------- */
export function SmallMultiples({ labels, panels, title = "Small multiples", state, fmt = fmt1 }: Common & { labels: string[]; panels: { name: string; data: number[] }[] }) {
  const [shared, setShared] = useState(true); const [sel, setSel] = useState<string | null>(null);
  return (
    <ChartFrame title={title} state={autoState(state, panels.length && labels.length ? 1 : 0)} height={320} table={{ head: ["Label", ...panels.map((p) => p.name)], rows: labels.map((l, i) => [l, ...panels.map((p) => p.data[i])]) }}
      footer={sel && <div style={{ marginTop: 12 }}><b>{sel}</b><LineChart labels={labels} series={panels.filter((p) => p.name === sel).map((p) => ({ name: p.name, data: p.data }))} height={180} title={`${title}: ${sel}`} /></div>}>
      {(w) => {
        const cols = Math.max(1, Math.floor(w / 190)), gap = 12, pw = (w - gap * (cols - 1)) / cols, ph = 90; const all = panels.flatMap((p) => p.data), gmin = Math.min(...all), gmax = Math.max(...all);
        return (
          <>
            <label className="adm-check" style={{ marginBottom: 8 }}><input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} /><span>Shared y-axis (compare magnitudes)</span></label>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${pw}px)`, gap }}>
              {panels.map((p, k) => { const lo = shared ? gmin : Math.min(...p.data), hi = shared ? gmax : Math.max(...p.data); const x = (i: number) => 4 + (i * (pw - 8)) / Math.max(1, p.data.length - 1), y = (v: number) => (hi === lo ? ph / 2 : ph - 14 - ((v - lo) / (hi - lo)) * (ph - 28)); const iMax = p.data.indexOf(Math.max(...p.data)), iMin = p.data.indexOf(Math.min(...p.data));
                return (
                  <button key={p.name} type="button" className="pc-tile" style={{ padding: 8, textAlign: "start", cursor: "pointer", outline: sel === p.name ? "2px solid var(--jp-accent)" : undefined }} onClick={() => setSel(sel === p.name ? null : p.name)} aria-pressed={sel === p.name} aria-label={`${p.name}: latest ${fmt(p.data[p.data.length - 1])}. Click to enlarge`}>
                    <span className="adm-row" style={{ justifyContent: "space-between", width: "100%" }}><b style={{ fontSize: "var(--jp-fs-xs)" }}>{p.name}</b><span className="adm-num" style={{ fontSize: "var(--jp-fs-xs)" }}>{fmt(p.data[p.data.length - 1])}</span></span>
                    <svg width={pw - 16} height={ph} viewBox={`0 0 ${pw - 16} ${ph}`} aria-hidden><path d={p.data.map((v, i) => `${i ? "L" : "M"}${x(i) * ((pw - 16) / pw)},${y(v)}`).join("")} fill="none" stroke={C(k)} strokeWidth="2" strokeLinejoin="round" />
                      <circle cx={x(iMax) * ((pw - 16) / pw)} cy={y(p.data[iMax])} r="3" fill={C(k)} /><circle cx={x(iMin) * ((pw - 16) / pw)} cy={y(p.data[iMin])} r="3" fill="var(--jp-surface-raised)" stroke={C(k)} strokeWidth="2" /></svg>
                  </button>
                ); })}
            </div>
            <p className="pc-note">Filled dot = maximum, hollow dot = minimum. {shared ? "All panels share one scale." : "Each panel is scaled to its own range, so compare shape, not size."}</p>
          </>
        );
      }}
    </ChartFrame>
  );
}

/* ---------- D011: floating range bars ---------- */
export function FloatingRange({ items, title = "Floating range bars", state, fmt = fmt1, band, unit = "" }: Common & { items: { label: string; lo: number; hi: number; mid?: number }[]; band?: { lo: number; hi: number; label: string }; unit?: string }) {
  return (
    <ChartFrame title={title} state={autoState(state, items.length)} table={{ head: ["Label", "Low", "High", "Mid", "Range"], rows: items.map((i) => [i.label, i.lo, i.hi, i.mid ?? "", Math.round((i.hi - i.lo) * 100) / 100]) }}>
      {(w) => <RangeBody w={w} items={items} fmt={fmt} band={band} unit={unit} title={title} />}
    </ChartFrame>
  );
}
function RangeBody({ w, items, fmt, band, unit, title }: { w: number; items: { label: string; lo: number; hi: number; mid?: number }[]; fmt: (v: number) => string; band?: { lo: number; hi: number; label: string }; unit: string; title: string }) {
  const [sel, setSel] = useState<number | null>(null); const all = [...items.flatMap((i) => [i.lo, i.hi]), ...(band ? [band.lo, band.hi] : [])]; const d = niceDomain(Math.min(...all), Math.max(...all));
  const rowH = 28, lw = Math.min(120, w * 0.26), H = items.length * rowH + 48, x = (v: number) => lw + ((v - d.lo) / (d.hi - d.lo)) * (w - lw - 16);
  return (
    <>
      <svg viewBox={`0 0 ${w} ${H}`} style={{ width: "100%", height: H }} role="img" aria-label={`${title}: ${items.length} ranges${unit ? ` in ${unit}` : ""}`}>
        {band && <g><rect x={x(band.lo)} y={10} width={Math.max(1, x(band.hi) - x(band.lo))} height={H - 40} fill="var(--adm-c3)" opacity=".12" /><text x={x(band.lo) + 4} y={22} className="adm-axis">{band.label}</text></g>}
        {d.ticks.map((t) => <g key={t}><line x1={x(t)} x2={x(t)} y1={6} y2={H - 30} className="adm-gl" /><text x={x(t)} y={H - 16} textAnchor="middle" className="adm-axis">{fmt(t)}</text></g>)}
        {items.map((it, i) => { const y = 20 + i * rowH;
          return (<g key={it.label} className="pc-pt" tabIndex={0} role="img" aria-label={`${it.label}: ${fmt(it.lo)} to ${fmt(it.hi)}`} onMouseEnter={() => setSel(i)} onFocus={() => setSel(i)} onMouseLeave={() => setSel(null)} onBlur={() => setSel(null)}>
            <text x={lw - 8} y={y + 4} textAnchor="end" className="adm-axis">{it.label}</text><rect x={x(it.lo)} y={y - 8} width={Math.max(2, x(it.hi) - x(it.lo))} height={16} rx="4" fill={C(0)} opacity={sel === null || sel === i ? 0.9 : 0.35} />
            {it.mid !== undefined && <line x1={x(it.mid)} x2={x(it.mid)} y1={y - 11} y2={y + 11} stroke="var(--jp-text)" strokeWidth="3" />}</g>); })}
      </svg>
      <Readout>{sel !== null ? `${items[sel].label}: ${fmt(items[sel].lo)} to ${fmt(items[sel].hi)}${items[sel].mid !== undefined ? `, mid ${fmt(items[sel].mid!)}` : ""}` : "Bar = low to high; black tick = median/mid."}</Readout>
    </>
  );
}

/* ---------- D012: table as chart ---------- */
export type TableMode = "heat" | "bar" | "dot" | "rank";
export function TableChart({ rows, columns, mode, prev, title = "Table as chart", state, fmt = fmt1 }: Common & { rows: { name: string; values: number[] }[]; columns: string[]; mode: TableMode; prev?: Record<string, number> }) {
  const [sort, setSort] = useState<{ col: number; dir: 1 | -1 }>({ col: 0, dir: -1 });
  const sorted = useMemo(() => [...rows].sort((a, b) => (a.values[sort.col] - b.values[sort.col]) * sort.dir || a.name.localeCompare(b.name)), [rows, sort]);
  const ext = columns.map((_, c) => { const v = rows.map((r) => r.values[c]); return { lo: Math.min(...v), hi: Math.max(...v) }; });
  const rank = (v: number, c: number, set: number[]) => set.filter((x) => x > v).length + 1;
  const col0 = rows.map((r) => r.values[0]); const prevVals = prev ? rows.map((r) => prev[r.name] ?? r.values[0]) : [];
  return (
    <ChartFrame title={title} svg={false} state={autoState(state, rows.length)} table={{ head: ["Name", ...columns], rows: rows.map((r) => [r.name, ...r.values]) }}>
      {() => (
        <div style={{ overflow: "auto" }}>
          <table className="pc-table" aria-label={`${title} (${mode})`}>
            <thead><tr>{mode === "rank" && <th>#</th>}<th>Name</th>{columns.map((c, i) => <th key={c} aria-sort={sort.col === i ? (sort.dir === 1 ? "ascending" : "descending") : undefined} className={mode === "heat" || mode === "rank" ? "num" : undefined}><button onClick={() => setSort((s) => ({ col: i, dir: s.col === i ? (s.dir === 1 ? -1 : 1) : -1 }))}>{c}{sort.col === i ? (sort.dir === 1 ? " ▲" : " ▼") : ""}</button></th>)}{mode === "rank" && <th>Δ rank</th>}</tr></thead>
            <tbody>{sorted.map((r, ri) => {
              const cur = rank(r.values[0], 0, col0), was = prev ? rank(prev[r.name] ?? r.values[0], 0, prevVals) : cur, delta = was - cur;
              return (<tr key={r.name}>{mode === "rank" && <td className="num">{ri + 1}</td>}<th scope="row" style={{ fontWeight: 600, textTransform: "none", letterSpacing: 0, fontFamily: "var(--jp-font-sans)", color: "var(--jp-text)", fontSize: "inherit" }}>{r.name}</th>
                {r.values.map((v, c) => { const t = ext[c].hi === ext[c].lo ? 0.5 : (v - ext[c].lo) / (ext[c].hi - ext[c].lo);
                  return mode === "heat" ? <td key={c} className="pc-heatcell" style={{ ["--t" as string]: t.toFixed(2), color: t > 0.6 ? "var(--jp-on-accent)" : undefined }}>{fmt(v)}</td>
                    : mode === "bar" ? <td key={c}><div className="pc-inbar" role="img" aria-label={`${columns[c]}: ${fmt(v)}`}><i style={{ width: `${Math.max(3, t * 100)}%`, background: C(c) }} /><span>{fmt(v)}</span></div></td>
                    : mode === "dot" ? <td key={c}><div className="pc-dottrack" role="img" aria-label={`${columns[c]}: ${fmt(v)}, ${Math.round(t * 100)}% of the range`}><i style={{ insetInlineStart: `${t * 100}%`, background: C(c) }} /></div></td>
                    : <td key={c} className="num">{fmt(v)}</td>; })}
                {mode === "rank" && <td><span className={`pc-rank ${delta > 0 ? "is-up" : delta < 0 ? "is-down" : ""}`} aria-label={delta > 0 ? `up ${delta} places` : delta < 0 ? `down ${-delta} places` : "no change"}>{delta > 0 ? `▲ ${delta}` : delta < 0 ? `▼ ${-delta}` : "–"}</span></td>}</tr>); })}</tbody>
          </table>
        </div>
      )}
    </ChartFrame>
  );
}
