import type { ColorRole, ColorSet } from "./tokens.ts";

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: [number, number, number]): string {
  const c = (x: number) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Linear mix in sRGB: t=0 → a, t=1 → b. */
export function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function isHex(v: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());
}

export interface ContrastPair {
  fg: ColorRole;
  bg: ColorRole;
  /** AA threshold: 4.5 for text, 3 for non-text UI (borders/focus rings). */
  min: number;
  kind: "text" | "ui";
}

const STATUS = ["ok", "warn", "danger", "info"] as const;

export const CONTRAST_PAIRS: ContrastPair[] = [
  ...(["text", "textMuted", "accent"] as const).flatMap((fg) =>
    (["bg", "surface", "surfaceRaised"] as const).map((bg) => ({ fg, bg, min: 4.5, kind: "text" as const })),
  ),
  { fg: "onAccent", bg: "accent", min: 4.5, kind: "text" },
  ...STATUS.flatMap((s) => [
    { fg: s, bg: `${s}Bg` as ColorRole, min: 4.5, kind: "text" as const },
    { fg: s, bg: "surface" as ColorRole, min: 4.5, kind: "text" as const },
    { fg: "text" as ColorRole, bg: `${s}Bg` as ColorRole, min: 4.5, kind: "text" as const },
  ]),
  { fg: "border", bg: "bg", min: 1.2, kind: "ui" },
];

export interface ContrastResult extends ContrastPair {
  ratio: number;
  pass: boolean;
}

export function checkContrast(c: ColorSet): ContrastResult[] {
  return CONTRAST_PAIRS.map((p) => {
    const ratio = contrastRatio(c[p.fg], c[p.bg]);
    return { ...p, ratio, pass: ratio >= p.min };
  });
}
