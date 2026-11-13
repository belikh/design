import { useMemo, useState } from "react";
import { createCollection, useCollection } from "@belikh/jupiter-ui/mock.ts";
import { ConflictPrompt, SyncStatus } from "@belikh/jupiter-ui/sync.tsx";
import { DataTable, type Col } from "@belikh/jupiter-ui/DataTable.tsx";
import { Alert, Badge, Btn, Modal, PageHeader, Panel } from "@belikh/jupiter-ui/kit.tsx";
import { Field, NumberStepper, TextInput } from "@belikh/jupiter-ui/inputs.tsx";
import { ProgressBar, StatTile } from "@belikh/jupiter-ui/Charts.tsx";
import { useFieldErrors } from "@belikh/jupiter-ui/forms.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { daysUntil, licenceCheck, sampleKey } from "./lib.ts";
import "./forms.css";

type Ent = { id: string; rev: number; feature: string; source: "Plan" | "Add-on"; limit: number; used: number; unit: string; enabled: boolean };
const seed = (): Ent[] => [
  { id: "E1", rev: 1, feature: "Users", source: "Plan", limit: 50, used: 46, unit: "seats", enabled: true },
  { id: "E2", rev: 1, feature: "Dashboards", source: "Plan", limit: 200, used: 87, unit: "dashboards", enabled: true },
  { id: "E3", rev: 1, feature: "API calls", source: "Plan", limit: 1000000, used: 412000, unit: "per month", enabled: true },
  { id: "E4", rev: 1, feature: "Audit log retention", source: "Plan", limit: 365, used: 365, unit: "days", enabled: true },
  { id: "E5", rev: 1, feature: "Single sign-on (SAML)", source: "Add-on", limit: 1, used: 1, unit: "connection", enabled: true },
  { id: "E6", rev: 1, feature: "Advanced reporting", source: "Add-on", limit: 10, used: 0, unit: "scheduled reports", enabled: false },
  { id: "E7", rev: 1, feature: "White-label embeds", source: "Add-on", limit: 5, used: 5, unit: "domains", enabled: true },
];
const col = new Intl.NumberFormat("en-AU");
const state = { plan: "Business", holder: "Harbour Analytics Pty Ltd", expires: "2027-01-08", key: sampleKey() };

