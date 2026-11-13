import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CodeBlock, Alert, PageHeader, Panel } from "@belikh/jupiter-ui/kit.tsx";
import { Field, Segmented, Select, Switch, TextInput } from "@belikh/jupiter-ui/inputs.tsx";
import { Widget, WIDGETS, useTick } from "./Widgets.tsx";
import "./forms.css";

type Theme = "auto" | "light" | "dark";
export function embedUrl(origin: string, id: string, o: { theme: Theme; title: boolean; refresh: number }) {
  const q = new URLSearchParams(); if (o.theme !== "auto") q.set("theme", o.theme); if (!o.title) q.set("title", "0"); if (o.refresh) q.set("refresh", String(o.refresh));
  const s = q.toString(); return `${origin}/embed/view/${id}${s ? `?${s}` : ""}`;
}

/** A1 (A019) The configurator: pick a widget, set options, copy the embed snippet. */
export function EmbedBuilder() {
  const [id, setId] = useState("throughput"); const [theme, setTheme] = useState<Theme>("auto"); const [title, setTitle] = useState(true); const [refresh, setRefresh] = useState("30"); const [h, setH] = useState("320");
  const o = { theme, title, refresh: Number(refresh) || 0 }; const origin = typeof window === "undefined" ? "" : window.location.origin;
  const url = embedUrl(origin, id, o);
  const snippet = `<iframe src="${url}" title="${WIDGETS.find((w) => w.id === id)!.title}" width="100%" height="${h}" style="border:0" loading="lazy"></iframe>`;
  const { tick, at } = useTick(o.refresh);
  return (
    <>
      <PageHeader title="Embedded widget view" crumbs={["Embeds", "Single widget"]} desc="Share one widget on an intranet page or a wiki. The embedded view has no navigation, follows the host theme and can refresh itself." />
      <div className="frm-split">
        <Panel title="Options"><div className="adm-stack">
          <Field label="Widget">{(fid) => <Select id={fid} value={id} onChange={setId} options={WIDGETS.map((w) => ({ value: w.id, label: w.title }))} />}</Field>
          <Segmented label="Theme" value={theme} onChange={setTheme} options={[{ value: "auto", label: "Match host" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />
          <Switch checked={title} onChange={setTitle} label="Show widget title" />
          <Field label="Refresh every (seconds, 0 = never)" hint="Auto-refresh keeps the numbers live without a page reload.">{(fid) => <TextInput id={fid} value={refresh} onChange={setRefresh} inputMode="numeric" />}</Field>
          <Field label="Frame height (px)">{(fid) => <TextInput id={fid} value={h} onChange={setH} inputMode="numeric" />}</Field>
        </div></Panel>
        <div className="adm-stack">
          <Panel title="Preview" actions={<Link className="jp-btn jp-btn--secondary jp-btn--sm" to={url.replace(origin, "")}>Open embedded view</Link>}>
            <div className="frm-frame" data-theme={theme === "auto" ? undefined : theme} role="group" aria-label="Embed preview"><Widget id={id} tick={tick} title={title} />{o.refresh > 0 && <small className="jp-muted">Updated {at.toLocaleTimeString("en-AU")}</small>}</div>
          </Panel>
          <Panel title="Embed code">
            <CodeBlock code={snippet} label="Embed code" />
            <Alert s="info" title="Access">The embed uses the viewer’s session. People without access to this dashboard see a sign-in prompt, not the data.</Alert>
          </Panel>
        </div>
      </div>
    </>
  );
}

/** The embedded page itself (bare route): one widget, no chrome. Reads ?theme, ?title, ?refresh. */
export function EmbedView() {
  const { id = "" } = useParams(); const [q] = useSearchParams();
  const theme = q.get("theme"); const refresh = Math.max(0, Number(q.get("refresh")) || 0); const { tick, at } = useTick(refresh);
  return (
    <main className="frm-embed" data-theme={theme === "light" || theme === "dark" ? theme : undefined}>
      <Widget id={id} tick={tick} title={q.get("title") !== "0"} />
      {refresh > 0 && <small className="jp-muted" aria-live="off">Updated {at.toLocaleTimeString("en-AU")}</small>}
    </main>
  );
}
