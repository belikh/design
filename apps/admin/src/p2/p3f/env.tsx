import { useState } from "react";
import { C } from "@belikh/jupiter-ui/Charts.tsx";
import { Segmented } from "@belikh/jupiter-ui/inputs.tsx";
import { comfortFraction, socSeries, stack, tariffCost, type Band } from "./energy.ts";
import { COMPASS16, polarPoint, skyPoint, sunPath, sunPosition, windRose } from "./polar.ts";
import { useChartInteractions, type Meta } from "./useChartInteractions.tsx";
import { Fig, M, Patterns, XLabels, YAxis, f1, lin, patUrl, pathOf, table, ticks } from "./shared.tsx";

const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

/** D063: household load curve (kW per hour) over tariff bands with the cost per band. Bands are shaded and labelled, not colour-coded alone. */
export function LoadCurve({ load, bands, title = "Load and tariff bands" }: { load: number[]; bands: Band[]; title?: string }) {
  const t = tariffCost(load, bands), rank = [...new Set(bands.map((b) => b.rate))].sort((a, b) => a - b);
  return (
    <Fig title={title} empty={!load.length} count={load.length} height={260}
      summary={`${title}: peak ${f1(Math.max(...load))} kW at ${HOURS[load.indexOf(Math.max(...load))]}, ${f1(t.kwh)} kWh for the day costing ${t.cost.toFixed(2)} across ${rank.length} tariff rates.`}
      table={table(["Hour", "Load (kW)", "Band", "Rate"], load.map((v, h) => { const b = bands.find((x) => (x.from <= x.to ? h >= x.from && h < x.to : h >= x.from || h < x.to)); return [HOURS[h], v, b?.name ?? "", b?.rate ?? 0]; }))}
      footer={<p className="p3-stats">{t.per.reduce<{ name: string; kwh: number; cost: number }[]>((m, p) => { const e = m.find((q) => q.name === p.name); if (e) { e.kwh += p.kwh; e.cost += p.cost; } else m.push({ ...p }); return m; }, []).map((p) => <span key={p.name}>{p.name} <b>{f1(p.kwh)} kWh</b> · <b>{p.cost.toFixed(2)}</b></span>)}<span>Total <b>{t.cost.toFixed(2)}</b></span></p>}
      describe={(h) => { const b = bands.find((x) => (x.from <= x.to ? h >= x.from && h < x.to : h >= x.from || h < x.to)); return `${HOURS[h]}: ${load[h]} kW, ${b?.name} band at ${b?.rate} per kWh`; }}
      render={({ w, h, active, setActive }) => {
        const x = (i: number) => M.l + ((i + 0.5) * (w - M.l - M.r)) / 24, hi = Math.max(...load) * 1.1, y = lin(0, hi, h - M.b, M.t + 12), tk = ticks(0, hi, 4), bw = (w - M.l - M.r) / 24;
        return <>{bands.map((b, k) => { const segs = b.from <= b.to ? [[b.from, b.to]] : [[b.from, 24], [0, b.to]]; return segs.map(([a, z], j) => <g key={`${k}${j}`}><rect x={M.l + a * bw} y={M.t} width={(z - a) * bw} height={h - M.t - M.b} fill="var(--jp-text)" opacity={0.03 + 0.07 * rank.indexOf(b.rate)} />{j === 0 && <text className="p3-ax" x={M.l + a * bw + 3} y={M.t + 9}>{b.name} {b.rate}</text>}</g>); })}
          <YAxis t={tk} y={y} w={w} /><XLabels labels={HOURS} x={x} h={h} every={3} />
          <path className="p3-line" stroke={C(0)} d={pathOf(load.map((v, i) => [x(i), y(v)]))} />{load.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={active === i ? 5 : 8} fill={active === i ? C(0) : "transparent"} onPointerEnter={() => setActive(i)} />)}</>;
      }} />
  );
}

