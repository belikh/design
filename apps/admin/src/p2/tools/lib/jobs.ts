export type JobState = "waiting" | "active" | "completed" | "failed" | "delayed";
export type Job = { id: number; queue: string; name: string; state: JobState; attempts: number; maxAttempts: number; progress: number; createdAt: number; error?: string; delayUntil?: number; durationTicks: number };
export type QueueCfg = { id: string; concurrency: number; paused: boolean; failRate: number; speed: number };
export type JobsState = { tick: number; seq: number; seed: number; jobs: Job[]; queues: QueueCfg[]; history: { tick: number; completed: number; failed: number }[] };
const NAMES: Record<string, string[]> = { default: ["recalculate totals", "sync customers", "send digest"], mail: ["send invoice", "send reset link", "send receipt"], media: ["generate thumbnails", "transcode clip", "extract metadata"], "ha-sync": ["pull entity states", "push automation", "refresh energy"] };
const ERRORS = ["ETIMEDOUT: upstream did not respond", "Error: 503 Service Unavailable", "ECONNRESET: connection reset by peer", "ValidationError: payload missing 'customer_id'"];
const rnd = (s: number) => { const x = Math.sin(s * 12.9898) * 43758.5453; return x - Math.floor(x); };
export function initJobs(): JobsState {
  const queues: QueueCfg[] = [{ id: "default", concurrency: 3, paused: false, failRate: 0.08, speed: 8 }, { id: "mail", concurrency: 2, paused: false, failRate: 0.05, speed: 14 }, { id: "media", concurrency: 2, paused: false, failRate: 0.15, speed: 4 }, { id: "ha-sync", concurrency: 1, paused: false, failRate: 0.1, speed: 10 }];
  let s: JobsState = { tick: 0, seq: 0, seed: 7, jobs: [], queues, history: [] };
  for (let i = 0; i < 24; i++) s = enqueue(s, queues[i % 4].id); for (let i = 0; i < 12; i++) s = step(s); return s;
}
export function enqueue(s: JobsState, queue: string, name?: string): JobsState {
  const seq = s.seq + 1; const names = NAMES[queue] ?? ["job"]; const dur = 3 + Math.floor(rnd(s.seed + seq) * 9);
  return { ...s, seq, jobs: [...s.jobs, { id: seq, queue, name: name ?? names[Math.floor(rnd(s.seed + seq * 3) * names.length)], state: "waiting", attempts: 0, maxAttempts: 3, progress: 0, createdAt: s.tick, durationTicks: dur }] };
}
/** One simulation tick: start waiting jobs up to each queue's concurrency, advance active ones, finish or fail them, and release delayed retries. */
export function step(s: JobsState): JobsState {
  const tick = s.tick + 1; let seed = s.seed + 1; let completed = 0, failed = 0; const q = new Map(s.queues.map((x) => [x.id, x])); const active = new Map<string, number>();
  s.jobs.forEach((j) => j.state === "active" && active.set(j.queue, (active.get(j.queue) ?? 0) + 1));
  const jobs = s.jobs.map((j): Job => {
    const cfg = q.get(j.queue)!;
    if (j.state === "delayed" && (j.delayUntil ?? 0) <= tick) return { ...j, state: "waiting", delayUntil: undefined };
    if (j.state === "waiting" && !cfg.paused && (active.get(j.queue) ?? 0) < cfg.concurrency) { active.set(j.queue, (active.get(j.queue) ?? 0) + 1); return { ...j, state: "active", attempts: j.attempts + 1, progress: 0 }; }
    if (j.state === "active") {
      const prog = Math.min(100, j.progress + Math.round(100 / j.durationTicks) * (cfg.speed > 8 ? 1.5 : 1));
      if (prog >= 100) { if (rnd(seed + j.id * 7 + j.attempts) < cfg.failRate * (j.attempts > 1 ? 0.5 : 1)) { failed++; const err = ERRORS[Math.floor(rnd(seed + j.id) * ERRORS.length)]; return j.attempts < j.maxAttempts ? { ...j, state: "delayed", progress: 0, error: err, delayUntil: tick + 2 ** j.attempts + 1 } : { ...j, state: "failed", progress: 100, error: err }; } completed++; return { ...j, state: "completed", progress: 100, error: undefined }; }
      return { ...j, progress: prog };
    }
    return j;
  });
  return { ...s, tick, seed, jobs, history: [...s.history, { tick, completed, failed }].slice(-60) };
}
export const retryJob = (s: JobsState, id: number): JobsState => ({ ...s, jobs: s.jobs.map((j) => (j.id === id && (j.state === "failed" || j.state === "delayed") ? { ...j, state: "waiting", attempts: 0, error: undefined, delayUntil: undefined } : j)) });
export const removeJob = (s: JobsState, id: number): JobsState => ({ ...s, jobs: s.jobs.filter((j) => j.id !== id) });
export const promoteJob = (s: JobsState, id: number): JobsState => ({ ...s, jobs: s.jobs.map((j) => (j.id === id && j.state === "delayed" ? { ...j, state: "waiting", delayUntil: undefined } : j)) });
export const pauseQueue = (s: JobsState, id: string, paused: boolean): JobsState => ({ ...s, queues: s.queues.map((q) => (q.id === id ? { ...q, paused } : q)) });
export const counts = (s: JobsState, queue?: string) => { const c: Record<JobState, number> = { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }; s.jobs.forEach((j) => (!queue || j.queue === queue) && c[j.state]++); return c; };
