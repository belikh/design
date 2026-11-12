// Seeded, deterministic sample data: same numbers on every load, so screenshots and visual diffs are stable.
export function rng(seed: number) {
  let s = Math.imul(seed ^ 0x9e3779b9, 2654435761) >>> 0;
  const next = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 4; i++) next(); // decorrelate nearby seeds
  return next;
}
const r = rng(20261112);
const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
const int = (lo: number, hi: number) => Math.floor(lo + r() * (hi - lo + 1));

export const first = ["Ava", "Noah", "Mia", "Liam", "Isla", "Ethan", "Zoe", "Lucas", "Ruby", "Jack", "Matilda", "Oliver", "Chloe", "Henry", "Sophie", "Archie", "Ella", "Leo", "Grace", "Max"];
export const last = ["Nguyen", "Smith", "Patel", "Williams", "Brown", "Wilson", "Taylor", "Evans", "Kelly", "Murphy", "Chen", "Singh", "Walker", "Hughes", "Moore"];
export const regions = ["Brisbane", "Sydney", "Melbourne", "Perth", "Adelaide", "Hobart", "Darwin"];
export const people = Array.from({ length: 14 }, () => `${pick(first)} ${pick(last)}`);

export type OrderStatus = "paid" | "pending" | "refunded" | "failed";
export type Order = { id: string; customer: string; email: string; status: OrderStatus; amount: number; items: number; region: string; created: string; owner: string; progress: number; trend: number[]; paid: boolean; note: string };
export const orders: Order[] = Array.from({ length: 240 }, (_, i) => {
  const name = `${pick(first)} ${pick(last)}`;
  const d = new Date(2026, 10, 12 - int(0, 120));
  return {
    id: `ORD-${String(10240 - i).padStart(5, "0")}`, customer: name, email: `${name.toLowerCase().replace(" ", ".")}@example.com`,
    status: pick<OrderStatus>(["paid", "paid", "paid", "pending", "pending", "refunded", "failed"]), amount: Math.round((20 + r() * r() * 2400) * 100) / 100, items: int(1, 9),
    region: pick(regions), created: d.toISOString().slice(0, 10), owner: pick(people), progress: int(0, 100), trend: Array.from({ length: 8 }, () => int(2, 20)), paid: r() > 0.3, note: "",
  };
});

export function series(n: number, base: number, amp: number, seed = 1, trend = 0) {
  const g = rng(seed * 7919);
  return Array.from({ length: n }, (_, i) => Math.max(0, Math.round(base + trend * i + Math.sin((i / n) * Math.PI * 4 + seed) * amp + (g() - 0.5) * amp * 0.8)));
}
export const days = (n: number, end = new Date(2026, 10, 12)) => Array.from({ length: n }, (_, i) => { const d = new Date(end); d.setDate(end.getDate() - (n - 1 - i)); return `${d.getDate()} ${d.toLocaleString("en-AU", { month: "short" })}`; });

export type Service = { name: string; region: string; status: "ok" | "warn" | "danger"; latency: number; uptime: number; owner: string; days: ("ok" | "warn" | "danger" | "none")[]; spark: number[] };
export const services: Service[] = ["jupiter-api", "media-archive", "ha-bridge", "pxe-boot", "wg-gateway", "unifi-controller", "backup-zfs", "dns-resolver", "cert-manager", "mqtt-broker"].map((name, i) => {
  const g = rng(100 + i); const bad = name === "pxe-boot" ? 2 : name === "media-archive" ? 1 : 0;
  return { name, region: i % 3 === 0 ? "ap-southeast-2" : i % 3 === 1 ? "brisbane" : "home", status: (["ok", "warn", "danger"] as const)[bad], latency: Math.round(8 + g() * 190), uptime: bad === 2 ? 97.2 : bad === 1 ? 99.4 : 99.9 + g() * 0.09,
    owner: people[i], days: Array.from({ length: 60 }, (_, d) => (g() > 0.97 && d > 5 ? (g() > 0.5 ? "warn" : "danger") : bad && d > 52 ? (bad === 2 ? "danger" : "warn") : "ok")), spark: series(14, 40 + i * 5, 14, i + 2) };
});

