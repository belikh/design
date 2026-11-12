// Pure data helpers for structured inputs: JSON Schema subset validation, filters, query parsing, trees, permissions,
// chunked uploads, column mapping, drafts, translations.
import { isoDate } from "./logic-num.ts";

/* ---------- JSON Schema (subset) ---------- */
export type Schema = { type?: "string" | "number" | "integer" | "boolean" | "array" | "object"; title?: string; description?: string; enum?: (string | number)[]; default?: unknown; format?: "email" | "uri" | "date" | "password" | "textarea"; minLength?: number; maxLength?: number; pattern?: string; minimum?: number; maximum?: number; items?: Schema; minItems?: number; maxItems?: number; uniqueItems?: boolean; properties?: Record<string, Schema>; required?: string[] };
export type SchemaErrors = Record<string, string>;
export function validateSchema(s: Schema, v: unknown, path = ""): SchemaErrors {
  const err: SchemaErrors = {}; const set = (m: string) => { err[path || "$"] = m; }; const empty = v === undefined || v === null || v === "";
  if (s.type === "object") { const o = (v ?? {}) as Record<string, unknown>; for (const [k, sub] of Object.entries(s.properties ?? {})) { if (empty && !(s.required ?? []).length) continue; if ((s.required ?? []).includes(k) && (o[k] === undefined || o[k] === "" || o[k] === null)) { err[`${path}/${k}`] = "Required"; continue; } if (o[k] !== undefined && o[k] !== "") Object.assign(err, validateSchema(sub, o[k], `${path}/${k}`)); } return err; }
  if (empty) return err;
  if (s.enum && !s.enum.includes(v as string | number)) set(`Must be one of: ${s.enum.join(", ")}`);
  if (s.type === "string") { const t = String(v); if (s.minLength !== undefined && t.length < s.minLength) set(`At least ${s.minLength} characters`); else if (s.maxLength !== undefined && t.length > s.maxLength) set(`At most ${s.maxLength} characters`); else if (s.pattern && !new RegExp(s.pattern).test(t)) set("Does not match the required format"); else if (s.format === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t)) set("Enter a valid email address"); else if (s.format === "uri" && !/^https?:\/\/[^\s/]+\.[^\s]+$/.test(t)) set("Enter a valid URL (https://…)"); else if (s.format === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(t)) set("Use YYYY-MM-DD"); }
  if (s.type === "number" || s.type === "integer") { const n = Number(v); if (Number.isNaN(n)) set("Must be a number"); else if (s.type === "integer" && !Number.isInteger(n)) set("Must be a whole number"); else if (s.minimum !== undefined && n < s.minimum) set(`Must be at least ${s.minimum}`); else if (s.maximum !== undefined && n > s.maximum) set(`Must be at most ${s.maximum}`); }
  if (s.type === "array") { const a = Array.isArray(v) ? v : []; if (s.minItems !== undefined && a.length < s.minItems) set(`Add at least ${s.minItems}`); else if (s.maxItems !== undefined && a.length > s.maxItems) set(`At most ${s.maxItems} items`); else if (s.uniqueItems && new Set(a).size !== a.length) set("Items must be unique"); else if (s.items) a.forEach((x, i) => Object.assign(err, validateSchema(s.items!, x, `${path}/${i}`))); }
  return err;
}
export function defaultsFor(s: Schema): unknown { if (s.default !== undefined) return s.default; if (s.type === "object") return Object.fromEntries(Object.entries(s.properties ?? {}).map(([k, v]) => [k, defaultsFor(v)])); if (s.type === "array") return []; if (s.type === "boolean") return false; return s.type === "number" || s.type === "integer" ? "" : ""; }
export function parseSchema(text: string): { schema?: Schema; error?: string } { try { const s = JSON.parse(text) as Schema; if (!s || typeof s !== "object" || s.type !== "object" || !s.properties) return { error: 'The root must be { "type": "object", "properties": { … } }' }; return { schema: s }; } catch (e) { return { error: (e as Error).message }; } }

