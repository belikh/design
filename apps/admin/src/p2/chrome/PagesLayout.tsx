import { useEffect, useMemo, useRef, useState } from "react";
import "./chrome.css";
import { Badge, Btn, PageHeader, Panel, EmptyState } from "@belikh/jupiter-ui/kit.tsx";
import { TreeNav, type TreeNode } from "@belikh/jupiter-ui/extra.tsx";
import { Field, Segmented, Select, Slider, Switch, TextArea, TextInput } from "@belikh/jupiter-ui/inputs.tsx";
import { LineChart, StatTile } from "@belikh/jupiter-ui/Charts.tsx";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";
import { days, logs, series, orders, money } from "../../data/fixtures.ts";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { system } from "./system.ts";
import { DocTabs, MiniMap, SplitPane, TilingLayout, type MapNode, type WidgetDef } from "./layout.tsx";
import { nid, summarise, type DocTab, type Tile } from "./engine.ts";
import { useShortcut } from "./shortcuts.ts";

/* ===== E018: inspector panel, outline, mini-map ===== */
const WORLD = { w: 1600, h: 1000 };
const SEED: MapNode[] = [
  { id: "n1", x: 80, y: 80, w: 150, h: 64, label: "Gateway", kind: "service" }, { id: "n2", x: 340, y: 60, w: 150, h: 64, label: "Auth", kind: "service" }, { id: "n3", x: 340, y: 220, w: 150, h: 64, label: "Orders API", kind: "service" },
  { id: "n4", x: 620, y: 120, w: 150, h: 64, label: "Postgres", kind: "db" }, { id: "n5", x: 620, y: 300, w: 150, h: 64, label: "Job queue", kind: "queue" }, { id: "n6", x: 900, y: 240, w: 150, h: 64, label: "Workers", kind: "service" },
  { id: "n7", x: 900, y: 520, w: 150, h: 64, label: "Object store", kind: "db" }, { id: "n8", x: 1200, y: 640, w: 150, h: 64, label: "Archive", kind: "db" }, { id: "n9", x: 200, y: 640, w: 150, h: 64, label: "Metrics", kind: "service" },
];
export function WorkspacePage() {
  const [nodes, setNodes] = useState<MapNode[]>(SEED); const [sel, setSel] = useState<string | null>("n1"); const [snap, setSnap] = useState(true); const scroller = useRef<HTMLDivElement>(null); const [view, setView] = useState({ x: 0, y: 0, w: 700, h: 460 });
  const cur = nodes.find((n) => n.id === sel); const upd = (id: string, p: Partial<MapNode>) => setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, ...p } : n)));
  const measure = () => { const el = scroller.current; if (el) setView({ x: el.scrollLeft, y: el.scrollTop, w: el.clientWidth || 700, h: el.clientHeight || 460 }); };
  useEffect(() => { measure(); }, []);
  const drag = (e: React.PointerEvent, n: MapNode) => {
    setSel(n.id); const sx = e.clientX, sy = e.clientY, ox = n.x, oy = n.y; (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const g = (v: number) => (snap ? Math.round(v / 20) * 20 : v);
    const mv = (ev: PointerEvent) => upd(n.id, { x: Math.max(0, Math.min(WORLD.w - n.w, g(ox + ev.clientX - sx))), y: Math.max(0, Math.min(WORLD.h - n.h, g(oy + ev.clientY - sy))) }); const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
  };
  const key = (e: React.KeyboardEvent, n: MapNode) => { const d = e.shiftKey ? 40 : 10; const m: Record<string, [number, number]> = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }; if (m[e.key]) { e.preventDefault(); upd(n.id, { x: Math.max(0, n.x + m[e.key][0]), y: Math.max(0, n.y + m[e.key][1]) }); } else if (e.key === "Delete") { setNodes((ns) => ns.filter((x) => x.id !== n.id)); setSel(null); } };
  const outline: TreeNode[] = useMemo(() => ["service", "db", "queue"].map((k) => ({ id: `k-${k}`, label: `${k === "db" ? "Databases" : k === "queue" ? "Queues" : "Services"} (${nodes.filter((n) => n.kind === k).length})`, icon: "folder", children: nodes.filter((n) => n.kind === k).map((n) => ({ id: n.id, label: n.label, icon: k === "db" ? "database" : k === "queue" ? "loader" : "server" })) })), [nodes]);
  const panTo = (x: number, y: number) => { const el = scroller.current; if (!el) return; el.scrollLeft = Math.max(0, Math.min(WORLD.w - el.clientWidth, x)); el.scrollTop = Math.max(0, Math.min(WORLD.h - el.clientHeight, y)); measure(); };
  return (
    <>
      <PageHeader title="Inspector, outline and mini-map" crumbs={["System", "Workspace"]} desc="A small diagram editor: pick a node in the outline or on the canvas, edit it in the inspector, drag it (or use the arrow keys), and navigate a large canvas with the mini-map." actions={<><Btn icon="plus" onClick={() => { const id = nid("n"); setNodes([...nodes, { id, x: view.x + 60, y: view.y + 60, w: 150, h: 64, label: `Node ${nodes.length + 1}`, kind: "service" }]); setSel(id); }}>Add node</Btn><Switch checked={snap} onChange={setSnap} label="Snap to grid" /></>} />
      <div className="adm-ws">
        <aside className="adm-ws__outline"><div className="jp-label" style={{ padding: "8px 10px 0" }}>Outline</div><TreeNav nodes={outline} selected={sel ?? ""} onSelect={(id) => { if (!id.startsWith("k-")) { setSel(id); const n = nodes.find((x) => x.id === id); if (n) panTo(n.x - 120, n.y - 80); } }} /></aside>
        <div className="adm-ws__canvaswrap">
          <div ref={scroller} className="adm-ws__canvas" onScroll={measure} onPointerDown={(e) => e.target === e.currentTarget.firstElementChild && setSel(null)} tabIndex={-1}>
            <div className="adm-ws__world" style={{ width: WORLD.w, height: WORLD.h, backgroundSize: snap ? "20px 20px" : "0" }}>
              {nodes.map((n) => <div key={n.id} role="button" tabIndex={0} aria-label={`${n.kind} ${n.label}`} aria-pressed={sel === n.id} className={`adm-ws__node is-${n.kind} ${sel === n.id ? "is-sel" : ""}`} style={{ left: n.x, top: n.y, width: n.w, height: n.h }} onPointerDown={(e) => drag(e, n)} onKeyDown={(e) => key(e, n)} onFocus={() => setSel(n.id)}><Icon name={n.kind === "db" ? "database" : n.kind === "queue" ? "loader" : "server"} size={16} />{n.label}</div>)}
            </div>
          </div>
          <div className="adm-ws__map"><MiniMap nodes={nodes} world={WORLD} view={view} onView={panTo} /></div>
        </div>
        <aside className="adm-ws__inspector" aria-label="Inspector">
          <div className="jp-label">Inspector</div>
          {cur ? <div className="adm-stack">
            <Field label="Label">{(id) => <TextInput id={id} value={cur.label} onChange={(v) => upd(cur.id, { label: v })} />}</Field>
            <Field label="Kind">{(id) => <Select id={id} value={cur.kind} onChange={(v) => upd(cur.id, { kind: v })} options={["service", "db", "queue"]} />}</Field>
            <Field label="Width">{() => <Slider label="Width" value={cur.w} onChange={(w) => upd(cur.id, { w })} min={100} max={300} step={10} fmt={(v) => `${v}px`} />}</Field>
            <dl className="adm-dl" style={{ gridTemplateColumns: "50px 1fr" }}><dt>X</dt><dd className="adm-num">{cur.x}</dd><dt>Y</dt><dd className="adm-num">{cur.y}</dd></dl>
            <div className="adm-row"><Btn sm onClick={() => { const id = nid("n"); setNodes([...nodes, { ...cur, id, x: cur.x + 30, y: cur.y + 30, label: `${cur.label} copy` }]); setSel(id); }}>Duplicate</Btn><Btn sm className="adm-danger" variant="primary" onClick={() => { setNodes(nodes.filter((n) => n.id !== cur.id)); setSel(null); }}>Delete</Btn></div></div>
            : <EmptyState spot="lens" title="Nothing selected">Click a node, or choose one in the outline.</EmptyState>}
        </aside>
      </div>
      <p className="jp-muted" style={{ marginTop: 8 }}>Keys on a focused node: arrows move 10px (Shift 40px), Delete removes it. {nodes.length} nodes.</p>
    </>
  );
}

