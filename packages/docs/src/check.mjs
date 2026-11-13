// `jupiter-docs check`: validates the source and reports file:line problems.
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { AUDIENCES, FRONT_MATTER, STATUSES } from "./spec.mjs";
import { visit, plain } from "./parse.mjs";
import { graphicsSet } from "./resolve.mjs";

/** @returns {{errors: string[], warnings: string[]}} */
export function checkProject({ config, root, pages }) {
  const errors = []; const warnings = [];
  const err = (p, line, msg) => errors.push(`${p.file}:${line || 1}: ${msg}`);
  const warn = (p, line, msg) => warnings.push(`${p.file}:${line || 1}: ${msg}`);
  const g = graphicsSet(root); const byId = new Map(pages.map((p) => [p.id, p]));
  if (!g) warnings.push("@belikh/jupiter-graphics not found: graphic names are not checked");
  const sectionIds = new Set(config.sections.map((s) => s.id));
  const glossaryPage = pages.find((p) => { let hit = false; visit(p.tree, (n) => { if (n.type === "glossary") hit = true; }); return hit; });
  const termKeys = new Set(Object.keys(config.glossary).map((k) => k.toLowerCase())); let termsUsed = false;
  for (const s of config.sections) if (g && s.icon && !g.names.has(`icon/${s.icon}`)) errors.push(`docs.config.json: section "${s.id}": unknown icon "${s.icon}"`);
  if (config.hero && g && !g.names.has(config.hero)) errors.push(`docs.config.json: hero "${config.hero}" is not a graphic (use tier/name, for example spot/summit)`);
  if (!pages.some((p) => p.id === "index")) warnings.push(`${config.src}/index.md: missing; the site has no landing text`);
  for (const p of pages) {
    const m = p.meta;
    if (p.fmError) err(p, 1, p.fmError);
    for (const k of Object.keys(m)) if (!(k in FRONT_MATTER)) err(p, 1, `unknown front matter key "${k}" (known: ${Object.keys(FRONT_MATTER).join(", ")})`);
    if (typeof m.title !== "string" || !m.title.trim()) err(p, 1, "front matter: title is required");
    if (typeof m.summary !== "string" || !m.summary.trim()) err(p, 1, "front matter: summary is required (one sentence)");
    if (p.id !== "index") {
      if (!m.section) err(p, 1, "front matter: section is required");
      else if (!sectionIds.has(m.section)) err(p, 1, `front matter: unknown section "${m.section}" (known: ${[...sectionIds].join(", ") || "none, add sections to docs.config.json"})`);
    }
    if (m.order !== undefined && typeof m.order !== "number") err(p, 1, "front matter: order must be a number");
    if (m.audience !== undefined && !AUDIENCES.includes(m.audience)) err(p, 1, `front matter: audience must be one of ${AUDIENCES.join(", ")}`);
    if (m.status !== undefined && !STATUSES.includes(m.status)) err(p, 1, `front matter: status must be one of ${STATUSES.join(", ")}`);
    if (m.icon !== undefined && g && !g.names.has(`icon/${m.icon}`)) err(p, 1, `front matter: unknown icon "${m.icon}" (icon tier name, for example home)`);
    if (/[^a-z0-9/_-]/.test(p.id)) warn(p, 1, `file name "${p.rel}" should be lower case letters, digits, - and _ (it becomes the URL)`);
    let prev = 1;
    visit(p.tree, (n) => {
      switch (n.type) {
        case "heading":
          if (n.depth === 1) err(p, n.line, "the page title comes from front matter; start the body at ## (found #)");
          else if (n.depth > prev + 1) err(p, n.line, `heading level skips from ${prev === 1 ? "the title" : "h" + prev} to h${n.depth}: "${plain(n.children)}"`);
          if (!plain(n.children).trim()) err(p, n.line, "empty heading");
          prev = n.depth; break;
        case "html": err(p, n.line, "raw HTML is not supported (put literal <tags> in backticks, or use Markdown or a directive)"); break;
        case "unknown-directive": err(p, n.line, `unknown directive "${n.name}"`); break;
        case "callout": case "seealso": if (n.unclosed) err(p, n.line, `directive "${n.type === "callout" ? n.kind : "see-also"}" is not closed with :::`); break;
        case "graphic": {
          if (!/^[a-z]+\/[a-z0-9-]+$/.test(n.ref)) err(p, n.line, `::graphic needs tier/name (for example rule/end), got "${n.ref}"`);
          else if (g && !g.names.has(n.ref)) err(p, n.line, `unknown graphic "${n.ref}" (see the manifest of @belikh/jupiter-graphics)`);
          break;
        }
        case "glossary": if (!termKeys.size) err(p, n.line, "::glossary used but docs.config.json has no glossary"); break;
        case "codeblock": if (!n.lang) warn(p, n.line, "code block without a language (use text for plain output)"); break;
        case "term": termsUsed = true; if (!termKeys.has(n.key)) err(p, 0, `unknown glossary term "${n.text}" (add it to glossary in docs.config.json)`); break;
        case "xref": {
          const t = byId.get(n.id);
          if (!t) err(p, 0, `link to unknown page "${n.id}"`);
          else if (n.anchor && !t.headings.some((h) => h.id === n.anchor)) err(p, 0, `page "${n.id}" has no heading anchor "#${n.anchor}" (anchors: ${t.headings.map((h) => h.id).join(", ") || "none"})`);
          break;
        }
        case "link": {
          if (n.broken) { err(p, 0, `link to ${n.href}: no such page`); break; }
          if (n.href.startsWith("#")) { if (n.href.length > 1 && !p.headings.some((h) => h.id === n.href.slice(1))) err(p, 0, `link ${n.href}: no such heading on this page`); break; }
          if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(n.href)) break;
          const path = n.href.split("#")[0]; if (path && !existsSync(join(dirname(p.abs), path))) err(p, 0, `link to ${n.href}: file not found`); break;
        }
        case "image": if (!/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(n.src) && !existsSync(join(dirname(p.abs), n.src))) err(p, 0, `image ${n.src}: file not found`); if (!n.alt) warn(p, 0, `image ${n.src} has no alt text`); break;
        default: break;
      }
    });
  }
  if (termsUsed && !glossaryPage) errors.push(`${config.src}: glossary terms are used but no page contains ::glossary`);
  for (const s of config.sections) if (!pages.some((p) => p.meta.section === s.id)) warnings.push(`docs.config.json: section "${s.id}" has no pages`);
  return { errors, warnings, glossaryPage };
}
