import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Field, TextInput, Select, Combobox, Checkbox } from "@belikh/jupiter-ui/inputs.tsx";
import { Btn, Badge, Avatar, AvatarStack } from "@belikh/jupiter-ui/kit.tsx";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";
import { orders, people } from "../../data/fixtures.ts";
import { checkState, findPath, leaves, toggleNode, type TNode } from "./logic-data.ts";
import { ZONES, offsetLabel } from "./logic-num.ts";
import "./in2.css";

/* ---------- transfer list (dual listbox) ---------- */
export type Item = { id: string; label: string };
export function TransferList({ items, initialRight = [] as string[], titles = ["Available", "Selected"] }: { items: Item[]; initialRight?: string[]; titles?: [string, string] }) {
  const [right, setRight] = useState<Set<string>>(new Set(initialRight)); const [sel, setSel] = useState<{ l: Set<string>; r: Set<string> }>({ l: new Set(), r: new Set() }); const [q, setQ] = useState<[string, string]>(["", ""]);
  const left = items.filter((i) => !right.has(i.id)); const rightItems = items.filter((i) => right.has(i.id)); const vis = (list: Item[], s: string) => list.filter((i) => i.label.toLowerCase().includes(s.toLowerCase()));
  const move = (ids: string[], toRight: boolean) => { setRight((r) => { const n = new Set(r); ids.forEach((i) => (toRight ? n.add(i) : n.delete(i))); return n; }); setSel({ l: new Set(), r: new Set() }); };
  const toggle = (side: "l" | "r", id: string) => setSel((s) => { const n = new Set(s[side]); n.has(id) ? n.delete(id) : n.add(id); return { ...s, [side]: n }; });
  const Panel = ({ title, list, side, text }: { title: string; list: Item[]; side: "l" | "r"; text: string }) => {
    const shown = vis(list, text); const allSel = shown.length > 0 && shown.every((i) => sel[side].has(i.id));
    return (
      <div role="group" aria-label={title}><div className="in2-row" style={{ padding: 8, justifyContent: "space-between" }}><Checkbox checked={allSel} indeterminate={!allSel && shown.some((i) => sel[side].has(i.id))} onChange={(v) => setSel((s) => ({ ...s, [side]: new Set(v ? shown.map((i) => i.id) : []) }))} label={<b>{title}</b>} /><span className="in2-note">{sel[side].size ? `${sel[side].size}/` : ""}{list.length}</span></div>
        <div style={{ padding: "0 8px 8px" }}><input className="jp-input" aria-label={`Filter ${title}`} placeholder="Filter…" value={text} onChange={(e) => setQ(side === "l" ? [e.target.value, q[1]] : [q[0], e.target.value])} /></div>
        <ul role="listbox" aria-multiselectable aria-label={`${title} items`}>{shown.map((i) => <li key={i.id} role="option" aria-selected={sel[side].has(i.id)} tabIndex={0} className={sel[side].has(i.id) ? "is-sel" : ""} onClick={() => toggle(side, i.id)} onDoubleClick={() => move([i.id], side === "l")} onKeyDown={(e) => { if (e.key === " ") { e.preventDefault(); toggle(side, i.id); } else if (e.key === "Enter") move([i.id], side === "l"); }}><input type="checkbox" tabIndex={-1} readOnly checked={sel[side].has(i.id)} aria-hidden />{i.label}</li>)}{!shown.length && <li className="in2-note" style={{ cursor: "default" }}>Nothing here</li>}</ul></div>
    );
  };
  return (
    <div className="in2-transfer">
      <Panel title={titles[0]} list={left} side="l" text={q[0]} />
      <div className="in2-transfer__btns"><Btn sm aria-label="Move selected right" disabled={!sel.l.size} onClick={() => move([...sel.l], true)}>›</Btn><Btn sm aria-label="Move all right" disabled={!left.length} onClick={() => move(vis(left, q[0]).map((i) => i.id), true)}>»</Btn><Btn sm aria-label="Move selected left" disabled={!sel.r.size} onClick={() => move([...sel.r], false)}>‹</Btn><Btn sm aria-label="Move all left" disabled={!rightItems.length} onClick={() => move(vis(rightItems, q[1]).map((i) => i.id), false)}>«</Btn></div>
      <Panel title={titles[1]} list={rightItems} side="r" text={q[1]} />
    </div>
  );
}

