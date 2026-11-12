#!/usr/bin/env node
// Bump the design system version everywhere at once: tokens JSON, every package, the Rust crate.
//   node scripts/bump-version.mjs 1.2.0 && npm run build
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const v = process.argv[2]; if (!/^\d+\.\d+\.\d+$/.test(v ?? "")) { console.error("Usage: node scripts/bump-version.mjs X.Y.Z"); process.exit(1); }
const jsonSet = (f) => { const raw = readFileSync(f, "utf8"); const out = raw.replace(/("version"\s*:\s*")[^"]+(")/, `$1${v}$2`); writeFileSync(f, out); };
jsonSet(join(root, "packages/tokens/jupiter.tokens.json"));
for (const d of readdirSync(join(root, "packages"))) { const f = join(root, "packages", d, "package.json"); if (existsSync(f) && !JSON.parse(readFileSync(f, "utf8")).private) jsonSet(f); }
const cargo = join(root, "packages/rust/Cargo.toml"); if (existsSync(cargo)) writeFileSync(cargo, readFileSync(cargo, "utf8").replace(/^(version\s*=\s*")[^"]+(")/m, `$1${v}$2`));
console.log(`Design system version is now ${v}. Run npm run build, commit, and push: the release workflow publishes it.`);
