import { useMemo, useState } from "react";
import "./domain.css";
import { PageHeader, Panel, Badge, Btn, Tabs, ConfirmDelete, Spinner } from "@belikh/jupiter-ui/kit.tsx";
import { StatTile, BarChart } from "@belikh/jupiter-ui/Charts.tsx";
import { Markdown } from "@belikh/jupiter-ui/extra.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { NOW, minutesToText } from "./lib.ts";
import { RUNS, RELEASES, runStatus, runSeconds, changelog, nextVersion, doraMetrics, type Release, type Run } from "./ci-deploys.data.ts";

const ago = (ms: number) => minutesToText((NOW.getTime() - ms) / 60000) + " ago";
const st = (s: string) => (s === "passed" ? "ok" : s === "failed" ? "danger" : s === "running" ? "info" : undefined);
export function CiDeploys() {
  const { toast } = usePrefs(); const [tab, setTab] = useState("runs"); const [sel, setSel] = useState<number>(RUNS[0].id); const [releases, setReleases] = useState<Release[]>(RELEASES); const [rb, setRb] = useState<Release | null>(null); const [branch, setBranch] = useState("all");
  const dora = useMemo(() => doraMetrics(RUNS, RELEASES), []); const run = RUNS.find((r) => r.id === sel)!; const shown = RUNS.filter((r) => branch === "all" || r.branch === branch);
  const cur = releases.find((r) => r.status === "current")!; const next = nextVersion(cur.version, RUNS.filter((r) => runStatus(r) === "passed").slice(0, 3).map((r) => r.msg));
  const md = releases.map((r) => { const g = changelog(r.commits); return `## ${r.version}  (${r.date})\n\n${Object.entries(g).map(([k, v]) => `**${k}**\n\n${v.map((x) => `- ${x.scope ? `*${x.scope}*: ` : ""}${x.text}`).join("\n")}`).join("\n\n")}\n`; }).join("\n");
  return (
    <>
      <PageHeader title="CI and deploys" crumbs={["Domain", "CI and deploys"]} desc="Pipeline runs with stage timings, releases with rollback, and a changelog generated from conventional commits." status={<Badge s="info">next version {next}</Badge>}
        tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: "runs", label: "Pipeline runs", count: RUNS.length }, { id: "releases", label: "Releases", count: releases.length }, { id: "changelog", label: "Changelog" }]} />} />
      <div className="adm-grid adm-grid--4"><StatTile label="Deploys / week" value={dora.deployFreqPerWeek.toFixed(1)} /><StatTile label="Change failure rate" value={`${(dora.changeFailureRate * 100).toFixed(0)}%`} invert /><StatTile label="Mean pipeline" value={`${dora.meanPipelineMin.toFixed(1)} min`} /><StatTile label="Current" value={`v${cur.version}`} sub={cur.date} /></div>
      {tab === "runs" && <div className="dm-split adm-section"><Panel title="Runs" flush actions={<div className="dm-row">{["all", "main", "feature/kiosk", "feature/latex"].map((b) => <button key={b} className={`adm-pill ${branch === b ? "is-on" : ""}`} onClick={() => setBranch(b)}>{b}</button>)}</div>}><ul className="adm-list">{shown.map((r) => (
        <li key={r.id} className="dm-click" role="button" tabIndex={0} onClick={() => setSel(r.id)} onKeyDown={(e) => e.key === "Enter" && setSel(r.id)} style={{ background: sel === r.id ? "color-mix(in oklab, var(--jp-accent) 10%, var(--jp-surface-raised))" : undefined }}>
          {runStatus(r) === "running" ? <Spinner /> : <Badge s={st(runStatus(r))}>{runStatus(r)}</Badge>}<div className="adm-list__main"><b>#{r.id} {r.msg}</b><span className="jp-muted">{r.branch} · <span className="dm-num">{r.sha}</span> · {r.author} · {ago(r.startedAt)}</span></div><span className="dm-num jp-muted">{minutesToText(runSeconds(r) / 60)}</span></li>))}</ul></Panel>
        <Panel title={`Run #${run.id}`} actions={<Btn sm onClick={() => toast({ kind: "info", title: `Re-running #${run.id}` })}>Re-run</Btn>}><div className="adm-stack"><BarChart horizontal height={200} labels={run.stages.map((s) => s.name)} series={[{ name: "seconds", data: run.stages.map((s) => s.sec) }]} />
          <ol className="dm-timeline">{run.stages.map((s) => <li key={s.name} className={s.status === "passed" ? "is-ok" : s.status === "failed" ? "is-danger" : s.status === "running" ? "is-info" : ""}><b>{s.name}</b> <Badge s={st(s.status)}>{s.status}</Badge> <span className="jp-muted dm-num">{s.sec}s</span></li>)}</ol></div></Panel></div>}
      {tab === "releases" && <Panel className="adm-section" title="Releases" flush><ul className="adm-list">{releases.map((r) => <li key={r.version}><b className="dm-num" style={{ width: 70 }}>v{r.version}</b><div className="adm-list__main"><span>{r.notes}</span><span className="jp-muted">{r.date} · {r.commits.length} commits</span></div><Badge s={r.status === "current" ? "ok" : r.status === "rolled-back" ? "danger" : undefined}>{r.status}</Badge>{r.status === "previous" && <Btn sm onClick={() => setRb(r)}>Roll back to this</Btn>}</li>)}</ul></Panel>}
      {tab === "changelog" && <Panel className="adm-section" title="Changelog (generated)"><Markdown src={md} /></Panel>}
      <ConfirmDelete open={!!rb} what={rb ? `v${rb.version}` : ""} onClose={() => setRb(null)} onConfirm={() => { if (rb) { setReleases(releases.map((r) => (r.version === rb.version ? { ...r, status: "current" } : r.status === "current" ? { ...r, status: "previous" } : r))); toast({ kind: "warn", title: `Rolled back to v${rb.version}` }); } setRb(null); }} />
    </>
  );
}
export type { Run };
