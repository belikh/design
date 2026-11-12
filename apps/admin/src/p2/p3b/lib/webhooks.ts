import { NOW, fmtStamp } from "../common.ts";

export type Delivery = { id: string; endpoint: string; event: string; code: number; outcome: "delivered" | "failed"; attempt: number; at: string; ms: number; replayOf?: string; req: string; res: string };
export const ENDPOINTS = ["https://hooks.acme.test/billing", "https://hooks.acme.test/inventory", "https://ops.example.test/alerts", "https://partner.example.test/orders"];
const EVENTS = ["invoice.paid", "invoice.failed", "stock.low", "order.created", "order.shipped", "alert.fired"];
export const responseFor = (code: number) => (code < 300 ? `{"ok":true}` : code === 503 ? `{"error":"upstream unavailable"}` : code === 401 ? `{"error":"bad signature"}` : `{"error":"timeout after 10s"}`);
export const bodyFor = (event: string, n: number) => JSON.stringify({ id: `evt_${1000 + n}`, type: event, created: n * 97 + 1_700_000_000, data: { object: { id: `obj_${n}`, amount: 1200 + (n % 9) * 340, currency: "aud" } } }, null, 2);
/** Deterministic seed: the billing endpoint is failing, a few others have a stray 401 or timeout. */
export function seed(): Delivery[] {
  return Array.from({ length: 36 }, (_, i) => {
    const endpoint = ENDPOINTS[(i * 3) % 4]; const event = EVENTS[(i * 5) % 6];
    const code = endpoint.endsWith("billing") && i % 3 !== 0 ? 503 : i % 11 === 7 ? 401 : i % 13 === 5 ? 504 : 200;
    return { id: `dl_${String(i + 1).padStart(3, "0")}`, endpoint, event, code, outcome: code < 300 ? "delivered" : "failed", attempt: code >= 500 ? 1 + (i % 3) : 1, at: fmtStamp(new Date(NOW.getTime() - (36 - i) * 11 * 60000)), ms: 80 + ((i * 53) % 420), req: bodyFor(event, i + 1), res: responseFor(code) } as Delivery;
  });
}
/** Replaying an unhealthy endpoint fails again with a 503. */
export const replayResult = (d: Delivery, healthy: boolean, n: number): Delivery => {
  const code = healthy ? 200 : 503;
  return { ...d, id: `dl_r${n}`, code, outcome: code < 300 ? "delivered" : "failed", attempt: d.attempt + 1, at: fmtStamp(NOW), ms: 90 + ((n * 41) % 200), replayOf: d.id, res: responseFor(code) };
};
