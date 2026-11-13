import { useMemo, useState } from "react";
import { Segmented } from "@belikh/jupiter-ui/inputs.tsx";
import { centreMHz, congestion, faceplate, poeUse, rackModel, rssiBand, signalGrid, span, type AP, type Band, type Bss, type Dev, type Port, type Wall } from "./net.ts";
import { C, Chart, HeatScale, Legend, Note, Readout, Scroll, Svg, fmt, heat, onHeat, pct, sum, useGridCursor, useHits } from "./kit.tsx";
import type { FrameState } from "../charts/frame.tsx";

type Common = { title?: string; state?: FrameState };
const PSTATE: Record<Port["state"], string> = { up: "Link up", down: "No link", disabled: "Disabled", error: "Error (err-disabled)" };
const speed = (m: number) => (m >= 1000 ? `${m / 1000} Gb/s` : `${m} Mb/s`);

function PortLed({ s, x, y }: { s: Port["state"]; x: number; y: number }) {
  if (s === "up") return <circle cx={x} cy={y} r="4" fill="var(--jp-ok)" />;
  if (s === "error") return <path d={`M${x},${y - 5}L${x + 5},${y + 4}L${x - 5},${y + 4}Z`} fill="var(--jp-danger)" />;
  if (s === "disabled") return <g stroke="var(--jp-text-muted)" strokeWidth="1.5" fill="none"><circle cx={x} cy={y} r="4" /><path d={`M${x - 3},${y + 3}L${x + 3},${y - 3}`} /></g>;
  return <circle cx={x} cy={y} r="3.5" fill="none" stroke="var(--jp-text-muted)" strokeWidth="1.5" />;
}
/** D057 Switch faceplate: odd ports on top, even below, SFP+ cages on the right. Status uses shape as well as colour; switch the colouring between status, PoE draw and VLAN. */
export function Faceplate({ ports, poeBudget = 370, title = "Switch faceplate: 24 x RJ45 + 4 x SFP+", state }: Common & { ports: Port[]; poeBudget?: number }) {
  const [mode, setMode] = useState<"status" | "poe" | "vlan">("status"); const { text, hit } = useHits<number>(); const poe = poeUse(ports, poeBudget); const vlans = [...new Set(ports.map((p) => p.vlan))].sort((a, b) => a - b); const maxPoe = Math.max(1, ...ports.map((p) => p.poe));
  const cnt = (s: Port["state"]) => ports.filter((p) => p.state === s).length;
  return (
    <>
      <div className="p3e-controls"><Segmented label="Colour ports by" value={mode} onChange={setMode} options={[{ value: "status", label: "Status" }, { value: "poe", label: "PoE draw" }, { value: "vlan", label: "VLAN" }]} /></div>
      <div className="p3e-stats"><div><b>{cnt("up")}</b><span>links up</span></div><div><b>{cnt("error")}</b><span>in error</span></div><div><b>{poe.used.toFixed(1)} W</b><span>PoE of {poeBudget} W ({pct(poe.pct)})</span></div></div>
      <Chart title={title} n={ports.length} state={state} height={150} table={{ head: ["Port", "Type", "State", "Speed", "PoE (W)", "VLAN", "Label"], rows: ports.map((p) => [p.n, p.kind === "sfp" ? "SFP+" : "RJ45", PSTATE[p.state], p.speed ? speed(p.speed) : "", p.poe, p.vlan, p.label]) }}>
        {() => {
          const f = faceplate(ports, { w: 30, h: 36, gap: 5 }, 12), P = 12;
          return (
            <>
              <Scroll label={title}>
                <Svg w={f.width + 2 * P} h={f.height + 2 * P + 14} label={`${title}. ${cnt("up")} of ${ports.length} ports linked, ${cnt("error")} in error, PoE ${poe.used.toFixed(1)} of ${poeBudget} watts.`}>
                  <g transform={`translate(${P},${P})`}>
                    <rect x="-8" y="-8" width={f.width + 16} height={f.height + 16} rx="6" className="p3e-box" />
                    {f.cells.map(({ port: p, x, y, w, h }) => { const fill = mode === "status" ? "var(--jp-surface)" : mode === "poe" ? (p.poe ? heat(p.poe / maxPoe) : "var(--jp-surface)") : C(vlans.indexOf(p.vlan)); return (
                      <g key={p.n} {...hit(p.n, `Port ${p.n} (${p.kind === "sfp" ? "SFP+" : "RJ45"}), ${p.label}: ${PSTATE[p.state]}${p.speed ? ` at ${speed(p.speed)}` : ""}, VLAN ${p.vlan}${p.poe ? `, PoE ${p.poe} W` : ""}`)}>
                        <rect x={x} y={y} width={w} height={h} rx="3" fill={fill} stroke="var(--jp-text-muted)" strokeWidth={p.kind === "sfp" ? 2 : 1} />
                        <text x={x + w / 2} y={y + h - 7} textAnchor="middle" style={{ fill: mode === "poe" && p.poe ? onHeat(p.poe / maxPoe) : undefined }}>{p.n}</text><PortLed s={p.state} x={x + w / 2} y={y + 10} />
                      </g>); })}
                  </g>
                </Svg>
              </Scroll>
              <Readout>{text}</Readout>
              <Legend items={[{ label: "Link up (circle)", color: "var(--jp-ok)" }, { label: "No link (hollow)", cls: "p3e-ring" }, { label: "Disabled (slashed)", cls: "p3e-ring" }, { label: "Error (triangle)", color: "var(--jp-danger)" }, ...(mode === "vlan" ? vlans.map((v, i) => ({ label: `VLAN ${v}`, color: C(i) })) : [])]} />
            </>
          );
        }}
      </Chart>
    </>
  );
}

