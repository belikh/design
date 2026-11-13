import { useMemo } from "react";
import "./tables.css";
import { PageHeader, Panel, Badge } from "@belikh/jupiter-ui/kit.tsx";
import { DataTable, type Col } from "@belikh/jupiter-ui/DataTable.tsx";
import { SHIPMENTS, money, type Ship } from "./data.ts";
import { rng } from "../../data/fixtures.ts";

type Cust = { id: string; customer: string; shipments: number; cost: number; held: number };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
type Heat = { id: string; region: string } & Record<string, number | string>;

export function Nested() {
  const custs = useMemo<Cust[]>(() => [...new Set(SHIPMENTS.map((s) => s.customer))].map((c) => { const rs = SHIPMENTS.filter((s) => s.customer === c); return { id: c, customer: c, shipments: rs.length, cost: rs.reduce((a, s) => a + s.cost, 0), held: rs.filter((s) => s.status === "Held").length }; }), []);
  const cols: Col<Cust>[] = [{ key: "customer", header: "Customer", width: 200 }, { key: "shipments", header: "Shipments", align: "right", agg: "sum" }, { key: "cost", header: "Total cost", align: "right", agg: "sum", fmt: money, cf: { type: "bars" } }, { key: "held", header: "Held", align: "right", render: (r) => (r.held ? <Badge s="danger">{r.held} held</Badge> : <span className="jp-muted">0</span>) }];
  const subCols: Col<Ship>[] = [{ key: "ref", header: "Ref" }, { key: "city", header: "Destination" }, { key: "status", header: "Status" }, { key: "due", header: "Due" }, { key: "cost", header: "Cost", align: "right", fmt: money, agg: "sum" }];
  const heat = useMemo<Heat[]>(() => { const r = rng(21); return ["QLD", "NSW", "VIC", "WA", "SA", "TAS"].map((s) => ({ id: s, region: s, ...Object.fromEntries(MONTHS.map((m, i) => [m, Math.round((r() - 0.45) * 40 + (i > 9 ? 8 : 0))])) })); }, []);
  const heatCols: Col<Heat>[] = [{ key: "region", header: "State", width: 80, pin: "left" }, ...MONTHS.map((m, i): Col<Heat> => ({ key: m, header: m, width: 48, align: "right", rotate: true, group: i < 6 ? "H1" : "H2", cf: { type: "scale", diverging: true }, agg: "sum" }))];
  return (
    <>
      <PageHeader title="Nested tables and multi-row headers" crumbs={["Grids", "Nested"]} desc="A sub-table inside an expanded row, and a grid with column groups and rotated headers." />
      <Panel title="Customers with a nested shipment table (B025)" flush>
        <DataTable<Cust> rows={custs} cols={cols} pageSize={6} selectable={false} headerMenu expand={(c) => (
          <div className="tbl-nested"><DataTable<Ship> rows={SHIPMENTS.filter((s) => s.customer === c.customer)} cols={subCols} pageSize={5} selectable={false} exportName={`${c.customer}-shipments`} ariaLabel={`Shipments for ${c.customer}`} /></div>)} />
      </Panel>
      <Panel title="Net volume change by state and month: column groups, rotated headers (B027)" className="adm-section" flush>
        <DataTable<Heat> rows={heat} cols={heatCols} pageSize={10} selectable={false} headerMenu />
      </Panel>
    </>
  );
}
