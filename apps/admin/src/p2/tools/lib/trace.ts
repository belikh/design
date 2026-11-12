export type Span = { id: string; parent: string | null; service: string; name: string; start: number; dur: number; status: "ok" | "error"; attrs: Record<string, string | number> };
export type Trace = { id: string; spans: Span[]; total: number };
/** A deterministic fake distributed trace: edge → api → (auth, db, cache, media) with realistic overlap. */
export function makeTrace(seed = 1): Trace {
  const j = (n: number) => ((seed * 9301 + n * 49297) % 233280) / 233280; const S: Span[] = [];
  const add = (id: string, parent: string | null, service: string, name: string, start: number, dur: number, attrs: Span["attrs"] = {}, status: Span["status"] = "ok") => S.push({ id, parent, service, name, start: Math.round(start * 10) / 10, dur: Math.round(dur * 10) / 10, status, attrs });
  const bad = seed % 3 === 0;
  add("a", null, "edge", "GET /v1/orders", 0, 214 + j(1) * 40, { "http.method": "GET", "http.status": bad ? 500 : 200 }, bad ? "error" : "ok");
  add("b", "a", "jupiter-api", "handle orders.list", 6, 196 + j(2) * 30, { "route": "/v1/orders" }); add("c", "b", "auth", "verify token", 9, 18 + j(3) * 6, { "alg": "ES256" });
  add("d", "b", "jupiter-api", "load customer prefs", 30, 22, {}); add("e", "d", "cache", "GET prefs:ava", 32, 3 + j(4) * 2, { "hit": "true" });
  add("f", "b", "db", "SELECT orders", 58, 88 + j(5) * 25, { "rows": 25, "sql": "select * from orders where …" }); add("g", "f", "db", "wait for connection", 58, 14 + j(6) * 10, { "pool": "main" });
  add("h", "b", "media-archive", "GET /thumbs", 60, 122 + j(7) * 20, { "items": 12 }, bad ? "error" : "ok"); add("i", "h", "storage", "read blobs", 72, 92 + j(8) * 18, { "bytes": 482113 }, bad ? "error" : "ok");
  add("j", "b", "jupiter-api", "serialize", 160 + j(9) * 15, 24, {});
  return { id: `trace-${seed.toString(16).padStart(4, "0")}`, spans: S, total: Math.max(...S.map((s) => s.start + s.dur)) };
}
export const children = (spans: Span[], id: string | null) => spans.filter((s) => s.parent === id).sort((a, b) => a.start - b.start);
export function depthOf(spans: Span[], s: Span): number { let d = 0; for (let p = s.parent; p; d++) p = spans.find((x) => x.id === p)?.parent ?? null; return d; }
export const flatten = (spans: Span[], collapsed: Set<string> = new Set()): Span[] => { const out: Span[] = []; const walk = (id: string | null) => { for (const c of children(spans, id)) { out.push(c); if (!collapsed.has(c.id)) walk(c.id); } }; walk(null); return out; };
/** The chain of spans that determines the end-to-end latency: from the root, repeatedly follow the child that finishes last. */
export function criticalPath(spans: Span[]): Set<string> {
  const out = new Set<string>(); let cur: Span | undefined = spans.find((s) => s.parent === null);
  while (cur) { out.add(cur.id); const kids: Span[] = children(spans, cur.id); cur = kids.length ? kids.reduce((a, b) => (a.start + a.dur >= b.start + b.dur ? a : b)) : undefined; }
  return out;
}
/** Self time: the span's duration minus the union of its children's time ranges. */
export function selfTime(spans: Span[], s: Span): number {
  const iv = children(spans, s.id).map((c) => [c.start, c.start + c.dur] as const).sort((a, b) => a[0] - b[0]); let covered = 0, end = -Infinity;
  for (const [a, b] of iv) { const lo = Math.max(a, end); if (b > lo) covered += b - lo; end = Math.max(end, b); } return Math.max(0, Math.round((s.dur - covered) * 10) / 10);
}
export const serviceBreakdown = (spans: Span[]) => { const m = new Map<string, number>(); spans.forEach((s) => m.set(s.service, (m.get(s.service) ?? 0) + selfTime(spans, s))); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