const KIND_C: Record<string, number> = { switch: 0, router: 1, firewall: 2, server: 3, storage: 4, ups: 5, pdu: 5, patch: 6, kvm: 6 };
/** D057 Rack elevation: front view of one or more 42U racks. Free space is hatched; the power bar compares draw with the rack's budget. */
export function RackElevation({ racks, units = 42, powerCap = 4500, title = "Rack elevation", state }: Common & { racks: { name: string; devs: Dev[] }[]; units?: number; powerCap?: number }) {
  const { text, hit } = useHits(); const models = racks.map((r) => rackModel(r.devs, units));
  return (
    <Chart title={title} n={racks.length} state={state} height={units * 14 + 80} table={{ head: ["Rack", "Unit(s)", "Device", "Kind", "Power (W)"], rows: racks.flatMap((r) => [...r.devs].sort((a, b) => b.u - a.u).map((d) => [r.name, d.h > 1 ? `U${d.u}-U${d.u + d.h - 1}` : `U${d.u}`, d.name, d.kind, d.watts])) }}>
      {(w) => {
        const uh = 14, rw = Math.min(260, (w - 20) / racks.length - 30), H = units * uh + 70; const kinds = [...new Set(racks.flatMap((r) => r.devs.map((d) => d.kind)))];
        return (
          <>
            <Scroll label={title}>
              <Svg w={Math.max(w, racks.length * (rw + 60))} h={H} label={`${title}. ${racks.map((r, i) => `${r.name}: ${models[i].usedU} of ${units} units used, ${fmt(models[i].watts)} watts`).join("; ")}.`}>
                <defs><pattern id="p3e-free" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0,0V8" stroke="var(--jp-border)" strokeWidth="1.5" /></pattern></defs>
                {racks.map((r, ri) => { const x0 = 30 + ri * (rw + 60), m = models[ri]; const yU = (u: number) => 26 + (units - u) * uh; return (
                  <g key={r.name}>
                    <text x={x0} y="14" className="p3e-b">{r.name}</text>
                    <rect x={x0} y="26" width={rw} height={units * uh} className="p3e-box" strokeWidth="3" />
                    {m.free.map((f) => <rect key={f.from} x={x0 + 1} y={yU(f.to)} width={rw - 2} height={(f.to - f.from + 1) * uh} fill="url(#p3e-free)" />)}
                    {Array.from({ length: units }, (_, i) => i + 1).filter((u) => u % 2 === 1 || u === units).map((u) => <text key={u} x={x0 - 6} y={yU(u) + uh / 2} dy="0.35em" textAnchor="end" className="p3e-mute">{u}</text>)}
                    {r.devs.map((d) => <g key={d.name} {...hit(d.name, `${r.name}, ${d.h > 1 ? `U${d.u} to U${d.u + d.h - 1}` : `U${d.u}`}: ${d.name} (${d.kind}), ${d.watts} W`)}><rect x={x0 + 2} y={yU(d.u + d.h - 1) + 1} width={rw - 4} height={d.h * uh - 2} rx="2" fill={C(KIND_C[d.kind] ?? 0)} fillOpacity="0.35" stroke={C(KIND_C[d.kind] ?? 0)} strokeWidth="2" /><text x={x0 + 8} y={yU(d.u + d.h - 1) + (d.h * uh) / 2} dy="0.35em" className="p3e-halo">{d.name}</text></g>)}
                    <rect x={x0} y={26 + units * uh + 10} width={rw} height="10" rx="3" fill="var(--jp-surface)" stroke="var(--jp-border)" /><rect x={x0} y={26 + units * uh + 10} width={Math.min(1, m.watts / powerCap) * rw} height="10" rx="3" fill={m.watts / powerCap > 0.8 ? "var(--jp-warn)" : "var(--adm-c1)"} />
                    <text x={x0} y={26 + units * uh + 34}>{fmt(m.watts)} W of {fmt(powerCap)} W · {m.freeU} U free</text>
                  </g>); })}
              </Svg>
            </Scroll>
            <Readout>{text}</Readout>
            <Legend items={[...kinds.map((k) => ({ label: k, color: C(KIND_C[k] ?? 0) })), { label: "free space (hatched)", cls: "p3e-hatched" }]} />
          </>
        );
      }}
    </Chart>
  );
}

