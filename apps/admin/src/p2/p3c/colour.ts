/* Colour maths: parsing, HSL conversion, WCAG contrast, gradients, palette generation. User-chosen colours are data, not styles. */
export type RGB = { r: number; g: number; b: number };
export type HSL = { h: number; s: number; l: number };
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
export function parseHex(s: string): RGB | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s.trim()); if (!m) return null; let h = m[1]; if (h.length === 3) h = [...h].map((c) => c + c).join("");
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
export const toHex = ({ r, g, b }: RGB): string => "#" + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("");
export function rgbToHsl({ r, g, b }: RGB): HSL {
  const [R, G, B] = [r / 255, g / 255, b / 255]; const max = Math.max(R, G, B), min = Math.min(R, G, B), d = max - min; const l = (max + min) / 2;
  if (d === 0) return { h: 0, s: 0, l: l * 100 };
  const s = d / (1 - Math.abs(2 * l - 1)); let h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4; h = (h * 60 + 360) % 360;
  return { h, s: s * 100, l: l * 100 };
}
export function hslToRgb({ h, s, l }: HSL): RGB {
  const S = clamp(s, 0, 100) / 100, L = clamp(l, 0, 100) / 100; const k = (n: number) => (n + (((h % 360) + 360) % 360) / 30) % 12; const a = S * Math.min(L, 1 - L);
  const f = (n: number) => L - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
}
export const hexToHsl = (hex: string): HSL | null => { const c = parseHex(hex); return c ? rgbToHsl(c) : null; };
export const hslToHex = (h: HSL): string => toHex(hslToRgb(h));
export const hslCss = ({ h, s, l }: HSL) => `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`;
export function luminance({ r, g, b }: RGB): number { const f = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); }
export function contrast(a: string, b: string): number | null { const x = parseHex(a), y = parseHex(b); if (!x || !y) return null; const [l1, l2] = [luminance(x), luminance(y)].sort((p, q) => q - p); return (l1 + 0.05) / (l2 + 0.05); }
export type Grade = { ratio: number; aaNormal: boolean; aaLarge: boolean; aaaNormal: boolean; aaaLarge: boolean; ui: boolean };
export function grade(fg: string, bg: string): Grade | null { const r = contrast(fg, bg); if (r === null) return null; return { ratio: r, aaNormal: r >= 4.5, aaLarge: r >= 3, aaaNormal: r >= 7, aaaLarge: r >= 4.5, ui: r >= 3 }; }
/** Move the foreground's lightness until it reaches the target ratio against bg; returns the nearest passing hex. */
export function suggestFg(fg: string, bg: string, target = 4.5): string | null {
  const hsl = hexToHsl(fg); if (!hsl || !parseHex(bg)) return null; if ((contrast(fg, bg) ?? 0) >= target) return toHex(parseHex(fg)!);
  const bgLum = luminance(parseHex(bg)!); const dir = bgLum > 0.4 ? -1 : 1;
  for (let step = 1; step <= 100; step++) { const l = clamp(hsl.l + dir * step, 0, 100); const hex = hslToHex({ ...hsl, l }); if ((contrast(hex, bg) ?? 0) >= target) return hex; }
  return dir < 0 ? toHex({ r: 0, g: 0, b: 0 }) : toHex({ r: 255, g: 255, b: 255 });
}
export type Stop = { at: number; hex: string };
export type GradientSpec = { kind: "linear" | "radial"; angle: number; stops: Stop[] };
export const gradientCss = (g: GradientSpec): string => { const stops = [...g.stops].sort((a, b) => a.at - b.at).map((s) => `${s.hex} ${Math.round(s.at)}%`).join(", "); return g.kind === "radial" ? `radial-gradient(circle, ${stops})` : `linear-gradient(${Math.round(g.angle)}deg, ${stops})`; };
/** Evenly spaced tints and shades of a base colour (lightness ramp). */
export function ramp(hex: string, steps = 9): string[] { const h = hexToHsl(hex); if (!h) return []; return Array.from({ length: steps }, (_, i) => hslToHex({ ...h, l: 95 - (90 * i) / (steps - 1) })); }
export const harmonies = (hex: string): Record<string, string[]> => { const h = hexToHsl(hex); if (!h) return {}; const rot = (d: number) => hslToHex({ ...h, h: h.h + d }); return { Complementary: [hex, rot(180)], Triadic: [hex, rot(120), rot(240)], Analogous: [rot(-30), hex, rot(30)] }; };
/** Pairwise contrast matrix across palette entries. */
export const matrix = (hexes: string[]): (number | null)[][] => hexes.map((a) => hexes.map((b) => contrast(a, b)));

/* ---- HSV, alpha and rgb() strings (used by the 2D pad) ---- */
export type HSV = { h: number; s: number; v: number };
/** HSV with h in 0..360 and s, v in 0..100. */
export function rgbToHsv({ r, g, b }: RGB): HSV {
  const [R, G, B] = [r / 255, g / 255, b / 255]; const max = Math.max(R, G, B), min = Math.min(R, G, B), d = max - min;
  let h = 0; if (d !== 0) { h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4; h = (h * 60 + 360) % 360; }
  return { h, s: max === 0 ? 0 : (d / max) * 100, v: max * 100 };
}
export function hsvToRgb({ h, s, v }: HSV): RGB {
  const S = clamp(s, 0, 100) / 100, V = clamp(v, 0, 100) / 100; const hh = (((h % 360) + 360) % 360) / 60; const f = (n: number) => { const k = (n + hh) % 6; return V - V * S * Math.max(0, Math.min(k, 4 - k, 1)); };
  return { r: Math.round(f(5) * 255), g: Math.round(f(3) * 255), b: Math.round(f(1) * 255) };
}
export const hsvToHex = (c: HSV): string => toHex(hsvToRgb(c));
export const hsvToHsl = (c: HSV): HSL => rgbToHsl(hsvToRgb(c));
export const hslToHsv = (c: HSL): HSV => rgbToHsv(hslToRgb(c));
/** Parse #rgb, #rgba, #rrggbb or #rrggbbaa. Alpha is 0..1. */
export function parseHexA(s: string): { rgb: RGB; a: number } | null {
  const m = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(s.trim()); if (!m) return null; let h = m[1]; if (h.length <= 4) h = [...h].map((c) => c + c).join("");
  const rgb = { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) }; return { rgb, a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
}
/** 6 digits when opaque, 8 when not. */
export const toHexA = (rgb: RGB, a: number): string => (a >= 1 ? toHex(rgb) : toHex(rgb) + Math.round(clamp(a, 0, 1) * 255).toString(16).padStart(2, "0"));
export const rgbCss = (rgb: RGB, a = 1): string => (a >= 1 ? `rgb(${rgb.r} ${rgb.g} ${rgb.b})` : `rgb(${rgb.r} ${rgb.g} ${rgb.b} / ${Math.round(a * 100) / 100})`);
/** Parse a hex colour or rgb()/rgba() string. */
export function parseColour(s: string): { rgb: RGB; a: number } | null {
  const hex = parseHexA(s); if (hex) return hex;
  const m = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})(?:\s*[,/]\s*(\d*\.?\d+)(%?))?\s*\)$/i.exec(s.trim()); if (!m) return null;
  const [r, g, b] = [m[1], m[2], m[3]].map(Number); if (r > 255 || g > 255 || b > 255) return null; let a = m[4] === undefined ? 1 : Number(m[4]); if (m[5]) a /= 100; return a >= 0 && a <= 1 ? { rgb: { r, g, b }, a } : null;
}
