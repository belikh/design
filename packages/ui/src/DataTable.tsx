import { Fragment, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigationType, useSearchParams } from "react-router-dom";
import { Badge, Btn, Drawer, EmptyState, Menu, Modal, Pagination, Skeleton } from "./kit.tsx";
import { Checkbox } from "./inputs.tsx";
import { Editable, defaultDisplay, type SaveMeta, type EditorSpec, type EditValue, type Validate } from "./editable.tsx";
import { BulkEditPanel, type BulkField } from "./BulkEditPanel.tsx";
import { planBulk, runBulk } from "./bulkEdit.ts";
import { usePrefsOptional } from "./store.tsx";
import { usePublishSelection } from "./selection.ts";
import { applyChips, chipLabel, loadViews, needsValue, OP_LABEL, opsFor as chipOps, saveViews, type Chip, type ChipOp, type SavedView } from "./tableFilters.ts";
import { FieldEditor, isEmpty, validateSpec } from "./editable.tsx";
import { Icon } from "./Icon.tsx";
import "./dataTable.css";
import { AGG_LABEL, aggregate, cellFx, columnStats, groupRows, isNum, numStats, type Agg, type CondFormat, type GroupNode } from "./tableUtils.ts";
import { buildPdf, buildXlsx, download, toCsv, toJson, toMarkdown, toTsv, type Cell } from "./tableExport.ts";

export type { Agg, CondFormat } from "./tableUtils.ts";
export type Col<T> = {
  key: string; header: string; width?: number; align?: "right"; sortable?: boolean; filter?: "text" | "select"; hidden?: boolean; pin?: "left" | "right";
  value?: (r: T) => string | number; render?: (r: T) => ReactNode; edit?: "text" | "number"; /** Return a reason to lock this cell (shows a lock and blocks editing, bulk edit and paste). */ locked?: (r: T) => string | undefined;
  /** Typed in-place editor (text, number, select, date, tags, boolean). `edit` is a shorthand for text or number. */ editor?: EditorSpec; validate?: (v: EditValue, r: T) => string | null | undefined; agg?: Agg; fmt?: (v: number) => string;
  /** Header group label: contiguous columns with the same group share a top header cell (multi-row headers). */ group?: string;
  /** Draw the header text vertically (for narrow numeric columns). */ rotate?: boolean;
  /** Conditional format: colour scale, data bars, icon set or highlight rules. */ cf?: CondFormat;
};
type Sort = { key: string; dir: 1 | -1 }[];
type State = "ready" | "loading" | "error" | "empty";
export type ExportFormat = "csv" | "json" | "xlsx" | "pdf" | "md" | "tsv";
export type ServerQuery = { q: string; sort: { key: string; dir: 1 | -1 }[]; filters: Record<string, string>; facet: string | null; page: number; size: number; append: boolean };
/** Server-side mode: sorting, filtering and paging are delegated to `onQuery`; `rows` is the current page (or the accumulated rows in "more" mode). */
export type ServerConfig = { total: number; estimated?: boolean; mode?: "pages" | "more"; loading?: boolean; onQuery: (q: ServerQuery) => void };
type Item<T> = { k: "group"; g: GroupNode<T>; collapsed: boolean } | { k: "row"; r: T; depth: number; idx: number };

const EXPORT_LABEL: Record<ExportFormat, string> = { csv: "CSV", json: "JSON", xlsx: "Excel (.xlsx)", pdf: "PDF", md: "Copy as Markdown", tsv: "Copy for spreadsheet (TSV)" };
const ROW_MIME = "application/x-jp-row"; const COL_MIME = "application/x-jp-col";
const textW = (s: string, el?: Element | null) => { try { const c = document.createElement("canvas").getContext("2d"); if (c && el) { const cs = getComputedStyle(el); c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; return c.measureText(s).width; } } catch { /* jsdom */ } return s.length * 7.6; };

