import { useMemo, useState } from "react";
import { createCollection, useCollection } from "@belikh/jupiter-ui/mock.ts";
import { ConflictPrompt, SyncStatus } from "@belikh/jupiter-ui/sync.tsx";
import { Btn } from "@belikh/jupiter-ui/kit.tsx";
import { PageHeader, Panel } from "@belikh/jupiter-ui/kit.tsx";
import { DataTable, type Col } from "@belikh/jupiter-ui/DataTable.tsx";
import { Editable } from "@belikh/jupiter-ui/editable.tsx";

type Row = { id: string; rev: number; name: string; status: string; qty: number; owner: string; cost: number; due: string; tags: string[]; active: boolean };
const STATUS = [{ value: "Open", label: "Open", s: "info" as const }, { value: "In progress", label: "In progress", s: "warn" as const }, { value: "Done", label: "Done", s: "ok" as const }];
const seed = (): Row[] => Array.from({ length: 14 }, (_, i) => ({ id: `T-${100 + i}`, rev: 1, name: ["Pick list", "Dock check", "Label run", "Cycle count", "Returns"][i % 5] + ` ${i + 1}`, status: STATUS[i % 3].value, qty: (i * 7) % 40 + 1, owner: i % 3 ? ["Ava Nguyen", "Sam Lee"][i % 2] : "", cost: 120 + i * 35.5, due: `2026-12-${String(i + 1).padStart(2, "0")}`, tags: i % 2 ? ["urgent"] : [], active: i % 4 !== 0 }));

/** Reference page for edit-in-place and bulk edit. Copy the column specs; the table does the rest. */
export function EditLab() {
  const [title, setTitle] = useState("Warehouse tasks"); const [failOn, setFailOn] = useState(false);
  // One mock collection: async, with latency and an injectable failure. Swap data/mock.ts for a real API later.
  const tasks = useMemo(() => createCollection<Row>(seed, { failWhen: (op, id) => (failOn && op === "update" && id?.endsWith("3") ? "Server rejected this row" : null) }), []); // eslint-disable-line react-hooks/exhaustive-deps
  tasks.opts.failWhen = (op, id) => (failOn && op === "update" && id?.endsWith("3") ? "Server rejected this row" : null);
  const { rows, save: commit, online, pending, stale, updatedAt, refresh, conflict, resolveConflict } = useCollection(tasks, { staleAfter: 60000 });
  const cols: Col<Row>[] = [
    { key: "id", header: "ID", width: 90 },
    { key: "name", header: "Task", width: 190, editor: { type: "text", maxLength: 60 }, validate: (v) => (String(v).trim() ? null : "A name is required") },
    { key: "status", header: "Status", width: 150, editor: { type: "select", options: STATUS } },
    { key: "qty", header: "Qty", width: 100, align: "right", editor: { type: "number", min: 0, max: 999 }, locked: (r) => (r.status === "Done" ? "Completed tasks are final" : undefined), validate: (v) => (Number(v) < 0 ? "Can’t be negative" : null) },
    { key: "owner", header: "Owner", width: 170, editor: { type: "text", avatar: true } },
    { key: "cost", header: "Cost", width: 120, align: "right", editor: { type: "number", currency: "AUD", min: 0 }, value: (r) => r.cost, fmt: (v) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(v) },
    { key: "due", header: "Due", width: 150, editor: { type: "date" } },
    { key: "tags", header: "Tags", width: 170, editor: { type: "tags", options: ["urgent", "fragile", "chilled"], creatable: true }, value: (r) => r.tags.join(", ") },
    { key: "active", header: "Active", width: 100, editor: { type: "boolean" }, value: (r) => (r.active ? "Yes" : "No") },
  ];
  return (
    <>
      <PageHeader title={<Editable value={title} editor={{ type: "text" }} label="Page title" onSave={(v) => setTitle(String(v))} />} desc="Double-click or press Enter or F2 on a cell to edit. Check rows, then Edit fields to change many at once. Ctrl/Cmd+D fills down." crumbs={["Tables", "Edit and bulk edit"]} />
      <Panel title="Tasks" actions={<><SyncStatus online={online} pending={pending} stale={stale} updatedAt={updatedAt} onRefresh={refresh} /><Btn sm variant="ghost" onClick={() => tasks.externalUpdate("T-104", { name: "Changed by a colleague" })}>Simulate a colleague’s edit to T-104</Btn><label className="adm-check"><input type="checkbox" checked={failOn} onChange={(e) => setFailOn(e.target.checked)} /><span>Make T-103 and T-113 fail</span></label></>}>
        <DataTable rows={rows} cols={cols} onCommit={commit} onAdd={async (v) => { try { await tasks.create({ rev: 1, name: "", status: "Open", qty: 0, owner: "", cost: 0, due: "", tags: [], active: true, ...v }); return null; } catch (e) { return e instanceof Error ? e.message : "Couldn’t add"; } }} peek peekRelated={(r) => rows.filter((x) => x.owner && x.owner === r.owner)} views="edit-lab" rangeSelect pageSize={25} exportName="tasks" ariaLabel="Editable tasks" />
      </Panel>
      <ConflictPrompt conflict={conflict} field="Task" onResolve={(k) => void resolveConflict(k)} />
    </>
  );
}
