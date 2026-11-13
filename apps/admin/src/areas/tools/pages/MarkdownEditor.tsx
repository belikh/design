import { useEffect, useRef, useState } from "react";
import { PageHeader, Btn, Badge } from "@belikh/jupiter-ui/kit.tsx";
import { Segmented } from "@belikh/jupiter-ui/inputs.tsx";
import { Markdown } from "@belikh/jupiter-ui/extra.tsx";
import { prefixLines, stats, wrap } from "../md.ts";
import { useStored } from "../common.tsx";

const START = "# Release notes\n\nWrite in **Markdown** and see it render live.\n\n## What’s new\n\n- Charts gain *zoom* and export\n- A new `SQL console`\n\n> Raw HTML is never rendered, so pasted content is safe.\n\n```\nnpm run dev:admin\n```\n\nSee the [docs](/p2/tools/docs).\n";
export function MarkdownEditor() {
  const [text, setText] = useStored("pt-md-doc", START); const [view, setView] = useState<"edit" | "split" | "preview">("split"); const ta = useRef<HTMLTextAreaElement>(null); const [saved, setSaved] = useState(true);
  useEffect(() => { setSaved(false); const t = setTimeout(() => setSaved(true), 600); return () => clearTimeout(t); }, [text]);
  const apply = (fn: (t: string, s: number, e: number) => { text: string; start: number; end: number }) => { const el = ta.current; if (!el) return; const r = fn(text, el.selectionStart, el.selectionEnd); setText(r.text); requestAnimationFrame(() => { el.focus(); el.setSelectionRange(r.start, r.end); }); };
  const st = stats(text);
  const TB: [string, string, () => void][] = [["B", "Bold", () => apply((t, s, e) => wrap(t, s, e, "**"))], ["I", "Italic", () => apply((t, s, e) => wrap(t, s, e, "*"))], ["H", "Heading", () => apply((t, s, e) => prefixLines(t, s, e, "## "))], ["•", "Bulleted list", () => apply((t, s, e) => prefixLines(t, s, e, "- "))], ["1.", "Numbered list", () => apply((t, s, e) => prefixLines(t, s, e, "1. "))], ["❝", "Quote", () => apply((t, s, e) => prefixLines(t, s, e, "> "))], ["</>", "Code", () => apply((t, s, e) => wrap(t, s, e, "`"))], ["🔗", "Link", () => apply((t, s, e) => wrap(t, s, e, "[", "](https://)", "link text"))]];
  return (
    <>
      <PageHeader title="Markdown editor" crumbs={["Tools", "Markdown editor"]} desc="Write with a toolbar and a live preview. Autosaves to this browser." status={<Badge s={saved ? "ok" : "warn"}>{saved ? "saved" : "saving…"}</Badge>}
        actions={<><Segmented label="View" value={view} onChange={setView} options={[{ value: "edit", label: "Edit" }, { value: "split", label: "Split" }, { value: "preview", label: "Preview" }]} /><Btn icon="refresh" onClick={() => setText(START)}>Reset</Btn><Btn icon="copy" onClick={() => navigator.clipboard?.writeText(text)}>Copy Markdown</Btn></>} />
      <div className={view === "split" ? "pt-cols" : ""}>
        {view !== "preview" && <div><div className="pt-md-toolbar" role="toolbar" aria-label="Formatting">{TB.map(([l, t, f]) => <button key={t} type="button" title={t} aria-label={t} onClick={f}>{l}</button>)}</div><textarea ref={ta} className="pt-md-area" aria-label="Markdown source" value={text} onChange={(e) => setText(e.target.value)} spellCheck /></div>}
        {view !== "edit" && <div className="pt-preview" aria-label="Preview"><Markdown src={text} /></div>}
      </div>
      <p className="jp-muted" style={{ marginTop: 8 }}>{st.words} words · {st.chars} characters · about {st.minutes} min read</p>
    </>
  );
}