/* ---------- hierarchical data ---------- */
export const ORG: TNode[] = [
  { id: "au", label: "Australia", children: [{ id: "qld", label: "Queensland", children: [{ id: "bne", label: "Brisbane" }, { id: "ips", label: "Ipswich" }, { id: "log", label: "Logan" }, { id: "mor", label: "Moreton Bay" }] }, { id: "nsw", label: "New South Wales", children: [{ id: "syd", label: "Sydney" }, { id: "new", label: "Newcastle" }] }, { id: "vic", label: "Victoria", children: [{ id: "mel", label: "Melbourne" }, { id: "gee", label: "Geelong" }] }] },
  { id: "nz", label: "New Zealand", children: [{ id: "akl", label: "Auckland" }, { id: "wlg", label: "Wellington" }] },
  { id: "jp", label: "Japan", children: [{ id: "tyo", label: "Tokyo" }, { id: "osa", label: "Osaka" }] },
];
const flatLeaves = (ns: TNode[]): TNode[] => ns.flatMap((n) => (n.children?.length ? flatLeaves(n.children) : [n]));

/* ---------- tri-state hierarchical checklist ---------- */
export function TreeChecklist({ nodes = ORG, initial = ["bne", "syd"] }: { nodes?: TNode[]; initial?: string[] }) {
  const [checked, setChecked] = useState<Set<string>>(new Set(initial)); const [open, setOpen] = useState<Set<string>>(new Set(["au", "qld"]));
  const Node = ({ n }: { n: TNode }) => { const st = checkState(n, checked); const kids = n.children?.length;
    return <li role="treeitem" aria-expanded={kids ? open.has(n.id) : undefined} aria-checked={st === "indeterminate" ? "mixed" : st === "checked"}><span className="in2-row" style={{ gap: 4 }}>{kids ? <button type="button" className="adm-x" aria-label={`${open.has(n.id) ? "Collapse" : "Expand"} ${n.label}`} onClick={() => setOpen((o) => { const x = new Set(o); x.has(n.id) ? x.delete(n.id) : x.add(n.id); return x; })}><Icon name={open.has(n.id) ? "chevron-down" : "chevron-right"} size={12} /></button> : <span style={{ width: 22 }} />}<Checkbox checked={st === "checked"} indeterminate={st === "indeterminate"} onChange={() => setChecked(toggleNode(n, checked))} label={n.label} />{kids ? <span className="in2-note">{leaves(n).filter((l) => checked.has(l)).length}/{leaves(n).length}</span> : null}</span>{kids && open.has(n.id) ? <ul className="in2-tree" role="group">{n.children!.map((c) => <Node key={c.id} n={c} />)}</ul> : null}</li>; };
  return <div className="in2-stack"><ul className="in2-tree" role="tree" aria-label="Locations" style={{ paddingInlineStart: 0 }}>{nodes.map((n) => <Node key={n.id} n={n} />)}</ul><div className="in2-row" aria-live="polite"><span className="in2-note">{checked.size} selected:</span>{[...checked].map((c) => <span key={c} className="in2-pill">{flatLeaves(nodes).find((l) => l.id === c)?.label}</span>)}</div></div>;
}

/* ---------- tree select (popover, single or multi) ---------- */
export function TreeSelect({ nodes = ORG, label = "Region", multi }: { nodes?: TNode[]; label?: string; multi?: boolean }) {
  const [open, setOpen] = useState(false); const [val, setVal] = useState<string[]>([]); const [q, setQ] = useState(""); const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false); const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false); document.addEventListener("mousedown", h); document.addEventListener("keydown", k); return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); }; }, [open]);
  const match = (n: TNode): boolean => n.label.toLowerCase().includes(q.toLowerCase()) || !!n.children?.some(match);
  const walk = (ns: TNode[], d: number): ReactNode => ns.filter((n) => !q || match(n)).map((n) => <div key={n.id}><button type="button" role="option" aria-selected={val.includes(n.id)} className={`in2-click ${val.includes(n.id) ? "is-on" : ""}`} style={{ paddingInlineStart: 8 + d * 16, width: "100%", margin: 0, cursor: "pointer", fontWeight: n.children ? 700 : 400 }} onClick={() => { setVal(multi ? (val.includes(n.id) ? val.filter((x) => x !== n.id) : [...val, n.id]) : [n.id]); if (!multi) setOpen(false); }}>{val.includes(n.id) && <Icon name="check" size={12} />}{n.label}</button>{n.children && walk(n.children, d + 1)}</div>);
  const path = (id: string) => findPath(nodes, id)?.map((p) => p.label).join(" › ") ?? id;
  return (
    <Field label={label}>{(id) => <div className="in2-rel" ref={ref}><button id={id} type="button" className="jp-input" style={{ textAlign: "start", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", height: "auto", minHeight: 36, cursor: "pointer" }} aria-haspopup="tree" aria-expanded={open} onClick={() => setOpen(!open)}>{val.length ? val.map((v) => <span key={v} className="in2-pill">{multi ? flatLeaves(nodes).find((l) => l.id === v)?.label ?? findPath(nodes, v)?.slice(-1)[0].label : path(v)}</span>) : <span className="in2-note">Select…</span>}<Icon name="chevron-down" size={14} className="" /></button>
      {open && <div className="in2-menu" role="listbox" aria-multiselectable={multi} style={{ padding: 6 }}><input className="jp-input" autoFocus aria-label="Search" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 4 }} />{walk(nodes, 0)}</div>}</div>}</Field>
  );
}

