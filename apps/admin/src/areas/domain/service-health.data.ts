import { mean, minutesToText, prng, sum, NOW, DAY } from "./lib.ts";

export type DayState = "ok" | "warn" | "down" | "none";
export type Service = { id: string; name: string; tier: 1 | 2 | 3; owner: string; slo: number; days: DayState[]; p95: number };
export type Sev = 1 | 2 | 3;
export type IncidentUpdate = { at: number; text: string };
export type Incident = { id: string; title: string; svc: string; sev: Sev; start: number; end?: number; ack?: string; updates: IncidentUpdate[] };
export type Metric = "latency" | "errors" | "cpu";
export type AlertRule = { id: string; name: string; svc: string; metric: Metric; op: ">" | "<"; threshold: number; forMin: number; sev: Sev; enabled: boolean };

/** Minutes of unavailability each day state represents. */
export const DOWNTIME_MIN: Record<DayState, number> = { ok: 0, warn: 14, down: 120, none: 0 };
export const WINDOW_DAYS = 90;

export function uptime(days: DayState[]): number {
  const counted = days.filter((d) => d !== "none"); if (!counted.length) return 1;
  return 1 - sum(counted.map((d) => DOWNTIME_MIN[d])) / (counted.length * 1440);
}
/** Error budget for an SLO over a window: allowed downtime, used, remaining (can go negative). */
export function errorBudget(days: DayState[], slo: number) {
  const counted = days.filter((d) => d !== "none").length; const allowed = (1 - slo) * counted * 1440; const used = sum(days.map((d) => DOWNTIME_MIN[d]));
  return { allowed, used, remaining: allowed - used, burn: allowed ? used / allowed : used > 0 ? Infinity : 0 };
}
export const mttr = (incs: Incident[]) => mean(incs.filter((i) => i.end !== undefined).map((i) => (i.end! - i.start) / 60000));

/** Evaluate a rule against an evenly-spaced series. A firing = >= forMin consecutive minutes in violation. */
export function evaluateRule(rule: Pick<AlertRule, "op" | "threshold" | "forMin">, series: number[], stepMin: number) {
  const firings: { from: number; to: number }[] = []; let run = 0, from = -1;
  const bad = (v: number) => (rule.op === ">" ? v > rule.threshold : v < rule.threshold);
  series.forEach((v, i) => {
    if (bad(v)) { if (run === 0) from = i; run++; } else { if (run * stepMin >= rule.forMin) firings.push({ from, to: i - 1 }); run = 0; }
  });
  if (run * stepMin >= rule.forMin) firings.push({ from, to: series.length - 1 });
  return firings;
}

export type Person = { id: string; name: string; phone: string };
export const PEOPLE: Person[] = [{ id: "ava", name: "Ava Nguyen", phone: "+61 400 000 101" }, { id: "noah", name: "Noah Smith", phone: "+61 400 000 102" }, { id: "mia", name: "Mia Patel", phone: "+61 400 000 103" }, { id: "liam", name: "Liam Williams", phone: "+61 400 000 104" }];
export const ROTA_START = new Date(2026, 9, 5, 9, 0, 0); // a Monday 09:00; one person per week, in PEOPLE order
export function onCallAt(at: Date, overrides: { from: number; to: number; person: string }[] = []) {
  const o = overrides.find((x) => at.getTime() >= x.from && at.getTime() < x.to); if (o) return { person: PEOPLE.find((p) => p.id === o.person)!, override: true };
  const week = Math.floor((at.getTime() - ROTA_START.getTime()) / (7 * DAY)); return { person: PEOPLE[((week % PEOPLE.length) + PEOPLE.length) % PEOPLE.length], override: false };
}

