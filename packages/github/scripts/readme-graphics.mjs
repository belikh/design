// Bakes every Jupiter line graphic (icon, spot, scene, rule from packages/graphics/dist/svg) into light and dark files for READMEs.
// An <img> cannot inherit currentColor, so the stroke is set to the token text colour for each scheme.
// Output: graphics/<tier>/<name>-<light|dark>.svg.   Run: node scripts/readme-graphics.mjs [--check]
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "../../graphics/dist/svg"); const out = join(here, "../graphics");
const theme = JSON.parse(readFileSync(join(here, "../src/theme.json"), "utf8"));
const check = process.argv.includes("--check"); const stale = [];
if (!existsSync(src)) { console.error("build @belikh/jupiter-graphics first (npm run build:graphics)"); process.exit(1); }
let n = 0;
for (const tier of readdirSync(src)) for (const f of readdirSync(join(src, tier)).filter((x) => x.endsWith(".svg"))) {
  const svg = readFileSync(join(src, tier, f), "utf8").trim().replace(/ aria-hidden="true"/, "");
  for (const mode of ["light", "dark"]) {
    const body = svg.replaceAll("currentColor", theme.color[mode].text).replace(/^<svg /, `<svg role="img" aria-label="${f.replace(/\.svg$/, "")}" `) + "\n";
    const file = join(out, tier, `${f.replace(/\.svg$/, "")}-${mode}.svg`); n++;
    if (check) { if (!existsSync(file) || readFileSync(file, "utf8") !== body) stale.push(file); } else { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); }
  }
}
if (check && stale.length) { console.error(`stale README graphics (run node scripts/readme-graphics.mjs):\n  ${stale.slice(0, 10).join("\n  ")}`); process.exit(1); }
console.log(check ? `${n} README graphics in sync` : `wrote ${n} README graphics to packages/github/graphics`);