/* ---------- cascader (columns) ---------- */
export function Cascader({ nodes = ORG }: { nodes?: TNode[] }) {
  const [path, setPath] = useState<string[]>(["au"]); const cols: TNode[][] = [nodes]; let cur = nodes;
  for (const id of path) { const n = cur.find((x) => x.id === id); if (n?.children) { cols.push(n.children); cur = n.children; } else break; }
  const chosen = findPath(nodes, path[path.length - 1] ?? "");
  const isLeaf = chosen && !chosen[chosen.length - 1].children;
  return (
    <div className="in2-stack">
      <div className="in2-cascade" role="group" aria-label="Location cascader">{cols.map((c, i) => <ul key={i} role="listbox" aria-label={`Level ${i + 1}`}>{c.map((n) => <li key={n.id} role="option" tabIndex={0} aria-selected={path[i] === n.id} className={path[i] === n.id ? "is-sel" : ""} onClick={() => setPath([...path.slice(0, i), n.id])} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setPath([...path.slice(0, i), n.id])}>{n.label}{n.children && <Icon name="chevron-right" size={12} />}</li>)}</ul>)}</div>
      <span className="in2-note" aria-live="polite">{chosen ? <>Selected: <b>{chosen.map((p) => p.label).join(" / ")}</b>{isLeaf ? " (complete)" : " (choose a more specific place)"}</> : "Nothing selected"}</span>
    </div>
  );
}

