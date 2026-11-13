import { PageHeader, Panel } from "@belikh/jupiter-ui/kit.tsx";

// The changelog lives at the repo root; this page renders it so "what's new" never drifts from what shipped.
const files = import.meta.glob("../../../../../CHANGELOG.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
export const CHANGELOG = Object.values(files)[0] ?? "";

type Entry = { title: string; items: string[] };
/** Parse "## Heading" sections with "- bullet" lines. Anything else is ignored. */
export function parseChangelog(md: string): Entry[] {
  const out: Entry[] = []; for (const line of md.split(/\r?\n/)) { const h = /^##\s+(.*)/.exec(line); if (h) out.push({ title: h[1], items: [] }); else if (out.length && /^\s*[-*]\s+/.test(line)) out[out.length - 1].items.push(line.replace(/^\s*[-*]\s+/, "")); }
  return out;
}
export function WhatsNew() {
  const entries = parseChangelog(CHANGELOG);
  return (
    <>
      <PageHeader title="What’s new" desc="Changes to the design system and the admin template, newest first." crumbs={["Tools", "What’s new"]} />
      {entries.length === 0 && <Panel title="Changelog"><p className="jp-muted">No changelog entries yet.</p></Panel>}
      <div className="adm-stack">{entries.map((e) => <Panel key={e.title} title={e.title}><ul>{e.items.map((i) => <li key={i}>{i}</li>)}</ul></Panel>)}</div>
    </>
  );
}
