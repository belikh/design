// Jupiter design tokens — the single source of truth.
// Every output (jupiter.css, email, terminal, kiosk, mobile JSON) is generated from this object.

import defaults from "../jupiter.tokens.json" with { type: "json" };

export interface ColorSet {
  bg: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  onAccent: string;
  ok: string;
  okBg: string;
  warn: string;
  warnBg: string;
  danger: string;
  dangerBg: string;
  info: string;
  infoBg: string;
}

export type ColorRole = keyof ColorSet;

export interface Tokens {
  name: string;
  version: string;
  color: { light: ColorSet; dark: ColorSet };
  font: { sans: string; mono: string };
  type: { scale: number[]; lineHeightBody: number; lineHeightHeading: number };
  space: number[];
  radius: { sm: number; md: number };
  motion: { fast: number; base: number; slow: number; easing: string };
  layout: { readingMeasure: number; columns: number; gutter: number; breakpoints: number[] };
  control: { height: number };
  kiosk: { minTarget: number; typeScale: number; spaceScale: number };
  /** Shadows: sm (raised controls), md (menus, popovers), lg (dialogs). */
  elevation?: { sm: string; md: string; lg: string; up: string };
  /** Stacking order. Components use these names, never raw numbers. */
  z?: { sticky: number; nav: number; bar: number; menu: number; banner: number; overlay: number; drawer: number; toast: number; popover: number; tooltip: number; top: number };
  /** Fixed sizes of application chrome and overlays, in px. */
  chrome?: { sidebar: number; sidebarRail: number; topbar: number; modalSm: number; modalMd: number; modalLg: number; drawer: number; toast: number; rowTight: number; rowNormal: number; rowTall: number };
  /** Fixed pixel font sizes for devices with built-in fonts (ESPHome displays). Independent of the web type scale. */
  device?: { fontSizes: number[] };
  /** Per-density values (applied with data-density="compact"). */
  density?: { comfortable: DensitySet; compact: DensitySet };
}
export interface DensitySet { control: number; cellY: number; pad: number }
/** The tokens with every optional group filled from the defaults, so older saved or imported token files keep working. */
export function withDefaults(t: Tokens): Required<Tokens> {
  return { ...t, elevation: t.elevation ?? DEFAULT_TOKENS.elevation!, z: t.z ?? DEFAULT_TOKENS.z!, chrome: t.chrome ?? DEFAULT_TOKENS.chrome!, density: t.density ?? DEFAULT_TOKENS.density!, device: t.device ?? DEFAULT_TOKENS.device! } as Required<Tokens>;
}

export const SANS_FALLBACK = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
export const MONO_FALLBACK = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

export const FONT_PRESETS = {
  sans: [
    { label: "SGI Text", value: `"SGI Text", ${SANS_FALLBACK}` },
    { label: "SGI Alt", value: `"SGI Alt", ${SANS_FALLBACK}` },
    { label: "System UI", value: SANS_FALLBACK },
    { label: "Inter (if installed)", value: `Inter, ${SANS_FALLBACK}` },
  ],
  mono: [
    { label: "JetBrains Mono", value: `"JetBrains Mono", ${MONO_FALLBACK}` },
    { label: "System mono", value: MONO_FALLBACK },
  ],
};

/** The shipped defaults. Edit `jupiter.tokens.json` (the single source of truth) and rebuild. */
export const DEFAULT_TOKENS: Tokens = defaults as Tokens;

export const TYPE_NAMES = ["xs", "sm", "md", "lg", "xl", "2xl"] as const;

export const ROLE_LABELS: Record<ColorRole, string> = {
  bg: "bg",
  surface: "surface",
  surfaceRaised: "surface-raised",
  border: "border",
  text: "text",
  textMuted: "text-muted",
  accent: "accent",
  onAccent: "on-accent",
  ok: "ok",
  okBg: "ok-bg",
  warn: "warn",
  warnBg: "warn-bg",
  danger: "danger",
  dangerBg: "danger-bg",
  info: "info",
  infoBg: "info-bg",
};

export const ROLE_ORDER = Object.keys(ROLE_LABELS) as ColorRole[];

export function cssVarName(role: ColorRole): string {
  return `--jp-${ROLE_LABELS[role]}`;
}

export function cloneTokens(t: Tokens): Tokens {
  return JSON.parse(JSON.stringify(t)) as Tokens;
}

/** Shallow structural check for imported token files. */
export function isTokens(v: unknown): v is Tokens {
  if (!v || typeof v !== "object") return false;
  const t = v as Partial<Tokens>;
  return !!(
    t.color?.light &&
    t.color?.dark &&
    t.font?.sans &&
    Array.isArray(t.type?.scale) &&
    t.type.scale.length === 6 &&
    Array.isArray(t.space) &&
    t.space.length === 8 &&
    t.radius &&
    t.motion &&
    t.layout &&
    t.control &&
    t.kiosk
  );
}
