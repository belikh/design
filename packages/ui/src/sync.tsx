import { Badge, Btn, Modal } from "./kit.tsx";
import type { Conflict } from "./mock.ts";

const ago = (t: number, now = Date.now()) => { const s = Math.max(0, Math.round((now - t) / 1000)); return s < 60 ? "just now" : s < 3600 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} h ago`; };

/** Offline, pending-changes and stale-data indicators for a collection. Render it next to a table or page title; it shows nothing when everything is in sync. */
export function SyncStatus({ online, pending, stale, updatedAt, onRefresh }: { online: boolean; pending: number; stale: boolean; updatedAt: number | null; onRefresh: () => void }) {
  return (
    <span className="adm-row" role="status" aria-live="polite">
      {!online && <Badge s="warn">Offline</Badge>}
      {pending > 0 && <Badge s="info">{pending} {pending === 1 ? "change" : "changes"} pending</Badge>}
      {stale && updatedAt !== null && <span className="jp-muted">Updated {ago(updatedAt)} <button type="button" className="adm-link" onClick={onRefresh}>Refresh</button></span>}
    </span>
  );
}

/** "Keep mine or take theirs" when a row changed under you. */
export function ConflictPrompt<T>({ conflict, field, show, onResolve }: { conflict: Conflict<T> | null; field: string; show?: (v: unknown) => string; onResolve: (keep: "mine" | "theirs") => void }) {
  const fmt = show ?? ((v: unknown) => (Array.isArray(v) ? v.join(", ") : String(v ?? "")));
  const theirs = conflict ? fmt((conflict.theirs as Record<string, unknown>)[conflict.key]) : "";
  return (
    <Modal open={!!conflict} onClose={() => onResolve("theirs")} size="sm" title="Someone else changed this"
      footer={<><Btn onClick={() => onResolve("theirs")}>Take theirs</Btn><Btn variant="primary" onClick={() => onResolve("mine")}>Keep mine</Btn></>}>
      <p>While you were editing <b>{field}</b>, another change was saved.</p>
      <dl className="adm-dl" style={{ gridTemplateColumns: "80px 1fr" }}><dt>Theirs</dt><dd>{theirs || "empty"}</dd><dt>Yours</dt><dd>{conflict ? fmt(conflict.mine) || "empty" : ""}</dd></dl>
    </Modal>
  );
}
