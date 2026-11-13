// Generators: Tokens → every target. Pure functions, no DOM.
import { hexToRgb, mix } from "./contrast.ts";
import { generateGithubTheme } from "./github.ts";
import { ROLE_LABELS, ROLE_ORDER, TYPE_NAMES, cssVarName, withDefaults, type ColorSet, type Tokens } from "./tokens.ts";

const px = (n: number) => `${n}px`;
const ms = (n: number) => `${n}ms`;

function colorVars(c: ColorSet, indent = "  "): string {
  return ROLE_ORDER.map((r) => `${indent}${cssVarName(r)}: ${c[r]};`).join("\n");
}

/** Elevation, stacking, chrome sizes and density: the constants components used to hard-code. */
function extraVars(t: Tokens): string {
  const x = withDefaults(t); const kebab = (k: string) => k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  return [
    ...Object.entries(x.elevation).map(([k, v]) => `  --jp-shadow-${k}: ${v};`),
    ...Object.entries(x.z).map(([k, v]) => `  --jp-z-${k}: ${v};`),
    ...Object.entries(x.chrome).map(([k, v]) => `  --jp-size-${kebab(k)}: ${px(v)};`),
    `  --jp-cell-py: ${px(x.density.comfortable.cellY)};`,
    `  --jp-pad: ${px(x.density.comfortable.pad)};`,
  ].join("\n");
}

function scaleVars(t: Tokens, typeMul = 1, spaceMul = 1, controlH = t.control.height): string {
  const round4 = (n: number) => Math.round(n / 4) * 4;
  const type = t.type.scale
    .map((s, i) => `  --jp-fs-${TYPE_NAMES[i]}: ${px(typeMul === 1 ? s : round4(s * typeMul))};`)
    .join("\n");
  const space = t.space
    .map((s, i) => `  --jp-space-${i + 1}: ${px(spaceMul === 1 ? s : round4(s * spaceMul))};`)
    .join("\n");
  return `${type}
  --jp-lh-body: ${t.type.lineHeightBody};
  --jp-lh-heading: ${t.type.lineHeightHeading};
${space}
  --jp-control-h: ${px(controlH)};
  --jp-toggle-h: ${px(Math.round(controlH * 0.625))};`;
}

function fontFaces(base: string): string {
  const faces: string[] = [];
  for (const fam of ["SGI Text", "SGI Alt"]) {
    const slug = fam.toLowerCase().replace(" ", "-");
    for (const w of [400, 700, 800]) {
      for (const style of ["normal", "italic"]) {
        const file = `${slug}-${w}${style === "italic" ? "-italic" : ""}.woff2`;
        faces.push(
          `@font-face { font-family: "${fam}"; src: url("${base}${file}") format("woff2"); font-weight: ${w}; font-style: ${style}; font-display: swap; }`,
        );
      }
    }
  }
  faces.push(
    `@font-face { font-family: "JetBrains Mono"; src: local("JetBrains Mono"), url("${base}jetbrains-mono.woff2") format("woff2"); font-weight: 100 800; font-style: normal; font-display: swap; }`,
    `@font-face { font-family: "JetBrains Mono"; src: local("JetBrains Mono Italic"), url("${base}jetbrains-mono-italic.woff2") format("woff2"); font-weight: 100 800; font-style: italic; font-display: swap; }`,
  );
  return faces.join("\n");
}