export const logLevels = ["debug", "info", "warn", "error"] as const;
export type LogLine = { t: string; level: (typeof logLevels)[number]; svc: string; msg: string };
const msgs = ["request completed in {n} ms", "cache miss for key user:{n}", "retrying upstream (attempt {n}/5)", "certificate renews in {n} days", "connection reset by peer", "deploy rolled out ({n}/3 pods)", "ZFS scrub finished, 0 errors", "client {n} associated on VLAN 20", "timeout waiting for lease", "disk latency above threshold ({n} ms)"];
export const logs: LogLine[] = Array.from({ length: 400 }, (_, i) => {
  const lv = pick<LogLine["level"]>(["debug", "info", "info", "info", "warn", "error"]); const m = pick(msgs).replace("{n}", String(int(2, 900)));
  const t = new Date(2026, 10, 12, 16, 40, 59 - Math.floor(i * 1.7)); return { t: t.toISOString().slice(11, 19), level: lv, svc: pick(services).name, msg: m };
});

export type Task = { id: string; title: string; col: "backlog" | "doing" | "review" | "done"; who: string; tag: string; pts: number };
export const tasks: Task[] = [
  ["Migrate DNS to unbound", "backlog", "infra", 5], ["Add UniFi VLAN for cameras", "backlog", "network", 3], ["Rotate WireGuard keys", "backlog", "security", 2], ["Write ESPHome OTA doc", "backlog", "docs", 1],
  ["Port theme to Slint", "doing", "design", 8], ["ZFS scrub schedule", "doing", "infra", 3], ["Cert expiry alerts", "doing", "ops", 2],
  ["Review GTK widgets CSS", "review", "design", 2], ["HACS submission", "review", "ha", 3],
  ["Token editor to page", "done", "design", 5], ["LaTeX invoice template", "done", "docs", 3], ["Release workflow", "done", "ci", 5],
].map(([title, col, tag, pts], i) => ({ id: `T-${i + 1}`, title: title as string, col: col as Task["col"], who: people[i % people.length], tag: tag as string, pts: pts as number }));

export type Activity = { who: string; what: string; target: string; when: string; kind: "ok" | "warn" | "danger" | "info" };
export const activity: Activity[] = [
  { who: "Ava Nguyen", what: "deployed", target: "jupiter-api v4.12.0", when: "2m ago", kind: "ok" },
  { who: "System", what: "raised alert", target: "pxe-boot unreachable", when: "9m ago", kind: "danger" },
  { who: "Noah Smith", what: "commented on", target: "ORD-10231", when: "21m ago", kind: "info" },
  { who: "System", what: "ZFS scrub finished on", target: "tank (0 errors)", when: "1h ago", kind: "ok" },
  { who: "Mia Patel", what: "changed role of", target: "Liam Williams to Editor", when: "2h ago", kind: "info" },
  { who: "System", what: "certificate renews in 9 days:", target: "jupiter.au", when: "3h ago", kind: "warn" },
  { who: "Zoe Chen", what: "refunded", target: "ORD-10199 ($182.00)", when: "5h ago", kind: "warn" },
];

export const heat = { rows: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], cols: Array.from({ length: 12 }, (_, i) => `${i * 2}h`), data: Array.from({ length: 7 }, (_, d) => Array.from({ length: 12 }, (_, h) => Math.round(10 + (d < 5 ? 1 : 0.4) * 80 * Math.exp(-((h - 6) ** 2) / 8) + r() * 12))) };
export const calendarValues = Array.from({ length: 26 * 7 }, (_, i) => (r() > 0.25 ? int(0, 12) * (i % 7 < 5 ? 1 : 0.3) : 0));
export const money = (v: number) => v.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
export const num = (v: number) => v.toLocaleString("en-AU");
