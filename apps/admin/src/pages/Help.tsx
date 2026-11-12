import { useMemo, useState } from "react";
import { PageHeader, Panel, Accordion, Alert } from "@belikh/jupiter-ui/kit.tsx";
import { Markdown, AnchorNav } from "@belikh/jupiter-ui/extra.tsx";
import { TextInput } from "@belikh/jupiter-ui/inputs.tsx";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { LANGS } from "@belikh/jupiter-ui/i18n.ts";
import { Segmented } from "@belikh/jupiter-ui/inputs.tsx";

const SECTIONS = [
  { id: "getting-started", title: "Getting started", md: "## Getting started\n\nThe admin template is built from the **Jupiter design system**. Everything on screen reads the tokens, so changing `jupiter.tokens.json` and rebuilding re-themes the whole app.\n\n1. Run `npm run dev:admin`.\n2. Open the *command palette* with `Cmd/Ctrl+K`.\n3. Press `?` for the keyboard shortcuts.\n\n> Tip: append `?theme=dark` to any URL to force a colour scheme." },
  { id: "tables", title: "Working with tables", md: "## Working with tables\n\n- **Sort** by clicking a header; hold `Shift` to add a secondary sort.\n- **Resize** columns by dragging their right edge, and **reorder** them with the arrows that appear on hover.\n- **Select** rows with the checkboxes, then use the bulk bar.\n- **Edit** a cell by double-clicking it or pressing `Enter`.\n\n| Key | Action |\n| --- | --- |\n| Arrow keys | Move between cells |\n| Space | Select the row |\n| Enter | Edit the cell |" },
  { id: "charts", title: "Charts and export", md: "## Charts and export\n\nEvery line and bar chart has a toolbar. Use **Export** to download *SVG*, *PNG* or *CSV*, and the table button for an accessible data view.\n\n```\nDrag across a line chart to zoom,\nthen press Reset zoom.\n```\n\nAnomalies are highlighted with a red ring when the `anomalies` option is on." },
  { id: "accessibility", title: "Accessibility", md: "## Accessibility\n\nControls have visible labels, a focus ring and keyboard support. Turn on **High contrast** in *Settings → Appearance*, and switch language (including right-to-left Arabic) from the top bar.\n\nSee the [WCAG guidelines](https://www.w3.org/WAI/standards-guidelines/wcag/) for the targets we measure against." },
];
export function Help() {
  const { lang, setLang, t } = usePrefs(); const [q, setQ] = useState("");
  const shown = useMemo(() => SECTIONS.filter((s) => !q || (s.title + s.md).toLowerCase().includes(q.toLowerCase())), [q]);
  return (
    <>
      <PageHeader title={t("Help centre")} desc="Searchable docs rendered from Markdown, an anchor sidebar that tracks your scroll, FAQs and a language switch." crumbs={["Library", "Help"]}
        actions={<Segmented label="Language" value={lang} onChange={setLang} options={LANGS.map((l) => ({ value: l.code, label: l.label }))} />} />
      <div style={{ maxWidth: 520, marginBottom: 16 }}><TextInput value={q} onChange={setQ} placeholder="Search the docs…" aria-label="Search docs" prefix={<Icon name="search" size={14} />} /></div>
      <div className="adm-help">
        <aside><AnchorNav items={shown.map((s) => ({ id: s.id, label: s.title }))} /></aside>
        <div>
          {shown.length === 0 ? <Alert s="info" title="No matches">Try a different search term.</Alert> : shown.map((s) => <section key={s.id} id={s.id} style={{ scrollMarginTop: 16 }}><Markdown src={s.md} /></section>)}
          <Panel title="Frequently asked" className="adm-section"><Accordion items={[{ id: "a", title: "Is this connected to a backend?", body: "No. All data is fictional and held in the browser." }, { id: "b", title: "Can I change the colours?", body: "Edit the tokens, rebuild, and every surface follows, including email, terminal and mobile outputs." }, { id: "c", title: "How do I add a page?", body: "Create a component in src/pages and register a route in App.tsx and routes.ts." }]} /></Panel>
        </div>
      </div>
    </>
  );
}
