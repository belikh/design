// Deterministic sample data for the P3e diagram gallery. Same numbers on every load.
import { rng } from "../../data/fixtures.ts";
import type { SLink, SNodeIn } from "./flow.ts";
import type { TreeIn } from "./tree.ts";
import type { Span } from "./trace.ts";
import type { User } from "./cohort.ts";
import type { Commit, Deploy } from "./git.ts";
import type { Port, Dev, Bss, AP, Wall, Sample } from "./net.ts";
import type { Fix, Pt } from "./geo.ts";

/* ---------- D041 ---------- */
export const sankeyNodes: SNodeIn[] = [
  ...["Organic", "Paid", "Email", "Referral", "Direct"].map((id) => ({ id, col: 0 })), ...["Home", "Pricing", "Blog", "Docs"].map((id) => ({ id, col: 1 })), ...["Signup", "Trial", "Bounce"].map((id) => ({ id, col: 2 })),
];
const L = (source: string, target: string, value: number): SLink => ({ source, target, value });
export const sankeyLinks: SLink[] = [
  L("Organic", "Home", 3200), L("Organic", "Blog", 2800), L("Organic", "Docs", 1500), L("Paid", "Home", 1800), L("Paid", "Pricing", 1400), L("Email", "Home", 900), L("Email", "Pricing", 700), L("Referral", "Blog", 700), L("Referral", "Docs", 600), L("Direct", "Home", 1400), L("Direct", "Docs", 300),
  L("Home", "Signup", 1500), L("Home", "Trial", 900), L("Home", "Bounce", 4900), L("Pricing", "Signup", 500), L("Pricing", "Trial", 900), L("Pricing", "Bounce", 700), L("Blog", "Signup", 400), L("Blog", "Trial", 150), L("Blog", "Bounce", 2950), L("Docs", "Signup", 450), L("Docs", "Trial", 600), L("Docs", "Bounce", 1350),
];
export const alluvialStages = ["Q1", "Q2", "Q3", "Q4"];
export const alluvialPaths: { states: string[]; value: number }[] = [
  { states: ["Free", "Free", "Free", "Free"], value: 520 }, { states: ["Free", "Free", "Pro", "Pro"], value: 140 }, { states: ["Free", "Pro", "Pro", "Pro"], value: 110 }, { states: ["Free", "Free", "Free", "Churned"], value: 90 },
  { states: ["Pro", "Pro", "Pro", "Pro"], value: 260 }, { states: ["Pro", "Pro", "Team", "Team"], value: 70 }, { states: ["Pro", "Churned", "Churned", "Churned"], value: 60 }, { states: ["Pro", "Pro", "Pro", "Churned"], value: 45 },
  { states: ["Team", "Team", "Team", "Team"], value: 150 }, { states: ["Team", "Pro", "Pro", "Pro"], value: 30 }, { states: ["Team", "Team", "Churned", "Churned"], value: 25 },
];
export const chordNames = ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide"];
/** Annual moves between capital cities (people, thousands; row = from, column = to). Diagonal is zero. */
export const chordMatrix = [[0, 38, 41, 9, 7], [34, 0, 27, 12, 14], [29, 18, 0, 8, 5], [11, 10, 7, 0, 4], [8, 12, 6, 3, 0]];
export const arcIds = ["gateway", "auth", "users", "billing", "orders", "catalog", "search", "cart", "inventory", "shipping", "notify", "email", "audit", "reports"];
const A = (s: string, t: string, v: number) => ({ source: s, target: t, value: v });
export const arcLinks = [A("gateway", "auth", 9), A("gateway", "users", 6), A("gateway", "orders", 8), A("gateway", "catalog", 7), A("gateway", "search", 5), A("gateway", "cart", 6), A("auth", "users", 8), A("orders", "billing", 7), A("orders", "inventory", 6), A("orders", "shipping", 5), A("orders", "notify", 4), A("cart", "catalog", 5), A("cart", "inventory", 4), A("catalog", "search", 6), A("notify", "email", 7), A("billing", "audit", 3), A("users", "audit", 2), A("orders", "reports", 3), A("billing", "reports", 3), A("shipping", "notify", 3)];

