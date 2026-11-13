import { useCallback, useRef, useState } from "react";
import "./tables.css";
import { PageHeader, Panel, Badge, Alert } from "@belikh/jupiter-ui/kit.tsx";
import { Segmented } from "@belikh/jupiter-ui/inputs.tsx";
import { DataTable, type Col, type ServerQuery } from "@belikh/jupiter-ui/DataTable.tsx";
import { rng } from "../../data/fixtures.ts";

type Row = { id: string; ref: string; customer: string; region: string; status: string; qty: number; cost: number };
const N = 1_240_000; const CUST = ["Kookaburra Foods", "Wombat Hardware", "Outback Mining", "Reef Marine", "Koala Textiles", "Emu Electronics"]; const REG = ["QLD", "NSW", "VIC", "WA", "SA", "TAS", "NT", "ACT"]; const ST = ["Delivered", "In transit", "Delayed", "Held"];
/** Deterministic virtual row i of a 1.24M-row table (nothing is stored). */
export const rowAt = (i: number): Row => { const r = rng(i + 1); const p = <T,>(a: T[]) => a[Math.floor(r() * a.length)]; return { id: `R${i}`, ref: `SH-${String(i).padStart(7, "0")}`, customer: p(CUST), region: p(REG), status: p(ST), qty: 1 + Math.floor(r() * 60), cost: Math.round((180 + r() * r() * 9000) * 100) / 100 }; };
const matches = (row: Row, q: ServerQuery) => (!q.facet || row.status === q.facet) && (!q.q || `${row.ref} ${row.customer} ${row.region}`.toLowerCase().includes(q.q.toLowerCase())) && Object.entries(q.filters).every(([k, v]) => !v || String((row as unknown as Record<string, unknown>)[k]).toLowerCase().includes(v.toLowerCase()));
/** The fake "server": exact total when unfiltered, a sampled estimate when filtered (as real systems do for expensive counts). */
export function serverQuery(q: ServerQuery): { rows: Row[]; total: number; estimated: boolean } {
  const filtered = !!(q.q || q.facet || Object.values(q.filters).some(Boolean)); const desc = q.sort[0]?.key === "ref" && q.sort[0].dir === -1; const at = (k: number) => rowAt(desc ? N - 1 - k : k);
  if (!filtered) { const from = (q.page - 1) * q.size; return { rows: Array.from({ length: Math.max(0, Math.min(q.size, N - from)) }, (_, k) => at(from + k)), total: N, estimated: false }; }
  const skip = (q.page - 1) * q.size; const out: Row[] = []; let seen = 0; for (let k = 0; k < 60_000 && out.length < q.size; k++) { const row = at(k); if (matches(row, q)) { if (seen++ >= skip) out.push(row); } }
  let hit = 0; for (let k = 0; k < 4000; k++) if (matches(rowAt(k * 307 % N), q)) hit++; return { rows: out, total: Math.max(out.length + skip, Math.round((hit / 4000) * N)), estimated: true };
}
const cols: Col<Row>[] = [
  { key: "ref", header: "Ref", width: 130 }, { key: "customer", header: "Customer", width: 180, filter: "text", sortable: false }, { key: "region", header: "State", width: 80, filter: "select", sortable: false }, { key: "status", header: "Status", width: 110, sortable: false },
  { key: "qty", header: "Pallets", width: 90, align: "right", sortable: false }, { key: "cost", header: "Cost", width: 110, align: "right", sortable: false, fmt: (v) => v.toLocaleString("en-AU", { style: "currency", currency: "AUD" }) },
];

export function Server() {
  const [mode, setMode] = useState<"pages" | "more">("pages"); const [rows, setRows] = useState<Row[]>([]); const [meta, setMeta] = useState({ total: N, estimated: false, loading: true }); const req = useRef(0); const [log, setLog] = useState<string[]>([]);
  const onQuery = useCallback((q: ServerQuery) => {
    const id = ++req.current; setMeta((m) => ({ ...m, loading: true })); setLog((l) => [`${new Date().toLocaleTimeString("en-AU")} → page ${q.page}${q.append ? " (append)" : ""}${q.q ? ` q="${q.q}"` : ""}${q.facet ? ` status=${q.facet}` : ""}${q.sort[0] ? ` sort=${q.sort[0].key} ${q.sort[0].dir === 1 ? "asc" : "desc"}` : ""}`, ...l].slice(0, 6));
    setTimeout(() => { if (id !== req.current) return; const res = serverQuery(q); setRows((prev) => (q.append ? [...prev, ...res.rows] : res.rows)); setMeta({ total: res.total, estimated: res.estimated, loading: false }); }, 380);
  }, []);
  return (
    <>
      <PageHeader title="Server-side table" crumbs={["Grids", "Server"]} desc="1.24 million virtual rows: sorting, searching and paging are requested from a (simulated, 380 ms) server. Filtered totals are estimates, as they often are for large tables." status={<Badge>{N.toLocaleString("en-AU")} rows</Badge>}
        actions={<Segmented label="Mode" value={mode} onChange={setMode} options={[{ value: "pages", label: "Pages" }, { value: "more", label: "Load more" }]} />} />
      <Panel flush>
        <DataTable<Row> key={mode} rows={rows} cols={cols} pageSize={10} selectable={false} exportName="server" ariaLabel="Server-side shipments"
          server={{ total: meta.total, estimated: meta.estimated, loading: meta.loading, mode, onQuery }}
          facet={{ key: "status", label: "Status", options: ST.map((value) => ({ value })) }} />
      </Panel>
      <Alert s="info" title="Honest about the limits">Only the <b>Ref</b> column sorts server-side in this demo (the other columns would need an index); search and filters scan the first 60,000 rows and the total is extrapolated from a 4,000-row sample, hence the “~”.</Alert>
      <Panel title="Request log" className="adm-section"><ul className="adm-list adm-list--tight" style={{ fontFamily: "var(--jp-font-mono)", fontSize: "var(--jp-fs-xs)" }}>{log.map((l, i) => <li key={i}>{l}</li>)}</ul></Panel>
    </>
  );
}
