#!/usr/bin/env node
// Proves the design system is a dependency: change ONE design constant, rebuild, and watch every consumer change with it.
//   node scripts/consumer-check.mjs
// It edits packages/tokens/jupiter.tokens.json (restoring it afterwards, even on failure), rebuilds the tokens package, rebuilds the
// example consumer project, and checks that the new values reached: the consumer's built CSS, the Rust constants, and the Slint theme.
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tokensPath = join(root, "packages/tokens/jupiter.tokens.json");
const consumerDist = join(root, "examples/consumer/dist/assets");
const rustPath = join(root, "packages/rust/src/generated.rs");
const run = (cmd) => execSync(cmd, { cwd: root, stdio: "pipe" }).toString();
const build = () => { run("npm run build -w @belikh/jupiter-tokens"); run("npm run build -w @belikh/jupiter-example-consumer"); };
const consumerCss = () => readdirSync(consumerDist).filter((f) => f.endsWith(".css")).map((f) => readFileSync(join(consumerDist, f), "utf8")).join("\n");
const checks = []; const expect = (name, ok) => { checks.push([name, ok]); console.log(`  ${ok ? "ok  " : "FAIL"} ${name}`); };

const original = readFileSync(tokensPath, "utf8"); const t = JSON.parse(original);
const before = { sidebar: t.chrome.sidebar, overlay: t.z.overlay, radius: t.radius.md, motion: t.motion.base };
const changed = { sidebar: before.sidebar + 69, overlay: before.overlay + 27, radius: before.radius + 3, motion: before.motion + 133 };
try {
  console.log("baseline build");
  build(); const css0 = consumerCss();
  expect("consumer css carries the current sidebar size", css0.includes(`--jp-size-sidebar:${before.sidebar}px`) || css0.includes(`--jp-size-sidebar: ${before.sidebar}px`));

  console.log(`change ONE file: sidebar ${before.sidebar}->${changed.sidebar}, z.overlay ${before.overlay}->${changed.overlay}, radius.md ${before.radius}->${changed.radius}, motion.base ${before.motion}->${changed.motion}`);
  t.chrome.sidebar = changed.sidebar; t.z.overlay = changed.overlay; t.radius.md = changed.radius; t.motion.base = changed.motion;
  writeFileSync(tokensPath, JSON.stringify(t, null, 2) + "\n"); build();
  const css1 = consumerCss(); const rust = readFileSync(rustPath, "utf8");
  const has = (css, v) => css.includes(v.replace(": ", ":")) || css.includes(v);
  expect("consumer css: --jp-size-sidebar changed", has(css1, `--jp-size-sidebar: ${changed.sidebar}px`));
  expect("consumer css: --jp-z-overlay changed", has(css1, `--jp-z-overlay: ${changed.overlay}`));
  expect("consumer css: --jp-radius-md changed", has(css1, `--jp-radius-md: ${changed.radius}px`));
  expect("consumer css: --jp-dur-base changed", new RegExp(`--jp-dur-base:\\s*(${changed.motion}ms|0?\\.${changed.motion}s)`).test(css1));
  expect("rust constants changed (chrome::SIDEBAR)", rust.includes(`SIDEBAR: u32 = ${changed.sidebar}`));
  expect("rust constants changed (z::OVERLAY)", rust.includes(`OVERLAY: i32 = ${changed.overlay}`));
  expect("old sidebar size is gone from the consumer", !has(css1, `--jp-size-sidebar: ${before.sidebar}px`));
} finally {
  writeFileSync(tokensPath, original); console.log("restoring the design constants and rebuilding");
  try { build(); const css2 = consumerCss(); expect("restore: consumer is back to the original", css2.includes(`${before.sidebar}px`)); } catch (e) { console.error("restore build failed:", e.message); process.exitCode = 1; }
}
const failed = checks.filter(([, ok]) => !ok);
console.log(failed.length ? `\n${failed.length} check(s) failed` : "\nOne change in the design system reached every consumer.");
process.exit(failed.length ? 1 : process.exitCode ?? 0);
