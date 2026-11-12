// Pure logic behind the "System" pages: permissions, undo history, soft delete, notification routing, quiet hours, merging, downsampling.
// No React, no DOM: unit-tested in engine.test.ts.

/* ---------- roles and permissions (E015, F009, F011) ---------- */
export type Role = "admin" | "editor" | "viewer";
export type Perm = "orders.read" | "orders.edit" | "orders.delete" | "billing.view" | "billing.edit" | "settings.edit" | "members.manage" | "data.export" | "audit.view" | "env.switch";
export const PERMS: { id: Perm; label: string; upsell?: string }[] = [
  { id: "orders.read", label: "View orders" }, { id: "orders.edit", label: "Edit orders" }, { id: "orders.delete", label: "Delete orders" },
  { id: "billing.view", label: "View billing" }, { id: "billing.edit", label: "Change plan or payment method", upsell: "Billing changes need the Team plan" }, { id: "settings.edit", label: "Change workspace settings" },
  { id: "members.manage", label: "Invite and remove members" }, { id: "data.export", label: "Export data" }, { id: "audit.view", label: "Read the audit trail" }, { id: "env.switch", label: "Switch environment" },
];
export const ROLE_MATRIX: Record<Role, Perm[]> = {
  admin: PERMS.map((p) => p.id),
  editor: ["orders.read", "orders.edit", "billing.view", "data.export", "audit.view"],
  viewer: ["orders.read", "billing.view"],
};
export const can = (role: Role, perm: Perm) => ROLE_MATRIX[role].includes(perm);

/* ---------- undo / redo history (F007) ---------- */
export type History<T> = { past: T[]; present: T; future: T[] };
export const history = <T,>(present: T): History<T> => ({ past: [], present, future: [] });
export const commit = <T,>(h: History<T>, next: T, limit = 100): History<T> => (Object.is(h.present, next) ? h : { past: [...h.past, h.present].slice(-limit), present: next, future: [] });
export const undo = <T,>(h: History<T>): History<T> => (h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h);
export const redo = <T,>(h: History<T>): History<T> => (h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h);

/* ---------- three-way merge for flat records (F007 conflicts) ---------- */
export type Rec = Record<string, string | number | boolean>;
export type MergeResult = { merged: Rec; conflicts: { key: string; base?: Rec[string]; mine?: Rec[string]; theirs?: Rec[string] }[]; autoMerged: string[] };
/** base = what both started from; mine = my edit; theirs = what is on the server now. */
export function merge3(base: Rec, mine: Rec, theirs: Rec): MergeResult {
  const keys = [...new Set([...Object.keys(base), ...Object.keys(mine), ...Object.keys(theirs)])]; const merged: Rec = {}; const conflicts: MergeResult["conflicts"] = []; const autoMerged: string[] = [];
  for (const k of keys) {
    const b = base[k], m = mine[k], t = theirs[k];
    if (m === t) { if (m !== undefined) merged[k] = m; }
    else if (m === b) { if (t !== undefined) merged[k] = t; autoMerged.push(k); }      // only they changed it
    else if (t === b) { if (m !== undefined) merged[k] = m; autoMerged.push(k); }      // only I changed it
    else { conflicts.push({ key: k, base: b, mine: m, theirs: t }); if (m !== undefined) merged[k] = m; } // both changed it differently
  }
  return { merged, conflicts, autoMerged };
}

/* ---------- soft delete, retention and cooldown (E029) ---------- */
export type SoftItem = { id: string; name: string; deletedAt?: number };
export const softDelete = <T extends SoftItem>(items: T[], id: string, now: number): T[] => items.map((i) => (i.id === id && i.deletedAt === undefined ? { ...i, deletedAt: now } : i));
export const restore = <T extends SoftItem>(items: T[], id: string): T[] => items.map((i) => (i.id === id ? { ...i, deletedAt: undefined } : i));
export const purgeExpired = <T extends SoftItem>(items: T[], now: number, retentionMs: number): T[] => items.filter((i) => i.deletedAt === undefined || now - i.deletedAt < retentionMs);
export const daysLeft = (i: SoftItem, now: number, retentionMs: number) => (i.deletedAt === undefined ? Infinity : Math.max(0, Math.ceil((retentionMs - (now - i.deletedAt)) / 86_400_000)));
/** Milliseconds until a destructive action may run again (0 = ready). */
export const cooldownLeft = (lastAt: number | null, cooldownMs: number, now: number) => (lastAt === null ? 0 : Math.max(0, cooldownMs - (now - lastAt)));

