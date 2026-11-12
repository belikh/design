import { useEffect, useMemo, useRef, useState } from "react";
import "./tables.css";
import { PageHeader, Panel, Badge, Btn, Alert } from "@belikh/jupiter-ui/kit.tsx";
import { DataTable, type Col } from "@belikh/jupiter-ui/DataTable.tsx";
import { SHIPMENTS, money, type Ship, type ShipStatus } from "./data.ts";
import { rng } from "../../data/fixtures.ts";

const SB: Record<string, "ok" | "warn" | "danger" | "info"> = { Delivered: "ok", "In transit": "info", Delayed: "warn", Held: "danger" };
const cols: Col<Ship>[] = [
  { key: "ref", header: "Ref", width: 100 }, { key: "customer", header: "Customer", width: 170 }, { key: "status", header: "Status", width: 120, render: (r) => <Badge s={SB[r.status]}>{r.status}</Badge> },
  { key: "qty", header: "Pallets", width: 90, align: "right" }, { key: "cost", header: "Cost", width: 110, align: "right", fmt: money, agg: "sum" }, { key: "sla", header: "SLA h", width: 80, align: "right" },
];
type Mut = (rows: Ship[]) => Ship[];

export function Live() {
  const [rows, setRows] = useState<Ship[]>(() => SHIPMENTS.slice(0, 14)); const [paused, setPaused] = useState(false); const [pending, setPending] = useState(0); const queue = useRef<Mut[]>([]); const r = useRef(rng(404)); const n = useRef(0);
  useEffect(() => {
    const t = setInterval(() => {
      n.current++; const rand = r.current; const pickId = () => Math.floor(rand() * 14); const k = n.current;
      const mut: Mut = k % 5 === 0
        ? (rs) => [{ ...SHIPMENTS[(30 + k) % SHIPMENTS.length], id: `LIVE-${k}`, ref: `SH-${5000 + k}`, status: "In transit" as ShipStatus }, ...rs].slice(0, 40)
        : (rs) => rs.map((x, i) => (i === pickId() % rs.length ? (k % 2 ? { ...x, cost: Math.round(x.cost * (0.9 + rand() * 0.25)), sla: Math.max(1, x.sla + Math.round((rand() - 0.5) * 6)) } : { ...x, status: (["In transit", "Delayed", "Delivered", "Held"] as ShipStatus[])[Math.floor(rand() * 4)] }) : x));
      if (paused) { queue.current.push(mut); setPending(queue.current.length); } else setRows(mut);
    }, 1200); return () => clearInterval(t);
  }, [paused]);
  const resume = () => { const q = queue.current; queue.current = []; setPending(0); setRows((rs) => q.reduce((a, m) => m(a), rs)); setPaused(false); };
  const toolbar = <><Btn sm variant={paused ? "primary" : "secondary"} icon={paused ? "play" : "pause"} onClick={() => (paused ? resume() : setPaused(true))}>{paused ? "Resume" : "Pause"}</Btn>{pending > 0 && <Badge s="warn">{pending} updates waiting</Badge>}<Badge s={paused ? "warn" : "ok"}>{paused ? "paused" : "live"}</Badge></>;

  const base = useMemo(() => SHIPMENTS.slice(40, 58), []); const [snap, setSnap] = useState<Ship[] | null>(null); const [cur, setCur] = useState<Ship[]>(base); const step = useRef(0);
  const simulate = () => { step.current++; const k = step.current; setCur((rs) => { const out = rs.filter((_, i) => i !== 2 + (k % 3)).map((x, i) => (i % 4 === k % 4 ? { ...x, cost: x.cost + 100 * k, status: (i % 2 ? "Delayed" : "Delivered") as ShipStatus } : x)); return [...out, { ...SHIPMENTS[90 + k], id: `NEW-${k}` }, { ...SHIPMENTS[100 + k], id: `NEW-${k}b` }]; }); };
  return (
    <>
      <PageHeader title="Live rows and snapshot diff" crumbs={["Grids", "Live"]} desc="Streaming inserts and edits flash as they land; pause to buffer updates. Diff mode compares the table with an earlier snapshot." />
      <Panel title="Live shipments (B030)" flush>
        <DataTable<Ship> rows={rows} cols={cols} flash toolbar={toolbar} pageSize={10} selectable={false} exportName="live" ariaLabel="Live shipments" />
      </Panel>
      <Alert s="info" title="Why pause?">Rows keep arriving while you read. Pausing buffers changes (nothing moves under your cursor) and shows how many are waiting; resuming applies them in order.</Alert>
      <Panel title="Diff against a snapshot (B029)" className="adm-section" flush actions={<div className="adm-row"><Btn sm onClick={() => setSnap(cur)} disabled={!!snap}>Take snapshot</Btn><Btn sm onClick={simulate} disabled={!snap}>Simulate changes</Btn><Btn sm variant="ghost" onClick={() => { setSnap(null); setCur(base); step.current = 0; }}>Reset</Btn></div>}>
        <DataTable<Ship> rows={cur} cols={cols} diff={snap ? { before: snap } : undefined} pageSize={25} selectable={false} exportName="diff" ariaLabel="Snapshot diff" />
        {!snap && <p className="jp-muted" style={{ padding: "8px 16px" }}>Take a snapshot, then simulate changes: added rows turn green, removed rows are struck through at the bottom, changed cells show the old value.</p>}
      </Panel>
    </>
  );
}