/* ---------- D043 ---------- */
export const orgTree: TreeIn = { id: "ceo", label: "Priya Nair", note: "Chief Executive", children: [
  { id: "cto", label: "Tom Hale", note: "CTO", children: [{ id: "eng1", label: "Aisha Khan", note: "Platform", children: [{ id: "e1a", label: "Ben Ito", note: "SRE" }, { id: "e1b", label: "Cleo Park", note: "Infra" }] }, { id: "eng2", label: "Diego Ruiz", note: "Product eng", children: [{ id: "e2a", label: "Eve Lund", note: "Web" }, { id: "e2b", label: "Femi Ade", note: "Mobile" }, { id: "e2c", label: "Gus Wong", note: "Data" }] }] },
  { id: "cfo", label: "Maria Costa", note: "CFO", children: [{ id: "fin1", label: "Hana Sato", note: "FP&A" }, { id: "fin2", label: "Ivan Petrov", note: "Accounts" }] },
  { id: "coo", label: "Lena Fox", note: "COO", children: [{ id: "ops1", label: "Omar Said", note: "Support", children: [{ id: "o1a", label: "Pia Rao", note: "Tier 1" }, { id: "o1b", label: "Quinn Lee", note: "Tier 2" }] }, { id: "ops2", label: "Rosa Diaz", note: "People" }] },
] };
export const taxonomy: TreeIn = { id: "all", label: "Alerts", children: [
  { id: "inf", label: "Infrastructure", children: [{ id: "cpu", label: "CPU" }, { id: "mem", label: "Memory" }, { id: "disk", label: "Disk", children: [{ id: "dfull", label: "Full" }, { id: "dio", label: "IO wait" }] }] },
  { id: "app", label: "Application", children: [{ id: "err", label: "Error rate" }, { id: "lat", label: "Latency", children: [{ id: "p95", label: "p95" }, { id: "p99", label: "p99" }] }] },
  { id: "sec", label: "Security", children: [{ id: "auth", label: "Auth failures" }, { id: "cert", label: "Certificates" }] },
] };
export const mind: TreeIn = { id: "inc", label: "Incident response", children: [
  { id: "detect", label: "Detect", children: [{ id: "d1", label: "Alerts" }, { id: "d2", label: "Customer reports" }] },
  { id: "triage", label: "Triage", children: [{ id: "t1", label: "Severity" }, { id: "t2", label: "Owner" }, { id: "t3", label: "Comms plan" }] },
  { id: "mitigate", label: "Mitigate", children: [{ id: "m1", label: "Rollback" }, { id: "m2", label: "Feature flag" }] },
  { id: "learn", label: "Learn", children: [{ id: "l1", label: "Timeline" }, { id: "l2", label: "Actions" }, { id: "l3", label: "Review" }] },
  { id: "comms", label: "Communicate", children: [{ id: "c1", label: "Status page" }, { id: "c2", label: "Exec brief" }] },
] };
export const dendroLabels = ["checkout", "cart", "catalog", "search", "auth", "users", "billing", "ledger", "email", "push", "sms", "reports"];
const rd = rng(4301); const centre: Record<string, [number, number, number]> = { shop: [8, 2, 3], ident: [2, 8, 2], money: [3, 3, 9], msg: [1, 2, 1] };
const grp = ["shop", "shop", "shop", "shop", "ident", "ident", "money", "money", "msg", "msg", "msg", "money"];
export const dendroVectors = dendroLabels.map((_, i) => centre[grp[i]].map((v) => Math.round((v + (rd() - 0.5) * 3) * 10) / 10));

