import { people, rng } from "../../data/fixtures.ts";

export type ShipStatus = "Delivered" | "In transit" | "Delayed" | "Held";
export type Ship = {
  id: string; ref: string; customer: string; region: string; status: ShipStatus; mode: "Road" | "Air" | "Sea" | "Rail"; qty: number; weight: number; cost: number; margin: number; sla: number; rating: number;
  due: string; start: string; end: string; city: string; lat: number; lng: number; note: string; err?: string;
};
export const CITIES: { city: string; region: string; lat: number; lng: number }[] = [
  { city: "Brisbane", region: "QLD", lat: -27.47, lng: 153.03 }, { city: "Cairns", region: "QLD", lat: -16.92, lng: 145.77 }, { city: "Sydney", region: "NSW", lat: -33.87, lng: 151.21 }, { city: "Canberra", region: "ACT", lat: -35.28, lng: 149.13 },
  { city: "Melbourne", region: "VIC", lat: -37.81, lng: 144.96 }, { city: "Hobart", region: "TAS", lat: -42.88, lng: 147.33 }, { city: "Adelaide", region: "SA", lat: -34.93, lng: 138.6 }, { city: "Perth", region: "WA", lat: -31.95, lng: 115.86 }, { city: "Darwin", region: "NT", lat: -12.46, lng: 130.84 },
];
const CUSTOMERS = ["Kookaburra Foods", "Wombat Hardware", "Outback Mining", "Reef Marine", "Koala Textiles", "Emu Electronics", "Banksia Pharma", "Gum Leaf Paper", "Wattle Furniture", "Platypus Pumps", "Echidna Tools", "Magpie Motors"];
const NOTES = ["", "", "", "Leave at dock 4", "Fragile: handle with care", "Call driver 30 min before arrival; gate code on the booking", "Customer requested split delivery across two days", "Refrigerated: keep below 5 °C throughout transit"];
const pad = (n: number) => String(n).padStart(2, "0"); const day = (offset: number) => { const d = new Date(2026, 10, 12 + offset); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

export function makeShipments(n = 120, seed = 7): Ship[] {
  const r = rng(seed); const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  return Array.from({ length: n }, (_, i) => {
    const c = pick(CITIES); const start = Math.floor(r() * 36) - 18; const len = 1 + Math.floor(r() * 9); const status: ShipStatus = start + len < -1 ? "Delivered" : start > 0 ? pick<ShipStatus>(["In transit", "In transit", "Delayed", "Held"]) : pick<ShipStatus>(["In transit", "Delayed", "Delivered", "In transit"]);
    const note = pick(NOTES); const err = status === "Held" ? pick(["Customs declaration missing", "Weight exceeds booking by 12%", "Consignee address could not be verified"]) : undefined;
    return { id: `S${String(i + 1).padStart(3, "0")}`, ref: `SH-${String(4000 + i)}`, customer: pick(CUSTOMERS), region: c.region, status, mode: pick(["Road", "Road", "Road", "Air", "Sea", "Rail"] as const), qty: 1 + Math.floor(r() * 60), weight: Math.round((50 + r() * 4200) * 10) / 10,
      cost: Math.round((180 + r() * r() * 9000) * 100) / 100, margin: Math.round((r() * 38 - 6) * 10) / 10, sla: Math.round(4 + r() * 70), rating: 1 + Math.floor(r() * 5), due: day(start + len), start: day(start), end: day(start + len), city: c.city, lat: c.lat, lng: c.lng, note, err };
  });
}
export const SHIPMENTS = makeShipments();
export const OWNERS = people.slice(0, 6);
export const money = (v: number) => v.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
export const pct = (v: number) => `${v.toFixed(1)}%`;
