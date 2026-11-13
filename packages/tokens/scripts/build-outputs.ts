// Generates every distributable file from jupiter.tokens.json into dist/.
// Run after `tsc` (see package.json "build"). Node strips types natively, so no extra tooling.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_TOKENS, isTokens } from "../src/tokens.ts";
import { OUTPUTS } from "../src/generate.ts";

if (!isTokens(DEFAULT_TOKENS)) throw new Error("jupiter.tokens.json is not a valid token set");

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
mkdirSync(dist, { recursive: true });
for (const o of OUTPUTS) {
  // "tokens" is the source file itself; copy it through so consumers can import it from dist too.
  writeFileSync(join(dist, o.filename), o.build(DEFAULT_TOKENS));
  console.log(`dist/${o.filename}`);
}

// The Rust crate keeps a committed copy of the generated core so `cargo` users need no Node toolchain.
// CI fails if this file is out of date (see .github/workflows/ci.yml).
const rustSrc = join(dist, "..", "..", "rust", "src");
if (existsSync(rustSrc)) {
  const rust = OUTPUTS.find((o) => o.id === "rust")!;
  writeFileSync(join(rustSrc, "generated.rs"), rust.build(DEFAULT_TOKENS));
  console.log("packages/rust/src/generated.rs");
}

// The GitHub kit renders its SVGs from a committed copy of the theme slice; `npm run build -w @belikh/jupiter-github` turns it into assets/.
const githubSrc = join(dist, "..", "..", "github", "src");
if (existsSync(githubSrc)) {
  const gh = OUTPUTS.find((o) => o.id === "github")!;
  writeFileSync(join(githubSrc, "theme.json"), gh.build(DEFAULT_TOKENS));
  console.log("packages/github/src/theme.json");
}
