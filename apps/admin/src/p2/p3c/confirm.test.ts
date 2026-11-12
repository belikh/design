import { describe, expect, it } from "vitest";
import { challenge, holdProgress, scrolledToEnd, slideValue } from "./confirm.ts";
describe("confirm helpers", () => {
  it("detects the end of a scroller, with slack and for non-overflowing content", () => { expect(scrolledToEnd({ scrollTop: 0, clientHeight: 100, scrollHeight: 400 })).toBe(false); expect(scrolledToEnd({ scrollTop: 295, clientHeight: 100, scrollHeight: 400 })).toBe(true); expect(scrolledToEnd({ scrollTop: 0, clientHeight: 100, scrollHeight: 100 })).toBe(true); });
  it("clamps hold progress and slide values", () => { expect(holdProgress(750, 1500)).toBe(0.5); expect(holdProgress(9999, 1500)).toBe(1); expect(holdProgress(-5, 1500)).toBe(0); expect(slideValue(-20, 300, 48)).toBe(0); expect(slideValue(252, 300, 48)).toBe(100); expect(slideValue(126, 300, 48)).toBe(50); });
  it("makes a solvable arithmetic challenge", () => { const c = challenge(3); const m = /(\d+) \+ (\d+)/.exec(c.q)!; expect(Number(m[1]) + Number(m[2])).toBe(Number(c.a)); });
});
