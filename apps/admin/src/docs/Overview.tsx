import { Link } from "react-router-dom";
import { OUTPUTS } from "@belikh/jupiter-tokens";
import { Badge, CodeBlock, PageHeader, Panel, Section } from "@belikh/jupiter-ui/kit.tsx";
import { StatTile } from "@belikh/jupiter-ui/Charts.tsx";
import { MARKUP, SPARK_A } from "./samples.ts";
import { ThemeBox } from "./docs.tsx";
import { useDs } from "./store.tsx";

const PRINCIPLES = [
  ["Tokens first", "Everything starts in jupiter.tokens.json. The CSS, email template, terminal palette and mobile JSON are all generated from it, so you change a colour once and it changes everywhere."],
  ["Dense and easy to read", "Think a decent terminal or a well-kept spreadsheet. If something on screen doesn't tell you anything, we take it out."],
  ["No build step", "It's plain CSS custom properties with system font fallbacks, no framework. Drop jupiter.css into a page and you're set."],
  ["Light and dark get equal care", "Both modes use the same colour roles. Dark kicks in when the OS asks for it, or you can set data-theme to force one."],
  ["A bit retro, not a costume", "Mono labels, a single accent colour and 1px rules. It borrows from early-90s workstations without trying to look like one."],
];

const PIPELINE = `jupiter.tokens.json ─┬─▶ jupiter.css          web · SPA · dynamic apps
                     ├─▶ jupiter-kiosk.css    touchscreen, ≥48px targets
                     ├─▶ jupiter-email.html   table layout, inline, light-safe
                     ├─▶ jupiter-terminal.sh  ANSI 16 over SSH (OSC 4)
                     ├─▶ jupiter.Xresources   X11 terminals
                     └─▶ jupiter.mobile.json  iOS · Android (W3C tokens)`;

function ThemeSample({ theme }: { theme: "light" | "dark" }) {
  return (
    <ThemeBox theme={theme} testId={`overview-sample-${theme}`}>
      <div className="adm-row adm-between"><span className="jp-label">{theme}</span><Badge s="ok">ok</Badge></div>
      <Panel title="syd-1 / api">
        <div className="adm-stack">
          <StatTile label="p95 latency" value="182" unit="ms" trend={{ dir: "down", text: "4.1%" }} spark={SPARK_A} />
          <div className="adm-row">
            <button type="button" className="jp-btn jp-btn--primary jp-btn--sm">Deploy</button>
            <button type="button" className="jp-btn jp-btn--secondary jp-btn--sm">Logs</button>
            <Badge s="warn">degraded</Badge>
          </div>
        </div>
      </Panel>
    </ThemeBox>
  );
}

export function DsOverview() {
  const { tokens } = useDs();
  return (
    <>
      <PageHeader eyebrow="jupiter.au · design system" title="Jupiter design system">
        <p>
          This is the design system for everything Jupiter ships: the static sites, web apps and SPAs, the mobile apps, SSH sessions, kiosk screens
          and email. This site is styled with the generated <code>jupiter.css</code>, so if you change a token in the{" "}
          <Link to="/editor" data-testid="overview-editor-link">editor</Link> you'll see the whole site change with it. The admin template pages
          (dashboards, data, records, tools) start at the <Link to="/overview" data-testid="overview-admin-link">admin overview</Link>.
        </p>
      </PageHeader>

      <Section title="Principles" kicker="01 — 05">
        <ol className="adm-principles" data-testid="principles-list">
          {PRINCIPLES.map(([t, d], i) => (
            <li key={t}><span className="jp-mono jp-muted">{String(i + 1).padStart(2, "0")}</span><strong>{t}</strong><span className="jp-muted">{d}</span></li>
          ))}
        </ol>
      </Section>

      <Section title="How the files get made" kicker="pipeline">
        <div className="adm-pair">
          <CodeBlock code={PIPELINE} label="build graph" testId="overview-pipeline" />
          <CodeBlock code={MARKUP.quickstart} label="quick start · index.html" testId="overview-quickstart" />
        </div>
      </Section>

      <Section title="Light and dark" kicker="same markup">
        <div className="adm-pair"><ThemeSample theme="light" /><ThemeSample theme="dark" /></div>
      </Section>

      <Section title="What gets generated" kicker={`${OUTPUTS.length} files`}>
        <div className="jp-table-wrap">
          <table className="jp-table" data-testid="overview-targets-table">
            <thead><tr><th>File</th><th>Target</th><th className="jp-num">Size</th></tr></thead>
            <tbody>
              {OUTPUTS.map((o) => (
                <tr key={o.id}><td className="jp-mono">{o.filename}</td><td>{o.target}</td><td className="jp-num">{(new Blob([o.build(tokens)]).size / 1024).toFixed(1)} kB</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="adm-row adm-gap-top">
          <Link to="/components/html" className="jp-btn jp-btn--primary" data-testid="overview-components-cta">Browse the HTML components</Link>
          <Link to="/components" className="jp-btn jp-btn--secondary" data-testid="overview-gallery-cta">Component gallery (React)</Link>
        </div>
      </Section>
    </>
  );
}
