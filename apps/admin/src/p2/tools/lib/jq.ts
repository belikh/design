// A jq subset interpreter (streams of outputs). Supports paths, iteration, pipes, comma, select/map/sort_by/group_by/etc.,
// object and array construction, comparisons, arithmetic, if/then/else, and common string helpers. Pure; no eval.
import type { Json } from "./jsonpath.ts";
export class JqError extends Error { pos: number; constructor(m: string, pos = 0) { super(m); this.name = "JqError"; this.pos = pos; } }
type T = { t: string; v: string; pos: number };
const lex = (s: string): T[] => {
  const out: T[] = []; let i = 0;
  while (i < s.length) {
    const c = s[i]; if (/\s/.test(c)) { i++; continue; }
    if (c === "#") { while (i < s.length && s[i] !== "\n") i++; continue; }
    if (c === '"') { let j = i + 1, v = ""; while (j < s.length && s[j] !== '"') { if (s[j] === "\\") { j++; const e = s[j]; v += e === "n" ? "\n" : e === "t" ? "\t" : e; } else v += s[j]; j++; } if (s[j] !== '"') throw new JqError("Unterminated string", i); out.push({ t: "str", v, pos: i }); i = j + 1; continue; }
    if (/[0-9]/.test(c)) { const m = /^\d+(\.\d+)?([eE][+-]?\d+)?/.exec(s.slice(i))![0]; out.push({ t: "num", v: m, pos: i }); i += m.length; continue; }
    if (c === "." && s[i + 1] === ".") { out.push({ t: "..", v: "..", pos: i }); i += 2; continue; }
    if (c === "." && /[A-Za-z_]/.test(s[i + 1] ?? "")) { const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i + 1))![0]; out.push({ t: "field", v: m, pos: i }); i += 1 + m.length; continue; }
    if (c === "." && s[i + 1] === '"') { const j = s.indexOf('"', i + 2); if (j < 0) throw new JqError("Unterminated string", i); out.push({ t: "field", v: s.slice(i + 2, j), pos: i }); i = j + 1; continue; }
    if (/[A-Za-z_]/.test(c)) { const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i))![0]; out.push({ t: "id", v: m, pos: i }); i += m.length; continue; }
    const two = s.slice(i, i + 2); if (["==", "!=", "<=", ">=", "//"].includes(two)) { out.push({ t: "op", v: two, pos: i }); i += 2; continue; }
    if ("|,:;()[]{}<>+-*/%.?".includes(c)) { out.push({ t: "op", v: c, pos: i }); i++; continue; }
    throw new JqError(`Unexpected character "${c}"`, i);
  }
  out.push({ t: "eof", v: "", pos: s.length }); return out;
};
type A =
  | { k: "id" } | { k: "recurse" } | { k: "lit"; v: Json } | { k: "field"; name: string; from: A } | { k: "index"; from: A; idx: A } | { k: "iter"; from: A } | { k: "slice"; from: A; a?: A; b?: A } | { k: "opt"; e: A }
  | { k: "pipe"; l: A; r: A } | { k: "comma"; l: A; r: A } | { k: "bin"; op: string; l: A; r: A } | { k: "neg"; e: A } | { k: "call"; name: string; args: A[]; pos: number }
  | { k: "arr"; e?: A } | { k: "obj"; entries: { key: A; val: A }[] } | { k: "if"; c: A; t: A; e?: A };
