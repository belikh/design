import { useEffect, useState } from "react";
import { PageHeader, Panel, Btn, Badge, Drawer, Alert } from "@belikh/jupiter-ui/kit.tsx";
import { Switch } from "@belikh/jupiter-ui/inputs.tsx";
import { LineChart, ProgressBar } from "@belikh/jupiter-ui/Charts.tsx";
import { DataTable, type Col } from "@belikh/jupiter-ui/DataTable.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { counts, enqueue, initJobs, pauseQueue, promoteJob, removeJob, retryJob, step, type Job, type JobsState } from "../lib/jobs.ts";
import "../tools.css";

type Row = Omit<Job, "id"> & { id: string; jid: number };
const S: Record<string, "ok" | "warn" | "danger" | "info" | undefined> = { completed: "ok", active: "info", waiting: undefined, delayed: "warn", failed: "danger" };
export function JobQueue() {
  const { toast } = usePrefs(); const [s, setS] = useState<JobsState>(() => initJobs()); const [live, setLive] = useState(true); const [open, setOpen] = useState<Job | null>(null);
  useEffect(() => { if (!live) return; const t = setInterval(() => setS((x) => step(x)), 900); return () => clearInterval(t); }, [live]);
  const total = counts(s); const rows: Row[] = s.jobs.map((j) => ({ ...j, id: String(j.id), jid: j.id })); const detail = open ? s.jobs.find((j) => j.id === open.id) ?? open : null;
  const cols: Col<Row>[] = [
    { key: "jid", header: "#", width: 60, value: (r) => r.jid }, { key: "queue", header: "Queue", width: 90, filter: "select" }, { key: "name", header: "Job", width: 190, filter: "text" },
    { key: "state", header: "State", width: 110, render: (r) => <Badge s={S[r.state]}>{r.state}</Badge> }, { key: "attempts", header: "Attempts", width: 90, align: "right", render: (r) => `${r.attempts}/${r.maxAttempts}` },
    { key: "progress", header: "Progress", width: 140, sortable: false, render: (r) => <ProgressBar value={r.progress} s={r.state === "failed" ? "danger" : r.state === "completed" ? "ok" : undefined} label={`${r.name} progress`} /> },
    { key: "error", header: "Last error", width: 260, render: (r) => (r.error ? <span className="adm-err" style={{ whiteSpace: "normal" }}>{r.error}</span> : <span className="jp-muted">—</span>) },
  ];
  return (
    <>
      <PageHeader title="Job queues" crumbs={["Tools", "Job queues"]} desc="A live view of background queues: states, throughput, failures and retries. Pause a queue, retry a failed job, or promote a delayed one." status={<Badge s={total.failed ? "danger" : "ok"}>{total.failed ? `${total.failed} failed` : "healthy"}</Badge>}
        actions={<><Switch checked={live} onChange={setLive} label="Live" /><Btn icon="plus" onClick={() => setS((x) => enqueue(x, ["default", "mail", "media", "ha-sync"][x.seq % 4]))}>Enqueue a job</Btn></>} />
      <div className="pt-qgrid">{s.queues.map((q) => { const c = counts(s, q.id); return (
        <div key={q.id} className={`pt-q ${q.paused ? "is-paused" : ""}`}><div className="adm-row" style={{ justifyContent: "space-between" }}><b className="adm-num">{q.id}</b><Btn sm variant="secondary" onClick={() => { setS((x) => pauseQueue(x, q.id, !q.paused)); toast({ kind: "info", title: `${q.id} ${q.paused ? "resumed" : "paused"}` }); }}>{q.paused ? "Resume" : "Pause"}</Btn></div>
          <div className="pt-q__counts">{(["waiting", "active", "delayed", "failed", "completed"] as const).map((k) => <span key={k}><b>{c[k]}</b>{k}</span>)}</div><span className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>concurrency {q.concurrency}{q.paused ? " · paused" : ""}</span></div>); })}</div>
      <div className="adm-grid adm-grid--21" style={{ marginTop: 16 }}>
        <Panel title="Throughput (last 60 ticks)"><LineChart height={170} labels={s.history.map((h) => String(h.tick))} series={[{ name: "Completed", data: s.history.map((h) => h.completed) }, { name: "Failed", data: s.history.map((h) => h.failed), color: "var(--jp-danger)" }]} title="Throughput" yFmt={(v) => String(Math.round(v * 10) / 10)} zoomable={false} /></Panel>
        <Panel title="Totals"><dl className="adm-dl" style={{ gridTemplateColumns: "100px 1fr" }}>{(["waiting", "active", "delayed", "failed", "completed"] as const).map((k) => <><dt key={k}>{k}</dt><dd key={k + "v"}><b className="adm-num">{total[k]}</b></dd></>)}</dl></Panel>
      </div>
      <Panel title="Jobs" className="adm-section" flush>
        <DataTable<Row> rows={rows} cols={cols} selectable={false} pageSize={8} exportName="jobs" facet={{ key: "state", label: "State", options: (["waiting", "active", "delayed", "failed", "completed"] as const).map((v) => ({ value: v })) }}
          rowActions={(r) => [{ label: "Details", onSelect: () => setOpen(s.jobs.find((j) => j.id === r.jid) ?? null) }, ...(r.state === "failed" || r.state === "delayed" ? [{ label: "Retry now", onSelect: () => { setS((x) => retryJob(x, r.jid)); toast({ kind: "ok", title: `Job ${r.jid} re-queued` }); } }] : []), ...(r.state === "delayed" ? [{ label: "Promote", onSelect: () => setS((x) => promoteJob(x, r.jid)) }] : []), { label: "Remove", danger: true, onSelect: () => { setS((x) => removeJob(x, r.jid)); toast({ kind: "warn", title: `Job ${r.jid} removed` }); } }]} />
      </Panel>
      <Drawer open={!!detail} onClose={() => setOpen(null)} title={detail ? `Job ${detail.id} · ${detail.name}` : ""} footer={detail && (detail.state === "failed" || detail.state === "delayed") ? <Btn variant="primary" onClick={() => { setS((x) => retryJob(x, detail.id)); setOpen(null); }}>Retry now</Btn> : <Btn onClick={() => setOpen(null)}>Close</Btn>}>
        {detail && <div className="adm-stack"><div className="adm-row"><Badge s={S[detail.state]}>{detail.state}</Badge><Badge>{detail.queue}</Badge></div><dl className="adm-dl" style={{ gridTemplateColumns: "100px 1fr" }}><dt>Attempts</dt><dd>{detail.attempts} of {detail.maxAttempts}</dd><dt>Created</dt><dd>tick {detail.createdAt}</dd><dt>Progress</dt><dd>{detail.progress}%</dd>{detail.delayUntil && <><dt>Retry at</dt><dd>tick {detail.delayUntil}</dd></>}</dl>{detail.error ? <Alert s="danger" title="Last error"><code>{detail.error}</code></Alert> : <Alert s="ok" title="No errors" />}</div>}
      </Drawer>
    </>
  );
}
