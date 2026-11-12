// A small, safe SQL engine over in-memory tables: SELECT / WHERE / GROUP BY / HAVING / ORDER BY / LIMIT / OFFSET with aggregates.
// No eval, no I/O. Errors carry a character position for the editor.
export type Cell = string | number | boolean | null;
export type Row = Record<string, Cell>;
export class SqlError extends Error { pos: number; constructor(msg: string, pos: number) { super(msg); this.name = "SqlError"; this.pos = pos; } }

type Tok = { t: "num" | "str" | "id" | "op" | "p" | "eof"; v: string; pos: number };
const KW = new Set(["select", "from", "where", "group", "by", "order", "limit", "offset", "as", "and", "or", "not", "like", "in", "is", "null", "between", "asc", "desc", "distinct", "having", "true", "false"]);
export function tokenize(src: string): Tok[] {
  const out: Tok[] = []; let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "-" && src[i + 1] === "-") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(src[i + 1] ?? ""))) { const m = /^\d*\.?\d+(e[+-]?\d+)?/i.exec(src.slice(i))!; out.push({ t: "num", v: m[0], pos: i }); i += m[0].length; continue; }
    if (c === "'") { let j = i + 1, s = ""; for (;;) { if (j >= src.length) throw new SqlError("Unterminated string", i); if (src[j] === "'") { if (src[j + 1] === "'") { s += "'"; j += 2; continue; } break; } s += src[j++]; } out.push({ t: "str", v: s, pos: i }); i = j + 1; continue; }
    if (/[A-Za-z_]/.test(c)) { const m = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(src.slice(i))!; out.push({ t: "id", v: m[0], pos: i }); i += m[0].length; continue; }
    if (c === '"') { const j = src.indexOf('"', i + 1); if (j < 0) throw new SqlError("Unterminated quoted identifier", i); out.push({ t: "id", v: src.slice(i + 1, j), pos: i }); i = j + 1; continue; }
    const two = src.slice(i, i + 2); if (["<=", ">=", "<>", "!="].includes(two)) { out.push({ t: "op", v: two, pos: i }); i += 2; continue; }
    if ("=<>+-*/%".includes(c)) { out.push({ t: "op", v: c, pos: i }); i++; continue; }
    if ("(),;".includes(c)) { out.push({ t: "p", v: c, pos: i }); i++; continue; }
    throw new SqlError(`Unexpected character "${c}"`, i);
  }
  out.push({ t: "eof", v: "", pos: src.length }); return out;
}

export type Expr =
  | { k: "col"; name: string; pos: number } | { k: "lit"; v: Cell } | { k: "bin"; op: string; l: Expr; r: Expr } | { k: "not"; e: Expr } | { k: "neg"; e: Expr }
  | { k: "in"; e: Expr; list: Expr[]; neg: boolean } | { k: "like"; e: Expr; pat: Expr; neg: boolean } | { k: "between"; e: Expr; lo: Expr; hi: Expr; neg: boolean } | { k: "isnull"; e: Expr; neg: boolean }
  | { k: "agg"; fn: string; arg: Expr | "*"; distinct: boolean } | { k: "fn"; name: string; args: Expr[] };
type Item = { star: true } | { star?: false; e: Expr; alias?: string };
export type Select = { distinct: boolean; items: Item[]; from: string; where?: Expr; groupBy: Expr[]; having?: Expr; orderBy: { e: Expr; desc: boolean }[]; limit?: number; offset?: number };

