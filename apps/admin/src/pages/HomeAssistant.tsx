import { useEffect, useRef, useState } from "react";
import { Avatar, Badge, Btn, Dot } from "@belikh/jupiter-ui/kit.tsx";
import { Gauge, ProgressBar, Spark } from "@belikh/jupiter-ui/Charts.tsx";
import { Icon, Spot } from "@belikh/jupiter-ui/Icon.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { useHa, type HaEntity } from "../ha/source.ts";
import { ALARM_LABEL, AUTOMATIONS, BATTERIES, COVERS, LOCKS, PERSONS, ROOMS, TOGGLES, WEATHER_ICON, friendly, roomName } from "../ha/entities.ts";
import "../ha/ha.css";

const f1 = (v: number) => (Number.isFinite(v) ? v.toFixed(1) : "–");
const kw = (v: number) => (Number.isFinite(v) ? Math.abs(v).toFixed(1) : "–");

/** Animated energy-flow diagram: solar → house ← grid, with the battery below. + grid = import, + battery = charging. */
function EnergyFlow({ solar, grid, batt, house, soc }: { solar: number; grid: number; batt: number; house: number; soc: number }) {
  const W = 560, H = 300;
  const n = { solar: [90, 60], grid: [470, 60], house: [280, 150], batt: [280, 250] } as const;
  const lines: { id: string; d: string; v: number; color: string; rev?: boolean }[] = [
    { id: "solar", d: `M${n.solar[0] + 40},${n.solar[1] + 24} Q${n.solar[0] + 120},${n.house[1] - 10} ${n.house[0] - 52},${n.house[1] - 8}`, v: solar, color: "var(--jp-warn)" },
    { id: "grid", d: `M${n.grid[0] - 40},${n.grid[1] + 24} Q${n.grid[0] - 120},${n.house[1] - 10} ${n.house[0] + 52},${n.house[1] - 8}`, v: Math.abs(grid), color: grid > 0 ? "var(--jp-danger)" : "var(--jp-ok)", rev: grid < 0 },
    { id: "batt", d: `M${n.house[0]},${n.house[1] + 42} L${n.batt[0]},${n.batt[1] - 40}`, v: Math.abs(batt), color: "var(--jp-info)", rev: batt < 0 },
  ];
  const Node = ({ x, y, icon, label, value, sub }: { x: number; y: number; icon: string; label: string; value: string; sub?: string }) => (
    <g transform={`translate(${x},${y})`}>
      <rect className="ha-node" x={-62} y={-42} width={124} height={84} rx={10} />
      <text className="ha-lbl" x={0} y={-22} textAnchor="middle">{label}</text>
      <text className="ha-kw" x={0} y={6} textAnchor="middle">{value}<tspan className="ha-lbl" dx="4">kW</tspan></text>
      {sub && <text className="ha-lbl" x={0} y={28} textAnchor="middle">{sub}</text>}
      <foreignObject x={-62} y={-42} width={26} height={26}><span style={{ display: "grid", placeItems: "center", color: "var(--jp-text-muted)", paddingTop: 4, paddingLeft: 6 }}><Icon name={icon} size={16} /></span></foreignObject>
    </g>
  );
  return (
    <svg className="ha-flow" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Energy flow: solar ${kw(solar)} kW, house ${kw(house)} kW, grid ${grid > 0 ? "import" : "export"} ${kw(grid)} kW, battery ${batt > 0 ? "charging" : "discharging"} ${kw(batt)} kW at ${Math.round(soc)}%`}>
      {lines.map((l) => (<g key={l.id}><path className="ha-wire" d={l.d} strokeWidth={4} />
        <path className={`ha-pulse ${l.rev ? "is-rev" : ""} ${l.v < 0.05 ? "is-idle" : ""}`} d={l.d} stroke={l.color} strokeWidth={Math.min(9, 3 + l.v * 1.4)} /></g>))}
      <Node x={n.solar[0]} y={n.solar[1]} icon="sun" label="Solar" value={kw(solar)} />
      <Node x={n.grid[0]} y={n.grid[1]} icon="bolt" label={grid > 0 ? "Grid import" : "Grid export"} value={kw(grid)} />
      <Node x={n.house[0]} y={n.house[1]} icon="home" label="House" value={kw(house)} />
      <Node x={n.batt[0]} y={n.batt[1]} icon="battery" label={batt > 0.05 ? "Battery charging" : batt < -0.05 ? "Battery discharging" : "Battery idle"} value={kw(batt)} sub={`${Math.round(soc)}% charged`} />
    </svg>
  );
}

function Alarm({ state, call }: { state: string; call: (d: string, s: string, data?: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }> }) {
  const [pin, setPin] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const armed = state.startsWith("armed"); const mode = (s: string) => state === s;
  const run = async (service: string) => {
    if (pin.length < 4) return setErr("Enter your 4-digit code");
    setBusy(true); const r = await call("alarm_control_panel", service, { entity_id: "alarm_control_panel.home", code: pin }); setBusy(false);
    setErr(r.ok ? "" : r.error ?? "Failed"); setPin("");
  };
  return (
    <div className="ha-row" style={{ alignItems: "flex-start", justifyContent: "space-around" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span className={`ha-alarm ${armed ? "is-armed" : ""} ${state === "triggered" ? "is-triggered" : ""}`}><Icon name="shield" size={20} />{ALARM_LABEL[state] ?? state}</span>
        <div className="ha-modes" role="group" aria-label="Alarm mode">
          <button type="button" aria-pressed={mode("disarmed")} disabled={busy} onClick={() => run("alarm_disarm")}>Disarm</button>
          <button type="button" aria-pressed={mode("armed_home")} disabled={busy} onClick={() => run("alarm_arm_home")}>Home</button>
          <button type="button" aria-pressed={mode("armed_away")} disabled={busy} onClick={() => run("alarm_arm_away")}>Away</button>
        </div>
        <div className="ha-err" role="alert">{err}</div>
        <span className="ha-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>Demo code: 1234</span>
      </div>
      <div>
        <div className="ha-pin" aria-label={`${pin.length} of 4 digits entered`}>{[0, 1, 2, 3].map((i) => <i key={i} className={i < pin.length ? "is-on" : ""} />)}</div>
        <div className="ha-keypad" style={{ marginTop: 12 }}>
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"].map((k) => (
            <button key={k} type="button" aria-label={k === "C" ? "Clear" : k === "⌫" ? "Backspace" : `Digit ${k}`} onClick={() => { setErr(""); setPin((p) => (k === "C" ? "" : k === "⌫" ? p.slice(0, -1) : p.length < 4 ? p + k : p)); }}>{k}</button>))}
        </div>
      </div>
    </div>
  );
}

export function HomeAssistant() {
  const { get, num, history, call, entities } = useHa(); const { toast } = usePrefs();
  const wall = useRef<HTMLDivElement>(null); const [full, setFull] = useState(false); const [now, setNow] = useState(() => new Date());
  const [pend, setPend] = useState<Record<string, string>>({});
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { const h = () => setFull(document.fullscreenElement === wall.current); document.addEventListener("fullscreenchange", h); return () => document.removeEventListener("fullscreenchange", h); }, []);
  const toggleFull = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void wall.current?.requestFullscreen?.(); };

  /** Optimistic: show the desired state immediately, drop the overlay when the service call settles. */
  const toggle = async (id: string, domain: string, service: string, next: string) => {
    setPend((p) => ({ ...p, [id]: next }));
    const r = await call(domain, service, { entity_id: id });
    setPend((p) => { const { [id]: _drop, ...rest } = p; void _drop; return rest; });
    if (!r.ok) toast({ kind: "danger", title: `Couldn’t ${service.replace(/_/g, " ")}`, body: r.error });
  };
  const view = (e: HaEntity | undefined) => (e ? pend[e.entity_id] ?? e.state : "unknown");

  const solar = num("sensor.solar_power"), grid = num("sensor.grid_power"), batt = num("sensor.battery_power"), house = num("sensor.house_power"), soc = num("sensor.battery_soc");
  const weather = get("weather.home"); const alarm = get("alarm_control_panel.home")?.state ?? "disarmed";
  const home = PERSONS.filter((p) => get(p)?.state === "home").length;
  const low = BATTERIES.filter((b) => num(b) < 25).length;
  const dl = num("sensor.wan_download"), ul = num("sensor.wan_upload");

  return (
    <div className="ha-wall" ref={wall} aria-label="Home Assistant panel">
      <header className="ha-head">
        <div><div className="ha-time">{now.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}</div><div className="ha-date">{now.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}</div></div>
        <span className="ha-grow" style={{ flex: 1 }} />
        <span className={`ha-alarm ${alarm.startsWith("armed") ? "is-armed" : ""} ${alarm === "triggered" ? "is-triggered" : ""}`}><Icon name="shield" size={20} />{ALARM_LABEL[alarm] ?? alarm}</span>
        <span className="ha-chip"><Icon name="user" size={16} />{home} home</span>
        {low > 0 && <Badge s="warn">{low} low battery</Badge>}
        <Badge s="info">simulated data</Badge>
        <Btn icon="monitor" onClick={toggleFull} aria-pressed={full} style={{ minHeight: 48 }}>{full ? "Exit full screen" : "Full screen"}</Btn>
      </header>

      <div className="ha-grid">
        <section className="ha-card ha-card--8" aria-label="Energy">
          <h2><Icon name="bolt" size={16} />Energy <span className="ha-grow" /><span>{f1(house)} kW house load</span></h2>
          <EnergyFlow solar={solar} grid={grid} batt={batt} house={house} soc={soc} />
          <div className="ha-row" style={{ justifyContent: "space-between" }}>
            <span>Solar <Spark data={history("sensor.solar_power")} kind="area" color="var(--jp-warn)" w={120} h={28} /></span>
            <span>House <Spark data={history("sensor.house_power")} kind="area" w={120} h={28} /></span>
            <span>Grid <Spark data={history("sensor.grid_power")} kind="line" color="var(--jp-danger)" w={120} h={28} /></span>
          </div>
        </section>
        <section className="ha-card" aria-label="Power gauges">
          <h2><Icon name="pulse" size={16} />Load and charge</h2>
          <div className="ha-row" style={{ justifyContent: "space-around" }}>
            <Gauge value={Math.round(house * 10) / 10} max={8} unit=" kW" label="House" zones={[0.4, 0.75]} size={170} />
            <Gauge value={Math.round(soc)} max={100} unit="%" label="Battery" zones={[2, 2]} size={170} />
          </div>
        </section>

        <section className="ha-card ha-card--8" aria-label="Climate">
          <h2><Icon name="thermometer" size={16} />Climate and occupancy</h2>
          <div className="ha-rooms">
            {ROOMS.map((r) => {
              const occ = get(`binary_sensor.${r}_csi_occupancy`); const people = Number(occ?.attributes.people ?? 0);
              return (
                <div key={r} className={`ha-room ${occ?.state === "on" ? "is-occ" : ""}`}>
                  <b>{roomName(r)}</b>
                  <span className="ha-big">{f1(num(`sensor.${r}_temperature`))}<small>°C</small></span>
                  <span className="ha-muted"><Icon name="drop" size={14} /> {Math.round(num(`sensor.${r}_humidity`))}%</span>
                  <Spark data={history(`sensor.${r}_temperature`)} w={150} h={28} />
                  <span className={`ha-chip ${occ?.state === "on" ? "is-on" : ""}`}><Icon name="wifi" size={14} />{occ?.state === "on" ? `${people || 1} detected` : "empty"}</span>
                </div>);
            })}
          </div>
        </section>
        <section className="ha-card" aria-label="Weather and network">
          <h2><Icon name={WEATHER_ICON[weather?.state ?? "sunny"] ?? "sun"} size={16} />Weather and network</h2>
          <div className="ha-row"><Icon name={WEATHER_ICON[weather?.state ?? "sunny"] ?? "sun"} size={48} /><div><div className="ha-big">{Math.round(Number(weather?.attributes.temperature ?? 0))}<small>°C</small></div><div className="ha-muted">{friendly(weather)} · {String(weather?.state ?? "").replace("-", " ")} · wind {String(weather?.attributes.wind_speed ?? "–")} km/h</div></div></div>
          <hr style={{ width: "100%" }} />
          <div className="ha-row" style={{ justifyContent: "space-between" }}><div><div className="ha-muted">WAN ↓ / ↑</div><div className="ha-big">{Math.round(dl)}<small>/ {Math.round(ul)} Mbit/s</small></div></div><div><div className="ha-muted">Wi-Fi clients</div><div className="ha-big">{Math.round(num("sensor.unifi_clients"))}</div></div></div>
          <Spark data={history("sensor.wan_download")} kind="area" color="var(--jp-info)" w={300} h={40} />
        </section>

        <section className="ha-card ha-card--8" aria-label="Lights and switches">
          <h2><Icon name="lightbulb" size={16} />Lights and switches <span className="ha-grow" /><span className="ha-muted">tap to toggle</span></h2>
          <div className="ha-tiles">
            {TOGGLES.map(([id, icon]) => {
              const e = get(id); const st = view(e); const on = st === "on"; const domain = id.split(".")[0];
              return (
                <button key={id} type="button" className={`ha-tile ${pend[id] ? "is-pending" : ""}`} aria-pressed={on} aria-label={`${friendly(e, id)}: ${st}`} onClick={() => toggle(id, domain, on ? "turn_off" : "turn_on", on ? "off" : "on")}>
                  <Icon name={icon} size={24} /><b>{friendly(e, id)}</b><small>{pend[id] ? "…" : st}</small></button>);
            })}
          </div>
        </section>
        <section className="ha-card" aria-label="Locks and covers">
          <h2><Icon name="lock" size={16} />Locks and covers</h2>
          <div className="ha-tiles">
            {LOCKS.map((id) => { const e = get(id); const st = view(e); const locked = st === "locked"; return (
              <button key={id} type="button" className={`ha-tile ha-tile--ok ${locked ? "" : "ha-tile--warn"} ${pend[id] ? "is-pending" : ""}`} aria-pressed={locked} aria-label={`${friendly(e, id)}: ${st}`} onClick={() => toggle(id, "lock", locked ? "unlock" : "lock", locked ? "unlocked" : "locked")}>
                <Icon name={locked ? "lock" : "unlock"} size={24} /><b>{friendly(e, id)}</b><small>{pend[id] ? "…" : st}</small></button>); })}
            {COVERS.map((id) => { const e = get(id); const st = view(e); const open = st === "open"; return (
              <button key={id} type="button" className={`ha-tile ${pend[id] ? "is-pending" : ""}`} aria-pressed={open} aria-label={`${friendly(e, id)}: ${st}`} onClick={() => toggle(id, "cover", open ? "close_cover" : "open_cover", open ? "closed" : "open")}>
                <Icon name="home" size={24} /><b>{friendly(e, id)}</b><small>{pend[id] ? "…" : st}</small></button>); })}
          </div>
        </section>

        <section className="ha-card" aria-label="Presence">
          <h2><Icon name="user" size={16} />Presence</h2>
          <ul className="ha-list">{PERSONS.map((p) => { const e = get(p); const at = e?.state === "home"; return (
            <li key={p}><span className="ha-row"><Avatar name={friendly(e, p)} size={40} s={at ? "ok" : "off"} /><b>{friendly(e, p)}</b></span><Badge s={at ? "ok" : undefined}>{at ? "home" : "away"}</Badge></li>); })}</ul>
          <div className="ha-row">{ROOMS.filter((r) => get(`binary_sensor.${r}_csi_occupancy`)?.state === "on").map((r) => <span key={r} className="ha-chip is-on"><Dot s="info" />{roomName(r)}</span>)}</div>
        </section>
        <section className="ha-card" aria-label="Batteries">
          <h2><Icon name="battery" size={16} />Device batteries</h2>
          <ul className="ha-list">{BATTERIES.map((id) => { const e = get(id); const v = num(id); const s = v < 15 ? "danger" : v < 30 ? "warn" : undefined; return (
            <li key={id}><span>{friendly(e, id)}</span><span style={{ fontFamily: "var(--jp-font-mono)" }}>{Math.round(v)}%{s && <> <Badge s={s}>{s === "danger" ? "replace" : "low"}</Badge></>}</span><span className="ha-bar"><ProgressBar value={v} s={s} label={friendly(e, id)} /></span></li>); })}</ul>
        </section>
        <section className="ha-card ha-card--6" aria-label="Alarm">
          <h2><Icon name="shield" size={16} />Alarm panel</h2>
          <Alarm state={alarm} call={call} />
        </section>

        <section className="ha-card ha-card--12" aria-label="Automations">
          <h2><Icon name="settings" size={16} />Quick automations <span className="ha-grow" /><span className="ha-muted">{entities.length} entities</span></h2>
          <div className="ha-row">
            {AUTOMATIONS.map(([id, icon]) => { const e = get(id); const last = e?.attributes.last_triggered as string | null | undefined; return (
              <button key={id} type="button" className="ha-act" aria-label={`Run ${friendly(e, id)}`} onClick={async () => { const r = await call("automation", "trigger", { entity_id: id }); toast({ kind: r.ok ? "ok" : "danger", title: r.ok ? `${friendly(e, id)} triggered` : "Failed", body: r.error }); }}>
                <Icon name={icon} size={20} />{friendly(e, id)}{last && <small className="ha-muted"> · {new Date(last).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}</small>}</button>); })}
            <span style={{ flex: 1 }} /><Spot name="smart-home" size={64} />
          </div>
        </section>
      </div>
    </div>
  );
}