const CH24 = Array.from({ length: 13 }, (_, i) => i + 1), CH5 = [36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 149, 153, 157, 161, 165];
/** D057 Wi-Fi spectrum: each network is a curve centred on its channel, as wide as its channel width, as tall as its signal. Recommends the least congested non-overlapping channel. */
export function WifiSpectrum({ networks, title = "Wi-Fi spectrum", state }: Common & { networks: Bss[] }) {
  const [band, setBand] = useState<Band>("2.4"); const { text, hit } = useHits(); const list = networks.filter((n) => n.band === band);
  const cands = band === "2.4" ? [1, 6, 11] : [36, 40, 44, 48, 149, 153, 157, 161];
  const scores = cands.map((c) => ({ c, s: congestion(band, c, 20, list) })).sort((a, b) => a.s - b.s); const best = scores[0];
  const ssids = [...new Set(networks.map((n) => n.ssid))];
  return (
    <>
      <div className="p3e-controls"><Segmented label="Band" value={band} onChange={setBand} options={[{ value: "2.4", label: "2.4 GHz" }, { value: "5", label: "5 GHz" }]} />{best && <span className="p3e-badge is-ok">Quietest 20 MHz channel: {best.c} (score {best.s.toFixed(2)})</span>}</div>
      <Chart title={`${title}, ${band} GHz`} n={list.length} state={state} height={300} table={{ head: ["SSID", "Band", "Channel", "Width (MHz)", "Signal (dBm)", "Frequency span (MHz)"], rows: networks.map((n) => [n.ssid, `${n.band} GHz`, n.channel, n.width, n.rssi, span(n).join("-")]) }}>
        {(w) => {
          const chs = band === "2.4" ? CH24 : CH5; const lo = band === "2.4" ? 2399 : centreMHz("5", chs[0]) - 20, hi = band === "2.4" ? 2485 : centreMHz("5", chs[chs.length - 1]) + 40; const H = 300, L = 40, B = 34, T = 10; const X = (f: number) => L + ((f - lo) / (hi - lo)) * (w - L - 8), Y = (dbm: number) => T + (1 - (dbm + 100) / 70) * (H - T - B);
          return (
            <>
              <Svg w={w} h={H} label={`${title}, ${band} GHz: ${list.length} networks. ${list.map((n) => `${n.ssid} channel ${n.channel} at ${n.rssi} dBm`).join("; ")}.`}>
                {[-90, -70, -50, -30].map((d) => <g key={d}><line x1={L} x2={w} y1={Y(d)} y2={Y(d)} stroke="var(--jp-border)" /><text x={L - 6} y={Y(d)} dy="0.35em" textAnchor="end" className="p3e-mute">{d}</text></g>)}
                {chs.map((c) => <text key={c} x={X(centreMHz(band, c))} y={H - 16} textAnchor="middle" className="p3e-mute">{c}</text>)}
                <text x={L} y={H - 2} className="p3e-mute">channel · quietest 20 MHz choices marked ▲</text>
                {scores.map((s) => <path key={s.c} d={`M${X(centreMHz(band, s.c))},${H - 28}l-4,8h8z`} fill={s.c === best?.c ? "var(--jp-ok)" : "var(--jp-text-muted)"} />)}
                {list.map((n, i) => { const [a, b] = span(n), cx = X(centreMHz(band, n.channel)), top = Y(n.rssi), y0 = Y(-100) - 0, x0 = X(a), x1 = X(b); const d = `M${x0},${y0}C${x0 + (cx - x0) * 0.5},${y0} ${cx - (cx - x0) * 0.4},${top} ${cx},${top}C${cx + (x1 - cx) * 0.4},${top} ${x1 - (x1 - cx) * 0.5},${y0} ${x1},${y0}Z`; return (
                  <g key={i} {...hit(String(i), `${n.ssid}: channel ${n.channel}, ${n.width} MHz wide, ${n.rssi} dBm`)}>
                    <path d={d} fill={C(ssids.indexOf(n.ssid))} fillOpacity="0.22" stroke={C(ssids.indexOf(n.ssid))} strokeWidth="2" strokeDasharray={i % 2 ? "6 3" : undefined} />
                    <text x={cx} y={top - 5} textAnchor="middle" className="p3e-halo">{n.ssid}</text>
                  </g>); })}
              </Svg>
              <Readout>{text}</Readout>
            </>
          );
        }}
      </Chart>
      <Legend items={ssids.map((s, i) => ({ label: s, color: C(i) }))} />
      <Note>Curves widen with channel width and rise with signal strength. Two networks overlap where their curves share frequency: in 2.4 GHz only channels 1, 6 and 11 are clear of each other. Congestion score = overlap fraction weighted by neighbour signal; lower is better.</Note>
    </>
  );
}

