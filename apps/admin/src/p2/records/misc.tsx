import { useMemo, useState } from "react";
import "./records.css";
import { PageHeader, Panel, Btn, Badge, Drawer, Avatar, Alert, EmptyState, Dot } from "@belikh/jupiter-ui/kit.tsx";
import { Checkbox, Field, Select, TextInput } from "@belikh/jupiter-ui/inputs.tsx";
import { LineChart, ProgressBar, Ring, Spark } from "@belikh/jupiter-ui/Charts.tsx";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { people, series, days } from "../../data/fixtures.ts";
import { SplitPane } from "./SplitPane.tsx";
import { MODES, applyBulk, blockedBy, changedCount, mixed, nextStep, opError, progress, type Item, type Op, type OnbState, type Step } from "./bulk.ts";

/* ---------- A056 split view ---------- */
const DEV = ["gateway-brisbane", "ap-office", "ap-garage", "switch-rack", "nvr-cameras", "ups-main", "nas-tank", "esp-living", "esp-kitchen"].map((n, i) => ({ id: n, status: (i === 3 ? "warn" : i === 6 ? "danger" : "ok") as "ok" | "warn" | "danger", load: series(24, 40 + i * 4, 14, i + 1), notes: `${n} sits on VLAN ${10 + i}. Last firmware check passed.` }));
export function SplitView() {
  const [sel, setSel] = useState(DEV[0].id); const d = DEV.find((x) => x.id === sel)!;
  return (
    <>
      <PageHeader title="Split view" crumbs={["Records", "Split view"]} desc="Resizable panes: drag the divider, or focus it and use ← → (Shift for bigger steps), Home/End, and double-click to reset. Sizes are remembered." />
      <SplitPane storageKey="rec-split-main" initial={300} min={200} max={560} label="Resize list and detail" first={
        <ul className="adm-list adm-list--tight" role="listbox" aria-label="Devices">{DEV.map((x) => <li key={x.id} role="option" aria-selected={sel === x.id} tabIndex={0} className={sel === x.id ? "is-sel" : ""} onClick={() => setSel(x.id)} onKeyDown={(e) => e.key === "Enter" && setSel(x.id)} style={{ cursor: "pointer" }}><Dot s={x.status} /><b className="adm-num">{x.id}</b></li>)}</ul>}
        second={<SplitPane orientation="vertical" storageKey="rec-split-detail" initial={230} min={120} max={420} label="Resize detail and notes" first={<div style={{ padding: 16 }}><h3 className="adm-num">{d.id}</h3><LineChart height={140} labels={days(24).map((_, i) => `${i}h`)} series={[{ name: "Load %", data: d.load }]} tools={false} zoomable={false} /></div>} second={<div style={{ padding: 16 }}><div className="jp-label">Notes</div><p>{d.notes}</p></div>} />} />
    </>
  );
}

