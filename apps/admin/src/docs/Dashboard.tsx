import { useMemo, useState } from "react";
import { Callout, KeyValue, PageHeader, Panel } from "@belikh/jupiter-ui/kit.tsx";
import { LineChart, StatTile } from "@belikh/jupiter-ui/Charts.tsx";
import { SimpleTable } from "@belikh/jupiter-ui/simpletable.tsx";
import { LOG_TEXT, SERVICES, SPARK_A, SPARK_B, SPARK_C, SPARK_D, STATUS_LABEL } from "./samples.ts";
import { LogLines, SERVICE_COLUMNS } from "./HtmlComponents.tsx";

const TRAFFIC = [42, 44, 41, 47, 52, 58, 61, 66, 63, 70, 74, 71, 78, 82, 79, 85, 88, 84, 90, 94, 91, 96, 99, 97];

export function DsDashboard() {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("all");
  const [issuesOnly, setIssuesOnly] = useState(false);

  const rows = useMemo(
    () =>
      SERVICES.filter(
        (r) =>
          (!q || r.service.includes(q.toLowerCase())) && (region === "all" || r.region === region) && (!issuesOnly || r.status === "warn" || r.status === "danger"),
      ),
    [q, region, issuesOnly],
  );
  const regions = Array.from(new Set(SERVICES.map((r) => r.region)));
  const issues = SERVICES.filter((r) => r.status === "warn" || r.status === "danger").length;

  return (
    <>
      <PageHeader eyebrow="build · 12-column grid" title="Ops overview">
        <p>An example dashboard built with nothing but jupiter.css: four stat tiles, a chart panel, a sortable table and a log tail, all on the 12-column grid.</p>
      </PageHeader>

      <div className="jp-grid">
        <div className="jp-col-12 jp-sm-6 jp-lg-3">
          <StatTile label="Requests / min" value="21,480" unit="rpm" trend={{ dir: "up", text: "12.4%" }} spark={SPARK_A} testId="dash-stat-rpm" />
        </div>
        <div className="jp-col-12 jp-sm-6 jp-lg-3">
          <StatTile label="Error rate" value="0.42" unit="%" trend={{ dir: "down", text: "0.08 pt" }} spark={SPARK_B} testId="dash-stat-errors" />
        </div>
        <div className="jp-col-12 jp-sm-6 jp-lg-3">
          <StatTile label="Kiosks online" value="214" unit="/220" spark={SPARK_C} testId="dash-stat-kiosks" />
        </div>
        <div className="jp-col-12 jp-sm-6 jp-lg-3">
          <StatTile label="SLO budget left" value="97.1" unit="%" spark={SPARK_D} testId="dash-stat-slo" />
        </div>

        <div className="jp-col-12 jp-md-8">
          <Panel title="traffic · last 24h · req/s" actions={<span className="jp-badge jp-badge--info">live</span>} testId="dash-traffic-panel">
            <LineChart area smooth height={160} title="Traffic, last 24 hours" labels={TRAFFIC.map((_, i) => `${String(i).padStart(2, "0")}:00`)} series={[{ name: "req/s", data: TRAFFIC }]} />
          </Panel>
        </div>
        <div className="jp-col-12 jp-md-4 adm-stack">
          <Callout variant={issues ? "warn" : "info"} title={`${issues} services need attention`} testId="dash-issues-callout">
            {SERVICES.filter((r) => r.status === "warn" || r.status === "danger")
              .map((r) => `${r.service} (${STATUS_LABEL[r.status]})`)
              .join(", ")}
          </Callout>
          <Panel title="on call">
            <KeyValue items={[["primary", "a.nguyen"], ["secondary", "m.oconnor"], ["handover", "Fri 09:00 AEST"]]} />
          </Panel>
        </div>

        <div className="jp-col-12">
          <Panel title={`services · ${rows.length} of ${SERVICES.length}`} testId="dash-services-panel">
            <div className="adm-toolbar">
              <label className="jp-field adm-toolbar__grow">
                <span className="jp-label">Filter</span>
                <input className="jp-input jp-input--mono" placeholder="service name…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="dash-filter-input" />
              </label>
              <label className="jp-field adm-toolbar__fixed">
                <span className="jp-label">Region</span>
                <select className="jp-select" value={region} onChange={(e) => setRegion(e.target.value)} data-testid="dash-region-select">
                  <option value="all">all</option>
                  {regions.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label className="jp-inline">
                <input type="checkbox" role="switch" className="jp-toggle" checked={issuesOnly} onChange={(e) => setIssuesOnly(e.target.checked)} data-testid="dash-issues-toggle" />
                <span>Issues only</span>
              </label>
            </div>
            {rows.length ? (
              <SimpleTable columns={SERVICE_COLUMNS} rows={rows} maxHeight="20rem" testId="dash-table" />
            ) : (
              <p className="jp-muted jp-mono adm-note" data-testid="dash-table-empty">
                no services match
              </p>
            )}
          </Panel>
        </div>

        <div className="jp-col-12">
          <div className="jp-code">
            <div className="jp-code__bar">
              <span>events · tail -f</span>
            </div>
            <pre>
              <code>
                <LogLines text={LOG_TEXT} />
              </code>
            </pre>
          </div>
        </div>
      </div>
    </>
  );
}