/* ===== E019: document tabs and saved workspace layouts ===== */
type Layout = { id: string; name: string; tabs: DocTab[]; active: string };
const LKEY = "adm-saved-layouts"; const loadLayouts = (): Layout[] => { try { return JSON.parse(localStorage.getItem(LKEY) || "[]") as Layout[]; } catch { return []; } };
const DOCS: DocTab[] = [{ id: "readme", title: "README.md", pinned: true }, { id: "plan", title: "Q4 plan.md" }, { id: "notes", title: "Meeting notes" }, { id: "todo", title: "TODO" }];
export function TabsPage() {
  const { toast } = usePrefs(); const [tabs, setTabs] = useState<DocTab[]>(DOCS); const [active, setActive] = useState("plan"); const [text, setText] = useState<Record<string, string>>({ readme: "# Jupiter\n\nPinned tabs stay on the left and can’t be closed.", plan: "Q4: ship the admin template.\n- P1 done\n- P2 in progress", notes: "Standup notes…", todo: "[ ] review GTK CSS\n[ ] rotate keys" });
  const [closed, setClosed] = useState<DocTab[]>([]); const [layouts, setLayouts] = useState<Layout[]>(loadLayouts); const [name, setName] = useState("My workspace");
  useEffect(() => { try { localStorage.setItem(LKEY, JSON.stringify(layouts)); } catch { /* ignore */ } }, [layouts]);
  const reopen = () => { const t = closed[closed.length - 1]; if (!t) return; setClosed(closed.slice(0, -1)); setTabs((x) => [...x, t]); setActive(t.id); };
  useShortcut("reopen-tab", "mod+shift+t", "Reopen closed tab", reopen, "Tabs");
  const add = () => { const id = nid("doc"); setTabs((x) => [...x, { id, title: `Untitled ${x.length + 1}` }]); setText((t) => ({ ...t, [id]: "" })); setActive(id); };
  const cur = tabs.find((t) => t.id === active);
  return (
    <>
      <PageHeader title="Document tabs and saved layouts" crumbs={["System", "Tabs"]} desc="Closable, pinnable, reorderable tabs (drag them, or Alt+←/→), a tab list for overflow, reopen-closed (Ctrl/Cmd+Shift+T), and named workspace layouts you can save and restore." actions={<><Btn icon="plus" onClick={add}>New tab</Btn><Btn icon="undo" disabled={!closed.length} onClick={reopen}>Reopen closed ({closed.length})</Btn></>} />
      <Panel flush>
        <DocTabs tabs={tabs} active={active} onChange={setTabs} onSelect={setActive} onClosed={(t) => setClosed((c) => [...c, t])} />
        <div style={{ padding: 16 }}>{cur ? <div className="adm-stack"><div className="adm-row"><b>{cur.title}</b>{cur.pinned && <Badge>pinned</Badge>}</div><TextArea value={text[cur.id] ?? ""} onChange={(v) => { setText((t) => ({ ...t, [cur.id]: v })); setTabs((x) => x.map((y) => (y.id === cur.id ? { ...y, dirty: true } : y))); }} rows={8} aria-label={`Contents of ${cur.title}`} /><div className="adm-row"><Btn sm variant="primary" disabled={!cur.dirty} onClick={() => { setTabs((x) => x.map((y) => (y.id === cur.id ? { ...y, dirty: false } : y))); toast({ kind: "ok", title: `Saved ${cur.title}` }); }}>Save</Btn>{cur.dirty && <Badge s="warn">unsaved</Badge>}</div></div> : <EmptyState spot="empty" title="No tabs open" action={<Btn onClick={add}>New tab</Btn>}>Open a document to start.</EmptyState>}</div>
      </Panel>
      <div className="adm-grid adm-grid--2" style={{ marginTop: 16 }}>
        <Panel title="Save this layout"><div className="adm-stack"><Field label="Name">{(id) => <TextInput id={id} value={name} onChange={setName} />}</Field><Btn variant="primary" disabled={!name.trim()} onClick={() => { setLayouts([{ id: nid("l"), name, tabs: tabs.map((t) => ({ ...t, dirty: false })), active }, ...layouts.filter((l) => l.name !== name)]); system.clip(`Layout: ${name}`, tabs.map((t) => t.title).join(", ")); toast({ kind: "ok", title: "Layout saved", body: `${tabs.length} tabs` }); }}>Save layout</Btn></div></Panel>
        <Panel title={`Saved layouts (${layouts.length})`} flush>{layouts.length === 0 ? <p className="jp-muted" style={{ padding: 16 }}>None yet. Arrange some tabs, then save.</p> : <ul className="adm-list">{layouts.map((l) => <li key={l.id}><Icon name="folder" size={16} /><div className="adm-list__main"><b>{l.name}</b><span className="jp-muted">{l.tabs.map((t) => t.title).join(", ")}</span></div><Btn sm onClick={() => { setTabs(l.tabs); setActive(l.active); setText((t) => { const n = { ...t }; l.tabs.forEach((x) => { if (n[x.id] === undefined) n[x.id] = ""; }); return n; }); toast({ kind: "info", title: `Restored “${l.name}”` }); }}>Restore</Btn><Btn sm variant="ghost" onClick={() => setLayouts(layouts.filter((x) => x.id !== l.id))}>Delete</Btn></li>)}</ul>}</Panel>
      </div>
    </>
  );
}

