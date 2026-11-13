// Pure, deterministic logic behind the "views" pages. No React; unit-tested in logic.test.ts.

/* ---------- SLO and error budget ---------- */
export type BudgetState = { allowedBad: number; consumed: number; remaining: number; remainingPct: number; burnRate: number; daysToExhaust: number | null };
/** `bad[i]` is the fraction of requests (or minutes) that were bad on day i. `slo` e.g. 0.999. burnRate 1 = consuming exactly the budget over the window. */
export function errorBudget(slo: number, windowDays: number, bad: number[]): BudgetState {
  const allowedBad = (1 - slo) * windowDays; const consumed = bad.reduce((a, b) => a + b, 0);
  const elapsed = Math.max(1, bad.length); const burnRate = consumed / allowedBad / (elapsed / windowDays);
  const remaining = allowedBad - consumed; const perDay = consumed / elapsed;
  return { allowedBad, consumed, remaining, remainingPct: Math.max(0, (remaining / allowedBad) * 100), burnRate, daysToExhaust: remaining <= 0 ? 0 : perDay > 0 ? remaining / perDay : null };
}
/** Allowed downtime per window for an availability target ("nines"). */
export const allowedDowntimeMin = (target: number, windowDays: number) => (1 - target) * windowDays * 24 * 60;
export const nines = (target: number) => Math.round(-Math.log10(1 - target) * 10) / 10;

/* ---------- capacity forecast ---------- */
export function linearFit(y: number[]) {
  const n = y.length; const mx = (n - 1) / 2; const my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0; y.forEach((v, i) => { sxy += (i - mx) * (v - my); sxx += (i - mx) ** 2; });
  const slope = sxx ? sxy / sxx : 0; const intercept = my - slope * mx;
  const resid = y.map((v, i) => v - (intercept + slope * i)); const sd = Math.sqrt(resid.reduce((a, b) => a + b * b, 0) / Math.max(1, n - 2));
  return { slope, intercept, sd };
}
export function forecast(y: number[], horizon: number, growth = 1) {
  const f = linearFit(y); const n = y.length;
  const fut = Array.from({ length: horizon }, (_, k) => (f.intercept + f.slope * growth * (n + k)));
  return { fitted: y.map((_, i) => f.intercept + f.slope * i), future: fut, lo: fut.map((v) => v - 1.96 * f.sd), hi: fut.map((v) => v + 1.96 * f.sd), slope: f.slope * growth };
}
/** Days from the last observation until the trend crosses `limit` (null if it never does). */
export function daysUntil(y: number[], limit: number, growth = 1): number | null {
  const f = linearFit(y); const slope = f.slope * growth; const last = f.intercept + f.slope * (y.length - 1);
  if (last >= limit) return 0; if (slope <= 0) return null; return (limit - last) / slope;
}

/* ---------- cost ---------- */
export type CostLine = { tag: string; budget: number; actual: number };
export const variance = (c: CostLine) => ({ abs: c.actual - c.budget, pct: c.budget ? ((c.actual - c.budget) / c.budget) * 100 : 0, status: c.actual > c.budget * 1.1 ? "danger" as const : c.actual > c.budget ? "warn" as const : "ok" as const });
/** Straight-line projection of month-end spend from spend so far. */
export const projectMonthEnd = (spendSoFar: number, dayOfMonth: number, daysInMonth: number) => (spendSoFar / dayOfMonth) * daysInMonth;

/* ---------- SLA timers ---------- */
export type Priority = "P1" | "P2" | "P3" | "P4";
export const SLA_MIN: Record<Priority, number> = { P1: 60, P2: 240, P3: 1440, P4: 4320 };
export type SlaTicket = { openedAt: number; priority: Priority; pausedMin?: number; pausedAt?: number; resolvedAt?: number };
export type SlaState = { state: "ok" | "risk" | "breached" | "met"; remainingMin: number; pct: number };
/** Minutes are absolute (e.g. minutes since epoch). The clock stops while the ticket is waiting on the customer, and on resolution. */
export function slaState(t: SlaTicket, now: number): SlaState {
  const limit = SLA_MIN[t.priority]; const end = t.resolvedAt ?? (t.pausedAt ?? now);
  const used = Math.max(0, end - t.openedAt - (t.pausedMin ?? 0)); const remaining = limit - used; const pct = Math.min(100, (used / limit) * 100);
  if (t.resolvedAt !== undefined) return { state: remaining >= 0 ? "met" : "breached", remainingMin: remaining, pct };
  return { state: remaining < 0 ? "breached" : remaining < limit * 0.25 ? "risk" : "ok", remainingMin: remaining, pct };
}
export const fmtMin = (m: number) => { const a = Math.abs(m); const s = a >= 1440 ? `${Math.floor(a / 1440)}d ${Math.floor((a % 1440) / 60)}h` : a >= 60 ? `${Math.floor(a / 60)}h ${Math.round(a % 60)}m` : `${Math.round(a)}m`; return m < 0 ? `-${s}` : s; };

