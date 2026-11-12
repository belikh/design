import { Fragment, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon.tsx";
import { Btn, Badge } from "./kit.tsx";
import "./styles/extra.css";

/* ---------- popover + hover card ---------- */
export function Popover({ trigger, children, label }: { trigger: ReactNode; children: ReactNode; label: string }) {
  const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null); const id = useId();
  useEffect(() => { if (!open) return; const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false); const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false); document.addEventListener("mousedown", h); document.addEventListener("keydown", k); return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); }; }, [open]);
  return <div className="adm-pop" ref={ref}><button type="button" className="jp-btn jp-btn--secondary jp-btn--sm" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>{trigger}</button>{open && <div id={id} role="dialog" aria-label={label} className="adm-pop__body">{children}</div>}</div>;
}
export function HoverCard({ trigger, children }: { trigger: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false); const t = useRef<number>(0);
  const show = () => { clearTimeout(t.current); t.current = window.setTimeout(() => setOpen(true), 180); }; const hide = () => { clearTimeout(t.current); t.current = window.setTimeout(() => setOpen(false), 120); };
  return <span className="adm-pop" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}><a href="#" className="adm-hoverlink" onClick={(e) => e.preventDefault()}>{trigger}</a>{open && <div className="adm-pop__body adm-pop__body--hover" role="tooltip">{children}</div>}</span>;
}

/* ---------- context menu (right-click or Shift+F10 / menu key) ---------- */
export function ContextMenu({ items, children }: { items: ({ label: string; onSelect: () => void; danger?: boolean } | "sep")[]; children: ReactNode }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => { if (!pos) return; const c = () => setPos(null); window.addEventListener("click", c); window.addEventListener("scroll", c, true); window.addEventListener("keydown", (e) => e.key === "Escape" && c(), { once: true }); return () => { window.removeEventListener("click", c); window.removeEventListener("scroll", c, true); }; }, [pos]);
  return (
    <div onContextMenu={(e) => { e.preventDefault(); setPos({ x: e.clientX, y: e.clientY }); }} onKeyDown={(e) => { if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) { e.preventDefault(); const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setPos({ x: r.left + 24, y: r.top + 24 }); } }} tabIndex={0} className="adm-ctx">
      {children}
      {pos && <div role="menu" className="adm-menu__list" style={{ position: "fixed", left: pos.x, top: pos.y, right: "auto" }}>{items.map((it, i) => it === "sep" ? <hr key={i} /> : <button key={it.label} role="menuitem" className={it.danger ? "is-danger" : ""} onClick={() => it.onSelect()}>{it.label}</button>)}</div>}
    </div>
  );
}

/* ---------- mega menu ---------- */
export function MegaMenu({ label, columns }: { label: string; columns: { title: string; items: { label: string; desc: string; icon: string; onSelect?: () => void }[] }[] }) {
  const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false); const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false); document.addEventListener("mousedown", h); document.addEventListener("keydown", k); return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); }; }, [open]);
  return (
    <div ref={ref} className="adm-mega" onMouseLeave={() => setOpen(false)}>
      <button type="button" className="jp-btn jp-btn--ghost" aria-expanded={open} aria-haspopup="true" onMouseEnter={() => setOpen(true)} onClick={() => setOpen(!open)}>{label} <Icon name="chevron-down" size={14} /></button>
      {open && <div className="adm-mega__panel" role="region" aria-label={label}>{columns.map((c) => <div key={c.title}><div className="adm-nav__h" style={{ padding: "0 0 6px" }}>{c.title}</div>{c.items.map((i) => <a key={i.label} href="#" className="adm-mega__item" onClick={(e) => { e.preventDefault(); i.onSelect?.(); setOpen(false); }}><Icon name={i.icon} size={20} /><span><b>{i.label}</b><small className="jp-muted">{i.desc}</small></span></a>)}</div>)}</div>}
    </div>
  );
}

