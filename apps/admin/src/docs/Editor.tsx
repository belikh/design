import { useMemo, useRef, useState } from "react";
import { Badge, Callout, PageHeader, Panel, Tabs } from "@belikh/jupiter-ui/kit.tsx";
import { StatTile } from "@belikh/jupiter-ui/Charts.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { checkContrast, isHex } from "@belikh/jupiter-tokens";
import { OUTPUTS } from "@belikh/jupiter-tokens";
import { useCopy } from "./copy.ts";
import { SPARK_A } from "./samples.ts";
import { useDs } from "./store.tsx";
import { ThemeBox } from "./docs.tsx";
import { FONT_PRESETS, ROLE_LABELS, ROLE_ORDER, TYPE_NAMES, isTokens, type ColorRole, type Tokens } from "@belikh/jupiter-tokens";
import { ContrastTable } from "./Tokens.tsx";

const EASINGS = [
  { label: "standard ease-out", value: "cubic-bezier(0.2, 0, 0, 1)" },
  { label: "ease-out (CSS)", value: "ease-out" },
  { label: "expo ease-out", value: "cubic-bezier(0.16, 1, 0.3, 1)" },
  { label: "linear", value: "linear" },
];

function NumField({ label, value, onCommit, min = 0, max = 999, step = 1, testId }: { label: string; value: number; onCommit: (n: number) => void; min?: number; max?: number; step?: number; testId: string }) {
  const [draft, setDraft] = useState(String(value));
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setDraft(String(value));
  }
  const n = Number(draft);
  const valid = draft.trim() !== "" && Number.isFinite(n) && n >= min && n <= max;
  return (
    <label className="jp-field">
      <span className="jp-label">{label}</span>
      <input
        className="jp-input jp-input--mono"
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={draft}
        aria-invalid={!valid}
        data-testid={testId}
        onChange={(e) => {
          setDraft(e.target.value);
          const v = Number(e.target.value);
          if (e.target.value.trim() !== "" && Number.isFinite(v) && v >= min && v <= max) onCommit(v);
        }}
      />
    </label>
  );
}

function ColorRow({ role, value, onCommit, mode }: { role: ColorRole; value: string; onCommit: (v: string) => void; mode: string }) {
  const full = (v: string) => (v.length === 4 ? "#" + v.slice(1).split("").map((c) => c + c).join("") : v);
  const [draft, setDraft] = useState(value);
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    // keep what is being typed (a short hex while the long form is committed); only follow outside changes (picker, import, reset)
    if (full(draft.trim().toLowerCase()) !== value) setDraft(value);
  }
  return (
    <div className="adm-colorrow">
      <span className="jp-mono adm-note">{ROLE_LABELS[role]}</span>
      <input type="color" aria-label={`${ROLE_LABELS[role]} colour`} value={full(value)} onChange={(e) => onCommit(e.target.value)} data-testid={`editor-color-picker-${mode}-${role}`} />
      <input
        className="jp-input jp-input--mono"
        value={draft}
        aria-invalid={!isHex(draft)}
        aria-label={`${ROLE_LABELS[role]} hex`}
        data-testid={`editor-color-hex-${mode}-${role}`}
        onChange={(e) => {
          setDraft(e.target.value);
          if (isHex(e.target.value)) onCommit(full(e.target.value.trim().toLowerCase()));
        }}
      />
    </div>
  );
}

function Preview({ theme }: { theme: "light" | "dark" }) {
  const [on, setOn] = useState(true);
  return (
    <ThemeBox theme={theme} testId={`editor-preview-${theme}`}>
      <div className="adm-stack">
      <span className="jp-label">{theme}</span>
      <div className="adm-row">
        <button type="button" className="jp-btn jp-btn--primary">Primary</button>
        <button type="button" className="jp-btn jp-btn--secondary">Secondary</button>
        <button type="button" className="jp-btn jp-btn--ghost">Ghost</button>
      </div>
      <div className="adm-inputrow">
        <label className="jp-field">
          <span className="jp-label">Input</span>
          <input className="jp-input" placeholder="placeholder text" />
        </label>
        <input type="checkbox" role="switch" className="jp-toggle" checked={on} onChange={(e) => setOn(e.target.checked)} aria-label="Preview toggle" />
      </div>
      <div className="adm-row">
        <Badge s="ok">ok</Badge>
        <Badge s="warn">warn</Badge>
        <Badge s="danger">danger</Badge>
        <Badge s="info">info</Badge>
      </div>
      <Panel title="panel · title bar">
        <StatTile label="Throughput" value="1,284" unit="req/s" trend={{ dir: "up", text: "3.2%" }} spark={SPARK_A} />
      </Panel>
      <Callout variant="warn" title="Warn">Text on the warn background.</Callout>
      </div>
    </ThemeBox>
  );
}

