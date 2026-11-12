import { startTransition, useCallback, useEffect, useMemo, useOptimistic, useRef, useState } from "react";

/**
 * The one mock data layer. There is no real backend: every page talks to a `Collection` like this one,
 * so swapping in a real API later means replacing this file, not the pages.
 * Calls are async, take a little time, and can be made to fail (for demos and tests).
 */
export type MockOptions = { latency?: number; jitter?: number; failWhen?: (op: "list" | "update" | "create" | "remove", id?: string) => string | null };
export type Collection<T extends { id: string }> = {
  list(): Promise<T[]>; get(id: string): Promise<T | undefined>;
  /** Resolves to the saved row, or rejects with the failure message. */
  update(id: string, patch: Partial<T>, opts?: { baseRev?: number }): Promise<T>; create(row: Omit<T, "id"> & { id?: string }): Promise<T>; remove(id: string): Promise<void>;
  /** Subscribe to changes (used by hooks). Returns an unsubscribe function. */
  subscribe(fn: () => void): () => void; snapshot(): T[]; opts: MockOptions;
  /** Simulate someone else changing a row (bumps its `rev`), so conflict handling can be demonstrated and tested. */
  externalUpdate(id: string, patch: Partial<T>): void;
};
/** Thrown by `update` when the row changed since you read it (rows that carry a numeric `rev` get optimistic concurrency). `theirs` is the current server row. */
export class ConflictError<T> extends Error { theirs: T; constructor(theirs: T) { super("This row was changed by someone else."); this.name = "ConflictError"; this.theirs = theirs; } }

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export function createCollection<T extends { id: string }>(seed: T[] | (() => T[]), opts: MockOptions = {}): Collection<T> {
  let rows = typeof seed === "function" ? seed() : [...seed]; const subs = new Set<() => void>(); let n = rows.length;
  const o: MockOptions = { latency: 120, jitter: 40, ...opts }; const emit = () => subs.forEach((f) => f());
  const gate = async (op: Parameters<NonNullable<MockOptions["failWhen"]>>[0], id?: string) => { await sleep((o.latency ?? 0) + Math.random() * (o.jitter ?? 0)); const why = o.failWhen?.(op, id); if (why) throw new Error(why); };
  return {
    opts: o, snapshot: () => rows, subscribe: (fn) => { subs.add(fn); return () => { subs.delete(fn); }; },
    async list() { await gate("list"); return rows; },
    async get(id) { await gate("list", id); return rows.find((r) => r.id === id); },
    async update(id, patch, uo) { await gate("update", id); const cur = rows.find((r) => r.id === id); if (!cur) throw new Error("Not found"); const rev = (cur as { rev?: number }).rev;
      if (uo?.baseRev !== undefined && rev !== undefined && uo.baseRev !== rev) throw new ConflictError(cur);
      const next = { ...cur, ...patch, ...(rev !== undefined ? { rev: rev + 1 } : {}) }; rows = rows.map((r) => (r.id === id ? next : r)); emit(); return next; },
    externalUpdate(id, patch) { rows = rows.map((r) => { if (r.id !== id) return r; const rev = (r as { rev?: number }).rev; return { ...r, ...patch, ...(rev !== undefined ? { rev: rev + 1 } : {}) }; }); emit(); },
    async create(row) { await gate("create"); const made = { ...row, id: row.id ?? `N-${++n}` } as T; rows = [...rows, made]; emit(); return made; },
    async remove(id) { await gate("remove", id); rows = rows.filter((r) => r.id !== id); emit(); },
  };
}

const useOnline = () => { const [on, setOn] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine)); useEffect(() => { const u = () => setOn(true), d = () => setOn(false); window.addEventListener("online", u); window.addEventListener("offline", d); return () => { window.removeEventListener("online", u); window.removeEventListener("offline", d); }; }, []); return on; };
type Queued = { id: string; key: string; v: unknown };
export type Conflict<T> = { id: string; key: string; mine: unknown; theirs: T };

