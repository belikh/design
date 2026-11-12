import { useMemo, useState } from "react";
import "./domain.css";
import { PageHeader, Panel, Badge, Btn, Tabs, Alert, Dot, Drawer, EmptyState } from "@belikh/jupiter-ui/kit.tsx";
import { LineChart, StatTile, Heatmap, Donut, Battery } from "@belikh/jupiter-ui/Charts.tsx";
import { DataTable, type Col } from "@belikh/jupiter-ui/DataTable.tsx";
import { Switch, Select } from "@belikh/jupiter-ui/inputs.tsx";
import { Spot } from "@belikh/jupiter-ui/Icon.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { ENTITIES, AUTOMATIONS, CAMERAS, ROOMS, AREAS, energyDay, energySummary, lowBattery, successRate, occupancyHours, type Entity, type Automation } from "./home-automation.data.ts";

export function HomeAutomation() {
  const { toast } = usePrefs(); const [tab, setTab] = useState("entities"); const [autos, setAutos] = useState<Automation[]>(AUTOMATIONS); const [ents, setEnts] = useState<Entity[]>(ENTITIES);
  const [area, setArea] = useState("all"); const [open, setOpen] = useState<Entity | null>(null); const [cam, setCam] = useState<string | null>(null);
  const e = useMemo(energyDay, []); const sum = useMemo(() => energySummary(e.grid, e.solar, e.load), [e]); const low = lowBattery(ents);
  const labels = e.t.map((h) => `${String(Math.floor(h)).padStart(2, "0")}:${h % 1 ? "30" : "00"}`);
  const cols: Col<Entity>[] = [
    { key: "id", header: "Entity ID", width: 220, render: (r) => <a href="#" className="dm-num" onClick={(ev) => { ev.preventDefault(); setOpen(r); }}>{r.id}</a> }, { key: "name", header: "Name", width: 220, filter: "text" },
    { key: "domain", header: "Domain", width: 120, filter: "select" }, { key: "area", header: "Area", width: 120, filter: "select" }, { key: "state", header: "State", width: 100, render: (r) => <Badge s={["on", "playing", "recording", "cool"].includes(r.state) ? "ok" : undefined}>{r.state}</Badge> },
    { key: "integration", header: "Integration", width: 130, filter: "select" }, { key: "battery", header: "Battery", width: 90, align: "right", value: (r) => r.battery ?? -1, render: (r) => (r.battery === undefined ? <span className="jp-muted">mains</span> : <span className={r.battery <= 20 ? "jp-delta--down" : ""}>{r.battery}%</span>) }, { key: "updated", header: "Updated", width: 90 },
  ];
  const toggle = (id: string) => { const old = ents; setEnts(ents.map((x) => (x.id === id ? { ...x, state: x.state === "on" ? "off" : "on" } : x))); toast({ kind: "info", title: `Toggled ${id}`, undo: () => setEnts(old) }); };
  const camsShown = CAMERAS.filter((c) => area === "all" || c.area === area);
  return (
    <>
      <PageHeader title="Home automation" crumbs={["Domain", "Home automation"]} desc="Entity inventory, automations, energy, batteries, cameras and CSI presence. Simulated data, shaped like Home Assistant’s."
        status={low.length ? <Badge s="warn">{low.length} low battery</Badge> : <Badge s="ok">healthy</Badge>}
        tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: "entities", label: "Entities", count: ents.length }, { id: "automations", label: "Automations", count: autos.length }, { id: "energy", label: "Energy" }, { id: "batteries", label: "Batteries", count: low.length }, { id: "cameras", label: "Cameras" }, { id: "presence", label: "Presence (CSI)" }]} />} />
      {tab === "entities" && <Panel flush><DataTable<Entity> rows={ents} cols={cols} pageSize={10} selectable={false} exportName="entities" facet={{ key: "domain", label: "Domain", options: ["light", "sensor", "binary_sensor", "switch", "camera"].map((value) => ({ value })) }} rowActions={(r) => [{ label: "Open", onSelect: () => setOpen(r) }, ...(["light", "switch"].includes(r.domain) ? [{ label: "Toggle", onSelect: () => toggle(r.id) }] : [])]} /></Panel>}
      {tab === "automations" && <Panel title="Automations" flush><div className="dm-table-wrap"><table className="jp-table"><thead><tr><th>Automation</th><th>Trigger</th><th>Last run</th><th className="jp-num">Runs 7d</th><th>Success</th><th>On</th><th /></tr></thead><tbody>{autos.map((a) => (
        <tr key={a.id}><td><b>{a.name}</b><div className="jp-muted">{a.actions.join(" · ")}</div></td><td className="dm-num">{a.trigger}</td><td>{a.lastRun}</td><td className="jp-num">{a.runs7d}</td><td><Badge s={successRate(a) >= 0.98 ? "ok" : successRate(a) >= 0.9 ? "warn" : "danger"}>{(successRate(a) * 100).toFixed(0)}%</Badge></td>
          <td><Switch checked={a.enabled} onChange={(v) => setAutos(autos.map((x) => (x.id === a.id ? { ...x, enabled: v } : x)))} label={`Enable ${a.name}`} /></td><td><Btn sm disabled={!a.enabled} onClick={() => toast({ kind: "ok", title: `Ran “${a.name}”` })}>Run now</Btn></td></tr>))}</tbody></table></div></Panel>}
      {tab === "energy" && <div className="adm-stack">
        <div className="adm-grid adm-grid--4"><StatTile label="Solar today" value={`${sum.solarKwh.toFixed(1)} kWh`} /><StatTile label="House use" value={`${sum.loadKwh.toFixed(1)} kWh`} /><StatTile label="Grid import / export" value={`${sum.importKwh.toFixed(1)} / ${sum.exportKwh.toFixed(1)}`} sub="kWh" /><StatTile label="Net cost" value={`${sum.cost < 0 ? "−" : ""}$${Math.abs(sum.cost).toFixed(2)}`} sub={`self-use ${(sum.selfUse * 100).toFixed(0)}%`} /></div>
        <Panel title="Power today (kW)"><LineChart title="Power" area height={240} labels={labels} series={[{ name: "Solar", data: e.solar }, { name: "House", data: e.load }, { name: "Grid", data: e.grid.map((g) => Math.max(0, g)), color: "var(--jp-warn)" }]} yFmt={(v) => `${Math.round(v * 10) / 10}`} /></Panel></div>}
      {tab === "batteries" && <div className="dm-tiles">{ents.filter((x) => x.battery !== undefined).sort((a, b) => a.battery! - b.battery!).map((x) => <div key={x.id} className={`dm-tile ${x.battery! <= 20 ? "is-danger" : x.battery! <= 40 ? "is-warn" : ""}`}><b>{x.name}</b><span className="jp-muted">{x.area} · {x.integration}</span><Battery value={x.battery!} label={x.id} /></div>)}{!low.length && <Alert s="ok" title="No low batteries" />}</div>}
      {tab === "cameras" && <><div className="dm-row" style={{ marginBottom: 12 }}><div style={{ width: 180 }}><Select value={area} onChange={setArea} aria-label="Area" options={["all", ...AREAS]} /></div></div>
        {camsShown.length ? <div className="dm-tiles">{camsShown.map((c) => <button key={c.id} className={`dm-tile ${c.online ? "" : "is-danger"}`} style={{ textAlign: "start", cursor: "pointer", font: "inherit", color: "inherit" }} onClick={() => setCam(c.id)}><div style={{ display: "grid", placeItems: "center", background: "var(--jp-surface)", borderRadius: 6, padding: 8, color: "var(--jp-text-muted)" }}><Spot name={c.spot} size={90} /></div><div className="dm-row dm-between"><b>{c.name}</b><Badge s={c.online ? "ok" : "danger"}>{c.online ? "live" : "offline"}</Badge></div><span className="jp-muted">{c.online ? `${c.events24h} events · last motion ${c.lastMotion ?? "—"}` : "No signal since 09:20"}</span></button>)}</div> : <EmptyState spot="no-results" title="No cameras in this area" />}</>}
      {tab === "presence" && <div className="dm-split"><Panel title="Rooms (Wi-Fi CSI sensing)" flush><ul className="adm-list">{ROOMS.map((r) => <li key={r.id}><Dot s={r.occupied ? "ok" : "off"} /><div className="adm-list__main"><b>{r.name}</b><span className="jp-muted">{r.occupied ? `${r.people} present` : "empty"} · {r.csiRssi} dBm · {occupancyHours(r).toFixed(1)} h today</span></div><Badge s={r.confidence > 0.85 ? "ok" : "warn"}>{Math.round(r.confidence * 100)}%</Badge></li>)}</ul></Panel>
        <Panel title="Occupancy by hour"><Heatmap rows={ROOMS.map((r) => r.name)} cols={Array.from({ length: 24 }, (_, h) => (h % 3 ? "" : `${h}`))} data={ROOMS.map((r) => r.history)} fmt={() => ""} /><div style={{ marginTop: 12 }}><Donut size={120} thickness={16} parts={[{ label: "Occupied", value: ROOMS.filter((r) => r.occupied).length }, { label: "Empty", value: ROOMS.filter((r) => !r.occupied).length, color: "var(--jp-border)" }]} center={<><b>{ROOMS.filter((r) => r.occupied).length}</b><span>rooms</span></>} /></div></Panel></div>}
      <Drawer open={!!open} onClose={() => setOpen(null)} title={open?.id ?? ""} footer={open && ["light", "switch"].includes(open.domain) ? <Btn variant="primary" onClick={() => { toggle(open.id); setOpen(null); }}>Toggle</Btn> : undefined}>
        {open && <dl className="dm-kv"><dt>Name</dt><dd>{open.name}</dd><dt>Domain</dt><dd>{open.domain}</dd><dt>Area</dt><dd>{open.area}</dd><dt>State</dt><dd>{open.state}</dd><dt>Integration</dt><dd>{open.integration}</dd><dt>Battery</dt><dd>{open.battery === undefined ? "mains powered" : `${open.battery}%`}</dd></dl>}
      </Drawer>
      <Drawer open={!!cam} onClose={() => setCam(null)} title={CAMERAS.find((c) => c.id === cam)?.name ?? ""}>{cam && <div className="adm-stack"><div style={{ display: "grid", placeItems: "center", background: "var(--jp-surface)", padding: 24, color: "var(--jp-text-muted)" }}><Spot name={CAMERAS.find((c) => c.id === cam)!.spot} size={160} /></div><p className="jp-muted">Live view is not connected in this demo. A real feed would stream through the NVR.</p></div>}</Drawer>
    </>
  );
}
