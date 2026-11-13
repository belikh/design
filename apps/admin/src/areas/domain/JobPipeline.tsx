import { useMemo, useState } from "react";
import "./domain.css";
import { PageHeader, Panel, Badge, Btn, Tabs, Drawer, Avatar } from "@belikh/jupiter-ui/kit.tsx";
import { StatTile, Funnel } from "@belikh/jupiter-ui/Charts.tsx";
import { Markdown } from "@belikh/jupiter-ui/extra.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { fmtShort } from "./lib.ts";
import { APPS, STAGES, DOCS, funnel, stageConversion, stats, ageDays, type App, type Stage } from "./job-pipeline.data.ts";

const tone = (s: Stage) => (s === "offer" ? "ok" : s === "rejected" ? "danger" : s === "interview" ? "info" : s === "screen" ? "warn" : undefined);
export function JobPipeline() {
  const { toast } = usePrefs(); const [tab, setTab] = useState("board"); const [apps, setApps] = useState<App[]>(APPS); const [drag, setDrag] = useState<string | null>(null); const [sel, setSel] = useState<string | null>(null); const [doc, setDoc] = useState<"resume" | "cover">("resume");
  const st = useMemo(() => stats(apps), [apps]); const fn = useMemo(() => funnel(apps), [apps]); const conv = useMemo(() => stageConversion(apps), [apps]); const open = apps.find((a) => a.id === sel);
  const move = (id: string, stage: Stage) => { const a = apps.find((x) => x.id === id)!; if (a.stage === stage) return; const order = ["saved", "applied", "screen", "interview", "offer"]; const reached = stage === "rejected" ? a.reached : (order.indexOf(stage) > order.indexOf(a.reached) ? stage : a.reached) as App["reached"]; const old = apps; setApps(apps.map((x) => (x.id === id ? { ...x, stage, reached, appliedOn: x.appliedOn ?? (stage !== "saved" ? "2026-11-12" : undefined), events: [...x.events, { date: "2026-11-12", type: stage === "rejected" ? "rejection" : stage === "offer" ? "offer" : stage === "interview" ? "interview" : "note", note: `Moved to ${stage}` }] } : x))); toast({ kind: stage === "rejected" ? "warn" : "info", title: `${a.company}: ${stage}`, undo: () => setApps(old) }); };
  return (
    <>
      <PageHeader title="Job search pipeline" crumbs={["Domain", "Job pipeline"]} desc="Applications by stage (drag or use the arrows), a per-application timeline, funnel conversion, and CV / cover-letter previews. Fictional data."
        tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: "board", label: "Board", count: apps.length }, { id: "funnel", label: "Funnel" }, { id: "docs", label: "Documents" }]} />} />
      <div className="adm-grid adm-grid--4"><StatTile label="Applied" value={String(st.applied)} /><StatTile label="Response rate" value={`${(st.responseRate * 100).toFixed(0)}%`} /><StatTile label="Avg days to reply" value={Number.isNaN(st.avgDaysToResponse) ? "—" : st.avgDaysToResponse.toFixed(1)} /><StatTile label="Offers" value={String(st.offers)} /></div>
      {tab === "board" && <div className="adm-kanban adm-section" style={{ gridTemplateColumns: "repeat(6, minmax(190px, 1fr))" }}>{STAGES.map((s, si) => { const list = apps.filter((a) => a.stage === s); return (
        <section key={s} className="adm-kcol" aria-label={s} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag) move(drag, s); setDrag(null); }}><header><b style={{ textTransform: "capitalize" }}>{s}</b><span className="adm-count">{list.length}</span></header>
          <div className="adm-kcol__list">{list.map((a) => (<article key={a.id} className="adm-kcard" draggable onDragStart={() => setDrag(a.id)} onDragEnd={() => setDrag(null)}><button className="adm-link" style={{ textAlign: "start", fontWeight: 700 }} onClick={() => setSel(a.id)}>{a.role}</button><span className="jp-muted">{a.company}</span><div className="dm-row dm-between"><Badge>{a.source}</Badge>{a.appliedOn && <span className="jp-muted dm-num">{ageDays(a)} d</span>}</div>
            <div className="dm-row"><button className="adm-x" aria-label={`Move ${a.company} left`} disabled={si === 0} onClick={() => move(a.id, STAGES[si - 1])}>←</button><button className="adm-x" aria-label={`Move ${a.company} right`} disabled={si >= STAGES.length - 2 && s !== "offer" ? false : si === STAGES.length - 1} onClick={() => move(a.id, STAGES[Math.min(si + 1, STAGES.length - 1)])}>→</button></div></article>))}</div></section>); })}</div>}
      {tab === "funnel" && <div className="dm-split adm-section"><Panel title="Funnel"><Funnel steps={fn.map((f) => ({ label: f.stage, value: Math.max(f.count, 0.0001) }))} /></Panel><Panel title="Stage conversion" flush><ul className="adm-list">{conv.map((c) => <li key={c.to}><span style={{ flex: 1, textTransform: "capitalize" }}>{c.from} → {c.to}</span><div className="dm-bar" style={{ width: 120 }}><i style={{ width: `${c.rate * 100}%` }} /></div><b className="dm-num" style={{ width: 52, textAlign: "end" }}>{(c.rate * 100).toFixed(0)}%</b></li>)}</ul></Panel></div>}
      {tab === "docs" && <div className="adm-section"><div className="dm-row" style={{ marginBottom: 12 }}><Btn variant={doc === "resume" ? "primary" : "secondary"} onClick={() => setDoc("resume")}>Resume</Btn><Btn variant={doc === "cover" ? "primary" : "secondary"} onClick={() => setDoc("cover")}>Cover letter</Btn></div><Panel title={doc === "resume" ? "Resume (preview)" : "Cover letter (preview)"}><Markdown src={DOCS[doc]} /></Panel></div>}
      <Drawer open={!!open} onClose={() => setSel(null)} title={open ? `${open.role} · ${open.company}` : ""}>{open && <div className="adm-stack"><div className="dm-row"><Avatar name={open.company} size={36} /><div><b>{open.company}</b><div className="jp-muted">{open.location} · via {open.source}</div></div><Badge s={tone(open.stage)}>{open.stage}</Badge></div>
        <h3>Timeline</h3>{open.events.length ? <ol className="dm-timeline">{[...open.events].reverse().map((e, i) => <li key={i} className={e.type === "offer" ? "is-ok" : e.type === "rejection" ? "is-danger" : "is-info"}><span className="dm-num jp-muted">{fmtShort(e.date)}</span> <Badge>{e.type}</Badge><div>{e.note}</div></li>)}</ol> : <p className="jp-muted">Not applied yet.</p>}
        {open.doc && <><h3>Document sent</h3><Markdown src={DOCS[open.doc]} /></>}</div>}</Drawer>
    </>
  );
}