/* ---------- A061 bulk edit ---------- */
const SEED: Item[] = Array.from({ length: 24 }, (_, i) => ({ id: `P-${100 + i}`, name: ["Router", "Switch", "Camera", "Sensor", "Panel", "Probe"][i % 6] + ` ${i + 1}`, status: (["active", "paused", "archived"] as const)[i % 3 === 2 ? 2 : i % 2], owner: people[i % 4], tags: i % 3 === 0 ? ["core"] : i % 5 === 0 ? ["lab", "core"] : [], price: 20 + i * 7.5 }));
export function BulkEdit() {
  const { toast } = usePrefs(); const [rows, setRows] = useState(SEED); const [sel, setSel] = useState<Set<string>>(new Set()); const [open, setOpen] = useState(false);
  const [ops, setOps] = useState<Op[]>([]); const [draft, setDraft] = useState<Op>({ field: "status", mode: "set", value: "active" });
  const m = useMemo(() => mixed(rows, sel), [rows, sel]); const preview = useMemo(() => applyBulk(rows, sel, ops), [rows, sel, ops]); const n = changedCount(rows, preview);
  const err = opError(draft);
  const commit = () => { const old = rows; setRows(preview); setOpen(false); setOps([]); toast({ kind: "ok", title: `Updated ${n} of ${sel.size} selected`, undo: () => setRows(old) }); };
  const toggleAll = (v: boolean) => setSel(v ? new Set(rows.map((r) => r.id)) : new Set());
  return (
    <>
      <PageHeader title="Bulk edit" crumbs={["Records", "Bulk edit"]} desc="Select rows, queue several changes, review exactly what will change, then apply with undo." actions={<Btn variant="primary" icon="edit" disabled={!sel.size} onClick={() => setOpen(true)}>Bulk edit {sel.size ? `(${sel.size})` : ""}</Btn>} />
      <Panel flush>
        <div className="adm-dt__wrap"><table className="jp-table adm-table"><thead><tr><th style={{ width: 36 }}><Checkbox checked={sel.size === rows.length} indeterminate={sel.size > 0 && sel.size < rows.length} onChange={toggleAll} label={<span className="adm-sr">Select all</span>} /></th><th>ID</th><th>Name</th><th>Status</th><th>Owner</th><th>Tags</th><th className="jp-num">Price</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id} className={sel.has(r.id) ? "is-sel" : ""}><td><Checkbox checked={sel.has(r.id)} onChange={(v) => setSel((s) => { const x = new Set(s); v ? x.add(r.id) : x.delete(r.id); return x; })} label={<span className="adm-sr">Select {r.id}</span>} /></td><td className="adm-num">{r.id}</td><td>{r.name}</td><td><Badge s={r.status === "active" ? "ok" : r.status === "paused" ? "warn" : undefined}>{r.status}</Badge></td><td>{r.owner || <span className="jp-muted">none</span>}</td><td>{r.tags.map((t) => <Badge key={t}>{t}</Badge>)}</td><td className="jp-num">${r.price.toFixed(2)}</td></tr>)}</tbody></table></div>
      </Panel>
      <Drawer open={open} onClose={() => setOpen(false)} title={`Bulk edit ${sel.size} items`} footer={<><Btn onClick={() => { setOps([]); setOpen(false); }}>Cancel</Btn><Btn variant="primary" disabled={!ops.length || n === 0} onClick={commit}>Apply to {n} item{n === 1 ? "" : "s"}</Btn></>}>
        <div className="adm-stack">
          <div className="adm-grid adm-grid--2">
            <Field label="Field">{(id) => <Select id={id} value={draft.field} onChange={(f) => { const field = f as Op["field"]; setDraft({ field, mode: MODES[field][0].mode, value: field === "status" ? "active" : "" }); }} options={[{ value: "status", label: `Status${m.status ? " (mixed)" : ""}` }, { value: "owner", label: `Owner${m.owner ? " (mixed)" : ""}` }, { value: "tags", label: `Tags${m.tags ? " (mixed)" : ""}` }, { value: "price", label: `Price${m.price ? " (mixed)" : ""}` }]} />}</Field>
            <Field label="Action">{(id) => <Select id={id} value={draft.mode} onChange={(mode) => setDraft({ ...draft, mode: mode as Op["mode"] })} options={MODES[draft.field].map((x) => ({ value: x.mode, label: x.label }))} />}</Field>
          </div>
          {draft.mode !== "clear" && <Field label="Value" error={draft.value ? err ?? undefined : undefined}>{(id) => draft.field === "status" ? <Select id={id} value={draft.value} onChange={(v) => setDraft({ ...draft, value: v })} options={["active", "paused", "archived"]} /> : <TextInput id={id} value={draft.value} onChange={(v) => setDraft({ ...draft, value: v })} state={draft.value && err ? "error" : undefined} />}</Field>}
          <Btn disabled={!!err} onClick={() => { setOps([...ops.filter((o) => !(o.field === draft.field && o.mode === draft.mode)), draft]); }}>Queue change</Btn>
          <div><div className="jp-label">Queued changes</div>{ops.length ? <ul className="adm-list">{ops.map((o, i) => <li key={i}><span style={{ flex: 1 }}><b>{o.field}</b> · {MODES[o.field].find((x) => x.mode === o.mode)?.label} {o.value && <code>{o.value}</code>}</span><button className="adm-x" aria-label={`Remove ${o.field} change`} onClick={() => setOps(ops.filter((_, j) => j !== i))}>×</button></li>)}</ul> : <p className="jp-muted">Nothing queued yet.</p>}</div>
          {ops.length > 0 && <Alert s={n ? "info" : "warn"} title={n ? `${n} of ${sel.size} items will change` : "No item would change"}>{n ? "Items that already match are left alone." : "Every selected item already has these values."}</Alert>}
        </div>
      </Drawer>
    </>
  );
}

