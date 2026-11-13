import { useEffect, useMemo, useState } from "react";
import "./views.css";
import { PageHeader, Panel, Badge, Btn, Avatar, Tabs, Menu, Modal, Drawer, EmptyState, Breadcrumbs, type Status } from "@belikh/jupiter-ui/kit.tsx";
import { TreeNav, type TreeNode } from "@belikh/jupiter-ui/extra.tsx";
import { DataTable, type Col } from "@belikh/jupiter-ui/DataTable.tsx";
import { StatTile } from "@belikh/jupiter-ui/Charts.tsx";
import { Segmented, TextInput, Select, Checkbox, Field } from "@belikh/jupiter-ui/inputs.tsx";
import { Icon, Spot } from "@belikh/jupiter-ui/Icon.tsx";
import { money } from "../../data/fixtures.ts";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { when, NOW0 } from "./shared.tsx";
import { getWs, pathTo, findNode, useWs, wsActions } from "./workspace.ts";
import { media as mediaSeed, roadmap as roadSeed, org, mapPts, zones, type Asset, type FNode, type Person } from "./data.ts";
import { cluster, pack, pointInPolygon } from "./logic.ts";

const bytes = (n?: number) => (n === undefined ? "" : n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : n > 1e3 ? `${(n / 1e3).toFixed(0)} KB` : `${n} B`);
const fIcon = (n: FNode) => (n.kind === "folder" ? "folder" : n.ext === "svg" ? "image" : n.ext === "pdf" ? "book" : n.ext === "bin" ? "cpu" : n.ext === "json" ? "code" : "file");

