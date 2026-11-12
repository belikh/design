import { useMemo, useState } from "react";
import "./tables.css";
import { PageHeader, Panel, Badge, Btn, Alert } from "@belikh/jupiter-ui/kit.tsx";
import { DataTable, type Col } from "@belikh/jupiter-ui/DataTable.tsx";
import { SHIPMENTS, money, pct, type Ship } from "./data.ts";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";

const SB: Record<string, "ok" | "warn" | "danger" | "info"> = { Delivered: "ok", "In transit": "info", Delayed: "warn", Held: "danger" };

/** Grid lab: every P2 table capability on one dataset (grouping, aggregates, header menus, conditional formats, pinned rows, range selection, find, exports...). */
export function GridLab() {
  const { toast } = usePrefs(); const [rows, setRows] = useState<Ship[]>(SHIPMENTS);
  const cols: Col<Ship>[] = useMemo(() => [
    { key: "ref", header: "Ref", width: 100, pin: "left" },
    { key: "customer", header: "Customer", width: 170, filter: "text", edit: "text" },
    { key: "region", header: "State", width: 90, filter: "select" },
    { key: "status", header: "Status", width: 120, filter: "select", render: (r) => <Badge s={SB[r.status]}>{r.status}</Badge> },
    { key: "mode", header: "Mode", width: 80 },
    { key: "qty", header: "Pallets", width: 100, align: "right", group: "Volume", agg: "sum", cf: { type: "bars" } },
    { key: "weight", header: "Weight kg", width: 110, align: "right", group: "Volume", agg: "sum", cf: { type: "scale" }, fmt: (v) => v.toLocaleString("en-AU") },
    { key: "cost", header: "Cost", width: 110, align: "right", group: "Money", agg: "sum", fmt: money, cf: { type: "scale" } },
    { key: "margin", header: "Margin", width: 100, align: "right", group: "Money", agg: "avg", fmt: pct, cf: { type: "rules", rules: [{ op: "<", value: 5, tone: "danger" }, { op: ">=", value: 25, tone: "ok" }] } },
    { key: "sla", header: "SLA h", width: 90, align: "right", group: "Service", agg: "avg", cf: { type: "icons", invert: true }, fmt: (v) => v.toFixed(0) },
    { key: "rating", header: "Rating", width: 90, align: "right", group: "Service", agg: "avg", cf: { type: "icons" }, fmt: (v) => v.toFixed(1) },
    { key: "due", header: "Due", width: 110 },
    { key: "note", header: "Note", width: 220 },
  ], []);
  return (
    <>
      <PageHeader title="Grid lab" crumbs={["Grids", "Grid lab"]} desc="Every P2 table capability on one dataset. Open a column’s ⋯ menu, drag a header into the group bar, drag across cells, or press Ctrl+F."
        actions={<Btn icon="refresh" onClick={() => setRows(SHIPMENTS)}>Reset data</Btn>} />
      <Alert s="info" title="Things to try">
        Group by <b>State</b> then <b>Status</b> (drag headers into the bar). Pick <b>Aggregate</b> from a header menu. Switch a numeric column to <b>data bars</b> or <b>icons</b>. Drag across cells for a sum/average status bar. Pin a row (📌) while scrolling. Export to <b>Excel</b> or <b>PDF</b>. Switch <b>Rows → Wrap</b>.
      </Alert>
      <Panel flush className="adm-section">
        <DataTable<Ship> rows={rows} cols={cols} pageSize={25} groupBar groupBy={["region"]} headerMenu pinnable maxHeight={520} rangeSelect findable layoutMenu exports={["csv", "json", "xlsx", "pdf", "md", "tsv"]} exportName="shipments"
          facet={{ key: "status", label: "Status", options: [{ value: "Delivered" }, { value: "In transit" }, { value: "Delayed" }, { value: "Held" }] }}
          severity={(r) => (r.status === "Held" ? "danger" : r.status === "Delayed" ? "warn" : undefined)} rowError={(r) => r.err}
          onEdit={(r, k, v) => { setRows((x) => x.map((y) => (y.id === r.id ? { ...y, [k]: v } : y))); toast({ kind: "ok", title: "Saved", body: `${r.ref} · ${k}` }); }}
          rowActions={(r) => [{ label: "Open", onSelect: () => toast({ kind: "info", title: `Open ${r.ref}` }) }, { label: "Delete", danger: true, onSelect: () => setRows((x) => x.filter((y) => y.id !== r.id)) }]} />
      </Panel>
      <Panel title="What is on this page" className="adm-section">
        <ul className="adm-checklist">
          <li><b>B007</b> grouped rows with per-group aggregates and collapse · <b>B024</b> drag-to-group bar, multi-level · <b>B012</b> footer totals with scope (all / page / selection)</li>
          <li><b>B019</b> header menu: aggregate picker, pin, hide, auto-fit · <b>B028</b> wrap / truncate, row height, double-click a column edge to auto-fit</li>
          <li><b>B020</b> pinned top and bottom rows · <b>B021</b> colour scale, data bars, icon sets, highlight rules · <b>B022</b> range selection with status bar</li>
          <li><b>B027</b> column groups (Volume, Money, Service) · <b>B031</b> severity stripe and row-level error markers (Held rows) · <b>B034</b> find in table · <b>B035</b> column statistics</li>
          <li><b>B015</b> export CSV, JSON, Excel, PDF, copy as Markdown or TSV</li>
        </ul>
      </Panel>
    </>
  );
}