/* ---------- filters ---------- */
export type Op = "is" | "isnot" | "contains" | "starts" | "gt" | "lt" | "between" | "before" | "after" | "inlast" | "any" | "empty";
export type FieldType = "text" | "number" | "date" | "enum";
export const OPS: Record<FieldType, { op: Op; label: string }[]> = { text: [{ op: "contains", label: "contains" }, { op: "is", label: "is" }, { op: "starts", label: "starts with" }, { op: "empty", label: "is empty" }], number: [{ op: "is", label: "=" }, { op: "gt", label: ">" }, { op: "lt", label: "<" }, { op: "between", label: "between" }], date: [{ op: "before", label: "before" }, { op: "after", label: "after" }, { op: "inlast", label: "in the last (days)" }, { op: "is", label: "on" }], enum: [{ op: "is", label: "is" }, { op: "isnot", label: "is not" }, { op: "any", label: "is any of" }] };
export type Filter = { id: string; field: string; op: Op; value: string; value2?: string };
export function evalFilter(f: Filter, row: Record<string, unknown>, type: FieldType, today = new Date()): boolean {
  const raw = row[f.field]; const s = String(raw ?? ""); const lc = s.toLowerCase(), v = f.value.toLowerCase();
  switch (f.op) {
    case "is": return type === "number" ? Number(raw) === Number(f.value) : lc === v; case "isnot": return lc !== v; case "contains": return lc.includes(v); case "starts": return lc.startsWith(v); case "empty": return s === "";
    case "gt": return Number(raw) > Number(f.value); case "lt": return Number(raw) < Number(f.value); case "between": return Number(raw) >= Number(f.value) && Number(raw) <= Number(f.value2 ?? f.value);
    case "before": return s < f.value; case "after": return s > f.value; case "inlast": { const cut = new Date(today); cut.setDate(cut.getDate() - Number(f.value)); return s >= isoDate(cut) && s <= isoDate(today); }
    case "any": return f.value.split(",").map((x) => x.trim().toLowerCase()).includes(lc);
  } return true;
}
export const describeFilter = (f: Filter, label = f.field) => `${label} ${({ is: "is", isnot: "is not", contains: "contains", starts: "starts with", gt: ">", lt: "<", between: "between", before: "before", after: "after", inlast: "in the last", any: "is any of", empty: "is empty" } as const)[f.op]} ${f.op === "empty" ? "" : f.op === "between" ? `${f.value} and ${f.value2 ?? ""}` : f.op === "inlast" ? `${f.value} days` : f.value}`.trim();

