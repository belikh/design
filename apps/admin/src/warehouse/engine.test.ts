import { describe, expect, it } from "vitest";
import { canUse, classOf, suggestClass, TIMING, accept, ackDiscrepancy, addLine, advance, arrive, autoCall, blockDock, callTo, checkIn, clear, clearBlockers, configDock, depart, DEFAULT_WEIGHTS, eligibleFreeDocks, finishWork, fit, kpis, markLine, noShow, occupant, rank, reject, requeue, score, seed, setUrgent, setChecks, setSeal, setWeights, startWork, tally, jobOf, workMin, type CheckInForm, type State, type Ticket } from "./engine.ts";

const base = (): State => ({ ...seed(8 * 60), tickets: [], seq: 0, log: [], auto: false, simStaff: false, simFork: false, docks: seed(8 * 60).docks.map((d) => ({ ...d, claimed: undefined })) });
const form = (o: Partial<CheckInForm> = {}): CheckInForm => ({ rego: "1AB 2CD", driver: "Sam", phone: "0412345678", carrier: "adhoc", cls: "rigid", height: 3.6, cube: 38, tailLift: false, jobs: [{ dir: "in", load: "ambient", pallets: 10 }], ...o });
const T0 = 9 * 60;
const ci = (s: State, o: Partial<CheckInForm> = {}, now = T0) => { const r = checkIn(s, form(o), now); return { s: r.state, t: r.ticket! }; };
/** Walk a ticket from called to the dock with every acceptance check satisfied. */
const toAccepted = (s: State, id: string, dock: number, now = T0) => {
  s = callTo(s, id, dock, now); s = arrive(s, id, now + TIMING.approach);
  const j = jobOf(s.tickets.find((t) => t.id === id)!); s = setChecks(s, id, { paperwork: true, seal: true, inspect: true, ...(j.load === "frozen" ? { temp: -19 } : j.load === "chilled" ? { temp: 3 } : {}) });
  return accept(s, id, now + TIMING.approach + 1);
};
const get = (s: State, id: string): Ticket => s.tickets.find((t) => t.id === id)!;
const doWork = (s: State, id: string, now: number) => { s = startWork(s, id, now); for (const l of jobOf(get(s, id)).lines) s = markLine(s, id, l.id, "ok"); return finishWork(s, id, now + 10); };

