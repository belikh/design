// Static site: dist/site. Relative links (404.html uses base-absolute ones), hashed assets, search index, sitemap, _headers.
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import { htmlWriter, esc, makeUrl, pageHref, pageDir } from "./write-html.mjs";
import { plain, visit } from "./parse.mjs";
import { graphicSvg, logos, packageRoot, pkgDir, readCss } from "./resolve.mjs";

const hash = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 10);
const THEME_SCRIPT = `(function(){try{var q=new URLSearchParams(location.search).get("theme");var m=q||localStorage.getItem("jp-theme");if(m==="light"||m==="dark")document.documentElement.setAttribute("data-theme",m);if(localStorage.getItem("jp-density")==="compact")document.documentElement.setAttribute("data-density","compact")}catch(e){}})();`;

function emit(out, rel, data) { const f = join(out, rel); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, data); }
function hashed(out, assets, name, data) { const ext = extname(name); const rel = `assets/${name.slice(0, -ext.length)}.${hash(data)}${ext}`; emit(out, rel, data); assets[name] = rel; return rel; }

async function logoFiles(project) {
  const { config, root } = project; const L = await logos(root);
  if (config.logo === "none" || !L) return null;
  const svg = (v) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${v.viewBox}" role="img" aria-label="jupiter.au">${v.inner}</svg>`;
  const ink = (v) => /<g fill="none" stroke="(#[0-9a-f]{6})"/i.exec(v.inner)?.[1]; const mark = (v) => /<g fill="none"[\s\S]*?<\/g>/.exec(v.inner)?.[0].replace(/<g fill="none" stroke="#[0-9a-f]{6}"/i, '<g fill="none"');
  const fav = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -4 136 132"><style>g{stroke:${ink(L.light)}}@media (prefers-color-scheme:dark){g{stroke:${ink(L.dark)}}}</style>${mark(L.light)}</svg>`;
  return { light: svg(L.light), dark: svg(L.dark), fav };
}

