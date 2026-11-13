import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./views.css";
import { PageHeader, Panel, Badge, Btn, Avatar, Drawer, EmptyState, ConfirmDelete, type Status } from "@belikh/jupiter-ui/kit.tsx";
import { StatTile } from "@belikh/jupiter-ui/Charts.tsx";
import { Segmented, TextInput, Select, NumberStepper } from "@belikh/jupiter-ui/inputs.tsx";
import { Icon, Spot } from "@belikh/jupiter-ui/Icon.tsx";
import { money } from "../../data/fixtures.ts";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { when } from "./shared.tsx";
import { ORDER_STEPS, ordersV, products, type Ord, type Product } from "./data.ts";

/* ============ A042 Product catalogue with variants ============ */
type CartLine = { key: string; p: Product; variant: string; qty: number };
export function Catalogue() {
  const { toast } = usePrefs(); const [q, setQ] = useState(""); const [cat, setCat] = useState("all"); const [view, setView] = useState<"cards" | "matrix">("cards"); const [chosen, setChosen] = useState<Record<string, { Colour: string; Size: string }>>({}); const [cart, setCart] = useState<CartLine[]>([]); const [open, setOpen] = useState(false);
  const list = products.filter((p) => (cat === "all" || p.cat === cat) && p.name.toLowerCase().includes(q.toLowerCase()));
  const ch = (p: Product) => chosen[p.id] ?? { Colour: p.options.Colour[0], Size: p.options.Size[0] };
  const stockOf = (p: Product, v: { Colour: string; Size: string }) => p.stock[`${v.Colour}|${v.Size}`] ?? 0;
  const inCart = (p: Product, vk: string) => cart.find((l) => l.key === `${p.id}|${vk}`)?.qty ?? 0;
  const add = (p: Product) => { const v = ch(p); const vk = `${v.Colour}|${v.Size}`; const have = stockOf(p, v); if (inCart(p, vk) >= have) { toast({ kind: "warn", title: "No more in stock", body: `${p.name} (${v.Colour}, ${v.Size})` }); return; } setCart((c) => (c.some((l) => l.key === `${p.id}|${vk}`) ? c.map((l) => (l.key === `${p.id}|${vk}` ? { ...l, qty: l.qty + 1 } : l)) : [...c, { key: `${p.id}|${vk}`, p, variant: vk, qty: 1 }])); toast({ kind: "ok", title: `Added ${p.name}`, body: `${v.Colour} · ${v.Size}` }); };
  const total = cart.reduce((a, l) => a + l.p.price * l.qty, 0);
  return (
    <>
      <PageHeader title="Catalogue" crumbs={["Views", "Catalogue"]} desc="Variants (colour and size) with per-variant stock: out-of-stock options are disabled, and the cart can't exceed stock."
        actions={<><div style={{ width: 200 }}><TextInput value={q} onChange={setQ} placeholder="Search products…" aria-label="Search products" prefix={<Icon name="search" size={14} />} /></div><Select value={cat} onChange={setCat} aria-label="Category" options={["all", ...new Set(products.map((p) => p.cat))]} /><Segmented label="View" value={view} onChange={setView} options={[{ value: "cards", label: "Cards" }, { value: "matrix", label: "Stock matrix" }]} /><Btn icon="cart" variant="primary" onClick={() => setOpen(true)}>Cart ({cart.reduce((a, l) => a + l.qty, 0)})</Btn></>} />
      {list.length === 0 ? <EmptyState spot="no-results" title="No products match">Try another search.</EmptyState> : view === "cards" ? <div className="adm-cardgrid">{list.map((p) => { const v = ch(p); const st = stockOf(p, v); return (
        <article key={p.id} className="adm-card"><div className="adm-card__media"><Spot name={p.spot} size={96} /></div><div className="adm-card__body">
          <div className="adm-row" style={{ justifyContent: "space-between" }}><b>{p.name}</b><Badge>{p.cat}</Badge></div>
          {(["Colour", "Size"] as const).map((k) => <div key={k}><div className="jp-label" style={{ marginBottom: 4 }}>{k}</div><div className="vw-variant" role="group" aria-label={`${p.name} ${k}`}>{p.options[k].map((o) => { const test = { ...v, [k]: o }; const out = stockOf(p, test) === 0 && p.options[k === "Colour" ? "Size" : "Colour"].every((x) => stockOf(p, { ...test, [k === "Colour" ? "Size" : "Colour"]: x } as { Colour: string; Size: string }) === 0); return <button key={o} aria-pressed={v[k] === o} disabled={out} onClick={() => setChosen({ ...chosen, [p.id]: { ...v, [k]: o } })}>{o}</button>; })}</div></div>)}
          <div className="adm-row" style={{ justifyContent: "space-between", marginTop: 4 }}><b className="adm-num">{money(p.price)}</b><Badge s={st === 0 ? "danger" : st < 4 ? "warn" : "ok"}>{st === 0 ? "out of stock" : st < 4 ? `only ${st} left` : `${st} in stock`}</Badge></div>
          <Btn variant="primary" disabled={st === 0} onClick={() => add(p)}>{st === 0 ? "Unavailable" : "Add to cart"}</Btn></div></article>); })}</div>
        : <Panel flush><table className="jp-table"><thead><tr><th>Product</th>{["Colour", "Size"].map((h) => <th key={h}>{h}</th>)}<th className="jp-num">Stock</th><th className="jp-num">Price</th></tr></thead><tbody>{list.flatMap((p) => Object.entries(p.stock).map(([k, n]) => { const [c, s] = k.split("|"); return <tr key={`${p.id}${k}`}><td>{p.name}</td><td>{c}</td><td>{s}</td><td className="jp-num"><Badge s={n === 0 ? "danger" : n < 4 ? "warn" : "ok"}>{n}</Badge></td><td className="jp-num">{money(p.price)}</td></tr>; }))}</tbody></table></Panel>}
      <Drawer open={open} onClose={() => setOpen(false)} title="Cart" footer={<><b style={{ flex: 1 }}>Total {money(total)}</b><Btn onClick={() => setCart([])} disabled={!cart.length}>Clear</Btn><Btn variant="primary" disabled={!cart.length} onClick={() => { toast({ kind: "ok", title: "Order placed (demo)" }); setCart([]); setOpen(false); }}>Checkout</Btn></>}>
        {cart.length === 0 ? <EmptyState spot="empty" title="Your cart is empty">Add something from the catalogue.</EmptyState> : <div className="adm-stack">{cart.map((l) => <div key={l.key} className="adm-row" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}><div><b>{l.p.name}</b><div className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>{l.variant.replace("|", " · ")}</div></div><NumberStepper value={l.qty} min={0} max={l.p.stock[l.variant] ?? 0} onChange={(v) => setCart((c) => c.map((x) => (x.key === l.key ? { ...x, qty: v } : x)).filter((x) => x.qty > 0))} /><b className="adm-num">{money(l.p.price * l.qty)}</b></div>)}</div>}</Drawer>
    </>
  );
}

