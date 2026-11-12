/* A small, safe spreadsheet-style expression engine: tokenizer, recursive-descent parser, evaluator.
   No eval / Function. Supports numbers, strings, booleans, A1 refs ($ absolute), ranges, named variables,
   + - * / ^ & comparisons, unary minus, percent, and a fixed function table. */

export type Scalar = number | string | boolean;
export class FormulaError extends Error { code: string; pos: number; constructor(code: string, msg?: string, pos = 0) { super(msg ?? code); this.code = code; this.pos = pos; } }
export type Cell = { col: number; row: number; absCol?: boolean; absRow?: boolean };
export type Node =
  | { t: "num"; v: number } | { t: "str"; v: string } | { t: "bool"; v: boolean }
  | { t: "ref"; c: Cell } | { t: "range"; a: Cell; b: Cell } | { t: "var"; name: string; pos: number }
  | { t: "un"; op: "-" | "+"; x: Node } | { t: "pct"; x: Node }
  | { t: "bin"; op: string; l: Node; r: Node; pos: number } | { t: "call"; name: string; args: Node[]; pos: number };

export const colName = (i: number): string => { let s = ""; for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
export const colIndex = (s: string): number => [...s].reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1;
const REF = /^(\$?)([A-Z]{1,3})(\$?)(\d+)$/;
export const parseRef = (s: string): Cell | null => { const m = REF.exec(s); return m ? { col: colIndex(m[2]), row: Number(m[4]) - 1, absCol: !!m[1], absRow: !!m[3] } : null; };
export const refName = (c: Cell): string => `${c.absCol ? "$" : ""}${colName(c.col)}${c.absRow ? "$" : ""}${c.row + 1}`;
export const key = (col: number, row: number): string => `${colName(col)}${row + 1}`;

type Tok = { k: "num" | "str" | "id" | "op" | "end"; v: string; pos: number };
export function tokenize(src: string): Tok[] {
  const out: Tok[] = []; let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9.]/.test(ch)) { const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(src.slice(i)); if (!m) throw new FormulaError("#SYNTAX", `Unexpected "${ch}"`, i); out.push({ k: "num", v: m[0], pos: i }); i += m[0].length; continue; }
    if (ch === '"') { let j = i + 1, s = ""; while (j < src.length && (src[j] !== '"' || src[j + 1] === '"')) { if (src[j] === '"') j++; s += src[j]; j++; } if (j >= src.length) throw new FormulaError("#SYNTAX", "Unterminated text", i); out.push({ k: "str", v: s, pos: i }); i = j + 1; continue; }
    if (/[A-Za-z_$]/.test(ch)) { const m = /^[A-Za-z_$][A-Za-z0-9_.$]*/.exec(src.slice(i))!; out.push({ k: "id", v: m[0], pos: i }); i += m[0].length; continue; }
    const two = src.slice(i, i + 2); if (["<=", ">=", "<>"].includes(two)) { out.push({ k: "op", v: two, pos: i }); i += 2; continue; }
    if ("+-*/^&=<>(),:%".includes(ch)) { out.push({ k: "op", v: ch, pos: i }); i++; continue; }
    throw new FormulaError("#SYNTAX", `Unexpected "${ch}"`, i);
  }
  out.push({ k: "end", v: "", pos: src.length }); return out;
}