/* ---------- notifications: grouping and snooze (E022) ---------- */
export type NotifType = "system" | "mention" | "approval" | "progress" | "security" | "digest";
export type Notif = { id: string; type: NotifType; title: string; body: string; at: number; source: string; read?: boolean; snoozedUntil?: number; progress?: number; resolved?: "approved" | "denied" };
export const NOTIF_META: Record<NotifType, { label: string; icon: string; tone: "info" | "ok" | "warn" | "danger" }> = {
  system: { label: "System", icon: "settings", tone: "info" }, mention: { label: "Mentions", icon: "chat", tone: "info" }, approval: { label: "Approvals", icon: "check", tone: "warn" },
  progress: { label: "Jobs", icon: "loader", tone: "info" }, security: { label: "Security", icon: "shield", tone: "danger" }, digest: { label: "Digests", icon: "mail", tone: "ok" },
};
export type SnoozePreset = "1h" | "3h" | "tonight" | "tomorrow" | "monday";
export function snoozeUntil(preset: SnoozePreset, now: number): number {
  const d = new Date(now);
  if (preset === "1h") return now + 3_600_000; if (preset === "3h") return now + 3 * 3_600_000;
  const at = (days: number, h: number) => { const x = new Date(d); x.setDate(d.getDate() + days); x.setHours(h, 0, 0, 0); return x.getTime(); };
  if (preset === "tonight") return d.getHours() >= 18 ? at(1, 18) : at(0, 18);
  if (preset === "tomorrow") return at(1, 9);
  const toMon = ((8 - d.getDay()) % 7) || 7; return at(toMon, 9);
}
export const visible = (items: Notif[], now: number) => items.filter((n) => n.snoozedUntil === undefined || n.snoozedUntil <= now);
export const snoozed = (items: Notif[], now: number) => items.filter((n) => n.snoozedUntil !== undefined && n.snoozedUntil > now);
export const day = (t: number, now: number) => { const a = new Date(now); a.setHours(0, 0, 0, 0); const b = new Date(t); b.setHours(0, 0, 0, 0); const diff = Math.round((a.getTime() - b.getTime()) / 86_400_000); return diff === 0 ? "Today" : diff === 1 ? "Yesterday" : b.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "short" }); };
export function group(items: Notif[], by: "type" | "day" | "source", now: number): { key: string; label: string; items: Notif[] }[] {
  const keyOf = (n: Notif) => (by === "type" ? n.type : by === "source" ? n.source : day(n.at, now)); const map = new Map<string, Notif[]>();
  for (const n of [...items].sort((a, b) => b.at - a.at)) { const k = keyOf(n); map.set(k, [...(map.get(k) ?? []), n]); }
  return [...map.entries()].map(([key, v]) => ({ key, label: by === "type" ? NOTIF_META[key as NotifType].label : key, items: v }));
}

/* ---------- delivery channels, quiet hours, digests (F019) ---------- */
export type Channel = "inapp" | "email" | "push" | "digest";
export type DeliveryConfig = { channels: Record<NotifType, Channel[]>; quiet: { on: boolean; from: string; to: string; days: number[]; urgentBypass: boolean }; digestHour: number };
export const DEFAULT_DELIVERY: DeliveryConfig = {
  channels: { system: ["inapp"], mention: ["inapp", "push"], approval: ["inapp", "email", "push"], progress: ["inapp"], security: ["inapp", "email", "push"], digest: ["email"] },
  quiet: { on: true, from: "22:00", to: "07:00", days: [0, 1, 2, 3, 4, 5, 6], urgentBypass: true }, digestHour: 8,
};
const mins = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
export function isQuiet(cfg: DeliveryConfig["quiet"], when: Date): boolean {
  if (!cfg.on || !cfg.days.includes(when.getDay())) return false; const t = when.getHours() * 60 + when.getMinutes(), a = mins(cfg.from), b = mins(cfg.to);
  return a === b ? false : a < b ? t >= a && t < b : t >= a || t < b; // overnight window wraps midnight
}
export type Routed = { deliver: Channel[]; deferred: Channel[]; reason: string };
/** Where does an event go right now? Quiet hours defer interruptive channels to the digest; security events may bypass. */
export function routeEvent(type: NotifType, cfg: DeliveryConfig, when: Date): Routed {
  const wanted = cfg.channels[type]; const quiet = isQuiet(cfg.quiet, when); const bypass = cfg.quiet.urgentBypass && type === "security";
  if (!quiet || bypass) return { deliver: wanted, deferred: [], reason: quiet ? "Quiet hours, but security events bypass them" : "Delivered now" };
  const interruptive = wanted.filter((c) => c === "push" || c === "email"); const calm = wanted.filter((c) => c === "inapp" || c === "digest");
  return { deliver: calm, deferred: interruptive.length ? ["digest"] : [], reason: interruptive.length ? `Quiet hours: ${interruptive.join(" and ")} held for the ${String(cfg.digestHour).padStart(2, "0")}:00 digest` : "Quiet hours: in-app only" };
}

/* ---------- selection statistics (E020) ---------- */
export function summarise(values: number[]) {
  if (!values.length) return { count: 0, sum: 0, avg: 0, min: 0, max: 0 };
  const sum = values.reduce((a, b) => a + b, 0); return { count: values.length, sum, avg: sum / values.length, min: Math.min(...values), max: Math.max(...values) };
}

