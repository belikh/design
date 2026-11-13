import { useMemo } from "react";
import { exclusive, regionAnchors, vennCircles, type SetMap } from "./sets.ts";
import { C, Chart, Note, Readout, Scroll, Svg, fmt, useHits } from "./kit.tsx";
import type { FrameState } from "../charts/frame.tsx";

type Common = { title?: string; state?: FrameState };

/** D045 Venn (2-3 sets): circle area ∝ set size; the number in each region counts items in exactly those sets. */
export function Venn({ sets, title = "Venn: platform usage overlap", state }: Common & { sets: SetMap }) {
  const { sel, text, hit } = useHits(); const ex = useMemo(() => exclusive(sets), [sets]); const names = Object.keys(sets);
  const label = (s: string[]) => (s.length === 1 ? `only ${s[0]}` : s.join(" and "));
  return (
    <Chart title={title} n={ex.length} state={state} height={320} table={{ head: ["Sets", "Items in exactly these sets"], rows: ex.map((e) => [e.sets.join(" + "), e.count]) }}>
      {(w) => {
        const W = Math.min(w, 520), H = 300; const cs = vennCircles(Object.fromEntries(names.map((n) => [n, new Set(sets[n]).size])), W, H); const anchors = regionAnchors(cs, W, H);
        return (
          <>
            <Svg w={W} h={H} label={`${title}. ${names.length} sets, ${ex.reduce((a, e) => a + e.count, 0)} distinct items. ${ex.map((e) => `${label(e.sets)}: ${e.count}`).join("; ")}.`}>
              {cs.map((c, i) => <circle key={c.name} cx={c.x} cy={c.y} r={c.r} fill={C(i)} fillOpacity="0.28" stroke={C(i)} strokeWidth="2" />)}
              {cs.map((c, i) => <text key={c.name} x={c.x + (c.x < W / 2 ? -c.r * 0.5 : c.x > W / 2 ? c.r * 0.5 : 0)} y={c.y + (c.y > H / 2 + 20 ? c.r + 16 : -c.r - 6)} textAnchor="middle" className="p3e-b" style={{ fill: C(i) }}>{c.name} ({fmt(new Set(sets[c.name]).size)})</text>)}
              {ex.map((e) => { const a = anchors.get(e.sets.join("|")); if (!a) return null; return (
                <g key={e.sets.join("|")} {...hit(e.sets.join("|"), `${label(e.sets)}: ${e.count} items`)}>
                  <circle cx={a.x} cy={a.y} r="16" fill="var(--jp-surface-raised)" fillOpacity={sel === e.sets.join("|") ? 1 : 0.8} stroke="var(--jp-border)" /><text x={a.x} y={a.y} dy="0.35em" textAnchor="middle" className="p3e-b">{e.count}</text>
                </g>); })}
            </Svg>
            <Readout>{text}</Readout>
            <Note>Circle areas are proportional to each set's size. Overlap shapes are schematic: the number in a region is exact, its drawn size is not.</Note>
          </>
        );
      }}
    </Chart>
  );
}

/** D045 UpSet: bars over a membership matrix. Each column is one exact combination of sets; left bars show total set sizes. */
export function UpSet({ sets, max = 12, title = "UpSet: feature adoption combinations", state }: Common & { sets: SetMap; max?: number }) {
  const { sel, text, hit } = useHits(); const names = Object.keys(sets).sort((a, b) => new Set(sets[b]).size - new Set(sets[a]).size); const ex = useMemo(() => exclusive(sets), [sets]); const top = ex.slice(0, max); const sizes = names.map((n) => new Set(sets[n]).size);
  return (
    <Chart title={title} n={ex.length} state={state} height={340} table={{ head: ["Combination", "Users in exactly this combination"], rows: ex.map((e) => [e.sets.join(" + "), e.count]) }}>
      {(w) => {
        const rowH = 26, left = 150, barsH = 130, colW = Math.max(26, Math.min(40, (w - left - 20) / top.length)), W = Math.max(w, left + top.length * colW + 20), H = barsH + names.length * rowH + 28;
        const maxC = Math.max(...top.map((e) => e.count)), maxS = Math.max(...sizes);
        return (
          <>
            <Scroll label={title}>
              <Svg w={W} h={H} label={`${title}. ${ex.length} combinations across ${names.length} features; showing the ${top.length} largest. ${top.map((e) => `${e.sets.join(" + ")}: ${e.count}`).join("; ")}.`}>
                {top.map((e, i) => { const x = left + i * colW + colW / 2; const bh = (e.count / maxC) * (barsH - 24); const key = e.sets.join("|"); return (
                  <g key={key} {...hit(key, `${e.sets.join(" + ")}: ${e.count} users in exactly this combination (${e.sets.length} feature${e.sets.length > 1 ? "s" : ""})`)}>
                    <rect x={x - colW * 0.32} y={barsH - bh} width={colW * 0.64} height={bh} fill={sel === key ? "var(--adm-c2)" : "var(--adm-c1)"} rx="2" /><text x={x} y={barsH - bh - 4} textAnchor="middle">{e.count}</text>
                    {names.map((n, r) => <circle key={n} cx={x} cy={barsH + 14 + r * rowH} r="6" fill={e.sets.includes(n) ? "var(--jp-text)" : "var(--jp-border)"} />)}
                    {e.sets.length > 1 && (() => { const rs = e.sets.map((s) => names.indexOf(s)); return <line x1={x} x2={x} y1={barsH + 14 + Math.min(...rs) * rowH} y2={barsH + 14 + Math.max(...rs) * rowH} stroke="var(--jp-text)" strokeWidth="2.5" />; })()}
                  </g>); })}
                {names.map((n, r) => <g key={n}><text x={left - 60} y={barsH + 14 + r * rowH} dy="0.35em" textAnchor="end">{n}</text><rect x={left - 56} y={barsH + 14 + r * rowH - 6} width={(sizes[r] / maxS) * 50} height="12" fill="var(--adm-c3)" rx="2" /><text x={left - 4} y={barsH + 14 + r * rowH - 8} textAnchor="end" className="p3e-mute">{sizes[r]}</text></g>)}
                <text x="0" y="12" className="p3e-mute">users per combination</text>
              </Svg>
            </Scroll>
            <Readout>{text}</Readout>
            <Note>Combinations are exclusive (each user counted once, under every feature they use). Left bars are whole-feature totals, so they add up to more than the user count.</Note>
          </>
        );
      }}
    </Chart>
  );
}
