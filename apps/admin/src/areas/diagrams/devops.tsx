import { useMemo } from "react";
import { assignLanes, calendar, doraFrequency, doraLeadTime, histogram, quantile, weeklyCounts, type Commit, type Deploy } from "./git.ts";
import { C, Chart, Legend, Note, Readout, Scroll, Svg, fmt, heat, sum, useGridCursor, useHits } from "./kit.tsx";
import type { FrameState } from "../charts/frame.tsx";

type Common = { title?: string; state?: FrameState };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** D054 Commit calendar: one square per day, columns are weeks (Sunday first). Arrow keys move through days. */
export function CommitCalendar({ counts, end, weeks = 26, title = "Commit calendar", state }: Common & { counts: Record<string, number>; end: Date; weeks?: number }) {
  const cal = useMemo(() => calendar(counts, end, weeks), [counts, end, weeks]); const total = sum(cal.cells.map((c) => c.count)); const busiest = cal.cells.reduce((a, c) => (c.count > a.count ? c : a), cal.cells[0]);
  const cur = useGridCursor(7, weeks, (r, c) => { const x = cal.cells[c * 7 + r]; return `${DOW[x.dow]} ${x.date}: ${x.count} commits`; });
  return (
    <Chart title={title} n={Object.keys(counts).length} state={state} height={170} table={{ head: ["Date", "Commits"], rows: cal.cells.filter((c) => c.count).map((c) => [c.date, c.count]) }}>
      {(w) => {
        const cell = Math.max(10, Math.min(18, Math.floor((w - 44) / weeks) - 3)), step = cell + 3, W = 36 + weeks * step, H = 24 + 7 * step;
        return (
          <>
            <Scroll label={title}>
              <div className="p3e-focus-grid" {...cur.props} aria-label={`${title}: ${total} commits in ${weeks} weeks, busiest day ${busiest.date} with ${busiest.count}. Arrow keys move between days.`}>
                <Svg w={W} h={H} label={`${title}, ${weeks} weeks`}>
                  {Array.from({ length: weeks }, (_, wk) => { const d = cal.cells[wk * 7]; const m = +d.date.slice(5, 7) - 1; const prev = wk ? +cal.cells[(wk - 1) * 7].date.slice(5, 7) - 1 : -1; return m !== prev ? <text key={wk} x={36 + wk * step} y="10" className="p3e-mute">{MON[m]}</text> : null; })}
                  {[1, 3, 5].map((d) => <text key={d} x="0" y={24 + d * step + cell - 2} className="p3e-mute">{DOW[d]}</text>)}
                  {cal.cells.map((c) => <rect key={c.date} x={36 + c.week * step} y={20 + c.dow * step} width={cell} height={cell} rx="2" fill={c.level === 0 ? "var(--jp-surface)" : heat(c.level / 4)} stroke={cur.on && cur.pos[0] === c.dow && cur.pos[1] === c.week ? "var(--jp-text)" : "var(--jp-border)"} strokeWidth={cur.on && cur.pos[0] === c.dow && cur.pos[1] === c.week ? 3 : 1} onMouseEnter={() => cur.setPos([c.dow, c.week])}><title>{`${c.date}: ${c.count} commits`}</title></rect>)}
                </Svg>
              </div>
            </Scroll>
            <Readout>{cur.text}</Readout>
            <div className="adm-row" style={{ gap: 6 }}><span className="pc-note">Less</span>{[0, 1, 2, 3, 4].map((l) => <svg key={l} width="14" height="14" aria-hidden="true"><rect width="14" height="14" rx="2" fill={l === 0 ? "var(--jp-surface)" : heat(l / 4)} stroke="var(--jp-border)" /></svg>)}<span className="pc-note">More. Levels are quartiles of the days that had commits.</span></div>
          </>
        );
      }}
    </Chart>
  );
}