const AGGS = new Set(["count", "sum", "avg", "min", "max"]); const FNS = new Set(["lower", "upper", "round", "length", "abs", "coalesce"]);
class P {
  i = 0; toks: Tok[]; constructor(toks: Tok[]) { this.toks = toks; }
  get cur() { return this.toks[this.i]; }
  kw(w: string) { return this.cur.t === "id" && this.cur.v.toLowerCase() === w; }
  eat(w: string) { if (this.kw(w)) { this.i++; return true; } return false; }
  expectKw(w: string) { if (!this.eat(w)) throw new SqlError(`Expected ${w.toUpperCase()}${this.cur.t === "eof" ? " but the query ended" : ` but found "${this.cur.v}"`}`, this.cur.pos); }
  punct(c: string) { if (this.cur.t === "p" && this.cur.v === c) { this.i++; return true; } return false; }
  expectP(c: string) { if (!this.punct(c)) throw new SqlError(`Expected "${c}"`, this.cur.pos); }
  select(): Select {
    this.expectKw("select"); const distinct = this.eat("distinct"); const items: Item[] = [];
    do {
      if (this.cur.t === "op" && this.cur.v === "*") { this.i++; items.push({ star: true }); }
      else { const e = this.expr(); let alias: string | undefined; if (this.eat("as")) { alias = this.ident(); } items.push({ e, alias }); }
    } while (this.punct(","));
    this.expectKw("from"); const from = this.ident(); const s: Select = { distinct, items, from, groupBy: [], orderBy: [] };
    if (this.eat("where")) s.where = this.expr();
    if (this.eat("group")) { this.expectKw("by"); do s.groupBy.push(this.expr()); while (this.punct(",")); }
    if (this.eat("having")) s.having = this.expr();
    if (this.eat("order")) { this.expectKw("by"); do { const e = this.expr(); const desc = this.eat("desc"); if (!desc) this.eat("asc"); s.orderBy.push({ e, desc }); } while (this.punct(",")); }
    if (this.eat("limit")) s.limit = this.int(); if (this.eat("offset")) s.offset = this.int();
    this.punct(";"); if (this.cur.t !== "eof") throw new SqlError(`Unexpected "${this.cur.v}"`, this.cur.pos);
    return s;
  }
  int() { const t = this.cur; if (t.t !== "num") throw new SqlError("Expected a number", t.pos); this.i++; return Math.max(0, Math.floor(Number(t.v))); }
  ident() { const t = this.cur; if (t.t !== "id" || (KW.has(t.v.toLowerCase()) && t.v !== t.v.toLowerCase() === false && KW.has(t.v.toLowerCase()))) throw new SqlError(`Expected a name${t.t === "eof" ? "" : ` but found "${t.v}"`}`, t.pos); this.i++; return t.v; }
  expr(): Expr { return this.or(); }
  or(): Expr { let l = this.and(); while (this.eat("or")) l = { k: "bin", op: "or", l, r: this.and() }; return l; }
  and(): Expr { let l = this.not(); while (this.eat("and")) l = { k: "bin", op: "and", l, r: this.not() }; return l; }
  not(): Expr { if (this.eat("not")) return { k: "not", e: this.not() }; return this.cmp(); }
  cmp(): Expr {
    const l = this.add();
    if (this.cur.t === "op" && ["=", "<>", "!=", "<", "<=", ">", ">="].includes(this.cur.v)) { const op = this.cur.v === "!=" ? "<>" : this.cur.v; this.i++; return { k: "bin", op, l, r: this.add() }; }
    const neg = this.kw("not") && ["like", "in", "between"].includes((this.toks[this.i + 1]?.v ?? "").toLowerCase()); if (neg) this.i++;
    if (this.eat("like")) return { k: "like", e: l, pat: this.add(), neg };
    if (this.eat("in")) { this.expectP("("); const list: Expr[] = []; do list.push(this.expr()); while (this.punct(",")); this.expectP(")"); return { k: "in", e: l, list, neg }; }
    if (this.eat("between")) { const lo = this.add(); this.expectKw("and"); return { k: "between", e: l, lo, hi: this.add(), neg }; }
    if (this.eat("is")) { const n = this.eat("not"); this.expectKw("null"); return { k: "isnull", e: l, neg: n }; }
    return l;
  }
  add(): Expr { let l = this.mul(); while (this.cur.t === "op" && (this.cur.v === "+" || this.cur.v === "-")) { const op = this.cur.v; this.i++; l = { k: "bin", op, l, r: this.mul() }; } return l; }
  mul(): Expr { let l = this.un(); while (this.cur.t === "op" && ["*", "/", "%"].includes(this.cur.v)) { const op = this.cur.v; this.i++; l = { k: "bin", op, l, r: this.un() }; } return l; }
  un(): Expr { if (this.cur.t === "op" && this.cur.v === "-") { this.i++; return { k: "neg", e: this.un() }; } return this.prim(); }
  prim(): Expr {
    const t = this.cur;
    if (t.t === "num") { this.i++; return { k: "lit", v: Number(t.v) }; }
    if (t.t === "str") { this.i++; return { k: "lit", v: t.v }; }
    if (this.punct("(")) { const e = this.expr(); this.expectP(")"); return e; }
    if (t.t === "id") {
      const low = t.v.toLowerCase();
      if (low === "null") { this.i++; return { k: "lit", v: null }; } if (low === "true" || low === "false") { this.i++; return { k: "lit", v: low === "true" }; }
      if (this.toks[this.i + 1]?.t === "p" && this.toks[this.i + 1].v === "(") {
        this.i += 2;
        if (AGGS.has(low)) { const distinct = this.eat("distinct"); let arg: Expr | "*"; if (this.cur.t === "op" && this.cur.v === "*") { this.i++; arg = "*"; } else arg = this.expr(); this.expectP(")"); if (arg === "*" && low !== "count") throw new SqlError(`${low.toUpperCase()}(*) is not valid`, t.pos); return { k: "agg", fn: low, arg, distinct }; }
        if (FNS.has(low)) { const args: Expr[] = []; if (!this.punct(")")) { do args.push(this.expr()); while (this.punct(",")); this.expectP(")"); } return { k: "fn", name: low, args }; }
        throw new SqlError(`Unknown function ${t.v}()`, t.pos);
      }
      if (KW.has(low)) throw new SqlError(`Unexpected keyword "${t.v}"`, t.pos);
      this.i++; return { k: "col", name: t.v, pos: t.pos };
    }
    throw new SqlError(t.t === "eof" ? "The query ended unexpectedly" : `Unexpected "${t.v}"`, t.pos);
  }
}
export const parseSql = (sql: string): Select => new P(tokenize(sql)).select();

