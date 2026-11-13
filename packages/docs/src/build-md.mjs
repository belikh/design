import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { MARKER, graphicUrlFor, mdWriter } from "./write-md.mjs";

/** Map of output path (relative to project root, posix) -> contents. */
export function renderMarkdown(project) {
  const { config, pages } = project; const w = mdWriter({ pages, config, graphicUrl: graphicUrlFor(config, config.mdOut) });
  return new Map(pages.map((p) => [`${config.mdOut}/${w.file(p)}`, w.render(p)]));
}

const walk = (d) => (existsSync(d) ? readdirSync(d).sort().flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; }) : []);

/** Compare with disk. Only files that carry the generated marker are owned (hand-written docs are never touched). */
export function diffMarkdown(project) {
  const out = renderMarkdown(project); const { root, config } = project; const stale = [];
  for (const [path, text] of out) {
    const f = join(root, path);
    if (!existsSync(f)) stale.push(`${path}: missing`);
    else if (readFileSync(f, "utf8") !== text) stale.push(`${path}: out of date`);
  }
  for (const f of walk(join(root, config.mdOut))) {
    const rel = relative(root, f).split(sep).join("/");
    if (f.endsWith(".md") && !out.has(rel) && readFileSync(f, "utf8").includes(`<!-- ${MARKER}`)) stale.push(`${rel}: generated file with no source (delete it)`);
  }
  return stale;
}

export function writeMarkdown(project) {
  const out = renderMarkdown(project); const written = [];
  for (const [path, text] of out) { const f = join(project.root, path); if (existsSync(f) && readFileSync(f, "utf8") === text) continue; mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, text); written.push(path); }
  return { total: out.size, written };
}
