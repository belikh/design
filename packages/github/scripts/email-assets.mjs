// Renders email header + divider PNGs from the github kit (theme.json) so they follow the tokens.
// usage: node scripts/email-assets.mjs  (writes assets/email/*.png; needs playwright-core + /usr/bin/chromium, or CHROMIUM=<path>)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const pkg = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(pkg, "../..");
const out = join(pkg, "assets/email");
const kit = join(root, "packages/github/src");
const { renderBanner, renderDivider } = await import(pathToFileURL(join(kit, "render.mjs")).href);
const { chromium } = await import(pathToFileURL(join(root, "node_modules/playwright-core/index.mjs")).href);
const theme = JSON.parse(readFileSync(join(kit, "theme.json"), "utf8"));
mkdirSync(out, { recursive: true });

const jobs = [
  ["email-header", renderBanner(theme, "light", { logo: true, title: "Jupiter", subtitle: "", eyebrow: "jupiter.au" })],
  ["email-divider", renderDivider(theme, "light")],
];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || "/usr/bin/chromium", args: ["--no-sandbox"] });
for (const [name, svg] of jobs) {
  const m = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
  const w = Math.round(+m[1]), h = Math.round(+m[2]);
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.setContent(`<body style="margin:0;background:transparent">${svg}</body>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(out, `${name}.png`), omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
  console.log(name, w, h);
  await ctx.close();
}
await browser.close();
