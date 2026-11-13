// GitHub target: the slice of the tokens that the SVG kit in packages/github needs (colours per scheme, fonts, radius).
// The SVGs themselves are rendered by packages/github/src/render.mjs from this JSON, so one token change reaches every banner, tile and badge.
import { ROLE_ORDER, type Tokens } from "./tokens.ts";

/** `jupiter-github.json`: input of `packages/github` (copied to packages/github/src/theme.json on build, committed like the Rust core). */
export function generateGithubTheme(t: Tokens): string {
  const pick = (c: Tokens["color"]["light"]) => Object.fromEntries(ROLE_ORDER.map((r) => [r, c[r]]));
  return JSON.stringify({ name: t.name, version: t.version, color: { light: pick(t.color.light), dark: pick(t.color.dark) }, font: { sans: t.font.sans, mono: t.font.mono }, radius: t.radius }, null, 2) + "\n";
}