export const exprText = (e: Expr): string => {
  switch (e.k) {
    case "col": return e.name; case "lit": return typeof e.v === "string" ? `'${e.v}'` : String(e.v);
    case "agg": return `${e.fn}(${e.distinct ? "distinct " : ""}${e.arg === "*" ? "*" : exprText(e.arg)})`;
    case "fn": return `${e.name}(${e.args.map(exprText).join(", ")})`; case "bin": return `${exprText(e.l)} ${e.op} ${exprText(e.r)}`;
    case "neg": return `-${exprText(e.e)}`; case "not": return `not ${exprText(e.e)}`; default: return "expr";
  }
};
const hasAgg = (e: Expr): boolean => e.k === "agg" || (e.k === "bin" ? hasAgg(e.l) || hasAgg(e.r) : e.k === "fn" ? e.args.some(hasAgg) : e.k === "not" || e.k === "neg" ? hasAgg(e.e) : false);
const cols = (e: Expr, out: Expr[] = []): Expr[] => { if (e.k === "col") out.push(e); else if (e.k === "bin") { cols(e.l, out); cols(e.r, out); } else if (e.k === "fn") e.args.forEach((a) => cols(a, out)); else if (e.k === "not" || e.k === "neg" || e.k === "isnull") cols(e.e, out); else if (e.k === "in") { cols(e.e, out); e.list.forEach((a) => cols(a, out)); } else if (e.k === "like") { cols(e.e, out); cols(e.pat, out); } else if (e.k === "between") { cols(e.e, out); cols(e.lo, out); cols(e.hi, out); } return out; };
const colsOutsideAgg = (e: Expr, out: Expr[] = []): Expr[] => { if (e.k === "agg") return out; if (e.k === "col") out.push(e); else if (e.k === "bin") { colsOutsideAgg(e.l, out); colsOutsideAgg(e.r, out); } else if (e.k === "fn") e.args.forEach((a) => colsOutsideAgg(a, out)); else if (e.k === "not" || e.k === "neg") colsOutsideAgg(e.e, out); return out; };

const cmp = (a: Cell, b: Cell): number => { if (typeof a === "number" && typeof b === "number") return a - b; const x = String(a), y = String(b); return x < y ? -1 : x > y ? 1 : 0; };
const truthy = (v: Cell) => v === true || (typeof v === "number" && v !== 0);
const likeRe = (p: string) => new RegExp("^" + p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".") + "$", "i");

