import { useMemo, useState } from "react";
import { PageHeader, Badge, Btn, Avatar, Tip } from "@belikh/jupiter-ui/kit.tsx";
import { Spot } from "@belikh/jupiter-ui/Icon.tsx";
import { Segmented, Select, TextInput } from "@belikh/jupiter-ui/inputs.tsx";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";

const items = [
  ["kangaroo", "Roo hoppers", "Hardware", 129, "ok"], ["koala", "Eucalypt kit", "Hardware", 89, "ok"], ["wombat", "Burrow server", "Hardware", 349, "warn"], ["platypus", "Duck-bill probe", "Sensors", 59, "ok"],
  ["echidna", "Spiky firewall", "Network", 219, "ok"], ["emu", "Long-leg mast", "Network", 159, "danger"], ["kookaburra", "Laugh alarm", "Sensors", 39, "ok"], ["cockatoo", "Crest beacon", "Sensors", 49, "warn"],
  ["sgi-indy", "Indy restoration", "Retro", 480, "ok"], ["ibm-5160", "XT card (XTC)", "Retro", 260, "ok"], ["mac-se30", "SE/30 recap kit", "Retro", 140, "warn"], ["rocket", "Launch tier", "Plans", 99, "ok"],
] as const;
export function Cards() {
  const [q, setQ] = useState(""); const [cat, setCat] = useState("All"); const [view, setView] = useState<"grid" | "list">("grid"); const [fav, setFav] = useState<string[]>(["koala"]);
  const shown = useMemo(() => items.filter((i) => (cat === "All" || i[2] === cat) && i[1].toLowerCase().includes(q.toLowerCase())), [q, cat]);
  return (
    <>
      <PageHeader title="Card grid" desc="Gallery with spot illustrations, quick actions and a view switcher." crumbs={["Data", "Cards"]} actions={<Btn variant="primary" icon="plus">Add item</Btn>} />
      <div className="adm-row" style={{ marginBottom: 16 }}>
        <div style={{ width: 260 }}><TextInput value={q} onChange={setQ} placeholder="Filter items…" aria-label="Filter items" prefix={<Icon name="search" size={14} />} /></div>
        <div style={{ width: 160 }}><Select value={cat} onChange={setCat} aria-label="Category" options={["All", "Hardware", "Network", "Sensors", "Retro", "Plans"]} /></div>
        <span className="adm-spacer" /><Segmented label="View" value={view} onChange={setView} options={[{ value: "grid", label: "Grid" }, { value: "list", label: "List" }]} />
      </div>
      <div className={view === "grid" ? "adm-cardgrid" : "adm-stack"}>
        {shown.map(([spot, name, c, price, s]) => (
          <article key={spot} className={`adm-card ${view === "list" ? "adm-card--row" : ""}`}>
            <div className="adm-card__media"><Spot name={spot} size={view === "grid" ? 120 : 64} /></div>
            <div className="adm-card__body">
              <div className="adm-row" style={{ justifyContent: "space-between" }}><b>{name}</b><Tip text={fav.includes(spot) ? "Remove favourite" : "Favourite"}><button className="adm-x" aria-pressed={fav.includes(spot)} aria-label="Favourite" onClick={() => setFav((f) => (f.includes(spot) ? f.filter((x) => x !== spot) : [...f, spot]))} style={{ color: fav.includes(spot) ? "var(--jp-warn)" : undefined }}><Icon name="star" size={16} /></button></Tip></div>
              <div className="adm-row"><Badge>{c}</Badge><Badge s={s}>{s === "ok" ? "in stock" : s === "warn" ? "low" : "sold out"}</Badge></div>
              <div className="adm-row" style={{ justifyContent: "space-between", marginTop: 4 }}><span className="adm-num"><b>${price}</b></span><Btn sm icon="cart" disabled={s === "danger"}>Add</Btn></div>
            </div>
          </article>
        ))}
      </div>
      {!shown.length && <p className="jp-muted">No items match.</p>}
      <p className="jp-muted" style={{ marginTop: 16 }}>Owner <Avatar name="Ava Nguyen" size={20} /> · {shown.length} of {items.length}</p>
    </>
  );
}
