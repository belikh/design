// D059 isochrone: shortest paths over an explicit road graph (Queensland highways, towns as nodes).
// Coordinates and classes are approximate sample data, not survey data, and the cost model below is a simplification.
//
// COST MODEL (minutes)
//   edge drive time = straight-line km x winding factor / speed x 60
//     motorway: winding 1.10, 110 km/h      highway: winding 1.12, 100 km/h      rural: winding 1.18, 90 km/h
//   plus a transit penalty each time a trip passes THROUGH a node (not the origin, not the final stop): city 8 min, regional centre 4 min, town 2 min
//   no traffic, no rest stops, no roadworks, no ferries. Off-network locations are priced from the nearest node at 60 km/h x 1.25 detour.
import type { Pt } from "./geo.ts";
import { haversine } from "./geo.ts";

export type RoadClass = "motorway" | "highway" | "rural";
export type Town = { id: string; name: string; lon: number; lat: number; size: "city" | "centre" | "town" };
export type Road = { a: string; b: string; cls: RoadClass; name: string };
const T = (id: string, name: string, lon: number, lat: number, size: Town["size"]): Town => ({ id, name, lon, lat, size });
export const TOWNS: Town[] = [
  T("bne", "Brisbane", 153.03, -27.47, "city"), T("gc", "Gold Coast", 153.4, -28.0, "city"), T("ips", "Ipswich", 152.76, -27.62, "centre"), T("twb", "Toowoomba", 151.95, -27.56, "centre"),
  T("war", "Warwick", 152.03, -28.22, "town"), T("gdi", "Goondiwindi", 150.31, -28.55, "town"), T("dal", "Dalby", 151.27, -27.18, "town"), T("rom", "Roma", 148.79, -26.57, "town"),
  T("cha", "Charleville", 146.26, -26.4, "town"), T("cun", "Cunnamulla", 145.68, -28.07, "town"), T("kin", "Kingaroy", 151.84, -26.54, "town"), T("gym", "Gympie", 152.67, -26.19, "centre"),
  T("mar", "Maryborough", 152.7, -25.54, "town"), T("bun", "Bundaberg", 152.35, -24.87, "centre"), T("gla", "Gladstone", 151.26, -23.84, "centre"), T("roc", "Rockhampton", 150.51, -23.38, "centre"),
  T("eme", "Emerald", 148.16, -23.52, "town"), T("bar", "Barcaldine", 145.29, -23.55, "town"), T("lon", "Longreach", 144.25, -23.44, "town"), T("bla", "Blackall", 145.47, -24.42, "town"),
  T("mac", "Mackay", 149.19, -21.14, "centre"), T("pro", "Proserpine", 148.58, -20.4, "town"), T("bow", "Bowen", 148.24, -20.01, "town"), T("tsv", "Townsville", 146.82, -19.26, "city"),
  T("ing", "Ingham", 146.16, -18.65, "town"), T("inn", "Innisfail", 146.03, -17.52, "town"), T("cns", "Cairns", 145.77, -16.92, "city"), T("mos", "Mossman", 145.37, -16.46, "town"),
  T("ath", "Atherton", 145.48, -17.27, "town"), T("ctw", "Charters Towers", 146.26, -20.08, "town"), T("hug", "Hughenden", 144.2, -20.85, "town"), T("jul", "Julia Creek", 141.75, -20.66, "town"),
  T("clo", "Cloncurry", 140.51, -20.7, "town"), T("mti", "Mount Isa", 139.49, -20.73, "town"), T("win", "Winton", 143.04, -22.39, "town"),
];
export const ROADS: Road[] = [
  { a: "bne", b: "gc", cls: "motorway", name: "M1 Pacific Motorway" }, { a: "bne", b: "gym", cls: "motorway", name: "Bruce Highway (south)" }, { a: "bne", b: "ips", cls: "motorway", name: "Ipswich Motorway" },
  { a: "ips", b: "twb", cls: "motorway", name: "Warrego Highway" }, { a: "ips", b: "war", cls: "highway", name: "Cunningham Highway" }, { a: "twb", b: "war", cls: "highway", name: "New England Highway" },
  { a: "war", b: "gdi", cls: "highway", name: "Cunningham Highway" }, { a: "twb", b: "dal", cls: "highway", name: "Warrego Highway" }, { a: "dal", b: "rom", cls: "highway", name: "Warrego Highway" },
  { a: "rom", b: "cha", cls: "highway", name: "Warrego Highway" }, { a: "cha", b: "cun", cls: "rural", name: "Mitchell Highway" }, { a: "cha", b: "bla", cls: "rural", name: "Landsborough Highway" },
  { a: "bla", b: "bar", cls: "rural", name: "Landsborough Highway" }, { a: "bar", b: "lon", cls: "rural", name: "Landsborough Highway" }, { a: "twb", b: "kin", cls: "highway", name: "Bunya Highway" },
  { a: "kin", b: "gym", cls: "highway", name: "Wide Bay Highway" }, { a: "gym", b: "mar", cls: "highway", name: "Bruce Highway" }, { a: "mar", b: "bun", cls: "highway", name: "Bruce Highway" },
  { a: "bun", b: "gla", cls: "highway", name: "Bruce Highway" }, { a: "gla", b: "roc", cls: "highway", name: "Bruce Highway" }, { a: "roc", b: "mac", cls: "highway", name: "Bruce Highway" },
  { a: "mac", b: "pro", cls: "highway", name: "Bruce Highway" }, { a: "pro", b: "bow", cls: "highway", name: "Bruce Highway" }, { a: "bow", b: "tsv", cls: "highway", name: "Bruce Highway" },
  { a: "tsv", b: "ing", cls: "highway", name: "Bruce Highway" }, { a: "ing", b: "inn", cls: "highway", name: "Bruce Highway" }, { a: "inn", b: "cns", cls: "highway", name: "Bruce Highway" },
  { a: "cns", b: "mos", cls: "highway", name: "Captain Cook Highway" }, { a: "cns", b: "ath", cls: "highway", name: "Kennedy Highway" }, { a: "roc", b: "eme", cls: "highway", name: "Capricorn Highway" },
  { a: "eme", b: "bar", cls: "rural", name: "Capricorn Highway" }, { a: "mac", b: "eme", cls: "highway", name: "Peak Downs Highway" }, { a: "tsv", b: "ctw", cls: "highway", name: "Flinders Highway" },
  { a: "ctw", b: "hug", cls: "rural", name: "Flinders Highway" }, { a: "hug", b: "jul", cls: "rural", name: "Flinders Highway" }, { a: "jul", b: "clo", cls: "rural", name: "Flinders Highway" },
  { a: "clo", b: "mti", cls: "rural", name: "Barkly Highway" }, { a: "lon", b: "win", cls: "rural", name: "Landsborough Highway" }, { a: "win", b: "clo", cls: "rural", name: "Landsborough Highway" },
  { a: "win", b: "hug", cls: "rural", name: "Kennedy Developmental Road" },
];
const SPEED: Record<RoadClass, number> = { motorway: 110, highway: 100, rural: 90 }, WIND: Record<RoadClass, number> = { motorway: 1.1, highway: 1.12, rural: 1.18 };
export const DWELL: Record<Town["size"], number> = { city: 8, centre: 4, town: 2 };
export const OFFROAD = { speedKmh: 60, detour: 1.25 };

