/* Font catalogue and detection helpers (pure; the browser probes live in fontpicker.tsx). */
export type FontEntry = { id: string; name: string; stack: string; cat: "Sans" | "Serif" | "Mono" | "Script"; source: "shipped" | "system"; family: string; file?: string; weights: number[]; note?: string };
const SGI_NOTE = "Proprietary SGI files are not committed; they load only when placed in apps/admin/public/fonts.";
/** Families the design system ships (see public/fonts and the @font-face rules in the tokens CSS), then system stacks. */
export const FONTS: FontEntry[] = [
  { id: "jetbrains", name: "JetBrains Mono", stack: '"JetBrains Mono", ui-monospace, monospace', cat: "Mono", source: "shipped", family: "JetBrains Mono", file: "fonts/jetbrains-mono.woff2", weights: [100, 200, 300, 400, 500, 600, 700, 800], note: "SIL Open Font License; variable weight 100 to 800." },
  { id: "sgi-text", name: "SGI Text", stack: '"SGI Text", system-ui, sans-serif', cat: "Sans", source: "shipped", family: "SGI Text", file: "fonts/sgi-text-400.woff2", weights: [400, 700, 800], note: SGI_NOTE },
  { id: "sgi-alt", name: "SGI Alt", stack: '"SGI Alt", system-ui, sans-serif', cat: "Sans", source: "shipped", family: "SGI Alt", file: "fonts/sgi-alt-400.woff2", weights: [400, 700, 800], note: SGI_NOTE },
  { id: "system-ui", name: "System UI", stack: "system-ui, sans-serif", cat: "Sans", source: "system", family: "system-ui", weights: [300, 400, 500, 700, 900] },
  { id: "rounded", name: "Rounded", stack: "ui-rounded, system-ui, sans-serif", cat: "Sans", source: "system", family: "ui-rounded", weights: [300, 400, 500, 700, 900] },
  { id: "verdana", name: "Verdana", stack: "Verdana, Geneva, sans-serif", cat: "Sans", source: "system", family: "Verdana", weights: [400, 700] },
  { id: "trebuchet", name: "Trebuchet", stack: '"Trebuchet MS", sans-serif', cat: "Sans", source: "system", family: "Trebuchet MS", weights: [400, 700] },
  { id: "arial", name: "Arial", stack: "Arial, Helvetica, sans-serif", cat: "Sans", source: "system", family: "Arial", weights: [400, 700] },
  { id: "georgia", name: "Georgia", stack: "Georgia, serif", cat: "Serif", source: "system", family: "Georgia", weights: [400, 700] },
  { id: "times", name: "Times", stack: '"Times New Roman", Times, serif', cat: "Serif", source: "system", family: "Times New Roman", weights: [400, 700] },
  { id: "palatino", name: "Palatino", stack: '"Palatino Linotype", Palatino, serif', cat: "Serif", source: "system", family: "Palatino Linotype", weights: [400, 700] },
  { id: "courier", name: "Courier", stack: '"Courier New", monospace', cat: "Mono", source: "system", family: "Courier New", weights: [400, 700] },
  { id: "ui-mono", name: "UI Monospace", stack: "ui-monospace, Menlo, monospace", cat: "Mono", source: "system", family: "ui-monospace", weights: [400, 700] },
  { id: "brush", name: "Brush Script", stack: '"Brush Script MT", cursive', cat: "Script", source: "system", family: "Brush Script MT", weights: [400] },
];
export const GENERIC_FAMILIES = new Set(["system-ui", "ui-rounded", "ui-monospace", "serif", "sans-serif", "monospace", "cursive"]);
export const WEIGHT_NAMES: Record<number, string> = { 100: "Thin", 200: "Extra light", 300: "Light", 400: "Regular", 500: "Medium", 600: "Semibold", 700: "Bold", 800: "Extra bold", 900: "Black" };
/**
 * Is `family` installed? Compare text widths against two different generic fallbacks: an installed font
 * differs from at least one of them. `measure` takes a CSS font shorthand tail (e.g. `"Verdana", serif`).
 */
export function isInstalled(measure: (fontFamily: string) => number, family: string): boolean {
  if (GENERIC_FAMILIES.has(family)) return true;
  const q = `"${family}"`; return measure(`${q}, monospace`) !== measure("monospace") || measure(`${q}, serif`) !== measure("serif") || measure(`${q}, sans-serif`) !== measure("sans-serif");
}
export const fontShorthand = (stack: string, weight: number, sizePx: number, italic: boolean): string => `${italic ? "italic " : ""}${weight} ${sizePx / 16}rem ${stack}`;
export type Availability = "checking" | "available" | "missing" | "unknown";
/** Interpret the FontFace objects returned by document.fonts.load: available only if a face actually loaded. */
export const availabilityFromFaces = (faces: { status: string }[] | null): Availability => (faces === null ? "unknown" : faces.some((f) => f.status === "loaded") ? "available" : "missing");