/* ---------- D045 ---------- */
const rs = rng(4501);
const users = Array.from({ length: 360 }, (_, i) => `u${i + 1}`);
export const venn: Record<string, string[]> = { Web: [], Mobile: [], API: [] };
users.forEach((u) => { const x = rs(); if (x < 0.34) venn.Web.push(u); else if (x < 0.5) { venn.Web.push(u); venn.Mobile.push(u); } else if (x < 0.62) venn.Mobile.push(u); else if (x < 0.7) { venn.Mobile.push(u); venn.API.push(u); } else if (x < 0.8) venn.API.push(u); else if (x < 0.86) { venn.Web.push(u); venn.API.push(u); } else if (x < 0.92) { venn.Web.push(u); venn.Mobile.push(u); venn.API.push(u); } else venn.Web.push(u); });
const ru = rng(4502);
export const upset: Record<string, string[]> = { Dashboards: [], Alerts: [], Reports: [], Exports: [], Webhooks: [] };
const ladders = ["Dashboards", "Alerts", "Reports", "Exports", "Webhooks"]; const p = [0.8, 0.5, 0.42, 0.3, 0.18];
for (let i = 0; i < 420; i++) { const a = ladders.filter((_, k) => ru() < p[k]); (a.length ? a : ["Dashboards"]).forEach((k) => upset[k].push(`a${i}`)); }

/* ---------- D047 ---------- */
export type Ent = { id: string; attrs: { name: string; pk?: boolean; fk?: boolean; type: string }[] };
export const entities: Ent[] = [
  { id: "customer", attrs: [{ name: "id", pk: true, type: "uuid" }, { name: "email", type: "text" }, { name: "name", type: "text" }] },
  { id: "address", attrs: [{ name: "id", pk: true, type: "uuid" }, { name: "customer_id", fk: true, type: "uuid" }, { name: "postcode", type: "text" }] },
  { id: "order", attrs: [{ name: "id", pk: true, type: "uuid" }, { name: "customer_id", fk: true, type: "uuid" }, { name: "placed_at", type: "timestamptz" }, { name: "total", type: "numeric" }] },
  { id: "order_item", attrs: [{ name: "id", pk: true, type: "uuid" }, { name: "order_id", fk: true, type: "uuid" }, { name: "product_id", fk: true, type: "uuid" }, { name: "qty", type: "int" }] },
  { id: "product", attrs: [{ name: "id", pk: true, type: "uuid" }, { name: "category_id", fk: true, type: "uuid" }, { name: "sku", type: "text" }, { name: "price", type: "numeric" }] },
  { id: "category", attrs: [{ name: "id", pk: true, type: "uuid" }, { name: "name", type: "text" }] },
  { id: "payment", attrs: [{ name: "id", pk: true, type: "uuid" }, { name: "order_id", fk: true, type: "uuid" }, { name: "status", type: "text" }] },
  { id: "shipment", attrs: [{ name: "id", pk: true, type: "uuid" }, { name: "order_id", fk: true, type: "uuid" }, { name: "address_id", fk: true, type: "uuid" }] },
];
/** [parent, child, parent side, child side]: "1" exactly one, "0..1" optional, "N" many. */
export const relations: [string, string, string, string][] = [["customer", "address", "1", "N"], ["customer", "order", "1", "N"], ["order", "order_item", "1", "N"], ["product", "order_item", "1", "N"], ["category", "product", "1", "N"], ["order", "payment", "1", "N"], ["order", "shipment", "1", "0..1"], ["address", "shipment", "1", "N"]];
export const tiers: { name: string; nodes: { id: string; label: string; kind: string }[] }[] = [
  { name: "Clients", nodes: [{ id: "web", label: "Web app", kind: "client" }, { id: "mobile", label: "Mobile app", kind: "client" }, { id: "partner", label: "Partner API", kind: "client" }] },
  { name: "Edge", nodes: [{ id: "cdn", label: "CDN", kind: "edge" }, { id: "gw", label: "API gateway", kind: "edge" }] },
  { name: "Services", nodes: [{ id: "auth", label: "Auth", kind: "service" }, { id: "orders", label: "Orders", kind: "service" }, { id: "catalog", label: "Catalog", kind: "service" }, { id: "notify", label: "Notifications", kind: "service" }] },
  { name: "Data", nodes: [{ id: "pg", label: "Postgres", kind: "store" }, { id: "redis", label: "Redis", kind: "store" }, { id: "queue", label: "Event queue", kind: "queue" }, { id: "s3", label: "Object store", kind: "store" }] },
];
export const archEdges: [string, string][] = [["web", "cdn"], ["mobile", "gw"], ["partner", "gw"], ["cdn", "gw"], ["gw", "auth"], ["gw", "orders"], ["gw", "catalog"], ["auth", "redis"], ["orders", "pg"], ["orders", "queue"], ["catalog", "pg"], ["catalog", "s3"], ["queue", "notify"]];
export const packages = ["core", "tokens", "ui", "icons", "forms", "tables", "charts", "auth", "api-client", "admin", "docs", "e2e"];
/** [dependency, dependent] */
export const pkgDeps: [string, string][] = ([["tokens", "core"], ["icons", "tokens"], ["ui", "tokens"], ["ui", "icons"], ["forms", "ui"], ["tables", "ui"], ["charts", "ui"], ["api-client", "core"], ["auth", "api-client"], ["admin", "forms"], ["admin", "tables"], ["admin", "charts"], ["admin", "auth"], ["docs", "ui"], ["docs", "charts"], ["e2e", "admin"], ["tables", "icons"]] as [string, string][]).map(([user, dep]) => [dep, user]);
export const pipeline = ["extract_orders", "extract_users", "extract_events", "clean_orders", "clean_users", "join_sessions", "dedupe_events", "build_features", "train_model", "score_batch", "publish_dashboard", "notify_slack"];
export const pipeEdges: [string, string][] = [["extract_orders", "clean_orders"], ["extract_users", "clean_users"], ["extract_events", "dedupe_events"], ["clean_users", "join_sessions"], ["dedupe_events", "join_sessions"], ["clean_orders", "build_features"], ["join_sessions", "build_features"], ["build_features", "train_model"], ["train_model", "score_batch"], ["clean_orders", "publish_dashboard"], ["score_batch", "publish_dashboard"], ["publish_dashboard", "notify_slack"]];
export const pipeRaw: Record<string, "success" | "failed" | "running" | "queued" | "skipped"> = { extract_orders: "success", extract_users: "success", extract_events: "success", clean_orders: "success", clean_users: "success", join_sessions: "failed", dedupe_events: "success", build_features: "queued", train_model: "queued", score_batch: "queued", publish_dashboard: "queued", notify_slack: "skipped" };
export const lineage = ["raw.orders", "raw.users", "raw.events", "stg.orders", "stg.users", "stg.sessions", "mart.revenue", "mart.retention", "mart.ltv", "dash.exec", "dash.growth", "ml.churn"];
export const lineageEdges: [string, string][] = [["raw.orders", "stg.orders"], ["raw.users", "stg.users"], ["raw.events", "stg.sessions"], ["stg.orders", "mart.revenue"], ["stg.users", "mart.retention"], ["stg.sessions", "mart.retention"], ["stg.orders", "mart.ltv"], ["stg.users", "mart.ltv"], ["mart.revenue", "dash.exec"], ["mart.ltv", "dash.exec"], ["mart.retention", "dash.growth"], ["mart.ltv", "ml.churn"], ["mart.retention", "ml.churn"]];

