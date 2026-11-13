/* Deterministic sample data for the more-charts gallery (seeded, so tests and screenshots are stable). */
import { normals, rng } from "./stats.ts";
import type { HNode } from "./hier.ts";

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const wave = (n: number, base: number, amp: number, phase: number, seed: number, noise = 0.06) => { const r = rng(seed); return Array.from({ length: n }, (_, i) => Math.max(1, Math.round(base + amp * Math.sin((i / n) * Math.PI * 2 + phase) + base * noise * (r() - 0.5) * 2))); };

/* D002 */
export const trafficNames = ["Web", "Mobile", "API", "Partners"];
export const traffic = [wave(12, 40, 8, 0, 11), wave(12, 28, 14, 1.2, 12), wave(12, 20, 6, 2.4, 13), wave(12, 10, 4, 3.6, 14)];
export const streamNames = ["Search", "Direct", "Email", "Social", "Referral", "Paid"];
export const streamWeeks = Array.from({ length: 26 }, (_, i) => `W${i + 1}`);
export const streams = streamNames.map((_, k) => wave(26, 30 - k * 3, 12 - k, k * 1.1, 20 + k, 0.12));

/* D009 */
export const bandDays = Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`);
export const latencyBand = (() => { const r = rng(31); const mean = Array.from({ length: 30 }, (_, i) => Math.round(120 + 25 * Math.sin(i / 4) + r() * 10)); return { mean, min: mean.map((m) => Math.round(m * (0.62 + r() * 0.08))), max: mean.map((m) => Math.round(m * (1.35 + r() * 0.25))) }; })();
export const forecastLabels = Array.from({ length: 16 }, (_, i) => `Q${(i % 4) + 1} ${2025 + Math.floor(i / 4)}`);
export const forecast = (() => { const hist = [88, 91, 95, 94, 99, 104]; const med = [...hist]; for (let i = 6; i < 16; i++) med.push(Math.round((med[i - 1] + 1.4) * 10) / 10); return { median: med, histLen: hist.length, spread: 2.1 }; })();

/* D010 */
export const horizonHosts = ["edge-01", "edge-02", "db-01", "queue-01"];
export const horizonHours = Array.from({ length: 72 }, (_, i) => i);
export const horizonSeries = horizonHosts.map((_, k) => { const r = rng(40 + k); return horizonHours.map((i) => Math.round(18 * Math.sin(i / (5 + k * 2) + k) + 10 * Math.sin(i / 2.1) + (r() - 0.5) * 8 + (k === 2 && i > 50 ? 20 : 0))); });
export const cycleYears = ["2022", "2023", "2024", "2025"];
export const cycleValues = (() => { const r = rng(55); return cycleYears.flatMap((_, y) => MONTHS.map((_, m) => Math.round(100 + y * 9 + 28 * Math.sin(((m - 2) / 12) * Math.PI * 2) + (r() - 0.5) * 10))); })();

/* D013 / D018 */
export const groupNames = ["Checkout", "Search", "Login", "Export"];
export const groups = [normals(101, 120, 220, 40), normals(102, 120, 140, 30), normals(103, 120, 90, 18).map((v, i) => (i % 17 === 0 ? v + 140 : v)), normals(104, 120, 360, 90).map((v) => Math.abs(v))];
export const sample = normals(105, 400, 100, 15);
export const skewed = normals(106, 300, 3.2, 0.6).map((v) => Math.exp(v));
export const strip = groups.map((g) => g.slice(0, 40));

/* D021 */
export const diskTree: HNode = { name: "Storage", children: [
  { name: "Media", children: [{ name: "Video", value: 420 }, { name: "Photos", value: 260 }, { name: "Audio", value: 90 }] },
  { name: "Databases", children: [{ name: "Orders", value: 310 }, { name: "Events", value: 240 }, { name: "Search index", value: 120 }, { name: "Sessions", value: 40 }] },
  { name: "Backups", children: [{ name: "Nightly", value: 280 }, { name: "Weekly", value: 160 }] },
  { name: "Logs", children: [{ name: "App", value: 110 }, { name: "Access", value: 150 }, { name: "Audit", value: 30 }] },
  { name: "System", value: 70 },
] };

/* D022 */
export const profitSteps = [{ label: "Revenue", value: 1240 }, { label: "Returns", value: -86 }, { label: "COGS", value: -410 }, { label: "Gross profit", value: 0, total: true }, { label: "Marketing", value: -190 }, { label: "Payroll", value: -330 }, { label: "Interest", value: 24 }, { label: "Net income", value: 0, total: true }];
export const defects = [{ label: "Scratches", value: 120 }, { label: "Misaligned", value: 74 }, { label: "Wrong colour", value: 41 }, { label: "Cracked", value: 22 }, { label: "Missing part", value: 14 }, { label: "Dented", value: 9 }, { label: "Other", value: 12 }];
export const funnelSteps = [{ label: "Visited", value: 48200 }, { label: "Signed up", value: 14800 }, { label: "Activated", value: 8900 }, { label: "Trialled", value: 3900 }, { label: "Paid", value: 1450 }];
export const ageGroups = ["0-9", "10-19", "20-29", "30-39", "40-49", "50-59", "60-69", "70-79", "80+"];
export const pyramid = { left: { name: "Women", data: [5.1, 5.6, 6.8, 7.4, 6.9, 6.7, 5.4, 3.6, 2.2] }, right: { name: "Men", data: [5.4, 5.9, 7.1, 7.5, 6.8, 6.4, 4.9, 3.0, 1.4] } };

/* D024 */
export const bumpWeeks = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"];
export const bumpTeams = [{ name: "Atlas", values: [82, 85, 80, 78, 90, 93, 91, 95] }, { name: "Borealis", values: [90, 88, 92, 94, 86, 85, 88, 90] }, { name: "Cygnus", values: [70, 74, 79, 86, 89, 92, 94, 92] }, { name: "Draco", values: [88, 80, 76, 72, 70, 68, 64, 60] }, { name: "Eridanus", values: [60, 66, 70, 73, 76, 79, 83, 88] }, { name: "Fornax", values: [75, 79, 85, 84, 80, 77, 74, 70] }];
export const mekko = [{ label: "North America", parts: [{ label: "Hardware", value: 420 }, { label: "Software", value: 560 }, { label: "Services", value: 310 }] }, { label: "Europe", parts: [{ label: "Hardware", value: 260 }, { label: "Software", value: 340 }, { label: "Services", value: 280 }] }, { label: "Asia Pacific", parts: [{ label: "Hardware", value: 380 }, { label: "Software", value: 150 }, { label: "Services", value: 120 }] }, { label: "Latin America", parts: [{ label: "Hardware", value: 90 }, { label: "Software", value: 70 }, { label: "Services", value: 60 }] }];

/* D025 */
export const ticketParts = [{ label: "Resolved", value: 62 }, { label: "In progress", value: 21 }, { label: "Waiting on customer", value: 11 }, { label: "Escalated", value: 6 }];
export const unitParts = [{ label: "Servers online", value: 41 }, { label: "Servers draining", value: 6 }, { label: "Servers offline", value: 3 }];

/* D026 */
export const incidentsByMonth = [14, 11, 16, 12, 9, 7, 6, 8, 13, 18, 21, 19];
export const eventsByHour = [3, 2, 1, 1, 2, 4, 9, 18, 32, 41, 38, 35, 29, 36, 40, 37, 31, 24, 15, 11, 9, 7, 5, 4];

/* D027 */
export const ringInner = [{ label: "EMEA", value: 38 }, { label: "Americas", value: 44 }, { label: "APAC", value: 18 }];
export const ringOuter = [{ label: "UK", value: 14, parent: 0 }, { label: "DE", value: 12, parent: 0 }, { label: "Other EMEA", value: 12, parent: 0 }, { label: "US", value: 31, parent: 1 }, { label: "Brazil", value: 8, parent: 1 }, { label: "Other Americas", value: 5, parent: 1 }, { label: "JP", value: 9, parent: 2 }, { label: "AU", value: 6, parent: 2 }, { label: "Other APAC", value: 3, parent: 2 }];
export const gauges = [{ label: "CPU", value: 62, max: 100, unit: "%", zones: [0.7, 0.9] as [number, number] }, { label: "Memory", value: 81, max: 100, unit: "%", zones: [0.7, 0.9] as [number, number] }, { label: "Disk", value: 94, max: 100, unit: "%", zones: [0.7, 0.9] as [number, number] }, { label: "Latency", value: 240, max: 500, unit: "ms", zones: [0.5, 0.8] as [number, number] }];

/* D028 */
export const likertCats = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"];
export const likertRows = [{ label: "The new dashboard is easy to use", counts: [4, 9, 17, 41, 29] }, { label: "I can find the data I need", counts: [8, 18, 22, 33, 19] }, { label: "Reports load fast enough", counts: [21, 30, 19, 20, 10] }, { label: "I would recommend it to a colleague", counts: [3, 6, 14, 38, 39] }];
export const npsScores = (() => { const r = rng(77); return Array.from({ length: 240 }, () => { const u = r(); return u < 0.46 ? (r() < 0.55 ? 10 : 9) : u < 0.74 ? (r() < 0.5 ? 8 : 7) : Math.floor(r() * 7); }); })();
export const unitRows = [{ label: "Platform", value: 23 }, { label: "Payments", value: 15.5 }, { label: "Mobile", value: 9 }, { label: "Data", value: 18 }, { label: "Security", value: 6.5 }];
