import { useEffect, useState } from "react";
import { PageHeader, Badge, Btn, Avatar, EmptyState } from "@belikh/jupiter-ui/kit.tsx";
import { TextArea } from "@belikh/jupiter-ui/inputs.tsx";
import { people } from "../data/fixtures.ts";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";

const seed = [
  ["Cert renewal needs a DNS record", "Add the _acme-challenge TXT record for jupiter.au so the renewal can finish before the 21st.", "10:42", true], ["Re: UniFi VLAN plan", "I’ve split IoT and cameras into separate VLANs. Can you check the firewall zones?", "09:15", true],
  ["Weekly digest", "12 deploys, 2 incidents, 99.94% uptime. Details inside.", "Yesterday", false], ["PXE boot failing on node 3", "It gets a lease but never fetches the kernel. Logs attached.", "Yesterday", true], ["Invoice INV-0042 paid", "Thanks! Payment of $3,091.55 has been received.", "Mon", false], ["Welcome to the team", "Here’s everything you need to get started.", "Sun", false],
].map(([s, b, t, u], i) => ({ id: i, subject: s as string, body: b as string, time: t as string, unread: u as boolean, from: people[i + 2], thread: [{ who: people[i + 2], text: b as string, t: t as string }] }));
export function Inbox() {
  const { toast } = usePrefs(); const [msgs, setMsgs] = useState(seed); const [sel, setSel] = useState<number | null>(0); const [reply, setReply] = useState("");
  const cur = msgs.find((m) => m.id === sel);
  useEffect(() => { if (sel !== null) setMsgs((m) => m.map((x) => (x.id === sel ? { ...x, unread: false } : x))); }, [sel]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.target as HTMLElement).closest("input,textarea")) return; if (e.key === "j") setSel((s) => Math.min(msgs.length - 1, (s ?? -1) + 1)); if (e.key === "k") setSel((s) => Math.max(0, (s ?? 1) - 1)); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [msgs.length]);
  return (
    <>
      <PageHeader title="Inbox" desc="Master-detail: list on the left, thread and composer on the right. Keys: j / k to move." crumbs={["Data", "Inbox"]} actions={<Btn variant="primary" icon="send">Compose</Btn>} />
      <div className="adm-split">
        <aside className="jp-panel" style={{ overflow: "auto" }} aria-label="Messages"><ul className="adm-list adm-list--tight">{msgs.map((m) => (
          <li key={m.id} className={sel === m.id ? "is-sel" : ""} onClick={() => setSel(m.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setSel(m.id)} style={{ cursor: "pointer", alignItems: "flex-start" }}>
            <Avatar name={m.from} size={32} /><div className="adm-list__main"><div className="adm-row" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}><b style={{ fontWeight: m.unread ? 800 : 500 }}>{m.from}</b><span className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>{m.time}</span></div><span style={{ fontWeight: m.unread ? 700 : 400 }}>{m.subject}</span><span className="jp-muted adm-clamp">{m.body}</span></div>{m.unread && <span className="adm-dot adm-dot--info" aria-label="unread" />}</li>))}</ul></aside>
        <section className="jp-panel adm-thread">
          {cur ? (<><header className="jp-panel__bar"><h3 className="jp-panel__title" style={{ textTransform: "none", letterSpacing: 0 }}>{cur.subject}</h3><div className="adm-row"><Badge>inbox</Badge><Btn sm variant="ghost" onClick={() => { setMsgs((m) => m.filter((x) => x.id !== cur.id)); setSel(null); toast({ kind: "warn", title: "Archived" }); }}>Archive</Btn></div></header>
            <div className="adm-thread__body">{cur.thread.map((t, i) => <div key={i} className={`adm-msg ${t.who === "Ava Nguyen" ? "is-me" : ""}`}><Avatar name={t.who} size={28} /><div><b>{t.who}</b> <span className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>{t.t}</span><p>{t.text}</p></div></div>)}</div>
            <footer className="adm-thread__reply"><TextArea value={reply} onChange={setReply} placeholder={`Reply to ${cur.from}…`} aria-label="Reply" /><div className="adm-row" style={{ justifyContent: "flex-end" }}><Btn variant="primary" icon="send" disabled={!reply.trim()} onClick={() => { setMsgs((m) => m.map((x) => (x.id === cur.id ? { ...x, thread: [...x.thread, { who: "Ava Nguyen", text: reply, t: "now" }] } : x))); setReply(""); toast({ kind: "ok", title: "Reply sent" }); }}>Send</Btn></div></footer></>)
            : <EmptyState spot="inbox-zero" title="Select a message">Pick something from the list to read it.</EmptyState>}
        </section>
      </div>
    </>
  );
}
