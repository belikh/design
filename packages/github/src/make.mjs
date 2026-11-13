#!/usr/bin/env node
// Jupiter GitHub kit CLI. Writes light + dark SVGs (and optionally a PNG social preview) for READMEs, profiles and repo settings.
//   node make.mjs --title "My project" --subtitle "What it does" --out ./.github/assets
//   node make.mjs --out dir --only banner,social --eyebrow "acme" --footer "acme/my-project" --png
//   node make.mjs --out dir --only badge --badge "build|passing|ok" --badge "coverage|91%|info"
//   node make.mjs --out dir --only tile --tile "Uptime|99.98%|ok"
//   node make.mjs --palette            print the palette as Markdown with hex colour chips
//   node make.mjs --assets [--check]   (re)generate the package's own committed assets/ from theme.json (--check: fail if stale)
// Flags: --scheme light|dark|both (default both)  --only banner,divider,social,tile,badge (default banner,divider,social)
//        --logo  use the Jupiter logo instead of the title text (banner, social)
//        --theme <file>  use another theme.json (the generated jupiter-github.json)  --png  also rasterise social-preview (needs playwright-core + Chromium; CHROMIUM=<path> overrides /usr/bin/chromium)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SCHEMES, STATUSES, paletteMarkdown, renderBadge, renderBanner, renderDivider, renderSocial, renderTile, slug } from "./render.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const MULTI = new Set(["badge", "tile"]), BOOL = new Set(["logo", "png", "palette", "assets", "check", "help"]);

export function parseArgs(argv) {
  const o = { badge: [], tile: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) throw new Error(`unexpected argument "${a}"`);
    const k = a.slice(2);
    if (BOOL.has(k)) { o[k] = true; continue; }
    const v = argv[++i];
    if (v === undefined) throw new Error(`--${k} needs a value`);
    if (MULTI.has(k)) o[k].push(v); else o[k] = v;
  }
  return o;
}

const triple = (s, what) => {
  const [label, value, status = "neutral"] = s.split("|");
  if (!label || value === undefined) throw new Error(`--${what} wants "label|value|status", got "${s}"`);
  if (!STATUSES.includes(status)) throw new Error(`--${what}: status "${status}" must be one of ${STATUSES.join(", ")}`);
  return { label, value, status };
};

/** Pure: returns [{ name, svg }] for the requested kinds and schemes. */
export function build(theme, o = {}) {
  o = { badge: [], tile: [], ...o };
  const schemes = !o.scheme || o.scheme === "both" ? SCHEMES : [o.scheme];
  for (const s of schemes) if (!SCHEMES.includes(s)) throw new Error(`--scheme must be light, dark or both`);
  const only = new Set((o.only ?? (o.badge.length ? "banner,divider,social,badge" : o.tile.length ? "banner,divider,social,tile" : "banner,divider,social")).split(","));
  const text = { title: o.title, subtitle: o.subtitle, eyebrow: o.eyebrow, footer: o.footer, logo: o.logo };
  for (const k of Object.keys(text)) if (text[k] === undefined) delete text[k];
  const files = [];
  for (const s of schemes) {
    if (only.has("banner")) files.push({ name: `banner-${s}.svg`, svg: renderBanner(theme, s, text) });
    if (only.has("divider")) files.push({ name: `divider-${s}.svg`, svg: renderDivider(theme, s) });
    if (only.has("social")) files.push({ name: `social-preview-${s}.svg`, svg: renderSocial(theme, s, text) });
    if (only.has("tile")) for (const t of o.tile.map((x) => triple(x, "tile"))) files.push({ name: `tile-${slug(t.label)}-${s}.svg`, svg: renderTile(theme, s, t) });
    if (only.has("badge")) for (const b of o.badge.map((x) => triple(x, "badge"))) files.push({ name: `badge-${slug(b.label)}-${s}.svg`, svg: renderBadge(theme, s, b) });
  }
  return files;
}

/** The kit's own committed samples: default banner/divider/social plus a tile and badge for ok, warn, danger and info (accent and neutral render on demand). */
export function builtinAssets(theme) {
  const files = build(theme, {});
  const label = { ok: "passing", warn: "degraded", danger: "failing", info: "queued", accent: "release", neutral: "draft" };
  for (const s of SCHEMES) for (const st of STATUSES.filter((x) => x !== "accent" && x !== "neutral")) {
    files.push({ name: `tile-${st}-${s}.svg`, svg: renderTile(theme, s, { label: "Status", value: label[st], status: st }) });
    files.push({ name: `badge-${st}-${s}.svg`, svg: renderBadge(theme, s, { label: "status", value: label[st], status: st }) });
  }
  return files;
}

async function png(dir, names) {
  let chromium;
  try { ({ chromium } = await import("playwright-core")); } catch { throw new Error("--png needs playwright-core (npm i -D playwright-core) and a Chromium"); }
  const exe = process.env.CHROMIUM || "/usr/bin/chromium";
  const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] }).catch((e) => { throw new Error(`cannot start Chromium at ${exe} (set CHROMIUM=<path>): ${e.message.split("\n")[0]}`); });
  try {
    for (const name of names) {
      const scheme = name.includes("-dark") ? "dark" : "light";
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 640 }, colorScheme: scheme, reducedMotion: "reduce" });
      const page = await ctx.newPage();
      await page.goto(pathToFileURL(join(dir, name)).href);
      await page.screenshot({ path: join(dir, name.replace(/\.svg$/, ".png")) });
      await ctx.close();
      console.log(name.replace(/\.svg$/, ".png"));
    }
  } finally { await browser.close(); }
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.help) { console.log(readFileSync(import.meta.filename, "utf8").split("\n").filter((l) => l.startsWith("//")).map((l) => l.slice(3)).join("\n")); return; }
  const theme = JSON.parse(readFileSync(o.theme ? resolve(o.theme) : join(here, "theme.json"), "utf8"));
  if (o.palette) { process.stdout.write(paletteMarkdown(theme)); return; }
  if (o.assets) {
    const dir = join(here, "..", "assets"); const files = builtinAssets(theme);
    if (o.check) {
      const stale = files.filter((f) => !existsSync(join(dir, f.name)) || readFileSync(join(dir, f.name), "utf8") !== f.svg).map((f) => f.name);
      if (stale.length) { console.error(`packages/github/assets is out of date with theme.json: ${stale.join(", ")}\nrun: npm run build -w @belikh/jupiter-github`); process.exit(1); }
      console.log(`${files.length} assets match theme.json`); return;
    }
    mkdirSync(dir, { recursive: true });
    for (const f of files) writeFileSync(join(dir, f.name), f.svg);
    console.log(`packages/github/assets: ${files.length} files`); return;
  }
  const out = resolve(o.out ?? "jupiter-github"); mkdirSync(out, { recursive: true });
  const files = build(theme, o);
  for (const f of files) { writeFileSync(join(out, f.name), f.svg); console.log(f.name); }
  if (o.png) await png(out, files.filter((f) => f.name.startsWith("social-preview-")).map((f) => f.name));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main().catch((e) => { console.error(process.env.DEBUG ? e : `make: ${e.message}`); process.exit(1); });