/* ---------- country / region / timezone / language ---------- */
export const COUNTRIES: { code: string; name: string; regions: string[] }[] = [
  { code: "AU", name: "Australia", regions: ["Queensland", "New South Wales", "Victoria", "Western Australia", "South Australia", "Tasmania", "Northern Territory", "ACT"] }, { code: "NZ", name: "New Zealand", regions: ["Auckland", "Wellington", "Canterbury", "Otago", "Waikato"] },
  { code: "US", name: "United States", regions: ["California", "New York", "Texas", "Washington", "Florida"] }, { code: "CA", name: "Canada", regions: ["Ontario", "Quebec", "British Columbia", "Alberta"] }, { code: "GB", name: "United Kingdom", regions: ["England", "Scotland", "Wales", "Northern Ireland"] },
  { code: "DE", name: "Germany", regions: ["Bavaria", "Berlin", "Hesse", "Saxony"] }, { code: "FR", name: "France", regions: ["Île-de-France", "Occitanie", "Brittany"] }, { code: "JP", name: "Japan", regions: ["Tokyo", "Osaka", "Hokkaido", "Kyoto"] }, { code: "SG", name: "Singapore", regions: [] }, { code: "IN", name: "India", regions: ["Maharashtra", "Karnataka", "Delhi", "Tamil Nadu"] },
  { code: "AE", name: "United Arab Emirates", regions: ["Dubai", "Abu Dhabi", "Sharjah"] }, { code: "BR", name: "Brazil", regions: ["São Paulo", "Rio de Janeiro", "Minas Gerais"] }, { code: "ZA", name: "South Africa", regions: ["Gauteng", "Western Cape", "KwaZulu-Natal"] },
];
export const LANGUAGES: { tag: string; name: string; native: string; dir: "ltr" | "rtl" }[] = [{ tag: "en-AU", name: "English (Australia)", native: "English", dir: "ltr" }, { tag: "en-GB", name: "English (UK)", native: "English", dir: "ltr" }, { tag: "en-US", name: "English (US)", native: "English", dir: "ltr" }, { tag: "es-ES", name: "Spanish (Spain)", native: "Español", dir: "ltr" }, { tag: "fr-FR", name: "French (France)", native: "Français", dir: "ltr" }, { tag: "de-DE", name: "German", native: "Deutsch", dir: "ltr" }, { tag: "ja-JP", name: "Japanese", native: "日本語", dir: "ltr" }, { tag: "zh-CN", name: "Chinese (Simplified)", native: "简体中文", dir: "ltr" }, { tag: "ar-SA", name: "Arabic (Saudi Arabia)", native: "العربية", dir: "rtl" }, { tag: "he-IL", name: "Hebrew", native: "עברית", dir: "rtl" }, { tag: "hi-IN", name: "Hindi", native: "हिन्दी", dir: "ltr" }];
export function zoneList(): string[] { try { const f = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf; const all = f?.("timeZone"); if (all?.length) return all; } catch { /* fall through */ } return ZONES; }
export function GeoPickers({ now = new Date(2026, 10, 12, 9, 0) }: { now?: Date }) {
  const [country, setCountry] = useState("AU"); const [region, setRegion] = useState(""); const [zone, setZone] = useState("Australia/Brisbane"); const [lang, setLang] = useState("en-AU"); const c = COUNTRIES.find((x) => x.code === country)!; const zones = useMemo(zoneList, []);
  const L = LANGUAGES.find((l) => l.tag === lang)!;
  return (
    <div className="in2-grid">
      <Field label="Country">{(id) => <Combobox id={id} options={COUNTRIES.map((x) => x.name)} value={[c.name]} onChange={(v) => { const n = COUNTRIES.find((x) => x.name === v[0]); if (n) { setCountry(n.code); setRegion(""); } }} placeholder="Search countries…" />}</Field>
      <Field label="State / region" hint={c.regions.length ? `${c.regions.length} regions in ${c.name}` : `${c.name} has no regions to choose`}>{(id) => c.regions.length ? <Select id={id} value={region} onChange={setRegion} options={["", ...c.regions].map((r) => ({ value: r, label: r || "Select…" }))} /> : <TextInput id={id} value="" onChange={() => {}} disabled placeholder="Not applicable" />}</Field>
      <Field label="Time zone" hint={`${offsetLabel(zone, now)} · now ${new Intl.DateTimeFormat("en-AU", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now)} there`}>{(id) => <Combobox id={id} options={zones} value={[zone]} onChange={(v) => v[0] && setZone(v[0])} placeholder="Search zones…" />}</Field>
      <Field label="Language" hint={`${L.native} · ${L.dir === "rtl" ? "right-to-left" : "left-to-right"} · ${L.tag}`}>{(id) => <Select id={id} value={lang} onChange={setLang} options={LANGUAGES.map((l) => ({ value: l.tag, label: `${l.name} · ${l.native}` }))} />}</Field>
    </div>
  );
}