describe("priority engine", () => {
  it("ranks frozen above ambient, and booked-on-slot above walk-in", () => {
    let s = base(); const w = ci(s, { rego: "WALK" }); s = w.s;
    s = ci(s, { rego: "FRZ", cls: "reefer", height: 4.1, cube: 70, jobs: [{ dir: "in", load: "frozen", pallets: 10 }] }).s;
    const ref = s.bookings.find((b) => b.dir === "in" && b.slot === 9 * 60)!;
    s = ci(s, { rego: "BOOKED", carrier: ref.carrier, jobs: [{ dir: "in", ref: ref.ref, load: ref.load, pallets: ref.pallets }] }).s;
    const q = rank(s, T0).map((r) => r.t.rego);
    expect(q.indexOf("FRZ")).toBeLessThan(q.indexOf("WALK")); expect(q.indexOf("BOOKED")).toBeLessThan(q.indexOf("WALK"));
  });
  it("lists every contribution to a score", () => {
    const { s, t } = ci(base(), { urgent: true, jobs: [{ dir: "in", load: "chilled", pallets: 10 }] });
    const r = score(get(s, t.id), T0 + 50, DEFAULT_WEIGHTS); const labels = r.parts.map((p) => p.label).join("|");
    expect(labels).toMatch(/Waited/); expect(labels).toMatch(/Chilled/); expect(labels).toMatch(/urgent/i); expect(labels).toMatch(/SLA/);
    expect(r.parts.reduce((a, p) => a + p.points, 0)).toBeCloseTo(r.score, 0);
  });
  it("changing the weights re-ranks live", () => {
    let s = base(); s = ci(s, { rego: "AMB", urgent: true }).s; s = ci(s, { rego: "FRZ", cls: "reefer", height: 4.1, cube: 70, jobs: [{ dir: "in", load: "frozen", pallets: 10 }] }).s;
    expect(rank(s, T0)[0].t.rego).toBe("FRZ"); s = setWeights(s, { urgent: 90 }); expect(rank(s, T0)[0].t.rego).toBe("AMB");
  });
  it("seeds a believable morning: a queue, busy docks and a blocked dock", () => {
    const s = seed(); const k = kpis(s, 8 * 60 + 40);
    expect(k.waiting).toBeGreaterThan(2); expect(s.docks.some((d) => d.status === "blocked")).toBe(true); expect(s.docks.some((d) => occupant(s, d.id))).toBe(true);
    expect(s.tickets.some((t) => t.status === "departed")).toBe(true);
  });
  it("seeds trucks that all have a dock they could use, so nothing waits forever", () => {
    const s = seed(); const stuck = rank(s, 8 * 60 + 40).filter((r) => !s.docks.some((d) => d.status === "open" && canUse(d, r.t)));
    expect(stuck.map((r) => `${r.t.rego} ${r.noFit[0]}`)).toEqual([]);
  });
  it("seeds some trucks that deliver and collect in one visit", () => { const s = seed(); expect(s.tickets.some((t) => t.jobs.length === 2)).toBe(true); });
  it("every load class and direction has at least one open dock that takes a typical truck", () => {
    const s = seed();
    for (const dir of ["in", "out"] as const) for (const load of ["ambient", "chilled", "frozen", "dg"] as const) for (const pallets of [4, 6, 8, 14, 20, 26, 40]) {
      const cls = suggestClass(load, pallets), c = classOf(cls); const t = { cls, height: c.height, cube: c.cube, tailLift: false };
      expect(s.docks.some((d) => d.status === "open" && fit(d, t, { dir, load }).length === 0), `${dir} ${load} ${pallets} pallets (${cls})`).toBe(true);
    }
  });
});

describe("fit: a hard gate with a reason for every mismatch", () => {
  const s = base(); const d = (n: number) => s.docks.find((x) => x.id === n)!;
  const truck = { cls: "rigid" as const, height: 3.6, cube: 38, tailLift: false };
  it("passes a matching truck", () => expect(fit(d(2), truck, { dir: "in", load: "ambient" })).toEqual([]));
  it("rejects the wrong direction", () => expect(fit(d(2), truck, { dir: "out", load: "ambient" })).toEqual([expect.stringMatching(/not set up for outbound/)]));
  it("rejects the wrong contents", () => expect(fit(d(2), truck, { dir: "in", load: "frozen" })).toEqual([expect.stringMatching(/cannot take frozen/)]));
  it("rejects a class that is not allowed", () => expect(fit(d(2), { ...truck, cls: "van", height: 2.4, cube: 12 }, { dir: "in", load: "ambient" })).toEqual([expect.stringMatching(/Van not allowed/)]));
  it("rejects a trailer that is too tall", () => expect(fit(d(4), { ...truck, cls: "semi", height: 4.4, cube: 80 }, { dir: "in", load: "chilled" })).toEqual([expect.stringMatching(/4.4 m is over the 4.3 m/)]));
  it("rejects a volume over the dock maximum", () => expect(fit(d(3), { ...truck, cls: "semi", height: 4.3, cube: 120 }, { dir: "in", load: "ambient" })).toEqual([expect.stringMatching(/120 m³ is over the 90/)]));
  it("sends tail-lift trucks to a ground-level bay only", () => { const t = { ...truck, tailLift: true }; expect(fit(d(2), t, { dir: "in", load: "ambient" })).toEqual([expect.stringMatching(/ground-level/)]); expect(fit(d(9), t, { dir: "in", load: "ambient" })).toEqual([]); });
  it("treats a blocked dock as unusable", () => expect(fit(d(8), truck, { dir: "in", load: "ambient" })[0]).toMatch(/blocked/));
  it("never calls a truck to a dock it does not fit (no override)", () => {
    let st = base(); const a = ci(st, { jobs: [{ dir: "in", load: "dg", pallets: 5 }] }); st = a.s;
    expect(eligibleFreeDocks(st, a.t).map((x) => x.id)).toEqual([3]); expect(callTo(st, a.t.id, 1, T0)).toBe(st); expect(callTo(st, a.t.id, 2, T0)).toBe(st);
  });
  it("shows why a truck fits no dock", () => {
    const { s: st, t } = ci(base(), { cls: "bdouble", height: 5.1, cube: 150 }); const r = rank(st, T0).find((x) => x.t.id === t.id)!;
    expect(r.etaCall).toBeNull(); expect(r.noFit.join(" ")).toMatch(/limit/);
  });
  it("picks the least flexible fitting dock when auto-calling", () => {
    const { s: st, t } = ci(base(), { jobs: [{ dir: "in", load: "ambient", pallets: 10 }] }); const after = autoCall(st, T0);
    expect(get(after, t.id).dock).toBe(2); // plain inbound-only dock, not the two-way dock 1 or the DG dock 3
  });
});

