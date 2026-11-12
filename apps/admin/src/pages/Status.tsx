import { Badge, Panel, Alert, Dot } from "@belikh/jupiter-ui/kit.tsx";
import { UptimeBars } from "@belikh/jupiter-ui/Charts.tsx";
import { services } from "../data/fixtures.ts";

const incidents = [
  { date: "12 Nov", title: "PXE boot unreachable", s: "danger" as const, status: "Investigating", updates: [["16:31", "We are investigating failures to network-boot hosts from the PXE server."], ["16:12", "Monitoring detected repeated timeouts from pxe-boot."]] },
  { date: "9 Nov", title: "Elevated media-archive latency", s: "warn" as const, status: "Resolved", updates: [["11:05", "Resolved. A ZFS scrub finished and latency is back to normal."], ["09:40", "Latency is elevated while a scrub runs."]] },
  { date: "2 Nov", title: "Certificate renewal delayed", s: "ok" as const, status: "Resolved", updates: [["08:20", "The renewal completed after a DNS-01 retry."]] },
];
export function Status() {
  const down = services.filter((s) => s.status === "danger").length, warn = services.filter((s) => s.status === "warn").length;
  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <header className="adm-pagehead"><div className="adm-row"><h1>Jupiter status</h1><span className="adm-spacer" /><button className="jp-btn jp-btn--secondary jp-btn--sm">Subscribe to updates</button></div></header>
      <Alert s={down ? "danger" : warn ? "warn" : "ok"} title={down ? "Partial outage" : warn ? "Degraded performance" : "All systems operational"}>{down ? "One system is affected. We’re working on it." : "Everything is running normally."}</Alert>
      <Panel className="adm-section" title="Components" flush>
        {services.map((s, i) => (
          <div key={s.name} style={{ padding: "14px 16px", borderTop: i ? "1px solid var(--jp-border)" : 0 }}>
            <div className="adm-row" style={{ marginBottom: 6 }}><Dot s={s.status} /><b className="adm-num">{s.name}</b><span className="adm-spacer" /><Badge s={s.status}>{s.status === "ok" ? "operational" : s.status === "warn" ? "degraded" : "outage"}</Badge><span className="jp-muted adm-num">{s.uptime.toFixed(2)}%</span></div>
            <UptimeBars days={s.days} /><div className="adm-row jp-muted" style={{ justifyContent: "space-between", fontSize: "var(--jp-fs-xs)", marginTop: 4 }}><span>60 days ago</span><span>Today</span></div>
          </div>
        ))}
      </Panel>
      <section className="adm-section"><h2>Past incidents</h2>
        <ol className="adm-timeline">{incidents.map((i) => (
          <li key={i.title}><span className={`adm-timeline__dot adm-dot--${i.s}`} /><div><div className="adm-row"><b>{i.title}</b><Badge s={i.s}>{i.status}</Badge><span className="jp-muted">{i.date}</span></div>
            {i.updates.map(([t, m]) => <p key={t} style={{ marginTop: 6 }}><span className="adm-num jp-muted">{t}</span>  {m}</p>)}</div></li>))}</ol>
      </section>
    </div>
  );
}