/* ---------- virtualised rich options with select-all ---------- */
export type RichOpt = { id: string; label: string; desc: string; icon: string };
export function makeAssets(n = 5000): RichOpt[] { const kinds = [["server", "Server"], ["router", "Router"], ["switch", "Switch"], ["camera", "Camera"], ["battery", "Sensor"], ["monitor", "Display"]]; return Array.from({ length: n }, (_, i) => { const [icon, k] = kinds[i % kinds.length]; return { id: `a${i}`, label: `${k} ${String(i + 1).padStart(4, "0")}`, desc: `${["Brisbane", "Sydney", "Home lab", "Warehouse"][i % 4]} · rack ${(i % 24) + 1}`, icon }; }); }
export function RichSelect({ options, multi = true, label = "Assets" }: { options: RichOpt[]; multi?: boolean; label?: string }) {
  const [q, setQ] = useState(""); const [sel, setSel] = useState<Set<string>>(new Set()); const [top, setTop] = useState(0); const [hi, setHi] = useState(0); const box = useRef<HTMLDivElement>(null); const H = 44, VH = 280;
  const list = useMemo(() => options.filter((o) => (o.label + o.desc).toLowerCase().includes(q.toLowerCase())), [options, q]);
  const first = Math.max(0, Math.floor(top / H) - 3), last = Math.min(list.length, Math.ceil((top + VH) / H) + 3);
  const toggle = (id: string) => setSel((s) => { const n = new Set(multi ? s : []); s.has(id) ? n.delete(id) : n.add(id); return n; });
  const ensure = (i: number) => { const el = box.current; if (!el) return; if (i * H < el.scrollTop) el.scrollTop = i * H; else if ((i + 1) * H > el.scrollTop + VH) el.scrollTop = (i + 1) * H - VH; };
  return (
    <div className="in2-stack">
      <div className="in2-row"><div style={{ flex: 1, minWidth: 200 }}><TextInput aria-label={`Search ${label}`} placeholder={`Search ${options.length.toLocaleString()} ${label.toLowerCase()}…`} value={q} onChange={(v) => { setQ(v); setHi(0); if (box.current) box.current.scrollTop = 0; }} prefix={<Icon name="search" size={14} />} /></div>
        {multi && <><Btn sm onClick={() => setSel((s) => new Set([...s, ...list.map((o) => o.id)]))}>Select all {q ? "matching" : ""} ({list.length.toLocaleString()})</Btn><Btn sm variant="ghost" disabled={!sel.size} onClick={() => setSel(new Set())}>Clear</Btn></>}</div>
      <div ref={box} className="in2-vlist" role="listbox" aria-multiselectable={multi} aria-label={label} aria-activedescendant={list[hi] ? `ro-${list[hi].id}` : undefined} tabIndex={0} onScroll={(e) => setTop(e.currentTarget.scrollTop)}
        onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); const n = Math.min(list.length - 1, hi + 1); setHi(n); ensure(n); } else if (e.key === "ArrowUp") { e.preventDefault(); const n = Math.max(0, hi - 1); setHi(n); ensure(n); } else if (e.key === "Home") { setHi(0); ensure(0); } else if (e.key === "End") { setHi(list.length - 1); ensure(list.length - 1); } else if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (list[hi]) toggle(list[hi].id); } else if ((e.ctrlKey || e.metaKey) && e.key === "a" && multi) { e.preventDefault(); setSel(new Set(list.map((o) => o.id))); } }}>
        <div style={{ height: list.length * H }}>{list.slice(first, last).map((o, k) => { const i = first + k; return <div key={o.id} id={`ro-${o.id}`} role="option" aria-selected={sel.has(o.id)} className={`in2-vrow ${sel.has(o.id) ? "is-sel" : ""} ${hi === i ? "is-hi" : ""}`} style={{ top: i * H }} onClick={() => { setHi(i); toggle(o.id); }}>{multi && <input type="checkbox" tabIndex={-1} readOnly checked={sel.has(o.id)} aria-hidden />}<Icon name={o.icon} size={18} /><div className="adm-list__main"><b>{o.label}</b><span className="in2-note">{o.desc}</span></div></div>; })}</div>
        {!list.length && <div className="in2-note" style={{ padding: 16 }}>No matches</div>}
      </div>
      <span className="in2-note" aria-live="polite">{sel.size.toLocaleString()} selected · rendering {Math.max(0, last - first)} of {list.length.toLocaleString()} rows</span>
    </div>
  );
}