export function Licence() {
  const ents = useMemo(() => createCollection<Ent>(seed, { latency: 40, jitter: 20 }), []);
  const { rows, save, online, pending, stale, updatedAt, refresh, conflict, resolveConflict } = useCollection(ents);
  const { toast } = usePrefs(); const [lic, setLic] = useState(state); const [open, setOpen] = useState(false); const [seats, setSeats] = useState(10); const [seatReq, setSeatReq] = useState<number | null>(null);
  const days = daysUntil(lic.expires); const users = rows.find((r) => r.id === "E1");
  const over = rows.filter((r) => r.enabled && r.used >= r.limit * 0.9);
  const cols: Col<Ent>[] = [
    { key: "feature", header: "Entitlement", width: 220 },
    { key: "source", header: "Source", width: 100, render: (r) => <Badge s={r.source === "Plan" ? "info" : undefined}>{r.source}</Badge> },
    { key: "enabled", header: "Enabled", width: 110, editor: { type: "boolean" }, value: (r) => (r.enabled ? "Yes" : "No"), locked: (r) => (r.source === "Plan" ? "Included in your plan; it can’t be switched off" : undefined) },
    { key: "limit", header: "Limit", width: 120, align: "right", editor: { type: "number", min: 0 }, value: (r) => r.limit, fmt: (v) => col.format(v), locked: (r) => (r.source === "Plan" ? "Plan limits change when you change plan" : undefined) },
    { key: "used", header: "Used", width: 120, align: "right", value: (r) => r.used, fmt: (v) => col.format(v) },
    { key: "pct", header: "Usage", width: 170, value: (r) => Math.round((r.used / r.limit) * 100), render: (r) => { const p = Math.round((r.used / r.limit) * 100); return <ProgressBar value={Math.min(100, p)} s={p >= 100 ? "danger" : p >= 90 ? "warn" : undefined} label={`${r.feature} ${p}% used`} />; } },
    { key: "unit", header: "Unit", width: 130 },
  ];
  return (
    <>
      <PageHeader title="Licence and entitlements" crumbs={["Settings", "Licence"]} desc="What your organisation is licensed for, how much of it is in use, and when it renews."
        status={<Badge s={days < 0 ? "danger" : days < 60 ? "warn" : "ok"}>{days < 0 ? "Expired" : `${days} days left`}</Badge>} actions={<Btn variant="primary" onClick={() => setOpen(true)}>Activate a licence key</Btn>} />
      <div className="adm-stack">
        {days < 60 && <Alert s={days < 0 ? "danger" : "warn"} title={days < 0 ? "Your licence has expired" : "Your licence renews soon"}>Features stay available for a 14-day grace period after the end date. Contact your account manager to renew.</Alert>}
        {over.length > 0 && <Alert s="warn" title={`${over.length} entitlement${over.length > 1 ? "s are" : " is"} near or at its limit`}>{over.map((o) => o.feature).join(", ")}</Alert>}
        <div className="adm-grid adm-grid--4">
          <StatTile label="Plan" value={lic.plan} sub={lic.holder} />
          <StatTile label="Renews" value={lic.expires} sub={`${days} days`} />
          <StatTile label="Seats" value={`${users?.used ?? 0} / ${users?.limit ?? 0}`} sub={seatReq ? `${seatReq} more requested` : "in use"} />
          <StatTile label="Licence key" value={`••••-${lic.key.slice(-4)}`} sub="ends with" />
        </div>
        <Panel title="Entitlements" actions={<SyncStatus online={online} pending={pending} stale={stale} updatedAt={updatedAt} onRefresh={refresh} />}>
          <DataTable rows={rows} cols={cols} onCommit={save} exportName="entitlements" pageSize={10} ariaLabel="Entitlements" />
        </Panel>
        <Panel title="Need more seats?"><div className="adm-row"><NumberStepper value={seats} onChange={setSeats} min={1} max={500} unit="seats" /><Btn onClick={() => { setSeatReq(seats); toast({ kind: "ok", title: `Requested ${seats} extra seats`, body: "Your account manager will confirm the quote.", undo: () => setSeatReq(null) }); }}>Request seats</Btn></div></Panel>
      </div>
      <ConflictPrompt conflict={conflict} field="Entitlement" onResolve={(k) => void resolveConflict(k)} />
      {open && <Activate onClose={() => setOpen(false)} onDone={(k) => { setLic({ ...lic, key: k, expires: "2028-01-08" }); setOpen(false); toast({ kind: "ok", title: "Licence activated", body: "Renews 2028-01-08." }); }} />}
    </>
  );
}
function Activate({ onClose, onDone }: { onClose: () => void; onDone: (k: string) => void }) {
  const [v, setV] = useState({ key: "" }); const f = useFieldErrors(v, { key: (k) => (k.trim() ? licenceCheck(k) : "Enter your licence key") });
  const submit = () => { if (f.submit() === true) onDone(v.key.trim().toUpperCase()); };
  return (
    <Modal open onClose={onClose} title="Activate a licence key" footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={submit}>Activate</Btn></>}>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Field label="Licence key" required error={f.error("key")} hint="Sixteen characters in four groups. Try the sample below.">{(id, d) => <TextInput id={id} aria-describedby={d} value={v.key} onChange={(key) => setV({ key })} onBlur={() => f.blur("key")} placeholder="XXXX-XXXX-XXXX-XXXX" autoComplete="off" />}</Field>
        <p><Btn sm variant="ghost" type="button" onClick={() => setV({ key: sampleKey() })}>Fill in sample key</Btn></p>
      </form>
    </Modal>
  );
}