const COMPONENTS_CSS = String.raw`
/* ---------- base ---------- */
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--jp-bg);
  color: var(--jp-text);
  font-family: var(--jp-font-sans);
  font-size: var(--jp-fs-sm);
  line-height: var(--jp-lh-body);
  font-variant-numeric: tabular-nums;
  -webkit-font-smoothing: antialiased;
}
:where(h1, h2, h3, h4) { margin: 0; line-height: var(--jp-lh-heading); font-weight: 700; letter-spacing: -0.01em; }
:where(h1) { font-size: var(--jp-fs-xl); }
:where(h2) { font-size: var(--jp-fs-lg); }
:where(h3) { font-size: var(--jp-fs-md); }
:where(h4) { font-size: var(--jp-fs-sm); }
:where(p) { margin: 0; }
:where(a) { color: var(--jp-accent); text-underline-offset: 2px; }
:where(code, kbd, samp, pre) { font-family: var(--jp-font-mono); font-size: 0.92em; font-variant-ligatures: none; }
:where(table, input, select, button, td, th) { font-variant-numeric: tabular-nums; }
:where(hr) { border: 0; border-top: 1px solid var(--jp-border); margin: var(--jp-space-5) 0; }
::selection { background: var(--jp-accent); color: var(--jp-on-accent); }

.jp-display { font-size: var(--jp-fs-2xl); line-height: var(--jp-lh-heading); font-weight: 800; letter-spacing: -0.02em; }
.jp-mono { font-family: var(--jp-font-mono); }
.jp-muted { color: var(--jp-text-muted); }
.jp-label, .jp-eyebrow {
  font-family: var(--jp-font-mono); font-size: var(--jp-fs-xs); font-weight: 500; line-height: 1.2;
  text-transform: uppercase; letter-spacing: 0.06em; color: var(--jp-text-muted);
}
.jp-eyebrow { color: var(--jp-accent); }
.jp-inline { display: inline-flex; align-items: center; gap: var(--jp-space-2); }
.jp-stack > * + * { margin-top: var(--jp-space-4); }

/* ---------- focus ---------- */
:where(a, button, input, select, textarea, summary, [tabindex]):focus-visible {
  outline: 2px solid var(--jp-accent); outline-offset: 2px;
}

/* ---------- 1. button ---------- */
.jp-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--jp-space-2);
  min-height: var(--jp-control-h); padding: 0 var(--jp-space-4);
  border: 1px solid transparent; border-radius: var(--jp-radius-sm);
  font-family: var(--jp-font-mono); font-size: var(--jp-fs-sm); font-weight: 500; line-height: 1; letter-spacing: 0.01em;
  text-decoration: none; cursor: pointer; user-select: none; white-space: nowrap;
  transition: background-color var(--jp-dur-fast) var(--jp-ease), border-color var(--jp-dur-fast) var(--jp-ease),
    color var(--jp-dur-fast) var(--jp-ease), transform var(--jp-dur-fast) var(--jp-ease);
}
.jp-btn:active:not(:disabled) { transform: translateY(1px); }
.jp-btn:disabled, .jp-btn[aria-disabled="true"] { opacity: 0.5; cursor: not-allowed; }
.jp-btn--primary { background: var(--jp-accent); color: var(--jp-on-accent); }
.jp-btn--primary:hover:not(:disabled) { background: color-mix(in srgb, var(--jp-accent) 86%, var(--jp-text)); }
.jp-btn--secondary { background: var(--jp-surface-raised); color: var(--jp-text); border-color: var(--jp-border); }
.jp-btn--secondary:hover:not(:disabled) { border-color: var(--jp-text-muted); }
.jp-btn--ghost { background: transparent; color: var(--jp-text); }
.jp-btn--ghost:hover:not(:disabled) { background: var(--jp-surface); }
.jp-btn--sm { min-height: calc(var(--jp-control-h) - 8px); padding: 0 var(--jp-space-3); font-size: var(--jp-fs-xs); }

/* ---------- 2. input, select, toggle ---------- */
.jp-field { display: grid; gap: var(--jp-space-1); min-width: 0; }
.jp-hint { font-size: var(--jp-fs-xs); color: var(--jp-text-muted); }
.jp-input, .jp-select {
  width: 100%; min-height: var(--jp-control-h); padding: 0 var(--jp-space-3);
  background: var(--jp-surface-raised); color: var(--jp-text);
  border: 1px solid var(--jp-border); border-radius: var(--jp-radius-sm);
  font-family: var(--jp-font-sans); font-size: var(--jp-fs-sm); line-height: 1.2;
  transition: border-color var(--jp-dur-fast) var(--jp-ease), box-shadow var(--jp-dur-fast) var(--jp-ease);
}
.jp-input::placeholder { color: var(--jp-text-muted); }
.jp-input:hover, .jp-select:hover { border-color: var(--jp-text-muted); }
.jp-input:focus-visible, .jp-select:focus-visible { outline: 2px solid var(--jp-accent); outline-offset: 1px; border-color: var(--jp-accent); }
.jp-input[aria-invalid="true"] { border-color: var(--jp-danger); }
.jp-input--mono { font-family: var(--jp-font-mono); }
.jp-select {
  appearance: none; padding-right: var(--jp-space-6); cursor: pointer;
  background-image: linear-gradient(45deg, transparent 50%, var(--jp-text-muted) 50%),
    linear-gradient(135deg, var(--jp-text-muted) 50%, transparent 50%);
  background-position: calc(100% - 15px) 50%, calc(100% - 10px) 50%;
  background-size: 5px 5px; background-repeat: no-repeat;
}
.jp-toggle {
  appearance: none; position: relative; flex: none; margin: 0; cursor: pointer;
  width: calc(var(--jp-toggle-h) * 1.8); height: var(--jp-toggle-h);
  border: 1px solid var(--jp-border); border-radius: 9999px; background: var(--jp-surface);
  transition: background-color var(--jp-dur-base) var(--jp-ease), border-color var(--jp-dur-base) var(--jp-ease);
}
.jp-toggle::after {
  content: ""; position: absolute; top: 2px; left: 2px;
  width: calc(var(--jp-toggle-h) - 6px); height: calc(var(--jp-toggle-h) - 6px);
  border-radius: 50%; background: var(--jp-text-muted);
  transition: transform var(--jp-dur-base) var(--jp-ease), background-color var(--jp-dur-base) var(--jp-ease);
}
.jp-toggle:checked { background: var(--jp-accent); border-color: var(--jp-accent); }
.jp-toggle:checked::after { transform: translateX(calc(var(--jp-toggle-h) * 0.8)); background: var(--jp-on-accent); }
.jp-toggle:disabled { opacity: 0.5; cursor: not-allowed; }

/* ---------- 3. card / panel ---------- */
.jp-panel { background: var(--jp-surface-raised); border: 1px solid var(--jp-border); border-radius: var(--jp-radius-md); overflow: hidden; min-width: 0; }
.jp-panel__bar {
  display: flex; align-items: center; gap: var(--jp-space-2); min-height: 28px; padding: 0 var(--jp-space-2) 0 var(--jp-space-3);
  background: var(--jp-surface); border-bottom: 1px solid var(--jp-border);
  font-family: var(--jp-font-mono); font-size: var(--jp-fs-xs); text-transform: uppercase; letter-spacing: 0.06em; color: var(--jp-text-muted);
}
.jp-panel__bar::before { content: ""; flex: none; width: 8px; height: 8px; border: 1px solid currentColor; border-radius: 1px; }
.jp-panel__title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--jp-text); font-weight: 500; }
.jp-panel__body { padding: var(--jp-space-4); }
.jp-panel__body--flush { padding: 0; }

/* ---------- 4. table ---------- */
.jp-table-wrap { overflow: auto; max-height: var(--jp-table-max, 24rem); border: 1px solid var(--jp-border); border-radius: var(--jp-radius-md); background: var(--jp-surface-raised); }
.jp-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: var(--jp-fs-sm); }
.jp-table th, .jp-table td { padding: 6px var(--jp-space-3); text-align: left; border-bottom: 1px solid var(--jp-border); white-space: nowrap; }
.jp-table thead th {
  position: sticky; top: 0; z-index: 1; background: var(--jp-surface);
  font-family: var(--jp-font-mono); font-size: var(--jp-fs-xs); font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; color: var(--jp-text-muted);
}
.jp-table th button { all: unset; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; }
.jp-table th button:focus-visible { outline: 2px solid var(--jp-accent); outline-offset: 2px; }
.jp-table th button::after { content: "\2195"; opacity: 0.5; }
.jp-table th[aria-sort="ascending"] button::after { content: "\25B2"; opacity: 1; font-size: 0.8em; }
.jp-table th[aria-sort="descending"] button::after { content: "\25BC"; opacity: 1; font-size: 0.8em; }
.jp-table th[aria-sort] { color: var(--jp-text); }
.jp-table .jp-num { font-family: var(--jp-font-mono); text-align: right; }
.jp-table th.jp-num button { flex-direction: row-reverse; }
.jp-table tbody tr { transition: background-color var(--jp-dur-fast) var(--jp-ease); }
.jp-table tbody tr:hover { background: var(--jp-surface); }
.jp-table tbody tr:last-child td { border-bottom: 0; }

/* ---------- 5. badge / status chip ---------- */
.jp-badge {
  display: inline-flex; align-items: center; gap: 6px; height: 22px; padding: 0 var(--jp-space-2);
  border: 1px solid var(--jp-border); border-radius: var(--jp-radius-sm); background: var(--jp-surface); color: var(--jp-text);
  font-family: var(--jp-font-mono); font-size: var(--jp-fs-xs); font-weight: 500; line-height: 1; white-space: nowrap;
}
.jp-badge::before { content: ""; flex: none; width: 8px; height: 8px; background: currentColor; border-radius: 50%; }
.jp-badge--pill { border-radius: 9999px; }
.jp-badge--ok { background: var(--jp-ok-bg); color: var(--jp-ok); border-color: transparent; }
.jp-badge--warn { background: var(--jp-warn-bg); color: var(--jp-warn); border-color: transparent; }
.jp-badge--warn::before { border-radius: 0; clip-path: polygon(50% 0, 100% 100%, 0 100%); }
.jp-badge--danger { background: var(--jp-danger-bg); color: var(--jp-danger); border-color: transparent; }
.jp-badge--danger::before { border-radius: 1px; }
.jp-badge--info { background: var(--jp-info-bg); color: var(--jp-info); border-color: transparent; }
.jp-badge--info::before { border-radius: 0; clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%); }

/* ---------- 6. stat tile ---------- */
.jp-stat { display: grid; gap: var(--jp-space-1); padding: var(--jp-space-4); background: var(--jp-surface-raised); border: 1px solid var(--jp-border); border-radius: var(--jp-radius-md); min-width: 0; }
.jp-stat__label { font-family: var(--jp-font-mono); font-size: var(--jp-fs-xs); text-transform: uppercase; letter-spacing: 0.06em; color: var(--jp-text-muted); }
.jp-stat__value { font-family: var(--jp-font-mono); font-size: var(--jp-fs-xl); font-weight: 600; line-height: 1.1; letter-spacing: -0.02em; }
.jp-stat__value small { font-size: var(--jp-fs-sm); font-weight: 400; color: var(--jp-text-muted); margin-left: 2px; }
.jp-stat__meta { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--jp-space-3); font-family: var(--jp-font-mono); font-size: var(--jp-fs-xs); color: var(--jp-text-muted); }
.jp-stat__spark { width: 96px; height: 24px; color: var(--jp-accent); flex: none; }
.jp-stat__spark polyline { fill: none; stroke: currentColor; stroke-width: 1.5; vector-effect: non-scaling-stroke; }
.jp-delta--up { color: var(--jp-ok); }
.jp-delta--up::before { content: "\25B2 "; }
.jp-delta--down { color: var(--jp-danger); }
.jp-delta--down::before { content: "\25BC "; }

/* ---------- 7. code / log block ---------- */
.jp-code { background: var(--jp-surface); border: 1px solid var(--jp-border); border-radius: var(--jp-radius-md); overflow: hidden; min-width: 0; }
.jp-code__bar {
  display: flex; align-items: center; justify-content: space-between; gap: var(--jp-space-2); min-height: 28px; padding-left: var(--jp-space-3);
  border-bottom: 1px solid var(--jp-border); font-family: var(--jp-font-mono); font-size: var(--jp-fs-xs); text-transform: uppercase; letter-spacing: 0.06em; color: var(--jp-text-muted);
}
.jp-code__copy {
  all: unset; align-self: stretch; display: inline-flex; align-items: center; padding: 0 var(--jp-space-3); cursor: pointer;
  border-left: 1px solid var(--jp-border); color: var(--jp-text); font-family: var(--jp-font-mono); font-size: var(--jp-fs-xs);
  transition: background-color var(--jp-dur-fast) var(--jp-ease);
}
.jp-code__copy:hover { background: var(--jp-surface-raised); }
.jp-code__copy:focus-visible { outline: 2px solid var(--jp-accent); outline-offset: -2px; }
.jp-code pre { margin: 0; padding: var(--jp-space-3) var(--jp-space-4); overflow: auto; max-height: var(--jp-code-max, 28rem); font-size: var(--jp-fs-xs); line-height: 1.65; color: var(--jp-text); tab-size: 2; }
.jp-log-ok { color: var(--jp-ok); }
.jp-log-warn { color: var(--jp-warn); }
.jp-log-danger { color: var(--jp-danger); }
.jp-log-info { color: var(--jp-info); }
.jp-log-dim { color: var(--jp-text-muted); }

/* ---------- 8. callout ---------- */
.jp-callout {
  display: grid; gap: var(--jp-space-1); padding: var(--jp-space-3) var(--jp-space-4);
  border-left: 3px solid currentColor; border-radius: var(--jp-radius-sm);
  background: var(--jp-info-bg); color: var(--jp-info);
}
.jp-callout > * { margin: 0; }
.jp-callout p { color: var(--jp-text); }
.jp-callout__title { font-family: var(--jp-font-mono); font-size: var(--jp-fs-xs); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
.jp-callout__title::before { content: "[i] "; }
.jp-callout--warn { background: var(--jp-warn-bg); color: var(--jp-warn); }
.jp-callout--warn .jp-callout__title::before { content: "[!] "; }
.jp-callout--danger { background: var(--jp-danger-bg); color: var(--jp-danger); }
.jp-callout--danger .jp-callout__title::before { content: "[x] "; }

/* ---------- layout ---------- */
.jp-container { width: 100%; max-width: var(--jp-container-max); margin-inline: auto; padding-inline: var(--jp-gutter); }
.jp-prose { max-width: var(--jp-measure); font-size: var(--jp-fs-md); }
.jp-prose > * + * { margin-top: var(--jp-space-4); }
.jp-prose :where(h2, h3) { margin-top: var(--jp-space-6); }
.jp-grid { display: grid; grid-template-columns: repeat(var(--jp-columns), minmax(0, 1fr)); gap: var(--jp-space-4); }
.jp-grid > * { grid-column: 1 / -1; }
`;