/* ---------- people / role / team pickers ---------- */
export const ROLES = [{ id: "owner", label: "Owner", desc: "Full control, billing" }, { id: "admin", label: "Admin", desc: "Manage members and settings" }, { id: "editor", label: "Editor", desc: "Create and edit content" }, { id: "viewer", label: "Viewer", desc: "Read-only" }];
export const TEAMS = [{ id: "platform", name: "Platform", members: people.slice(0, 5) }, { id: "design", name: "Design systems", members: people.slice(3, 8) }, { id: "ops", name: "Operations", members: people.slice(6, 12) }];
export function PeoplePicker({ multi = true, withRoles }: { multi?: boolean; withRoles?: boolean }) {
  const [sel, setSel] = useState<{ name: string; role: string }[]>([{ name: people[0], role: "owner" }]); const [q, setQ] = useState(""); const [open, setOpen] = useState(false); const [hi, setHi] = useState(0);
  const results = people.filter((p, i, a) => a.indexOf(p) === i && p.toLowerCase().includes(q.toLowerCase()) && !sel.some((s) => s.name === p)).slice(0, 7);
  const add = (name: string) => { setSel(multi ? [...sel, { name, role: "viewer" }] : [{ name, role: "viewer" }]); setQ(""); setHi(0); if (!multi) setOpen(false); };
  return (
    <div className="in2-stack">
      <div className="in2-rel"><label className="jp-label" htmlFor="pp-in">{multi ? "Add people" : "Assignee"}</label>
        <input id="pp-in" className="jp-input" role="combobox" aria-expanded={open && results.length > 0} aria-controls="pp-list" autoComplete="off" placeholder="Search by name…" value={q} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)} onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); }} onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(results.length - 1, h + 1)); } else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); } else if (e.key === "Enter" && results[hi]) { e.preventDefault(); add(results[hi]); } else if (e.key === "Escape") setOpen(false); }} />
        {open && results.length > 0 && <ul id="pp-list" role="listbox" className="in2-menu">{results.map((p, i) => <li key={p} role="option" aria-selected={i === hi} className={i === hi ? "is-hi" : ""} onMouseDown={(e) => { e.preventDefault(); add(p); }}><Avatar name={p} size={22} />{p}</li>)}</ul>}</div>
      <ul className="adm-list in2-box" style={{ padding: 0 }} aria-label="Selected people">{sel.map((s) => <li key={s.name}><Avatar name={s.name} size={28} /><div className="adm-list__main"><b>{s.name}</b></div>{withRoles && <div style={{ width: 150 }}><Select value={s.role} onChange={(role) => setSel(sel.map((x) => (x.name === s.name ? { ...x, role } : x)))} aria-label={`Role for ${s.name}`} options={ROLES.map((r) => ({ value: r.id, label: r.label }))} /></div>}<Btn sm variant="ghost" aria-label={`Remove ${s.name}`} onClick={() => setSel(sel.filter((x) => x.name !== s.name))}>×</Btn></li>)}{!sel.length && <li className="in2-note">No one selected</li>}</ul>
    </div>
  );
}
export function TeamPicker() {
  const [sel, setSel] = useState<string[]>(["platform"]);
  return <div className="in2-stack" role="group" aria-label="Teams">{TEAMS.map((t) => <label key={t.id} className="in2-card in2-row" style={{ cursor: "pointer", justifyContent: "space-between", borderColor: sel.includes(t.id) ? "var(--jp-accent)" : undefined }}><Checkbox checked={sel.includes(t.id)} onChange={(v) => setSel(v ? [...sel, t.id] : sel.filter((x) => x !== t.id))} label={<b>{t.name}</b>} /><span className="in2-row"><AvatarStack names={t.members} max={4} /><span className="in2-note">{t.members.length} members</span></span></label>)}</div>;
}
export function RolePicker() { const [r, setR] = useState("editor"); return <div className="adm-cards-radio" role="radiogroup" aria-label="Role">{ROLES.map((x) => <label key={x.id} className={r === x.id ? "is-on" : ""}><input type="radio" name="role-pick" checked={r === x.id} onChange={() => setR(x.id)} /><strong>{x.label}</strong><span className="jp-muted">{x.desc}</span></label>)}</div>; }

