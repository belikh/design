// Deterministic fictional data for the P3 domain charts (seeded; identical on every load).
import { rng } from "../../data/fixtures.ts";
import type { Candle, BudgetRow, Invoice, BridgeStep } from "./finance.ts";
import type { Band } from "./energy.ts";
import type { Marker } from "./signal.ts";
import type { ThresholdBand } from "./features.ts";

const r = rng(3060);
const gauss = () => { let s = 0; for (let i = 0; i < 6; i++) s += r(); return (s - 3) / 1.5; };
const day = (i: number) => { const d = new Date(Date.UTC(2026, 8, 1 + i)); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; };
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

/* D060 */
export const candles: Candle[] = (() => { let p = 100; return Array.from({ length: 36 }, (_, i) => { const o = p, c = Math.max(20, o + gauss() * 3), h = Math.max(o, c) + r() * 2.5, l = Math.min(o, c) - r() * 2.5; p = c; return { t: day(i), o: +o.toFixed(2), h: +h.toFixed(2), l: +l.toFixed(2), c: +c.toFixed(2), v: Math.round(800 + r() * 900) }; }); })();
export const bids = Array.from({ length: 18 }, (_, i) => ({ p: +(99.9 - i * 0.1).toFixed(2), q: Math.round(20 + r() * 60 + i * 6) }));
export const asks = Array.from({ length: 18 }, (_, i) => ({ p: +(100.1 + i * 0.1).toFixed(2), q: Math.round(15 + r() * 55 + i * 5) }));
export const controlData: number[] = Array.from({ length: 40 }, (_, i) => +(50 + gauss() * 1.2 + (i === 27 ? 6 : 0) + (i >= 31 && i <= 37 ? 1.4 : 0)).toFixed(2));
export const errorGroups = ["Control", "A", "B", "C", "D", "E"].map((name, k) => ({ name, values: Array.from({ length: 8 }, () => +(20 + k * 3 + gauss() * (2 + (k % 3))).toFixed(2)) }));

/* D066 */
export const budget: BudgetRow[] = [
  { label: "Subscriptions", budget: 820, actual: 861, kind: "revenue" }, { label: "Services", budget: 240, actual: 214, kind: "revenue" }, { label: "Hosting", budget: 180, actual: 207, kind: "cost" },
  { label: "Salaries", budget: 610, actual: 598, kind: "cost" }, { label: "Marketing", budget: 150, actual: 171, kind: "cost" }, { label: "Travel", budget: 40, actual: 27, kind: "cost" },
];
export const AS_OF = 200;
export const invoices: Invoice[] = Array.from({ length: 34 }, (_, i) => ({ id: `INV-${3100 + i}`, customer: ["Acme", "Globex", "Initech", "Umbrella", "Hooli", "Soylent"][i % 6], due: AS_OF + 25 - Math.floor(r() * r() * 150), amount: Math.round(400 + r() * 5200) }));
export const bridge: BridgeStep[] = [{ label: "Opening cash", value: 420, total: true }, { label: "Receipts", value: 310 }, { label: "Payroll", value: -240 }, { label: "Suppliers", value: -130 }, { label: "Tax", value: -55 }, { label: "Capex", value: -90 }, { label: "Financing", value: 120 }, { label: "Closing cash", value: 0, total: true }];

/* D061 */
export const radarAxes = ["Speed", "Reliability", "Cost", "Support", "Security", "Docs"];
export const radarSeries = [{ name: "Plan A", values: [82, 70, 55, 64, 90, 48] }, { name: "Plan B", values: [60, 88, 78, 72, 66, 80] }];
export const polarMonths = [4.2, 5.1, 6.8, 7.4, 9.9, 12.3, 14.8, 13.9, 10.2, 7.7, 5.2, 4.6];
export const parallelDims = ["Power (kW)", "Weight (kg)", "Range (km)", "Price (k)", "0-100 (s)"];
export const parallelRows = Array.from({ length: 22 }, (_, i) => { const g = i % 3; return { name: `Model ${String.fromCharCode(65 + i)}`, group: g, values: [60 + g * 45 + r() * 30, 900 + g * 350 + r() * 200, 300 + (2 - g) * 120 + r() * 80, 18 + g * 14 + r() * 8, 12 - g * 2.4 + r() * 1.5].map((v) => +v.toFixed(1)) }; });
export const parallelGroups = ["City", "Touring", "Performance"];

