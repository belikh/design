import { describe, expect, it } from "vitest";
import * as O from "./ops.logic.ts";

const base = (): O.Incident => ({ id: "I1", title: "PXE down", sev: 2, status: "investigating", startedAt: 0, events: [], responders: [], summary: "", cause: "", followUps: [] });
describe("incident workflow", () => {
  it("only allows valid transitions", () => { expect(O.changeStatus(base(), "monitoring", 1, "a").error).toMatch(/Can’t go/); expect(O.changeStatus(base(), "identified", 60000, "a").inc.status).toBe("identified"); });
  it("requires a summary and a commander to resolve", () => {
    let i: O.Incident = { ...base(), status: "monitoring" }; expect(O.changeStatus(i, "resolved", 1, "a").error).toBe("Add a summary before resolving");
    i = { ...i, summary: "Fixed" }; expect(O.changeStatus(i, "resolved", 1, "a").error).toBe("Assign an incident commander first");
    i = O.assign(i, "Ava", "commander", 2, "a"); const r = O.changeStatus(i, "resolved", 600000, "Ava"); expect(r.inc.status).toBe("resolved"); expect(O.durationMin(r.inc, 999999999)).toBe(10);
  });
  it("keeps a single commander and logs events newest-first", () => { let i = O.assign(base(), "A", "commander", 1, "x"); i = O.assign(i, "B", "commander", 2, "x"); expect(i.responders.filter((r) => r.role === "commander").map((r) => r.name)).toEqual(["B"]); expect(i.events[0].text).toMatch(/B joined/); });
  it("computes time-to-status and builds a postmortem", () => {
    let i = base(); i = O.changeStatus(i, "identified", 5 * 60000, "a").inc; expect(O.timeToStatus(i, "identified")).toBe(5); expect(O.pmReady(i)).toBe(false);
    const md = O.postmortem({ ...i, summary: "S", cause: "C", followUps: [{ text: "Alert on X", done: true }] }, (t) => `T+${t / 60000}`); expect(md).toMatch(/# Postmortem: PXE down/); expect(md).toMatch(/- \[x\] Alert on X/); expect(md).toMatch(/T\+5 Status: investigating → identified/);
  });
});
describe("runbook", () => {
  const steps: O.RStep[] = [{ id: "a", title: "Drain", kind: "manual" }, { id: "b", title: "Migrate", kind: "command", cmd: "migrate", destructive: true }, { id: "c", title: "Verify", kind: "manual" }];
  it("enforces step order and logs results", () => { let r = O.newRun(); expect(O.completeStep(steps, r, "b", "ok", 1)).toBe(r); r = O.completeStep(steps, r, "a", "ok", 1); expect(O.currentStep(steps, r)?.id).toBe("b"); expect(O.runStatus(steps, r)).toBe("in progress"); expect(r.log[0].msg).toBe("Drain: ok"); });
  it("aborts when a destructive step fails, and reports final status", () => { let r = O.completeStep(steps, O.newRun(), "a", "ok", 1); r = O.completeStep(steps, r, "b", "failed", 2); expect(r.aborted).toBe(true); expect(O.currentStep(steps, r)).toBeUndefined(); expect(O.runStatus(steps, r)).toBe("aborted"); });
  it("finishes with failures when a non-destructive step fails", () => { let r = O.newRun(); r = O.completeStep(steps, r, "a", "failed", 1); r = O.completeStep(steps, r, "b", "ok", 2); r = O.completeStep(steps, r, "c", "ok", 3); expect(O.runStatus(steps, r)).toBe("finished with failures"); expect(O.simulateCommand("rm -rf /").ok).toBe(false); expect(O.simulateCommand("uptime").ok).toBe(true); });
});
describe("device health", () => {
  it("rolls reasons up to the worst level", () => { expect(O.deviceHealth({ cpu: 20, mem: 40, temp: 40, rssi: -50, uptimeH: 1 })).toEqual({ status: "ok", reasons: [] }); expect(O.deviceHealth({ cpu: 80, mem: 40, temp: 40, rssi: -90, uptimeH: 1 })).toMatchObject({ status: "warn", reasons: ["CPU 80%", "Weak signal -90 dBm"] }); expect(O.deviceHealth({ cpu: 95, mem: 50, temp: 85, rssi: -50, uptimeH: 1 }).status).toBe("danger"); expect(O.needsTypedConfirm("reset")).toBe(true); expect(O.needsTypedConfirm("reboot")).toBe(false); });
});
