#!/usr/bin/env node
// Publish the design-system packages to an npm registry (GitHub Packages by default) under the owner's scope, so projects depend on them.
//   node scripts/publish-packages.mjs [--registry https://npm.pkg.github.com] [--scope belikh] [--dry] [--only tokens,ui] [--include-fonts]
// The packages are named @belikh/jupiter-<name> everywhere (workspace, imports, registry), so a project imports exactly what this repo does.
// (npm 12 refuses registry installs through aliases, hence real names.) Auth: NODE_AUTH_TOKEN (a GitHub token with write:packages; in Actions, GITHUB_TOKEN).
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2); const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const registry = flag("--registry", "https://npm.pkg.github.com"); const scope = flag("--scope", process.env.JUPITER_SCOPE || "belikh");
const dry = args.includes("--dry"); const only = flag("--only", "")?.split(",").filter(Boolean);
const names = ["tokens", "graphics", "ui", "esphome", "github", ...(args.includes("--include-fonts") ? ["fonts"] : [])].filter((n) => !only.length || only.includes(n));
const version = JSON.parse(readFileSync(join(root, "packages/tokens/jupiter.tokens.json"), "utf8")).version;
const published = (n) => `@${scope}/jupiter-${n}`; // equals the workspace name when scope is the repo owner
const npmrc = join(mkdtempSync(join(tmpdir(), "jp-npmrc-")), ".npmrc");
writeFileSync(npmrc, `@${scope}:registry=${registry}\n//${new URL(registry).host}/:_authToken=\${NODE_AUTH_TOKEN}\n`);
const run = (cmd, a, cwd) => execFileSync(cmd, a, { cwd, stdio: "pipe", timeout: 120000, env: { ...process.env, NODE_AUTH_TOKEN: process.env.NODE_AUTH_TOKEN ?? "x" } }).toString();

let failed = 0;
for (const n of names) {
  const src = join(root, "packages", n); const pj = JSON.parse(readFileSync(join(src, "package.json"), "utf8"));
  if (pj.private) { console.log(`skip ${pj.name} (private)`); continue; }
  if (n === "fonts" && !existsSync(join(src, "files")) || n === "fonts" && readdirSync(join(src, "files")).length === 0) { console.log("skip fonts: packages/fonts/files is empty (run scripts/stage-fonts.mjs)"); continue; }
  const exists = dry ? false : (() => { try { return run("npm", ["view", `${published(n)}@${version}`, "version", "--userconfig", npmrc, "--registry", registry], root).trim() === version; } catch { return false; } })();
  if (exists && !dry) { console.log(`ok   ${published(n)}@${version} already published`); continue; }
  const stage = mkdtempSync(join(tmpdir(), `jp-pub-${n}-`));
  run("npm", ["pack", "--pack-destination", stage], src); const tgz = readdirSync(stage).find((f) => f.endsWith(".tgz"));
  run("tar", ["xzf", join(stage, tgz), "-C", stage]); const dir = join(stage, "package"); const p = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  for (const k of ["dependencies", "peerDependencies", "devDependencies"]) for (const d of Object.keys(p[k] ?? {})) if (d.startsWith(`@${scope}/jupiter-`)) { if (k === "devDependencies") delete p[k][d]; else p[k][d] = `^${version}`; }
  for (const k of ["peerDependencies", "devDependencies"]) if (p[k] && !Object.keys(p[k]).length) delete p[k];
  p.name = published(n); p.version = version; p.publishConfig = { registry, access: "restricted" }; delete p.scripts?.prepare;
  writeFileSync(join(dir, "package.json"), JSON.stringify(p, null, 2) + "\n");
  try {
    if (dry) { console.log(`dry  ${p.name}@${version} -> ${registry}\n     deps: ${JSON.stringify(p.dependencies ?? {})}`); }
    else { run("npm", ["publish", "--userconfig", npmrc, "--registry", registry], dir); console.log(`done ${p.name}@${version}`); }
  } catch (e) { failed++; console.error(`FAIL ${p.name}: ${String(e.stderr ?? e.message).split("\n").slice(0, 6).join("\n")}`); }
}
process.exit(failed ? 1 : 0);
