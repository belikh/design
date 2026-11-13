import { rng } from "../../../data/fixtures.ts";

export const METRICS = [
  { id: "http_requests", label: "HTTP requests", unit: "req", base: 900, amp: 500 }, { id: "latency_ms", label: "Latency", unit: "ms", base: 120, amp: 60 }, { id: "cpu_percent", label: "CPU", unit: "%", base: 45, amp: 25 },
  { id: "memory_mb", label: "Memory", unit: "MB", base: 1800, amp: 400 }, { id: "queue_depth", label: "Queue depth", unit: "jobs", base: 14, amp: 12 }, { id: "errors", label: "Errors", unit: "err", base: 12, amp: 14 },
] as const;
export const DIMS: Record<string, string[]> = { service: ["jupiter-api", "media-archive", "ha-bridge", "wg-gateway", "unifi-controller"], region: ["brisbane", "sydney", "home"] };
export type MetricId = (typeof METRICS)[number]["id"];
export const HOURS = 168; const END = new Date(2026, 10, 12, 17, 0).getTime();
export type Point = { h: number; metric: MetricId; service: string; region: string; v: number };
const build = (): Point[] => {
  const out: Point[] = [];
  METRICS.forEach((m, mi) => DIMS.service.forEach((s, si) => DIMS.region.forEach((rg, ri) => {
    const g = rng(mi * 1000 + si * 100 + ri * 10 + 7); const scale = 0.6 + si * 0.22 + ri * 0.12;
    for (let h = 0; h < HOURS; h++) { const day = Math.sin(((h % 24) - 6) / 24 * Math.PI * 2) * 0.5 + 0.5; let v = (m.base + m.amp * day) * scale * (0.85 + g() * 0.3); if (m.id === "errors" && h % 61 === 20) v *= 6; if (m.id === "latency_ms" && s === "media-archive" && h > 140) v *= 2.2; out.push({ h, metric: m.id, service: s, region: rg, v: Math.round(v * 10) / 10 }); }
  })));
  return out;
};
let cache: Point[] | null = null; export const points = () => (cache ??= build());
export const hourLabel = (h: number) => { const d = new Date(END - (HOURS - 1 - h) * 3600_000); return `${d.getDate()} ${d.toLocaleString("en-AU", { month: "short" })} ${String(d.getHours()).padStart(2, "0")}:00`; };
export type Agg = "sum" | "avg" | "min" | "max" | "p95";
export type Query = { metric: MetricId; agg: Agg; groupBy: string[]; filters: Record<string, string[]>; hours: number; step: number };
const pct = (a: number[], p: number) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0; };
const reduce = (a: number[], agg: Agg) => (agg === "sum" ? a.reduce((x, y) => x + y, 0) : agg === "avg" ? a.reduce((x, y) => x + y, 0) / (a.length || 1) : agg === "min" ? Math.min(...a) : agg === "max" ? Math.max(...a) : pct(a, 0.95));
export function queryMetrics(q: Query): { labels: string[]; series: { name: string; data: number[] }[]; matched: number } {
  const from = HOURS - Math.min(HOURS, q.hours); const step = Math.max(1, q.step);
  const rows = points().filter((p) => p.metric === q.metric && p.h >= from && Object.entries(q.filters).every(([d, vs]) => !vs.length || vs.includes((p as unknown as Record<string, string>)[d])));
  const groups = new Map<string, Point[]>(); for (const p of rows) { const key = q.groupBy.length ? q.groupBy.map((d) => (p as unknown as Record<string, string>)[d]).join(" · ") : "all"; (groups.get(key) ?? groups.set(key, []).get(key)!).push(p); }
  const buckets: number[] = []; for (let h = from; h < HOURS; h += step) buckets.push(h);
  const series = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([name, ps]) => ({ name, data: buckets.map((b) => { const at = ps.filter((p) => p.h >= b && p.h < b + step); const byH = new Map<number, number[]>(); at.forEach((p) => (byH.get(p.h) ?? byH.set(p.h, []).get(p.h)!).push(p.v)); const perHour = [...byH.values()].map((vs) => reduce(vs, q.agg)); return Math.round(reduce(perHour.length ? perHour : [0], q.agg === "sum" ? "sum" : q.agg === "p95" ? "avg" : q.agg) * 10) / 10; }) }));
  return { labels: buckets.map(hourLabel), series, matched: rows.length };
}