/* ---------- D049 ---------- */
const S = (id: string, parent: string | null, service: string, name: string, start: number, dur: number, error = false): Span => ({ id, parent, service, name, start, dur, error });
export const spans: Span[] = [
  S("1", null, "gateway", "POST /checkout", 0, 412), S("2", "1", "auth", "verify token", 4, 18), S("3", "2", "redis", "GET session", 8, 6), S("4", "1", "orders", "create order", 26, 290), S("5", "4", "catalog", "price lookup", 30, 44), S("6", "5", "postgres", "SELECT price", 34, 36), S("7", "4", "inventory", "reserve stock", 78, 70), S("8", "7", "postgres", "UPDATE stock", 90, 52),
  S("9", "4", "payments", "charge card", 150, 150), S("10", "9", "stripe", "POST /charges", 160, 128, true), S("11", "4", "postgres", "INSERT order", 302, 12), S("12", "1", "notify", "enqueue receipt", 320, 22), S("13", "12", "queue", "PUBLISH", 324, 14), S("14", "1", "gateway", "render response", 350, 58),
];
export const stacks: [string, number][] = [
  ["main;handle;parse;json", 38], ["main;handle;parse;utf8", 14], ["main;handle;auth;jwt;verify", 46], ["main;handle;auth;redis;get", 18], ["main;handle;orders;validate", 22], ["main;handle;orders;db;query;plan", 28], ["main;handle;orders;db;query;exec", 96], ["main;handle;orders;db;query;fetch", 44], ["main;handle;orders;db;tx", 31],
  ["main;handle;render;template", 52], ["main;handle;render;json", 36], ["main;handle;log", 12], ["main;gc;mark", 40], ["main;gc;sweep", 21], ["main;idle", 15],
];

