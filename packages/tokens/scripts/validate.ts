// Release gate: the tokens must be structurally valid, WCAG-AA clean in both schemes,
// and the token file's version must match package.json.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_TOKENS, isTokens } from "../src/tokens.ts";
import { checkContrast } from "../src/contrast.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { version: string };
const errors: string[] = [];

// The Rust crate must be released in lockstep with the tokens.
const cargo = readFileSync(join(root, "..", "rust", "Cargo.toml"), "utf8");
const cargoVersion = /^version\s*=\s*"([^"]+)"/m.exec(cargo)?.[1];
if (cargoVersion !== pkg.version) errors.push(`version mismatch: packages/rust/Cargo.toml is ${cargoVersion}, package.json is ${pkg.version}`);

if (!isTokens(DEFAULT_TOKENS)) errors.push("jupiter.tokens.json is not a valid token set");
if (DEFAULT_TOKENS.version !== pkg.version) {
  errors.push(`version mismatch: jupiter.tokens.json is ${DEFAULT_TOKENS.version}, package.json is ${pkg.version}`);
}
for (const scheme of ["light", "dark"] as const) {
  for (const r of checkContrast(DEFAULT_TOKENS.color[scheme])) {
    if (!r.pass) errors.push(`contrast ${scheme}: ${r.fg} on ${r.bg} is ${r.ratio.toFixed(2)}, needs ${r.min}`);
  }
}
if (errors.length) {
  console.error(errors.map((e) => `  x ${e}`).join("\n"));
  process.exit(1);
}
console.log(`tokens ${pkg.version}: valid, version in sync, contrast passes (light + dark)`);