/* ---------- tokenised search ---------- */
export type QToken = { kind: "field" | "text"; field?: string; op?: ":" | ">" | "<" | ">=" | "<="; value: string; neg?: boolean; raw: string };
export function parseQuery(q: string): QToken[] {
  const out: QToken[] = []; const re = /(-?)([a-z]+)(?::(>=|<=|>|<)?|(>=|<=|>|<))("[^"]*"|\S+)|(-?)"([^"]*)"|(-?)(\S+)/gi; let m: RegExpExecArray | null;
  while ((m = re.exec(q))) { if (m[2]) out.push({ kind: "field", field: m[2].toLowerCase(), op: ((m[3] ?? m[4]) as QToken["op"]) ?? ":", value: m[5].replace(/^"|"$/g, ""), neg: m[1] === "-", raw: m[0] }); else if (m[7] !== undefined) out.push({ kind: "text", value: m[7], neg: m[6] === "-", raw: m[0] }); else out.push({ kind: "text", value: m[9], neg: m[8] === "-", raw: m[0] }); }
  return out;
}
export function matchTokens(row: Record<string, unknown>, toks: QToken[], fields: string[]): boolean {
  return toks.every((t) => { let hit: boolean; if (t.kind === "text") hit = fields.some((f) => String(row[f] ?? "").toLowerCase().includes(t.value.toLowerCase())); else { const raw = row[t.field!]; if (raw === undefined) hit = false; else if (t.op === ":") hit = String(raw).toLowerCase().includes(t.value.toLowerCase()); else { const a = Number(raw), b = Number(t.value); hit = t.op === ">" ? a > b : t.op === "<" ? a < b : t.op === ">=" ? a >= b : a <= b; } } return t.neg ? !hit : hit; });
}

/* ---------- tree checklist ---------- */
export type TNode = { id: string; label: string; children?: TNode[] };
export const leaves = (n: TNode): string[] => (n.children?.length ? n.children.flatMap(leaves) : [n.id]);
export type CheckState = "checked" | "unchecked" | "indeterminate";
export function checkState(n: TNode, checked: Set<string>): CheckState { const l = leaves(n); const c = l.filter((x) => checked.has(x)).length; return c === 0 ? "unchecked" : c === l.length ? "checked" : "indeterminate"; }
export function toggleNode(n: TNode, checked: Set<string>): Set<string> { const next = new Set(checked); const all = checkState(n, checked) === "checked"; leaves(n).forEach((l) => (all ? next.delete(l) : next.add(l))); return next; }
export const findPath = (nodes: TNode[], id: string, trail: TNode[] = []): TNode[] | null => { for (const n of nodes) { if (n.id === id) return [...trail, n]; const r = n.children ? findPath(n.children, id, [...trail, n]) : null; if (r) return r; } return null; };

/* ---------- permissions matrix ---------- */
export type Perms = Record<string, Record<string, boolean>>;
export const PERM_PRESETS: Record<string, (rs: string[], as: string[]) => Perms> = {
  none: (rs, as) => Object.fromEntries(rs.map((r) => [r, Object.fromEntries(as.map((a) => [a, false]))])),
  viewer: (rs, as) => Object.fromEntries(rs.map((r) => [r, Object.fromEntries(as.map((a) => [a, a === "view"]))])),
  editor: (rs, as) => Object.fromEntries(rs.map((r) => [r, Object.fromEntries(as.map((a) => [a, ["view", "create", "edit"].includes(a)]))])),
  admin: (rs, as) => Object.fromEntries(rs.map((r) => [r, Object.fromEntries(as.map((a) => [a, true]))])),
};
export function permDiff(a: Perms, b: Perms): { added: string[]; removed: string[] } { const added: string[] = [], removed: string[] = []; for (const r of Object.keys(b)) for (const act of Object.keys(b[r])) { if (b[r][act] && !a[r]?.[act]) added.push(`${r}: ${act}`); if (!b[r][act] && a[r]?.[act]) removed.push(`${r}: ${act}`); } return { added, removed }; }
/** Implied actions: granting edit/delete requires view. */
export function normalisePerms(p: Perms): Perms { const o: Perms = {}; for (const r of Object.keys(p)) { o[r] = { ...p[r] }; if ((o[r].edit || o[r].delete || o[r].create) && "view" in o[r]) o[r].view = true; } return o; }

/* ---------- chunked uploads ---------- */
export type Chunk = { index: number; start: number; end: number; size: number };
export function chunkPlan(total: number, chunkSize = 5 * 1024 * 1024): Chunk[] { const out: Chunk[] = []; for (let s = 0, i = 0; s < total; s += chunkSize, i++) out.push({ index: i, start: s, end: Math.min(total, s + chunkSize), size: Math.min(total, s + chunkSize) - s }); return out; }
export const humanSize = (b: number) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : b < 1073741824 ? `${(b / 1048576).toFixed(1)} MB` : `${(b / 1073741824).toFixed(2)} GB`);
export type FNode = { name: string; files: number; bytes: number; children: FNode[] };
export function folderTree(files: { path: string; size: number }[]): FNode {
  const root: FNode = { name: "", files: 0, bytes: 0, children: [] };
  for (const f of files) { const parts = f.path.split("/"); let n = root; n.bytes += f.size; for (let i = 0; i < parts.length - 1; i++) { let c = n.children.find((x) => x.name === parts[i]); if (!c) { c = { name: parts[i], files: 0, bytes: 0, children: [] }; n.children.push(c); } c.bytes += f.size; n = c; } n.files++; }
  return root;
}
export const countFiles = (n: FNode): number => n.files + n.children.reduce((a, c) => a + countFiles(c), 0);

/* ---------- column mapping ---------- */
export type TargetField = { key: string; label: string; required?: boolean; aliases?: string[]; validate?: (v: string) => string | null };
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
export function lev(a: string, b: string) { const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array<number>(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; }
/** Suggest which target field each source column maps to (exact, alias, then fuzzy). */
export function suggestMapping(sources: string[], targets: TargetField[]): Record<string, string | null> {
  const used = new Set<string>(); const out: Record<string, string | null> = {};
  const score = (src: string, t: TargetField) => { const s = norm(src); const names = [t.key, t.label, ...(t.aliases ?? [])].map(norm); if (names.includes(s)) return 0; const best = Math.min(...names.map((n) => (n.includes(s) || s.includes(n) ? 1 : lev(s, n) / Math.max(s.length, n.length, 1) * 4))); return 1 + best; };
  const pairs = sources.flatMap((s) => targets.map((t) => ({ s, t: t.key, sc: score(s, t) }))).filter((p) => p.sc <= 2.2).sort((a, b) => a.sc - b.sc);
  for (const p of pairs) { if (out[p.s] !== undefined || used.has(p.t)) continue; out[p.s] = p.t; used.add(p.t); } for (const s of sources) if (out[s] === undefined) out[s] = null; return out;
}
export function parseCsv(text: string): string[][] { const rows: string[][] = []; let row: string[] = [], cell = "", q = false; for (let i = 0; i < text.length; i++) { const c = text[i]; if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; } else if (c === '"') q = true; else if (c === ",") { row.push(cell); cell = ""; } else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; } else cell += c; } if (cell || row.length) { row.push(cell); rows.push(row); } return rows.filter((r) => r.some((x) => x.trim() !== "")); }

