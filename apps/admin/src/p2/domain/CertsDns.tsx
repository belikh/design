import { useMemo, useState } from "react";
import "./domain.css";
import { PageHeader, Panel, Badge, Btn, Tabs, Modal, Alert } from "@belikh/jupiter-ui/kit.tsx";
import { StatTile } from "@belikh/jupiter-ui/Charts.tsx";
import { DiffViewer } from "@belikh/jupiter-ui/extra.tsx";
import { Field, TextInput, Select, NumberStepper, Switch } from "@belikh/jupiter-ui/inputs.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { fmtDate } from "./lib.ts";
import { CERTS, ZONE, certStatus, needsAction, validateRecord, toZone, type DnsRecord, type RType, type Cert } from "./certs-dns.data.ts";

const TYPES: RType[] = ["A", "AAAA", "CNAME", "TXT", "MX", "SRV"];
const blank = (): DnsRecord => ({ id: "", name: "", type: "A", value: "", ttl: 300 });
export function CertsDns() {
  const { toast } = usePrefs(); const [tab, setTab] = useState("certs"); const [certs, setCerts] = useState<Cert[]>(CERTS); const [zone, setZone] = useState<DnsRecord[]>(ZONE); const [saved, setSaved] = useState<DnsRecord[]>(ZONE); const [edit, setEdit] = useState<DnsRecord | null>(null);
  const errs = edit ? validateRecord(edit, zone) : []; const dirty = toZone(zone) !== toZone(saved);
  const sorted = useMemo(() => [...certs].sort((a, b) => certStatus(a).days - certStatus(b).days), [certs]); const act = certs.filter(needsAction);
  const save = () => { if (!edit || errs.length) return; setZone(edit.id ? zone.map((z) => (z.id === edit.id ? edit : z)) : [...zone, { ...edit, id: `z${Date.now()}` }]); setEdit(null); };
  const maxDays = 90;
  return (
    <>
      <PageHeader title="Certificates and DNS" crumbs={["Domain", "Certificates and DNS"]} desc="An expiry timeline that flags what needs attention, and a DNS record editor with zone-aware validation and a diff before you publish."
        status={act.length ? <Badge s="danger">{act.length} need action</Badge> : <Badge s="ok">all good</Badge>} tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: "certs", label: "Certificates", count: certs.length }, { id: "dns", label: "DNS records", count: zone.length }]} />} />
      {tab === "certs" && <><div className="adm-grid adm-grid--4"><StatTile label="Certificates" value={String(certs.length)} /><StatTile label="Expiring ≤ 30 d" value={String(certs.filter((c) => certStatus(c).days <= 30 && certStatus(c).days >= 0).length)} invert /><StatTile label="Expired" value={String(certs.filter((c) => certStatus(c).level === "expired").length)} invert /><StatTile label="Manual renewal" value={String(certs.filter((c) => !c.autoRenew).length)} /></div>
        {act.length > 0 && <div style={{ marginTop: 16 }}><Alert s="danger" title={`${act.length} certificate${act.length > 1 ? "s" : ""} need attention`}>{act.map((c) => c.domain).join(", ")}</Alert></div>}
        <Panel title="Expiry timeline (next 90 days)" className="adm-section"><div className="adm-stack">{sorted.map((c) => { const s = certStatus(c); const w = Math.max(2, Math.min(100, (Math.max(0, s.days) / maxDays) * 100)); return (
          <div key={c.id} className="dm-row" style={{ flexWrap: "nowrap" }}><div style={{ width: 170 }}><b className="dm-num">{c.domain}</b><div className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>{c.issuer}</div></div><div className="dm-bar" style={{ flex: 1 }} role="img" aria-label={`${c.domain}: ${s.days} days left`}><i className={`is-${s.level === "ok" ? "ok" : s.level === "warn" ? "warn" : "danger"}`} style={{ width: `${w}%` }} /></div><span className="dm-num" style={{ width: 120, textAlign: "end" }}>{s.days < 0 ? `expired ${-s.days} d ago` : `${s.days} d · ${fmtDate(c.notAfter)}`}</span>
            <Switch checked={c.autoRenew} onChange={(v) => setCerts(certs.map((x) => (x.id === c.id ? { ...x, autoRenew: v } : x)))} label={`Auto-renew ${c.domain}`} /><Btn sm disabled={s.level === "ok" && s.days > 45} onClick={() => { setCerts(certs.map((x) => (x.id === c.id ? { ...x, notAfter: "2027-02-10" } : x))); toast({ kind: "ok", title: `Renewed ${c.domain}`, body: "New expiry 10 Feb 2027" }); }}>Renew</Btn></div>); })}</div></Panel></>}
      {tab === "dns" && <><Panel title="jupiter.au" flush actions={<><Btn sm icon="plus" onClick={() => setEdit(blank())}>Add record</Btn><Btn sm variant="primary" disabled={!dirty} onClick={() => { setSaved(zone); toast({ kind: "ok", title: "Zone published", body: `${zone.length} records` }); }}>Publish</Btn></>}><div className="dm-table-wrap"><table className="jp-table"><thead><tr><th>Name</th><th>Type</th><th>Value</th><th className="jp-num">TTL</th><th /></tr></thead><tbody>{zone.map((r) => <tr key={r.id}><td className="dm-num">{r.name}</td><td><Badge>{r.type}</Badge></td><td className="dm-num">{r.type === "MX" && `${r.prio} `}{r.value}</td><td className="jp-num">{r.ttl}</td><td style={{ textAlign: "right" }}><Btn sm variant="ghost" onClick={() => setEdit(r)}>Edit</Btn><Btn sm variant="ghost" onClick={() => { const old = zone; setZone(zone.filter((z) => z.id !== r.id)); toast({ kind: "warn", title: `Deleted ${r.name} ${r.type}`, undo: () => setZone(old) }); }}>Delete</Btn></td></tr>)}</tbody></table></div></Panel>
        {dirty && <Panel className="adm-section" title="Pending changes (zone diff)"><DiffViewer mode="unified" before={toZone(saved)} after={toZone(zone)} labels={["published", "draft"]} /></Panel>}</>}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit record" : "Add record"} footer={<><Btn onClick={() => setEdit(null)}>Cancel</Btn><Btn variant="primary" disabled={errs.length > 0 || !edit?.value} onClick={save}>Save</Btn></>}>
        {edit && <div className="adm-stack"><div className="adm-grid adm-grid--2"><Field label="Name" required>{(id) => <TextInput id={id} value={edit.name} onChange={(v) => setEdit({ ...edit, name: v })} placeholder="@ or host" />}</Field><Field label="Type">{(id) => <Select id={id} value={edit.type} onChange={(v) => setEdit({ ...edit, type: v as RType })} options={TYPES} />}</Field></div>
          <Field label="Value" required>{(id) => <TextInput id={id} value={edit.value} onChange={(v) => setEdit({ ...edit, value: v })} />}</Field>
          <div className="adm-grid adm-grid--2"><Field label="TTL (seconds)">{() => <NumberStepper value={edit.ttl} onChange={(v) => setEdit({ ...edit, ttl: v })} min={0} max={100000} step={60} />}</Field>{edit.type === "MX" && <Field label="Priority">{() => <NumberStepper value={edit.prio ?? 10} onChange={(v) => setEdit({ ...edit, prio: v })} min={0} max={65535} />}</Field>}</div>
          {errs.length > 0 && <Alert s="danger" title="Fix before saving">{errs.join(" · ")}</Alert>}</div>}
      </Modal>
    </>
  );
}
