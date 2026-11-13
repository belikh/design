import { C } from "@belikh/jupiter-ui/Charts.tsx";
import { evm, histogram8, packMarkers, qam16, spectrogram, toDb, waterfallLines, waveformEnvelope, clock, type IQ, type Marker } from "./signal.ts";
import { Fig, M, XLabels, YAxis, f1, lin, pathOf, table, ticks } from "./shared.tsx";

/** One sequential ramp (surface to accent) used by every heat-style chart here. t in 0..1. */
export const ramp = (t: number) => `color-mix(in oklab, var(--adm-c1) ${Math.round(Math.max(0, Math.min(1, t)) * 100)}%, var(--jp-surface))`;
const BINS = 32;
export const spectra = (signal: number[], win = 64, hop = 32) => spectrogram(signal, win, hop, BINS).map((r) => r.map((v) => toDb(v)));

/** D065: spectrogram (time across, frequency up, level as a single-hue ramp with a scale bar). `sampleRate` in Hz gives the axis units. */
export function Spectrogram({ signal, sampleRate = 1024, title = "Channel spectrogram" }: { signal: number[]; sampleRate?: number; title?: string }) {
  const rows = signal.length >= 64 ? spectra(signal) : [], hop = 32, db = rows.flat(), lo = -60, hi = Math.max(...db, lo + 1), fbin = sampleRate / 64;
  const peak = (i: number) => rows[i].indexOf(Math.max(...rows[i]));
  return (
    <Fig title={title} empty={!rows.length} count={rows.length} height={280}
      summary={`${title}: ${rows.length} time frames by ${BINS} frequency bins up to ${f1(BINS * fbin)} Hz; strongest ${f1(hi)} dB. Lighter is weaker, darker is stronger.`}
      table={table(["Frame", "Time (s)", "Peak bin", "Peak freq (Hz)", "Peak level (dB)"], rows.map((r, i) => [i, +((i * hop) / sampleRate).toFixed(3), peak(i), Math.round(peak(i) * fbin), +Math.max(...r).toFixed(1)]))}
      describe={(i) => `Frame ${i} at ${((i * hop) / sampleRate).toFixed(2)} s: peak ${Math.round(peak(i) * fbin)} Hz at ${f1(Math.max(...rows[i]))} dB`}
      render={({ w, h, active, setActive, uid }) => {
        const pw = w - M.l - M.r - 28, ph = h - M.t - M.b, cw = pw / rows.length, ch = ph / BINS;
        return <>{rows.map((r, i) => <g key={i} onPointerEnter={() => setActive(i)}>{r.map((v, k) => <rect key={k} x={M.l + i * cw} y={M.t + ph - (k + 1) * ch} width={cw + 0.5} height={ch + 0.5} fill={ramp((v - lo) / (hi - lo))} />)}</g>)}
          <YAxis t={[0, 0.25, 0.5, 0.75, 1].map((f) => f * BINS * fbin)} y={(v) => M.t + ph - (v / (BINS * fbin)) * ph} w={w - 28} fmt={(v) => `${Math.round(v)}`} grid={false} />
          <XLabels labels={rows.map((_, i) => `${((i * hop) / sampleRate).toFixed(1)}s`)} x={(i) => M.l + (i + 0.5) * cw} h={h} every={Math.ceil(rows.length / 6)} />
          <defs><linearGradient id={`${uid}-ramp`} x1="0" x2="0" y1="1" y2="0"><stop offset="0" stopColor="var(--jp-surface)" /><stop offset="1" stopColor="var(--adm-c1)" /></linearGradient></defs>
          <rect x={w - 20} y={M.t} width={10} height={ph} fill={`url(#${uid}-ramp)`} stroke="var(--jp-border)" /><text className="lab-ax" x={w - 15} y={M.t - 1} textAnchor="end">{Math.round(hi)} dB</text>
          {active !== null && <rect x={M.l + active * cw} y={M.t} width={Math.max(cw, 2)} height={ph} fill="none" className="lab-hi" />}</>;
      }} />
  );
}

