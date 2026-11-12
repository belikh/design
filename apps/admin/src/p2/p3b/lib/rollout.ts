export type RingStatus = "pending" | "running" | "paused" | "done" | "halted";
export type Ring = { id: string; name: string; devices: number; updated: number; failed: number; status: RingStatus; threshold: number; reason?: string; failedIds: string[] };
export type Rollout = { version: string; rings: Ring[]; seq: number; auto: boolean; badBuild: boolean };
const BASE_FAIL = [1, 3, 4, 2];
export const initRollout = (version = "4.2.1"): Rollout => ({
  version, seq: 1, auto: true, badBuild: false,
  rings: [{ id: "canary", name: "Canary", devices: 12 }, { id: "early", name: "Early adopters", devices: 60 }, { id: "broad", name: "Broad", devices: 240 }, { id: "all", name: "Everyone else", devices: 188 }].map((r, i) => ({ ...r, updated: 0, failed: 0, status: "pending" as RingStatus, threshold: [10, 8, 5, 5][i], failedIds: [] })),
});
const hash = (n: number) => { let x = Math.imul(n + 1, 0x9e3779b1) >>> 0; x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0; x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0; x ^= x >>> 16; return (x >>> 0) % 100; };
export const attempted = (r: Ring) => r.updated + r.failed;
export const failureRate = (r: Ring) => (attempted(r) ? (r.failed / attempted(r)) * 100 : 0);
export const total = (s: Rollout) => s.rings.reduce((a, r) => a + r.devices, 0);
export const progress = (s: Rollout) => (s.rings.reduce((a, r) => a + r.updated, 0) / total(s)) * 100;
export const isDone = (s: Rollout) => s.rings.every((r) => r.status === "done");
export const activeRing = (s: Rollout) => s.rings.find((r) => r.status === "running");
/** Advance every running ring by one batch. A ring over its failure threshold (after 10 attempts) halts itself. */
export function tick(s: Rollout): Rollout {
  let seq = s.seq; let rings: Ring[] = s.rings.map((r, ri) => {
    if (r.status !== "running") return r;
    const batch = Math.max(1, Math.ceil(r.devices * 0.1)); let { updated, failed } = r; const failedIds = [...r.failedIds];
    for (let i = 0; i < batch && updated + failed < r.devices; i++) { const idx = updated + failed; const bad = hash(seq++ + ri * 7) < (s.badBuild ? 18 : BASE_FAIL[ri] ?? 2); if (bad) { failed++; failedIds.push(`${r.id}-${String(idx + 1).padStart(3, "0")}`); } else updated++; }
    const next: Ring = { ...r, updated, failed, failedIds };
    if (attempted(next) >= 10 && failureRate(next) > next.threshold) return { ...next, status: "halted", reason: `Failure rate ${failureRate(next).toFixed(1)}% is over the ${next.threshold}% limit` };
    if (attempted(next) >= next.devices) return { ...next, status: "done" };
    return next;
  });
  if (s.auto && !rings.some((r) => r.status === "running" || r.status === "paused" || r.status === "halted")) { const i = rings.findIndex((r) => r.status === "pending"); if (i >= 0) rings = rings.map((r, k) => (k === i ? { ...r, status: "running" as const } : r)); }
  return { ...s, rings, seq };
}
export const startNext = (s: Rollout): Rollout => { const i = s.rings.findIndex((r) => r.status === "pending"); if (i < 0 || s.rings.some((r) => r.status === "halted" || r.status === "running")) return s; return { ...s, rings: s.rings.map((r, k) => (k === i ? { ...r, status: "running" as const } : r)) }; };
export const setRing = (s: Rollout, id: string, p: Partial<Ring>): Rollout => ({ ...s, rings: s.rings.map((r) => (r.id === id ? { ...r, ...p } : r)) });
export const rollback = (s: Rollout, id: string): Rollout => setRing(s, id, { updated: 0, failed: 0, failedIds: [], status: "pending", reason: undefined });
/** Retry the failed devices of a ring: they succeed unless the build is bad. */
export const retryFailed = (s: Rollout, id: string): Rollout => setRing(s, id, (() => { const r = s.rings.find((x) => x.id === id)!; return s.badBuild ? {} : { updated: r.updated + r.failed, failed: 0, failedIds: [], reason: undefined, status: r.status === "halted" ? "paused" : r.status }; })());
export const haltAll = (s: Rollout): Rollout => ({ ...s, rings: s.rings.map((r) => (r.status === "running" ? { ...r, status: "paused" as const } : r)) });
