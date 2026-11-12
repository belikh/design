/* Simulated collaborators: deterministic cursors, locks with expiry, and comment threads. */
export type Person = { id: string; name: string; hue: number; status: "active" | "idle" | "away"; doing: string };
export const PEOPLE: Person[] = [
  { id: "ben", name: "Ben Ortiz", hue: 1, status: "active", doing: "Editing Pricing" }, { id: "cleo", name: "Cleo Park", hue: 2, status: "active", doing: "Reading Overview" },
  { id: "dev", name: "Dev Patel", hue: 3, status: "idle", doing: "Idle for 4 min" }, { id: "esi", name: "Esi Mensah", hue: 4, status: "away", doing: "Away" },
];
/** Cursor position in percent of the surface at time t (ms), a smooth scripted Lissajous path per person. */
export function cursorAt(personIndex: number, t: number): { x: number; y: number } {
  const k = personIndex + 1; const s = t / 1000;
  return { x: 50 + 38 * Math.sin(s * (0.35 + 0.11 * k) + k), y: 50 + 36 * Math.cos(s * (0.27 + 0.07 * k) + k * 1.7) };
}
export type Lock = { by: string; since: number; expires: number } | null;
export const LOCK_MS = 60000;
export type LockStatus = { kind: "free" } | { kind: "mine"; secondsLeft: number } | { kind: "other"; by: string; secondsLeft: number };
export function lockStatus(lock: Lock, now: number, me: string): LockStatus {
  if (!lock || lock.expires <= now) return { kind: "free" };
  const secondsLeft = Math.ceil((lock.expires - now) / 1000); return lock.by === me ? { kind: "mine", secondsLeft } : { kind: "other", by: lock.by, secondsLeft };
}
/** Try to take a lock. Taking over someone else's live lock needs `force`. */
export function acquire(lock: Lock, now: number, me: string, force = false): { lock: Lock; ok: boolean; reason?: string } {
  const st = lockStatus(lock, now, me);
  if (st.kind === "other" && !force) return { lock, ok: false, reason: `Locked by ${st.by}` };
  return { lock: { by: me, since: now, expires: now + LOCK_MS }, ok: true };
}
export const release = (lock: Lock, me: string): Lock => (lock && lock.by === me ? null : lock);
export const renew = (lock: Lock, now: number, me: string): Lock => (lock && lock.by === me ? { ...lock, expires: now + LOCK_MS } : lock);

export type Comment = { id: number; target: string; author: string; text: string; at: string; resolved: boolean; parent?: number };
export function threads(cs: Comment[], target?: string, show: "open" | "resolved" | "all" = "all") {
  return cs.filter((c) => !c.parent && (!target || c.target === target) && (show === "all" || (show === "resolved") === c.resolved)).map((c) => ({ root: c, replies: cs.filter((r) => r.parent === c.id) }));
}
export const openCount = (cs: Comment[], target: string) => cs.filter((c) => !c.parent && c.target === target && !c.resolved).length;
export const initials = (name: string) => name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
