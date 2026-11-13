// D059: real Australian boundaries. Data is built once by geodata/build-au.mjs (sources and licences are recorded there and in
// geodata/README.md) and loaded lazily with a dynamic import, so it stays out of the main chunk and nothing is fetched at runtime.
import type { Pt } from "./geo.ts";

export const STATE_NAMES: Record<string, string> = { WA: "Western Australia", NT: "Northern Territory", SA: "South Australia", QLD: "Queensland", NSW: "New South Wales", VIC: "Victoria", TAS: "Tasmania", ACT: "Australian Capital Territory" };
export const STATE_ORDER = ["ACT", "QLD", "NSW", "VIC", "SA", "WA", "NT", "TAS"];
export type Ring = Pt[]; // [lon, lat]
export type AuState = { code: string; rings: Ring[] };
export type Lga = { code: string; name: string; state: string; areaKm2: number; centroid: Pt; rings: Ring[] };

/** Decode a delta-encoded ring [x0, y0, dx, dy, ...] (units of 0.01 degree) to lon/lat points. */
export function decodeRing(e: number[], q = 100): Ring {
  const out: Ring = []; let x = 0, y = 0; for (let i = 0; i < e.length; i += 2) { x += e[i]; y += e[i + 1]; out.push([x / q, y / q]); } return out;
}
type RawStates = { states: Record<string, { rings: number[][] }> };
type RawLga = { lgas: { c: string; n: string; s: string; a: number; k: [number, number]; r: number[][] }[] };
let statesP: Promise<AuState[]> | null = null, lgaP: Promise<Lga[]> | null = null;
export const loadStates = () => (statesP ??= import("./geodata/au-states.json").then((m) => { const d = (m.default ?? m) as unknown as RawStates; return STATE_ORDER.map((code) => ({ code, rings: d.states[code].rings.map((r) => decodeRing(r)) })); }));
export const loadLgas = () => (lgaP ??= import("./geodata/au-lga.json").then((m) => { const d = (m.default ?? m) as unknown as RawLga; return d.lgas.map((l) => ({ code: l.c, name: l.n.trim(), state: l.s, areaKm2: l.a, centroid: [l.k[0] / 100, l.k[1] / 100] as Pt, rings: l.r.map((r) => decodeRing(r)) })); }));

const D2R = Math.PI / 180, R_KM = 6371.0088;
/** Albers equal-area conic (sphere), centred for Australia like GDA94 Australian Albers: parallels -18 and -36, origin (134E, 0). Returns km. */
export function albers([lon, lat]: Pt): Pt {
  const p1 = -18 * D2R, p2 = -36 * D2R, p0 = 0, l0 = 134 * D2R, n = (Math.sin(p1) + Math.sin(p2)) / 2, c = Math.cos(p1) ** 2 + 2 * n * Math.sin(p1);
  const rho = (p: number) => (R_KM * Math.sqrt(c - 2 * n * Math.sin(p))) / n, r = rho(lat * D2R), r0 = rho(p0), th = n * (lon * D2R - l0);
  return [r * Math.sin(th), r0 - r * Math.cos(th)];
}
const shoelace = (r: Pt[]) => { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j][0] * r[i][1] - r[i][0] * r[j][1]; return a / 2; };
/** Area of outer rings in km2 using the equal-area projection (rings are outer boundaries only). */
export const areaKm2 = (rings: Ring[]) => rings.reduce((s, r) => s + Math.abs(shoelace(r.map(albers))), 0);

const inRing = (x: number, y: number, r: Ring) => { let inside = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside; } return inside; };
export const inRings = (lon: number, lat: number, rings: Ring[]) => rings.some((r) => inRing(lon, lat, r));
export const ringsBox = (rings: Ring[]) => { let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity; for (const r of rings) for (const [x, y] of r) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; } return { minX, maxX, minY, maxY }; };
export const stateAt = (states: AuState[], lon: number, lat: number) => states.find((s) => inRings(lon, lat, s.rings))?.code ?? null;
export const lgaAt = (lgas: Lga[], lon: number, lat: number) => lgas.find((l) => inRings(lon, lat, l.rings)) ?? null;
/** Centre of the largest ring (area-weighted centroid) for label placement. */
export function labelPoint(rings: Ring[]): Pt {
  let best = rings[0], ba = -1; for (const r of rings) { const a = Math.abs(shoelace(r)); if (a > ba) { ba = a; best = r; } }
  let cx = 0, cy = 0, s = 0; for (let i = 0, j = best.length - 1; i < best.length; j = i++) { const f = best[j][0] * best[i][1] - best[i][0] * best[j][1]; cx += (best[j][0] + best[i][0]) * f; cy += (best[j][1] + best[i][1]) * f; s += f; }
  return s ? [cx / (3 * s), cy / (3 * s)] : best[0];
}
/** Sample metric for the council choropleth (NOT a statistic): households online, modelled from log area as a remoteness proxy plus a stable per-code wobble. */
export const sampleOnline = (l: Lga) => { let h = 0; for (const ch of l.code) h = (h * 31 + ch.charCodeAt(0)) % 1009; return Math.max(55, Math.min(98, Math.round(97 - 4.4 * Math.log10(Math.max(l.areaKm2, 1)) + ((h % 7) - 3)))); };
