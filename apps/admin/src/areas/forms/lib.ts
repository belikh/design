/** Pure logic and sample data for the forms area (embeds, playlists, licence, forms, surveys, approvals, moderation). */

/* ---------- Form builder ---------- */
export type FieldType = "text" | "textarea" | "number" | "select" | "checkbox" | "date";
export type CondOp = "eq" | "neq" | "gt" | "filled";
export type Cond = { field: string; op: CondOp; value: string };
export type BField = { id: string; type: FieldType; label: string; required: boolean; options: string[]; min?: number; max?: number; cond: Cond | null };
export type FormValues = Record<string, string | boolean>;
export const FIELD_TYPES: { type: FieldType; label: string }[] = [
  { type: "text", label: "Short text" }, { type: "textarea", label: "Long text" }, { type: "number", label: "Number" },
  { type: "select", label: "Dropdown" }, { type: "checkbox", label: "Checkbox" }, { type: "date", label: "Date" },
];
export const COND_OPS: { value: CondOp; label: string }[] = [{ value: "eq", label: "is" }, { value: "neq", label: "is not" }, { value: "gt", label: "is greater than" }, { value: "filled", label: "is filled in" }];
let seq = 0;
export const newField = (type: FieldType): BField => ({ id: `f${Date.now().toString(36)}${++seq}`, type, label: FIELD_TYPES.find((t) => t.type === type)!.label, required: false, options: type === "select" ? ["Option 1", "Option 2"] : [], cond: null });
export const SEED_FIELDS: BField[] = [
  { id: "name", type: "text", label: "Your name", required: true, options: [], cond: null },
  { id: "kind", type: "select", label: "Request type", required: true, options: ["Access", "Hardware", "Other"], cond: null },
  { id: "hw", type: "text", label: "Which device?", required: true, options: [], cond: { field: "kind", op: "eq", value: "Hardware" } },
  { id: "qty", type: "number", label: "Quantity", required: false, options: [], min: 1, max: 20, cond: { field: "kind", op: "eq", value: "Hardware" } },
  { id: "why", type: "textarea", label: "Why do you need it?", required: false, options: [], cond: { field: "qty", op: "gt", value: "5" } },
];
const filled = (v: string | boolean | undefined) => v !== undefined && v !== "" && v !== false;
export function isVisible(f: BField, values: FormValues, all: BField[]): boolean {
  if (!f.cond) return true;
  const src = all.find((x) => x.id === f.cond!.field);
  if (!src || !isVisible(src, values, all)) return false; // hidden sources hide their dependants
  const v = values[f.cond.field]; const c = f.cond;
  if (c.op === "filled") return filled(v);
  if (c.op === "eq") return String(v ?? "") === c.value;
  if (c.op === "neq") return String(v ?? "") !== c.value;
  return Number(v) > Number(c.value);
}
/** A condition may only look at fields above it, so the logic can never loop. Returns a message when invalid. */
export function condError(fields: BField[], idx: number): string | null {
  const c = fields[idx]?.cond; if (!c) return null;
  const at = fields.findIndex((x) => x.id === c.field);
  if (at < 0) return "The field this depends on was removed";
  if (at >= idx) return "A condition can only depend on a field above it";
  if (c.op !== "filled" && c.value === "") return "Enter a value to compare with";
  return null;
}
export function validateForm(fields: BField[], values: FormValues): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) {
    if (!isVisible(f, values, fields)) continue; const v = values[f.id];
    if (f.required && !filled(v)) { out[f.id] = `${f.label} is required`; continue; }
    if (f.type === "number" && filled(v)) { const n = Number(v); if (!Number.isFinite(n)) out[f.id] = "Enter a number"; else if (f.min !== undefined && n < f.min) out[f.id] = `Must be at least ${f.min}`; else if (f.max !== undefined && n > f.max) out[f.id] = `Must be at most ${f.max}`; }
  }
  return out;
}
export function move<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const next = [...arr]; const [x] = next.splice(from, 1); next.splice(to, 0, x); return next;
}

