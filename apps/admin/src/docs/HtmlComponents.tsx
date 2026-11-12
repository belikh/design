import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Badge, Callout, CodeBlock, KeyValue, PageHeader, Panel, Section } from "@belikh/jupiter-ui/kit.tsx";
import { StatTile } from "@belikh/jupiter-ui/Charts.tsx";
import { SimpleTable, type SimpleColumn } from "@belikh/jupiter-ui/simpletable.tsx";
import { LOG_TEXT, MARKUP, SERVICES, SPARK_A, SPARK_B, SPARK_C, STATUS_LABEL, type ServiceRow } from "./samples.ts";
import { ThemeBox } from "./docs.tsx";

export const SERVICE_COLUMNS: SimpleColumn<ServiceRow>[] = [
  { key: "service", label: "Service", render: (r) => <span className="jp-mono">{r.service}</span> },
  { key: "region", label: "Region" },
  { key: "status", label: "Status", render: (r) => <Badge s={r.status}>{STATUS_LABEL[r.status]}</Badge> },
  { key: "uptime", label: "Uptime %", numeric: true, render: (r) => r.uptime.toFixed(2) },
  { key: "p95", label: "p95 ms", numeric: true },
  { key: "req", label: "Requests", numeric: true, render: (r) => r.req.toLocaleString("en-AU") },
];

export function LogLines({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => {
        const cls = / OK /.test(line) ? "jp-log-ok" : / WARN /.test(line) ? "jp-log-warn" : / ERROR /.test(line) ? "jp-log-danger" : "jp-log-info";
        const [ts, ...rest] = line.split("  ");
        return (
          <span key={i}>
            <span className="jp-log-dim">{ts}</span>
            {"  "}
            <span className={cls}>{rest.join("  ")}</span>
            {"\n"}
          </span>
        );
      })}
    </>
  );
}

function Demo({ n, title, desc, markup, children, id }: { n: number; title: string; desc: string; markup: string; children: (theme: "light" | "dark") => ReactNode; id: string }) {
  return (
    <Section id={id} title={title} kicker={`component ${String(n).padStart(2, "0")} / 08`}>
      <p className="jp-muted adm-gap-bottom adm-reading-width">{desc}</p>
      <div className="adm-pair">
        <div className="adm-stack">
          <ThemeBox theme="light" testId={`demo-${id}-light`}>{children("light")}</ThemeBox>
          <ThemeBox theme="dark" testId={`demo-${id}-dark`}>{children("dark")}</ThemeBox>
        </div>
        <CodeBlock code={markup} label={`${id}.html`} testId={`markup-${id}`} />
      </div>
    </Section>
  );
}

function InputsDemo({ theme }: { theme: string }) {
  const [host, setHost] = useState("");
  const [region, setRegion] = useState("syd-1");
  const [alerts, setAlerts] = useState(true);
  const invalid = host.length > 0 && /^https?:/.test(host);
  return (
    <div className="adm-stack">
      <label className="jp-field">
        <span className="jp-label">Hostname</span>
        <input
          className="jp-input jp-input--mono"
          placeholder="api.jupiter.au"
          value={host}
          aria-invalid={invalid}
          onChange={(e) => setHost(e.target.value)}
          data-testid={`demo-input-hostname-${theme}`}
        />
        <span className="jp-hint" style={invalid ? { color: "var(--jp-danger)" } : undefined}>
          {invalid ? "Remove the scheme (http://)." : "Fully qualified, no scheme."}
        </span>
      </label>
      <label className="jp-field">
        <span className="jp-label">Region</span>
        <select className="jp-select" value={region} onChange={(e) => setRegion(e.target.value)} data-testid={`demo-select-region-${theme}`}>
          <option>syd-1</option>
          <option>mel-1</option>
          <option>bne-1</option>
          <option>per-1</option>
        </select>
      </label>
      <label className="jp-inline">
        <input type="checkbox" role="switch" className="jp-toggle" checked={alerts} onChange={(e) => setAlerts(e.target.checked)} data-testid={`demo-toggle-alerts-${theme}`} />
        <span>Alerts {alerts ? "enabled" : "disabled"}</span>
      </label>
    </div>
  );
}

