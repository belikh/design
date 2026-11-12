/** Filter chips: "Qty > 10", "Task contains pick". Pure logic, so it can be tested and reused by server-side tables. */
export type ChipOp = "contains" | "not-contains" | "equals" | "not-equals" | "starts" | "empty" | "not-empty" | "gt" | "gte" | "lt" | "lte";
export type Chip = { id: string; key: string; op: ChipOp; value: string };
export const OP_LABEL: Record<ChipOp, string> = { contains: "contains", "not-contains": "doesn’t contain", equals: "is", "not-equals": "is not", starts: "starts with", empty: "is empty", "not-empty": "is not empty", gt: ">", gte: "≥", lt: "<", lte: "≤" };
export const opsFor = (numeric: boolean): ChipOp[] => (numeric ? ["equals", "not-equals", "gt", "gte", "lt", "lte", "empty", "not-empty"] : ["contains", "not-contains", "equals", "not-equals", "starts", "empty", "not-empty"]);
export const needsValue = (op: ChipOp) => op !== "empty" && op !== "not-empty";
export const chipLabel = (header: string, c: Chip) => `${header} ${OP_LABEL[c.op]}${needsValue(c.op) ? ` ${c.value}` : ""}`;

export function chipMatches(raw: unknown, c: Chip): boolean {
  const s = raw === null || raw === undefined ? "" : Array.isArray(raw) ? raw.join(", ") : String(raw); const lo = s.toLowerCase(), v = c.value.toLowerCase();
  switch (c.op) {
    case "contains": return lo.includes(v); case "not-contains": return !lo.includes(v); case "equals": return lo === v; case "not-equals": return lo !== v; case "starts": return lo.startsWith(v);
    case "empty": return s === ""; case "not-empty": return s !== "";
    default: { const n = Number(raw), t = Number(c.value); if (!Number.isFinite(n) || !Number.isFinite(t)) return false; return c.op === "gt" ? n > t : c.op === "gte" ? n >= t : c.op === "lt" ? n < t : n <= t; }
  }
}
export const applyChips = <T,>(rows: T[], chips: Chip[], get: (r: T, key: string) => unknown): T[] => (chips.length ? rows.filter((r) => chips.every((c) => chipMatches(get(r, c.key), c))) : rows);

/** Saved table views, kept per browser. */
export type SavedView = { name: string; q: string; facet: string | null; sort: { key: string; dir: 1 | -1 }[]; colFilter: Record<string, string>; chips: Chip[]; hidden: string[]; group: string[] };
const vk = (key: string) => `jp-views:${key}`;
export const loadViews = (key: string): SavedView[] => { try { const v = JSON.parse(localStorage.getItem(vk(key)) ?? "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
export const saveViews = (key: string, views: SavedView[]) => { try { localStorage.setItem(vk(key), JSON.stringify(views)); } catch { /* storage unavailable */ } };
