import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Btn, Badge, Modal, Alert } from "@belikh/jupiter-ui/kit.tsx";
import { Select } from "@belikh/jupiter-ui/inputs.tsx";
import { DiffViewer, Markdown } from "@belikh/jupiter-ui/extra.tsx";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";
import { format, highlight, lint, type Issue, type Lang } from "./lint.ts";
import { htmlToMarkdown, prefixLines, sanitizeHtml, wrapSelection } from "./logic-text.ts";
import { humanSize } from "./logic-data.ts";
import "./in2.css";

/* ---------- markdown editor with live preview ---------- */
export function MarkdownEditor({ initial = "## Release notes\n\n- **Charts** gain *zoom* and export\n- Tables can [pin right](#)\n\n> Raw HTML is never rendered.\n" }: { initial?: string }) {
  const [text, setText] = useState(initial); const ta = useRef<HTMLTextAreaElement>(null); const [view, setView] = useState<"split" | "write" | "preview">("split");
  const apply = (fn: (t: string, s: { start: number; end: number }) => { text: string; sel: { start: number; end: number } }) => { const el = ta.current!; const r = fn(text, { start: el.selectionStart, end: el.selectionEnd }); setText(r.text); requestAnimationFrame(() => { el.focus(); el.setSelectionRange(r.sel.start, r.sel.end); }); };
  const tools: { label: string; title: string; run: () => void }[] = [
    { label: "B", title: "Bold (Ctrl+B)", run: () => apply((t, s) => wrapSelection(t, s, "**")) }, { label: "I", title: "Italic (Ctrl+I)", run: () => apply((t, s) => wrapSelection(t, s, "*")) }, { label: "</>", title: "Inline code", run: () => apply((t, s) => wrapSelection(t, s, "`")) },
    { label: "Link", title: "Link", run: () => apply((t, s) => { const sel = t.slice(s.start, s.end) || "text"; const out = t.slice(0, s.start) + `[${sel}](https://)` + t.slice(s.end); return { text: out, sel: { start: s.start + sel.length + 3, end: s.start + sel.length + 11 } }; }) },
    { label: "H2", title: "Heading", run: () => apply((t, s) => prefixLines(t, s, "## ")) }, { label: "• List", title: "Bulleted list", run: () => apply((t, s) => prefixLines(t, s, "- ")) }, { label: "1. List", title: "Numbered list", run: () => apply((t, s) => prefixLines(t, s, (i) => `${i + 1}. `)) }, { label: "❝", title: "Quote", run: () => apply((t, s) => prefixLines(t, s, "> ")) },
  ];
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return (
    <div className="in2-stack">
      <div className="in2-row" role="toolbar" aria-label="Formatting">{tools.map((t) => <Btn key={t.label} sm type="button" title={t.title} aria-label={t.title} onClick={t.run}>{t.label}</Btn>)}<span style={{ marginInlineStart: "auto" }} className="in2-row">{(["write", "split", "preview"] as const).map((v) => <Btn key={v} sm type="button" variant={view === v ? "primary" : "secondary"} aria-pressed={view === v} onClick={() => setView(v)}>{v}</Btn>)}</span></div>
      <div className={view === "split" ? "md2" : ""}>
        {view !== "preview" && <textarea ref={ta} className="jp-input adm-textarea" style={{ minHeight: 220, fontFamily: "var(--jp-font-mono)" }} aria-label="Markdown source" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "b") { e.preventDefault(); tools[0].run(); } else if ((e.ctrlKey || e.metaKey) && e.key === "i") { e.preventDefault(); tools[1].run(); } }} />}
        {view !== "write" && <div className="in2-box" aria-label="Preview" role="region"><Markdown src={text} /></div>}
      </div>
      <span className="in2-note">{words} words · {text.length} characters · Ctrl+B / Ctrl+I work in the editor</span>
    </div>
  );
}

