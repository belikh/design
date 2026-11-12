// Contact sheets for eyeballing the set: node scripts/sheet.ts <out-dir> [tier] [px]
// Needs rsvg-convert and ImageMagick. Not part of the build.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { GRAPHICS, TIERS, svg, type Tier } from "../src/index.ts";

const out = process.argv[2];
if (!out) throw new Error("usage: sheet.ts <out-dir> [tier] [px]");
const only = process.argv[3] as Tier | undefined;
mkdirSync(out, { recursive: true });
for (const tier of Object.keys(TIERS) as Tier[]) {
  if (only && tier !== only) continue;
  const list = GRAPHICS.filter((g) => g.tier === tier);
  if (!list.length) continue;
  const t = TIERS[tier];
  const h = Number(process.argv[4]) || { icon: 96, spot: 300, scene: 260, rule: 60 }[tier];
  const tmp = join(out, `.${tier}`);
  mkdirSync(tmp, { recursive: true });
  const pngs = list.map((g) => {
    const s = join(tmp, `${g.name}.svg`), p = join(tmp, `${g.name}.png`);
    writeFileSync(s, svg(g));
    execFileSync("rsvg-convert", ["-h", String(h), "-b", "white", "-o", p, s]);
    return p;
  });
  const cols = Math.max(1, Math.min(list.length, Math.floor(1500 / ((h * t.w) / t.h + 12))));
  execFileSync("magick", ["montage", "-label", "%t", "-pointsize", "13", ...pngs, "-tile", `${cols}x`, "-geometry", "+6+6", join(out, `${tier}.png`)]);
  rmSync(tmp, { recursive: true });
  console.log(join(out, `${tier}.png`), list.length);
}
