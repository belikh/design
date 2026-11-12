import { useState } from "react";
import { PageHeader, Badge, Btn, Avatar, Dot } from "@belikh/jupiter-ui/kit.tsx";
import { Switch } from "@belikh/jupiter-ui/inputs.tsx";
import { Editable, type EditValue } from "@belikh/jupiter-ui/editable.tsx";
import { tasks as seed, type Task } from "../data/fixtures.ts";

const cols: { id: Task["col"]; label: string; wip?: number }[] = [{ id: "backlog", label: "Backlog" }, { id: "doing", label: "In progress", wip: 3 }, { id: "review", label: "Review", wip: 3 }, { id: "done", label: "Done" }];
export function Board() {
  const [tasks, setTasks] = useState(seed); const [drag, setDrag] = useState<string | null>(null); const [over, setOver] = useState<string | null>(null); const [lanes, setLanes] = useState(false); const [adding, setAdding] = useState<Task["col"] | null>(null); const [title, setTitle] = useState("");
  const move = (id: string, col: Task["col"]) => setTasks((t) => t.map((x) => (x.id === id ? { ...x, col } : x)));
  const edit = (id: string, k: keyof Task) => (v: EditValue) => { setTasks((ts) => ts.map((x) => (x.id === id ? { ...x, [k]: v } : x))); return null; };
  // A plain function (not a component) so a card keeps its editing state when the board re-renders.
  const card = (t: Task) => (
    <article key={t.id} className="adm-kcard" draggable onDragStart={() => setDrag(t.id)} onDragEnd={() => { setDrag(null); setOver(null); }} aria-grabbed={drag === t.id}>
      <div className="adm-row" style={{ justifyContent: "space-between" }}><Editable value={t.tag} editor={{ type: "tags", options: ["new", "bug", "feature", "chore"], creatable: true }} label={`Tag for ${t.id}`} display={<Badge>{t.tag}</Badge>} onSave={(v) => edit(t.id, "tag")(Array.isArray(v) ? v[v.length - 1] ?? "" : v)} compact hideAffordance /><span className="jp-muted adm-num">{t.id}</span></div>
      <b><Editable value={t.title} editor={{ type: "text", maxLength: 80 }} label={`Title for ${t.id}`} validate={(v) => (String(v).trim() ? null : "A title is required")} onSave={edit(t.id, "title")} compact hideAffordance /></b>
      <div className="adm-row" style={{ justifyContent: "space-between" }}><Editable value={t.who} editor={{ type: "text" }} label={`Assignee for ${t.id}`} display={<Avatar name={t.who} size={22} />} onSave={edit(t.id, "who")} compact hideAffordance /><span className="adm-row"><Editable value={t.pts} editor={{ type: "number", min: 0, max: 40 }} label={`Points for ${t.id}`} display={<Badge pill>{t.pts} pt</Badge>} onSave={edit(t.id, "pts")} compact hideAffordance />
        <span className="adm-kmove"><button className="adm-x" aria-label="Move left" disabled={t.col === "backlog"} onClick={() => move(t.id, cols[Math.max(0, cols.findIndex((c) => c.id === t.col) - 1)].id)}>←</button><button className="adm-x" aria-label="Move right" disabled={t.col === "done"} onClick={() => move(t.id, cols[Math.min(3, cols.findIndex((c) => c.id === t.col) + 1)].id)}>→</button></span></span></div>
    </article>
  );
  const Col = ({ c, list }: { c: (typeof cols)[0]; list: Task[] }) => {
    const full = c.wip !== undefined && list.length > c.wip;
    return (
      <section className={`adm-kcol ${over === c.id ? "is-over" : ""}`} onDragOver={(e) => { e.preventDefault(); setOver(c.id); }} onDragLeave={() => setOver(null)} onDrop={() => { if (drag) move(drag, c.id); setDrag(null); setOver(null); }} aria-label={c.label}>
        <header><b>{c.label}</b><span className="adm-count">{list.length}{c.wip ? ` / ${c.wip}` : ""}</span>{full && <Badge s="warn">over WIP limit</Badge>}</header>
        <div className="adm-kcol__list">{list.map((t) => card(t))}</div>
        {adding === c.id ? <form onSubmit={(e) => { e.preventDefault(); if (title.trim()) setTasks((t) => [...t, { id: `T-${t.length + 1}`, title, col: c.id, who: "Ava Nguyen", tag: "new", pts: 1 }]); setTitle(""); setAdding(null); }}><input autoFocus className="jp-input" placeholder="Task title, Enter to add" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setAdding(null)} aria-label="New task title" /></form>
          : <button className="adm-kadd" onClick={() => setAdding(c.id)}>+ Add task</button>}
      </section>
    );
  };
  return (
    <>
      <PageHeader title="Kanban board" desc="Drag cards between columns (or use the arrows). WIP limits warn when exceeded." crumbs={["Data", "Board"]} actions={<><Switch checked={lanes} onChange={setLanes} label="Swimlanes by person" /><Btn variant="primary" icon="plus" onClick={() => setAdding("backlog")}>New task</Btn></>} />
      {!lanes ? <div className="adm-kanban">{cols.map((c) => <Col key={c.id} c={c} list={tasks.filter((t) => t.col === c.id)} />)}</div>
        : [...new Set(tasks.map((t) => t.who))].map((p) => (<div key={p} style={{ marginBottom: 20 }}><div className="adm-row" style={{ marginBottom: 8 }}><Avatar name={p} size={24} /><b>{p}</b><Dot s="info" /><span className="jp-muted">{tasks.filter((t) => t.who === p).length} tasks</span></div><div className="adm-kanban">{cols.map((c) => <Col key={c.id} c={c} list={tasks.filter((t) => t.col === c.id && t.who === p)} />)}</div></div>))}
    </>
  );
}
