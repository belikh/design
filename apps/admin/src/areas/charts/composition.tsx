import { useMemo, useState } from "react";
import { C } from "@belikh/jupiter-ui/Charts.tsx";
import { ChartFrame, Readout, type FrameState } from "./frame.tsx";
import { autoState, fmt1 } from "./shared.tsx";
import { cooccurrence, pct, sum, topN } from "./lib.ts";

/* ---------- D023: stacked progress / segmented bar ---------- */
export function SegmentedBar({ segments, total, mode = "stacked", blocks = 20, unit = "", title = "Segmented bar", state }: { segments: { label: string; value: number; color?: string }[]; total?: number; mode?: "stacked" | "blocks"; blocks?: number; unit?: string; title?: string; state?: FrameState }) {
  const used = sum(segments.map((s) => Math.max(0, s.value))), cap = Math.max(total ?? used, used, 1), free = cap - used;
  const over = total !== undefined && used > total;
  const cells = useMemo(() => { if (mode !== "blocks") return []; let acc = 0; const per = cap / blocks; return Array.from({ length: blocks }, (_, b) => { const mid = (b + 0.5) * per; acc = 0; for (let i = 0; i < segments.length; i++) { acc += Math.max(0, segments[i].value); if (mid <= acc) return i; } return -1; }); }, [mode, segments, cap, blocks]);
  return (
    <ChartFrame title={title} svg={false} state={autoState(state, segments.length)} table={{ head: ["Segment", `Value${unit ? ` (${unit})` : ""}`, "Share of capacity"], rows: [...segments.map((s) => [s.label, s.value, pct(s.value / cap, 1)]), ...(free > 0 ? [["Free", Math.round(free * 100) / 100, pct(free / cap, 1)]] : [])] }}>
      {() => (
        <div role="img" aria-label={`${title}: ${segments.map((s) => `${s.label} ${pct(s.value / cap)}`).join(", ")}${free > 0 ? `, free ${pct(free / cap)}` : ""}${over ? ", over capacity" : ""}`}>
          {mode === "stacked" ? <div className="pc-stackbar">{segments.map((s, i) => <span key={s.label} title={`${s.label}: ${s.value}${unit}`} style={{ width: `${(Math.max(0, s.value) / cap) * 100}%`, background: s.color ?? C(i) }} />)}</div>
            : <div className="pc-seg">{cells.map((c, b) => <i key={b} className={c >= 0 ? "is-on" : ""} style={c >= 0 ? { background: segments[c].color ?? C(c) } : undefined} />)}</div>}
          <ul className="adm-legend" style={{ marginTop: 8 }}>{segments.map((s, i) => <li key={s.label}><i style={{ background: s.color ?? C(i), width: 10, height: 10, borderRadius: 2, display: "inline-block", marginInlineEnd: 6 }} />{s.label} <b className="adm-num">{fmt1(s.value)}{unit}</b> <span className="jp-muted">{pct(s.value / cap, 1)}</span></li>)}{free > 0 && <li><span className="jp-muted">Free {fmt1(free)}{unit} ({pct(free / cap, 1)})</span></li>}</ul>
          {over && <p className="pc-note" role="alert" style={{ color: "var(--jp-warn)" }}>▲ Over capacity by {fmt1(used - (total ?? used))}{unit}.</p>}
        </div>
      )}
    </ChartFrame>
  );
}

/* ---------- D029: top-N with "Other" ---------- */
export function TopN({ items, defaultN = 5, unit = "", title = "Top N with Other", state }: { items: { label: string; value: number }[]; defaultN?: number; unit?: string; title?: string; state?: FrameState }) {
  const [n, setN] = useState(Math.min(defaultN, Math.max(1, items.length))); const [open, setOpen] = useState(false);
  const rows = useMemo(() => topN(items, n), [items, n]); const total = sum(items.map((i) => i.value)) || 1, mx = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ChartFrame title={title} svg={false} state={autoState(state, items.length)} table={{ head: ["Label", `Value${unit ? ` (${unit})` : ""}`, "Share"], rows: rows.map((r) => [r.label, r.value, pct(r.value / total, 1)]) }}>
      {() => (
        <>
          <label className="adm-row" style={{ marginBottom: 8 }}><span className="jp-muted">Show top</span><input type="range" min={1} max={Math.max(1, items.length)} value={n} onChange={(e) => { setN(Number(e.target.value)); setOpen(false); }} aria-label="Number of items to show" style={{ accentColor: "var(--jp-accent)" }} /><b className="adm-num">{n}</b></label>
          <div className="pc-bars">
            {rows.map((r) => (
              <div key={r.label}>
                <div className="pc-bars__row"><button className={r.other ? "is-link" : ""} onClick={() => r.other && setOpen(!open)} aria-expanded={r.other ? open : undefined} aria-label={r.other ? `Other, ${r.members?.length} items, ${open ? "collapse" : "expand"}` : r.label}>{r.other ? `${open ? "▾" : "▸"} Other (${r.members?.length})` : r.label}</button><div><div className={`pc-bars__bar ${r.other ? "is-other" : ""}`} style={{ width: `${(r.value / mx) * 100}%` }} /></div><span className="adm-num">{fmt1(r.value)} <span className="jp-muted">{pct(r.value / total)}</span></span></div>
                {r.other && open && <div className="pc-bars" style={{ margin: "6px 0 6px 18px" }}>{r.members!.map((mb) => <div key={mb.label} className="pc-bars__row"><span className="jp-muted">{mb.label}</span><div><div className="pc-bars__bar" style={{ width: `${(mb.value / mx) * 100}%`, background: "var(--adm-c7)" }} /></div><span className="adm-num jp-muted">{fmt1(mb.value)}</span></div>)}</div>}
              </div>
            ))}
          </div>
        </>
      )}
    </ChartFrame>
  );
}

