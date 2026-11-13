// JSONPath subset: $ . .. [n] ['k'] [*] [a:b:c] [a,b] [?(@.x > 1 && @.y == 'z')]. Pure; no eval.
export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
export class PathError extends Error { pos: number; constructor(m: string, pos: number) { super(m); this.name = "PathError"; this.pos = pos; } }
type FExpr = { k: "or" | "and"; l: FExpr; r: FExpr } | { k: "not"; e: FExpr } | { k: "cmp"; op: string; l: FVal; r: FVal } | { k: "exists"; v: FVal };
type FVal = { k: "path"; steps: Step[] } | { k: "lit"; v: Json };
type Step = { k: "child"; name: string } | { k: "index"; i: number } | { k: "wild" } | { k: "desc" } | { k: "slice"; a?: number; b?: number; s: number } | { k: "union"; keys: (string | number)[] } | { k: "filter"; e: FExpr };

class Pp {
  i = 0; s: string; constructor(s: string) { this.s = s; }
  ws() { while (/\s/.test(this.s[this.i] ?? "")) this.i++; }
  eat(t: string) { this.ws(); if (this.s.startsWith(t, this.i)) { this.i += t.length; return true; } return false; }
  need(t: string) { if (!this.eat(t)) throw new PathError(`Expected "${t}"`, this.i); }
  path(root: string): Step[] {
    this.ws(); if (!this.s.startsWith(root, this.i)) throw new PathError(`A path must start with ${root}`, this.i); this.i += root.length; return this.steps();
  }
  steps(): Step[] {
    const out: Step[] = [];
    for (;;) {
      if (this.s.startsWith("..", this.i)) { this.i += 2; out.push({ k: "desc" }); if (this.s[this.i] === "[") continue; if (this.s[this.i] === "*") { this.i++; out.push({ k: "wild" }); } else out.push({ k: "child", name: this.name() }); }
      else if (this.s[this.i] === ".") { this.i++; if (this.s[this.i] === "*") { this.i++; out.push({ k: "wild" }); } else out.push({ k: "child", name: this.name() }); }
      else if (this.s[this.i] === "[") out.push(this.bracket());
      else break;
    }
    return out;
  }
  name() { const m = /^[A-Za-z_$][\w$-]*/.exec(this.s.slice(this.i)); if (!m) throw new PathError("Expected a property name", this.i); this.i += m[0].length; return m[0]; }
  str() { const q = this.s[this.i]; if (q !== "'" && q !== '"') throw new PathError("Expected a quoted string", this.i); let j = this.i + 1, out = ""; while (j < this.s.length && this.s[j] !== q) { if (this.s[j] === "\\") j++; out += this.s[j++]; } if (this.s[j] !== q) throw new PathError("Unterminated string", this.i); this.i = j + 1; return out; }
  bracket(): Step {
    this.i++; this.ws();
    if (this.eat("*")) { this.need("]"); return { k: "wild" }; }
    if (this.eat("?")) { this.need("("); const e = this.or(); this.need(")"); this.need("]"); return { k: "filter", e }; }
    const items: (string | number)[] = []; let slice: { a?: number; b?: number; s: number } | null = null;
    do {
      this.ws();
      if (this.s[this.i] === "'" || this.s[this.i] === '"') items.push(this.str());
      else { const m = /^-?\d*/.exec(this.s.slice(this.i))![0]; if (this.s[this.i + m.length] === ":") { this.i += m.length + 1; const m2 = /^-?\d*/.exec(this.s.slice(this.i))![0]; this.i += m2.length; let st = 1; if (this.s[this.i] === ":") { this.i++; const m3 = /^-?\d*/.exec(this.s.slice(this.i))![0]; this.i += m3.length; if (m3) st = Number(m3); } slice = { a: m ? Number(m) : undefined, b: m2 ? Number(m2) : undefined, s: st }; } else if (m && m !== "-") { this.i += m.length; items.push(Number(m)); } else throw new PathError("Expected an index, slice or quoted name", this.i); }
    } while (this.eat(","));
    this.need("]");
    if (slice) return { k: "slice", ...slice };
    if (items.length === 1) return typeof items[0] === "number" ? { k: "index", i: items[0] } : { k: "child", name: items[0] };
    return { k: "union", keys: items };
  }
  or(): FExpr { let l = this.and(); while (this.eat("||")) l = { k: "or", l, r: this.and() }; return l; }
  and(): FExpr { let l = this.unary(); while (this.eat("&&")) l = { k: "and", l, r: this.unary() }; return l; }
  unary(): FExpr { if (this.eat("!")) return { k: "not", e: this.unary() }; if (this.eat("(")) { const e = this.or(); this.need(")"); return e; } const l = this.val(); for (const op of ["==", "!=", "<=", ">=", "<", ">", "=~"]) if (this.eat(op)) return { k: "cmp", op, l, r: this.val() }; return { k: "exists", v: l }; }
  val(): FVal {
    this.ws(); const c = this.s[this.i];
    if (c === "@") { this.i++; return { k: "path", steps: this.steps() }; }
    if (c === "'" || c === '"') return { k: "lit", v: this.str() };
    if (c === "/") { const j = this.s.indexOf("/", this.i + 1); if (j < 0) throw new PathError("Unterminated regex", this.i); const src = this.s.slice(this.i + 1, j); this.i = j + 1; const fl = /^[gimsuy]*/.exec(this.s.slice(this.i))![0]; this.i += fl.length; return { k: "lit", v: `/${src}/${fl}` }; }
    const m = /^-?\d+(\.\d+)?/.exec(this.s.slice(this.i)); if (m) { this.i += m[0].length; return { k: "lit", v: Number(m[0]) }; }
    for (const [w, v] of [["true", true], ["false", false], ["null", null]] as const) if (this.s.startsWith(w, this.i)) { this.i += w.length; return { k: "lit", v }; }
    throw new PathError("Expected @path or a literal", this.i);
  }
}
const isObj = (v: Json): v is { [k: string]: Json } => v !== null && typeof v === "object" && !Array.isArray(v);
const children = (v: Json): [string | number, Json][] => (Array.isArray(v) ? v.map((x, i) => [i, x]) : isObj(v) ? Object.entries(v) : []);
type Hit = { path: (string | number)[]; value: Json };
const walk = (steps: Step[], hits: Hit[], root: Json): Hit[] => {
  let cur = hits;
  for (const st of steps) {
    const next: Hit[] = [];
    for (const h of cur) {
      const v = h.value;
      switch (st.k) {
        case "child": if (isObj(v) && st.name in v) next.push({ path: [...h.path, st.name], value: v[st.name] }); break;
        case "index": if (Array.isArray(v)) { const i = st.i < 0 ? v.length + st.i : st.i; if (i >= 0 && i < v.length) next.push({ path: [...h.path, i], value: v[i] }); } break;
        case "wild": for (const [k, x] of children(v)) next.push({ path: [...h.path, k], value: x }); break;
        case "desc": { const rec = (p: (string | number)[], x: Json) => { next.push({ path: p, value: x }); for (const [k, y] of children(x)) rec([...p, k], y); }; rec(h.path, v); break; }
        case "slice": if (Array.isArray(v)) { const n = v.length; const norm = (x: number | undefined, d: number) => (x === undefined ? d : x < 0 ? Math.max(0, n + x) : Math.min(n, x)); const a = norm(st.a, st.s > 0 ? 0 : n - 1), b = norm(st.b, st.s > 0 ? n : -1); if (st.s > 0) for (let i = a; i < b; i += st.s) next.push({ path: [...h.path, i], value: v[i] }); else if (st.s < 0) for (let i = a; i > b; i += st.s) next.push({ path: [...h.path, i], value: v[i] }); } break;
        case "union": for (const k of st.keys) { if (typeof k === "number" && Array.isArray(v) && k < v.length) next.push({ path: [...h.path, k], value: v[k] }); else if (typeof k === "string" && isObj(v) && k in v) next.push({ path: [...h.path, k], value: v[k] }); } break;
        case "filter": for (const [k, x] of children(v)) if (fev(st.e, x, root)) next.push({ path: [...h.path, k], value: x }); break;
      }
    }
    cur = next;
  }
  return cur;
};
const fval = (v: FVal, cur: Json, root: Json): Json[] => (v.k === "lit" ? [v.v] : walk(v.steps, [{ path: [], value: cur }], root).map((h) => h.value));
const fev = (e: FExpr, cur: Json, root: Json): boolean => {
  switch (e.k) {
    case "or": return fev(e.l, cur, root) || fev(e.r, cur, root); case "and": return fev(e.l, cur, root) && fev(e.r, cur, root); case "not": return !fev(e.e, cur, root);
    case "exists": return fval(e.v, cur, root).some((x) => x !== null && x !== false) || fval(e.v, cur, root).length > 0;
    case "cmp": { const L = fval(e.l, cur, root), R = fval(e.r, cur, root); return L.some((a) => R.some((b) => { switch (e.op) { case "==": return JSON.stringify(a) === JSON.stringify(b); case "!=": return JSON.stringify(a) !== JSON.stringify(b); case "<": return typeof a === typeof b && (a as number) < (b as number); case "<=": return typeof a === typeof b && (a as number) <= (b as number); case ">": return typeof a === typeof b && (a as number) > (b as number); case ">=": return typeof a === typeof b && (a as number) >= (b as number); default: { const m = /^\/(.*)\/([a-z]*)$/.exec(String(b)); if (!m) return false; try { return new RegExp(m[1], m[2]).test(String(a)); } catch { return false; } } } })); }
  }
};
export const pathString = (p: (string | number)[]) => "$" + p.map((k) => (typeof k === "number" ? `[${k}]` : `['${k}']`)).join("");
export function jsonPath(doc: Json, query: string): { path: string; value: Json }[] {
  const p = new Pp(query); const steps = p.path("$"); p.ws(); if (p.i < query.length) throw new PathError(`Unexpected "${query[p.i]}"`, p.i);
  return walk(steps, [{ path: [], value: doc }], doc).map((h) => ({ path: pathString(h.path), value: h.value }));
}
