import { useMemo, useState } from "react";
import { Badge, CodeBlock, PageHeader, Panel, Section, Tabs } from "@belikh/jupiter-ui/kit.tsx";
import { StatTile } from "@belikh/jupiter-ui/Charts.tsx";
import { useCopy } from "./copy.ts";
import { ansiPalette, generateEmailHTML, generateKioskCSS, generateMobileJSON, generateTerminalSh, generateXresources } from "@belikh/jupiter-tokens";
import { SPARK_A } from "./samples.ts";
import { useDs } from "./store.tsx";

type Tab = "email" | "terminal" | "kiosk" | "mobile";
const TABS: { id: Tab; label: string }[] = [
  { id: "email", label: "Email" },
  { id: "terminal", label: "SSH / terminal" },
  { id: "kiosk", label: "Kiosk touch" },
  { id: "mobile", label: "Mobile" },
];

function EmailTarget() {
  const { tokens } = useDs();
  const copyText = useCopy();
  const html = useMemo(() => generateEmailHTML(tokens), [tokens]);
  return (
    <div className="adm-stack">
      <div className="adm-row">
        <Badge s="info">table layout · inline styles · 600px</Badge>
        <Badge s="ok">light-safe colours</Badge>
        <Badge>system fonts only</Badge>
        <span className="adm-spacer" />
        <button type="button" className="jp-btn jp-btn--primary jp-btn--sm" data-testid="copy-email" onClick={() => copyText("jupiter-email.html", html)}>
          Copy jupiter-email.html
        </button>
      </div>
      <iframe title="Email preview" className="adm-mailframe" srcDoc={html} sandbox="" data-testid="email-preview-frame" />
      <CodeBlock code={html} label="jupiter-email.html" testId="email-code" maxHeight="20rem" />
    </div>
  );
}

type Seg = [string, number | undefined];
const W = 60;
const FRAME = 7;

/** Builds a fixed-width TUI screen as coloured segments (ANSI palette indices). */
function buildTui(): Seg[][] {
  const bar = (n: number, tot = 16) => "#".repeat(n) + ".".repeat(tot - n);
  const row = (segs: Seg[]): Seg[] => {
    const len = segs.reduce((a, [t]) => a + [...t].length, 0);
    return [["| ", FRAME], ...segs, [" ".repeat(Math.max(0, W - 2 - len)) + " |", FRAME]];
  };
  const title = " jupiter : ops@ssh-bastion.syd-1 ";
  const services: [string, string, number, string, number][] = [
    ["api.jupiter.au", "syd-1", 2, "+ OK", 5],
    ["mail-relay", "mel-1", 3, "! DEGRADED", 12],
    ["legacy-ftp", "per-1", 1, "x DOWN", 0],
    ["search", "syd-1", 6, "~ MAINT", 3],
  ];
  return [
    [["+-", FRAME], [title, 13], ["-".repeat(W - 1 - title.length) + "+", FRAME]],
    row([["SERVICE".padEnd(16) + "REGION".padEnd(8) + "STATE".padEnd(12) + "CPU", 7]]),
    ...services.map(([n, r, col, st, cpu]) =>
      row([
        [n.padEnd(16), undefined],
        [r.padEnd(8), 7],
        [st.padEnd(12), col],
        [bar(cpu), 5],
      ]),
    ),
    [["+" + "-".repeat(W) + "+", FRAME]],
    row([["[!] ", 3], ["mail-relay cert expires in 6 days", undefined]]),
    [["+" + "-".repeat(W) + "+", FRAME]],
  ];
}

