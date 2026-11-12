import { useState } from "react";
import { PageHeader, Panel, Avatar, Btn, Badge, EmptyState } from "@belikh/jupiter-ui/kit.tsx";
import { Segmented } from "@belikh/jupiter-ui/inputs.tsx";
import { activity, people } from "../data/fixtures.ts";

const more = Array.from({ length: 12 }, (_, i) => ({ who: people[(i * 3) % people.length], what: ["pushed to", "closed", "opened", "approved", "restarted"][i % 5], target: ["jupiter-api", "PR #214", "ORD-10188", "release v1.0", "ha-bridge"][i % 5], when: `${i + 1} day${i ? "s" : ""} ago`, kind: (["info", "ok", "info", "ok", "warn"] as const)[i % 5] }));
export function Activity() {
  const [kind, setKind] = useState<"all" | "ok" | "warn" | "danger" | "info">("all"); const [n, setN] = useState(10);
  const all = [...activity, ...more]; const list = all.filter((a) => kind === "all" || a.kind === kind);
  return (
    <>
      <PageHeader title="Activity" desc="An audit-style feed: who did what, to what, and when." crumbs={["Tools", "Activity"]} actions={<Segmented label="Filter" value={kind} onChange={setKind} options={[{ value: "all", label: "All" }, { value: "ok", label: "Success" }, { value: "info", label: "Info" }, { value: "warn", label: "Warnings" }, { value: "danger", label: "Alerts" }]} />} />
      <div style={{ maxWidth: 760 }}>
        <Panel flush>{list.length ? <ul className="adm-list">{list.slice(0, n).map((a, i) => <li key={i} style={{ alignItems: "flex-start" }}><Avatar name={a.who} size={32} /><div className="adm-list__main"><span><b>{a.who}</b> {a.what} <span className="adm-num">{a.target}</span></span><span className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>{a.when}</span></div><Badge s={a.kind}>{a.kind}</Badge></li>)}</ul> : <EmptyState spot="inbox-zero" title="Nothing here">No activity of this kind.</EmptyState>}</Panel>
        {n < list.length && <div style={{ textAlign: "center", marginTop: 12 }}><Btn onClick={() => setN(n + 10)}>Load more ({list.length - n})</Btn></div>}
      </div>
    </>
  );
}
