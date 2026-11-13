// Pure, deterministic logic behind the Records pages. No React; everything here is unit-tested.

/* ---------- config: staged changes, diff, apply, rollback ---------- */
export type Cfg = Record<string, string>;
export type Change = { key: string; kind: "add" | "remove" | "change"; from?: string; to?: string };
export function diffConfig(before: Cfg, after: Cfg): Change[] {
  const out: Change[] = [];
  for (const k of Object.keys(after)) { if (!(k in before)) out.push({ key: k, kind: "add", to: after[k] }); else if (before[k] !== after[k]) out.push({ key: k, kind: "change", from: before[k], to: after[k] }); }
  for (const k of Object.keys(before)) if (!(k in after)) out.push({ key: k, kind: "remove", from: before[k] });
  return out.sort((a, b) => a.key.localeCompare(b.key));
}
export const toText = (c: Cfg) => Object.keys(c).sort().map((k) => `${k}=${c[k]}`).join("\n");
export function parseText(t: string): { cfg: Cfg; errors: { line: number; msg: string }[] } {
  const cfg: Cfg = {}; const errors: { line: number; msg: string }[] = [];
  t.split("\n").forEach((raw, i) => {
    const l = raw.trim(); if (!l || l.startsWith("#")) return; const eq = l.indexOf("=");
    if (eq < 1) { errors.push({ line: i + 1, msg: "Expected KEY=value" }); return; }
    const k = l.slice(0, eq).trim(), v = l.slice(eq + 1).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_.]*$/.test(k)) errors.push({ line: i + 1, msg: `Invalid key “${k}”` }); else if (k in cfg) errors.push({ line: i + 1, msg: `Duplicate key ${k}` }); else cfg[k] = v;
  });
  return { cfg, errors };
}
export type Revision = { id: number; cfg: Cfg; at: string; by: string; note: string };
export type ConfigStore = { live: Cfg; staged: Cfg; history: Revision[]; nextId: number };
export const newStore = (live: Cfg, by = "system", at = "2026-11-01 09:00"): ConfigStore => ({ live, staged: { ...live }, history: [{ id: 1, cfg: live, at, by, note: "Initial config" }], nextId: 2 });
export const pending = (s: ConfigStore) => diffConfig(s.live, s.staged);
export function stage(s: ConfigStore, staged: Cfg): ConfigStore { return { ...s, staged }; }
export function apply(s: ConfigStore, by: string, at: string, note: string): ConfigStore {
  if (!pending(s).length) return s;
  return { ...s, live: { ...s.staged }, history: [{ id: s.nextId, cfg: { ...s.staged }, at, by, note: note || "Applied changes" }, ...s.history], nextId: s.nextId + 1 };
}
/** Roll back = apply an old revision as a NEW revision (history is append-only). */
export function rollback(s: ConfigStore, revId: number, by: string, at: string): ConfigStore {
  const r = s.history.find((x) => x.id === revId); if (!r) return s;
  return { ...s, live: { ...r.cfg }, staged: { ...r.cfg }, history: [{ id: s.nextId, cfg: { ...r.cfg }, at, by, note: `Rolled back to r${revId}` }, ...s.history], nextId: s.nextId + 1 };
}
export const discard = (s: ConfigStore): ConfigStore => ({ ...s, staged: { ...s.live } });

/* ---------- permissions: role inheritance ---------- */
export type Role = { id: string; name: string; inherits?: string; grants: Record<string, string[]> };
export const ACTIONS = ["read", "create", "update", "delete", "admin"] as const;
export function effective(roles: Role[], roleId: string): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {}; const seen = new Set<string>();
  let cur: Role | undefined = roles.find((r) => r.id === roleId);
  while (cur && !seen.has(cur.id)) { seen.add(cur.id); for (const [res, acts] of Object.entries(cur.grants)) { (out[res] ??= new Set()).forEach(() => {}); acts.forEach((a) => out[res].add(a)); } cur = cur.inherits ? roles.find((r) => r.id === cur!.inherits) : undefined; }
  return out;
}
export const can = (roles: Role[], roleId: string, res: string, act: string) => effective(roles, roleId)[res]?.has(act) ?? false;
/** Where does a permission come from? "own", an ancestor role name, or null. */
export function source(roles: Role[], roleId: string, res: string, act: string): string | null {
  const seen = new Set<string>(); let cur = roles.find((r) => r.id === roleId);
  while (cur && !seen.has(cur.id)) { seen.add(cur.id); if (cur.grants[res]?.includes(act)) return cur.id === roleId ? "own" : cur.name; cur = cur.inherits ? roles.find((r) => r.id === cur!.inherits) : undefined; }
  return null;
}
export const wouldCycle = (roles: Role[], roleId: string, parent: string) => { let c: string | undefined = parent; const seen = new Set<string>(); while (c) { if (c === roleId) return true; if (seen.has(c)) return false; seen.add(c); c = roles.find((r) => r.id === c)?.inherits; } return false; };

