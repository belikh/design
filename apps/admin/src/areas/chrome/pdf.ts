// Dependency-free generators for demo media: a minimal valid PDF and a PCM WAV. (E011)
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[^\x20-\x7e]/g, "?");
/** A valid multi-page PDF 1.4 (Helvetica text only). Returns the bytes as a string of Latin-1 characters. */
export function makePdf(title: string, pages: string[][]): string {
  const objs: string[] = []; const add = (body: string) => { objs.push(body); return objs.length; };
  const catalog = add(""), tree = add(""), font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"); const kids: number[] = [];
  for (const lines of pages) {
    const text = ["BT /F1 18 Tf 56 780 Td 22 TL", `(${esc(title)}) Tj`, "/F1 11 Tf 18 TL T*", ...lines.map((l) => `(${esc(l)}) Tj T*`), "ET"].join("\n");
    const content = add(`<< /Length ${text.length} >>\nstream\n${text}\nendstream`);
    kids.push(add(`<< /Type /Page /Parent ${tree} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${content} 0 R >>`));
  }
  objs[catalog - 1] = `<< /Type /Catalog /Pages ${tree} 0 R >>`; objs[tree - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;
  let out = "%PDF-1.4\n"; const offsets: number[] = [];
  objs.forEach((b, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${b}\nendobj\n`; });
  const xref = out.length; out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return out;
}
export const pdfUrl = (title: string, pages: string[][]) => (typeof URL !== "undefined" && URL.createObjectURL ? URL.createObjectURL(new Blob([Uint8Array.from(makePdf(title, pages), (c) => c.charCodeAt(0))], { type: "application/pdf" })) : "");

/** Mono 16-bit PCM WAV of a short melody (square-ish sine with an envelope). Deterministic. */
export function makeWav(notes: [number, number][], rate = 22050): { bytes: Uint8Array; samples: Int16Array; seconds: number } {
  const total = Math.round(notes.reduce((a, [, d]) => a + d, 0) * rate); const s = new Int16Array(total); let p = 0;
  for (const [hz, d] of notes) { const n = Math.round(d * rate); for (let i = 0; i < n; i++) { const env = Math.min(1, i / (rate * 0.01), (n - i) / (rate * 0.05)); s[p + i] = hz ? Math.round(Math.sin((2 * Math.PI * hz * i) / rate) * 0.45 * 32767 * env) : 0; } p += n; }
  const buf = new ArrayBuffer(44 + total * 2); const v = new DataView(buf); const w = (o: number, t: string) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); v.setUint32(4, 36 + total * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, total * 2, true);
  s.forEach((x, i) => v.setInt16(44 + i * 2, x, true)); return { bytes: new Uint8Array(buf), samples: s, seconds: total / rate };
}
export const MELODY: [number, number][] = [[392, 0.3], [440, 0.3], [494, 0.3], [523, 0.6], [494, 0.3], [440, 0.3], [392, 0.6], [0, 0.15], [330, 0.3], [392, 0.3], [440, 0.3], [494, 0.6], [440, 0.3], [392, 0.3], [330, 0.8]];
/** Peak envelope for drawing a waveform: `bars` values in 0..1. */
export function peaks(samples: Int16Array, bars: number): number[] { const out: number[] = []; const step = Math.max(1, Math.floor(samples.length / bars)); for (let b = 0; b < bars; b++) { let m = 0; for (let i = b * step; i < Math.min(samples.length, (b + 1) * step); i++) m = Math.max(m, Math.abs(samples[i])); out.push(m / 32768); } return out; }
export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
