import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader, Panel, Badge, Tabs, EmptyState, Avatar } from "@belikh/jupiter-ui/kit.tsx";
import { TextInput } from "@belikh/jupiter-ui/inputs.tsx";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";
import { orders, services, people, money } from "../data/fixtures.ts";

const hl = (t: string, q: string) => { if (!q) return t; const i = t.toLowerCase().indexOf(q.toLowerCase()); return i < 0 ? t : <>{t.slice(0, i)}<mark className="adm-mark">{t.slice(i, i + q.length)}</mark>{t.slice(i + q.length)}</>; };
export function Search() {
  const [sp, setSp] = useSearchParams(); const q = sp.get("q") ?? ""; const [tab, setTab] = useState("all");
  const res = useMemo(() => {
    const s = q.toLowerCase(); if (!s) return { Orders: [], Customers: [], Services: [], People: [] };
    return {
      Orders: orders.filter((o) => o.id.toLowerCase().includes(s) || o.customer.toLowerCase().includes(s)).slice(0, 20),
      Customers: [...new Set(orders.filter((o) => o.customer.toLowerCase().includes(s)).map((o) => o.customer))].slice(0, 8),
      Services: services.filter((x) => x.name.includes(s) || x.region.includes(s)),
      People: people.filter((p) => p.toLowerCase().includes(s)),
    };
  }, [q]);
  const total = Object.values(res).reduce((a, b) => a + b.length, 0);
  const show = (k: string) => tab === "all" || tab === k;
  return (
    <>
      <PageHeader title="Search" desc={q ? `${total} results for “${q}”` : "Type to search orders, customers, services and people."} crumbs={["Data", "Search"]} />
      <div style={{ maxWidth: 560, marginBottom: 12 }}><TextInput value={q} onChange={(v) => setSp(v ? { q: v } : {})} placeholder="Search everything…" autoFocus aria-label="Search" prefix={<Icon name="search" size={14} />} /></div>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "all", label: "All", count: total }, ...Object.entries(res).map(([k, v]) => ({ id: k, label: k, count: v.length }))]} />
      {!q ? <EmptyState spot="lens" title="Start typing">Results are grouped by type, with the match highlighted.</EmptyState> : !total ? <EmptyState spot="no-results" title={`Nothing for “${q}”`}>Try a shorter term or check the spelling.</EmptyState> : (
        <div className="adm-stack" style={{ marginTop: 16 }}>
          {show("Orders") && res.Orders.length > 0 && <Panel title="Orders" flush><ul className="adm-list">{res.Orders.map((o) => <li key={o.id}><b className="adm-num" style={{ width: 110 }}>{hl(o.id, q)}</b><span style={{ flex: 1 }}>{hl(o.customer, q)}</span><Badge s={o.status === "paid" ? "ok" : o.status === "failed" ? "danger" : "warn"}>{o.status}</Badge><span className="adm-num">{money(o.amount)}</span></li>)}</ul></Panel>}
          {show("Customers") && res.Customers.length > 0 && <Panel title="Customers" flush><ul className="adm-list">{res.Customers.map((c) => <li key={c}><Avatar name={c} size={28} /><b>{hl(c, q)}</b></li>)}</ul></Panel>}
          {show("Services") && res.Services.length > 0 && <Panel title="Services" flush><ul className="adm-list">{res.Services.map((x) => <li key={x.name}><b className="adm-num" style={{ flex: 1 }}>{hl(x.name, q)}</b><span className="jp-muted">{x.region}</span></li>)}</ul></Panel>}
          {show("People") && res.People.length > 0 && <Panel title="People" flush><ul className="adm-list">{res.People.map((p) => <li key={p}><Avatar name={p} size={28} />{hl(p, q)}</li>)}</ul></Panel>}
        </div>)}
    </>
  );
}
