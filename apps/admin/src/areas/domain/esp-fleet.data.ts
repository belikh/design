import { mean, prng } from "./lib.ts";

export type Dev = { id: string; name: string; board: string; fw: string; rssi: number; uptimeH: number; heapKb: number; seenMin: number; room: string };
export type BleSeen = { mac: string; name: string; seenBy: { dev: string; rssi: number }[] };
export const LATEST = "2026.11.1";
export const DEVICES: Dev[] = [
  { id: "d1", name: "csi-living", board: "ESP32-S3", fw: "2026.11.1", rssi: -52, uptimeH: 190, heapKb: 142, seenMin: 0, room: "Living room" }, { id: "d2", name: "csi-office", board: "ESP32-S3", fw: "2026.10.2", rssi: -61, uptimeH: 410, heapKb: 138, seenMin: 0, room: "Office" },
  { id: "d3", name: "temp-garage", board: "ESP32-C3", fw: "2026.9.4", rssi: -78, uptimeH: 1220, heapKb: 96, seenMin: 1, room: "Garage" }, { id: "d4", name: "door-front", board: "ESP32-C3", fw: "2026.10.2", rssi: -66, uptimeH: 410, heapKb: 101, seenMin: 0, room: "Porch" },
  { id: "d5", name: "garage-door", board: "ESP32", fw: "2026.9.4", rssi: -70, uptimeH: 1220, heapKb: 88, seenMin: 0, room: "Garage" }, { id: "d6", name: "ble-proxy-1", board: "ESP32-S3", fw: "2026.10.2", rssi: -48, uptimeH: 410, heapKb: 150, seenMin: 0, room: "Hallway" },
  { id: "d7", name: "ble-proxy-2", board: "ESP32-S3", fw: "2026.10.2", rssi: -57, uptimeH: 22, heapKb: 148, seenMin: 0, room: "Workshop" }, { id: "d8", name: "workshop-env", board: "ESP32", fw: "2026.6.0", rssi: -83, uptimeH: 0, heapKb: 0, seenMin: 190, room: "Workshop" },
  { id: "d9", name: "bedroom-temp", board: "ESP32-C3", fw: "2026.10.2", rssi: -64, uptimeH: 410, heapKb: 104, seenMin: 0, room: "Bedroom" }, { id: "d10", name: "kitchen-light", board: "ESP8266", fw: "2026.9.4", rssi: -59, uptimeH: 1220, heapKb: 31, seenMin: 0, room: "Kitchen" },
];
export const isOnline = (d: Dev) => d.seenMin < 5;
export const cmpVersion = (a: string, b: string) => { const pa = a.split(".").map(Number), pb = b.split(".").map(Number); for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const d = (pa[i] ?? 0) - (pb[i] ?? 0); if (d) return d; } return 0; };
export const outdated = (d: Dev) => cmpVersion(d.fw, LATEST) < 0;
export const versionCounts = (ds: Dev[]) => { const m = new Map<string, number>(); ds.forEach((d) => m.set(d.fw, (m.get(d.fw) ?? 0) + 1)); return [...m.entries()].sort((a, b) => cmpVersion(b[0], a[0])); };
/** Wi-Fi quality bucket from RSSI. */
export const rssiBucket = (r: number) => (r >= -55 ? "excellent" : r >= -67 ? "good" : r >= -75 ? "fair" : "poor");
export type Ring = { name: string; pct: number };
export const RINGS: Ring[] = [{ name: "Canary", pct: 10 }, { name: "Early", pct: 40 }, { name: "Everyone", pct: 100 }];
/** Assign eligible devices to cumulative rings: devices sorted by criticality (least critical first), ring i takes up to pct% of the fleet. Offline devices are skipped. */
export function assignRings(devs: Dev[], rings: Ring[] = RINGS) {
  const order = [...devs].filter((d) => isOnline(d) && outdated(d)).sort((a, b) => a.name.localeCompare(b.name)); const total = order.length; const out: { ring: Ring; devices: Dev[] }[] = []; let taken = 0;
  for (const ring of rings) { const upTo = Math.ceil((ring.pct / 100) * total); out.push({ ring, devices: order.slice(taken, upTo) }); taken = Math.max(taken, upTo); }
  return out;
}
export type DevResult = "pending" | "updating" | "ok" | "failed";
export type Rollout = { version: string; ring: number; results: Record<string, DevResult>; halted: boolean; haltReason?: string };
export const FAIL_THRESHOLD = 0.2;
export const ringFailureRate = (r: Rollout, devs: Dev[]) => { const done = devs.filter((d) => ["ok", "failed"].includes(r.results[d.id])); return done.length ? done.filter((d) => r.results[d.id] === "failed").length / done.length : 0; };
/** Advance one ring: flash its devices (deterministic failures for flagged boards), then gate on the failure rate before the next ring. */
export function runRing(r: Rollout, groups: { ring: Ring; devices: Dev[] }[], failing: (d: Dev) => boolean): Rollout {
  if (r.halted || r.ring >= groups.length) return r; const g = groups[r.ring]; const results = { ...r.results }; g.devices.forEach((d) => (results[d.id] = failing(d) ? "failed" : "ok"));
  const next: Rollout = { ...r, results, ring: r.ring + 1 }; const rate = ringFailureRate(next, g.devices);
  return rate > FAIL_THRESHOLD ? { ...next, halted: true, haltReason: `${g.ring.name} ring failed ${(rate * 100).toFixed(0)}% (limit ${FAIL_THRESHOLD * 100}%)` } : next;
}
const r = prng(77);
export const BLE: BleSeen[] = [
  { mac: "AA:BB:CC:00:11:01", name: "Body scale", seenBy: [{ dev: "ble-proxy-1", rssi: -74 }, { dev: "ble-proxy-2", rssi: -88 }] }, { mac: "AA:BB:CC:00:11:02", name: "Thermometer (kitchen)", seenBy: [{ dev: "ble-proxy-1", rssi: -58 }] }, { mac: "AA:BB:CC:00:11:03", name: "Soil sensor", seenBy: [{ dev: "ble-proxy-2", rssi: -69 }, { dev: "ble-proxy-1", rssi: -81 }] },
  { mac: "AA:BB:CC:00:11:04", name: "Door sensor", seenBy: [{ dev: "ble-proxy-1", rssi: -63 }] }, { mac: "AA:BB:CC:00:11:05", name: "(unknown)", seenBy: [{ dev: "ble-proxy-2", rssi: -92 }] },
];
export const bestProxy = (b: BleSeen) => [...b.seenBy].sort((a, c) => c.rssi - a.rssi)[0];
export const meanRssi = (ds: Dev[]) => mean(ds.filter(isOnline).map((d) => d.rssi));
export const heapHistory = () => Array.from({ length: 24 }, (_, i) => Math.round(140 - i * 0.4 + r() * 6));
