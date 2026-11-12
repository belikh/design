// Dock scheduling engine for warehouse inbound AND outbound: pure functions, no React, fully testable.
// Time is "simulated minutes since midnight" (a float). At the default 1x speed one sim minute is one real minute.
//
// One visit (a Ticket) holds one or two Jobs (deliver and/or collect). Each job runs the same cycle:
//   waiting -> called -> onDock -> accepted -> working -> complete -> (next job | cleared -> departed)
// Every transition is owned by exactly one screen: dock board (call), portal (accept/reject/clear), forklift (start/receive/finish).
// There are NO overrides: `fit` is a hard gate for calling a truck to a dock. Flexibility comes from configuring docks.

export type Direction = "in" | "out";
export const DIR_LABEL: Record<Direction, string> = { in: "Inbound", out: "Outbound" };
export const DIR_VERB: Record<Direction, { job: string; work: string; done: string; line: string; start: string; finish: string }> = {
  in: { job: "Delivery", work: "Unloading", done: "Unloaded", line: "Received", start: "Start unload", finish: "Finish unload" },
  out: { job: "Collection", work: "Loading", done: "Loaded", line: "Loaded", start: "Start loading", finish: "Finish loading" },
};
export type LoadClass = "ambient" | "chilled" | "frozen" | "dg";
export const LOAD_LABEL: Record<LoadClass, string> = { ambient: "Ambient", chilled: "Chilled", frozen: "Frozen", dg: "Dangerous goods" };
export const LOAD_CLASSES: LoadClass[] = ["ambient", "chilled", "frozen", "dg"];

export type TruckClassId = "van" | "rigid" | "semi" | "reefer" | "bdouble";
export type TruckClass = { id: TruckClassId; label: string; hint: string; height: number; cube: number; pallets: number };
/** Typical trailer height (m), cargo volume (m³) and pallet capacity per class. Presets only: drivers can adjust height and cube at the kiosk. */
export const TRUCK_CLASSES: TruckClass[] = [
  { id: "van", label: "Van", hint: "Up to 3.5 t", height: 2.4, cube: 12, pallets: 6 },
  { id: "rigid", label: "Rigid truck", hint: "6–10 m body", height: 3.6, cube: 38, pallets: 14 },
  { id: "semi", label: "Semi-trailer", hint: "Curtain or box", height: 4.3, cube: 82, pallets: 26 },
  { id: "reefer", label: "Refrigerated", hint: "Chilled or frozen", height: 4.1, cube: 70, pallets: 24 },
  { id: "bdouble", label: "B-double", hint: "Two trailers", height: 4.3, cube: 150, pallets: 44 },
];
export const classOf = (id: TruckClassId) => TRUCK_CLASSES.find((c) => c.id === id) ?? TRUCK_CLASSES[2];
/** Which class a truck of this size and load most likely is: used by seeds and as the kiosk default. */
export const suggestClass = (load: LoadClass, pallets: number): TruckClassId => (load === "chilled" || load === "frozen" ? "reefer" : pallets <= 6 ? "van" : pallets <= 14 ? "rigid" : pallets <= 26 || load === "dg" ? "semi" : "bdouble");

export type Equipment = "leveller" | "shelter" | "groundLevel";
export const EQUIP_LABEL: Record<Equipment, string> = { leveller: "Dock leveller", shelter: "Dock shelter", groundLevel: "Ground-level bay (tail-lift trucks)" };
export const EQUIPMENT: Equipment[] = ["leveller", "shelter", "groundLevel"];

export type Carrier = { id: string; name: string; tier: 1 | 2 | 3 };
export type Booking = { ref: string; dir: Direction; carrier: string; slot: number; load: LoadClass; pallets: number; cube: number };
export type TicketStatus = "waiting" | "called" | "onDock" | "accepted" | "working" | "complete" | "cleared" | "departed" | "noshow";
/** Statuses where a truck is physically at (or heading to) a dock. A dock is occupied while one of these is held. */
export const AT_DOCK: TicketStatus[] = ["called", "onDock", "accepted", "working", "complete", "cleared"];
export const STAGE_LABEL: Record<TicketStatus, string> = { waiting: "Waiting", called: "Approaching", onDock: "At dock", accepted: "Accepted", working: "Working", complete: "Complete", cleared: "Cleared", departed: "Departed", noshow: "No-show" };

export type LineState = "ok" | "damaged" | "missing";
export type Line = { id: string; desc: string; zone: string; state?: LineState; extra?: boolean };
export type Checks = { paperwork?: boolean; seal?: boolean; inspect?: boolean; temp?: number };
export type Job = {
  dir: Direction; ref?: string; slot?: number; load: LoadClass; bookedLoad?: LoadClass;
  /** Pallets on the booking (undefined for walk-ins), pallets the driver declared, and cubic metres. */ booked?: number; declared: number; cube: number;
  /** Manifest. Empty for a blind job (no booking): the operator counts pallets in. */ lines: Line[]; blind: boolean;
  checks: Checks; sealNo?: string; ack?: boolean; outcome?: "completed" | "rejected"; reason?: string; acceptedAt?: number; startedAt?: number; finishedAt?: number;
};
export type Ticket = {
  id: string; rego: string; driver: string; phone: string; carrier: string; cls: TruckClassId; height: number; cube: number; tailLift: boolean; urgent: boolean;
  arrivedAt: number; jobs: Job[]; cur: number; status: TicketStatus; since: number; dock?: number; calledAt?: number; firstCalledAt?: number; endedAt?: number; note?: string;
};
export type Dock = { id: number; name: string; dirs: Direction[]; caps: LoadClass[]; classes: TruckClassId[]; maxHeight: number; maxCube: number; equipment: Equipment[]; status: "open" | "blocked"; reason?: string; claimed?: number };
export type Weights = { waitPerMin: number; slotBonus: number; latePerMin: number; earlyPerMin: number; walkIn: number; frozen: number; chilled: number; dg: number; tier1: number; tier2: number; urgent: number; slaMin: number; slaBonus: number };
export const DEFAULT_WEIGHTS: Weights = { waitPerMin: 0.6, slotBonus: 15, latePerMin: 0.5, earlyPerMin: 0.3, walkIn: 20, frozen: 40, chilled: 30, dg: 25, tier1: 10, tier2: 5, urgent: 25, slaMin: 45, slaBonus: 20 };