/* ---------- duplicates ---------- */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
function jaro(a: string, b: string) {
  if (a === b) return 1; const la = a.length, lb = b.length; if (!la || !lb) return 0; const md = Math.max(0, Math.floor(Math.max(la, lb) / 2) - 1);
  const ma = new Array(la).fill(false), mb = new Array(lb).fill(false); let m = 0;
  for (let i = 0; i < la; i++) for (let j = Math.max(0, i - md); j < Math.min(lb, i + md + 1); j++) if (!mb[j] && a[i] === b[j]) { ma[i] = mb[j] = true; m++; break; }
  if (!m) return 0; let t = 0, k = 0; for (let i = 0; i < la; i++) if (ma[i]) { while (!mb[k]) k++; if (a[i] !== b[k]) t++; k++; }
  return (m / la + m / lb + (m - t / 2) / m) / 3;
}
export function jaroWinkler(x: string, y: string) { const a = norm(x), b = norm(y); const j = jaro(a, b); let p = 0; while (p < 4 && a[p] && a[p] === b[p]) p++; return j + p * 0.1 * (1 - j); }
export type Contact = { id: string; name: string; email: string; phone: string; company: string; stage?: string; notes?: string };
const digits = (s: string) => s.replace(/\D/g, "");
/** Similarity of two contacts in [0,1]: identical email or phone is a near-certain match; otherwise fuzzy name + company. */
export function contactSimilarity(a: Contact, b: Contact): { score: number; reasons: string[] } {
  const reasons: string[] = []; let score = 0;
  if (a.email && a.email.toLowerCase() === b.email.toLowerCase()) { score = Math.max(score, 0.98); reasons.push("same email"); }
  if (digits(a.phone).length >= 8 && digits(a.phone).slice(-8) === digits(b.phone).slice(-8)) { score = Math.max(score, 0.95); reasons.push("same phone"); }
  const nm = jaroWinkler(a.name, b.name); if (nm > 0.88) reasons.push(`name ${Math.round(nm * 100)}% alike`);
  const co = a.company && b.company ? jaroWinkler(a.company, b.company) : 0; if (co > 0.9) reasons.push("same company");
  score = Math.max(score, nm * 0.75 + co * 0.25 > 0.86 ? nm * 0.75 + co * 0.25 : 0); return { score, reasons };
}
export function findDuplicateGroups(list: Contact[], threshold = 0.86): { ids: string[]; score: number; reasons: string[] }[] {
  const parent = new Map(list.map((c) => [c.id, c.id])); const find = (x: string): string => (parent.get(x) === x ? x : (parent.set(x, find(parent.get(x)!)), parent.get(x)!));
  const meta = new Map<string, { score: number; reasons: Set<string> }>();
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) { const r = contactSimilarity(list[i], list[j]); if (r.score >= threshold) { const a = find(list[i].id), b = find(list[j].id); if (a !== b) parent.set(a, b); const root = find(list[i].id); const m = meta.get(root) ?? { score: 0, reasons: new Set<string>() }; m.score = Math.max(m.score, r.score); r.reasons.forEach((x) => m.reasons.add(x)); meta.set(root, m); } }
  const groups = new Map<string, string[]>(); for (const c of list) { const r = find(c.id); groups.set(r, [...(groups.get(r) ?? []), c.id]); }
  return [...groups.entries()].filter(([, ids]) => ids.length > 1).map(([r, ids]) => { const m = [...meta.entries()].filter(([k]) => find(k) === r).map(([, v]) => v); return { ids, score: Math.max(...m.map((x) => x.score)), reasons: [...new Set(m.flatMap((x) => [...x.reasons]))] }; });
}
/** Merge: keep the primary's values, fill blanks from the others, and join distinct notes. */
export function mergeContacts(primary: Contact, others: Contact[]): Contact {
  const out = { ...primary }; const notes = new Set<string>(primary.notes ? [primary.notes] : []);
  for (const o of others) { (["name", "email", "phone", "company", "stage"] as const).forEach((k) => { if (!out[k] && o[k]) out[k] = o[k]; }); if (o.notes) notes.add(o.notes); }
  out.notes = [...notes].join(" / ") || undefined; return out;
}