/* ============ A025 tree explorer + A026 file manager ============ */
export function Files() {
  const { toast } = usePrefs(); const ws = useWs(); const [cwd, setCwd] = useState("root"); const [sel, setSel] = useState<string | null>(null); const [view, setView] = useState<"grid" | "list">("grid"); const [q, setQ] = useState(""); const [sort, setSort] = useState("name"); const [rename, setRename] = useState<string | null>(null); const [nf, setNf] = useState(false); const [nfName, setNfName] = useState("");
  const dir = findNode(ws.tree, cwd) ?? ws.tree; const crumbs = pathTo(ws.tree, dir.id) ?? [ws.tree];
  const toTree = (n: FNode): TreeNode => ({ id: n.id, label: n.name, icon: "folder", children: n.children?.filter((c) => c.kind === "folder").map(toTree) });
  const items = (dir.children ?? []).filter((c) => c.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "folder" ? -1 : 1) || (sort === "size" ? (b.size ?? 0) - (a.size ?? 0) : sort === "modified" ? b.mod - a.mod : a.name.localeCompare(b.name)));
  const cur = sel ? findNode(ws.tree, sel) : null;
  const del = (id: string) => { const n = findNode(getWs().tree, id); wsActions.deleteNode(id); const tid = getWs().trash[0].id; setSel(null); toast({ kind: "warn", title: `Moved ${n?.name} to Trash`, undo: () => wsActions.restore(tid) }); };
  useEffect(() => { const h = (e: KeyboardEvent) => { if ((e.target as HTMLElement).closest("input,textarea,select")) return; if (e.key === "Delete" && sel) del(sel); if (e.key === "F2" && sel) setRename(sel); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); });
  const open = (n: FNode) => (n.kind === "folder" ? (setCwd(n.id), setSel(null)) : setSel(n.id));
  return (
    <>
      <PageHeader title="File manager" crumbs={["Views", "Files"]} desc="A folder tree, grid or list, breadcrumbs and a preview pane. Delete moves to Trash (restorable). Keys: Delete, F2 to rename."
        actions={<><Btn icon="plus" onClick={() => { setNf(true); setNfName(""); }}>New folder</Btn><Btn variant="ghost" onClick={() => { wsActions.reset(); toast({ kind: "info", title: "Workspace reset" }); }}>Reset demo</Btn></>} />
      <div className="vw-split">
        <Panel title="Folders" flush><div style={{ padding: 4 }}><TreeNav nodes={[toTree(ws.tree)]} selected={dir.id} onSelect={(id) => { setCwd(id); setSel(null); }} /></div></Panel>
        <Panel title={<Breadcrumbs items={crumbs.map((c) => c.name)} />} actions={<><div style={{ width: 150 }}><TextInput value={q} onChange={setQ} placeholder="Filter…" aria-label="Filter files" /></div><Select value={sort} onChange={setSort} aria-label="Sort" options={["name", "size", "modified"]} /><Segmented label="View" value={view} onChange={setView} options={[{ value: "grid", label: "Grid" }, { value: "list", label: "List" }]} /></>}>
          {crumbs.length > 1 && <Btn sm variant="ghost" onClick={() => setCwd(crumbs[crumbs.length - 2].id)}>↑ Up</Btn>}
          {items.length === 0 ? <EmptyState spot="empty" title="This folder is empty">{q ? "Nothing matches the filter." : "Create a folder or restore something from Trash."}</EmptyState>
            : view === "grid" ? <div className="vw-files" style={{ marginTop: 8 }}>{items.map((n) => <button key={n.id} className={`vw-file ${sel === n.id ? "is-sel" : ""}`} onClick={() => setSel(n.id)} onDoubleClick={() => open(n)} aria-label={`${n.name}, ${n.kind}`}>{n.spot ? <Spot name={n.spot} size={52} /> : <Icon name={fIcon(n)} size={34} />}<span style={{ wordBreak: "break-all", fontSize: "var(--jp-fs-xs)" }}>{n.name}</span><span className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>{n.kind === "folder" ? `${n.children?.length ?? 0} items` : bytes(n.size)}</span></button>)}</div>
            : <table className="jp-table" style={{ marginTop: 8 }}><thead><tr><th>Name</th><th className="jp-num">Size</th><th>Modified</th></tr></thead><tbody>{items.map((n) => <tr key={n.id} onClick={() => setSel(n.id)} onDoubleClick={() => open(n)} style={{ cursor: "pointer", background: sel === n.id ? "color-mix(in oklab, var(--jp-accent) 12%, transparent)" : undefined }} aria-selected={sel === n.id}><td><Icon name={fIcon(n)} size={15} /> {n.name}</td><td className="jp-num">{bytes(n.size)}</td><td>{when(n.mod)}</td></tr>)}</tbody></table>}
          <p className="jp-muted" style={{ marginTop: 8, fontSize: "var(--jp-fs-xs)" }}>Double-click a folder to open it.</p></Panel>
        <Panel title="Preview">{cur ? <div className="adm-stack">
          <div className="vw-thumb" style={{ aspectRatio: "1" }}>{cur.spot ? <Spot name={cur.spot} size={110} /> : <Icon name={fIcon(cur)} size={56} />}</div>
          {rename === cur.id ? <TextInput value={cur.name} onChange={(v) => wsActions.rename(cur.id, v)} onBlur={() => setRename(null)} onKeyDown={(e) => e.key === "Enter" && setRename(null)} autoFocus aria-label="Rename" /> : <b style={{ wordBreak: "break-all" }}>{cur.name}</b>}
          <dl className="adm-dl" style={{ gridTemplateColumns: "80px 1fr" }}><dt>Type</dt><dd>{cur.kind === "folder" ? "Folder" : cur.ext?.toUpperCase()}</dd><dt>Size</dt><dd>{bytes(cur.size) || `${cur.children?.length ?? 0} items`}</dd><dt>Modified</dt><dd>{when(cur.mod)}</dd></dl>
          <div className="adm-row"><Btn sm onClick={() => setRename(cur.id)}>Rename</Btn>{cur.kind === "folder" && <Btn sm onClick={() => open(cur)}>Open</Btn>}<Btn sm variant="primary" className="adm-danger" onClick={() => del(cur.id)}>Delete</Btn></div></div> : <EmptyState spot="lens" title="Select a file">Details appear here.</EmptyState>}</Panel>
      </div>
      <Modal open={nf} onClose={() => setNf(false)} title="New folder" size="sm" footer={<><Btn onClick={() => setNf(false)}>Cancel</Btn><Btn variant="primary" disabled={!nfName.trim()} onClick={() => { wsActions.addFolder(dir.id, nfName.trim()); setNf(false); toast({ kind: "ok", title: "Folder created" }); }}>Create</Btn></>}><Field label="Name" required>{(id) => <TextInput id={id} value={nfName} onChange={setNfName} autoFocus />}</Field></Modal>
    </>
  );
}

