// AST -> HTML fragments for the static site. Uses the shared jp-* classes (components.css) and a few dx-* layout classes (assets/site.css).
import { posix } from "node:path";
import { CALLOUTS } from "./spec.mjs";
import { plain, slug } from "./parse.mjs";
import { graphicSvg } from "./resolve.mjs";

export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const pageDir = (id) => (id === "index" ? "" : id);
/** Relative URL from the page `from` (or null for a root-absolute URL, used by 404.html) to a site path such as "consuming/" or "assets/x.css". */
export function makeUrl(base, from) {
  return (to) => {
    if (from === null) return base + to;
    const dir = pageDir(from); const toDir = to.endsWith("/") || to === "" ? to.replace(/\/$/, "") : posix.dirname(to); const file = to.endsWith("/") || to === "" ? "" : posix.basename(to);
    let rel = posix.relative(dir || ".", toDir || ".") || "."; if (rel === ".") rel = ""; else rel += "/";
    return (rel + file) || "./";
  };
}
export const pageHref = (url, id) => url(id === "index" ? "" : `${id}/`);

export function htmlWriter({ pages, config, root }) {
  const byId = new Map(pages.map((p) => [p.id, p]));
  const glossaryPage = pages.find((p) => p.tree.some((b) => b.type === "glossary"));
  const repoFile = (page, href) => {
    if (!config.repo) return href; const [path, hash] = href.split("#"); const target = posix.normalize(posix.join(posix.dirname(page.file), path));
    return target.startsWith("..") ? href : `${config.repo}/blob/${config.repoBranch}/${target}${hash ? `#${hash}` : ""}`;
  };
  function inl(nodes, page, url) {
    return nodes.map((n) => {
      switch (n.type) {
        case "text": return esc(n.value);
        case "code": return `<code>${esc(n.value)}</code>`;
        case "em": return `<em>${inl(n.children, page, url)}</em>`;
        case "strong": return `<strong>${inl(n.children, page, url)}</strong>`;
        case "del": return `<del>${inl(n.children, page, url)}</del>`;
        case "softbreak": return "\n";
        case "hardbreak": return "<br>\n";
        case "link": {
          const ext = /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(n.href); const href = ext || n.href.startsWith("#") ? n.href : repoFile(page, n.href);
          return `<a href="${esc(href)}"${ext ? ' rel="noopener"' : ""}>${inl(n.children, page, url)}</a>`;
        }
        case "image": return `<img src="${esc(n.src)}" alt="${esc(n.alt)}" loading="lazy">`;
        case "xref": { const t = byId.get(n.id); return `<a href="${esc(pageHref(url, n.id) + (n.anchor ? `#${n.anchor}` : ""))}">${n.children ? inl(n.children, page, url) : esc(n.text || t?.meta.title || n.id)}</a>`; }
        case "term": { const def = config.glossary[Object.keys(config.glossary).find((k) => k.toLowerCase() === n.key)] ?? ""; return glossaryPage ? `<a class="dx-term" href="${esc(pageHref(url, glossaryPage.id))}#term-${slug(n.key)}" title="${esc(def)}">${esc(n.text)}</a>` : esc(n.text); }
        default: return "";
      }
    }).join("");
  }
  const blk = (nodes, page, url) => nodes.map((n) => one(n, page, url)).join("\n");
  function one(n, page, url) {
    switch (n.type) {
      case "heading": return `<h${n.depth} id="${n.id}">${inl(n.children, page, url)}<a class="dx-anchor" href="#${n.id}" aria-label="Link to this section">#</a></h${n.depth}>`;
      case "paragraph": return `<p>${inl(n.children, page, url)}</p>`;
      case "list": { const tag = n.ordered ? "ol" : "ul"; return `<${tag}${n.ordered && n.start !== 1 ? ` start="${n.start}"` : ""}>\n${n.items.map((it) => `<li>${it.length === 1 && it[0].type === "paragraph" ? inl(it[0].children, page, url) : blk(it, page, url)}</li>`).join("\n")}\n</${tag}>`; }
      case "quote": return `<blockquote>\n${blk(n.children, page, url)}\n</blockquote>`;
      case "codeblock": {
        const label = n.title || n.lang;
        return `<div class="jp-code dx-code"><div class="jp-code__bar"><span>${esc(label || "text")}</span><button class="jp-code__copy" type="button" data-copy>Copy</button></div><pre tabindex="0"><code${n.lang ? ` class="language-${esc(n.lang)}"` : ""}>${esc(n.text)}</code></pre></div>`;
      }
      case "hr": return "<hr>";
      case "table": {
        const cls = (i) => (n.align[i] ? ` class="dx-al-${n.align[i]}"` : "");
        return `<div class="jp-table-wrap dx-table"><table class="jp-table">\n<thead><tr>${n.head.map((c, i) => `<th scope="col"${cls(i)}>${inl(c, page, url)}</th>`).join("")}</tr></thead>\n<tbody>\n${n.rows.map((r) => `<tr>${r.map((c, i) => `<td${cls(i)}>${inl(c, page, url)}</td>`).join("")}</tr>`).join("\n")}\n</tbody></table></div>`;
      }
      case "callout": { const c = CALLOUTS[n.kind]; return `<aside class="jp-callout${c.css}" role="note"><div class="jp-callout__title">${esc(n.title || c.label)}</div>\n${blk(n.children, page, url)}</aside>`; }
      case "seealso": return `<nav class="dx-seealso" aria-label="See also"><p class="jp-label">See also</p>\n${blk(n.children, page, url)}</nav>`;
      case "graphic": {
        const svg = graphicSvg(n.ref, root); const tier = n.ref.split("/")[0]; if (!svg) return "";
        return `<figure class="dx-graphic dx-graphic--${tier}"${n.alt ? ` role="img" aria-label="${esc(n.alt)}"` : ""}>${svg}</figure>`;
      }
      case "glossary": return `<dl class="dx-glossary">\n${Object.entries(config.glossary).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `<dt id="term-${slug(k)}">${esc(k)}</dt><dd>${esc(v)}</dd>`).join("\n")}\n</dl>`;
      default: return "";
    }
  }
  return { body: (page, url) => blk(page.tree, page, url), inline: inl, plainText: plain };
}
