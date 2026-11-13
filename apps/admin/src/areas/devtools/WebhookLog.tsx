import { useState } from "react";
import { PageHeader, Panel, Btn, Badge, Drawer, Alert, CodeBlock } from "@belikh/jupiter-ui/kit.tsx";
import { Switch } from "@belikh/jupiter-ui/inputs.tsx";
import { DataTable, type Col } from "@belikh/jupiter-ui/DataTable.tsx";
import { StatTile } from "@belikh/jupiter-ui/Charts.tsx";
import { SyncStatus } from "@belikh/jupiter-ui/sync.tsx";
import { createCollection, useCollection } from "@belikh/jupiter-ui/mock.ts";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { ENDPOINTS, replayResult, seed, type Delivery } from "./lib/webhooks.ts";
import "./devtools.css";

export function WebhookLog() {
  const { toast } = usePrefs();
  const [col] = useState(() => createCollection<Delivery>(seed, { latency: 20, jitter: 0 }));
  const { rows, state, online, pending, stale, updatedAt, refresh } = useCollection(col);
  const [healthy, setHealthy] = useState<Record<string, boolean>>({ [ENDPOINTS[0]]: false, [ENDPOINTS[1]]: true, [ENDPOINTS[2]]: true, [ENDPOINTS[3]]: true });
  const [open, setOpen] = useState<string | null>(null); const [seq, setSeq] = useState(1);
  const detail = rows.find((r) => r.id === open);
  const failed = rows.filter((r) => r.outcome === "failed").length; const rate = rows.length ? Math.round(((rows.length - failed) / rows.length) * 100) : 100;
  const replay = async (ids: string[]) => {
    let ok = 0, bad = 0, n = seq;
    for (const id of ids) { const d = col.snapshot().find((r) => r.id === id); if (!d) continue; const r = replayResult(d, healthy[d.endpoint] ?? true, n++); const { id: _i, ...rest } = r; await col.create({ ...rest, id: r.id }); if (r.outcome === "delivered") ok++; else bad++; }
    setSeq(n); toast({ kind: bad ? "warn" : "ok", title: `Replayed ${ids.length} deliver${ids.length === 1 ? "y" : "ies"}`, body: `${ok} delivered, ${bad} failed again` });
  };
  const cols: Col<Delivery>[] = [
    { key: "id", header: "ID", width: 90 }, { key: "at", header: "Time", width: 160 },
    { key: "endpoint", header: "Endpoint", width: 260, filter: "select", render: (r) => r.endpoint.replace("https://", "") },
    { key: "event", header: "Event", width: 130, filter: "select" },
    { key: "code", header: "Status", width: 90, align: "right", render: (r) => <Badge s={r.outcome === "delivered" ? "ok" : "danger"}>{r.code}</Badge> },
    { key: "outcome", header: "Outcome", width: 100 }, { key: "attempt", header: "Attempt", width: 80, align: "right" }, { key: "ms", header: "Time (ms)", width: 90, align: "right" },
    { key: "replayOf", header: "Replay of", width: 100, render: (r) => r.replayOf ?? <span className="jp-muted">original</span> },
  ];
  return (
    <>
      <PageHeader title="Webhook deliveries" crumbs={["Operations", "Webhook log"]} desc="Every delivery attempt with its request and response. Replay a failed delivery, or select several and replay them together. Replays against an unhealthy endpoint fail again."
        status={failed ? <Badge s="danger">{failed} failed</Badge> : <Badge s="ok">all delivered</Badge>} actions={<SyncStatus online={online} pending={pending} stale={stale} updatedAt={updatedAt} onRefresh={refresh} />} />
      <div className="adm-grid adm-grid--3"><StatTile label="Deliveries" value={String(rows.length)} /><StatTile label="Success rate" value={`${rate}%`} /><StatTile label="Failed" value={String(failed)} /></div>
      <div className="lab-gap" />
      <Panel title="Endpoint health (simulation)">
        <div className="lab-endpoints">{ENDPOINTS.map((e) => <div key={e} className="adm-row"><Switch checked={healthy[e]} onChange={(v) => setHealthy({ ...healthy, [e]: v })} label={`${e.replace("https://", "")} is healthy`} /></div>)}</div>
      </Panel>
      <div className="lab-gap" />
      <Panel title="Deliveries" flush>
        <DataTable<Delivery> rows={[...rows].reverse()} cols={cols} state={state === "loading" ? "loading" : "ready"} ariaLabel="Webhook deliveries" exportName="webhook-deliveries" pageSize={12} severity={(r) => (r.outcome === "failed" ? "danger" : undefined)}
          facet={{ key: "outcome", label: "Outcome", options: [{ value: "delivered", s: "ok" }, { value: "failed", s: "danger" }] }}
          rowActions={(r) => [{ label: "Inspect", onSelect: () => setOpen(r.id) }, { label: "Replay", onSelect: () => void replay([r.id]) }]}
          bulk={[{ label: "Replay selected", onRun: (ids) => void replay(ids) }]} />
      </Panel>
      <Drawer open={!!detail} onClose={() => setOpen(null)} title={detail ? `Delivery ${detail.id}` : "Delivery"} footer={detail && <Btn variant="primary" icon="send" onClick={() => void replay([detail.id])}>Replay delivery</Btn>}>
        {detail && <div className="adm-stack">
          <div className="adm-row"><Badge s={detail.outcome === "delivered" ? "ok" : "danger"}>{detail.code}</Badge><span>{detail.event}</span><span className="jp-muted">attempt {detail.attempt} · {detail.ms} ms</span></div>
          <div className="jp-muted">POST {detail.endpoint}</div>
          {detail.outcome === "failed" && !(healthy[detail.endpoint] ?? true) && <Alert s="warn" title="Endpoint still unhealthy">A replay will fail again. Mark it healthy above to simulate a fix.</Alert>}
          <h3>Request body</h3><CodeBlock code={detail.req} label="request body" /><h3>Response</h3><CodeBlock code={detail.res} label="response body" />
        </div>}
      </Drawer>
    </>
  );
}
