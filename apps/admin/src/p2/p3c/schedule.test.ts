import { describe, expect, it } from "vitest";
import { availRanges, buildCron, describeCron, emptyAvail, expandRRule, formatRRule, makeSlots, nextRuns, parseCron, parseRRule, workWeek, copyDay, availHours, describeRRule } from "./schedule.ts";

describe("cron", () => {
  it("parses lists, ranges, steps and names", () => { const p = parseCron("*/15 9-17 * JAN,MAR MON-FRI"); expect(p.ok && p.sets[0]).toEqual([0, 15, 30, 45]); expect(p.ok && p.sets[3]).toEqual([1, 3]); expect(p.ok && p.sets[4]).toEqual([1, 2, 3, 4, 5]); });
  it("normalises 7 to Sunday and expands @aliases", () => { const p = parseCron("0 0 * * 7"); expect(p.ok && p.sets[4]).toEqual([0]); expect(parseCron("@daily")).toMatchObject({ ok: true, expr: "0 0 * * *" }); });
  it("rejects bad input with a field-specific message", () => { expect(parseCron("61 * * * *")).toMatchObject({ ok: false, field: 0 }); expect(parseCron("* * *")).toMatchObject({ ok: false }); expect(parseCron("a b c d e")).toMatchObject({ ok: false }); expect(parseCron("*/0 * * * *")).toMatchObject({ ok: false }); });
  it("describes in words", () => { expect(describeCron("*/5 * * * *")).toBe("Every 5 minutes"); expect(describeCron("30 9 * * 1-5")).toBe("At 09:30, on Monday, Tuesday, Wednesday, Thursday and Friday"); expect(describeCron("0 0 1 * *")).toContain("day 1 of the month"); });
  it("computes next runs in order, including a day-of-week rule", () => {
    const from = new Date("2026-03-04T10:00:00Z"); // Wednesday
    expect(nextRuns("30 9 * * 1", from, 2).map((d) => d.toISOString())).toEqual(["2026-03-09T09:30:00.000Z", "2026-03-16T09:30:00.000Z"]);
    expect(nextRuns("0 12 * * *", from, 2).map((d) => d.toISOString())).toEqual(["2026-03-04T12:00:00.000Z", "2026-03-05T12:00:00.000Z"]);
    expect(nextRuns("0 0 29 2 *", from, 1)[0].toISOString()).toBe("2028-02-29T00:00:00.000Z");
  });
  it("builds expressions from presets", () => { const o = { every: 10, minute: 5, hour: 7, days: [3, 1], dom: 15 }; expect(buildCron("minutes", o)).toBe("*/10 * * * *"); expect(buildCron("weekly", o)).toBe("5 7 * * 1,3"); expect(buildCron("monthly", o)).toBe("5 7 15 * *"); expect(parseCron(buildCron("daily", o)).ok).toBe(true); });
});
describe("recurrence rule", () => {
  it("round-trips and describes", () => { const r = parseRRule("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;COUNT=6"); expect(typeof r).toBe("object"); if (typeof r === "string") return; expect(formatRRule(r)).toBe("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;COUNT=6"); expect(describeRRule(r)).toBe("Every 2 weeks on Monday and Wednesday, 6 times"); });
  it("reports invalid rules", () => { expect(parseRRule("FREQ=HOURLY")).toMatch(/FREQ/); expect(parseRRule("FREQ=DAILY;INTERVAL=0")).toMatch(/INTERVAL/); });
  it("expands every other week on given days", () => { const r = parseRRule("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE")!; expect(expandRRule(r as never, "2026-03-02", 4)).toEqual(["2026-03-02", "2026-03-04", "2026-03-16", "2026-03-18"]); });
  it("handles nth weekday, last weekday and COUNT/UNTIL", () => {
    expect(expandRRule({ freq: "MONTHLY", interval: 1, byDay: ["2TU"] }, "2026-03-01", 3)).toEqual(["2026-03-10", "2026-04-14", "2026-05-12"]);
    expect(expandRRule({ freq: "MONTHLY", interval: 1, byDay: ["-1FR"] }, "2026-03-01", 2)).toEqual(["2026-03-27", "2026-04-24"]);
    expect(expandRRule({ freq: "DAILY", interval: 1, byDay: [], count: 3 }, "2026-03-01", 10)).toHaveLength(3); expect(expandRRule({ freq: "DAILY", interval: 1, byDay: [], until: "2026-03-03" }, "2026-03-01", 10)).toHaveLength(3);
  });
});
describe("availability and slots", () => {
  it("collapses hours into ranges and counts them", () => { const a = workWeek(); expect(availRanges(a)[0]).toEqual(["09:00-12:00", "13:00-17:00"]); expect(availRanges(a)[5]).toEqual([]); expect(availHours(a)).toBe(35); });
  it("handles a block that runs to midnight and copying a day", () => { const a = emptyAvail(); for (let h = 20; h < 24; h++) a[0][h] = true; expect(availRanges(a)[0]).toEqual(["20:00-00:00"]); expect(copyDay(a, 0, [2])[2][21]).toBe(true); });
  it("generates slots of the requested length only where available", () => { const a = emptyAvail(); a[1][9] = true; const s = makeSlots("2026-03-02", a, 30); expect(s.map((x) => x.id)).toEqual(["2026-03-03T09:00", "2026-03-03T09:30"]); });
});