/* ---------- Approval flow ---------- */
export type Step = { id: string; name: string; approver: string; mode: "any" | "all"; when: "always" | "amount_gt" | "amount_lte"; amount: number; slaHours: number };
export const APPROVERS = ["Team lead", "Finance", "Legal", "Security", "Director", "CFO"];
export const newStep = (n: number): Step => ({ id: `s${Date.now().toString(36)}${n}`, name: `Step ${n}`, approver: "Team lead", mode: "any", when: "always", amount: 1000, slaHours: 24 });
export const SEED_STEPS: Step[] = [
  { id: "s1", name: "Manager review", approver: "Team lead", mode: "any", when: "always", amount: 0, slaHours: 24 },
  { id: "s2", name: "Budget check", approver: "Finance", mode: "any", when: "amount_gt", amount: 1000, slaHours: 48 },
  { id: "s3", name: "Contract review", approver: "Legal", mode: "all", when: "amount_gt", amount: 10000, slaHours: 72 },
  { id: "s4", name: "Executive sign-off", approver: "CFO", mode: "any", when: "amount_gt", amount: 25000, slaHours: 24 },
];
export const appliesTo = (s: Step, amount: number) => s.when === "always" || (s.when === "amount_gt" ? amount > s.amount : amount <= s.amount);
export function route(steps: Step[], amount: number) { const path = steps.filter((s) => appliesTo(s, amount)); return { path, hours: path.reduce((a, s) => a + s.slaHours, 0), skipped: steps.filter((s) => !appliesTo(s, amount)) }; }
export function validateFlow(steps: Step[]): string[] {
  const out: string[] = []; if (!steps.length) out.push("Add at least one step");
  steps.forEach((s, i) => { if (!s.name.trim()) out.push(`Step ${i + 1} needs a name`); if (s.slaHours < 1) out.push(`${s.name || `Step ${i + 1}`}: SLA must be at least 1 hour`); });
  const gaps = [0, 500, 5000, 50000, 5e6].filter((a) => route(steps, a).path.length === 0);
  if (steps.length && gaps.length) out.push(`Requests of ${gaps.map((g) => "$" + g.toLocaleString("en-AU")).join(", ")} would need no approval at all`);
  return out;
}

/* ---------- Survey ---------- */
export type Question = { id: string; kind: "nps" | "choice" | "multi" | "rating" | "text"; title: string; options?: string[] };
export type Response = { id: string; segment: "Customer" | "Partner" | "Staff"; at: string; answers: Record<string, number | string | string[]> };
export const QUESTIONS: Question[] = [
  { id: "nps", kind: "nps", title: "How likely are you to recommend us? (0-10)" },
  { id: "plan", kind: "choice", title: "Which plan are you on?", options: ["Starter", "Team", "Business", "Enterprise"] },
  { id: "feat", kind: "multi", title: "Which features do you use?", options: ["Dashboards", "Alerts", "Reports", "API", "Mobile app"] },
  { id: "ease", kind: "rating", title: "How easy was onboarding? (1-5)" },
  { id: "say", kind: "text", title: "Anything we should change?" },
];
const COMMENTS = ["Alerts are noisy by default.", "Love the dashboards, wish exports were faster.", "Onboarding took a week longer than planned.", "The mobile app is great.", "Please add SSO for the Team plan.", "Support answered within the hour, thank you.", "Pricing is hard to predict.", "Reports need scheduled delivery."];
export function makeResponses(n = 120): Response[] {
  let s = 7; const r = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const segs: Response["segment"][] = ["Customer", "Partner", "Staff"]; const q = (id: string) => QUESTIONS.find((x) => x.id === id)!.options!;
  return Array.from({ length: n }, (_, i) => {
    const segment = segs[Math.floor(r() * r() * 3)]; const bias = segment === "Staff" ? 1.5 : segment === "Partner" ? 0 : 0.5; const a: Response["answers"] = {};
    if (r() > 0.04) a.nps = Math.max(0, Math.min(10, Math.round(7.8 + bias + (r() - 0.5) * 7)));
    if (r() > 0.05) a.plan = q("plan")[Math.floor(r() * 4)];
    if (r() > 0.1) a.feat = q("feat").filter(() => r() > 0.55);
    if (r() > 0.08) a.ease = Math.max(1, Math.min(5, Math.round(3.4 + bias / 2 + (r() - 0.5) * 3)));
    if (r() > 0.6) a.say = COMMENTS[Math.floor(r() * COMMENTS.length)];
    return { id: `R${i + 1}`, segment, at: `2026-11-${String(1 + (i % 11)).padStart(2, "0")}`, answers: a };
  });
}
export function nps(rs: Response[]) { const v = rs.map((x) => x.answers.nps).filter((x): x is number => typeof x === "number"); if (!v.length) return { score: 0, n: 0, promoters: 0, passives: 0, detractors: 0 }; const p = v.filter((x) => x >= 9).length, d = v.filter((x) => x <= 6).length; return { score: Math.round(((p - d) / v.length) * 100), n: v.length, promoters: p, passives: v.length - p - d, detractors: d }; }
export function tally(rs: Response[], id: string, options: string[]): number[] { return options.map((o) => rs.filter((r) => { const a = r.answers[id]; return Array.isArray(a) ? a.includes(o) : a === o; }).length); }
export function ratingDist(rs: Response[], id: string, from: number, to: number): number[] { return Array.from({ length: to - from + 1 }, (_, i) => rs.filter((r) => r.answers[id] === from + i).length); }
export const avg = (rs: Response[], id: string) => { const v = rs.map((r) => r.answers[id]).filter((x): x is number => typeof x === "number"); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; };
export const completion = (rs: Response[]) => (rs.length ? Math.round((rs.filter((r) => QUESTIONS.filter((q) => q.kind !== "text").every((q) => r.answers[q.id] !== undefined)).length / rs.length) * 100) : 0);