/* ============ A027 Media library ============ */
export function Media() {
  const { toast } = usePrefs(); const [items, setItems] = useState(mediaSeed); const [q, setQ] = useState(""); const [kinds, setKinds] = useState<string[]>([]); const [fav, setFav] = useState(false); const [year, setYear] = useState("all"); const [sel, setSel] = useState<Set<string>>(new Set()); const [lb, setLb] = useState<number | null>(null);
  const shown = useMemo(() => items.filter((m) => (!kinds.length || kinds.includes(m.kind)) && (!fav || m.fav) && (year === "all" || String(m.year) === year) && m.name.includes(q.toLowerCase())), [items, kinds, fav, year, q]);
  useEffect(() => { if (lb === null) return; const h = (e: KeyboardEvent) => { if (e.key === "ArrowRight") setLb((i) => (i === null ? i : (i + 1) % shown.length)); if (e.key === "ArrowLeft") setLb((i) => (i === null ? i : (i - 1 + shown.length) % shown.length)); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [lb, shown.length]);
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const bulk = (label: string, fn: () => void) => { const old = items; fn(); toast({ kind: "ok", title: `${label} (${sel.size})`, undo: () => setItems(old) }); setSel(new Set()); };
  return (
    <>
      <PageHeader title="Media library" crumbs={["Views", "Media"]} desc="Thumbnails with filters, favourites, a lightbox (arrow keys) and bulk actions." />
      <div className="adm-row" style={{ marginBottom: 12 }}><div style={{ width: 220 }}><TextInput value={q} onChange={setQ} placeholder="Search media…" aria-label="Search media" prefix={<Icon name="search" size={14} />} /></div>
        {["Mammal", "Bird", "Reptile", "Plant"].map((k) => <button key={k} className={`adm-pill ${kinds.includes(k) ? "is-on" : ""}`} aria-pressed={kinds.includes(k)} onClick={() => setKinds((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k]))}>{k}</button>)}
        <Select value={year} onChange={setYear} aria-label="Year" options={["all", "2024", "2025", "2026"]} /><Checkbox checked={fav} onChange={setFav} label="Favourites" /><span className="adm-spacer" /><Checkbox checked={sel.size > 0 && sel.size === shown.length} indeterminate={sel.size > 0 && sel.size < shown.length} onChange={(v) => setSel(v ? new Set(shown.map((s) => s.id)) : new Set())} label="Select all" /></div>
      {sel.size > 0 && <div className="adm-bulk" style={{ marginBottom: 12, borderRadius: 6 }}><b>{sel.size} selected</b><span className="adm-spacer" /><Btn sm onClick={() => bulk("Favourited", () => setItems((x) => x.map((m) => (sel.has(m.id) ? { ...m, fav: true } : m))))}>Favourite</Btn><Btn sm onClick={() => bulk("Removed", () => setItems((x) => x.filter((m) => !sel.has(m.id))))}>Remove</Btn><Btn sm variant="ghost" onClick={() => setSel(new Set())}>Clear</Btn></div>}
      {shown.length === 0 ? <EmptyState spot="no-results" title="No media matches">Adjust the filters.</EmptyState> : <div className="vw-files" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>{shown.map((m, i) => (
        <div key={m.id} className={`vw-file ${sel.has(m.id) ? "is-sel" : ""}`} style={{ cursor: "default" }}><div className="vw-thumb"><Checkbox checked={sel.has(m.id)} onChange={() => toggle(m.id)} label={<span className="adm-sr">Select {m.name}</span>} /><button className="adm-x" style={{ position: "absolute", top: 4, insetInlineEnd: 4, color: m.fav ? "var(--jp-warn)" : undefined }} aria-pressed={m.fav} aria-label={`Favourite ${m.name}`} onClick={() => setItems((x) => x.map((y) => (y.id === m.id ? { ...y, fav: !y.fav } : y)))}><Icon name="star" size={15} /></button><button style={{ all: "unset", cursor: "zoom-in" }} aria-label={`Open ${m.name}`} onClick={() => setLb(i)}><Spot name={m.spot} size={70} /></button></div><b style={{ fontSize: "var(--jp-fs-xs)" }}>{m.name}</b><span className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>{m.kind} · {m.year} · {bytes(m.size)}</span></div>))}</div>}
      <Modal open={lb !== null && !!shown[lb]} onClose={() => setLb(null)} title={shown[lb ?? 0]?.name ?? ""} size="md" footer={<><Btn onClick={() => setLb((i) => ((i ?? 0) - 1 + shown.length) % shown.length)}>← Prev</Btn><span className="adm-spacer" /><Btn onClick={() => setLb((i) => ((i ?? 0) + 1) % shown.length)}>Next →</Btn></>}><div className="vw-thumb" style={{ aspectRatio: "4/3" }}>{shown[lb ?? 0] && <Spot name={shown[lb ?? 0].spot} size={260} />}</div></Modal>
    </>
  );
}

/* ============ A033 Timeline / roadmap / Gantt ============ */
const MONTHS = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
export function Roadmap() {
  const { toast } = usePrefs(); const [items, setItems] = useState(roadSeed); const [lane, setLane] = useState("all"); const [px, setPx] = useState("60"); const [selId, setSelId] = useState<string | null>(null); const PX = Number(px);
  const lanes = [...new Set(items.map((i) => i.lane))].filter((l) => lane === "all" || l === lane);
  const upd = (id: string, d: { start?: number; end?: number }) => setItems((x) => x.map((i) => { if (i.id !== id) return i; const s = Math.max(0, Math.min(11, d.start ?? i.start)), e = Math.max(s + 1, Math.min(12, d.end ?? i.end)); return { ...i, start: s, end: e }; }));
  const sel = items.find((i) => i.id === selId);
  const onKey = (e: React.KeyboardEvent, i: (typeof items)[0]) => { if (e.key === "ArrowRight") { e.preventDefault(); e.shiftKey ? upd(i.id, { end: i.end + 1 }) : upd(i.id, { start: i.start + 1, end: i.end + 1 }); } if (e.key === "ArrowLeft") { e.preventDefault(); e.shiftKey ? upd(i.id, { end: i.end - 1 }) : upd(i.id, { start: i.start - 1, end: i.end - 1 }); } };
  return (
    <>
      <PageHeader title="Roadmap" crumbs={["Views", "Roadmap"]} desc="A Gantt across 12 months, grouped by lane. Drag a bar, or focus it and use ←/→ to move and Shift+←/→ to resize." actions={<><Select value={lane} onChange={setLane} aria-label="Lane" options={["all", ...new Set(items.map((i) => i.lane))]} /><Segmented label="Zoom" value={px} onChange={setPx} options={[{ value: "40", label: "Year" }, { value: "60", label: "Half" }, { value: "90", label: "Quarter" }]} /></>} />
      <Panel flush><div className="vw-gantt"><div style={{ minWidth: 170 + 13 * PX }}>
        <div className="vw-gantt__head"><span /><div style={{ display: "grid", gridTemplateColumns: `repeat(13, ${PX}px)` }}>{MONTHS.map((m, i) => <div key={i} className="vw-gantt__month">{m}</div>)}</div></div>
        {lanes.map((l) => { const its = pack(items.filter((i) => i.lane === l)); const rows = Math.max(...its.map((i) => i.row)) + 1; return (
          <div key={l} className="vw-gantt__row" style={{ borderTop: "1px solid var(--jp-border)" }}><b style={{ padding: 10 }}>{l}</b>
            <div className="vw-gantt__lane" style={{ height: rows * 32 + 8 }}>{its.map((i) => <button key={i.id} className={`vw-gantt__bar ${i.st === "done" ? "is-done" : i.st === "risk" ? "is-risk" : ""}`} style={{ left: i.start * PX + 2, width: (i.end - i.start) * PX - 4, top: 4 + i.row * 32 }} draggable onDragStart={(e) => e.dataTransfer.setData("text", `${i.id}:${e.clientX}`)} onKeyDown={(e) => onKey(e, i)} onClick={() => setSelId(i.id)} title={`${i.title}: ${MONTHS[i.start]} to ${MONTHS[i.end]}`} aria-label={`${i.title}, ${MONTHS[i.start]} to ${MONTHS[i.end]}`}>{i.title}</button>)}
              <div style={{ position: "absolute", inset: 0 }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const [id, x0] = e.dataTransfer.getData("text").split(":"); const d = Math.round((e.clientX - Number(x0)) / PX); const it = items.find((x) => x.id === id); if (it && d) upd(id, { start: it.start + d, end: it.end + d }); }} aria-hidden /></div></div>); })}
        <div style={{ position: "relative", height: 0 }}><div className="vw-gantt__today" style={{ left: 170 + 0.4 * PX, top: -(lanes.length * 44 + 40), height: lanes.length * 44 + 40 }} title="Today" /></div>
      </div></div></Panel>
      <Drawer open={!!sel} onClose={() => setSelId(null)} title={sel?.title ?? ""} footer={<Btn onClick={() => setSelId(null)}>Close</Btn>}>{sel && <div className="adm-stack"><Badge s={sel.st === "done" ? "ok" : sel.st === "risk" ? "warn" : "info"}>{sel.st || "planned"}</Badge><p>{MONTHS[sel.start]} → {MONTHS[sel.end]} · {sel.end - sel.start} months · lane {sel.lane}</p>
        <div className="adm-row"><Btn sm onClick={() => upd(sel.id, { start: sel.start - 1, end: sel.end - 1 })}>← Earlier</Btn><Btn sm onClick={() => upd(sel.id, { start: sel.start + 1, end: sel.end + 1 })}>Later →</Btn><Btn sm onClick={() => upd(sel.id, { end: sel.end + 1 })}>Extend</Btn><Btn sm onClick={() => upd(sel.id, { end: sel.end - 1 })}>Shorten</Btn></div>
        <Select value={sel.st} onChange={(v) => { setItems((x) => x.map((i) => (i.id === sel.id ? { ...i, st: v } : i))); toast({ kind: "ok", title: "Status updated" }); }} aria-label="Status" options={[{ value: "", label: "planned" }, { value: "risk", label: "at risk" }, { value: "done", label: "done" }]} /></div>}</Drawer>
    </>
  );
}

