import { useState } from "react";
import { PageHeader, Panel, Badge, Alert } from "@belikh/jupiter-ui/kit.tsx";
import { StatTile } from "@belikh/jupiter-ui/Charts.tsx";
import { Segmented } from "@belikh/jupiter-ui/inputs.tsx";
import { PARITY, totals, gaps, type Level } from "./parity.data.ts";
import "./p3g.css";

const B = ({ l }: { l: Level }) => <Badge s={l === "yes" ? "ok" : l === "partial" ? "warn" : "danger"}>{l === "yes" ? "yes" : l === "partial" ? "partial" : "gap"}</Badge>;
export function Parity() {
  const [f, setF] = useState<"all" | "gaps">("all"); const t = totals(PARITY); const rows = f === "gaps" ? gaps(PARITY) : PARITY;
  return (
    <>
      <PageHeader title="Platform parity" crumbs={["Quality", "Parity"]} desc="Which web views also exist as a terminal UI, in the Slint and GTK demos, and as LaTeX. Statuses were checked against examples/ and packages/." />
      <div className="adm-grid adm-grid--4"><StatTile label="Terminal (TUI)" value={`${t.tui}/${t.n}`} /><StatTile label="Slint demo" value={`${t.slint}/${t.n}`} /><StatTile label="GTK demo" value={`${t.gtk}/${t.n}`} /><StatTile label="LaTeX" value={`${t.latex}/${t.n}`} /></div>
      <div className="adm-section adm-stack">
        <Alert s="info" title="What really exists">The Slint and GTK demos are one themed overview page each. packages/rust provides a ratatui theme adapter, not a TUI application. LaTeX has five document classes, but no page exports its data to .tex.</Alert>
        <Panel title="Views" flush actions={<Segmented label="Show" value={f} onChange={setF} options={[{ value: "all", label: "All views" }, { value: "gaps", label: "With gaps" }]} />}>
          <div className="hg-wrap"><table className="hg-table" aria-label="Platform parity"><thead><tr><th scope="col">View</th><th scope="col">Web route</th><th scope="col">TUI</th><th scope="col">Slint</th><th scope="col">GTK</th><th scope="col">LaTeX</th><th scope="col">Notes and evidence</th></tr></thead>
            <tbody>{rows.map((v) => <tr key={v.id}><th scope="row">{v.view}</th><td><code className="hg-num">{v.web}</code></td><td><B l={v.tui} /></td><td><B l={v.slint} /></td><td><B l={v.gtk} /></td><td><B l={v.latex} /></td><td>{v.note}<div className="hg-muted hg-num">{v.evidence.join(", ")}</div></td></tr>)}</tbody></table></div>
        </Panel>
      </div>
    </>
  );
}