/* ---------- D050 ---------- */
export const WEEKS = 12;
const rc = rng(5001);
export const cohortUsers: User[] = (() => { const out: User[] = []; for (let c = 0; c < WEEKS; c++) { const n = 120 + Math.floor(rc() * 80); for (let i = 0; i < n; i++) { const hazard = 0.28 - c * 0.006; let life = 0; while (life < WEEKS && rc() > hazard * (life === 0 ? 1.6 : Math.max(0.35, 1 - life * 0.12))) life++; out.push({ cohort: c, active: Array.from({ length: Math.min(life, WEEKS - 1 - c) }, (_, k) => c + k + 1) }); } } return out; })();
export const funnels: Record<string, { name: string; count: number }[]> = {
  All: [{ name: "Visited", count: 48200 }, { name: "Viewed product", count: 29800 }, { name: "Added to cart", count: 11400 }, { name: "Started checkout", count: 7300 }, { name: "Paid", count: 4900 }],
  Mobile: [{ name: "Visited", count: 31000 }, { name: "Viewed product", count: 17700 }, { name: "Added to cart", count: 6000 }, { name: "Started checkout", count: 3300 }, { name: "Paid", count: 1950 }],
  Desktop: [{ name: "Visited", count: 17200 }, { name: "Viewed product", count: 12100 }, { name: "Added to cart", count: 5400 }, { name: "Started checkout", count: 4000 }, { name: "Paid", count: 2950 }],
};

/* ---------- D054 ---------- */
export const TODAY = new Date(Date.UTC(2026, 10, 12));
const rg = rng(5401);
export const commitCounts: Record<string, number> = (() => { const o: Record<string, number> = {}; for (let i = 0; i < 26 * 7; i++) { const d = new Date(TODAY.getTime() - i * 86400000); const dow = d.getUTCDay(); const base = dow === 0 || dow === 6 ? 0.25 : 1; const v = Math.floor(rg() ** 1.6 * 14 * base); if (v) o[d.toISOString().slice(0, 10)] = v; } return o; })();
const Cm = (id: string, branch: string, parents: string[], msg: string, author: string, tag?: string): Commit => ({ id, branch, parents, msg, author, tag });
export const commits: Commit[] = [
  Cm("a1", "main", [], "Initial commit", "ava"), Cm("a2", "main", ["a1"], "Add token pipeline", "noah"), Cm("b1", "feat/charts", ["a2"], "Scaffold chart frame", "mia"), Cm("a3", "main", ["a2"], "Fix focus ring", "ava"), Cm("c1", "fix/a11y", ["a3"], "Label icon buttons", "zoe"),
  Cm("b2", "feat/charts", ["b1"], "Sankey layout", "mia"), Cm("c2", "fix/a11y", ["c1"], "Roving tabindex", "zoe"), Cm("a4", "main", ["a3", "c2"], "Merge fix/a11y", "ava"), Cm("d1", "feat/maps", ["a4"], "Hex tile map", "leo"), Cm("b3", "feat/charts", ["b2"], "Chord diagram", "mia"),
  Cm("a5", "main", ["a4", "b3"], "Merge feat/charts", "ava", "v1.4.0"), Cm("d2", "feat/maps", ["d1"], "Isochrone grid", "leo"), Cm("a6", "main", ["a5"], "Bump deps", "noah"), Cm("d3", "feat/maps", ["d2", "a6"], "Sync main", "leo"), Cm("a7", "main", ["a6", "d3"], "Merge feat/maps", "ava", "v1.5.0"),
];
const rdp = rng(5402);
export const deploys: Deploy[] = (() => { const out: Deploy[] = []; const start = TODAY.getTime() - 84 * 86400000; for (let d = 0; d < 84; d++) { const dow = new Date(start + d * 86400000).getUTCDay(); const rate = (dow === 0 || dow === 6 ? 0.1 : 0.9) * (0.5 + d / 84); const n = rate > rdp() ? 1 + (rdp() < 0.3 ? 1 : 0) : 0; for (let k = 0; k < n; k++) out.push({ at: start + d * 86400000 + (9 + k * 4 + rdp() * 3) * 3600000, ok: rdp() > 0.08 }); } return out; })();
const rl = rng(5403);
export const leadHours: number[] = Array.from({ length: 140 }, () => Math.round(Math.exp(2.6 + rl() * 2.6 + (rl() - 0.5)) * 10) / 10);