/* ============ A034 Map view ============ */
export function MapView() {
  const [zoom, setZoom] = useState(1); const [layers, setLayers] = useState({ zones: true, pins: true }); const [selId, setSelId] = useState<string | null>(null); const [zone, setZone] = useState("all"); const [hov, setHov] = useState<string | null>(null); const [kind, setKind] = useState("all");
  const pts = mapPts.filter((p) => kind === "all" || p.kind === kind).filter((p) => zone === "all" || pointInPolygon(p.x, p.y, zones.find((z) => z.id === zone)!.poly));
  const cells = cluster(pts.map((p) => ({ id: p.id, x: p.x, y: p.y })), zoom >= 2 ? 1 : 90 / zoom); const sel = mapPts.find((p) => p.id === selId); const col = { ok: "var(--jp-ok)", warn: "var(--jp-warn)", danger: "var(--jp-danger)" } as const;
  const vb = { w: 620 / zoom, h: 380 / zoom }; const cx = sel ? sel.x : 310, cy = sel ? sel.y : 190; const x0 = Math.min(620 - vb.w, Math.max(0, cx - vb.w / 2)), y0 = Math.min(380 - vb.h, Math.max(0, cy - vb.h / 2));
  return (
    <>
      <PageHeader title="Map" crumbs={["Views", "Map"]} desc="Sites on a stylised map with zone polygons, marker clustering that changes with zoom, and a list that follows the filters." actions={<><Segmented label="Kind" value={kind} onChange={setKind} options={["all", "depot", "site", "locker"].map((v) => ({ value: v, label: v }))} /><Select value={zone} onChange={setZone} aria-label="Zone" options={[{ value: "all", label: "All zones" }, ...zones.map((z) => ({ value: z.id, label: z.name }))]} /></>} />
      <div className="adm-grid adm-grid--21">
        <Panel title={`${pts.length} sites`} actions={<><Checkbox checked={layers.zones} onChange={(v) => setLayers({ ...layers, zones: v })} label="Zones" /><Btn sm aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(4, z + 0.5))}>+</Btn><Btn sm aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(1, z - 0.5))}>−</Btn></>}>
          <svg className="vw-map" viewBox={`${x0} ${y0} ${vb.w} ${vb.h}`} role="group" aria-label="Map of sites">
            <path d="M20 60 C90 10 240 20 330 30 S560 20 600 90 580 250 540 330 300 360 180 345 20 300 20 60Z" fill="var(--jp-surface-raised)" stroke="var(--jp-border)" strokeWidth="2" />
            {layers.zones && zones.map((z) => <g key={z.id}><polygon points={z.poly.map((p) => p.join(",")).join(" ")} fill="var(--jp-accent)" fillOpacity={zone === z.id ? 0.22 : 0.08} stroke="var(--jp-accent)" strokeDasharray="4 3" /><text x={z.poly[0][0] + 8} y={z.poly[0][1] + 16}>{z.name}</text></g>)}
            {cells.map((c, i) => c.ids.length > 1 ? <g key={i} className="vw-pin" tabIndex={0} role="button" aria-label={`${c.ids.length} sites, zoom in`} onClick={() => { setSelId(c.ids[0]); setZoom((z) => Math.min(4, z + 1)); }} onKeyDown={(e) => e.key === "Enter" && setZoom((z) => Math.min(4, z + 1))}><circle cx={c.x} cy={c.y} r={10 + c.ids.length} fill="var(--jp-accent)" /><text x={c.x} y={c.y + 3} textAnchor="middle" style={{ fill: "var(--jp-on-accent)", fontWeight: 700 }}>{c.ids.length}</text></g>
              : (() => { const p = mapPts.find((m) => m.id === c.ids[0])!; return <g key={i} className="vw-pin" tabIndex={0} role="button" aria-label={`${p.name}, ${p.status}`} onClick={() => setSelId(p.id)} onKeyDown={(e) => e.key === "Enter" && setSelId(p.id)} onMouseEnter={() => setHov(p.id)} onMouseLeave={() => setHov(null)}><circle cx={p.x} cy={p.y} r={selId === p.id || hov === p.id ? 9 : 6} fill={col[p.status]} stroke="var(--jp-bg)" strokeWidth="2" /></g>; })())}
          </svg>
          <p className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)", marginTop: 6 }}>Stylised, not a real map. Clusters split as you zoom.</p></Panel>
        <Panel title="Sites" flush><ul className="adm-list" style={{ maxHeight: 420, overflow: "auto" }}>{pts.map((p) => <li key={p.id} style={{ cursor: "pointer", background: selId === p.id || hov === p.id ? "color-mix(in oklab, var(--jp-accent) 12%, transparent)" : undefined }} onClick={() => { setSelId(p.id); setZoom((z) => Math.max(z, 2)); }} onMouseEnter={() => setHov(p.id)} onMouseLeave={() => setHov(null)}><span className={`adm-dot adm-dot--${p.status}`} /><b style={{ flex: 1 }}>{p.name}</b><Badge>{p.kind}</Badge></li>)}{!pts.length && <li className="jp-muted">No sites in this zone.</li>}</ul></Panel>
      </div>
    </>
  );
}