/** D065: waterfall plot: successive spectra as offset lines, newest in front, each line hiding the ones behind. */
export function Waterfall({ signal, title = "Waterfall of spectra" }: { signal: number[]; title?: string }) {
  const rows = signal.length >= 64 ? spectrogram(signal, 64, 48, BINS).slice(0, 14) : [];
  return (
    <Fig title={title} empty={!rows.length} count={rows.length} height={300}
      summary={`${title}: ${rows.length} successive spectra, oldest at the back; each trace has ${BINS} frequency bins. The strongest peak is in bin ${rows.length ? rows.map((r) => r.indexOf(Math.max(...r))).sort((a, b) => b - a)[0] : 0}.`}
      table={table(["Trace (0 = oldest)", "Peak bin", "Peak magnitude"], rows.map((r, i) => [i, r.indexOf(Math.max(...r)), +Math.max(...r).toFixed(4)]))}
      describe={(i) => `Trace ${i}: peak in bin ${rows[i].indexOf(Math.max(...rows[i]))}, magnitude ${Math.max(...rows[i]).toFixed(3)}${i === rows.length - 1 ? " (newest)" : ""}`}
      render={({ w, h, active, setActive }) => {
        const lines = waterfallLines(rows, w - 20, h - 24, 150, 90);
        return <g transform="translate(10,0)">{lines.map((l, i) => <path key={i} d={`${pathOf(l)}L${l.at(-1)![0]},${h - 24 + 24}L${l[0][0]},${h}Z`} fill="var(--jp-surface-raised)" stroke={active === i ? "var(--jp-text)" : C(0)} strokeWidth={active === i ? 3 : 1.4} onPointerEnter={() => setActive(i)} />)}
          <text className="lab-ax" x={0} y={h - 6}>0 Hz</text><text className="lab-ax" x={w - 20} y={h - 6} textAnchor="end">frequency</text></g>;
      }} />
  );
}

/** D065: constellation scatter with the ideal 16-QAM grid and EVM. */
export function Constellation({ symbols, title = "16-QAM constellation" }: { symbols: IQ[]; title?: string }) {
  const ideal = qam16(), e = evm(symbols), near = ideal.map(() => [] as IQ[]);
  for (const s of symbols) { let b = 0, bd = Infinity; ideal.forEach((d, k) => { const x = (s.i - d.i) ** 2 + (s.q - d.q) ** 2; if (x < bd) { bd = x; b = k; } }); near[b].push(s); }
  return (
    <Fig title={title} empty={!symbols.length} count={ideal.length} height={320}
      summary={`${title}: ${symbols.length} received symbols around 16 ideal points; error vector magnitude ${(e * 100).toFixed(1)}%.`}
      table={table(["Ideal I", "Ideal Q", "Symbols", "Mean error"], ideal.map((d, k) => [d.i, d.q, near[k].length, near[k].length ? +(near[k].reduce((a, s) => a + Math.hypot(s.i - d.i, s.q - d.q), 0) / near[k].length).toFixed(3) : 0]))}
      footer={<p className="lab-stats">EVM <b>{(e * 100).toFixed(1)}%</b> Symbols <b>{symbols.length}</b></p>}
      describe={(k) => `Ideal point I ${ideal[k].i}, Q ${ideal[k].q}: ${near[k].length} symbols, mean error ${near[k].length ? (near[k].reduce((a, s) => a + Math.hypot(s.i - ideal[k].i, s.q - ideal[k].q), 0) / near[k].length).toFixed(2) : "none"}`}
      render={({ w, h, active, setActive }) => {
        const s = Math.min(w - 60, h - 40), x = lin(-4.5, 4.5, (w - s) / 2, (w + s) / 2), y = lin(-4.5, 4.5, h / 2 + s / 2, h / 2 - s / 2);
        return <>{[-3, -1, 1, 3].map((v) => <g key={v}><line className="lab-gl" x1={x(v)} x2={x(v)} y1={y(-4.5)} y2={y(4.5)} /><line className="lab-gl" x1={x(-4.5)} x2={x(4.5)} y1={y(v)} y2={y(v)} /><text className="lab-ax" x={x(v)} y={y(-4.5) + 14} textAnchor="middle">{v}</text><text className="lab-ax" x={x(-4.5) - 6} y={y(v)} textAnchor="end" dominantBaseline="middle">{v}</text></g>)}
          {symbols.map((p, k) => <circle key={k} cx={x(p.i)} cy={y(p.q)} r={2.4} fill={C(0)} opacity={0.45} />)}
          {ideal.map((d, k) => <path key={k} d={`M${x(d.i) - 6},${y(d.q) - 6}l12,12m0,-12l-12,12`} stroke="var(--jp-text)" strokeWidth={active === k ? 3.5 : 1.6} onPointerEnter={() => setActive(k)} />)}
          <text className="lab-ax" x={x(4.5)} y={y(0) - 4} textAnchor="end">I</text><text className="lab-ax" x={x(0) + 4} y={y(4.5) + 4}>Q</text></>;
      }} />
  );
}

