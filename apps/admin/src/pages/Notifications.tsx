import { useState } from "react";
import { PageHeader, Panel, Btn, Badge, Tabs, Menu, EmptyState, Dot } from "@belikh/jupiter-ui/kit.tsx";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";

type N = { id: number; icon: string; kind: "ok" | "warn" | "danger" | "info"; title: string; body: string; when: string; unread: boolean; mention?: boolean; group: string; /** A visible one-click action for this notification (the menu keeps the rest). */ act?: string };
const seed: N[] = [
  { id: 1, icon: "alert", kind: "danger", title: "pxe-boot is unreachable", body: "5 consecutive health checks failed.", when: "9m", unread: true, group: "Today", act: "Retry check" },
  { id: 2, icon: "chat", kind: "info", title: "Noah Smith mentioned you", body: "“Can you review the GTK widgets CSS?”", when: "21m", unread: true, mention: true, group: "Today", act: "Reply" },
  { id: 3, icon: "success", kind: "ok", title: "Deploy v4.12.0 finished", body: "3/3 pods healthy.", when: "1h", unread: true, group: "Today", act: "View logs" },
  { id: 4, icon: "clock", kind: "warn", title: "Certificate renews in 9 days", body: "jupiter.au (Let’s Encrypt).", when: "3h", unread: false, group: "Today", act: "Renew now" },
  { id: 5, icon: "card", kind: "ok", title: "Invoice INV-0042 paid", body: "$3,091.55 received.", when: "Mon", unread: false, group: "Earlier" },
  { id: 6, icon: "chat", kind: "info", title: "Mia Patel replied", body: "“Looks good to me, ship it.”", when: "Sun", unread: false, mention: true, group: "Earlier" },
];
export function Notifications() {
  const { toast } = usePrefs(); const [items, setItems] = useState(seed); const [tab, setTab] = useState("all");
  const list = items.filter((n) => tab === "all" || (tab === "unread" && n.unread) || (tab === "mentions" && n.mention));
  const groups = [...new Set(list.map((n) => n.group))];
  return (
    <>
      <PageHeader title="Notifications" crumbs={["Tools", "Notifications"]} desc="Grouped by day, with unread state, mentions, snooze and bulk mark-as-read." actions={<Btn icon="check" onClick={() => { setItems(items.map((n) => ({ ...n, unread: false }))); toast({ kind: "ok", title: "All marked as read" }); }}>Mark all read</Btn>}
        tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: "all", label: "All", count: items.length }, { id: "unread", label: "Unread", count: items.filter((n) => n.unread).length }, { id: "mentions", label: "Mentions", count: items.filter((n) => n.mention).length }]} />} />
      <div style={{ maxWidth: 760 }}>
        {groups.length ? groups.map((g) => <section key={g} className="adm-section" style={{ marginTop: 16 }}><h2 style={{ fontSize: "var(--jp-fs-sm)" }} className="jp-muted">{g}</h2><Panel flush><ul className="adm-list">{list.filter((n) => n.group === g).map((n) => (
          <li key={n.id} style={{ alignItems: "flex-start", opacity: n.unread ? 1 : 0.75 }}><span className={`adm-nicon is-${n.kind}`}><Icon name={n.icon} size={18} /></span><div className="adm-list__main"><span className="adm-row"><b>{n.title}</b>{n.unread && <Dot s="info" />}{n.mention && <Badge s="info">mention</Badge>}</span><span className="jp-muted">{n.body}</span></div><span className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>{n.when}</span>
            <span className="adm-notif__acts">{n.act && <Btn sm onClick={() => { const before = items; setItems(items.map((x) => (x.id === n.id ? { ...x, unread: false } : x))); toast({ kind: "ok", title: `${n.act}: ${n.title}`, undo: () => setItems(before) }); }}>{n.act}</Btn>}{n.unread && <Btn sm variant="ghost" icon="check" aria-label={`Mark ${n.title} as read`} onClick={() => { const before = items; setItems(items.map((x) => (x.id === n.id ? { ...x, unread: false } : x))); toast({ kind: "info", title: "Marked as read", undo: () => setItems(before) }); }} />}</span><Menu ariaLabel={`More actions for ${n.title}`} label="•••" items={[{ label: n.unread ? "Mark as read" : "Mark as unread", onSelect: () => setItems(items.map((x) => (x.id === n.id ? { ...x, unread: !x.unread } : x))) }, { label: "Snooze 1 hour", onSelect: () => { setItems(items.filter((x) => x.id !== n.id)); toast({ kind: "info", title: "Snoozed for 1 hour", undo: () => setItems(items) }); } }, "sep", { label: "Delete", danger: true, onSelect: () => setItems(items.filter((x) => x.id !== n.id)) }]} /></li>))}</ul></Panel></section>)
          : <EmptyState spot="inbox-zero" title="You’re all caught up">No notifications here.</EmptyState>}
      </div>
    </>
  );
}
