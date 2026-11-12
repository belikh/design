import { useState } from "react";
import { PageHeader, Panel, Badge, Btn, Avatar, Tabs, Menu, Alert } from "@belikh/jupiter-ui/kit.tsx";
import { StatTile, LineChart, Spark } from "@belikh/jupiter-ui/Charts.tsx";
import { TextArea } from "@belikh/jupiter-ui/inputs.tsx";
import { DataTable, type Col } from "@belikh/jupiter-ui/DataTable.tsx";
import { orders, money, series, days, activity, type Order } from "../data/fixtures.ts";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { Editable } from "@belikh/jupiter-ui/editable.tsx";
import { createCollection, useCollection } from "@belikh/jupiter-ui/mock.ts";

type Cust = { id: string; name: string; plan: string; region: string; owner: string; tags: string[]; email: string };
const store = createCollection<Cust>([{ id: "ava", name: "Ava Nguyen", plan: "Business", region: "Brisbane", owner: "Mia Patel", tags: ["vip", "nixos", "retro"], email: "ava.nguyen@example.com" }]);
const PLANS = ["Free", "Pro", "Business", "Enterprise"].map((p) => ({ value: p, label: p }));

export function Customer() {
  const { toast } = usePrefs(); const { rows: [c], save } = useCollection(store); const put = (k: string) => (v: import("@belikh/jupiter-ui/editable.tsx").EditValue) => save(c, k, v); const [tab, setTab] = useState("overview"); const [note, setNote] = useState(""); const [notes, setNotes] = useState([{ who: "Mia Patel", t: "2d ago", text: "Prefers invoices by email. Renewal due in January." }]);
  const mine = orders.filter((o) => o.customer === "Mia Murphy" || o.region === "Adelaide").slice(0, 24);
  const cols: Col<Order>[] = [{ key: "id", header: "Order", width: 120 }, { key: "status", header: "Status", width: 100, render: (r) => <Badge s={r.status === "paid" ? "ok" : r.status === "failed" ? "danger" : "warn"}>{r.status}</Badge> }, { key: "created", header: "Date", width: 110 }, { key: "amount", header: "Amount", align: "right", fmt: money, agg: "sum" }];
  return (
    <>
      <PageHeader crumbs={["Records", "Customers", "Ava Nguyen"]} title={<Editable value={c?.name ?? ""} editor={{ type: "text", maxLength: 60 }} label="Customer name" validate={(v) => (String(v).trim() ? null : "A name is required")} onSave={put("name")} />} status={<Badge s="ok">active</Badge>} desc="ava.nguyen@example.com · Brisbane · customer since Mar 2019"
        actions={<><Btn icon="mail" onClick={() => toast({ kind: "info", title: "Email draft opened" })}>Email</Btn><Menu label="More" items={[{ label: "Merge duplicate…", onSelect: () => {} }, { label: "Export data", onSelect: () => toast({ kind: "ok", title: "Export queued" }) }, "sep", { label: "Deactivate", danger: true, onSelect: () => toast({ kind: "warn", title: "Customer deactivated" }) }]} /></>}
        tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: "overview", label: "Overview" }, { id: "orders", label: "Orders", count: mine.length }, { id: "notes", label: "Notes", count: notes.length }, { id: "activity", label: "Activity" }]} />} />
      {tab === "overview" && <div className="adm-grid adm-grid--21">
        <div className="adm-stack"><div className="adm-grid adm-grid--3"><StatTile label="Lifetime value" value="$8,420" delta={14} spark={series(14, 30, 8, 1)} sub="12m" /><StatTile label="Orders" value="38" delta={5} spark={series(14, 30, 8, 2)} sub="12m" /><StatTile label="Avg order" value="$221" delta={-3} spark={series(14, 30, 8, 3)} sub="12m" /></div>
          <Panel title="Spend over time"><LineChart area smooth height={200} labels={days(30)} series={[{ name: "Spend", data: series(30, 40, 20, 9) }]} /></Panel></div>
        <div className="adm-stack"><Panel title="Details"><dl className="adm-dl"><dt>Email</dt><dd><Editable value={c?.email ?? ""} editor={{ type: "text" }} label="Email" validate={(v) => (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v)) ? null : "Enter a valid email")} onSave={put("email")} /></dd><dt>Plan</dt><dd><Editable value={c?.plan ?? ""} editor={{ type: "select", options: PLANS }} label="Plan" showHistory onSave={put("plan")} /></dd><dt>Region</dt><dd><Editable value={c?.region ?? ""} editor={{ type: "text" }} label="Region" showHistory onSave={put("region")} /></dd><dt>Owner</dt><dd><Editable value={c?.owner ?? ""} editor={{ type: "text", avatar: true }} label="Owner" onSave={put("owner")} /></dd><dt>Tags</dt><dd><Editable value={c?.tags ?? []} editor={{ type: "tags", options: ["vip", "nixos", "retro", "rust"], creatable: true }} label="Tags" onSave={put("tags")} /></dd><dt>Trend</dt><dd><Spark data={series(12, 10, 4, 4)} /></dd></dl></Panel>
          <Alert s="warn" title="Payment method expires soon">The card ending 4242 expires on 12/26.</Alert></div></div>}
      {tab === "orders" && <Panel flush><DataTable<Order> rows={mine} cols={cols} pageSize={8} selectable={false} exportName="customer-orders" /></Panel>}
      {tab === "notes" && <div className="adm-stack" style={{ maxWidth: 720 }}><Panel>{notes.map((n, i) => <div key={i} className="adm-msg" style={{ marginBottom: 12 }}><Avatar name={n.who} size={28} /><div><b>{n.who}</b> <span className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>{n.t}</span><p>{n.text}</p></div></div>)}
        <TextArea value={note} onChange={setNote} placeholder="Add a note…" aria-label="Note" /><div className="adm-row" style={{ justifyContent: "flex-end", marginTop: 8 }}><Btn variant="primary" disabled={!note.trim()} onClick={() => { setNotes([...notes, { who: "Ava Nguyen", t: "now", text: note }]); setNote(""); }}>Add note</Btn></div></Panel></div>}
      {tab === "activity" && <Panel><ol className="adm-timeline">{activity.map((a, i) => <li key={i}><span className={`adm-timeline__dot adm-dot--${a.kind}`} /><div><b>{a.who}</b> {a.what} <span className="adm-num">{a.target}</span><div className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>{a.when}</div></div></li>)}</ol></Panel>}
    </>
  );
}