function gridCols(t: Tokens): string {
  const n = t.layout.columns;
  const cols = (prefix: string) =>
    Array.from({ length: n }, (_, i) => `.jp-grid > .jp-${prefix}${i + 1} { grid-column: span ${i + 1}; }`).join("\n");
  const [sm, md, lg] = t.layout.breakpoints;
  return `${cols("col-")}
@media (min-width: ${sm}px) {
  :root { --jp-gutter: ${px(t.space[4])}; }
${cols("sm-")}
}
@media (min-width: ${md}px) {
${cols("md-")}
}
@media (min-width: ${lg}px) {
${cols("lg-")}
}`;
}

export interface CssOptions {
  /** Path prefix for the fonts folder, e.g. "fonts/" next to the CSS. Only used when `fonts` is true. */
  fontBase?: string;
  /** Include @font-face rules. Off by default so a clean install never references missing font files. */
  fonts?: boolean;
  /** Wrap components in `@layer <name>` so app styles and Tailwind utilities win. Default "jupiter"; false = unlayered. */
  layer?: string | false;
  /** Omit the leading comment banner. */
  bare?: boolean;
}

const banner = (t: Tokens, what: string) => `/*!
 * ${t.name} ${t.version}: ${what}. Generated from ${t.name}.tokens.json. Do not edit by hand.
 * Light follows the OS; force with <html data-theme="light|dark">. Any element may set data-theme.
 */
`;

/** @font-face rules only. Ship alongside the font files; opt in per project (SGI faces are proprietary). */
export function generateFontsCSS(t: Tokens, fontBase = "fonts/"): string {
  return `${banner(t, "font faces")}${fontFaces(fontBase)}\n`;
}

/** CSS custom properties only (colours for light/dark, type, space, radius, motion, layout). No selectors beyond :root / [data-theme]. */
export function generateTokensCSS(t: Tokens, opts: Pick<CssOptions, "bare"> = {}): string {
  return `${opts.bare ? "" : banner(t, "design tokens (CSS variables)")}
:root,
[data-theme="light"] {
${colorVars(t.color.light)}
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${colorVars(t.color.dark, "    ")}
    color-scheme: dark;
  }
}
[data-theme="dark"] {
${colorVars(t.color.dark)}
  color-scheme: dark;
}

:root {
  --jp-font-sans: ${t.font.sans};
  --jp-font-mono: ${t.font.mono};
${scaleVars(t)}
  --jp-radius-sm: ${px(t.radius.sm)};
  --jp-radius-md: ${px(t.radius.md)};
  --jp-radius-full: 9999px;
  --jp-dur-fast: ${ms(t.motion.fast)};
  --jp-dur-base: ${ms(t.motion.base)};
  --jp-dur-slow: ${ms(t.motion.slow)};
  --jp-ease: ${t.motion.easing};
  --jp-measure: ${t.layout.readingMeasure}ch;
  --jp-columns: ${t.layout.columns};
  --jp-gutter: ${px(t.layout.gutter)};
  --jp-container-max: ${px(t.layout.breakpoints[2])};
${extraVars(t)}
}
[data-density="compact"] {
  --jp-control-h: ${px(withDefaults(t).density.compact.control)};
  --jp-cell-py: ${px(withDefaults(t).density.compact.cellY)};
  --jp-pad: ${px(withDefaults(t).density.compact.pad)};
}
`;
}

/** The .jp-* component classes (buttons, inputs, tables, badges, callouts, layout...). Needs the tokens CSS. */
export function generateComponentsCSS(t: Tokens, opts: Pick<CssOptions, "layer" | "bare"> = {}): string {
  const layer = opts.layer === undefined ? "jupiter" : opts.layer;
  const body = `[data-theme] { background-color: var(--jp-bg); color: var(--jp-text); }
${COMPONENTS_CSS}
${gridCols(t)}

/* user preferences that re-point tokens: compact density, high contrast, print */
[data-density="compact"] { --jp-control-h: 28px; }
[data-contrast="high"] { --jp-border: var(--jp-text); --jp-text-muted: var(--jp-text); }
@media print {
  :root, [data-theme] { --jp-bg: #fff; --jp-surface: #f4f4f4; --jp-surface-raised: #fff; --jp-text: #000; --jp-text-muted: #444; --jp-border: #999; }
}

@media (prefers-reduced-motion: reduce) {
  :root { --jp-dur-fast: 0ms; --jp-dur-base: 0ms; --jp-dur-slow: 0ms; }
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0ms !important; scroll-behavior: auto !important; }
}
`;
  return `${opts.bare ? "" : banner(t, "components")}${layer ? `@layer ${layer} {\n${body}}\n` : body}`;
}

/** Tokens + components in one file (fonts excluded unless `fonts: true`). This is `jupiter.css`. */
export function generateCSS(t: Tokens, opts: CssOptions = {}): string {
  const head = opts.bare ? "" : banner(t, "tokens + components");
  const fonts = opts.fonts ? `${fontFaces(opts.fontBase ?? "fonts/")}\n` : "";
  return `${head}${fonts}${generateTokensCSS(t, { bare: true })}${generateComponentsCSS(t, { layer: opts.layer, bare: true })}`;
}

/** Tailwind v4 theme: exposes the tokens as utilities (bg-jp-surface, text-jp-accent, font-jp-mono, rounded-jp-md). */
export function generateTailwindCSS(t: Tokens): string {
  const colors = ROLE_ORDER.map((r) => `  --color-jp-${ROLE_LABELS[r]}: var(${cssVarName(r)});`).join("\n");
  return `${banner(t, "Tailwind v4 theme")}/* Usage: @import "tailwindcss"; @import "@belikh/jupiter-tokens/tokens.css"; @import "@belikh/jupiter-tokens/tailwind.css"; */
@theme inline {
${colors}
  --font-jp-sans: var(--jp-font-sans);
  --font-jp-mono: var(--jp-font-mono);
  --radius-jp-sm: var(--jp-radius-sm);
  --radius-jp-md: var(--jp-radius-md);
}
`;
}