describe("full lifecycle", () => {
  it("walks a delivery: call, approach, accept, unload, clear, depart; the dock frees only at departure", () => {
    let s = base(); const b = s.bookings.find((x) => x.dir === "in" && x.load === "ambient")!; const { s: s1, t } = ci(s, { jobs: [{ dir: "in", ref: b.ref, load: "ambient", pallets: b.pallets }] }); s = callTo(s1, t.id, 1, T0); expect(occupant(s, 1)?.id).toBe(t.id);
    s = advance(s, T0 + 1, 0); expect(get(s, t.id).status).toBe("called"); // still approaching
    s = advance(s, T0 + TIMING.approach + 0.1, 0); expect(get(s, t.id).status).toBe("onDock");
    s = setChecks(s, t.id, { paperwork: true, seal: true }); s = accept(s, t.id, T0 + 4); expect(get(s, t.id).status).toBe("accepted");
    s = doWork(s, t.id, T0 + 5); expect(get(s, t.id).status).toBe("complete"); expect(occupant(s, 1)?.id).toBe(t.id);
    s = ackDiscrepancy(s, t.id); s = clear(s, t.id, T0 + 16); expect(get(s, t.id).status).toBe("cleared"); expect(occupant(s, 1)?.id).toBe(t.id);
    s = depart(s, t.id, T0 + 18); expect(get(s, t.id).status).toBe("departed"); expect(occupant(s, 1)).toBeUndefined();
  });
  it("takes at least two minutes to back up to the dock", () => {
    const { s: s1, t } = ci(base()); let s = callTo(s1, t.id, 1, T0); s = advance(s, T0 + 1.9, 0); expect(get(s, t.id).status).toBe("called");
    expect(TIMING.approach).toBeGreaterThanOrEqual(2);
  });
  it("cannot accept until the checks are done; chilled needs a legal temperature", () => {
    let s = base(); const { s: s1, t } = ci(s, { jobs: [{ dir: "in", load: "chilled", pallets: 6 }] }); s = callTo(s1, t.id, 4, T0); s = arrive(s, t.id, T0 + 3);
    expect(accept(s, t.id, T0 + 4)).toBe(s);
    s = setChecks(s, t.id, { paperwork: true, seal: true }); expect(accept(s, t.id, T0 + 4)).toBe(s); // no temperature yet
    s = setChecks(s, t.id, { temp: 9 }); expect(accept(s, t.id, T0 + 4)).toBe(s); // too warm
    s = setChecks(s, t.id, { temp: 3 }); expect(get(accept(s, t.id, T0 + 4), t.id).status).toBe("accepted");
  });
  it("the forklift cannot start before acceptance, nor finish with pallets unchecked", () => {
    let s = base(); const ref = s.bookings.find((b) => b.dir === "in" && b.load === "ambient")!; const { s: s1, t } = ci(s, { jobs: [{ dir: "in", ref: ref.ref, load: "ambient", pallets: ref.pallets }] }); s = callTo(s1, t.id, 1, T0); s = arrive(s, t.id, T0 + 3);
    expect(startWork(s, t.id, T0 + 4)).toBe(s);
    s = toAccepted(s1, t.id, 1); s = startWork(s, t.id, T0 + 5); expect(get(s, t.id).status).toBe("working");
    expect(finishWork(s, t.id, T0 + 6)).toBe(s); // nothing checked yet
    const lines = jobOf(get(s, t.id)).lines; s = markLine(s, t.id, lines[0].id, "ok"); expect(finishWork(s, t.id, T0 + 7)).toBe(s);
  });
  it("a reject frees the dock after the truck leaves, and needs no discrepancy review", () => {
    let s = base(); const { s: s1, t } = ci(s); s = callTo(s1, t.id, 1, T0); s = arrive(s, t.id, T0 + 3); s = reject(s, t.id, "Seal broken", T0 + 4);
    expect(get(s, t.id).status).toBe("complete"); expect(jobOf(get(s, t.id)).outcome).toBe("rejected"); expect(clearBlockers(jobOf(get(s, t.id)))).toEqual([]);
    s = clear(s, t.id, T0 + 5); s = depart(s, t.id, T0 + 7); expect(occupant(s, 1)).toBeUndefined();
  });
  it("no-show frees the dock and can be re-queued at the back", () => {
    let s = base(); const { s: s1, t } = ci(s); s = callTo(s1, t.id, 1, T0); s = noShow(s, t.id, T0 + 1); expect(occupant(s, 1)).toBeUndefined();
    s = requeue(s, t.id, T0 + 20); expect(get(s, t.id).status).toBe("waiting"); expect(get(s, t.id).arrivedAt).toBe(T0 + 20);
  });
  it("a no-show cannot be re-queued twice or from another state", () => { const { s, t } = ci(base()); expect(requeue(s, t.id, T0)).toBe(s); });
});

