#!/usr/bin/env node
// Visual regression check without extra dependencies.
//   npm run visual                     screenshot every route in 4 variants (light/dark x comfortable/compact) and compare with visual/baseline.json
//   npm run visual -- --density compact   only one density (comfortable | compact); omitted = both
//   npm run visual -- --update --baseline-out /tmp/b.json   write the (merged) baseline to another file, leaving visual/baseline.json untouched
// Baseline keys: "<route>#<theme>" is the comfortable density (the original format, so old baselines stay valid) and
// "<route>#<theme>+compact" is compact. The file header lists the densities it holds.
//   npm run visual -- --update         accept the current look as the new baseline
//   npm run visual -- --only /p2/chrome   limit to routes starting with this prefix (combine with --update to refresh a subset)
//   VISUAL_URL=http://127.0.0.1:3000 npm run visual   reuse a running dev server instead of starting one
// Screenshots go to .visual/ (gitignored). The baseline stores a small perceptual grid per screenshot (average
// luminance in 24x14 cells), so clocks and "5 minutes ago" text don't cause failures but layout/colour changes do.
import { spawn, execFileSync } from "node:child_process";
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync, mkdtempSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const update = args.includes("--update");
const arg = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : "");
const only = arg("--only"), densityOnly = arg("--density"), baselineOut = arg("--baseline-out");
const THEMES = ["light", "dark"], DENSITIES = ["comfortable", "compact"].filter((d) => !densityOnly || d === densityOnly);
/** Baseline key for one variant: comfortable keeps the original "#theme" form, compact adds "+compact". */
export const shotKey = (path, theme, density) => `${path}#${theme}${density === "compact" ? "+compact" : ""}`;
const W = 1280, H = 800, GX = 24, GY = 14, MEAN_LIMIT = 2.5, CELL_LIMIT = 45;
const CHROMIUM = process.env.CHROMIUM || "chromium";
const outDir = join(root, ".visual"), baselinePath = join(root, "visual", "baseline.json");

function routePaths() {
  const files = [join(root, "src/routes.ts"), ...readdirSync(join(root, "src/p2"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => join(root, "src/p2", d.name, "index.tsx"))].filter(existsSync);
  const set = new Set();
  for (const f of files) for (const m of readFileSync(f, "utf8").matchAll(/\bpath:\s*"(\/[^"?]*)"/g)) set.add(m[1]);
  return [...set].filter((p) => !only || p.startsWith(only)).sort();
}

// Minimal PNG decoder (8-bit RGB/RGBA, non-interlaced) — enough for Chromium screenshots.
function decodePng(buf) {
  let o = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (o < buf.length) { const len = buf.readUInt32BE(o), type = buf.toString("ascii", o + 4, o + 8), d = buf.subarray(o + 8, o + 8 + len);
    if (type === "IHDR") { w = d.readUInt32BE(0); h = d.readUInt32BE(4); if (d[8] !== 8 || d[12] !== 0) throw new Error("unsupported PNG"); ct = d[9]; } else if (type === "IDAT") idat.push(d); o += 12 + len; }
  const bpp = ct === 6 ? 4 : ct === 2 ? 3 : 0; if (!bpp) throw new Error("unsupported PNG colour type " + ct);
  const raw = inflateSync(Buffer.concat(idat)), stride = w * bpp, px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) { const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride;
    for (let x = 0; x < stride; x++) { const a = x >= bpp ? px[dst + x - bpp] : 0, b = y ? px[dst - stride + x] : 0, c = x >= bpp && y ? px[dst - stride + x - bpp] : 0; let v = raw[src + x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[dst + x] = v & 255; } }
  return { w, h, bpp, px };
}
function grid({ w, h, bpp, px }) {
  const sum = new Float64Array(GX * GY), cnt = new Float64Array(GX * GY);
  for (let y = 0; y < h; y++) { const gy = Math.min(GY - 1, Math.floor((y * GY) / h)); for (let x = 0; x < w; x++) { const i = (y * w + x) * bpp, gx = Math.min(GX - 1, Math.floor((x * GX) / w)); sum[gy * GX + gx] += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]; cnt[gy * GX + gx]++; } }
  return Buffer.from(Array.from(sum, (s, i) => Math.round(s / cnt[i]))).toString("base64");
}
const diff = (a, b) => { const A = Buffer.from(a, "base64"), B = Buffer.from(b, "base64"); let t = 0, m = 0; for (let i = 0; i < A.length; i++) { const d = Math.abs(A[i] - B[i]); t += d; m = Math.max(m, d); } return { mean: t / A.length, max: m }; };