const RSSI_BANDS = [{ name: "Excellent", range: "-55 dBm or better" }, { name: "Good", range: "-55 to -67" }, { name: "Fair", range: "-67 to -75" }, { name: "Poor", range: "weaker than -75" }];
/** D057 Signal heat on a floor plan: predicted RSSI from a log-distance model with a fixed loss per wall. Arrow keys read any cell. */
export function SignalHeat({ cols, rows, cell, aps, walls, rooms, title = "Signal heat: office floor plan", state }: Common & { cols: number; rows: number; cell: number; aps: AP[]; walls: Wall[]; rooms: { id: string; name: string; x: number; y: number; w: number; h: number }[] }) {
  const g = useMemo(() => signalGrid(cols, rows, cell, aps, walls), [cols, rows, cell, aps, walls]); const flat = g.flat(); const cur = useGridCursor(rows, cols, (r, c) => `Row ${r + 1}, column ${c + 1}: ${g[r][c].rssi.toFixed(0)} dBm from ${g[r][c].ap}, ${RSSI_BANDS[rssiBand(g[r][c].rssi)].name.toLowerCase()}`);
  const share = (b: number) => flat.filter((c) => rssiBand(c.rssi) === b).length / flat.length; const roomAvg = rooms.map((r) => { const cs = flat.filter((_, i) => { const x = (i % cols + 0.5) * cell, y = (Math.floor(i / cols) + 0.5) * cell; return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h; }); return { name: r.name, avg: cs.length ? sum(cs.map((c) => c.rssi)) / cs.length : NaN }; });
  const t = (v: number) => Math.min(1, Math.max(0, (v + 90) / 40));
  return (
    <Chart title={title} n={aps.length} state={state} height={rows * cell + 60} table={{ head: ["Room", "Mean predicted signal (dBm)"], rows: [...roomAvg.map((r) => [r.name, Number.isFinite(r.avg) ? Math.round(r.avg) : "n/a"]), ...RSSI_BANDS.map((b, i) => [`Floor area: ${b.name}`, pct(share(i), 1)])] }}>
      {() => (
        <>
          <Scroll label={title}>
            <div className="p3e-focus-grid" {...cur.props} aria-label={`${title}: ${aps.length} access points. Arrow keys read the predicted signal in each ${cell / 7} metre cell.`}>
              <Svg w={cols * cell + 2} h={rows * cell + 2} label={`${title}. ${pct(share(0) + share(1))} of the floor has good or excellent signal; ${pct(share(3))} is poor.`}>
                {g.map((row, r) => row.map((c, i) => <rect key={`${r}-${i}`} x={i * cell} y={r * cell} width={cell} height={cell} fill={heat(t(c.rssi))} />))}
                {rooms.map((r) => <text key={r.id} x={r.x + 6} y={r.y + 14} className="p3e-halo">{r.name}</text>)}
                {walls.map((w, i) => <line key={i} x1={w[0]} y1={w[1]} x2={w[2]} y2={w[3]} stroke="var(--jp-text)" strokeWidth="3" />)}
                {aps.map((a) => <g key={a.id}><circle cx={a.x} cy={a.y} r="9" fill="var(--jp-surface-raised)" stroke="var(--jp-text)" strokeWidth="2.5" /><path d={`M${a.x - 4},${a.y + 1}a4.5,4.5 0 0 1 8,0M${a.x - 2},${a.y + 3.5}a2,2 0 0 1 4,0`} fill="none" stroke="var(--jp-text)" strokeWidth="1.5" /><text x={a.x} y={a.y + 22} textAnchor="middle" className="p3e-halo">{a.id}</text></g>)}
                {cur.on && <rect x={cur.pos[1] * cell} y={cur.pos[0] * cell} width={cell} height={cell} fill="none" stroke="var(--jp-text)" strokeWidth="3" />}
              </Svg>
            </div>
          </Scroll>
          <Readout>{cur.text}</Readout>
          <div className="p3e-controls"><HeatScale lo="-90 dBm" hi="-50 dBm" /><span className="pc-note">{RSSI_BANDS.map((b, i) => `${b.name} ${pct(share(i))}`).join(" · ")}</span></div>
          <Note>Prediction, not a site survey: free-space path loss exponent 3 and 7 dB per wall crossed. Verify with measurements before moving access points.</Note>
        </>
      )}
    </Chart>
  );
}