describe("discrepancies: booked, declared and received are kept apart", () => {
  it("keeps what the driver declared separate from the booking and flags it", () => {
    const s = base(); const b = s.bookings.find((x) => x.dir === "in" && x.load === "ambient")!;
    const { s: s1, t } = ci(s, { jobs: [{ dir: "in", ref: b.ref, load: "chilled", pallets: b.pallets + 2 }] }); const j = jobOf(get(s1, t.id));
    expect(j.booked).toBe(b.pallets); expect(j.declared).toBe(b.pallets + 2); expect(j.load).toBe("chilled"); expect(j.bookedLoad).toBe("ambient"); expect(tally(j).issues.join()).toMatch(/declared Chilled, booked Ambient/);
  });
  it("reports short and damaged pallets and blocks clearing until the clerk reviews them", () => {
    let s = base(); const b = s.bookings.find((x) => x.dir === "in" && x.load === "ambient")!; const { s: s1, t } = ci(s, { jobs: [{ dir: "in", ref: b.ref, load: "ambient", pallets: b.pallets }] });
    s = toAccepted(s1, t.id, 1); s = startWork(s, t.id, T0 + 5); const lines = jobOf(get(s, t.id)).lines;
    lines.forEach((l, i) => { s = markLine(s, t.id, l.id, i === 0 ? "damaged" : i === 1 ? "missing" : "ok"); }); s = finishWork(s, t.id, T0 + 30);
    const j = jobOf(get(s, t.id)); expect(tally(j).discrepancy).toBe(true); expect(tally(j).issues.join()).toMatch(/damaged/);
    expect(clear(s, t.id, T0 + 31)).toBe(s); s = ackDiscrepancy(s, t.id); expect(get(clear(s, t.id, T0 + 31), t.id).status).toBe("cleared");
  });
  it("walk-ins are a blind count: the operator adds pallets as they are counted", () => {
    let s = base(); const { s: s1, t } = ci(s, { jobs: [{ dir: "in", load: "ambient", pallets: 2 }] }); expect(jobOf(get(s1, t.id)).blind).toBe(true);
    s = toAccepted(s1, t.id, 1); s = startWork(s, t.id, T0 + 5); expect(finishWork(s, t.id, T0 + 6)).toBe(s); s = addLine(s, t.id); s = addLine(s, t.id);
    s = finishWork(s, t.id, T0 + 9); expect(get(s, t.id).status).toBe("complete"); expect(tally(jobOf(get(s, t.id))).handled).toBe(2);
  });
  it("blocks the same booking checking in twice", () => {
    const s = base(); const b = s.bookings.find((x) => x.dir === "in")!; const a = checkIn(s, form({ jobs: [{ dir: "in", ref: b.ref, load: b.load, pallets: b.pallets }] }), T0);
    expect(a.error).toBeNull(); const dup = checkIn(a.state, form({ rego: "DUP", jobs: [{ dir: "in", ref: b.ref, load: b.load, pallets: b.pallets }] }), T0); expect(dup.ticket).toBeNull(); expect(dup.error).toMatch(/already checked in/);
  });
});