/** D063: stacked generation / supply sources by hour (hatching on alternate layers for print). */
export function StackedSources({ sources, title = "Supply by source (kW)" }: { sources: { name: string; data: number[] }[]; title?: string }) {
  const st = stack(sources.map((s) => s.data)), n = sources[0]?.data.length ?? 0, tot = st.at(-1)?.top ?? [];
  return (
    <Fig title={title} empty={!n} count={n} height={260}
      summary={`${title}: ${sources.length} sources over ${n} hours; peak total ${f1(Math.max(...tot))} kW. ${sources.map((s) => `${s.name} ${f1(s.data.reduce((a, b) => a + b, 0))} kWh`).join(", ")}.`}
      table={table(["Hour", ...sources.map((s) => s.name), "Total"], HOURS.slice(0, n).map((l, i) => [l, ...sources.map((s) => s.data[i]), +tot[i].toFixed(2)]))} legend={sources.map((s, i) => ({ name: s.name, color: C(i) }))}
      describe={(i) => `${HOURS[i]}: ${sources.map((s) => `${s.name} ${s.data[i]}`).join(", ")}; total ${f1(tot[i])} kW`}
      render={({ w, h, active, setActive, uid }) => {
        const x = (i: number) => M.l + (i * (w - M.l - M.r)) / Math.max(1, n - 1), hi = Math.max(...tot) * 1.05, tk = ticks(0, hi, 4), y = lin(0, tk.at(-1)!, h - M.b, M.t);
        return <><Patterns id={uid} /><YAxis t={tk} y={y} w={w} /><XLabels labels={HOURS} x={x} h={h} every={3} />
          {st.map((s, k) => <path key={k} d={`${pathOf(s.top.map((v, i) => [x(i), y(v)]))}${s.base.map((v, i) => `L${x(n - 1 - i)},${y(s.base[n - 1 - i])}`).join("")}Z`} fill={k % 2 ? patUrl(uid, k) : C(k)} fillOpacity={k % 2 ? 1 : 0.8} stroke={C(k)} strokeWidth={1.2} />)}
          {active !== null && <line className="p3-cross" x1={x(active)} x2={x(active)} y1={M.t} y2={h - M.b} />}
          <rect x={M.l} y={M.t} width={w - M.l - M.r} height={h - M.t - M.b} fill="transparent" onPointerMove={(e) => { const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect(); setActive(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left - M.l) / (w - M.l - M.r)) * (n - 1))))); }} /></>;
      }} />
  );
}

/** D063: battery state of charge from a charge/discharge plan; the capacity and reserve are marked. */
export function BatterySoc({ netKw, capacity = 10, start = 3, reserve = 2, title = "Battery state of charge" }: { netKw: number[]; capacity?: number; start?: number; reserve?: number; title?: string }) {
  const soc = socSeries(netKw, capacity, start), low = soc.filter((s) => s <= reserve).length;
  return (
    <Fig title={title} empty={!netKw.length} count={soc.length} height={260}
      summary={`${title}: starts at ${f1(100 * start / capacity)}%, ends at ${f1((100 * soc.at(-1)!) / capacity)}%, peak ${f1((100 * Math.max(...soc)) / capacity)}%; ${low} hours at or below the ${reserve} kWh reserve.`}
      table={table(["Hour", "Net power (kW)", "State of charge (kWh)", "State of charge (%)"], soc.map((s, i) => [i < 24 ? HOURS[i] : "24:00", netKw[i] ?? 0, +s.toFixed(2), Math.round((100 * s) / capacity)]))} legend={[{ name: "State of charge", color: C(1) }, { name: "Charging (bars up)", color: C(4) }, { name: "Discharging (bars down)", color: C(6) }]}
      describe={(i) => `${i < 24 ? HOURS[i] : "24:00"}: ${f1(soc[i])} kWh (${Math.round((100 * soc[i]) / capacity)}%)${i < netKw.length ? `, next hour ${netKw[i] >= 0 ? "charging" : "discharging"} ${Math.abs(netKw[i])} kW` : ""}`}
      render={({ w, h, active, setActive }) => {
        const n = soc.length, x = (i: number) => M.l + (i * (w - M.l - M.r)) / (n - 1), y = lin(0, capacity, h - M.b - 44, M.t), pw = (h - M.b - 40), ph = lin(-Math.max(...netKw.map(Math.abs), 1), Math.max(...netKw.map(Math.abs), 1), h - M.b, pw + 4), bw = ((w - M.l - M.r) / (n - 1)) * 0.7;
        return <><YAxis t={ticks(0, capacity, 4)} y={y} w={w} fmt={(v) => `${v}`} /><XLabels labels={soc.map((_, i) => HOURS[i % 24])} x={x} h={h} every={4} />
          <line x1={M.l} x2={w - M.r} y1={y(reserve)} y2={y(reserve)} stroke="var(--jp-warn)" strokeWidth={1.5} strokeDasharray="6 3" /><text className="p3-ax" x={w - M.r} y={y(reserve) - 4} textAnchor="end">reserve {reserve} kWh</text>
          <path d={`${pathOf(soc.map((v, i) => [x(i), y(v)]))}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`} fill={C(1)} fillOpacity={0.22} stroke={C(1)} strokeWidth={2} />
          {netKw.map((p, i) => <rect key={i} x={x(i) + 1} y={Math.min(ph(0), ph(p))} width={bw} height={Math.abs(ph(p) - ph(0))} fill={p >= 0 ? C(4) : C(6)} />)}
          {soc.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={active === i ? 5 : 7} fill={active === i ? C(1) : "transparent"} stroke={active === i ? "var(--jp-text)" : "none"} strokeWidth={2} onPointerEnter={() => setActive(i)} />)}</>;
      }} />
  );
}

