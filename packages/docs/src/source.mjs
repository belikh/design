// Reads the source folder into pages: { id, file, dir, meta, tree, lineBase }, then resolves page links.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, posix, relative, sep } from "node:path";
import YAML from "yaml";
import { parseBody, visit, plain } from "./parse.mjs";

const walk = (dir) => readdirSync(dir).sort().flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : p.endsWith(".md") ? [p] : []; });

export function splitFrontMatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
  if (!m) return { meta: {}, body: text, lineBase: 0, error: "missing front matter (--- block with title and summary)" };
  try { const meta = YAML.parse(m[1]) ?? {}; return { meta: typeof meta === "object" && !Array.isArray(meta) ? meta : {}, body: text.slice(m[0].length), lineBase: m[0].split("\n").length - 1, error: null }; }
  catch (e) { return { meta: {}, body: text.slice(m[0].length), lineBase: m[0].split("\n").length - 1, error: `front matter is not valid YAML: ${e.message.split("\n")[0]}` }; }
}

export function loadPages(root, config) {
  const srcDir = join(root, config.src); const pages = [];
  for (const f of walk(srcDir)) {
    const rel = relative(srcDir, f).split(sep).join("/"); const { meta, body, lineBase, error } = splitFrontMatter(readFileSync(f, "utf8"));
    const id = rel.replace(/\.md$/, ""); const tree = parseBody(body, lineBase);
    pages.push({ id, file: `${config.src}/${rel}`, rel, abs: f, meta, tree, lineBase, fmError: error, headings: [] });
  }
  pages.sort((a, b) => a.id.localeCompare(b.id));
  const byId = new Map(pages.map((p) => [p.id, p]));
  for (const p of pages) {
    visit(p.tree, (n) => { if (n.type === "heading") p.headings.push({ depth: n.depth, id: n.id, text: plain(n.children) }); });
    // `[text](other.md#anchor)` links between pages become the same xref node as [[other]]
    visit(p.tree, (n) => {
      if (n.type !== "link" || /^[a-z][a-z0-9+.-]*:|^#|^\//i.test(n.href)) return;
      const [path, anchor = ""] = n.href.split("#"); if (!path.endsWith(".md")) return;
      const target = posix.normalize(posix.join(posix.dirname(p.rel), path)).replace(/\.md$/, "");
      if (byId.has(target)) { n.type = "xref"; n.id = target; n.anchor = anchor; n.text = ""; }
      else if (!target.startsWith("..")) n.broken = target;
    });
  }
  return pages;
}

export function sortedNav(pages, config) {
  const secs = config.sections.map((s) => ({ ...s, pages: [] }));
  for (const p of pages) { if (p.id === "index") continue; const s = secs.find((x) => x.id === p.meta.section); if (s) s.pages.push(p); }
  for (const s of secs) s.pages.sort((a, b) => (a.meta.order ?? 100) - (b.meta.order ?? 100) || String(a.meta.title).localeCompare(String(b.meta.title)));
  return secs.filter((s) => s.pages.length);
}
