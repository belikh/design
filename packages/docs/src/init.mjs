// `jupiter-docs init [dir]`: scaffold docs.config.json and docs-src for a new project (like scripts/new-project.mjs does for apps).
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

export function init(dir) {
  const root = resolve(dir); const cfg = join(root, "docs.config.json");
  if (existsSync(cfg)) { console.error(`${cfg} already exists`); return 1; }
  mkdirSync(join(root, "docs-src"), { recursive: true });
  const pkgFile = join(root, "package.json"); const pkg = existsSync(pkgFile) ? JSON.parse(readFileSync(pkgFile, "utf8")) : null;
  const name = (pkg?.name ?? basename(root)).replace(/^@[^/]+\//, "").replace(/[-_]+/g, " ").replace(/^./, (c) => c.toUpperCase());
  const config = { project: name, ...(pkg ? { versionFrom: "package.json" } : {}), description: "What this project does, in one sentence.", sections: [{ id: "start", title: "Start", summary: "Install and run the project.", icon: "terminal" }] };
  writeFileSync(cfg, JSON.stringify(config, null, 2) + "\n");
  writeFileSync(join(root, "docs-src/index.md"), `---\ntitle: ${name}\nsummary: What this project does, in one sentence.\n---\n\nSay what the project is for in two or three sentences.\n`);
  writeFileSync(join(root, "docs-src/getting-started.md"), `---\ntitle: Getting started\nsummary: Install the project and run it.\nsection: start\norder: 10\nicon: terminal\n---\n\n## Install\n\n\`\`\`sh title="Install"\nnpm install\n\`\`\`\n\n## Run\n\n:::note\nReplace this page with real steps.\n:::\n`);
  if (pkg) {
    pkg.scripts = { ...pkg.scripts, "docs:check": "jupiter-docs check", "docs:build": "jupiter-docs build" }; writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + "\n");
  }
  mkdirSync(join(root, ".claude/skills"), { recursive: true });
  try { symlinkSync("../../node_modules/@belikh/jupiter-ui/skill-docs", join(root, ".claude/skills/jupiter-docs")); } catch { /* exists */ }
  console.log(`Created docs.config.json and docs-src in ${root}\n  npm install --save-dev @belikh/jupiter-docs\n  npx jupiter-docs check && npx jupiter-docs build\n  Commit docs-src and the generated docs/; dist/site is the deployable site.`);
  return 0;
}