describe("outbound despatch", () => {
  const out = (s: State) => s.bookings.find((b) => b.dir === "out" && b.load === "ambient")!;
  it("needs the pick note and a trailer inspection to accept, and a seal number to clear", () => {
    let s = base(); const b = out(s); const { s: s1, t } = ci(s, { jobs: [{ dir: "out", ref: b.ref, load: "ambient", pallets: b.pallets }] }); s = callTo(s1, t.id, 7, T0); s = arrive(s, t.id, T0 + 3);
    s = setChecks(s, t.id, { paperwork: true }); expect(accept(s, t.id, T0 + 4)).toBe(s); s = setChecks(s, t.id, { inspect: true }); s = accept(s, t.id, T0 + 4); expect(get(s, t.id).status).toBe("accepted");
    s = doWork(s, t.id, T0 + 5); expect(clear(s, t.id, T0 + 20)).toBe(s); s = setSeal(s, t.id, "SL123456"); expect(get(clear(s, t.id, T0 + 20), t.id).status).toBe("cleared");
  });
  it("only goes to outbound docks", () => {
    const s = base(); const { s: s1, t } = ci(s, { jobs: [{ dir: "out", ref: out(s).ref, load: "ambient", pallets: 8 }] });
    expect(eligibleFreeDocks(s1, t).every((d) => d.dirs.includes("out"))).toBe(true); expect(callTo(s1, t.id, 2, T0)).toBe(s1);
  });
});

describe("a truck that delivers and collects", () => {
  const both = (s: State, dockFits: boolean) => {
    const b = s.bookings.find((x) => x.dir === "in" && x.load === "ambient")!, o = s.bookings.find((x) => x.dir === "out" && x.load === (dockFits ? "ambient" : "chilled"))!;
    return ci(s, { jobs: [{ dir: "in", ref: b.ref, load: "ambient", pallets: b.pallets }, { dir: "out", ref: o.ref, load: o.load, pallets: o.pallets }] });
  };
  it("stays on the dock when the dock also fits the second job", () => {
    let s = base(); const { s: s1, t } = both(s, true); s = toAccepted(s1, t.id, 1); s = doWork(s, t.id, T0 + 10); s = ackDiscrepancy(s, t.id); s = clear(s, t.id, T0 + 30);
    const x = get(s, t.id); expect(x.status).toBe("onDock"); expect(x.dock).toBe(1); expect(x.cur).toBe(1); expect(jobOf(x).dir).toBe("out"); expect(occupant(s, 1)?.id).toBe(t.id);
  });
  it("re-queues keeping its arrival time when the dock cannot take the second job", () => {
    let s = base(); const { s: s1, t } = both(s, false); s = toAccepted(s1, t.id, 1); s = doWork(s, t.id, T0 + 10); s = ackDiscrepancy(s, t.id); s = clear(s, t.id, T0 + 30);
    const x = get(s, t.id); expect(x.status).toBe("waiting"); expect(x.dock).toBeUndefined(); expect(x.arrivedAt).toBe(T0); expect(jobOf(x).dir).toBe("out"); expect(occupant(s, 1)).toBeUndefined();
  });
});

