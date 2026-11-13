// Markdown (markdown-it) plus the directives in spec.mjs  ->  one small tree that every writer reads.
//
// Block nodes:  heading{depth,children,id} paragraph{children} list{ordered,start,tight,items:[[block]]} quote{children}
//               codeblock{lang,title,text} table{align,head:[[inline]],rows:[[[inline]]]} hr callout{kind,title,children}
//               seealso{children} graphic{ref,alt} glossary html{value}
// Inline nodes: text code em strong del link{href,children} xref{id,anchor,text,children} term{key,text} softbreak hardbreak image{src,alt}
// Every block has `line` (1-based, within the file body).
import MarkdownIt from "markdown-it";
import { CALLOUTS, CONTAINERS, LEAVES } from "./spec.mjs";

function directiveRule(state, start, end, silent) {
  if (state.sCount[start] - state.blkIndent >= 4) return false;
  const pos = state.bMarks[start] + state.tShift[start]; const max = state.eMarks[start];
  if (state.src.charCodeAt(pos) !== 0x3a) return false;
  let p = pos; while (p < max && state.src.charCodeAt(p) === 0x3a) p++;
  const n = p - pos; if (n < 2) return false;
  const m = /^([a-z][a-z-]*)(?:[ \t]+(.*))?$/.exec(state.src.slice(p, max).trim()); if (!m) return false;
  if (silent) return true;
  const meta = { name: m[1], arg: (m[2] ?? "").trim(), colons: n };
  if (n === 2) { const t = state.push("directive_leaf", "", 0); t.meta = meta; t.map = [start, start + 1]; state.line = start + 1; return true; }
  let next = start + 1; let found = false;
  for (; next < end; next++) {
    const s = state.bMarks[next] + state.tShift[next]; const e = state.eMarks[next];
    if (state.sCount[next] - state.blkIndent >= 4) continue;
    const line = state.src.slice(s, e).trim();
    if (/^:{3,}$/.test(line) && line.length >= n) { found = true; break; }
  }
  const oldParent = state.parentType; const oldMax = state.lineMax;
  state.parentType = "container"; state.lineMax = next;
  const open = state.push("directive_open", "div", 1); open.meta = { ...meta, unclosed: !found }; open.map = [start, next];
  state.md.block.tokenize(state, start + 1, next);
  state.push("directive_close", "div", -1);
  state.parentType = oldParent; state.lineMax = oldMax; state.line = next + (found ? 1 : 0);
  return true;
}