/* ---------- drafts / versions ---------- */
export type Version<T> = { v: number; at: string; by: string; data: T; note: string };
export function nextVersion<T>(versions: Version<T>[], data: T, by: string, at: string, note = ""): Version<T>[] { return [{ v: (versions[0]?.v ?? 0) + 1, at, by, data, note }, ...versions]; }
export type Change = { field: string; from: string; to: string; by: string; at: string };
export function diffFields<T extends Record<string, unknown>>(a: T, b: T, by: string, at: string): Change[] { return Object.keys(b).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k])).map((k) => ({ field: k, from: JSON.stringify(a[k]) ?? "", to: JSON.stringify(b[k]) ?? "", by, at })); }

/* ---------- translations ---------- */
export type Messages = Record<string, Record<string, string>>; // key -> locale -> text
export function completeness(m: Messages, locales: string[]): Record<string, number> { const keys = Object.keys(m); return Object.fromEntries(locales.map((l) => [l, keys.length ? Math.round((keys.filter((k) => (m[k][l] ?? "").trim() !== "").length / keys.length) * 100) : 100])); }
export function placeholderIssues(src: string, tr: string): string[] { const f = (s: string) => (s.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).sort().join(","); return tr && f(src) !== f(tr) ? [`Placeholders differ: source has ${f(src) || "none"}, translation has ${f(tr) || "none"}`] : []; }

/* ---------- rules ---------- */
export type Cond = { field: string; op: ">" | "<" | ">=" | "<=" | "=" | "!=" | "contains"; value: string };
export type RuleGroup = { join: "all" | "any"; conds: Cond[] };
export function evalRule(g: RuleGroup, ev: Record<string, string | number>): boolean { const ok = (c: Cond) => { const a = ev[c.field]; const n = Number(a), v = Number(c.value); switch (c.op) { case ">": return n > v; case "<": return n < v; case ">=": return n >= v; case "<=": return n <= v; case "=": return String(a) === c.value; case "!=": return String(a) !== c.value; case "contains": return String(a).toLowerCase().includes(c.value.toLowerCase()); } }; return g.conds.length === 0 ? false : g.join === "all" ? g.conds.every(ok) : g.conds.some(ok); }
export const describeRule = (g: RuleGroup) => (g.conds.length ? g.conds.map((c) => `${c.field} ${c.op} ${c.value}`).join(g.join === "all" ? " AND " : " OR ") : "(no conditions)");
/** Count threshold breaches in a series: consecutive points above `limit` form one alert; needs `forPoints` in a row. */
export function breaches(data: number[], limit: number, forPoints = 1, below = false): { start: number; end: number }[] { const out: { start: number; end: number }[] = []; let s = -1; data.forEach((v, i) => { const bad = below ? v < limit : v > limit; if (bad && s < 0) s = i; if ((!bad || i === data.length - 1) && s >= 0) { const end = bad ? i : i - 1; if (end - s + 1 >= forPoints) out.push({ start: s, end }); s = -1; } }); return out; }
