import { C, Chart, fmt, legendOf, T, YAxis, type FrameState } from "./kit.tsx";
import { beeswarm, boxStats, ecdf, histogram, kde, mean, qqLine, qqNormal, quantile, sd, sortAsc, sturges } from "./stats.ts";
import { areaPath, linePath } from "./stack.ts";
import { niceDomain } from "../charts/shared.tsx";

const M = { l: 48, r: 14, t: 14, b: 30 };
const r1 = (v: number) => Math.round(v * 10) / 10;
const ext = (gs: number[][]) => { const a = gs.flat().filter(Number.isFinite); return niceDomain(Math.min(...a), Math.max(...a), 5); };
type Common = { id?: string; height?: number; state?: FrameState };
function XTicks({ ticks, x, y }: { ticks: number[]; x: (v: number) => number; y: number }) { return <>{ticks.map((t) => <T key={t} x={x(t)} y={y}>{fmt(t)}</T>)}</>; }

/* ---------- D013: histogram ---------- */
export function Histogram({ title = "Histogram", id = "D013", values, bins, unit = "ms", height = 240, state }: { title?: string; values: number[]; bins?: number; unit?: string } & Common) {
  const nd = values.length ? ext([values]) : niceDomain(0, 1), b = histogram(values, bins ?? sturges(values.length), nd.lo, nd.hi), peak = Math.max(1, ...b.map((x) => x.count));
  return (
    <Chart title={title} id={id} height={height} state={state} count={values.length}
      items={b.map((x) => `${fmt(x.x0)} to ${fmt(x.x1)} ${unit}: ${x.count} values (${((x.count / values.length) * 100).toFixed(1)}%)`)}
      summary={`Histogram of ${values.length} values in ${b.length} bins from ${fmt(nd.lo)} to ${fmt(nd.hi)} ${unit}. Tallest bin holds ${peak}.`}
      table={{ head: ["Bin start", "Bin end", "Count"], rows: b.map((x) => [r1(x.x0), r1(x.x1), x.count]) }}
      build={(w, pk) => {
        const x = (v: number) => M.l + ((v - nd.lo) / (nd.hi - nd.lo)) * (w - M.l - M.r), bot = height - M.b, yy = (c: number) => bot - (c / peak) * (bot - M.t); const ty = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * peak));
        return (<>
          <YAxis ticks={[...new Set(ty)]} y={yy} x0={M.l} x1={w - M.r} />
          {b.map((q, i) => <rect key={i} {...pk.mark(i)} x={x(q.x0) + 0.5} width={Math.max(0, x(q.x1) - x(q.x0) - 1)} y={yy(q.count)} height={bot - yy(q.count)} fill="var(--adm-c1)" />)}
          <XTicks ticks={nd.ticks} x={x} y={height - 10} />
        </>);
      }} />
  );
}

/* ---------- D013: density (overlaid KDE) ---------- */
export function DensityChart({ title = "Density", id = "D013", names, groups, unit = "ms", height = 250, state }: { title?: string; names: string[]; groups: number[][]; unit?: string } & Common) {
  const nd = groups.length ? ext(groups) : niceDomain(0, 1), ks = groups.map((g) => kde(g, nd.lo, nd.hi, 80)), peak = Math.max(1e-9, ...ks.flat().map((p) => p.y));
  return (
    <Chart title={title} id={id} height={height} state={state} count={groups.flat().length} legend={legendOf(names)}
      items={names.map((n, i) => { const top = ks[i].reduce((a, p) => (p.y > a.y ? p : a)); return `${n}: mean ${r1(mean(groups[i]))}${unit}, std dev ${r1(sd(groups[i]))}, mode near ${r1(top.x)}${unit}, n=${groups[i].length}`; })}
      summary={`Kernel density estimates for ${names.join(", ")} over ${fmt(nd.lo)} to ${fmt(nd.hi)} ${unit}.`}
      table={{ head: ["Group", "n", "Mean", "Std dev", "Median"], rows: names.map((n, i) => [n, groups[i].length, r1(mean(groups[i])), r1(sd(groups[i])), r1(quantile(sortAsc(groups[i].slice()), 0.5))]) }}
      build={(w, pk) => {
        const x = (v: number) => M.l + ((v - nd.lo) / (nd.hi - nd.lo)) * (w - M.l - M.r), bot = height - M.b, y = (v: number) => bot - (v / peak) * (bot - M.t - 6);
        return (<>
          <line x1={M.l} x2={w - M.r} y1={bot} y2={bot} className="adm-gl" /><T x={M.l - 6} y={M.t + 6} anchor="end">density</T>
          {ks.map((k, i) => { const xs = k.map((p) => x(p.x)); return (<g key={i} {...pk.mark(i)}><path d={areaPath(xs, k.map(() => bot), k.map((p) => y(p.y)))} fill={C(i)} fillOpacity={0.22} /><path d={linePath(xs, k.map((p) => y(p.y)))} stroke={C(i)} strokeWidth={2.5} fill="none" /></g>); })}
          <XTicks ticks={nd.ticks} x={x} y={height - 10} />
        </>);
      }} />
  );
}

