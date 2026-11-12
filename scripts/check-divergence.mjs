#!/usr/bin/env node
// Guard rails against the design system splitting into two looks again. Run by `npm run lint` and CI.
//  1. exactly one app serves UI (one apps/* package with a vite config / index.html)
//  2. no second component or styling library (Tailwind, shadcn, base-ui, sonner, lucide, recharts, cva, clsx, tailwind-merge)
//  3. `--jp-*` custom properties are defined only by packages/tokens output (and the live token editor's generated style)
//  4. no `.site-*` classes (the old docs vocabulary)
//  5. every stylesheet in apps/admin is wired in: global ones through src/styles/entry.ts, area-local ones by an import from code
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname, resolve, extname } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const SKIP = new Set(["node_modules", "dist", ".git", ".visual", "target", "release", "build"]);
const walk = (d) => (existsSync(d) ? readdirSync(d).flatMap((n) => { if (SKIP.has(n)) return []; const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; }) : []);
const rel = (f) => relative(root, f);
const problems = [];
const fail = (rule, msg) => problems.push(`[${rule}] ${msg}`);

// 1. one UI app
const apps = existsSync(join(root, "apps")) ? readdirSync(join(root, "apps")).filter((n) => statSync(join(root, "apps", n)).isDirectory()) : [];
const uiApps = apps.filter((a) => existsSync(join(root, "apps", a, "index.html")) || readdirSync(join(root, "apps", a)).some((f) => /^vite\.config\./.test(f)));
if (uiApps.length > 1) fail("one-app", `apps/ has ${uiApps.length} UI apps (${uiApps.join(", ")}); there must be exactly one.`);

// 2. banned dependencies
const BANNED = [/^tailwindcss$/, /^@tailwindcss\//, /^shadcn$/, /^@base-ui\//, /^sonner$/, /^lucide-react$/, /^recharts$/, /^class-variance-authority$/, /^clsx$/, /^tailwind-merge$/, /^tw-animate-css$/];
for (const f of walk(root).filter((f) => f.endsWith("package.json"))) {
  const pkg = JSON.parse(readFileSync(f, "utf8"));
  for (const k of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"])
    for (const name of Object.keys(pkg[k] ?? {})) if (BANNED.some((re) => re.test(name))) fail("one-library", `${rel(f)} depends on ${name}; use @belikh/jupiter-ui and the tokens CSS instead.`);
}

// 3 + 4. custom properties and the old class vocabulary
const styled = [...walk(join(root, "apps")), ...walk(join(root, "packages/ui"))].filter((f) => [".css", ".tsx", ".ts"].includes(extname(f)) && !/\.test\./.test(f));
const DEFINES = /(?:^|[;{\s"'`])(--jp-[\w-]+)\s*:/g;
for (const f of styled) {
  const text = readFileSync(f, "utf8");
  for (const m of text.matchAll(DEFINES)) fail("one-token-source", `${rel(f)} defines ${m[1]}; tokens come from packages/tokens only. Add or change the token there.`);
  if (/(?<![\w-])site-[a-z][\w-]*/.test(text.replace(/https?:\/\/\S+/g, "")) && /["'`\s.]site-[a-z]/.test(text)) fail("one-vocabulary", `${rel(f)} uses a .site-* class; use the shared @belikh/jupiter-ui / adm-* classes.`);
}

// 5. stylesheets must be wired in
const adminSrc = join(root, "apps/admin/src");
const code = walk(adminSrc).filter((f) => /\.(tsx?|css)$/.test(f));
const imported = new Set();
for (const f of code) for (const m of readFileSync(f, "utf8").matchAll(/(?:import\s+|@import\s+(?:url\()?)["']([^"']+\.css)["']/g)) if (m[1].startsWith(".")) imported.add(resolve(dirname(f), m[1]));
const entry = join(adminSrc, "styles/entry.ts");
const viaEntry = new Set(existsSync(entry) ? [...readFileSync(entry, "utf8").matchAll(/import\s+["'](\.[^"']+\.css)["']/g)].map((m) => resolve(dirname(entry), m[1])) : []);
for (const css of walk(adminSrc).filter((f) => f.endsWith(".css"))) {
  if (!imported.has(css)) fail("style-entry", `${rel(css)} is not imported anywhere. Global styles belong in apps/admin/src/styles/entry.ts.`);
  else if (dirname(css) === join(adminSrc, "styles") && !viaEntry.has(css)) fail("style-entry", `${rel(css)} lives in src/styles but is not listed in src/styles/entry.ts.`);
}

if (problems.length) { console.error(problems.join("\n") + `\n\n${problems.length} divergence problem(s). See AGENTS.md, "Divergence rules".`); process.exit(1); }
console.log("No divergence: one app, one component library, one token source, one class vocabulary, every stylesheet wired.");
