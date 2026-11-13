/** Maths for D065 (spectrogram, waterfall, constellation) and D067 (waveform, image histogram, markers). */
/** Magnitude of the first `bins` DFT bins of a Hann-windowed frame (naive O(n·bins), fine for demo sizes). */
export function dftMagnitude(frame: number[], bins: number) {
  const n = frame.length, w = frame.map((v, i) => v * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / Math.max(1, n - 1))));
  return Array.from({ length: bins }, (_, k) => { let re = 0, im = 0; for (let i = 0; i < n; i++) { const a = (-2 * Math.PI * k * i) / n; re += w[i] * Math.cos(a); im += w[i] * Math.sin(a); } return Math.hypot(re, im) / n; });
}
/** Short-time spectrum: rows are time frames, columns are frequency bins. */
export function spectrogram(signal: number[], win: number, hop: number, bins: number) {
  const rows: number[][] = []; for (let s = 0; s + win <= signal.length; s += hop) rows.push(dftMagnitude(signal.slice(s, s + win), bins)); return rows;
}
export const toDb = (v: number, floor = -80) => Math.max(floor, 20 * Math.log10(Math.max(v, 1e-9)));
/** Waterfall: successive spectra drawn as offset lines. Row 0 is the oldest (back, higher and shifted right); the last row is in front. Returned in painter order, back first. */
export function waterfallLines(rows: number[][], w: number, h: number, depth: number, amp: number, shift = 0.6) {
  const n = rows.length, max = Math.max(...rows.flat(), 1e-9), span = Math.max(0, w - n * shift);
  return rows.map((r, k) => { const base = h - depth + (n > 1 ? (k * depth) / (n - 1) : depth), sx = (n - 1 - k) * shift;
    return r.map((v, i) => [sx + (i * span) / Math.max(1, r.length - 1), base - (v / max) * amp] as [number, number]); });
}
export type IQ = { i: number; q: number };
const LEVELS = [-3, -1, 1, 3];
/** Ideal 16-QAM constellation, row-major. */
export const qam16 = (): IQ[] => LEVELS.flatMap((q) => LEVELS.map((i) => ({ i, q })));
/** Error vector magnitude (RMS, as a fraction of RMS reference power) of received symbols against their nearest ideal point. */
export function evm(rx: IQ[], ideal: IQ[] = qam16()) {
  if (!rx.length) return 0; const ref = Math.sqrt(ideal.reduce((a, p) => a + p.i * p.i + p.q * p.q, 0) / ideal.length);
  const err = rx.reduce((a, p) => a + Math.min(...ideal.map((d) => (p.i - d.i) ** 2 + (p.q - d.q) ** 2)), 0) / rx.length; return Math.sqrt(err) / ref;
}
/** Min and max of each of `buckets` equal slices: the drawable envelope of an audio waveform. */
export function waveformEnvelope(samples: number[], buckets: number) {
  const size = samples.length / buckets;
  return Array.from({ length: buckets }, (_, b) => { const s = samples.slice(Math.floor(b * size), Math.max(Math.floor(b * size) + 1, Math.floor((b + 1) * size))); return { min: Math.min(...s), max: Math.max(...s) }; });
}
/** Histogram of 0..255 values into `bins` equal bins; counts sum to the input length. */
export function histogram8(values: number[], bins = 32) {
  const h = new Array<number>(bins).fill(0); for (const v of values) h[Math.min(bins - 1, Math.max(0, Math.floor((v / 256) * bins)))]++; return h;
}
export const luma = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
export type Marker = { at: number; label: string; kind: string };
/** Assign each marker a row so labels `minGap` seconds wide never collide in the same row. */
export function packMarkers(markers: Marker[], minGap: number) {
  const ends: number[] = []; return [...markers].sort((a, b) => a.at - b.at).map((m) => { let row = ends.findIndex((e) => m.at >= e); if (row < 0) { row = ends.length; ends.push(0); } ends[row] = m.at + minGap; return { ...m, row }; });
}
export const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