/* ---------- D057 ---------- */
export const ports: Port[] = (() => { const r = rng(5701); const st: Port["state"][] = ["up", "up", "up", "down", "up", "disabled", "up", "error"]; const o: Port[] = []; for (let n = 1; n <= 24; n++) { const s = n === 7 ? "error" : n === 12 ? "disabled" : n % 5 === 0 ? "down" : st[Math.floor(r() * 5)]; const poe = n <= 12 && s === "up" ? Math.round((4 + r() * 18) * 10) / 10 : 0; o.push({ n, kind: "rj45", state: s, speed: s === "up" ? (r() > 0.75 ? 2500 : r() > 0.3 ? 1000 : 100) : 0, poe, vlan: n <= 8 ? 10 : n <= 16 ? 20 : 30, label: n === 1 ? "uplink-ap-lobby" : n === 2 ? "ap-level-2" : n === 13 ? "nas-01" : `port ${n}` }); } o.push({ n: 25, kind: "sfp", state: "up", speed: 10000, poe: 0, vlan: 1, label: "core uplink" }, { n: 26, kind: "sfp", state: "down", speed: 0, poe: 0, vlan: 1, label: "spare" }, { n: 27, kind: "sfp", state: "up", speed: 10000, poe: 0, vlan: 1, label: "stack link" }, { n: 28, kind: "sfp", state: "down", speed: 0, poe: 0, vlan: 1, label: "spare" }); return o; })();
export const racks: { name: string; devs: Dev[] }[] = [
  { name: "Rack A", devs: [{ name: "Patch panel A", u: 41, h: 1, kind: "patch", watts: 0 }, { name: "Core switch", u: 39, h: 2, kind: "switch", watts: 310 }, { name: "Edge router", u: 38, h: 1, kind: "router", watts: 120 }, { name: "Firewall", u: 36, h: 2, kind: "firewall", watts: 240 }, { name: "Hypervisor 1", u: 28, h: 2, kind: "server", watts: 620 }, { name: "Hypervisor 2", u: 26, h: 2, kind: "server", watts: 640 }, { name: "Hypervisor 3", u: 24, h: 2, kind: "server", watts: 590 }, { name: "Storage array", u: 18, h: 4, kind: "storage", watts: 780 }, { name: "KVM", u: 10, h: 1, kind: "kvm", watts: 30 }, { name: "UPS", u: 1, h: 6, kind: "ups", watts: 90 }] },
  { name: "Rack B", devs: [{ name: "Patch panel B", u: 42, h: 1, kind: "patch", watts: 0 }, { name: "Top-of-rack switch", u: 40, h: 1, kind: "switch", watts: 150 }, { name: "Backup server", u: 30, h: 2, kind: "server", watts: 420 }, { name: "Build node 1", u: 28, h: 1, kind: "server", watts: 280 }, { name: "Build node 2", u: 27, h: 1, kind: "server", watts: 280 }, { name: "Tape library", u: 20, h: 4, kind: "storage", watts: 210 }, { name: "PDU", u: 1, h: 2, kind: "pdu", watts: 40 }] },
];
export const bss: Bss[] = [
  { ssid: "Office-Corp", band: "2.4", channel: 1, width: 20, rssi: -48 }, { ssid: "Office-Guest", band: "2.4", channel: 1, width: 20, rssi: -52 }, { ssid: "Cafe-Free", band: "2.4", channel: 6, width: 20, rssi: -61 }, { ssid: "Neighbour-A", band: "2.4", channel: 6, width: 20, rssi: -70 }, { ssid: "Neighbour-B", band: "2.4", channel: 4, width: 20, rssi: -78 }, { ssid: "Printer-direct", band: "2.4", channel: 11, width: 20, rssi: -66 }, { ssid: "Neighbour-C", band: "2.4", channel: 9, width: 20, rssi: -82 },
  { ssid: "Office-Corp", band: "5", channel: 36, width: 80, rssi: -50 }, { ssid: "Office-Guest", band: "5", channel: 36, width: 80, rssi: -54 }, { ssid: "Neighbour-A", band: "5", channel: 100, width: 40, rssi: -74 }, { ssid: "Cafe-Free", band: "5", channel: 149, width: 20, rssi: -63 }, { ssid: "Neighbour-D", band: "5", channel: 157, width: 80, rssi: -80 },
];
export const FLOOR = { cols: 36, rows: 22, cell: 14 };
export const aps: AP[] = [{ id: "AP-1", x: 90, y: 90, tx: 20 }, { id: "AP-2", x: 330, y: 80, tx: 20 }, { id: "AP-3", x: 250, y: 240, tx: 20 }];
export const walls: Wall[] = [[0, 0, 504, 0], [504, 0, 504, 308], [504, 308, 0, 308], [0, 308, 0, 0], [168, 0, 168, 140], [168, 140, 0, 140], [252, 0, 252, 120], [252, 168, 252, 308], [252, 168, 504, 168], [380, 0, 380, 120], [140, 220, 252, 220]];
export const rooms = [{ id: "r-lobby", name: "Lobby", x: 0, y: 140, w: 168, h: 168 }, { id: "r-north", name: "Office north", x: 0, y: 0, w: 168, h: 140 }, { id: "r-meet", name: "Meeting room", x: 168, y: 0, w: 84, h: 168 }, { id: "r-open", name: "Open plan", x: 252, y: 0, w: 128, h: 168 }, { id: "r-lab", name: "Lab", x: 380, y: 0, w: 124, h: 168 }, { id: "r-cafe", name: "Cafe", x: 252, y: 168, w: 252, h: 140 }];

