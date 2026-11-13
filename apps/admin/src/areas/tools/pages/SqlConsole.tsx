import { useMemo, useState } from "react";
import { PageHeader, Panel, Btn, Badge, EmptyState, Tabs } from "@belikh/jupiter-ui/kit.tsx";
import { Select } from "@belikh/jupiter-ui/inputs.tsx";
import { DataTable, type Col } from "@belikh/jupiter-ui/DataTable.tsx";
import { TABLES } from "../lib/data.ts";
import { runSql, SqlError, type Cell, type Row, type SqlResult } from "../lib/sql.ts";
import { Editor, ErrorCaret, posToLine, useStored } from "../common.tsx";

const EXAMPLES: Record<string, string> = {
  "Revenue by region": "select region, count(*) as orders, round(sum(amount), 2) as revenue\nfrom orders\nwhere status = 'paid'\ngroup by region\norder by revenue desc",
  "Order status mix": "select status, count(*) as n, round(avg(amount), 2) as avg_amount\nfrom orders\ngroup by status\norder by n desc",
  "Services needing attention": "select name, region, latency, uptime\nfrom services\nwhere status <> 'ok'\norder by latency desc",
  "Customers by plan": "select plan, count(*) as customers, round(sum(balance), 2) as balance\nfrom customers\nwhere active = true\ngroup by plan",
  "Customers missing email": "select id, name, plan from customers\nwhere email is null\nlimit 10",
};
export function SqlConsole() {
  const [sql, setSql] = useState(EXAMPLES["Revenue by region"]); const [hist, setHist] = useStored<string[]>("pt-sql-history", []);
  const [out, setOut] = useState<{ res?: SqlResult; err?: SqlError | Error; ms?: number; ran?: string }>({}); const [tab, setTab] = useState("results");
  const run = () => {
    const t0 = performance.now();
    try { const res = runSql(sql, TABLES); setOut({ res, ms: Math.round((performance.now() - t0) * 10) / 10, ran: sql }); setTab("results"); }
    catch (e) { setOut({ err: e as Error, ran: sql }); }
    setHist([sql, ...hist.filter((h) => h !== sql)].slice(0, 10));
  };
  const errLine = out.err instanceof SqlError && out.ran === sql ? posToLine(sql, out.err.pos) : null;
  const cols: Col<Row & { id: string }>[] = out.res ? out.res.columns.map((c, j) => ({ key: `c${j}`, header: c, align: typeof out.res!.rows[0]?.[c] === "number" ? "right" : undefined })) : [];
  const rows = out.res ? out.res.rows.map((r, i) => ({ id: String(i), ...Object.fromEntries(out.res!.columns.map((c, j) => [`c${j}`, r[c] as Cell])) })) : [];
  const schema = useMemo(() => Object.entries(TABLES).map(([t, r]) => ({ t, n: r.length, cols: Object.keys(r[0]) })), []);
  return (
    <>
      <PageHeader title="SQL console" crumbs={["Tools", "SQL console"]} desc="Run SELECT queries against the sample tables. Supports WHERE, GROUP BY, HAVING, ORDER BY, LIMIT, aggregates, LIKE, IN, BETWEEN and a few functions. Read-only, in memory." actions={<><Select value="" onChange={(k) => k && setSql(EXAMPLES[k])} aria-label="Load an example" options={[{ value: "", label: "Examples…" }, ...Object.keys(EXAMPLES).map((k) => ({ value: k, label: k }))]} /><Btn variant="primary" icon="play" onClick={run}>Run</Btn></>} />
      <div className="pt-split">
        <Panel title="Schema" flush>
          <div className="pt-schema" style={{ padding: 12 }}>{schema.map((s) => <details key={s.t} open><summary>{s.t} <span className="jp-muted">({s.n})</span></summary>{s.cols.map((c) => <button key={c} onClick={() => setSql((q) => `${q}${q.endsWith("\n") || !q ? "" : " "}${c}`)} title="Insert at the end of the query">{c}</button>)}</details>)}</div>
          {hist.length > 0 && <div style={{ borderTop: "1px solid var(--jp-border)", padding: 12 }}><div className="jp-label" style={{ marginBottom: 4 }}>History</div>{hist.map((h, i) => <button key={i} className="adm-link" style={{ display: "block", textAlign: "start", textDecoration: "none", color: "var(--jp-text-muted)", fontSize: "var(--jp-fs-xs)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }} onClick={() => setSql(h)}>{h.replace(/\s+/g, " ").slice(0, 36)}</button>)}</div>}
        </Panel>
        <div className="adm-stack">
          <div><Editor label="SQL" value={sql} onChange={setSql} onRun={run} rows={9} errorLine={errLine} placeholder="select …" /><div className="pt-kbd-hint" style={{ marginTop: 4 }}>Ctrl/Cmd + Enter to run · Tab indents</div>{out.err && out.ran === sql && <ErrorCaret source={sql} pos={out.err instanceof SqlError ? out.err.pos : 0} message={out.err.message} />}</div>
          {out.res && out.ran === sql && (
            <Panel flush title={<>Results <Badge s="ok">{out.res.rows.length} rows</Badge> <span className="jp-muted" style={{ fontWeight: 400 }}>{out.ms} ms · scanned {out.res.scanned}</span></>}>
              <div style={{ padding: "0 12px" }}><Tabs value={tab} onChange={setTab} tabs={[{ id: "results", label: "Results" }, { id: "plan", label: "Query plan" }]} /></div>
              {tab === "results" ? (rows.length ? <DataTable<Row & { id: string }> rows={rows as (Row & { id: string })[]} cols={cols} selectable={false} pageSize={10} exportName="query" /> : <EmptyState spot="no-results" title="No rows">The query ran but matched nothing.</EmptyState>)
                : <ol style={{ margin: 0, padding: "12px 12px 12px 32px", fontFamily: "var(--jp-font-mono)", fontSize: "var(--jp-fs-sm)" }}>{out.res.explain.map((e, i) => <li key={i}>{e}</li>)}</ol>}
            </Panel>
          )}
          {!out.res && !out.err && <EmptyState spot="lens" title="Run a query">Choose an example or write your own, then press Run.</EmptyState>}
        </div>
      </div>
    </>
  );
}
