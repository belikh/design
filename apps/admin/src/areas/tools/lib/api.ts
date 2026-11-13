// A local, fictional "Jupiter API". The request builder talks to this function, never to the network.
import type { Json } from "./jsonpath.ts";
export type Req = { method: string; url: string; headers: Record<string, string>; body?: string };
export type Res = { status: number; statusText: string; headers: Record<string, string>; body: string; timeMs: number; size: number };
const TEXT: Record<number, string> = { 200: "OK", 201: "Created", 204: "No Content", 400: "Bad Request", 401: "Unauthorized", 404: "Not Found", 405: "Method Not Allowed", 422: "Unprocessable Entity", 429: "Too Many Requests", 500: "Internal Server Error" };
const ORDERS = Array.from({ length: 30 }, (_, i) => ({ id: `ORD-${10240 - i}`, customer: ["Ava Nguyen", "Noah Smith", "Mia Patel", "Liam Williams", "Zoe Chen"][i % 5], status: (["paid", "pending", "refunded", "failed"] as const)[i % 4], amount: Math.round((40 + ((i * 137) % 900)) * 100) / 100, items: 1 + (i % 7) }));
const SERVICES = [{ name: "jupiter-api", status: "ok", latencyMs: 42 }, { name: "media-archive", status: "degraded", latencyMs: 180 }, { name: "pxe-boot", status: "down", latencyMs: null }];
const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
export const DEMO_TOKEN = "demo-token";
export function handle(req: Req): Res {
  const out = (status: number, body: Json | null, headers: Record<string, string> = {}, extraMs = 0): Res => { const b = body === null ? "" : JSON.stringify(body); return { status, statusText: TEXT[status] ?? "", headers: { "content-type": "application/json", "x-ratelimit-limit": "100", "x-ratelimit-remaining": String(99 - (hash(req.url) % 20)), server: "jupiter-sandbox/1.0", ...headers }, body: b, timeMs: 12 + (hash(req.method + req.url) % 90) + extraMs, size: b.length }; };
  let u: URL; try { u = new URL(req.url, "http://localhost"); } catch { return out(400, { error: "bad_url", message: "Could not parse the URL" }); }
  const method = req.method.toUpperCase(); const path = u.pathname.replace(/\/+$/, "") || "/"; const hdr = Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k.toLowerCase(), v]));
  if (path === "/v1/health") return method === "GET" ? out(200, { status: "ok", version: "1.0.0" }) : out(405, { error: "method_not_allowed" }, { allow: "GET" });
  if (!path.startsWith("/v1/")) return out(404, { error: "not_found", message: `No route for ${method} ${path}` });
  if (hdr.authorization !== `Bearer ${DEMO_TOKEN}`) return out(401, { error: "unauthorized", message: `Send "Authorization: Bearer ${DEMO_TOKEN}"` }, { "www-authenticate": 'Bearer realm="jupiter"' });
  if (path === "/v1/orders") {
    if (method === "GET") { const status = u.searchParams.get("status"); const limit = Math.min(50, Number(u.searchParams.get("limit") ?? 10)); if (!Number.isFinite(limit) || limit < 1) return out(400, { error: "bad_request", message: "limit must be a positive number" }); const rows = ORDERS.filter((o) => !status || o.status === status).slice(0, limit); return out(200, { data: rows, count: rows.length, total: ORDERS.filter((o) => !status || o.status === status).length }); }
    if (method === "POST") { let b: Json; try { b = JSON.parse(req.body ?? "") as Json; } catch { return out(400, { error: "invalid_json", message: "Request body is not valid JSON" }); } const o = (b ?? {}) as { [k: string]: Json }; const errors: string[] = []; if (typeof o.customer !== "string" || o.customer.length < 2) errors.push("customer: required, at least 2 characters"); if (typeof o.amount !== "number" || o.amount <= 0) errors.push("amount: required, must be a positive number"); if (errors.length) return out(422, { error: "validation_failed", errors }); return out(201, { id: `ORD-${10241 + (hash(JSON.stringify(o)) % 50)}`, customer: o.customer, amount: o.amount, status: "pending" }, { location: "/v1/orders/ORD-10241" }, 30); }
    return out(405, { error: "method_not_allowed" }, { allow: "GET, POST" });
  }
  const m = /^\/v1\/orders\/([\w-]+)$/.exec(path);
  if (m) { const o = ORDERS.find((x) => x.id === m[1]); if (method === "GET") return o ? out(200, o) : out(404, { error: "not_found", message: `Order ${m[1]} does not exist` }); if (method === "DELETE") return o ? out(204, null) : out(404, { error: "not_found" }); return out(405, { error: "method_not_allowed" }, { allow: "GET, DELETE" }); }
  if (path === "/v1/services") return method === "GET" ? out(200, { data: SERVICES }) : out(405, { error: "method_not_allowed" }, { allow: "GET" });
  if (path === "/v1/slow") return out(200, { ok: true }, {}, 1400); if (path === "/v1/boom") return out(500, { error: "internal", message: "Simulated failure" });
  return out(404, { error: "not_found", message: `No route for ${method} ${path}` });
}
export const toCurl = (r: Req) => `curl -X ${r.method.toUpperCase()} '${r.url}'${Object.entries(r.headers).filter(([k]) => k).map(([k, v]) => ` \\\n  -H '${k}: ${v}'`).join("")}${r.body ? ` \\\n  -d '${r.body.replace(/'/g, "'\\''")}'` : ""}`;