/* ---------- D058 ---------- */
export const roomNames = ["Reception", "Open plan", "Meeting A", "Meeting B", "Focus pods", "Kitchen", "Lab", "Library"];
export const capacity: Record<string, number> = { Reception: 12, "Open plan": 60, "Meeting A": 10, "Meeting B": 6, "Focus pods": 8, Kitchen: 16, Lab: 14, Library: 20 };
export const occSamples: Sample[] = (() => { const r = rng(5801); const prof: Record<string, (h: number) => number> = { Reception: (h) => (h >= 8 && h <= 18 ? 0.4 + 0.3 * Math.sin((h - 8) / 2) : 0.02), "Open plan": (h) => (h >= 8 && h <= 18 ? (h === 12 ? 0.45 : 0.75) : 0.03), "Meeting A": (h) => (h >= 9 && h <= 16 ? 0.55 : 0.02), "Meeting B": (h) => (h >= 10 && h <= 17 ? 0.7 : 0.02), "Focus pods": (h) => (h >= 9 && h <= 17 ? 0.5 : 0.01), Kitchen: (h) => (h === 12 || h === 13 ? 0.9 : h >= 8 && h <= 17 ? 0.22 : 0), Lab: (h) => (h >= 7 && h <= 20 ? 0.45 : 0.05), Library: (h) => (h >= 10 && h <= 21 ? 0.35 : 0.04) }; const o: Sample[] = []; for (const room of roomNames) for (let d = 0; d < 5; d++) for (let h = 0; h < 24; h++) o.push({ room, hour: h, people: Math.max(0, Math.round(prof[room](h) * capacity[room] * (0.8 + r() * 0.4))) }); return o; })();
export const sensors = ["Lobby door", "Corridor 1", "Open plan N", "Open plan S", "Kitchen", "Lab door", "Server room"];
export const motionEvents: Record<string, number[]> = (() => { const r = rng(5802); const o: Record<string, number[]> = {}; const act: Record<string, (h: number) => number> = { "Lobby door": (h) => (h >= 8 && h <= 18 ? 6 : 0.2), "Corridor 1": (h) => (h >= 8 && h <= 18 ? 9 : 0.3), "Open plan N": (h) => (h >= 9 && h <= 17 ? 14 : 0.1), "Open plan S": (h) => (h >= 9 && h <= 17 ? 11 : 0.1), Kitchen: (h) => (h === 12 || h === 13 ? 16 : h >= 8 && h <= 17 ? 4 : 0), "Lab door": (h) => (h >= 7 && h <= 20 ? 5 : 0.5), "Server room": (h) => (h === 3 ? 4 : 0.15) }; for (const s of sensors) { const ts: number[] = []; for (let h = 0; h < 24; h++) { const n = Math.round(act[s](h) * (0.6 + r() * 0.8) + (r() < (act[s](h) % 1) ? 1 : 0)); for (let k = 0; k < n; k++) ts.push(h * 60 + r() * 60); } o[s] = ts.sort((a, b) => a - b); } return o; })();