/* ---------- Largest-Triangle-Three-Buckets downsampling (F013) ---------- */
export function lttb(y: ArrayLike<number>, threshold: number): number[] {
  const n = y.length; if (threshold >= n || threshold < 3) return Array.from({ length: n }, (_, i) => i);
  const out = [0]; const every = (n - 2) / (threshold - 2); let a = 0;
  for (let i = 0; i < threshold - 2; i++) {
    const s = Math.floor((i + 1) * every) + 1, e = Math.min(Math.floor((i + 2) * every) + 1, n); let ax = 0, ay = 0; for (let j = s; j < e; j++) { ax += j; ay += y[j]; } ax /= e - s; ay /= e - s;
    const rs = Math.floor(i * every) + 1, re = Math.floor((i + 1) * every) + 1; let best = -1, pick = rs;
    for (let j = rs; j < re; j++) { const area = Math.abs((a - ax) * (y[j] - y[a]) - (a - j) * (ay - y[a])) * 0.5; if (area > best) { best = area; pick = j; } }
    out.push(pick); a = pick;
  }
  out.push(n - 1); return out;
}

/* ---------- performance budgets (F013) ---------- */
export type Budget = { id: string; label: string; limitMs: number };
export type Measure = Budget & { ms: number; pass: boolean };
export const measure = (b: Budget, ms: number): Measure => ({ ...b, ms, pass: ms <= b.limitMs });
export const time = <T,>(fn: () => T): { value: T; ms: number } => { const t0 = performance.now(); const value = fn(); return { value, ms: performance.now() - t0 }; };

/* ---------- touch target audit (F018) ---------- */
export const MIN_TARGET = 44;
export type TargetReport = { label: string; w: number; h: number; ok: boolean };
export const checkTarget = (label: string, w: number, h: number, min = MIN_TARGET): TargetReport => ({ label, w: Math.round(w), h: Math.round(h), ok: w >= min && h >= min });
/** Swipe classification from pointer deltas: horizontal swipes past `threshold` px that are more horizontal than vertical. */
export function swipeDir(dx: number, dy: number, threshold = 60): "left" | "right" | null { return Math.abs(dx) >= threshold && Math.abs(dx) > Math.abs(dy) * 1.5 ? (dx < 0 ? "left" : "right") : null; }

/* ---------- tiling layout tree (E013, E019) ---------- */
export type Tile = { kind: "pane"; id: string; widget: string } | { kind: "split"; id: string; dir: "h" | "v"; ratio: number; a: Tile; b: Tile };
let uid = 0; export const nid = (p = "t") => `${p}${++uid}`;
export const splitTile = (t: Tile, id: string, dir: "h" | "v", widget: string): Tile => (t.kind === "pane" ? (t.id === id ? { kind: "split", id: nid("s"), dir, ratio: 0.5, a: t, b: { kind: "pane", id: nid("p"), widget } } : t) : { ...t, a: splitTile(t.a, id, dir, widget), b: splitTile(t.b, id, dir, widget) });
export const closeTile = (t: Tile, id: string): Tile => { if (t.kind === "pane") return t; if (t.a.kind === "pane" && t.a.id === id) return t.b; if (t.b.kind === "pane" && t.b.id === id) return t.a; return { ...t, a: closeTile(t.a, id), b: closeTile(t.b, id) }; };
export const setRatio = (t: Tile, id: string, ratio: number): Tile => (t.kind === "pane" ? t : t.id === id ? { ...t, ratio: Math.min(0.85, Math.max(0.15, ratio)) } : { ...t, a: setRatio(t.a, id, ratio), b: setRatio(t.b, id, ratio) });
export const setWidget = (t: Tile, id: string, widget: string): Tile => (t.kind === "pane" ? (t.id === id ? { ...t, widget } : t) : { ...t, a: setWidget(t.a, id, widget), b: setWidget(t.b, id, widget) });
export const countPanes = (t: Tile): number => (t.kind === "pane" ? 1 : countPanes(t.a) + countPanes(t.b));

/* ---------- document tabs (E019) ---------- */
export type DocTab = { id: string; title: string; pinned?: boolean; dirty?: boolean };
/** Pinned tabs always sit first (stable); everything else keeps its order. */
export const settle = (tabs: DocTab[]): DocTab[] => [...tabs.filter((t) => t.pinned), ...tabs.filter((t) => !t.pinned)];
export function moveTab(tabs: DocTab[], id: string, toIndex: number): DocTab[] {
  const from = tabs.findIndex((t) => t.id === id); if (from < 0) return tabs; const t = tabs[from]; const rest = tabs.filter((x) => x.id !== id); const pinnedCount = rest.filter((x) => x.pinned).length;
  const i = Math.max(t.pinned ? 0 : pinnedCount, Math.min(t.pinned ? pinnedCount : rest.length, toIndex)); rest.splice(i, 0, t); return rest;
}
export const pinTab = (tabs: DocTab[], id: string): DocTab[] => settle(tabs.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t)));
export function closeTab(tabs: DocTab[], id: string, active: string): { tabs: DocTab[]; active: string; closed?: DocTab } {
  const i = tabs.findIndex((t) => t.id === id); const t = tabs[i]; if (!t || t.pinned) return { tabs, active };
  const rest = tabs.filter((x) => x.id !== id); return { tabs: rest, active: active === id ? (rest[Math.min(i, rest.length - 1)]?.id ?? "") : active, closed: t };
}
