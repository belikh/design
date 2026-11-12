import { useMemo, useState } from "react";
import { PageHeader, Panel, Btn, Badge, EmptyState, Alert } from "@belikh/jupiter-ui/kit.tsx";
import { Field, Select, Switch, TextInput, Segmented } from "@belikh/jupiter-ui/inputs.tsx";
import { BarChart } from "@belikh/jupiter-ui/Charts.tsx";
import { DataTable, type Col } from "@belikh/jupiter-ui/DataTable.tsx";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";
import { TABLES } from "../lib/data.ts";
import { runSql, SqlError, type Cell, type Row } from "../lib/sql.ts";
import { buildSql, type Cond, type Spec } from "../lib/qb.ts";
import { CodeBlock } from "@belikh/jupiter-ui/kit.tsx";
import { useStored } from "../common.tsx";

const OPS = ["=", "<>", ">", ">=", "<", "<=", "like", "in", "is null", "is not null"];
const NUMERIC = (rows: Row[], c: string) => typeof rows.find((r) => r[c] !== null)?.[c] === "number";
const init = (table: string): Spec => ({ table, cols: [], conds: [], join: "and", groupBy: "", aggFn: "", aggCol: "", orderBy: "", desc: false, limit: 25 });
type Saved = { name: string; spec: Spec };
export function QueryBuilder() {
  const [spec, setSpec] = useState<Spec>({ ...init("orders"), conds: [{ col: "status", op: "=", value: "paid" }], groupBy: "region", aggFn: "sum", aggCol: "amount", orderBy: "sum_amount", desc: true, limit: 10 });
  const [saved, setSaved] = useStored<Saved[]>("pt-reports", []); const [name, setName] = useState("");
  const rows = TABLES[spec.table]; const cols = Object.keys(rows[0]); const set = (p: Partial<Spec>) => setSpec((s) => ({ ...s, ...p }));
  const sql = useMemo(() => buildSql(spec), [spec]);
  const res = useMemo(() => { try { return { ok: runSql(sql, TABLES) }; } catch (e) { return { err: e instanceof SqlError ? e.message : String(e) }; } }, [sql]);
  const upd = (i: number, p: Partial<Cond>) => set({ conds: spec.conds.map((c, j) => (j === i ? { ...c, ...p } : c)) });
  const numCols = cols.filter((c) => NUMERIC(rows, c));
  const gridCols: Col<Row & { id: string }>[] = res.ok ? res.ok.columns.map((c, j) => ({ key: `c${j}`, header: c, align: NUMERIC(res.ok!.rows, c) ? "right" : undefined })) : [];
  const gridRows = res.ok ? res.ok.rows.map((r, i) => ({ id: String(i), ...Object.fromEntries(res.ok!.columns.map((c, j) => [`c${j}`, r[c] as Cell])) })) : [];
  const chartable = res.ok && spec.groupBy && res.ok.columns.length >= 2 && res.ok.rows.length > 0 && typeof res.ok.rows[0][res.ok.columns[1]] === "number";
  return (
    <>
      <PageHeader title="Report builder" crumbs={["Tools", "Report builder"]} desc="Pick a dataset, columns, filters and a grouping; it writes the SQL for you and runs it. Save reports to reuse them."
        actions={<><div style={{ width: 160 }}><TextInput value={name} onChange={setName} placeholder="Report name" aria-label="Report name" /></div><Btn icon="bookmark" disabled={!name.trim()} onClick={() => { setSaved([...saved.filter((s) => s.name !== name), { name, spec }]); setName(""); }}>Save</Btn></>} />
      <div className="pt-split" style={{ gridTemplateColumns: "340px minmax(0, 1fr)" }}>
        <div className="adm-stack">
          <Panel title="Dataset">
            <div className="adm-stack">
              <Field label="Table">{(id) => <Select id={id} value={spec.table} onChange={(t) => setSpec(init(t))} options={Object.keys(TABLES)} />}</Field>
              <Field label="Columns" hint={spec.groupBy || spec.aggFn ? "Ignored while grouping or aggregating" : "Leave empty for all columns"}>{() => <div className="pt-chips">{cols.map((c) => <button key={c} type="button" className={`adm-pill ${spec.cols.includes(c) ? "is-on" : ""}`} aria-pressed={spec.cols.includes(c)} onClick={() => set({ cols: spec.cols.includes(c) ? spec.cols.filter((x) => x !== c) : [...spec.cols, c] })}>{c}</button>)}</div>}</Field>
            </div>
          </Panel>
          <Panel title="Filters" actions={<Segmented label="Combine with" value={spec.join} onChange={(j) => set({ join: j })} options={[{ value: "and", label: "AND" }, { value: "or", label: "OR" }]} />}>
            <div className="pt-rules">
              {spec.conds.map((c, i) => (
                <div key={i} className="pt-rule" style={{ gridTemplateColumns: "1fr 80px 1fr 30px" }}>
                  <Select value={c.col} onChange={(v) => upd(i, { col: v })} options={cols} aria-label={`Filter ${i + 1} column`} />
                  <Select value={c.op} onChange={(v) => upd(i, { op: v })} options={OPS} aria-label={`Filter ${i + 1} operator`} />
                  <TextInput value={c.value} onChange={(v) => upd(i, { value: v })} disabled={c.op.startsWith("is ")} placeholder={c.op === "in" ? "a, b, c" : "value"} aria-label={`Filter ${i + 1} value`} />
                  <button className="adm-x" aria-label={`Remove filter ${i + 1}`} onClick={() => set({ conds: spec.conds.filter((_, j) => j !== i) })}>×</button>
                </div>))}
              <Btn sm variant="ghost" icon="plus" onClick={() => set({ conds: [...spec.conds, { col: cols[0], op: "=", value: "" }] })}>Add filter</Btn>
            </div>
          </Panel>
          <Panel title="Group, aggregate, sort">
            <div className="adm-stack">
              <Field label="Group by">{(id) => <Select id={id} value={spec.groupBy} onChange={(v) => set({ groupBy: v })} options={[{ value: "", label: "(no grouping)" }, ...cols.map((c) => ({ value: c, label: c }))]} />}</Field>
              <div className="adm-row" style={{ flexWrap: "nowrap" }}>
                <Field label="Aggregate">{(id) => <Select id={id} value={spec.aggFn} onChange={(v) => set({ aggFn: v, aggCol: v && v !== "count" && !spec.aggCol ? numCols[0] ?? "" : spec.aggCol })} options={[{ value: "", label: "(none)" }, "count", "sum", "avg", "min", "max"]} />}</Field>
                <Field label="of column">{(id) => <Select id={id} value={spec.aggCol} onChange={(v) => set({ aggCol: v })} options={[{ value: "", label: "*" }, ...cols.map((c) => ({ value: c, label: c }))]} />}</Field>
              </div>
              <div className="adm-row" style={{ flexWrap: "nowrap" }}>
                <Field label="Sort by">{(id) => <TextInput id={id} value={spec.orderBy} onChange={(v) => set({ orderBy: v })} placeholder="column or alias" />}</Field>
                <Field label="Limit">{(id) => <TextInput id={id} value={String(spec.limit)} onChange={(v) => set({ limit: Math.max(0, Number(v.replace(/\D/g, "")) || 0) })} />}</Field>
              </div>
              <Switch checked={spec.desc} onChange={(v) => set({ desc: v })} label="Descending" />
            </div>
          </Panel>
          {saved.length > 0 && <Panel title="Saved reports" flush><ul className="adm-list">{saved.map((s) => <li key={s.name}><button className="adm-link" onClick={() => setSpec(s.spec)}>{s.name}</button><span className="adm-spacer" /><button className="adm-x" aria-label={`Delete ${s.name}`} onClick={() => setSaved(saved.filter((x) => x.name !== s.name))}>×</button></li>)}</ul></Panel>}
        </div>
        <div className="adm-stack">
          <Panel title="Generated SQL" actions={<Badge s="info">{res.ok ? `${res.ok.rows.length} rows · scanned ${res.ok.scanned}` : "error"}</Badge>}><CodeBlock label="sql" code={sql} /></Panel>
          {res.err && <Alert s="danger" title="Couldn’t run the query">{res.err}</Alert>}
          {chartable && <Panel title="Chart"><BarChart horizontal height={Math.max(160, res.ok!.rows.length * 34)} labels={res.ok!.rows.map((r) => String(r[res.ok!.columns[0]]))} series={[{ name: res.ok!.columns[1], data: res.ok!.rows.map((r) => Number(r[res.ok!.columns[1]])) }]} title={res.ok!.columns[1]} /></Panel>}
          <Panel title="Results" flush>{res.ok && gridRows.length ? <DataTable<Row & { id: string }> rows={gridRows as (Row & { id: string })[]} cols={gridCols} selectable={false} pageSize={10} exportName="report" /> : <EmptyState spot="no-results" title="No rows">Nothing matches these filters.</EmptyState>}</Panel>
          <p className="jp-muted"><Icon name="info" size={14} /> The builder and the SQL console share one engine, so you can copy the SQL into the console to refine it.</p>
        </div>
      </div>
    </>
  );
}