/**
 * Live rows from a collection, with the behaviours every page should share:
 * - optimistic: a save shows immediately (React `useOptimistic`) and reverts by itself if it fails
 * - `save` matches DataTable's `onCommit` (returns null, or an error string)
 * - offline: saves queue (and show) with a "pending" count, and flush when the connection returns
 * - conflicts: rows with a `rev` that changed under you set `conflict`; call `resolveConflict("mine" | "theirs")`
 * - stale: `stale` turns true after `staleAfter` ms without a refresh; `refresh()` reloads in the background
 */
export function useCollection<T extends { id: string }>(c: Collection<T>, o: { staleAfter?: number } = {}) {
  const [base, setBase] = useState<T[]>(() => c.snapshot()); const [state, setState] = useState<"loading" | "ready" | "error">("loading"); const [error, setError] = useState(""); const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [queue, setQueue] = useState<Queued[]>([]); const [conflict, setConflict] = useState<Conflict<T> | null>(null); const [, setNow] = useState(() => Date.now()); const online = useOnline();
  const alive = useRef(true); useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const load = useCallback((background = false) => { if (!background) setState("loading"); return c.list().then((r) => { if (alive.current) { setBase(r); setState("ready"); setUpdatedAt(Date.now()); } }, (e: Error) => { if (alive.current && !background) { setError(e.message); setState("error"); } }); }, [c]);
  useEffect(() => { void load(); return c.subscribe(() => { if (alive.current) { setBase(c.snapshot()); setUpdatedAt(Date.now()); } }); }, [c, load]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(t); }, []);
  const withQueue = useMemo(() => (queue.length ? base.map((r) => { const mine = queue.filter((q) => q.id === r.id); return mine.length ? ({ ...r, ...Object.fromEntries(mine.map((q) => [q.key, q.v])) } as T) : r; }) : base), [base, queue]);
  const [rows, addOptimistic] = useOptimistic(withQueue, (cur: T[], p: { id: string; patch: Partial<T> }) => cur.map((r) => (r.id === p.id ? { ...r, ...p.patch } : r)));
  const attempt = useCallback(async (r: T, key: string, v: unknown, rev?: number): Promise<string | null> => {
    try { await c.update(r.id, { [key]: v } as Partial<T>, rev !== undefined ? { baseRev: rev } : undefined); return null; }
    catch (e) { if (e instanceof ConflictError) { setConflict({ id: r.id, key, mine: v, theirs: e.theirs as T }); return "Someone else changed this row. Choose which version to keep."; } return e instanceof Error ? e.message : "Couldn’t save"; }
  }, [c]);
  const save = useCallback((r: T, key: string, v: unknown, meta?: { undo: boolean }): Promise<string | null> => {
    if (meta?.undo) r = c.snapshot().find((x) => x.id === r.id) ?? r; // undo/redo apply on top of the latest row
    if (!online) { setQueue((q) => [...q, { id: r.id, key, v }]); return Promise.resolve(null); }
    return new Promise((resolve) => { startTransition(async () => { addOptimistic({ id: r.id, patch: { [key]: v } as Partial<T> }); resolve(await attempt(r, key, v, (r as { rev?: number }).rev)); }); });
  }, [online, addOptimistic, attempt, c]);
  const flushing = useRef(false);
  useEffect(() => { if (!online || !queue.length || flushing.current) return; flushing.current = true; const batch = queue; (async () => { for (const q of batch) { const r = c.snapshot().find((x) => x.id === q.id); if (r) await attempt(r, q.key, q.v, (r as { rev?: number }).rev); } if (alive.current) setQueue((cur) => cur.filter((x) => !batch.includes(x))); flushing.current = false; })(); }, [online, queue, attempt, c]);
  const resolveConflict = useCallback(async (keep: "mine" | "theirs") => { const cf = conflict; if (!cf) return; setConflict(null); if (keep === "mine") await c.update(cf.id, { [cf.key]: cf.mine } as Partial<T>, { baseRev: (cf.theirs as { rev?: number }).rev }); else await load(true); }, [conflict, c, load]);
  const stale = updatedAt !== null && Date.now() - updatedAt > (o.staleAfter ?? 60000);
  return { rows, state, error, reload: () => load(), refresh: () => load(true), save, collection: c, updatedAt, stale, online, pending: queue.length, conflict, resolveConflict };
}
