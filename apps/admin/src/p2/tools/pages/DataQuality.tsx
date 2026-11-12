import { useMemo, useState } from "react";
import { PageHeader, Panel, Btn, Badge, Drawer, Tabs, Modal } from "@belikh/jupiter-ui/kit.tsx";
import { Gauge, ProgressBar } from "@belikh/jupiter-ui/Charts.tsx";
import { Field, Select, Switch, TextInput } from "@belikh/jupiter-ui/inputs.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { customers } from "../lib/data.ts";
import { DEFAULT_RULES, dqScore, profile, runRule, type DqRule } from "../lib/dq.ts";
import "../tools.css";

const KINDS: DqRule["kind"][] = ["not_null", "unique", "range", "regex", "enum", "not_future"];
export function DataQuality() {
  const { toast } = usePrefs(); const [rules, setRules] = useState<DqRule[]>(DEFAULT_RULES); const [off, setOff] = useState<Set<string>>(new Set()); const [open, setOpen] = useState<string | null>(null); const [tab, setTab] = useState("rules"); const [adding, setAdding] = useState(false);
  const [nr, setNr] = useState<DqRule>({ id: "", col: "name", kind: "not_null", severity: "warn", label: "" });
  const active = rules.filter((r) => !off.has(r.id)); const results = useMemo(() => active.map((r) => runRule(customers, r)), [active]); const score = dqScore(results); const prof = useMemo(() => profile(customers), []);
  const failing = results.reduce((a, r) => a + (r.failed > 0 ? 1 : 0), 0); const detail = results.find((r) => r.rule.id === open);
  const failingRows = detail ? customers.filter((c) => detail.failingIds.includes(String(c.id)) || detail.rule.kind === "unique" ? true : false) : [];
  const rowsFor = (id: string) => { const rule = rules.find((r) => r.id === id)!; const all = runRule(customers, rule); const res = [] as typeof customers; for (const c of customers) { const one = runRule([c], rule); if (one.failed > 0 && rule.kind !== "unique") res.push(c); } return rule.kind === "unique" ? customers.filter((c) => all.failingIds.includes(String(c.id))) : res; };
  void failingRows;
  const download = () => { const blob = new Blob([JSON.stringify({ generated: "2026-11-12", dataset: "customers", rows: customers.length, score, results: results.map((r) => ({ rule: r.rule.label, severity: r.rule.severity, failed: r.failed, total: r.total, examples: r.failingIds })) }, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "data-quality-report.json"; a.click(); URL.revokeObjectURL(a.href); };
  const addRule = () => { const id = `custom-${rules.length + 1}`; setRules([...rules, { ...nr, id, label: nr.label || `${nr.col} ${nr.kind.replace("_", " ")}` }]); setAdding(false); toast({ kind: "ok", title: "Rule added" }); };
  return (
    <>
      <PageHeader title="Data quality report" crumbs={["Tools", "Data quality"]} desc="Rules run against the customers table: completeness, uniqueness, validity and freshness. Toggle rules, drill into the failing rows, and export the report."
        status={<Badge s={score >= 98 ? "ok" : score >= 90 ? "warn" : "danger"}>{score}%</Badge>} actions={<><Btn icon="plus" onClick={() => setAdding(true)}>Add rule</Btn><Btn icon="download" onClick={download}>Export report</Btn></>} />
      <div className="adm-grid adm-grid--21">
        <Panel title="Rules" flush><div style={{ padding: "0 12px" }}><Tabs value={tab} onChange={setTab} tabs={[{ id: "rules", label: "Rules", count: rules.length }, { id: "profile", label: "Column profile", count: prof.length }]} /></div>
          {tab === "rules" ? <div className="adm-dt__wrap"><table className="jp-table"><thead><tr><th>On</th><th>Rule</th><th>Severity</th><th style={{ minWidth: 200 }}>Pass rate</th><th className="jp-num">Failing</th><th /></tr></thead><tbody>{rules.map((r) => { const res = results.find((x) => x.rule.id === r.id); const pct = res ? ((res.total - res.failed) / res.total) * 100 : 0;
            return (<tr key={r.id} style={{ opacity: off.has(r.id) ? 0.5 : 1 }}><td><Switch checked={!off.has(r.id)} onChange={(v) => setOff((s) => { const n = new Set(s); v ? n.delete(r.id) : n.add(r.id); return n; })} label="" /></td><td><b>{r.label}</b><div className="jp-muted adm-num" style={{ fontSize: "var(--jp-fs-xs)" }}>{r.col} · {r.kind}</div></td><td><Badge s={r.severity === "error" ? "danger" : "warn"}>{r.severity}</Badge></td>
              <td>{res ? <div className="pt-bar" style={{ gridTemplateColumns: "minmax(0, 1fr) 56px" }}><ProgressBar value={pct} s={res.failed === 0 ? "ok" : r.severity === "error" ? "danger" : "warn"} label={`${r.label} pass rate`} /><span className="adm-num">{pct.toFixed(1)}%</span></div> : <span className="jp-muted">off</span>}</td><td className="jp-num">{res ? res.failed : "—"}</td><td>{res && res.failed > 0 && <Btn sm variant="ghost" onClick={() => setOpen(r.id)}>View rows</Btn>}</td></tr>); })}</tbody></table></div>
            : <div className="adm-dt__wrap"><table className="jp-table"><thead><tr><th>Column</th><th>Type</th><th>Nulls</th><th>Distinct</th><th>Min</th><th>Max</th><th>Most common</th></tr></thead><tbody>{prof.map((p) => <tr key={p.col}><td><b className="adm-num">{p.col}</b></td><td>{p.type}</td><td className="adm-num">{p.nulls}{p.nulls > 0 && <span className="jp-muted"> ({((p.nulls / customers.length) * 100).toFixed(0)}%)</span>}</td><td className="adm-num">{p.distinct}</td><td className="adm-num">{String(p.min ?? "—").slice(0, 18)}</td><td className="adm-num">{String(p.max ?? "—").slice(0, 18)}</td><td className="adm-num">{p.top.map(([v, n]) => `${String(v).slice(0, 12)} (${n})`).join(", ")}</td></tr>)}</tbody></table></div>}
        </Panel>
        <Panel title="Score"><div className="adm-stack" style={{ alignItems: "center" }}><Gauge value={score} label="Quality score" zones={[0.9, 0.97]} size={200} /><p className="jp-muted" style={{ textAlign: "center" }}>{failing} of {active.length} active rules have failing rows across {customers.length} records. Errors count double.</p></div></Panel>
      </div>
      <Drawer open={!!detail} onClose={() => setOpen(null)} title={detail ? `Failing rows: ${detail.rule.label}` : ""}>
        {detail && <div className="adm-stack"><p className="jp-muted">{detail.failed} of {detail.total} rows fail. Showing up to 12.</p><table className="jp-table"><thead><tr><th>id</th><th>{detail.rule.col}</th><th>name</th></tr></thead><tbody>{rowsFor(detail.rule.id).slice(0, 12).map((c) => <tr key={String(c.id) + String(c[detail.rule.col])}><td className="adm-num">{String(c.id)}</td><td className="adm-num">{c[detail.rule.col] === null ? <Badge s="danger">null</Badge> : String(c[detail.rule.col])}</td><td>{String(c.name)}</td></tr>)}</tbody></table></div>}
      </Drawer>
      <Modal open={adding} onClose={() => setAdding(false)} title="Add a rule" footer={<><Btn onClick={() => setAdding(false)}>Cancel</Btn><Btn variant="primary" onClick={addRule}>Add rule</Btn></>}>
        <div className="adm-stack"><Field label="Column">{(id) => <Select id={id} value={nr.col} onChange={(v) => setNr({ ...nr, col: v })} options={prof.map((p) => p.col)} />}</Field><Field label="Check">{(id) => <Select id={id} value={nr.kind} onChange={(v) => setNr({ ...nr, kind: v as DqRule["kind"] })} options={KINDS} />}</Field>
          {nr.kind === "regex" && <Field label="Pattern">{(id) => <TextInput id={id} value={nr.pattern ?? ""} onChange={(v) => setNr({ ...nr, pattern: v })} />}</Field>}{nr.kind === "range" && <div className="adm-row" style={{ flexWrap: "nowrap" }}><Field label="Min">{(id) => <TextInput id={id} value={String(nr.min ?? "")} onChange={(v) => setNr({ ...nr, min: v === "" ? undefined : Number(v) })} />}</Field><Field label="Max">{(id) => <TextInput id={id} value={String(nr.max ?? "")} onChange={(v) => setNr({ ...nr, max: v === "" ? undefined : Number(v) })} />}</Field></div>}{nr.kind === "enum" && <Field label="Allowed values (comma separated)">{(id) => <TextInput id={id} value={(nr.values ?? []).join(",")} onChange={(v) => setNr({ ...nr, values: v.split(",").map((x) => x.trim()).filter(Boolean) })} />}</Field>}
          <Field label="Severity">{(id) => <Select id={id} value={nr.severity} onChange={(v) => setNr({ ...nr, severity: v as DqRule["severity"] })} options={["error", "warn"]} />}</Field></div>
      </Modal>
    </>
  );
}