/* ---------- record reference picker + relation editor ---------- */
export type Rec = { id: string; title: string; sub: string; kind: "order" | "customer" };
const RECORDS: Rec[] = [...orders.slice(0, 80).map((o): Rec => ({ id: o.id, title: o.id, sub: `${o.customer} · ${o.status} · $${o.amount.toFixed(0)}`, kind: "order" })), ...[...new Set(orders.map((o) => o.customer))].slice(0, 30).map((c): Rec => ({ id: `C-${c.replace(/\s/g, "").slice(0, 6)}`, title: c, sub: "Customer", kind: "customer" }))];
export function RecordPicker({ value, onChange, delay = 300, kinds }: { value: Rec | null; onChange: (r: Rec | null) => void; delay?: number; kinds?: Rec["kind"][] }) {
  const [q, setQ] = useState(""); const [res, setRes] = useState<Rec[]>([]); const [loading, setLoading] = useState(false); const [open, setOpen] = useState(false);
  useEffect(() => { if (!open) return; setLoading(true); const t = setTimeout(() => { setRes(RECORDS.filter((r) => (!kinds || kinds.includes(r.kind)) && (r.title + r.sub).toLowerCase().includes(q.toLowerCase())).slice(0, 6)); setLoading(false); }, delay); return () => clearTimeout(t); }, [q, open, delay, kinds]);
  if (value) return <div className="in2-card in2-row" style={{ justifyContent: "space-between" }}><span className="in2-row"><Icon name={value.kind === "order" ? "card" : "user"} size={18} /><span><b>{value.title}</b><br /><span className="in2-note">{value.sub}</span></span></span><Btn sm onClick={() => { onChange(null); setQ(""); }}>Change</Btn></div>;
  return (
    <div className="in2-rel"><input className="jp-input" role="combobox" aria-expanded={open} aria-label="Find a record" autoComplete="off" placeholder="Search orders and customers…" value={q} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} onChange={(e) => setQ(e.target.value)} />
      {open && <ul role="listbox" className="in2-menu">{loading && <li className="in2-head">Searching…</li>}{!loading && res.map((r) => <li key={r.id} role="option" aria-selected={false} onMouseDown={(e) => { e.preventDefault(); onChange(r); setOpen(false); }}><Icon name={r.kind === "order" ? "card" : "user"} size={16} /><span><b>{r.title}</b><br /><span style={{ opacity: .75, fontSize: "var(--jp-fs-xs)" }}>{r.sub}</span></span></li>)}{!loading && !res.length && <li className="in2-head">No records match</li>}</ul>}</div>
  );
}
export function RelationEditor({ max = 5 }: { max?: number }) {
  const [rels, setRels] = useState<{ rec: Rec; type: string }[]>([{ rec: RECORDS[0], type: "parent" }]); const [adding, setAdding] = useState<Rec | null>(null);
  return (
    <div className="in2-stack">
      <ul className="adm-list in2-box" style={{ padding: 0 }} aria-label="Related records">{rels.map((r) => <li key={r.rec.id}><Icon name={r.rec.kind === "order" ? "card" : "user"} size={16} /><div className="adm-list__main"><b>{r.rec.title}</b><span className="in2-note">{r.rec.sub}</span></div><div style={{ width: 130 }}><Select value={r.type} aria-label={`Relation for ${r.rec.title}`} onChange={(type) => setRels(rels.map((x) => (x.rec.id === r.rec.id ? { ...x, type } : x)))} options={["parent", "child", "blocks", "related"]} /></div><Btn sm variant="ghost" aria-label={`Unlink ${r.rec.title}`} onClick={() => setRels(rels.filter((x) => x.rec.id !== r.rec.id))}>Unlink</Btn></li>)}{!rels.length && <li className="in2-note">Nothing linked yet</li>}</ul>
      {rels.length < max ? <div className="in2-stack"><span className="in2-note">Link another record ({rels.length}/{max})</span><RecordPicker value={adding} onChange={(r) => { if (r && !rels.some((x) => x.rec.id === r.id)) { setRels([...rels, { rec: r, type: "related" }]); setAdding(null); } else setAdding(r); }} delay={150} /></div> : <span className="in2-warn" role="status">Limit of {max} links reached</span>}
    </div>
  );
}

