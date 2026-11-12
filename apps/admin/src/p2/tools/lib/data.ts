import { orders, services, rng, people, first, last } from "../../../data/fixtures.ts";
import type { Row } from "./sql.ts";

const r = rng(4242); const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
export const customers: Row[] = Array.from({ length: 160 }, (_, i) => {
  const name = `${pick(first)} ${pick(last)}`; const d = new Date(2026, 10, 12 - Math.floor(r() * 900));
  return { id: `C${String(1000 + i)}`, name, email: `${name.toLowerCase().replace(" ", ".")}${i % 40 === 0 ? "" : i}@example.com`, phone: `04${String(10000000 + Math.floor(r() * 89999999))}`, plan: pick(["free", "pro", "team", "pro", "pro"]), signup_date: d.toISOString().slice(0, 10), country: pick(["AU", "AU", "AU", "NZ", "US", "GB"]), balance: Math.round(r() * 50000) / 100, tags: pick(["", "vip", "retro", "nixos", "vip;retro"]), active: r() > 0.12 };
});
// Deterministic defects so the data-quality report has something to find.
customers.forEach((c, i) => {
  if (i % 17 === 3) c.email = null; if (i % 23 === 5) c.email = "not-an-email"; if (i % 29 === 7) c.phone = "12345"; if (i % 31 === 11) c.balance = -Math.abs(Number(c.balance)) - 5; if (i % 37 === 13) c.plan = "platinum"; if (i % 41 === 17) c.country = null;
  if (i === 90) c.id = "C1010"; if (i === 91) c.email = customers[0].email; if (i % 53 === 19) c.signup_date = "2031-01-01";
});
export const ordersTable: Row[] = orders.map((o) => ({ id: o.id, customer: o.customer, email: o.email, status: o.status, amount: o.amount, items: o.items, region: o.region, created: o.created, owner: o.owner, progress: o.progress }));
export const servicesTable: Row[] = services.map((s) => ({ name: s.name, region: s.region, status: s.status, latency: s.latency, uptime: Math.round(s.uptime * 100) / 100, owner: s.owner }));
export const TABLES: Record<string, Row[]> = { orders: ordersTable, services: servicesTable, customers };
export { people };