type Wx = { label: string; t: number; rh: number };
/** D064: temperature and relative humidity on two axes with a shaded comfort band; points outside the band are drawn as rings. */
export function TempHumidity({ data: all, band, title = "Temperature and humidity", group, meta }: { data: Wx[]; band: { tLo: number; tHi: number; rhLo: number; rhHi: number }; title?: string; /** share the crosshair with other charts of this group */ group?: string; meta?: Meta }) {
  const ix = useChartInteractions({ n: all.length, labels: all.map((d) => d.label), group, meta }), [lo, hi] = ix.range, data = all.slice(lo, hi + 1);
  const frac = comfortFraction(data, band), inside = (d: Wx) => d.t >= band.tLo && d.t <= band.tHi && d.rh >= band.rhLo && d.rh <= band.rhHi;
  return (
    <Fig title={title} empty={!all.length} count={data.length} height={280} ix={ix} shared={{ active: ix.cursor === null || ix.cursor < lo || ix.cursor > hi ? null : ix.cursor - lo, set: (i) => ix.setCursor(i === null ? null : i + lo) }}
      summary={`${title}: ${data.length} readings, temperature ${f1(Math.min(...data.map((d) => d.t)))} to ${f1(Math.max(...data.map((d) => d.t)))} °C, humidity ${Math.min(...data.map((d) => d.rh))} to ${Math.max(...data.map((d) => d.rh))} %; comfort band ${band.tLo}-${band.tHi} °C and ${band.rhLo}-${band.rhHi} % RH met ${Math.round(frac * 100)}% of the time.`}
      table={table(["Time", "Temperature (°C)", "Humidity (%)", "Comfortable"], data.map((d) => [d.label, d.t, d.rh, inside(d) ? "yes" : "no"]))} legend={[{ name: "Temperature (°C, solid)", color: C(0) }, { name: "Humidity (% RH, dashed)", color: C(2) }]}
      footer={<p className="p3-stats">In comfort band <b>{Math.round(frac * 100)}%</b> of the shown readings</p>}
      describe={(i) => `${data[i].label}: ${data[i].t} °C, ${data[i].rh} % RH, ${inside(data[i]) ? "within" : "outside"} the comfort band`}
      render={({ w, h, active }) => {
        const n = data.length, rx = w - M.r - 22, x = (i: number) => M.l + (i * (rx - M.l)) / Math.max(1, n - 1), tmin = Math.floor(Math.min(...all.map((d) => d.t), band.tLo) - 1), tmax = Math.ceil(Math.max(...all.map((d) => d.t), band.tHi) + 1), yt = lin(tmin, tmax, h - M.b, M.t), yr = lin(0, 100, h - M.b, M.t), plot = { l: M.l, r: rx, t: M.t, b: h - M.b };
        return <><rect x={M.l} y={yt(band.tHi)} width={rx - M.l} height={yt(band.tLo) - yt(band.tHi)} fill={C(0)} opacity={0.12} /><text className="p3-ax" x={M.l + 4} y={yt(band.tHi) + 11}>comfort {band.tLo}-{band.tHi} °C</text>
          <YAxis t={ticks(tmin, tmax, 5)} y={yt} w={rx + M.r} fmt={(v) => `${v}°`} /><XLabels labels={data.map((d) => d.label)} x={x} h={h} every={Math.ceil(n / 6)} />
          {[0, 25, 50, 75, 100].map((v) => <text key={v} className="p3-ax" x={rx + 4} y={yr(v)} dominantBaseline="middle">{v}%</text>)}
          <path className="p3-line" stroke={C(0)} d={pathOf(data.map((d, i) => [x(i), yt(d.t)]))} /><path className="p3-line" stroke={C(2)} strokeDasharray="6 3" d={pathOf(data.map((d, i) => [x(i), yr(d.rh)]))} />
          {data.map((d, i) => !inside(d) ? <circle key={i} cx={x(i)} cy={yt(d.t)} r={3.5} fill="var(--jp-surface-raised)" stroke={C(0)} strokeWidth={1.5} /> : null)}
          {active !== null && data[active] && <><line className="p3-cross" x1={x(active)} x2={x(active)} y1={M.t} y2={h - M.b} /><circle cx={x(active)} cy={yt(data[active].t)} r={5} fill={C(0)} /><circle cx={x(active)} cy={yr(data[active].rh)} r={5} fill={C(2)} /></>}
          <rect {...ix.plotProps(plot)} />{ix.overlay(plot)}</>;
      }} />
  );
}