export function parse(src: string): Node {
  const toks = tokenize(src); let p = 0;
  const peek = () => toks[p]; const eat = (v?: string) => { const t = toks[p]; if (v && t.v !== v) throw new FormulaError("#SYNTAX", `Expected "${v}"${t.k === "end" ? " but the formula ended" : ` but found "${t.v}"`}`, t.pos); p++; return t; };
  const isOp = (v: string) => peek().k === "op" && peek().v === v;
  const cmp = (): Node => { let l = cat(); while (peek().k === "op" && ["=", "<", ">", "<=", ">=", "<>"].includes(peek().v)) { const t = eat(); l = { t: "bin", op: t.v, l, r: cat(), pos: t.pos }; } return l; };
  const cat = (): Node => { let l = add(); while (isOp("&")) { const t = eat(); l = { t: "bin", op: "&", l, r: add(), pos: t.pos }; } return l; };
  const add = (): Node => { let l = mul(); while (isOp("+") || isOp("-")) { const t = eat(); l = { t: "bin", op: t.v, l, r: mul(), pos: t.pos }; } return l; };
  const mul = (): Node => { let l = pow(); while (isOp("*") || isOp("/")) { const t = eat(); l = { t: "bin", op: t.v, l, r: pow(), pos: t.pos }; } return l; };
  const pow = (): Node => { const l = unary(); if (isOp("^")) { const t = eat(); return { t: "bin", op: "^", l, r: pow(), pos: t.pos }; } return l; };
  const unary = (): Node => { if (isOp("-") || isOp("+")) { const t = eat(); return { t: "un", op: t.v as "-" | "+", x: unary() }; } return postfix(); };
  const postfix = (): Node => { let x = atom(); while (isOp("%")) { eat(); x = { t: "pct", x }; } return x; };
  const atom = (): Node => {
    const t = peek();
    if (t.k === "num") { eat(); return { t: "num", v: Number(t.v) }; }
    if (t.k === "str") { eat(); return { t: "str", v: t.v }; }
    if (t.k === "op" && t.v === "(") { eat(); const x = cmp(); eat(")"); return x; }
    if (t.k === "id") {
      eat(); const up = t.v.toUpperCase();
      if (isOp("(")) { eat("("); const args: Node[] = []; if (!isOp(")")) { args.push(cmp()); while (isOp(",")) { eat(","); args.push(cmp()); } } eat(")"); return { t: "call", name: up, args, pos: t.pos }; }
      if (up === "TRUE" || up === "FALSE") return { t: "bool", v: up === "TRUE" };
      const c = parseRef(t.v);
      if (c) { if (isOp(":")) { eat(":"); const t2 = eat(); const c2 = t2.k === "id" ? parseRef(t2.v) : null; if (!c2) throw new FormulaError("#SYNTAX", "A range needs a cell after the colon", t2.pos); return { t: "range", a: c, b: c2 }; } return { t: "ref", c }; }
      return { t: "var", name: t.v, pos: t.pos };
    }
    throw new FormulaError("#SYNTAX", t.k === "end" ? "The formula ended too early" : `Unexpected "${t.v}"`, t.pos);
  };
  const root = cmp(); if (peek().k !== "end") throw new FormulaError("#SYNTAX", `Unexpected "${peek().v}"`, peek().pos); return root;
}

