import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { ALLOWED_IT, DISPLAYS, FONT_SIZES, LEGAL, THEME, WIDGETS, composeLambda, composeSvg, dashboard, quantise, renderSvg, toLambda, toLvgl, type PaletteId } from "../src/index.ts";
import { generateEsphomeYaml } from "../../tokens/src/generate.ts";
import { DEFAULT_TOKENS } from "../../tokens/src/tokens.ts";

const PALETTES: PaletteId[] = ["colour", "epaper3", "epaper4", "mono"];

/** Balanced, properly nested XML (every tag closes) with no NaN/undefined leaking in. */
function assertValidSvg(svg: string, what: string) {
  assert.match(svg, /^<svg [^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, what);
  assert.doesNotMatch(svg, /NaN|undefined|Infinity|\[object/, `${what}: bad number in svg`);
  const stack: string[] = [];
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g)) {
    const [, close, name, , self] = m;
    if (self) continue;
    if (close) assert.equal(stack.pop(), name, `${what}: mismatched </${name}>`);
    else stack.push(name);
  }
  assert.equal(stack.length, 0, `${what}: unclosed ${stack.join(",")}`);
}
function paintHexes(svg: string): string[] { return [...svg.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{6})"/g)].map((m) => m[1].toLowerCase()); }

test("every widget renders valid SVG on every display and palette, with legal inks only", () => {
  for (const d of DISPLAYS) for (const palette of PALETTES) for (const w of WIDGETS) {
    const size = w.size(d), props = w.simulate(w.defaults(d), 3);
    const svg = renderSvg(w, props, { width: size.w, height: size.h, palette });
    const what = `${w.id} on ${d.id} / ${palette}`;
    assertValidSvg(svg, what);
    for (const hex of paintHexes(svg)) {
      const legal = palette === "colour" ? [...Object.values(THEME.dark)] : LEGAL[palette];
      assert.ok(legal.includes(hex), `${what}: illegal ink ${hex}`);
    }
  }
});

test("1-bit and e-paper previews use crisp edges", () => {
  const w = WIDGETS[0], d = DISPLAYS[5];
  assert.match(renderSvg(w, w.defaults(d), { width: 64, height: 64, palette: "mono" }), /shape-rendering="crispEdges"/);
  assert.doesNotMatch(renderSvg(w, w.defaults(d), { width: 64, height: 64, palette: "colour" }), /crispEdges/);
});

test("lambdas use only allowed it.* calls and are balanced C++", () => {
  const allowed = new Set<string>(ALLOWED_IT);
  for (const d of DISPLAYS) for (const w of WIDGETS) {
    const size = w.size(d), code = toLambda(w, w.simulate(w.defaults(d), 5), { x: 3, y: 5, w: size.w, h: size.h }, d.palette);
    const what = `${w.id} on ${d.id}`;
    for (const m of code.matchAll(/\bit\.(\w+)\(/g)) assert.ok(allowed.has(m[1]), `${what}: it.${m[1]} is not in the allowed set`);
    assert.doesNotMatch(code, /NaN|undefined|Infinity|\[object/, what);
    for (const [o, c] of [["{", "}"], ["(", ")"]] as const) assert.equal(code.split(o).length, code.split(c).length, `${what}: unbalanced ${o}${c}`);
    if (d.palette === "colour") assert.match(code, /id\(jp_\w+\)/, `${what}: should reference jupiter-esphome.yaml ids`);
    else assert.doesNotMatch(code, /id\(jp_(?!mono_)\w+\)/, `${what}: only font ids expected on ${d.palette}`);
  }
});

test("quantise only returns palette-legal colours", () => {
  for (let i = 0; i < 400; i++) {
    const hex = "#" + [0, 0, 0].map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, "0")).join("");
    for (const p of PALETTES) { const q = quantise(hex, p); if (p !== "colour") assert.ok(LEGAL[p].includes(q), `${hex} -> ${q} on ${p}`); }
  }
  assert.equal(quantise("#ff6a60", "epaper3"), "#ff0000");
  assert.equal(quantise("#f2b544", "epaper4"), "#ffff00");
  assert.equal(quantise("#fefefe", "mono"), "#ffffff");
});

test("device font sizes match jupiter.tokens.json", () => {
  const t = JSON.parse(readFileSync(new URL("../../tokens/jupiter.tokens.json", import.meta.url), "utf8"));
  assert.deepEqual([...FONT_SIZES], t.device.fontSizes);
});

test("embedded theme matches jupiter.tokens.json", () => {
  const t = JSON.parse(readFileSync(new URL("../../tokens/jupiter.tokens.json", import.meta.url), "utf8")).color;
  const map = { bg: "bg", surface: "surface", border: "border", text: "text", muted: "textMuted", accent: "accent", onAccent: "onAccent", ok: "ok", warn: "warn", danger: "danger", info: "info" } as const;
  for (const scheme of ["dark", "light"] as const) for (const [k, tk] of Object.entries(map)) assert.equal(THEME[scheme][k as keyof typeof map], t[scheme][tk].toLowerCase(), `${scheme}.${k}`);
});

const yaml = (text: string, what: string) => {
  const py = "import sys, yaml\nclass L(yaml.SafeLoader): pass\nL.add_multi_constructor('!', lambda l, s, n: l.construct_scalar(n))\nyaml.load(sys.stdin.read(), Loader=L)";
  const r = spawnSync("python3", ["-I", "-c", py], { input: text, encoding: "utf8" });
  if (r.error || /No module named 'yaml'/.test(r.stderr)) return false;
  assert.equal(r.status, 0, `${what} does not parse as YAML:\n${r.stderr}`);
  return true;
};

test("jupiter-esphome.yaml snippet parses and carries the ids the lambdas use", () => {
  const text = generateEsphomeYaml(DEFAULT_TOKENS);
  for (const id of ["jp_bg", "jp_text", "jp_accent", "jp_ok", "jp_warn", "jp_danger", "jp_style_card", ...FONT_SIZES.map((n) => `jp_mono_${n}`)]) assert.match(text, new RegExp(`id: ${id}\\b`));
  if (!yaml(text, "jupiter-esphome.yaml")) return;
});

test("LVGL snippets parse as YAML", () => {
  for (const d of [DISPLAYS[0], DISPLAYS[3]]) for (const w of WIDGETS) {
    const size = w.size(d), snippet = toLvgl(w, w.defaults(d), { x: 4, y: 8, w: size.w, h: size.h });
    assert.match(snippet, /^# /, `${w.id}: snippet should start with a comment`);
    if (!yaml(snippet, `lvgl snippet ${w.id}`)) return;
  }
});

test("dashboards compose for every display", () => {
  for (const d of DISPLAYS) {
    const ps = dashboard(d, 2);
    assert.ok(ps.length >= 1, d.id);
    for (const p of ps) assert.ok(p.rect.x >= 0 && p.rect.y >= 0 && p.rect.x + p.rect.w <= d.width && p.rect.y + p.rect.h <= d.height, `${d.id}: ${p.id} leaves the display`);
    assertValidSvg(composeSvg(d, ps), `dashboard ${d.id}`);
    const code = composeLambda(d, ps);
    assert.match(code, /it\.fill\(/);
    for (const m of code.matchAll(/\bit\.(\w+)\(/g)) assert.ok((ALLOWED_IT as readonly string[]).includes(m[1]), `${d.id}: it.${m[1]}`);
  }
});
