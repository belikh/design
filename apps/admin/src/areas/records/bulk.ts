// Bulk edit + onboarding logic (pure).
export type Item = { id: string; name: string; status: "active" | "paused" | "archived"; owner: string; tags: string[]; price: number };
export type Op = { field: "status" | "owner" | "tags" | "price"; mode: "set" | "clear" | "append" | "remove" | "add" | "multiply"; value: string };
export const MODES: Record<Op["field"], { mode: Op["mode"]; label: string }[]> = {
  status: [{ mode: "set", label: "Set to" }], owner: [{ mode: "set", label: "Set to" }, { mode: "clear", label: "Clear" }],
  tags: [{ mode: "append", label: "Add tag" }, { mode: "remove", label: "Remove tag" }, { mode: "clear", label: "Clear all" }], price: [{ mode: "set", label: "Set to" }, { mode: "add", label: "Add amount" }, { mode: "multiply", label: "Multiply by" }],
};
export function applyOne(it: Item, op: Op): Item {
  switch (op.field) {
    case "status": return op.mode === "set" ? { ...it, status: op.value as Item["status"] } : it;
    case "owner": return { ...it, owner: op.mode === "clear" ? "" : op.value };
    case "tags": return op.mode === "clear" ? { ...it, tags: [] } : op.mode === "append" ? { ...it, tags: it.tags.includes(op.value) ? it.tags : [...it.tags, op.value] } : { ...it, tags: it.tags.filter((t) => t !== op.value) };
    case "price": { const n = Number(op.value); if (!Number.isFinite(n)) return it; return { ...it, price: Math.max(0, Math.round((op.mode === "set" ? n : op.mode === "add" ? it.price + n : it.price * n) * 100) / 100) }; }
  }
}
export const applyBulk = (rows: Item[], ids: Set<string>, ops: Op[]) => rows.map((r) => (ids.has(r.id) ? ops.reduce(applyOne, r) : r));
export const opError = (op: Op): string | null => (op.mode === "clear" ? null : !op.value.trim() ? "Enter a value" : op.field === "price" && !Number.isFinite(Number(op.value)) ? "Not a number" : op.field === "status" && !["active", "paused", "archived"].includes(op.value) ? "Unknown status" : null);
/** For each field, is the selection uniform ("same") or "mixed"? */
export function mixed(rows: Item[], ids: Set<string>) {
  const sel = rows.filter((r) => ids.has(r.id)); const same = <T,>(f: (r: Item) => T) => new Set(sel.map((r) => JSON.stringify(f(r)))).size <= 1;
  return { status: !same((r) => r.status), owner: !same((r) => r.owner), tags: !same((r) => r.tags), price: !same((r) => r.price) };
}
export const changedCount = (before: Item[], after: Item[]) => before.filter((b, i) => JSON.stringify(b) !== JSON.stringify(after[i])).length;

export type Step = { id: string; title: string; why: string; action: string; needs?: string[]; optional?: boolean };
export type OnbState = Record<string, "todo" | "done" | "skipped">;
export const blockedBy = (s: Step, st: OnbState, steps: Step[]) => (s.needs ?? []).filter((n) => st[n] !== "done").map((n) => steps.find((x) => x.id === n)!.title);
export function progress(steps: Step[], st: OnbState) { const req = steps.filter((s) => !s.optional); const done = steps.filter((s) => st[s.id] === "done").length; const doneReq = req.filter((s) => st[s.id] === "done" || st[s.id] === "skipped").length; return { done, total: steps.length, pct: Math.round((done / steps.length) * 100), complete: doneReq === req.length }; }
export const nextStep = (steps: Step[], st: OnbState) => steps.find((s) => st[s.id] !== "done" && st[s.id] !== "skipped" && blockedBy(s, st, steps).length === 0);