/* ---------- CSV import: parse, map, validate ---------- */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true; else if (c === ",") { row.push(cur); cur = ""; } else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cur); cur = ""; if (row.length > 1 || row[0] !== "") rows.push(row); row = []; } else cur += c;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
export type FieldDef = { key: string; label: string; required?: boolean; type: "text" | "email" | "number" | "date" | "enum"; options?: string[] };
export const guessMapping = (headers: string[], fields: FieldDef[]): Record<string, number> => {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, ""); const m: Record<string, number> = {};
  for (const f of fields) { const i = headers.findIndex((h) => norm(h) === norm(f.key) || norm(h) === norm(f.label)); if (i >= 0) m[f.key] = i; }
  return m;
};
export type RowResult = { row: number; values: Record<string, string>; errors: { field: string; msg: string }[] };
export function validateRows(rows: string[][], mapping: Record<string, number>, fields: FieldDef[]): RowResult[] {
  return rows.map((r, idx) => {
    const values: Record<string, string> = {}; const errors: RowResult["errors"] = [];
    for (const f of fields) {
      const i = mapping[f.key]; const v = i === undefined ? "" : (r[i] ?? "").trim(); values[f.key] = v;
      if (!v) { if (f.required) errors.push({ field: f.key, msg: "Required" }); continue; }
      if (f.type === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) errors.push({ field: f.key, msg: "Invalid email" });
      else if (f.type === "number" && !Number.isFinite(Number(v))) errors.push({ field: f.key, msg: "Not a number" });
      else if (f.type === "date" && Number.isNaN(Date.parse(v))) errors.push({ field: f.key, msg: "Invalid date" });
      else if (f.type === "enum" && f.options && !f.options.includes(v)) errors.push({ field: f.key, msg: `Must be one of ${f.options.join(", ")}` });
    }
    return { row: idx + 1, values, errors };
  });
}
export const dupes = (res: RowResult[], key: string) => { const seen = new Map<string, number>(); const out: number[] = []; for (const r of res) { const v = r.values[key]?.toLowerCase(); if (!v) continue; if (seen.has(v)) out.push(r.row); else seen.set(v, r.row); } return out; };
export const toCsvText = (headers: string[], rows: (string | number)[][]) => [headers, ...rows].map((r) => r.map((c) => { const s = String(c); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(",")).join("\n");

/* ---------- schedules ---------- */
export type Schedule = { freq: "daily" | "weekly" | "monthly"; time: string; weekday?: number; day?: number };
const pad = (n: number) => String(n).padStart(2, "0");
const fmtDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
export function nextRun(s: Schedule, from: Date): Date {
  const [h, m] = s.time.split(":").map(Number); const d = new Date(from); d.setSeconds(0, 0);
  const at = (x: Date) => { const y = new Date(x); y.setHours(h, m, 0, 0); return y; };
  if (s.freq === "daily") { let c = at(d); if (c <= from) c = at(new Date(d.getTime() + 864e5)); return c; }
  if (s.freq === "weekly") { const wd = s.weekday ?? 1; let c = at(d); const add = (wd - c.getDay() + 7) % 7; c.setDate(c.getDate() + add); if (c <= from) c.setDate(c.getDate() + 7); return c; }
  const dom = Math.min(s.day ?? 1, 28); let c = at(new Date(d.getFullYear(), d.getMonth(), dom)); if (c <= from) c = at(new Date(d.getFullYear(), d.getMonth() + 1, dom)); return c;
}
export const describeSchedule = (s: Schedule) => s.freq === "daily" ? `Every day at ${s.time}` : s.freq === "weekly" ? `Every ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][s.weekday ?? 1]} at ${s.time}` : `Day ${Math.min(s.day ?? 1, 28)} of each month at ${s.time}`;
export { fmtDate };

/* ---------- maintenance windows ---------- */
export type Win = { id: string; title: string; start: string; end: string; systems: string[]; notify: boolean };
export const winOverlap = (a: Win, b: Win) => a.start < b.end && b.start < a.end && a.systems.some((s) => b.systems.includes(s));
export function winErrors(w: Win, others: Win[]): string[] {
  const e: string[] = [];
  if (!w.title.trim()) e.push("Title is required"); if (!w.start || !w.end) e.push("Start and end are required"); else if (w.end <= w.start) e.push("End must be after start");
  else if ((Date.parse(w.end) - Date.parse(w.start)) / 36e5 > 12) e.push("Windows longer than 12 hours need a change request");
  if (!w.systems.length) e.push("Choose at least one system");
  const clash = others.filter((o) => o.id !== w.id && winOverlap(w, o)); if (clash.length) e.push(`Overlaps “${clash[0].title}” on shared systems`);
  return e;
}
export const winState = (w: Win, now: string) => (now < w.start ? "upcoming" : now <= w.end ? "active" : "done") as "upcoming" | "active" | "done";

/* ---------- experiments / flags ---------- */
export const normCdf = (z: number) => { const t = 1 / (1 + 0.2316419 * Math.abs(z)); const d = 0.3989423 * Math.exp((-z * z) / 2); const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };
export function abTest(a: { n: number; x: number }, b: { n: number; x: number }) {
  const pa = a.x / a.n, pb = b.x / b.n, p = (a.x + b.x) / (a.n + b.n), se = Math.sqrt(p * (1 - p) * (1 / a.n + 1 / b.n)); const z = se ? (pb - pa) / se : 0;
  return { pa, pb, lift: pa ? (pb - pa) / pa : 0, z, p: 2 * (1 - normCdf(Math.abs(z))), significant: 2 * (1 - normCdf(Math.abs(z))) < 0.05 };
}
export function bucket(userId: string, key: string): number { let h = 2166136261; for (const c of `${key}:${userId}`) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 100; }
export const inRollout = (userId: string, key: string, pct: number) => bucket(userId, key) < pct;
export type Rule = { attr: "plan" | "region" | "email"; op: "is" | "endsWith"; value: string; serve: boolean };
export function evalFlag(f: { on: boolean; rollout: number; rules: Rule[]; key: string }, user: { id: string; plan: string; region: string; email: string }): { value: boolean; why: string } {
  if (!f.on) return { value: false, why: "Flag is off" };
  for (const r of f.rules) { const v = user[r.attr]; if (r.op === "is" ? v === r.value : v.endsWith(r.value)) return { value: r.serve, why: `Rule: ${r.attr} ${r.op} ${r.value}` }; }
  const b = bucket(user.id, f.key); return { value: b < f.rollout, why: `Rollout ${f.rollout}% (bucket ${b.toFixed(1)})` };
}

/* ---------- schema designer ---------- */
export type FieldType = "text" | "number" | "boolean" | "date" | "select" | "email";
export type SField = { id: string; key: string; label: string; type: FieldType; required: boolean; options?: string[]; min?: number; max?: number; showIf?: { key: string; equals: string } };
export function toJsonSchema(fields: SField[]) {
  const properties: Record<string, unknown> = {}; const required: string[] = [];
  for (const f of fields) {
    const p: Record<string, unknown> = { title: f.label };
    if (f.type === "number") { p.type = "number"; if (f.min !== undefined) p.minimum = f.min; if (f.max !== undefined) p.maximum = f.max; }
    else if (f.type === "boolean") p.type = "boolean"; else if (f.type === "date") { p.type = "string"; p.format = "date"; } else if (f.type === "email") { p.type = "string"; p.format = "email"; }
    else if (f.type === "select") { p.type = "string"; p.enum = f.options ?? []; } else p.type = "string";
    properties[f.key] = p; if (f.required && !f.showIf) required.push(f.key);
  }
  return { $schema: "https://json-schema.org/draft/2020-12/schema", type: "object", properties, required, additionalProperties: false };
}
export const schemaIssues = (fields: SField[]) => {
  const out: string[] = []; const keys = new Set<string>();
  for (const f of fields) {
    if (!/^[a-z][a-zA-Z0-9_]*$/.test(f.key)) out.push(`“${f.key || "(empty)"}” is not a valid key (use camelCase, start with a letter)`); if (keys.has(f.key)) out.push(`Duplicate key ${f.key}`); keys.add(f.key);
    if (f.type === "select" && !(f.options?.length)) out.push(`${f.label || f.key}: add at least one option`);
    if (f.type === "number" && f.min !== undefined && f.max !== undefined && f.min > f.max) out.push(`${f.label || f.key}: min is above max`);
    if (f.showIf && !fields.some((o) => o.key === f.showIf!.key)) out.push(`${f.label || f.key}: condition refers to a missing field`);
  }
  return out;
};
export function validateRecord(fields: SField[], rec: Record<string, string | number | boolean | undefined>): Record<string, string> {
  const e: Record<string, string> = {};
  for (const f of fields) {
    if (f.showIf && String(rec[f.showIf.key] ?? "") !== f.showIf.equals) continue; const v = rec[f.key];
    if ((v === undefined || v === "") && f.required) { e[f.key] = "Required"; continue; } if (v === undefined || v === "") continue;
    if (f.type === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v))) e[f.key] = "Invalid email";
    if (f.type === "number") { const n = Number(v); if (!Number.isFinite(n)) e[f.key] = "Not a number"; else if (f.min !== undefined && n < f.min) e[f.key] = `At least ${f.min}`; else if (f.max !== undefined && n > f.max) e[f.key] = `At most ${f.max}`; }
    if (f.type === "select" && !f.options?.includes(String(v))) e[f.key] = "Choose a listed option";
  }
  return e;
}

