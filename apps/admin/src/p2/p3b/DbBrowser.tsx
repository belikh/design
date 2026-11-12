import { useMemo, useState } from "react";
import { PageHeader, Panel, Btn, Badge, Tabs, CodeBlock } from "@belikh/jupiter-ui/kit.tsx";
import { DataTable, type Col } from "@belikh/jupiter-ui/DataTable.tsx";
import { useWidth } from "@belikh/jupiter-ui/Charts.tsx";
import type { EditValue } from "@belikh/jupiter-ui/editable.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { referencing, seedDb, sqlFor, validateValue, type DbTable } from "./lib/db.ts";
import "./p3b.css";

type Row = { id: string } & Record<string, string | number | boolean | null>;
const BW = 190, ROW = 18, HEAD = 26;
const boxH = (t: DbTable) => HEAD + t.cols.length * ROW + 8;

export function DbBrowser() {
  const { toast } = usePrefs();
  const [db, setDb] = useState<DbTable[]>(seedDb); const [name, setName] = useState("orders"); const [tab, setTab] = useState("rows");
  const [filter, setFilter] = useState<{ table: string; col: string; val: string } | null>(null);
  const [wrap, W] = useWidth();
  const table = db.find((t) => t.name === name)!;
  const back = referencing(db, name);
  const go = (t: string, f: { col: string; val: string } | null) => { setName(t); setFilter(f ? { table: t, ...f } : null); setTab("rows"); };
  const rows: Row[] = useMemo(() => table.rows.filter((r) => !filter || filter.table !== name || String(r[filter.col]) === filter.val).map((r) => ({ ...r, id: String(r.id) })), [table, filter, name]);
  const commit = (r: Row, key: string, v: EditValue) => {
    const c = table.cols.find((x) => x.name === key)!; const nv = c.type === "bool" ? Boolean(v) : c.type === "int" || c.type === "numeric" ? (v === "" ? null : Number(v)) : (v === "" ? null : String(v));
    const err = validateValue(db, name, c, v); if (err) return err;
    const old = db; setDb(db.map((t) => (t.name === name ? { ...t, rows: t.rows.map((x) => (String(x.id) === r.id ? { ...x, [key]: nv } : x)) } : t)));
    toast({ kind: "ok", title: `Updated ${name}.${key}`, undo: () => setDb(old) }); return null;
  };
  const cols: Col<Row>[] = table.cols.flatMap((c): Col<Row>[] => {
    const main: Col<Row> = {
      key: c.name, header: c.name, width: c.type === "text" ? 170 : 110, align: c.type === "int" || c.type === "numeric" ? "right" : undefined, sortable: true, filter: c.type === "text" ? "text" : undefined,
      editor: c.pk ? undefined : c.type === "bool" ? { type: "boolean" } : c.type === "text" ? { type: "text" } : { type: "number" },
      render: (r) => (r[c.name] === null ? <span className="jp-muted">NULL</span> : String(r[c.name])),
    };
    // A foreign key keeps its editable value column; a separate link column follows the reference.
    return c.fk ? [main, { key: `${c.name}__go`, header: `Open ${c.fk.table}`, width: 120, sortable: false, value: (r) => String(r[c.name] ?? ""), render: (r) => (r[c.name] === null ? null : <button className="p3-link" onClick={() => go(c.fk!.table, { col: c.fk!.col, val: String(r[c.name]) })} aria-label={`Open ${c.fk!.table} ${String(r[c.name])}`}>{c.fk!.table} {String(r[c.name])} →</button>) }] : [main];
  });
  const pos = (t: DbTable) => ({ x: t.x, y: t.y });
  const erW = Math.max(W, 700);
  return (
    <>
      <PageHeader title="Database browser" crumbs={["Data", "Database browser"]} desc="Browse tables, follow foreign keys, and edit rows in place. Edits are checked against types and foreign keys, and can be undone."
        status={<Badge s="info">{db.length} tables</Badge>} />
      <div className="p3-split p3-split--side">
        <Panel title="Tables" flush><ul className="p3-tree" aria-label="Tables">{db.map((t) => <li key={t.name}><button className={name === t.name ? "is-on" : ""} aria-current={name === t.name ? "true" : undefined} onClick={() => go(t.name, null)}>{t.name}<span className="jp-muted adm-num">{t.rows.length}</span></button></li>)}</ul></Panel>
        <div className="adm-stack">
          <Tabs tabs={[{ id: "rows", label: "Rows", count: rows.length }, { id: "structure", label: "Structure" }, { id: "relations", label: "Relations" }]} value={tab} onChange={setTab} />
          {tab === "rows" && <Panel title={name} flush actions={filter && filter.table === name ? <div className="adm-row"><Badge s="info">{filter.col} = {filter.val}</Badge><Btn sm variant="ghost" onClick={() => setFilter(null)}>Clear filter</Btn></div> : undefined}>
            <DataTable<Row> key={name} rows={rows} cols={cols} ariaLabel={`${name} rows`} exportName={name} pageSize={10} onCommit={commit} />
            {back.length > 0 && <div className="p3-related"><span className="jp-muted">Referenced by:</span> {back.map((b) => <Btn key={`${b.table}.${b.col}`} sm variant="ghost" onClick={() => go(b.table, null)}>{b.table}.{b.col}</Btn>)}</div>}
          </Panel>}
          {tab === "structure" && <Panel title={`${name} structure`}>
            <table className="jp-table"><thead><tr><th scope="col">Column</th><th scope="col">Type</th><th scope="col">Constraints</th></tr></thead><tbody>{table.cols.map((c) => <tr key={c.name}><td><code>{c.name}</code></td><td>{c.type}</td><td>{[c.pk && "primary key", c.fk && `→ ${c.fk.table}.${c.fk.col}`, c.nullable ? "nullable" : "not null"].filter(Boolean).join(", ")}</td></tr>)}</tbody></table>
            <div className="p3-gap" /><CodeBlock code={sqlFor(table)} label="CREATE TABLE statement" />
          </Panel>}
          {tab === "relations" && <Panel title="Relations">
            <div ref={wrap}><svg width={erW} height={300} viewBox={`0 0 ${erW} 300`} role="group" aria-label="Entity relationship diagram">
              {db.flatMap((t) => t.cols.filter((c) => c.fk).map((c) => { const to = db.find((x) => x.name === c.fk!.table)!; const a = pos(t), b = pos(to); const ay = a.y + HEAD + t.cols.indexOf(c) * ROW + ROW / 2, by = b.y + boxH(to) / 2; const left = b.x < a.x; const x1 = left ? a.x : a.x + BW, x2 = left ? b.x + BW : b.x; const same = b.x === a.x;
                return <path key={`${t.name}.${c.name}`} className="p3-fk" d={same ? `M${a.x + BW},${ay} C${a.x + BW + 50},${ay} ${a.x + BW + 50},${by} ${b.x + BW},${by}` : `M${x1},${ay} C${(x1 + x2) / 2},${ay} ${(x1 + x2) / 2},${by} ${x2},${by}`} />; }))}
              {db.map((t) => <g key={t.name} transform={`translate(${t.x},${t.y})`} className={`p3-er ${t.name === name ? "is-sel" : ""}`} role="button" tabIndex={0} aria-label={`Table ${t.name}, ${t.cols.length} columns`} onClick={() => go(t.name, null)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(t.name, null); } }}>
                <rect width={BW} height={boxH(t)} rx="8" /><text x="10" y="18" className="p3-er-title">{t.name}</text>
                {t.cols.map((c, i) => <text key={c.name} x="10" y={HEAD + i * ROW + 13} className="p3-er-col">{c.pk ? "◆ " : c.fk ? "→ " : "  "}{c.name} <tspan className="p3-er-type">{c.type}</tspan></text>)}</g>)}
            </svg></div>
            <p className="jp-muted p3-note">Select a table to open it. ◆ primary key, → foreign key.</p>
          </Panel>}
        </div>
      </div>
    </>
  );
}