/** D067: audio waveform as a min/max envelope with a playhead you can move from the keyboard. */
export function Waveform({ samples, sampleRate = 4800, title = "Audio waveform" }: { samples: number[]; sampleRate?: number; title?: string }) {
  const SEG = 48, seg = Math.floor(samples.length / SEG), peaks = Array.from({ length: SEG }, (_, i) => Math.max(...samples.slice(i * seg, (i + 1) * seg).map(Math.abs)));
  return (
    <Fig title={title} empty={!samples.length} count={SEG} height={180}
      summary={`${title}: ${(samples.length / sampleRate).toFixed(1)} s of audio, loudest peak ${f1(Math.max(...peaks))} of full scale at ${(peaks.indexOf(Math.max(...peaks)) * seg / sampleRate).toFixed(2)} s.`}
      table={table(["Segment", "Start (s)", "Peak amplitude"], peaks.map((p, i) => [i, +((i * seg) / sampleRate).toFixed(2), +p.toFixed(3)]))}
      describe={(i) => `${((i * seg) / sampleRate).toFixed(2)} s to ${(((i + 1) * seg) / sampleRate).toFixed(2)} s: peak ${peaks[i].toFixed(2)}`}
      render={({ w, h, active, setActive }) => {
        const n = Math.max(8, Math.floor((w - M.l - M.r) / 2)), env = waveformEnvelope(samples, n), y = lin(-1, 1, h - 24, 4), x = (i: number) => M.l + (i * (w - M.l - M.r)) / (n - 1);
        return <><line className="lab-gl" x1={M.l} x2={w - M.r} y1={y(0)} y2={y(0)} />
          <path d={`${env.map((e, i) => `${i ? "L" : "M"}${x(i)},${y(e.max)}`).join("")}${[...env].reverse().map((e, i) => `L${x(n - 1 - i)},${y(e.min)}`).join("")}Z`} fill={C(0)} fillOpacity={0.75} stroke={C(0)} />
          <text className="lab-ax" x={M.l - 6} y={y(1)} textAnchor="end" dominantBaseline="middle">+1</text><text className="lab-ax" x={M.l - 6} y={y(-1)} textAnchor="end" dominantBaseline="middle">-1</text>
          <XLabels labels={Array.from({ length: 6 }, (_, i) => `${((i * samples.length) / 5 / sampleRate).toFixed(1)}s`)} x={(i) => M.l + (i * (w - M.l - M.r)) / 5} h={h} every={1} />
          {active !== null && <rect x={M.l + (active / SEG) * (w - M.l - M.r)} y={4} width={(w - M.l - M.r) / SEG} height={h - 28} fill="var(--jp-accent)" opacity={0.25} stroke="var(--jp-accent)" />}
          <rect x={M.l} y={4} width={w - M.l - M.r} height={h - 28} fill="transparent" onPointerMove={(e) => { const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect(); setActive(Math.max(0, Math.min(SEG - 1, Math.floor(((e.clientX - r.left - M.l) / (w - M.l - M.r)) * SEG)))); }} />
          </>;
      }} />
  );
}

