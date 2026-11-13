/* Video frame helpers (pure): sample times, luminance grids and change scores for picking a cover frame. */
export const sampleTimes = (duration: number, n: number): number[] => (n <= 1 || duration <= 0 ? [0] : Array.from({ length: n }, (_, i) => Math.min(duration, (duration * (i + 0.5)) / n)));
/** Mean Rec.709 luma (0..1) of RGBA pixel data. */
export function meanLuma(rgba: ArrayLike<number>): number { let s = 0; const px = Math.floor(rgba.length / 4); for (let i = 0; i < px; i++) s += 0.2126 * rgba[i * 4] + 0.7152 * rgba[i * 4 + 1] + 0.0722 * rgba[i * 4 + 2]; return px ? s / px / 255 : 0; }
/** Luma standard deviation (0..1): flat black or white frames score near 0. */
export function lumaContrast(rgba: ArrayLike<number>): number { const px = Math.floor(rgba.length / 4); if (!px) return 0; const l = (i: number) => (0.2126 * rgba[i * 4] + 0.7152 * rgba[i * 4 + 1] + 0.0722 * rgba[i * 4 + 2]) / 255; let m = 0; for (let i = 0; i < px; i++) m += l(i); m /= px; let v = 0; for (let i = 0; i < px; i++) v += (l(i) - m) ** 2; return Math.sqrt(v / px); }
/** Mean absolute per-pixel luma difference between two equally sized frames (0..1). */
export function frameDiff(a: ArrayLike<number>, b: ArrayLike<number>): number { const px = Math.min(a.length, b.length) >> 2; if (!px) return 0; let s = 0; for (let i = 0; i < px; i++) s += Math.abs(0.2126 * (a[i * 4] - b[i * 4]) + 0.7152 * (a[i * 4 + 1] - b[i * 4 + 1]) + 0.0722 * (a[i * 4 + 2] - b[i * 4 + 2])); return s / px / 255; }
/** Score a frame: detail (contrast) plus how much it differs from the previous sample, not too dark or too bright. */
export function frameScore(contrast: number, diff: number, luma: number): number { const exposure = 1 - Math.min(1, Math.abs(luma - 0.5) * 2); return contrast * 2 + diff + exposure * 0.5; }
/** Browsers report Infinity for MediaRecorder webm until the end is found; fall back to a hint. */
export const usableDuration = (d: number, hint = 0): number => (Number.isFinite(d) && d > 0 ? d : hint > 0 ? hint : 0);
