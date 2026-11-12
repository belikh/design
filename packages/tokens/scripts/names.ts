// Public API surface of the CSS: every --jp-* variable and .jp-* class. Written to dist/names.json
// so a release can be diffed against the previous one (removals are breaking changes).
//   node scripts/names.ts                 write dist/names.json
//   node scripts/names.ts <previous.json> also fail if any name from <previous.json> is gone
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_TOKENS } from "../src/tokens.ts";
import { generateCSS } from "../src/generate.ts";

const css = generateCSS(DEFAULT_TOKENS);
const uniq = (re: RegExp) => [...new Set([...css.matchAll(re)].map((m) => m[0]))].sort();
const names = { version: DEFAULT_TOKENS.version, variables: uniq(/--jp-[a-z0-9-]+(?=\s*:)/g), classes: uniq(/\.jp-[a-z0-9_-]+/g) };

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
mkdirSync(dist, { recursive: true });
writeFileSync(join(dist, "names.json"), JSON.stringify(names, null, 2) + "\n");
console.log(`names.json: ${names.variables.length} variables, ${names.classes.length} classes`);

const prevPath = process.argv[2];
if (prevPath) {
  const prev = JSON.parse(readFileSync(prevPath, "utf8")) as typeof names;
  const removed = [
    ...prev.variables.filter((n) => !names.variables.includes(n)),
    ...prev.classes.filter((n) => !names.classes.includes(n)),
  ];
  if (removed.length) {
    console.error(`removed since ${prev.version}: ${removed.join(", ")}`);
    const major = (v: string) => Number(v.split(".")[0]);
    if (major(names.version) > major(prev.version)) console.log("major version bumped: removals allowed");
    else { console.error("breaking change without a major version bump"); process.exit(1); }
  }
}