/* ===== E013: split panes, tiling layout, reorderable dashboard grid ===== */
const WIDGETS: Record<string, WidgetDef> = {
  trend: { label: "Trend", render: () => <LineChart area smooth height={150} labels={days(14)} series={[{ name: "Requests", data: series(14, 90, 20, 3) }]} tools={false} zoomable={false} /> },
  kpi: { label: "KPIs", render: () => <div className="adm-stack"><StatTile label="Uptime" value="99.94%" delta={0.02} spark={series(14, 30, 8, 2)} /><StatTile label="p95" value="182 ms" delta={8.2} invert spark={series(14, 30, 8, 4)} /></div> },
  logs: { label: "Logs", render: () => <div className="adm-logbox" style={{ maxHeight: "none", minHeight: 0 }}>{logs.slice(0, 20).map((l, i) => <div key={i} className="adm-logline"><span className="jp-log-dim">{l.t}</span><span className={l.level === "error" ? "jp-log-danger" : l.level === "warn" ? "jp-log-warn" : "jp-log-info"}>{l.level.toUpperCase().padEnd(5)}</span><span className="jp-log-info">{l.svc}</span><span>{l.msg}</span></div>)}</div> },
  orders: { label: "Orders", render: () => <table className="jp-table"><tbody>{orders.slice(0, 8).map((o) => <tr key={o.id}><td className="adm-num">{o.id}</td><td>{o.customer}</td><td className="jp-num">{money(o.amount)}</td></tr>)}</tbody></table> },
  notes: { label: "Notes", render: () => <TextArea value="Scratchpad. Type here…" onChange={() => {}} rows={6} aria-label="Notes" /> },
};
const PRESETS: Record<string, Tile> = {
  Monitoring: { kind: "split", id: "s-a", dir: "h", ratio: 0.6, a: { kind: "split", id: "s-b", dir: "v", ratio: 0.55, a: { kind: "pane", id: "p1", widget: "trend" }, b: { kind: "pane", id: "p2", widget: "logs" } }, b: { kind: "pane", id: "p3", widget: "kpi" } },
  Review: { kind: "split", id: "s-c", dir: "h", ratio: 0.5, a: { kind: "pane", id: "p4", widget: "orders" }, b: { kind: "split", id: "s-d", dir: "v", ratio: 0.5, a: { kind: "pane", id: "p5", widget: "notes" }, b: { kind: "pane", id: "p6", widget: "trend" } } },
};
const TKEY = "adm-tiling"; const loadTree = (): Tile => { try { const v = JSON.parse(localStorage.getItem(TKEY) || "null") as Tile | null; if (v) return v; } catch { /* ignore */ } return PRESETS.Monitoring; };
export function PanesPage() {
  const [tree, setTree] = useState<Tile>(loadTree); useEffect(() => { try { localStorage.setItem(TKEY, JSON.stringify(tree)); } catch { /* ignore */ } }, [tree]);
  const [cards, setCards] = useState([{ id: "a", t: "Revenue", span: 2 }, { id: "b", t: "Orders", span: 1 }, { id: "c", t: "Latency", span: 1 }, { id: "d", t: "Errors", span: 1 }, { id: "e", t: "Queue", span: 1 }, { id: "f", t: "Capacity", span: 2 }]); const [drag, setDrag] = useState<string | null>(null);
  const mv = (id: string, d: number) => setCards((c) => { const i = c.findIndex((x) => x.id === id), j = i + d; if (j < 0 || j >= c.length) return c; const n = [...c]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  return (
    <>
      <PageHeader title="Split panes, tiling and a dashboard grid" crumbs={["System", "Panes"]} desc="Every drag has a keyboard or button alternative: splitters take arrow keys, tiles split, close and swap from their header, and grid cards move and resize with buttons." />
      <Panel title="Resizable split panes (drag the bar, or focus it and use ←/→, Home/End, Enter to reset)" flush><div style={{ height: 240 }}><SplitPane storageKey="adm-split-demo" a={<div style={{ padding: 12 }} className="adm-stack"><b>List</b>{orders.slice(0, 7).map((o) => <div key={o.id} className="adm-row" style={{ justifyContent: "space-between" }}><span className="adm-num">{o.id}</span><span className="jp-muted">{o.customer}</span></div>)}</div>} b={<div style={{ padding: 12 }}><b>Detail</b><p className="jp-muted">The divider position is remembered in this browser.</p></div>} /></div></Panel>
      <Panel title="Tiling layout" className="adm-section" actions={<div className="adm-row"><Segmented label="Preset" value="" onChange={(v) => v && setTree(PRESETS[v])} options={Object.keys(PRESETS).map((k) => ({ value: k, label: k }))} /><Btn sm onClick={() => setTree(PRESETS.Monitoring)}>Reset</Btn></div>}><TilingLayout tree={tree} onChange={setTree} widgets={WIDGETS} /></Panel>
      <Panel title="Reorderable dashboard grid (drag, or use the buttons)" className="adm-section">
        <div className="adm-reorder">{cards.map((c, i) => (
          <article key={c.id} draggable style={{ gridColumn: `span ${c.span}` }} className={`adm-reorder__card ${drag === c.id ? "is-drag" : ""}`} onDragStart={() => setDrag(c.id)} onDragEnd={() => setDrag(null)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag && drag !== c.id) setCards((x) => { const a = [...x]; const f = a.findIndex((k) => k.id === drag); const [m] = a.splice(f, 1); a.splice(a.findIndex((k) => k.id === c.id), 0, m); return a; }); setDrag(null); }}>
            <header><b>{c.t}</b><span className="adm-spacer" /><button className="adm-x" aria-label={`Move ${c.t} earlier`} disabled={i === 0} onClick={() => mv(c.id, -1)}>←</button><button className="adm-x" aria-label={`Move ${c.t} later`} disabled={i === cards.length - 1} onClick={() => mv(c.id, 1)}>→</button><button className="adm-x" aria-label={`${c.span === 1 ? "Widen" : "Narrow"} ${c.t}`} onClick={() => setCards((x) => x.map((k) => (k.id === c.id ? { ...k, span: k.span === 1 ? 2 : 1 } : k)))}>{c.span === 1 ? "↔" : "⇥"}</button></header>
            <span className="adm-num" style={{ fontSize: "var(--jp-fs-lg)" }}>{(i + 3) * 137 % 900}</span></article>))}</div>
      </Panel>
    </>
  );
}

