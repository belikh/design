import { useMemo, useState } from "react";
import { PageHeader, Panel, Btn, Badge, Alert } from "@belikh/jupiter-ui/kit.tsx";
import { Field, Select, Slider, Switch } from "@belikh/jupiter-ui/inputs.tsx";
import { StatTile } from "@belikh/jupiter-ui/Charts.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { backtest, suggestThreshold, type Op } from "../lib/alert.ts";
import { DIMS, HOURS, METRICS, hourLabel, points, type MetricId } from "../lib/metrics.ts";
import { useStored } from "../common.tsx";
import "../tools.css";

const W = 900, H = 220, PAD = 6;
export function AlertRules() {
  const { toast } = usePrefs(); const [metric, setMetric] = useState<MetricId>("latency_ms"); const [service, setService] = useState("media-archive"); const [region, setRegion] = useState("brisbane");
  const [op, setOp] = useState<Op>(">"); const [threshold, setThreshold] = useState(150); const [forPoints, setFor] = useState(3); const [cooldown, setCooldown] = useState(6); const [target, setTarget] = useState(3); const [sev, setSev] = useState("warning"); const [saved, setSaved] = useStored<{ name: string; metric: string; op: string; threshold: number; forPoints: number; cooldown: number; sev: string }[]>("pt-alert-rules", []);
  const values = useMemo(() => points().filter((p) => p.metric === metric && p.service === service && p.region === region).map((p) => p.v), [metric, service, region]);
  const lo = Math.floor(Math.min(...values)), hi = Math.ceil(Math.max(...values)); const bt = useMemo(() => backtest(values, { op, threshold, forPoints, cooldownPoints: cooldown }), [values, op, threshold, forPoints, cooldown]);
  const sug = useMemo(() => suggestThreshold(values, { op, forPoints, cooldownPoints: cooldown }, target), [values, op, forPoints, cooldown, target]);
  const x = (i: number) => PAD + (i * (W - 2 * PAD)) / (HOURS - 1), y = (v: number) => H - PAD - ((v - lo) / (hi - lo || 1)) * (H - 2 * PAD);
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(""); const unit = METRICS.find((m) => m.id === metric)!.unit;
  const pendingRuns: [number, number][] = []; bt.states.forEach((s, i) => { if (s === "pending" && (i === 0 || bt.states[i - 1] !== "pending")) { let j = i; while (bt.states[j + 1] === "pending") j++; pendingRuns.push([i, j]); } });
  return (
    <>
      <PageHeader title="Alert rules" crumbs={["Tools", "Alert rules"]} desc="Write a rule and replay it against a week of history before it ever pages anyone: see when it would have fired, how often it would have notified, and what threshold would have been quieter."
        status={<Badge s={bt.notifications > target ? "warn" : "ok"}>{bt.notifications} notification{bt.notifications === 1 ? "" : "s"} / week</Badge>} />
      <div className="pt-split" style={{ gridTemplateColumns: "320px minmax(0, 1fr)" }}>
        <Panel title="Rule"><div className="adm-stack">
          <Field label="Metric">{(id) => <Select id={id} value={metric} onChange={(v) => { setMetric(v as MetricId); const vs = points().filter((p) => p.metric === v && p.service === service && p.region === region).map((p) => p.v); setThreshold(Math.round(Math.min(...vs) + (Math.max(...vs) - Math.min(...vs)) * 0.7)); }} options={METRICS.map((m) => ({ value: m.id, label: m.label }))} />}</Field>
          <div className="adm-row" style={{ flexWrap: "nowrap" }}><Field label="Service">{(id) => <Select id={id} value={service} onChange={setService} options={DIMS.service} />}</Field><Field label="Region">{(id) => <Select id={id} value={region} onChange={setRegion} options={DIMS.region} />}</Field></div>
          <div className="adm-row" style={{ flexWrap: "nowrap" }}><Field label="Fire when">{(id) => <Select id={id} value={op} onChange={(v) => setOp(v as Op)} options={[">", ">=", "<", "<="]} />}</Field><Field label={`Threshold (${unit})`}>{() => <Slider label="Threshold" value={threshold} onChange={setThreshold} min={lo} max={hi} step={Math.max(0.1, (hi - lo) / 200)} fmt={(v) => String(Math.round(v * 10) / 10)} />}</Field></div>
          <Field label="For (consecutive hours)">{() => <Slider label="For" value={forPoints} onChange={setFor} min={1} max={12} fmt={(v) => `${v} h`} />}</Field>
          <Field label="Cooldown between notifications">{() => <Slider label="Cooldown" value={cooldown} onChange={setCooldown} min={0} max={24} fmt={(v) => `${v} h`} />}</Field>
          <Field label="Severity">{(id) => <Select id={id} value={sev} onChange={setSev} options={["info", "warning", "critical"]} />}</Field>
          <Btn variant="primary" onClick={() => { setSaved([...saved, { name: `${metric} ${op} ${threshold} for ${forPoints}h`, metric, op, threshold, forPoints, cooldown, sev }]); toast({ kind: "ok", title: "Rule saved" }); }}>Save rule</Btn>
        </div></Panel>
        <div className="adm-stack">
          <div className="adm-grid adm-grid--4"><StatTile label="Would have fired" value={String(bt.firings.length)} sub="episodes" /><StatTile label="Notifications" value={String(bt.notifications)} sub="after cooldown" /><StatTile label="Suppressed" value={String(bt.suppressed)} sub="within cooldown" /><StatTile label="Time firing" value={`${Math.round((bt.firingPoints / HOURS) * 1000) / 10}%`} sub="of the week" /></div>
          <Panel title="Replay over the last 7 days">
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", background: "var(--jp-surface)", borderRadius: 6, direction: "ltr" }} role="img" aria-label={`Back-test: ${bt.firings.length} episodes, ${bt.notifications} notifications`}>
              {pendingRuns.map(([a, b]) => <rect key={`p${a}`} x={x(a) - 2} y={PAD} width={Math.max(3, x(b) - x(a) + 4)} height={H - 2 * PAD} fill="var(--jp-warn)" opacity="0.15" />)}
              {bt.firings.map((f) => <rect key={f.start} x={x(f.start) - 2} y={PAD} width={Math.max(4, x(f.end) - x(f.start) + 4)} height={H - 2 * PAD} fill="var(--jp-danger)" opacity="0.22" />)}
              <path d={line} fill="none" stroke="var(--adm-c1)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
              {threshold >= lo && threshold <= hi && <line x1={PAD} x2={W - PAD} y1={y(threshold)} y2={y(threshold)} stroke="var(--jp-danger)" strokeDasharray="6 4" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />}
              {bt.firings.filter((f) => f.notified).map((f) => <g key={`n${f.start}`}><circle cx={x(f.end)} cy={y(values[f.end])} r="5" fill="var(--jp-danger)" /><circle cx={x(f.end)} cy={y(values[f.end])} r="9" fill="none" stroke="var(--jp-danger)" /></g>)}
            </svg>
            <div className="adm-row jp-muted" style={{ justifyContent: "space-between", fontSize: "var(--jp-fs-xs)", marginTop: 4 }}><span>{hourLabel(0)}</span><span>range {lo}–{hi} {unit}</span><span>{hourLabel(HOURS - 1)}</span></div>
            <div className="adm-row jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}><span><span style={{ color: "var(--jp-warn)" }}>■</span> pending</span><span><span style={{ color: "var(--jp-danger)" }}>■</span> firing</span><span>● notification sent</span></div>
          </Panel>
          <div className="adm-grid adm-grid--2">
            <Panel title="Tune the noise"><div className="adm-stack"><Field label="Maximum acceptable alerts per week">{() => <Slider label="Max alerts" value={target} onChange={setTarget} min={0} max={10} fmt={(v) => String(v)} />}</Field>{sug === null ? <Alert s="warn" title="No threshold gets you there">Try a longer “for” duration.</Alert> : bt.firings.length <= target ? <Alert s="ok" title="Already within budget">The current threshold would fire {bt.firings.length} time{bt.firings.length === 1 ? "" : "s"}.</Alert> : <Alert s="info" title={`A threshold of ${sug} ${unit} would fire at most ${target}×`}><Btn sm onClick={() => setThreshold(sug)}>Use {sug}</Btn></Alert>}<Switch checked={forPoints >= 3} onChange={(v) => setFor(v ? 3 : 1)} label="Require 3+ hours (filters blips)" /></div></Panel>
            <Panel title="Episodes" flush>{bt.firings.length ? <table className="jp-table"><thead><tr><th>Started</th><th className="jp-num">Hours</th><th className="jp-num">Peak</th><th>Notified</th></tr></thead><tbody>{bt.firings.map((f) => <tr key={f.start}><td className="adm-num">{hourLabel(f.start)}</td><td className="jp-num">{f.end - f.start + 1}</td><td className="jp-num">{f.peak}</td><td>{f.notified ? <Badge s="danger">yes</Badge> : <Badge>suppressed</Badge>}</td></tr>)}</tbody></table> : <p className="jp-muted" style={{ padding: 12 }}>Quiet: the rule would never have fired this week.</p>}</Panel>
          </div>
          {saved.length > 0 && <Panel title="Saved rules" flush><ul className="adm-list">{saved.map((r, i) => <li key={i}><b>{r.name}</b><Badge s={r.sev === "critical" ? "danger" : r.sev === "warning" ? "warn" : "info"}>{r.sev}</Badge><span className="adm-spacer" /><button className="adm-x" aria-label={`Delete rule ${r.name}`} onClick={() => setSaved(saved.filter((_, j) => j !== i))}>×</button></li>)}</ul></Panel>}
        </div>
      </div>
    </>
  );
}