function TerminalTarget() {
  const { tokens } = useDs();
  const copyText = useCopy();
  const p = useMemo(() => ansiPalette(tokens), [tokens]);
  const c = (i: number) => p.colors[i].hex;
  const sh = useMemo(() => generateTerminalSh(tokens), [tokens]);
  const xr = useMemo(() => generateXresources(tokens), [tokens]);
  const tui = useMemo(() => buildTui(), []);
  return (
    <div className="adm-stack">
      <div className="adm-row">
        <Badge s="info">ANSI 16 · OSC 4 · works over SSH</Badge>
        <span className="adm-spacer" />
        <button type="button" className="jp-btn jp-btn--primary jp-btn--sm" data-testid="copy-terminal" onClick={() => copyText("jupiter-terminal.sh", sh)}>
          Copy .sh
        </button>
        <button type="button" className="jp-btn jp-btn--secondary jp-btn--sm" data-testid="copy-xresources" onClick={() => copyText("jupiter.Xresources", xr)}>
          Copy .Xresources
        </button>
      </div>

      <div className="adm-crt" style={{ background: p.bg, color: p.fg }} data-testid="terminal-tui-preview">
        {tui.map((line, i) => (
          <span key={i}>
            {line.map(([text, col], j) => (
              <span key={j} style={col === undefined ? undefined : { color: c(col) }}>
                {text}
              </span>
            ))}
            {"\n"}
          </span>
        ))}
        <span style={{ color: c(2) }}>ops</span>
        <span style={{ color: c(7) }}>@</span>
        <span style={{ color: c(12) }}>bastion</span>
        <span style={{ color: c(7) }}>{" ~ $ "}</span>
        <span>jctl status --watch </span>
        <span className="adm-cursor" style={{ background: p.cursor }} />
      </div>

      <div className="adm-ansi" data-testid="ansi-palette">
        {p.colors.map((col) => (
          <div key={col.index} className="adm-ansi__cell">
            <span className="adm-ansi__chip" style={{ background: col.hex }} />
            <span className="jp-mono">
              {String(col.index).padStart(2, "0")} {col.name}
            </span>
            <span className="jp-mono jp-muted">
              {col.hex} · {col.role}
            </span>
          </div>
        ))}
      </div>
      <div className="adm-pair">
        <CodeBlock code={sh} label="jupiter-terminal.sh" testId="terminal-code" maxHeight="18rem" />
        <CodeBlock code={xr} label="jupiter.Xresources" testId="xresources-code" maxHeight="18rem" />
      </div>
    </div>
  );
}

function KioskTarget() {
  const { tokens } = useDs();
  const copyText = useCopy();
  const css = useMemo(() => generateKioskCSS(tokens), [tokens]);
  const scoped = useMemo(() => generateKioskCSS(tokens, ".jp-kiosk"), [tokens]);
  const [lang, setLang] = useState("English");
  const [access, setAccess] = useState(false);
  const [step, setStep] = useState(0);
  return (
    <div className="adm-stack">
      <style>{scoped}</style>
      <div className="adm-row">
        <Badge s="info">min target {tokens.kiosk.minTarget}px</Badge>
        <Badge>type ×{tokens.kiosk.typeScale}</Badge>
        <Badge>space ×{tokens.kiosk.spaceScale}</Badge>
        <span className="adm-spacer" />
        <button type="button" className="jp-btn jp-btn--primary jp-btn--sm" data-testid="copy-kiosk" onClick={() => copyText("jupiter-kiosk.css", css)}>
          Copy jupiter-kiosk.css
        </button>
      </div>
      <div className="jp-kiosk adm-kioskbox" data-testid="kiosk-preview">
        <div className="adm-stack adm-stack--lg adm-kioskbox__inner">
          <div className="adm-row adm-between">
            <span className="jp-label">Jupiter · front desk · step {step + 1} of 3</span>
            <span className="jp-badge jp-badge--ok">online</span>
          </div>
          <h2 className="jp-display">
            {step === 0 ? "Welcome. Tap to check in." : step === 1 ? "Who are you visiting?" : "You're checked in."}
          </h2>
          <div className="adm-grid adm-grid--2">
            <label className="jp-field">
              <span className="jp-label">Language</span>
              <select className="jp-select" value={lang} onChange={(e) => setLang(e.target.value)} data-testid="kiosk-language-select">
                <option>English</option>
                <option>中文</option>
                <option>Tiếng Việt</option>
              </select>
            </label>
            <label className="jp-inline adm-selfend">
              <input type="checkbox" role="switch" className="jp-toggle" checked={access} onChange={(e) => setAccess(e.target.checked)} data-testid="kiosk-access-toggle" />
              <span>Accessibility assistance</span>
            </label>
          </div>
          <div className="adm-row">
            <button type="button" className="jp-btn jp-btn--primary" data-testid="kiosk-next" onClick={() => setStep((s) => (s + 1) % 3)}>
              {step === 2 ? "Start again" : "Continue →"}
            </button>
            <button type="button" className="jp-btn jp-btn--secondary" data-testid="kiosk-back" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
              Back
            </button>
            <button type="button" className="jp-btn jp-btn--ghost">Help</button>
          </div>
        </div>
      </div>
      <CodeBlock code={css} label="jupiter-kiosk.css" testId="kiosk-code" maxHeight="18rem" />
    </div>
  );
}

