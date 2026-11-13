import { describe, expect, it } from "vitest";
import { likertMean, nextRating, npsCategory, npsScore, pinState, PINS } from "./feedback.ts";
describe("feedback helpers", () => {
  it("categorises NPS and computes the score", () => { expect([0, 6, 7, 8, 9, 10].map(npsCategory)).toEqual(["detractor", "detractor", "passive", "passive", "promoter", "promoter"]); expect(npsScore([10, 9, 8, 6, 3])).toEqual({ score: 0, promoters: 2, passives: 1, detractors: 2 }); expect(npsScore([10, 10])).toMatchObject({ score: 100 }); expect(npsScore([]).score).toBe(0); });
  it("averages Likert answers on a 1-5 scale and ignores blanks", () => { expect(likertMean([0, 4, undefined])).toBe(3); expect(likertMean([undefined])).toBeNull(); });
  it("moves ratings with keys within bounds", () => { expect(nextRating(5, "ArrowRight", 5)).toBe(5); expect(nextRating(1, "ArrowLeft", 5)).toBe(1); expect(nextRating(3, "End", 5)).toBe(5); expect(nextRating(3, "x", 5)).toBeNull(); });
  it("explains why a GPIO cannot be used", () => {
    const pin = (n: number) => PINS.find((p) => p.n === n)!;
    expect(pinState(pin(6), "output", {})).toMatchObject({ ok: false, reason: expect.stringContaining("flash") }); expect(pinState(pin(34), "output", {}).ok).toBe(false); expect(pinState(pin(34), "adc", {}).ok).toBe(true);
    expect(pinState(pin(4), "adc", {}, true).ok).toBe(false); expect(pinState(pin(4), "adc", {}, false).ok).toBe(true); expect(pinState(pin(18), "output", { 18: "SPI clock" })).toMatchObject({ ok: false, reason: "Already used by SPI clock" }); expect(pinState(pin(12), "output", {})).toMatchObject({ ok: true, level: "warn" }); expect(pinState(pin(18), "output", {})).toMatchObject({ level: "ok" });
  });
});
