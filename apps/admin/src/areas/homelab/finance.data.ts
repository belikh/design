import type { Row } from "./lib.tsx";
import { TODAY, daysBetween } from "./lib.tsx";
export type Bill = Row & { payee: string; category: string; amount: number; due: string; status: "Unpaid" | "Paid"; autopay: boolean };
export const BILLS = (): Bill[] => [
  { id: "b1", rev: 1, payee: "Origin Energy", category: "Utilities", amount: 218.4, due: "2026-11-08", status: "Unpaid", autopay: false },
  { id: "b2", rev: 1, payee: "Aussie Broadband", category: "Utilities", amount: 99, due: "2026-11-15", status: "Unpaid", autopay: true },
  { id: "b3", rev: 1, payee: "Council rates", category: "Home", amount: 512.75, due: "2026-11-30", status: "Unpaid", autopay: false },
  { id: "b4", rev: 1, payee: "Water corp", category: "Utilities", amount: 143.2, due: "2026-11-02", status: "Paid", autopay: true },
  { id: "b5", rev: 1, payee: "Car insurance", category: "Insurance", amount: 88.9, due: "2026-11-20", status: "Unpaid", autopay: true },
];
export type Sub = Row & { name: string; category: string; cost: number; cycle: "Monthly" | "Yearly"; renews: string; active: boolean };
export const SUBS = (): Sub[] => [
  { id: "u1", rev: 1, name: "Tailscale", category: "Tech", cost: 0, cycle: "Monthly", renews: "2026-12-01", active: true },
  { id: "u2", rev: 1, name: "Streaming bundle", category: "Entertainment", cost: 24.99, cycle: "Monthly", renews: "2026-11-18", active: true },
  { id: "u3", rev: 1, name: "Domain renewals", category: "Tech", cost: 96, cycle: "Yearly", renews: "2027-02-10", active: true },
  { id: "u4", rev: 1, name: "Cloud backup", category: "Tech", cost: 12, cycle: "Monthly", renews: "2026-11-14", active: true },
  { id: "u5", rev: 1, name: "Old magazine", category: "Entertainment", cost: 14.5, cycle: "Monthly", renews: "2026-11-25", active: false },
];
export type Budget = Row & { category: string; limit: number; spent: number };
export const BUDGETS = (): Budget[] => [
  { id: "g1", rev: 1, category: "Utilities", limit: 500, spent: 143.2 },
  { id: "g2", rev: 1, category: "Home", limit: 700, spent: 120 },
  { id: "g3", rev: 1, category: "Insurance", limit: 200, spent: 0 },
  { id: "g4", rev: 1, category: "Tech", limit: 150, spent: 125 },
  { id: "g5", rev: 1, category: "Entertainment", limit: 60, spent: 62.4 },
];
export const monthly = (s: Sub) => (!s.active ? 0 : s.cycle === "Monthly" ? s.cost : Math.round((s.cost / 12) * 100) / 100);
export const monthlyTotal = (s: Sub[]) => Math.round(s.reduce((a, x) => a + monthly(x), 0) * 100) / 100;
export const billState = (b: Bill): "paid" | "overdue" | "due soon" | "upcoming" => { if (b.status === "Paid") return "paid"; const d = daysBetween(TODAY, b.due); return d < 0 ? "overdue" : d <= 7 ? "due soon" : "upcoming"; };
export const budgetState = (b: Budget): "ok" | "warn" | "over" => (b.spent > b.limit ? "over" : b.spent >= b.limit * 0.8 ? "warn" : "ok");
/** Paying a bill adds its amount to its category budget; undoing subtracts it. */
export const applyPayment = (budgets: Budget[], bill: Bill, sign: 1 | -1 = 1) => budgets.map((g) => (g.category === bill.category ? { ...g, spent: Math.round((g.spent + sign * bill.amount) * 100) / 100 } : g));
export const dueIn14 = (bills: Bill[]) => Math.round(bills.filter((b) => b.status === "Unpaid" && daysBetween(TODAY, b.due) <= 14).reduce((s, b) => s + b.amount, 0) * 100) / 100;
export const renewingSoon = (subs: Sub[]) => subs.filter((s) => s.active && daysBetween(TODAY, s.renews) >= 0 && daysBetween(TODAY, s.renews) <= 7);