/* D062 */
const W = "dashboard latency deploy incident rollback pipeline cache query index shard replica tenant billing invoice ledger audit policy token session gateway queue retry timeout metric trace span alert pager runbook cluster node pod ingress backup restore snapshot quota region failover sensor firmware thermostat humidity energy battery solar tariff storage forecast".split(" ");
export const words = W.map((text, i) => ({ text, weight: Math.round(96 / (1 + i * 0.35) + r() * 8 + 3) }));

/* D063 */
export const tariff: Band[] = [{ from: 0, to: 6, rate: 0.12, name: "Night" }, { from: 6, to: 16, rate: 0.24, name: "Day" }, { from: 16, to: 20, rate: 0.38, name: "Peak" }, { from: 20, to: 24, rate: 0.24, name: "Day" }];
export const load = HOURS.map((_, h) => +(0.6 + 0.5 * Math.exp(-((h - 7.5) ** 2) / 3) + 1.4 * Math.exp(-((h - 19) ** 2) / 5) + 0.12 * Math.abs(gauss())).toFixed(2));
export const sources = (() => { const solar = HOURS.map((_, h) => +(Math.max(0, Math.sin(((h - 6) / 12) * Math.PI)) * 3.2 * (0.85 + r() * 0.15)).toFixed(2)); const wind = HOURS.map(() => +(0.6 + r() * 0.9).toFixed(2)); const gas = HOURS.map((_, h) => +(0.8 + 1.6 * Math.exp(-((h - 19) ** 2) / 8) + r() * 0.2).toFixed(2)); const grid = HOURS.map((_, h) => +(0.4 + (h > 16 && h < 21 ? 0.9 : 0.2) + r() * 0.2).toFixed(2)); return [{ name: "Solar", data: solar }, { name: "Wind", data: wind }, { name: "Gas", data: gas }, { name: "Grid import", data: grid }]; })();
export const batteryNet = HOURS.map((_, h) => +(h >= 9 && h < 15 ? 2.2 - r() * 0.4 : h >= 17 && h < 22 ? -2.4 + r() * 0.5 : h < 5 ? 0.8 : 0).toFixed(2));

/* D064 */
export const weather = Array.from({ length: 48 }, (_, i) => { const t = 20 + 5 * Math.sin(((i % 24) - 9) / 24 * 2 * Math.PI) + (i > 30 ? 3.5 : 0) + gauss() * 0.4; return { label: `${i < 24 ? "Mon" : "Tue"} ${String(i % 24).padStart(2, "0")}h`, t: +t.toFixed(1), rh: Math.round(Math.min(90, Math.max(20, 70 - (t - 20) * 3.2 + gauss() * 3))) }; });
export const comfort = { tLo: 20, tHi: 25, rhLo: 30, rhHi: 60 };
export const windSamples = Array.from({ length: 900 }, () => { const dir = (225 + gauss() * 55 + 360) % 360; return { dir, speed: Math.max(0, 5 + gauss() * 3 + (dir > 180 && dir < 270 ? 2 : 0)) }; });
export const windEdges = [0.5, 3, 6, 10, 15];

