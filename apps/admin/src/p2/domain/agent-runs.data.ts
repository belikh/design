import { mean, sum } from "./lib.ts";

export type Model = "model-s" | "model-m" | "model-l";
/** Example prices in USD per million tokens. Illustrative only, not any provider's real pricing. */
export const PRICES: Record<Model, { in: number; out: number; cached: number }> = { "model-s": { in: 0.25, out: 1.25, cached: 0.03 }, "model-m": { in: 3, out: 15, cached: 0.3 }, "model-l": { in: 15, out: 75, cached: 1.5 } };
export type Call = { name: string; ms: number; ok: boolean; inTok: number; outTok: number; note?: string };
export type Session = { id: string; title: string; model: Model; at: string; calls: Call[]; cachedTok: number; outcome: "success" | "failed" | "cancelled" };
const C = (name: string, ms: number, inTok: number, outTok: number, ok = true, note?: string): Call => ({ name, ms, ok, inTok, outTok, note });
export const SESSIONS: Session[] = [
  { id: "s1", title: "Add Rust theme output", model: "model-m", at: "2026-11-12 14:02", cachedTok: 52000, outcome: "success", calls: [C("Read", 120, 6200, 150), C("Grep", 90, 1800, 90), C("Edit", 210, 9400, 1800), C("Bash cargo test", 14200, 7600, 400), C("Edit", 190, 8800, 600), C("Bash cargo clippy", 6100, 5200, 220)] },
  { id: "s2", title: "Fix gauge arc flag", model: "model-s", at: "2026-11-12 11:40", cachedTok: 8000, outcome: "success", calls: [C("Read", 80, 2200, 120), C("Edit", 140, 3100, 300), C("Bash vitest", 5400, 2600, 160)] },
  { id: "s3", title: "Port theme to Slint", model: "model-l", at: "2026-11-11 16:30", cachedTok: 140000, outcome: "failed", calls: [C("Read", 110, 7000, 160), C("Bash slint-compiler", 3100, 6400, 380, false, "syntax error line 14"), C("Edit", 230, 11800, 2200), C("Bash slint-compiler", 2900, 9800, 300, false, "unknown property"), C("Edit", 200, 12100, 1900)] },
  { id: "s4", title: "Write LaTeX invoice class", model: "model-m", at: "2026-11-10 09:12", cachedTok: 31000, outcome: "success", calls: [C("Write", 260, 8000, 3600), C("Bash xelatex", 9300, 6200, 700, false, "tabularx scan error"), C("Edit", 180, 9200, 800), C("Bash xelatex", 8800, 5400, 260)] },
  { id: "s5", title: "Explore ESPHome styling", model: "model-s", at: "2026-11-09 18:50", cachedTok: 0, outcome: "cancelled", calls: [C("WebSearch", 4100, 1200, 700), C("WebSearch", 3900, 1500, 800)] },
];
export const tokensIn = (s: Session) => sum(s.calls.map((c) => c.inTok)); export const tokensOut = (s: Session) => sum(s.calls.map((c) => c.outTok));
/** Cost: input tokens at the input rate, cache-read tokens at the (cheaper) cached rate, output at the output rate. */
export function cost(s: Session): number { const p = PRICES[s.model]; return (tokensIn(s) * p.in + s.cachedTok * p.cached + tokensOut(s) * p.out) / 1e6; }
export const callCost = (s: Session, c: Call) => (c.inTok * PRICES[s.model].in + c.outTok * PRICES[s.model].out) / 1e6;
export const durationMs = (s: Session) => sum(s.calls.map((c) => c.ms)); export const errorRate = (s: Session) => (s.calls.length ? s.calls.filter((c) => !c.ok).length / s.calls.length : 0);
export const byTool = (s: Session) => { const m = new Map<string, { n: number; ms: number; fail: number }>(); s.calls.forEach((c) => { const k = c.name.split(" ")[0]; const e = m.get(k) ?? { n: 0, ms: 0, fail: 0 }; e.n++; e.ms += c.ms; if (!c.ok) e.fail++; m.set(k, e); }); return [...m.entries()].map(([name, v]) => ({ name, ...v })); };
export type EvalCase = { id: string; name: string; results: boolean[] };
export const EVAL_RUNS = ["v1", "v2", "v3", "v4", "v5"];
export const EVALS: EvalCase[] = [
  { id: "e1", name: "Generates valid Slint syntax", results: [false, false, true, true, true] }, { id: "e2", name: "Escapes LaTeX specials", results: [true, true, true, true, true] }, { id: "e3", name: "Respects token names", results: [true, false, true, true, false] },
  { id: "e4", name: "Cites sources for claims", results: [false, true, true, false, false] }, { id: "e5", name: "Refuses unsafe shell commands", results: [true, true, true, true, true] }, { id: "e6", name: "Keeps edits surgical", results: [false, false, false, true, true] },
];
export const passRate = (cases: EvalCase[], run: number) => (cases.length ? cases.filter((c) => c.results[run]).length / cases.length : 0);
export const regressions = (cases: EvalCase[], run: number) => cases.filter((c) => run > 0 && c.results[run - 1] && !c.results[run]);
export const fixes = (cases: EvalCase[], run: number) => cases.filter((c) => run > 0 && !c.results[run - 1] && c.results[run]);
export type PromptVersion = { v: number; text: string; note: string };
export type Prompt = { id: string; name: string; versions: PromptVersion[] };
export const PROMPTS: Prompt[] = [{ id: "p1", name: "Code review", versions: [{ v: 1, text: "Review the following diff for bugs.\n\n{{diff}}", note: "first draft" }, { v: 2, text: "Review the following {{language}} diff for correctness bugs.\nReport only issues you are confident about.\n\n{{diff}}", note: "added language + confidence" }] },
  { id: "p2", name: "Release notes", versions: [{ v: 1, text: "Write release notes for version {{version}} from these commits:\n{{commits}}", note: "initial" }] }];
export const extractVars = (text: string) => [...new Set([...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]))];
export function renderPrompt(text: string, vars: Record<string, string>): { out: string; missing: string[] } { const missing = extractVars(text).filter((v) => !vars[v]?.trim()); return { out: text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => vars[k]?.trim() || `{{${k}}}`), missing }; }
export const avgCost = (ss: Session[]) => mean(ss.map(cost));
