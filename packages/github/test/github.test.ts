import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { generateGithubTheme } from "../../tokens/src/github.ts";
import { OUTPUTS } from "../../tokens/src/generate.ts";
import { DEFAULT_TOKENS } from "../../tokens/src/tokens.ts";
import { SCHEMES, STATUSES, renderBadge, renderBanner, renderDivider, renderSocial, renderTile, paletteMarkdown } from "../src/render.mjs";
import { build, builtinAssets } from "../src/make.mjs";
import type { GithubTheme } from "../src/render.mjs";

const theme = JSON.parse(generateGithubTheme(DEFAULT_TOKENS)) as GithubTheme;
const all = () => SCHEMES.flatMap((s) => [renderBanner(theme, s, { logo: true }), renderBanner(theme, s), renderDivider(theme, s), renderTile(theme, s), renderSocial(theme, s, { logo: true }), ...STATUSES.map((st) => renderBadge(theme, s, { status: st }))]);

function assertValidSvg(svg: string) {
  assert.match(svg, /^<svg [^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.doesNotMatch(svg, /NaN|undefined|Infinity|\[object/);
  const stack: string[] = [];
  for (const m of svg.replace(/<!--[\s\S]*?-->/g, "").matchAll(/<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g)) {
    if (m[4]) continue;
    if (m[1]) assert.equal(stack.pop(), m[2]); else stack.push(m[2]);
  }
  assert.equal(stack.length, 0);
}

test("the github output is registered and is the theme slice", () => {
  const o = OUTPUTS.find((x) => x.id === "github");
  assert.ok(o); assert.equal(o.build(DEFAULT_TOKENS), generateGithubTheme(DEFAULT_TOKENS));
  assert.equal(theme.color.dark.accent, DEFAULT_TOKENS.color.dark.accent);
});

test("committed theme.json and assets are in sync with the tokens", () => {
  assert.equal(readFileSync(new URL("../src/theme.json", import.meta.url), "utf8"), generateGithubTheme(DEFAULT_TOKENS), "run npm run build");
  for (const f of builtinAssets(theme)) assert.equal(readFileSync(new URL(`../assets/${f.name}`, import.meta.url), "utf8"), f.svg, `${f.name} is stale: npm run build -w @belikh/jupiter-github`);
});

test("every SVG is well formed, self-contained and small enough", () => {
  for (const svg of all()) {
    assertValidSvg(svg);
    assert.doesNotMatch(svg, /<script|<foreignObject|<image|\shref=|url\(\s*["']?https?:|@import/i);
    assert.ok(svg.length < 60_000, `${svg.length} bytes`);
    assert.match(svg, /<title/);
  }
  for (const svg of [renderBanner(theme, "dark"), renderSocial(theme, "dark")]) assert.match(svg, /prefers-reduced-motion:reduce/);
});

test("colours come from the tokens, per scheme", () => {
  for (const s of SCHEMES) {
    const c = theme.color[s];
    const banner = renderBanner(theme, s); const tile = renderTile(theme, s, { status: "danger" }); const badge = renderBadge(theme, s, { status: "warn" });
    for (const hex of [c.bg, c.border, c.text, c.accent]) assert.ok(banner.includes(hex), `banner ${s} lacks ${hex}`);
    assert.ok(tile.includes(c.danger)); assert.ok(badge.includes(c.warnBg) && badge.includes(c.warn));
  }
});

test("one token change reaches every asset", () => {
  const t = structuredClone(DEFAULT_TOKENS); t.color.light.accent = "#123456"; t.radius.md = 11;
  const th = JSON.parse(generateGithubTheme(t)) as GithubTheme;
  assert.ok(renderBanner(th, "light").includes("#123456")); assert.ok(renderBanner(th, "light").includes('rx="11"'));
  assert.ok(!renderBanner(theme, "light").includes("#123456"));
  assert.ok(renderBadge(th, "light", { status: "accent" }).includes("#123456"));
});

test("text is XML-escaped and badges size to their text", () => {
  const svg = renderBanner(theme, "light", { title: `A & B <script>"x"`, subtitle: "1 < 2" });
  assertValidSvg(svg); assert.doesNotMatch(svg, /<script>/); assert.match(svg, /A &amp; B &lt;script&gt;&quot;x&quot;/);
  const w = (v: string) => Number(/width="(\d+)"/.exec(renderBadge(theme, "light", { label: "a", value: v }))![1]);
  assert.ok(w("passing") > w("ok"));
  assert.throws(() => renderBadge(theme, "light", { status: "nope" as never }));
  assert.throws(() => renderBanner(theme, "sepia" as never));
});

test("CLI: placeholders replaced, badge/tile flags, palette", () => {
  const files = build(theme, { badge: ["build|passing|ok"], tile: [], title: "Hello", only: "banner,badge", scheme: "dark" });
  assert.deepEqual(files.map((f) => f.name), ["banner-dark.svg", "badge-build-dark.svg"]);
  assert.ok(files[0].svg.includes(">Hello<"));
  const r = spawnSync("node", [new URL("../src/make.mjs", import.meta.url).pathname, "--palette"], { encoding: "utf8" });
  assert.equal(r.status, 0); assert.ok(r.stdout.includes(`\`${theme.color.light.accent}\``)); assert.equal(r.stdout, paletteMarkdown(theme));
  assert.equal(spawnSync("node", [new URL("../src/make.mjs", import.meta.url).pathname, "--badge", "x|y|bogus", "--out", "/nonexistent-dir-jp"], { encoding: "utf8" }).status, 1);
});

test("templates reference only assets the kit can produce", () => {
  for (const f of ["README.md", "profile-README.md", "org-profile-README.md"]) {
    const md = readFileSync(new URL(`../templates/${f}`, import.meta.url), "utf8");
    assert.match(md, /<picture>[\s\S]*prefers-color-scheme: dark/); assert.match(md, /> \[!(NOTE|TIP|IMPORTANT|WARNING)\]/);
    for (const m of md.matchAll(/(?:banner|divider|tile|badge)-[a-z]+-(?:light|dark)\.svg|(?:banner|divider)-(?:light|dark)\.svg/g)) {
      if (/badge-(build|version)-/.test(m[0])) continue; // generated on demand with --badge
      assert.ok(existsSync(new URL(`../assets/${m[0]}`, import.meta.url)), `${f} uses missing ${m[0]}`);
    }
  }
});
