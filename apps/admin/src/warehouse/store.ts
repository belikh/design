import { useEffect, useSyncExternalStore } from "react";
import { accept, ackDiscrepancy, addLine, advance, arrive, autoCall, blockDock, callTo, checkIn as eCheckIn, claimDock, clear, configDock, depart, finishWork, markLine, noShow, randomArrival, reject, removeLine, requeue, seed, setChecks, setSeal, setUrgent, setWeights, simNow, startWork, type Checks, type Dock, type LineState, type State, type Weights } from "./engine.ts";

// One shared store per browser, synced across tabs: any tab can mutate, all tabs see it. One tab (the Web Locks "leader") drives the simulation clock.
// The key and channel carry a version so state saved by an older shape is never loaded or broadcast into this one.
const VERSION = 2, KEY = `jp-wh-state-v${VERSION}`, CH = `jp-wh-v${VERSION}`;
const valid = (s: unknown): s is State => { const x = s as State; return !!x && Array.isArray(x.tickets) && Array.isArray(x.docks) && x.docks.every((d) => Array.isArray(d.dirs) && Array.isArray(d.classes)) && x.tickets.every((t) => Array.isArray(t.jobs)) && typeof x.simStaff === "boolean"; };
// A saved day is only resumed while it is still "today" (a few real hours); after that the demo reseeds so the clock and waits make sense.
const STALE_MS = 6 * 3_600_000;
const load = (): State => { try { const raw = localStorage.getItem(KEY); if (raw) { const s = JSON.parse(raw) as State; if (valid(s) && Date.now() - s.baseReal < STALE_MS) return s; } } catch { /* ignore */ } return seed(); };
let state: State = load();
const subs = new Set<() => void>();
const chan = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CH) : null;
const emit = () => subs.forEach((f) => f());
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ } };
const publish = (next: State) => { if (next === state) return; state = next; persist(); chan?.postMessage({ rev: state.rev, state }); emit(); };
chan && (chan.onmessage = (e: MessageEvent<{ rev: number; state: State }>) => { if (valid(e.data?.state) && e.data.rev >= state.rev) { state = e.data.state; emit(); } });

export const getState = () => state;
export const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const useWh = () => useSyncExternalStore(subscribe, getState);

const autoOn = (s: State) => (s.auto ? autoCall(s) : s);
/** Run a transition on a ticket and mark its dock as "claimed", so the simulated people leave that dock to the human who just used it. */
const work = (id: string, f: (s: State) => State) => { const t = state.tickets.find((x) => x.id === id); publish(autoOn(claimDock(f(state), t?.dock))); };

export const actions = {
  checkIn: (f: Parameters<typeof eCheckIn>[1]) => { const r = eCheckIn(state, f); if (r.ticket) publish(autoOn(r.state)); return r; },
  call: (id: string, dock: number) => publish(callTo(state, id, dock)),
  urgent: (id: string, on: boolean) => publish(autoOn(setUrgent(state, id, on))),
  noShow: (id: string) => publish(autoOn(noShow(state, id))),
  requeue: (id: string) => publish(autoOn(requeue(state, id))),
  arrive: (id: string) => work(id, (s) => arrive(s, id)),
  checks: (id: string, c: Partial<Checks>) => work(id, (s) => setChecks(s, id, c)),
  accept: (id: string) => work(id, (s) => accept(s, id)),
  reject: (id: string, reason: string) => work(id, (s) => reject(s, id, reason)),
  start: (id: string) => work(id, (s) => startWork(s, id)),
  mark: (id: string, line: string, st: LineState | undefined) => work(id, (s) => markLine(s, id, line, st)),
  addLine: (id: string, st: LineState = "ok") => work(id, (s) => addLine(s, id, st)),
  removeLine: (id: string, line: string) => work(id, (s) => removeLine(s, id, line)),
  finish: (id: string) => work(id, (s) => finishWork(s, id)),
  ack: (id: string) => work(id, (s) => ackDiscrepancy(s, id)),
  seal: (id: string, no: string) => work(id, (s) => setSeal(s, id, no)),
  clear: (id: string) => work(id, (s) => clear(s, id)),
  depart: (id: string) => work(id, (s) => depart(s, id)),
  block: (id: number, block: boolean, reason?: string) => publish(autoOn(blockDock(state, id, block, reason))),
  configDock: (id: number, p: Parameters<typeof configDock>[2]) => publish(autoOn(configDock(state, id, p))),
  addDock: () => { const id = Math.max(0, ...state.docks.map((d) => d.id)) + 1; const tpl: Dock = { id, name: `Dock ${id}`, dirs: ["in"], caps: ["ambient"], classes: ["rigid", "semi"], maxHeight: 4.5, maxCube: 90, equipment: ["leveller"], status: "open" }; publish({ ...state, rev: state.rev + 1, docks: [...state.docks, tpl] }); return id; },
  weights: (w: Partial<Weights>) => publish(setWeights(state, w)),
  setAuto: (auto: boolean) => publish(autoOn({ ...state, auto, rev: state.rev + 1 })),
  setAutoArrivals: (autoArrivals: boolean) => publish({ ...state, autoArrivals, rev: state.rev + 1 }),
  setSimStaff: (simStaff: boolean) => publish({ ...state, simStaff, rev: state.rev + 1 }),
  setSimFork: (simFork: boolean) => publish({ ...state, simFork, rev: state.rev + 1 }),
  setSpeed: (speed: number) => publish({ ...state, baseSim: simNow(state), baseReal: Date.now(), speed, rev: state.rev + 1 }),
  callBest: () => publish(autoCall(state)),
  reset: () => publish({ ...seed(), rev: state.rev + 1 }),
};

/** Simulation driver. Mount it on any warehouse page: only the leader tab actually advances the world. */
export function useWhSim() {
  useEffect(() => {
    let stop = false, timer = 0; let lastArrival = simNow(state); let release: () => void = () => {};
    const loop = () => {
      if (stop) return; const now = simNow(state); let next = advance(state, now);
      if (next.autoArrivals && now - lastArrival >= 9) { next = randomArrival(next, now); lastArrival = now; }
      publish(next);
    };
    const run = () => { timer = window.setInterval(loop, 1000); };
    const locks = (navigator as Navigator & { locks?: { request: (n: string, cb: () => Promise<void>) => Promise<void> } }).locks;
    if (locks) {
      const held = new Promise<void>((res) => { release = res; });
      void locks.request("jp-wh-leader", () => { if (!stop) run(); return held; });
    } else run();
    return () => { stop = true; release(); clearInterval(timer); };
  }, []);
  return useWh();
}