export type Ctx = { cell: (c: Cell) => Scalar | undefined; variable?: (name: string) => Scalar | undefined };
type V = Scalar | V[];
const flat = (v: V[]): Scalar[] => v.flatMap((x) => (Array.isArray(x) ? flat(x) : [x]));
const num = (v: V): number => {
  if (Array.isArray(v)) return num(v[0]);
  if (typeof v === "number") return v; if (typeof v === "boolean") return v ? 1 : 0;
  if (v === "" || v === undefined) return 0; const n = Number(v); if (Number.isNaN(n)) throw new FormulaError("#VALUE!", `"${v}" is not a number`); return n;
};
const nums = (args: V[]) => flat(args).filter((x) => typeof x === "number") as number[];
const text = (v: V): string => (Array.isArray(v) ? text(v[0]) : String(v ?? ""));
export const FUNCTIONS: Record<string, { doc: string; fn: (a: V[]) => V }> = {
  SUM: { doc: "SUM(a, b, …) adds numbers", fn: (a) => nums(a).reduce((x, y) => x + y, 0) },
  AVERAGE: { doc: "AVERAGE(a, b, …) mean of numbers", fn: (a) => { const n = nums(a); if (!n.length) throw new FormulaError("#DIV/0!"); return n.reduce((x, y) => x + y, 0) / n.length; } },
  MIN: { doc: "MIN(a, b, …) smallest number", fn: (a) => Math.min(...nums(a)) },
  MAX: { doc: "MAX(a, b, …) largest number", fn: (a) => Math.max(...nums(a)) },
  COUNT: { doc: "COUNT(a, …) how many numbers", fn: (a) => nums(a).length },
  ROUND: { doc: "ROUND(x, digits) rounds", fn: (a) => { const d = a[1] === undefined ? 0 : num(a[1]); const f = 10 ** d; return Math.round(num(a[0]) * f) / f; } },
  ABS: { doc: "ABS(x) absolute value", fn: (a) => Math.abs(num(a[0])) },
  SQRT: { doc: "SQRT(x) square root", fn: (a) => { const x = num(a[0]); if (x < 0) throw new FormulaError("#NUM!"); return Math.sqrt(x); } },
  IF: { doc: "IF(test, then, else)", fn: (a) => { const t = Array.isArray(a[0]) ? a[0][0] : a[0]; return (t === "" || t === 0 || t === false ? a[2] : a[1]) ?? false; } },
  AND: { doc: "AND(a, b, …) all true", fn: (a) => flat(a).every(Boolean) },
  OR: { doc: "OR(a, b, …) any true", fn: (a) => flat(a).some(Boolean) },
  NOT: { doc: "NOT(x) invert", fn: (a) => !a[0] },
  CONCAT: { doc: "CONCAT(a, b, …) joins text", fn: (a) => flat(a).map(String).join("") },
  UPPER: { doc: "UPPER(text)", fn: (a) => text(a[0]).toUpperCase() },
  LEN: { doc: "LEN(text) length", fn: (a) => text(a[0]).length },
  POWER: { doc: "POWER(x, y)", fn: (a) => num(a[0]) ** num(a[1]) },
  MOD: { doc: "MOD(x, y) remainder", fn: (a) => { if (num(a[1]) === 0) throw new FormulaError("#DIV/0!"); return num(a[0]) % num(a[1]); } },
};
const MAX_RANGE = 10000;
export function evaluate(n: Node, ctx: Ctx): V {
  switch (n.t) {
    case "num": case "str": case "bool": return n.v;
    case "ref": return ctx.cell(n.c) ?? "";
    case "range": { const out: Scalar[] = []; const [c0, c1] = [Math.min(n.a.col, n.b.col), Math.max(n.a.col, n.b.col)]; const [r0, r1] = [Math.min(n.a.row, n.b.row), Math.max(n.a.row, n.b.row)]; if ((c1 - c0 + 1) * (r1 - r0 + 1) > MAX_RANGE) throw new FormulaError("#REF!", "Range is too large"); for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) out.push(ctx.cell({ col: c, row: r }) ?? ""); return out; }
    case "var": { const v = ctx.variable?.(n.name); if (v === undefined) throw new FormulaError("#NAME?", `Unknown name "${n.name}"`, n.pos); return v; }
    case "un": return n.op === "-" ? -num(evaluate(n.x, ctx)) : num(evaluate(n.x, ctx));
    case "pct": return num(evaluate(n.x, ctx)) / 100;
    case "call": { const f = FUNCTIONS[n.name]; if (!f) throw new FormulaError("#NAME?", `Unknown function ${n.name}`, n.pos); return f.fn(n.args.map((a) => evaluate(a, ctx))); }
    case "bin": {
      const l = evaluate(n.l, ctx), r = evaluate(n.r, ctx);
      if (n.op === "&") return text(l) + text(r);
      if (["=", "<>", "<", ">", "<=", ">="].includes(n.op)) { const a = Array.isArray(l) ? l[0] : l, b = Array.isArray(r) ? r[0] : r; const both = typeof a === typeof b ? [a, b] : [Number(a), Number(b)]; const [x, y] = both as [number, number]; switch (n.op) { case "=": return x === y; case "<>": return x !== y; case "<": return x < y; case ">": return x > y; case "<=": return x <= y; default: return x >= y; } }
      const a = num(l), b = num(r);
      switch (n.op) { case "+": return a + b; case "-": return a - b; case "*": return a * b; case "/": if (b === 0) throw new FormulaError("#DIV/0!", "Division by zero", n.pos); return a / b; default: return a ** b; }
    }
  }
}
/** Evaluate a formula string; returns the value or an error code. */
export function calc(src: string, ctx: Ctx): { value: Scalar } | { error: string; message: string; pos: number } {
  try { const v = evaluate(parse(src), ctx); const s = Array.isArray(v) ? flat(v)[0] ?? "" : v; if (typeof s === "number" && !Number.isFinite(s)) throw new FormulaError("#NUM!"); return { value: s }; }
  catch (e) { if (e instanceof FormulaError) return { error: e.code, message: e.message, pos: e.pos }; throw e; }
}

