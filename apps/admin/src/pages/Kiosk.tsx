import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { services, series, days } from "../data/fixtures.ts";
import { LineChart, Gauge, UptimeBars } from "@belikh/jupiter-ui/Charts.tsx";
import { Spot } from "@belikh/jupiter-ui/Icon.tsx";

export function Kiosk() {
  const [now, setNow] = useState(new Date(2026, 10, 12, 16, 52)); const [slide, setSlide] = useState(0); const [t, setT] = useState(0);
  useEffect(() => { const i = setInterval(() => { setNow((n) => new Date(n.getTime() + 1000)); setT((x) => { if (x >= 9) { setSlide((s) => (s + 1) % 3); return 0; } return x + 1; }); }, 1000); return () => clearInterval(i); }, []);
  const bad = services.filter((s) => s.status !== "ok").length;
  return (
    <div className="adm-kiosk" data-theme="dark">
      <header><div><div className="adm-kiosk__time">{now.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}</div><div className="jp-muted">{now.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}</div></div>
        <div className={`adm-kiosk__banner ${bad ? "is-warn" : "is-ok"}`}>{bad ? `${bad} services need attention` : "All systems operational"}</div><Link to="/" className="jp-muted">Exit kiosk</Link></header>
      <main>
        {slide === 0 && <div className="adm-kiosk__grid">{services.slice(0, 8).map((s) => <div key={s.name} className={`adm-kiosk__tile is-${s.status}`}><b>{s.name}</b><span className="adm-kiosk__big">{s.latency}<small> ms</small></span><UptimeBars days={s.days.slice(-30)} /></div>)}</div>}
        {slide === 1 && <div className="adm-kiosk__two"><div className="adm-kiosk__panel"><h2>Requests (24h)</h2><LineChart area smooth height={380} labels={days(24).map((_, i) => `${i}h`)} series={[{ name: "req/s", data: series(24, 1700, 400, 4) }]} /></div><div className="adm-kiosk__panel adm-stack" style={{ alignItems: "center" }}><Gauge value={58} label="CPU" size={300} /><Gauge value={71} label="Memory" size={300} /></div></div>}
        {slide === 2 && <div className="adm-kiosk__idle"><Spot name="kangaroo" size={320} /><h1>Everything is running smoothly</h1><p className="jp-muted">Last incident 3 days ago · uptime 99.94%</p></div>}
      </main>
      <footer><div className="adm-kiosk__bar"><i style={{ width: `${(t + 1) * 10}%` }} /></div><span className="jp-muted">Slide {slide + 1} / 3</span></footer>
    </div>
  );
}