export async function buildSite(project) {
  const { config, root, pages, nav } = project; const out = join(root, config.siteOut); const assets = {};
  rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });

  // ---- CSS: fonts + tokens + components + graphics + site layout (read from the packages, not copied into the repo)
  let fontCss = ""; const preload = []; const fontsDir = pkgDir("@belikh/jupiter-fonts", root);
  if (fontsDir && existsSync(join(fontsDir, "fonts.css"))) {
    for (const line of readFileSync(join(fontsDir, "fonts.css"), "utf8").split("\n")) {
      if (!line.startsWith("@font-face")) continue;
      const m = /url\("\.\/files\/([^"]+)"\)/.exec(line); const file = m && join(fontsDir, "files", m[1]);
      if (m && !existsSync(file)) continue;
      if (!m) { fontCss += line + "\n"; continue; }
      const buf = readFileSync(file); const ext = extname(m[1]); const rel = `assets/fonts/${m[1].slice(0, -ext.length)}.${hash(buf)}${ext}`; emit(out, rel, buf);
      if (/sgi-text-(400|700)\.woff2$/.test(m[1])) preload.push(rel);
      fontCss += line.replace(m[0], `url("fonts/${rel.split("/").pop()}")`) + "\n";
    }
  }
  if (!preload.length) console.warn("warning: SGI fonts are not installed (@belikh/jupiter-fonts/files); the site falls back to system fonts");
  const css = [fontCss, readCss("@belikh/jupiter-tokens/tokens.css", root), readCss("@belikh/jupiter-tokens/components.css", root), readCss("@belikh/jupiter-graphics/css", root), readFileSync(join(packageRoot, "assets/site.css"), "utf8")].join("\n");
  hashed(out, assets, "docs.css", css);
  hashed(out, assets, "docs.js", readFileSync(join(packageRoot, "assets/site.js")));
  const logo = await logoFiles(project);
  if (logo) { hashed(out, assets, "logo-light.svg", logo.light); hashed(out, assets, "logo-dark.svg", logo.dark); hashed(out, assets, "favicon.svg", logo.fav); }

  // ---- search index
  const ordered = []; for (const s of nav) for (const p of s.pages) ordered.push({ p, s });
  const sectionOf = (p) => config.sections.find((s) => s.id === p.meta.section);
  const textOf = (p) => { const parts = []; visit(p.tree, (n) => { if (["paragraph", "heading"].includes(n.type)) parts.push(plain(n.children)); if (n.type === "codeblock") parts.push(n.text); }); return parts.join(" ").replace(/\s+/g, " ").slice(0, 6000); };
  const index = pages.map((p) => ({ u: p.id === "index" ? "" : `${p.id}/`, t: p.meta.title, s: p.meta.summary, sec: sectionOf(p)?.title ?? "", h: p.headings.filter((h) => h.depth > 1).map((h) => h.text), x: textOf(p) }));
  hashed(out, assets, "search.json", JSON.stringify(index));

  const w = htmlWriter({ pages, config, root }); const version = config.version ? `v${config.version}` : "";
  const spot = (ref, cls = "") => { const s = graphicSvg(ref, root); return s ? `<span class="${cls}">${s}</span>` : ""; };

  function layout({ page, title, desc, main, toc = [], wide = false, url, rootRel }) {
    const a = (k) => url(assets[k]); const home = url("");
    const navHtml = nav.map((s) => `<p class="jp-label dx-nav__sec">${esc(s.title)}</p>\n<ul>${s.pages.map((p) => `<li><a href="${pageHref(url, p.id)}"${page && p.id === page.id ? ' aria-current="page"' : ""}>${esc(p.meta.title)}</a></li>`).join("")}</ul>`).join("\n");
    const tocHtml = toc.length > 1 ? `<aside class="dx-toc" aria-label="On this page"><p class="jp-label">On this page</p><ol>${toc.map((h) => `<li${h.depth > 2 ? ' class="dx-sub"' : ""}><a href="#${h.id}">${esc(h.text)}</a></li>`).join("")}</ol></aside>` : "";
    const canonical = config.siteUrl && page ? `<link rel="canonical" href="${esc(config.siteUrl.replace(/\/$/, "") + config.base + (page.id === "index" ? "" : page.id + "/"))}">` : "";
    return `<!doctype html>
<html lang="en" data-root="${esc(url(""))}" data-search="${esc(a("search.json"))}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="color-scheme" content="light dark">
${canonical}
${logo ? `<link rel="icon" type="image/svg+xml" href="${a("favicon.svg")}">` : ""}
${preload.map((f) => `<link rel="preload" href="${url(f)}" as="font" type="font/woff2" crossorigin>`).join("\n")}
<script>${THEME_SCRIPT}</script>
<link rel="stylesheet" href="${a("docs.css")}">
</head>
<body>
<a class="jp-btn jp-btn--primary dx-skip" href="#main">Skip to content</a>
<header class="dx-top"><div class="jp-container dx-top__in">
<a class="dx-brand" href="${home}"><span class="dx-brand__name">${esc(config.project)}</span></a>
<span class="dx-top__sp"></span>
<form class="dx-search" role="search" onsubmit="return false"><input type="search" aria-label="Search the docs" placeholder="Search" autocomplete="off"><kbd aria-hidden="true">/</kbd><div class="dx-results" role="region" aria-label="Search results" aria-live="polite" hidden></div></form>
<button class="jp-btn jp-btn--ghost jp-btn--sm" type="button" data-theme-toggle>Auto</button>
${config.repo ? `<a class="jp-btn jp-btn--ghost jp-btn--sm" href="${esc(config.repo)}" rel="noopener">Source</a>` : ""}
${logo ? `<a class="dx-logo dx-top__logo" href="${home}" aria-label="${esc(config.project)}: home"><img class="dx-logo__light" src="${a("logo-light.svg")}" alt=""><img class="dx-logo__dark" src="${a("logo-dark.svg")}" alt=""></a>` : ""}
</div></header>
<div class="jp-container dx-shell${wide ? " dx-shell--wide" : ""}">
${wide ? "" : `<details class="dx-nav" open><summary>Menu</summary><nav class="dx-nav__body" aria-label="Documentation">\n${navHtml}\n</nav></details>`}
<main id="main" class="dx-main" tabindex="-1">
${main}
</main>
${wide ? "" : tocHtml}
</div>
<footer class="dx-foot"><div class="jp-container dx-foot__in"><span>${esc(config.project)} ${esc(version)}</span><span>Built with jupiter-docs</span></div></footer>
<script src="${a("docs.js")}" defer></script>
</body>
</html>
`;
  }

  const titleOf = (p) => (p.id === "index" ? config.project : `${p.meta.title} · ${config.project}`);
  const flat = ordered.map((o) => o.p);
  const badge = (p) => [p.meta.status && `<span class="jp-badge jp-badge--${{ stable: "ok", draft: "warn", deprecated: "danger" }[p.meta.status]}">${esc(p.meta.status)}</span>`, p.meta.audience && `<span class="jp-badge jp-badge--info">${esc(p.meta.audience)}</span>`].filter(Boolean).join("");
  let files = 0; const write = (rel, data) => { emit(out, rel, data); files++; };

  for (const page of pages) {
    const url = makeUrl(config.base, page.id); let main;
    if (page.id === "index") {
      const first = flat[0]; const art = config.hero ? graphicSvg(config.hero, root) : "";
      const cards = nav.map((s) => { const ic = s.icon ? graphicSvg(`icon/${s.icon}`, root) : ""; return `<section class="dx-card"><h2>${ic}${esc(s.title)}</h2>${s.summary ? `<p>${esc(s.summary)}</p>` : ""}<ul>${s.pages.map((p) => `<li><a href="${pageHref(url, p.id)}">${esc(p.meta.title)}</a></li>`).join("")}</ul></section>`; }).join("\n");
      main = `<div class="dx-hero"><div><p class="jp-eyebrow">${esc(version || "documentation")}</p><h1 class="dx-hero__title">${esc(config.project)}</h1><p class="dx-hero__lead">${esc(config.description || page.meta.summary)}</p><div class="dx-hero__act">${first ? `<a class="jp-btn jp-btn--primary" href="${pageHref(url, first.id)}">Start reading</a>` : ""}${config.repo ? `<a class="jp-btn jp-btn--secondary" href="${esc(config.repo)}" rel="noopener">Source</a>` : ""}</div></div>${art ? `<div class="dx-hero__art" aria-hidden="true">${art}</div>` : ""}</div>
<div class="dx-rule" aria-hidden="true">${graphicSvg("rule/end", root) ?? ""}</div>
<div class="dx-cards">${cards}</div>
${page.tree.length ? `<div class="dx-landing-body dx-prose">${w.body(page, url)}</div>` : ""}`;
      write("index.html", layout({ page, title: titleOf(page), desc: config.description || page.meta.summary, main, wide: true, url }));
      continue;
    }
    const i = flat.indexOf(page); const prev = flat[i - 1]; const next = flat[i + 1]; const sec = sectionOf(page);
    const crumbs = `<nav class="dx-crumbs" aria-label="Breadcrumb"><ol><li><a href="${url("")}">Docs</a></li>${sec ? `<li>${esc(sec.title)}</li>` : ""}<li aria-current="page">${esc(page.meta.title)}</li></ol></nav>`;
    const pager = prev || next ? `<nav class="dx-pager" aria-label="Previous and next page">${prev ? `<a class="dx-prev" href="${pageHref(url, prev.id)}" rel="prev"><small>Previous</small><b>${esc(prev.meta.title)}</b></a>` : "<span></span>"}${next ? `<a class="dx-next" href="${pageHref(url, next.id)}" rel="next"><small>Next</small><b>${esc(next.meta.title)}</b></a>` : ""}</nav>` : "";
    main = `${crumbs}
<article>
<header class="dx-head"><h1 class="dx-title">${esc(page.meta.title)}</h1><p class="dx-lead">${esc(page.meta.summary)}</p>${badge(page) ? `<div class="dx-meta">${badge(page)}</div>` : ""}<div class="dx-graphic dx-graphic--rule" aria-hidden="true">${graphicSvg("rule/underline", root) ?? ""}</div></header>
<div class="dx-prose">
${w.body(page, url)}
</div>
</article>
${pager}
${config.repo ? `<p class="dx-edit"><a href="${esc(`${config.repo}/edit/${config.repoBranch}/${page.file}`)}" rel="noopener">Edit this page on the source repository</a></p>` : ""}`;
    write(`${page.id}/index.html`, layout({ page, title: titleOf(page), desc: page.meta.summary, main, toc: page.headings.filter((h) => h.depth <= 3 && h.depth > 1), url }));
  }

  // 404: base-absolute URLs because it is served at any depth
  const u404 = makeUrl(config.base, null);
  write("404.html", layout({ page: null, title: `Page not found · ${config.project}`, desc: "Page not found", url: u404, wide: true, main: `<div class="dx-404"><p class="jp-eyebrow">404</p><h1 class="dx-title">Page not found</h1><p class="dx-lead">There is no page at this address. Search for it, or start from the <a href="${u404("")}">home page</a>.</p><div class="dx-graphic dx-graphic--spot" aria-hidden="true">${graphicSvg("spot/not-found", root) ?? ""}</div></div>` }));
  if (config.siteUrl) {
    const site = config.siteUrl.replace(/\/$/, "") + config.base;
    write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `<url><loc>${esc(site + (p.id === "index" ? "" : p.id + "/"))}</loc></url>`).join("\n")}\n</urlset>\n`);
    write("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${site}sitemap.xml\n`);
  }
  write("_headers", `${config.base}assets/*\n  Cache-Control: public, max-age=31536000, immutable\n${config.base}*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n`);
  const count = (d) => readdirSync(d).reduce((n, f) => { const p = join(d, f); return n + (statSync(p).isDirectory() ? count(p) : 1); }, 0);
  return { out: config.siteOut, files: count(out) };
}