export function DsHtmlComponents() {
  return (
    <>
      <PageHeader eyebrow="build" title="Components (HTML)">
        <p>These eight cover most of what we build day to day. Each one is shown in light and dark from the same markup, which you can paste into any HTML page. The React component gallery is at <Link to="/components">/components</Link>.</p>
      </PageHeader>

      <nav className="adm-row adm-gap-bottom" aria-label="Components" data-testid="components-index">
        {["button", "inputs", "panel", "table", "badge", "stat", "code", "callout"].map((id) => (
          <a key={id} href={`#${id}`} className="jp-badge" data-testid={`components-jump-${id}`}>
            {id}
          </a>
        ))}
      </nav>

      <Demo n={1} id="button" title="Button" desc="Use primary for the main action on a view (keep it to one), secondary for the alternatives, and ghost for quieter actions on busy screens." markup={MARKUP.button}>
        {(th) => (
          <>
        <div className="adm-row">
          <button type="button" className="jp-btn jp-btn--primary" data-testid={`demo-btn-primary-${th}`}>Deploy</button>
          <button type="button" className="jp-btn jp-btn--secondary" data-testid={`demo-btn-secondary-${th}`}>Preview</button>
          <button type="button" className="jp-btn jp-btn--ghost" data-testid={`demo-btn-ghost-${th}`}>Cancel</button>
          <button type="button" className="jp-btn jp-btn--primary jp-btn--sm" disabled>Disabled</button>
        </div>
          </>
        )}
      </Demo>

      <Demo n={2} id="inputs" title="Input, select & toggle" desc="1px border, 2px radius, and a 2px accent focus ring that always shows on keyboard focus. Tab through them to check." markup={MARKUP.inputs}>
        {(th) => (
          <>
        <InputsDemo theme={th} />
          </>
        )}
      </Demo>

      <Demo n={3} id="panel" title="Card / panel" desc="A surface with an optional header strip, a bit like an old workstation title bar. Put a title and at most two actions in the strip." markup={MARKUP.panel}>
        {(th) => (
          <>
        <div className="adm-stack">
          <Panel title="node syd-1-a" actions={<button type="button" className="jp-btn jp-btn--ghost jp-btn--sm">restart</button>}>
            <KeyValue items={[["cpu", "23.4%"], ["mem", "11.2 / 32 GB"], ["uptime", "41d 07:12:55"]]} />
          </Panel>
          <Panel>
            <span className="jp-muted">A panel without a header strip.</span>
          </Panel>
        </div>
          </>
        )}
      </Demo>

      <Demo n={4} id="table" title="Table" desc="Tight rows, a sticky header and right-aligned mono numbers. Click a header to sort it (the state goes on aria-sort)." markup={MARKUP.table}>
        {(th) => (
          <>
        <SimpleTable columns={SERVICE_COLUMNS.slice(0, 5)} rows={SERVICES} maxHeight="14rem" testId={`demo-sorttable-${th}`} />
          </>
        )}
      </Demo>

      <Demo n={5} id="badge" title="Badge / status chip" desc="A dot and a label. Each status has its own dot shape (circle, triangle, square, diamond) so you're not relying on colour alone." markup={MARKUP.badge}>
        {(th) => (
          <>
        <div className="adm-row">
          <Badge s="ok">ok</Badge>
          <Badge s="warn">degraded</Badge>
          <Badge s="danger">down</Badge>
          <Badge s="info">maintenance</Badge>
          <Badge pill>v4.12.0</Badge>
        </div>
          </>
        )}
      </Demo>

      <Demo n={6} id="stat" title="Stat tile" desc="A big mono number with a small label, plus an optional delta and sparkline. Deltas get an arrow as well as a colour." markup={MARKUP.stat}>
        {(th) => (
          <>
        <div className="adm-grid adm-grid--2">
          <StatTile label="Requests / min" value="21,480" unit="rpm" trend={{ dir: "up", text: "12.4%" }} spark={SPARK_A} />
          <StatTile label="Error rate" value="0.42" unit="%" trend={{ dir: "down", text: "0.08 pt" }} spark={SPARK_B} />
          <StatTile label="Kiosks online" value="214" spark={SPARK_C} />
          <StatTile label="Open incidents" value="1" />
        </div>
          </>
        )}
      </Demo>

      <Demo n={7} id="code" title="Code / log block" desc="Mono, scrolls, and has a copy button in the header strip. Log levels are coloured, but the level is always written out too." markup={MARKUP.code}>
        {(th) => (
          <>
        <div className="jp-code">
          <div className="jp-code__bar">
            <span>deploy.log</span>
            <CopyBtn text={LOG_TEXT} theme={th} />
          </div>
          <pre>
            <code>
              <LogLines text={LOG_TEXT} />
            </code>
          </pre>
        </div>
          </>
        )}
      </Demo>

      <Demo n={8} id="callout" title="Callout" desc="Info, warn and danger. Each one has a text prefix ([i], [!], [x]) and a title, so it still makes sense without the colour." markup={MARKUP.callout}>
        {(th) => (
          <>
        <div className="adm-stack">
          <Callout title="Info">Maintenance window Sunday 02:00–03:00 AEST.</Callout>
          <Callout variant="warn" title="Warning">Mail relay certificate expires in 6 days.</Callout>
          <Callout variant="danger" title="Danger">legacy-ftp is refusing connections in per-1.</Callout>
        </div>
          </>
        )}
      </Demo>
    </>
  );
}

function CopyBtn({ text, theme }: { text: string; theme: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="jp-code__copy"
      data-testid={`demo-log-copy-${theme}`}
      onClick={() => {
        void navigator.clipboard?.writeText(text).catch(() => undefined);
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
    >
      {done ? "copied ✓" : "copy"}
    </button>
  );
}
