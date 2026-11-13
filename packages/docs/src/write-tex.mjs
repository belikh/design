// AST -> LaTeX for jupiter-docs.cls. The writer emits only semantic macros and environments; every length, colour, font and
// table column rule lives in the class (packages/latex/src/jupiter-docs.cls).
import { dirname, resolve } from "node:path";
import { CALLOUTS } from "./spec.mjs";

export function texEscape(s) {
  return s.replace(/[\\{}$&#^_%~]/g, (c) => ({ "\\": "\\textbackslash{}", "{": "\\{", "}": "\\}", "$": "\\$", "&": "\\&", "#": "\\#", "^": "\\textasciicircum{}", "_": "\\_", "%": "\\%", "~": "\\textasciitilde{}" }[c]))
    .replace(/(^|[\s(\[])"/g, "$1“").replace(/"/g, "”").replace(/'/g, "’");
}
// inline code: escape, then allow a line break after separators
function code(s) {
  let out = "";
  for (const ch of s) {
    if ("\\{}$&#^_%~".includes(ch)) out += texEscape(ch); else out += ch === '"' ? '"' : ch === "'" ? "'" : ch;
    if ("/-.:=,".includes(ch) || ch === "_") out += "\\allowbreak{}";
  }
  return out;
}
const label = (id) => id.replace(/[^A-Za-z0-9]+/g, "-");
const pageLabel = (id) => `page:${label(id)}`;
const headLabel = (id, anchor) => `h:${label(id)}:${anchor}`;

export function texWriter({ pages, config }) {
  const byId = new Map(pages.map((p) => [p.id, p]));
  const inl = (nodes, page) => nodes.map((n) => {
    switch (n.type) {
      case "text": return texEscape(n.value);
      case "code": return `\\jpc{${code(n.value)}}`;
      case "em": return `\\emph{${inl(n.children, page)}}`;
      case "strong": return `\\textbf{${inl(n.children, page)}}`;
      case "del": return `\\jpdel{${inl(n.children, page)}}`;
      case "softbreak": return "\n";
      case "hardbreak": return "\\\\\n";
      case "link": {
        const kids = inl(n.children, page);
        if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(n.href)) return `\\href{${n.href.replace(/[%#\\{}]/g, (c) => "\\" + c)}}{${kids}}`;
        return kids; // repo-relative links have no meaning on paper
      }
      case "image": return `\\jpimage{${resolve(dirname(page.abs), n.src).replace(/\\/g, "/")}}{${texEscape(n.alt)}}`;
      case "xref": { const t = byId.get(n.id); const text = n.children ? inl(n.children, page) : texEscape(n.text || t?.meta.title || n.id); return `\\hyperlink{${n.anchor ? headLabel(n.id, n.anchor) : pageLabel(n.id)}}{${text}}`; }
      case "term": return `\\jpterm{${texEscape(n.text)}}`;
      default: return "";
    }
  }).join("");
  const blk = (nodes, page, base) => nodes.map((n) => one(n, page, base)).filter(Boolean).join("\n\n");
  function one(n, page, base) {
    switch (n.type) {
      case "heading": { const cmd = ["", "", "subsection", "subsubsection", "paragraph", "subparagraph"][Math.min(n.depth, 5)]; return `\\jpanchor{${headLabel(page.id, n.id)}}\n\\${cmd}{${inl(n.children, page)}}`; }
      case "paragraph": return inl(n.children, page);
      case "list": { const env = n.ordered ? "enumerate" : "itemize"; return `\\begin{${env}}${n.ordered && n.start !== 1 ? `[start=${n.start}]` : ""}\n${n.items.map((it) => `\\item ${blk(it, page)}`).join("\n")}\n\\end{${env}}`; }
      case "quote": return `\\begin{jpquote}\n${blk(n.children, page)}\n\\end{jpquote}`;
      case "codeblock": return `${n.title ? `\\jpcodetitle{${texEscape(n.title)}}\n` : n.lang ? `\\jpcodetitle{${texEscape(n.lang)}}\n` : ""}\\begin{jpdocscode}\n${n.text}\n\\end{jpdocscode}`;
      case "hr": return "\\jpdivider";
      case "table": {
        const cols = n.align.map((a) => ({ left: "l", right: "r", center: "c" }[a] ?? "l")).join("");
        const row = (cells, th) => cells.map((c) => (th ? `\\jpth{${inl(c, page)}}` : inl(c, page))).join(" & ") + " \\\\";
        return `\\begin{jptable}{${cols}}\n\\jphead\n${row(n.head, true)}\n\\jptablebody\n${n.rows.map((r) => row(r)).join("\n")}\n\\jpfoot\n\\end{jptable}`;
      }
      case "callout": { const c = CALLOUTS[n.kind]; return `\\begin{jpcallout}[${c.tex}]{${texEscape(n.title || c.label)}}\n${blk(n.children, page)}\n\\end{jpcallout}`; }
      case "seealso": return `\\jpseealso{}\n${blk(n.children, page)}`;
      case "graphic": { const [tier, name] = n.ref.split("/"); return `\\jpgraphic{${tier}}{${name}}{${texEscape(n.alt)}}`; }
      case "glossary": return `\\begin{jpglossary}\n${Object.entries(config.glossary).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `\\jpgloss{${texEscape(k)}}{${texEscape(v)}}`).join("\n")}\n\\end{jpglossary}`;
      default: return "";
    }
  }
  function pageTex(page) {
    return `\\jppage{${pageLabel(page.id)}}{${texEscape(page.meta.title)}}{${texEscape(page.meta.summary)}}\n\n${blk(page.tree, page)}`;
  }
  return {
    document({ nav, date, version, hasLogo }) {
      const head = [
        "\\documentclass{jupiter-docs}",
        `\\title{${texEscape(config.project)}}`,
        `\\subtitle{${texEscape(config.description ?? "")}}`,
        `\\author{${texEscape(config.author ?? "")}}`,
        `\\jpversion{${texEscape(version ?? "")}}`,
        `\\jpdate{${texEscape(date)}}`,
        `\\jprepo{${config.repo ? texEscape(config.repo.replace(/^https?:\/\//, "")) : ""}}`,
        "\\begin{document}",
        "\\maketitle",
        "\\tableofcontents",
      ];
      const index = pages.find((p) => p.id === "index");
      const body = [];
      if (index && index.tree.length) body.push(`\\jpintro{${texEscape(index.meta.title)}}\n\n${blk(index.tree, index)}`);
      for (const s of nav) { body.push(`\\jpdocsection{${texEscape(s.title)}}{${texEscape(s.summary ?? "")}}`); for (const p of s.pages) body.push(pageTex(p)); }
      return `${head.join("\n")}\n\n${body.join("\n\n")}\n\n\\end{document}\n`;
    },
  };
}
