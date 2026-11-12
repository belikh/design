import { useState } from "react";
import { ROLE_LABELS, ROLE_ORDER, TYPE_NAMES, checkContrast, cssVarName, type ColorSet } from "@belikh/jupiter-tokens";
import { Badge, PageHeader, Panel, Section } from "@belikh/jupiter-ui/kit.tsx";
import { useDs } from "./store.tsx";

function Swatches({ mode, colors }: { mode: "light" | "dark"; colors: ColorSet }) {
  return (
    <Panel title={`${mode} · ${ROLE_ORDER.length} roles`} testId={`swatches-${mode}`}>
      {ROLE_ORDER.map((r) => (
        <div className="adm-role" key={r}>
          <span className="adm-role__chip" style={{ background: colors[r] }} />
          <span className="adm-role__text">
            <span><b>{ROLE_LABELS[r]}</b> <code className="jp-muted">var({cssVarName(r)})</code></span>
            <code data-testid={`swatch-${mode}-${r}`}>{colors[r]}</code>
          </span>
        </div>
      ))}
    </Panel>
  );
}

export function ContrastTable({ mode, colors, onlyFailures = false }: { mode: "light" | "dark"; colors: ColorSet; onlyFailures?: boolean }) {
  const all = checkContrast(colors);
  const rows = all.filter((r) => !onlyFailures || !r.pass);
  const fails = all.filter((r) => !r.pass && r.kind === "text").length;
  return (
    <div data-testid={`contrast-${mode}`}>
      <div className="adm-row adm-gap-bottom">
        <span className="jp-label">{mode}</span>
        {fails === 0 ? <Badge s="ok" testId={`contrast-${mode}-summary`}>all text pairs pass AA</Badge> : <Badge s="danger" testId={`contrast-${mode}-summary`}>{fails} text pair{fails > 1 ? "s" : ""} fail AA</Badge>}
      </div>
      {rows.length > 0 && (
        <div className="jp-table-wrap adm-tall">
          <table className="jp-table">
            <thead><tr><th>Sample</th><th>Foreground / background</th><th className="jp-num">Ratio</th><th className="jp-num">Min</th><th>Result</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.fg}-${r.bg}`} data-testid={`contrast-row-${mode}-${r.fg}-${r.bg}`}>
                  <td><span className="jp-mono adm-aa" style={{ background: colors[r.bg], color: colors[r.fg], boxShadow: `inset 0 0 0 1px ${colors.border}` }}>Aa 123</span></td>
                  <td className="jp-mono">{ROLE_LABELS[r.fg]} / {ROLE_LABELS[r.bg]}</td>
                  <td className="jp-num">{r.ratio.toFixed(2)}:1</td>
                  <td className="jp-num">{r.min}</td>
                  <td>{r.kind === "ui" ? <Badge s={r.pass ? "info" : "warn"}>{r.pass ? "visible" : "faint"} · hairline</Badge> : r.pass ? <Badge s="ok">pass AA{r.ratio >= 7 ? "A" : ""}</Badge> : <Badge s="danger">fail</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MotionDemo({ label, ms, easing }: { label: string; ms: number; easing: string }) {
  const [on, setOn] = useState(false);
  return (
    <div className="adm-motion">
      <code>{label} <span className="jp-muted">{ms}ms</span></code>
      <div className="adm-motion__track"><span className="adm-motion__dot" data-on={on || undefined} style={{ transition: `transform var(--jp-dur-${label}) var(--jp-ease)` }} /></div>
      <button type="button" className="jp-btn jp-btn--secondary jp-btn--sm" data-testid={`motion-play-${label}`} onClick={() => setOn((v) => !v)}>play</button>
      <span className="adm-sr">{easing}</span>
    </div>
  );
}

export function DsTokens() {
  const { tokens: t } = useDs();
  return (
    <>
      <PageHeader eyebrow="foundations" title="Tokens">
        <p>Components only use semantic roles, never raw hex values. Everything on this page is read from <code>jupiter.tokens.json</code>.</p>
      </PageHeader>

      <Section id="colour" title="Colour roles" kicker="color.light · color.dark">
        <div className="adm-pair"><Swatches mode="light" colors={t.color.light} /><Swatches mode="dark" colors={t.color.dark} /></div>
      </Section>

      <Section id="contrast" title="Contrast (WCAG 2.x)" kicker="AA = 4.5:1 for text">
        <div className="adm-stack adm-stack--lg">
          <ContrastTable mode="light" colors={t.color.light} />
          <ContrastTable mode="dark" colors={t.color.dark} />
        </div>
      </Section>

      <Section id="type" title="Type scale" kicker={`ratio ≈ 1.25 · body ${t.type.lineHeightBody} · headings ${t.type.lineHeightHeading}`}>
        <div className="jp-table-wrap adm-tall">
          <table className="jp-table" data-testid="type-scale-table">
            <thead><tr><th>Token</th><th className="jp-num">px</th><th>Sans (prose)</th><th>Mono (data)</th></tr></thead>
            <tbody>
              {t.type.scale.map((s, i) => (
                <tr key={i}>
                  <td className="jp-mono">--jp-fs-{TYPE_NAMES[i]}</td>
                  <td className="jp-num">{s}</td>
                  <td style={{ fontSize: s, lineHeight: i > 2 ? t.type.lineHeightHeading : t.type.lineHeightBody }}>Jupiter rises</td>
                  <td className="jp-mono" style={{ fontSize: s }}>1,284,031</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="adm-pair adm-gap-top">
          <Panel title="font-sans"><code className="adm-note adm-break">{t.font.sans}</code></Panel>
          <Panel title="font-mono · tabular-nums">
            <code className="adm-note adm-break">{t.font.mono}</code>
            <div className="jp-mono adm-gap-top">111.11<br />888.88</div>
          </Panel>
        </div>
      </Section>

      <Section id="space" title="Space" kicker="4px base grid">
        <div className="adm-stack adm-stack--xs" data-testid="space-scale">
          {t.space.map((s, i) => (
            <div key={i} className="adm-spacerow">
              <code>--jp-space-{i + 1}</code>
              <span className="jp-mono jp-muted adm-end">{s}px</span>
              <span className="adm-spacerow__bar" style={{ width: s }} />
            </div>
          ))}
        </div>
      </Section>

      <Section id="shape" title="Radii & lines" kicker="2 · 6 · full">
        <div className="adm-row adm-row--lg">
          {[["--jp-radius-sm", `${t.radius.sm}px`, "inputs, chips"], ["--jp-radius-md", `${t.radius.md}px`, "cards, panels"], ["--jp-radius-full", "9999px", "pills"]].map(([v, n, u]) => (
            <div key={v} className="adm-shape">
              <span className="adm-shape__box" style={{ borderRadius: `var(${v})` }} />
              <code>{v}</code>
              <span className="jp-muted adm-note">{n} · {u}</span>
            </div>
          ))}
          <div className="adm-shape">
            <span className="adm-shape__box adm-shape__box--rules" />
            <code>1px hairline</code>
            <span className="jp-muted adm-note">for structure, not decoration</span>
          </div>
        </div>
      </Section>

      <Section id="motion" title="Motion" kicker="ease-out · off under prefers-reduced-motion">
        <div data-testid="motion-demos">
          <MotionDemo label="fast" ms={t.motion.fast} easing={t.motion.easing} />
          <MotionDemo label="base" ms={t.motion.base} easing={t.motion.easing} />
          <MotionDemo label="slow" ms={t.motion.slow} easing={t.motion.easing} />
        </div>
        <p className="jp-muted adm-note adm-gap-top"><code>--jp-ease: {t.motion.easing}</code></p>
      </Section>
    </>
  );
}
