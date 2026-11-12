import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader, Panel, Badge, Btn, Drawer, Tabs, Avatar, Dot, type Status } from "@belikh/jupiter-ui/kit.tsx";
import { DataTable, type Col } from "@belikh/jupiter-ui/DataTable.tsx";
import { Spark, ProgressBar } from "@belikh/jupiter-ui/Charts.tsx";
import { Segmented } from "@belikh/jupiter-ui/inputs.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { orders as seed, money, rng, regions, type Order } from "../data/fixtures.ts";

const sMap: Record<string, Status> = { paid: "ok", pending: "warn", refunded: "info", failed: "danger" };
const big = (() => { const g = rng(99); return Array.from({ length: 20000 }, (_, i): Order => ({ ...seed[i % seed.length], id: `ORD-${String(i).padStart(6, "0")}`, amount: Math.round(g() * 250000) / 100, items: 1 + Math.floor(g() * 8) })); })();

export function Orders() {
  const { toast } = usePrefs();
  const [sp, setSp] = useSearchParams(); const [rows, setRows] = useState(seed); const tab = sp.get("tab") ?? "table"; const setTab = (t: string) => setSp((p) => { const n = new URLSearchParams(p); t === "table" ? n.delete("tab") : n.set("tab", t); return n; }, { replace: true }); const [state, setState] = useState<"ready" | "loading" | "error" | "empty">("ready");
  const [drawer, setDrawer] = useState<Order | null>(null);
  const cols: Col<Order>[] = useMemo(() => [
    { key: "id", header: "Order", width: 120, pin: "left", render: (r) => <a href="#" className="adm-num" onClick={(e) => { e.preventDefault(); setDrawer(r); }}>{r.id}</a> },
    { key: "customer", header: "Customer", width: 170, filter: "text", edit: "text", render: (r) => <span className="adm-row" style={{ flexWrap: "nowrap" }}><Avatar name={r.customer} size={22} />{r.customer}</span> },
    { key: "status", header: "Status", width: 120, filter: "select", render: (r) => <Badge s={sMap[r.status]}>{r.status}</Badge> },
    { key: "region", header: "Region", width: 120, filter: "select" },
    { key: "items", header: "Items", width: 80, align: "right", agg: "sum" },
    { key: "amount", header: "Amount", width: 120, align: "right", agg: "sum", edit: "number", fmt: money, render: (r) => <span className="adm-num">{money(r.amount)}</span> },
    { key: "progress", header: "Fulfilment", width: 110, render: (r) => <ProgressBar value={r.progress} s={r.progress === 100 ? "ok" : undefined} label="Fulfilment" /> },
    { key: "trend", header: "Trend", width: 90, sortable: false, render: (r) => <Spark data={r.trend} w={80} h={20} /> },
    { key: "owner", header: "Owner", width: 130 },
    { key: "created", header: "Created", width: 100 },
  ], []);
  const tree = useMemo(() => regions.map((g) => { const kids = rows.filter((r) => r.region === g); return { ...kids[0], id: `REG-${g}`, customer: `${g} (${kids.length} orders)`, region: g, status: "paid" as const, amount: kids.reduce((a, r) => a + r.amount, 0), items: kids.reduce((a, r) => a + r.items, 0), children: kids.slice(0, 12) }; }), [rows]);
  const del1 = (id: string) => { const old = rows; setRows(rows.filter((r) => r.id !== id)); toast({ kind: "warn", title: `Deleted ${id}`, undo: () => setRows(old) }); };
  return (
    <>
      <PageHeader title="Orders" desc="A full-featured data table: sort, filter, facets, pin, resize, reorder, select, bulk, expand, inline edit, export, virtualise." crumbs={["Data", "Orders"]}
        actions={<><Btn icon="upload">Import</Btn><Btn variant="primary" icon="plus">New order</Btn></>}
        tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: "table", label: "Table", count: rows.length }, { id: "grouped", label: "Grouped by region" }, { id: "tree", label: "Tree rows" }, { id: "virtual", label: "Virtualised", count: 20000 }, { id: "states", label: "States" }]} />} />
      {tab === "states" && <div className="adm-row" style={{ marginBottom: 12 }}><span className="jp-muted">Preview state:</span><Segmented label="State" value={state} onChange={setState} options={[{ value: "ready", label: "Ready" }, { value: "loading", label: "Loading" }, { value: "error", label: "Error" }, { value: "empty", label: "Empty" }]} /></div>}
      <Panel flush>
        <DataTable<Order> key={tab} rows={tab === "virtual" ? big : tab === "tree" ? tree : rows} getChildren={tab === "tree" ? (r) => (r as Order & { children?: Order[] }).children : undefined} urlKey={tab === "table" ? "o" : undefined} cols={tab === "grouped" ? cols.filter((c) => c.key !== "region").concat(cols.find((c) => c.key === "region")!) : cols} state={tab === "states" ? state : "ready"}
          facet={{ key: "status", label: "Status", options: [{ value: "paid" }, { value: "pending" }, { value: "refunded" }, { value: "failed" }] }} groupBy={tab === "grouped" ? "region" : undefined} virtual={tab === "virtual"} exportName="orders"
          severity={(r) => (r.status === "failed" ? "danger" : r.status === "pending" ? "warn" : undefined)}
          onEdit={(r, k, v) => { setRows((x) => x.map((y) => (y.id === r.id ? { ...y, [k]: k === "amount" ? Number(v) || 0 : v } : y))); toast({ kind: "ok", title: "Saved", body: `${r.id} · ${k} updated` }); }}
          rowActions={(r) => [{ label: "Open", onSelect: () => setDrawer(r) }, { label: "Duplicate", onSelect: () => toast({ kind: "info", title: `Duplicated ${r.id}` }) }, { label: "Refund", onSelect: () => toast({ kind: "warn", title: `Refund started for ${r.id}` }) }, { label: "Delete…", danger: true, onSelect: () => del1(r.id) }]}
          expand={(r) => <div className="adm-grid adm-grid--3" style={{ padding: "8px 4px" }}><div><div className="jp-label">Contact</div>{r.email}</div><div><div className="jp-label">Fulfilment</div>{r.progress}% · {r.items} items · {r.region}</div><div><div className="jp-label">Notes</div><span className="jp-muted">No notes yet.</span></div></div>}
          bulk={[{ label: "Mark paid", onRun: (ids) => { setRows((x) => x.map((r) => (ids.includes(r.id) ? { ...r, status: "paid" } : r))); toast({ kind: "ok", title: `${ids.length} orders marked paid` }); } }, { label: "Delete", danger: true, onRun: (ids) => { const old = rows; setRows(rows.filter((r) => !ids.includes(r.id))); toast({ kind: "warn", title: `${ids.length} orders deleted`, undo: () => setRows(old) }); } }]} />
      </Panel>
      <Drawer open={!!drawer} onClose={() => setDrawer(null)} title={drawer?.id ?? ""} footer={<><Btn onClick={() => setDrawer(null)}>Close</Btn><Btn variant="primary" onClick={() => { toast({ kind: "ok", title: "Order updated" }); setDrawer(null); }}>Save</Btn></>}>
        {drawer && <div className="adm-stack"><div className="adm-row"><Avatar name={drawer.customer} size={40} /><div><b>{drawer.customer}</b><div className="jp-muted">{drawer.email}</div></div></div>
          <div className="adm-grid adm-grid--2"><div><div className="jp-label">Status</div><Badge s={sMap[drawer.status]}>{drawer.status}</Badge></div><div><div className="jp-label">Amount</div><b>{money(drawer.amount)}</b></div><div><div className="jp-label">Region</div>{drawer.region}</div><div><div className="jp-label">Owner</div>{drawer.owner}</div></div>
          <div><div className="jp-label">Fulfilment</div><ProgressBar value={drawer.progress} label="Fulfilment" /></div></div>}
      </Drawer>
      <p className="jp-muted" style={{ marginTop: 12 }}><Dot s="info" /> Try: shift-click headers for multi-sort, drag column edges to resize, double-click a Customer or Amount cell to edit, arrow keys to move between cells.</p>
      <p className="jp-muted">{regions.length} regions · <Badge>{rows.length} rows</Badge></p>
    </>
  );
}
