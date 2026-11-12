import { useState } from "react";
import { PageHeader, Panel, Tabs, Badge, Btn, Alert } from "@belikh/jupiter-ui/kit.tsx";
import { StatTile, BarChart } from "@belikh/jupiter-ui/Charts.tsx";
import type { Col } from "@belikh/jupiter-ui/DataTable.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { useStore, Sheet, opts } from "./lib.tsx";
import { PRINTERS, JOBS, SPOOLS, FAILURES, canStart, nextJob, failureRate, etaMin, usableGrams, type Job, type Spool, type Failure, type Printer } from "./printing.data.ts";

const PS = { Idle: "info", Printing: "ok", Paused: "warn", Error: "danger", Offline: "danger" } as const;
const hm = (m: number) => `${Math.floor(m / 60)} h ${m % 60} min`;
export function Printing() {
  const [tab, setTab] = useState("printers"); const { toast } = usePrefs();
  const pr = useStore("print-p", PRINTERS), jobs = useStore("print-j", JOBS), sp = useStore("print-s", SPOOLS), fl = useStore("print-f", FAILURES);
  const start = (p: Printer) => { const j = nextJob(jobs.rows); if (!j) { toast({ kind: "info", title: "Queue is empty" }); return; } const c = canStart(p, j, sp.rows); if (!c.ok) { toast({ kind: "warn", title: `Can't start ${j.name}`, body: c.why }); return; } jobs.patch(j.id, { status: "Printing", printer: p.id }); pr.patch(p.id, { state: "Printing", job: j.id, progress: 0 }); toast({ kind: "ok", title: `Started ${j.name}`, body: p.name }); };
  const jobCols: Col<Job>[] = [
    { key: "priority", header: "Priority", width: 90, align: "right", editor: { type: "number", min: 1, max: 99 } }, { key: "name", header: "Job", width: 200, editor: { type: "text" } }, { key: "material", header: "Material", width: 100, editor: { type: "select", options: opts("PLA", "PETG", "ABS", "TPU") } },
    { key: "grams", header: "Grams", width: 90, align: "right", editor: { type: "number", min: 1, max: 5000 } }, { key: "minutes", header: "Est. time", width: 110, value: (r) => hm(r.minutes) }, { key: "printer", header: "Printer", width: 130, value: (r) => pr.rows.find((p) => p.id === r.printer)?.name ?? "unassigned" },
    { key: "status", header: "Status", width: 110, editor: { type: "select", options: [{ value: "Queued", label: "Queued", s: "info" }, { value: "Printing", label: "Printing", s: "ok" }, { value: "Done", label: "Done", s: "ok" }, { value: "Failed", label: "Failed", s: "danger" }] } },
  ];
  const spCols: Col<Spool>[] = [
    { key: "brand", header: "Brand", width: 120, editor: { type: "text" } }, { key: "material", header: "Material", width: 100, editor: { type: "select", options: opts("PLA", "PETG", "ABS", "TPU") } }, { key: "color", header: "Colour", width: 140, editor: { type: "text" } },
    { key: "grams", header: "Remaining (g)", width: 120, align: "right", editor: { type: "number", min: 0, max: 1000 }, cf: { type: "bars" } as never }, { key: "dry", header: "Dry", width: 80, editor: { type: "boolean" }, value: (r) => (r.dry ? "Yes" : "Humid") },
    { key: "low", header: "Stock", width: 110, render: (r) => (r.grams < 20 ? <Badge s="danger">empty</Badge> : r.grams < 100 ? <Badge s="warn">low</Badge> : <Badge s="ok">ok</Badge>), value: (r) => (r.grams < 20 ? "empty" : r.grams < 100 ? "low" : "ok") }, { key: "cost", header: "Cost", width: 80, align: "right", editor: { type: "number", min: 0, max: 500 } },
  ];
  const fCols: Col<Failure>[] = [{ key: "date", header: "Date", width: 120, editor: { type: "date" } }, { key: "job", header: "Job", width: 170, editor: { type: "text" } }, { key: "reason", header: "Cause", width: 160, editor: { type: "select", options: opts("Bed adhesion", "Spaghetti", "Clog", "Power loss", "Thermal runaway", "Other") } }, { key: "gramsWasted", header: "Wasted (g)", width: 110, align: "right", editor: { type: "number", min: 0, max: 5000 } }, { key: "note", header: "Note", width: 260, editor: { type: "text" } }];
  const causes = ["Bed adhesion", "Spaghetti", "Clog", "Power loss", "Thermal runaway", "Other"]; const wasted = fl.rows.reduce((s, f) => s + f.gramsWasted, 0); const lowStock = sp.rows.filter((s) => s.grams < 100).length;
  const queue = jobs.rows.filter((j) => j.status === "Queued"); const nj = nextJob(jobs.rows); const needMat = nj ? usableGrams(sp.rows, nj.material) < nj.grams : false;
  return (
    <>
      <PageHeader title="3D printing" crumbs={["Home lab", "3D printing"]} desc="Printer status, the job queue, filament stock and a failure log."
        tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: "printers", label: "Printers" }, { id: "queue", label: "Job queue", count: queue.length }, { id: "filament", label: "Filament", count: sp.rows.length }, { id: "failures", label: "Failures", count: fl.rows.length }]} />} />
      <div className="adm-grid adm-grid--4"><StatTile label="Printing now" value={String(pr.rows.filter((p) => p.state === "Printing").length)} /><StatTile label="Queued" value={String(queue.length)} sub={queue.length ? `${hm(queue.reduce((s, j) => s + j.minutes, 0))} total` : ""} /><StatTile label="Low filament" value={String(lowStock)} invert /><StatTile label="Failure rate" value={`${failureRate(jobs.rows)}%`} invert /></div>
      <div className="adm-section">
        {tab === "printers" && <div className="hg-cards">{pr.rows.map((p) => { const j = jobs.rows.find((x) => x.id === p.job); return (
          <section key={p.id} className={`hg-card${p.state === "Error" ? " is-danger" : p.state === "Paused" ? " is-warn" : ""}`} aria-label={p.name}>
            <div className="hg-row hg-between"><b>{p.name}</b><Badge s={PS[p.state]}>{p.state}</Badge></div><span className="hg-muted">{p.model} · {p.hours} h</span>
            {j && (p.state === "Printing" || p.state === "Paused") ? <><div>{j.name}</div><div className="hg-bar" role="progressbar" aria-label={`${p.name} progress`} aria-valuenow={p.progress} aria-valuemin={0} aria-valuemax={100}><i style={{ inlineSize: `${p.progress}%` }} /></div><span className="hg-num hg-muted">{p.progress}% · {hm(etaMin(j, p))} left</span></> : null}
            <span className="hg-num">Nozzle {p.nozzle} C · bed {p.bed} C</span>
            <div className="hg-row">{p.state === "Printing" && <Btn sm onClick={() => pr.patch(p.id, { state: "Paused" })}>Pause</Btn>}{p.state === "Paused" && <Btn sm variant="primary" onClick={() => pr.patch(p.id, { state: "Printing" })}>Resume</Btn>}{p.state === "Idle" && <Btn sm variant="primary" onClick={() => start(p)}>Start next job</Btn>}{p.state === "Error" && <Btn sm onClick={() => { pr.patch(p.id, { state: "Idle" }); toast({ kind: "info", title: `${p.name} error cleared` }); }}>Clear error</Btn>}</div></section>); })}</div>}
        {tab === "queue" && <div className="adm-stack">{nj && needMat && <Alert s="warn" title={`Next job "${nj.name}" lacks filament`}>Needs {nj.grams} g {nj.material}; {usableGrams(sp.rows, nj.material)} g of dry stock.</Alert>}<Sheet t={jobs} title="Job queue" cols={jobCols} name="print-jobs" blank={{ name: "New job", printer: "", material: "PLA", grams: 50, minutes: 120, status: "Queued", priority: 5 }} /></div>}
        {tab === "filament" && <Sheet t={sp} title="Filament stock" cols={spCols} name="filament" blank={{ brand: "", material: "PLA", color: "", grams: 1000, dry: true, cost: 30 }} />}
        {tab === "failures" && <div className="adm-stack"><Panel title="Causes"><BarChart title="Failures by cause" labels={causes} series={[{ name: "Failures", data: causes.map((c) => fl.rows.filter((f) => f.reason === c).length) }]} height={180} /><p className="hg-muted">{wasted} g of filament wasted.</p></Panel><Sheet t={fl} title="Failure log" cols={fCols} name="failures" blank={{ date: "2026-11-12", job: "", reason: "Other", gramsWasted: 0, note: "" }} /></div>}
      </div>
    </>
  );
}