/* ---------- tree navigation (ARIA tree, arrow keys) ---------- */
export type TreeNode = { id: string; label: string; icon?: string; children?: TreeNode[] };
export function TreeNav({ nodes, selected, onSelect }: { nodes: TreeNode[]; selected: string; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState<Set<string>>(new Set(nodes.map((n) => n.id)));
  const flat = useMemo(() => { const out: { n: TreeNode; depth: number }[] = []; const walk = (ns: TreeNode[], d: number) => ns.forEach((n) => { out.push({ n, depth: d }); if (n.children && open.has(n.id)) walk(n.children, d + 1); }); walk(nodes, 0); return out; }, [nodes, open]);
  const [focus, setFocus] = useState(selected);
  const onKey = (e: React.KeyboardEvent) => {
    const i = flat.findIndex((x) => x.n.id === focus); const cur = flat[i]?.n; if (!cur) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setFocus(flat[Math.min(flat.length - 1, i + 1)].n.id); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setFocus(flat[Math.max(0, i - 1)].n.id); }
    else if (e.key === "ArrowRight" && cur.children) { e.preventDefault(); setOpen(new Set(open).add(cur.id)); }
    else if (e.key === "ArrowLeft" && cur.children && open.has(cur.id)) { e.preventDefault(); const o = new Set(open); o.delete(cur.id); setOpen(o); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(cur.id); }
  };
  return (
    <ul role="tree" className="adm-tree" onKeyDown={onKey}>
      {flat.map(({ n, depth }) => (
        <li key={n.id} role="treeitem" aria-level={depth + 1} aria-selected={selected === n.id} aria-expanded={n.children ? open.has(n.id) : undefined} tabIndex={focus === n.id ? 0 : -1} style={{ paddingInlineStart: 8 + depth * 18 }} className={selected === n.id ? "is-sel" : ""} onFocus={() => setFocus(n.id)} onClick={() => { onSelect(n.id); if (n.children) setOpen((o) => { const c = new Set(o); c.has(n.id) ? c.delete(n.id) : c.add(n.id); return c; }); }}>
          <span style={{ width: 14, display: "inline-flex" }}>{n.children && <Icon name={open.has(n.id) ? "chevron-down" : "chevron-right"} size={12} />}</span>{n.icon && <Icon name={n.icon} size={15} />}{n.label}
        </li>))}
    </ul>
  );
}

/* ---------- anchor nav (scroll-spy) ---------- */
export function AnchorNav({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => { const obs = new IntersectionObserver((es) => { const v = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (v) setActive(v.target.id); }, { rootMargin: "-10% 0px -70% 0px" }); items.forEach((i) => { const el = document.getElementById(i.id); if (el) obs.observe(el); }); return () => obs.disconnect(); }, [items]);
  return <nav aria-label="On this page" className="adm-anchor">{items.map((i) => <a key={i.id} href={`#${i.id}`} className={active === i.id ? "is-active" : ""} aria-current={active === i.id ? "location" : undefined} onClick={(e) => { e.preventDefault(); document.getElementById(i.id)?.scrollIntoView({ behavior: "smooth", block: "start" }); setActive(i.id); }}>{i.label}</a>)}</nav>;
}

/* ---------- pricing cards ---------- */
export function PricingCards({ plans, current, onPick }: { plans: { id: string; name: string; price: string; per?: string; desc: string; features: string[]; featured?: boolean }[]; current?: string; onPick: (id: string) => void }) {
  return (
    <div className="adm-pricing">{plans.map((p) => (
      <article key={p.id} className={`adm-plan ${p.featured ? "is-featured" : ""}`}>
        <header>{p.featured && <Badge s="info">Most popular</Badge>}<h3>{p.name}</h3></header><div className="adm-plan__price"><b>{p.price}</b>{p.per && <span className="jp-muted"> {p.per}</span>}</div><p className="jp-muted">{p.desc}</p>
        <ul>{p.features.map((f) => <li key={f}><Icon name="check" size={14} /> {f}</li>)}</ul>
        <Btn variant={p.featured ? "primary" : "secondary"} disabled={current === p.id} onClick={() => onPick(p.id)}>{current === p.id ? "Current plan" : `Choose ${p.name}`}</Btn>
      </article>))}</div>
  );
}

/* ---------- diff viewer (line LCS) ---------- */
export type DiffLine = { t: "same" | "add" | "del"; a?: number; b?: number; text: string };
export function diffLines(a: string, b: string): DiffLine[] {
  const A = a.split("\n"), B = b.split("\n"); const n = A.length, m = B.length; const L = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out: DiffLine[] = []; let i = 0, j = 0;
  while (i < n && j < m) { if (A[i] === B[j]) { out.push({ t: "same", a: i + 1, b: j + 1, text: A[i] }); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) out.push({ t: "del", a: ++i, text: A[i - 1] }); else out.push({ t: "add", b: ++j, text: B[j - 1] }); }
  while (i < n) out.push({ t: "del", a: ++i, text: A[i - 1] }); while (j < m) out.push({ t: "add", b: ++j, text: B[j - 1] });
  return out;
}
export function DiffViewer({ before, after, mode = "unified", labels = ["before", "after"] }: { before: string; after: string; mode?: "unified" | "split"; labels?: [string, string] }) {
  const d = useMemo(() => diffLines(before, after), [before, after]); const adds = d.filter((x) => x.t === "add").length, dels = d.filter((x) => x.t === "del").length;
  return (
    <div className="adm-diff" role="region" aria-label={`Diff: ${adds} additions, ${dels} deletions`}>
      <div className="adm-diff__head"><b>{labels[0]} → {labels[1]}</b><span className="adm-row"><span style={{ color: "var(--jp-ok)" }}>+{adds}</span><span style={{ color: "var(--jp-danger)" }}>−{dels}</span></span></div>
      {mode === "unified" ? d.map((l, i) => <div key={i} className={`adm-diff__line is-${l.t}`}><span>{l.a ?? ""}</span><span>{l.b ?? ""}</span><span>{l.t === "add" ? "+" : l.t === "del" ? "−" : " "}</span><code>{l.text}</code></div>)
        : <div className="adm-diff__split"><div>{d.filter((l) => l.t !== "add").map((l, i) => <div key={i} className={`adm-diff__line is-${l.t}`}><span>{l.a}</span><span /><span>{l.t === "del" ? "−" : " "}</span><code>{l.text}</code></div>)}</div><div>{d.filter((l) => l.t !== "del").map((l, i) => <div key={i} className={`adm-diff__line is-${l.t}`}><span /><span>{l.b}</span><span>{l.t === "add" ? "+" : " "}</span><code>{l.text}</code></div>)}</div></div>}
    </div>
  );
}

