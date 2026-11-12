import { useEffect, useState } from "react";
import { BarChart, Donut, Gauge, LineChart, StatTile } from "@belikh/jupiter-ui/Charts.tsx";

export type WidgetDef = { id: string; title: string; desc: string };
export const WIDGETS: WidgetDef[] = [
  { id: "uptime", title: "Service uptime", desc: "Availability over the last 30 days" },
  { id: "throughput", title: "Throughput", desc: "Requests per minute, last 12 hours" },
  { id: "capacity", title: "Storage capacity", desc: "Used share of the primary array" },
  { id: "orders", title: "Orders by region", desc: "Today, by fulfilment region" },
  { id: "mix", title: "Channel mix", desc: "Share of orders by channel" },
];
const HOURS = Array.from({ length: 12 }, (_, i) => `${String(i * 2).padStart(2, "0")}:00`);
const wave = (k: number, seed: number) => HOURS.map((_, i) => Math.round(400 + 120 * Math.sin((i + seed) / 2) + ((i * 37 + seed * 11 + k) % 40)));

/** One widget, chrome-free. `tick` nudges the data so auto-refresh is visible. */
export function Widget({ id, tick = 0, title = true }: { id: string; tick?: number; title?: boolean }) {
  const def = WIDGETS.find((w) => w.id === id); if (!def) return <p role="alert">Unknown widget “{id}”.</p>;
  let body;
  if (id === "uptime") body = <StatTile label="Uptime (30 d)" value={`${(99.9 - (tick % 3) / 100).toFixed(2)}%`} delta={0.02} spark={wave(1, 2)} sub="SLO 99.5%" />;
  else if (id === "throughput") body = <LineChart labels={HOURS} series={[{ name: "req/min", data: wave(2, tick) }]} height={180} area />;
  else if (id === "capacity") body = <Gauge value={62 + (tick % 4)} label="Storage used" />;
  else if (id === "orders") body = <BarChart labels={["North", "South", "East", "West"]} series={[{ name: "Orders", data: [120 + tick, 98, 143, 87] }]} height={180} tools={false} title="Orders by region" />;
  else body = <Donut parts={[{ label: "Web", value: 52 }, { label: "Store", value: 31 }, { label: "Partner", value: 17 }]} size={150} />;
  return <figure className="p3a-widget" aria-label={def.title}>{title && <figcaption><b>{def.title}</b><span className="jp-muted">{def.desc}</span></figcaption>}{body}</figure>;
}

/** Bumps a counter every `seconds` (0 = never); used for auto-refresh. */
export function useTick(seconds: number) {
  const [n, setN] = useState(0); const [at, setAt] = useState(() => new Date());
  useEffect(() => { if (seconds <= 0) return; const t = setInterval(() => { setN((v) => v + 1); setAt(new Date()); }, seconds * 1000); return () => clearInterval(t); }, [seconds]);
  return { tick: n, at };
}
