import { describe, expect, it } from "vitest";
import { clampTrim, decodeWav16, encodeWav, extractPeaks, fmtClock, moveHandle, parseWavHeader, peakEnvelope, rmsFromBytes, silenceRange, sliceChannels, synthTone, trimLength } from "./audio.ts";
import { frameDiff, frameScore, lumaContrast, meanLuma, sampleTimes, usableDuration } from "./video.ts";

describe("peaks", () => {
  it("keeps true min and max per bucket across channels", () => {
    const l = Float32Array.from([0, 0.5, -0.2, 0.1, 0, 0, 0.9, -0.9]); const r = Float32Array.from([0, 0, -0.6, 0, 0, 0, 0, 0]);
    const p = extractPeaks([l, r], 4); expect(Array.from(p.max)).toEqual([0.5, expect.closeTo(0.1, 5), 0, expect.closeTo(0.9, 5)]); expect(p.min[1]).toBeCloseTo(-0.6, 5); expect(p.min[3]).toBeCloseTo(-0.9, 5);
  });
  it("handles empty input and more buckets than samples", () => { expect(extractPeaks([], 5).max.length).toBe(5); const p = extractPeaks([Float32Array.from([0.3, -0.3])], 6); expect(p.max.length).toBe(6); expect(Math.max(...p.max)).toBeCloseTo(0.3, 5); });
  it("finds the non-silent range", () => { expect(silenceRange([0, 0, 0.5, 0.4, 0, 0])).toEqual([2, 3]); expect(silenceRange([0, 0, 0])).toEqual([0, 2]); const env = peakEnvelope(extractPeaks([synthTone(8000, 2)], 40)); const [a, b] = silenceRange(env); expect(a).toBeGreaterThanOrEqual(8); expect(b).toBeLessThanOrEqual(31); });
});
describe("trim maths", () => {
  it("clamps and orders", () => { expect(clampTrim(-1, 99, 10)).toEqual([0, 10]); expect(clampTrim(5, 5, 10)[1] - 5).toBeCloseTo(0.05); const [a, b] = clampTrim(9.99, 20, 10); expect(b).toBe(10); expect(b - a).toBeCloseTo(0.05); expect(clampTrim(0, 1, 0.01)).toEqual([0, 0.01]); });
  it("moves one handle without crossing the other", () => { expect(moveHandle([2, 6], 0, 9, 10)).toEqual([5.95, 6]); expect(moveHandle([2, 6], 1, -3, 10)).toEqual([2, 2.05]); expect(moveHandle([2, 6], 1, 99, 10)).toEqual([2, 10]); expect(trimLength([2, 6])).toBe(4); });
  it("slices by time", () => { const c = Float32Array.from({ length: 100 }, (_, i) => i); const s = sliceChannels([c], 100, 0.25, 0.75); expect(s[0].length).toBe(50); expect(s[0][0]).toBe(25); expect(sliceChannels([c], 100, 0.9, 5)[0].length).toBe(10); });
  it("formats clock times", () => { expect(fmtClock(65.256)).toBe("1:05.25"); expect(fmtClock(-1)).toBe("0:00.00"); });
});
describe("WAV", () => {
  it("writes a correct PCM header", () => {
    const buf = encodeWav([new Float32Array(4410)], 44100); const h = parseWavHeader(buf)!; expect(buf.byteLength).toBe(44 + 8820);
    expect(h).toMatchObject({ channels: 1, sampleRate: 44100, bits: 16, dataBytes: 8820, frames: 4410 }); expect(h.seconds).toBeCloseTo(0.1, 6);
    const v = new DataView(buf); expect(v.getUint32(4, true)).toBe(36 + 8820); expect(v.getUint32(28, true)).toBe(88200); expect(v.getUint16(32, true)).toBe(2);
  });
  it("interleaves stereo, clips, and round-trips within quantisation", () => {
    const l = Float32Array.from([0, 0.5, -0.5, 2]), r = Float32Array.from([1, -1, 0.25, -3]); const buf = encodeWav([l, r], 8000); expect(parseWavHeader(buf)).toMatchObject({ channels: 2, frames: 4, dataBytes: 16 });
    const v = new DataView(buf); expect(v.getInt16(44, true)).toBe(0); expect(v.getInt16(46, true)).toBe(0x7fff); expect(v.getInt16(48 + 2, true)).toBe(-0x8000);
    const d = decodeWav16(buf)!; expect(d.sampleRate).toBe(8000); expect(d.channels[0][1]).toBeCloseTo(0.5, 3); expect(d.channels[0][3]).toBeCloseTo(1, 3); expect(d.channels[1][3]).toBeCloseTo(-1, 3);
  });
  it("rejects non-WAV data", () => { expect(parseWavHeader(new ArrayBuffer(10))).toBeNull(); expect(parseWavHeader(new ArrayBuffer(64))).toBeNull(); });
  it("keeps tone length and silences the ends", () => { const t = synthTone(1000, 2, 0.4); expect(t.length).toBe(2000); expect(t[100]).toBe(0); expect(Math.max(...t)).toBeGreaterThan(0.3); });
  it("rms of a silent and a loud buffer", () => { expect(rmsFromBytes(new Uint8Array(8).fill(128))).toBe(0); expect(rmsFromBytes(Uint8Array.from([0, 255, 0, 255]))).toBeGreaterThan(0.9); expect(rmsFromBytes([])).toBe(0); });
});
describe("video helpers", () => {
  it("spaces sample times inside the clip", () => { const t = sampleTimes(10, 4); expect(t).toEqual([1.25, 3.75, 6.25, 8.75]); expect(sampleTimes(0, 4)).toEqual([0]); });
  const flat = new Uint8ClampedArray(16 * 4).fill(10), bright = new Uint8ClampedArray(16 * 4).fill(240); const edge = Uint8ClampedArray.from({ length: 64 }, (_, i) => ((i >> 2) % 2 ? 255 : 0));
  it("scores detail and change", () => {
    expect(meanLuma(bright)).toBeGreaterThan(0.9); expect(lumaContrast(flat)).toBeLessThan(1e-9); expect(lumaContrast(edge)).toBeGreaterThan(0.3); expect(frameDiff(flat, flat)).toBe(0); expect(frameDiff(flat, bright)).toBeGreaterThan(0.8);
    expect(frameScore(0.4, 0.2, 0.5)).toBeGreaterThan(frameScore(0, 0, 0.02));
  });
  it("uses the hint for infinite durations", () => { expect(usableDuration(Infinity, 7)).toBe(7); expect(usableDuration(3, 7)).toBe(3); expect(usableDuration(NaN)).toBe(0); });
});