class JP {
  i = 0; toks: T[]; constructor(toks: T[]) { this.toks = toks; }
  get cur() { return this.toks[this.i]; }
  op(v: string) { return this.cur.t === "op" && this.cur.v === v; }
  eat(v: string) { if (this.op(v)) { this.i++; return true; } return false; }
  need(v: string) { if (!this.eat(v)) throw new JqError(`Expected "${v}"`, this.cur.pos); }
  idw(w: string) { return this.cur.t === "id" && this.cur.v === w; }
  pipe(): A { let l = this.comma(); while (this.eat("|")) l = { k: "pipe", l, r: this.comma() }; return l; }
  comma(): A { let l = this.alt(); while (this.eat(",")) l = { k: "comma", l, r: this.alt() }; return l; }
  alt(): A { let l = this.or(); while (this.eat("//")) l = { k: "bin", op: "//", l, r: this.or() }; return l; }
  or(): A { let l = this.and(); while (this.idw("or")) { this.i++; l = { k: "bin", op: "or", l, r: this.and() }; } return l; }
  and(): A { let l = this.cmp(); while (this.idw("and")) { this.i++; l = { k: "bin", op: "and", l, r: this.cmp() }; } return l; }
  cmp(): A { const l = this.add(); for (const o of ["==", "!=", "<=", ">=", "<", ">"]) if (this.eat(o)) return { k: "bin", op: o, l, r: this.add() }; return l; }
  add(): A { let l = this.mul(); for (;;) { if (this.eat("+")) l = { k: "bin", op: "+", l, r: this.mul() }; else if (this.eat("-")) l = { k: "bin", op: "-", l, r: this.mul() }; else return l; } }
  mul(): A { let l = this.post(); for (;;) { const o = ["*", "/", "%"].find((x) => this.op(x)); if (!o) return l; this.i++; l = { k: "bin", op: o, l, r: this.post() }; } }
  post(): A {
    let e = this.prim();
    for (;;) {
      if (this.cur.t === "field") { e = { k: "field", name: this.cur.v, from: e }; this.i++; }
      else if (this.op(".") && this.toks[this.i + 1]?.v === "[") { this.i++; }
      else if (this.op("[")) { this.i++; if (this.eat("]")) { e = { k: "iter", from: e }; continue; } if (this.op(":")) { this.i++; const b = this.pipe(); this.need("]"); e = { k: "slice", from: e, b }; continue; } const idx = this.pipe(); if (this.eat(":")) { const b = this.op("]") ? undefined : this.pipe(); this.need("]"); e = { k: "slice", from: e, a: idx, b }; } else { this.need("]"); e = { k: "index", from: e, idx }; } }
      else if (this.eat("?")) e = { k: "opt", e };
      else return e;
    }
  }
  prim(): A {
    const t = this.cur;
    if (t.t === "num") { this.i++; return { k: "lit", v: Number(t.v) }; } if (t.t === "str") { this.i++; return { k: "lit", v: t.v }; }
    if (t.t === "..") { this.i++; return { k: "recurse" }; } if (t.t === "field") { this.i++; return { k: "field", name: t.v, from: { k: "id" } }; }
    if (this.eat(".")) { return { k: "id" }; }
    if (this.eat("-")) return { k: "neg", e: this.post() };
    if (this.eat("(")) { const e = this.pipe(); this.need(")"); return e; }
    if (this.eat("[")) { if (this.eat("]")) return { k: "arr" }; const e = this.pipe(); this.need("]"); return { k: "arr", e }; }
    if (this.eat("{")) { const entries: { key: A; val: A }[] = []; if (!this.eat("}")) { do { let key: A, val: A; if (this.cur.t === "id" || this.cur.t === "str") { const nm = this.cur.v; this.i++; key = { k: "lit", v: nm }; if (this.eat(":")) val = this.alt(); else val = { k: "field", name: nm, from: { k: "id" } }; } else if (this.eat("(")) { key = this.pipe(); this.need(")"); this.need(":"); val = this.alt(); } else throw new JqError("Bad object key", this.cur.pos); entries.push({ key, val }); } while (this.eat(",")); this.need("}"); } return { k: "obj", entries }; }
    if (t.t === "id") {
      if (t.v === "if") { this.i++; const c = this.pipe(); if (!this.idw("then")) throw new JqError('Expected "then"', this.cur.pos); this.i++; const th = this.pipe(); let el: A | undefined; if (this.idw("else")) { this.i++; el = this.pipe(); } if (!this.idw("end")) throw new JqError('Expected "end"', this.cur.pos); this.i++; return { k: "if", c, t: th, e: el }; }
      this.i++; if (t.v === "true" || t.v === "false") return { k: "lit", v: t.v === "true" }; if (t.v === "null") return { k: "lit", v: null };
      const args: A[] = []; if (this.eat("(")) { do args.push(this.pipe()); while (this.eat(";")); this.need(")"); } return { k: "call", name: t.v, args, pos: t.pos };
    }
    throw new JqError(this.cur.t === "eof" ? "The program ended unexpectedly" : `Unexpected "${this.cur.v}"`, this.cur.pos);
  }
}
const isObj = (v: Json): v is { [k: string]: Json } => v !== null && typeof v === "object" && !Array.isArray(v);
const typeOf = (v: Json) => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);
const ORDER = ["null", "boolean", "number", "string", "array", "object"];
export const cmpJson = (a: Json, b: Json): number => { const ta = ORDER.indexOf(typeOf(a)), tb = ORDER.indexOf(typeOf(b)); if (ta !== tb) return ta - tb; if (typeof a === "number" && typeof b === "number") return a - b; if (typeof a === "string" && typeof b === "string") return a < b ? -1 : a > b ? 1 : 0; if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b); if (Array.isArray(a) && Array.isArray(b)) { for (let i = 0; i < Math.min(a.length, b.length); i++) { const c = cmpJson(a[i], b[i]); if (c) return c; } return a.length - b.length; } if (isObj(a) && isObj(b)) return cmpJson(Object.keys(a).sort() as Json, Object.keys(b).sort() as Json) || cmpJson(Object.keys(a).sort().map((k) => a[k]), Object.keys(b).sort().map((k) => b[k])); return 0; };
const truthy = (v: Json) => v !== null && v !== false;
const LIMIT = 100000;
function ev(a: A, inp: Json, budget: { n: number }): Json[] {
  if (++budget.n > LIMIT) throw new JqError("Program too expensive (step limit reached)");
  const sub = (x: A, i: Json) => ev(x, i, budget);
  switch (a.k) {
    case "id": return [inp]; case "lit": return [a.v];
    case "recurse": { const out: Json[] = []; const r = (v: Json) => { out.push(v); if (Array.isArray(v)) v.forEach(r); else if (isObj(v)) Object.values(v).forEach(r); }; r(inp); return out; }
    case "field": return sub(a.from, inp).flatMap((v) => { if (v === null) return [null]; if (!isObj(v)) throw new JqError(`Cannot index ${typeOf(v)} with "${a.name}"`); return [v[a.name] ?? null]; });
    case "index": return sub(a.from, inp).flatMap((v) => sub(a.idx, inp).map((ix) => { if (v === null) return null; if (Array.isArray(v) && typeof ix === "number") return v[ix < 0 ? v.length + ix : ix] ?? null; if (isObj(v) && typeof ix === "string") return v[ix] ?? null; throw new JqError(`Cannot index ${typeOf(v)} with ${typeOf(ix)}`); }));
    case "iter": return sub(a.from, inp).flatMap((v) => { if (Array.isArray(v)) return v; if (isObj(v)) return Object.values(v); throw new JqError(`Cannot iterate over ${typeOf(v)}`); });
    case "slice": return sub(a.from, inp).flatMap((v) => { const lo = a.a ? sub(a.a, inp)[0] : 0, hi = a.b ? sub(a.b, inp)[0] : null; if (typeof v === "string" || Array.isArray(v)) { const n = v.length; const f = (x: Json, d: number) => (typeof x === "number" ? (x < 0 ? Math.max(0, n + x) : Math.min(n, x)) : d); return [v.slice(f(lo, 0), f(hi, n))]; } if (v === null) return [null]; throw new JqError(`Cannot slice ${typeOf(v)}`); });
    case "opt": try { return sub(a.e, inp); } catch { return []; }
    case "pipe": return sub(a.l, inp).flatMap((v) => sub(a.r, v)); case "comma": return [...sub(a.l, inp), ...sub(a.r, inp)];
    case "neg": return sub(a.e, inp).map((v) => { if (typeof v !== "number") throw new JqError("Cannot negate a non-number"); return -v; });
    case "arr": return [a.e ? sub(a.e, inp) : []];
    case "obj": { let acc: { [k: string]: Json }[] = [{}]; for (const en of a.entries) { const next: { [k: string]: Json }[] = []; for (const o of acc) for (const k of sub(en.key, inp)) for (const v of sub(en.val, inp)) { if (typeof k !== "string") throw new JqError("Object keys must be strings"); next.push({ ...o, [k]: v }); } acc = next; } return acc; }
    case "if": return sub(a.c, inp).flatMap((c) => (truthy(c) ? sub(a.t, inp) : a.e ? sub(a.e, inp) : [inp]));
    case "bin": {
      if (a.op === "and") return sub(a.l, inp).flatMap((l) => (!truthy(l) ? [false] : sub(a.r, inp).map((r) => truthy(r)))); if (a.op === "or") return sub(a.l, inp).flatMap((l) => (truthy(l) ? [true] : sub(a.r, inp).map((r) => truthy(r))));
      if (a.op === "//") { const l = sub(a.l, inp).filter(truthy); return l.length ? l : sub(a.r, inp); }
      return sub(a.r, inp).flatMap((r) => sub(a.l, inp).map((l) => arith(a.op, l, r)));
    }
    case "call": return call(a, inp, budget);
  }
}
function arith(op: string, l: Json, r: Json): Json {
  switch (op) {
    case "==": return cmpJson(l, r) === 0; case "!=": return cmpJson(l, r) !== 0; case "<": return cmpJson(l, r) < 0; case "<=": return cmpJson(l, r) <= 0; case ">": return cmpJson(l, r) > 0; case ">=": return cmpJson(l, r) >= 0;
    case "+": if (l === null) return r; if (r === null) return l; if (typeof l === "number" && typeof r === "number") return l + r; if (typeof l === "string" && typeof r === "string") return l + r; if (Array.isArray(l) && Array.isArray(r)) return [...l, ...r]; if (isObj(l) && isObj(r)) return { ...l, ...r }; throw new JqError(`${typeOf(l)} and ${typeOf(r)} cannot be added`);
    case "-": if (typeof l === "number" && typeof r === "number") return l - r; if (Array.isArray(l) && Array.isArray(r)) return l.filter((x) => !r.some((y) => cmpJson(x, y) === 0)); throw new JqError(`${typeOf(l)} and ${typeOf(r)} cannot be subtracted`);
    case "*": if (typeof l === "number" && typeof r === "number") return l * r; if (typeof l === "string" && typeof r === "number") return r > 0 ? l.repeat(r) : null; throw new JqError(`${typeOf(l)} and ${typeOf(r)} cannot be multiplied`);
    case "/": if (typeof l === "number" && typeof r === "number") { if (r === 0) throw new JqError("Division by zero"); return l / r; } if (typeof l === "string" && typeof r === "string") return l.split(r); throw new JqError(`${typeOf(l)} and ${typeOf(r)} cannot be divided`);
    default: if (typeof l === "number" && typeof r === "number") { if (r === 0) throw new JqError("Division by zero"); return l % r; } throw new JqError("Cannot compute modulo");
  }
}
function call(a: Extract<A, { k: "call" }>, inp: Json, budget: { n: number }): Json[] {
  const arg = (i: number) => ev(a.args[i], inp, budget); const f = (fn: A, v: Json) => ev(fn, v, budget);
  const arr = (): Json[] => { if (!Array.isArray(inp)) throw new JqError(`${a.name} needs an array (got ${typeOf(inp)})`, a.pos); return inp; };
  const need = (n: number) => { if (a.args.length !== n) throw new JqError(`${a.name} takes ${n} argument${n === 1 ? "" : "s"}`, a.pos); };
  switch (a.name) {
    case "empty": return []; case "not": return [!truthy(inp)]; case "type": return [typeOf(inp)];
    case "length": return [inp === null ? 0 : typeof inp === "string" || Array.isArray(inp) ? inp.length : isObj(inp) ? Object.keys(inp).length : typeof inp === "number" ? Math.abs(inp) : 0];
    case "keys": return [isObj(inp) ? Object.keys(inp).sort() : Array.isArray(inp) ? inp.map((_, i) => i) : (() => { throw new JqError("keys needs an object or array", a.pos); })()];
    case "values": return inp === null ? [] : [inp]; case "add": return [arr().reduce<Json>((x, y) => arith("+", x, y), null)];
    case "map": need(1); return [arr().flatMap((v) => f(a.args[0], v))]; case "select": need(1); return f(a.args[0], inp).flatMap((c) => (truthy(c) ? [inp] : []));
    case "sort": return [[...arr()].sort(cmpJson)]; case "reverse": return [typeof inp === "string" ? [...inp].reverse().join("") : [...arr()].reverse()];
    case "sort_by": need(1); return [[...arr()].map((v) => ({ v, k: f(a.args[0], v) as Json })).sort((x, y) => cmpJson(x.k, y.k)).map((x) => x.v)];
    case "group_by": { need(1); const m = new Map<string, { k: Json; vs: Json[] }>(); for (const v of arr()) { const k = f(a.args[0], v)[0] ?? null; const id = JSON.stringify(k); (m.get(id) ?? m.set(id, { k, vs: [] }).get(id)!).vs.push(v); } return [[...m.values()].sort((x, y) => cmpJson(x.k, y.k)).map((x) => x.vs)]; }
    case "unique": { const out: Json[] = []; for (const v of [...arr()].sort(cmpJson)) if (!out.length || cmpJson(out[out.length - 1], v) !== 0) out.push(v); return [out]; }
    case "unique_by": { need(1); const seen = new Set<string>(); return [arr().filter((v) => { const k = JSON.stringify(f(a.args[0], v)[0] ?? null); if (seen.has(k)) return false; seen.add(k); return true; })]; }
    case "first": return a.args.length ? ev(a.args[0], inp, budget).slice(0, 1) : [arr()[0] ?? null]; case "last": return [arr()[arr().length - 1] ?? null];
    case "min": return [arr().length ? arr().reduce((x, y) => (cmpJson(x, y) <= 0 ? x : y)) : null]; case "max": return [arr().length ? arr().reduce((x, y) => (cmpJson(x, y) >= 0 ? x : y)) : null];
    case "min_by": case "max_by": { need(1); const xs = arr().map((v) => ({ v, k: f(a.args[0], v)[0] ?? null })); if (!xs.length) return [null]; return [xs.reduce((x, y) => ((a.name === "min_by" ? cmpJson(x.k, y.k) <= 0 : cmpJson(x.k, y.k) >= 0) ? x : y)).v]; }
    case "to_entries": return [isObj(inp) ? Object.entries(inp).map(([key, value]) => ({ key, value })) : (() => { throw new JqError("to_entries needs an object", a.pos); })()];
    case "from_entries": return [Object.fromEntries(arr().map((e) => (isObj(e) ? [String(e.key ?? e.name), e.value ?? null] : ["", null])))];
    case "has": need(1); return arg(0).map((k) => (isObj(inp) && typeof k === "string" ? k in inp : Array.isArray(inp) && typeof k === "number" ? k >= 0 && k < inp.length : false));
    case "contains": need(1); return arg(0).map((x) => (typeof inp === "string" && typeof x === "string" ? inp.includes(x) : Array.isArray(inp) && Array.isArray(x) ? x.every((y) => inp.some((z) => cmpJson(z, y) === 0)) : cmpJson(inp, x) === 0));
    case "tostring": return [typeof inp === "string" ? inp : JSON.stringify(inp)]; case "tonumber": { const n = Number(inp); if (typeof inp === "number") return [inp]; if (typeof inp !== "string" || Number.isNaN(n)) throw new JqError(`Cannot parse ${JSON.stringify(inp)} as a number`, a.pos); return [n]; }
    case "ascii_downcase": return [String(inp).toLowerCase()]; case "ascii_upcase": return [String(inp).toUpperCase()];
    case "test": { need(1); return arg(0).map((re) => { if (typeof inp !== "string") throw new JqError("test needs a string input", a.pos); try { return new RegExp(String(re)).test(inp); } catch { throw new JqError("Invalid regular expression", a.pos); } }); }
    case "join": need(1); return arg(0).map((sep) => arr().map((x) => (x === null ? "" : typeof x === "string" ? x : JSON.stringify(x))).join(String(sep)));
    case "split": need(1); return arg(0).map((sep) => String(inp).split(String(sep))); case "floor": return [Math.floor(Number(inp))]; case "round": return [Math.round(Number(inp))]; case "sqrt": return [Math.sqrt(Number(inp))];
    case "any": return [a.args.length ? arr().some((v) => f(a.args[0], v).some(truthy)) : arr().some(truthy)]; case "all": return [a.args.length ? arr().every((v) => f(a.args[0], v).every(truthy)) : arr().every(truthy)];
    case "flatten": return [arr().flat(Infinity as 1) as Json]; case "range": need(1); return arg(0).flatMap((n) => Array.from({ length: Math.min(10000, Math.max(0, Number(n))) }, (_, i) => i));
    case "limit": need(2); return arg(0).flatMap((n) => ev(a.args[1], inp, budget).slice(0, Number(n))); case "paths": { const out: Json[] = []; const r = (v: Json, p: Json[]) => { if (Array.isArray(v)) v.forEach((x, i) => { out.push([...p, i]); r(x, [...p, i]); }); else if (isObj(v)) Object.entries(v).forEach(([k, x]) => { out.push([...p, k]); r(x, [...p, k]); }); }; r(inp, []); return out; }
    default: throw new JqError(`Unknown function ${a.name}/${a.args.length}`, a.pos);
  }
}
export function jq(program: string, input: Json): Json[] {
  const p = new JP(lex(program)); const ast = p.pipe(); if (p.cur.t !== "eof") throw new JqError(`Unexpected "${p.cur.v}"`, p.cur.pos);
  return ev(ast, input, { n: 0 });
}
export const JQ_FUNCTIONS = ["length", "keys", "values", "add", "map(f)", "select(f)", "sort", "sort_by(f)", "group_by(f)", "unique", "unique_by(f)", "reverse", "first", "last", "min", "max", "min_by(f)", "max_by(f)", "to_entries", "from_entries", "has(k)", "contains(x)", "tostring", "tonumber", "ascii_downcase", "ascii_upcase", "test(re)", "join(s)", "split(s)", "any", "all", "flatten", "range(n)", "limit(n; f)", "paths", "type", "not", "empty", "floor", "round", "sqrt"];