/* ===== E020: selection summary and clipboard tray ===== */
const COLS = ["Region", "Q1", "Q2", "Q3", "Q4", "Target"]; const REGIONS = ["Brisbane", "Sydney", "Melbourne", "Perth", "Adelaide", "Hobart", "Darwin", "Canberra"];
const GRID: string[][] = REGIONS.map((r, i) => [r, ...[0, 1, 2, 3, 4].map((c) => String(Math.round(40 + ((i * 7 + c * 13) % 55) + c * 3)))]);
export function SelectionPage() {
  const { toast } = usePrefs(); const [grid, setGrid] = useState(GRID); const [a, setA] = useState<[number, number] | null>([1, 1]); const [b, setB] = useState<[number, number] | null>([3, 3]); const [extra, setExtra] = useState<Set<string>>(new Set()); const [down, setDown] = useState(false);
  const inRange = (r: number, c: number) => !!a && !!b && r >= Math.min(a[0], b[0]) && r <= Math.max(a[0], b[0]) && c >= Math.min(a[1], b[1]) && c <= Math.max(a[1], b[1]);
  const selected = useMemo(() => { const out: [number, number][] = []; grid.forEach((row, r) => row.forEach((_, c) => { if (inRange(r, c) || extra.has(`${r},${c}`)) out.push([r, c]); })); return out; }, [grid, a, b, extra]);
  const nums = selected.map(([r, c]) => Number(grid[r][c])).filter((n) => Number.isFinite(n) && grid[0] !== undefined); const stats = summarise(nums);
  const tsv = () => { if (!a || !b) return selected.map(([r, c]) => grid[r][c]).join("\t"); const r0 = Math.min(a[0], b[0]), r1 = Math.max(a[0], b[0]), c0 = Math.min(a[1], b[1]), c1 = Math.max(a[1], b[1]); return grid.slice(r0, r1 + 1).map((row) => row.slice(c0, c1 + 1).join("\t")).join("\n"); };
  const copy = (kind: "tsv" | "md" | "json") => {
    const t = tsv(); const rows = t.split("\n").map((l) => l.split("\t")); const text = kind === "tsv" ? t : kind === "json" ? JSON.stringify(rows) : rows.map((r) => `| ${r.join(" | ")} |`).join("\n");
    navigator.clipboard?.writeText(text); system.clip(`${selected.length} cells (${kind})`, text); toast({ kind: "ok", title: `Copied ${selected.length} cells as ${kind.toUpperCase()}`, body: "Also in the clipboard tray (status bar)" });
  };
  const paste = () => { const last = system && (JSON.parse(localStorage.getItem("adm-system") || "{}") as { clipboard?: { text: string }[] }).clipboard?.[0]; if (!last || !a) return; const rows = last.text.split("\n").map((l) => l.split("\t")); setGrid((g) => g.map((row, r) => row.map((v, c) => { const rr = r - Math.min(a[0], b?.[0] ?? a[0]), cc = c - Math.min(a[1], b?.[1] ?? a[1]); return rr >= 0 && cc >= 0 && rows[rr]?.[cc] !== undefined && c > 0 ? rows[rr][cc] : v; }))); toast({ kind: "ok", title: "Pasted from the tray" }); };
  useShortcut("sel-copy", "mod+c", "Copy the selected cells", () => copy("tsv"), "Selection", () => selected.length > 0 && !window.getSelection()?.toString());
  const cell = (r: number, c: number) => (e: React.PointerEvent) => { if (e.ctrlKey || e.metaKey) { setExtra((x) => { const n = new Set(x); n.has(`${r},${c}`) ? n.delete(`${r},${c}`) : n.add(`${r},${c}`); return n; }); return; } if (e.shiftKey && a) { setB([r, c]); return; } setExtra(new Set()); setA([r, c]); setB([r, c]); setDown(true); };
  return (
    <>
      <PageHeader title="Selection summary and clipboard tray" crumbs={["System", "Selection"]} desc="Drag to select a range (Shift+click extends, Ctrl/Cmd+click adds cells). The summary updates live; copies go to the system clipboard and to the tray in the status bar." actions={<><Btn icon="copy" onClick={() => copy("tsv")} disabled={!selected.length}>Copy TSV</Btn><Btn onClick={() => copy("md")} disabled={!selected.length}>Markdown</Btn><Btn onClick={() => copy("json")} disabled={!selected.length}>JSON</Btn><Btn onClick={paste}>Paste latest from tray</Btn></>} />
      <Panel flush>
        <div className="adm-dt__wrap" onPointerUp={() => setDown(false)} onPointerLeave={() => setDown(false)}><table className="adm-sheet" aria-label="Spreadsheet" aria-multiselectable="true" role="grid"><thead><tr><th /> {COLS.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
          <tbody>{grid.map((row, r) => <tr key={r}><th scope="row">{r + 1}</th>{row.map((v, c) => { const on = inRange(r, c) || extra.has(`${r},${c}`); return <td key={c} role="gridcell" aria-selected={on} className={`${on ? "is-sel" : ""} ${c === 0 ? "is-text" : "adm-num"}`} onPointerDown={cell(r, c)} onPointerEnter={() => down && setB([r, c])}>{v}</td>; })}</tr>)}</tbody></table></div>
        <div className="adm-selbar" role="status" aria-live="polite"><b>{selected.length} cell{selected.length === 1 ? "" : "s"} selected</b>{nums.length > 0 && <><span>Σ <b className="adm-num">{stats.sum}</b></span><span>avg <b className="adm-num">{stats.avg.toFixed(1)}</b></span><span>min <b className="adm-num">{stats.min}</b></span><span>max <b className="adm-num">{stats.max}</b></span><span>{stats.count} numeric</span></>}<span className="adm-spacer" /><button className="adm-link" onClick={() => { setA(null); setB(null); setExtra(new Set()); }}>Clear</button></div>
      </Panel>
      <p className="jp-muted" style={{ marginTop: 12 }}>Open <b>Clipboard</b> in the status bar to see, pin and re-copy everything you’ve copied here and on other System pages.</p>
    </>
  );
}
