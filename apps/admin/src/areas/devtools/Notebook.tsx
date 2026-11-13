import { useState } from "react";
import { PageHeader, Panel, Btn, Badge, Alert, EmptyState } from "@belikh/jupiter-ui/kit.tsx";
import { Field, Select, TextArea } from "@belikh/jupiter-ui/inputs.tsx";
import { Editable } from "@belikh/jupiter-ui/editable.tsx";
import { BarChart } from "@belikh/jupiter-ui/Charts.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { SEED_CELLS, TABLES, blocks, inline, runCell, type CellKind, type NbCell } from "./lib/notebook.ts";
import "./devtools.css";

const Inline = ({ text }: { text: string }) => <>{inline(text).map((t, i) => (t.t === "b" ? <b key={i}>{t.v}</b> : t.t === "c" ? <code key={i}>{t.v}</code> : <span key={i}>{t.v}</span>))}</>;
function Markdown({ src }: { src: string }) {
  const bs = blocks(src); const out: React.ReactNode[] = []; let items: string[] = [];
  const flush = (k: number) => { if (items.length) { out.push(<ul key={`u${k}`}>{items.map((x, i) => <li key={i}><Inline text={x} /></li>)}</ul>); items = []; } };
  bs.forEach((b, i) => { if (b.k === "li") { items.push(b.text); return; } flush(i); out.push(b.k === "h1" ? <h2 key={i} className="lab-md-h1"><Inline text={b.text} /></h2> : b.k === "h2" ? <h3 key={i}><Inline text={b.text} /></h3> : <p key={i}><Inline text={b.text} /></p>); });
  flush(bs.length); return <div className="lab-md">{out}</div>;
}
const KIND_LABEL: Record<CellKind, string> = { text: "Text", query: "Query", chart: "Chart" };