/* ---------- D013: ridgeline ---------- */
export function Ridgeline({ title = "Ridgeline", id = "D013", names, groups, unit = "ms", rowH = 56, overlap = 1.7, state }: { title?: string; names: string[]; groups: number[][]; unit?: string; rowH?: number; overlap?: number } & Common) {
  const nd = groups.length ? ext(groups) : niceDomain(0, 1), ks = groups.map((g) => kde(g, nd.lo, nd.hi, 80)), peak = Math.max(1e-9, ...ks.flat().map((p) => p.y)), height = M.t + names.length * rowH + 34;
  return (
    <Chart title={title} id={id} height={height} state={state} count={groups.flat().length}
      items={names.map((n, i) => `${n}: median ${r1(quantile(sortAsc(groups[i].slice()), 0.5))}${unit}, p90 ${r1(quantile(sortAsc(groups[i].slice()), 0.9))}${unit}, n=${groups[i].length}`)}
      summary={`Ridgeline of ${names.length} overlapping density curves (${names.join(", ")}) on a shared ${unit} axis, ordered top to bottom.`}
      table={{ head: ["Group", "n", "Median", "p90"], rows: names.map((n, i) => [n, groups[i].length, r1(quantile(sortAsc(groups[i].slice()), 0.5)), r1(quantile(sortAsc(groups[i].slice()), 0.9))]) }}
      build={(w, pk) => {
        const l = 84, x = (v: number) => l + ((v - nd.lo) / (nd.hi - nd.lo)) * (w - l - M.r);
        return (<>
          {names.map((n, i) => { const base = M.t + (i + 1) * rowH - 4, k = ks[i], xs = k.map((p) => x(p.x)), ys = k.map((p) => base - (p.y / peak) * rowH * overlap); return (<g key={n} {...pk.mark(i)}>
            <line x1={l} x2={w - M.r} y1={base} y2={base} className="adm-gl" /><T x={l - 8} y={base} anchor="end" cls="p3-tl">{n}</T>
            <path d={areaPath(xs, k.map(() => base), ys)} fill={C(i)} fillOpacity={0.55} stroke="var(--jp-surface-raised)" strokeWidth={1.5} />
          </g>); })}
          <XTicks ticks={nd.ticks} x={x} y={height - 10} />
        </>);
      }} />
  );
}

/* shared vertical-category axes for box / violin / strip */
function catLayout(w: number, n: number, nd: { lo: number; hi: number }, height: number) {
  const bw = (w - M.l - M.r) / n, cx = (i: number) => M.l + bw * (i + 0.5), bot = height - M.b, y = (v: number) => bot - ((v - nd.lo) / (nd.hi - nd.lo)) * (bot - M.t); return { bw, cx, y, bot };
}
const CatLabels = ({ names, cx, y }: { names: string[]; cx: (i: number) => number; y: number }) => <>{names.map((n, i) => <T key={n} x={cx(i)} y={y}>{n}</T>)}</>;