/** Every duration in sim minutes. One place to tune the demo; nothing else hard-codes a time. */
export const TIMING = { approach: 2.5, accept: 3, forkStart: 0.6, perPallet: 0.5, workBase: 2, clear: 2, leave: 1.5, claimMs: 90_000 };
export const workMin = (j: Pick<Job, "declared" | "lines" | "load">) => Math.round((TIMING.workBase + Math.max(j.declared, j.lines.length) * TIMING.perPallet * (j.load === "frozen" ? 0.8 : j.load === "dg" ? 1.4 : 1)) * 10) / 10;
/** Expected duration of the current job's working stage, for forecasts. */
export const unloadMin = workMin;

export const CARRIERS: Carrier[] = [
  { id: "linehaul", name: "Linehaul Express", tier: 1 }, { id: "coldchain", name: "ColdChain Freight", tier: 1 }, { id: "outback", name: "Outback Haulage", tier: 2 }, { id: "bnecarry", name: "Brisbane Carriers", tier: 2 },
  { id: "kookaburra", name: "Kookaburra Logistics", tier: 3 }, { id: "wombat", name: "Wombat Transport", tier: 3 }, { id: "adhoc", name: "Owner-driver (ad hoc)", tier: 3 },
];
export const carrierOf = (id: string) => CARRIERS.find((c) => c.id === id) ?? CARRIERS[CARRIERS.length - 1];

const ALL_CLASSES: TruckClassId[] = ["van", "rigid", "semi", "reefer", "bdouble"];
const dock = (id: number, p: Partial<Dock>): Dock => ({ id, name: `Dock ${id}`, dirs: ["in"], caps: ["ambient"], classes: ["rigid", "semi", "bdouble"], maxHeight: 4.5, maxCube: 160, equipment: ["leveller"], status: "open", ...p });
export const DOCK_DEFAULTS: Dock[] = [
  dock(1, { dirs: ["in", "out"], classes: ["van", "rigid", "semi", "bdouble"], equipment: ["leveller", "shelter"] }), dock(2, {}), dock(3, { caps: ["ambient", "dg"], classes: ["van", "rigid", "semi"], maxCube: 90, equipment: ["leveller", "shelter"] }),
  dock(4, { caps: ["chilled"], classes: ["rigid", "semi", "reefer"], maxHeight: 4.3, maxCube: 90, equipment: ["leveller", "shelter"] }),
  dock(5, { dirs: ["in", "out"], caps: ["chilled", "frozen"], classes: ["rigid", "semi", "reefer"], maxHeight: 4.3, maxCube: 90, equipment: ["leveller", "shelter"] }),
  dock(6, { dirs: ["out"], caps: ["ambient", "chilled"], classes: ["van", "rigid", "semi", "reefer"], maxHeight: 4.4, maxCube: 90 }), dock(7, { dirs: ["out"], caps: ["ambient", "dg"], classes: ["van", "rigid", "semi", "bdouble"] }),
  dock(8, { status: "blocked", reason: "Leveller repair" }),
  dock(9, { name: "Ground bay 9", dirs: ["in", "out"], caps: ["ambient"], classes: ["van", "rigid"], maxHeight: 3.8, maxCube: 40, equipment: ["groundLevel"] }),
];
export { ALL_CLASSES };

