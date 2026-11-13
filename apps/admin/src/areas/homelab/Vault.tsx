import { useState } from "react";
import { useEffect, useMemo } from "react";
import { PageHeader, Panel, Tabs, Badge, Btn, Alert, Skeleton } from "@belikh/jupiter-ui/kit.tsx";
import { Segmented, Select } from "@belikh/jupiter-ui/inputs.tsx";
import { StatTile } from "@belikh/jupiter-ui/Charts.tsx";
import type { Col } from "@belikh/jupiter-ui/DataTable.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { useStore, Sheet, opts, money, type Row } from "./lib.tsx";
import { edgesOf, degrees, forceLayout, radialLayout, circleLayout, components } from "./vault.graph.ts";
import { loadVault, hasVault, repoSource, sampleData, type VaultData, type VaultSource } from "./vault.load.ts";
import { STEPS, progress, orphans, needsCuration, type Note, type Source, type Run } from "./vault.data.ts";

const NS = { draft: "warn", review: "info", evergreen: "ok", stale: "danger", deprecated: "danger", archive: "info" } as const;
type Layout = "force" | "radial" | "circle";
/** Reads research/notes/*.md next to the repo when it exists (lazily), otherwise shows fictional sample data. Say which in the UI. */
export function Vault({ source = repoSource }: { source?: VaultSource }) {
  const [data, setData] = useState<VaultData | null>(() => (hasVault(source) ? null : sampleData()));
  useEffect(() => { let live = true; void loadVault(source).then((d) => { if (live) setData(d); }); return () => { live = false; }; }, [source]);
  if (!data) return <><PageHeader title="Research vault" crumbs={["Home lab", "Research vault"]} desc="Reading research/notes ..." /><Skeleton h={120} /></>;
  return <VaultView key={`${data.mode}-${data.notes.length}`} data={data} />;
}
function VaultView({ data }: { data: VaultData }) {
  const real = data.mode === "vault"; const [tab, setTab] = useState("notes"); const [sel, setSel] = useState(() => (real ? "" : "n-mamba")); const { toast } = usePrefs(); const [layout, setLayout] = useState<Layout>(real ? "force" : "circle");
  const k = `vault-${data.mode}-${data.notes.length}`; const notes = useStore(`${k}-n`, () => data.notes), src = useStore(`${k}-s`, () => data.sources), runs = useStore(`${k}-r`, () => data.runs);
  /** Files on disk are read-only here: strip the editors. */
  const rd = <T extends Row>(cols: Col<T>[]): Col<T>[] => (real ? cols.map((c) => ({ ...c, editor: undefined })) : cols);
  const cur = needsCuration(notes.rows); const orph = orphans(notes.rows);
  const nCols: Col<Note>[] = [
    { key: "title", header: "Note", width: 240, editor: { type: "text" }, validate: (v) => (String(v).trim() ? null : "A title is required") }, { key: "status", header: "Status", width: 120, editor: { type: "select", options: [{ value: "draft", label: "draft", s: "warn" }, { value: "review", label: "review", s: "info" }, { value: "evergreen", label: "evergreen", s: "ok" }, { value: "stale", label: "stale", s: "danger" }, { value: "deprecated", label: "deprecated", s: "danger" }, { value: "archive", label: "archive", s: "info" }] } },
    { key: "summary", header: "Summary", width: 300, editor: { type: "text" } }, { key: "tags", header: "Tags", width: 150, editor: { type: "tags", options: ["ml", "ssm", "retro", "network"], creatable: true }, value: (r) => r.tags.join(", ") },
    { key: "links", header: "Links", width: 80, align: "right", value: (r) => r.links.length }, { key: "updated", header: "Updated", width: 120, editor: { type: "date" } },
    { key: "cur", header: "Curation", width: 170, render: (r) => (cur[r.id] ? <Badge s="warn">{cur[r.id]}</Badge> : <span className="hg-muted">ok</span>), value: (r) => cur[r.id] ?? "" },
  ];
  const sCols: Col<Source>[] = [
    { key: "url", header: "Source", width: 330, editor: { type: "text" } }, { key: "kind", header: "Kind", width: 90, editor: { type: "select", options: opts("paper", "docs", "blog", "forum") } }, { key: "quality", header: "Quality", width: 100, align: "right", editor: { type: "number", min: 0, max: 100 }, cf: { type: "bars" } as never },
    { key: "oa", header: "Open-access version", width: 150, editor: { type: "select", options: opts("none", "published", "accepted", "preprint") } }, { key: "fetched", header: "Fetched", width: 120 },
    { key: "warn", header: "Check", width: 200, render: (r) => (r.oa === "preprint" ? <Badge s="warn">preprint: verify quotes</Badge> : r.quality < 50 ? <Badge s="danger">low quality</Badge> : <span className="hg-muted">ok</span>), value: (r) => (r.oa === "preprint" ? "preprint" : r.quality < 50 ? "low" : "") },
  ];
  const rCols: Col<Run>[] = [
    { key: "query", header: "Query", width: 330 }, { key: "tier", header: "Tier", width: 120 }, { key: "step", header: "Step", width: 160, render: (r) => <span className="hg-num">{r.step}/{r.total ?? STEPS.length} {r.stepName ?? STEPS[Math.min(r.step, STEPS.length) - 1]}</span>, value: (r) => r.step },
    { key: "status", header: "Status", width: 110, editor: { type: "select", options: [{ value: "running", label: "running", s: "info" }, { value: "blocked", label: "blocked", s: "warn" }, { value: "done", label: "done", s: "ok" }, { value: "failed", label: "failed", s: "danger" }] } }, { key: "sources", header: "Sources", width: 90, align: "right" }, { key: "spend", header: "Spend", width: 90, align: "right", fmt: (v) => money(Number(v)) },
    ...(real ? [] : [{ key: "act", header: "", width: 120, render: (r: Run) => <Btn sm disabled={r.status !== "running"} aria-label={`Advance ${r.query}`} onClick={() => { const step = Math.min(STEPS.length, r.step + 1); runs.patch(r.id, { step, status: step === STEPS.length ? "done" : "running", spend: Math.round((r.spend + 0.35) * 100) / 100 }); toast({ kind: "ok", title: `Step ${step}: ${STEPS[step - 1]}` }); }}>Next step</Btn> } as Col<Run>]),
  ];
  const edges = useMemo(() => edgesOf(notes.rows), [notes.rows]); const deg = useMemo(() => degrees(notes.rows, edges), [notes.rows, edges]); const comps = useMemo(() => components(notes.rows, edges), [notes.rows, edges]);
  const pos = useMemo(() => (layout === "force" ? forceLayout(notes.rows, edges) : layout === "radial" ? radialLayout(notes.rows, edges, sel || [...notes.rows].sort((a, b) => deg[b.id] - deg[a.id])[0]?.id || "") : circleLayout(notes.rows)), [layout, notes.rows, edges, sel, deg]);
  const picked = notes.rows.find((n) => n.id === sel); const big = notes.rows.length > 24; const nb = new Set(sel ? edges.flatMap(([a, b]) => (a === sel ? [b] : b === sel ? [a] : [])) : []);
  const hubs = new Set([...notes.rows].sort((a, b) => deg[b.id] - deg[a.id] || a.id.localeCompare(b.id)).slice(0, 8).filter((n) => deg[n.id] > 0).map((n) => n.id)); const brokenN = Object.values(data.broken).reduce((s, l) => s + l.length, 0);
  const GW = 640, GH = 420; const cx = (id: string) => pos[id].x * GW, cy = (id: string) => pos[id].y * GH;
  const order = useMemo(() => [...notes.rows].sort((a, b) => a.title.localeCompare(b.title)).map((n) => n.id), [notes.rows]);
  const step = (e: React.KeyboardEvent, id: string) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(id); } else if (big && (e.key === "ArrowRight" || e.key === "ArrowLeft")) { e.preventDefault(); const i = order.indexOf(id); const nx = order[(i + (e.key === "ArrowRight" ? 1 : -1) + order.length) % order.length]; setSel(nx); setTimeout(() => document.querySelector<SVGElement>(`[data-note="${CSS.escape(nx)}"]`)?.focus(), 0); } };
  return (
    <>
      <PageHeader title="Research vault" crumbs={["Home lab", "Research vault"]} desc={real ? "Notes, sources, link graph and run status read from research/ (read-only)." : "Notes, sources, the link graph and run status from the hyperresearch pipeline. Sample data."} status={<Badge s={real ? "ok" : "info"}>{real ? `Real vault: ${notes.rows.length} notes` : "Sample data (fictional)"}</Badge>}
        tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: "notes", label: "Notes", count: notes.rows.length }, { id: "sources", label: "Sources", count: src.rows.length }, { id: "graph", label: "Graph" }, { id: "runs", label: "Runs", count: runs.rows.length }]} />} />
      <Alert s={real ? "ok" : "info"} title={real ? "Showing your research vault" : "Showing sample data"}>{data.note}{data.failed.length ? ` ${data.failed.length} file(s) could not be read.` : ""}{data.skipped.length ? ` ${data.skipped.length} skipped (${data.skipped[0]}).` : ""}{!real && " Create research/notes/*.md (hyperresearch writes them there) beside the repo and reload to see real notes."}</Alert>
      <div className="adm-grid adm-grid--4"><StatTile label="Notes" value={String(notes.rows.length)} /><StatTile label="Need curation" value={String(Object.keys(cur).length)} invert /><StatTile label="Orphan notes" value={String(orph.length)} invert /><StatTile label="Runs in flight" value={String(runs.rows.filter((r) => r.status !== "done").length)} /></div>
      <div className="adm-section">
        {tab === "notes" && <Sheet t={notes} title="Notes" cols={rd(nCols)} name="vault-notes" facet={{ key: "status", label: "Status", options: [{ value: "draft", s: "warn" }, { value: "review", s: "info" }, { value: "evergreen", s: "ok" }, { value: "stale", s: "danger" }, { value: "deprecated", s: "danger" }, { value: "archive", s: "info" }] }} blank={real ? undefined : { title: "New note", status: "draft", summary: "", tags: [], links: [], updated: "2026-11-12" }} />}
        {tab === "sources" && <Sheet t={src} title="Sources" cols={rd(sCols)} name="vault-sources" />}
        {tab === "graph" && <div className="hg-split"><Panel title={`Link graph (${layout})`} actions={<><Select aria-label="Show note" value={sel} onChange={setSel} options={[{ value: "", label: "Choose a note" }, ...order.map((id) => ({ value: id, label: notes.rows.find((n) => n.id === id)?.title ?? id }))]} /><Segmented label="Layout" value={layout} onChange={setLayout} options={[{ value: "force", label: "Force" }, { value: "radial", label: "Radial" }, { value: "circle", label: "Circle" }]} /></>}>
          <svg className="hg-svg" viewBox={`0 0 ${GW} ${GH}`} role="group" aria-label={`Note link graph: ${notes.rows.length} notes, ${edges.length} links, ${orph.length} unlinked`}>
            {edges.map(([a, b]) => pos[a] && pos[b] ? <line key={a + b} className={`hg-link${sel === a || sel === b ? " hg-link-on" : ""}`} x1={cx(a)} y1={cy(a)} x2={cx(b)} y2={cy(b)} /> : null)}
            {notes.rows.filter((n) => pos[n.id]).map((n) => { const d = deg[n.id] ?? 0, label = sel === n.id || nb.has(n.id) || hubs.has(n.id) || !big; return (
              <g key={n.id} data-note={n.id} className={`hg-node${sel === n.id ? " is-sel" : ""}${d === 0 ? " is-warn" : ""}`} role="button" tabIndex={big && sel !== n.id && !(sel === "" && n.id === order[0]) ? -1 : 0} aria-label={`${n.title}, ${d} connections`} aria-pressed={sel === n.id} onClick={() => setSel(n.id)} onKeyDown={(e) => step(e, n.id)}>
                <circle cx={cx(n.id)} cy={cy(n.id)} r={Math.min(18, 4 + d * (big ? 1.2 : 3))} />{label && <text x={cx(n.id)} y={cy(n.id) - Math.min(18, 4 + d * (big ? 1.2 : 3)) - 4} textAnchor="middle">{n.title.length > 22 ? n.title.slice(0, 21) + "…" : n.title}</text>}</g>); })}
          </svg>
          <p className="hg-muted">{big ? "Only the selected note, its neighbours and the busiest hubs are labelled. Tab reaches the selected note; Left and Right arrows step through notes by title." : "Select a note to see its links."} {comps.length} connected group{comps.length === 1 ? "" : "s"}, {orph.length} unlinked note{orph.length === 1 ? "" : "s"}{brokenN ? `, ${brokenN} link${brokenN === 1 ? "" : "s"} to notes that do not exist` : ""}.</p></Panel>
          <Panel title={picked?.title ?? "Select a note"}>{picked ? <dl className="hg-kv"><dt>Status</dt><dd><Badge s={NS[picked.status]}>{picked.status}</Badge></dd><dt>Connections</dt><dd>{deg[picked.id] ?? 0}</dd><dt>Summary</dt><dd>{picked.summary || <span className="hg-muted">none yet</span>}</dd><dt>Links to</dt><dd>{picked.links.map((l) => notes.rows.find((n) => n.id === l)?.title ?? l).join(", ") || "nothing"}</dd>{data.broken[picked.id] && <><dt>Broken links</dt><dd>{data.broken[picked.id].join(", ")}</dd></>}{picked.source && <><dt>Source</dt><dd className="hg-num">{picked.source}</dd></>}</dl> : <p className="hg-muted">Nothing selected.</p>}</Panel></div>}
        {tab === "runs" && <div className="adm-stack">{real && runs.rows.length === 0 && <Alert s="info" title="No runs found">There is no research/runs/*/run.json. Start one with /hyperresearch.</Alert>}<Sheet t={runs} title="Research runs" cols={rd(rCols)} name="vault-runs" />{runs.rows.map((r) => <div key={r.id} className="hg-row"><span style={{ inlineSize: "18em" }}>{r.query}</span><div className="hg-bar" style={{ flex: 1 }} role="progressbar" aria-label={`Progress for ${r.query}`} aria-valuenow={progress(r)} aria-valuemin={0} aria-valuemax={100}><i className={r.status === "done" ? "is-ok" : r.status === "blocked" ? "is-warn" : ""} style={{ inlineSize: `${progress(r)}%` }} /></div><span className="hg-num">{progress(r)}%</span></div>)}</div>}
      </div>
    </>
  );
}