const g = prng(42);
const mk = (bad: Partial<Record<number, DayState>>): DayState[] => Array.from({ length: WINDOW_DAYS }, (_, i) => bad[i] ?? (g() > 0.985 ? "warn" : "ok"));
export const SERVICES: Service[] = [
  { id: "api", name: "jupiter-api", tier: 1, owner: "ava", slo: 0.999, days: mk({ 71: "warn", 88: "warn" }), p95: 182 },
  { id: "media", name: "media-archive", tier: 2, owner: "noah", slo: 0.995, days: mk({ 60: "warn", 61: "warn", 86: "warn", 89: "warn" }), p95: 410 },
  { id: "ha", name: "ha-bridge", tier: 2, owner: "mia", slo: 0.995, days: mk({}), p95: 38 },
  { id: "pxe", name: "pxe-boot", tier: 3, owner: "liam", slo: 0.99, days: mk({ 40: "down", 85: "down", 89: "down" }), p95: 0 },
  { id: "wg", name: "wg-gateway", tier: 1, owner: "ava", slo: 0.999, days: mk({ 33: "warn" }), p95: 24 },
  { id: "dns", name: "dns-resolver", tier: 1, owner: "noah", slo: 0.9995, days: mk({}), p95: 6 },
];
const T = (d: number, h: number, m = 0) => new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - d, h, m).getTime();
export const INCIDENTS: Incident[] = [
  { id: "INC-107", title: "PXE boot unreachable", svc: "pxe", sev: 2, start: T(0, 16, 10), ack: "liam", updates: [{ at: T(0, 16, 31), text: "Investigating failures to network-boot hosts from the PXE server." }, { at: T(0, 16, 12), text: "Monitoring detected repeated timeouts." }] },
  { id: "INC-106", title: "Elevated media-archive latency", svc: "media", sev: 3, start: T(3, 9, 40), end: T(3, 11, 5), ack: "noah", updates: [{ at: T(3, 11, 5), text: "Resolved. A ZFS scrub finished and latency is normal." }, { at: T(3, 9, 40), text: "Latency is elevated while a scrub runs." }] },
  { id: "INC-105", title: "Certificate renewal delayed", svc: "api", sev: 3, start: T(10, 7, 50), end: T(10, 8, 20), ack: "ava", updates: [{ at: T(10, 8, 20), text: "Renewal completed after a DNS-01 retry." }] },
  { id: "INC-104", title: "WireGuard handshake failures", svc: "wg", sev: 1, start: T(24, 22, 0), end: T(24, 23, 45), ack: "ava", updates: [{ at: T(24, 23, 45), text: "Key rotation mismatch corrected on the peer." }, { at: T(24, 22, 15), text: "Paged on-call. Peers failing handshakes since 22:00." }] },
  { id: "INC-103", title: "pxe-boot disk full", svc: "pxe", sev: 2, start: T(49, 3, 15), end: T(49, 6, 30), ack: "liam", updates: [{ at: T(49, 6, 30), text: "Pruned old netboot images; added an alert at 80% disk." }] },
];
const hourly = (seed: number, base: number, amp: number, spike?: [number, number, number]) => { const r = prng(seed); return Array.from({ length: 24 * 4 }, (_, i) => Math.max(0, Math.round(base + Math.sin(i / 9) * amp + (r() - 0.5) * amp * 0.6 + (spike && i >= spike[0] && i < spike[1] ? spike[2] : 0)))); };
/** 24 h of 15-minute samples per service and metric. */
export const METRIC_HISTORY: Record<string, Partial<Record<Metric, number[]>>> = {
  api: { latency: hourly(1, 170, 25, [60, 66, 260]), errors: hourly(2, 3, 2), cpu: hourly(3, 48, 12) },
  media: { latency: hourly(4, 380, 60, [30, 40, 500]), errors: hourly(5, 2, 1), cpu: hourly(6, 62, 15, [30, 40, 25]) },
  ha: { latency: hourly(7, 36, 8), errors: hourly(8, 1, 1), cpu: hourly(9, 22, 6) },
  pxe: { latency: hourly(10, 0, 0), errors: hourly(11, 0, 0, [64, 96, 40]), cpu: hourly(12, 8, 3) },
  wg: { latency: hourly(13, 24, 5), errors: hourly(14, 0, 1), cpu: hourly(15, 12, 4) },
  dns: { latency: hourly(16, 6, 2), errors: hourly(17, 0, 1), cpu: hourly(18, 10, 3) },
};
export const RULES: AlertRule[] = [
  { id: "r1", name: "API p95 latency high", svc: "api", metric: "latency", op: ">", threshold: 250, forMin: 30, sev: 2, enabled: true },
  { id: "r2", name: "Media archive CPU saturated", svc: "media", metric: "cpu", op: ">", threshold: 80, forMin: 45, sev: 3, enabled: true },
  { id: "r3", name: "PXE error rate", svc: "pxe", metric: "errors", op: ">", threshold: 10, forMin: 15, sev: 2, enabled: true },
  { id: "r4", name: "DNS resolver latency", svc: "dns", metric: "latency", op: ">", threshold: 20, forMin: 10, sev: 1, enabled: false },
  { id: "r5", name: "WireGuard errors", svc: "wg", metric: "errors", op: ">", threshold: 5, forMin: 10, sev: 1, enabled: true },
];
export const UNIT: Record<Metric, string> = { latency: "ms", errors: "/min", cpu: "%" };
export const sevLabel = (s: Sev) => (s === 1 ? "SEV1 critical" : s === 2 ? "SEV2 major" : "SEV3 minor");
export const incidentDuration = (i: Incident, now = NOW.getTime()) => minutesToText(((i.end ?? now) - i.start) / 60000);