/* ---------- D013: box plot ---------- */
export function BoxPlot({ title = "Box plot", id = "D013", names, groups, unit = "ms", height = 280, state }: { title?: string; names: string[]; groups: number[][]; unit?: string } & Common) {
  const st = groups.map(boxStats), nd = groups.length ? ext(groups) : niceDomain(0, 1);
  return (
    <Chart title={title} id={id} height={height} state={state} count={groups.flat().length} legend={legendOf(names)}
      items={names.map((n, i) => `${n}: median ${r1(st[i].median)}${unit}, quartiles ${r1(st[i].q1)} to ${r1(st[i].q3)}, whiskers ${r1(st[i].whiskerLo)} to ${r1(st[i].whiskerHi)}, ${st[i].outliers.length} outliers`)}
      summary={`Box plots (median, quartiles, 1.5 IQR whiskers, outliers) for ${names.join(", ")}.`}
      table={{ head: ["Group", "n", "Min", "Q1", "Median", "Q3", "Max", "Outliers"], rows: names.map((n, i) => [n, st[i].n, r1(st[i].min), r1(st[i].q1), r1(st[i].median), r1(st[i].q3), r1(st[i].max), st[i].outliers.length]) }}
      build={(w, pk) => {
        const { bw, cx, y } = catLayout(w, names.length, nd, height), bx = Math.min(56, bw * 0.5);
        return (<>
          <YAxis ticks={nd.ticks} y={y} x0={M.l} x1={w - M.r} />
          {st.map((s, i) => (<g key={i} {...pk.mark(i)}>
            <line x1={cx(i)} x2={cx(i)} y1={y(s.whiskerLo)} y2={y(s.q1)} className="p3-ink" /><line x1={cx(i)} x2={cx(i)} y1={y(s.q3)} y2={y(s.whiskerHi)} className="p3-ink" />
            <line x1={cx(i) - bx / 4} x2={cx(i) + bx / 4} y1={y(s.whiskerLo)} y2={y(s.whiskerLo)} className="p3-ink" /><line x1={cx(i) - bx / 4} x2={cx(i) + bx / 4} y1={y(s.whiskerHi)} y2={y(s.whiskerHi)} className="p3-ink" />
            <rect x={cx(i) - bx / 2} width={bx} y={y(s.q3)} height={Math.max(1, y(s.q1) - y(s.q3))} fill={C(i)} fillOpacity={0.55} stroke="var(--jp-text)" strokeWidth={1.5} />
            <line x1={cx(i) - bx / 2} x2={cx(i) + bx / 2} y1={y(s.median)} y2={y(s.median)} stroke="var(--jp-text)" strokeWidth={3} />
            {s.outliers.map((o, k) => <circle key={k} cx={cx(i)} cy={y(o)} r={3.5} fill="none" stroke="var(--jp-text)" strokeWidth={1.5} />)}
          </g>))}
          <CatLabels names={names} cx={cx} y={height - 10} />
        </>);
      }} />
  );
}

/* ---------- D013: violin ---------- */
export function ViolinPlot({ title = "Violin plot", id = "D013", names, groups, unit = "ms", height = 280, state }: { title?: string; names: string[]; groups: number[][]; unit?: string } & Common) {
  const nd = groups.length ? ext(groups) : niceDomain(0, 1), ks = groups.map((g) => kde(g, Math.min(...g), Math.max(...g), 48)), st = groups.map(boxStats), peak = Math.max(1e-9, ...ks.flat().map((p) => p.y));
  return (
    <Chart title={title} id={id} height={height} state={state} count={groups.flat().length} legend={legendOf(names)}
      items={names.map((n, i) => `${n}: median ${r1(st[i].median)}${unit}, quartiles ${r1(st[i].q1)} to ${r1(st[i].q3)}, range ${r1(st[i].min)} to ${r1(st[i].max)}, n=${st[i].n}`)}
      summary={`Violin plots: mirrored density shapes with inner quartile box and median for ${names.join(", ")}.`}
      table={{ head: ["Group", "n", "Min", "Q1", "Median", "Q3", "Max"], rows: names.map((n, i) => [n, st[i].n, r1(st[i].min), r1(st[i].q1), r1(st[i].median), r1(st[i].q3), r1(st[i].max)]) }}
      build={(w, pk) => {
        const { bw, cx, y } = catLayout(w, names.length, nd, height), half = Math.min(60, bw * 0.45);
        return (<>
          <YAxis ticks={nd.ticks} y={y} x0={M.l} x1={w - M.r} />
          {ks.map((k, i) => { const ys = k.map((p) => y(p.x)), right = k.map((p) => cx(i) + (p.y / peak) * half), left = k.map((p) => cx(i) - (p.y / peak) * half); const d = `M${right.map((x, j) => `${j ? "L" : ""}${x},${ys[j]}`).join("")}${left.map((x, j) => `L${x},${ys[j]}`).reverse().join("")}Z`; const s = st[i]; return (<g key={i} {...pk.mark(i)}>
            <path d={d} fill={C(i)} fillOpacity={0.55} stroke={C(i)} strokeWidth={1.5} />
            <rect x={cx(i) - 4} width={8} y={y(s.q3)} height={Math.max(1, y(s.q1) - y(s.q3))} fill="var(--jp-text)" /><circle cx={cx(i)} cy={y(s.median)} r={3.5} fill="var(--jp-surface-raised)" />
          </g>); })}
          <CatLabels names={names} cx={cx} y={height - 10} />
        </>);
      }} />
  );
}

