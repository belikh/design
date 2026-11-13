import { useMemo, useState } from "react";
import { binEvents, occupancy } from "./net.ts";
import { Chart, HeatScale, HeatTable, Legend, Note, Readout, Svg, hhmm, pct, sum, useHits } from "./kit.tsx";
import { ChartFrame, type FrameState } from "../charts/frame.tsx";
import { autoState } from "../charts/shared.tsx";
import type { Sample } from "./net.ts";

type Common = { title?: string; state?: FrameState };

/** D058 Occupancy heat: rooms by hour of day. Colour = mean headcount as a share of capacity, so a 6-person room and a 60-person floor compare fairly. */
export function OccupancyHeat({ samples, capacity, rooms, title = "Occupancy by room and hour", state }: Common & { samples: Sample[]; capacity: Record<string, number>; rooms: string[] }) {
  const m = useMemo(() => occupancy(samples, capacity, rooms), [samples, capacity, rooms]); const [text, setText] = useState("");
  const hours = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0")); const peak = (r: number) => { let b = 0; m[r].forEach((v, h) => { if ((v ?? -1) > (m[r][b] ?? -1)) b = h; }); return b; };
  return (
    <ChartFrame title={title} state={autoState(state, samples.length)} svg={false} table={{ head: ["Room", "Capacity", "Peak hour", "Peak occupancy", ...hours.map((h) => `${h}:00`)], rows: rooms.map((r, i) => [r, capacity[r], `${hours[peak(i)]}:00`, pct(m[i][peak(i)] ?? 0), ...m[i].map((v) => (v === null ? "" : pct(v)))]) }}>
      {() => (
        <>
          <HeatTable caption={`${title}: ${rooms.length} rooms by 24 hours`} corner="Room" rowHeads={rooms} colHeads={hours} vertical onRead={setText} extraCols={["Cap.", "Peak"]} rowExtra={(r) => [capacity[rooms[r]], `${hours[peak(r)]}:00`]}
            cell={(r, h) => { const v = m[r][h]; return { t: v === null ? null : Math.min(1, v), text: v !== null && v >= 0.5 ? String(Math.round(v * 100)) : "", label: v === null ? `${rooms[r]} at ${hours[h]}:00: no data` : `${rooms[r]} at ${hours[h]}:00: ${pct(v)} of capacity (about ${Math.round(v * capacity[rooms[r]])} of ${capacity[rooms[r]]} people)` }; }} />
          <Readout>{text}</Readout>
          <div className="dg-controls"><HeatScale lo="empty" hi="at capacity" /><span className="pc-note">Numbers show percent where a room is at least half full. Hours are local time, averaged over five weekdays.</span></div>
        </>
      )}
    </ChartFrame>
  );
}

/** D058 Motion event raster: one row per sensor, one tick per trigger across 24 hours; the strip on the right is the hourly count. */
export function MotionRaster({ events, title = "Motion events by sensor", state }: Common & { events: Record<string, number[]> }) {
  const { text, hit } = useHits(); const names = Object.keys(events);
  const stats = names.map((n) => { const b = binEvents(events[n], 24, 1440); const peak = b.indexOf(Math.max(...b)); return { n, total: events[n].length, peak, bins: b }; });
  return (
    <Chart title={title} n={sum(names.map((n) => events[n].length))} state={state} height={names.length * 34 + 60} table={{ head: ["Sensor", "Events", "Busiest hour", "Events in busiest hour"], rows: stats.map((s) => [s.n, s.total, `${hhmm(s.peak * 60)}`, s.bins[s.peak]]) }}>
      {(w) => {
        const L = 100, R = 8, rowH = 34, H = names.length * rowH + 30, X = (min: number) => L + (min / 1440) * (w - L - R); const maxBin = Math.max(1, ...stats.flatMap((s) => s.bins));
        return (
          <>
            <Svg w={w} h={H} label={`${title}. ${names.length} sensors, ${sum(stats.map((s) => s.total))} events over 24 hours. ${stats.map((s) => `${s.n}: ${s.total} events, busiest around ${hhmm(s.peak * 60)}`).join("; ")}.`}>
              {[0, 6, 12, 18, 24].map((h) => <g key={h}><line x1={X(h * 60)} x2={X(h * 60)} y1="14" y2={H - 4} stroke="var(--jp-border)" /><text x={X(h * 60)} y="10" textAnchor="middle" className="dg-mute">{String(h).padStart(2, "0")}:00</text></g>)}
              {stats.map((s, r) => { const y = 20 + r * rowH; return (
                <g key={s.n} {...hit(s.n, `${s.n}: ${s.total} events; busiest hour ${hhmm(s.peak * 60)} with ${s.bins[s.peak]}`)}>
                  <rect x="0" y={y} width={w} height={rowH - 4} rx="3" fill="transparent" stroke="none" />
                  <text x="0" y={y + (rowH - 4) / 2} dy="0.35em">{s.n}</text>
                  {s.bins.map((b, h) => b ? <rect key={`b${h}`} x={X(h * 60)} y={y + rowH - 9} width={(w - L - R) / 24 - 1} height="3" fill="var(--adm-c3)" opacity={0.3 + 0.7 * (b / maxBin)} /> : null)}
                  {events[s.n].map((t, i) => <line key={i} x1={X(t)} x2={X(t)} y1={y + 2} y2={y + rowH - 12} stroke="var(--adm-c1)" strokeWidth="1.5" />)}
                </g>); })}
            </Svg>
            <Readout>{text}</Readout>
            <Legend items={[{ label: "one tick = one trigger", color: "var(--adm-c1)" }, { label: "bottom strip = hourly count (darker = busier)", color: "var(--adm-c3)" }]} />
            <Note>A sensor that fires overnight while its neighbours are quiet (the server room here, around 03:00) stands out as a row with ticks outside the office-hours block.</Note>
          </>
        );
      }}
    </Chart>
  );
}
