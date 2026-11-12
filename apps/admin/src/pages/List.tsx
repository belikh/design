import { useState } from "react";
import { PageHeader, Panel, Badge, Btn, Avatar, Menu, type Status } from "@belikh/jupiter-ui/kit.tsx";
import { Checkbox } from "@belikh/jupiter-ui/inputs.tsx";
import { people, services } from "../data/fixtures.ts";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";

export function List() {
  const { toast } = usePrefs(); const [sel, setSel] = useState<string[]>([]);
  const rows = services.map((s, i) => ({ ...s, people: people[i], updated: `${(i * 7) % 50 + 2}m ago` }));
  return (
    <>
      <PageHeader title="List view" desc="Rows with metadata and quick actions: the lightweight alternative to a table." crumbs={["Data", "List"]} />
      <Panel flush actions={sel.length ? <><b>{sel.length} selected</b><Btn sm onClick={() => { toast({ kind: "ok", title: "Archived", undo: () => {} }); setSel([]); }}>Archive</Btn></> : undefined} title="Services">
        <ul className="adm-list">
          {rows.map((r) => (
            <li key={r.name} className={sel.includes(r.name) ? "is-sel" : ""}>
              <Checkbox checked={sel.includes(r.name)} onChange={(v) => setSel((x) => (v ? [...x, r.name] : x.filter((y) => y !== r.name)))} label={<span className="adm-sr">Select {r.name}</span>} />
              <Avatar name={r.people} size={32} s={r.status as Status} />
              <div className="adm-list__main"><b className="adm-num">{r.name}</b><span className="jp-muted">{r.region} · owned by {r.people}</span></div>
              <Badge s={r.status}>{r.status === "ok" ? "healthy" : r.status === "warn" ? "degraded" : "down"}</Badge>
              <span className="jp-muted adm-num" style={{ minWidth: 70, textAlign: "right" }}>{r.latency} ms</span><span className="jp-muted" style={{ minWidth: 70, textAlign: "right" }}>{r.updated}</span>
              <Menu label="Actions" items={[{ label: "Open", onSelect: () => toast({ kind: "info", title: `Open ${r.name}` }) }, { label: "Restart", onSelect: () => toast({ kind: "warn", title: `Restarting ${r.name}` }) }, "sep", { label: "Delete", danger: true, onSelect: () => toast({ kind: "danger", title: `Deleted ${r.name}` }) }]} />
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
