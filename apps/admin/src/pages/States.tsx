import { useState } from "react";
import { PageHeader, Panel, Btn, Alert, EmptyState, Skeleton, Badge } from "@belikh/jupiter-ui/kit.tsx";
import { Segmented } from "@belikh/jupiter-ui/inputs.tsx";

const EMPTIES: [string, string, string, string][] = [
  ["empty", "No items yet", "Create your first one to get started.", "Create item"], ["no-results", "No results", "Try different keywords or clear the filters.", "Clear filters"], ["unplugged", "Something went wrong", "We couldn’t load this. It may be a temporary problem.", "Try again"],
  ["offline", "You’re offline", "Changes will sync when you’re back online.", "Retry"], ["not-found", "Page not found", "The link may be broken or the page may have moved.", "Go home"], ["maintenance", "Down for maintenance", "We’ll be back at 18:00 AEST.", "Status page"],
  ["locked", "You don’t have access", "Ask an admin to grant you the Editor role.", "Request access"], ["done", "All done", "Everything is complete.", "Back to overview"], ["syncing", "Syncing…", "Hang tight while we catch up.", "Cancel"], ["inbox-zero", "Inbox zero", "You’re all caught up.", "Compose"], ["update", "Update available", "Version 1.1 has new components.", "Update now"],
];
export function States() {
  const [banner, setBanner] = useState<"none" | "ro" | "maint" | "stale" | "impersonate">("none");
  return (
    <>
      <PageHeader title="States and errors" crumbs={["Library", "States"]} desc="Every view needs loading, empty, error, offline, no-permission and read-only states. These are the shared patterns." />
      <section><h2>Banners</h2><div className="adm-row" style={{ margin: "8px 0" }}><Segmented label="Banner" value={banner} onChange={setBanner} options={[{ value: "none", label: "None" }, { value: "ro", label: "Read-only" }, { value: "maint", label: "Maintenance" }, { value: "stale", label: "Stale data" }, { value: "impersonate", label: "Viewing as" }]} /></div>
        {banner === "ro" && <Alert s="warn" title="Read-only mode">You can view but not change anything right now.</Alert>}{banner === "maint" && <Alert s="warn" title="Scheduled maintenance tonight at 22:00">Expect a few minutes of downtime.</Alert>}{banner === "stale" && <Alert s="info" title="Showing data from 12 minutes ago">Live updates are paused. <a href="#" onClick={(e) => e.preventDefault()}>Refresh</a></Alert>}{banner === "impersonate" && <Alert s="danger" title="Viewing as Noah Smith">Actions are recorded against your account. <a href="#" onClick={(e) => e.preventDefault()}>Exit</a></Alert>}</section>
      <section className="adm-section"><h2>Empty / error / no-permission</h2><div className="adm-grid adm-grid--3">{EMPTIES.map(([spot, t, d, a]) => <Panel key={spot}><EmptyState spot={spot} title={t} action={<Btn sm variant={spot === "unplugged" ? "primary" : "secondary"}>{a}</Btn>}>{d}</EmptyState></Panel>)}</div></section>
      <section className="adm-section"><h2>Loading (skeletons)</h2><div className="adm-grid adm-grid--3"><Panel title="List"><div className="adm-stack">{[0, 1, 2, 3].map((i) => <div key={i} className="adm-row" style={{ flexWrap: "nowrap" }}><Skeleton w={32} h={32} r={16} /><div style={{ flex: 1 }} className="adm-stack"><Skeleton w={`${70 - i * 8}%`} /><Skeleton w="40%" /></div></div>)}</div></Panel><Panel title="Card"><div className="adm-stack"><Skeleton h={120} r={6} /><Skeleton w="60%" h={18} /><Skeleton /><Skeleton w="80%" /></div></Panel><Panel title="Stat tiles"><div className="adm-stack"><Skeleton w="30%" h={12} /><Skeleton w="55%" h={32} /><Skeleton w="40%" h={12} /></div></Panel></div></section>
      <section className="adm-section"><h2>Error pages</h2><div className="adm-row">{["401", "403", "404", "500", "503"].map((c) => <a key={c} className="jp-btn jp-btn--secondary" href={`/errors/${c}`}>{c}</a>)}<Badge>full-page versions</Badge></div></section>
    </>
  );
}
