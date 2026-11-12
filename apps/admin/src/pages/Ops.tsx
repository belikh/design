import { useEffect, useState } from "react";
import { PageHeader, Panel, Badge, Dot, Btn } from "@belikh/jupiter-ui/kit.tsx";
import { Gauge, Spark, UptimeBars, ProgressBar, StatTile, LineChart } from "@belikh/jupiter-ui/Charts.tsx";
import { Switch } from "@belikh/jupiter-ui/inputs.tsx";
import { services, series, days } from "../data/fixtures.ts";

export function Ops() {
  const [live, setLive] = useState(true); const [tick, setTick] = useState(0);
  useEffect(() => { if (!live) return; const t = setInterval(() => setTick((x) => x + 1), 1500); return () => clearInterval(t); }, [live]);
  const wob = (b: number, a: number, s: number) => Math.max(1, Math.min(99, Math.round(b + Math.sin(tick / 2 + s) * a)));
  const rps = 1840 + Math.round(Math.sin(tick / 2) * 220) + tick * 3;
  const bad = services.filter((s) => s.status !== "ok");
  return (
    <>
      <PageHeader title="Operations wall" desc="Dense, glanceable, auto-refreshing." crumbs={["Dashboards", "Operations"]}
        status={<Badge s={bad.length ? "warn" : "ok"}>{bad.length ? `${bad.length} need attention` : "all clear"}</Badge>}
        actions={<><Switch checked={live} onChange={setLive} label="Live" /><span className="jp-muted adm-num">tick {tick}</span><Btn icon="refresh" onClick={() => setTick(tick + 1)}>Refresh now</Btn></>} />
      <div className="adm-grid adm-grid--4">
        <StatTile label="Requests / s" value={rps.toLocaleString()} delta={3.2} spark={series(14, 30, 8, 2).map((v, i) => v + (i === 13 ? tick % 5 : 0))} sub="live" />
        <StatTile label="Error rate" value="0.12%" delta={-0.03} invert spark={series(14, 20, 6, 3)} sub="5m" /><StatTile label="Queue depth" value={String(14 + (tick % 9))} spark={series(14, 14, 7, 4)} sub="jobs" /><StatTile label="Active alerts" value={String(bad.length)} spark={series(14, 3, 2, 5)} sub="now" />
      </div>
      <div className="adm-grid adm-grid--4" style={{ marginTop: 16 }}>
        {[["CPU", wob(54, 14, 0)], ["Memory", wob(71, 6, 1)], ["Disk (tank)", 83], ["Network", wob(32, 20, 2)]].map(([l, v]) => <Panel key={l as string}><Gauge value={v as number} label={l as string} zones={[0.6, 0.85]} size={190} /></Panel>)}
      </div>
      <div className="adm-grid adm-grid--21" style={{ marginTop: 16 }}>
        <Panel title="Throughput (last 24h)"><LineChart area smooth height={200} labels={days(24).map((_, i) => `${i}:00`)} series={[{ name: "req/s", data: series(24, 1700, 400, 4) }, { name: "errors", data: series(24, 40, 20, 6), color: "var(--jp-danger)" }]} /></Panel>
        <Panel title="Capacity"><div className="adm-stack">{[["ZFS tank", 83, "warn"], ["Backups", 61, ""], ["Cert pool", 22, ""], ["DHCP leases", 74, ""]].map(([l, v, s]) => <div key={l as string}><div className="adm-row" style={{ justifyContent: "space-between" }}><span>{l}</span><span className="adm-num">{v}%</span></div><ProgressBar value={v as number} s={(s as "warn") || undefined} label={l as string} /></div>)}</div></Panel>
      </div>
      <Panel title="Services" className="adm-section" flush>
        <div className="adm-ops-grid">
          {services.map((s) => (
            <div key={s.name} className={`adm-ops-tile is-${s.status}`}>
              <div className="adm-row"><Dot s={s.status} /><b className="adm-num">{s.name}</b><span className="adm-spacer" /><span className="jp-muted">{s.latency} ms</span></div>
              <UptimeBars days={s.days.slice(-30)} /><div className="adm-row" style={{ justifyContent: "space-between" }}><span className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>{s.uptime.toFixed(2)}% · {s.region}</span><Spark data={s.spark} w={64} h={18} /></div>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