/* ---------- D013: strip / beeswarm ---------- */
export function StripChart({ title = "Strip plot", id = "D013", names, groups, swarm = false, unit = "ms", height = 280, state }: { title?: string; names: string[]; groups: number[][]; swarm?: boolean; unit?: string } & Common) {
  const nd = groups.length ? ext(groups) : niceDomain(0, 1), st = groups.map(boxStats), R = 3.2;
  return (
    <Chart title={`${title}${swarm ? " (beeswarm)" : ""}`} id={id} height={height} state={state} count={groups.flat().length} legend={legendOf(names)}
      items={names.map((n, i) => `${n}: ${groups[i].length} points, median ${r1(st[i].median)}${unit}, range ${r1(st[i].min)} to ${r1(st[i].max)}`)}
      summary={`${swarm ? "Beeswarm" : "Strip"} plot of individual observations for ${names.join(", ")}; every point is drawn.`}
      table={{ head: ["Group", "n", "Min", "Median", "Max"], rows: names.map((n, i) => [n, groups[i].length, r1(st[i].min), r1(st[i].median), r1(st[i].max)]) }}
      build={(w, pk) => {
        const { bw, cx, y } = catLayout(w, names.length, nd, height), jit = (i: number, k: number) => ((((k * 9301 + i * 49297) % 233280) / 233280) - 0.5) * Math.min(bw * 0.6, 70);
        return (<>
          <YAxis ticks={nd.ticks} y={y} x0={M.l} x1={w - M.r} />
          {groups.map((g, i) => { const off = swarm ? beeswarm(g.map(y), R) : g.map((_, k) => jit(i, k)); return (<g key={i} {...pk.mark(i)}>
            {g.map((v, k) => <circle key={k} cx={cx(i) + off[k]} cy={y(v)} r={R} fill={C(i)} fillOpacity={0.6} stroke={C(i)} strokeWidth={0.5} />)}
            <line x1={cx(i) - bw * 0.3} x2={cx(i) + bw * 0.3} y1={y(st[i].median)} y2={y(st[i].median)} stroke="var(--jp-text)" strokeWidth={2.5} />
          </g>); })}
          <CatLabels names={names} cx={cx} y={height - 10} />
        </>);
      }} />
  );
}

