// Audit, secrets, privacy, backup and upgrade logic (pure).
export type JChange = { path: string; kind: "add" | "remove" | "change"; from?: unknown; to?: unknown };
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export function diffJson(a: unknown, b: unknown, path = ""): JChange[] {
  if (isObj(a) && isObj(b)) { const out: JChange[] = []; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const p = path ? `${path}.${k}` : k; if (!(k in a)) out.push({ path: p, kind: "add", to: b[k] }); else if (!(k in b)) out.push({ path: p, kind: "remove", from: a[k] }); else out.push(...diffJson(a[k], b[k], p)); } return out.sort((x, y) => x.path.localeCompare(y.path)); }
  if (Array.isArray(a) && Array.isArray(b)) { if (JSON.stringify(a) === JSON.stringify(b)) return []; return [{ path, kind: "change", from: a, to: b }]; }
  return a === b ? [] : [{ path, kind: "change", from: a, to: b }];
}
const SENSITIVE = /(password|secret|token|key|ssn|card)/i;
export const redactJson = (v: unknown): unknown => (isObj(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, SENSITIVE.test(k) && typeof x === "string" ? "••••••" : redactJson(x)])) : Array.isArray(v) ? v.map(redactJson) : v);

export const rotationState = (ageDays: number, maxDays: number) => (ageDays >= maxDays ? "overdue" : ageDays >= maxDays * 0.8 ? "due soon" : "ok") as "ok" | "due soon" | "overdue";
export type EnvVars = Record<string, Record<string, string>>;
/** For every key across environments: which envs lack it, and do the values differ? */
export function envGaps(envs: EnvVars) { const names = Object.keys(envs); const keys = [...new Set(names.flatMap((n) => Object.keys(envs[n])))].sort(); return keys.map((k) => ({ key: k, missing: names.filter((n) => !(k in envs[n])), differs: new Set(names.filter((n) => k in envs[n]).map((n) => envs[n][k])).size > 1 })); }
export const looksSecret = (key: string) => SENSITIVE.test(key);

export type Dsar = { id: string; kind: "access" | "erasure" | "portability"; subject: string; received: string; status: "new" | "verifying" | "in progress" | "done" | "rejected" };
export const dsarDue = (received: string, days = 30) => { const d = new Date(received); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
export const dsarDaysLeft = (received: string, today: string, days = 30) => Math.round((Date.parse(dsarDue(received, days)) - Date.parse(today)) / 864e5);
export const DSAR_NEXT: Record<Dsar["status"], Dsar["status"][]> = { new: ["verifying", "rejected"], verifying: ["in progress", "rejected"], "in progress": ["done"], done: [], rejected: [] };
export const canErase = (holds: string[], subject: string) => (holds.includes(subject) ? { ok: false, why: "Subject is under a legal hold" } : { ok: true });

export type Point = { id: string; at: string; kind: "full" | "incremental"; size: number; schema: number; base?: string };
/** An incremental restore needs its base full backup; returns the chain in restore order. */
export function restoreChain(points: Point[], id: string): Point[] | null { const p = points.find((x) => x.id === id); if (!p) return null; if (p.kind === "full") return [p]; const base = points.find((x) => x.id === p.base); return base ? [base, p] : null; }
export function restoreWarnings(points: Point[], id: string, now: string, currentSchema: number) {
  const p = points.find((x) => x.id === id); if (!p) return ["Unknown restore point"]; const w: string[] = []; const lossH = Math.round((Date.parse(now) - Date.parse(p.at)) / 36e5);
  if (lossH > 0) w.push(`Data written in the last ${lossH} h will be lost`); if (p.schema !== currentSchema) w.push(`Schema v${p.schema} differs from current v${currentSchema}: a migration will run after restore`); if (!restoreChain(points, id)) w.push("The base backup for this incremental is missing");
  return w;
}
export const totalSize = (chain: Point[]) => chain.reduce((a, p) => a + p.size, 0);

export type Check = { id: string; label: string; ok: boolean; severity: "block" | "warn"; detail: string };
export function upgradeChecks(cur: string, target: string, env: { freeGb: number; lastBackupHours: number; pluginsIncompatible: string[]; openIncidents: number }): Check[] {
  const [cm] = cur.split(".").map(Number), [tm] = target.split(".").map(Number); const major = tm > cm;
  return [
    { id: "ver", label: "Valid upgrade path", ok: target > cur, severity: "block", detail: target > cur ? `${cur} → ${target}` : "Target must be newer than the current version" },
    { id: "disk", label: "At least 20 GB free", ok: env.freeGb >= 20, severity: "block", detail: `${env.freeGb} GB free` },
    { id: "backup", label: major ? "Backup from the last 24 h (required for major upgrades)" : "Recent backup", ok: env.lastBackupHours <= 24, severity: major ? "block" : "warn", detail: `Last backup ${env.lastBackupHours} h ago` },
    { id: "plugins", label: "All plugins compatible", ok: env.pluginsIncompatible.length === 0, severity: "block", detail: env.pluginsIncompatible.length ? `Incompatible: ${env.pluginsIncompatible.join(", ")}` : "All compatible" },
    { id: "inc", label: "No open incidents", ok: env.openIncidents === 0, severity: "warn", detail: `${env.openIncidents} open` },
  ];
}
export type UpPhase = "idle" | "downloading" | "migrating" | "verifying" | "done" | "rolled-back" | "failed";
export const UP_FLOW: UpPhase[] = ["downloading", "migrating", "verifying", "done"];
export const upNext = (p: UpPhase, failAt?: UpPhase): UpPhase => (p === "idle" ? "downloading" : p === failAt ? "failed" : UP_FLOW[UP_FLOW.indexOf(p) + 1] ?? p);
export const upRollback = (p: UpPhase): UpPhase => (p === "failed" || p === "migrating" || p === "verifying" ? "rolled-back" : p);
export const upProgress = (p: UpPhase) => (p === "idle" ? 0 : p === "done" ? 100 : p === "rolled-back" || p === "failed" ? 0 : Math.round(((UP_FLOW.indexOf(p) + 0.5) / UP_FLOW.length) * 100));