/* ---------- rich text (WYSIWYG) with variables, snippets, tables, attachments ---------- */
const VARS = ["customer.name", "order.id", "order.total", "due.date"]; const SNIPPETS = [{ label: "Sign-off", html: "<p>Kind regards,<br>The Jupiter team</p>" }, { label: "Payment terms", html: "<p>Payment is due within <b>14 days</b> of the invoice date.</p>" }, { label: "Escalation note", html: "<blockquote>If this is urgent, reply with URGENT in the subject line.</blockquote>" }];
const exec = (cmd: string, val?: string) => { if (typeof document.execCommand === "function") document.execCommand(cmd, false, val); };
export function RichTextEditor({ initial = "<h2>Weekly update</h2><p>Hi <span data-var=\"customer.name\" contenteditable=\"false\">{{customer.name}}</span>, your order <b>#</b><span data-var=\"order.id\" contenteditable=\"false\">{{order.id}}</span> shipped.</p><ul><li>Tracking is live</li><li>Delivery in 2 days</li></ul>" }: { initial?: string }) {
  const ed = useRef<HTMLDivElement>(null); const [html, setHtml] = useState(initial); const [files, setFiles] = useState<{ name: string; size: number }[]>([]); const [link, setLink] = useState<string | null>(null);
  useEffect(() => { if (ed.current && !ed.current.innerHTML) ed.current.innerHTML = sanitizeHtml(initial); }, [initial]);
  const sync = () => setHtml(ed.current?.innerHTML ?? ""); const run = (cmd: string, v?: string) => { ed.current?.focus(); exec(cmd, v); sync(); };
  const insertHtml = (h: string) => { ed.current?.focus(); if (typeof document.execCommand === "function") document.execCommand("insertHTML", false, h); else if (ed.current) ed.current.innerHTML += h; sync(); };
  const inTable = () => { const sel = window.getSelection(); const n = sel?.anchorNode; const el = n && (n.nodeType === 1 ? (n as Element) : n.parentElement); return el?.closest("td,th") ?? null; };
  const addRow = () => { const td = inTable(); const tr = td?.closest("tr"); if (!tr) return; const copy = tr.cloneNode(true) as HTMLElement; copy.querySelectorAll("td,th").forEach((c) => { c.textContent = ""; }); tr.after(copy); sync(); };
  const addCol = () => { const td = inTable(); const table = td?.closest("table"); if (!td || !table) return; const idx = [...td.parentElement!.children].indexOf(td); table.querySelectorAll("tr").forEach((r) => { const c = document.createElement(r.children[0]?.tagName === "TH" ? "th" : "td"); c.innerHTML = "&nbsp;"; r.children[idx]?.after(c); }); sync(); };
  const md = useMemo(() => htmlToMarkdown(html), [html]);
  const B = ({ cmd, v, label, title }: { cmd: string; v?: string; label: ReactNode; title: string }) => <button type="button" title={title} aria-label={title} onMouseDown={(e) => e.preventDefault()} onClick={() => run(cmd, v)}>{label}</button>;
  return (
    <div className="in2-stack">
      <div className="rt">
        <div className="rt__bar" role="toolbar" aria-label="Rich text formatting">
          <B cmd="bold" label={<b>B</b>} title="Bold" /><B cmd="italic" label={<i>I</i>} title="Italic" /><B cmd="underline" label={<u>U</u>} title="Underline" /><B cmd="formatBlock" v="h2" label="H2" title="Heading" /><B cmd="insertUnorderedList" label="• List" title="Bulleted list" /><B cmd="insertOrderedList" label="1. List" title="Numbered list" /><B cmd="formatBlock" v="blockquote" label="❝" title="Quote" />
          <button type="button" title="Link" aria-label="Link" onMouseDown={(e) => e.preventDefault()} onClick={() => setLink(link === null ? "https://" : null)}>Link</button>
          <button type="button" title="Insert table" aria-label="Insert table" onMouseDown={(e) => e.preventDefault()} onClick={() => insertHtml("<table><thead><tr><th>Item</th><th>Qty</th></tr></thead><tbody><tr><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table><p><br></p>")}>Table</button>
          <button type="button" title="Add table row" aria-label="Add table row" onMouseDown={(e) => e.preventDefault()} onClick={addRow}>+Row</button><button type="button" title="Add table column" aria-label="Add table column" onMouseDown={(e) => e.preventDefault()} onClick={addCol}>+Col</button>
          <select className="jp-select" style={{ minHeight: 28, width: "auto" }} aria-label="Insert variable" value="" onChange={(e) => { if (e.target.value) insertHtml(`<span data-var="${e.target.value}" contenteditable="false">{{${e.target.value}}}</span>&nbsp;`); }}><option value="">{"{{ variable }}"}</option>{VARS.map((v) => <option key={v}>{v}</option>)}</select>
          <select className="jp-select" style={{ minHeight: 28, width: "auto" }} aria-label="Insert snippet" value="" onChange={(e) => { const s = SNIPPETS.find((x) => x.label === e.target.value); if (s) insertHtml(s.html); }}><option value="">Snippet…</option>{SNIPPETS.map((s) => <option key={s.label}>{s.label}</option>)}</select>
        </div>
        {link !== null && <div className="in2-row" style={{ padding: 6, borderBottom: "1px solid var(--jp-border)" }}><input className="jp-input" aria-label="Link URL" style={{ maxWidth: 320 }} value={link} onChange={(e) => setLink(e.target.value)} /><Btn sm variant="primary" disabled={!/^(https?:\/\/|mailto:)\S+\.\S+/.test(link)} onClick={() => { run("createLink", link); setLink(null); }}>Apply</Btn><Btn sm onClick={() => setLink(null)}>Cancel</Btn></div>}
        <div ref={ed} className="rt__edit" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="Message body" spellCheck onInput={sync}
          onPaste={(e) => { e.preventDefault(); const h = e.clipboardData.getData("text/html"); const t = e.clipboardData.getData("text/plain"); insertHtml(h ? sanitizeHtml(h) : t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")); }} />
      </div>
      <div className="in2-row"><label className="jp-btn jp-btn--secondary jp-btn--sm" style={{ cursor: "pointer" }}><Icon name="attach" size={14} />Attach files<input type="file" multiple hidden onChange={(e) => setFiles((f) => [...f, ...[...(e.target.files ?? [])].map((x) => ({ name: x.name, size: x.size }))])} /></label>{files.map((f, i) => <span key={f.name + i} className="in2-pill"><Icon name="file" size={12} />{f.name} <span className="in2-note">{humanSize(f.size)}</span><button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((x) => x.filter((_, j) => j !== i))}>×</button></span>)}</div>
      <details className="in2-box"><summary>Output: Markdown and sanitised HTML</summary><pre className="adm-pre in2-mono" aria-label="Markdown output">{md || "(empty)"}</pre><pre className="adm-pre in2-mono" aria-label="HTML output">{sanitizeHtml(html)}</pre></details>
    </div>
  );
}

/* ---------- code editor: highlight, lint, format, diff before save ---------- */
export const SAMPLES: Record<Lang, string> = {
  json: '{\n  "name": "jupiter",\n  "version": "1.0.0",\n  "colors": { "accent": "#4b3fbf", },\n  "radius": 6\n}\n',
  yaml: "esphome:\n  name: sensor-hall\n  name: duplicate\nwifi:\n\tssid: \"Jupiter\"\n  password:secret\nlogger:\n  level: DEBUG\n",
  sql: "select * from orders o join customers c on o.customer_id = c.id where o.status = 'paid' and o.amount > 100 order by o.created desc limit 20\n",
  sh: "#!/usr/bin/env bash\nBACKUP = /mnt/tank\nfor f in $BACKUP/*; do\n  rm -rf $f/old\ndone\ncurl https://example.com/install.sh | sh\n",
  css: ".card {\n  background: var(--jp-surface)\n  border-radius: 6px;\n  padding: 12px\n}\n",
  md: "#Heading without a space\n\nSee [the docs]() for more.\n\n```\nunclosed fence\n",
};
export function CodeEditor({ lang: lang0 = "json", initial, onSave, rows }: { lang?: Lang; initial?: string; onSave?: (code: string, lang: Lang) => void; rows?: number }) {
  const [lang, setLang] = useState<Lang>(lang0); const [saved, setSaved] = useState(initial ?? SAMPLES[lang0]); const [code, setCode] = useState(initial ?? SAMPLES[lang0]); const [review, setReview] = useState(false); const ta = useRef<HTMLTextAreaElement>(null);
  const issues = useMemo(() => lint(lang, code), [lang, code]); const errors = issues.filter((i) => i.sev === "error"); const toks = useMemo(() => highlight(lang, code), [lang, code]);
  const byLine = useMemo(() => { const m = new Map<number, Issue>(); for (const i of issues) { const c = m.get(i.line); if (!c || (c.sev !== "error" && i.sev === "error")) m.set(i.line, i); } return m; }, [issues]);
  const lines = Math.max(code.split("\n").length, rows ?? 8); const dirty = code !== saved;
  const jump = (i: Issue) => { const el = ta.current; if (!el) return; const pos = code.split("\n").slice(0, i.line - 1).reduce((a, l) => a + l.length + 1, 0) + (i.col ? i.col - 1 : 0); el.focus(); el.setSelectionRange(pos, pos); };
  const switchLang = (l: Lang) => { const wasSample = code === SAMPLES[lang]; setLang(l); if (wasSample) { setCode(SAMPLES[l]); setSaved(SAMPLES[l]); } };
  return (
    <div className="in2-stack">
      <div className="ce">
        <div className="ce__bar"><div style={{ width: 120 }}><Select value={lang} onChange={(v) => switchLang(v as Lang)} aria-label="Language" options={[{ value: "json", label: "JSON" }, { value: "yaml", label: "YAML" }, { value: "sql", label: "SQL" }, { value: "sh", label: "Shell" }, { value: "css", label: "CSS" }, { value: "md", label: "Markdown" }]} /></div>
          <Btn sm type="button" onClick={() => setCode(format(lang, code))}>Format</Btn><Btn sm type="button" disabled={!dirty} onClick={() => setCode(saved)}>Revert</Btn><span style={{ marginInlineStart: "auto" }} className="in2-row" aria-live="polite">{errors.length ? <Badge s="danger">{errors.length} error{errors.length > 1 ? "s" : ""}</Badge> : <Badge s="ok">no errors</Badge>}{issues.length - errors.length > 0 && <Badge s="warn">{issues.length - errors.length} notes</Badge>}</span>
          <Btn sm type="button" variant="primary" disabled={!dirty || errors.length > 0} onClick={() => setReview(true)}>Review &amp; save…</Btn></div>
        <div className="ce__body" style={{ minHeight: `${lines * 1.6 + 1.2}em` }}>
          <div className="ce__gutter" aria-hidden>{Array.from({ length: lines }, (_, i) => { const iss = byLine.get(i + 1); return <div key={i} className={iss ? `is-${iss.sev}` : ""} title={iss?.msg}>{iss && <i />}{i + 1}</div>; })}</div>
          <div className="ce__edit"><pre aria-hidden>{toks.map((l, i) => <div key={i} style={{ minHeight: "1.6em" }}>{l.map((t, j) => <span key={j} className={t.c ? `t-${t.c}` : undefined}>{t.t}</span>)}{l.length === 0 && " "}</div>)}</pre>
            <textarea ref={ta} aria-label={`${lang} editor`} spellCheck={false} value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); const s = e.currentTarget.selectionStart; setCode(code.slice(0, s) + "  " + code.slice(e.currentTarget.selectionEnd)); requestAnimationFrame(() => ta.current?.setSelectionRange(s + 2, s + 2)); } }} /></div>
        </div>
        {issues.length > 0 && <div className="ce__issues" role="list" aria-label="Problems">{issues.map((i, k) => <button key={k} type="button" role="listitem" onClick={() => jump(i)}><span className={i.sev === "error" ? "in2-bad" : i.sev === "warn" ? "in2-warn" : "in2-note"} style={{ width: 52, textTransform: "uppercase", fontSize: "var(--jp-fs-xs)" }}>{i.sev}</span><span className="in2-mono" style={{ width: 52 }}>{i.line}{i.col ? `:${i.col}` : ""}</span><span>{i.msg}</span></button>)}</div>}
      </div>
      <Modal open={review} onClose={() => setReview(false)} size="lg" title="Review changes before saving" footer={<><Btn onClick={() => setReview(false)}>Keep editing</Btn><Btn variant="primary" onClick={() => { setSaved(code); setReview(false); onSave?.(code, lang); }}>Save changes</Btn></>}>
        {issues.length > 0 && <div style={{ marginBottom: 8 }}><Alert s="warn" title={`${issues.length} note${issues.length > 1 ? "s" : ""} remain`}>Warnings do not block saving; errors do.</Alert></div>}
        <DiffViewer before={saved} after={code} labels={["saved", "your edit"]} />
      </Modal>
    </div>
  );
}
