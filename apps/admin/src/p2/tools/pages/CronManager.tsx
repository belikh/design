import { useMemo, useState } from "react";
import { PageHeader, Panel, Btn, Badge, Modal, EmptyState } from "@belikh/jupiter-ui/kit.tsx";
import { Field, Switch, TextInput } from "@belikh/jupiter-ui/inputs.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { CronError, describeCron, nextRuns } from "../lib/cron.ts";
import { useStored } from "../common.tsx";
import "../tools.css";

export const NOW = new Date(2026, 10, 12, 17, 52); // the demo clock used across the app
type Job = { id: number; name: string; cron: string; enabled: boolean; last?: string; status?: "ok" | "failed" };
const SEED: Job[] = [{ id: 1, name: "ZFS scrub", cron: "0 2 * * 0", enabled: true, last: "2026-11-08 02:00", status: "ok" }, { id: 2, name: "Backup to NAS", cron: "30 1 * * *", enabled: true, last: "2026-11-12 01:30", status: "ok" }, { id: 3, name: "Cert renewal check", cron: "0 */6 * * *", enabled: true, last: "2026-11-12 12:00", status: "ok" }, { id: 4, name: "Sync Home Assistant", cron: "*/5 * * * *", enabled: true, last: "2026-11-12 17:50", status: "failed" }, { id: 5, name: "Weekly digest email", cron: "0 8 * * mon", enabled: false, last: "2026-11-09 08:00", status: "ok" }];
const PRESETS: [string, string][] = [["Every 5 minutes", "*/5 * * * *"], ["Hourly", "0 * * * *"], ["Daily at 02:00", "0 2 * * *"], ["Weekdays at 09:00", "0 9 * * 1-5"], ["Monthly (1st, 03:00)", "0 3 1 * *"]];
const fmt = (d: Date) => `${d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const rel = (d: Date) => { const m = Math.round((d.getTime() - NOW.getTime()) / 60000); return m < 60 ? `in ${m} min` : m < 1440 ? `in ${Math.floor(m / 60)} h ${m % 60} m` : `in ${Math.floor(m / 1440)} d`; };
export function validateCron(expr: string): { ok: true; desc: string; next: Date[] } | { ok: false; error: string } { try { return { ok: true, desc: describeCron(expr), next: nextRuns(expr, NOW, 5) }; } catch (e) { return { ok: false, error: e instanceof CronError ? e.message : "Invalid expression" }; } }
export function CronManager() {
  const { toast } = usePrefs(); const [jobs, setJobs] = useStored<Job[]>("pt-cron-jobs", SEED); const [edit, setEdit] = useState<Job | null>(null);
  const upcoming = useMemo(() => jobs.filter((j) => j.enabled).flatMap((j) => { try { return nextRuns(j.cron, NOW, 40).filter((d) => d.getTime() - NOW.getTime() < 86400000).map((d) => ({ j, d })); } catch { return []; } }).sort((a, b) => a.d.getTime() - b.d.getTime()), [jobs]);
  const perHour = Array.from({ length: 24 }, (_, i) => upcoming.filter((u) => Math.floor((u.d.getTime() - NOW.getTime()) / 3600000) === i).length); const maxH = Math.max(1, ...perHour);
  const v = edit ? validateCron(edit.cron) : null;
  const save = () => { if (!edit || !v?.ok || !edit.name.trim()) return; setJobs(jobs.some((j) => j.id === edit.id) ? jobs.map((j) => (j.id === edit.id ? edit : j)) : [...jobs, edit]); setEdit(null); toast({ kind: "ok", title: "Schedule saved" }); };
  return (
    <>
      <PageHeader title="Schedules" crumbs={["Tools", "Schedules"]} desc="Cron jobs with a validated editor: human description, the next five runs, and a 24-hour view of what’s coming. The demo clock is Thu 12 Nov 2026, 17:52."
        actions={<Btn variant="primary" icon="plus" onClick={() => setEdit({ id: Date.now(), name: "", cron: "0 2 * * *", enabled: true })}>New schedule</Btn>} />
      <Panel title="Jobs" flush>
        {jobs.length === 0 ? <EmptyState spot="empty" title="No schedules" action={<Btn variant="primary" onClick={() => setEdit({ id: Date.now(), name: "", cron: "0 2 * * *", enabled: true })}>Create one</Btn>}>Add a cron job to get started.</EmptyState> : (
          <div className="adm-dt__wrap"><table className="jp-table"><thead><tr><th>Name</th><th>Schedule</th><th>Next run</th><th>Last run</th><th>On</th><th /></tr></thead><tbody>
            {jobs.map((j) => { const r = validateCron(j.cron); return (<tr key={j.id}>
              <td><b>{j.name}</b></td><td><code className="adm-num">{j.cron}</code><div className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>{r.ok ? r.desc : <span className="adm-err">{r.error}</span>}</div></td>
              <td className="adm-num">{j.enabled && r.ok ? <>{fmt(r.next[0])}<div className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>{rel(r.next[0])}</div></> : <span className="jp-muted">paused</span>}</td>
              <td className="adm-num">{j.last ?? "—"} {j.status && <Badge s={j.status === "ok" ? "ok" : "danger"}>{j.status}</Badge>}</td>
              <td><Switch checked={j.enabled} onChange={(v2) => setJobs(jobs.map((x) => (x.id === j.id ? { ...x, enabled: v2 } : x)))} label={j.enabled ? "On" : "Off"} /></td>
              <td style={{ whiteSpace: "nowrap", textAlign: "end" }}><Btn sm variant="ghost" onClick={() => { setJobs(jobs.map((x) => (x.id === j.id ? { ...x, last: "2026-11-12 17:52", status: "ok" } : x))); toast({ kind: "ok", title: `Ran “${j.name}”` }); }}>Run now</Btn><Btn sm variant="ghost" onClick={() => setEdit(j)}>Edit</Btn><button className="adm-x" aria-label={`Delete ${j.name}`} onClick={() => { const old = jobs; setJobs(jobs.filter((x) => x.id !== j.id)); toast({ kind: "warn", title: `Deleted “${j.name}”`, undo: () => setJobs(old) }); }}>×</button></td></tr>); })}</tbody></table></div>)}
      </Panel>
      <div className="adm-grid adm-grid--2" style={{ marginTop: 16 }}>
        <Panel title="Next 24 hours"><div className="pt-hours" aria-label="Runs per hour">{perHour.map((n, i) => <i key={i} style={{ height: `${(n / maxH) * 100}%` }} title={`${n} run${n === 1 ? "" : "s"}`} />)}</div><div className="pt-hours-l">{perHour.map((_, i) => <span key={i}>{i % 3 === 0 ? (NOW.getHours() + i) % 24 : ""}</span>)}</div><p className="jp-muted" style={{ marginTop: 6 }}>{upcoming.length} runs scheduled; hours are 24-hour clock, starting now.</p></Panel>
        <Panel title="Coming up" flush><ul className="adm-list adm-list--tight" style={{ maxHeight: 220, overflow: "auto" }}>{upcoming.slice(0, 12).map((u, i) => <li key={i}><span className="adm-num" style={{ width: 110 }}>{fmt(u.d)}</span><b style={{ flex: 1 }}>{u.j.name}</b><span className="jp-muted">{rel(u.d)}</span></li>)}</ul></Panel>
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={jobs.some((j) => j.id === edit?.id) ? "Edit schedule" : "New schedule"} footer={<><Btn onClick={() => setEdit(null)}>Cancel</Btn><Btn variant="primary" disabled={!v?.ok || !edit?.name.trim()} onClick={save}>Save</Btn></>}>
        {edit && <div className="adm-stack">
          <Field label="Name" required>{(id) => <TextInput id={id} value={edit.name} onChange={(n) => setEdit({ ...edit, name: n })} autoFocus />}</Field>
          <Field label="Cron expression" hint="minute hour day-of-month month weekday" error={v && !v.ok ? v.error : undefined}>{(id) => <TextInput id={id} value={edit.cron} onChange={(c) => setEdit({ ...edit, cron: c })} state={v && !v.ok ? "error" : v ? "success" : undefined} />}</Field>
          <div className="pt-chips">{PRESETS.map(([l, c]) => <button key={c} type="button" className={`adm-pill ${edit.cron === c ? "is-on" : ""}`} onClick={() => setEdit({ ...edit, cron: c })}>{l}</button>)}</div>
          {v?.ok && <div><b>{v.desc}</b><ol style={{ margin: "6px 0 0", paddingInlineStart: 22 }} className="adm-num">{v.next.map((d, i) => <li key={i}>{fmt(d)} <span className="jp-muted">({rel(d)})</span></li>)}</ol></div>}
        </div>}
      </Modal>
    </>
  );
}