/* ---------- templates ---------- */
export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export function variablesIn(tpl: string): string[] { return [...new Set([...tpl.matchAll(/\{\{\s*([a-zA-Z_][\w.]*)\s*\}\}/g)].map((m) => m[1]))]; }
export function renderTemplate(tpl: string, vars: Record<string, string>, html = true) {
  const missing: string[] = [];
  const out = tpl.replace(/\{\{\s*([a-zA-Z_][\w.]*)\s*\}\}/g, (_, k: string) => { if (!(k in vars) || vars[k] === "") { missing.push(k); return `⟨${k}⟩`; } return html ? escapeHtml(vars[k]) : vars[k]; });
  return { out, missing: [...new Set(missing)] };
}

/* ---------- retention / upgrade / backup ---------- */
export type Policy = { dataset: string; days: number; action: "delete" | "anonymise" | "archive"; legalHold?: boolean };
export const expiresOn = (createdIso: string, days: number) => { const d = new Date(createdIso); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
export const dueForAction = (p: Policy, createdIso: string, today: string) => !p.legalHold && expiresOn(createdIso, p.days) <= today;
export type Check = { id: string; label: string; ok: boolean; severity: "block" | "warn"; detail: string };
export const canUpgrade = (checks: Check[]) => ({ blocked: checks.filter((c) => !c.ok && c.severity === "block"), warnings: checks.filter((c) => !c.ok && c.severity === "warn"), ok: checks.every((c) => c.ok || c.severity === "warn") });
export const sizeFmt = (b: number) => (b > 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b > 1e6 ? `${(b / 1e6).toFixed(0)} MB` : `${(b / 1e3).toFixed(0)} kB`);
export const quotaState = (used: number, limit: number) => { const f = used / limit; return f >= 1 ? "exceeded" : f >= 0.9 ? "critical" : f >= 0.75 ? "warning" : "ok"; };
/** Token bucket: how many requests are allowed after `elapsedSec`, given the bucket state. */
export function tokenBucket(cap: number, refillPerSec: number, tokens: number, elapsedSec: number, want: number) {
  const have = Math.min(cap, tokens + elapsedSec * refillPerSec); const ok = have >= want; return { allowed: ok, tokens: ok ? have - want : have };
}