function wikiRule(state, silent) {
  const src = state.src; const pos = state.pos;
  if (src.charCodeAt(pos) !== 0x5b || src.charCodeAt(pos + 1) !== 0x5b) return false;
  const close = src.indexOf("]]", pos + 2); if (close < 0) return false;
  const body = src.slice(pos + 2, close); if (!body || body.includes("\n") || body.includes("[")) return false;
  if (!silent) {
    const t = state.push("wiki", "", 0);
    const term = /^term:(.+)$/.exec(body);
    if (term) t.meta = { term: true, text: term[1].trim() };
    else { const m = /^([^#|]+)(?:#([^|]+))?(?:\|(.+))?$/.exec(body); t.meta = m ? { id: m[1].trim(), anchor: m[2]?.trim() ?? "", text: m[3]?.trim() ?? "" } : { id: body.trim(), anchor: "", text: "" }; }
  }
  state.pos = close + 2; return true;
}

export function createMd() {
  const md = new MarkdownIt({ html: true, linkify: false, typographer: false });
  md.block.ruler.before("fence", "directive", directiveRule, { alt: ["paragraph", "reference", "blockquote", "list"] });
  md.inline.ruler.before("link", "wiki", wikiRule);
  return md;
}
const md = createMd();

/** GitHub-style heading slug. */
export function slug(text) { return text.toLowerCase().trim().replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s+/g, "-"); }

export function plain(nodes) {
  return (nodes ?? []).map((n) => {
    switch (n.type) {
      case "text": case "code": return n.value;
      case "softbreak": case "hardbreak": return " ";
      case "image": return n.alt;
      case "term": return n.text;
      case "xref": return n.text || (n.children ? plain(n.children) : n.id);
      default: return plain(n.children);
    }
  }).join("");
}

function inline(children) {
  const root = []; const stack = [{ node: null, list: root }]; const top = () => stack[stack.length - 1].list;
  const open = (node) => { top().push(node); stack.push({ node, list: (node.children = []) }); };
  for (const t of children ?? []) {
    switch (t.type) {
      case "text": top().push({ type: "text", value: t.content }); break;
      case "code_inline": top().push({ type: "code", value: t.content }); break;
      case "softbreak": top().push({ type: "softbreak" }); break;
      case "hardbreak": top().push({ type: "hardbreak" }); break;
      case "strong_open": open({ type: "strong" }); break;
      case "em_open": open({ type: "em" }); break;
      case "s_open": open({ type: "del" }); break;
      case "link_open": open({ type: "link", href: t.attrGet("href") ?? "", title: t.attrGet("title") ?? "" }); break;
      case "strong_close": case "em_close": case "s_close": case "link_close": stack.pop(); break;
      case "image": top().push({ type: "image", src: t.attrGet("src") ?? "", alt: t.content, title: t.attrGet("title") ?? "" }); break;
      case "wiki": top().push(t.meta.term ? { type: "term", key: t.meta.text.toLowerCase(), text: t.meta.text } : { type: "xref", id: t.meta.id, anchor: t.meta.anchor, text: t.meta.text }); break;
      case "html_inline": top().push({ type: "html", value: t.content }); break;
      default: break;
    }
  }
  return root;
}

function blocks(tokens, i, stop, lineBase) {
  const out = [];
  const line = (t) => (t.map ? t.map[0] + 1 + lineBase : 0);
  while (i < tokens.length && tokens[i].type !== stop) {
    const t = tokens[i];
    switch (t.type) {
      case "heading_open": out.push({ type: "heading", depth: Number(t.tag.slice(1)), children: inline(tokens[i + 1].children), line: line(t) }); i += 3; break;
      case "paragraph_open": out.push({ type: "paragraph", children: inline(tokens[i + 1].children), line: line(t), tight: t.hidden }); i += 3; break;
      case "bullet_list_open": case "ordered_list_open": {
        const node = { type: "list", ordered: t.type === "ordered_list_open", start: Number(t.attrGet("start") ?? 1), tight: true, items: [], line: line(t) };
        const close = t.type === "ordered_list_open" ? "ordered_list_close" : "bullet_list_close"; i++;
        while (tokens[i].type !== close) {
          const [kids, next] = blocks(tokens, i + 1, "list_item_close", lineBase); node.items.push(kids);
          if (kids.some((k) => k.type === "paragraph" && !k.tight)) node.tight = false;
          i = next + 1;
        }
        out.push(node); i++; break;
      }
      case "blockquote_open": { const [kids, next] = blocks(tokens, i + 1, "blockquote_close", lineBase); out.push({ type: "quote", children: kids, line: line(t) }); i = next + 1; break; }
      case "fence": case "code_block": {
        const info = (t.info ?? "").trim(); const title = /title="([^"]*)"/.exec(info)?.[1] ?? "";
        const lang = info.replace(/title="[^"]*"/, "").trim().split(/\s+/)[0] ?? "";
        out.push({ type: "codeblock", lang, title, text: t.content.replace(/\n$/, ""), line: line(t) }); i++; break;
      }
      case "hr": out.push({ type: "hr", line: line(t) }); i++; break;
      case "html_block": out.push({ type: "html", value: t.content, line: line(t) }); i++; break;
      case "table_open": {
        const node = { type: "table", align: [], head: [], rows: [], line: line(t) }; i++;
        let row = null; let inHead = false;
        for (; tokens[i].type !== "table_close"; i++) {
          const k = tokens[i];
          if (k.type === "thead_open") inHead = true; else if (k.type === "thead_close") inHead = false;
          else if (k.type === "tr_open") row = [];
          else if (k.type === "tr_close") { if (inHead) node.head = row; else node.rows.push(row); }
          else if (k.type === "th_open" || k.type === "td_open") { if (inHead) node.align.push(/text-align:(\w+)/.exec(k.attrGet("style") ?? "")?.[1] ?? ""); row.push(inline(tokens[i + 1].children)); }
        }
        out.push(node); i++; break;
      }
      case "directive_leaf": {
        const { name, arg } = t.meta;
        if (name === "graphic") { const m = /^(\S+)(?:\s+(.*))?$/.exec(arg); out.push({ type: "graphic", ref: m?.[1] ?? "", alt: m?.[2]?.trim() ?? "", line: line(t) }); }
        else if (name === "glossary") out.push({ type: "glossary", line: line(t) });
        else out.push({ type: "unknown-directive", name, line: line(t) });
        i++; break;
      }
      case "directive_open": {
        const { name, arg, unclosed } = t.meta; const [kids, next] = blocks(tokens, i + 1, "directive_close", lineBase);
        if (name in CALLOUTS) out.push({ type: "callout", kind: name, title: arg, children: kids, unclosed, line: line(t) });
        else if (name === "see-also") out.push({ type: "seealso", children: kids, unclosed, line: line(t) });
        else out.push({ type: "unknown-directive", name, line: line(t) });
        i = next + 1; break;
      }
      default: i++;
    }
  }
  return [out, i];
}

/** Parse a Markdown body. lineBase = number of lines before the body in the file (front matter), for error positions. */
export function parseBody(text, lineBase = 0) {
  const tokens = md.parse(text, {}); const [tree] = blocks(tokens, 0, "\0", lineBase);
  const used = new Map();
  visit(tree, (n) => { if (n.type === "heading") { const base = slug(plain(n.children)) || "section"; const k = used.get(base) ?? 0; used.set(base, k + 1); n.id = k ? `${base}-${k}` : base; } });
  return tree;
}

/** Visit every node (blocks and inlines). */
export function visit(nodes, fn) {
  for (const n of nodes ?? []) {
    fn(n);
    visit(n.children, fn);
    for (const item of n.items ?? []) visit(item, fn);
    if (n.type === "table") { for (const c of n.head) visit(c, fn); for (const r of n.rows) for (const c of r) visit(c, fn); }
  }
}
export { CONTAINERS, LEAVES };
