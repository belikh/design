import { useMemo, useState } from "react";
import "./domain.css";
import { PageHeader, Panel, Badge, Btn, Tabs, Modal, Avatar, Dot, Alert, type Status } from "@belikh/jupiter-ui/kit.tsx";
import { LineChart, StatTile, UptimeBars } from "@belikh/jupiter-ui/Charts.tsx";
import { Field, TextInput, Select, Switch, NumberStepper } from "@belikh/jupiter-ui/inputs.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { NOW, DAY, pct, minutesToText } from "./lib.ts";
import { SERVICES, INCIDENTS, RULES, METRIC_HISTORY, PEOPLE, UNIT, uptime, errorBudget, mttr, evaluateRule, onCallAt, sevLabel, incidentDuration, type Incident, type AlertRule, type Metric } from "./service-health.data.ts";

const stamp = (ms: number) => new Date(ms).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const sevStatus = (s: number): Status => (s === 1 ? "danger" : s === 2 ? "warn" : "info");

export function ServiceHealth() {
  const { toast } = usePrefs();
  const [tab, setTab] = useState("health"); const [incs, setIncs] = useState<Incident[]>(INCIDENTS); const [rules, setRules] = useState<AlertRule[]>(RULES);
  const [sel, setSel] = useState<string | null>(null); const [tested, setTested] = useState<string | null>(null); const [edit, setEdit] = useState<AlertRule | null>(null);
  const [overrides, setOverrides] = useState<{ from: number; to: number; person: string }[]>([]); const [ovPerson, setOvPerson] = useState("noah");
  const open = incs.filter((i) => i.end === undefined);
  const now = onCallAt(NOW, overrides);
  const rows = useMemo(() => SERVICES.map((s) => ({ s, up: uptime(s.days), eb: errorBudget(s.days, s.slo) })), []);
  const resolve = (id: string) => { const before = incs; setIncs(incs.map((i) => (i.id === id ? { ...i, end: NOW.getTime(), updates: [{ at: NOW.getTime(), text: "Resolved by on-call." }, ...i.updates] } : i))); toast({ kind: "ok", title: `${id} resolved`, undo: () => setIncs(before) }); };
  const ack = (id: string) => setIncs(incs.map((i) => (i.id === id ? { ...i, ack: now.person.id, updates: [{ at: NOW.getTime(), text: `Acknowledged by ${now.person.name}.` }, ...i.updates] } : i)));
  const test = rules.find((r) => r.id === tested); const series = test ? METRIC_HISTORY[test.svc]?.[test.metric] ?? [] : [];
  const firings = test ? evaluateRule(test, series, 15) : [];
  const stepLabels = Array.from({ length: 96 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}`);
  const selInc = incs.find((i) => i.id === sel);
  return (
    <>
      <PageHeader title="Service health" crumbs={["Domain", "Service health"]} desc="90-day uptime against SLOs, error budgets, incidents, alert rules you can test against history, and the on-call rota."
        status={<Badge s={open.length ? "danger" : "ok"}>{open.length ? `${open.length} open incident${open.length > 1 ? "s" : ""}` : "all clear"}</Badge>}
        tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: "health", label: "Health" }, { id: "incidents", label: "Incidents", count: incs.length }, { id: "rules", label: "Alert rules", count: rules.filter((r) => r.enabled).length }, { id: "oncall", label: "On-call" }]} />} />
      {tab === "health" && <>
        <div className="adm-grid adm-grid--4"><StatTile label="Fleet uptime (90d)" value={pct(rows.reduce((a, r) => a + r.up, 0) / rows.length, 3)} sub="mean of services" /><StatTile label="MTTR" value={minutesToText(mttr(incs))} sub="resolved incidents" /><StatTile label="Open incidents" value={String(open.length)} sub="now" /><StatTile label="Over budget" value={String(rows.filter((r) => r.eb.remaining < 0).length)} sub="services" invert /></div>
        <Panel title="Services vs SLO" className="adm-section" flush><div className="dm-table-wrap"><table className="jp-table"><thead><tr><th>Service</th><th>Tier</th><th>Owner</th><th>Uptime</th><th>SLO</th><th style={{ minWidth: 170 }}>Error budget</th><th style={{ minWidth: 220 }}>Last 90 days</th></tr></thead><tbody>
          {rows.map(({ s, up, eb }) => { const burn = Math.min(1, eb.burn); const st = eb.remaining < 0 ? "danger" : eb.burn > 0.7 ? "warn" : "ok"; return (
            <tr key={s.id}><td><Dot s={st === "danger" ? "danger" : st === "warn" ? "warn" : "ok"} /> <b className="dm-num">{s.name}</b></td><td>T{s.tier}</td><td><span className="dm-row" style={{ gap: 6 }}><Avatar name={PEOPLE.find((p) => p.id === s.owner)!.name} size={20} /></span></td>
              <td className="dm-num"><b>{pct(up, 3)}</b></td><td className="dm-num jp-muted">{pct(s.slo, 2)}</td>
              <td><div className="dm-bar" role="progressbar" aria-label={`${s.name} error budget used`} aria-valuenow={Math.round(burn * 100)}><i className={`is-${st}`} style={{ width: `${burn * 100}%` }} /></div><small className="jp-muted">{eb.remaining >= 0 ? `${minutesToText(eb.remaining)} left` : `${minutesToText(-eb.remaining)} over`}</small></td>
              <td><UptimeBars days={s.days.map((d) => (d === "down" ? "danger" : d))} /></td></tr>); })}</tbody></table></div></Panel></>}
      {tab === "incidents" && <div className="dm-split">
        <Panel title="Incident timeline" flush><ul className="adm-list">{incs.map((i) => (
          <li key={i.id} className="dm-click" role="button" tabIndex={0} onClick={() => setSel(i.id)} onKeyDown={(e) => e.key === "Enter" && setSel(i.id)} style={{ background: sel === i.id ? "color-mix(in oklab, var(--jp-accent) 10%, var(--jp-surface-raised))" : undefined }}>
            <Badge s={sevStatus(i.sev)}>SEV{i.sev}</Badge><div className="adm-list__main"><b>{i.id} · {i.title}</b><span className="jp-muted">{SERVICES.find((s) => s.id === i.svc)?.name} · {stamp(i.start)} · {incidentDuration(i)}</span></div>{i.end === undefined ? <Badge s="danger">open</Badge> : <Badge s="ok">resolved</Badge>}</li>))}</ul></Panel>
        <Panel title={selInc ? selInc.id : "Details"} actions={selInc && selInc.end === undefined ? <><Btn sm onClick={() => ack(selInc.id)} disabled={!!selInc.ack}>{selInc.ack ? "Acknowledged" : "Acknowledge"}</Btn><Btn sm variant="primary" onClick={() => resolve(selInc.id)}>Resolve</Btn></> : undefined}>
          {selInc ? <div className="adm-stack"><dl className="dm-kv"><dt>Title</dt><dd>{selInc.title}</dd><dt>Severity</dt><dd>{sevLabel(selInc.sev)}</dd><dt>Started</dt><dd>{stamp(selInc.start)}</dd><dt>Duration</dt><dd>{incidentDuration(selInc)}</dd><dt>Ack</dt><dd>{selInc.ack ? PEOPLE.find((p) => p.id === selInc.ack)?.name : "—"}</dd></dl><ol className="dm-timeline">{selInc.updates.map((u, k) => <li key={k} className="is-info"><span className="dm-num jp-muted">{stamp(u.at)}</span><div>{u.text}</div></li>)}</ol></div> : <p className="jp-muted">Select an incident to see its updates.</p>}
        </Panel></div>}
      {tab === "rules" && <>
        <Panel title="Alert rules" flush><div className="dm-table-wrap"><table className="jp-table"><thead><tr><th>Rule</th><th>Condition</th><th>Severity</th><th>Enabled</th><th /></tr></thead><tbody>{rules.map((r) => (
          <tr key={r.id}><td><b>{r.name}</b><div className="jp-muted">{SERVICES.find((s) => s.id === r.svc)?.name}</div></td><td className="dm-num">{r.metric} {r.op} {r.threshold}{UNIT[r.metric]} for {r.forMin} min</td><td><Badge s={sevStatus(r.sev)}>SEV{r.sev}</Badge></td>
            <td><Switch checked={r.enabled} onChange={(v) => setRules(rules.map((x) => (x.id === r.id ? { ...x, enabled: v } : x)))} label={`Enable ${r.name}`} /></td><td style={{ textAlign: "right" }}><Btn sm onClick={() => setTested(r.id)}>Test on history</Btn> <Btn sm variant="ghost" onClick={() => setEdit(r)}>Edit</Btn></td></tr>))}</tbody></table></div></Panel>
        {test && <Panel title={`Backtest: ${test.name}`} className="adm-section" actions={<Badge s={firings.length ? "warn" : "ok"}>{firings.length} firing{firings.length === 1 ? "" : "s"} in 24 h</Badge>}>
          <LineChart title={test.name} height={200} labels={stepLabels} series={[{ name: `${test.metric} (${UNIT[test.metric]})`, data: series }, { name: "threshold", data: series.map(() => test.threshold), color: "var(--jp-danger)" }]} annotations={firings.map((f, k) => ({ i: f.from, label: `fires #${k + 1}` }))} />
          <p className="jp-muted">A firing needs {test.forMin} consecutive minutes {test.op} {test.threshold}{UNIT[test.metric]}; samples are every 15 minutes.</p></Panel>}</>}
      {tab === "oncall" && <div className="adm-stack">
        <Alert s={now.override ? "warn" : "info"} title={`${now.person.name} is on call now`}>{now.override ? "Via an override. " : "Per the weekly rota. "}Phone <span className="dm-num">{now.person.phone}</span> (fictional).</Alert>
        <Panel title="Next six weeks" flush><ul className="adm-list">{Array.from({ length: 6 }, (_, w) => { const d = new Date(NOW.getTime() + w * 7 * DAY); const o = onCallAt(d, overrides); return <li key={w}><span className="dm-num" style={{ width: 120 }}>{d.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</span><Avatar name={o.person.name} size={26} /><b style={{ flex: 1 }}>{o.person.name}</b>{o.override && <Badge s="warn">override</Badge>}</li>; })}</ul></Panel>
        <Panel title="Cover this week"><div className="dm-row"><div style={{ width: 200 }}><Select value={ovPerson} onChange={setOvPerson} aria-label="Cover person" options={PEOPLE.map((p) => ({ value: p.id, label: p.name }))} /></div><Btn variant="primary" onClick={() => { setOverrides([...overrides, { from: NOW.getTime(), to: NOW.getTime() + 7 * DAY, person: ovPerson }]); toast({ kind: "ok", title: "Override added", body: "Covers the next 7 days." }); }}>Add 7-day override</Btn>{overrides.length > 0 && <Btn variant="ghost" onClick={() => setOverrides([])}>Clear overrides</Btn>}</div></Panel></div>}
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Edit alert rule" footer={<><Btn onClick={() => setEdit(null)}>Cancel</Btn><Btn variant="primary" disabled={!edit?.name.trim()} onClick={() => { setRules(rules.map((r) => (r.id === edit!.id ? edit! : r))); setEdit(null); toast({ kind: "ok", title: "Rule saved" }); }}>Save</Btn></>}>
        {edit && <div className="adm-stack"><Field label="Name" required>{(id) => <TextInput id={id} value={edit.name} onChange={(v) => setEdit({ ...edit, name: v })} />}</Field><Field label="Threshold">{() => <NumberStepper value={edit.threshold} onChange={(v) => setEdit({ ...edit, threshold: v })} min={0} max={10000} step={5} unit={UNIT[edit.metric as Metric]} />}</Field><Field label="For (minutes)">{() => <NumberStepper value={edit.forMin} onChange={(v) => setEdit({ ...edit, forMin: v })} min={5} max={240} step={5} unit="min" />}</Field></div>}
      </Modal>
    </>
  );
}