/* ============ A035 Org chart / team directory ============ */
export function OrgChart() {
  const [tab, setTab] = useState("chart"); const [q, setQ] = useState(""); const [sel, setSel] = useState<Person | null>(org[0]); const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const kids = (name: string | null) => org.filter((p) => p.boss === name); const hit = (p: Person) => !!q && (p.name + p.role + p.team).toLowerCase().includes(q.toLowerCase());
  const Branch = ({ p }: { p: Person }) => { const k = kids(p.name); const c = collapsed.has(p.id); return (
    <div className="vw-org__branch"><button className="vw-org__node" aria-pressed={sel?.id === p.id} onClick={() => setSel(p)} style={hit(p) ? { borderColor: "var(--jp-warn)", boxShadow: "0 0 0 2px var(--jp-warn)" } : undefined}><Avatar name={p.name} size={30} /><b>{p.name}</b><span className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>{p.role}</span></button>
      {k.length > 0 && <button className="adm-x" aria-expanded={!c} aria-label={`${c ? "Expand" : "Collapse"} ${p.name}'s reports`} onClick={() => setCollapsed((s) => { const n = new Set(s); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })}>{c ? `+${k.length}` : "−"}</button>}
      {k.length > 0 && !c && <div className="vw-org__kids">{k.map((x) => <Branch key={x.id} p={x} />)}</div>}</div>); };
  const list = org.filter((p) => !q || (p.name + p.role + p.team).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader title="Org chart and directory" crumbs={["Views", "Org"]} desc="Collapsible reporting lines, search that highlights matches, and a directory table." tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: "chart", label: "Org chart" }, { id: "dir", label: "Directory", count: org.length }]} />} actions={<div style={{ width: 220 }}><TextInput value={q} onChange={setQ} placeholder="Search people, roles, teams…" aria-label="Search people" prefix={<Icon name="search" size={14} />} /></div>} />
      <div className="adm-grid adm-grid--21">
        {tab === "chart" ? <Panel><div className="vw-org"><Branch p={org[0]} /></div></Panel>
          : <Panel flush><table className="jp-table"><thead><tr><th>Name</th><th>Role</th><th>Team</th><th>Location</th><th>Reports to</th></tr></thead><tbody>{list.map((p) => <tr key={p.id} onClick={() => setSel(p)} style={{ cursor: "pointer" }}><td><span className="adm-row"><Avatar name={p.name} size={24} />{p.name}</span></td><td>{p.role}</td><td><Badge>{p.team}</Badge></td><td>{p.loc}</td><td>{p.boss ?? "—"}</td></tr>)}</tbody></table>{!list.length && <EmptyState spot="no-results" title="No one matches">Try another search.</EmptyState>}</Panel>}
        <Panel title="Details">{sel ? <div className="adm-stack"><div className="adm-row"><Avatar name={sel.name} size={48} /><div><b>{sel.name}</b><div className="jp-muted">{sel.role}</div></div></div><dl className="adm-dl" style={{ gridTemplateColumns: "90px 1fr" }}><dt>Team</dt><dd>{sel.team}</dd><dt>Location</dt><dd>{sel.loc}</dd><dt>Email</dt><dd><a href={`mailto:${sel.email}`}>{sel.email}</a></dd><dt>Reports to</dt><dd>{sel.boss ?? "—"}</dd><dt>Direct reports</dt><dd>{kids(sel.name).length}</dd></dl></div> : <p className="jp-muted">Select a person.</p>}</Panel>
      </div>
    </>
  );
}

