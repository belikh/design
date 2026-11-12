// YAML subset: block maps/sequences, scalars (str/num/bool/null), quotes, comments, flow [a, b] / {a: 1}, | and > block scalars.
import type { Json } from "./jsonpath.ts";
export class YamlError extends Error { line: number; col: number; constructor(m: string, line: number, col = 1) { super(m); this.name = "YamlError"; this.line = line; this.col = col; } }
type L = { indent: number; text: string; n: number };
const stripComment = (s: string) => { let q = ""; for (let i = 0; i < s.length; i++) { const c = s[i]; if (q) { if (c === q) q = ""; } else if (c === '"' || c === "'") q = c; else if (c === "#" && (i === 0 || /\s/.test(s[i - 1]))) return s.slice(0, i); } return s; };
function scalar(t: string, n: number): Json {
  const s = t.trim(); if (s === "" || s === "~" || s === "null") return null; if (s === "true") return true; if (s === "false") return false;
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(s)) return Number(s);
  if (s[0] === '"') { try { return JSON.parse(s) as string; } catch { throw new YamlError("Bad double-quoted string", n); } }
  if (s[0] === "'") { if (!s.endsWith("'") || s.length < 2) throw new YamlError("Unterminated single-quoted string", n); return s.slice(1, -1).replace(/''/g, "'"); }
  if (s[0] === "[" || s[0] === "{") return flow(s, n);
  return s;
}
function flow(s: string, n: number): Json {
  let i = 0; const ws = () => { while (/\s/.test(s[i] ?? "")) i++; };
  const val = (): Json => {
    ws(); const c = s[i];
    if (c === "[") { i++; const out: Json[] = []; ws(); if (s[i] === "]") { i++; return out; } for (;;) { out.push(val()); ws(); if (s[i] === ",") { i++; continue; } if (s[i] === "]") { i++; return out; } throw new YamlError("Expected , or ] in flow sequence", n, i + 1); } }
    if (c === "{") { i++; const out: { [k: string]: Json } = {}; ws(); if (s[i] === "}") { i++; return out; } for (;;) { ws(); const k = String(atom(":,}")); ws(); if (s[i] !== ":") throw new YamlError("Expected : in flow mapping", n, i + 1); i++; out[k] = val(); ws(); if (s[i] === ",") { i++; continue; } if (s[i] === "}") { i++; return out; } throw new YamlError("Expected , or } in flow mapping", n, i + 1); } }
    return atom(",]}");
  };
  const atom = (stop: string): Json => { ws(); if (s[i] === '"' || s[i] === "'") { const q = s[i]; let j = i + 1; while (j < s.length && s[j] !== q) j++; const t = s.slice(i, j + 1); i = j + 1; return scalar(t, n); } let j = i; while (j < s.length && !stop.includes(s[j])) j++; const t = s.slice(i, j); i = j; return scalar(t, n); };
  const v = val(); ws(); if (i < s.length) throw new YamlError("Unexpected text after flow value", n, i + 1); return v;
}
export function parseYaml(src: string): Json {
  const raw = src.replace(/\r/g, "").split("\n"); const lines: L[] = [];
  raw.forEach((ln, idx) => { if (/^\t/.test(ln)) throw new YamlError("Tabs are not allowed for indentation", idx + 1); const t = stripComment(ln).replace(/\s+$/, ""); if (!t.trim() || t.trim() === "---") return; lines.push({ indent: t.length - t.trimStart().length, text: t.trimStart(), n: idx + 1 }); });
  let pos = 0; if (!lines.length) return null;
  const block = (indent: number): Json => {
    const first = lines[pos]; if (first.indent !== indent) throw new YamlError(`Unexpected indentation (expected ${indent} spaces)`, first.n);
    if (first.text.startsWith("- ") || first.text === "-") {
      const out: Json[] = [];
      while (pos < lines.length && lines[pos].indent === indent && (lines[pos].text.startsWith("- ") || lines[pos].text === "-")) {
        const l = lines[pos]; const rest = l.text === "-" ? "" : l.text.slice(2); pos++;
        if (!rest.trim()) { out.push(pos < lines.length && lines[pos].indent > indent ? block(lines[pos].indent) : null); }
        else if (/^[^"'\[{][^:]*:(\s|$)/.test(rest) || /^["'][^"']*["']:(\s|$)/.test(rest)) { const ni = indent + 2; lines.splice(pos, 0, { indent: ni, text: rest, n: l.n }); out.push(block(ni)); }
        else out.push(scalar(rest, l.n));
      }
      return out;
    }
    const out: { [k: string]: Json } = {};
    while (pos < lines.length && lines[pos].indent === indent) {
      const l = lines[pos]; const m = /^("[^"]*"|'[^']*'|[^:#]+?)\s*:(\s+(.*))?$/.exec(l.text); if (!m) throw new YamlError(`Expected "key: value" but found "${l.text}"`, l.n);
      const key = String(scalar(m[1], l.n)); if (key in out) throw new YamlError(`Duplicate key "${key}"`, l.n); const rest = (m[3] ?? "").trim(); pos++;
      if (rest === "|" || rest === ">" || rest === "|-" || rest === ">-") { const buf: string[] = []; const bi = pos < lines.length && lines[pos].indent > indent ? lines[pos].indent : indent + 2; while (pos < lines.length && lines[pos].indent >= bi) { buf.push(" ".repeat(lines[pos].indent - bi) + lines[pos].text); pos++; } out[key] = (rest[0] === "|" ? buf.join("\n") : buf.join(" ")) + (rest.endsWith("-") ? "" : "\n"); }
      else if (rest === "") out[key] = pos < lines.length && (lines[pos].indent > indent || (lines[pos].indent === indent && lines[pos].text.startsWith("- "))) ? block(lines[pos].indent) : null;
      else out[key] = scalar(rest, l.n);
    }
    return out;
  };
  const v = block(lines[0].indent); if (pos < lines.length) throw new YamlError(`Unexpected indentation`, lines[pos].n); return v;
}
const needsQuote = (s: string) => s === "" || /^[\s\-?:,\[\]{}#&*!|>'"%@`]|\s$|: |#/.test(s) || /^(true|false|null|~|-?\d+(\.\d+)?)$/.test(s);
export function toYaml(v: Json, indent = 0): string {
  const pad = "  ".repeat(indent); const sc = (x: Json): string => (typeof x === "string" ? (x.includes("\n") ? "|" : needsQuote(x) ? JSON.stringify(x) : x) : x === null ? "null" : String(x));
  if (Array.isArray(v)) { if (!v.length) return "[]"; return v.map((x) => (x !== null && typeof x === "object" ? `${pad}-\n${toYaml(x, indent + 1)}`.replace(/^(\s*)-\n\s+/, "$1- ") : `${pad}- ${sc(x)}`)).join("\n"); }
  if (v !== null && typeof v === "object") { const e = Object.entries(v); if (!e.length) return "{}"; return e.map(([k, x]) => { const key = needsQuote(k) ? JSON.stringify(k) : k; if (x !== null && typeof x === "object") return Array.isArray(x) && !x.length ? `${pad}${key}: []` : !Array.isArray(x) && !Object.keys(x).length ? `${pad}${key}: {}` : `${pad}${key}:\n${toYaml(x, indent + 1)}`; if (typeof x === "string" && x.includes("\n")) return `${pad}${key}: |\n${x.replace(/\n$/, "").split("\n").map((l) => `${pad}  ${l}`).join("\n")}`; return `${pad}${key}: ${sc(x)}`; }).join("\n"); }
  return `${pad}${sc(v)}`;
}
/** Tiny JSON-Schema-style validator: type, required, properties, enum, minimum, maximum, minLength, pattern, items. */
export type Schema = { type?: string; required?: string[]; properties?: Record<string, Schema>; enum?: Json[]; minimum?: number; maximum?: number; minLength?: number; pattern?: string; items?: Schema; additionalProperties?: boolean };
export function validate(v: Json, s: Schema, path = "$"): string[] {
  const errs: string[] = []; const t = v === null ? "null" : Array.isArray(v) ? "array" : typeof v === "number" && Number.isInteger(v) ? "integer" : typeof v;
  if (s.type && !(s.type === t || (s.type === "number" && t === "integer"))) { errs.push(`${path}: expected ${s.type}, got ${t}`); return errs; }
  if (s.enum && !s.enum.some((e) => JSON.stringify(e) === JSON.stringify(v))) errs.push(`${path}: must be one of ${s.enum.map((e) => JSON.stringify(e)).join(", ")}`);
  if (typeof v === "number") { if (s.minimum !== undefined && v < s.minimum) errs.push(`${path}: must be ≥ ${s.minimum}`); if (s.maximum !== undefined && v > s.maximum) errs.push(`${path}: must be ≤ ${s.maximum}`); }
  if (typeof v === "string") { if (s.minLength !== undefined && v.length < s.minLength) errs.push(`${path}: must have at least ${s.minLength} characters`); if (s.pattern && !new RegExp(s.pattern).test(v)) errs.push(`${path}: must match ${s.pattern}`); }
  if (Array.isArray(v) && s.items) v.forEach((x, i) => errs.push(...validate(x, s.items!, `${path}[${i}]`)));
  if (v !== null && typeof v === "object" && !Array.isArray(v)) { for (const r of s.required ?? []) if (!(r in v)) errs.push(`${path}: missing required "${r}"`); for (const [k, sub] of Object.entries(s.properties ?? {})) if (k in v) errs.push(...validate((v as { [k: string]: Json })[k], sub, `${path}.${k}`)); if (s.additionalProperties === false) for (const k of Object.keys(v)) if (!(s.properties && k in s.properties)) errs.push(`${path}: unknown property "${k}"`); }
  return errs;
}