/** D054 Branch graph: oldest commit at the bottom, one lane per live branch, merge commits join lanes. */
export function BranchGraph({ commits, title = "Branch graph", state }: Common & { commits: Commit[] }) {
  const { text, hit } = useHits(); const lay = useMemo(() => assignLanes(commits), [commits]); const by = new Map(lay.nodes.map((n) => [n.id, n])); const branches = [...lay.laneOf.keys()];
  return (
    <Chart title={title} n={commits.length} state={state} height={commits.length * 28 + 20} table={{ head: ["Commit", "Branch", "Parents", "Message", "Author", "Tag"], rows: [...commits].reverse().map((c) => [c.id, c.branch, c.parents.join(" "), c.msg, c.author, c.tag ?? ""]) }}>
      {(w) => {
        const rowH = 28, laneW = 22, H = commits.length * rowH + 16, N = commits.length; const X = (l: number) => 16 + l * laneW, Y = (row: number) => 14 + (N - 1 - row) * rowH, tx = X(lay.lanes) + 12;
        return (
          <>
            <Scroll label={title}>
              <Svg w={Math.max(w, tx + 260)} h={H} label={`${title}. ${N} commits on ${branches.length} branches: ${branches.join(", ")}. Newest at the top.`}>
                {commits.flatMap((c) => c.parents.map((p, pi) => { const a = by.get(c.id)!, b = by.get(p)!; const x0 = X(b.lane), y0 = Y(b.row), x1 = X(a.lane), y1 = Y(a.row); const m = (y0 + y1) / 2; return <path key={`${c.id}-${p}`} className="p3e-edge" stroke={C(pi ? b.lane : a.lane)} strokeWidth="2.5" strokeDasharray={pi ? "4 3" : undefined} d={x0 === x1 ? `M${x0},${y0}V${y1}` : `M${x0},${y0}C${x0},${m} ${x1},${m} ${x1},${y1}`} />; }))}
                {commits.map((c) => { const n = by.get(c.id)!; return (
                  <g key={c.id} {...hit(c.id, `${c.id} on ${c.branch}${c.parents.length > 1 ? " (merge)" : ""}: ${c.msg}, by ${c.author}${c.tag ? `, tagged ${c.tag}` : ""}`)}>
                    <circle cx={X(n.lane)} cy={Y(n.row)} r={c.parents.length > 1 ? 7 : 5.5} fill={c.parents.length > 1 ? "var(--jp-surface-raised)" : C(n.lane)} stroke={C(n.lane)} strokeWidth="3" />
                    <text x={tx} y={Y(n.row)} dy="0.35em"><tspan className="p3e-mute">{c.id}</tspan>{"  "}{c.msg}<tspan className="p3e-mute" dx="8">{c.branch}</tspan>{c.tag ? <tspan className="p3e-b" dx="8">[{c.tag}]</tspan> : null}</text>
                  </g>); })}
              </Svg>
            </Scroll>
            <Readout>{text}</Readout>
            <Legend items={branches.map((b) => ({ label: b, color: C(lay.laneOf.get(b)!) }))} />
            <Note>Hollow dots are merge commits; the dashed line leaves the branch being merged. A lane is reused once its branch is merged.</Note>
          </>
        );
      }}
    </Chart>
  );
}

const BAND_CLASS: Record<string, string> = { Elite: "is-ok", High: "is-ok", Medium: "is-warn", Low: "is-danger" };
/** D054 Deploy frequency: successful and failed deploys per week with the DORA band for the average. */
export function DeployFrequency({ deploys, start, weeks, title = "Deploy frequency per week", state }: Common & { deploys: Deploy[]; start: number; weeks: number }) {
  const { text, hit } = useHits<number>(); const ok = useMemo(() => weeklyCounts(deploys.filter((d) => d.ok), start, weeks), [deploys, start, weeks]); const bad = useMemo(() => weeklyCounts(deploys.filter((d) => !d.ok), start, weeks), [deploys, start, weeks]);
  const perDay = deploys.length / (weeks * 7), band = doraFrequency(perDay), fail = deploys.length ? deploys.filter((d) => !d.ok).length / deploys.length : 0;
  return (
    <>
      <div className="p3e-stats"><div><b>{perDay.toFixed(2)}</b><span>deploys per day</span></div><div><b>{fmt(deploys.length)}</b><span>deploys in {weeks} weeks</span></div><div><b>{(fail * 100).toFixed(1)}%</b><span>failed deploys</span></div><div><b><span className={`p3e-badge ${BAND_CLASS[band]}`}>{band}</span></b><span>DORA frequency band</span></div></div>
      <Chart title={title} n={deploys.length} state={state} height={240} table={{ head: ["Week starting", "Successful", "Failed"], rows: ok.map((v, i) => [new Date(start + i * 7 * 86400000).toISOString().slice(0, 10), v, bad[i]]) }}>
        {(w) => {
          const H = 240, L = 34, B = 26, T = 10, max = Math.max(1, ...ok.map((v, i) => v + bad[i])), bw = (w - L - 8) / weeks, Y = (v: number) => T + (1 - v / max) * (H - T - B);
          return (
            <>
              <Svg w={w} h={H} label={`${title}. ${deploys.length} deploys over ${weeks} weeks, ${perDay.toFixed(2)} per day on average, DORA band ${band}.`}>
                {[0, 0.5, 1].map((f) => <g key={f}><line x1={L} x2={w} y1={Y(f * max)} y2={Y(f * max)} stroke="var(--jp-border)" /><text x={L - 6} y={Y(f * max)} dy="0.35em" textAnchor="end" className="p3e-mute">{Math.round(f * max)}</text></g>)}
                {ok.map((v, i) => (
                  <g key={i} {...hit(i, `Week of ${new Date(start + i * 7 * 86400000).toISOString().slice(0, 10)}: ${v} successful, ${bad[i]} failed`)}>
                    <rect x={L + i * bw + 2} y={Y(v)} width={Math.max(2, bw - 4)} height={Math.max(0, Y(0) - Y(v))} fill="var(--adm-c1)" rx="2" />
                    {bad[i] > 0 && <rect x={L + i * bw + 2} y={Y(v + bad[i])} width={Math.max(2, bw - 4)} height={Y(v) - Y(v + bad[i])} fill="url(#p3e-hatch2)" stroke="var(--jp-danger)" />}
                    <text x={L + i * bw + bw / 2} y={H - 8} textAnchor="middle" className="p3e-mute">{i + 1}</text>
                  </g>))}
                <defs><pattern id="p3e-hatch2" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="6" fill="var(--jp-danger)" fillOpacity="0.55" /></pattern></defs>
              </Svg>
              <Readout>{text}</Readout>
            </>
          );
        }}
      </Chart>
      <Legend items={[{ label: "Successful", color: "var(--adm-c1)" }, { label: "Failed (hatched)", cls: "p3e-hatched" }]} />
      <Note>Bands follow the DORA rule of thumb on average deploys per day: Elite at least daily, High at least weekly, Medium at least monthly. Week numbers count from the start of the window.</Note>
    </>
  );
}