/** Kiosk / touch overrides — load after jupiter.css, or scope with .jp-kiosk. */
export function generateKioskCSS(t: Tokens, scope = ":root, .jp-kiosk"): string {
  const k = t.kiosk;
  return `/*! ${t.name}-kiosk.css — touch overrides generated from ${t.name}.tokens.json. Load after ${t.name}.css. */
${scope} {
${scaleVars(t, k.typeScale, k.spaceScale, Math.max(k.minTarget, t.control.height))}
}
.jp-kiosk, body.jp-kiosk { font-size: var(--jp-fs-md); touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
.jp-kiosk :where(.jp-btn, .jp-input, .jp-select) { min-height: ${px(k.minTarget)}; font-size: var(--jp-fs-md); }
.jp-kiosk .jp-btn { padding: 0 var(--jp-space-5); }
.jp-kiosk .jp-btn:active:not(:disabled) { transform: scale(0.98); }
.jp-kiosk .jp-table th, .jp-kiosk .jp-table td { padding: var(--jp-space-3) var(--jp-space-4); height: ${px(k.minTarget)}; }
.jp-kiosk .jp-badge { height: 32px; font-size: var(--jp-fs-sm); padding: 0 var(--jp-space-3); }
.jp-kiosk :where(a, button, [role="button"], select, label):not(.jp-toggle) { min-height: ${px(k.minTarget)}; }
.jp-kiosk :focus-visible { outline-width: 3px; outline-offset: 3px; }
`;
}

/* ---------- terminal / SSH ---------- */
export interface AnsiColor {
  index: number;
  name: string;
  hex: string;
  role: string;
}

export function ansiPalette(t: Tokens): { bg: string; fg: string; cursor: string; colors: AnsiColor[] } {
  const d = t.color.dark;
  const bright = (h: string) => mix(h, "#ffffff", 0.25);
  const base: [string, string, string][] = [
    ["black", d.surface, "surface"],
    ["red", d.danger, "danger"],
    ["green", d.ok, "ok"],
    ["yellow", d.warn, "warn"],
    ["blue", mix(d.accent, d.info, 0.35), "accent→info"],
    ["magenta", d.accent, "accent"],
    ["cyan", d.info, "info"],
    ["white", d.textMuted, "text-muted"],
  ];
  const colors: AnsiColor[] = [
    ...base.map(([name, hex, role], i) => ({ index: i, name, hex, role })),
    ...base.map(([name, hex, role], i) => ({
      index: i + 8,
      name: `bright ${name}`,
      hex: i === 0 ? d.border : i === 7 ? d.text : bright(hex),
      role: i === 0 ? "border" : i === 7 ? "text" : `${role} +25%`,
    })),
  ];
  return { bg: d.bg, fg: d.text, cursor: d.accent, colors };
}

export function generateTerminalSh(t: Tokens): string {
  const p = ansiPalette(t);
  const osc = p.colors.map((c) => `printf '\\033]4;${c.index};${c.hex}\\007'`).join("\n");
  return `#!/bin/sh
# ${t.name}-terminal.sh — ANSI 16 palette generated from ${t.name}.tokens.json (dark roles).
# Works over SSH in any OSC-4 capable terminal (xterm, iTerm2, kitty, Alacritty, WezTerm, Windows Terminal).
# Usage:  . ./${t.name}-terminal.sh      (or add to ~/.profile on the remote host)
${osc}
printf '\\033]10;${p.fg}\\007'   # foreground
printf '\\033]11;${p.bg}\\007'   # background
printf '\\033]12;${p.cursor}\\007'   # cursor
`;
}

export function generateXresources(t: Tokens): string {
  const p = ansiPalette(t);
  return `! ${t.name}.Xresources — generated from ${t.name}.tokens.json
*.foreground: ${p.fg}
*.background: ${p.bg}
*.cursorColor: ${p.cursor}
${p.colors.map((c) => `*.color${c.index}: ${c.hex}  ! ${c.name} (${c.role})`).join("\n")}
`;
}