/** D067: image luminance histogram with shadow and highlight clipping readouts. */
export function ImageHistogram({ pixels, title = "Image histogram (luminance)" }: { pixels: number[]; title?: string }) {
  const B = 32, h8 = histogram8(pixels, B), n = pixels.length, dark = n ? (100 * h8[0]) / n : 0, bright = n ? (100 * h8[B - 1]) / n : 0, mean = n ? pixels.reduce((a, b) => a + b, 0) / n : 0;
  let run = 0; const cum = h8.map((v) => (run += v));
  return (
    <Fig title={title} empty={!n} count={B} height={240}
      summary={`${title}: ${n} pixels, mean luminance ${Math.round(mean)} of 255; ${dark.toFixed(1)}% in the darkest bin and ${bright.toFixed(1)}% in the brightest bin.`}
      table={table(["Luminance range", "Pixels", "Cumulative %"], h8.map((v, i) => [`${i * (256 / B)}-${(i + 1) * (256 / B) - 1}`, v, Math.round((100 * cum[i]) / n)]))} legend={[{ name: "Pixels per bin", color: C(0) }, { name: "Cumulative (line)", color: C(5) }]}
      footer={<p className="lab-stats">Shadows clipped <b>{dark.toFixed(1)}%</b> Highlights clipped <b>{bright.toFixed(1)}%</b> Mean <b>{Math.round(mean)}</b></p>}
      describe={(i) => `Luminance ${i * (256 / B)} to ${(i + 1) * (256 / B) - 1}: ${h8[i]} pixels (${((100 * h8[i]) / n).toFixed(1)}%), cumulative ${Math.round((100 * cum[i]) / n)}%`}
      render={({ w, h, active, setActive }) => {
        const mx = Math.max(...h8), y = lin(0, mx, h - M.b, M.t), bw = (w - M.l - M.r) / B, yc = lin(0, n, h - M.b, M.t);
        return <><YAxis t={ticks(0, mx, 4)} y={y} w={w} /><XLabels labels={h8.map((_, i) => String(i * (256 / B)))} x={(i) => M.l + bw * (i + 0.5)} h={h} every={4} />
          {h8.map((v, i) => <rect key={i} x={M.l + bw * i + 1} y={y(v)} width={bw - 2} height={y(0) - y(v)} fill={C(0)} stroke={active === i ? "var(--jp-text)" : "none"} strokeWidth={2} onPointerEnter={() => setActive(i)} />)}
          <path className="lab-line" stroke={C(5)} strokeDasharray="6 3" d={pathOf(cum.map((v, i) => [M.l + bw * (i + 0.5), yc(v)]))} /></>;
      }} />
  );
}

const SHAPE: Record<string, string> = { chapter: "M0,-7L7,0L0,7L-7,0Z", edit: "M0,-7L7,6L-7,6Z", note: "M-5,-5H5V5H-5Z", alert: "M0,-8L2,-2L8,-2L3,2L5,8L0,4L-5,8L-3,2L-8,-2L-2,-2Z" };
const KIND_COLOR: Record<string, number> = { chapter: 0, edit: 3, note: 1, alert: 5 };
/** D067: video timeline with chapter, edit, note and alert markers; kind is shown by shape and colour, and labels are packed into rows. */
export function VideoMarkers({ duration, markers, title = "Video timeline" }: { duration: number; markers: Marker[]; title?: string }) {
  const packed = packMarkers(markers, duration * 0.12), rows = Math.max(1, ...packed.map((p) => p.row + 1)), kinds = [...new Set(markers.map((m) => m.kind))];
  return (
    <Fig title={title} empty={!markers.length} count={packed.length} height={70 + rows * 26}
      summary={`${title}: ${clock(duration)} long with ${markers.length} markers (${kinds.map((k) => `${markers.filter((m) => m.kind === k).length} ${k}`).join(", ")}).`}
      table={table(["Time", "Marker", "Kind"], packed.map((m) => [clock(m.at), m.label, m.kind]))} legend={kinds.map((k) => ({ name: k, color: C(KIND_COLOR[k] ?? 6) }))}
      describe={(i) => `${clock(packed[i].at)}: ${packed[i].label} (${packed[i].kind})`}
      render={({ w, h, active, setActive }) => {
        const x = lin(0, duration, M.l, w - M.r), ty = 40;
        return <><rect x={M.l} y={ty - 8} width={w - M.l - M.r} height={16} rx={3} fill="var(--jp-surface)" stroke="var(--jp-border)" />
          {[0, 0.25, 0.5, 0.75, 1].map((f) => <text key={f} className="lab-ax" x={x(f * duration)} y={14} textAnchor={f === 0 ? "start" : f === 1 ? "end" : "middle"}>{clock(f * duration)}</text>)}
          {packed.map((m, i) => { const col = C(KIND_COLOR[m.kind] ?? 6), ly = ty + 22 + m.row * 26; return <g key={i} onPointerEnter={() => setActive(i)}>
            <line x1={x(m.at)} x2={x(m.at)} y1={ty} y2={ly - 10} stroke={col} strokeWidth={1.5} />
            <path d={SHAPE[m.kind] ?? SHAPE.note} transform={`translate(${x(m.at)},${ty})`} fill={col} stroke={active === i ? "var(--jp-text)" : "var(--jp-surface-raised)"} strokeWidth={active === i ? 3 : 1.5} />
            <text className="lab-ax lab-ax--strong" x={x(m.at) + 4} y={ly}>{m.label}</text></g>; })}</>;
      }} />
  );
}
