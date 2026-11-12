// Billing / API / webhook logic (pure).
export const digits = (s: string) => s.replace(/\D/g, "");
export const luhn = (num: string) => { const d = digits(num); if (d.length < 12) return false; let sum = 0; for (let i = 0; i < d.length; i++) { let n = Number(d[d.length - 1 - i]); if (i % 2) { n *= 2; if (n > 9) n -= 9; } sum += n; } return sum % 10 === 0; };
export const cardBrand = (num: string) => { const d = digits(num); return /^4/.test(d) ? "Visa" : /^(5[1-5]|2[2-7])/.test(d) ? "Mastercard" : /^3[47]/.test(d) ? "Amex" : "Card"; };
export const formatCard = (num: string) => { const d = digits(num).slice(0, 16); return cardBrand(d) === "Amex" ? d.replace(/^(\d{4})(\d{0,6})(\d{0,5}).*/, (_, a, b, c) => [a, b, c].filter(Boolean).join(" ")) : d.replace(/(\d{4})(?=\d)/g, "$1 "); };
export const validExpiry = (mmyy: string, now = new Date(2026, 10, 12)) => { const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(mmyy.trim()); if (!m) return false; const mo = Number(m[1]), yr = 2000 + Number(m[2]); if (mo < 1 || mo > 12) return false; return yr > now.getFullYear() || (yr === now.getFullYear() && mo >= now.getMonth() + 1); };
/** Proration when changing plan mid-cycle: credit for unused days on the old plan, charge for remaining days on the new one. */
export function prorate(oldMonthly: number, newMonthly: number, daysLeft: number, daysInCycle = 30) { const credit = (oldMonthly * daysLeft) / daysInCycle, charge = (newMonthly * daysLeft) / daysInCycle; return { credit: round(credit), charge: round(charge), net: round(charge - credit) }; }
export const round = (n: number) => Math.round(n * 100) / 100;
export const projectUsage = (usedSoFar: number, dayOfCycle: number, daysInCycle = 30) => Math.round((usedSoFar / Math.max(1, dayOfCycle)) * daysInCycle);
/** Tiered overage pricing: [{upTo, perUnit}] applied to units above the included amount. */
export function overage(units: number, included: number, tiers: { upTo: number; perUnit: number }[]) { let left = Math.max(0, units - included), cost = 0, prev = 0; for (const t of tiers) { const span = Math.min(left, t.upTo - prev); if (span <= 0) break; cost += span * t.perUnit; left -= span; prev = t.upTo; if (left <= 0) break; } return round(cost); }

export const SCOPES = ["orders:read", "orders:write", "customers:read", "customers:write", "invoices:read", "webhooks:manage", "admin"] as const;
export const keyErrors = (name: string, scopes: string[], names: string[]) => { const e: string[] = []; if (!name.trim()) e.push("Name is required"); else if (names.map((n) => n.toLowerCase()).includes(name.trim().toLowerCase())) e.push("A key with this name exists"); if (!scopes.length) e.push("Choose at least one scope"); if (scopes.includes("admin") && scopes.length > 1) e.push("“admin” already includes every other scope"); return e; };
export function makeKey(seed: number) { const alphabet = "abcdefghijkmnpqrstuvwxyz23456789"; let s = seed >>> 0, out = ""; for (let i = 0; i < 32; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; out += alphabet[s % alphabet.length]; } return `jp_live_${out}`; }
export const mask = (k: string) => `${k.slice(0, 11)}${"•".repeat(12)}${k.slice(-4)}`;
export const urlError = (u: string): string | null => { try { const x = new URL(u); if (x.protocol !== "https:") return "Must use https://"; if (["localhost", "127.0.0.1"].includes(x.hostname)) return "Public URLs only"; return null; } catch { return "Enter a valid URL"; } };
/** Demo-only signature (FNV-1a, NOT cryptographic). Real deployments must use HMAC-SHA256. */
export function demoSign(secret: string, body: string) { let h = 2166136261; for (const c of `${secret}.${body}`) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return `v1=${(h >>> 0).toString(16).padStart(8, "0")}`; }
export type Delivery = { attempt: number; status: number | "timeout"; ms: number; retryInSec?: number };
const BACKOFF = [30, 120, 600, 3600];
/** Simulated endpoint behaviour by URL: "fail" → 500, "slow" → timeout, "flaky" → fails twice then succeeds, otherwise 200. Retries with exponential backoff up to 5 attempts. */
export function simulateDeliveries(url: string): Delivery[] {
  const out: Delivery[] = [];
  for (let a = 1; a <= 5; a++) {
    const status: Delivery["status"] = /slow/.test(url) ? "timeout" : /fail/.test(url) ? 500 : /flaky/.test(url) ? (a <= 2 ? 503 : 200) : 200; const ms = status === "timeout" ? 10000 : 80 + a * 13;
    if (status === 200) { out.push({ attempt: a, status, ms }); break; } out.push({ attempt: a, status, ms, retryInSec: a < 5 ? BACKOFF[Math.min(a - 1, BACKOFF.length - 1)] : undefined });
  }
  return out;
}
export const deliveryState = (d: Delivery[]) => (d[d.length - 1].status === 200 ? "delivered" : "failed") as "delivered" | "failed";