/* ---------- taxonomy ---------- */
export type Tag = { id: string; name: string; parent: string | null; uses: number };
export const childrenOf = (tags: Tag[], id: string | null) => tags.filter((t) => t.parent === id);
export const descendants = (tags: Tag[], id: string): string[] => childrenOf(tags, id).flatMap((c) => [c.id, ...descendants(tags, c.id)]);
export const renameTag = (tags: Tag[], id: string, name: string): { tags: Tag[]; error?: string } => {
  const n = name.trim(); if (!n) return { tags, error: "Name is required" };
  const me = tags.find((t) => t.id === id); if (!me) return { tags };
  if (tags.some((t) => t.id !== id && t.parent === me.parent && t.name.toLowerCase() === n.toLowerCase())) return { tags, error: "A sibling already has that name" };
  return { tags: tags.map((t) => (t.id === id ? { ...t, name: n } : t)) };
};
/** Prevents cycles: a tag can't be moved under itself or its own descendants. */
export const moveTag = (tags: Tag[], id: string, parent: string | null): { tags: Tag[]; error?: string } => {
  if (parent === id || (parent && descendants(tags, id).includes(parent))) return { tags, error: "Can't move a tag under itself" };
  return { tags: tags.map((t) => (t.id === id ? { ...t, parent } : t)) };
};
/** Merge `from` into `into`: usage counts add, children of `from` move under `into`, `from` disappears. */
export const mergeTags = (tags: Tag[], from: string, into: string): { tags: Tag[]; error?: string } => {
  if (from === into) return { tags, error: "Pick a different target" }; if (descendants(tags, from).includes(into)) return { tags, error: "Can't merge a tag into its own child" };
  const src = tags.find((t) => t.id === from), dst = tags.find((t) => t.id === into); if (!src || !dst) return { tags };
  return { tags: tags.filter((t) => t.id !== from).map((t) => (t.id === into ? { ...t, uses: t.uses + src.uses } : t.parent === from ? { ...t, parent: into } : t)) };
};
export const deleteTag = (tags: Tag[], id: string) => { const gone = new Set([id, ...descendants(tags, id)]); return tags.filter((t) => !gone.has(t.id)); };

/* ---------- versions ---------- */
export type Version = { id: string; n: number; at: string; by: string; note: string; body: string; restoredFrom?: number };
/** Restoring never rewrites history: it appends a new head version with the old content. */
export const restoreVersion = (vs: Version[], id: string, by: string, at: string): Version[] => {
  const v = vs.find((x) => x.id === id); if (!v) return vs; const n = Math.max(...vs.map((x) => x.n)) + 1;
  return [...vs, { id: `v${n}`, n, at, by, note: `Restored v${v.n}`, body: v.body, restoredFrom: v.n }];
};

/* ---------- tasks ---------- */
export type SubTask = { id: string; title: string; done: boolean; sub?: SubTask[] };
export const rollup = (t: SubTask): { done: number; total: number } => (t.sub?.length ? t.sub.map(rollup).reduce((a, b) => ({ done: a.done + b.done, total: a.total + b.total }), { done: 0, total: 0 }) : { done: t.done ? 1 : 0, total: 1 });
export const setDone = (list: SubTask[], id: string, done: boolean): SubTask[] => list.map((t) => (t.id === id ? setAll(t, done) : { ...t, sub: t.sub ? setDone(t.sub, id, done) : undefined, done: t.sub ? syncParent(t.sub, id, done) ?? t.done : t.done }));
const setAll = (t: SubTask, done: boolean): SubTask => ({ ...t, done, sub: t.sub?.map((s) => setAll(s, done)) });
function syncParent(sub: SubTask[], id: string, done: boolean): boolean | undefined { const next = setDone(sub, id, done); return next.every((s) => s.done); }

/* ---------- ordering ---------- */
export const move = <T,>(arr: T[], from: number, to: number): T[] => { if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr; const a = [...arr]; const [x] = a.splice(from, 1); a.splice(to, 0, x); return a; };

/* ---------- leaderboard ---------- */
export type Score = { id: string; name: string; score: number; prev: number };
export function ranked(rows: Score[]) {
  const sorted = [...rows].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)); const prevOrder = [...rows].sort((a, b) => b.prev - a.prev || a.name.localeCompare(b.name));
  let rank = 0; return sorted.map((r, i) => { if (i === 0 || r.score !== sorted[i - 1].score) rank = i + 1; const pr = prevOrder.findIndex((x) => x.id === r.id) + 1; return { ...r, rank, delta: pr - (i + 1) }; });
}

/* ---------- roadmap ---------- */
export type Item = { id: string; title: string; start: number; end: number; lane?: string };
/** Greedy interval packing so overlapping items get separate rows. */
export function pack<T extends { start: number; end: number }>(items: T[]): (T & { row: number })[] {
  const rows: number[] = []; return [...items].sort((a, b) => a.start - b.start || a.end - b.end).map((it) => { let r = rows.findIndex((end) => end <= it.start); if (r < 0) { r = rows.length; rows.push(0); } rows[r] = it.end; return { ...it, row: r }; });
}

/* ---------- map clustering ---------- */
export type Pt = { id: string; x: number; y: number };
/** Grid clustering: points within the same cell of size `cell` (in map units) are merged. */
export function cluster(points: Pt[], cell: number) {
  const m = new Map<string, Pt[]>(); for (const p of points) { const k = `${Math.floor(p.x / cell)}:${Math.floor(p.y / cell)}`; m.set(k, [...(m.get(k) ?? []), p]); }
  return [...m.values()].map((g) => ({ x: g.reduce((a, p) => a + p.x, 0) / g.length, y: g.reduce((a, p) => a + p.y, 0) / g.length, ids: g.map((p) => p.id) }));
}
export const pointInPolygon = (x: number, y: number, poly: [number, number][]) => { let inside = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside; } return inside; };