export function DsEditor() {
  const copyText = useCopy();
  const { toast } = usePrefs();
  const { tokens: t, setTokens, resetTokens, replaceTokens, isCustom, setMode } = useDs();
  const [cmode, setCmode] = useState<"light" | "dark">("light");
  const fileRef = useRef<HTMLInputElement>(null);
  const fails = useMemo(
    () => ({
      light: checkContrast(t.color.light).filter((r) => !r.pass && r.kind === "text").length,
      dark: checkContrast(t.color.dark).filter((r) => !r.pass && r.kind === "text").length,
    }),
    [t],
  );
  const sansPreset = FONT_PRESETS.sans.find((p) => p.value === t.font.sans)?.value ?? "custom";
  const monoPreset = FONT_PRESETS.mono.find((p) => p.value === t.font.mono)?.value ?? "custom";

  const set = (fn: (d: Tokens) => void) => setTokens(fn);

  const importFile = async (f: File) => {
    try {
      const parsed: unknown = JSON.parse(await f.text());
      if (!isTokens(parsed)) throw new Error("not a jupiter tokens file");
      replaceTokens(parsed);
      toast({ kind: "ok", title: `Imported ${f.name}` });
    } catch (e) {
      toast({ kind: "danger", title: `Import failed: ${e instanceof Error ? e.message : "invalid JSON"}` });
    }
  };

  return (
    <>
      <PageHeader eyebrow="ship" title="Token editor">
        <p>Change a token and the whole site updates straight away. Your edits are saved in this browser's localStorage and aren't sent anywhere. When you're happy, copy jupiter.tokens.json into packages/tokens/ in the design-system repo and release; every project that depends on @belikh/jupiter-tokens picks it up.</p>
      </PageHeader>

      <div className="adm-row adm-gap-bottom" data-testid="editor-toolbar">
        <button type="button" className="jp-btn jp-btn--primary" onClick={() => copyText("jupiter.tokens.json", OUTPUTS[0].build(t))} data-testid="editor-copy-tokens">
          Copy jupiter.tokens.json
        </button>
        <button type="button" className="jp-btn jp-btn--secondary" onClick={() => fileRef.current?.click()} data-testid="editor-import">
          Import…
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          data-testid="editor-import-input"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importFile(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          className="jp-btn jp-btn--ghost"
          disabled={!isCustom}
          data-testid="editor-reset"
          onClick={() => {
            resetTokens();
            toast({ kind: "ok", title: "Tokens reset to defaults" });
          }}
        >
          Reset to defaults
        </button>
        <span className="adm-spacer" />
        <Badge s={isCustom ? "warn" : "ok"} testId="editor-state-badge">
          {isCustom ? "custom" : "default"}
        </Badge>
        <Badge s={fails.light + fails.dark === 0 ? "ok" : "danger"} testId="editor-aa-badge">
          {fails.light + fails.dark === 0 ? "AA pass" : `${fails.light + fails.dark} AA fail`}
        </Badge>
      </div>

      <div className="adm-tokened">
        <aside className="adm-tokened__aside" data-testid="editor-controls">
          <Panel title="colour roles">
            <div className="adm-gap-bottom">
              <Tabs
                tabs={(["light", "dark"] as const).map((m) => ({ id: m, label: <span data-testid={`editor-mode-${m}`}>{m} {fails[m] > 0 && <span className="adm-danger-text">· {fails[m]}</span>}</span> }))}
                value={cmode}
                onChange={(m) => { setCmode(m as "light" | "dark"); setMode(m as "light" | "dark"); }}
              />
            </div>
            <div className="adm-stack adm-stack--xs">
              {ROLE_ORDER.map((r) => (
                <ColorRow key={`${cmode}-${r}`} role={r} mode={cmode} value={t.color[cmode][r]} onCommit={(v) => set((d) => void (d.color[cmode][r] = v))} />
              ))}
            </div>
          </Panel>

          <Panel title="type">
            <div className="adm-stack">
              <label className="jp-field">
                <span className="jp-label">Sans (prose)</span>
                <select className="jp-select" value={sansPreset} data-testid="editor-font-sans" onChange={(e) => e.target.value !== "custom" && set((d) => void (d.font.sans = e.target.value))}>
                  {FONT_PRESETS.sans.map((p) => (
                    <option key={p.label} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                  {sansPreset === "custom" && <option value="custom">custom</option>}
                </select>
              </label>
              <label className="jp-field">
                <span className="jp-label">Mono (data)</span>
                <select className="jp-select" value={monoPreset} data-testid="editor-font-mono" onChange={(e) => e.target.value !== "custom" && set((d) => void (d.font.mono = e.target.value))}>
                  {FONT_PRESETS.mono.map((p) => (
                    <option key={p.label} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                  {monoPreset === "custom" && <option value="custom">custom</option>}
                </select>
              </label>
              <div className="adm-numgrid">
                {t.type.scale.map((s, i) => (
                  <NumField key={i} label={`fs-${TYPE_NAMES[i]}`} value={s} min={8} max={96} testId={`editor-type-${i}`} onCommit={(n) => set((d) => void (d.type.scale[i] = n))} />
                ))}
                <NumField label="lh body" value={t.type.lineHeightBody} min={1} max={2.5} step={0.05} testId="editor-lh-body" onCommit={(n) => set((d) => void (d.type.lineHeightBody = n))} />
                <NumField label="lh head" value={t.type.lineHeightHeading} min={1} max={2} step={0.05} testId="editor-lh-heading" onCommit={(n) => set((d) => void (d.type.lineHeightHeading = n))} />
              </div>
            </div>
          </Panel>

          <Panel title="space · radii · controls">
            <div className="adm-numgrid">
              {t.space.map((s, i) => (
                <NumField key={i} label={`space-${i + 1}`} value={s} min={0} max={256} testId={`editor-space-${i}`} onCommit={(n) => set((d) => void (d.space[i] = n))} />
              ))}
              <NumField label="radius-sm" value={t.radius.sm} max={24} testId="editor-radius-sm" onCommit={(n) => set((d) => void (d.radius.sm = n))} />
              <NumField label="radius-md" value={t.radius.md} max={32} testId="editor-radius-md" onCommit={(n) => set((d) => void (d.radius.md = n))} />
              <NumField label="control-h" value={t.control.height} min={20} max={64} testId="editor-control-h" onCommit={(n) => set((d) => void (d.control.height = n))} />
              <NumField label="kiosk target" value={t.kiosk.minTarget} min={44} max={96} testId="editor-kiosk-target" onCommit={(n) => set((d) => void (d.kiosk.minTarget = n))} />
            </div>
          </Panel>

          <Panel title="motion">
            <div className="adm-stack">
              <div className="adm-numgrid">
                <NumField label="fast ms" value={t.motion.fast} max={2000} testId="editor-motion-fast" onCommit={(n) => set((d) => void (d.motion.fast = n))} />
                <NumField label="base ms" value={t.motion.base} max={2000} testId="editor-motion-base" onCommit={(n) => set((d) => void (d.motion.base = n))} />
                <NumField label="slow ms" value={t.motion.slow} max={2000} testId="editor-motion-slow" onCommit={(n) => set((d) => void (d.motion.slow = n))} />
              </div>
              <label className="jp-field">
                <span className="jp-label">Easing</span>
                <select className="jp-select" value={t.motion.easing} data-testid="editor-easing" onChange={(e) => set((d) => void (d.motion.easing = e.target.value))}>
                  {EASINGS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Panel>
        </aside>

        <div className="adm-stack adm-stack--lg adm-shrink">
          {fails.light + fails.dark > 0 ? (
            <Callout variant="danger" title="Contrast below WCAG AA" testId="editor-aa-warning">
              {fails.light} light and {fails.dark} dark text pair{fails.light + fails.dark > 1 ? "s" : ""} fall under 4.5:1. Failing pairs are listed below.
            </Callout>
          ) : (
            <Callout title="Contrast OK" testId="editor-aa-ok">
              All text/background pairs pass WCAG AA in light and dark.
            </Callout>
          )}
          <div className="adm-stack">
            <ContrastTable mode="light" colors={t.color.light} onlyFailures />
            <ContrastTable mode="dark" colors={t.color.dark} onlyFailures />
          </div>
          <div className="adm-grid adm-grid--2">
            <Preview theme="light" />
            <Preview theme="dark" />
          </div>
          <Panel title="regenerated outputs" flush>
            <div className="jp-table-wrap adm-bare">
              <table className="jp-table" data-testid="editor-outputs-table">
                <thead>
                  <tr>
                    <th>File</th>
                    <th className="jp-num">Size</th>
                    <th><span className="adm-sr">Copy</span></th>
                  </tr>
                </thead>
                <tbody>
                  {OUTPUTS.map((o) => (
                    <tr key={o.id}>
                      <td className="jp-mono">{o.filename}</td>
                      <td className="jp-num">{(new Blob([o.build(t)]).size / 1024).toFixed(1)} kB</td>
                      <td className="adm-end">
                        <button type="button" className="jp-btn jp-btn--ghost jp-btn--sm" data-testid={`editor-copy-${o.id}`} onClick={() => copyText(o.filename, o.build(t))}>
                          copy
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
