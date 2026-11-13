import { useMemo, useState } from "react";
import { Segmented } from "@belikh/jupiter-ui/inputs.tsx";
import { cohorts, funnel, type User } from "./cohort.ts";
import { Chart, HeatScale, HeatTable, Note, Readout, Svg, fmt, heat, onHeat, pct, useHits } from "./kit.tsx";
import { ChartFrame, type FrameState } from "../charts/frame.tsx";
import { autoState } from "../charts/shared.tsx";

type Common = { title?: string; state?: FrameState };

/** D050 Cohort retention table: rows are signup weeks, columns are weeks since signup. Colour = share of the cohort still active; dashed cells are in the future. */
export function CohortTable({ users, periods, title = "Cohort retention by signup week", state }: Common & { users: User[]; periods: number }) {
  const { rows, avg } = useMemo(() => cohorts(users, periods), [users, periods]); const [text, setText] = useState("");
  const wk = (c: number) => `W${c + 1}`;
  return (
    <ChartFrame title={title} state={autoState(state, users.length)} svg={false}
      table={{ head: ["Signup week", "Users", ...Array.from({ length: periods }, (_, k) => `+${k}w`)], rows: [...rows.map((r) => [wk(r.cohort), r.size, ...r.pct.map((p) => (p === null ? "" : pct(p)))]), ["Average", rows.reduce((a, r) => a + r.size, 0), ...avg.map((p) => (p === null ? "" : pct(p)))]] }}>
      {() => (
        <>
          <HeatTable caption={`${title}: ${rows.length} cohorts`} corner="Cohort" rowHeads={[...rows.map((r) => wk(r.cohort)), "Average"]} colHeads={Array.from({ length: periods }, (_, k) => `+${k}w`)} extraCols={["Users"]} onRead={setText}
            rowExtra={(r) => [r === rows.length ? fmt(rows.reduce((a, x) => a + x.size, 0)) : fmt(rows[r].size)]}
            cell={(r, k) => { const v = r === rows.length ? avg[k] : rows[r].pct[k]; const n = r === rows.length ? null : rows[r].counts[k]; return { t: v === null ? null : v, text: v === null ? "" : pct(v), label: v === null ? `${r === rows.length ? "Average" : wk(r)} +${k} weeks: not yet observed` : `${r === rows.length ? "Weighted average" : `Cohort ${wk(r)}`}, ${k} weeks after signup: ${pct(v, 1)} still active${n === null ? "" : ` (${n} of ${rows[r].size} users)`}` }; }} />
          <Readout>{text}</Readout>
          <div className="dg-controls"><HeatScale lo="0%" hi="100%" /><span className="pc-note">Average row is weighted by cohort size and only uses cohorts old enough to have reached that week. Dashed cells have not happened yet.</span></div>
        </>
      )}
    </ChartFrame>
  );
}

/** D050 Funnel: bar width ∝ users at each step; the figure between steps is conversion from the previous step, the label inside is conversion from the top. */
export function Funnel({ data, title = "Funnel: visit to purchase", state }: Common & { data: Record<string, { name: string; count: number }[]> }) {
  const segs = Object.keys(data); const [seg, setSeg] = useState(segs[0]); const steps = useMemo(() => funnel(data[seg] ?? []), [data, seg]); const { text, hit } = useHits<number>();
  const worst = steps.slice(1).reduce((a, s, i) => (s.fromPrev < (steps[a + 1]?.fromPrev ?? 2) ? i : a), 0) + 1;
  return (
    <>
      <div className="dg-controls"><Segmented label="Segment" value={seg} onChange={setSeg} options={segs.map((s) => ({ value: s, label: s }))} /></div>
      <Chart title={`${title} (${seg})`} n={steps.length} state={state} height={300}
        table={{ head: ["Step", "Users", "From previous step", "From top", "Lost at this step"], rows: steps.map((s) => [s.name, s.count, pct(s.fromPrev, 1), pct(s.fromTop, 1), s.lost]) }}>
        {(w) => {
          const rowH = 46, gap = 18, H = steps.length * (rowH + gap), L = 130, maxW = w - L - 90;
          return (
            <>
              <Svg w={w} h={H} label={`${title}, ${seg}. ${steps.map((s) => `${s.name}: ${fmt(s.count)} (${pct(s.fromTop, 1)} of top)`).join("; ")}.`}>
                {steps.map((s, i) => { const y = i * (rowH + gap), bw = Math.max(2, (s.count / (steps[0].count || 1)) * maxW), x = L + (maxW - bw) / 2; const next = steps[i + 1]; const nw = next ? Math.max(2, (next.count / (steps[0].count || 1)) * maxW) : 0; return (
                  <g key={s.name}>
                    {next && <path d={`M${x},${y + rowH}L${x + bw},${y + rowH}L${L + (maxW + nw) / 2},${y + rowH + gap}L${L + (maxW - nw) / 2},${y + rowH + gap}Z`} fill="var(--adm-c1)" fillOpacity="0.2" />}
                    <g {...hit(i, `${s.name}: ${fmt(s.count)} users, ${pct(s.fromTop, 1)} of the top${i ? `, ${pct(s.fromPrev, 1)} of the previous step, ${fmt(s.lost)} lost here` : ""}`)}>
                      <rect x={x} y={y} width={bw} height={rowH} rx="4" fill={heat(0.35 + 0.65 * s.fromTop)} stroke={i === worst ? "var(--jp-warn)" : "none"} strokeWidth="3" />
                      <text x={x + bw / 2} y={y + rowH / 2} dy="0.35em" textAnchor="middle" className="dg-b" style={{ fill: onHeat(0.35 + 0.65 * s.fromTop) }}>{bw > 70 ? fmt(s.count) : ""}</text>
                    </g>
                    <text x={L - 8} y={y + rowH / 2} dy="0.35em" textAnchor="end" className="dg-sm">{s.name}</text>
                    <text x={L + maxW + 10} y={y + rowH / 2} dy="0.35em" className="dg-mute">{pct(s.fromTop, 1)}</text>
                    {i > 0 && <text x={w / 2 + 6 + (L - 100) / 2} y={y - gap / 2 + 4} className="dg-mute" textAnchor="start">{`▼ ${pct(s.fromPrev, 1)} continue, ${fmt(s.lost)} lost`}</text>}
                  </g>); })}
              </Svg>
              <Readout>{text}</Readout>
            </>
          );
        }}
      </Chart>
      <Note>{`Biggest drop-off: ${steps[worst]?.name ?? "n/a"} (outlined). Percentages at right are of everyone who started; "continue" is relative to the step above.`}</Note>
    </>
  );
}
