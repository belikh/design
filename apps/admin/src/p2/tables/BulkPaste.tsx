import { useMemo, useState } from "react";
import "./tables.css";
import { PageHeader, Panel, Btn, Badge, Alert } from "@belikh/jupiter-ui/kit.tsx";
import { Select, TextArea } from "@belikh/jupiter-ui/inputs.tsx";
import { DataTable, type Col } from "@belikh/jupiter-ui/DataTable.tsx";
import { parseDelimited } from "@belikh/jupiter-ui/tableUtils.ts";
import { isValid, mapColumns, validateRows, type FieldDef } from "./paste.ts";
import { SHIPMENTS } from "./data.ts";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";

export const FIELDS: FieldDef[] = [
  { key: "ref", label: "Ref", required: true, unique: true, pattern: /^SH-\d{4,}$/, patternMsg: "Format: SH-1234" }, { key: "customer", label: "Customer", required: true },
  { key: "region", label: "State", type: "enum", options: ["QLD", "NSW", "VIC", "WA", "SA", "TAS", "NT", "ACT"], required: true }, { key: "mode", label: "Mode", type: "enum", options: ["Road", "Air", "Sea", "Rail"] },
  { key: "qty", label: "Pallets", type: "int", required: true, min: 1, max: 200 }, { key: "cost", label: "Cost", type: "number", required: true, min: 0 }, { key: "due", label: "Due", type: "date", required: true },
];
const SAMPLE = ["Ref\tCustomer\tState\tMode\tPallets\tCost\tDue", "SH-7001\tKookaburra Foods\tQLD\tRoad\t12\t1840.50\t2026-11-20", "SH-7002\tReef Marine\tNSW\tSea\t30\t$4,200\t2026-12-02", "SH-7003\tEmu Electronics\tQLD\tAir\t0\t310\t2026-11-18", "SH-7004\t\tVIC\tRoad\t8\t640\t2026-11-25",
  "SH-7005\tKoala Textiles\tNewSouthWales\tRail\t14\t980\t2026-11-30", "SH-4000\tWombat Hardware\tSA\tRoad\t6\t450\t2026-11-22", "SH-7007\tBanksia Pharma\tWA\tAir\t4\tabc\t2026-11-19", "SH-7001\tPlatypus Pumps\tTAS\tRoad\t9\t720\t2026-12-01", "SH-7009\tGum Leaf Paper\tNT\tRoad\t22\t1320\t11/12/2026", "SH-7010\tMagpie Motors\tACT\tRoad\t18\t2210\t2026-12-05"].join("\n");
type Imported = { id: string; ref: string; customer: string; region: string; mode: string; qty: number; cost: number; due: string };
const existing = new Set(SHIPMENTS.map((s) => s.ref.toLowerCase()));