export type SqlResult = { columns: string[]; rows: Row[]; explain: string[]; scanned: number };
export function runSql(sql: string, tables: Record<string, Row[]>): SqlResult {
  const q = parseSql(sql); const tn = Object.keys(tables).find((t) => t.toLowerCase() === q.from.toLowerCase());
  if (!tn) throw new SqlError(`Unknown table "${q.from}". Available: ${Object.keys(tables).join(", ")}`, sql.toLowerCase().indexOf(q.from.toLowerCase()));
  const src = tables[tn]; const schema = Object.keys(src[0] ?? {}); const lower = new Map(schema.map((s) => [s.toLowerCase(), s]));
  const resolve = (name: string, pos: number) => { const k = lower.get(name.toLowerCase().replace(/^.*\./, "")); if (!k) throw new SqlError(`Unknown column "${name}". Columns: ${schema.join(", ")}`, pos); return k; };
  const aliases = new Set(q.items.flatMap((i) => (!i.star && i.alias ? [i.alias.toLowerCase()] : [])));
  const check = (e: Expr, allowAlias = false) => cols(e).forEach((c) => { if (c.k === "col" && !(allowAlias && aliases.has(c.name.toLowerCase()))) resolve(c.name, c.pos); });
  q.items.forEach((i) => { if (!i.star) check(i.e); }); if (q.where) { if (hasAgg(q.where)) throw new SqlError("Aggregates are not allowed in WHERE (use HAVING)", 0); check(q.where); }
  q.groupBy.forEach((g) => check(g)); if (q.having) check(q.having, true); q.orderBy.forEach((o) => check(o.e, true));

  const ev = (e: Expr, row: Row, grp?: Row[]): Cell => {
    switch (e.k) {
      case "lit": return e.v; case "col": return row[resolve(e.name, e.pos)] ?? null;
      case "neg": { const v = ev(e.e, row, grp); return typeof v === "number" ? -v : null; }
      case "not": return !truthy(ev(e.e, row, grp));
      case "isnull": { const v = ev(e.e, row, grp) === null; return e.neg ? !v : v; }
      case "in": { const v = ev(e.e, row, grp); const r = v !== null && e.list.some((x) => cmp(ev(x, row, grp), v) === 0); return e.neg ? !r : r; }
      case "like": { const v = ev(e.e, row, grp), p = ev(e.pat, row, grp); const r = v !== null && p !== null && likeRe(String(p)).test(String(v)); return e.neg ? !r : r; }
      case "between": { const v = ev(e.e, row, grp), lo = ev(e.lo, row, grp), hi = ev(e.hi, row, grp); const r = v !== null && cmp(v, lo) >= 0 && cmp(v, hi) <= 0; return e.neg ? !r : r; }
      case "fn": { const a = e.args.map((x) => ev(x, row, grp)); switch (e.name) { case "lower": return a[0] === null ? null : String(a[0]).toLowerCase(); case "upper": return a[0] === null ? null : String(a[0]).toUpperCase(); case "length": return a[0] === null ? null : String(a[0]).length; case "abs": return typeof a[0] === "number" ? Math.abs(a[0]) : null; case "round": return typeof a[0] === "number" ? Math.round(a[0] * 10 ** Number(a[1] ?? 0)) / 10 ** Number(a[1] ?? 0) : null; default: return a.find((x) => x !== null) ?? null; } }
      case "agg": { if (!grp) throw new SqlError(`${e.fn}() needs a grouped query`, 0); let vals = e.arg === "*" ? grp.map(() => 1 as Cell) : grp.map((r) => ev(e.arg as Expr, r)).filter((v) => v !== null); if (e.distinct) vals = [...new Set(vals)]; const nums = vals.filter((v): v is number => typeof v === "number");
        switch (e.fn) { case "count": return vals.length; case "sum": return nums.length ? nums.reduce((a, b) => a + b, 0) : null; case "avg": return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null; case "min": return vals.length ? vals.reduce((a, b) => (cmp(a, b) <= 0 ? a : b)) : null; default: return vals.length ? vals.reduce((a, b) => (cmp(a, b) >= 0 ? a : b)) : null; } }
      case "bin": {
        if (e.op === "and") return truthy(ev(e.l, row, grp)) && truthy(ev(e.r, row, grp)); if (e.op === "or") return truthy(ev(e.l, row, grp)) || truthy(ev(e.r, row, grp));
        const a = ev(e.l, row, grp), b = ev(e.r, row, grp);
        if (["=", "<>", "<", "<=", ">", ">="].includes(e.op)) { if (a === null || b === null) return false; const c = cmp(a, b); return e.op === "=" ? c === 0 : e.op === "<>" ? c !== 0 : e.op === "<" ? c < 0 : e.op === "<=" ? c <= 0 : e.op === ">" ? c > 0 : c >= 0; }
        if (typeof a !== "number" || typeof b !== "number") return null; return e.op === "+" ? a + b : e.op === "-" ? a - b : e.op === "*" ? a * b : e.op === "/" ? (b === 0 ? null : a / b) : a % b;
      }
    }
  };
  const explain = [`Scan ${tn} (${src.length} rows)`]; let rows = src;
  if (q.where) { rows = rows.filter((r) => truthy(ev(q.where!, r))); explain.push(`Filter: ${exprText(q.where)} → ${rows.length} rows`); }
  const aggregated = q.items.some((i) => !i.star && hasAgg(i.e)) || q.groupBy.length > 0 || !!q.having;
  let outCols: string[] = []; let entries: { out: Row; src: Row; grp?: Row[] }[];
  const label = (i: Item, n: number) => (i.star ? "*" : i.alias ?? (i.e.k === "col" ? resolve(i.e.name, i.e.pos) : exprText(i.e) || `col${n + 1}`));
  if (aggregated) {
    if (q.items.some((i) => i.star)) throw new SqlError("SELECT * can't be combined with aggregates or GROUP BY", 0);
    const gnames = new Set(q.groupBy.filter((g): g is Extract<Expr, { k: "col" }> => g.k === "col").map((g) => resolve(g.name, g.pos)));
    q.items.forEach((i) => { if (!i.star) colsOutsideAgg(i.e).forEach((c) => { if (c.k === "col" && !gnames.has(resolve(c.name, c.pos))) throw new SqlError(`Column "${c.name}" must appear in GROUP BY or be used in an aggregate`, c.pos); }); });
    const groups = new Map<string, Row[]>(); for (const r of rows) { const key = JSON.stringify(q.groupBy.map((g) => ev(g, r))); (groups.get(key) ?? groups.set(key, []).get(key)!).push(r); }
    if (!q.groupBy.length && !groups.size) groups.set("", []);
    explain.push(q.groupBy.length ? `Group by ${q.groupBy.map(exprText).join(", ")} → ${groups.size} groups` : "Aggregate all rows");
    entries = [...groups.values()].map((g) => { const base = g[0] ?? {}; const out: Row = {}; q.items.forEach((i, n) => { if (!i.star) { const lab = label(i, n); outCols.push(lab); out[lab] = ev(i.e, base, g); } }); return { out, src: base, grp: g }; });
    outCols = [...new Set(outCols)];
    if (q.having) { entries = entries.filter((en) => truthy(ev(q.having!, { ...en.src, ...en.out }, en.grp))); explain.push(`Having: ${exprText(q.having)}`); }
  } else {
    entries = rows.map((r) => { const out: Row = {}; q.items.forEach((i, n) => { if (i.star) schema.forEach((c) => { out[c] = r[c]; if (!outCols.includes(c)) outCols.push(c); }); else { const lab = label(i, n); out[lab] = ev(i.e, r); if (!outCols.includes(lab)) outCols.push(lab); } }); return { out, src: r }; });
  }
  if (q.orderBy.length) {
    entries.sort((a, b) => { for (const o of q.orderBy) { const get = (en: typeof a) => (o.e.k === "col" && o.e.name in en.out ? en.out[o.e.name] : ev(o.e, { ...en.src, ...en.out }, en.grp)); const x = get(a), y = get(b); if (x === y) continue; if (x === null) return 1; if (y === null) return -1; const c = cmp(x, y); if (c) return o.desc ? -c : c; } return 0; });
    explain.push(`Sort by ${q.orderBy.map((o) => exprText(o.e) + (o.desc ? " desc" : "")).join(", ")}`);
  }
  let out = entries.map((e) => e.out);
  if (q.distinct) { const seen = new Set<string>(); out = out.filter((r) => { const k = JSON.stringify(r); if (seen.has(k)) return false; seen.add(k); return true; }); explain.push("Distinct"); }
  if (q.offset) out = out.slice(q.offset); if (q.limit !== undefined) { out = out.slice(0, q.limit); explain.push(`Limit ${q.limit}`); }
  return { columns: outCols, rows: out, explain, scanned: src.length };
}
