import { describe, expect, it } from "vitest";
import { can, closeTile, commit, cooldownLeft, countPanes, DEFAULT_DELIVERY, history, isQuiet, lttb, merge3, purgeExpired, redo, restore, routeEvent, setRatio, snoozeUntil, softDelete, splitTile, summarise, swipeDir, undo, group, visible, snoozed, checkTarget, type Notif, type SoftItem, type Tile, moveTab, pinTab, closeTab, type DocTab } from "./engine.ts";

describe("permissions", () => { it("gives each role a strict subset", () => { expect(can("admin", "orders.delete")).toBe(true); expect(can("editor", "orders.delete")).toBe(false); expect(can("viewer", "orders.edit")).toBe(false); expect(can("viewer", "orders.read")).toBe(true); }); });
describe("history", () => {
  it("undoes, redoes, and drops the redo branch on a new edit", () => {
    let h = history("a"); h = commit(h, "b"); h = commit(h, "c"); expect(h.present).toBe("c");
    h = undo(h); expect(h.present).toBe("b"); h = redo(h); expect(h.present).toBe("c"); h = undo(undo(h)); h = commit(h, "z"); expect(redo(h).present).toBe("z");
  });
  it("ignores identical commits and empty undo", () => { const h = history(1); expect(commit(h, 1)).toBe(h); expect(undo(h)).toBe(h); });
});
describe("merge3", () => {
  it("auto-merges disjoint edits and flags real conflicts", () => {
    const r = merge3({ name: "A", qty: 1, note: "x" }, { name: "B", qty: 1, note: "mine" }, { name: "A", qty: 5, note: "theirs" });
    expect(r.merged).toMatchObject({ name: "B", qty: 5 }); expect(r.autoMerged.sort()).toEqual(["name", "qty"]); expect(r.conflicts.map((c) => c.key)).toEqual(["note"]);
  });
  it("treats identical changes as resolved", () => { expect(merge3({ a: 1 }, { a: 2 }, { a: 2 }).conflicts).toHaveLength(0); });
});
describe("soft delete", () => {
  const items: SoftItem[] = [{ id: "1", name: "one" }, { id: "2", name: "two" }]; const DAY = 86_400_000;
  it("soft-deletes, restores and purges after the retention window", () => {
    let s = softDelete(items, "1", 1000); expect(s[0].deletedAt).toBe(1000); expect(purgeExpired(s, 1000 + 29 * DAY, 30 * DAY)).toHaveLength(2); expect(purgeExpired(s, 1000 + 31 * DAY, 30 * DAY)).toHaveLength(1);
    s = restore(s, "1"); expect(s[0].deletedAt).toBeUndefined();
  });
  it("reports cooldown remaining", () => { expect(cooldownLeft(null, 5000, 0)).toBe(0); expect(cooldownLeft(1000, 5000, 3000)).toBe(3000); expect(cooldownLeft(1000, 5000, 9000)).toBe(0); });
});
describe("notifications", () => {
  const now = new Date(2026, 10, 12, 15, 0).getTime(); const mk = (id: string, type: Notif["type"], at: number, extra: Partial<Notif> = {}): Notif => ({ id, type, title: id, body: "", at, source: "api", ...extra });
  it("computes snooze presets from the current time", () => {
    expect(snoozeUntil("1h", now)).toBe(now + 3_600_000); expect(new Date(snoozeUntil("tonight", now)).getHours()).toBe(18); expect(new Date(snoozeUntil("tomorrow", now)).getDate()).toBe(13);
    expect(new Date(snoozeUntil("monday", now)).getDay()).toBe(1); expect(new Date(snoozeUntil("tonight", new Date(2026, 10, 12, 19).getTime())).getDate()).toBe(13);
  });
  it("hides snoozed items until they are due, and groups by type or day", () => {
    const items = [mk("a", "mention", now - 1000), mk("b", "security", now - 2000, { snoozedUntil: now + 5000 }), mk("c", "mention", now - 86_400_000 - 1000)];
    expect(visible(items, now).map((i) => i.id)).toEqual(["a", "c"]); expect(snoozed(items, now).map((i) => i.id)).toEqual(["b"]); expect(visible(items, now + 6000)).toHaveLength(3);
    expect(group(items, "type", now).map((g) => g.label)).toEqual(["Mentions", "Security"]); expect(group(items, "day", now).map((g) => g.label)).toEqual(["Today", "Yesterday"]);
  });
});
describe("quiet hours and routing", () => {
  const q = DEFAULT_DELIVERY.quiet; const at = (h: number, m = 0, d = 4) => new Date(2026, 10, 6 + d, h, m); // a Wednesday-ish day
  it("handles an overnight window that wraps midnight", () => { expect(isQuiet(q, at(23))).toBe(true); expect(isQuiet(q, at(3))).toBe(true); expect(isQuiet(q, at(7, 0))).toBe(false); expect(isQuiet(q, at(12))).toBe(false); expect(isQuiet({ ...q, on: false }, at(23))).toBe(false); });
  it("defers push and email to the digest during quiet hours, but security bypasses", () => {
    const night = at(23); const m = routeEvent("mention", DEFAULT_DELIVERY, night); expect(m.deliver).toEqual(["inapp"]); expect(m.deferred).toEqual(["digest"]);
    const s = routeEvent("security", DEFAULT_DELIVERY, night); expect(s.deliver).toContain("push"); expect(s.deferred).toEqual([]);
    expect(routeEvent("mention", DEFAULT_DELIVERY, at(12)).deliver).toContain("push");
  });
});
describe("misc", () => {
  it("summarises a selection", () => { expect(summarise([2, 4, 9])).toMatchObject({ count: 3, sum: 15, avg: 5, min: 2, max: 9 }); expect(summarise([]).count).toBe(0); });
  it("downsamples with LTTB while keeping the extremes", () => {
    const y = Array.from({ length: 10_000 }, (_, i) => Math.sin(i / 200) + (i === 5000 ? 8 : 0)); const idx = lttb(y, 300);
    expect(idx).toHaveLength(300); expect(idx[0]).toBe(0); expect(idx[299]).toBe(9999); expect(idx).toContain(5000); expect([...idx].sort((a, b) => a - b)).toEqual(idx);
  });
  it("classifies swipes and touch targets", () => { expect(swipeDir(-90, 10)).toBe("left"); expect(swipeDir(90, 100)).toBeNull(); expect(swipeDir(20, 0)).toBeNull(); expect(checkTarget("x", 44, 44).ok).toBe(true); expect(checkTarget("y", 30, 44).ok).toBe(false); });
  it("splits, resizes and closes tiles", () => {
    let t: Tile = { kind: "pane", id: "p0", widget: "a" }; t = splitTile(t, "p0", "h", "b"); expect(countPanes(t)).toBe(2); expect(t.kind === "split" && t.ratio).toBe(0.5);
    if (t.kind === "split") { t = setRatio(t, t.id, 2); expect(t.kind === "split" && t.ratio).toBe(0.85); const b = t.kind === "split" ? t.b : t; t = closeTile(t, b.id); } expect(countPanes(t)).toBe(1);
  });
});

describe("document tabs", () => {
  const tabs: DocTab[] = [{ id: "a", title: "A" }, { id: "b", title: "B", pinned: true }, { id: "c", title: "C" }];
  it("keeps pinned tabs first and refuses to move across the pinned boundary", () => {
    const p = pinTab(tabs, "c"); expect(p.map((t) => t.id)).toEqual(["b", "c", "a"]); expect(moveTab(p, "a", 0).map((t) => t.id)).toEqual(["b", "c", "a"]); expect(moveTab(tabs, "a", 5).map((t) => t.id)).toEqual(["b", "c", "a"]);
  });
  it("closes the active tab into its neighbour, and never closes a pinned tab", () => {
    expect(closeTab(tabs, "a", "a").active).toBe("b"); expect(closeTab(tabs, "b", "b").tabs).toHaveLength(3); expect(closeTab(tabs, "c", "c").active).toBe("b");
  });
});
