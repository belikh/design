import { useMemo, useState } from "react";
import "./tables.css";
import { PageHeader, Panel, Btn, Badge } from "@belikh/jupiter-ui/kit.tsx";
import { Field, Select, Segmented, Switch } from "@belikh/jupiter-ui/inputs.tsx";
import { DataTable, type Col } from "@belikh/jupiter-ui/DataTable.tsx";
import { AGG_LABEL, type Agg } from "@belikh/jupiter-ui/tableUtils.ts";
import { pivot } from "./pivot.ts";
import { SHIPMENTS, money, pct, type Ship } from "./data.ts";

const DIMS: Record<string, { label: string; get: (r: Ship) => string }> = {
  region: { label: "State", get: (r) => r.region }, status: { label: "Status", get: (r) => r.status }, mode: { label: "Mode", get: (r) => r.mode }, customer: { label: "Customer", get: (r) => r.customer }, city: { label: "Destination", get: (r) => r.city }, month: { label: "Due month", get: (r) => r.due.slice(0, 7) },
};
const MEASURES: Record<string, { label: string; get: (r: Ship) => unknown; fmt: (v: number) => string }> = {
  cost: { label: "Cost", get: (r) => r.cost, fmt: money }, qty: { label: "Pallets", get: (r) => r.qty, fmt: (v) => String(Math.round(v * 10) / 10) }, weight: { label: "Weight kg", get: (r) => r.weight, fmt: (v) => Math.round(v).toLocaleString("en-AU") },
  margin: { label: "Margin", get: (r) => r.margin, fmt: pct }, sla: { label: "SLA hours", get: (r) => r.sla, fmt: (v) => v.toFixed(1) }, id: { label: "Shipments", get: (r) => r.id, fmt: (v) => String(v) },
};
const drillCols: Col<Ship>[] = [{ key: "ref", header: "Ref" }, { key: "customer", header: "Customer" }, { key: "status", header: "Status" }, { key: "due", header: "Due" }, { key: "cost", header: "Cost", align: "right", fmt: money, agg: "sum" }];

export function Pivot() {
  const [rowD, setRowD] = useState("region"); const [colD, setColD] = useState("status"); const [m, setM] = useState("cost"); const [agg, setAgg] = useState<Agg>("sum"); const [heat, setHeat] = useState(true); const [totals, setTotals] = useState(true); const [order, setOrder] = useState<"alpha" | "total">("alpha"); const [drill, setDrill] = useState<[string, string] | null>(null);
  const aggEff: Agg = m === "id" && agg !== "count" && agg !== "distinct" ? "count" : agg; const meas = MEASURES[m]; const fmt = aggEff === "count" || aggEff === "distinct" ? (v: number) => String(v) : meas.fmt;
  const p = useMemo(() => pivot(SHIPMENTS, DIMS[rowD].get, DIMS[colD].get, meas.get, aggEff, order), [rowD, colD, m, aggEff, order, meas.get]);
  const span = p.max - p.min || 1; const drillRows = drill ? p.groups.get(`${drill[0]}\u0000${drill[1]}`) ?? [] : [];
  const dimOpts = Object.entries(DIMS).map(([value, d]) => ({ value, label: d.label }));
  return (
    <>
      <PageHeader title="Pivot table" crumbs={["Grids", "Pivot"]} desc="Cross-tab any two dimensions with a measure and an aggregation. Click a cell to drill into its rows." status={<Badge>{SHIPMENTS.length} shipments</Badge>} />
      <Panel>
        <div className="p2t-controls">
          <Field label="Rows">{(id) => <Select id={id} value={rowD} onChange={setRowD} options={dimOpts} />}</Field>
          <Field label="Columns">{(id) => <Select id={id} value={colD} onChange={setColD} options={dimOpts} />}</Field>
          <Field label="Measure">{(id) => <Select id={id} value={m} onChange={setM} options={Object.entries(MEASURES).map(([value, d]) => ({ value, label: d.label }))} />}</Field>
          <Field label="Aggregation">{(id) => <Select id={id} value={aggEff} onChange={(v) => setAgg(v as Agg)} options={(Object.keys(AGG_LABEL) as Agg[]).map((a) => ({ value: a, label: AGG_LABEL[a] }))} />}</Field>
          <div className="adm-stack" style={{ gap: 8 }}><Switch checked={heat} onChange={setHeat} label="Heat colouring" /><Switch checked={totals} onChange={setTotals} label="Totals" /></div>
          <div><div className="jp-label">Sort keys</div><Segmented label="Sort keys" value={order} onChange={setOrder} options={[{ value: "alpha", label: "A–Z" }, { value: "total", label: "By total" }]} /></div>
        </div>
      </Panel>
      <div className="p2t-pivot adm-section" role="region" aria-label="Pivot table" tabIndex={0}>
        <table>
          <caption className="adm-sr">{meas.label} ({AGG_LABEL[aggEff]}) by {DIMS[rowD].label} and {DIMS[colD].label}</caption>
          <thead><tr><th scope="col" style={{ textAlign: "start" }}>{DIMS[rowD].label} \ {DIMS[colD].label}</th>{p.cols.map((c) => <th scope="col" key={c}>{c}</th>)}{totals && <th scope="col" className="is-total">Total</th>}</tr></thead>
          <tbody>{p.rows.map((r, i) => (
            <tr key={r}><th scope="row">{r}</th>
              {p.cells[i].map((v, j) => { const c = p.cols[j]; const on = drill?.[0] === r && drill?.[1] === c; return (
                <td key={c}>{v === null ? <span className="p2t-cell is-empty" aria-label="no data">·</span> : <button type="button" className="p2t-cell" aria-pressed={on} aria-label={`${r}, ${c}: ${fmt(v)}. Show rows`} style={heat ? { ["--t" as string]: ((v - p.min) / span).toFixed(3) } : { background: "transparent" }} onClick={() => setDrill(on ? null : [r, c])}>{fmt(v)}</button>}</td>); })}
              {totals && <td className="is-total">{fmt(p.rowTotals[i])}</td>}</tr>))}</tbody>
          {totals && <tfoot><tr><th scope="row" style={{ textAlign: "start" }}>Total</th>{p.colTotals.map((v, j) => <td key={p.cols[j]}>{fmt(v)}</td>)}<td>{fmt(p.grand)}</td></tr></tfoot>}
        </table>
      </div>
      {drill && <Panel title={`Rows for ${drill[0]} × ${drill[1]} (${drillRows.length})`} className="adm-section" flush actions={<Btn sm variant="ghost" onClick={() => setDrill(null)}>Close</Btn>}><DataTable<Ship> rows={drillRows} cols={drillCols} pageSize={8} selectable={false} exportName="pivot-drill" /></Panel>}
    </>
  );
}
