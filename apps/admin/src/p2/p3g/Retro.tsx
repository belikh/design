import { useState } from "react";
import { PageHeader, Panel, Tabs, Badge, Btn } from "@belikh/jupiter-ui/kit.tsx";
import { StatTile, Donut, C } from "@belikh/jupiter-ui/Charts.tsx";
import { Field, TextInput, Select, NumberStepper } from "@belikh/jupiter-ui/inputs.tsx";
import type { Col } from "@belikh/jupiter-ui/DataTable.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { useStore, Sheet, opts, TODAY, money } from "./lib.tsx";
import { MACHINES, FIRMWARE, MEDIA, LOG, fwState, imagedPct, totalCost, byMachine, type Machine, type Firmware, type Media } from "./retro.data.ts";

const ST = { Working: "ok", Restoring: "warn", Parts: "danger", Stored: "info" } as const;
export function Retro() {
  const [tab, setTab] = useState("machines"); const { toast } = usePrefs(); const [sel, setSel] = useState("Octane");
  const mc = useStore("retro-m", MACHINES), fw = useStore("retro-fw", FIRMWARE), md = useStore("retro-md", MEDIA), log = useStore("retro-log", LOG);
  const [draft, setDraft] = useState({ machine: "O2", action: "", notes: "", cost: 0 });
  const mCols: Col<Machine>[] = [
    { key: "name", header: "Name", width: 150, editor: { type: "text", maxLength: 40 }, validate: (v) => (String(v).trim() ? null : "A name is required") }, { key: "model", header: "Model", width: 190, editor: { type: "text" } }, { key: "year", header: "Year", width: 80, align: "right", editor: { type: "number", min: 1970, max: 2010 } },
    { key: "cpu", header: "CPU", width: 190 }, { key: "ramMb", header: "RAM (MB)", width: 100, align: "right", editor: { type: "number", min: 1, max: 65536 } }, { key: "os", header: "OS", width: 130, editor: { type: "text" } },
    { key: "status", header: "Status", width: 120, editor: { type: "select", options: [{ value: "Working", label: "Working", s: "ok" }, { value: "Restoring", label: "Restoring", s: "warn" }, { value: "Parts", label: "Parts", s: "danger" }, { value: "Stored", label: "Stored", s: "info" }] } },
    { key: "condition", header: "Condition", width: 110, editor: { type: "select", options: opts("Mint", "Good", "Fair", "Poor") } }, { key: "location", header: "Location", width: 110, editor: { type: "text" } }, { key: "serial", header: "Serial", width: 110 },
  ];
  const fCols: Col<Firmware>[] = [
    { key: "machine", header: "Machine", width: 130 }, { key: "item", header: "Item", width: 130 }, { key: "version", header: "Version", width: 130, editor: { type: "text" } }, { key: "latest", header: "Latest known", width: 130, editor: { type: "text" } },
    { key: "state", header: "State", width: 110, render: (r) => <Badge s={fwState(r) === "current" ? "ok" : "warn"}>{fwState(r)}</Badge>, value: (r) => fwState(r) }, { key: "file", header: "Image file", width: 210, editor: { type: "text" } }, { key: "verified", header: "Dump verified", width: 120, editor: { type: "boolean" }, value: (r) => (r.verified ? "Yes" : "No") },
  ];
  const dCols: Col<Media>[] = [
    { key: "title", header: "Title", width: 230, editor: { type: "text" } }, { key: "kind", header: "Kind", width: 110 }, { key: "format", header: "Format", width: 130, editor: { type: "text" } }, { key: "for", header: "For", width: 120 },
    { key: "condition", header: "Condition", width: 110, editor: { type: "select", options: opts("Good", "Fair", "Poor") } }, { key: "imaged", header: "Imaged", width: 100, editor: { type: "boolean" }, value: (r) => (r.imaged ? "Yes" : "No") }, { key: "sha", header: "SHA-1 (short)", width: 130, editor: { type: "text" } },
  ];
  const counts = (Object.keys(ST) as (keyof typeof ST)[]).map((k, i) => ({ label: k, value: mc.rows.filter((m) => m.status === k).length, color: C(i + 1) }));
  const addEntry = async () => { if (!draft.action.trim()) return; await log.c.create({ rev: 1, date: TODAY, machine: draft.machine, action: draft.action.trim(), notes: draft.notes, cost: draft.cost }); setDraft({ ...draft, action: "", notes: "", cost: 0 }); toast({ kind: "ok", title: "Logged", body: draft.action }); };
  const entries = byMachine(log.rows, sel);
  return (
    <>
      <PageHeader title="Retro-computing" crumbs={["Home lab", "Retro-computing"]} desc="The collection: machines, firmware dumps, install media and a restoration log." tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: "machines", label: "Machines", count: mc.rows.length }, { id: "firmware", label: "Firmware" }, { id: "media", label: "Media" }, { id: "log", label: "Restoration log", count: log.rows.length }]} />} />
      <div className="adm-grid adm-grid--4"><StatTile label="Machines" value={String(mc.rows.length)} sub={`${mc.rows.filter((m) => m.status === "Working").length} working`} /><StatTile label="Firmware outdated" value={String(fw.rows.filter((f) => fwState(f) === "outdated").length)} invert /><StatTile label="Media imaged" value={`${imagedPct(md.rows)}%`} /><StatTile label="Restoration spend" value={money(totalCost(log.rows))} /></div>
      <div className="adm-section">
        {tab === "machines" && <div className="hg-split"><Sheet t={mc} title="Machines" cols={mCols} name="machines" pageSize={6} blank={{ name: "New machine", model: "", year: 1995, cpu: "", ramMb: 64, os: "", status: "Stored", condition: "Good", location: "", serial: "" }} />
          <Panel title="By status"><div className="hg-row"><Donut parts={counts} center={String(mc.rows.length)} /><ul className="hg-timeline">{counts.map((c) => <li key={c.label}>{c.label}: <b>{c.value}</b></li>)}</ul></div></Panel></div>}
        {tab === "firmware" && <Sheet t={fw} title="Firmware and ROMs" cols={fCols} name="firmware" blank={{ machine: "Octane", item: "PROM", version: "", latest: "", file: "", verified: false }} />}
        {tab === "media" && <Sheet t={md} title="Install media" cols={dCols} name="media" blank={{ title: "New item", kind: "Software", format: "", for: "", condition: "Good", imaged: false, sha: "" }} />}
        {tab === "log" && <div className="hg-split"><Panel title="Log an entry"><div className="adm-stack">
          <Field label="Machine">{(id) => <Select id={id} value={draft.machine} onChange={(v) => setDraft({ ...draft, machine: v })} options={mc.rows.map((m) => m.name)} />}</Field>
          <Field label="What did you do?" required>{(id) => <TextInput id={id} value={draft.action} onChange={(v) => setDraft({ ...draft, action: v })} placeholder="Replaced PSU capacitors" />}</Field>
          <Field label="Notes">{(id) => <TextInput id={id} value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })} />}</Field>
          <Field label="Cost (AUD)">{() => <NumberStepper value={draft.cost} onChange={(v) => setDraft({ ...draft, cost: v })} min={0} max={5000} step={5} />}</Field>
          <Btn variant="primary" disabled={!draft.action.trim()} onClick={() => void addEntry()}>Add to log</Btn></div></Panel>
          <Panel title={`History: ${sel}`} actions={<Select value={sel} onChange={setSel} options={mc.rows.map((m) => m.name)} />}>{entries.length ? <ol className="hg-timeline">{entries.map((e) => <li key={e.id}><b>{e.action}</b> <span className="hg-muted hg-num">{e.date}</span>{e.cost > 0 && <> <span className="hg-chip">{money(e.cost)}</span></>}<div className="hg-muted">{e.notes}</div></li>)}</ol> : <p className="hg-muted">Nothing logged for {sel} yet.</p>}</Panel></div>}
      </div>
    </>
  );
}
