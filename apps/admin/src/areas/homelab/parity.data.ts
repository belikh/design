/** "na" = not applicable: the medium cannot or should not do it. Every "na" cell must carry a reason (see `reasons`). */
export type Level = "yes" | "partial" | "no" | "na";
export type Target = "tui" | "slint" | "gtk" | "latex";
export type View = { id: string; view: string; web: string; tui: Level; slint: Level; gtk: Level; latex: Level; evidence: string[]; note: string; /** Why a cell is "na" or "partial", per target. */ reasons?: Partial<Record<Target, string>> };
export const TARGETS: Target[] = ["tui", "slint", "gtk", "latex"];

const TUI = "packages/rust/examples/tui_dashboard.rs";
const SLINT = "examples/slint/ui/pages";
const GTK = "examples/gtk/src/main.rs";
const REPORT = "packages/latex/templates/report-generated.tex";
const DATA = "examples/data/sample.rs";
const NOT_A_DOC = "A printed report is a static export of the data; a live UI has no equivalent and shows the same data on its own pages.";

/**
 * Evidence paths are relative to the repo root and are checked to exist by the tests (and must be tracked, not generated copies).
 * How each "yes" was verified:
 *  - TUI: `cargo test --all-features` in packages/rust renders every page into a ratatui TestBackend and asserts on the buffer
 *    (CI runs it); the example was also run in a pty and with `--dump <page>`.
 *  - Slint / GTK: built with cargo and rendered to PNG with `--page <name> --screenshot`, with Settings switches exercised
 *    (Slint `--click`, GTK `--toggle`). CI does NOT build these two demos, so that evidence is local only.
 *  - LaTeX: `npm run export:sample` writes the .tex from the web fixtures, CI compiles templates/*.tex and `npm run check:sample` fails when stale.
 */
