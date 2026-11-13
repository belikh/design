#!/usr/bin/env node
// Start a new project on the design system.
//   node scripts/new-project.mjs <dir> [--registry URL] [--scope belikh] [--local]
// The project depends on @belikh/jupiter-tokens, @belikh/jupiter-graphics, @belikh/jupiter-ui and @belikh/jupiter-fonts and contains no design decisions of its own.
// Default: the packages come from the registry (GitHub Packages) under their real @belikh/jupiter-* names, so `npm update` picks up each new design
// system release. --local links this checkout instead (for developing the design system itself). See docs/consuming.md.
import { chmodSync, cpSync, existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2); const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const dest = args.find((a, i) => !a.startsWith("--") && !["--registry", "--scope"].includes(args[i - 1])); const local = args.includes("--local");
const registry = flag("--registry", "https://npm.pkg.github.com"); const scope = flag("--scope", "belikh");
if (!dest) { console.error("Usage: node scripts/new-project.mjs <dir> [--registry URL] [--scope belikh] [--local]"); process.exit(1); }
const target = resolve(dest); if (existsSync(join(target, "package.json"))) { console.error(`${target} already has a package.json`); process.exit(1); }
mkdirSync(target, { recursive: true });
cpSync(join(root, "examples/consumer"), target, { recursive: true, filter: (s) => !/\/(node_modules|dist)(\/|$)/.test(s) });
const version = JSON.parse(readFileSync(join(root, "packages/tokens/jupiter.tokens.json"), "utf8")).version; const range = `^${version}`;
const names = ["tokens", "graphics", "ui", "fonts"];
const ref = (n) => (local ? `file:${join(root, "packages", n)}` : range);
const pkgPath = join(target, "package.json"); const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
pkg.name = dest.split("/").filter(Boolean).pop().replace(/[^a-z0-9-]/gi, "-").toLowerCase(); pkg.private = true; pkg.description = "A project built on the Jupiter design system.";
for (const n of names) pkg.dependencies[`@${scope}/jupiter-${n}`] = ref(n);
// the packages reference their siblings by name: make npm resolve those names to the same sources
if (local) pkg.overrides = Object.fromEntries(names.map((n) => [`@${scope}/jupiter-${n}`, ref(n)]));
pkg.scripts = { ...pkg.scripts, "update:design": "npm update @belikh/jupiter-tokens @belikh/jupiter-graphics @belikh/jupiter-ui @belikh/jupiter-fonts" };
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
// the registry config (token comes from the environment, never from a file)
if (!local) writeFileSync(join(target, ".npmrc"), `@${scope}:registry=${registry}\n//${new URL(registry).host}/:_authToken=\${NODE_AUTH_TOKEN}\n`);
// fonts: the licensed typefaces come from the private fonts package
const main = join(target, "src/main.tsx"); writeFileSync(main, readFileSync(main, "utf8").replace('import "@belikh/jupiter-tokens/tokens.css";', 'import "@belikh/jupiter-fonts/fonts.css";\nimport "@belikh/jupiter-tokens/tokens.css";'));
writeFileSync(join(target, ".gitignore"), "node_modules\ndist\n.env\n");
// agents: the rule, and the design system's own skill linked (not copied) from the installed package, so it updates with the dependency
writeFileSync(join(target, "AGENTS.md"), `# ${pkg.name}\n\nThis project is built on the Jupiter design system and makes NO design decisions of its own.\n\n**Before writing any UI, CSS, colour, font, spacing, icon or component, use the \`jupiter-design-system\` skill** (\`.claude/skills/jupiter-design-system\`, linked from \`node_modules/@belikh/jupiter-ui/skill\`). In short: depend on \`@belikh/jupiter-*\`, never copy or restyle it, never define \`--jp-*\` variables, never hand-roll a table/modal/editor; if the system lacks something, change it upstream and run \`npm run update:design\`.\n\n**Before writing or editing any README.md, profile README or release note, use the \`github-readme\` skill** (\`.claude/skills/github-readme\`).\n\nSetup: \`export NODE_AUTH_TOKEN=$(gh auth token)\` (needs the read:packages scope), then \`npm install\`.\n`);
mkdirSync(join(target, ".claude/skills"), { recursive: true });
try { symlinkSync("../../node_modules/@belikh/jupiter-ui/skill", join(target, ".claude/skills/jupiter-design-system")); } catch { /* exists */ }
try { symlinkSync("../../node_modules/@belikh/jupiter-ui/skill-readme", join(target, ".claude/skills/github-readme")); } catch { /* exists */ }
writeFileSync(join(target, "README.md"), `# ${pkg.name}\n\nBuilt on the Jupiter design system (${local ? "linked from a local checkout" : `registry ${registry}`}).\n\n- ${local ? "" : "\`export NODE_AUTH_TOKEN=$(gh auth token)\` first. "}\`npm install\` then \`npm run dev\`.\n- Do not restyle: change the design system, release it, then \`npm run update:design\` here.\n- See docs/consuming.md in the design system repo.\n`);
console.log(`Created ${target}\n  cd ${dest} && ${local ? "" : "export NODE_AUTH_TOKEN=$(gh auth token) && "}npm install && npm run dev`);
