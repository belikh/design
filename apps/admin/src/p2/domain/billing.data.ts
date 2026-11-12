import { NOW, daysUntil, sum } from "./lib.ts";

export type Item = { desc: string; qty: number; unit: number };
export type InvStatus = "draft" | "sent" | "paid" | "void";
export type Invoice = { number: string; client: string; issued: string; due: string; status: InvStatus; items: Item[]; notes?: string };
export const GST = 0.1;
const cents = (n: number) => Math.round(n * 100);
/** Totals in integer cents so rounding is exact: line = qty × unit, tax on the subtotal. */
export function totals(items: Item[], rate = GST) {
  const subtotal = sum(items.map((i) => cents(i.qty * i.unit))); const tax = Math.round(subtotal * rate);
  return { subtotal: subtotal / 100, tax: tax / 100, total: (subtotal + tax) / 100 };
}
export const money = (v: number) => v.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
/** Overdue = unpaid (sent) and past its due date. */
export const effectiveStatus = (inv: Invoice): InvStatus | "overdue" => (inv.status === "sent" && daysUntil(inv.due) < 0 ? "overdue" : inv.status);
export const outstanding = (invs: Invoice[]) => sum(invs.filter((i) => i.status === "sent").map((i) => totals(i.items).total));
export const nextNumber = (invs: Invoice[]) => `INV-${String(Math.max(0, ...invs.map((i) => Number(i.number.replace(/\D/g, "")))) + 1).padStart(4, "0")}`;
export function validateInvoice(inv: Pick<Invoice, "client" | "items" | "issued" | "due">): string[] {
  const e: string[] = []; if (!inv.client.trim()) e.push("Client is required"); if (!inv.items.length) e.push("Add at least one line"); if (inv.items.some((i) => !i.desc.trim())) e.push("Every line needs a description"); if (inv.items.some((i) => i.qty <= 0 || i.unit < 0)) e.push("Quantities must be positive and prices non-negative"); if (inv.due < inv.issued) e.push("Due date is before the issue date");
  return e;
}
export const INVOICES: Invoice[] = [
  { number: "INV-0042", client: "Example Pty Ltd", issued: "2026-11-12", due: "2026-11-26", status: "sent", items: [{ desc: "Network design and configuration", qty: 12, unit: 95 }, { desc: "On-site installation (access points)", qty: 3, unit: 140 }, { desc: "Cabling and materials", qty: 1, unit: 1250.5 }] },
  { number: "INV-0041", client: "Sample Industries", issued: "2026-10-20", due: "2026-11-03", status: "sent", items: [{ desc: "Firmware porting (ESP32)", qty: 20, unit: 110 }] }, { number: "INV-0040", client: "Example Pty Ltd", issued: "2026-10-01", due: "2026-10-15", status: "paid", items: [{ desc: "Retainer: October", qty: 1, unit: 1800 }] },
  { number: "INV-0039", client: "Bayside Hardware", issued: "2026-09-12", due: "2026-09-26", status: "paid", items: [{ desc: "Restoration: SGI Indy", qty: 8, unit: 90 }, { desc: "Parts", qty: 1, unit: 212.4 }] }, { number: "INV-0043", client: "Harbour Field Services", issued: "2026-11-12", due: "2026-11-26", status: "draft", items: [{ desc: "Site survey", qty: 4, unit: 120 }] },
];
export type Tier = { upTo: number; rate: number };
export type Meter = { id: string; name: string; unit: string; used: number; included: number; tiers: Tier[] };
/** Graduated tiered pricing: units above `included` are priced tier by tier. */
export function tieredCost(units: number, tiers: Tier[], included = 0): number {
  let remaining = Math.max(0, units - included), prev = 0, cost = 0;
  for (const t of tiers) { const band = Math.min(remaining, t.upTo - prev); if (band <= 0) break; cost += band * t.rate; remaining -= band; prev = t.upTo; }
  return Math.round(cost * 100) / 100;
}
export const METERS: Meter[] = [
  { id: "api", name: "API requests", unit: "requests", used: 3_420_000, included: 1_000_000, tiers: [{ upTo: 2_000_000, rate: 0.000004 }, { upTo: 10_000_000, rate: 0.000003 }, { upTo: Infinity, rate: 0.000002 }] },
  { id: "store", name: "Storage", unit: "GB", used: 83, included: 50, tiers: [{ upTo: 100, rate: 0.08 }, { upTo: Infinity, rate: 0.05 }] }, { id: "egress", name: "Egress", unit: "GB", used: 212, included: 100, tiers: [{ upTo: 500, rate: 0.09 }, { upTo: Infinity, rate: 0.06 }] },
];
export const meterCost = (m: Meter) => tieredCost(m.used, m.tiers, m.included);
export const monthBill = (ms: Meter[], base = 49) => base + sum(ms.map(meterCost));
export const DUE_SOON = () => NOW;
