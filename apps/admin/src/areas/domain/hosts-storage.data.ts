import { DAY, NOW, clamp, mean, prng, sum, daysUntil } from "./lib.ts";

export type Host = { id: string; name: string; role: string; arch: "x86_64" | "aarch64"; generation: number; currentRev: string; wantedRev: string; lastRebuild: string; uptimeDays: number; kernel: string; failedUnits: number };
export type Pool = { id: string; name: string; kind: "zfs" | "iscsi"; sizeTb: number; usedTb: number; growthGbPerDay: number; health: "ONLINE" | "DEGRADED" | "FAULTED"; lastScrub: string; scrubErrors: number; vdevs: string };
export type Smart = { id: string; host: string; model: string; serial: string; ageHours: number; tempC: number; reallocated: number; pending: number; crcErrors: number; wearPct?: number; kind: "HDD" | "SSD" | "NVMe" };
export type RestorePoint = { id: string; target: string; at: string; sizeGb: number; kind: "snapshot" | "full" | "incremental"; verified: boolean };
export type Ups = { model: string; loadW: number; capacityW: number; batteryPct: number; batteryWh: number; onBattery: boolean; inputV: number };

export const HOSTS: Host[] = [
  { id: "h1", name: "orion", role: "NAS / iSCSI target", arch: "x86_64", generation: 412, currentRev: "a41f9c2", wantedRev: "a41f9c2", lastRebuild: "2026-11-09", uptimeDays: 21, kernel: "6.12.8", failedUnits: 0 },
  { id: "h2", name: "lyra", role: "Home Assistant host", arch: "aarch64", generation: 233, currentRev: "a41f9c2", wantedRev: "a41f9c2", lastRebuild: "2026-11-09", uptimeDays: 21, kernel: "6.12.8", failedUnits: 0 },
  { id: "h3", name: "vega", role: "Media archive", arch: "x86_64", generation: 198, currentRev: "9d03b11", wantedRev: "a41f9c2", lastRebuild: "2026-10-28", uptimeDays: 36, kernel: "6.11.4", failedUnits: 1 },
  { id: "h4", name: "rigel", role: "PXE / netboot", arch: "x86_64", generation: 87, currentRev: "a41f9c2", wantedRev: "a41f9c2", lastRebuild: "2026-11-11", uptimeDays: 1, kernel: "6.12.8", failedUnits: 2 },
  { id: "h5", name: "sirius", role: "Build box", arch: "x86_64", generation: 301, currentRev: "a41f9c2", wantedRev: "a41f9c2", lastRebuild: "2026-11-10", uptimeDays: 4, kernel: "6.12.8", failedUnits: 0 },
  { id: "h6", name: "deneb", role: "Workshop Pi", arch: "aarch64", generation: 54, currentRev: "77be0aa", wantedRev: "a41f9c2", lastRebuild: "2026-09-30", uptimeDays: 61, kernel: "6.6.22", failedUnits: 0 },
];
/** A host has drifted when the running revision differs from the one the flake wants. */
export const drifted = (h: Host) => h.currentRev !== h.wantedRev;
export const POOLS: Pool[] = [
  { id: "p1", name: "tank", kind: "zfs", sizeTb: 36, usedTb: 29.9, growthGbPerDay: 42, health: "ONLINE", lastScrub: "2026-11-09", scrubErrors: 0, vdevs: "2 × raidz2 (6 disks)" },
  { id: "p2", name: "scratch", kind: "zfs", sizeTb: 7.2, usedTb: 2.1, growthGbPerDay: 6, health: "ONLINE", lastScrub: "2026-11-02", scrubErrors: 0, vdevs: "mirror (2 SSD)" },
  { id: "p3", name: "retro-images", kind: "zfs", sizeTb: 4, usedTb: 3.7, growthGbPerDay: 9, health: "DEGRADED", lastScrub: "2026-10-20", scrubErrors: 3, vdevs: "mirror (1 of 2 online)" },
  { id: "p4", name: "iscsi-lun-root", kind: "iscsi", sizeTb: 2, usedTb: 0.9, growthGbPerDay: 1, health: "ONLINE", lastScrub: "—", scrubErrors: 0, vdevs: "zvol on tank" },
];
export const poolPct = (p: Pool) => p.usedTb / p.sizeTb;
/** Days until full at the current growth rate (null if not growing). */
export function daysUntilFull(p: Pool): number | null { const free = (p.sizeTb - p.usedTb) * 1000; return p.growthGbPerDay > 0 ? Math.floor(free / p.growthGbPerDay) : null; }
export const poolStatus = (p: Pool): "ok" | "warn" | "danger" => (p.health !== "ONLINE" || poolPct(p) > 0.92 ? "danger" : poolPct(p) > 0.8 || (daysUntilFull(p) ?? 999) < 90 ? "warn" : "ok");
export const DISKS: Smart[] = [
  { id: "d1", host: "orion", model: "WDC WD120EFBX", serial: "WX-0001", ageHours: 31200, tempC: 38, reallocated: 0, pending: 0, crcErrors: 0, kind: "HDD" }, { id: "d2", host: "orion", model: "WDC WD120EFBX", serial: "WX-0002", ageHours: 31200, tempC: 41, reallocated: 0, pending: 0, crcErrors: 1, kind: "HDD" },
  { id: "d3", host: "orion", model: "WDC WD120EFBX", serial: "WX-0003", ageHours: 24100, tempC: 40, reallocated: 8, pending: 0, crcErrors: 0, kind: "HDD" }, { id: "d4", host: "orion", model: "Seagate ST4000VN", serial: "SG-0407", ageHours: 52800, tempC: 44, reallocated: 112, pending: 4, crcErrors: 2, kind: "HDD" },
  { id: "d5", host: "vega", model: "Samsung 870 EVO", serial: "SS-8870", ageHours: 14300, tempC: 33, reallocated: 0, pending: 0, crcErrors: 0, wearPct: 12, kind: "SSD" }, { id: "d6", host: "sirius", model: "Kioxia KXG80", serial: "KX-3321", ageHours: 9100, tempC: 49, reallocated: 0, pending: 0, crcErrors: 0, wearPct: 31, kind: "NVMe" },
  { id: "d7", host: "rigel", model: "Crucial MX500", serial: "CR-5001", ageHours: 40200, tempC: 36, reallocated: 0, pending: 0, crcErrors: 0, wearPct: 78, kind: "SSD" },
];
/** Health from SMART attributes: reallocated/pending sectors and SSD wear drive the verdict. */
export function smartHealth(d: Smart): { verdict: "healthy" | "watch" | "replace"; reasons: string[] } {
  const reasons: string[] = []; let level = 0;
  if (d.pending > 0) { reasons.push(`${d.pending} pending sectors`); level = 2; }
  if (d.reallocated >= 50) { reasons.push(`${d.reallocated} reallocated sectors`); level = 2; } else if (d.reallocated > 0) { reasons.push(`${d.reallocated} reallocated sectors`); level = Math.max(level, 1); }
  if (d.crcErrors > 0) { reasons.push(`${d.crcErrors} CRC errors (check cable)`); level = Math.max(level, 1); }
  if (d.wearPct !== undefined && d.wearPct >= 80) { reasons.push(`wear ${d.wearPct}%`); level = 2; } else if (d.wearPct !== undefined && d.wearPct >= 70) { reasons.push(`wear ${d.wearPct}%`); level = Math.max(level, 1); }
  if (d.tempC >= 55) { reasons.push(`${d.tempC} °C`); level = Math.max(level, 1); }
  return { verdict: (["healthy", "watch", "replace"] as const)[level], reasons };
}
const day = (n: number) => { const d = new Date(NOW.getTime() - n * DAY); return d.toISOString().slice(0, 10); };
export const RESTORE_POINTS: RestorePoint[] = [
  { id: "r1", target: "tank/media", at: `${day(0)} 02:00`, sizeGb: 180, kind: "incremental", verified: true }, { id: "r2", target: "tank/media", at: `${day(7)} 02:00`, sizeGb: 5200, kind: "full", verified: true },
  { id: "r3", target: "lyra (HA config)", at: `${day(0)} 03:30`, sizeGb: 2.4, kind: "snapshot", verified: true }, { id: "r4", target: "lyra (HA config)", at: `${day(3)} 03:30`, sizeGb: 2.3, kind: "snapshot", verified: false },
  { id: "r5", target: "retro-images", at: `${day(12)} 04:00`, sizeGb: 3400, kind: "full", verified: false }, { id: "r6", target: "iscsi-lun-root", at: `${day(1)} 01:00`, sizeGb: 880, kind: "snapshot", verified: true },
];
export const backupAge = (r: RestorePoint) => Math.round((NOW.getTime() - new Date(r.at.replace(" ", "T")).getTime()) / DAY);
export const UPS: Ups = { model: "APC Smart-UPS 1500 (example)", loadW: 412, capacityW: 980, batteryPct: 100, batteryWh: 860, onBattery: false, inputV: 238 };
/** Runtime estimate in minutes from remaining battery energy and load, derated for inverter efficiency and battery ageing. */
export const runtimeMin = (u: Ups, eff = 0.9, health = 0.85) => (u.loadW <= 0 ? Infinity : ((u.batteryWh * (u.batteryPct / 100) * eff * health) / u.loadW) * 60);
export const loadPct = (u: Ups) => u.loadW / u.capacityW;
export function fleetSummary() { return { hosts: HOSTS.length, drifted: HOSTS.filter(drifted).length, failedUnits: sum(HOSTS.map((h) => h.failedUnits)), meanUptime: mean(HOSTS.map((h) => h.uptimeDays)) }; }
export function upsHistory() { const r = prng(21); return Array.from({ length: 48 }, (_, i) => Math.round(380 + Math.sin(i / 6) * 40 + r() * 30)); }
export const staleScrub = (p: Pool) => (p.lastScrub === "—" ? 0 : -daysUntil(p.lastScrub));
export const clampPct = (v: number) => clamp(v, 0, 1);