/** D064: wind rose; bars point to where the wind comes FROM, stacked by speed class (lighter = calmer). */
export function WindRose({ samples, edges, title = "Wind rose" }: { samples: { dir: number; speed: number }[]; edges: number[]; title?: string }) {
  const r = windRose(samples, edges), tot = r.freq.map((f) => f.reduce((a, b) => a + b, 0)), top = tot.indexOf(Math.max(...tot)), cls = edges.map((e, k) => (k === edges.length - 1 ? `${e}+` : `${e}-${edges[k + 1]}`));
  const shade = (k: number) => `color-mix(in oklab, var(--adm-c1) ${25 + (k * 75) / Math.max(1, edges.length - 1)}%, var(--jp-surface-raised))`;
  return (
    <Fig title={title} empty={!samples.length} count={16} height={320}
      summary={`${title}: ${samples.length} readings; wind mostly from ${COMPASS16[top]} (${f1(tot[top])}% of the time); calm ${f1(r.calm)}%. Speed classes in m/s: ${cls.join(", ")}.`}
      table={table(["Direction", ...cls.map((c) => `${c} m/s (%)`), "Total (%)"], COMPASS16.map((d, i) => [d, ...r.freq[i].map((v) => +v.toFixed(2)), +tot[i].toFixed(2)]))} legend={cls.map((c, k) => ({ name: `${c} m/s`, color: shade(k) }))}
      describe={(i) => `From ${COMPASS16[i]}: ${f1(tot[i])}% of the time${r.freq[i].map((v, k) => `, ${cls[k]} m/s ${f1(v)}%`).join("")}`}
      render={({ w, h, active, setActive }) => {
        const cx = w / 2, cy = h / 2, R = Math.min(w / 2, h / 2) - 26, mx = Math.max(...tot, 1) * 1.1, rr = (v: number) => (v / mx) * R, half = 360 / 32 - 1.5;
        return <>{ticks(0, mx, 3).map((v) => <g key={v}><circle className="p3-gl" cx={cx} cy={cy} r={rr(v)} /><text className="p3-ax" x={cx + 3} y={cy - rr(v) - 2}>{v}%</text></g>)}
          {COMPASS16.map((d, i) => { let acc = 0; const a = i * 22.5; return <g key={d} onPointerEnter={() => setActive(i)}>{r.freq[i].map((v, k) => { const r0 = rr(acc), r1 = rr((acc += v)), p = (rad: number, ang: number) => polarPoint(cx, cy, rad, ang), [a0, a1, b0, b1] = [p(r0, a - half), p(r0, a + half), p(r1, a - half), p(r1, a + half)];
            return <path key={k} d={`M${a0[0]},${a0[1]}L${b0[0]},${b0[1]}A${r1},${r1} 0 0 1 ${b1[0]},${b1[1]}L${a1[0]},${a1[1]}A${r0},${r0} 0 0 0 ${a0[0]},${a0[1]}Z`} fill={shade(k)} stroke={active === i ? "var(--jp-text)" : "var(--adm-c1)"} strokeWidth={active === i ? 2 : 0.8} />; })}
            {i % 2 === 0 && (() => { const q = polarPoint(cx, cy, R + 12, a); return <text className="p3-ax p3-ax--strong" x={q[0]} y={q[1]} textAnchor="middle" dominantBaseline="middle">{d}</text>; })()}</g>; })}</>;
      }} />
  );
}

