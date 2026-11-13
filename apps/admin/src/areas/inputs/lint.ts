// Lint, format and highlight for the code editors: JSON, YAML (practical subset), SQL, shell, CSS, Markdown.
// These are pragmatic checkers, not full parsers: they catch the mistakes people actually make and say where.
export type Lang = "json" | "yaml" | "sql" | "sh" | "css" | "md";
export type Issue = { line: number; col?: number; sev: "error" | "warn" | "info"; msg: string };

function jsonPos(msg: string, text: string): { line: number; col: number } {
  let m = /line (\d+) column (\d+)/.exec(msg); if (m) return { line: Number(m[1]), col: Number(m[2]) };
  m = /position (\d+)/.exec(msg); if (m) { const pre = text.slice(0, Number(m[1])); const lines = pre.split("\n"); return { line: lines.length, col: lines[lines.length - 1].length + 1 }; } return { line: 1, col: 1 };
}
const stripStrings = (l: string) => l.replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, '""');

export function lint(lang: Lang, text: string): Issue[] {
  const out: Issue[] = []; const lines = text.split("\n");
  if (lang === "json") { if (!text.trim()) return [{ line: 1, sev: "error", msg: "Empty document" }]; try { JSON.parse(text); } catch (e) { const p = jsonPos(String((e as Error).message), text); out.push({ line: p.line, col: p.col, sev: "error", msg: (e as Error).message.replace(/ in JSON at position \d+.*/, "") }); } if (/,\s*[}\]]/.test(text)) out.push({ line: lines.findIndex((l, i) => /,\s*$/.test(l) && /^\s*[}\]]/.test(lines[i + 1] ?? "")) + 1 || 1, sev: "warn", msg: "Trailing comma (not valid JSON)" }); }
  if (lang === "yaml") {
    const seen: Record<number, Set<string>> = {}; let prevIndent = 0;
    lines.forEach((l, i) => {
      const n = i + 1; if (!l.trim() || l.trim().startsWith("#")) return; if (/\t/.test(l.match(/^\s*/)![0])) out.push({ line: n, sev: "error", msg: "Tabs are not allowed for indentation" });
      const indent = l.match(/^ */)![0].length; if (indent % 2 && !l.trim().startsWith("-")) out.push({ line: n, sev: "warn", msg: "Indentation should be a multiple of 2 spaces" });
      const m = /^(\s*)(?:- )?([^:#\s][^:]*?):(\s|$)/.exec(l); if (m) { const set = (seen[indent] ??= new Set()); const key = m[2].trim(); if (set.has(key)) out.push({ line: n, sev: "error", msg: `Duplicate key “${key}”` }); set.add(key); if (indent < prevIndent) for (const k of Object.keys(seen)) if (Number(k) > indent) delete seen[Number(k)]; }
      if (/^\s*[\w.-]+:[^\s]/.test(l) && !/:\/\//.test(l)) out.push({ line: n, sev: "error", msg: "Missing space after “:”" });
      if ((stripStrings(l).match(/"/g) ?? []).length % 2 || (l.replace(/"[^"]*"/g, "").match(/'/g) ?? []).length % 2) out.push({ line: n, sev: "error", msg: "Unbalanced quote" });
      prevIndent = indent;
    });
  }
  if (lang === "sql") {
    const s = text.replace(/--.*$/gm, ""); const stripped = stripStrings(s); if ((stripped.match(/\(/g) ?? []).length !== (stripped.match(/\)/g) ?? []).length) out.push({ line: 1, sev: "error", msg: "Unbalanced parentheses" });
    if ((s.match(/'/g) ?? []).length % 2) out.push({ line: 1, sev: "error", msg: "Unterminated string literal" });
    s.split(";").forEach((st) => { const t = st.trim(); if (!t) return; const ln = lines.findIndex((l) => l.includes(t.split("\n")[0].trim().slice(0, 12))) + 1 || 1;
      if (/^(delete|update)\b/i.test(t) && !/\bwhere\b/i.test(t)) out.push({ line: ln, sev: "error", msg: `${t.split(/\s/)[0].toUpperCase()} without WHERE affects every row` });
      if (/^select\b/i.test(t) && !/\bfrom\b/i.test(t) && !/^select\s+[\d'(]/i.test(t)) out.push({ line: ln, sev: "error", msg: "SELECT without FROM" }); if (/select\s+\*/i.test(t)) out.push({ line: ln, sev: "warn", msg: "SELECT * returns every column; list the ones you need" });
      if (/^drop\b/i.test(t)) out.push({ line: ln, sev: "warn", msg: "DROP is destructive" }); });
    if (text.trim() && !/;\s*$/.test(text.trim())) out.push({ line: lines.length, sev: "info", msg: "Statement is not terminated with ;" });
  }
  if (lang === "sh") {
    lines.forEach((l, i) => { const n = i + 1; const c = l.replace(/#.*$/, ""); if ((c.replace(/\\./g, "").match(/"/g) ?? []).length % 2 || (c.replace(/"[^"]*"/g, "").match(/'/g) ?? []).length % 2) out.push({ line: n, sev: "error", msg: "Unterminated quote" });
      if (/\brm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)\s+\/(\s|$|\*)/.test(c)) out.push({ line: n, sev: "error", msg: "rm -rf on / would delete the whole system" }); if (/\b(rm|cd|mv|cp)\b[^|;&]*\$[A-Za-z_]\w*(?![\w"])/.test(c) && !/"\$/.test(c)) out.push({ line: n, sev: "warn", msg: "Unquoted variable: quote it as \"$VAR\" to survive spaces and empty values" });
      if (/curl[^|]*\|\s*(sudo\s+)?(ba)?sh/.test(c)) out.push({ line: n, sev: "warn", msg: "Piping curl into a shell runs unreviewed code" }); if (/^\s*[A-Za-z_]\w*\s+=\s/.test(c)) out.push({ line: n, sev: "error", msg: "No spaces around = in a variable assignment" }); });
    if (text.trim() && !/^#!/.test(text)) out.push({ line: 1, sev: "info", msg: "No shebang (#!/usr/bin/env bash)" }); if (text.trim() && !/set -[a-z]*e/.test(text)) out.push({ line: 1, sev: "info", msg: "Consider `set -euo pipefail` so errors stop the script" });
    const open = (text.match(/\b(if|for|while|case)\b/g) ?? []).length, close = (text.match(/\b(fi|done|esac)\b/g) ?? []).length; if (open !== close) out.push({ line: lines.length, sev: "error", msg: `Unbalanced control blocks (${open} opened, ${close} closed)` });
  }
  if (lang === "css") {
    const o = (text.match(/\{/g) ?? []).length, c = (text.match(/\}/g) ?? []).length; if (o !== c) out.push({ line: lines.length, sev: "error", msg: `Unbalanced braces (${o} “{”, ${c} “}”)` });
    let depth = 0; lines.forEach((l, i) => { const t = l.trim(); const opens = (t.match(/\{/g) ?? []).length; if (depth > 0 && t && !/[{};]$/.test(t) && !t.startsWith("/*") && !t.startsWith("}")) out.push({ line: i + 1, sev: "error", msg: "Missing semicolon" }); if (depth > 0 && /^[a-z-]+\s+[^:]*;$/.test(t) && !t.includes(":")) out.push({ line: i + 1, sev: "error", msg: "Declaration is missing a colon" }); depth += opens - (t.match(/\}/g) ?? []).length; });
    if (/!important/.test(text)) out.push({ line: lines.findIndex((l) => l.includes("!important")) + 1, sev: "info", msg: "!important makes overrides harder" });
  }
  if (lang === "md") { lines.forEach((l, i) => { if (/^#{1,6}[^#\s]/.test(l)) out.push({ line: i + 1, sev: "warn", msg: "Add a space after the # in a heading" }); if (/\[[^\]]*\]\(\s*\)/.test(l)) out.push({ line: i + 1, sev: "warn", msg: "Link has an empty URL" }); }); if ((text.match(/```/g) ?? []).length % 2) out.push({ line: lines.length, sev: "error", msg: "Unclosed code fence" }); }
  return out.sort((a, b) => a.line - b.line);
}

const SQL_KW = ["select", "from", "where", "group by", "order by", "having", "limit", "offset", "join", "left join", "right join", "inner join", "outer join", "on", "and", "or", "not", "in", "is", "null", "as", "insert into", "values", "update", "set", "delete from", "create table", "drop table", "union", "distinct", "count", "sum", "avg", "min", "max", "between", "like", "case", "when", "then", "else", "end", "desc", "asc"];
export function format(lang: Lang, text: string): string {
  if (lang === "json") { try { return JSON.stringify(JSON.parse(text), null, 2) + "\n"; } catch { return text; } }
  if (lang === "yaml") return text.split("\n").map((l) => { const lead = l.match(/^[ \t]*/)![0].replace(/\t/g, "  "); return (lead + l.trimStart()).replace(/[ \t]+$/, "").replace(/^(\s*[\w.-]+):(?=\S)(?!\/\/)/, "$1: "); }).join("\n").replace(/\n{3,}/g, "\n\n").replace(/\s*$/, "\n");
  if (lang === "sql") {
    let s = text.replace(/\s+/g, " ").trim(); const kw = [...SQL_KW].sort((a, b) => b.length - a.length);
    for (const k of kw) s = s.replace(new RegExp(`\\b${k.replace(/ /g, "\\s+")}\\b`, "gi"), (m) => (/'/.test(m) ? m : k.toUpperCase()));
    s = s.replace(/\b(FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|UNION|LEFT JOIN|RIGHT JOIN|INNER JOIN|OUTER JOIN|JOIN|SET|VALUES)\b/g, "\n$1").replace(/\b(AND|OR)\b(?![^(]*\))/g, "\n  $1").replace(/^\n/, "");
    return s.replace(/\s*;?\s*$/, ";") + "\n";
  }
  if (lang === "sh") return text.split("\n").map((l) => l.replace(/[ \t]+$/, "")).join("\n").replace(/\n{3,}/g, "\n\n").replace(/\s*$/, "\n");
  if (lang === "css") { let depth = 0; return text.replace(/\s*\{\s*/g, " {\n").replace(/;\s*/g, ";\n").replace(/\s*\}\s*/g, "\n}\n").split("\n").map((l) => l.trim()).filter((l, i, a) => l || (a[i - 1] && a[i + 1])).map((l) => { if (l.startsWith("}")) depth = Math.max(0, depth - 1); const o = "  ".repeat(depth) + l; if (l.endsWith("{")) depth++; return o; }).join("\n").replace(/\}\n(?=\S)/g, "}\n\n") .trim() + "\n"; }
  return text.replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").replace(/\s*$/, "\n");
}

export type Tok = { t: string; c?: "kw" | "str" | "num" | "com" | "key" | "pun" | "var" | "fn" };
const RULES: Record<Lang, [RegExp, Tok["c"]][]> = {
  json: [[/^"(?:[^"\\]|\\.)*"(?=\s*:)/, "key"], [/^"(?:[^"\\]|\\.)*"/, "str"], [/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/, "num"], [/^(?:true|false|null)\b/, "kw"], [/^[{}[\],:]/, "pun"]],
  yaml: [[/^#.*/, "com"], [/^"(?:[^"\\]|\\.)*"|^'[^']*'/, "str"], [/^[\w.-]+(?=\s*:(?:\s|$))/, "key"], [/^-?\d+(?:\.\d+)?\b/, "num"], [/^(?:true|false|null|yes|no)\b/, "kw"], [/^[-:[\]{},|>]/, "pun"]],
  sql: [[/^--.*/, "com"], [/^'(?:[^']|'')*'/, "str"], [/^\b(?:select|from|where|group\s+by|order\s+by|having|limit|offset|join|left|right|inner|outer|on|and|or|not|in|is|null|as|insert|into|values|update|set|delete|create|table|drop|union|distinct|between|like|case|when|then|else|end|desc|asc)\b/i, "kw"], [/^\b(?:count|sum|avg|min|max|coalesce|lower|upper)\b(?=\()/i, "fn"], [/^\d+(?:\.\d+)?/, "num"], [/^[(),;*=<>]/, "pun"]],
  sh: [[/^#.*/, "com"], [/^"(?:[^"\\]|\\.)*"|^'[^']*'/, "str"], [/^\$\{?[A-Za-z_]\w*\}?/, "var"], [/^\b(?:if|then|else|elif|fi|for|while|do|done|case|esac|function|return|export|local|set|echo|cd|rm|mv|cp|cat|grep|sed|awk|curl|sudo)\b/, "kw"], [/^-{1,2}[A-Za-z][\w-]*/, "num"], [/^[|&;<>()]/, "pun"]],
  css: [[/^\/\*[\s\S]*?\*\//, "com"], [/^"(?:[^"\\]|\\.)*"|^'[^']*'/, "str"], [/^[a-z-]+(?=\s*:)/, "key"], [/^[#.][\w-]+/, "fn"], [/^-?\d+(?:\.\d+)?(?:px|rem|em|%|ms|s|vh|vw)?/, "num"], [/^#[0-9a-fA-F]{3,8}\b/, "num"], [/^[{}:;(),]/, "pun"], [/^@[\w-]+/, "kw"], [/^var\(--[\w-]+\)/, "var"]],
  md: [[/^#{1,6}\s.*/, "kw"], [/^`[^`]+`/, "str"], [/^\*\*[^*]+\*\*/, "fn"], [/^\[[^\]]+\]\([^)]+\)/, "var"], [/^[-*]\s/, "pun"]],
};
export function highlight(lang: Lang, code: string): Tok[][] {
  return code.split("\n").map((line) => { const toks: Tok[] = []; let rest = line; let plain = ""; const flush = () => { if (plain) { toks.push({ t: plain }); plain = ""; } };
    while (rest) { let hit = false; for (const [re, c] of RULES[lang]) { const m = re.exec(rest); if (m && m[0]) { flush(); toks.push({ t: m[0], c }); rest = rest.slice(m[0].length); hit = true; break; } } if (!hit) { plain += rest[0]; rest = rest.slice(1); } }
    flush(); return toks; });
}