export const hhmm = (m: number) => { const t = Math.floor(((m % 1440) + 1440) % 1440); return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; };
export const dur = (m: number) => (m < 1 ? "<1 min" : m < 60 ? `${Math.round(m)} min` : `${Math.floor(m / 60)} h ${Math.round(m % 60)} m`);
/** mm:ss for countdowns shown on the dock display. */
export const mmss = (m: number) => { const s = Math.max(0, Math.round(m * 60)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

export const jobOf = (t: Pick<Ticket, "jobs" | "cur">): Job => t.jobs[Math.min(t.cur, t.jobs.length - 1)];
/** The one place that decides whether a dock is taken. Everything (rank, call, KPIs, screens) goes through this. */
export const occupant = (s: Pick<State, "tickets">, dockId: number): Ticket | undefined => s.tickets.find((t) => t.dock === dockId && AT_DOCK.includes(t.status));
export const isClaimed = (d: Dock, real = Date.now()) => d.claimed !== undefined && real - d.claimed < TIMING.claimMs;

/** Why a truck cannot use a dock. Empty = a clean fit. Hard gate everywhere: there is no override. */
export function fit(d: Dock, t: Pick<Ticket, "cls" | "height" | "cube" | "tailLift">, j: Pick<Job, "dir" | "load">): string[] {
  const m: string[] = [];
  if (d.status === "blocked") m.push(`${d.name} is blocked${d.reason ? ` (${d.reason})` : ""}`);
  if (!d.dirs.includes(j.dir)) m.push(`${d.name} is not set up for ${DIR_LABEL[j.dir].toLowerCase()}`);
  if (!d.caps.includes(j.load)) m.push(`${d.name} cannot take ${LOAD_LABEL[j.load].toLowerCase()}`);
  if (!d.classes.includes(t.cls)) m.push(`${classOf(t.cls).label} not allowed at ${d.name}`);
  if (t.height > d.maxHeight) m.push(`Trailer ${t.height} m is over the ${d.maxHeight} m limit at ${d.name}`);
  if (t.cube > d.maxCube) m.push(`${t.cube} m³ is over the ${d.maxCube} m³ limit at ${d.name}`);
  if (t.tailLift && !d.equipment.includes("groundLevel")) m.push(`Tail-lift truck needs a ground-level bay`);
  return m;
}
/** Fewer capabilities = less flexible. Auto-call prefers the least flexible fit so multi-purpose docks stay free for trucks that need them. */
export const flexibility = (d: Dock) => d.dirs.length * 2 + d.caps.length * 2 + d.classes.length + d.equipment.length;
export const canUse = (d: Dock, t: Ticket, j: Job = jobOf(t)) => fit(d, t, j).length === 0;

export type ScorePart = { label: string; points: number };
export type Scored = { score: number; parts: ScorePart[]; waited: number };

/** Priority score: higher = called sooner. Every contribution is listed so staff (and drivers) can see why. */
export function score(t: Ticket, now: number, w: Weights): Scored {
  const parts: ScorePart[] = []; const j = jobOf(t);
  const waited = Math.max(0, now - t.arrivedAt);
  const add = (label: string, points: number) => { if (Math.abs(points) >= 0.5) parts.push({ label, points: Math.round(points * 10) / 10 }); };
  add(`Waited ${dur(waited)}`, waited * w.waitPerMin);
  if (j.slot === undefined) add("No booking (walk-in)", -w.walkIn);
  else {
    const d = t.arrivedAt - j.slot;
    if (Math.abs(d) <= 15) add("Arrived on slot", w.slotBonus);
    else if (d < 0) add(`Early by ${dur(-d)}`, -Math.min(15, (-d - 15) * w.earlyPerMin));
    else add(`Late by ${dur(d)}`, -Math.min(30, (d - 15) * w.latePerMin));
  }
  if (j.load === "frozen") add("Frozen load", w.frozen); else if (j.load === "chilled") add("Chilled load", w.chilled); else if (j.load === "dg") add("Dangerous goods", w.dg);
  const tier = carrierOf(t.carrier).tier; if (tier === 1) add("Tier 1 carrier", w.tier1); else if (tier === 2) add("Tier 2 carrier", w.tier2);
  if (t.urgent) add("Marked urgent", w.urgent);
  if (waited >= w.slaMin) add(`Past ${w.slaMin} min SLA`, w.slaBonus);
  return { score: Math.round(parts.reduce((a, p) => a + p.points, 0) * 10) / 10, parts, waited };
}

export type State = { rev: number; baseSim: number; baseReal: number; speed: number; tickets: Ticket[]; docks: Dock[]; bookings: Booking[]; weights: Weights; seq: number; auto: boolean; autoArrivals: boolean; simStaff: boolean; simFork: boolean; log: { t: number; msg: string }[] };
export const simNow = (s: Pick<State, "baseSim" | "baseReal" | "speed">, real = Date.now()) => s.baseSim + ((real - s.baseReal) / 60000) * s.speed;

/** Minutes from now until the truck on this dock has left it (forecast, from the stage it is in). */
export function remaining(t: Ticket, now: number): number {
  const j = jobOf(t), el = now - t.since, w = workMin(j), tail = TIMING.clear + TIMING.leave;
  switch (t.status) {
    case "called": return Math.max(0, TIMING.approach - el) + TIMING.accept + TIMING.forkStart + w + tail;
    case "onDock": return Math.max(0, TIMING.accept - el) + TIMING.forkStart + w + tail;
    case "accepted": return Math.max(0, TIMING.forkStart - el) + w + tail;
    case "working": return Math.max(0, w - (now - (j.startedAt ?? t.since))) + tail;
    case "complete": return Math.max(0, TIMING.clear - el) + TIMING.leave;
    case "cleared": return Math.max(0, TIMING.leave - el);
    default: return 0;
  }
}

/** Ranked waiting queue with a greedy forecast of when each ticket will be called and which dock it will get. Only clean fits are considered. */
export function rank(s: State, now: number) {
  const waiting = s.tickets.filter((t) => t.status === "waiting").map((t) => ({ t, ...score(t, now, s.weights) })).sort((a, b) => b.score - a.score || a.t.arrivedAt - b.t.arrivedAt);
  const freeAt = new Map<number, number>();
  for (const d of s.docks) { if (d.status !== "open") continue; const cur = occupant(s, d.id); freeAt.set(d.id, cur ? now + remaining(cur, now) : now); }
  return waiting.map((r, i) => {
    const j = jobOf(r.t); let best: { id: number; at: number } | null = null;
    for (const d of s.docks) { const at = freeAt.get(d.id); if (at !== undefined && canUse(d, r.t, j) && (!best || at < best.at || (at === best.at && flexibility(d) < flexibility(s.docks.find((x) => x.id === best!.id)!)))) best = { id: d.id, at }; }
    if (best) freeAt.set(best.id, best.at + TIMING.accept + TIMING.forkStart + workMin(j) + TIMING.clear + TIMING.leave);
    return { ...r, position: i + 1, etaCall: best ? Math.max(0, best.at - now) : null, dockHint: best?.id ?? null, noFit: best ? [] : whyNoFit(s, r.t) };
  });
}
/** When no dock fits, the reasons from the closest dock (fewest mismatches), so staff and drivers know what to change. */
export function whyNoFit(s: Pick<State, "docks">, t: Ticket, j: Job = jobOf(t)): string[] {
  let best: string[] | null = null; for (const d of s.docks) { const m = fit(d, t, j); if (!best || m.length < best.length) best = m; }
  return best ?? ["No docks configured"];
}

/** Free docks that could take this ticket now. */
export const eligibleFreeDocks = (s: State, t: Ticket) => s.docks.filter((d) => canUse(d, t) && !occupant(s, d.id)).sort((a, b) => flexibility(a) - flexibility(b) || a.id - b.id);

export function kpis(s: State, now: number, dir?: Direction) {
  const q = rank(s, now).filter((r) => !dir || jobOf(r.t).dir === dir); const done = s.tickets.filter((t) => t.status === "departed" && t.firstCalledAt !== undefined && (!dir || t.jobs.some((j) => j.dir === dir)));
  const waits = done.map((t) => (t.firstCalledAt ?? t.arrivedAt) - t.arrivedAt); const avg = waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : 0;
  const open = s.docks.filter((d) => d.status === "open" && (!dir || d.dirs.includes(dir))); const busy = open.filter((d) => occupant(s, d.id));
  const booked = done.flatMap((t) => t.jobs.filter((j) => j.slot !== undefined).map((j) => ({ t, j }))); const ontime = booked.filter(({ t, j }) => Math.abs(t.arrivedAt - (j.slot ?? 0)) <= 15).length;
  return { waiting: q.length, avgWait: avg, longest: q.length ? Math.max(...q.map((r) => r.waited)) : 0, utilisation: open.length ? busy.length / open.length : 0, onTime: booked.length ? ontime / booked.length : 1, breaches: q.filter((r) => r.waited >= s.weights.slaMin).length, doneToday: done.length };
}

// ---------- discrepancy ----------
export type Receipt = { received: number; damaged: number };
/** Compare a receipt to what was expected: short, over, or damaged lines need a discrepancy report. */
export function reconcile(expected: number, r: Receipt): { status: "received" | "discrepancy"; short: number; over: number; issues: string[] } {
  const good = r.received - r.damaged; const issues: string[] = []; const short = Math.max(0, expected - good), over = Math.max(0, r.received - expected);
  if (short) issues.push(`${short} short`); if (over) issues.push(`${over} over`); if (r.damaged) issues.push(`${r.damaged} damaged`);
  return { status: issues.length ? "discrepancy" : "received", short, over, issues };
}
/** Booked vs declared vs received, and the discrepancy between what was expected and what was handled. */
export function tally(j: Job) {
  const ok = j.lines.filter((l) => l.state === "ok").length, damaged = j.lines.filter((l) => l.state === "damaged").length, missing = j.lines.filter((l) => l.state === "missing").length, extra = j.lines.filter((l) => l.extra).length;
  const handled = ok + damaged, pending = j.lines.filter((l) => !l.state).length, expected = j.booked ?? j.declared;
  const rec = reconcile(expected, { received: handled, damaged });
  const issues = j.outcome === "rejected" ? [] : [...rec.issues, ...(j.bookedLoad && j.bookedLoad !== j.load ? [`declared ${LOAD_LABEL[j.load]}, booked ${LOAD_LABEL[j.bookedLoad]}`] : [])];
  return { ok, damaged, missing, extra, handled, pending, expected, total: j.lines.length, issues, discrepancy: issues.length > 0 };
}

// ---------- acceptance checks ----------
export const TEMP_LIMIT: Partial<Record<LoadClass, number>> = { chilled: 5, frozen: -15 };
export const needsTemp = (j: Job) => j.dir === "in" && j.load in TEMP_LIMIT;
export const tempOk = (j: Job) => !needsTemp(j) || (j.checks.temp !== undefined && j.checks.temp <= TEMP_LIMIT[j.load]!);
/** What the clerk must confirm before a truck can be accepted. */
export function acceptBlockers(j: Job): string[] {
  const m: string[] = [];
  if (!j.checks.paperwork) m.push(j.dir === "in" ? "Check delivery paperwork" : "Check pick note and paperwork");
  if (j.dir === "in" && !j.checks.seal) m.push("Check seal is intact");
  if (j.dir === "out" && !j.checks.inspect) m.push("Inspect trailer is clean and empty");
  if (needsTemp(j)) { if (j.checks.temp === undefined) m.push("Record load temperature"); else if (!tempOk(j)) m.push(`Temperature ${j.checks.temp} °C is not within ${TEMP_LIMIT[j.load]} °C: reject`); }
  return m;
}
/** What must be true before the clerk can clear the truck. */
export function clearBlockers(j: Job): string[] {
  const m: string[] = []; if (j.outcome === "rejected") return m; const t = tally(j);
  if (t.discrepancy && !j.ack) m.push("Review the discrepancy");
  if (j.dir === "out" && !j.sealNo?.trim()) m.push("Record the seal number");
  return m;
}
/** What the forklift operator must finish before the job can be marked complete. */
export function finishBlockers(j: Job): string[] {
  const m: string[] = []; const t = tally(j);
  if (t.pending) m.push(`${t.pending} pallet${t.pending > 1 ? "s" : ""} not yet checked`);
  if (j.lines.length === 0) m.push("Count at least one pallet");
  return m;
}

// ---------- manifests ----------
const DESC: Record<LoadClass, string[]> = {
  ambient: ["Oat milk 1L ×12", "Packing tape ×36", "Canned tomatoes ×24", "Rice 5 kg ×10", "Cleaning wipes ×20", "USB-C cable ×50"], chilled: ["Yoghurt 1 kg ×12", "Fresh pasta ×20", "Cheese blocks ×8", "Cold-pressed juice ×24"],
  frozen: ["Frozen veg 1 kg ×10", "Ice cream 2 L ×8", "Fish fillets ×6", "Frozen pastry ×16"], dg: ["Cleaning concentrate 5 L ×4", "Aerosol cases ×12", "Pool chlorine ×6"],
};
const ZONE: Record<Direction, Record<LoadClass, string>> = { in: { ambient: "Zone A", chilled: "Chill 1", frozen: "Freezer 2", dg: "DG cage" }, out: { ambient: "Stage 3", chilled: "Stage C", frozen: "Stage F", dg: "DG stage" } };
const hash = (str: string) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; };
/** Deterministic pallet lines from a booking ref, so every screen shows the same manifest. */
export function manifest(ref: string, dir: Direction, load: LoadClass, n: number): Line[] {
  const r = rng(hash(ref)); return Array.from({ length: n }, (_, i) => ({ id: `${ref}-P${String(i + 1).padStart(2, "0")}`, desc: DESC[load][Math.floor(r() * DESC[load].length)], zone: ZONE[dir][load] }));
}
export type JobSpec = { dir: Direction; ref?: string; load: LoadClass; pallets: number; cube?: number };
export const cubeFor = (pallets: number) => Math.round(pallets * 1.6 * 10) / 10;
export function makeJob(s: Pick<State, "bookings">, spec: JobSpec): Job {
  const b = spec.ref ? s.bookings.find((x) => x.ref.toLowerCase() === spec.ref!.toLowerCase() && x.dir === spec.dir) : undefined;
  const load = spec.load, declared = spec.pallets;
  const blind = !b;
  return { dir: spec.dir, ref: b?.ref, slot: b?.slot, load, bookedLoad: b?.load, booked: b?.pallets, declared, cube: spec.cube ?? b?.cube ?? cubeFor(declared), blind, lines: blind ? [] : manifest(b!.ref, spec.dir, b!.load, b!.pallets), checks: {} };
}

// ---------- state transitions (pure: return a new state) ----------
const bump = (s: State, msg?: string, now = simNow(s)): State => ({ ...s, rev: s.rev + 1, log: msg ? [{ t: now, msg }, ...s.log].slice(0, 80) : s.log });
const upd = (s: State, id: string, f: (t: Ticket) => Ticket): State => ({ ...s, tickets: s.tickets.map((t) => (t.id === id ? f(t) : t)) });
const updJob = (t: Ticket, f: (j: Job) => Job): Ticket => ({ ...t, jobs: t.jobs.map((j, i) => (i === t.cur ? f(j) : j)) });
const get = (s: State, id: string) => s.tickets.find((x) => x.id === id);

export type CheckInForm = { rego: string; driver: string; phone: string; carrier: string; cls: TruckClassId; height: number; cube: number; tailLift: boolean; urgent?: boolean; jobs: JobSpec[] };
/** A booking can only be checked in once while its visit is still open. */
export const refInUse = (s: Pick<State, "tickets">, ref: string, dir?: Direction) => s.tickets.some((t) => t.status !== "noshow" && t.jobs.some((j) => j.ref?.toLowerCase() === ref.toLowerCase() && (!dir || j.dir === dir)));
export function checkIn(s: State, f: CheckInForm, now = simNow(s)): { state: State; ticket: Ticket | null; error: string | null } {
  if (!f.jobs.length) return { state: s, ticket: null, error: "Choose delivering, collecting or both" };
  for (const j of f.jobs) if (j.ref && s.bookings.some((b) => b.ref.toLowerCase() === j.ref!.toLowerCase()) && refInUse(s, j.ref, j.dir)) return { state: s, ticket: null, error: `${j.ref} has already checked in` };
  const seq = s.seq + 1; const jobs = f.jobs.map((j) => makeJob(s, j));
  const bookedCarrier = f.jobs.map((j) => s.bookings.find((b) => b.ref.toLowerCase() === j.ref?.toLowerCase())?.carrier).find(Boolean);
  const t: Ticket = { id: `${String.fromCharCode(65 + ((seq - 1) % 26))}${String(100 + seq).slice(-3)}`, rego: f.rego.toUpperCase(), driver: f.driver, phone: f.phone, carrier: bookedCarrier ?? f.carrier, cls: f.cls, height: f.height, cube: f.cube, tailLift: f.tailLift, urgent: !!f.urgent, arrivedAt: now, jobs, cur: 0, status: "waiting", since: now };
  return { state: bump({ ...s, seq, tickets: [...s.tickets, t] }, `${t.rego} checked in (${jobs.map((j) => `${DIR_VERB[j.dir].job.toLowerCase()}, ${LOAD_LABEL[j.load].toLowerCase()}, ${j.declared} pallets`).join(" + ")})`, now), ticket: t, error: null };
}
export function callTo(s: State, ticketId: string, dockId: number, now = simNow(s)): State {
  const t = get(s, ticketId), d = s.docks.find((x) => x.id === dockId);
  if (!t || !d || t.status !== "waiting" || !canUse(d, t) || occupant(s, dockId)) return s;
  return bump(upd(s, ticketId, (x) => ({ ...x, status: "called", dock: dockId, calledAt: now, firstCalledAt: x.firstCalledAt ?? now, since: now })), `Called ${t.rego} to ${d.name}`, now);
}
const step = (s: State, id: string, from: TicketStatus[], to: TicketStatus, msg: (t: Ticket) => string, now: number, patch?: (t: Ticket) => Ticket): State => {
  const t = get(s, id); if (!t || !from.includes(t.status)) return s;
  return bump(upd(s, id, (x) => { const y = { ...x, status: to, since: now }; return patch ? patch(y) : y; }), msg(t), now);
};
export const arrive = (s: State, id: string, now = simNow(s)) => step(s, id, ["called"], "onDock", (t) => `${t.rego} is on ${dockName(s, t)}`, now);
export const setChecks = (s: State, id: string, c: Partial<Checks>): State => { const t = get(s, id); return t && t.status === "onDock" ? { ...upd(s, id, (x) => updJob(x, (j) => ({ ...j, checks: { ...j.checks, ...c } }))), rev: s.rev + 1 } : s; };
export function accept(s: State, id: string, now = simNow(s)): State { const t = get(s, id); if (!t || acceptBlockers(jobOf(t)).length) return s; return step(s, id, ["onDock"], "accepted", (x) => `${x.rego} accepted at ${dockName(s, x)}`, now, (x) => updJob(x, (j) => ({ ...j, acceptedAt: now }))); }
export const reject = (s: State, id: string, reason: string, now = simNow(s)) => step(s, id, ["onDock", "accepted"], "complete", (t) => `${t.rego} rejected at ${dockName(s, t)}: ${reason}`, now, (x) => updJob(x, (j) => ({ ...j, outcome: "rejected", reason, finishedAt: now })));
export const startWork = (s: State, id: string, now = simNow(s)) => step(s, id, ["accepted"], "working", (t) => `${t.rego} started ${DIR_VERB[jobOf(t).dir].work.toLowerCase()} at ${dockName(s, t)}`, now, (x) => updJob(x, (j) => ({ ...j, startedAt: now })));
export function markLine(s: State, id: string, lineId: string, state: LineState | undefined): State {
  const t = get(s, id); if (!t || t.status !== "working") return s;
  return { ...upd(s, id, (x) => updJob(x, (j) => ({ ...j, lines: j.lines.map((l) => (l.id === lineId ? { ...l, state } : l)) }))), rev: s.rev + 1 };
}
/** Add a pallet: blind counts, or an extra pallet that was not on the manifest. */
export function addLine(s: State, id: string, state: LineState = "ok"): State {
  const t = get(s, id); if (!t || t.status !== "working") return s; const j = jobOf(t); const n = j.lines.length + 1;
  const line: Line = { id: `${j.ref ?? t.id}-X${String(n).padStart(2, "0")}`, desc: j.blind ? "Pallet counted in" : "Extra pallet (not on manifest)", zone: ZONE[j.dir][j.load], state, extra: !j.blind };
  return { ...upd(s, id, (x) => updJob(x, (y) => ({ ...y, lines: [...y.lines, line] }))), rev: s.rev + 1 };
}
export function removeLine(s: State, id: string, lineId: string): State { const t = get(s, id); if (!t || t.status !== "working") return s; return { ...upd(s, id, (x) => updJob(x, (j) => ({ ...j, lines: j.lines.filter((l) => !(l.id === lineId && (l.extra || j.blind))) }))), rev: s.rev + 1 }; }
export function finishWork(s: State, id: string, now = simNow(s)): State { const t = get(s, id); if (!t || finishBlockers(jobOf(t)).length) return s; return step(s, id, ["working"], "complete", (x) => `${x.rego} finished ${DIR_VERB[jobOf(x).dir].work.toLowerCase()} at ${dockName(s, x)}`, now, (x) => updJob(x, (j) => ({ ...j, outcome: "completed", finishedAt: now }))); }
export const ackDiscrepancy = (s: State, id: string): State => { const t = get(s, id); return t && t.status === "complete" ? { ...upd(s, id, (x) => updJob(x, (j) => ({ ...j, ack: true }))), rev: s.rev + 1 } : s; };
export const setSeal = (s: State, id: string, sealNo: string): State => { const t = get(s, id); return t && t.status === "complete" ? { ...upd(s, id, (x) => updJob(x, (j) => ({ ...j, sealNo }))), rev: s.rev + 1 } : s; };
/**
 * Clear the truck after a job. With another job: it stays on this dock if the dock fits that job, otherwise it re-queues
 * (keeping its original arrival time). With no more jobs it is cleared to leave.
 */
export function clear(s: State, id: string, now = simNow(s)): State {
  const t = get(s, id); if (!t || t.status !== "complete" || clearBlockers(jobOf(t)).length) return s;
  const next = t.jobs[t.cur + 1];
  if (!next) return step(s, id, ["complete"], "cleared", (x) => `${x.rego} cleared to leave ${dockName(s, x)}`, now);
  const d = s.docks.find((x) => x.id === t.dock); const stay = !!d && d.status === "open" && canUse(d, t, next);
  return bump(upd(s, id, (x) => ({ ...x, cur: x.cur + 1, status: stay ? "onDock" : "waiting", dock: stay ? x.dock : undefined, since: now })), stay ? `${t.rego} stays on ${dockName(s, t)} for ${DIR_VERB[next.dir].job.toLowerCase()}` : `${t.rego} re-queued for ${DIR_VERB[next.dir].job.toLowerCase()}`, now);
}
export const depart = (s: State, id: string, now = simNow(s)) => step(s, id, ["cleared"], "departed", (t) => `${t.rego} left ${dockName(s, t)}`, now, (x) => ({ ...x, endedAt: now }));
export const noShow = (s: State, id: string, now = simNow(s)) => step(s, id, ["waiting", "called"], "noshow", (t) => `${t.rego} marked no-show`, now, (x) => ({ ...x, endedAt: now }));
/** Put a no-show back in the queue at the back (arrival time restarts). */
export const requeue = (s: State, id: string, now = simNow(s)) => step(s, id, ["noshow"], "waiting", (t) => `${t.rego} re-queued`, now, (x) => ({ ...x, arrivedAt: now, dock: undefined, endedAt: undefined }));
const dockName = (s: State, t: Ticket) => s.docks.find((d) => d.id === t.dock)?.name ?? "dock";

/** Block or reopen a dock. A dock with a truck on it cannot be blocked. */
export function blockDock(s: State, id: number, block: boolean, reason = "Blocked by staff"): State {
  const d = s.docks.find((x) => x.id === id); if (!d || (block && occupant(s, id)) || (d.status === "blocked") === block) return s;
  return bump({ ...s, docks: s.docks.map((x) => (x.id === id ? { ...x, status: block ? "blocked" : "open", reason: block ? reason : undefined } : x)) }, `${d.name} ${block ? "blocked" : "reopened"}`);
}
/** Change a dock's setup. Locked while a truck is on it: the change would apply to the next truck, not this one. */
export function configDock(s: State, id: number, patch: Partial<Pick<Dock, "name" | "dirs" | "caps" | "classes" | "maxHeight" | "maxCube" | "equipment">>): State {
  const d = s.docks.find((x) => x.id === id); if (!d || occupant(s, id)) return s;
  const renameOnly = Object.keys(patch).every((k) => k === "name"); // typing a name must not flood the log
  return bump({ ...s, docks: s.docks.map((x) => (x.id === id ? { ...x, ...patch } : x)) }, renameOnly ? undefined : `${d.name} setup changed`);
}
/** Staff-only: urgent adds priority points, so drivers cannot set it themselves. */
export const setUrgent = (s: State, id: string, urgent: boolean, now = simNow(s)): State => { const t = get(s, id); return t && t.urgent !== urgent && t.status === "waiting" ? bump(upd(s, id, (x) => ({ ...x, urgent })), `${t.rego} ${urgent ? "marked urgent" : "no longer urgent"}`, now) : s; };
export const claimDock = (s: State, id: number | undefined, real = Date.now()): State => (id === undefined ? s : { ...s, docks: s.docks.map((d) => (d.id === id ? { ...d, claimed: real } : d)) });
export const setWeights = (s: State, w: Partial<Weights>): State => ({ ...s, rev: s.rev + 1, weights: { ...s.weights, ...w } });

/** Call the top-ranked waiting ticket to the least flexible free dock that fits, if any. */
export function autoCall(s: State, now = simNow(s)): State {
  let cur = s;
  for (const r of rank(cur, now)) { const d = eligibleFreeDocks(cur, r.t)[0]; if (d) cur = callTo(cur, r.t.id, d.id, now); }
  return cur;
}
/**
 * Advance the world. Trucks drive up to their dock and drive away on their own. Everything else is a person's job:
 * with "simulate dock staff" / "simulate forklift" on, those people are played for docks nobody is actively working.
 */
export function advance(s: State, now = simNow(s), real = Date.now()): State {
  let cur = s;
  for (const t0 of s.tickets) {
    const t = get(cur, t0.id)!; const d = cur.docks.find((x) => x.id === t.dock); const free = !d || !isClaimed(d, real); const j = jobOf(t);
    if (t.status === "called" && now - t.since >= TIMING.approach) cur = arrive(cur, t.id, now);
    else if (t.status === "cleared" && now - t.since >= TIMING.leave) cur = depart(cur, t.id, now);
    else if (cur.simStaff && free && t.status === "onDock" && now - t.since >= TIMING.accept) {
      cur = setChecks(cur, t.id, { paperwork: true, seal: true, inspect: true, ...(needsTemp(j) ? { temp: j.load === "frozen" ? -19 : 3 } : {}) }); cur = accept(cur, t.id, now);
    } else if (cur.simFork && free && t.status === "accepted" && now - t.since >= TIMING.forkStart) cur = startWork(cur, t.id, now);
    else if (cur.simFork && free && t.status === "working") {
      const n = Math.floor((now - (j.startedAt ?? now)) / TIMING.perPallet);
      for (let i = 0; i < Math.min(n, j.blind ? j.declared : j.lines.length); i++) {
        const live = jobOf(get(cur, t.id)!);
        if (live.blind) { if (live.lines.length <= i) cur = addLine(cur, t.id); } else if (!live.lines[i].state) cur = markLine(cur, t.id, live.lines[i].id, hash(live.lines[i].id) % 29 === 0 ? "damaged" : "ok");
      }
      const after = get(cur, t.id)!; if (n >= (j.blind ? j.declared : j.lines.length) && !finishBlockers(jobOf(after)).length) cur = finishWork(cur, t.id, now);
    } else if (cur.simStaff && free && t.status === "complete" && now - t.since >= TIMING.clear) {
      cur = ackDiscrepancy(cur, t.id); if (j.dir === "out" && j.outcome !== "rejected") cur = setSeal(cur, t.id, `SL${100000 + (hash(t.id) % 900000)}`); cur = clear(cur, t.id, now);
    }
  }
  return cur.auto ? autoCall(cur, now) : cur;
}

// ---------- seed ----------
export function rng(seed: number) { let s = Math.imul(seed ^ 0x9e3779b9, 2654435761) >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
export const REGOS = ["1AB 2CD", "QLD 487", "XTR 912", "BNE 05K", "KLM 330", "ZZ9 PLU", "TRK 221", "FRZ 019", "CLD 774", "HAZ 408"];
export const DRIVERS = ["Sam Walker", "Priya Nair", "Tom Kelly", "Mia Chen", "Jack Evans", "Ruby Singh", "Leo Brown", "Ella Moore", "Noah Hughes", "Zoe Taylor"];
const truck = (load: LoadClass, pallets: number) => { const cls = suggestClass(load, pallets), c = classOf(cls); return { cls, height: c.height, cube: c.cube }; };
export function seed(startMin = 8 * 60 + 40): State {
  const r = rng(11); const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const loads: LoadClass[] = ["ambient", "ambient", "ambient", "chilled", "chilled", "frozen", "dg"];
  const mk = (dir: Direction, i: number, base: number, ref: string): Booking => { const load = pick(loads), pallets = 8 + Math.floor(r() * 22); return { ref, dir, carrier: pick(CARRIERS).id, slot: base + i * 30, load, pallets, cube: cubeFor(pallets) }; };
  const bookings: Booking[] = [...Array.from({ length: 26 }, (_, i) => mk("in", i, 5 * 60, `BK${4100 + i}`)), ...Array.from({ length: 22 }, (_, i) => mk("out", i, 5 * 60 + 45, `DS${6200 + i}`))];
  let s: State = { rev: 1, baseSim: startMin, baseReal: Date.now(), speed: 1, tickets: [], docks: DOCK_DEFAULTS.map((d) => ({ ...d })), bookings, weights: { ...DEFAULT_WEIGHTS }, seq: 0, auto: false, autoArrivals: true, simStaff: true, simFork: true, log: [] };
  // A realistic morning rush: a truck roughly every 4 minutes from 06:00, mostly on booking, a few walk-ins and two-way visits, heavy on chilled/frozen so a queue forms.
  const arrivals: { at: number; booking?: Booking; walk?: LoadClass; both?: Booking }[] = [];
  bookings.filter((b) => b.slot < startMin + 20).forEach((b) => arrivals.push({ at: Math.max(5 * 60 + 5, b.slot + Math.round((r() - 0.4) * 50)), booking: b }));
  for (let i = 0; i < 16; i++) arrivals.push({ at: startMin - 85 + i * 5 + Math.round(r() * 3), walk: pick(["ambient", "chilled", "frozen", "chilled", "frozen", "dg"] as LoadClass[]) });
  arrivals.sort((a, b) => a.at - b.at);
  let i = 0; const pairedOut = new Set<string>();
  for (let m = 5 * 60; m <= startMin; m += 1) {
    while (i < arrivals.length && arrivals[i].at <= m) {
      const a = arrivals[i++]; const b = a.booking; const load = a.walk ?? b!.load; const pallets = b?.pallets ?? 10 + Math.floor(r() * 18); const dir: Direction = b?.dir ?? "in";
      const jobs: JobSpec[] = [{ dir, ref: b?.ref, load, pallets }];
      if (b && dir === "in" && r() > 0.85) { const o = bookings.find((x) => x.dir === "out" && x.slot >= startMin + 20 && x.slot < startMin + 200 && !pairedOut.has(x.ref)); if (o) { jobs.push({ dir: "out", ref: o.ref, load: o.load, pallets: o.pallets }); pairedOut.add(o.ref); } }
      s = checkIn(s, { rego: REGOS[(i * 3) % REGOS.length], driver: DRIVERS[i % DRIVERS.length], phone: `04${Math.floor(10000000 + r() * 89999999)}`, carrier: b?.carrier ?? "adhoc", ...truck(load, pallets), tailLift: r() > 0.9 && ["van", "rigid"].includes(suggestClass(load, pallets)), urgent: r() > 0.92, jobs }, m).state;
    }
    s = advance({ ...s, auto: true }, m, 0);
  }
  return { ...s, auto: false, log: [] };
}
export function randomArrival(s: State, now: number): State {
  const r = rng(s.seq * 977 + 3); const dir: Direction = r() > 0.45 ? "in" : "out";
  const b = s.bookings.find((x) => x.dir === dir && !refInUse(s, x.ref) && x.slot - now < 60 && x.slot - now > -60);
  const loads: LoadClass[] = ["ambient", "ambient", "chilled", "frozen", "dg"]; const walk = !b || r() > 0.75; const load = walk ? loads[Math.floor(r() * loads.length)] : b!.load; const pallets = walk ? 4 + Math.floor(r() * 24) : b!.pallets;
  return checkIn(s, { rego: REGOS[(s.seq + 3) % REGOS.length], driver: DRIVERS[(s.seq + 5) % DRIVERS.length], phone: "0400000000", carrier: walk ? "adhoc" : b!.carrier, ...truck(load, pallets), tailLift: false, jobs: [{ dir: walk ? "in" : dir, ref: walk ? undefined : b!.ref, load, pallets }] }, now).state;
}
