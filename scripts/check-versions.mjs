#!/usr/bin/env node
// One design system, one version: jupiter.tokens.json, every published package and the Rust crate must agree, so a release is a
// single coherent snapshot that projects can depend on ("current" or an exact vX.Y.Z).
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const want = JSON.parse(readFileSync(join(root, "packages/tokens/jupiter.tokens.json"), "utf8")).version; const bad = [];
for (const d of readdirSync(join(root, "packages"))) { const f = join(root, "packages", d, "package.json"); if (!existsSync(f)) continue; const j = JSON.parse(readFileSync(f, "utf8")); if (j.private) continue; if (j.version !== want) bad.push(`${j.name}: ${j.version} (tokens say ${want})`); }
const cargo = join(root, "packages/rust/Cargo.toml"); if (existsSync(cargo)) { const m = /^version\s*=\s*"([^"]+)"/m.exec(readFileSync(cargo, "utf8")); if (m && m[1] !== want) bad.push(`rust crate: ${m[1]} (tokens say ${want})`); }
if (bad.length) { console.error(`Version drift against jupiter.tokens.json ${want}:\n  ${bad.join("\n  ")}`); process.exit(1); }
console.log(`All packages are at ${want}.`);
