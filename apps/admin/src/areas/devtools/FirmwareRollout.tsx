import { useEffect, useState } from "react";
import { PageHeader, Panel, Btn, Badge, Alert } from "@belikh/jupiter-ui/kit.tsx";
import { Switch, Select } from "@belikh/jupiter-ui/inputs.tsx";
import { Editable } from "@belikh/jupiter-ui/editable.tsx";
import { ProgressBar, StatTile } from "@belikh/jupiter-ui/Charts.tsx";
import { DataTable, type Col } from "@belikh/jupiter-ui/DataTable.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { activeRing, failureRate, haltAll, initRollout, isDone, progress, retryFailed, rollback, setRing, startNext, tick, total, type Ring, type RingStatus, type Rollout } from "./lib/rollout.ts";
import "./devtools.css";

const S: Record<RingStatus, "ok" | "warn" | "danger" | "info" | undefined> = { pending: undefined, running: "info", paused: "warn", done: "ok", halted: "danger" };
type FailRow = { id: string; ring: string };

export function FirmwareRollout() {
  const { toast } = usePrefs();
  const [s, setS] = useState<Rollout>(() => initRollout()); const [live, setLive] = useState(true);
  useEffect(() => { if (!live) return; const t = setInterval(() => setS((x) => tick(x)), 900); return () => clearInterval(t); }, [live]);
  const act = (f: (x: Rollout) => Rollout, title: string, undo = true) => { const old = s; setS(f(s)); toast({ kind: "info", title, undo: undo ? () => setS(old) : undefined }); };
  const pct = progress(s); const halted = s.rings.filter((r) => r.status === "halted"); const failedTotal = s.rings.reduce((a, r) => a + r.failed, 0);
  const failRows: FailRow[] = s.rings.flatMap((r) => r.failedIds.map((id) => ({ id, ring: r.id })));
  const cols: Col<FailRow>[] = [{ key: "id", header: "Device", width: 140 }, { key: "ring", header: "Ring", width: 120, filter: "select" }, { key: "err", header: "Error", width: 240, render: () => "Update verification failed (checksum)", sortable: false }];
  const status = isDone(s) ? <Badge s="ok">complete</Badge> : halted.length ? <Badge s="danger">halted</Badge> : activeRing(s) ? <Badge s="info">rolling out</Badge> : <Badge>not started</Badge>;
  return (
    <>
      <PageHeader title="Firmware rollout" crumbs={["Operations", "Firmware rollout"]} desc="Staged rollout by ring. A ring halts itself when its failure rate passes the limit; later rings wait. Everything is simulated: one tick is one batch of devices."
        status={status} actions={<><Switch checked={live} onChange={setLive} label="Run live" /><Btn onClick={() => setS(tick(s))} disabled={live}>Step</Btn></>} />
      <div className="adm-grid adm-grid--4">
        <StatTile label="Target version" value={s.version} /><StatTile label="Updated" value={`${pct.toFixed(0)}%`} sub={`of ${total(s)} devices`} /><StatTile label="Failed" value={String(failedTotal)} /><StatTile label="Rings done" value={`${s.rings.filter((r) => r.status === "done").length}/${s.rings.length}`} />
      </div>
      <div className="lab-gap" />
      <Panel title="Controls"><div className="adm-row lab-controls">
        <label className="adm-row">Version <Select aria-label="Target version" value={s.version} onChange={(v) => { setS(initRollout(v)); toast({ kind: "info", title: `Rollout reset for ${v}` }); }} options={["4.2.1", "4.3.0-rc1", "4.1.9"]} /></label>
        <Switch checked={s.auto} onChange={(v) => setS({ ...s, auto: v })} label="Advance to the next ring automatically" />
        <Switch checked={s.badBuild} onChange={(v) => setS({ ...s, badBuild: v })} label="Simulate a bad build" />
        <Btn variant="primary" icon="upload" disabled={!s.rings.some((r) => r.status === "pending") || s.rings.some((r) => r.status === "running" || r.status === "halted")} onClick={() => act(startNext, "Started the next ring")}>Start next ring</Btn>
        <Btn onClick={() => act(haltAll, "Paused all running rings")} disabled={!activeRing(s)}>Pause all</Btn>
      </div></Panel>
      {halted.map((r) => <div key={r.id} className="lab-gap"><Alert s="danger" title={`${r.name} halted`}>{r.reason}. Retry the failed devices, raise the limit, or roll the ring back.</Alert></div>)}
      <div className="lab-gap" />
      <ol className="lab-rings" aria-label="Rings">
        {s.rings.map((r: Ring) => (
          <li key={r.id} className="lab-ring">
            <div className="adm-row lab-ring-head"><b>{r.name}</b><Badge s={S[r.status]}>{r.status}</Badge><span className="jp-muted adm-num">{r.updated + r.failed}/{r.devices} devices</span></div>
            <ProgressBar value={r.updated + r.failed} max={r.devices} label={`${r.name} progress`} segments={[{ v: r.updated, color: "var(--jp-accent)", name: "updated" }, { v: r.failed, color: "var(--jp-danger)", name: "failed" }]} />
            <div className="adm-row">
              <span className="jp-muted">Failure rate <b className="adm-num">{failureRate(r).toFixed(1)}%</b> limit</span>
              <Editable value={r.threshold} editor={{ type: "number", min: 1, max: 50, step: 1, unit: "%" }} label={`${r.name} failure limit`} onSave={(v) => { setS((x) => setRing(x, r.id, { threshold: Number(v) })); }} />
              <span className="lab-spacer" />
              {r.status === "running" && <Btn sm onClick={() => act((x) => setRing(x, r.id, { status: "paused" }), `${r.name} paused`)}>Pause</Btn>}
              {r.status === "paused" && <Btn sm onClick={() => act((x) => setRing(x, r.id, { status: "running" }), `${r.name} resumed`)}>Resume</Btn>}
              {r.failed > 0 && <Btn sm onClick={() => act((x) => retryFailed(x, r.id), `Retried ${r.failed} failed devices`)}>Retry failed</Btn>}
              {r.status === "halted" && !s.badBuild && r.failed === 0 && <Btn sm onClick={() => act((x) => setRing(x, r.id, { status: "running", reason: undefined }), `${r.name} resumed`)}>Resume</Btn>}
              {(r.updated > 0 || r.failed > 0) && <Btn sm variant="ghost" onClick={() => act((x) => rollback(x, r.id), `${r.name} rolled back`)}>Roll back</Btn>}
            </div>
          </li>))}
      </ol>
      <div className="lab-gap" />
      <Panel title={`Failed devices (${failRows.length})`} flush>{failRows.length ? <DataTable<FailRow> rows={failRows} cols={cols} ariaLabel="Failed devices" exportName="failed-devices" pageSize={8} selectable={false} /> : <p className="jp-muted lab-pad">No failures so far.</p>}</Panel>
    </>
  );
}