/* ---------- A065 onboarding ---------- */
const STEPS: Step[] = [
  { id: "project", title: "Create your first project", why: "Everything else lives inside a project.", action: "Create project" }, { id: "domain", title: "Connect a domain", why: "Serve your app on your own address.", action: "Verify domain", needs: ["project"] },
  { id: "team", title: "Invite your team", why: "Collaborate and share access.", action: "Send invites", needs: ["project"] }, { id: "alerts", title: "Set up alerts", why: "Get told before your users are.", action: "Create alert", needs: ["project"] },
  { id: "backup", title: "Turn on backups", why: "Recover from mistakes in minutes.", action: "Enable backups", needs: ["project"] }, { id: "sso", title: "Enable single sign-on", why: "Optional: centralise sign-in.", action: "Configure SSO", needs: ["team"], optional: true },
];
export function Onboarding() {
  const { toast } = usePrefs();
  const [st, setSt] = useState<OnbState>(() => { try { return JSON.parse(localStorage.getItem("rec-onboarding") || "") as OnbState; } catch { return Object.fromEntries(STEPS.map((s) => [s.id, "todo"])); } });
  const [open, setOpen] = useState<string | null>(null); const set = (id: string, v: OnbState[string]) => setSt((x) => { const n = { ...x, [id]: v }; try { localStorage.setItem("rec-onboarding", JSON.stringify(n)); } catch { /* ignore */ } return n; });
  const p = progress(STEPS, st); const next = nextStep(STEPS, st);
  const reset = () => { const n = Object.fromEntries(STEPS.map((s) => [s.id, "todo"])) as OnbState; setSt(n); try { localStorage.setItem("rec-onboarding", JSON.stringify(n)); } catch { /* ignore */ } };
  return (
    <>
      <PageHeader title="Get started" crumbs={["Records", "Onboarding"]} desc="A setup checklist with dependencies, skipping and remembered progress." actions={<Btn onClick={reset}>Reset checklist</Btn>} />
      <div className="adm-grid adm-grid--21">
        <div className="adm-stack">
          {p.complete && <Alert s="ok" title="You’re all set">Every required step is done.</Alert>}
          <ol className="rec-check" aria-label="Setup steps">{STEPS.map((s, i) => {
            const state = st[s.id]; const blocked = blockedBy(s, st, STEPS); const isOpen = open === s.id;
            return (
              <li key={s.id} className={`${state === "done" ? "is-done" : ""} ${state === "skipped" ? "is-skipped" : ""} ${next?.id === s.id ? "is-next" : ""}`}>
                <button className="rec-check__head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : s.id)}>
                  <span className="rec-tick" aria-hidden>{state === "done" && <Icon name="check" size={13} />}</span>
                  <span style={{ flex: 1 }}><b>{i + 1}. {s.title}</b> {s.optional && <Badge>optional</Badge>} {state === "skipped" && <Badge>skipped</Badge>}{blocked.length > 0 && state !== "done" && <span className="jp-muted"> · needs {blocked.join(", ")}</span>}</span>
                  <Icon name={isOpen ? "chevron-up" : "chevron-down"} size={16} />
                </button>
                {isOpen && <div className="rec-check__body"><p className="jp-muted">{s.why}</p><div className="adm-row">
                  {state !== "done" ? <Btn variant="primary" sm disabled={blocked.length > 0} onClick={() => { set(s.id, "done"); toast({ kind: "ok", title: `${s.title}: done` }); }}>{s.action}</Btn> : <Btn sm onClick={() => set(s.id, "todo")}>Mark as not done</Btn>}
                  {state === "todo" && <Btn sm variant="ghost" onClick={() => set(s.id, "skipped")}>Skip</Btn>}{state === "skipped" && <Btn sm variant="ghost" onClick={() => set(s.id, "todo")}>Undo skip</Btn>}</div></div>}
              </li>);
          })}</ol>
        </div>
        <Panel title="Progress"><div className="adm-stack" style={{ alignItems: "center", textAlign: "center" }}><Ring value={p.pct} size={110} label={`${p.pct}% complete`} /><div><b>{p.done} of {p.total}</b> steps done</div><ProgressBar value={p.done} max={p.total} label="Setup progress" />{next ? <Btn variant="primary" onClick={() => setOpen(next.id)}>Continue: {next.title}</Btn> : <EmptyState spot="done" title="Nothing left">All steps are done or skipped.</EmptyState>}</div></Panel>
      </div>
      <p className="jp-muted" style={{ marginTop: 12 }}><Spark data={series(8, 5, 2, 1)} w={60} h={16} /> <Avatar name="Ava Nguyen" size={18} /> Progress is saved in this browser.</p>
    </>
  );
}
