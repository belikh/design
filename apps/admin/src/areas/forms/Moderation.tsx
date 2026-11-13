import { useMemo, useState } from "react";
import { createCollection, useCollection } from "@belikh/jupiter-ui/mock.ts";
import { Alert, Avatar, Badge, Btn, EmptyState, Modal, PageHeader, Panel } from "@belikh/jupiter-ui/kit.tsx";
import { Field, Select, TextArea, Segmented } from "@belikh/jupiter-ui/inputs.tsx";
import { useFieldErrors } from "@belikh/jupiter-ui/forms.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { REJECT_REASONS, SEED_ITEMS, type Item } from "./lib.ts";
import "./p3a.css";

type Filter = "pending" | "approved" | "rejected";
export function Moderation() {
  const items = useMemo(() => createCollection<Item>(() => SEED_ITEMS.map((i) => ({ ...i })), { latency: 30, jitter: 10 }), []);
  const { rows } = useCollection(items); const { toast } = usePrefs();
  const [filter, setFilter] = useState<Filter>("pending"); const [selId, setSelId] = useState<string>(SEED_ITEMS[0].id); const [rejecting, setRejecting] = useState(false);
  const list = rows.filter((r) => r.status === filter).sort((a, b) => (a.priority === b.priority ? a.at.localeCompare(b.at) : a.priority === "high" ? -1 : 1));
  const cur = rows.find((r) => r.id === selId) ?? list[0]; const counts = (s: Filter) => rows.filter((r) => r.status === s).length;
  const decide = async (it: Item, status: Item["status"], reason: string) => {
    const prev = { status: it.status, reason: it.reason, decidedBy: it.decidedBy };
    await items.update(it.id, { status, reason, decidedBy: "You" });
    const next = list.find((x) => x.id !== it.id); if (next) setSelId(next.id);
    toast({ kind: status === "approved" ? "ok" : "info", title: `${it.id} ${status}`, body: reason || undefined, undo: () => { void items.update(it.id, prev); setSelId(it.id); } });
  };
  return (
    <>
      <PageHeader title="Moderation" crumbs={["Workflows", "Moderation"]} desc="Review flagged content. Rejecting needs a reason, which is sent to the author." status={<Badge s={counts("pending") ? "warn" : "ok"}>{counts("pending")} waiting</Badge>} />
      <div className="p3a-mod">
        <Panel title="Queue" flush>
          <div className="p3a-pad"><Segmented label="Status" value={filter} onChange={(v) => { setFilter(v); }} options={(["pending", "approved", "rejected"] as Filter[]).map((v) => ({ value: v, label: `${v[0].toUpperCase()}${v.slice(1)} (${counts(v)})` }))} /></div>
          {list.length === 0 ? <EmptyState title={filter === "pending" ? "Queue cleared" : "Nothing here"}>{filter === "pending" ? "All flagged items have been reviewed." : "No items with this status."}</EmptyState> : (
            <ul className="p3a-queue" aria-label={`${filter} items`}>{list.map((r) => <li key={r.id}><button aria-pressed={cur?.id === r.id} onClick={() => setSelId(r.id)}><span><b>{r.id}</b> {r.kind} by {r.author}</span><span className="adm-row">{r.priority === "high" && <Badge s="danger">High</Badge>}<Badge s="warn">{r.flags.length} flag{r.flags.length > 1 ? "s" : ""}</Badge></span></button></li>)}</ul>)}
        </Panel>
        {!cur ? <Panel title="Item"><EmptyState title="Select an item" /></Panel> : (
          <Panel title={`${cur.id}: ${cur.kind}`} actions={<Badge s={cur.status === "approved" ? "ok" : cur.status === "rejected" ? "danger" : "warn"}>{cur.status}</Badge>}>
            <div className="adm-stack">
              <div className="adm-row"><Avatar name={cur.author} /><b>{cur.author}</b><span className="jp-muted">{cur.priorRejects} earlier rejection{cur.priorRejects === 1 ? "" : "s"} · posted {cur.at}</span></div>
              <blockquote className="p3a-content">{cur.body}</blockquote>
              <section aria-label="Flags"><h3>Why it was flagged</h3><ul className="p3a-flags">{cur.flags.map((f, i) => <li key={i}><Badge s="warn">{f.reason}</Badge><span className="jp-muted">reported by {f.by}</span></li>)}</ul></section>
              {cur.priorRejects >= 3 && <Alert s="warn" title="Repeat offender">This author has had {cur.priorRejects} items rejected. Consider restricting their account.</Alert>}
              {cur.status === "pending" ? <div className="adm-row"><Btn variant="primary" onClick={() => void decide(cur, "approved", "")}>Approve</Btn><Btn onClick={() => setRejecting(true)}>Reject…</Btn></div> :
                <Alert s={cur.status === "approved" ? "ok" : "danger"} title={`${cur.status === "approved" ? "Approved" : "Rejected"} by ${cur.decidedBy || "someone"}`}>{cur.reason || "No reason recorded."}<div><Btn sm onClick={() => { const prev = { status: cur.status, reason: cur.reason, decidedBy: cur.decidedBy }; void items.update(cur.id, { status: "pending", reason: "", decidedBy: "" }); toast({ kind: "info", title: `${cur.id} returned to the queue`, undo: () => { void items.update(cur.id, prev); } }); setFilter("pending"); }}>Reopen</Btn></div></Alert>}
            </div>
          </Panel>)}
      </div>
      {rejecting && cur && <RejectDialog item={cur} onClose={() => setRejecting(false)} onReject={(reason) => { setRejecting(false); void decide(cur, "rejected", reason); }} />}
    </>
  );
}
function RejectDialog({ item, onClose, onReject }: { item: Item; onClose: () => void; onReject: (reason: string) => void }) {
  const [v, setV] = useState({ reason: REJECT_REASONS[0], note: "" });
  const f = useFieldErrors(v, { note: (n, all) => (all.reason.startsWith("Other") && n.trim().length < 5 ? "Explain the reason (at least 5 characters)" : null) });
  const submit = () => { if (f.submit() === true) onReject(v.note.trim() ? `${v.reason}: ${v.note.trim()}` : v.reason); };
  return (
    <Modal open onClose={onClose} title={`Reject ${item.id}`} footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={submit}>Reject item</Btn></>}>
      <form className="adm-stack" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Field label="Reason">{(id) => <Select id={id} value={v.reason} onChange={(reason) => setV({ ...v, reason })} options={REJECT_REASONS} />}</Field>
        <Field label="Note to the author" error={f.error("note")} hint="Optional unless you chose Other.">{(id, d) => <TextArea id={id} aria-describedby={d} rows={3} value={v.note} onChange={(note) => setV({ ...v, note })} onBlur={() => f.blur("note")} />}</Field>
      </form>
    </Modal>
  );
}