function MobileTarget() {
  const { tokens } = useDs();
  const copyText = useCopy();
  const json = useMemo(() => generateMobileJSON(tokens), [tokens]);
  const [push, setPush] = useState(true);
  return (
    <div className="adm-stack">
      <div className="adm-row">
        <Badge s="info">W3C design-tokens JSON</Badge>
        <Badge>dp · pt</Badge>
        <span className="adm-spacer" />
        <button type="button" className="jp-btn jp-btn--primary jp-btn--sm" data-testid="copy-mobile" onClick={() => copyText("jupiter.mobile.json", json)}>
          Copy jupiter.mobile.json
        </button>
      </div>
      <div className="adm-pair adm-pair--top">
        <div className="adm-row adm-center" data-testid="mobile-preview">
          {(["light", "dark"] as const).map((th) => (
            <div key={th} className="adm-device">
              <div className="adm-device__screen" data-theme={th}>
                <div className="jp-mono adm-device__status">
                  <span>9:41</span>
                  <span>▮▮▮ 5G</span>
                </div>
                <div className="adm-stack adm-device__body">
                  <span className="jp-label">jupiter · {th}</span>
                  <h3>Good morning</h3>
                  <StatTile label="Usage this month" value="48.2" unit="GB" spark={SPARK_A} />
                  <Panel title="plan">
                    <div className="adm-row adm-between">
                      <span>Fibre 250</span>
                      <span className="jp-badge jp-badge--ok">active</span>
                    </div>
                  </Panel>
                  <label className="jp-inline">
                    <input type="checkbox" role="switch" className="jp-toggle" checked={push} onChange={(e) => setPush(e.target.checked)} data-testid={`mobile-push-toggle-${th}`} />
                    <span>Push alerts</span>
                  </label>
                  <button type="button" className="jp-btn jp-btn--primary">
                    Pay bill
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <CodeBlock code={json} label="jupiter.mobile.json" testId="mobile-code" maxHeight="32rem" />
      </div>
    </div>
  );
}

export function DsTargets() {
  const [tab, setTab] = useState<Tab>("email");
  return (
    <>
      <PageHeader eyebrow="ship" title="Targets">
        <p>Same tokens, built for each platform. Web apps and SPAs just use jupiter.css. Previews of the others are below.</p>
      </PageHeader>
      <Tabs tabs={TABS.map((t) => ({ id: t.id, label: <span data-testid={`target-tab-${t.id}`}>{t.label}</span> }))} value={tab} onChange={(id) => setTab(id as Tab)} />
      <Section title={TABS.find((t) => t.id === tab)!.label} kicker="preview">
        <div role="tabpanel" data-testid={`target-panel-${tab}`}>
          {tab === "email" && <EmailTarget />}
          {tab === "terminal" && <TerminalTarget />}
          {tab === "kiosk" && <KioskTarget />}
          {tab === "mobile" && <MobileTarget />}
        </div>
      </Section>
    </>
  );
}