export function Notebook() {
  const { toast } = usePrefs();
  const [title, setTitle] = useState("Order review"); const [cells, setCells] = useState<NbCell[]>(() => SEED_CELLS.map((c) => (c.kind === "query" ? runCell(c) : c)));
  const [mode, setMode] = useState<Record<string, "edit" | "view">>({ c1: "view" });
  const patch = (id: string, p: Partial<NbCell>) => setCells((cs) => cs.map((c) => (c.id === id ? { ...c, ...p } : c)));
  const run = (id: string) => setCells((cs) => cs.map((c) => (c.id === id && c.kind === "query" ? runCell(c) : c)));
  const runAll = () => { setCells((cs) => cs.map((c) => (c.kind === "query" ? runCell(c) : c))); toast({ kind: "ok", title: "Ran all query cells" }); };
  const add = (kind: CellKind, at = cells.length) => {
    const id = `c${Date.now()}${cells.length}`; const q = cells.find((c) => c.kind === "query");
    const c: NbCell = kind === "text" ? { id, kind, source: "## Notes\nWrite something." } : kind === "query" ? { id, kind, source: "select * from orders limit 5" } : { id, kind, source: "Untitled chart", from: q?.id, x: q?.result?.columns[0], y: q?.result?.columns[1] };
    setCells((cs) => [...cs.slice(0, at), c, ...cs.slice(at)]); if (kind === "text") setMode((m) => ({ ...m, [id]: "edit" }));
  };
  const move = (i: number, d: -1 | 1) => setCells((cs) => { const j = i + d; if (j < 0 || j >= cs.length) return cs; const n = [...cs]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const del = (i: number) => { const old = cells; setCells(cells.filter((_, k) => k !== i)); toast({ kind: "warn", title: `Deleted ${KIND_LABEL[cells[i].kind].toLowerCase()} cell`, undo: () => setCells(old) }); };
  const queries = cells.filter((c) => c.kind === "query");
  return (
    <>
      <PageHeader title={<Editable value={title} editor={{ type: "text" }} label="Notebook title" onSave={(v) => setTitle(String(v))} />} crumbs={["Data", "Notebook"]}
        desc="Text, query and chart cells in one document. Queries run against the sample tables; charts read the result of a query cell. Ctrl+Enter runs the focused query."
        actions={<><Btn icon="plus" onClick={() => add("text")}>Text</Btn><Btn icon="database" onClick={() => add("query")}>Query</Btn><Btn icon="chart" onClick={() => add("chart")}>Chart</Btn><Btn variant="primary" icon="bolt" onClick={runAll}>Run all</Btn></>} />
      <p className="jp-muted lab-note">Tables: {Object.entries(TABLES).map(([t, r]) => `${t} (${Object.keys(r[0]).join(", ")})`).join(" · ")}</p>
      {cells.length === 0 && <EmptyState spot="empty" title="An empty notebook" action={<Btn variant="primary" onClick={() => add("query")}>Add a query</Btn>}>Add text, query or chart cells.</EmptyState>}
      <ol className="lab-cells">
        {cells.map((c, i) => {
          const src = c.kind === "chart" ? queries.find((q) => q.id === c.from) : undefined; const cols = src?.result?.columns ?? [];
          const rows = src?.result?.rows ?? []; const ys = c.y ? rows.map((r) => Number(r[c.y!]) || 0) : [];
          return (
            <li key={c.id} className="lab-cell" aria-label={`${KIND_LABEL[c.kind]} cell ${i + 1}`}>
              <div className="lab-cell-bar"><Badge s="info">{KIND_LABEL[c.kind]}</Badge>
                <div className="adm-row">
                  {c.kind === "query" && <Btn sm icon="bolt" onClick={() => run(c.id)}>Run</Btn>}
                  {c.kind === "text" && <Btn sm variant="ghost" onClick={() => setMode((m) => ({ ...m, [c.id]: m[c.id] === "edit" ? "view" : "edit" }))}>{mode[c.id] === "edit" ? "Preview" : "Edit"}</Btn>}
                  <Btn sm variant="ghost" disabled={i === 0} aria-label={`Move cell ${i + 1} up`} onClick={() => move(i, -1)}>Up</Btn>
                  <Btn sm variant="ghost" disabled={i === cells.length - 1} aria-label={`Move cell ${i + 1} down`} onClick={() => move(i, 1)}>Down</Btn>
                  <button className="adm-x" aria-label={`Delete cell ${i + 1}`} onClick={() => del(i)}>×</button></div></div>
              {c.kind === "text" && (mode[c.id] === "edit" ? <TextArea rows={5} aria-label={`Text cell ${i + 1} source`} value={c.source} onChange={(v) => patch(c.id, { source: v })} /> : <Markdown src={c.source} />)}
              {c.kind === "query" && <>
                <TextArea rows={5} aria-label={`Query cell ${i + 1} SQL`} className="lab-mono" value={c.source} onChange={(v) => patch(c.id, { source: v })} spellCheck={false} onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); run(c.id); } }} />
                {c.error && <Alert s="danger" title="Query failed">{c.error}</Alert>}
                {c.result && <div className="lab-result"><div className="jp-muted lab-note">{c.result.rows.length} row{c.result.rows.length === 1 ? "" : "s"} · {c.result.scanned} scanned</div>
                  <div className="lab-scroll"><table className="jp-table"><thead><tr>{c.result.columns.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{c.result.rows.slice(0, 8).map((r, k) => <tr key={k}>{c.result!.columns.map((h) => <td key={h} className={typeof r[h] === "number" ? "adm-num" : ""}>{String(r[h])}</td>)}</tr>)}</tbody></table></div></div>}
                {!c.result && !c.error && <p className="jp-muted lab-note">Not run yet.</p>}
              </>}
              {c.kind === "chart" && <div className="adm-stack">
                <div className="adm-grid adm-grid--3">
                  <Field label="Data from">{(id) => <Select id={id} value={c.from ?? ""} onChange={(v) => { const q = queries.find((x) => x.id === v); patch(c.id, { from: v, x: q?.result?.columns[0], y: q?.result?.columns[1] }); }} options={[{ value: "", label: "Choose a query cell…" }, ...queries.map((q) => ({ value: q.id, label: `Query ${cells.indexOf(q) + 1}` }))]} />}</Field>
                  <Field label="Category (x)">{(id) => <Select id={id} value={c.x ?? ""} onChange={(v) => patch(c.id, { x: v })} options={cols.length ? cols : [""]} />}</Field>
                  <Field label="Value (y)">{(id) => <Select id={id} value={c.y ?? ""} onChange={(v) => patch(c.id, { y: v })} options={cols.length ? cols : [""]} />}</Field>
                </div>
                {src?.result && c.x && c.y ? (ys.some((v) => v !== 0) ? <BarChart title={c.source} labels={rows.map((r) => String(r[c.x!]))} series={[{ name: c.y, data: ys }]} height={200} /> : <Alert s="warn" title="No numeric values">Pick a numeric column for the y axis.</Alert>) : <p className="jp-muted lab-note">Run the source query to see the chart.</p>}
              </div>}
            </li>);
        })}
      </ol>
      <Panel title="Notebook outline"><ul className="adm-list adm-list--tight">{cells.map((c, i) => <li key={c.id}><span className="adm-num">{i + 1}</span> <Badge>{KIND_LABEL[c.kind]}</Badge> <span className="jp-muted">{c.source.split("\n")[0].slice(0, 70)}</span></li>)}</ul></Panel>
    </>
  );
}
