import { describe, expect, it } from "vitest";
import { fmtTime, makePdf, makeWav, MELODY, peaks } from "./pdf.ts";

describe("makePdf", () => {
  const pdf = makePdf("Test (doc)", [["line one", "line (two)"], ["page two"]]);
  it("emits a structurally valid PDF with correct xref offsets", () => {
    expect(pdf.startsWith("%PDF-1.4")).toBe(true); expect(pdf.trim().endsWith("%%EOF")).toBe(true);
    const start = Number(/startxref\n(\d+)/.exec(pdf)![1]); expect(pdf.slice(start, start + 4)).toBe("xref");
    const offs = [...pdf.slice(start).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1])); expect(offs.length).toBeGreaterThan(5);
    offs.forEach((o, i) => expect(pdf.slice(o, o + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`));
    expect(/\/Count 2/.test(pdf)).toBe(true); expect(pdf).toContain("\\(two\\)");
  });
});
describe("makeWav", () => {
  it("writes a RIFF/WAVE header with the right sizes", () => {
    const { bytes, seconds, samples } = makeWav(MELODY); const dv = new DataView(bytes.buffer);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("RIFF"); expect(String.fromCharCode(...bytes.slice(8, 12))).toBe("WAVE"); expect(dv.getUint32(40, true)).toBe(samples.length * 2); expect(seconds).toBeGreaterThan(4);
  });
  it("derives a waveform and formats time", () => { const w = makeWav(MELODY); const p = peaks(w.samples, 40); expect(p).toHaveLength(40); expect(Math.max(...p)).toBeGreaterThan(0.3); expect(Math.min(...p)).toBeLessThanOrEqual(1); expect(fmtTime(75)).toBe("1:15"); });
});
