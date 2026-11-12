#!/usr/bin/env node
// Copy the font files into packages/fonts/files and write packages/fonts/fonts.css (relative urls) from the token-generated @font-face rules.
import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), ".."); const from = join(root, "apps/admin/public/fonts"); const to = join(root, "packages/fonts/files");
if (!existsSync(from)) { console.error(`no fonts at ${from}`); process.exit(1); }
mkdirSync(to, { recursive: true }); let n = 0;
for (const f of readdirSync(from)) if (/\.(woff2|txt)$/.test(f) && f !== "README.txt") { cpSync(join(from, f), join(to, f)); n++; }
const css = readFileSync(join(root, "packages/tokens/dist/jupiter-fonts.css"), "utf8").replace(/url\("fonts\//g, 'url("./files/');
writeFileSync(join(root, "packages/fonts/fonts.css"), css);
console.log(`staged ${n} files and fonts.css in packages/fonts (not committed: files/ and fonts.css are gitignored)`);
