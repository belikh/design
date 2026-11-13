#!/usr/bin/env node
// Turns the design-system SVG graphics into PDFs that LaTeX can place, coloured from the tokens.
//   node scripts/graphics.mjs            writes graphics/<id>.pdf for every entry of graphics/manifest.json
// Each entry: { id, src: "spot/kangaroo" | "logo/jupiter-logo-dark" | "art/flow-a", color: "jplightAccent", stroke?: 2 }
//   - src is relative to packages/graphics/dist/svg (tiers), packages/graphics (logo/...) or packages/latex/graphics (art/...,
//     page-sized drawings that only the LaTeX documents use, such as the cover lines)
//   - color is a colour name from tokens/dist/jupiter-tokens.sty; it replaces currentColor
//   - stroke overrides the stroke width in SVG units (the tier default is 2, or 1.75 for icons)
// The logo keeps its own colours, and the script refuses any colour that is not a token value.
// Needs rsvg-convert (librsvg2-bin on Debian/Ubuntu). The PDFs are committed and ship in jupiter-latex.tgz; CI regenerates them and fails when the committed ones are stale.
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const latex = resolve(here, "..");
const pkgs = resolve(latex, "..");
const outDir = join(latex, "graphics");
const tokens = readFileSync(join(pkgs, "tokens/dist/jupiter-tokens.sty"), "utf8");
const colour = {};
for (const m of tokens.matchAll(/\\definecolor\{(\w+)\}\{HTML\}\{([0-9A-Fa-f]{6})\}/g)) colour[m[1]] = "#" + m[2].toLowerCase();
const tokenHexes = new Set(Object.values(colour));

const manifest = JSON.parse(readFileSync(join(outDir, "manifest.json"), "utf8"));
const tmp = mkdtempSync(join(tmpdir(), "jpgfx-"));
let n = 0;
const lock = [];
for (const g of manifest) {
  const file = g.src.startsWith("logo/") ? join(pkgs, "graphics", g.src + ".svg") : g.src.startsWith("art/") ? join(outDir, g.src + ".svg") : join(pkgs, "graphics/dist/svg", g.src + ".svg");
  let svg = readFileSync(file, "utf8");
  if (g.color) {
    if (!colour[g.color]) throw new Error(`${g.id}: unknown token colour ${g.color}`);
    svg = svg.replaceAll("currentColor", colour[g.color]);
  }
  for (const m of svg.matchAll(/#[0-9a-fA-F]{6}/g)) if (!tokenHexes.has(m[0].toLowerCase())) throw new Error(`${g.id}: ${m[0]} is not a token colour`);
  if (/currentColor/.test(svg)) throw new Error(`${g.id}: needs a "color"`);
  if (g.stroke) svg = svg.replace(/stroke-width="[\d.]+"/g, `stroke-width="${g.stroke}"`);
  svg = svg.replace(/ pathLength="1"/g, "").replace(/ class="[^"]*"/, "");
  // give the root an explicit size so the PDF page is the viewBox in points
  const vb = svg.match(/viewBox="([-\d. ]+)"/)[1].split(/\s+/).map(Number);
  svg = svg.replace("<svg ", `<svg width="${vb[2]}pt" height="${vb[3]}pt" `);
  lock.push(`${createHash("sha256").update(svg).digest("hex")}  ${g.id}.pdf`);
  const tmpSvg = join(tmp, g.id + ".svg");
  writeFileSync(tmpSvg, svg);
  mkdirSync(outDir, { recursive: true });
  execFileSync("rsvg-convert", ["-f", "pdf", "-o", join(outDir, g.id + ".pdf"), tmpSvg], { env: { ...process.env, SOURCE_DATE_EPOCH: "0" } });
  n++;
}
rmSync(tmp, { recursive: true });
// The PDFs are not byte-identical across librsvg versions, so staleness is judged on the INPUTS: this lock holds the hash of the
// final SVG behind every PDF. CI regenerates, then `git diff --exit-code` on this file fails when a source, colour or stroke changed
// without the PDFs being regenerated and committed.
writeFileSync(join(outDir, "sources.lock"), lock.join("\n") + "\n");
console.log(`graphics: wrote ${n} PDFs to ${outDir}`);