/* ---------- D059 ---------- */
export const hexRows = [
  "W W T Q Q . .",
  " . W S Q Q Q .",
  ". . S N N N N",
  " . . . N N N N",
  ". . V V V C .",
  " . . V V V V .",
  ". . . M . . .",
];
export const hexNames: Record<string, string> = { W: "WA", T: "NT", Q: "QLD", S: "SA", N: "NSW", V: "VIC", C: "ACT", M: "TAS" };
/** Hex tile counts roughly follow population (1 tile ≈ 1 million people), so small states stay visible. Population in millions. */
export const statePop: Record<string, number> = { NSW: 8.3, VIC: 6.8, QLD: 5.4, WA: 2.9, SA: 1.8, TAS: 0.57, ACT: 0.46, NT: 0.25 };
export const stateInternet: Record<string, number> = { NSW: 91, VIC: 92, QLD: 88, WA: 90, SA: 87, TAS: 85, ACT: 96, NT: 79 };
export const costGrid = (() => { const W = 44, H = 30; return Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => { const river = x === 22 || x === 23; const bridge = (y >= 6 && y <= 7) || (y >= 21 && y <= 22); if (river && !bridge) return Infinity; if (river) return 0.5; if (y === 14 || x === 10 || x === 34) return 0.25; if (x > 36 && y < 10) return 2.2; return 1; })); })();
export const ISO_ORIGIN: [number, number] = [8, 14];
export const gpsTrack: Fix[] = (() => { const r = rng(5903); const o: Fix[] = []; const N = 140; for (let i = 0; i <= N; i++) { const a = (i / N) * Math.PI * 2; const lat = -33.86 + 0.045 * Math.sin(a) * (1 + 0.25 * Math.cos(2 * a)), lon = 151.21 + 0.06 * (Math.cos(a) - 1) / 1 + 0.02 * Math.sin(3 * a); const ele = 20 + 38 * (0.5 - 0.5 * Math.cos(2 * a)) + 14 * Math.sin(5 * a) ** 2 + (r() - 0.5) * 2.5; o.push({ lat, lon, ele, t: i * 40 }); } return o; })();
export const fences: { id: string; name: string; poly: Pt[] }[] = [
  { id: "depot", name: "Depot", poly: [[151.195, -33.85], [151.225, -33.85], [151.225, -33.87], [151.195, -33.87]] },
  { id: "school", name: "School zone", poly: [[151.115, -33.835], [151.14, -33.835], [151.14, -33.82], [151.115, -33.82]] },
  { id: "restricted", name: "Restricted area", poly: [[151.165, -33.89], [151.195, -33.89], [151.195, -33.905], [151.165, -33.905]] },
];
