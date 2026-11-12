import type { PaletteId, Role } from "./types.ts";

/** Token colours (dark and light schemes). Kept in sync with jupiter.tokens.json by test/esphome.test.ts. */
export const THEME = {
  dark: { bg: "#0e1016", surface: "#151821", border: "#2b3040", text: "#e6e4df", muted: "#9a9fab", accent: "#9d8cff", onAccent: "#0e1016", ok: "#5ad17a", warn: "#f2b544", danger: "#ff7a70", info: "#4fd1e0" },
  light: { bg: "#faf9f7", surface: "#f3f1ec", border: "#d9d5cc", text: "#16171d", muted: "#5b5f6b", accent: "#4b3fbf", onAccent: "#fdfcfa", ok: "#1b6e34", warn: "#8a5a00", danger: "#b42323", info: "#0b6b7d" },
} as const satisfies Record<"dark" | "light", Record<Role, string>>;

/** Ids from jupiter-esphome.yaml `color:` (dark scheme). */
const YAML_ID: Record<Role, string> = { bg: "jp_bg", surface: "jp_surface", border: "jp_border", text: "jp_text", muted: "jp_text_muted", accent: "jp_accent", onAccent: "jp_on_accent", ok: "jp_ok", warn: "jp_warn", danger: "jp_danger", info: "jp_info" };

export interface Ink {
  /** Legal colour for this palette, "#rrggbb". */
  hex: string;
  /** C++ colour expression for display lambdas. */
  lambda: string;
  /** Draw solid fills as horizontal stripes (the only way a 1-bit display can say "warning"). */
  hatch: boolean;
}

const BLACK = "#000000", WHITE = "#ffffff", RED = "#ff0000", YELLOW = "#ffff00";
const ON = "COLOR_ON", OFF = "COLOR_OFF";
const C = (hex: string, lambda: string, hatch = false): Ink => ({ hex, lambda, hatch });

/** The legal inks of each palette (what the panel can physically show). */
export const LEGAL: Record<PaletteId, string[]> = {
  colour: Object.values(THEME.dark),
  epaper3: [WHITE, BLACK, RED],
  epaper4: [WHITE, BLACK, RED, YELLOW],
  mono: [BLACK, WHITE],
};

/** Pick the palette-legal ink for a semantic role. e-paper: paper is white, ink is black; mono (OLED): pixels lit on black. */
export function resolveInk(role: Role, palette: PaletteId): Ink {
  switch (palette) {
    case "colour": return C(THEME.dark[role], `id(${YAML_ID[role]})`);
    case "epaper3":
    case "epaper4": {
      if (role === "bg" || role === "onAccent") return C(WHITE, OFF);
      if (role === "danger") return C(RED, "Color(255, 0, 0)");
      if (role === "warn") return palette === "epaper4" ? C(YELLOW, "Color(255, 255, 0)") : C(RED, "Color(255, 0, 0)");
      return C(BLACK, ON);
    }
    case "mono":
      if (role === "bg" || role === "onAccent") return C(BLACK, OFF);
      return C(WHITE, ON, role === "warn");
  }
}

const rgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
/** Nearest legal colour for any "#rrggbb" (mono: by luminance). Colour palette: unchanged. */
export function quantise(hex: string, palette: PaletteId): string {
  if (palette === "colour") return hex.toLowerCase();
  const [r, g, b] = rgb(hex);
  if (palette === "mono") return 0.2126 * r + 0.7152 * g + 0.0722 * b >= 128 ? WHITE : BLACK;
  let best = LEGAL[palette][0], bd = Infinity;
  for (const c of LEGAL[palette]) { const [x, y, z] = rgb(c); const d = (r - x) ** 2 + (g - y) ** 2 + (b - z) ** 2; if (d < bd) { bd = d; best = c; } }
  return best;
}
