import { describe, expect, it } from "vitest";
import { uptime, errorBudget, evaluateRule, onCallAt, mttr, INCIDENTS, PEOPLE, ROTA_START, type DayState } from "./service-health.data.ts";
import { energySummary, lowBattery, successRate, ENTITIES, AUTOMATIONS } from "./home-automation.data.ts";
import { daysUntilFull, smartHealth, runtimeMin, drifted, poolStatus, POOLS, UPS, HOSTS, type Smart } from "./hosts-storage.data.ts";
import { changelog, nextVersion, runStatus, RUNS } from "./ci-deploys.data.ts";
import { certStatus, validateRecord, toZone, ZONE, needsAction, CERTS } from "./certs-dns.data.ts";
import { filterTracks, validateMeta, move, totalSeconds, TRACKS, fmtDur } from "./media.data.ts";
import { funnel, stageConversion, stats, APPS } from "./job-pipeline.data.ts";
import { effective, can, makeKey, filterAudit, ROLES, USERS, successRate as hookRate, HOOKS } from "./access.data.ts";
import { totals, tieredCost, effectiveStatus, validateInvoice, outstanding, INVOICES } from "./billing.data.ts";
import { queueWaitMin, testState, gaps, coverageAt, requiredAt, LANES, EQUIP, ROSTER } from "./airport-ops.data.ts";
import { daysCover, reorderStatus, suggestedOrder, reconcile, SKUS } from "./warehouse-ops.data.ts";
import { collectionsOn, nextCollection, nearestWithSpace, searchDatasets, occupancy, level, ZONES, CARPARKS, DATASETS } from "./council.data.ts";
import { cmpVersion, assignRings, runRing, DEVICES, bestProxy, BLE, type Rollout } from "./esp-fleet.data.ts";
import { contrastReport, filterGraphics, consumersByVersion, CONSUMERS } from "./design-system.data.ts";
import { texEscape, invoiceTex, letterTex, LETTERS } from "./documents.data.ts";
import { cost, passRate, regressions, renderPrompt, extractVars, EVALS, SESSIONS, PRICES, tokensIn, tokensOut } from "./agent-runs.data.ts";
import { daysUntil, NOW } from "./lib.ts";