export function BulkPaste() {
  const { toast } = usePrefs(); const [text, setText] = useState(() => (typeof location !== "undefined" && new URLSearchParams(location.search).has("sample") ? SAMPLE : "")); const [edits, setEdits] = useState<Record<string, string>>({}); const [mapOv, setMapOv] = useState<number[] | null>(null); const [imported, setImported] = useState<Imported[]>([]);
  const parsed = useMemo(() => parseDelimited(text), [text]); const meta = useMemo(() => mapColumns(parsed[0] ?? [], FIELDS), [parsed]); const map = mapOv ?? meta.map; const dataRows = meta.hasHeader ? parsed.slice(1) : parsed;
  const grid = useMemo(() => dataRows.map((row, r) => FIELDS.map((_, c) => edits[`${r}:${c}`] ?? (map[c] >= 0 ? row[map[c]] ?? "" : ""))), [dataRows, map, edits]);
  const checked = useMemo(() => validateRows(grid, FIELDS.map((_, i) => i), FIELDS, new Set([...existing, ...imported.map((i) => i.ref.toLowerCase())])), [grid, imported]);
  const valid = checked.filter(isValid).length; const invalid = checked.length - valid; const heads = meta.hasHeader ? parsed[0] : (parsed[0] ?? []).map((_, i) => `Column ${i + 1}`);
  const load = (t: string) => { setText(t); setEdits({}); setMapOv(null); };
  const doImport = () => {
    const ok = checked.map((c, i) => ({ c, v: grid[i] })).filter((x) => isValid(x.c)); const bad = checked.map((c, i) => ({ c, v: grid[i] })).filter((x) => !isValid(x.c));
    setImported((rs) => [...rs, ...ok.map(({ v }, i) => ({ id: `imp-${rs.length + i}`, ref: v[0].trim(), customer: v[1].trim(), region: v[2].trim().toUpperCase(), mode: v[3].trim() || "Road", qty: Number(v[4]), cost: Number(v[5].replace(/[$,]/g, "")), due: v[6].trim() }))]);
    load(bad.length ? [FIELDS.map((f) => f.label).join("\t"), ...bad.map((b) => b.v.join("\t"))].join("\n") : ""); toast({ kind: ok.length ? "ok" : "warn", title: `Imported ${ok.length} rows`, body: bad.length ? `${bad.length} invalid rows left to fix` : undefined });
  };
  const cols: Col<Imported>[] = [{ key: "ref", header: "Ref" }, { key: "customer", header: "Customer" }, { key: "region", header: "State" }, { key: "mode", header: "Mode" }, { key: "qty", header: "Pallets", align: "right", agg: "sum" }, { key: "cost", header: "Cost", align: "right", agg: "sum", fmt: (v) => v.toLocaleString("en-AU", { style: "currency", currency: "AUD" }) }, { key: "due", header: "Due" }];
  return (
    <>
      <PageHeader title="Bulk paste with validation preview" crumbs={["Grids", "Bulk paste"]} desc="Copy rows from a spreadsheet and paste them. Columns are mapped by header, every cell is validated, you fix problems in place, and only valid rows are imported." />
      <div className="p2t-paste">
        <Panel title="1. Paste" actions={<div className="adm-row"><Btn sm onClick={() => load(SAMPLE)}>Load sample with errors</Btn><Btn sm variant="ghost" disabled={!text} onClick={() => load("")}>Clear</Btn></div>}>
          <div className="adm-stack">
            <TextArea value={text} onChange={load} rows={9} placeholder={"Paste tab, comma or semicolon separated rows here.\nA header row is detected automatically."} aria-label="Pasted rows" />
            <p className="jp-muted">Expected columns: {FIELDS.map((f) => f.label).join(", ")}.</p>
            {parsed.length > 0 && <details open><summary>Column mapping ({meta.hasHeader ? "header row detected" : "no header, mapped by position"})</summary>
              <div className="adm-grid adm-grid--2" style={{ marginTop: 8 }}>{FIELDS.map((f, i) => <label key={f.key} className="adm-stack" style={{ gap: 2 }}><span className="jp-label">{f.label}{f.required ? " *" : ""}</span>
                <Select value={String(map[i])} onChange={(v) => { const m = [...map]; m[i] = Number(v); setMapOv(m); setEdits({}); }} aria-label={`Source column for ${f.label}`} options={[{ value: "-1", label: "(skip)" }, ...heads.map((h, j) => ({ value: String(j), label: h || `Column ${j + 1}` }))]} /></label>)}</div></details>}
          </div>
        </Panel>
        <Panel title="2. Preview and fix" flush actions={<div className="adm-row"><Badge s="ok">{valid} valid</Badge><Badge s={invalid ? "danger" : undefined}>{invalid} invalid</Badge><Btn sm variant="primary" disabled={!valid} onClick={doImport}>Import {valid} valid rows</Btn></div>}>
          {checked.length === 0 ? <p className="jp-muted" style={{ padding: 16 }}>Nothing pasted yet.</p> : (
            <div className="adm-dt__wrap p2t-preview" style={{ maxHeight: 420, overflow: "auto" }}><table className="jp-table adm-table"><thead><tr><th>#</th>{FIELDS.map((f) => <th key={f.key}>{f.label}</th>)}</tr></thead>
              <tbody>{checked.map((row, r) => (
                <tr key={r} className={isValid(row) ? "" : "is-badrow"}><td className="adm-num">{isValid(row) ? "✓" : r + 1}</td>
                  {FIELDS.map((f, c) => <td key={f.key} className={row.errors[c] ? "is-bad" : ""}><input aria-label={`${f.label}, row ${r + 1}`} aria-invalid={!!row.errors[c]} value={grid[r][c]} onChange={(e) => setEdits((x) => ({ ...x, [`${r}:${c}`]: e.target.value }))} />{row.errors[c] && <span className="p2t-err" role="alert">{row.errors[c]}</span>}</td>)}</tr>))}</tbody></table></div>)}
        </Panel>
      </div>
      <Panel title={`Imported rows (${imported.length})`} className="adm-section" flush actions={<Btn sm variant="ghost" disabled={!imported.length} onClick={() => setImported([])}>Clear</Btn>}>
        {imported.length ? <DataTable<Imported> rows={imported} cols={cols} pageSize={10} selectable={false} exportName="imported" /> : <p className="jp-muted" style={{ padding: 16 }}>Imported rows appear here.</p>}
      </Panel>
      <Alert s="info" title="What is validated">Required fields, whole numbers and ranges, numbers (currency symbols allowed), ISO dates, allowed values, format (SH-1234), and uniqueness both against existing shipments and within the paste.</Alert>
    </>
  );
}