/* D065 and D067 */
export const SR = 1024;
export const rfSignal = Array.from({ length: 1024 }, (_, i) => { const t = i / SR; const chirp = Math.sin(2 * Math.PI * (60 * t + 140 * t * t)); return 0.9 * chirp + 0.5 * Math.sin(2 * Math.PI * 12 * t * SR / 64) * (i > 300 && i < 700 ? 1 : 0.15) + 0.05 * gauss(); });
export const rxSymbols = (() => { const L = [-3, -1, 1, 3]; return Array.from({ length: 420 }, () => ({ i: L[Math.floor(r() * 4)] + gauss() * 0.22, q: L[Math.floor(r() * 4)] + gauss() * 0.22 })); })();
export const audio = Array.from({ length: 4800 }, (_, i) => { const t = i / 4800, env = Math.exp(-((t - 0.25) ** 2) / 0.004) * 0.9 + Math.exp(-((t - 0.7) ** 2) / 0.02) * 0.6 + 0.04; return env * Math.sin(i * 0.41 + 2 * Math.sin(i * 0.011)) * (0.7 + 0.3 * r()); });
export const pixels = Array.from({ length: 4000 }, () => Math.round(Math.min(255, Math.max(0, r() < 0.55 ? 70 + gauss() * 28 : 175 + gauss() * 38))));
export const videoDuration = 214;
export const videoMarkers: Marker[] = [{ at: 4, label: "Intro", kind: "chapter" }, { at: 31, label: "Cut", kind: "edit" }, { at: 33, label: "Logo", kind: "note" }, { at: 58, label: "Chapter 2", kind: "chapter" }, { at: 59, label: "Music in", kind: "note" }, { at: 96, label: "Cut", kind: "edit" }, { at: 121, label: "Motion alert", kind: "alert" }, { at: 124, label: "Person", kind: "note" }, { at: 160, label: "Chapter 3", kind: "chapter" }, { at: 198, label: "Outro", kind: "chapter" }];

/* D068 */
export const fieldN = 44;

/* D069 */
export const disks = Array.from({ length: 8 }, (_, i) => ({ id: `sd${String.fromCharCode(97 + i)}`, tb: i < 6 ? 12 : 8, pool: i < 4 ? "tank" : i < 7 ? "scratch" : "spare", temp: 31 + Math.round(r() * 9) + (i === 5 ? 9 : 0), state: i === 5 ? "warn" : "ok" }));
export const smartDays = Array.from({ length: 60 }, (_, i) => `d${i + 1}`);
export const smartSeries = [{ name: "Reallocated sectors (normalised)", data: smartDays.map((_, i) => Math.round(100 - Math.max(0, i - 25) * 0.55 - r() * 1)), thresh: 36 }, { name: "Spin retry (normalised)", data: smartDays.map(() => 100), thresh: 97 }, { name: "Temperature (°C)", data: smartDays.map((_, i) => Math.round(34 + 4 * Math.sin(i / 5) + (i > 40 ? 5 : 0) + r() * 2)), thresh: 60 }];
export const usageTb = Array.from({ length: 90 }, (_, i) => +(41 + i * 0.37 + gauss() * 0.7).toFixed(2));
export const capacityTb = 80;

/* D074 */
export const demoSeries = Array.from({ length: 60 }, (_, i) => +(120 + 40 * Math.sin(i / 7) + i * 0.8 + gauss() * 6 + (i > 44 && i < 50 ? 55 : 0)).toFixed(1));
export const demoPrev = demoSeries.map((v, i) => +(v * 0.86 + 8 * Math.sin(i / 5)).toFixed(1));
export const demoBands: ThresholdBand[] = [{ from: 180, to: 230, level: "warn", label: "Warning above 180" }, { from: 230, to: 1e9, level: "danger", label: "Critical above 230" }];
export const demoRows = Array.from({ length: 120 }, (_, i) => ({ id: i, region: ["EMEA", "APAC", "AMER"][Math.floor(r() * 3)], product: ["Core", "Edge", "Cloud", "Mobile"][Math.floor(r() * 4)], x: +(r() * 100).toFixed(1), y: +(r() * 100).toFixed(1), amount: Math.round(50 + r() * 950) }));
export const demoQuery = "SELECT bucket(ts, '1h') AS t, region, product, sum(amount) FROM orders WHERE ts >= now() - interval '60 hours' GROUP BY 1, 2, 3";