describe("G001 service health", () => {
  it("computes uptime and error budget from daily states", () => {
    const days: DayState[] = [...Array(98).fill("ok"), "warn", "down"]; // 14 + 120 min down in 100 days
    expect(uptime(days)).toBeCloseTo(1 - 134 / (100 * 1440), 6);
    const eb = errorBudget(days, 0.999); expect(eb.allowed).toBeCloseTo(144, 6); expect(eb.used).toBe(134); expect(eb.remaining).toBeCloseTo(10, 6); expect(eb.burn).toBeCloseTo(134 / 144, 6);
    expect(errorBudget([...Array(98).fill("ok"), "down", "down"] as DayState[], 0.999).remaining).toBeLessThan(0); // 240 min used of 144 allowed
  });
  it("ignores days with no data", () => { expect(uptime(["none", "ok", "ok"])).toBe(1); });
  it("fires a rule only after the condition holds for the full duration", () => {
    const series = [1, 9, 9, 9, 1, 9, 1, 9, 9, 9, 9]; // step 15 min; need 45 min => 3 consecutive samples
    const f = evaluateRule({ op: ">", threshold: 5, forMin: 45 }, series, 15); expect(f).toEqual([{ from: 1, to: 3 }, { from: 7, to: 10 }]);
    expect(evaluateRule({ op: "<", threshold: 5, forMin: 30 }, [9, 1, 1, 9], 15)).toEqual([{ from: 1, to: 2 }]);
  });
  it("rotates on-call weekly, with overrides", () => {
    expect(onCallAt(ROTA_START).person.id).toBe(PEOPLE[0].id); expect(onCallAt(new Date(ROTA_START.getTime() + 7 * 864e5)).person.id).toBe(PEOPLE[1].id);
    const o = onCallAt(NOW, [{ from: NOW.getTime() - 1, to: NOW.getTime() + 1000, person: "liam" }]); expect(o.person.id).toBe("liam"); expect(o.override).toBe(true);
  });
  it("computes MTTR over resolved incidents only", () => { expect(mttr(INCIDENTS)).toBeGreaterThan(0); expect(mttr(INCIDENTS.filter((i) => !i.end))).toBe(0); });
});
describe("G003 home automation", () => {
  it("summarises energy: import/export split, cost and self-use", () => {
    const s = energySummary([1, -0.5, 2, -1], [0, 1.5, 0, 2], [1, 1, 2, 1], 0.3, 0.05); // 0.5h samples
    expect(s.importKwh).toBeCloseTo(1.5); expect(s.exportKwh).toBeCloseTo(0.75); expect(s.cost).toBeCloseTo(1.5 * 0.3 - 0.75 * 0.05); expect(s.selfUse).toBeCloseTo(1 - 0.75 / 1.75);
  });
  it("finds low batteries sorted worst first and automation success", () => { const low = lowBattery(ENTITIES); expect(low[0].battery).toBeLessThanOrEqual(20); expect(low.every((e) => e.battery! <= 20)).toBe(true); expect(successRate({ ...AUTOMATIONS[0], runs7d: 10, failures7d: 1 })).toBeCloseTo(0.9); });
});
describe("G004 hosts and storage", () => {
  it("forecasts days until full and grades pools", () => { const p = POOLS[0]; expect(daysUntilFull(p)).toBe(Math.floor(((p.sizeTb - p.usedTb) * 1000) / p.growthGbPerDay)); expect(daysUntilFull({ ...p, growthGbPerDay: 0 })).toBeNull(); expect(poolStatus(POOLS[2])).toBe("danger"); });
  it("grades SMART health", () => {
    const base: Smart = { id: "x", host: "h", model: "m", serial: "s", ageHours: 1, tempC: 30, reallocated: 0, pending: 0, crcErrors: 0, kind: "HDD" };
    expect(smartHealth(base).verdict).toBe("healthy"); expect(smartHealth({ ...base, reallocated: 5 }).verdict).toBe("watch"); expect(smartHealth({ ...base, pending: 1 }).verdict).toBe("replace"); expect(smartHealth({ ...base, kind: "SSD", wearPct: 85 }).verdict).toBe("replace");
  });
  it("estimates UPS runtime from load and detects drift", () => { expect(runtimeMin({ ...UPS, loadW: 400, batteryWh: 800, batteryPct: 100 }, 1, 1)).toBeCloseTo(120); expect(runtimeMin({ ...UPS, loadW: 0 })).toBe(Infinity); expect(HOSTS.filter(drifted).length).toBeGreaterThan(0); });
});
describe("G005 CI and deploys", () => {
  it("groups conventional commits and picks the next version", () => {
    const g = changelog(["feat(ui): add zoom", "fix: clip", "docs: readme", "weird message"]); expect(g.Features[0]).toEqual({ scope: "ui", text: "add zoom" }); expect(g.Fixes).toHaveLength(1); expect(g.Maintenance).toHaveLength(1);
    expect(nextVersion("1.3.2", ["fix: a"])).toBe("1.3.3"); expect(nextVersion("1.3.2", ["feat: a", "fix: b"])).toBe("1.4.0"); expect(nextVersion("1.3.2", ["feat!: break"])).toBe("2.0.0");
  });
  it("derives run status from stages", () => { expect(runStatus(RUNS[0])).toBe("running"); expect(runStatus(RUNS.find((r) => r.stages.some((s) => s.status === "failed"))!)).toBe("failed"); });
});
describe("G006 certificates and DNS", () => {
  it("grades expiry and flags manual renewals", () => { expect(daysUntil("2026-11-21")).toBe(9); expect(certStatus(CERTS[0]).level).toBe("danger"); expect(certStatus(CERTS[4]).level).toBe("expired"); expect(needsAction(CERTS[2])).toBe(true); expect(needsAction(CERTS[1])).toBe(false); });
  it("validates records in the context of the zone", () => {
    const ok = { name: "mail", type: "A" as const, value: "203.0.113.50", ttl: 300 }; expect(validateRecord(ok, ZONE)).toEqual([]);
    expect(validateRecord({ ...ok, value: "999.1.1.1" }, ZONE)).toContain("A records need an IPv4 address"); expect(validateRecord({ ...ok, name: "@", type: "CNAME", value: "x.example." }, ZONE).join()).toMatch(/apex/);
    expect(validateRecord({ ...ok, name: "www" }, ZONE)).toContain("A CNAME already exists with this name"); expect(validateRecord({ ...ZONE[2], id: "new" }, ZONE)).toContain("Duplicate record"); expect(validateRecord({ ...ok, ttl: 5 }, ZONE).join()).toMatch(/TTL/);
  });
  it("renders a stable zone file", () => { const z = toZone(ZONE); expect(z.startsWith("$ORIGIN jupiter.au.")).toBe(true); expect(z).toContain('"v=spf1'); expect(toZone([...ZONE].reverse())).toBe(z); });
});
describe("G007 media archive", () => {
  it("filters, sorts, validates and reorders", () => {
    expect(filterTracks(TRACKS, { q: "wombat", genre: "all", tag: "all", sort: "title" }).every((t) => t.artist === "Wombat Radio")).toBe(true); expect(filterTracks(TRACKS, { q: "", genre: "Blues", tag: "all", sort: "plays" }).map((t) => t.plays)).toEqual([24, 19]);
    expect(validateMeta({ title: " ", artist: "", year: 1800, sec: 0 })).toMatchObject({ title: expect.any(String), artist: expect.any(String), year: expect.any(String), sec: expect.any(String) }); expect(move(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]); expect(move(["a"], 0, -1)).toEqual(["a"]);
    expect(totalSeconds(["t1", "t2"], TRACKS)).toBe(214 + 188); expect(fmtDur(188)).toBe("3:08");
  });
});
describe("G008 job pipeline", () => {
  it("builds a non-increasing funnel and stage conversion", () => { const f = funnel(APPS).map((x) => x.count); for (let i = 1; i < f.length; i++) expect(f[i]).toBeLessThanOrEqual(f[i - 1]); expect(stageConversion(APPS).every((c) => c.rate >= 0 && c.rate <= 1)).toBe(true); });
  it("computes response rate", () => { const s = stats(APPS); expect(s.applied).toBe(APPS.filter((a) => a.appliedOn).length); expect(s.responseRate).toBeGreaterThan(0); expect(s.responseRate).toBeLessThanOrEqual(1); });
});
describe("G009 access and audit", () => {
  it("unions role permissions and zeroes deactivated users", () => { const mia = USERS.find((u) => u.id === "u3")!; const e = effective(mia, ROLES); expect(e.projects).toEqual(["read", "write"]); expect(e.billing).toEqual(["read", "write"]); expect(can(mia, ROLES, "billing", "write")).toBe(true); expect(can(mia, ROLES, "members", "read")).toBe(false); expect(can({ ...mia, active: false }, ROLES, "projects", "read")).toBe(false); });
  it("makes deterministic example keys and filters the audit log", () => { expect(makeKey(1)).toMatch(/^jp_live_[0-9a-f]{24}$/); expect(makeKey(1)).toBe(makeKey(1)); expect(makeKey(1)).not.toBe(makeKey(2)); const log = [{ id: 1, at: "x", actor: "A", action: "key.created", target: "CI" }, { id: 2, at: "x", actor: "B", action: "user.deactivated", target: "Zoe" }]; expect(filterAudit(log, "zoe", "all")).toHaveLength(1); expect(filterAudit(log, "", "A")).toHaveLength(1); expect(hookRate(HOOKS[0])).toBeCloseTo(2 / 3); });
});
describe("G010 billing", () => {
  it("totals in whole cents with GST on the subtotal", () => { const t = totals([{ desc: "a", qty: 3, unit: 0.1 }, { desc: "b", qty: 1, unit: 19.99 }]); expect(t.subtotal).toBe(20.29); expect(t.tax).toBe(2.03); expect(t.total).toBe(22.32); expect(totals(INVOICES[0].items).total).toBe(3091.55); });
  it("prices graduated tiers after the included allowance", () => { // tier bands apply to billable units, i.e. after the included allowance: 150 - 20 = 130 => 100 x 1 + 30 x 0.5
    expect(tieredCost(150, [{ upTo: 100, rate: 1 }, { upTo: Infinity, rate: 0.5 }], 20)).toBe(100 + 15); expect(tieredCost(10, [{ upTo: 100, rate: 1 }], 20)).toBe(0); });
  it("flags overdue invoices and validates drafts", () => { expect(effectiveStatus(INVOICES[1])).toBe("overdue"); expect(effectiveStatus(INVOICES[0])).toBe("sent"); expect(outstanding(INVOICES)).toBeGreaterThan(0); expect(validateInvoice({ client: "", items: [], issued: "2026-11-12", due: "2026-11-01" }).length).toBe(3); });
});
describe("G012 airport ops", () => {
  it("applies Little's law for queue waits", () => { expect(queueWaitMin(30, 120)).toBe(15); expect(queueWaitMin(5, 0)).toBe(Infinity); });
  it("classifies equipment tests and finds roster gaps", () => { expect(testState(EQUIP[0]).state).toBe("ok"); expect(testState(EQUIP[3]).state).toBe("failed"); expect(testState(EQUIP[5]).state).toBe("overdue"); expect(coverageAt(5, ROSTER)).toBe(6); expect(requiredAt(7, LANES)).toBeGreaterThan(0); const g = gaps(ROSTER, LANES); expect(g.every((x) => x.have < x.need)).toBe(true); });
});
describe("G013 warehouse operations", () => {
  it("computes stock cover and reorder status", () => { expect(daysCover(SKUS[1])).toBeCloseTo(86 / 34); expect(reorderStatus(SKUS[1])).toBe("stockout-risk"); expect(reorderStatus(SKUS[0])).toBe("ok"); expect(reorderStatus({ ...SKUS[0], onHand: 140, dailyUse: 5 })).toBe("reorder"); expect(suggestedOrder(SKUS[1])).toBe(Math.ceil(34 * 24 - 86)); });
  it("reconciles receipts against the ASN", () => { expect(reconcile(100, { received: 100, damaged: 0 })).toMatchObject({ status: "received", issues: [] }); expect(reconcile(100, { received: 95, damaged: 0 }).issues).toEqual(["5 short"]); expect(reconcile(100, { received: 110, damaged: 2 }).issues).toEqual(["10 over", "2 damaged"]); expect(reconcile(100, { received: 100, damaged: 3 }).short).toBe(3); });
});
describe("G014 council data", () => {
  it("alternates recycling and green waste fortnightly", () => { const z = ZONES[0]; const a = collectionsOn(z, new Date(2026, 0, 5)), b = collectionsOn(z, new Date(2026, 0, 12)); expect(a).toEqual(["general", "recycling"]); expect(b).toEqual(["general", "green"]); expect(collectionsOn(z, new Date(2026, 0, 6))).toEqual([]); });
  it("finds the next collection and nearest car park with space", () => { const n = nextCollection(ZONES[0], "general", NOW)!; expect(n.getDay()).toBe(1); expect(n.getTime()).toBeGreaterThanOrEqual(new Date(2026, 10, 12).getTime()); const best = nearestWithSpace({ x: 380, y: 70 }, CARPARKS, 20)!; expect(best.id).not.toBe("cp3"); expect(level(CARPARKS[2])).toBe("full"); expect(occupancy(CARPARKS[1])).toBeCloseTo(38 / 90); });
  it("searches the catalogue", () => { expect(searchDatasets(DATASETS, "tree", "all")[0].id).toBe("ds4"); expect(searchDatasets(DATASETS, "", "live")).toHaveLength(2); });
});
describe("G015 ESP fleet", () => {
  it("compares versions", () => { expect(cmpVersion("2026.11.1", "2026.10.2")).toBeGreaterThan(0); expect(cmpVersion("2026.9.4", "2026.10.2")).toBeLessThan(0); expect(cmpVersion("1.0", "1.0.0")).toBe(0); });
  it("assigns cumulative rings, skipping offline and current devices", () => { const g = assignRings(DEVICES); const ids = g.flatMap((x) => x.devices.map((d) => d.id)); expect(new Set(ids).size).toBe(ids.length); expect(ids).not.toContain("d8"); expect(ids).not.toContain("d1"); expect(g[0].devices.length).toBeLessThanOrEqual(g[1].devices.length + 1); });
  it("halts when a ring exceeds the failure threshold", () => {
    const groups = assignRings(DEVICES); let r: Rollout = { version: "x", ring: 0, results: {}, halted: false }; r = runRing(r, groups, () => true); expect(r.halted).toBe(true); expect(r.haltReason).toMatch(/failed/);
    let ok: Rollout = { version: "x", ring: 0, results: {}, halted: false }; for (let i = 0; i < 3; i++) ok = runRing(ok, groups, () => false); expect(ok.halted).toBe(false); expect(ok.ring).toBe(3);
  });
  it("picks the strongest BLE proxy", () => { expect(bestProxy(BLE[0]).dev).toBe("ble-proxy-1"); });
});
describe("G018 design-system admin", () => {
  it("reports contrast from the real tokens", () => { for (const s of ["light", "dark"] as const) { const r = contrastReport(s); expect(r.total).toBeGreaterThan(10); expect(r.pass).toBe(r.total); } });
  it("filters graphics and groups consumers", () => { expect(filterGraphics("", "icon").every((g) => g.tier === "icon")).toBe(true); expect(filterGraphics("kangaroo", "all").some((g) => g.id === "spot-kangaroo")).toBe(true); expect(consumersByVersion(CONSUMERS).flatMap(([, c]) => c)).toHaveLength(CONSUMERS.length); });
});
describe("G019 documents", () => {
  it("escapes every LaTeX special", () => { expect(texEscape("50% & $5 #1 a_b {x} ~ ^")).toBe("50\\% \\& \\$5 \\#1 a\\_b \\{x\\} \\textasciitilde{} \\textasciicircum{}"); expect(texEscape("\\input{evil}")).toBe("\\textbackslash{}input\\{evil\\}"); });
  it("generates invoice and letter sources with escaped fields", () => { const src = invoiceTex({ ...INVOICES[0], client: "Smith & Sons_Pty" }); expect(src).toContain("\\documentclass{jupiter-invoice}"); expect(src).toContain("Smith \\& Sons\\_Pty"); expect(src).toContain("\\invoiceitem{Network design and configuration}{12}{95.00}"); expect(src).toContain("3091.55");
    const l = letterTex({ ...LETTERS[0], body: "Para one.\n\nPara 100% two." }); expect(l).toContain("\\documentclass[cover]{jupiter-letter}"); expect(l).toContain("Para 100\\% two."); });
});
describe("G022 agent runs", () => {
  it("prices sessions from token counts", () => { const s = { ...SESSIONS[0], model: "model-m" as const, cachedTok: 1_000_000, calls: [{ name: "x", ms: 1, ok: true, inTok: 1_000_000, outTok: 100_000 }] }; expect(cost(s)).toBeCloseTo(PRICES["model-m"].in + PRICES["model-m"].cached + 0.1 * PRICES["model-m"].out); expect(tokensIn(SESSIONS[0])).toBeGreaterThan(0); expect(tokensOut(SESSIONS[0])).toBeGreaterThan(0); });
  it("computes eval pass rates and regressions", () => { expect(passRate(EVALS, 4)).toBeCloseTo(4 / 6); expect(regressions(EVALS, 4).map((c) => c.id)).toEqual(["e3"]); expect(regressions(EVALS, 0)).toEqual([]); });
  it("renders prompts and reports missing variables", () => { expect(extractVars("a {{x}} b {{ y }} {{x}}")).toEqual(["x", "y"]); const r = renderPrompt("hi {{name}}, {{what}}", { name: "Ava" }); expect(r.out).toBe("hi Ava, {{what}}"); expect(r.missing).toEqual(["what"]); });
});
