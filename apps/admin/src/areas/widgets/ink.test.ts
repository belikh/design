import { describe, expect, it } from "vitest";
import { inkLength, signatureOk, simplify, strokesToSvg, pointCount } from "./ink.ts";
const line = Array.from({ length: 50 }, (_, i) => ({ x: i, y: i * 2 }));
describe("ink", () => {
  it("simplifies a straight line to its endpoints but keeps corners", () => { expect(simplify(line, 0.5)).toHaveLength(2); expect(simplify([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], 1)).toHaveLength(3); });
  it("measures ink and gates a too-short signature", () => { expect(Math.round(inkLength([{ pts: line, color: "x", width: 2 }]))).toBe(Math.round(49 * Math.hypot(1, 2))); expect(signatureOk([])).toBe(false); expect(signatureOk([{ pts: [{ x: 0, y: 0 }, { x: 5, y: 0 }], color: "x", width: 2 }])).toBe(false); expect(signatureOk([{ pts: line, color: "x", width: 2 }])).toBe(true); expect(pointCount([{ pts: line, color: "x", width: 2 }])).toBe(50); });
  it("exports svg without eraser strokes", () => { const s = strokesToSvg([{ pts: line, color: "#123456", width: 3 }, { pts: line, color: "x", width: 3, erase: true }], 100, 50); expect(s.match(/<path/g)).toHaveLength(1); expect(s).toContain('viewBox="0 0 100 50"'); });
});