/* ============ A043 Order list and order detail ============ */
const sMap: Record<Ord["status"], Status> = { placed: "info", paid: "info", picked: "warn", shipped: "warn", delivered: "ok", cancelled: "danger" };
const NEXT = (s: Ord["status"]) => ORDER_STEPS[ORDER_STEPS.indexOf(s as (typeof ORDER_STEPS)[number]) + 1];
export const orderTotal = (o: Pick<Ord, "lines" | "shipping">) => { const sub = o.lines.reduce((a, l) => a + l.price * l.qty, 0); return { sub, gst: Math.round(sub * 10) / 100, ship: o.shipping, total: Math.round((sub + sub * 0.1 + o.shipping) * 100) / 100 }; };
export function OrdersV() {
  const { toast } = usePrefs(); const [sp, setSp] = useSearchParams(); const sel = sp.get("id"); const [orders, setOrders] = useState(ordersV); const [st, setSt] = useState("all"); const [q, setQ] = useState(""); const [cancel, setCancel] = useState(false);
  const list = useMemo(() => orders.filter((o) => (st === "all" || o.status === st) && (o.id + o.customer).toLowerCase().includes(q.toLowerCase())), [orders, st, q]);
  const cur = orders.find((o) => o.id === sel) ?? null; const t = cur ? orderTotal(cur) : null; const idx = cur ? ORDER_STEPS.indexOf(cur.status as (typeof ORDER_STEPS)[number]) : -1;
  const patch = (id: string, f: (o: Ord) => Ord, msg: string) => { const old = orders; setOrders((x) => x.map((o) => (o.id === id ? f(o) : o))); toast({ kind: "ok", title: msg, undo: () => setOrders(old) }); };
  const advance = () => { if (!cur) return; const n = NEXT(cur.status); if (!n) return; patch(cur.id, (o) => ({ ...o, status: n, events: [...o.events, { at: o.events[o.events.length - 1].at + 120, text: { paid: "Payment received", picked: "Picked and packed", shipped: "Handed to carrier", delivered: "Delivered" }[n as "paid"] ?? n }] }), `${cur.id}: ${n}`); };
  return (
    <>
      <PageHeader title="Orders" crumbs={["Views", "Orders"]} desc="List on the left, order detail on the right: line items with GST and shipping, and a fulfilment timeline you can advance." />
      <div className="vw-split" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.1fr)" }}>
        <Panel title={`${list.length} orders`} flush actions={<><div style={{ width: 130 }}><TextInput value={q} onChange={setQ} placeholder="Search…" aria-label="Search orders" /></div><Select value={st} onChange={setSt} aria-label="Status" options={["all", ...ORDER_STEPS, "cancelled"]} /></>}>
          {list.length ? <ul className="adm-list" style={{ maxHeight: 560, overflow: "auto" }}>{list.map((o) => <li key={o.id} onClick={() => setSp({ id: o.id })} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setSp({ id: o.id })} style={{ cursor: "pointer", background: sel === o.id ? "color-mix(in oklab, var(--jp-accent) 12%, transparent)" : undefined }}><Avatar name={o.customer} size={28} /><div className="adm-list__main"><b className="adm-num">{o.id}</b><span className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>{o.customer} · {when(o.placed)}</span></div><b className="adm-num">{money(orderTotal(o).total)}</b><Badge s={sMap[o.status]}>{o.status}</Badge></li>)}</ul> : <EmptyState spot="no-results" title="No orders match">Adjust the filters.</EmptyState>}</Panel>
        <Panel title={cur ? `Order ${cur.id}` : "Order detail"}>{cur && t ? <div className="adm-stack">
          {cur.status === "cancelled" ? <Badge s="danger">cancelled</Badge> : <ol className="vw-steps" aria-label="Fulfilment">{ORDER_STEPS.map((s, i) => <li key={s} className={i < idx || cur.status === "delivered" ? "is-done" : i === idx ? "is-current" : ""} aria-current={i === idx ? "step" : undefined}>{s}</li>)}</ol>}
          <table className="jp-table"><thead><tr><th>Item</th><th className="jp-num">Qty</th><th className="jp-num">Price</th><th className="jp-num">Total</th></tr></thead><tbody>{cur.lines.map((l) => <tr key={l.sku}><td>{l.name}<div className="jp-muted adm-num" style={{ fontSize: "var(--jp-fs-xs)" }}>{l.sku}</div></td><td className="jp-num">{l.qty}</td><td className="jp-num">{money(l.price)}</td><td className="jp-num">{money(l.price * l.qty)}</td></tr>)}</tbody><tfoot><tr><td colSpan={3} style={{ textAlign: "end" }}>Subtotal</td><td className="jp-num">{money(t.sub)}</td></tr><tr><td colSpan={3} style={{ textAlign: "end" }}>GST (10%)</td><td className="jp-num">{money(t.gst)}</td></tr><tr><td colSpan={3} style={{ textAlign: "end" }}>Shipping</td><td className="jp-num">{money(t.ship)}</td></tr><tr><td colSpan={3} style={{ textAlign: "end" }}><b>Total</b></td><td className="jp-num"><b>{money(t.total)}</b></td></tr></tfoot></table>
          <ol className="vw-timeline">{[...cur.events].reverse().map((e, i) => <li key={i}><b>{e.text}</b><div className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>{when(e.at)}</div></li>)}</ol>
          <div className="adm-row"><Btn variant="primary" disabled={!NEXT(cur.status) || cur.status === "cancelled"} onClick={advance}>{NEXT(cur.status) && cur.status !== "cancelled" ? `Mark ${NEXT(cur.status)}` : "Complete"}</Btn><Btn className="adm-danger" variant="primary" disabled={cur.status === "delivered" || cur.status === "cancelled"} onClick={() => setCancel(true)}>Cancel order…</Btn></div></div>
          : <EmptyState spot="lens" title="Select an order">Line items and the timeline appear here.</EmptyState>}</Panel>
      </div>
      <ConfirmDelete open={cancel} what={cur?.id ?? ""} onClose={() => setCancel(false)} onConfirm={() => { if (cur) patch(cur.id, (o) => ({ ...o, status: "cancelled", events: [...o.events, { at: o.events[o.events.length - 1].at + 10, text: "Cancelled by staff" }] }), `${cur.id} cancelled`); setCancel(false); }} />
      <div className="adm-grid adm-grid--3" style={{ marginTop: 16 }}><StatTile label="Open orders" value={String(orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length)} /><StatTile label="Delivered" value={String(orders.filter((o) => o.status === "delivered").length)} /><StatTile label="Value (open)" value={money(orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).reduce((a, o) => a + orderTotal(o).total, 0))} /></div>
    </>
  );
}