/* ---------- sheet ---------- */
export type Raw = Record<string, string>;
export type Computed = Record<string, Scalar | { error: string }>;
export const isErr = (v: unknown): v is { error: string } => typeof v === "object" && v !== null && "error" in v;
const literal = (s: string): Scalar => { const t = s.trim(); if (t !== "" && !Number.isNaN(Number(t))) return Number(t); if (/^(true|false)$/i.test(t)) return t.toLowerCase() === "true"; return s; };
export function computeSheet(raw: Raw): Computed {
  const out: Computed = {}; const busy = new Set<string>();
  const get = (k: string): Scalar | { error: string } => {
    if (k in out) return out[k];
    const src = raw[k]; if (src === undefined || src === "") return "";
    if (!src.startsWith("=")) return (out[k] = literal(src));
    if (busy.has(k)) return { error: "#CYCLE!" };
    busy.add(k);
    const ctx: Ctx = { cell: (c) => { const v = get(key(c.col, c.row)); if (isErr(v)) throw new FormulaError(v.error); return v; } };
    const res = calc(src.slice(1), ctx); busy.delete(k);
    return (out[k] = "error" in res ? { error: res.error } : res.value);
  };
  for (const k of Object.keys(raw)) get(k);
  return out;
}
export const show = (v: Scalar | { error: string } | undefined): string => (v === undefined ? "" : isErr(v) ? v.error : typeof v === "number" ? String(Math.round(v * 1e10) / 1e10) : typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : v);

/** Shift relative references in a formula by (dRow, dCol): what the fill handle and paste do. */
export function shiftFormula(src: string, dRow: number, dCol: number): string {
  if (!src.startsWith("=")) return src;
  let out = "="; const body = src.slice(1); let i = 0;
  while (i < body.length) {
    if (body[i] === '"') { let j = i + 1; while (j < body.length && (body[j] !== '"' || body[j + 1] === '"')) j += body[j] === '"' ? 2 : 1; out += body.slice(i, j + 1); i = j + 1; continue; }
    const m = /^[A-Za-z_$][A-Za-z0-9_.$]*/.exec(body.slice(i));
    if (m) { const after = body.slice(i + m[0].length).trimStart()[0]; const c = after === "(" ? null : parseRef(m[0]); out += c ? refName({ ...c, col: c.absCol ? c.col : Math.max(0, c.col + dCol), row: c.absRow ? c.row : Math.max(0, c.row + dRow) }) : m[0]; i += m[0].length; continue; }
    out += body[i]; i++;
  }
  return out;
}
export type Rect = { r0: number; c0: number; r1: number; c1: number };
export const toTSV = (raw: Raw, computed: Computed, rect: Rect, formulas = false): string =>
  Array.from({ length: rect.r1 - rect.r0 + 1 }, (_, r) => Array.from({ length: rect.c1 - rect.c0 + 1 }, (_, c) => { const k = key(rect.c0 + c, rect.r0 + r); return formulas ? raw[k] ?? "" : show(computed[k]); }).join("\t")).join("\n");
/** Paste TSV (formulas copied from `from` are shifted) at an anchor. Returns the cells to set. */
export function pasteTSV(tsv: string, at: { row: number; col: number }, from?: { row: number; col: number }): Raw {
  const out: Raw = {}; const rows = tsv.replace(/\r/g, "").replace(/\n$/, "").split("\n");
  rows.forEach((line, r) => line.split("\t").forEach((cell, c) => { out[key(at.col + c, at.row + r)] = from ? shiftFormula(cell, at.row - from.row, at.col - from.col) : cell; }));
  return out;
}
/** Fill a source rectangle down/right across a target rectangle (formulas shift; numeric 2-cell series extend). */
export function fillRange(raw: Raw, src: Rect, target: Rect): Raw {
  const out: Raw = {}; const h = src.r1 - src.r0 + 1, w = src.c1 - src.c0 + 1;
  for (let r = target.r0; r <= target.r1; r++) for (let c = target.c0; c <= target.c1; c++) {
    if (r >= src.r0 && r <= src.r1 && c >= src.c0 && c <= src.c1) continue;
    const sr = src.r0 + (((r - src.r0) % h) + h) % h, sc = src.c0 + (((c - src.c0) % w) + w) % w; const s = raw[key(sc, sr)] ?? "";
    const vertical = target.r1 > src.r1 || target.r0 < src.r0;
    if (!s.startsWith("=") && h >= 2 && vertical && w === 1) { const a = Number(raw[key(sc, src.r0)]), b = Number(raw[key(sc, src.r0 + 1)]); const step = b - a; if (!Number.isNaN(step) && src.r1 - src.r0 === 1 && raw[key(sc, src.r0)] !== "") { out[key(c, r)] = String(a + step * (r - src.r0)); continue; } }
    out[key(c, r)] = shiftFormula(s, r - sr, c - sc);
  }
  return out;
}