/** D064: sun path chart (sky dome seen from above): winter solstice, equinox and summer solstice arcs with hour marks. */
export function SunPath({ lat = 52, title = "Sun path" }: { lat?: number; title?: string }) {
  const days = [{ name: "Winter solstice", doy: 355 }, { name: "Equinox", doy: 80 }, { name: "Summer solstice", doy: 172 }], [sel, setSel] = useState(2), d = days[sel], path = sunPath(lat, d.doy, 1);
  return (
    <div>
      <div className="p3-controls"><Segmented label="Day" value={String(sel)} onChange={(v) => setSel(Number(v))} options={days.map((x, i) => ({ value: String(i), label: x.name }))} /></div>
      <Fig title={title} count={path.length} height={320}
        summary={`${title} at latitude ${lat}: on the ${d.name.toLowerCase()} the sun is up from ${path[0].hour}:00 to ${path.at(-1)!.hour}:00 and peaks at ${f1(sunPosition(lat, d.doy, 12).alt)} degrees at solar noon.`}
        table={table(["Hour", "Altitude (°)", "Azimuth (°)"], path.map((p) => [`${String(p.hour).padStart(2, "0")}:00`, +p.alt.toFixed(1), +p.az.toFixed(1)]))} legend={days.map((x, i) => ({ name: x.name, color: C(i + 3) }))}
        describe={(i) => `${String(path[i].hour).padStart(2, "0")}:00 solar time: altitude ${f1(path[i].alt)}°, azimuth ${f1(path[i].az)}° (${COMPASS16[Math.round(path[i].az / 22.5) % 16]})`}
        render={({ w, h, active, setActive }) => {
          const cx = w / 2, cy = h / 2, R = Math.min(w / 2, h / 2) - 24;
          return <>{[0, 30, 60].map((a) => <g key={a}><circle className="p3-gl" cx={cx} cy={cy} r={R * (1 - a / 90)} />{a > 0 && <text className="p3-ax" x={cx + 3} y={cy - R * (1 - a / 90) - 2}>{a}°</text>}</g>)}
            {[0, 90, 180, 270].map((a) => { const p = polarPoint(cx, cy, R, a), q = polarPoint(cx, cy, R + 12, a); return <g key={a}><line className="p3-gl" x1={cx} y1={cy} x2={p[0]} y2={p[1]} /><text className="p3-ax p3-ax--strong" x={q[0]} y={q[1]} textAnchor="middle" dominantBaseline="middle">{["N", "E", "S", "W"][a / 90]}</text></g>; })}
            {days.map((x, i) => { const pp = sunPath(lat, x.doy, 0.25); return <path key={x.name} className="p3-line" stroke={C(i + 3)} strokeWidth={i === sel ? 3 : 1.5} opacity={i === sel ? 1 : 0.4} strokeDasharray={["8 3", "2 3", ""][i]} d={pathOf(pp.map((p) => skyPoint(cx, cy, R, p.alt, p.az)))} />; })}
            {path.map((p, i) => { const q = skyPoint(cx, cy, R, p.alt, p.az); return <g key={i} onPointerEnter={() => setActive(i)}><circle cx={q[0]} cy={q[1]} r={active === i ? 7 : 4} fill={active === i ? C(sel + 3) : "var(--jp-surface-raised)"} stroke={C(sel + 3)} strokeWidth={2} />{p.hour % 3 === 0 && <text className="p3-ax" x={q[0] + 7} y={q[1] - 6}>{p.hour}h</text>}</g>; })}</>;
        }} />
    </div>
  );
}