/* ---------- Playlist ---------- */
export type Dash = { id: string; title: string; widgets: string[] };
export const DASHES: Dash[] = [
  { id: "ops", title: "Operations overview", widgets: ["uptime", "throughput", "capacity"] },
  { id: "sales", title: "Sales by region", widgets: ["orders", "mix"] },
  { id: "net", title: "Network health", widgets: ["throughput", "capacity", "uptime"] },
  { id: "support", title: "Support queue", widgets: ["orders", "uptime"] },
];
export const nextIndex = (i: number, len: number, dir: 1 | -1 = 1) => (len ? (i + dir + len) % len : 0);

/* ---------- Licence ---------- */
export const daysUntil = (iso: string, now = new Date("2026-11-12")) => Math.ceil((new Date(iso).getTime() - now.getTime()) / 864e5);
/** Format XXXX-XXXX-XXXX-XXXX, base-36 chars; the last group's first char is a checksum of the rest. */
export function licenceCheck(key: string): string | null {
  const k = key.trim().toUpperCase(); if (!/^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/.test(k)) return "Use the format XXXX-XXXX-XXXX-XXXX";
  const body = k.replace(/-/g, ""); const sum = [...body.slice(0, 12)].reduce((a, c) => a + parseInt(c, 36), 0) % 36;
  return body[12] === sum.toString(36).toUpperCase() ? null : "That key is not valid (checksum mismatch)";
}
export const sampleKey = () => { const b = "JPTR7K2M9QXA"; const sum = ([...b].reduce((a, c) => a + parseInt(c, 36), 0) % 36).toString(36).toUpperCase(); return `${b.slice(0, 4)}-${b.slice(4, 8)}-${b.slice(8, 12)}-${sum}ABC`; };

/* ---------- Moderation ---------- */
export type Item = { id: string; kind: "Comment" | "Listing" | "Photo"; author: string; body: string; flags: { reason: string; by: string }[]; priority: "high" | "normal"; status: "pending" | "approved" | "rejected"; reason: string; decidedBy: string; priorRejects: number; at: string; rev: number };
export const REJECT_REASONS = ["Spam or advertising", "Harassment or hate", "Misleading information", "Personal information", "Off topic", "Other (explain below)"];
export const SEED_ITEMS: Item[] = [
  { id: "M-201", kind: "Comment", author: "kris_77", body: "Buy followers cheap at example-boost dot biz, DM me!!", flags: [{ reason: "Spam", by: "ava" }, { reason: "Spam", by: "sam" }, { reason: "Link", by: "bot" }], priority: "high", status: "pending", reason: "", decidedBy: "", priorRejects: 4, at: "09:12", rev: 1 },
  { id: "M-202", kind: "Listing", author: "harbour_books", body: "Vintage atlas set, 1962 edition, 12 volumes, good condition. Pickup only, Brisbane.", flags: [{ reason: "Possibly counterfeit", by: "lee" }], priority: "normal", status: "pending", reason: "", decidedBy: "", priorRejects: 0, at: "09:40", rev: 1 },
  { id: "M-203", kind: "Comment", author: "j.okafor", body: "This is the worst take I have read all week and you should be ashamed.", flags: [{ reason: "Harassment", by: "mia" }, { reason: "Rude", by: "tom" }], priority: "high", status: "pending", reason: "", decidedBy: "", priorRejects: 1, at: "10:05", rev: 1 },
  { id: "M-204", kind: "Photo", author: "pat_w", body: "Photo caption: Sunset over the river, call me on 0400 000 000 for prints.", flags: [{ reason: "Phone number", by: "bot" }], priority: "normal", status: "pending", reason: "", decidedBy: "", priorRejects: 0, at: "10:31", rev: 1 },
  { id: "M-205", kind: "Comment", author: "nina", body: "Thanks for the detailed write-up, the migration steps worked for me.", flags: [{ reason: "Auto-flag: contains link", by: "bot" }], priority: "normal", status: "pending", reason: "", decidedBy: "", priorRejects: 0, at: "11:02", rev: 1 },
];
