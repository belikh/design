import { useState } from "react";
import { PageHeader, Panel, Tabs, Badge, Btn, Alert } from "@belikh/jupiter-ui/kit.tsx";
import { StatTile, ProgressBar } from "@belikh/jupiter-ui/Charts.tsx";
import { Segmented } from "@belikh/jupiter-ui/inputs.tsx";
import type { Col } from "@belikh/jupiter-ui/DataTable.tsx";
import { useStore, Sheet, opts } from "./lib.tsx";
import { ZoneMap } from "./ZoneMap.tsx";
import { ClipPlayer } from "./ClipPlayer.tsx";
import { CAMS, CLIPS, ZONES, storageGb, totalGb, hhmm, type Cam, type Clip, type Zone, type Kind } from "./cameras.data.ts";

const DISK_GB = 1200;
const COLOR: Record<Kind, string> = { person: "var(--adm-c1)", vehicle: "var(--adm-c2)", animal: "var(--adm-c3)", motion: "var(--adm-c4)" };
export function Cameras() {
  const [tab, setTab] = useState("timeline"); const [kind, setKind] = useState<Kind | "all">("all"); const [zoneCam, setZoneCam] = useState("k2"); const [playing, setPlaying] = useState("");
  const cams = useStore("cam-c", CAMS), clips = useStore("cam-x", CLIPS), zones = useStore("cam-z", ZONES);
  const shown = clips.rows.filter((c) => kind === "all" || c.kind === kind); const clip = clips.rows.find((c) => c.id === playing);
  const need = totalGb(cams.rows); const pct = Math.round((need / DISK_GB) * 100);
  const camCols: Col<Cam>[] = [
    { key: "name", header: "Camera", width: 140, editor: { type: "text" } }, { key: "place", header: "Place", width: 110 }, { key: "recording", header: "Recording", width: 140, editor: { type: "select", options: opts("Continuous", "Motion only", "Off") } },
    { key: "bitrateMbps", header: "Bitrate (Mbps)", width: 120, align: "right", editor: { type: "number", min: 1, max: 20 } }, { key: "sensitivity", header: "Motion sensitivity", width: 140, align: "right", editor: { type: "number", min: 0, max: 100 } },
    { key: "retentionDays", header: "Retention (days)", width: 130, align: "right", editor: { type: "number", min: 1, max: 365 }, validate: (v) => (Number(v) >= 1 ? null : "Keep at least one day") },
    { key: "gb", header: "Storage (GB)", width: 120, align: "right", value: (r) => storageGb(r) },
  ];
  const zCols: Col<Zone>[] = [
    { key: "name", header: "Zone", width: 160, editor: { type: "text" } }, { key: "cam", header: "Camera", width: 120, value: (r) => cams.rows.find((c) => c.id === r.cam)?.name ?? r.cam }, { key: "mode", header: "Mode", width: 110, editor: { type: "select", options: opts("Detect", "Ignore") } }, { key: "enabled", header: "Enabled", width: 100, editor: { type: "boolean" }, value: (r) => (r.enabled ? "Yes" : "No") },
    { key: "shape", header: "Shape", width: 100, value: (r) => (r.shape === "polygon" ? `Polygon (${r.points.length})` : "Rectangle") },
    { key: "sensitivity", header: "Sensitivity", width: 110, align: "right", editor: { type: "number", min: 0, max: 100 } }, { key: "retentionDays", header: "Keep (days)", width: 110, align: "right", editor: { type: "number", min: 1, max: 365 }, validate: (v) => (Number(v) >= 1 ? null : "Keep at least one day") },
    ...(["x", "y", "w", "h"] as const).map((k): Col<Zone> => ({ key: k, header: `${k.toUpperCase()} %`, width: 70, align: "right", editor: { type: "number", min: k === "w" || k === "h" ? 4 : 0, max: 100 },
      validate: (v, r) => (r.shape === "polygon" ? "Polygon corners are edited on the map" : (k === "x" ? Number(v) + r.w : k === "y" ? Number(v) + r.h : k === "w" ? r.x + Number(v) : r.y + Number(v)) > 100 ? "The zone would leave the frame" : null) })),
  ];
  const clipCols: Col<Clip>[] = [{ key: "label", header: "Clip", width: 150, editor: { type: "text" } }, { key: "cam", header: "Camera", width: 120, value: (r) => cams.rows.find((c) => c.id === r.cam)?.name ?? r.cam }, { key: "kind", header: "Kind", width: 100 }, { key: "t", header: "Start", width: 80, value: (r) => hhmm(r.startMin) }, { key: "durSec", header: "Secs", width: 70, align: "right" }, { key: "mb", header: "MB", width: 70, align: "right" }, { key: "keep", header: "Pinned", width: 90, editor: { type: "boolean" }, value: (r) => (r.keep ? "Yes" : "No") }];
  const rowH = 34, W = 720, X = (m: number) => 110 + (m / 1440) * (W - 130);
    return (
    <>
      <PageHeader title="Camera recorder" crumbs={["Home lab", "Camera recorder"]} desc="Event clips on a 24-hour timeline, detection zones and retention against disk capacity." tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: "timeline", label: "Events" }, { id: "zones", label: "Zones" }, { id: "retention", label: "Retention" }]} />} />
      <div className="adm-grid adm-grid--4"><StatTile label="Cameras recording" value={`${cams.rows.filter((c) => c.recording !== "Off").length}/${cams.rows.length}`} /><StatTile label="Events today" value={String(clips.rows.length)} /><StatTile label="Pinned clips" value={String(clips.rows.filter((c) => c.keep).length)} /><StatTile label="Disk planned" value={`${pct}%`} invert /></div>
      <div className="adm-section">
        {tab === "timeline" && <div className="adm-stack"><Panel title="Today, 24 hours" actions={<Segmented label="Event kind" value={kind} onChange={setKind} options={[{ value: "all", label: "All" }, { value: "person", label: "People" }, { value: "vehicle", label: "Vehicles" }, { value: "animal", label: "Animals" }]} />}>
          <svg className="hg-svg" viewBox={`0 0 ${W} ${cams.rows.length * rowH + 30}`} role="group" aria-label="Event timeline">
            {[0, 6, 12, 18, 24].map((h) => <g key={h}><line x1={X(h * 60)} x2={X(h * 60)} y1={0} y2={cams.rows.length * rowH} className="hg-link" strokeWidth={1} /><text className="hg-dim" x={X(h * 60)} y={cams.rows.length * rowH + 18} textAnchor="middle">{String(h).padStart(2, "0")}:00</text></g>)}
            {cams.rows.map((c, i) => <g key={c.id}><text x={6} y={i * rowH + 21}>{c.name}</text>{shown.filter((e) => e.cam === c.id).map((e) => (
              <g key={e.id} className={`hg-node${playing === e.id ? " is-sel" : ""}`} role="button" tabIndex={0} aria-label={`${e.label}, ${c.name}, ${e.kind} at ${hhmm(e.startMin)}`} aria-pressed={playing === e.id} onClick={() => setPlaying(e.id)} onKeyDown={(k) => { if (k.key === "Enter" || k.key === " ") { k.preventDefault(); setPlaying(e.id); } }}>
                <rect x={X(e.startMin) - 4} y={i * rowH + 6} width={8} height={22} rx={2} style={{ fill: COLOR[e.kind] }} /></g>))}</g>)}
          </svg></Panel>
          <div className="hg-split"><Sheet t={clips} title="Clips" cols={clipCols} name="clips" pageSize={6} />
            <Panel title={clip ? `${clip.label} at ${hhmm(clip.startMin)}` : "Select a clip"}>{clip ? <div className="adm-stack"><ClipPlayer clip={clip} zones={zones.rows.filter((z) => z.cam === clip.cam)} />
              <div className="hg-row"><Badge s="info">{clip.kind}</Badge><span className="hg-chip">{clip.mb} MB</span><Btn sm onClick={() => clips.patch(clip.id, { keep: !clip.keep })}>{clip.keep ? "Unpin" : "Pin to keep"}</Btn></div></div> : <p className="hg-muted">Click a mark on the timeline to preview it.</p>}</Panel></div></div>}
        {tab === "zones" && <div className="adm-stack"><Segmented label="Camera" value={zoneCam} onChange={setZoneCam} options={cams.rows.slice(0, 3).map((c) => ({ value: c.id, label: c.name }))} />
          <ZoneMap key={zoneCam} zones={zones} cam={zoneCam} camName={cams.rows.find((c) => c.id === zoneCam)?.name ?? zoneCam} />
          <Sheet t={zones} title="Zones" cols={zCols} name="zones" blank={{ cam: zoneCam, name: "New zone", shape: "rect", points: [], x: 10, y: 10, w: 30, h: 30, mode: "Detect", enabled: true, sensitivity: 50, retentionDays: 14 }} /></div>}
        {tab === "retention" && <div className="adm-stack">{pct > 80 && <Alert s="warn" title={`Planned retention uses ${pct}% of the disk`}>Reduce retention days or switch busy cameras to motion only.</Alert>}
          <Panel title={`Planned storage: ${need} GB of ${DISK_GB} GB`}><ProgressBar value={need} max={DISK_GB} s={pct > 90 ? "danger" : pct > 70 ? "warn" : "ok"} label="Disk planned" /></Panel>
          <Sheet t={cams} title="Cameras and retention" cols={camCols} name="cameras" /></div>}
      </div>
    </>
  );
}
