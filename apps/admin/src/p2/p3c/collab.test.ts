import { describe, expect, it } from "vitest";
import { LOCK_MS, acquire, cursorAt, lockStatus, openCount, release, renew, threads, type Comment } from "./collab.ts";
describe("collaboration logic", () => {
  it("keeps cursors inside the surface and moving", () => { for (let t = 0; t < 60000; t += 3700) for (let i = 0; i < 4; i++) { const c = cursorAt(i, t); expect(c.x).toBeGreaterThanOrEqual(0); expect(c.x).toBeLessThanOrEqual(100); expect(c.y).toBeGreaterThanOrEqual(0); expect(c.y).toBeLessThanOrEqual(100); } expect(cursorAt(0, 0)).not.toEqual(cursorAt(0, 5000)); expect(cursorAt(0, 1000)).toEqual(cursorAt(0, 1000)); });
  it("locks: acquire, block others, expire, release, renew, take over", () => {
    const a = acquire(null, 1000, "me"); expect(a.ok).toBe(true); expect(lockStatus(a.lock, 2000, "me")).toEqual({ kind: "mine", secondsLeft: 59 });
    expect(acquire(a.lock, 2000, "ben")).toMatchObject({ ok: false, reason: "Locked by me" }); expect(lockStatus(a.lock, 2000, "ben")).toMatchObject({ kind: "other", by: "me" });
    expect(lockStatus(a.lock, 1000 + LOCK_MS, "ben")).toEqual({ kind: "free" }); expect(acquire(a.lock, 1000 + LOCK_MS, "ben").ok).toBe(true);
    expect(release(a.lock, "ben")).toBe(a.lock); expect(release(a.lock, "me")).toBeNull(); expect(renew(a.lock, 30000, "me")!.expires).toBe(30000 + LOCK_MS); expect(acquire(a.lock, 2000, "ben", true)).toMatchObject({ ok: true, lock: { by: "ben" } });
  });
  it("groups comments into threads and counts open ones per target", () => {
    const cs: Comment[] = [{ id: 1, target: "a", author: "x", text: "t", at: "", resolved: false }, { id: 2, target: "a", author: "y", text: "r", at: "", resolved: false, parent: 1 }, { id: 3, target: "b", author: "x", text: "t", at: "", resolved: true }];
    expect(threads(cs, "a")[0].replies).toHaveLength(1); expect(threads(cs, undefined, "resolved")).toHaveLength(1); expect(openCount(cs, "a")).toBe(1); expect(openCount(cs, "b")).toBe(0);
  });
});
