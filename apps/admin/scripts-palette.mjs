// Colour-vision-deficiency check for the 8-colour categorical chart palette (light and dark).
// Simulates protanopia, deuteranopia and tritanopia (Machado et al. 2009, severity 1.0) and reports the closest pair per scheme.
import { readFileSync } from "node:fs";
const tokens = JSON.parse(readFileSync(new URL("../../packages/tokens/jupiter.tokens.json", import.meta.url), "utf8"));
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4); const gam = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
const mix = (a, b, t) => a.map((v, i) => v * (1 - t) + b[i] * t); // sRGB mix approximating color-mix(in oklab)
const MACHADO = { protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]], deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]], tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]] };
const sim = (rgb, m) => { const l = rgb.map(lin); return m.map((row) => Math.min(1, Math.max(0, gam(row[0] * l[0] + row[1] * l[1] + row[2] * l[2])))); };
const lab = (rgb) => { const [r, g, b] = rgb.map(lin); const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, y = 0.2126 * r + 0.7152 * g + 0.0722 * b, z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883; const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116); return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]; };
const dE = (a, b) => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]));
let worst = 99;
for (const scheme of ["light", "dark"]) {
  const c = tokens.color[scheme]; const P = { accent: hex(c.accent), info: hex(c.info), ok: hex(c.ok), warn: hex(c.warn), danger: hex(c.danger), muted: hex(c.textMuted) };
  const W = [1, 1, 1], K = [0, 0, 0]; const pal = [P.accent, P.warn, P.info, mix(P.warn, K, 0.35), mix(P.info, K, 0.35), mix(P.accent, W, 0.35), P.muted, mix(P.muted, P.accent, 0.45)]; const names = ["c1 accent", "c2 warn", "c3 info", "c4 warn-dark", "c5 info-dark", "c6 accent-light", "c7 muted", "c8 muted+accent"];
  for (const [mode, m] of [["normal", null], ...Object.entries(MACHADO)]) {
    const cols = pal.map((p) => (m ? sim(p, m) : p)); let min = 99, pair = "", min6 = 99;
    for (let i = 0; i < cols.length; i++) for (let j = i + 1; j < cols.length; j++) { const d = dE(cols[i], cols[j]); if (d < min) { min = d; pair = `${names[i]} vs ${names[j]}`; } if (j < 6 && d < min6) min6 = d; }
    worst = Math.min(worst, min6); console.log(`${scheme.padEnd(5)} ${mode.padEnd(7)} first six min ΔE ${min6.toFixed(1).padStart(5)} | all eight ${min.toFixed(1).padStart(5)} (${pair})`);
  }
}
console.log(`\nFirst six series, worst case across both schemes and all vision types: ΔE ${worst.toFixed(1)} (gate: >= 10).`);
if (worst < 10) { console.error("Palette is not colour-vision safe"); process.exit(1); }