describe("dock setup", () => {
  it("lets a dock be reconfigured for another purpose, and then fits trucks it did not before", () => {
    let s = base(); const { s: s1, t } = ci(s, { jobs: [{ dir: "out", load: "ambient", pallets: 8 }] }); expect(eligibleFreeDocks(s1, t).map((d) => d.id)).not.toContain(2);
    s = configDock(s1, 2, { dirs: ["in", "out"] }); expect(eligibleFreeDocks(s, t).map((d) => d.id)).toContain(2);
  });
  it("locks setup and blocking while a truck is on the dock", () => {
    let s = base(); const { s: s1, t } = ci(s); s = callTo(s1, t.id, 2, T0);
    expect(configDock(s, 2, { maxHeight: 2 })).toBe(s); expect(blockDock(s, 2, true)).toBe(s); expect(blockDock(s, 3, true).docks[2].status).toBe("blocked");
  });
});

describe("staff controls", () => {
  it("only staff can flag a waiting truck urgent, and it changes its rank", () => {
    let s = base(); s = ci(s, { rego: "A" }).s; const b = ci(s, { rego: "B" }); s = b.s; expect(rank(s, T0)[0].t.rego).toBe("A"); s = setUrgent(s, b.t.id, true); expect(rank(s, T0)[0].t.rego).toBe("B");
    expect(setUrgent(s, b.t.id, true)).toBe(s);
  });
  it("does not flood the activity log while a dock is being renamed", () => { let s = base(); const n = s.log.length; s = configDock(s, 2, { name: "Dock 2 north" }); expect(s.log.length).toBe(n); expect(s.docks[1].name).toBe("Dock 2 north"); s = configDock(s, 2, { maxHeight: 4 }); expect(s.log.length).toBe(n + 1); });
});

describe("simulated people and forecasts", () => {
  it("with simulated staff and forklift a seeded truck flows all the way to departure", () => {
    let s: State = { ...base(), simStaff: true, simFork: true, auto: true }; const { s: s1, t } = ci(s, { jobs: [{ dir: "in", load: "ambient", pallets: 4 }] }); s = autoCall(s1, T0); let now = T0;
    for (let i = 0; i < 80 && get(s, t.id).status !== "departed"; i++) { now += 1; s = advance(s, now, 0); }
    expect(get(s, t.id).status).toBe("departed"); expect(occupant(s, get(s, t.id).dock!)).toBeUndefined();
  });
  it("does not play the people on a dock a human has just used", () => {
    let s: State = { ...base(), simStaff: true, simFork: true }; const { s: s1, t } = ci(s); s = callTo(s1, t.id, 1, T0); s = arrive(s, t.id, T0 + 3); s = { ...s, docks: s.docks.map((d) => (d.id === 1 ? { ...d, claimed: 1000 } : d)) };
    s = advance(s, T0 + 20, 1000 + 10_000); expect(get(s, t.id).status).toBe("onDock");
  });
  it("forecasts ETAs from the stage each dock is in", () => {
    let s = base(); for (let i = 0; i < 6; i++) s = ci(s, { rego: `A${i}`, jobs: [{ dir: "in", load: "ambient", pallets: 20 }] }, T0 + i).s;
    s = autoCall({ ...s, auto: true }, T0 + 6); const q = rank(s, T0 + 6).filter((r) => r.etaCall !== null);
    expect(q.length).toBeGreaterThan(0); expect(q[0].etaCall!).toBeGreaterThan(workMin({ declared: 20, lines: [], load: "ambient" }) - 1);
  });
});