/* ---------- mobile (W3C design-tokens JSON) ---------- */
export function generateMobileJSON(t: Tokens): string {
  const colorGroup = (c: ColorSet) =>
    Object.fromEntries(ROLE_ORDER.map((r) => [cssVarName(r).replace("--jp-", ""), { $value: c[r], $type: "color" }]));
  const out = {
    $description: `${t.name} v${t.version} mobile tokens (W3C design-tokens format). Dimensions are dp (Android) / pt (iOS).`,
    color: { light: colorGroup(t.color.light), dark: colorGroup(t.color.dark) },
    font: {
      sans: { $value: t.font.sans.split(",").map((s) => s.trim().replace(/"/g, "")), $type: "fontFamily" },
      mono: { $value: t.font.mono.split(",").map((s) => s.trim().replace(/"/g, "")), $type: "fontFamily" },
      size: Object.fromEntries(t.type.scale.map((s, i) => [TYPE_NAMES[i], { $value: s, $type: "dimension" }])),
      lineHeight: {
        body: { $value: t.type.lineHeightBody, $type: "number" },
        heading: { $value: t.type.lineHeightHeading, $type: "number" },
      },
      tabularNumerals: { $value: true, $type: "boolean" },
    },
    space: Object.fromEntries(t.space.map((s, i) => [String(i + 1), { $value: s, $type: "dimension" }])),
    radius: {
      sm: { $value: t.radius.sm, $type: "dimension" },
      md: { $value: t.radius.md, $type: "dimension" },
      full: { $value: 9999, $type: "dimension" },
    },
    motion: {
      fast: { $value: t.motion.fast, $type: "duration" },
      base: { $value: t.motion.base, $type: "duration" },
      slow: { $value: t.motion.slow, $type: "duration" },
      easing: { $value: t.motion.easing, $type: "cubicBezier" },
      respectReduceMotion: { $value: true, $type: "boolean" },
    },
    touch: {
      minTarget: { $value: Math.max(44, t.kiosk.minTarget - 4), $type: "dimension" },
      control: { $value: Math.max(44, t.control.height + 12), $type: "dimension" },
    },
  };
  return JSON.stringify(out, null, 2) + "\n";
}

/* ---------- email (table-based, inline styles, light-safe) ---------- */
export function generateEmailHTML(t: Tokens): string {
  const c = t.color.light;
  const sans = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;
  const mono = `ui-monospace, Menlo, Consolas, 'Courier New', monospace`;
  const s = t.space;
  const [xs, sm, md, lg] = t.type.scale;
  const row = (k: string, v: string, status: "ok" | "warn" | "danger", label: string) => `
              <tr>
                <td style="padding:${s[1]}px 0;border-bottom:1px solid ${c.border};font-family:${sans};font-size:${sm}px;color:${c.text};">${k}</td>
                <td align="right" style="padding:${s[1]}px 0;border-bottom:1px solid ${c.border};font-family:${mono};font-size:${sm}px;color:${c.text};">${v}</td>
                <td align="right" style="padding:${s[1]}px 0 ${s[1]}px ${s[2]}px;border-bottom:1px solid ${c.border};">
                  <span style="display:inline-block;padding:2px ${s[1]}px;border-radius:${t.radius.sm}px;background:${c[`${status}Bg`]};color:${c[status]};font-family:${mono};font-size:${xs}px;">&#9679; ${label}</span>
                </td>
              </tr>`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light">
  <title>Jupiter — weekly status</title>
  <!-- ${t.name}-email.html — generated from ${t.name}.tokens.json. Styles are inline; system fonts only. -->
</head>
<body style="margin:0;padding:0;background:${c.bg};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${c.bg};">
    <tr>
      <td align="center" style="padding:${s[5]}px ${s[3]}px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${c.surfaceRaised};border:1px solid ${c.border};border-radius:${t.radius.md}px;">
          <tr>
            <td style="padding:${s[2]}px ${s[4]}px;background:${c.surface};border-bottom:1px solid ${c.border};font-family:${mono};font-size:${xs}px;letter-spacing:1px;text-transform:uppercase;color:${c.textMuted};">
              &#9633; jupiter.au &middot; weekly status
            </td>
          </tr>
          <tr>
            <td style="padding:${s[5]}px ${s[4]}px ${s[3]}px;">
              <p style="margin:0 0 ${s[1]}px;font-family:${mono};font-size:${xs}px;letter-spacing:1px;text-transform:uppercase;color:${c.accent};">Week 46</p>
              <h1 style="margin:0 0 ${s[3]}px;font-family:${sans};font-size:${t.type.scale[4]}px;line-height:${t.type.lineHeightHeading};color:${c.text};">Mostly green this week</h1>
              <p style="margin:0;font-family:${sans};font-size:${md}px;line-height:${t.type.lineHeightBody};color:${c.text};">Here's how Jupiter services went over the last seven days. One thing needs sorting before Friday.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 ${s[4]}px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td colspan="3" style="padding:${s[2]}px 0 ${s[1]}px;border-bottom:1px solid ${c.border};font-family:${mono};font-size:${xs}px;text-transform:uppercase;letter-spacing:1px;color:${c.textMuted};">Service &middot; uptime &middot; state</td>
                </tr>${row("api.jupiter.au", "99.98%", "ok", "OK")}${row("mail relay", "99.71%", "warn", "WARN")}${row("billing", "100.00%", "ok", "OK")}${row("legacy ftp", "92.40%", "danger", "DOWN")}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:${s[4]}px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${c.warnBg};border-left:3px solid ${c.warn};border-radius:${t.radius.sm}px;">
                <tr><td style="padding:${s[2]}px ${s[3]}px;font-family:${sans};font-size:${sm}px;line-height:${t.type.lineHeightBody};color:${c.text};">
                  <strong style="font-family:${mono};font-size:${xs}px;letter-spacing:1px;text-transform:uppercase;color:${c.warn};">[!] Action needed</strong><br>
                  The mail relay cert expires in 6 days, so it needs renewing before Friday.
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 ${s[4]}px ${s[5]}px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                <td style="border-radius:${t.radius.sm}px;background:${c.accent};">
                  <a href="https://jupiter.au/status" style="display:inline-block;padding:${s[2]}px ${s[4]}px;font-family:${mono};font-size:${sm}px;color:${c.onAccent};text-decoration:none;">Open status page &rarr;</a>
                </td>
              </tr></table>
            </td>
          </tr>
          <tr>
            <td style="padding:${s[2]}px ${s[4]}px;border-top:1px solid ${c.border};font-family:${sans};font-size:${xs}px;line-height:${t.type.lineHeightBody};color:${c.textMuted};">
              Jupiter &middot; jupiter.au &middot; You're getting this because you're on the ops list. <a href="https://jupiter.au/unsubscribe" style="color:${c.accent};">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/* ---------- Go (Bubble Tea / Lip Gloss) ---------- */

const goName = (role: string) => role.charAt(0).toUpperCase() + role.slice(1);

/**
 * `jupiter_theme.go`: palettes as plain strings (no dependencies). lipgloss.Color is a string type, so
 * `lipgloss.Color(jupiter.Dark.Accent)` works with Lip Gloss v1 and v2 alike. ANSI is the 16-colour terminal palette.
 */
export function generateGoTheme(t: Tokens): string {
  const w = Math.max(...ROLE_ORDER.map((r) => goName(r).length));
  const fields = ROLE_ORDER.map((r) => `\t${goName(r).padEnd(w)} string`).join("\n");
  const vals = (scheme: "light" | "dark") =>
    ROLE_ORDER.map((r) => `\t\t${`${goName(r)}:`.padEnd(w + 1)} "${t.color[scheme][r]}",`).join("\n");
  const ansi = ansiPalette(t).colors.map((c) => `\t{Name: "${c.name}", Hex: "${c.hex}"},`).join("\n");
  return `// Code generated from jupiter.tokens.json (${t.name} ${t.version}). DO NOT EDIT.

// Package jupiter holds the Jupiter design-system colours for terminal UIs.
package jupiter

// Version is the token set version this file was generated from.
const Version = "${t.version}"

// Palette is one colour scheme, keyed by role.
type Palette struct {
${fields}
}

// Light and Dark are the two schemes. Pick one from the terminal background.
var (
\tLight = Palette{
${vals("light")}
\t}
\tDark = Palette{
${vals("dark")}
\t}
)

// ANSI16 is the 16-colour terminal palette derived from the dark scheme (index = ANSI colour number).
type ANSIColor struct{ Name, Hex string }

var ANSI16 = []ANSIColor{
${ansi}
}
`;
}

/* ---------- Rust (ratatui / egui / iced / anything) ---------- */

const snake = (role: string) => role.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

/**
 * `jupiter_theme.rs`: dependency-free palettes, ANSI-16, spacing, type, radius, motion and layout constants.
 * The `jupiter-theme` crate (packages/rust) re-exports this and adds ratatui / egui / iced adapters.
 */
export function generateRustTheme(t: Tokens): string {
  const dd = withDefaults(t).density;
  const rgb = (h: string) => {
    const [r, g, b] = hexToRgb(h);
    return `Rgb(${r}, ${g}, ${b})`;
  };
  const fields = ROLE_ORDER.map((r) => `    pub ${snake(r)}: Rgb,`).join("\n");
  const vals = (scheme: "light" | "dark") => ROLE_ORDER.map((r) => `    ${snake(r)}: ${rgb(t.color[scheme][r])},`).join("\n");
  const a = ansiPalette(t);
  const ansi = a.colors.map((c) => `    AnsiColor { index: ${c.index}, name: "${c.name}", rgb: ${rgb(c.hex)} },`).join("\n");
  const f32s = (xs: number[]) => xs.map((x) => `${x.toFixed(1)}`).join(", ");
  return `// Code generated from jupiter.tokens.json (${t.name} ${t.version}). DO NOT EDIT.

/// Token set version this file was generated from.
pub const VERSION: &str = "${t.version}";

/// Fixed sizes of application chrome and overlays (logical px), from the chrome tokens.
pub mod chrome {
${Object.entries(withDefaults(t).chrome).map(([k, v]) => `    pub const ${snake(k).toUpperCase()}: u32 = ${v};`).join("\n")}
}

/// Stacking order, from the z tokens.
pub mod z {
${Object.entries(withDefaults(t).z).map(([k, v]) => `    pub const ${snake(k).toUpperCase()}: i32 = ${v};`).join("\n")}
}

/// An sRGB colour. Convert with the adapters, or use the channels directly.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub struct Rgb(pub u8, pub u8, pub u8);

impl Rgb {
    pub const fn r(self) -> u8 { self.0 }
    pub const fn g(self) -> u8 { self.1 }
    pub const fn b(self) -> u8 { self.2 }
    pub const fn to_array(self) -> [u8; 3] { [self.0, self.1, self.2] }
    /// Channels as 0.0..=1.0 floats (for GPU / shader colour types).
    pub fn to_f32(self) -> [f32; 3] { [self.0 as f32 / 255.0, self.1 as f32 / 255.0, self.2 as f32 / 255.0] }
    /// "#rrggbb"
    pub fn to_hex(self) -> String { format!("#{:02x}{:02x}{:02x}", self.0, self.1, self.2) }
}

/// One colour scheme, keyed by role.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Palette {
${fields}
}

pub const LIGHT: Palette = Palette {
${vals("light")}
};

pub const DARK: Palette = Palette {
${vals("dark")}
};

/// Which scheme to use.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Scheme { Light, Dark }

impl Scheme {
    pub const fn palette(self) -> &'static Palette {
        match self { Scheme::Light => &LIGHT, Scheme::Dark => &DARK }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct AnsiColor { pub index: u8, pub name: &'static str, pub rgb: Rgb }

/// The 16-colour terminal palette (derived from the dark scheme). Index = ANSI colour number.
pub const ANSI16: [AnsiColor; 16] = [
${ansi}
];
pub const TERMINAL_BG: Rgb = ${rgb(a.bg)};
pub const TERMINAL_FG: Rgb = ${rgb(a.fg)};
pub const TERMINAL_CURSOR: Rgb = ${rgb(a.cursor)};

/// Typography. Sizes are logical pixels; the scale is xs, sm, md, lg, xl, 2xl.
pub mod font {
    pub const SANS_FAMILY: &str = "${firstFamily(t.font.sans)}";
    pub const MONO_FAMILY: &str = "${firstFamily(t.font.mono)}";
    pub const SANS_STACK: &str = ${JSON.stringify(t.font.sans)};
    pub const MONO_STACK: &str = ${JSON.stringify(t.font.mono)};
    pub const SIZES: [f32; 6] = [${f32s(t.type.scale)}];
    pub const XS: f32 = ${t.type.scale[0].toFixed(1)};
    pub const SM: f32 = ${t.type.scale[1].toFixed(1)};
    pub const MD: f32 = ${t.type.scale[2].toFixed(1)};
    pub const LG: f32 = ${t.type.scale[3].toFixed(1)};
    pub const XL: f32 = ${t.type.scale[4].toFixed(1)};
    pub const XXL: f32 = ${t.type.scale[5].toFixed(1)};
    pub const LINE_HEIGHT_BODY: f32 = ${t.type.lineHeightBody.toFixed(2)};
    pub const LINE_HEIGHT_HEADING: f32 = ${t.type.lineHeightHeading.toFixed(2)};
}

/// Spacing scale in logical pixels (space::S1 = ${t.space[0]}).
pub mod space {
${t.space.map((v, i) => `    pub const S${i + 1}: f32 = ${v.toFixed(1)};`).join("\n")}
    pub const SCALE: [f32; ${t.space.length}] = [${f32s(t.space)}];
}

pub mod radius {
    pub const SM: f32 = ${t.radius.sm.toFixed(1)};
    pub const MD: f32 = ${t.radius.md.toFixed(1)};
    pub const FULL: f32 = 9999.0;
}

/// Motion durations in milliseconds.
pub mod motion {
    pub const FAST_MS: u32 = ${t.motion.fast};
    pub const BASE_MS: u32 = ${t.motion.base};
    pub const SLOW_MS: u32 = ${t.motion.slow};
    /// CSS-style easing, for reference.
    pub const EASING: &str = "${t.motion.easing}";
}

pub mod layout {
    pub const READING_MEASURE_CH: u32 = ${t.layout.readingMeasure};
    pub const COLUMNS: u32 = ${t.layout.columns};
    pub const GUTTER: f32 = ${t.layout.gutter.toFixed(1)};
    pub const BREAKPOINTS: [f32; 3] = [${f32s(t.layout.breakpoints)}];
    /// Default height of buttons, inputs and other controls.
    pub const CONTROL_HEIGHT: f32 = ${t.control.height.toFixed(1)};
}

/// Density presets (the web data-density attribute): control height, table cell padding, page padding.
pub mod density {
    pub struct Density {
        pub control: f32,
        pub cell_y: f32,
        pub pad: f32,
    }
    pub const COMFORTABLE: Density = Density { control: ${dd.comfortable.control.toFixed(1)}, cell_y: ${dd.comfortable.cellY.toFixed(1)}, pad: ${dd.comfortable.pad.toFixed(1)} };
    pub const COMPACT: Density = Density { control: ${dd.compact.control.toFixed(1)}, cell_y: ${dd.compact.cellY.toFixed(1)}, pad: ${dd.compact.pad.toFixed(1)} };
}

/// Touch / kiosk overrides.
pub mod kiosk {
    pub const MIN_TARGET: f32 = ${t.kiosk.minTarget.toFixed(1)};
    pub const TYPE_SCALE: f32 = ${t.kiosk.typeScale};
    pub const SPACE_SCALE: f32 = ${t.kiosk.spaceScale};
}
`;
}

/* ---------- Linux native GUI: Slint, GTK4/libadwaita, Qt/QML, KDE ---------- */

const kebab = (r: string) => ROLE_LABELS[r as keyof typeof ROLE_LABELS];
const triple = (h: string) => hexToRgb(h).join(",");

/** `jupiter.slint`: a global `Jupiter` with every token. Set `Jupiter.dark` (e.g. from the OS) to switch scheme. */
export function generateSlint(t: Tokens): string {
  const colors = ROLE_ORDER.map((r) => `    out property <color> ${kebab(r)}: dark ? ${t.color.dark[r]} : ${t.color.light[r]};`).join("\n");
  const sizes = TYPE_NAMES.map((n, i) => `    out property <length> font-${n}: ${t.type.scale[i]}px;`).join("\n");
  const space = t.space.map((v, i) => `    out property <length> space-${i + 1}: ${v}px;`).join("\n");
  const d = withDefaults(t).density;
  return `// Generated from jupiter.tokens.json (${t.name} ${t.version}). Do not edit by hand.
// Usage: import { Jupiter } from "jupiter.slint";  then  background: Jupiter.bg;  and set Jupiter.dark from the OS.

export global Jupiter {
    in-out property <bool> dark: false;

${colors}

    out property <string> font-sans: "${firstFamily(t.font.sans)}";
    out property <string> font-mono: "${firstFamily(t.font.mono)}";
${sizes}

${space}

    out property <length> radius-sm: ${t.radius.sm}px;
    out property <length> radius-md: ${t.radius.md}px;
    out property <length> gutter: ${t.layout.gutter}px;

    // Density: set \`compact\` from the app's setting; every component reads these three.
    in-out property <bool> compact: false;
    out property <length> control-height: compact ? ${d.compact.control}px : ${d.comfortable.control}px;
    out property <length> cell-y: compact ? ${d.compact.cellY}px : ${d.comfortable.cellY}px;
    out property <length> pad: compact ? ${d.compact.pad}px : ${d.comfortable.pad}px;

    out property <duration> dur-fast: ${t.motion.fast}ms;
    out property <duration> dur-base: ${t.motion.base}ms;
    out property <duration> dur-slow: ${t.motion.slow}ms;
}
`;
}

/**
 * GTK4 / libadwaita stylesheet for one scheme. GTK cannot switch @define-color by media query,
 * so there is a light and a dark file; load the one matching the app's colour scheme (or libadwaita's style-dark).
 */
export function generateGtkCss(t: Tokens, scheme: "light" | "dark"): string {
  const c = t.color[scheme];
  const onStatus = scheme === "dark" ? c.bg : c.surfaceRaised;
  const named = (name: string, value: string) => `@define-color ${name} ${value};`;
  const lines = [
    named("accent_color", c.accent), named("accent_bg_color", c.accent), named("accent_fg_color", c.onAccent),
    named("destructive_color", c.danger), named("destructive_bg_color", c.danger), named("destructive_fg_color", onStatus),
    named("success_color", c.ok), named("success_bg_color", c.ok), named("success_fg_color", onStatus),
    named("warning_color", c.warn), named("warning_bg_color", c.warn), named("warning_fg_color", onStatus),
    named("error_color", c.danger), named("error_bg_color", c.danger), named("error_fg_color", onStatus),
    named("window_bg_color", c.bg), named("window_fg_color", c.text),
    named("view_bg_color", c.surfaceRaised), named("view_fg_color", c.text),
    named("headerbar_bg_color", c.surface), named("headerbar_fg_color", c.text),
    named("headerbar_border_color", c.border), named("headerbar_backdrop_color", c.bg), named("headerbar_shade_color", "rgba(0, 0, 0, 0.07)"),
    named("card_bg_color", c.surfaceRaised), named("card_fg_color", c.text), named("card_shade_color", "rgba(0, 0, 0, 0.07)"),
    named("dialog_bg_color", c.surfaceRaised), named("dialog_fg_color", c.text),
    named("popover_bg_color", c.surfaceRaised), named("popover_fg_color", c.text), named("popover_shade_color", "rgba(0, 0, 0, 0.07)"),
    named("sidebar_bg_color", c.surface), named("sidebar_fg_color", c.text), named("sidebar_backdrop_color", c.bg),
    named("sidebar_shade_color", "rgba(0, 0, 0, 0.07)"), named("sidebar_border_color", c.border),
    named("thumbnail_bg_color", c.surface), named("thumbnail_fg_color", c.text),
    named("shade_color", "rgba(0, 0, 0, 0.07)"), named("scrollbar_outline_color", c.border),
    // legacy GTK3-style names, still read by plain GTK4 apps
    named("theme_bg_color", c.bg), named("theme_fg_color", c.text),
    named("theme_base_color", c.surfaceRaised), named("theme_text_color", c.text),
    named("theme_selected_bg_color", c.accent), named("theme_selected_fg_color", c.onAccent),
    named("borders", c.border),
  ].join("\n");
  return `/* Generated from jupiter.tokens.json (${t.name} ${t.version}), ${scheme} scheme. Do not edit by hand. */
${lines}

window {
  font-family: ${t.font.sans};
}
.monospace, textview.monospace, entry.monospace {
  font-family: ${t.font.mono};
}
button, entry, spinbutton, dropdown > button, .card {
  border-radius: ${t.radius.md}px;
}
button, entry, spinbutton {
  min-height: ${t.control.height}px;
}
`;
}

/**
 * Widget rules for plain GTK4 apps (no libadwaita): window, views, headerbar, entries, buttons, switches.
 * Uses only the named colours from jupiter-gtk-{light,dark}.css, so one file serves both schemes.
 * libadwaita apps already read the named colours and do not need this.
 */
export function generateGtkWidgetsCss(t: Tokens): string {
  return `/* Generated from jupiter.tokens.json (${t.name} ${t.version}). Do not edit by hand. Load after jupiter-gtk-{light,dark}.css. */
window, window.background { background-color: @window_bg_color; color: @window_fg_color; }
.view, textview text, .view text, iconview { background-color: @view_bg_color; color: @view_fg_color; }
headerbar { background-color: @headerbar_bg_color; color: @headerbar_fg_color; border-bottom: 1px solid @headerbar_border_color; box-shadow: none; }
popover > contents, popover.menu > contents { background-color: @popover_bg_color; color: @popover_fg_color; border: 1px solid @headerbar_border_color; box-shadow: none; }
entry, spinbutton, searchentry { background-color: @view_bg_color; color: @view_fg_color; border: 1px solid @headerbar_border_color; box-shadow: none; }
entry:focus-within, spinbutton:focus-within { border-color: @accent_color; outline: 2px solid alpha(@accent_color, 0.35); outline-offset: 0; }
button { background-color: @card_bg_color; background-image: none; color: @window_fg_color; border: 1px solid @headerbar_border_color; box-shadow: none; text-shadow: none; }
button:hover { background-color: @sidebar_bg_color; }
button:disabled { opacity: 0.5; }
button.suggested-action { background-color: @accent_bg_color; color: @accent_fg_color; border-color: transparent; }
button.destructive-action { background-color: @destructive_bg_color; color: @destructive_fg_color; border-color: transparent; }
switch { background-color: @headerbar_border_color; background-image: none; border: none; box-shadow: none; color: @window_fg_color; }
switch:checked { background-color: @accent_bg_color; }
switch slider { background-color: @window_bg_color; background-image: none; border: none; box-shadow: none; }
separator { background-color: @headerbar_border_color; min-height: 1px; min-width: 1px; }
*:selected, selection { background-color: @accent_bg_color; color: @accent_fg_color; }
scrollbar slider { background-color: alpha(@window_fg_color, 0.35); border-radius: ${t.radius.md}px; }
tooltip { background-color: @popover_bg_color; color: @popover_fg_color; border: 1px solid @headerbar_border_color; }
`;
}

/** `Jupiter.qml`: a QML singleton. \`dark\` follows Qt.styleHints.colorScheme (Qt 6.5+); set it to override. */
export function generateQml(t: Tokens): string {
  const colors = ROLE_ORDER.map((r) => `    readonly property color ${r}: dark ? "${t.color.dark[r]}" : "${t.color.light[r]}"`).join("\n");
  const sizes = TYPE_NAMES.map((n, i) => `    readonly property real font${n.charAt(0).toUpperCase()}${n.slice(1)}: ${t.type.scale[i]}`).join("\n");
  const space = t.space.map((v, i) => `    readonly property real space${i + 1}: ${v}`).join("\n");
  return `// Generated from jupiter.tokens.json (${t.name} ${t.version}). Do not edit by hand.
// Usage: import Jupiter 1.0   (qmldir sits beside this file)   Rectangle { color: Jupiter.bg }
pragma Singleton
import QtQuick

QtObject {
    property bool dark: Qt.styleHints.colorScheme === Qt.ColorScheme.Dark

${colors}

    readonly property string fontSans: "${firstFamily(t.font.sans)}"
    readonly property string fontMono: "${firstFamily(t.font.mono)}"
${sizes}

${space}

    readonly property real radiusSm: ${t.radius.sm}
    readonly property real radiusMd: ${t.radius.md}
    readonly property real controlHeight: ${t.control.height}
    readonly property real gutter: ${t.layout.gutter}

    readonly property int durFast: ${t.motion.fast}
    readonly property int durBase: ${t.motion.base}
    readonly property int durSlow: ${t.motion.slow}
}
`;
}

export function generateQmldir(): string {
  return `module Jupiter\nsingleton Jupiter 1.0 Jupiter.qml\n`;
}

/** KDE Plasma colour scheme (~/.local/share/color-schemes/Jupiter{Light,Dark}.colors), laid out like Breeze's. */
export function generateKdeScheme(t: Tokens, scheme: "light" | "dark"): string {
  const c = t.color[scheme];
  const dark = t.color.dark;
  const set = (bg: string, alt: string, fg: string, inactive: string, sel = false) =>
    [
      `BackgroundAlternate=${triple(alt)}`,
      `BackgroundNormal=${triple(bg)}`,
      `DecorationFocus=${triple(c.accent)}`,
      `DecorationHover=${triple(c.accent)}`,
      `ForegroundActive=${triple(sel ? fg : c.accent)}`,
      `ForegroundInactive=${triple(inactive)}`,
      `ForegroundLink=${triple(sel ? fg : c.accent)}`,
      `ForegroundNegative=${triple(c.danger)}`,
      `ForegroundNeutral=${triple(c.warn)}`,
      `ForegroundNormal=${triple(fg)}`,
      `ForegroundPositive=${triple(c.ok)}`,
      `ForegroundVisited=${triple(c.info)}`,
    ].join("\n");
  const name = scheme === "light" ? "Jupiter Light" : "Jupiter Dark";
  const id = name.replace(" ", "");
  return `# Generated from jupiter.tokens.json (${t.name} ${t.version}). Do not edit by hand.
# Install: cp ${id}.colors ~/.local/share/color-schemes/  then pick it in System Settings > Colors.

[ColorEffects:Disabled]
Color=${triple(c.textMuted)}
ColorAmount=0
ColorEffect=0
ContrastAmount=0.65
ContrastEffect=1
IntensityAmount=0.1
IntensityEffect=2

[ColorEffects:Inactive]
ChangeSelectionColor=true
Color=${triple(c.textMuted)}
ColorAmount=0.025
ColorEffect=2
ContrastAmount=0.1
ContrastEffect=2
Enable=false
IntensityAmount=0
IntensityEffect=0

[Colors:Button]
${set(c.surface, c.surfaceRaised, c.text, c.textMuted)}

[Colors:Complementary]
${set(dark.surface, dark.bg, dark.text, dark.textMuted)}

[Colors:Header]
${set(c.surface, c.bg, c.text, c.textMuted)}

[Colors:Header][Inactive]
${set(c.bg, c.surface, c.text, c.textMuted)}

[Colors:Selection]
${set(c.accent, c.accent, c.onAccent, c.onAccent, true)}

[Colors:Tooltip]
${set(c.surfaceRaised, c.surface, c.text, c.textMuted)}

[Colors:View]
${set(c.surfaceRaised, c.surface, c.text, c.textMuted)}

[Colors:Window]
${set(c.bg, c.surface, c.text, c.textMuted)}

[General]
ColorScheme=${id}
Name=${name}
shadeSortColumn=true

[KDE]
contrast=4

[WM]
activeBackground=${triple(c.surface)}
activeBlend=${triple(c.surface)}
activeForeground=${triple(c.text)}
inactiveBackground=${triple(c.bg)}
inactiveBlend=${triple(c.bg)}
inactiveForeground=${triple(c.textMuted)}
`;
}

/* ---------- ESPHome (colors, fonts, LVGL styles) ---------- */

/**
 * `jupiter-esphome.yaml`: a SNIPPET to merge into a device YAML (it is not a complete config).
 * `color:` ids jp_<role> are the dark scheme (the usual choice for displays), jp_light_<role> the light one;
 * `font:` ids jp_mono_<px> follow the token type scale; `lvgl:` carries style_definitions + theme.
 * The lambda/LVGL snippets from @belikh/jupiter-esphome reference exactly these ids.
 */
export function generateEsphomeYaml(t: Tokens): string {
  const id = (r: string) => ROLE_LABELS[r as keyof typeof ROLE_LABELS].replace(/-/g, "_");
  const hex = (h: string) => h.replace("#", "").toUpperCase();
  const colors = (scheme: "light" | "dark", prefix: string) =>
    ROLE_ORDER.map((r) => `  - id: ${prefix}${id(r)}\n    hex: "${hex(t.color[scheme][r])}"`).join("\n");
  const fonts = withDefaults(t).device.fontSizes
    .map((px) => `  - file:\n      type: gfonts\n      family: JetBrains Mono\n      weight: 400\n    id: jp_mono_${px}\n    size: ${px}`)
    .join("\n");
  const [s1, s2, s3] = [t.space[1], t.space[2], t.space[3]];
  return `# Generated from jupiter.tokens.json (${t.name} ${t.version}). Do not edit by hand.
# This is a SNIPPET: merge the sections you need into your device YAML (color:, font:, lvgl:).
# Unverified against a real ESPHome build; check the keys against your ESPHome version.
# Fonts use Google Fonts (JetBrains Mono, OFL). Offline? Replace each \`file:\` with a local .ttf path.

color:
  # dark scheme (default for displays): jp_<role>
${colors("dark", "jp_")}
  # light scheme: jp_light_<role>
${colors("light", "jp_light_")}

font:
${fonts}

lvgl:
  disp_bg_color: jp_bg
  style_definitions:
    - id: jp_style_card
      bg_color: jp_surface_raised
      bg_opa: COVER
      border_color: jp_border
      border_width: 1
      radius: ${t.radius.md}
      pad_all: ${s3}
      text_color: jp_text
      text_font: jp_mono_${t.type.scale[1]}
    - id: jp_style_label
      text_color: jp_text
      text_font: jp_mono_${t.type.scale[1]}
    - id: jp_style_muted
      text_color: jp_text_muted
      text_font: jp_mono_${t.type.scale[0]}
    - id: jp_style_value
      text_color: jp_text
      text_font: jp_mono_${t.type.scale[4]}
    - id: jp_style_value_xl
      text_color: jp_text
      text_font: jp_mono_${t.type.scale[5]}
    - id: jp_style_track
      bg_color: jp_border
      bg_opa: COVER
      radius: ${t.radius.sm}
      pad_all: ${s1}
    - id: jp_style_ok
      bg_color: jp_ok
      text_color: jp_ok
      radius: ${t.radius.sm}
    - id: jp_style_warn
      bg_color: jp_warn
      text_color: jp_warn
      radius: ${t.radius.sm}
    - id: jp_style_danger
      bg_color: jp_danger
      text_color: jp_danger
      radius: ${t.radius.sm}
    - id: jp_style_gap
      pad_all: ${s2}
  theme:
    label:
      text_color: jp_text
      text_font: jp_mono_${t.type.scale[1]}
    arc:
      arc_color: jp_border
      arc_width: ${s2}
      indicator:
        arc_color: jp_accent
        arc_width: ${s2}
    bar:
      bg_color: jp_border
      radius: ${t.radius.sm}
      indicator:
        bg_color: jp_accent
        radius: ${t.radius.sm}
    led:
      color: jp_ok
`;
}

/* ---------- LaTeX ---------- */

const texName = (role: string) => role.charAt(0).toUpperCase() + role.slice(1);
const firstFamily = (stack: string) => (stack.split(",")[0] ?? "").trim().replace(/^["']|["']$/g, "");

/**
 * `jupiter-tokens.sty`: the colours and font names as LaTeX macros, so every LaTeX class
 * (resume, letter, notes, report, invoice) follows the tokens. Light is the default;
 * load with the `dark` option, or call \\jpscheme{dark}, to switch.
 */
export function generateLatexSty(t: Tokens): string {
  const hex = (h: string) => h.replace("#", "").toUpperCase();
  const defs = (scheme: "light" | "dark") =>
    ROLE_ORDER.map((r) => `\\definecolor{jp${scheme}${texName(r)}}{HTML}{${hex(t.color[scheme][r])}}`).join("\n");
  const lets = ROLE_ORDER.map((r) => `    \\colorlet{jp${texName(r)}}{jp#1${texName(r)}}%`).join("\n");
  return `% Generated from jupiter.tokens.json (${t.name} ${t.version}). Do not edit by hand.
\\NeedsTeXFormat{LaTeX2e}
\\ProvidesPackage{jupiter-tokens}[2025/01/01 Jupiter design tokens]
\\RequirePackage{xcolor}
\\RequirePackage{xkeyval}
${defs("light")}
${defs("dark")}
% \\jpscheme{light|dark} (re)binds jpBg, jpText, jpAccent, ... to the chosen scheme.
\\newcommand{\\jpscheme}[1]{%
${lets}
}
\\DeclareOptionX{light}{\\jpscheme{light}}
\\DeclareOptionX{dark}{\\jpscheme{dark}}
\\jpscheme{light}
\\ProcessOptionsX\\relax
\\newcommand{\\jpSansName}{${firstFamily(t.font.sans)}}
\\newcommand{\\jpMonoName}{${firstFamily(t.font.mono)}}
\\newcommand{\\jpTokensVersion}{${t.version}}
\\endinput
`;
}

export function generateTokensJSON(t: Tokens): string {
  return JSON.stringify(t, null, 2) + "\n";
}

export interface OutputFile {
  id: string;
  filename: string;
  target: string;
  mime: string;
  build: (t: Tokens) => string;
}

export const OUTPUTS: OutputFile[] = [
  { id: "tokens", filename: "jupiter.tokens.json", target: "Source of truth", mime: "application/json", build: generateTokensJSON },
  { id: "css", filename: "jupiter.css", target: "Static web, SPA, dynamic apps (tokens + components)", mime: "text/css", build: (t) => generateCSS(t) },
  { id: "tokens-css", filename: "jupiter-tokens.css", target: "CSS variables only", mime: "text/css", build: (t) => generateTokensCSS(t) },
  { id: "components-css", filename: "jupiter-components.css", target: "Component classes only", mime: "text/css", build: (t) => generateComponentsCSS(t) },
  { id: "fonts-css", filename: "jupiter-fonts.css", target: "@font-face (opt in)", mime: "text/css", build: (t) => generateFontsCSS(t) },
  { id: "tailwind", filename: "jupiter-tailwind.css", target: "Tailwind v4 theme", mime: "text/css", build: generateTailwindCSS },
  { id: "kiosk", filename: "jupiter-kiosk.css", target: "Kiosk touchscreen", mime: "text/css", build: (t) => generateKioskCSS(t) },
  { id: "email", filename: "jupiter-email.html", target: "Email", mime: "text/html", build: generateEmailHTML },
  { id: "terminal", filename: "jupiter-terminal.sh", target: "SSH / terminal", mime: "text/x-shellscript", build: generateTerminalSh },
  { id: "xresources", filename: "jupiter.Xresources", target: "SSH / terminal (X11)", mime: "text/plain", build: generateXresources },
  { id: "latex", filename: "jupiter-tokens.sty", target: "LaTeX (resume, letter, notes, report, invoice)", mime: "text/x-tex", build: generateLatexSty },
  { id: "go", filename: "jupiter_theme.go", target: "Go TUIs (Bubble Tea / Lip Gloss)", mime: "text/x-go", build: generateGoTheme },
  { id: "rust", filename: "jupiter_theme.rs", target: "Rust (ratatui, egui, iced, ...)", mime: "text/x-rust", build: generateRustTheme },
  { id: "esphome", filename: "jupiter-esphome.yaml", target: "ESPHome (color, font, LVGL snippet)", mime: "text/yaml", build: generateEsphomeYaml },
  { id: "slint", filename: "jupiter.slint", target: "Slint (Rust GUI)", mime: "text/plain", build: generateSlint },
  { id: "gtk-light", filename: "jupiter-gtk-light.css", target: "GTK4 / libadwaita (light)", mime: "text/css", build: (t) => generateGtkCss(t, "light") },
  { id: "gtk-dark", filename: "jupiter-gtk-dark.css", target: "GTK4 / libadwaita (dark)", mime: "text/css", build: (t) => generateGtkCss(t, "dark") },
  { id: "gtk-widgets", filename: "jupiter-gtk-widgets.css", target: "GTK4 widgets (no libadwaita)", mime: "text/css", build: generateGtkWidgetsCss },
  { id: "qml", filename: "Jupiter.qml", target: "Qt / QML singleton", mime: "text/plain", build: generateQml },
  { id: "qmldir", filename: "qmldir", target: "Qt / QML module file", mime: "text/plain", build: () => generateQmldir() },
  { id: "kde-light", filename: "JupiterLight.colors", target: "KDE Plasma colour scheme (light)", mime: "text/plain", build: (t) => generateKdeScheme(t, "light") },
  { id: "kde-dark", filename: "JupiterDark.colors", target: "KDE Plasma colour scheme (dark)", mime: "text/plain", build: (t) => generateKdeScheme(t, "dark") },
  { id: "github", filename: "jupiter-github.json", target: "GitHub (README, profile, social preview SVGs)", mime: "application/json", build: generateGithubTheme },
  { id: "mobile", filename: "jupiter.mobile.json", target: "iOS & Android", mime: "application/json", build: generateMobileJSON },
];
