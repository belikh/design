import { useState } from "react";
import "./tables.css";
import { PageHeader, Panel, Badge, Alert } from "@belikh/jupiter-ui/kit.tsx";
import { DataTable, type Col } from "@belikh/jupiter-ui/DataTable.tsx";
import { people } from "../../data/fixtures.ts";

type Task = { id: string; title: string; owner: string; pts: number };
const T = (id: string, title: string, i: number, pts: number): Task => ({ id, title, owner: people[i % people.length], pts });
const SEED: Task[] = [T("T-1", "Migrate DNS to unbound", 0, 5), T("T-2", "Add UniFi VLAN for cameras", 1, 3), T("T-3", "Rotate WireGuard keys", 2, 2), T("T-4", "Write ESPHome OTA doc", 3, 1), T("T-5", "Port theme to Slint", 4, 8), T("T-6", "ZFS scrub schedule", 5, 3)];
const cols: Col<Task>[] = [{ key: "id", header: "ID", width: 70 }, { key: "title", header: "Task", width: 240 }, { key: "owner", header: "Owner", width: 150 }, { key: "pts", header: "Pts", width: 60, align: "right", agg: "sum" }];

export function Reorder() {
  const [list, setList] = useState<Task[]>(SEED.slice(0, 3)); const [backlog, setBacklog] = useState<Task[]>(SEED.slice(3)); const [ranked, setRanked] = useState<Task[]>(SEED);
  const give = (set: React.Dispatch<React.SetStateAction<Task[]>>) => (row: Task, beforeId: string | null) => set((rs) => { const next = rs.filter((r) => r.id !== row.id); const at = beforeId ? next.findIndex((r) => r.id === beforeId) : -1; next.splice(at < 0 ? next.length : at, 0, row); return next; });
  const take = (set: React.Dispatch<React.SetStateAction<Task[]>>) => (id: string) => set((rs) => rs.filter((r) => r.id !== id));
  return (
    <>
      <PageHeader title="Reorder rows" crumbs={["Grids", "Reorder"]} desc="Drag the ⠿ handle, or focus it and press Alt+↑ / Alt+↓ (Home / End for top and bottom). Rows can also be dragged between tables." />
      <Alert s="info" title="Keyboard and pointer">Handles are disabled while a sort, search or filter is active, because the order would not be the stored order. Moves are announced to screen readers.</Alert>
      <Panel title="Priority list (B026)" className="adm-section" flush actions={<Badge>{ranked.map((r) => r.id).join(" › ")}</Badge>}>
        <DataTable<Task> rows={ranked} cols={cols} selectable={false} reorderable onReorder={setRanked} pageSize={10} exportName="priorities" />
      </Panel>
      <div className="adm-grid adm-grid--2 adm-section">
        <Panel title={`Backlog (${backlog.length}), drag between tables (B016)`} flush>
          <DataTable<Task> rows={backlog} cols={cols} selectable={false} reorderable dragGroup="tasks" onReorder={setBacklog} onReceive={give(setBacklog)} onMoveOut={take(setBacklog)} pageSize={10} ariaLabel="Backlog" />
        </Panel>
        <Panel title={`Doing (${list.length})`} flush>
          <DataTable<Task> rows={list} cols={cols} selectable={false} reorderable dragGroup="tasks" onReorder={setList} onReceive={give(setList)} onMoveOut={take(setList)} pageSize={10} ariaLabel="Doing" />
        </Panel>
      </div>
    </>
  );
}
