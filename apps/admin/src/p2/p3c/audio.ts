/* Audio maths (pure): min/max peaks, trim ranges, WAV encode/parse, a synthetic test tone. No DOM or Web Audio here. */
export type Peaks = { min: Float32Array; max: Float32Array };

/** Min/max per bucket across all channels, so the drawn envelope is the true extremes (not an average). */
export function extractPeaks(channels: ArrayLike<number>[], buckets: number): Peaks {
  const min = new Float32Array(buckets), max = new Float32Array(buckets); const n = channels[0]?.length ?? 0; if (!n || buckets <= 0) return { min, max };
  for (let b = 0; b < buckets; b++) {
    const a = Math.floor((b * n) / buckets), z = Math.max(a + 1, Math.floor(((b + 1) * n) / buckets)); let lo = Infinity, hi = -Infinity;
    for (const ch of channels) for (let i = a; i < z && i < n; i++) { const v = ch[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
    min[b] = lo === Infinity ? 0 : lo; max[b] = hi === -Infinity ? 0 : hi;
  }
  return { min, max };
}
/** Largest absolute value per bucket (0..1), for silence detection. */
export const peakEnvelope = (p: Peaks): number[] => Array.from(p.max, (hi, i) => Math.max(Math.abs(hi), Math.abs(p.min[i])));
/** First and last bucket that rises above `thr`; the whole range when it is all silence. */
export function silenceRange(env: number[], thr = 0.02): [number, number] { const a = env.findIndex((v) => v > thr); if (a < 0) return [0, env.length - 1]; let b = env.length - 1; while (b > a && env[b] <= thr) b--; return [a, b]; }

export const MIN_TRIM = 0.05;
/** Clamp a [start, end] selection (seconds) into [0, duration], at least `minLen` long, in order. */
export function clampTrim(start: number, end: number, duration: number, minLen = MIN_TRIM): [number, number] {
  const len = Math.min(minLen, duration); let a = Math.min(Math.max(0, start), duration), b = Math.min(Math.max(0, end), duration);
  if (b - a < len) { if (a + len <= duration) b = a + len; else { b = duration; a = Math.max(0, duration - len); } } return [a, b];
}
/** Move one handle, keeping the other fixed and the minimum length. */
export function moveHandle(range: [number, number], which: 0 | 1, to: number, duration: number, minLen = MIN_TRIM): [number, number] {
  const len = Math.min(minLen, duration); return which === 0 ? [Math.min(Math.max(0, to), range[1] - len), range[1]] : [range[0], Math.max(Math.min(duration, to), range[0] + len)];
}
export const trimLength = (range: [number, number]): number => Math.max(0, range[1] - range[0]);
export const toFrames = (seconds: number, sampleRate: number): number => Math.round(seconds * sampleRate);
export function sliceChannels(channels: Float32Array[], sampleRate: number, start: number, end: number): Float32Array[] {
  const n = channels[0]?.length ?? 0; const a = Math.min(n, Math.max(0, toFrames(start, sampleRate))), b = Math.min(n, Math.max(a, toFrames(end, sampleRate))); return channels.map((c) => c.slice(a, b));
}

/** Encode 16-bit PCM WAV (RIFF), channels interleaved, samples clipped to [-1, 1]. */
export function encodeWav(channels: ArrayLike<number>[], sampleRate: number): ArrayBuffer {
  const nch = Math.max(1, channels.length), frames = channels[0]?.length ?? 0, bytes = frames * nch * 2; const buf = new ArrayBuffer(44 + bytes), v = new DataView(buf);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, "RIFF"); v.setUint32(4, 36 + bytes, true); str(8, "WAVE"); str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, nch, true); v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * nch * 2, true); v.setUint16(32, nch * 2, true); v.setUint16(34, 16, true); str(36, "data"); v.setUint32(40, bytes, true);
  let o = 44; for (let i = 0; i < frames; i++) for (let c = 0; c < nch; c++) { const s = Math.max(-1, Math.min(1, channels[c]?.[i] ?? 0)); v.setInt16(o, s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff), true); o += 2; }
  return buf;
}
export type WavInfo = { channels: number; sampleRate: number; bits: number; dataBytes: number; frames: number; seconds: number };
export function parseWavHeader(buf: ArrayBuffer): WavInfo | null {
  if (buf.byteLength < 44) return null; const v = new DataView(buf); const tag = (o: number) => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
  if (tag(0) !== "RIFF" || tag(8) !== "WAVE" || tag(12) !== "fmt " || tag(36) !== "data" || v.getUint16(20, true) !== 1) return null;
  const channels = v.getUint16(22, true), sampleRate = v.getUint32(24, true), bits = v.getUint16(34, true), dataBytes = v.getUint32(40, true); const frames = dataBytes / (channels * (bits / 8));
  return { channels, sampleRate, bits, dataBytes, frames, seconds: frames / sampleRate };
}
/** Decode our own 16-bit PCM WAV back to float channels (used to test the round trip). */
export function decodeWav16(buf: ArrayBuffer): { channels: Float32Array[]; sampleRate: number } | null {
  const h = parseWavHeader(buf); if (!h || h.bits !== 16) return null; const v = new DataView(buf); const out = Array.from({ length: h.channels }, () => new Float32Array(h.frames)); let o = 44;
  for (let i = 0; i < h.frames; i++) for (let c = 0; c < h.channels; c++) { const s = v.getInt16(o, true); out[c][i] = s < 0 ? s / 0x8000 : s / 0x7fff; o += 2; }
  return { channels: out, sampleRate: h.sampleRate };
}
/** A sample sound: silence, a 440 Hz tone with a stepped envelope, then a 660 Hz burst, then silence. */
export function synthTone(sampleRate: number, seconds: number, lead = 0.4): Float32Array {
  const n = Math.round(sampleRate * seconds), out = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / sampleRate; if (t < lead || t > seconds - lead) continue; const u = (t - lead) / (seconds - 2 * lead); const f = u < 0.6 ? 440 : 660; const env = u < 0.6 ? 0.2 + 0.6 * u : 0.8 * (1 - (u - 0.6) / 0.4) + 0.05; out[i] = 0.8 * env * Math.sin(2 * Math.PI * f * t); }
  return out;
}
export const fmtClock = (sec: number): string => { const s = Math.max(0, sec); return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}.${String(Math.floor((s % 1) * 100)).padStart(2, "0")}`; };
export const fmtBytes = (n: number): string => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1000))} KB`);
/** RMS of time-domain byte data from an AnalyserNode (128 = silence), 0..1. */
export function rmsFromBytes(data: ArrayLike<number>): number { let s = 0; for (let i = 0; i < data.length; i++) { const x = (data[i] - 128) / 128; s += x * x; } return data.length ? Math.sqrt(s / data.length) : 0; }
