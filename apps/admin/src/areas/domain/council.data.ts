import { DAY, isoDate, parseIso, NOW } from "./lib.ts";

export type BinType = "general" | "recycling" | "green";
export type Zone = { id: string; name: string; weekday: number; /** which fortnight (0|1) recycling falls on */ recyclingWeek: 0 | 1 };
export const ZONES: Zone[] = [{ id: "z1", name: "North Ridge (Mon)", weekday: 1, recyclingWeek: 0 }, { id: "z2", name: "Riverbend (Wed)", weekday: 3, recyclingWeek: 1 }, { id: "z3", name: "Harbour Flats (Fri)", weekday: 5, recyclingWeek: 0 }];
const EPOCH = new Date(2026, 0, 5); // a Monday: week 0
const weekIndex = (d: Date) => Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - EPOCH.getTime()) / (7 * DAY));
/** Waste rules: general weekly on the zone weekday; recycling fortnightly; green waste on the alternate fortnight. */
export function collectionsOn(zone: Zone, date: Date): BinType[] {
  if (date.getDay() !== zone.weekday) return [];
  const w = ((weekIndex(date) % 2) + 2) % 2; const out: BinType[] = ["general"]; out.push(w === zone.recyclingWeek ? "recycling" : "green"); return out;
}
export function nextCollection(zone: Zone, type: BinType, from: Date = NOW): Date | null { for (let i = 0; i < 28; i++) { const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i); if (collectionsOn(zone, d).includes(type)) return d; } return null; }
export function monthGrid(year: number, month: number, zone: Zone) { const first = new Date(year, month, 1); const lead = (first.getDay() + 6) % 7; const days = new Date(year, month + 1, 0).getDate(); return Array.from({ length: Math.ceil((lead + days) / 7) * 7 }, (_, i) => { const d = new Date(year, month, 1 - lead + i); return { date: d, inMonth: d.getMonth() === month, bins: collectionsOn(zone, d) }; }); }
export type CarPark = { id: string; name: string; x: number; y: number; capacity: number; occupied: number; pricePerHour: number; maxStayHours: number; accessible: number };
export const CARPARKS: CarPark[] = [
  { id: "cp1", name: "Riverside Plaza", x: 130, y: 90, capacity: 320, occupied: 291, pricePerHour: 4.5, maxStayHours: 4, accessible: 12 }, { id: "cp2", name: "Library Street", x: 260, y: 150, capacity: 90, occupied: 38, pricePerHour: 2, maxStayHours: 3, accessible: 6 },
  { id: "cp3", name: "Station East", x: 380, y: 70, capacity: 210, occupied: 206, pricePerHour: 0, maxStayHours: 12, accessible: 8 }, { id: "cp4", name: "Market Square", x: 210, y: 230, capacity: 140, occupied: 97, pricePerHour: 3.2, maxStayHours: 2, accessible: 9 },
  { id: "cp5", name: "Botanic Gate", x: 470, y: 200, capacity: 60, occupied: 12, pricePerHour: 0, maxStayHours: 4, accessible: 4 },
];
export const occupancy = (c: CarPark) => c.occupied / c.capacity;
export const level = (c: CarPark): "ok" | "busy" | "full" => (occupancy(c) >= 0.95 ? "full" : occupancy(c) >= 0.75 ? "busy" : "ok");
/** Nearest car park with at least `minFree` spaces, by straight-line distance on the schematic. */
export function nearestWithSpace(from: { x: number; y: number }, parks: CarPark[], minFree = 5) { return [...parks].filter((c) => c.capacity - c.occupied >= minFree).sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y))[0] ?? null; }
export type Dataset = { id: string; title: string; publisher: string; tags: string[]; formats: string[]; updated: string; freq: string; rows: number; license: string; columns: { name: string; type: string; sample: string }[] };
export const DATASETS: Dataset[] = [
  { id: "ds1", title: "Kerbside collection zones", publisher: "Waste Services", tags: ["waste", "zones"], formats: ["CSV", "GeoJSON"], updated: "2026-11-01", freq: "quarterly", rows: 412, license: "CC-BY 4.0", columns: [{ name: "zone_id", type: "string", sample: "z1" }, { name: "weekday", type: "int", sample: "1" }, { name: "suburb", type: "string", sample: "North Ridge" }] },
  { id: "ds2", title: "Car park occupancy (live)", publisher: "Transport", tags: ["parking", "live"], formats: ["JSON", "CSV"], updated: "2026-11-12", freq: "every 5 minutes", rows: 38, license: "CC-BY 4.0", columns: [{ name: "car_park_id", type: "string", sample: "cp1" }, { name: "capacity", type: "int", sample: "320" }, { name: "occupied", type: "int", sample: "291" }] },
  { id: "ds3", title: "Library branches and hours", publisher: "Libraries", tags: ["library", "hours"], formats: ["CSV"], updated: "2026-09-20", freq: "yearly", rows: 33, license: "CC-BY 4.0", columns: [{ name: "branch", type: "string", sample: "Central" }, { name: "opens", type: "time", sample: "09:00" }] },
  { id: "ds4", title: "Street trees register", publisher: "Parks", tags: ["trees", "environment", "geo"], formats: ["CSV", "GeoJSON"], updated: "2026-08-02", freq: "monthly", rows: 51230, license: "CC-BY 4.0", columns: [{ name: "tree_id", type: "string", sample: "T-90211" }, { name: "species", type: "string", sample: "Eucalyptus" }, { name: "lat", type: "float", sample: "-27.46" }] },
  { id: "ds5", title: "Development applications", publisher: "Planning", tags: ["planning"], formats: ["CSV"], updated: "2026-11-10", freq: "daily", rows: 9120, license: "CC-BY 4.0", columns: [{ name: "app_no", type: "string", sample: "A004-2026" }, { name: "status", type: "string", sample: "approved" }] },
  { id: "ds6", title: "Cycleway counters", publisher: "Transport", tags: ["cycling", "live", "geo"], formats: ["JSON"], updated: "2026-11-12", freq: "hourly", rows: 64, license: "CC0", columns: [{ name: "counter", type: "string", sample: "river-1" }, { name: "count", type: "int", sample: "184" }] },
];
export const searchDatasets = (ds: Dataset[], q: string, tag: string) => ds.filter((d) => (tag === "all" || d.tags.includes(tag)) && (!q.trim() || `${d.title} ${d.publisher} ${d.tags.join(" ")}`.toLowerCase().includes(q.toLowerCase())));
export const staleDays = (d: Dataset) => Math.round((NOW.getTime() - parseIso(d.updated).getTime()) / DAY);
export const toCsv = (d: Dataset) => [d.columns.map((c) => c.name).join(","), d.columns.map((c) => c.sample).join(",")].join("\n");
export const iso = isoDate;
