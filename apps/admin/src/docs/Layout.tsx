import { useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { Badge, CodeBlock, PageHeader, Section } from "@belikh/jupiter-ui/kit.tsx";
import { MARKUP } from "./samples.ts";
import { useDs } from "./store.tsx";

const subscribe = (cb: () => void) => {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
};

export function DsLayout() {
  const { tokens: t } = useDs();
  const width = useSyncExternalStore(subscribe, () => window.innerWidth, () => 1280);
  const [sm, md, lg] = t.layout.breakpoints;
  const bps = [
    { name: "base", min: 0, prefix: "jp-col-", note: `phones · ${t.layout.gutter}px gutter` },
    { name: "sm", min: sm, prefix: "jp-sm-", note: `large phones, small tablets · ${t.space[4]}px gutter` },
    { name: "md", min: md, prefix: "jp-md-", note: "tablets, laptops" },
    { name: "lg", min: lg, prefix: "jp-lg-", note: "desktops · container max" },
  ];
  const active = [...bps].reverse().find((b) => width >= b.min)?.name;

  return (
    <>
      <PageHeader eyebrow="foundations" title="Layout">
        <p>Mobile first. There are two layouts to know about: a reading column for prose and a 12-column grid for dashboards.</p>
      </PageHeader>

      <Section title="Breakpoints" kicker={`viewport ${width}px`}>
        <div className="jp-table-wrap">
          <table className="jp-table" data-testid="breakpoints-table">
            <thead>
              <tr>
                <th>Name</th>
                <th className="jp-num">Min width</th>
                <th>Class prefix</th>
                <th>Use</th>
                <th>Now</th>
              </tr>
            </thead>
            <tbody>
              {bps.map((b) => (
                <tr key={b.name}>
                  <td className="jp-mono">{b.name}</td>
                  <td className="jp-num">{b.min}px</td>
                  <td className="jp-mono">.{b.prefix}N</td>
                  <td>{b.note}</td>
                  <td>{active === b.name ? <Badge s="info" testId="breakpoint-active">active</Badge> : <span className="jp-muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="12-column grid" kicker={`${t.layout.columns} cols · ${t.space[3]}px gap`}>
        <div className="adm-gridviz adm-gap-bottom" aria-hidden="true">
          {Array.from({ length: t.layout.columns }, (_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
        <div className="jp-grid" data-testid="grid-demo">
          <div className="jp-col-12 jp-sm-6 jp-lg-3 adm-colblock">col-12 sm-6 lg-3</div>
          <div className="jp-col-12 jp-sm-6 jp-lg-3 adm-colblock">col-12 sm-6 lg-3</div>
          <div className="jp-col-12 jp-sm-6 jp-lg-3 adm-colblock">col-12 sm-6 lg-3</div>
          <div className="jp-col-12 jp-sm-6 jp-lg-3 adm-colblock">col-12 sm-6 lg-3</div>
          <div className="jp-col-12 jp-md-8 adm-colblock">col-12 md-8</div>
          <div className="jp-col-12 jp-md-4 adm-colblock">col-12 md-4</div>
        </div>
        <p className="jp-muted adm-note adm-gap-top">
          Resize the window and the spans change. The <Link to="/dashboard" data-testid="layout-dashboard-link">sample dashboard</Link> uses the same grid.
        </p>
      </Section>

      <Section title="Reading column" kicker={`max ${t.layout.readingMeasure}ch`}>
        <article className="jp-prose adm-reading" data-testid="reading-column">
          <h2>Why stop at 72 characters?</h2>
          <p>
            Long lines are tiring to read and short ones feel choppy. Somewhere between 60 and 75 characters is comfortable, so prose stops at{" "}
            {t.layout.readingMeasure}ch of the current font. Tables, logs and dashboards aren't prose, so they get the full grid.
          </p>
          <p>
            Body text in here goes up to 16px with a line height of {t.type.lineHeightBody}, and headings use {t.type.lineHeightHeading}. Numbers are tabular
            everywhere, so 1,111.11 lines up under 8,888.88.
          </p>
        </article>
      </Section>

      <Section title="Markup" kicker="copy">
        <CodeBlock code={MARKUP.grid} label="layout.html" testId="layout-markup" />
      </Section>
    </>
  );
}