/* ---------- D029: co-occurrence matrix ---------- */
export function CooccurrenceMatrix({ labels, sets, title = "Co-occurrence matrix", state }: { labels: string[]; sets: string[][]; title?: string; state?: FrameState }) {
  const [norm, setNorm] = useState(false); const [cell, setCell] = useState<[number, number] | null>(null);
  const m = useMemo(() => cooccurrence(sets, labels), [sets, labels]);
  const val = (i: number, j: number) => (norm && i !== j ? (m[i][i] + m[j][j] - m[i][j] === 0 ? 0 : m[i][j] / (m[i][i] + m[j][j] - m[i][j])) : m[i][j]);
  const mx = Math.max(1, ...labels.flatMap((_, i) => labels.map((_, j) => (i === j ? 0 : val(i, j)))));
  return (
    <ChartFrame title={title} state={autoState(state, labels.length && sets.length ? 1 : 0)} height={320} table={{ head: ["", ...labels], rows: labels.map((l, i) => [l, ...labels.map((_, j) => Math.round(val(i, j) * 100) / 100)]) }}>
      {(w) => {
        const lw = 80, size = Math.max(24, Math.min(56, Math.floor((w - lw - 10) / labels.length))), H = lw + size * labels.length + 10;
        return (
          <>
            <label className="adm-check" style={{ marginBottom: 6 }}><input type="checkbox" checked={norm} onChange={(e) => setNorm(e.target.checked)} /><span>Normalise (Jaccard similarity, 0 to 1)</span></label>
            <svg viewBox={`0 0 ${w} ${H}`} style={{ width: "100%", height: H }} role="img" aria-label={`${title}: ${labels.length} by ${labels.length}`} onMouseLeave={() => setCell(null)}>
              {labels.map((l, j) => <text key={l} transform={`translate(${lw + j * size + size / 2}, ${lw - 6}) rotate(-45)`} className="adm-axis" fontWeight={cell?.[1] === j ? 700 : 400}>{l}</text>)}
              {labels.map((l, i) => <g key={l}><text x={lw - 6} y={lw + i * size + size / 2 + 4} textAnchor="end" className="adm-axis" fontWeight={cell?.[0] === i ? 700 : 400}>{l}</text>
                {labels.map((_, j) => { const t = i === j ? 0 : val(i, j) / mx; return (<g key={j} onMouseEnter={() => setCell([i, j])}><rect x={lw + j * size} y={lw + i * size} width={size - 1} height={size - 1} rx="2" fill={i === j ? "var(--jp-surface)" : "var(--jp-accent)"} fillOpacity={i === j ? 1 : 0.06 + 0.94 * t} stroke={cell && (cell[0] === i || cell[1] === j) ? "var(--jp-text-muted)" : "none"} />
                  {size >= 30 && <text x={lw + j * size + size / 2} y={lw + i * size + size / 2 + 4} textAnchor="middle" fontSize="13" fill={i === j ? "var(--jp-text-muted)" : t > 0.55 ? "var(--jp-on-accent)" : "var(--jp-text)"}>{i === j ? `${m[i][i]}` : norm ? val(i, j).toFixed(2) : val(i, j)}</text>}</g>); })}</g>)}
            </svg>
            <Readout>{cell ? (cell[0] === cell[1] ? `${labels[cell[0]]} appears ${m[cell[0]][cell[0]]} times` : `${labels[cell[0]]} + ${labels[cell[1]]}: together in ${m[cell[0]][cell[1]]} sets${norm ? ` (similarity ${val(cell[0], cell[1]).toFixed(2)})` : ""}`) : "Diagonal = how often each appears."}</Readout>
          </>
        );
      }}
    </ChartFrame>
  );
}
