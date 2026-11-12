/* Filter-group model (AND/OR, nested) compiled to a predicate, SQL-ish text and a readable sentence. Regex helpers. */
export type Op = "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "contains" | "starts" | "in" | "empty" | "notEmpty";
export type FieldType = "text" | "number" | "date" | "enum";
export type FieldDef = { id: string; label: string; type: FieldType; options?: string[] };
export type Cond = { kind: "cond"; id: string; field: string; op: Op; value: string };
export type Group = { kind: "group"; id: string; join: "and" | "or"; not?: boolean; items: (Cond | Group)[] };
export const OPS: Record<FieldType, Op[]> = { text: ["contains", "eq", "ne", "starts", "empty", "notEmpty"], number: ["eq", "ne", "gt", "gte", "lt", "lte", "empty", "notEmpty"], date: ["eq", "gt", "lt", "gte", "lte", "empty", "notEmpty"], enum: ["eq", "ne", "in", "empty", "notEmpty"] };
export const OP_LABEL: Record<Op, string> = { eq: "is", ne: "is not", gt: "is greater than", gte: "is at least", lt: "is less than", lte: "is at most", contains: "contains", starts: "starts with", in: "is one of", empty: "is empty", notEmpty: "is not empty" };
export const SQL_OP: Record<Op, string> = { eq: "=", ne: "<>", gt: ">", gte: ">=", lt: "<", lte: "<=", contains: "LIKE", starts: "LIKE", in: "IN", empty: "IS NULL", notEmpty: "IS NOT NULL" };
let n = 0; export const uid = () => `q${++n}`;
export const newCond = (field: FieldDef): Cond => ({ kind: "cond", id: uid(), field: field.id, op: OPS[field.type][0], value: "" });
export const newGroup = (join: "and" | "or" = "and", items: (Cond | Group)[] = []): Group => ({ kind: "group", id: uid(), join, items });
type Row = Record<string, string | number | null | undefined>;
export function testCond(c: Cond, row: Row, def?: FieldDef): boolean {
  const v = row[c.field]; const empty = v === null || v === undefined || v === "";
  if (c.op === "empty") return empty; if (c.op === "notEmpty") return !empty; if (empty) return c.op === "ne";
  const t = def?.type ?? "text"; const a = t === "number" ? Number(v) : String(v).toLowerCase(); const b = t === "number" ? Number(c.value) : c.value.toLowerCase();
  if (t === "number" && Number.isNaN(b as number)) return false;
  switch (c.op) { case "eq": return a === b; case "ne": return a !== b; case "gt": return a > b; case "gte": return a >= b; case "lt": return a < b; case "lte": return a <= b; case "contains": return String(a).includes(String(b)); case "starts": return String(a).startsWith(String(b)); case "in": return c.value.toLowerCase().split(",").map((x) => x.trim()).includes(String(a)); default: return false; }
}
/** An empty group matches everything; an incomplete condition (no value where one is needed) is ignored. */
export const complete = (c: Cond) => c.op === "empty" || c.op === "notEmpty" || c.value.trim() !== "";
export function toPredicate(g: Group, defs: FieldDef[]): (row: Row) => boolean {
  const run = (node: Cond | Group, row: Row): boolean | null => {
    if (node.kind === "cond") return complete(node) ? testCond(node, row, defs.find((d) => d.id === node.field)) : null;
    const rs = node.items.map((i) => run(i, row)).filter((x): x is boolean => x !== null); if (!rs.length) return null;
    const r = node.join === "and" ? rs.every(Boolean) : rs.some(Boolean); return node.not ? !r : r;
  };
  return (row) => run(g, row) ?? true;
}
export const countConds = (g: Group): number => g.items.reduce((a, i) => a + (i.kind === "cond" ? 1 : countConds(i)), 0);
export const depth = (g: Group): number => 1 + Math.max(0, ...g.items.map((i) => (i.kind === "group" ? depth(i) : 0)));
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
export function toSql(g: Group, defs: FieldDef[]): string {
  const one = (node: Cond | Group): string | null => {
    if (node.kind === "cond") { if (!complete(node)) return null; const t = defs.find((d) => d.id === node.field)?.type; const lit = (s: string) => (t === "number" ? String(Number(s)) : q(s));
      if (node.op === "empty" || node.op === "notEmpty") return `${node.field} ${SQL_OP[node.op]}`; if (node.op === "contains") return `${node.field} LIKE ${q(`%${node.value}%`)}`; if (node.op === "starts") return `${node.field} LIKE ${q(`${node.value}%`)}`;
      if (node.op === "in") return `${node.field} IN (${node.value.split(",").map((x) => q(x.trim())).join(", ")})`; return `${node.field} ${SQL_OP[node.op]} ${lit(node.value)}`; }
    const parts = node.items.map(one).filter((x): x is string => !!x); if (!parts.length) return null; const body = parts.join(` ${node.join.toUpperCase()} `); return node.not ? `NOT (${body})` : parts.length > 1 ? `(${body})` : body;
  };
  return one(g) ?? "TRUE";
}
export function toSentence(g: Group, defs: FieldDef[]): string {
  const one = (node: Cond | Group): string | null => {
    if (node.kind === "cond") { if (!complete(node)) return null; const l = defs.find((d) => d.id === node.field)?.label ?? node.field; return `${l} ${OP_LABEL[node.op]}${node.op === "empty" || node.op === "notEmpty" ? "" : ` "${node.value}"`}`; }
    const parts = node.items.map(one).filter((x): x is string => !!x); if (!parts.length) return null; const body = parts.join(node.join === "and" ? " and " : " or "); return node.not ? `not (${body})` : parts.length > 1 ? `(${body})` : body;
  };
  return one(g) ?? "everything";
}

/* ---------- regex ---------- */
export type RegexResult = { ok: true; matches: { index: number; text: string; groups: string[]; named: Record<string, string> }[]; truncated: boolean } | { ok: false; error: string };
/** Runs a regex against a sample with a match cap and zero-width protection. */
export function testRegex(pattern: string, flags: string, sample: string, cap = 200): RegexResult {
  if (pattern === "") return { ok: true, matches: [], truncated: false };
  let re: RegExp; try { re = new RegExp(pattern, flags.includes("g") ? flags : flags + "g"); } catch (e) { return { ok: false, error: (e as Error).message.replace(/^Invalid regular expression: /, "") }; }
  const matches: { index: number; text: string; groups: string[]; named: Record<string, string> }[] = []; let m: RegExpExecArray | null; let truncated = false;
  while ((m = re.exec(sample))) { if (matches.length >= cap) { truncated = true; break; } matches.push({ index: m.index, text: m[0], groups: m.slice(1).map((x) => x ?? ""), named: { ...(m.groups ?? {}) } }); if (m[0] === "") re.lastIndex++; }
  return { ok: true, matches, truncated };
}
/** Split sample into alternating plain / matched segments for highlighting. */
export function segments(sample: string, matches: { index: number; text: string }[]): { text: string; hit: boolean }[] {
  const out: { text: string; hit: boolean }[] = []; let at = 0; for (const m of matches) { if (m.text === "") continue; if (m.index > at) out.push({ text: sample.slice(at, m.index), hit: false }); out.push({ text: m.text, hit: true }); at = m.index + m.text.length; } if (at < sample.length) out.push({ text: sample.slice(at), hit: false }); return out;
}