/* ---------- D018: cumulative distribution ---------- */
export function EcdfChart({ title = "Cumulative distribution", id = "D018", names, groups, unit = "ms", mark = 0.9, height = 260, state }: { title?: string; names: string[]; groups: number[][]; unit?: string; mark?: number } & Common) {
  const nd = groups.length ? ext(groups) : niceDomain(0, 1), es = groups.map(ecdf);
  const at = (i: number) => quantile(sortAsc(groups[i].slice()), mark);
  return (
    <Chart title={title} id={id} height={height} state={state} count={groups.flat().length} legend={legendOf(names)}
      items={names.map((n, i) => `${n}: ${Math.round(mark * 100)}% of values are at or below ${r1(at(i))}${unit}; median ${r1(quantile(sortAsc(groups[i].slice()), 0.5))}${unit}; n=${groups[i].length}`)}
      summary={`Empirical cumulative distribution for ${names.join(", ")}; the curve rises from 0 to 100 percent of observations. A dotted line marks the ${Math.round(mark * 100)}th percentile.`}
      table={{ head: ["Group", "n", "Median", `p${Math.round(mark * 100)}`, "Max"], rows: names.map((n, i) => [n, groups[i].length, r1(quantile(sortAsc(groups[i].slice()), 0.5)), r1(at(i)), r1(Math.max(...groups[i]))]) }}
      build={(w, pk) => {
        const x = (v: number) => M.l + ((v - nd.lo) / (nd.hi - nd.lo)) * (w - M.l - M.r), bot = height - M.b, y = (p: number) => bot - p * (bot - M.t);
        return (<>
          <YAxis ticks={[0, 0.25, 0.5, 0.75, 1]} y={y} x0={M.l} x1={w - M.r} fmtT={(v) => `${Math.round(v * 100)}%`} />
          <line x1={M.l} x2={w - M.r} y1={y(mark)} y2={y(mark)} className="p3-ref" />
          {es.map((e, i) => { const d = e.map((p, k) => `${k ? `L${x(p.x)},${y(e[k - 1].p)}` : `M${x(p.x)},${y(0)}`}L${x(p.x)},${y(p.p)}`).join(""); return (<g key={i} {...pk.mark(i)}><path d={d} stroke={C(i)} strokeWidth={2.5} fill="none" />{pk.on(i) && <><line x1={x(at(i))} x2={x(at(i))} y1={y(mark)} y2={bot} className="p3-ink" /><circle cx={x(at(i))} cy={y(mark)} r={5} fill={C(i)} stroke="var(--jp-text)" /></>}</g>); })}
          <XTicks ticks={nd.ticks} x={x} y={height - 10} />
        </>);
      }} />
  );
}

/* ---------- D018: QQ plot (normal) ---------- */
export function QQPlot({ title = "Normal QQ plot", id = "D018", values, unit = "", height = 300, state }: { title?: string; values: number[]; unit?: string } & Common) {
  const q = qqNormal(values), line = qqLine(values), n = q.length, deciles = (n ? [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9] : []).map((p) => Math.min(n - 1, Math.max(0, Math.round(p * n - 0.5))));
  const nd = n ? niceDomain(q[0].v, q[n - 1].v) : niceDomain(0, 1);
  const dev = n ? Math.max(...q.map((p) => Math.abs(p.v - (line.intercept + line.slope * p.z)))) : 0;
  return (
    <Chart title={title} id={id} height={height} state={state} count={n}
      items={deciles.map((k, d) => `Decile ${d + 1}: theoretical z ${r1(q[k].z)}, sample ${r1(q[k].v)}${unit}, line predicts ${r1(line.intercept + line.slope * q[k].z)}${unit}`)}
      summary={`Normal QQ plot of ${n} values against the quartile reference line (slope ${r1(line.slope)}, intercept ${r1(line.intercept)}). Largest departure from the line is ${r1(dev)}${unit}; points on the line mean the data are close to normal.`}
      table={{ head: ["Rank", "Theoretical z", "Sample value"], rows: q.map((p, i) => [i + 1, Math.round(p.z * 1000) / 1000, r1(p.v)]) }}
      build={(w, pk) => {
        const zmax = n ? Math.ceil(Math.max(Math.abs(q[0].z), Math.abs(q[n - 1].z))) : 3, x = (z: number) => M.l + ((z + zmax) / (2 * zmax)) * (w - M.l - M.r), bot = height - M.b, y = (v: number) => bot - ((v - nd.lo) / (nd.hi - nd.lo)) * (bot - M.t);
        return (<>
          <YAxis ticks={nd.ticks} y={y} x0={M.l} x1={w - M.r} />
          <line x1={x(-zmax)} y1={y(line.intercept - line.slope * zmax)} x2={x(zmax)} y2={y(line.intercept + line.slope * zmax)} className="p3-ref" />
          {q.map((p, i) => <circle key={i} cx={x(p.z)} cy={y(p.v)} r={2.8} fill="var(--adm-c1)" fillOpacity={0.55} />)}
          {deciles.map((k, d) => <circle key={`d${d}`} {...pk.mark(d)} cx={x(q[k].z)} cy={y(q[k].v)} r={6} fill="none" stroke="var(--jp-text)" strokeWidth={1.5} />)}
          {Array.from({ length: 2 * zmax + 1 }, (_, i) => i - zmax).map((z) => <T key={z} x={x(z)} y={height - 14}>{z}</T>)}
          <T x={(M.l + w - M.r) / 2} y={height - 1}>theoretical z (standard deviations)</T>
        </>);
      }} />
  );
}
