import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader, Btn, EmptyState } from "@belikh/jupiter-ui/kit.tsx";
import { TextInput } from "@belikh/jupiter-ui/inputs.tsx";
import { Markdown, TreeNav, AnchorNav, type TreeNode } from "@belikh/jupiter-ui/extra.tsx";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";
import { DOCS } from "../lib/docs.ts";
import { headings, stats } from "../md.ts";
import "../tools.css";

export function DocsReader() {
  const [sp, setSp] = useSearchParams(); const [q, setQ] = useState(""); const cur = DOCS.find((d) => d.id === sp.get("doc")) ?? DOCS[0];
  const hits = useMemo(() => DOCS.filter((d) => !q || (d.title + d.md).toLowerCase().includes(q.toLowerCase())), [q]);
  const nodes: TreeNode[] = useMemo(() => [...new Set(hits.map((d) => d.group))].map((g) => ({ id: `g-${g}`, label: g, icon: "folder", children: hits.filter((d) => d.group === g).map((d) => ({ id: d.id, label: d.title, icon: "file" })) })), [hits]);
  const idx = DOCS.indexOf(cur); const toc = headings(cur.md).filter((h) => h.level > 1); const st = stats(cur.md);
  const go = (id: string) => { if (DOCS.some((d) => d.id === id)) setSp({ doc: id }); };
  return (
    <>
      <PageHeader title="Docs reader" crumbs={["Tools", "Docs"]} desc="A documentation reader: search, a tree of pages, an on-page outline that follows your scroll, and previous/next navigation." />
      <div className="pt-doc">
        <aside><div style={{ marginBottom: 8 }}><TextInput value={q} onChange={setQ} placeholder="Search docs…" aria-label="Search docs" prefix={<Icon name="search" size={14} />} /></div>{nodes.length ? <TreeNav nodes={nodes} selected={cur.id} onSelect={go} /> : <p className="jp-muted">No pages match.</p>}</aside>
        <article>
          {hits.length === 0 ? <EmptyState spot="no-results" title="No results">Try another search term.</EmptyState> : <>
            <div className="jp-muted" style={{ marginBottom: 6 }}>{cur.group} · {st.minutes} min read</div>
            <Markdown src={cur.md} />
            <div className="adm-row" style={{ justifyContent: "space-between", marginTop: 32, borderTop: "1px solid var(--jp-border)", paddingTop: 16 }}>
              <Btn disabled={idx <= 0} onClick={() => go(DOCS[idx - 1].id)} icon="arrow-left">{idx > 0 ? DOCS[idx - 1].title : "Previous"}</Btn>
              <Btn disabled={idx >= DOCS.length - 1} onClick={() => go(DOCS[idx + 1].id)}>{idx < DOCS.length - 1 ? DOCS[idx + 1].title : "Next"} →</Btn>
            </div></>}
        </article>
        <aside>{toc.length > 0 && <><div className="jp-label" style={{ marginBottom: 6 }}>On this page</div><AnchorNav items={toc.map((h) => ({ id: h.id, label: h.text }))} /></>}</aside>
      </div>
    </>
  );
}