/* ---------- markdown renderer (safe subset, no raw HTML) ---------- */
const safeUrl = (u: string) => (/^(https?:|mailto:|\/|#)/i.test(u) ? u : "#");
function inline(s: string, key = ""): ReactNode[] {
  const out: ReactNode[] = []; const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g; let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index)); const t = m[0];
    if (t.startsWith("`")) out.push(<code key={key + k++} className="adm-num">{t.slice(1, -1)}</code>); else if (t.startsWith("**")) out.push(<strong key={key + k++}>{inline(t.slice(2, -2), key + k)}</strong>);
    else if (t.startsWith("*")) out.push(<em key={key + k++}>{t.slice(1, -1)}</em>); else { const [, text, url] = /\[([^\]]+)\]\(([^)]+)\)/.exec(t)!; out.push(<a key={key + k++} href={safeUrl(url)} rel="noreferrer noopener">{text}</a>); }
    last = m.index + t.length;
  }
  if (last < s.length) out.push(s.slice(last)); return out;
}
export function Markdown({ src }: { src: string }) {
  const lines = src.replace(/\r/g, "").split("\n"); const out: ReactNode[] = []; let i = 0, k = 0;
  while (i < lines.length) {
    const ln = lines[i];
    if (/^```/.test(ln)) { const buf: string[] = []; i++; while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]); i++; out.push(<pre key={k++} className="adm-pre jp-code" style={{ padding: 12 }}><code>{buf.join("\n")}</code></pre>); continue; }
    const h = /^(#{1,4})\s+(.*)/.exec(ln); if (h) { const L = h[1].length; const Tag = (`h${L}`) as "h1"; const id = h[2].toLowerCase().replace(/[^\w]+/g, "-"); out.push(<Tag key={k++} id={id} style={{ marginTop: L === 1 ? 0 : 24, marginBottom: 8 }}>{inline(h[2])}</Tag>); i++; continue; }
    if (/^---+$/.test(ln.trim())) { out.push(<hr key={k++} />); i++; continue; }
    if (/^>\s?/.test(ln)) { const buf: string[] = []; while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, "")); out.push(<blockquote key={k++} className="adm-quote">{inline(buf.join(" "))}</blockquote>); continue; }
    if (/^\s*[-*]\s+/.test(ln)) { const items: string[] = []; while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s+/, "")); out.push(<ul key={k++}>{items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ul>); continue; }
    if (/^\s*\d+\.\s+/.test(ln)) { const items: string[] = []; while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+\.\s+/, "")); out.push(<ol key={k++}>{items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ol>); continue; }
    if (/^\|.*\|$/.test(ln.trim()) && /^\|[\s:|-]+\|$/.test((lines[i + 1] ?? "").trim())) { const head = ln.trim().slice(1, -1).split("|").map((x) => x.trim()); i += 2; const rows: string[][] = []; while (i < lines.length && /^\|.*\|$/.test(lines[i].trim())) rows.push(lines[i++].trim().slice(1, -1).split("|").map((x) => x.trim())); out.push(<table key={k++} className="jp-table" style={{ margin: "8px 0" }}><thead><tr>{head.map((c, j) => <th key={j}>{inline(c)}</th>)}</tr></thead><tbody>{rows.map((r, j) => <tr key={j}>{r.map((c, x) => <td key={x}>{inline(c)}</td>)}</tr>)}</tbody></table>); continue; }
    if (!ln.trim()) { i++; continue; }
    const buf: string[] = []; while (i < lines.length && lines[i].trim() && !/^(```|#{1,4}\s|>|\s*[-*]\s|\s*\d+\.\s|---+$|\|)/.test(lines[i])) buf.push(lines[i++]); out.push(<p key={k++} style={{ margin: "8px 0" }}>{inline(buf.join(" "))}</p>);
  }
  return <div className="adm-md"><Fragment>{out}</Fragment></div>;
}