async function waitFor(url) { for (let i = 0; i < 120; i++) { try { if ((await fetch(url)).ok) return; } catch { /* not up yet */ } await new Promise((r) => setTimeout(r, 500)); } throw new Error("dev server did not start"); }
const exe = CHROMIUM.startsWith("/") ? CHROMIUM : execFileSync("sh", ["-c", `command -v ${CHROMIUM}`]).toString().trim();
/** One browser context per density (jp-density in localStorage is how the app reads it); theme comes from ?theme=. */
async function shoot(ctx, base, path, theme, file) {
  const page = await ctx.newPage();
  try {
    await page.goto(`${base}${path}?theme=${theme}&visual=1`, { waitUntil: "load", timeout: 60000 });
    await page.waitForSelector("main, .adm-main", { timeout: 30000 });
    await page.waitForFunction(() => !document.querySelector('[data-testid="route-loading"]'), null, { timeout: 30000 });
    await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(1200);
    await page.screenshot({ path: file });
  } finally { await page.close(); }
}

let server, base = process.env.VISUAL_URL;
if (!base) { base = "http://127.0.0.1:4199"; server = spawn("npx", ["vite", "--port", "4199", "--strictPort", "--host", "127.0.0.1"], { cwd: root, stdio: "ignore" }); }
try {
  await waitFor(base + "/");
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"] });
  const ctxs = {};
  for (const d of DENSITIES) { ctxs[d] = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, reducedMotion: "reduce" }); await ctxs[d].addInitScript((v) => { try { localStorage.setItem("jp-density", v); } catch { /* ignore */ } }, d); }
  const baseline = existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, "utf8")) : { size: [W, H], grid: [GX, GY], shots: {} };
  if (update) baseline.densities = ["comfortable", "compact"];
  const jobs = routePaths().flatMap((p) => DENSITIES.flatMap((d) => THEMES.map((t) => ({ key: shotKey(p, t, d), path: p, theme: t, density: d, file: join(outDir, `${p.replace(/\//g, "_").replace(/^_/, "") || "home"}.${t}${d === "compact" ? ".compact" : ""}.png`) }))));
  const results = []; let next = 0;
  await Promise.all(Array.from({ length: Number(process.env.VISUAL_JOBS || 5) }, async () => { while (next < jobs.length) { const j = jobs[next++]; try { await shoot(ctxs[j.density], base, j.path, j.theme, j.file); results.push({ ...j, grid: grid(decodePng(readFileSync(j.file))) }); } catch (e) { results.push({ ...j, error: String(e.message || e).split("\n")[0] }); } } }));
  results.sort((a, b) => a.key.localeCompare(b.key));
  const failed = results.filter((r) => r.error), changed = [], added = [];
  for (const r of results) { if (r.error) continue; const old = baseline.shots[r.key]; if (!old) { added.push(r.key); continue; } const d = diff(old, r.grid); if (d.mean > MEAN_LIMIT || d.max > CELL_LIMIT) changed.push(`${r.key}  mean ${d.mean.toFixed(1)}, worst cell ${d.max}`); }
  if (update) { for (const r of results) if (!r.error) baseline.shots[r.key] = r.grid; const outPath = baselineOut ? resolve(process.cwd(), baselineOut) : baselinePath; mkdirSync(dirname(outPath), { recursive: true }); writeFileSync(outPath, JSON.stringify(baseline) + "\n"); console.log(`baseline updated: ${results.length - failed.length} screenshots${failed.length ? `, ${failed.length} failed` : ""}`); }
  else { console.log(`${results.length} screenshots in .visual/  ·  ${changed.length} changed  ·  ${added.length} new (no baseline)  ·  ${failed.length} failed`); for (const c of changed) console.log("  changed:", c); for (const a of added.slice(0, 20)) console.log("  new:    ", a); if (added.length > 20) console.log(`  …and ${added.length - 20} more new`); }
  for (const f of failed) console.log("  failed: ", f.key, f.error);
  process.exitCode = failed.length || (!update && changed.length) ? 1 : 0;
  await browser.close();
} finally { server?.kill(); }
