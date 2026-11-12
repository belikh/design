import { DEFAULT_TOKENS, checkContrast, ROLE_ORDER, ROLE_LABELS, type Tokens } from "@belikh/jupiter-tokens";
import { GRAPHICS, TIERS, type Graphic, type Tier } from "@belikh/jupiter-graphics";

export type TokenVersion = { version: string; date: string; notes: string; tokens: Tokens };
const clone = (t: Tokens): Tokens => JSON.parse(JSON.stringify(t)) as Tokens;
const v0 = clone(DEFAULT_TOKENS); v0.version = "0.9.0"; v0.radius = { sm: 2, md: 4 }; v0.color.light.accent = "#5b4fd6"; v0.motion = { ...v0.motion, base: 240 };
const v1 = clone(DEFAULT_TOKENS); v1.version = "0.9.1"; v1.radius = { sm: 2, md: 4 }; v1.color.light.accent = "#4b3fbf";
/** Versions, oldest first. The last is the real current token set from @belikh/jupiter-tokens; earlier ones are illustrative. */
export const VERSIONS: TokenVersion[] = [{ version: "0.9.0", date: "2026-09-02", notes: "First public tokens (illustrative).", tokens: v0 }, { version: "0.9.1", date: "2026-10-04", notes: "Accent darkened for AA contrast (illustrative).", tokens: v1 }, { version: DEFAULT_TOKENS.version, date: "2026-11-12", notes: "Current: radius md 6px, motion base 200ms.", tokens: DEFAULT_TOKENS }];
export const tokenJson = (t: Tokens) => JSON.stringify({ version: t.version, radius: t.radius, motion: t.motion, accent: t.color.light.accent, accentDark: t.color.dark.accent, space: t.space }, null, 2);
export type Consumer = { project: string; surface: string; version: string; owner: string };
export const CONSUMERS: Consumer[] = [
  { project: "jupiter.au", surface: "CSS", version: DEFAULT_TOKENS.version, owner: "ava" }, { project: "job-search (resumes)", surface: "LaTeX", version: "0.9.1", owner: "ava" }, { project: "hasstui", surface: "Go theme", version: "0.9.1", owner: "noah" }, { project: "ha-linux-agent", surface: "Rust theme", version: DEFAULT_TOKENS.version, owner: "mia" },
  { project: "admin template", surface: "CSS + React", version: DEFAULT_TOKENS.version, owner: "ava" }, { project: "esphome devices", surface: "YAML", version: "0.9.0", owner: "noah" }, { project: "warehouse kiosk", surface: "CSS", version: DEFAULT_TOKENS.version, owner: "liam" },
];
export const behind = (c: Consumer) => c.version !== DEFAULT_TOKENS.version;
export const consumersByVersion = (cs: Consumer[]) => { const m = new Map<string, Consumer[]>(); cs.forEach((c) => m.set(c.version, [...(m.get(c.version) ?? []), c])); return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0], undefined, { numeric: true })); };
export function contrastReport(scheme: "light" | "dark") { const rows = checkContrast(DEFAULT_TOKENS.color[scheme]); return { rows: rows.map((r) => ({ ...r, label: `${ROLE_LABELS[r.fg]} on ${ROLE_LABELS[r.bg]}` })), pass: rows.filter((r) => r.pass).length, total: rows.length }; }
export const filterGraphics = (q: string, tier: Tier | "all") => GRAPHICS.filter((g) => (tier === "all" || g.tier === tier) && (!q.trim() || `${g.name} ${g.tags.join(" ")}`.toLowerCase().includes(q.trim().toLowerCase())));
export const tierCounts = () => (Object.keys(TIERS) as Tier[]).map((t) => ({ tier: t, count: GRAPHICS.filter((g) => g.tier === t).length }));
export const roles = ROLE_ORDER;
export type { Graphic, Tier };