/** D054 Lead time for changes: distribution of commit-to-production hours with median and p90. */
export function LeadTime({ hours, title = "Lead time: commit to production", state }: Common & { hours: number[] }) {
  const { text, hit } = useHits<number>(); const edges = [4, 12, 24, 48, 72, 168]; const labels = ["< 4 h", "4-12 h", "12-24 h", "1-2 d", "2-3 d", "3-7 d", "> 7 d"]; const h = histogram(hours, edges);
  const med = quantile(hours, 0.5), p90 = quantile(hours, 0.9), band = hours.length ? doraLeadTime(med) : "Low";
  return (
    <>
      <div className="p3e-stats"><div><b>{hours.length ? `${fmt(med)} h` : "n/a"}</b><span>median</span></div><div><b>{hours.length ? `${fmt(p90)} h` : "n/a"}</b><span>90th percentile</span></div><div><b>{hours.length}</b><span>changes</span></div><div><b><span className={`p3e-badge ${BAND_CLASS[band]}`}>{band}</span></b><span>DORA lead-time band (median)</span></div></div>
      <Chart title={title} n={hours.length} state={state} height={240} table={{ head: ["Lead time", "Changes", "Share"], rows: labels.map((l, i) => [l, h[i], `${((h[i] / hours.length) * 100).toFixed(1)}%`]) }}>
        {(w) => {
          const H = 240, L = 34, B = 30, T = 16, max = Math.max(1, ...h), bw = (w - L - 8) / labels.length, Y = (v: number) => T + (1 - v / max) * (H - T - B); const bucketOf = (v: number) => edges.findIndex((e) => v < e) < 0 ? edges.length : edges.findIndex((e) => v < e);
          const mark = (v: number, name: string) => { const b = bucketOf(v); const lo = b ? edges[b - 1] : 0, hi = b < edges.length ? edges[b] : lo * 2; const x = L + b * bw + ((v - lo) / (hi - lo || 1)) * bw; return <g><line x1={x} x2={x} y1={T - 4} y2={H - B} stroke="var(--jp-text)" strokeDasharray="4 3" /><text x={x + 4} y={T + 4} className="p3e-b">{name}</text></g>; };
          return (
            <>
              <Svg w={w} h={H} label={`${title}. Median ${fmt(med)} hours, 90th percentile ${fmt(p90)} hours across ${hours.length} changes.`}>
                {h.map((v, i) => <g key={i} {...hit(i, `${labels[i]}: ${v} changes (${((v / hours.length) * 100).toFixed(1)}%)`)}><rect x={L + i * bw + 3} y={Y(v)} width={bw - 6} height={Y(0) - Y(v)} fill="var(--adm-c3)" rx="2" /><text x={L + i * bw + bw / 2} y={Y(v) - 4} textAnchor="middle">{v}</text><text x={L + i * bw + bw / 2} y={H - 10} textAnchor="middle" className="p3e-mute">{labels[i]}</text></g>)}
                {mark(med, "median")}{mark(p90, "p90")}
              </Svg>
              <Readout>{text}</Readout>
            </>
          );
        }}
      </Chart>
      <Note>Buckets are not equal widths, so compare bar heights as counts, not as a smooth distribution. Marker positions interpolate inside their bucket.</Note>
    </>
  );
}