/* ============ A036 Inventory / asset register ============ */
const sMap: Record<Asset["status"], Status> = { "in-use": "ok", spare: "info", repair: "warn", retired: "danger" };
export function Assets() {
  const { toast } = usePrefs(); const ws = useWs(); const [co, setCo] = useState<Asset | null>(null); const [who, setWho] = useState(""); const [qr, setQr] = useState<Asset | null>(null);
  const cols: Col<Asset>[] = useMemo(() => [{ key: "id", header: "Tag", width: 100, pin: "left", render: (a) => <b className="adm-num">{a.id}</b> }, { key: "name", header: "Asset", width: 200, filter: "text", edit: "text" }, { key: "type", header: "Type", width: 120, filter: "select" }, { key: "location", header: "Location", width: 120, filter: "select" }, { key: "status", header: "Status", width: 110, render: (a) => <Badge s={sMap[a.status]}>{a.status}</Badge> }, { key: "holder", header: "Checked out to", width: 150, value: (a) => a.holder ?? "", render: (a) => a.holder ?? <span className="jp-muted">in storage</span> }, { key: "cost", header: "Cost", width: 100, align: "right", agg: "sum", fmt: money, render: (a) => money(a.cost) }, { key: "bought", header: "Bought", width: 110 }], []);
  const total = ws.assets.reduce((a, x) => a + x.cost, 0); const patch = (id: string, p: Partial<Asset>, msg: string) => { const old = ws.assets; wsActions.setAssets(ws.assets.map((a) => (a.id === id ? { ...a, ...p } : a))); toast({ kind: "ok", title: msg, undo: () => wsActions.setAssets(old) }); };
  return (
    <>
      <PageHeader title="Asset register" crumbs={["Views", "Assets"]} desc="Every piece of kit: where it is, who has it, what it cost. Check in and out, send for repair, archive, print a label." />
      <div className="adm-grid adm-grid--4"><StatTile label="Assets" value={String(ws.assets.length)} /><StatTile label="Total cost" value={money(total)} /><StatTile label="Checked out" value={String(ws.assets.filter((a) => a.holder).length)} /><StatTile label="In repair" value={String(ws.assets.filter((a) => a.status === "repair").length)} /></div>
      <Panel flush className="adm-section"><DataTable<Asset> rows={ws.assets} cols={cols} pageSize={8} exportName="assets" facet={{ key: "status", label: "Status", options: [{ value: "in-use" }, { value: "spare" }, { value: "repair" }, { value: "retired" }] }}
        onEdit={(a, k, v) => patch(a.id, { [k]: v } as Partial<Asset>, `Renamed ${a.id}`)}
        rowActions={(a) => [{ label: a.holder ? "Check in" : "Check out…", onSelect: () => (a.holder ? patch(a.id, { holder: undefined, status: "spare" }, `${a.id} checked in`) : (setCo(a), setWho("")) ) }, { label: "Send for repair", onSelect: () => patch(a.id, { status: "repair" }, `${a.id} sent for repair`) }, { label: "Print label…", onSelect: () => setQr(a) }, { label: "Archive", danger: true, onSelect: () => { wsActions.archiveAsset(a.id); toast({ kind: "warn", title: `${a.name} archived`, undo: () => wsActions.unarchive(a.id) }); } }]} /></Panel>
      <Modal open={!!co} onClose={() => setCo(null)} title={`Check out ${co?.name}`} size="sm" footer={<><Btn onClick={() => setCo(null)}>Cancel</Btn><Btn variant="primary" disabled={!who} onClick={() => { if (co) patch(co.id, { holder: who, status: "in-use" }, `${co.id} checked out to ${who}`); setCo(null); }}>Check out</Btn></>}><Field label="Person" required>{(id) => <Select id={id} value={who} onChange={setWho} options={[{ value: "", label: "Choose…" }, ...org.map((p) => p.name)]} />}</Field></Modal>
      <Modal open={!!qr} onClose={() => setQr(null)} title="Asset label" size="sm" footer={<Btn onClick={() => setQr(null)}>Close</Btn>}>{qr && <div className="adm-row" style={{ gap: 20 }}><div className="vw-asset-qr" aria-label="Placeholder code pattern">{Array.from({ length: 81 }, (_, i) => <i key={i} className={((i * 7 + [...qr.serial].reduce((a, c) => a + c.charCodeAt(0), 0)) % 3) ? "off" : ""} />)}</div><div><b>{qr.name}</b><div className="adm-num">{qr.id}</div><div className="jp-muted">S/N {qr.serial}</div><p className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>Pattern is decorative, not a scannable QR code.</p></div></div>}</Modal>
    </>
  );
}
void NOW0;