/* ---------- radio with "other" + conditional reveal ---------- */
export function RadioOther({ options = ["Email", "Phone", "Post"], name = "How did you hear about us?" }: { options?: string[]; name?: string }) {
  const [v, setV] = useState<string>(options[0]); const [other, setOther] = useState(""); const err = v === "__other" && !other.trim() ? "Tell us what “other” is" : "";
  return (
    <fieldset className="in2-stack" style={{ border: 0, padding: 0, margin: 0 }}><legend className="jp-label">{name}</legend>
      {options.map((o) => <label key={o} className="adm-check adm-check--radio"><input type="radio" name="ro" checked={v === o} onChange={() => setV(o)} /><span>{o}</span></label>)}
      <label className="adm-check adm-check--radio"><input type="radio" name="ro" checked={v === "__other"} onChange={() => setV("__other")} /><span>Other…</span></label>
      {v === "__other" && <div className="in2-rel" style={{ marginInlineStart: 24 }}><TextInput aria-label="Other, please specify" autoFocus value={other} onChange={setOther} placeholder="Please specify" maxLength={60} state={err ? "error" : undefined} />{err && <span className="in2-bad" role="alert">{err}</span>}</div>}
      <span className="in2-note" aria-live="polite">Answer: <b>{v === "__other" ? other || "(other, unspecified)" : v}</b></span></fieldset>
  );
}
export function RevealRadio() {
  const [m, setM] = useState<"email" | "phone" | "post">("email"); const [vals, setVals] = useState({ email: "", phone: "", street: "", postcode: "" }); const set = (p: Partial<typeof vals>) => setVals({ ...vals, ...p });
  const errs = { email: m === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(vals.email) ? "Enter a valid email" : "", phone: m === "phone" && !/^04\d{8}$/.test(vals.phone.replace(/\s/g, "")) ? "Mobile like 0412 345 678" : "", post: m === "post" && (!vals.street.trim() || !/^\d{4}$/.test(vals.postcode)) ? "Street and a 4-digit postcode are required" : "" };
  return (
    <fieldset className="in2-stack" style={{ border: 0, padding: 0, margin: 0 }}><legend className="jp-label">Preferred contact method</legend>
      <div className="in2-row" role="radiogroup">{(["email", "phone", "post"] as const).map((x) => <label key={x} className="adm-check adm-check--radio"><input type="radio" name="reveal" checked={m === x} onChange={() => setM(x)} /><span style={{ textTransform: "capitalize" }}>{x}</span></label>)}</div>
      {m === "email" && <Field label="Email address" required error={vals.email ? errs.email || undefined : undefined}>{(id) => <TextInput id={id} type="email" value={vals.email} onChange={(email) => set({ email })} />}</Field>}
      {m === "phone" && <Field label="Mobile number" required error={vals.phone ? errs.phone || undefined : undefined}>{(id) => <TextInput id={id} inputMode="tel" value={vals.phone} onChange={(phone) => set({ phone })} />}</Field>}
      {m === "post" && <div className="in2-grid"><Field label="Street address" required>{(id) => <TextInput id={id} value={vals.street} onChange={(street) => set({ street })} />}</Field><Field label="Postcode" required error={vals.postcode && !/^\d{4}$/.test(vals.postcode) ? "4 digits" : undefined}>{(id) => <TextInput id={id} inputMode="numeric" value={vals.postcode} onChange={(postcode) => set({ postcode })} />}</Field></div>}
      <span className={errs[m] ? "in2-warn" : "in2-ok"} aria-live="polite">{errs[m] ? "Complete the revealed fields to continue" : "Ready to submit"}</span></fieldset>
  );
}

/* ---------- switch with confirm + pending + rollback ---------- */
export function SwitchConfirm({ label, risky = true, description, commit, delay = 900 }: { label: string; risky?: boolean; description?: string; commit?: (next: boolean) => Promise<void>; delay?: number }) {
  const [on, setOn] = useState(false); const [ask, setAsk] = useState<boolean | null>(null); const [pending, setPending] = useState(false); const [err, setErr] = useState("");
  const run = async (next: boolean) => { setAsk(null); setPending(true); setErr(""); const prev = on; setOn(next); try { await (commit ? commit(next) : new Promise((r) => setTimeout(r, delay))); } catch (e) { setOn(prev); setErr((e as Error).message || "That didn’t work, so the setting was put back."); } finally { setPending(false); } };
  return (
    <div className="in2-stack" style={{ gap: 6 }}>
      <label className="adm-switch"><input type="checkbox" role="switch" className="jp-toggle" checked={on} disabled={pending} aria-busy={pending} onChange={(e) => (risky ? setAsk(e.target.checked) : void run(e.target.checked))} /><span>{label}</span>{pending && <span className="adm-spin" style={{ width: 12, height: 12 }} aria-label="Applying" />}</label>
      {description && <span className="in2-note">{description}</span>}
      {ask !== null && <div className="in2-box" role="alertdialog" aria-label={`Confirm ${label}`}><b>{ask ? `Turn on “${label}”?` : `Turn off “${label}”?`}</b><p className="in2-note">{ask ? "This takes effect immediately for everyone." : "People relying on it will lose access."}</p><div className="in2-row"><Btn sm variant="primary" onClick={() => void run(ask)}>{ask ? "Turn on" : "Turn off"}</Btn><Btn sm onClick={() => setAsk(null)}>Cancel</Btn></div></div>}
      {err && <span className="in2-bad" role="alert">{err}</span>}{pending && <span className="in2-note" role="status">Applying…</span>}
    </div>
  );
}
void Badge;
