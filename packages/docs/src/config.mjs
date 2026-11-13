import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { CONFIG_KEYS } from "./spec.mjs";

export const DEFAULT_GRAPHICS_URL = "https://github.com/belikh/design/releases/latest/download/{tier}-{name}-{theme}.svg";
const DEFAULTS = { src: "docs-src", mdOut: "docs", siteOut: "dist/site", pdfOut: "dist", base: "/", repoBranch: "main", sections: [], glossary: {}, graphicsUrl: DEFAULT_GRAPHICS_URL };

/** Load docs.config.json. Returns { config, root, errors }. */
export function loadConfig(file) {
  const path = resolve(file); const root = dirname(path); const errors = [];
  if (!existsSync(path)) return { config: null, root, errors: [`${file}: not found (run: jupiter-docs init)`] };
  let raw; try { raw = JSON.parse(readFileSync(path, "utf8")); } catch (e) { return { config: null, root, errors: [`${file}: ${e.message}`] }; }
  for (const k of Object.keys(raw)) if (!(k in CONFIG_KEYS)) errors.push(`${file}: unknown key "${k}" (known: ${Object.keys(CONFIG_KEYS).join(", ")})`);
  if (typeof raw.project !== "string" || !raw.project.trim()) errors.push(`${file}: "project" is required`);
  const c = { ...DEFAULTS, ...raw };
  if (!Array.isArray(c.sections)) errors.push(`${file}: "sections" must be a list`);
  else c.sections.forEach((s, i) => { if (!s || typeof s.id !== "string" || typeof s.title !== "string") errors.push(`${file}: sections[${i}] needs id and title`); });
  const ids = c.sections.map((s) => s.id); ids.forEach((id, i) => { if (ids.indexOf(id) !== i) errors.push(`${file}: duplicate section id "${id}"`); });
  if (!c.base.startsWith("/") || !c.base.endsWith("/")) errors.push(`${file}: "base" must start and end with / (got "${c.base}")`);
  if (c.versionFrom) { const vf = join(root, c.versionFrom); if (existsSync(vf)) c.version = JSON.parse(readFileSync(vf, "utf8")).version; else errors.push(`${file}: versionFrom file not found: ${c.versionFrom}`); }
  c.id ??= String(c.project ?? "docs").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  c.repo = (c.repo ?? "").replace(/\/$/, "");
  return { config: c, root, errors };
}
