import { useState } from "react";
import { PageHeader, Panel, Badge, Alert } from "@belikh/jupiter-ui/kit.tsx";
import { StatTile } from "@belikh/jupiter-ui/Charts.tsx";
import { Segmented } from "@belikh/jupiter-ui/inputs.tsx";
import { PARITY, TARGETS, totals, gaps, type Level, type Target, type View } from "./parity.data.ts";
import "./homelab.css";

const B = ({ l, why }: { l: Level; why?: string }) => (
  <span title={why}><Badge s={l === "yes" ? "ok" : l === "partial" ? "warn" : l === "no" ? "danger" : undefined}>{l === "yes" ? "yes" : l === "partial" ? "partial" : l === "na" ? "n/a" : "gap"}</Badge></span>
);
const reasons = (v: View) => TARGETS.filter((t) => v.reasons?.[t] && (v[t] === "na" || v[t] === "partial")).map((t: Target) => `${t.toUpperCase()} ${v[t] === "na" ? "n/a" : "partial"}: ${v.reasons![t]}`);
export function Parity() {
  const [f, setF] = useState<"all" | "gaps">("all"); const t = totals(PARITY); const rows = f === "gaps" ? gaps(PARITY) : PARITY;
  const cell = (v: View, k: Target) => <td><B l={v[k]} why={v.reasons?.[k]} /></td>;
  return (
    <>
      <PageHeader title="Platform parity" crumbs={["Quality", "Parity"]} desc="Which web views also exist as a terminal UI, in the Slint and GTK demos, and as LaTeX. Statuses were checked against examples/ and packages/." />
      <div className="adm-grid adm-grid--4"><StatTile label="Terminal (TUI)" value={`${t.tui}/${t.applicable.tui}`} /><StatTile label="Slint demo" value={`${t.slint}/${t.applicable.slint}`} /><StatTile label="GTK demo" value={`${t.gtk}/${t.applicable.gtk}`} /><StatTile label="LaTeX" value={`${t.latex}/${t.applicable.latex}`} /></div>
      <div className="adm-section adm-stack">
        <Alert s="info" title="How to read this">Each target is an eight-page app (TUI, Slint, GTK) or a generated document (LaTeX), all fed by the same sample data as the web fixtures and by the generated tokens. "yes" means built and run; "partial" names what is missing; "n/a" means the medium cannot or should not do it, with the reason in the notes (n/a is neither a gap nor counted in the totals). CI compiles the TUI tests and the LaTeX, but does not build the Slint and GTK demos: those were built and rendered locally.</Alert>
        <Panel title="Views" flush actions={<Segmented label="Show" value={f} onChange={setF} options={[{ value: "all", label: "All views" }, { value: "gaps", label: "With gaps" }]} />}>
          <div className="hg-wrap"><table className="hg-table" aria-label="Platform parity"><thead><tr><th scope="col">View</th><th scope="col">Web route</th><th scope="col">TUI</th><th scope="col">Slint</th><th scope="col">GTK</th><th scope="col">LaTeX</th><th scope="col">Notes and evidence</th></tr></thead>
            <tbody>{rows.map((v) => <tr key={v.id}><th scope="row">{v.view}</th><td><code className="hg-num">{v.web}</code></td>{cell(v, "tui")}{cell(v, "slint")}{cell(v, "gtk")}{cell(v, "latex")}<td>{v.note}{reasons(v).map((r) => <div key={r} className="hg-muted">{r}</div>)}<div className="hg-muted hg-num">{v.evidence.join(", ")}</div></td></tr>)}</tbody></table></div>
        </Panel>
      </div>
    </>
  );
}
