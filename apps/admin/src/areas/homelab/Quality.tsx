import { useMemo, useState } from "react";
import { ROUTES } from "../../routes.ts";
import baseline from "../../../visual/baseline.json";
import a11yBaseline from "../../test/a11y-baseline.json";
import { PageHeader, Panel, Badge, CodeBlock } from "@belikh/jupiter-ui/kit.tsx";
import { StatTile } from "@belikh/jupiter-ui/Charts.tsx";
import { Segmented, TextInput } from "@belikh/jupiter-ui/inputs.tsx";
import { DataTable, type Col } from "@belikh/jupiter-ui/DataTable.tsx";
import { coverage, summary, orphanShots, VARIANTS, COMMANDS, HOOKS, type Cov } from "./quality.data.ts";
import "./homelab.css";

type Filter = "all" | "gaps" | "a11y";
export function Quality({ routes = ROUTES, shots = baseline.shots, a11y = a11yBaseline }: { routes?: { path: string; label: string; group: string }[]; shots?: Record<string, string>; a11y?: Record<string, string[]> }) {
  const [f, setF] = useState<Filter>("all"); const [q, setQ] = useState("");
  const all = useMemo(() => coverage(routes, shots, a11y), [routes, shots, a11y]); const s = summary(all); const stale = orphanShots(routes, shots);
  const rows = all.filter((c) => (f === "all" || (f === "gaps" ? c.covered < VARIANTS.length : c.a11y.length > 0)) && (!q || `${c.path} ${c.label} ${c.group}`.toLowerCase().includes(q.toLowerCase()))).map((c) => ({ ...c, id: c.path }));
  const cols: Col<Cov & { id: string }>[] = [
    { key: "path", header: "Route", width: 240, render: (r) => <code className="hg-num">{r.path}</code> }, { key: "label", header: "Page", width: 200 }, { key: "group", header: "Group", width: 130 },
    ...VARIANTS.map((v) => ({ key: v.key, header: `Visual ${v.label}`, width: 130, render: (r: Cov & { id: string }) => <Badge s={r.variants[v.key] ? "ok" : "warn"}>{r.variants[v.key] ? "baselined" : "no baseline"}</Badge>, value: (r: Cov & { id: string }) => (r.variants[v.key] ? "baselined" : "no baseline") })),
    { key: "covered", header: "Variants", width: 90, render: (r) => `${r.covered}/${VARIANTS.length}`, value: (r) => r.covered },
    { key: "a11y", header: "a11y (axe)", width: 120, render: (r) => (r.a11y.length ? <Badge s="warn">{`${r.a11y.length} known`}</Badge> : <Badge s="ok">clean</Badge>), value: (r) => r.a11y.length },
    { key: "rules", header: "Known violations", width: 260, value: (r) => r.a11y.join(", ") || "none" },
  ];
  return (
    <>
      <PageHeader title="Quality" crumbs={["Quality", "Visual and a11y"]} desc="Per-route status read from the committed artefacts: the route list, visual/baseline.json and src/test/a11y-baseline.json." status={s.missing ? <Badge s="warn">{s.missing} routes lack a visual baseline</Badge> : <Badge s="ok">all routes baselined</Badge>} />
      <div className="adm-grid adm-grid--4"><StatTile label="Routes" value={String(s.routes)} /><StatTile label="All four variants baselined" value={`${s.full}/${s.routes}`} /><StatTile label="a11y clean" value={`${s.clean}/${s.routes}`} /><StatTile label="Known a11y violations" value={String(s.violations)} invert /></div>
      <div className="adm-grid adm-grid--4 adm-section">{VARIANTS.map((v) => <StatTile key={v.key} label={`Baselined: ${v.label}`} value={`${s.byVariant[v.key]}/${s.routes}`} />)}</div>
      <div className="adm-section adm-stack">
        <Panel title="Per-route status" flush actions={<><TextInput aria-label="Filter routes" value={q} onChange={setQ} placeholder="Filter routes" /><Segmented label="Show" value={f} onChange={setF} options={[{ value: "all", label: "All" }, { value: "gaps", label: "Visual gaps" }, { value: "a11y", label: "a11y known" }]} /></>}>
          <DataTable rows={rows} cols={cols} pageSize={15} exportName="route-quality" ariaLabel="Route quality" />
        </Panel>
        <div className="hg-split">
          <Panel title="How to run"><div className="adm-stack">{COMMANDS.map((c) => <div key={c.cmd}><CodeBlock label={c.dir} code={c.cmd} /><p className="hg-muted">{c.what}</p></div>)}</div></Panel>
          <Panel title="Coverage notes"><ul className="adm-stack">
            <li><b>Variants.</b> Each route is captured in four variants: {VARIANTS.map((v) => v.label).join(", ")} ({Object.keys(shots).length} entries at {baseline.size.join("x")}). Per variant: {VARIANTS.map((v) => `${v.label} ${s.byVariant[v.key]}/${s.routes}`).join(", ")}. Density is set with the <code>jp-density</code> setting and theme with <code>data-theme</code>; keys are <code>/route#theme</code> (comfortable) and <code>/route#theme+compact</code>.</li>
            {s.noDensity > 0 && <li><b>{s.noDensity} routes have no compact baseline yet</b> (the baseline predates density variants), so density regressions there are not caught. Run <code>npm run visual -- --update</code>.</li>}
            <li><b>Baseline is a grid.</b> {baseline.grid.join("x")} average-luminance cells, so clocks and relative times do not fail it, but small text changes will not either.</li>
            {stale.length > 0 && <li><b>{stale.length} baseline routes no longer exist</b>: {stale.slice(0, 6).join(", ")}{stale.length > 6 ? ", ..." : ""}. Run <code>npm run visual -- --update</code>.</li>}
            <li><b>Test hooks.</b></li></ul>
            <ul className="adm-stack">{HOOKS.map((h) => <li key={h.hook}><code>{h.hook}</code> ({h.where}): {h.use}</li>)}</ul></Panel>
        </div>
      </div>
    </>
  );
}