export type Graph = { towns: Town[]; adj: { to: number; km: number; min: number; road: number }[][]; roads: Road[] };
/** Build the weighted graph. Edge `min` is pure drive time; transit penalties are added by `shortestTimes`. */
export function buildGraph(towns = TOWNS, roads = ROADS): Graph {
  const ix = new Map(towns.map((t, i) => [t.id, i])); const adj: Graph["adj"] = towns.map(() => []);
  roads.forEach((r, k) => { const a = ix.get(r.a), b = ix.get(r.b); if (a === undefined || b === undefined) throw new Error(`unknown town in road ${r.a}-${r.b}`); const km = (haversine(towns[a], towns[b]) / 1000) * WIND[r.cls], min = (km / SPEED[r.cls]) * 60; adj[a].push({ to: b, km, min, road: k }); adj[b].push({ to: a, km, min, road: k }); });
  return { towns, adj, roads };
}
/** Binary-heap Dijkstra. Passing through node u (not the source) costs DWELL[size]. Returns arrival minutes, predecessor and the km driven along the chosen route. */
export function shortestTimes(g: Graph, source: number) {
  const n = g.towns.length, dist = Array<number>(n).fill(Infinity), prev = Array<number>(n).fill(-1), km = Array<number>(n).fill(0); dist[source] = 0;
  const heap: [number, number][] = [[0, source]];
  const push = (e: [number, number]) => { heap.push(e); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop()!; if (heap.length) { heap[0] = last; let i = 0; for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  while (heap.length) { const [d, u] = pop(); if (d > dist[u]) continue; const pen = u === source ? 0 : DWELL[g.towns[u].size];
    for (const e of g.adj[u]) { const nd = d + pen + e.min; if (nd < dist[e.to]) { dist[e.to] = nd; prev[e.to] = u; km[e.to] = km[u] + e.km; push([nd, e.to]); } } }
  return { dist, prev, km };
}
export const routeTo = (prev: number[], to: number) => { const out = [to]; while (prev[out[0]] >= 0) out.unshift(prev[out[0]]); return out; };
/** Minutes to reach an arbitrary point: nearest network node time plus an off-road leg. */
export function timeToPoint(g: Graph, dist: number[], p: Pt) {
  let best = Infinity; g.towns.forEach((t, i) => { if (!Number.isFinite(dist[i])) return; const off = ((haversine({ lat: p[1], lon: p[0] }, t) / 1000) * OFFROAD.detour / OFFROAD.speedKmh) * 60; if (dist[i] + off < best) best = dist[i] + off; });
  return best;
}
/** Arrival time at a fraction f (0 at `a`, 1 at `b`) along an edge, from whichever end gets there first (the middle of long legs is reached from both sides). */
export const edgeTime = (ta: number, tb: number, min: number, f: number) => Math.min(ta + f * min, tb + (1 - f) * min);