export function DataTable<T extends { id: string }>({
  rows: all, cols: initial, facet, rowActions, expand, onEdit, onCommit, onAdd, peek, peekRelated, views, bulk, pageSize: ps = 10, state = "ready", virtual, rowHeight = 40, severity, groupBy, selectable = true, exportName = "export", getChildren, urlKey: urlKeyProp,
  groupBar, exports, headerMenu = true, pinnable, pinnedTop, pinnedBottom, maxHeight, rangeSelect, reorderable, onReorder, dragGroup, onReceive, onMoveOut, diff, flash, toolbar, rowError, findable, layoutMenu, server, ariaLabel,
}: {
  rows: T[]; cols: Col<T>[]; facet?: { key: string; label: string; options: { value: string; s?: "ok" | "warn" | "danger" | "info" }[] }; rowActions?: (r: T) => { label: string; onSelect: () => void; danger?: boolean }[];
  expand?: (r: T) => ReactNode; onEdit?: (r: T, key: string, v: string) => void;
  /** Typed save for in-place and bulk edits. Return an error string (or reject) to roll the edit back. Preferred over `onEdit`. */ onCommit?: (r: T, key: string, v: EditValue, meta?: SaveMeta) => void | string | null | Promise<void | string | null>; bulk?: { label: string; onRun: (ids: string[]) => void; danger?: boolean }[]; pageSize?: number; state?: State;
  virtual?: boolean; rowHeight?: number; severity?: (r: T) => "ok" | "warn" | "danger" | undefined; selectable?: boolean; exportName?: string;
  /** Group rows by one column, or several for multi-level grouping. Group rows show per-column aggregates (columns with `agg`). */ groupBy?: string | string[];
  /** Tree rows: return child rows to show under a parent (expandable). */ getChildren?: (r: T) => T[] | undefined;
  /** Persist search, facet, sort and page in the URL under this prefix (shareable links). */ urlKey?: string;
  /** Show a "drag a column header here to group" bar (with a keyboard alternative in the header menu). */ groupBar?: boolean;
  /** Offer these export formats in an Export menu (default: a single "Export CSV" button). Exports the selection if any, else all filtered rows. */ exports?: ExportFormat[];
  /** Per-column header menu: sort, hide, pin, aggregate picker, auto-fit, group by, statistics, conditional format. */ headerMenu?: boolean;
  /** Let users pin rows to the top or bottom (they stay visible while scrolling; pair with `maxHeight`). */ pinnable?: boolean; pinnedTop?: string[]; pinnedBottom?: string[]; maxHeight?: number;
  /** Excel-style cell range selection (drag, Shift+click, Shift+arrows) with a sum / average / count status bar and Ctrl+C. */ rangeSelect?: boolean;
  /** Drag handle column to reorder rows (Alt+Arrow keys alternative). `onReorder` gets the full new row order. Disabled while sorted or filtered. */ reorderable?: boolean; onReorder?: (next: T[]) => void;
  /** Tables sharing a `dragGroup` accept rows dragged from each other: target gets `onReceive`, source gets `onMoveOut`. */ dragGroup?: string; onReceive?: (row: T, beforeId: string | null) => void; onMoveOut?: (id: string) => void;
  /** Compare against an earlier snapshot: added, removed and changed cells are marked. */ diff?: { before: T[] };
  /** Flash cells that change and highlight newly inserted rows (live data). */ flash?: boolean;
  /** Extra controls rendered in the toolbar. */ toolbar?: ReactNode;
  /** Row-level error marker: return a message to show an error icon in the first cell. */ rowError?: (r: T) => string | undefined;
  /** Ctrl/Cmd+F opens an in-table find bar with highlight and next/previous. */ findable?: boolean;
  /** Menu for text wrapping and row height. */ layoutMenu?: boolean;
  /** Inline "add row" at the bottom: shows an editor per editable column. Return an error string (or reject) to keep the row open. */ onAdd?: (values: Record<string, EditValue>) => void | string | null | Promise<void | string | null>;
  /** Row peek: a side preview. `true` shows the visible columns; or render your own. Opens from the row button or Shift+Space. */ peek?: boolean | ((r: T) => ReactNode);
  /** Rows related to the peeked one. They are listed in the peek panel; choosing one opens it on top (Back returns), so you can follow links without losing your place. */ peekRelated?: (r: T) => T[];
  /** Saved views (columns, filters, sort, grouping). Pass a storage key, or `true` to use `urlKey` / `exportName`. */ views?: boolean | string;
  /** Delegate sorting, filtering and paging to the server. */ server?: ServerConfig; ariaLabel?: string;
}) {
  const urlKey = urlKeyProp ?? (ariaLabel ? ariaLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : undefined);
  const [sp, setSp] = useSearchParams(); const uk = (k: string) => (urlKey ? `${urlKey}.${k}` : ""); const tid = useId();
  const [cols, setCols] = useState(initial);
  const [q, setQ] = useState(() => (urlKey ? sp.get(uk("q")) ?? "" : "")); const [colFilter, setColFilter] = useState<Record<string, string>>({}); const [facetV, setFacetV] = useState<string | null>(() => (urlKey ? sp.get(uk("f")) : null));
  const [sort, setSort] = useState<Sort>(() => { const v = urlKey ? sp.get(uk("s")) : null; return v ? v.split(",").map((x) => ({ key: x.replace(/^-/, ""), dir: x.startsWith("-") ? -1 as const : 1 as const })) : []; }); const [page, setPage] = useState(() => (urlKey ? Number(sp.get(uk("p")) || 1) : 1)); const [treeOpen, setTreeOpen] = useState<Set<string>>(new Set()); const [size, setSize] = useState(ps);
  // Back and forward restore the checked rows (not a fresh visit): remembered per page and table for this browser session.
  const loc = useLocation(); const navType = useNavigationType(); const selKey = urlKey ? `jp-sel:${loc.pathname}:${urlKey}` : null;
  const [sel, setSel] = useState<Set<string>>(() => { if (!selKey || navType !== "POP") return new Set(); try { const v = JSON.parse(sessionStorage.getItem(selKey) ?? "[]"); return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []); } catch { return new Set(); } });
  useEffect(() => { if (!selKey) return; try { if (sel.size) sessionStorage.setItem(selKey, JSON.stringify([...sel])); else sessionStorage.removeItem(selKey); } catch { /* storage unavailable */ } }, [sel, selKey]); const [allSel, setAllSel] = useState(false); const [open, setOpen] = useState<Set<string>>(new Set());
  const [edit, setEdit] = useState<{ id: string; key: string; seed?: string } | null>(null); const [zebra, setZebra] = useState(false); const [focus, setFocus] = useState<[number, number]>([0, 0]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set()); const [scrollTop, setScrollTop] = useState(0);
  const [groupKeys, setGroupKeys] = useState<string[]>(() => (groupBy === undefined ? [] : Array.isArray(groupBy) ? groupBy : [groupBy]));
  const [aggOv, setAggOv] = useState<Record<string, Agg | null>>({}); const [cfOv, setCfOv] = useState<Record<string, CondFormat | null>>({});
  const [pinTop, setPinTop] = useState<string[]>(pinnedTop ?? []); const [pinBottom, setPinBottom] = useState<string[]>(pinnedBottom ?? []);
  const [totalsScope, setTotalsScope] = useState<"filtered" | "page" | "selected">("filtered");
  const [textMode, setTextMode] = useState<"default" | "wrap" | "truncate">("default"); 
  const [range, setRange] = useState<{ a: [number, number]; b: [number, number] } | null>(null); const dragging = useRef(false);
  const [dragOver, setDragOver] = useState<string | null>(null); const [announce, setAnnounce] = useState(""); const droppedHere = useRef(false);
  const [showDiff, setShowDiff] = useState(true); const [find, setFind] = useState<{ open: boolean; q: string; i: number }>({ open: false, q: "", i: 0 }); const [statsCol, setStatsCol] = useState<string | null>(null);
  const [note, setNote] = useState(""); const [footH, setFootH] = useState(0); const [headH, setHeadH] = useState(0); const [head1H, setHead1H] = useState(0); const [rowH, setRowH] = useState(40);
  const [flashing, setFlashing] = useState<{ cells: Set<string>; rows: Set<string> }>({ cells: new Set(), rows: new Set() });
  const wrapRef = useRef<HTMLDivElement>(null); const footRef = useRef<HTMLTableSectionElement>(null); const headRef = useRef<HTMLTableSectionElement>(null); const row1Ref = useRef<HTMLTableRowElement>(null); const findRef = useRef<HTMLInputElement>(null);
  const prefs = usePrefsOptional(); const [bulkOpen, setBulkOpen] = useState(false);
  const [chips, setChips] = useState<Chip[]>([]); const [chipDraft, setChipDraft] = useState<{ key: string; op: ChipOp; value: string } | null>(null);
  const [peekStack, setPeekStack] = useState<string[]>([]); const peekId = peekStack[peekStack.length - 1] ?? null; const setPeekId = (id: string | null) => setPeekStack((s) => (id === null ? [] : [...s, id])); const [compare, setCompare] = useState(false); const [fillPending, setFillPending] = useState(false); const [adding, setAdding] = useState(false); const [newVals, setNewVals] = useState<Record<string, { v?: EditValue; err: string | null }>>({}); const [addErr, setAddErr] = useState("");
  const viewKey = views === true ? (urlKey ?? exportName) : typeof views === "string" ? views : null; const [saved, setSaved] = useState<SavedView[]>(() => (viewKey ? loadViews(viewKey) : [])); const [naming, setNaming] = useState<string | null>(null);
  const val = (r: T, c: Col<T>) => (c.value ? c.value(r) : (r as unknown as Record<string, string | number>)[c.key]);
  const vis = cols.filter((c) => !c.hidden); const colOf = (k: string) => cols.find((c) => c.key === k);
  const aggOf = (c: Col<T>): Agg | undefined => (c.key in aggOv ? aggOv[c.key] ?? undefined : c.agg); const cfOf = (c: Col<T>): CondFormat | undefined => (c.key in cfOv ? cfOv[c.key] ?? undefined : c.cf);
  const specOf = (c: Col<T>): EditorSpec | undefined => c.editor ?? (c.edit ? { type: c.edit } : undefined);
  const canEdit = !!(onCommit || onEdit);
  const save = (r: T, c: Col<T>, v: EditValue, meta?: SaveMeta) => (onCommit ? onCommit(r, c.key, v, meta) : (onEdit?.(r, c.key, String(v)), undefined));
  const rawVal = (r: T, c: Col<T>) => { const raw = (r as unknown as Record<string, EditValue | undefined>)[c.key]; return raw !== undefined ? raw : c.value ? c.value(r) : raw; };
  const editFields: BulkField<T>[] = cols.filter((c) => specOf(c) && specOf(c)!.type !== "textarea").map((c) => ({ key: c.key, header: c.header, editor: specOf(c)!, validate: (v: EditValue, r: T) => (c.locked?.(r) ? `Locked: ${c.locked(r)}` : c.validate?.(v, r)), get: (r: T) => rawVal(r, c) }));
  const hasAct = !!(rowActions || expand || pinnable || peek); const lead = (selectable ? 1 : 0) + (reorderable ? 1 : 0); const hasGroupHdr = vis.some((c) => c.group); const srv = !!server;

  // ---------- query pipeline ----------
  const filtered = useMemo(() => {
    if (srv) return all;
    let x = all;
    if (facetV && facet) x = x.filter((r) => String(val(r, colOf(facet.key)!)) === facetV);
    if (q) { const s = q.toLowerCase(); x = x.filter((r) => cols.some((c) => String(val(r, c)).toLowerCase().includes(s))); }
    for (const [k, v] of Object.entries(colFilter)) if (v) { const c = colOf(k)!; x = x.filter((r) => String(val(r, c)).toLowerCase().includes(v.toLowerCase())); }
    x = applyChips(x, chips, (r, k) => { const c = colOf(k); return c ? val(r, c) : undefined; });
    if (sort.length) x = [...x].sort((a, b) => { for (const s of sort) { const c = colOf(s.key)!; const A = val(a, c), B = val(b, c); if (A !== B) return (A > B ? 1 : -1) * s.dir; } return 0; });
    return x;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, q, colFilter, facetV, sort, cols, srv, chips]);
  const pinnedSet = useMemo(() => new Set([...pinTop, ...pinBottom]), [pinTop, pinBottom]);
  const flow = useMemo(() => (pinnedSet.size ? filtered.filter((r) => !pinnedSet.has(r.id)) : filtered), [filtered, pinnedSet]);
  const total = srv ? server!.total : flow.length; const pages = Math.max(1, Math.ceil(total / size));
  useEffect(() => { if (page > pages) setPage(1); }, [pages, page]);
  const pageRows = srv || virtual ? flow : flow.slice((page - 1) * size, page * size);
  const vh = maxHeight ?? 420, start = virtual ? Math.max(0, Math.floor(scrollTop / rowHeight) - 4) : 0, end = virtual ? Math.min(flow.length, start + Math.ceil(vh / rowHeight) + 8) : pageRows.length;
  const shown = virtual ? pageRows.slice(start, end) : pageRows;
  const pinTopRows = pinTop.map((id) => all.find((r) => r.id === id)).filter(Boolean) as T[]; const pinBotRows = pinBottom.map((id) => all.find((r) => r.id === id)).filter(Boolean) as T[];

  useEffect(() => {
    if (!urlKey) return;
    setSp((prev) => { const n = new URLSearchParams(prev); const set = (k: string, v: string | null) => (v ? n.set(uk(k), v) : n.delete(uk(k)));
      set("q", q || null); set("f", facetV); set("s", sort.length ? sort.map((x) => (x.dir === -1 ? "-" : "") + x.key).join(",") : null); set("p", page > 1 ? String(page) : null); return n; }, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, facetV, sort, page]);

  // server mode: one query per change (search and column filters debounced), plus the first load
  const appendRef = useRef(false); const lastQ = useRef("");
  useEffect(() => {
    if (!server) return; const query: ServerQuery = { q, sort, filters: colFilter, facet: facetV, page, size, append: appendRef.current }; const sig = JSON.stringify(query); if (sig === lastQ.current) return;
    const t = setTimeout(() => { lastQ.current = sig; server.onQuery(query); appendRef.current = false; }, lastQ.current ? 250 : 0); return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, sort, colFilter, facetV, page, size, !!server]);

  // ---------- grouping, tree and the flat row list ----------
  const tree = useMemo(() => (groupKeys.length ? groupRows(shown, groupKeys.map((k) => (r: T) => String(val(r, colOf(k)!)))) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shown, groupKeys, cols]);
  const items = useMemo(() => {
    const out: Item<T>[] = []; let idx = 0;
    const pushRow = (r: T, depth: number) => { out.push({ k: "row", r, depth, idx: idx++ }); if (getChildren && treeOpen.has(r.id)) getChildren(r)?.forEach((ch) => pushRow(ch, depth + 1)); };
    const walk = (nodes: GroupNode<T>[]) => nodes.forEach((g) => { const c = collapsed.has(g.id); out.push({ k: "group", g, collapsed: c }); if (!c) { if (g.children.length) walk(g.children); else g.rows.forEach((r) => pushRow(r, g.depth + 1)); } });
    if (tree) walk(tree); else shown.forEach((r) => pushRow(r, 0));
    return out;
  }, [tree, shown, getChildren, treeOpen, collapsed]);
  const flat = useMemo(() => items.filter((i): i is Extract<Item<T>, { k: "row" }> => i.k === "row").map((i) => i.r), [items]);
  const allGroupIds = useMemo(() => { const ids: string[] = []; const w = (ns: GroupNode<T>[]) => ns.forEach((g) => { ids.push(g.id); w(g.children); }); if (tree) w(tree); return ids; }, [tree]);

  // ---------- diff, flash, conditional-format stats ----------
  const diffInfo = useMemo(() => {
    if (!diff || !showDiff) return null; const before = new Map(diff.before.map((r) => [r.id, r])); const cur = new Set(all.map((r) => r.id)); const added = new Set<string>(); const changed = new Map<string, Map<string, unknown>>();
    for (const r of all) { const b = before.get(r.id); if (!b) { added.add(r.id); continue; } for (const c of cols) { const o = val(b, c), n = val(r, c); if (o !== n) (changed.get(r.id) ?? changed.set(r.id, new Map()).get(r.id)!).set(c.key, o); } }
    const removed = diff.before.filter((r) => !cur.has(r.id)); return { added, changed, removed };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diff, showDiff, all, cols]);
  const prevRows = useRef<Map<string, Record<string, unknown>> | null>(null);
  useEffect(() => {
    if (!flash) return; const snap = new Map(all.map((r) => [r.id, Object.fromEntries(cols.map((c) => [c.key, val(r, c)]))])); const prev = prevRows.current; prevRows.current = snap; if (!prev) return;
    const cells = new Set<string>(), rows = new Set<string>();
    snap.forEach((v, id) => { const p = prev.get(id); if (!p) rows.add(id); else for (const k in v) if (v[k] !== p[k]) cells.add(`${id}:${k}`); });
    if (!cells.size && !rows.size) return; setFlashing({ cells, rows }); const t = setTimeout(() => setFlashing({ cells: new Set(), rows: new Set() }), 1500); return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, flash]);
  const cfStats = useMemo(() => Object.fromEntries(vis.filter((c) => cfOf(c)).map((c) => [c.key, numStats(filtered.map((r) => val(r, c)))])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vis, filtered, cfOv]);

  // ---------- find ----------
  const matches = useMemo(() => {
    if (!find.open || !find.q) return [] as { id: string; key: string; rowIdx: number }[]; const s = find.q.toLowerCase(); const out: { id: string; key: string; rowIdx: number }[] = [];
    flow.forEach((r, rowIdx) => vis.forEach((c) => { const v = val(r, c); if (String(c.fmt && isNum(v) ? c.fmt(v) : v).toLowerCase().includes(s)) out.push({ id: r.id, key: c.key, rowIdx }); })); return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [find.open, find.q, flow, vis]);
  const matchSet = useMemo(() => new Set(matches.map((m) => `${m.id}:${m.key}`)), [matches]);
  const cur = matches.length ? matches[((find.i % matches.length) + matches.length) % matches.length] : null;
  useEffect(() => { if (cur && !virtual && !srv) setPage(Math.floor(cur.rowIdx / size) + 1); }, [cur?.id, cur?.key, size, virtual, srv]);
  useEffect(() => { if (cur) wrapRef.current?.querySelector("[data-find-cur]")?.scrollIntoView?.({ block: "nearest", inline: "nearest" }); }, [cur?.id, cur?.key, page]);
  useEffect(() => { if (find.open) findRef.current?.focus(); }, [find.open]);
  const hl = (text: string, c: Col<T>, id: string): ReactNode => {
    if (!find.open || !find.q) return text; const s = find.q.toLowerCase(); const out: ReactNode[] = []; let from = 0, n = 0; const low = text.toLowerCase();
    for (let i = low.indexOf(s); i >= 0; i = low.indexOf(s, from)) { out.push(text.slice(from, i), <mark key={n++} className={`adm-mark ${cur && cur.id === id && cur.key === c.key ? "is-cur" : ""}`}>{text.slice(i, i + s.length)}</mark>); from = i + s.length; }
    out.push(text.slice(from)); return out;
  };

  // ---------- measuring (pinned rows, grouped headers) ----------
  useLayoutEffect(() => {
    setHeadH(headRef.current?.offsetHeight ?? 0); setFootH(footRef.current?.offsetHeight ?? 0); setHead1H(row1Ref.current?.offsetHeight ?? 0);
    const tr = wrapRef.current?.querySelector("tbody:not(.adm-pinned) tr:not(.adm-group)") as HTMLElement | null; if (tr?.offsetHeight) setRowH(tr.offsetHeight);
  });

  // ---------- actions ----------
  const toggleSort = (k: string, shift: boolean) => setSort((s) => { const c0 = s.find((x) => x.key === k); const next = c0 ? (c0.dir === 1 ? { key: k, dir: -1 as const } : null) : { key: k, dir: 1 as const }; const rest = shift ? s.filter((x) => x.key !== k) : []; return next ? [...rest, next] : rest; });
  const selected = allSel ? filtered.map((r) => r.id) : [...sel];
  const say = (m: string) => { setNote(m); setTimeout(() => setNote(""), 2200); };
  const exportRows = () => { const ids = new Set(selected); const rs = ids.size ? filtered.filter((r) => ids.has(r.id)) : filtered; return { headers: vis.map((c) => c.header), cells: rs.map((r) => vis.map((c) => val(r, c) as Cell)), align: vis.map((c) => c.align ?? "left") as ("left" | "right")[] }; };
  const doExport = (f: ExportFormat) => {
    const { headers, cells, align } = exportRows();
    if (f === "csv") download(`${exportName}.csv`, toCsv(headers, cells), "text/csv");
    else if (f === "json") download(`${exportName}.json`, toJson(headers, cells), "application/json");
    else if (f === "xlsx") download(`${exportName}.xlsx`, buildXlsx(headers, cells, exportName) as BlobPart, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    else if (f === "pdf") download(`${exportName}.pdf`, buildPdf(exportName, headers, cells) as BlobPart, "application/pdf");
    else { void navigator.clipboard?.writeText(f === "md" ? toMarkdown(headers, cells, align) : toTsv(headers, cells)); say(`Copied ${cells.length} rows`); }
  };
  const resize = (key: string, e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); const x0 = e.clientX; const c0 = colOf(key)!; const w0 = c0.width ?? 140; const mv = (ev: MouseEvent) => setCols((cs) => cs.map((c) => (c.key === key ? { ...c, width: Math.max(60, w0 + ev.clientX - x0) } : c))); const up = () => { document.removeEventListener("mousemove", mv); document.removeEventListener("mouseup", up); }; document.addEventListener("mousemove", mv); document.addEventListener("mouseup", up); };
  const move = (key: string, d: -1 | 1) => setCols((cs) => { const i = cs.findIndex((c) => c.key === key), j = i + d; if (j < 0 || j >= cs.length) return cs; const n = [...cs]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const autoFit = (key: string) => {
    const c = colOf(key); if (!c) return; const th = wrapRef.current?.querySelector(`th[data-col="${key}"]`); const td = wrapRef.current?.querySelector("tbody td[data-label]");
    let w = textW(c.header, th) + 70; for (const r of filtered.slice(0, 300)) { const v = val(r, c); w = Math.max(w, textW(c.fmt && isNum(v) ? c.fmt(v) : String(v), td) + 28); }
    setCols((cs) => cs.map((x) => (x.key === key ? { ...x, width: Math.round(Math.min(520, Math.max(60, w))) } : x))); say(`${c.header}: fitted`);
  };
  const addGroup = (k: string) => setGroupKeys((g) => (g.includes(k) ? g : [...g, k])); const dropOnGroupBar = (e: React.DragEvent) => { e.preventDefault(); const k = e.dataTransfer.getData(COL_MIME); if (k) addGroup(k); };

  // ---------- reorder ----------
  const reorderBlocked = !!(sort.length || q || facetV || Object.values(colFilter).some(Boolean) || srv);
  const reorderBefore = (id: string, beforeId: string | null) => { const from = all.findIndex((r) => r.id === id); if (from < 0 || id === beforeId) return; const next = all.filter((r) => r.id !== id); const to = beforeId ? next.findIndex((r) => r.id === beforeId) : next.length; next.splice(to < 0 ? next.length : to, 0, all[from]); onReorder?.(next); setAnnounce(`Moved ${id} to position ${(to < 0 ? next.length : to) + 1} of ${all.length}`); };
  const reorderBy = (id: string, d: number | "start" | "end") => { const from = all.findIndex((r) => r.id === id); const to = d === "start" ? 0 : d === "end" ? all.length - 1 : Math.max(0, Math.min(all.length - 1, from + d)); if (to === from) return; const next = [...all]; const [m] = next.splice(from, 1); next.splice(to, 0, m); onReorder?.(next); setAnnounce(`Moved ${id} to position ${to + 1} of ${all.length}`); requestAnimationFrame(() => wrapRef.current?.querySelector<HTMLElement>(`[data-handle="${typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id}"]`)?.focus()); };
  const onRowDrop = (e: React.DragEvent, beforeId: string | null) => {
    setDragOver(null); const raw = e.dataTransfer.getData(ROW_MIME); if (!raw) return; e.preventDefault(); e.stopPropagation(); const p = JSON.parse(raw) as { table: string; group: string; id: string; row: T };
    if (p.table === tid) { droppedHere.current = true; if (!reorderBlocked) reorderBefore(p.id, beforeId); } else if (dragGroup && p.group === dragGroup) onReceive?.(p.row, beforeId);
  };

  // ---------- range selection ----------
  const inRange = (ri: number, ci: number) => !!range && ri >= Math.min(range.a[0], range.b[0]) && ri <= Math.max(range.a[0], range.b[0]) && ci >= Math.min(range.a[1], range.b[1]) && ci <= Math.max(range.a[1], range.b[1]);
  const rangeVals = useMemo(() => { if (!range) return null; const out: unknown[] = []; const [r0, r1] = [Math.min(range.a[0], range.b[0]), Math.max(range.a[0], range.b[0])], [c0, c1] = [Math.min(range.a[1], range.b[1]), Math.max(range.a[1], range.b[1])]; for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (flat[r] && vis[c]) out.push(val(flat[r], vis[c])); return { out, rows: r1 - r0 + 1, cols: c1 - c0 + 1 }; },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [range, flat, vis]);
  const copyRange = () => { if (!range) return; const [r0, r1] = [Math.min(range.a[0], range.b[0]), Math.max(range.a[0], range.b[0])], [c0, c1] = [Math.min(range.a[1], range.b[1]), Math.max(range.a[1], range.b[1])]; const lines: string[] = []; for (let r = r0; r <= r1; r++) lines.push(vis.slice(c0, c1 + 1).map((c) => String(val(flat[r], c) ?? "")).join("\t")); void navigator.clipboard?.writeText(lines.join("\n")); say(`Copied ${lines.length}×${c1 - c0 + 1} cells`); };
  useEffect(() => { const up = () => { dragging.current = false; }; document.addEventListener("mouseup", up); return () => document.removeEventListener("mouseup", up); }, []);

  const editable = (r: T, c: Col<T>) => !!specOf(c) && specOf(c)!.type !== "boolean" && !c.locked?.(r);
  /** Move the editor to the next/previous editable cell (wrapping across rows). Returns true when it moved. */
  const goEdit = (ri: number, ci: number, dir: "next" | "prev" | "down"): boolean => {
    const step = dir === "prev" ? -1 : 1; let r = ri, c = ci;
    for (let n = 0; n < flat.length * vis.length; n++) {
      if (dir === "down") r += 1; else { c += step; if (c >= vis.length) { c = 0; r += 1; } if (c < 0) { c = vis.length - 1; r -= 1; } }
      if (r < 0 || r >= flat.length) return false; const row = flat[r], col = vis[c];
      if (editable(row, col)) { setFocus([r, c + lead]); setEdit({ id: row.id, key: col.key }); return true; }
    }
    return false;
  };
  /** Paste text (TSV from a spreadsheet or a copied range) starting at the focused cell, or over the selected range. Every cell is validated; invalid ones are skipped and reported. */
  const pasteBlock = async (text: string) => {
    const grid = text.replace(/\r\n?/g, "\n").replace(/\n$/, "").split("\n").map((l) => l.split("\t")); if (!grid.length || !flat[focus[0]]) return;
    const r0 = range ? Math.min(range.a[0], range.b[0]) : focus[0], c0 = range ? Math.min(range.a[1], range.b[1]) : Math.max(0, focus[1] - lead);
    const multi = !!range && (range.a[0] !== range.b[0] || range.a[1] !== range.b[1]); const rN = multi ? Math.max(range!.a[0], range!.b[0]) : r0 + grid.length - 1, cN = multi ? Math.max(range!.a[1], range!.b[1]) : c0 + grid[0].length - 1;
    const fill = grid.length === 1 && grid[0].length === 1; let ok = 0; const bad: string[] = [];
    for (let r = r0; r <= Math.min(rN, flat.length - 1); r++) for (let c = c0; c <= Math.min(cN, vis.length - 1); c++) {
      const row = flat[r], col = vis[c]; const spec = specOf(col); if (!spec) continue; const raw = fill ? grid[0][0] : grid[(r - r0) % grid.length]?.[(c - c0) % grid[0].length]; if (raw === undefined) continue;
      const lock = col.locked?.(row); if (lock) { bad.push(`${col.header} ${row.id}: locked`); continue; }
      const value = spec.type === "select" ? (spec.options.find((o) => o.value === raw || o.label.toLowerCase() === raw.toLowerCase())?.value ?? raw) : spec.type === "boolean" ? /^(yes|true|1|on)$/i.test(raw) : spec.type === "tags" ? raw.split(/[,;]\s*/).filter(Boolean) : raw;
      const plan = planBulk([row], (x) => x.id, (x) => rawVal(x, col), spec, { kind: "set", value: value as EditValue }, col.validate); if (plan[0].status === "invalid") { bad.push(`${col.header} ${row.id}: ${plan[0].error}`); continue; }
      if (plan[0].status === "same") continue; const res = await save(row, col, plan[0].after as EditValue); if (typeof res === "string" && res) bad.push(`${col.header} ${row.id}: ${res}`); else ok++;
    }
    say(`Pasted ${ok} ${ok === 1 ? "cell" : "cells"}${bad.length ? `, ${bad.length} skipped (${bad[0]}${bad.length > 1 ? "…" : ""})` : ""}`);
  };
  /** Ctrl/Cmd+D: copy the top value of the selected range (or the focused cell) down to the rest of the range or the checked rows. */
  const fillDown = async () => {
    const col = vis[focus[1] - lead]; const cs = range ? vis.slice(Math.min(range.a[1], range.b[1]), Math.max(range.a[1], range.b[1]) + 1) : col ? [col] : [];
    const ri = range ? [Math.min(range.a[0], range.b[0]), Math.max(range.a[0], range.b[0])] : [focus[0], focus[0]]; const src = flat[ri[0]]; if (!src) return;
    const targets = range && ri[1] > ri[0] ? flat.slice(ri[0] + 1, ri[1] + 1) : flat.filter((r) => r.id !== src.id && selected.includes(r.id)); let n = 0, bad = 0;
    for (const c of cs) { const spec = specOf(c); if (!spec) continue; const plan = planBulk(targets, (r) => r.id, (r) => rawVal(r, c), spec, { kind: "set", value: rawVal(src, c) ?? "" }, c.validate);
      const res = await runBulk(plan, (p) => save(flat.find((r) => r.id === p.id)!, c, p.after as EditValue)); n += res.ok.length; bad += res.failed.length; }
    say(n || bad ? `Filled ${n} ${n === 1 ? "cell" : "cells"}${bad ? `, ${bad} failed` : ""}` : "Nothing to fill: select a range or check rows first");
  };
  // Drag the small square at the corner of the selected range down to repeat its top row (Excel-style). Ends by extending the range and filling.
  const startFill = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation(); if (!range) return; const base = range; const top = Math.min(base.a[0], base.b[0]); const bottom0 = Math.max(base.a[0], base.b[0]);
    const rowAt = (x: number, y: number) => { const tr = document.elementFromPoint(x, y)?.closest("tr[data-row]"); const id = tr?.getAttribute("data-row"); return id ? flat.findIndex((r) => r.id === id) : -1; };
    const mv = (ev: MouseEvent) => { const i = rowAt(ev.clientX, ev.clientY); if (i >= bottom0) setRange({ a: [top, Math.min(base.a[1], base.b[1])], b: [i, Math.max(base.a[1], base.b[1])] }); };
    const up = () => { document.removeEventListener("mousemove", mv); document.removeEventListener("mouseup", up); setFillPending(true); };
    document.addEventListener("mousemove", mv); document.addEventListener("mouseup", up);
  };
  useEffect(() => { if (!fillPending) return; setFillPending(false); void fillDown(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillPending]);
  const onGridKey = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).closest("input,textarea,select")) return; // typing in an editor or a column filter is not a grid command
    const [r0, c0] = focus; const nr = flat.length - 1, nc = vis.length - 1 + lead;
    const mv: Record<string, [number, number]> = { ArrowDown: [Math.min(nr, r0 + 1), c0], ArrowUp: [Math.max(0, r0 - 1), c0], ArrowRight: [r0, Math.min(nc, c0 + 1)], ArrowLeft: [r0, Math.max(0, c0 - 1)] };
    if (mv[e.key]) { e.preventDefault(); if (rangeSelect && e.shiftKey) { const dataC = (x: number) => Math.max(0, x - lead); setRange((r) => ({ a: r?.a ?? [r0, dataC(c0)], b: [mv[e.key][0], dataC(mv[e.key][1])] })); } else setRange(null); setFocus(mv[e.key]); }
    if ((e.key === "Enter" || e.key === "F2") && !(e.target as HTMLElement).closest("input,select,textarea")) { const col = vis[c0 - lead]; if (canEdit && col && specOf(col) && flat[r0]) { e.preventDefault(); setEdit({ id: flat[r0].id, key: col.key }); } }
    const col0 = vis[c0 - lead]; const inField = !!(e.target as HTMLElement).closest("input,select,textarea,button,[role=switch]");
    if (canEdit && !inField && col0 && flat[r0] && editable(flat[r0], col0) && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1 && e.key !== " " && ["text", "number", "textarea"].includes(specOf(col0)!.type)) { e.preventDefault(); setEdit((cur) => (cur && cur.id === flat[r0].id && cur.key === col0.key ? { ...cur, seed: (cur.seed ?? "") + e.key } : { id: flat[r0].id, key: col0.key, seed: e.key })); } // keys typed before the editor mounts are appended, not replaced
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d" && canEdit && !(e.target as HTMLElement).closest("input,select,textarea")) { e.preventDefault(); void fillDown(); }
    if (e.key === " " && e.shiftKey && peek && flat[r0]) { e.preventDefault(); setPeekId(flat[r0].id); return; }
    if (e.key === " " && selectable && flat[r0]) { e.preventDefault(); const id = flat[r0].id; setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
    if (rangeSelect && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c" && range) { e.preventDefault(); copyRange(); }
    if (rangeSelect && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a" && !edit) { e.preventDefault(); setRange({ a: [0, 0], b: [Math.max(0, flat.length - 1), Math.max(0, vis.length - 1)] }); }
    if (e.key === "Escape" && range) setRange(null);
  };

  // ---------- footer totals ----------
  const footRows = totalsScope === "selected" ? (selected.length ? filtered.filter((r) => selected.includes(r.id)) : []) : totalsScope === "page" ? pageRows : filtered;
  const aggs = vis.map((c) => { const a = aggOf(c); return a ? aggregate(footRows.map((r) => val(r, c)), a) : null; });
  const hasFoot = vis.some((c) => aggOf(c));
  const aggText = (c: Col<T>, v: number) => (c.fmt && aggOf(c) !== "count" && aggOf(c) !== "distinct" ? c.fmt(v) : String(Math.round(v * 100) / 100));
  const stickyStyle = (c: Col<T>) => (c.pin === "left" ? { position: "sticky" as const, left: lead ? (selectable ? 36 : 0) + (reorderable ? 34 : 0) : 0, zIndex: 1, background: "var(--jp-surface-raised)" } : c.pin === "right" ? { position: "sticky" as const, right: 0, zIndex: 1, background: "var(--jp-surface-raised)", boxShadow: "-1px 0 var(--jp-border)" } : {});

  usePublishSelection(tid, selected.length, [
    ...(canEdit && editFields.length > 0 ? [{ label: `Edit fields on ${selected.length} selected`, run: () => setBulkOpen(true), text: "bulk edit selected rows fields" }] : []),
    ...(bulk ?? []).map((b) => ({ label: `${b.label} (${selected.length} selected)`, run: () => { b.onRun(selected); setSel(new Set()); setAllSel(false); }, text: `bulk ${b.label}` })),
    { label: `Export ${selected.length} selected as CSV`, run: () => doExport("csv"), text: "export selected csv download" },
    ...(selected.length === 2 ? [{ label: "Compare the 2 selected rows", run: () => setCompare(true), text: "compare diff two rows side by side split" }] : []),
    { label: "Clear selection", run: () => { setSel(new Set()); setAllSel(false); setBulkOpen(false); }, text: "clear deselect selection" },
  ]);
  const selSums = useMemo(() => { if (!selected.length) return []; const rs = filtered.filter((r) => selected.includes(r.id)); return vis.filter((c) => rs.length && rs.every((r) => isNum(val(r, c))) && (c.agg || c.edit === "number" || c.editor?.type === "number")).slice(0, 3).map((c) => { const t = rs.reduce((a, r) => a + Number(val(r, c)), 0); return { key: c.key, header: c.header, text: c.fmt ? c.fmt(t) : String(Math.round(t * 100) / 100) }; }); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected.join(","), filtered, vis]);
  // ---------- header menu ----------
  const numericCol = (c: Col<T>) => filtered.slice(0, 20).every((r) => isNum(val(r, c)));
  const hdrMenu = (c: Col<T>) => {
    const cf = cfOf(c); const items: ({ label: string; onSelect: () => void; danger?: boolean } | "sep")[] = [
      { label: "Sort ascending", onSelect: () => setSort([{ key: c.key, dir: 1 }]) }, { label: "Sort descending", onSelect: () => setSort([{ key: c.key, dir: -1 }]) }, { label: "Clear sort", onSelect: () => setSort((s) => s.filter((x) => x.key !== c.key)) }, "sep",
      { label: "Hide column", onSelect: () => setCols((cs) => cs.map((x) => (x.key === c.key ? { ...x, hidden: true } : x))) },
      { label: `${c.pin === "left" ? "✓ " : ""}Pin left`, onSelect: () => setCols((cs) => cs.map((x) => (x.key === c.key ? { ...x, pin: "left" } : x))) }, { label: `${c.pin === "right" ? "✓ " : ""}Pin right`, onSelect: () => setCols((cs) => cs.map((x) => (x.key === c.key ? { ...x, pin: "right" } : x))) }, { label: "Unpin", onSelect: () => setCols((cs) => cs.map((x) => (x.key === c.key ? { ...x, pin: undefined } : x))) }, "sep",
      { label: `${!aggOf(c) ? "✓ " : ""}Aggregate: none`, onSelect: () => setAggOv((o) => ({ ...o, [c.key]: null })) },
      ...(Object.keys(AGG_LABEL) as Agg[]).map((a) => ({ label: `${aggOf(c) === a ? "✓ " : ""}Aggregate: ${AGG_LABEL[a].toLowerCase()}`, onSelect: () => setAggOv((o) => ({ ...o, [c.key]: a })) })), "sep",
      { label: "Auto-fit width", onSelect: () => autoFit(c.key) }, { label: groupKeys.includes(c.key) ? "Remove from grouping" : "Group by this column", onSelect: () => (groupKeys.includes(c.key) ? setGroupKeys((g) => g.filter((x) => x !== c.key)) : addGroup(c.key)) }, { label: "Column statistics…", onSelect: () => setStatsCol(c.key) },
    ];
    if (numericCol(c)) items.push("sep", { label: `${!cf ? "✓ " : ""}Format: none`, onSelect: () => setCfOv((o) => ({ ...o, [c.key]: null })) }, { label: `${cf?.type === "scale" ? "✓ " : ""}Format: colour scale`, onSelect: () => setCfOv((o) => ({ ...o, [c.key]: { type: "scale" } })) }, { label: `${cf?.type === "bars" ? "✓ " : ""}Format: data bars`, onSelect: () => setCfOv((o) => ({ ...o, [c.key]: { type: "bars" } })) }, { label: `${cf?.type === "icons" ? "✓ " : ""}Format: icon set`, onSelect: () => setCfOv((o) => ({ ...o, [c.key]: { type: "icons" } })) }, { label: `${cf?.type === "scale" && cf.diverging ? "✓ " : ""}Format: diverging scale`, onSelect: () => setCfOv((o) => ({ ...o, [c.key]: { type: "scale", diverging: true } })) });
    return <Menu label={<><span className="adm-sr">{c.header} column menu</span><Icon name="more" size={14} /></>} items={items} />;
  };

  // ---------- rendering ----------
  const colSpanAll = vis.length + lead + (hasAct ? 1 : 0);
  const sevCls = (r: T) => (severity?.(r) ? `sev-${severity(r)}` : "");
  const dataCell = (r: T, c: Col<T>, ci: number, ri: number, depth: number, ghost?: boolean): ReactNode => {
    const v = val(r, c); const editing = !ghost && edit?.id === r.id && edit.key === c.key; const f = !ghost && focus[0] === ri && focus[1] === ci + lead; const fx = cellFx(cfOf(c), v, cfStats[c.key] ?? null);
    const was = diffInfo?.changed.get(r.id)?.get(c.key); const changed = diffInfo?.changed.get(r.id)?.has(c.key); const isCur = !!cur && cur.id === r.id && cur.key === c.key; const isFind = find.open && !!find.q && matchSet.has(`${r.id}:${c.key}`);
    const text = c.fmt && isNum(v) ? c.fmt(v) : String(v);
    const cls = [inRange(ri, ci) ? "is-range" : "", changed ? "is-changed" : "", flashing.cells.has(`${r.id}:${c.key}`) ? "is-flash" : "", isFind ? "is-find" : ""].filter(Boolean).join(" ");
    return (
      <td key={c.key} data-label={c.header} data-focus={f || undefined} data-find-cur={isCur || undefined} className={cls} title={changed ? `Was: ${String(was)}` : undefined}
        style={{ textAlign: c.align, ...(fx.background ? { background: fx.background } : {}), ...(fx.color ? { color: fx.color } : {}), ...stickyStyle(c), ...(ci === 0 && depth ? { paddingInlineStart: 12 + depth * 22 } : {}) }}
        onDoubleClick={() => !ghost && canEdit && specOf(c) && setEdit({ id: r.id, key: c.key })} onClick={(e) => { if (ghost) return; setFocus([ri, ci + lead]); if (rangeSelect && e.shiftKey) setRange((x) => ({ a: x?.a ?? [focus[0], Math.max(0, focus[1] - lead)], b: [ri, ci] })); }}
        onMouseDown={(e) => { if (!rangeSelect || ghost || e.button !== 0 || (e.target as HTMLElement).closest("button,input,a,select")) return; if (!e.shiftKey) { dragging.current = true; setRange({ a: [ri, ci], b: [ri, ci] }); } }}
        onMouseEnter={() => { if (dragging.current && rangeSelect) setRange((x) => (x ? { a: x.a, b: [ri, ci] } : x)); }} tabIndex={f ? 0 : -1} onKeyDown={editing ? (e) => { if (e.key === "Enter" && !e.shiftKey && (e.target as HTMLElement).tagName === "INPUT" && (prefs?.editCommit ?? "blur") === "blur") setTimeout(() => { setFocus([Math.min(flat.length - 1, ri + 1), ci + lead]); }, 0); } : undefined}>
        {!(editing) && <>
            {ci === 0 && getChildren?.(r)?.length ? <button className="adm-x" aria-expanded={treeOpen.has(r.id)} aria-label={treeOpen.has(r.id) ? "Collapse" : "Expand"} onClick={(e) => { e.stopPropagation(); setTreeOpen((x) => { const n = new Set(x); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n; }); }}><Icon name={treeOpen.has(r.id) ? "chevron-down" : "chevron-right"} size={14} /></button> : ci === 0 && getChildren ? <span style={{ display: "inline-block", width: 26 }} /> : null}
            {ci === 0 && rowError?.(r) && <span className="adm-errmark" role="img" aria-label={`Error: ${rowError(r)}`} title={rowError(r)}><Icon name="alert" size={14} /></span>}
            {fx.glyph && <span className={`adm-glyph is-${fx.glyph.tone}`} role="img" aria-label={fx.glyph.label}>{fx.glyph.char}</span>}
            {changed && !c.render && <s className="adm-was">{String(was)}</s>}
        </>}
        {!ghost && canEdit && specOf(c) ? <Editable value={rawVal(r, c)} editor={specOf(c)!} label={`${c.header} for ${r.id}`} placeholderEmpty={`Add ${c.header.toLowerCase()}`} locked={c.locked?.(r)} seed={editing ? edit?.seed : undefined} onNavigate={(dir) => goEdit(ri, ci, dir)} compact hideAffordance trigger="dblclick" editing={editing} onEditingChange={(on) => setEdit(on ? { id: r.id, key: c.key } : (e) => (e && e.id === r.id && e.key === c.key ? null : e))}
          validate={c.validate ? (v) => c.validate!(v, r) : undefined} onSave={(v, meta) => save(r, c, v, meta)} display={c.render ? c.render(r) : (find.open && find.q) || c.fmt ? hl(text, c, r.id) : undefined} tabbable={false} /> : c.render ? c.render(r) : hl(text, c, r.id)}
        {!ghost && rangeSelect && canEdit && range && ri === Math.max(range.a[0], range.b[0]) && ci === Math.max(range.a[1], range.b[1]) && !editing && <span className="adm-fillhandle" role="presentation" title="Drag down to fill" onMouseDown={startFill} />}
      </td>
    );
  };
  const renderRow = (r: T, idx: number, depth: number, extra: { cls?: string; style?: React.CSSProperties; ghost?: boolean } = {}): ReactNode => {
    const ghost = extra.ghost; const isSel = sel.has(r.id) || allSel; const mark = diffInfo?.added.has(r.id) ? "is-added" : "";
    return (
      <Fragment key={(ghost ? "g-" : "") + r.id}>
        <tr className={[isSel ? "is-sel" : "", zebra && idx % 2 ? "is-zebra" : "", sevCls(r), mark, ghost ? "is-removed" : "", flashing.rows.has(r.id) ? "is-new" : "", dragOver === r.id ? "is-dragover" : "", extra.cls ?? ""].filter(Boolean).join(" ")}
          style={{ ...(virtual ? { height: rowHeight } : {}), ...extra.style }} aria-selected={ghost ? undefined : isSel} data-row={r.id}
          onDragOver={reorderable ? (e) => { if (e.dataTransfer.types.includes(ROW_MIME)) { e.preventDefault(); setDragOver(r.id); } } : undefined} onDragLeave={reorderable ? () => setDragOver((d) => (d === r.id ? null : d)) : undefined} onDrop={reorderable ? (e) => onRowDrop(e, r.id) : undefined}>
          {selectable && <td className="adm-td-sel" style={{ position: "sticky", left: 0, background: "var(--jp-surface-raised)" }}>{!ghost && <Checkbox checked={isSel} onChange={(v) => { setAllSel(false); setSel((s) => { const n = new Set(s); v ? n.add(r.id) : n.delete(r.id); return n; }); }} label={<span className="adm-sr">Select {r.id}</span>} />}</td>}
          {reorderable && <td className="adm-td-handle" style={{ position: "sticky", left: selectable ? 36 : 0, background: "var(--jp-surface-raised)" }}>{!ghost && (
            <button type="button" className="adm-handle" draggable={!reorderBlocked} disabled={reorderBlocked} data-handle={r.id} aria-label={`Reorder ${r.id}. ${reorderBlocked ? "Clear sorting and filters to reorder." : "Drag, or press Alt plus Arrow up or down."}`} title={reorderBlocked ? "Clear sorting and filters to reorder" : "Drag to reorder (Alt+↑/↓)"}
              onKeyDown={(e) => { if (!e.altKey) return; const m: Record<string, number | "start" | "end"> = { ArrowUp: -1, ArrowDown: 1, Home: "start", End: "end" }; if (e.key in m) { e.preventDefault(); e.stopPropagation(); reorderBy(r.id, m[e.key]); } }}
              onDragStart={(e) => { droppedHere.current = false; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData(ROW_MIME, JSON.stringify({ table: tid, group: dragGroup ?? tid, id: r.id, row: r })); e.dataTransfer.setData("text/plain", r.id); }}
              onDragEnd={(e) => { if (e.dataTransfer.dropEffect === "move" && !droppedHere.current) onMoveOut?.(r.id); setDragOver(null); }}>⠿</button>)}</td>}
          {vis.map((c, ci) => dataCell(r, c, ci, idx, depth, ghost))}
          {hasAct && !ghost && (
            <td className="adm-td-act">
              {peek && <button type="button" className="adm-x adm-hover" aria-label={`Peek ${r.id}`} title="Peek (Shift+Space)" aria-keyshortcuts="Shift+Space" onClick={() => setPeekId(r.id)}><Icon name="eye" size={16} /></button>}{pinnable && <Menu label={<><span className="adm-sr">Pin {r.id}</span><Icon name="pin" size={14} /></>} items={[{ label: "Pin to top", onSelect: () => { setPinBottom((p) => p.filter((x) => x !== r.id)); setPinTop((p) => [...p.filter((x) => x !== r.id), r.id]); } }, { label: "Pin to bottom", onSelect: () => { setPinTop((p) => p.filter((x) => x !== r.id)); setPinBottom((p) => [...p.filter((x) => x !== r.id), r.id]); } }, { label: "Unpin", onSelect: () => { setPinTop((p) => p.filter((x) => x !== r.id)); setPinBottom((p) => p.filter((x) => x !== r.id)); } }]} />}
              {expand && <button className="adm-x" aria-expanded={open.has(r.id)} aria-label="Toggle details" onClick={() => setOpen((s) => { const n = new Set(s); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n; })}><Icon name={open.has(r.id) ? "chevron-up" : "chevron-down"} size={16} /></button>}
              {rowActions && <Menu label={<Icon name="more" size={16} />} ariaLabel={`Actions for ${r.id}`} items={rowActions(r).map((a) => ({ ...a }))} />}
            </td>
          )}
          {hasAct && ghost && <td />}
        </tr>
        {!ghost && expand && open.has(r.id) && <tr className="adm-expand"><td colSpan={colSpanAll}>{expand(r)}</td></tr>}
      </Fragment>
    );
  };
  const groupRowEl = (g: GroupNode<T>, isCollapsed: boolean): ReactNode => (
    <tr key={`grp-${g.id}`} className="adm-group" data-depth={g.depth} onClick={() => setCollapsed((s) => { const n = new Set(s); n.has(g.id) ? n.delete(g.id) : n.add(g.id); return n; })}>
      {lead > 0 && <td colSpan={lead} />}
      {vis.map((c, i) => { const a = aggOf(c); return (
        <td key={c.key} style={{ textAlign: c.align }}>
          {i === 0 ? <span style={{ paddingInlineStart: g.depth * 18 }}><Icon name={isCollapsed ? "chevron-right" : "chevron-down"} size={14} /> <b>{g.value}</b> <span className="jp-muted">{g.rows.length} rows</span></span>
            : a ? <b className="adm-gagg">{aggText(c, aggregate(g.rows.map((r) => val(r, c)), a))}<small className="jp-muted"> {a}</small></b> : null}
        </td>); })}
      {hasAct && <td />}
    </tr>
  );
  const pinnedRows = (rs: T[], pos: "top" | "bottom") => rs.length ? <tbody className={`adm-pinned adm-pinned--${pos}`}>{rs.map((r, i) => renderRow(r, 1000 + i, 0, { cls: "adm-pinrow", style: pos === "top" ? { top: headH + i * rowH } : { bottom: footH + (rs.length - 1 - i) * rowH } }))}</tbody> : null;
  const headerCell = (c: Col<T>, i: number, rowSpan?: number, topPx?: number): ReactNode => {
    const s = sort.find((x) => x.key === c.key); const sticky = c.pin === "left" ? { position: "sticky" as const, left: lead ? (selectable ? 36 : 0) + (reorderable ? 34 : 0) : 0, background: "var(--jp-surface)", zIndex: 4 } : c.pin === "right" ? { position: "sticky" as const, right: 0, background: "var(--jp-surface)", zIndex: 4 } : {};
    return (
      <th key={c.key} data-col={c.key} rowSpan={rowSpan} className={c.rotate ? "adm-th--rot" : undefined} aria-sort={s ? (s.dir === 1 ? "ascending" : "descending") : undefined} style={{ width: c.width, minWidth: c.width, textAlign: c.align, ...(topPx !== undefined ? { top: topPx } : {}), ...sticky }}>
        <div className="adm-th" draggable={groupBar && !c.rotate} onDragStart={(e) => { e.dataTransfer.setData(COL_MIME, c.key); e.dataTransfer.effectAllowed = "copyMove"; }}>
          {c.sortable !== false ? <button className="adm-th__btn" onClick={(e) => toggleSort(c.key, e.shiftKey)} title="Shift-click to add a secondary sort">{c.header}{s && <span aria-hidden>{s.dir === 1 ? " ▲" : " ▼"}{sort.length > 1 && <sup>{sort.indexOf(s) + 1}</sup>}</span>}</button> : c.header}
          {!c.rotate && <span className="adm-th__tools"><button className="adm-x" aria-label={`Move ${c.header} left`} onClick={() => move(c.key, -1)} disabled={i === 0}>‹</button><button className="adm-x" aria-label={`Move ${c.header} right`} onClick={() => move(c.key, 1)} disabled={i === vis.length - 1}>›</button></span>}
          {headerMenu && <span className="adm-th__menu">{hdrMenu(c)}</span>}
          <i className="adm-resize" onMouseDown={(e) => resize(c.key, e)} onDoubleClick={() => autoFit(c.key)} role="separator" aria-label={`Resize ${c.header}`} />
        </div>
        {!c.rotate && c.filter && (c.filter === "select"
          ? <select className="jp-select adm-colfilter" aria-label={`Filter ${c.header}`} value={colFilter[c.key] ?? ""} onChange={(e) => setColFilter({ ...colFilter, [c.key]: e.target.value })}><option value="">All</option>{[...new Set(all.map((r) => String(val(r, c))))].sort().map((o) => <option key={o}>{o}</option>)}</select>
          : <input className="jp-input adm-colfilter" placeholder="Filter" aria-label={`Filter ${c.header}`} value={colFilter[c.key] ?? ""} onChange={(e) => setColFilter({ ...colFilter, [c.key]: e.target.value })} />)}
      </th>
    );
  };
  const groupSpans = useMemo(() => { const out: { group?: string; cols: Col<T>[] }[] = []; for (const c of vis) { const last = out[out.length - 1]; if (last && c.group && last.group === c.group) last.cols.push(c); else out.push({ group: c.group, cols: [c] }); } return out; }, [vis]);
  const stats = statsCol ? columnStats(filtered.map((r) => val(r, colOf(statsCol)!))) : null;
  const exportBtn = exports && exports.length > 1 ? <Menu label="Export" icon="download" items={exports.map((f) => ({ label: EXPORT_LABEL[f], onSelect: () => doExport(f) }))} /> : <Btn sm icon="download" onClick={() => doExport(exports?.[0] ?? "csv")}>Export {(exports?.[0] ?? "csv").toUpperCase()}</Btn>;
  const loadingMore = !!server?.loading; const more = server?.mode === "more"; const shownCount = srv ? all.length : filtered.length;
  const fmtN = (n: number) => n.toLocaleString("en-AU");

  return (
    <div className="adm-dt" aria-label={ariaLabel}>
      <div className="adm-dt__bar">
        <div className="adm-input" style={{ maxWidth: 260 }}><span className="adm-input__add"><Icon name="search" size={16} /></span><input className="jp-input" placeholder="Search all columns…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Search table" /></div>
        {facet && <div className="adm-row" role="group" aria-label={facet.label}><button className={`adm-pill ${!facetV ? "is-on" : ""}`} onClick={() => setFacetV(null)}>All <small>{all.length}</small></button>{facet.options.map((o) => <button key={o.value} className={`adm-pill ${facetV === o.value ? "is-on" : ""}`} onClick={() => { setFacetV(facetV === o.value ? null : o.value); setPage(1); }}>{o.value} <small>{all.filter((r) => String(val(r, colOf(facet.key)!)) === o.value).length}</small></button>)}</div>}
        {toolbar}
        {!srv && <Btn sm variant="ghost" icon="sliders" aria-expanded={!!chipDraft} onClick={() => setChipDraft((c) => (c ? null : { key: vis[0]?.key ?? "", op: "contains", value: "" }))}>Filter{chips.length ? ` (${chips.length})` : ""}</Btn>}
        {viewKey && <Menu label="Views" icon="folder" items={[
          ...saved.map((v) => ({ label: v.name, onSelect: () => { setQ(v.q); setFacetV(v.facet); setSort(v.sort); setColFilter(v.colFilter); setChips(v.chips); setGroupKeys(v.group); setCols((cs) => cs.map((c) => ({ ...c, hidden: v.hidden.includes(c.key) }))); setPage(1); say(`View “${v.name}” applied`); } })),
          ...(saved.length ? ["sep" as const] : []),
          { label: "Save current view…", onSelect: () => setNaming("") },
          ...saved.map((v) => ({ label: `Delete “${v.name}”`, danger: true, onSelect: () => { const n = saved.filter((x) => x.name !== v.name); setSaved(n); saveViews(viewKey, n); } })),
        ]} />}
        <span className="adm-spacer" />
        {note && <span className="jp-muted" role="status">{note}</span>}
        {diffInfo && <><Badge s="ok">+{diffInfo.added.size}</Badge><Badge s="danger">−{diffInfo.removed.length}</Badge><Badge s="warn">~{diffInfo.changed.size}</Badge></>}
        {diff && <label className="adm-check"><input type="checkbox" checked={showDiff} onChange={(e) => setShowDiff(e.target.checked)} /><span>Diff vs snapshot</span></label>}
        {findable && <Btn sm variant="ghost" icon="search" aria-label="Find in table" onClick={() => setFind((f) => ({ ...f, open: !f.open }))}>Find</Btn>}
        {layoutMenu && <Menu label="Text" icon="menu" items={[{ label: `${textMode === "default" ? "✓ " : ""}Text: default`, onSelect: () => setTextMode("default") }, { label: `${textMode === "wrap" ? "✓ " : ""}Text: wrap`, onSelect: () => setTextMode("wrap") }, { label: `${textMode === "truncate" ? "✓ " : ""}Text: truncate`, onSelect: () => setTextMode("truncate") }]} />}
        <label className="adm-check"><input type="checkbox" checked={zebra} onChange={(e) => setZebra(e.target.checked)} /><span>Zebra</span></label>
        <Menu label="Columns" icon="sliders" items={cols.flatMap((c) => [{ label: `${c.hidden ? "☐" : "☑"} ${c.header}`, onSelect: () => setCols((cs) => cs.map((x) => (x.key === c.key ? { ...x, hidden: !x.hidden } : x))) }])} />
        {exportBtn}
      </div>
      {naming !== null && viewKey && (
        <div className="adm-chips" role="group" aria-label="Save view">
          <input className="jp-input adm-mini" autoFocus placeholder="View name" aria-label="View name" value={naming} onChange={(e) => setNaming(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") setNaming(null); if (e.key === "Enter") (e.currentTarget.nextElementSibling as HTMLElement | null)?.click(); }} />
          <Btn sm variant="primary" disabled={!naming.trim()} onClick={() => { const v: SavedView = { name: naming.trim(), q, facet: facetV, sort, colFilter, chips, hidden: cols.filter((c) => c.hidden).map((c) => c.key), group: groupKeys }; const n = [...saved.filter((x) => x.name !== v.name), v]; setSaved(n); saveViews(viewKey, n); setNaming(null); say(`Saved view “${v.name}”`); }}>Save view</Btn>
          <Btn sm variant="ghost" onClick={() => setNaming(null)}>Cancel</Btn>
        </div>
      )}
      {(chips.length > 0 || chipDraft) && !srv && (
        <div className="adm-chips" role="group" aria-label="Filters">
          {chips.map((c) => <span key={c.id} className="adm-chip">{chipLabel(colOf(c.key)?.header ?? c.key, c)}<button type="button" aria-label={`Remove filter ${chipLabel(colOf(c.key)?.header ?? c.key, c)}`} onClick={() => { setChips((x) => x.filter((y) => y.id !== c.id)); setPage(1); }}>×</button></span>)}
          {chips.length > 1 && <button type="button" className="adm-link" onClick={() => setChips([])}>Clear all</button>}
          {chipDraft && (() => { const col = colOf(chipDraft.key); const ops = chipOps(!!col && numericCol(col)); return (
            <span className="adm-chipdraft">
              <select className="jp-select adm-mini" aria-label="Filter column" value={chipDraft.key} onChange={(e) => { const c2 = colOf(e.target.value); setChipDraft({ key: e.target.value, op: chipOps(!!c2 && numericCol(c2))[0], value: "" }); }}>{vis.map((c) => <option key={c.key} value={c.key}>{c.header}</option>)}</select>
              <select className="jp-select adm-mini" aria-label="Filter operator" value={ops.includes(chipDraft.op) ? chipDraft.op : ops[0]} onChange={(e) => setChipDraft({ ...chipDraft, op: e.target.value as ChipOp })}>{ops.map((o) => <option key={o} value={o}>{OP_LABEL[o]}</option>)}</select>
              {needsValue(chipDraft.op) && <input className="jp-input adm-mini" aria-label="Filter value" placeholder="Value" value={chipDraft.value} autoFocus onChange={(e) => setChipDraft({ ...chipDraft, value: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") (e.currentTarget.nextElementSibling as HTMLElement | null)?.click(); }} />}
              <Btn sm variant="primary" disabled={needsValue(chipDraft.op) && !chipDraft.value.trim()} onClick={() => { setChips((x) => [...x, { id: `${Date.now()}${x.length}`, ...chipDraft, op: ops.includes(chipDraft.op) ? chipDraft.op : ops[0], value: chipDraft.value.trim() }]); setChipDraft(null); setPage(1); }}>Add filter</Btn>
            </span>); })()}
        </div>
      )}
      {find.open && findable && (
        <div className="adm-findbar" role="search" aria-label="Find in table">
          <input ref={findRef} className="jp-input" placeholder="Find in table…" aria-label="Find in table" value={find.q} onChange={(e) => setFind({ open: true, q: e.target.value, i: 0 })} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setFind((f) => ({ ...f, i: f.i + (e.shiftKey ? -1 : 1) })); } if (e.key === "Escape") setFind({ open: false, q: "", i: 0 }); }} />
          <span className="adm-num jp-muted" aria-live="polite">{find.q ? (matches.length ? `${(((find.i % matches.length) + matches.length) % matches.length) + 1} of ${matches.length}` : "No matches") : ""}</span>
          <Btn sm aria-label="Previous match" disabled={!matches.length} onClick={() => setFind((f) => ({ ...f, i: f.i - 1 }))}>↑</Btn><Btn sm aria-label="Next match" disabled={!matches.length} onClick={() => setFind((f) => ({ ...f, i: f.i + 1 }))}>↓</Btn>
          <Btn sm variant="ghost" aria-label="Close find" onClick={() => setFind({ open: false, q: "", i: 0 })}>×</Btn>
        </div>
      )}
      {groupBar && (
        <div className="adm-groupbar" onDragOver={(e) => { if (e.dataTransfer.types.includes(COL_MIME)) e.preventDefault(); }} onDrop={dropOnGroupBar} aria-label="Group by">
          <Icon name="folder" size={14} />{groupKeys.length === 0 && <span className="jp-muted">Drag a column header here to group rows (or use a column’s menu)</span>}
          {groupKeys.map((k, i) => (<span key={k} className="adm-chip">{i > 0 && <span aria-hidden>›</span>}{colOf(k)?.header ?? k}
            <button type="button" aria-label={`Move ${colOf(k)?.header} grouping earlier`} disabled={i === 0} onClick={() => setGroupKeys((g) => { const n = [...g]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; })}>‹</button>
            <button type="button" aria-label={`Remove grouping by ${colOf(k)?.header}`} onClick={() => setGroupKeys((g) => g.filter((x) => x !== k))}>×</button></span>))}
          <span className="adm-spacer" />{groupKeys.length > 0 && <><Btn sm variant="ghost" onClick={() => setCollapsed(new Set(allGroupIds))}>Collapse all</Btn><Btn sm variant="ghost" onClick={() => setCollapsed(new Set())}>Expand all</Btn></>}
        </div>
      )}
      {(selected.length > 0) && (
        <div className="adm-bulk" role="region" aria-label="Bulk actions"><b>{allSel ? filtered.length : sel.size} selected</b>
          {!allSel && sel.size < filtered.length && <button className="adm-link" onClick={() => setAllSel(true)}>Select all {filtered.length} across pages</button>}
          {selSums.map((s) => <span key={s.key} className="jp-muted">Sum {s.header} <b>{s.text}</b></span>)}<span className="adm-spacer" />{selected.length === 2 && <Btn sm icon="copy" onClick={() => setCompare(true)}>Compare 2</Btn>}{canEdit && editFields.length > 0 && <Btn sm variant={bulkOpen ? "primary" : "secondary"} icon="edit" aria-expanded={bulkOpen} onClick={() => setBulkOpen((o) => !o)}>Edit fields</Btn>}{bulk?.map((b) => <Btn key={b.label} sm variant={b.danger ? "primary" : "secondary"} className={b.danger ? "adm-danger" : ""} onClick={() => { b.onRun(selected); setSel(new Set()); setAllSel(false); }}>{b.label}</Btn>)}
          <Btn sm variant="ghost" onClick={() => { setSel(new Set()); setAllSel(false); setBulkOpen(false); }}>Clear</Btn></div>
      )}
      {selected.length > 0 && bulkOpen && editFields.length > 0 && <BulkEditPanel key={selected.length} rows={filtered.filter((r) => selected.includes(r.id))} fields={editFields} commit={(r, k, v) => save(r, colOf(k)!, v)} onClose={() => setBulkOpen(false)} />}
      <div ref={wrapRef} className={`adm-dt__wrap ${loadingMore ? "is-busy" : ""}`} style={virtual || maxHeight ? { maxHeight: vh, overflow: "auto" } : undefined} onScroll={(e) => virtual && setScrollTop((e.target as HTMLElement).scrollTop)}
        onKeyDownCapture={(e) => { if (findable && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") { e.preventDefault(); setFind((f) => ({ ...f, open: true })); } }}
        onDragOver={reorderable ? (e) => { if (e.dataTransfer.types.includes(ROW_MIME)) e.preventDefault(); } : undefined} onDrop={reorderable ? (e) => onRowDrop(e, null) : undefined}>
        <table className={`jp-table adm-table adm-table--cards ${textMode === "wrap" ? "adm-table--wrap" : textMode === "truncate" ? "adm-table--trunc" : ""} adm-table--h-${prefs?.density === "compact" ? "tight" : "normal"}`} role="grid" aria-rowcount={total + 1} onKeyDown={onGridKey} onPaste={(e) => { if (!canEdit || (e.target as HTMLElement).closest("input,textarea,select")) return; const t = e.clipboardData.getData("text"); if (t) { e.preventDefault(); void pasteBlock(t); } }}>
          <thead ref={headRef}>
            <tr ref={row1Ref}>
              {selectable && <th rowSpan={hasGroupHdr ? 2 : undefined} style={{ width: 36, position: "sticky", left: 0, background: "var(--jp-surface)", zIndex: 4 }}><Checkbox checked={(sel.size === pageRows.length && pageRows.length > 0) || allSel} indeterminate={sel.size > 0 && sel.size < pageRows.length && !allSel} onChange={(v) => { setAllSel(false); setSel(v ? new Set(pageRows.map((r) => r.id)) : new Set()); }} label={<span className="adm-sr">Select page</span>} /></th>}
              {reorderable && <th rowSpan={hasGroupHdr ? 2 : undefined} style={{ width: 34, position: "sticky", left: selectable ? 36 : 0, background: "var(--jp-surface)", zIndex: 4 }}><span className="adm-sr">Reorder</span></th>}
              {hasGroupHdr ? groupSpans.map((g, gi) => (g.group ? <th key={`gh${gi}`} colSpan={g.cols.length} className="adm-th-group">{g.group}</th> : g.cols.map((c) => headerCell(c, vis.indexOf(c), 2)))) : vis.map((c, i) => headerCell(c, i))}
              {hasAct && <th rowSpan={hasGroupHdr ? 2 : undefined} style={{ width: pinnable ? 120 : 84 }}><span className="adm-sr">Actions</span></th>}
            </tr>
            {hasGroupHdr && <tr>{groupSpans.filter((g) => g.group).flatMap((g) => g.cols).sort((a, b) => vis.indexOf(a) - vis.indexOf(b)).map((c) => headerCell(c, vis.indexOf(c), undefined, head1H))}</tr>}
          </thead>
          {pinnedRows(pinTopRows, "top")}
          <tbody>
            {state === "loading" && Array.from({ length: 6 }, (_, i) => <tr key={i}>{lead > 0 && <td colSpan={lead} />}{vis.map((c) => <td key={c.key} style={{ textAlign: c.align, width: c.width }}><Skeleton w={c.align === "right" ? `${28 + ((i * 11) % 22)}%` : `${50 + ((i * 17 + c.key.length * 9) % 45)}%`} /></td>)}{hasAct && <td />}</tr>)}
            {state === "error" && <tr><td colSpan={colSpanAll}><div className="adm-tablemsg"><b>Couldn’t load rows.</b> <span className="jp-muted">The request timed out.</span> <Btn sm>Retry</Btn></div></td></tr>}
            {(state === "empty" || (state === "ready" && !loadingMore && total === 0 && !pinnedSet.size)) && <tr><td colSpan={colSpanAll}><EmptyState spot="empty" title="No results" action={<Btn sm onClick={() => { setQ(""); setColFilter({}); setFacetV(null); }}>Clear filters</Btn>}>Nothing matches the current filters.</EmptyState></td></tr>}
            {state === "ready" && virtual && start > 0 && <tr style={{ height: start * rowHeight }} aria-hidden><td colSpan={colSpanAll} /></tr>}
            {state === "ready" && items.map((it) => (it.k === "group" ? groupRowEl(it.g, it.collapsed) : renderRow(it.r, it.idx, it.depth)))}
            {state === "ready" && onAdd && !srv && (adding ? (
              <tr className="adm-addrow" onKeyDown={(e) => { if (e.key === "Escape") { setAdding(false); setNewVals({}); setAddErr(""); } }}>
                {lead > 0 && <td colSpan={lead} />}
                {vis.map((c) => { const sp = specOf(c); return <td key={c.key} data-label={c.header}>{sp && !c.locked ? <FieldEditor spec={sp} value={undefined} label={`New ${c.header}`} mode="none" autoFocus={false} compact onDraft={(v, err) => setNewVals((x) => (x[c.key]?.v === v && x[c.key]?.err === err ? x : { ...x, [c.key]: { v, err } }))} onCommit={() => {}} onCancel={() => {}} /> : null}</td>; })}
                {hasAct && <td className="adm-td-act"><Btn sm variant="primary" disabled={Object.values(newVals).some((x) => x.err) || !Object.values(newVals).some((x) => x.v !== undefined && !isEmpty(x.v))} onClick={async () => {
                  const values: Record<string, EditValue> = {}; for (const c of vis) { const nv = newVals[c.key]; const sp = specOf(c); if (!sp || nv?.v === undefined || isEmpty(nv.v)) continue; const e = validateSpec(sp, nv.v, c.validate ? (v) => c.validate!(v, {} as T) : undefined); if (e) { setAddErr(`${c.header}: ${e}`); return; } values[c.key] = nv.v; }
                  try { const r = await onAdd(values); if (typeof r === "string" && r) { setAddErr(r); return; } } catch (e) { setAddErr(e instanceof Error ? e.message : "Couldn’t add the row"); return; }
                  setAdding(false); setNewVals({}); setAddErr(""); say("Row added"); }}>Add</Btn> <Btn sm variant="ghost" onClick={() => { setAdding(false); setNewVals({}); setAddErr(""); }}>Cancel</Btn>{addErr && <span className="adm-err" role="alert"> {addErr}</span>}</td>}
              </tr>
            ) : <tr className="adm-addrow"><td colSpan={colSpanAll}><button type="button" className="adm-link" onClick={() => setAdding(true)}>+ Add row</button></td></tr>)}
            {state === "ready" && diffInfo?.removed.map((r, i) => renderRow(r, 2000 + i, 0, { ghost: true }))}
            {state === "ready" && virtual && end < flow.length && <tr style={{ height: (flow.length - end) * rowHeight }} aria-hidden><td colSpan={colSpanAll} /></tr>}
          </tbody>
          {pinnedRows(pinBotRows, "bottom")}
          {state === "ready" && hasFoot && <tfoot ref={footRef}><tr>{lead > 0 && <td colSpan={lead} />}{vis.map((c, i) => <td key={c.key} style={{ textAlign: c.align }}>{aggs[i] !== null ? <b>{aggText(c, aggs[i]!)}<small className="jp-muted"> {aggOf(c)}</small></b> : i === 0 ? <span className="jp-muted">Totals ({footRows.length})</span> : null}</td>)}{hasAct && <td />}</tr></tfoot>}
        </table>
      </div>
      {rangeSelect && rangeVals && (() => { const nums = rangeVals.out.filter(isNum); const sum = nums.reduce((a, b) => a + b, 0); return (
        <div className="adm-statusbar" role="status" aria-label="Selection summary"><b>{rangeVals.rows}×{rangeVals.cols}</b><span>Count <b>{rangeVals.out.length}</b></span>{nums.length > 0 && <><span>Numeric <b>{nums.length}</b></span><span>Sum <b>{Math.round(sum * 100) / 100}</b></span><span>Average <b>{Math.round((sum / nums.length) * 100) / 100}</b></span><span>Min <b>{Math.min(...nums)}</b></span><span>Max <b>{Math.max(...nums)}</b></span></>}<span className="adm-spacer" /><Btn sm variant="ghost" onClick={copyRange}>Copy (Ctrl+C)</Btn><Btn sm variant="ghost" onClick={() => setRange(null)}>Clear</Btn></div>); })()}
      <div className="adm-dt__foot">
        <span className="jp-muted">{srv ? `${fmtN(shownCount)} loaded of ${server!.estimated ? "~" : ""}${fmtN(server!.total)}${server!.estimated ? " (estimate)" : ""} rows${loadingMore ? " · loading…" : ""}` : filtered.length === all.length ? `${all.length} rows` : `${filtered.length} of ${all.length} rows`}{virtual ? " (virtualised)" : ""}</span>
        {hasFoot && <label className="adm-row jp-muted">Aggregate over <select className="jp-select adm-mini" value={totalsScope} onChange={(e) => setTotalsScope(e.target.value as typeof totalsScope)} aria-label="Totals scope"><option value="filtered">all filtered rows</option><option value="page">this page</option><option value="selected">selected rows</option></select></label>}
        {srv && more && all.length < server!.total && <Btn sm disabled={loadingMore} onClick={() => { appendRef.current = true; setPage((p) => p + 1); }}>{loadingMore ? "Loading…" : `Load more (${fmtN(Math.min(size, server!.total - all.length))})`}</Btn>}
        {!virtual && !(srv && more) && <><label className="adm-row jp-muted">Rows <select className="jp-select adm-mini" value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(1); }} aria-label="Rows per page">{[5, 10, 25, 50].map((n) => <option key={n}>{n}</option>)}</select></label><Pagination page={page} pages={pages} onChange={setPage} /></>}
      </div>
      <div className="adm-sr" role="status" aria-live="polite">{announce}</div>
      <Modal open={compare && selected.length === 2} onClose={() => setCompare(false)} size="lg" title="Compare two rows">
        {(() => { const [a, b] = selected.map((id) => all.find((x) => x.id === id)); if (!a || !b) return null; return (
          <table className="jp-table adm-compare" aria-label="Comparison"><thead><tr><th>Field</th><th>{a.id}</th><th>{b.id}</th></tr></thead>
            <tbody>{cols.map((c) => { const x = val(a, c), y = val(b, c); const diff = String(x) !== String(y); const show = (v: unknown, r: T) => (c.render ? c.render(r) : String(c.fmt && isNum(v) ? c.fmt(v) : Array.isArray(v) ? v.join(", ") : v ?? "")); return <tr key={c.key} className={diff ? "is-diff" : ""}><th scope="row">{c.header}{diff && <span className="adm-sr"> (differs)</span>}</th><td>{show(x, a)}</td><td>{show(y, b)}</td></tr>; })}</tbody></table>); })()}
      </Modal>
      <Drawer open={!!peekId} onClose={() => setPeekStack([])} title={peekId ? `Peek: ${peekId}` : "Peek"}>
        {peekStack.length > 1 && <div className="adm-row adm-peektrail"><Btn sm variant="ghost" icon="chevron-left" onClick={() => setPeekStack((s) => s.slice(0, -1))}>Back</Btn><span className="jp-muted">{peekStack.join(" › ")}</span></div>}
        {(() => { const r = all.find((x) => x.id === peekId); if (!r || !peek) return null; return typeof peek === "function" ? peek(r) : (
          <dl className="adm-dl" style={{ gridTemplateColumns: "140px 1fr" }}>{cols.map((c) => { const v = val(r, c); return <Fragment key={c.key}><dt>{c.header}</dt><dd>{c.render ? c.render(r) : String(c.fmt && isNum(v) ? c.fmt(v) : Array.isArray(v) ? v.join(", ") : v ?? "")}</dd></Fragment>; })}</dl>); })()}
        {(() => { const r = all.find((x) => x.id === peekId); const rel = r && peekRelated ? peekRelated(r).filter((x) => x.id !== r.id) : []; return rel.length ? <div className="adm-peekrel"><div className="jp-label">Related</div><ul className="adm-list">{rel.map((x) => <li key={x.id}><button type="button" className="adm-link" onClick={() => setPeekId(x.id)}>{x.id}</button> <span className="jp-muted">{String(val(x, cols[1] ?? cols[0]) ?? "")}</span></li>)}</ul></div> : null; })()}
      </Drawer>
      <Modal open={!!stats} onClose={() => setStatsCol(null)} size="sm" title={`Statistics: ${colOf(statsCol ?? "")?.header ?? ""}`}>
        {stats && (<div className="adm-stack">
          <dl className="adm-dl" style={{ gridTemplateColumns: "110px 1fr" }}><dt>Rows</dt><dd>{stats.count}</dd><dt>Empty</dt><dd>{stats.nulls} ({stats.count ? Math.round((stats.nulls / stats.count) * 100) : 0}%)</dd><dt>Distinct</dt><dd>{stats.distinct}</dd>
            {stats.numeric && <><dt>Min / Max</dt><dd>{stats.min} / {stats.max}</dd><dt>Mean</dt><dd>{Math.round(stats.mean! * 100) / 100}</dd><dt>Median</dt><dd>{Math.round(stats.median! * 100) / 100}</dd><dt>Std dev</dt><dd>{Math.round(stats.stdev! * 100) / 100}</dd><dt>Sum</dt><dd>{Math.round(stats.sum! * 100) / 100}</dd></>}</dl>
          {stats.numeric && <div className="adm-hist" role="img" aria-label="Histogram">{stats.histogram.map((b, i) => <span key={i} title={`${Math.round(b.from)}–${Math.round(b.to)}: ${b.count}`} style={{ height: `${(b.count / Math.max(1, ...stats.histogram.map((x) => x.count))) * 100}%` }} />)}</div>}
          {stats.top.length > 0 && <div><div className="jp-label">Top values</div><ul className="adm-toplist">{stats.top.map((t) => <li key={t.value}><span>{t.value}</span><i style={{ width: `${(t.count / stats.top[0].count) * 100}%` }} /><b>{t.count}</b></li>)}</ul></div>}
        </div>)}
      </Modal>
    </div>
  );
}
