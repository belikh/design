#!/usr/bin/env node
// House-style lint. Fails when a file has MORE violations than the committed baseline (a ratchet),
// so new code must follow the rules while legacy code is paid down over time.
//   node scripts/lint-style.mjs            check against lint-baseline.json
//   node scripts/lint-style.mjs --update   rewrite the baseline (only after fixing things, never to hide new ones)
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join, relative, extname } from "node:path";

const root = new URL("..", import.meta.url).pathname; const roots = [join(root, "src"), join(root, "../../packages/ui/src")]; const baselinePath = join(root, "scripts/lint-baseline.json");
const RULES = [
  { id: "hex-colour", why: "Use a token: var(--jp-*) or var(--adm-c1..c8). Hard-coded colours break theming and high contrast.", re: /#[0-9a-fA-F]{3,8}\b(?![\w-])/g, exts: [".css", ".tsx", ".ts"], skip: (f) => /\.test\.|palette|esp\/|\/ha\//.test(f) },
  { id: "px-font-size", why: "Use a type token: var(--jp-fs-xs|sm|md|lg|xl|2xl). Pixel font sizes had to be edited by hand when the scale changed.", re: /font-size:\s*\d+(\.\d+)?px|fontSize:\s*\d+\b/g, exts: [".css", ".tsx"], skip: (f) => /\.test\./.test(f) },
  { id: "bespoke-editor", why: "Editing a value? Use <Editable> (single value) or a DataTable column `editor`. Do not hand-roll <input> edit modes.", re: /className="jp-input adm-cell-edit"|const \[editing, setEditing\]/g, exts: [".tsx"], skip: (f) => /(editable|DataTable|BulkEditPanel)\.tsx|\.test\./.test(f) },
  { id: "physical-property", why: "Use logical properties (margin-inline-start, padding-inline, inset-inline-end, text-align: start/end) so right-to-left works without [dir=rtl] overrides.", re: /(?:margin|padding)-(?:left|right)\s*:|text-align:\s*(?:left|right)\b|(?<![\w-])(?:left|right)\s*:\s*-?[\d.]+(?:px|%|rem)?\s*[;}]/g, exts: [".css"], skip: (f) => /\.test\.|styles\/a11y\.css/.test(f) },
  { id: "literal-constant", why: "Stacking order, shadows and chrome sizes are design constants: use var(--jp-z-*), var(--jp-shadow-*), var(--jp-size-*) so one change in the design system reaches every project.", re: /z-index:\s*(?:1\d|[2-9]\d|\d{3})\b|box-shadow:[^;}]*rgba?\(|(?<![\w-])width:\s*(?:400|440|560|820)px/g, exts: [".css"], skip: (f) => /\.test\./.test(f) },
  { id: "native-dialog", why: "Use <Modal>/<ConfirmDelete>, or an undo toast for reversible actions. No window.confirm/alert/prompt.", re: /(?<![\w.$])(?:window\.)?(?:confirm|alert)\(|window\.prompt\(/g, exts: [".tsx", ".ts"], skip: (f) => /\.test\./.test(f) },
];
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const counts = {};
for (const f of roots.flatMap(walk)) { const rel = relative(root, f); const ext = extname(f);
  for (const r of RULES) { if (!r.exts.includes(ext) || r.skip(rel)) continue; const text = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, ""); const n = (text.match(r.re) ?? []).length; if (n) (counts[rel] ??= {})[r.id] = n; } }

if (process.argv.includes("--update")) { writeFileSync(baselinePath, JSON.stringify(counts, null, 1) + "\n"); console.log(`Baseline written for ${Object.keys(counts).length} files.`); process.exit(0); }
const base = existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, "utf8")) : {}; let bad = 0;
for (const [file, byRule] of Object.entries(counts)) for (const [id, n] of Object.entries(byRule)) { const allowed = base[file]?.[id] ?? 0; if (n > allowed) { bad++; console.error(`${file}: ${id} ${n} (allowed ${allowed}) - ${RULES.find((r) => r.id === id).why}`); } }
const total = Object.values(counts).flatMap((o) => Object.values(o)).reduce((a, b) => a + b, 0);
if (bad) { console.error(`\n${bad} style regression(s). Fix them; do not raise the baseline.`); process.exit(1); }
console.log(`Style lint OK (${total} legacy violations remain in the baseline).`);