export const PARITY: View[] = [
  { id: "overview", view: "Service status overview", web: "/domain/service-health", tui: "yes", slint: "yes", gtk: "yes", latex: "yes", evidence: [`${TUI}`, `${SLINT}/overview.slint`, GTK, REPORT, DATA], note: "Stat tiles (average uptime, open incidents, firing rules) and a service table with status badges, from the web service-health fixtures. LaTeX: the Service status section of the generated report." },
  { id: "metrics", view: "Metrics", web: "/analytics", tui: "yes", slint: "yes", gtk: "yes", latex: "yes", evidence: [TUI, `${SLINT}/metrics.slint`, GTK, REPORT, DATA], note: "24 h p95 latency bar sparklines per service plus error-budget meters (ratatui Sparkline and Gauge, Slint bars, cairo bars). LaTeX: a TikZ sparkline table of latency, errors and CPU. Not the web's interactive range picker or chart zoom." },
  { id: "alerts", view: "Alerts", web: "/inbox", tui: "yes", slint: "yes", gtk: "yes", latex: "yes", evidence: [TUI, `${SLINT}/alerts.slint`, GTK, REPORT, DATA], note: "Incidents and alert rules with severity, state and duration; the 'show resolved incidents' setting filters them. LaTeX: incident and rule tables. Rules are evaluated with the web's evaluateRule over the same series." },
  { id: "settings", view: "Settings", web: "/settings", tui: "yes", slint: "yes", gtk: "yes", latex: "na", evidence: [TUI, `${SLINT}/settings.slint`, GTK, "packages/tokens/src/generate.ts"], note: "Three working settings in every UI target: dark theme, compact density (from the generated density tokens, which this work added to the Slint and Rust generators) and show resolved incidents. Not the web's full preference list.", reasons: { latex: "A printed document has no runtime settings; theme, density and fonts are build-time choices (jupiter-tokens.sty, JUPITER_LATEX_OUT, fonts/)." } },
  { id: "theme", view: "Theme (light and dark tokens)", web: "/chrome", tui: "yes", slint: "yes", gtk: "yes", latex: "yes", evidence: ["packages/rust/src/tui.rs", TUI, "examples/slint/ui/components.slint", "packages/rust/README.md", "packages/latex/src/jupiter.sty"], note: "Every target reads the generated tokens: ratatui Theme (tui.rs), the Slint Jupiter global, the GTK named-colour CSS plus the jupiter-theme palette, jupiter-tokens.sty. egui and iced adapters also exist in packages/rust." },
  { id: "invoice", view: "Billing: invoice", web: "/domain/billing", tui: "yes", slint: "yes", gtk: "yes", latex: "yes", evidence: [TUI, `${SLINT}/invoice.slint`, GTK, "packages/latex/templates/invoice-generated.tex", "packages/latex/src/jupiter-invoice.cls", "scripts/export-sample.mjs"], note: "The newest invoice (INV-0042: lines, subtotal, GST, total) in each UI; LaTeX compiles the same invoice through the web's own invoiceTex() and CI builds it (total checked to $3,091.55). Display only: no invoice editor or numbering outside the web." },
  { id: "documents", view: "Documents (letters, resumes, notes)", web: "/domain/documents", tui: "yes", slint: "yes", gtk: "yes", latex: "yes", evidence: [TUI, `${SLINT}/documents.slint`, GTK, DATA, "packages/latex/templates/letter-formal.tex", "packages/latex/templates/resume-classic.tex", "packages/latex/templates/notes.tex"], note: "LaTeX is the native home of these. Each UI lists the templates, letters and built PDFs from the web fixtures and shows the LaTeX source of the selected item in a preview pane (templates read from packages/latex, letters through the web letterTex()). Source view only: no content editor, as the web page has." },
  { id: "network", view: "Network (topology, VLANs, firewall)", web: "/home/network", tui: "yes", slint: "yes", gtk: "yes", latex: "yes", evidence: [TUI, `${SLINT}/network.slint`, GTK, REPORT, "apps/admin/src/areas/homelab/network.data.ts"], note: "A topology drawn from each device's uplink (ratatui tree, Slint and cairo boxes with elbow connectors, a TikZ diagram in the report) coloured by status, plus VLAN, device and firewall tables, from the web network fixtures. Read-only: no VLAN or rule forms." },
  { id: "tables", view: "Data tables with in-place edit", web: "/tables", tui: "yes", slint: "yes", gtk: "yes", latex: "na", evidence: [TUI, `${SLINT}/tables.slint`, GTK, "packages/ui/src/DataTable.tsx"], note: "The invoice table in each UI sorts by column, selects rows and edits Client (text), Status (choice, validated) and Total (number, validated) cells in place: Enter commits, Escape cancels, invalid input stays open with a message, as in the web table. TUI keys: left/right column, Enter edit; Slint and GTK: click the cell. No filtering, paging or export.", reasons: { latex: "A PDF cannot be edited in place. The same data renders as booktabs tables in the generated report (see the report row)." } },
  { id: "report", view: "Any dashboard as a LaTeX report", web: "(none)", tui: "na", slint: "na", gtk: "na", latex: "yes", evidence: [REPORT, "scripts/export-sample.mjs", "packages/latex/src/jupiter-report.cls", "examples/data/sample.json"], note: "npm run export:sample loads the web fixtures, writes examples/data/sample.json and generates the report .tex (status, metrics, alerts, network, billing); CI compiles it and npm run check:sample fails if it drifts. It covers the service-health, billing and network dashboards, not every page.", reasons: { tui: NOT_A_DOC, slint: NOT_A_DOC, gtk: NOT_A_DOC } },
];
const isGap = (l: Level) => l === "no" || l === "partial";
const count = (v: View[], t: Target, l: Level) => v.filter((x) => x[t] === l).length;
/** yes counts per target, plus how many views apply to it (n/a cells are not applicable, so they neither count as yes nor as a gap). */
export const totals = (v: View[]) => ({ tui: count(v, "tui", "yes"), slint: count(v, "slint", "yes"), gtk: count(v, "gtk", "yes"), latex: count(v, "latex", "yes"), n: v.length, applicable: { tui: v.length - count(v, "tui", "na"), slint: v.length - count(v, "slint", "na"), gtk: v.length - count(v, "gtk", "na"), latex: v.length - count(v, "latex", "na") } });
/** Views with at least one "no" or "partial" cell. "na" is never a gap. */
export const gaps = (v: View[]) => v.filter((x) => TARGETS.some((t) => isGap(x[t])));
