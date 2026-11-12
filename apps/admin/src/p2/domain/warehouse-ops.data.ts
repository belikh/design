import { mean, prng, sum } from "./lib.ts";

export type Sku = { sku: string; name: string; loc: string; onHand: number; reorderPoint: number; leadDays: number; dailyUse: number; uom: string };
export type AsnLine = { asn: string; sku: string; expected: number; received?: number; damaged?: number; status: "expected" | "received" | "discrepancy" };
export type Picker = { name: string; lines: number[]; target: number };
export type WOrder = { id: string; customer: string; lines: number; picked: number; due: string; status: "open" | "picking" | "packed" | "shipped" };
export const SKUS: Sku[] = [
  { sku: "PAL-CHEP", name: "Pallets (standard)", loc: "A-01", onHand: 420, reorderPoint: 150, leadDays: 5, dailyUse: 30, uom: "ea" }, { sku: "FOOD-OAT", name: "Oat milk 1L (carton of 12)", loc: "B-03", onHand: 86, reorderPoint: 120, leadDays: 3, dailyUse: 34, uom: "ctn" },
  { sku: "FOOD-FRZ", name: "Frozen veg 1kg (box of 10)", loc: "F-02", onHand: 210, reorderPoint: 100, leadDays: 4, dailyUse: 18, uom: "box" }, { sku: "CHM-DG1", name: "Cleaning concentrate 5L", loc: "D-01", onHand: 48, reorderPoint: 40, leadDays: 7, dailyUse: 4, uom: "ea" },
  { sku: "PKG-TAPE", name: "Packing tape (36 rolls)", loc: "A-07", onHand: 12, reorderPoint: 20, leadDays: 2, dailyUse: 3, uom: "case" }, { sku: "ELC-USB", name: "USB-C cable 2m (box of 50)", loc: "C-11", onHand: 95, reorderPoint: 30, leadDays: 10, dailyUse: 2, uom: "box" },
];
export const daysCover = (s: Sku) => (s.dailyUse > 0 ? s.onHand / s.dailyUse : Infinity);
/** Reorder status: below the reorder point, or (stock cover) shorter than the lead time. */
export const reorderStatus = (s: Sku): "ok" | "reorder" | "stockout-risk" => (daysCover(s) < s.leadDays ? "stockout-risk" : s.onHand <= s.reorderPoint ? "reorder" : "ok");
export const suggestedOrder = (s: Sku, targetDays = 21) => Math.max(0, Math.ceil(s.dailyUse * (targetDays + s.leadDays) - s.onHand));
export const ASN: AsnLine[] = [
  { asn: "ASN-7731", sku: "FOOD-OAT", expected: 240, status: "expected" }, { asn: "ASN-7731", sku: "FOOD-FRZ", expected: 60, status: "expected" }, { asn: "ASN-7728", sku: "PKG-TAPE", expected: 40, received: 40, damaged: 0, status: "received" }, { asn: "ASN-7725", sku: "CHM-DG1", expected: 24, received: 20, damaged: 1, status: "discrepancy" },
];
export { reconcile, type Receipt } from "../../warehouse/engine.ts";
const rr = prng(31);
export const PICKERS: Picker[] = ["Ava", "Noah", "Mia", "Liam", "Zoe"].map((name, i) => ({ name, target: 90, lines: Array.from({ length: 8 }, () => Math.round(70 + i * 6 + rr() * 30 - (i === 4 ? 25 : 0))) }));
export const pickRate = (p: Picker) => mean(p.lines);
export const teamRate = (ps: Picker[]) => sum(ps.map(pickRate));
export const ORDERS: WOrder[] = Array.from({ length: 12 }, (_, i) => { const lines = 6 + ((i * 7) % 22); const st = (["shipped", "packed", "picking", "picking", "open", "open"] as const)[i % 6]; return { id: `SO-${5100 + i}`, customer: ["Northgate Foods", "Bayside Hardware", "Harbour Cafe", "Moreton Supply"][i % 4], lines, picked: st === "open" ? 0 : st === "picking" ? Math.floor(lines * (0.3 + 0.1 * (i % 5))) : lines, due: `2026-11-${12 + (i % 3)}`, status: st }; });
export const orderProgress = (o: WOrder) => (o.lines ? o.picked / o.lines : 0);
