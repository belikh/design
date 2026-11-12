import { useMemo, useState } from "react";
import { PageHeader, Panel, Btn, Badge, Tabs, Alert, Spinner, EmptyState } from "@belikh/jupiter-ui/kit.tsx";
import { Select, TextInput, TextArea, Checkbox } from "@belikh/jupiter-ui/inputs.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { DEMO_TOKEN, handle, toCurl, type Req, type Res } from "../lib/api.ts";
import { jsonPath, type Json } from "../lib/jsonpath.ts";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";
import { useStored } from "../common.tsx";
import "../tools.css";

type KV = { k: string; v: string; on: boolean };
const EXAMPLES: Record<string, { method: string; url: string; body?: string; auth: boolean }> = {
  "List paid orders": { method: "GET", url: "/v1/orders?status=paid&limit=5", auth: true }, "Get one order": { method: "GET", url: "/v1/orders/ORD-10240", auth: true }, "Create an order": { method: "POST", url: "/v1/orders", body: '{\n  "customer": "Ava Nguyen",\n  "amount": 129.5\n}', auth: true },
  "Create (invalid body)": { method: "POST", url: "/v1/orders", body: '{ "customer": "A" }', auth: true }, "Services status": { method: "GET", url: "/v1/services", auth: true }, "No auth (401)": { method: "GET", url: "/v1/orders", auth: false }, "Not found (404)": { method: "GET", url: "/v1/orders/NOPE", auth: true }, "Slow endpoint": { method: "GET", url: "/v1/slow", auth: true }, "Server error (500)": { method: "GET", url: "/v1/boom", auth: true },
};
const parseQuery = (url: string): KV[] => { const q = url.split("?")[1]; return q ? q.split("&").filter(Boolean).map((p) => { const [k, ...v] = p.split("="); return { k: decodeURIComponent(k), v: decodeURIComponent(v.join("=")), on: true }; }) : []; };
const withQuery = (url: string, rows: KV[]) => { const base = url.split("?")[0]; const on = rows.filter((r) => r.on && r.k); return on.length ? `${base}?${on.map((r) => `${encodeURIComponent(r.k)}=${encodeURIComponent(r.v)}`).join("&")}` : base; };
const tone = (s: number): "ok" | "warn" | "danger" => (s < 300 ? "ok" : s < 500 ? "warn" : "danger");
type Hist = { req: Req; res: Res; at: number };
export function ApiBuilder() {
  const { toast } = usePrefs(); const [method, setMethod] = useState("GET"); const [url, setUrl] = useState("/v1/orders?status=paid&limit=5"); const [headers, setHeaders] = useState<KV[]>([{ k: "Accept", v: "application/json", on: true }]); const [token, setToken] = useState(DEMO_TOKEN); const [auth, setAuth] = useState(true); const [body, setBody] = useState("");
  const [tab, setTab] = useState("params"); const [rtab, setRtab] = useState("body"); const [res, setRes] = useState<Res | null>(null); const [busy, setBusy] = useState(false); const [hist, setHist] = useStored<Hist[]>("pt-api-history", []); const [filter, setFilter] = useState("");
  const params = useMemo(() => parseQuery(url), [url]); const hasBody = method === "POST" || method === "PUT" || method === "PATCH";
  const buildReq = (): Req => ({ method, url, body: hasBody ? body : undefined, headers: { ...Object.fromEntries(headers.filter((h) => h.on && h.k).map((h) => [h.k, h.v])), ...(auth ? { Authorization: `Bearer ${token}` } : {}), ...(hasBody ? { "Content-Type": "application/json" } : {}) } });
  const send = () => { const req = buildReq(); setBusy(true); const r = handle(req); setTimeout(() => { setRes(r); setBusy(false); setHist([{ req, res: r, at: Date.now() }, ...hist].slice(0, 8)); }, Math.min(r.timeMs, 450)); };
  const load = (k: string) => { const e = EXAMPLES[k]; setMethod(e.method); setUrl(e.url); setBody(e.body ?? ""); setAuth(e.auth); setRes(null); };
  const pretty = useMemo(() => { if (!res?.body) return ""; try { return JSON.stringify(JSON.parse(res.body), null, 2); } catch { return res.body; } }, [res]);
  const filtered = useMemo(() => { if (!filter.trim() || !res?.body) return null; try { return { ok: jsonPath(JSON.parse(res.body) as Json, filter) }; } catch (e) { return { err: e instanceof Error ? e.message : "Invalid path" }; } }, [filter, res]);
  const bodyOk = (() => { if (!body.trim()) return null; try { JSON.parse(body); return true; } catch { return false; } })();
  const setParam = (i: number, p: Partial<KV>) => setUrl(withQuery(url, params.map((r, j) => (j === i ? { ...r, ...p } : r))));
  return (
    <>
      <PageHeader title="API request builder" crumbs={["Tools", "API builder"]} desc="Compose a request and send it to a local, fictional Jupiter API (nothing leaves your browser). Inspect the response, filter it with JSONPath, or copy the cURL."
        actions={<Select value="" onChange={(k) => k && load(k)} aria-label="Load an example" options={[{ value: "", label: "Examples…" }, ...Object.keys(EXAMPLES).map((k) => ({ value: k, label: k }))]} />} />
      <Panel>
        <div className="pt-req"><Select value={method} onChange={setMethod} aria-label="Method" options={["GET", "POST", "PUT", "PATCH", "DELETE"]} /><TextInput value={url} onChange={setUrl} aria-label="URL" prefix="http://localhost" onKeyDown={(e) => e.key === "Enter" && send()} /><Btn variant="primary" icon="send" disabled={busy} onClick={send}>{busy ? "Sending…" : "Send"}</Btn></div>
        <div style={{ marginTop: 8 }}><Tabs value={tab} onChange={setTab} tabs={[{ id: "params", label: "Params", count: params.length }, { id: "headers", label: "Headers", count: headers.filter((h) => h.on).length }, { id: "auth", label: "Auth" }, { id: "body", label: "Body" }]} /></div>
        <div style={{ paddingTop: 12 }}>
          {tab === "params" && <>{params.map((p, i) => <div key={i} className="pt-kv"><Checkbox checked={p.on} onChange={(v) => setParam(i, { on: v })} label={<span className="adm-sr">Enable {p.k}</span>} /><TextInput value={p.k} onChange={(v) => setParam(i, { k: v })} aria-label="Param name" /><TextInput value={p.v} onChange={(v) => setParam(i, { v })} aria-label="Param value" /><button className="adm-x" aria-label="Remove param" onClick={() => setUrl(withQuery(url, params.filter((_, j) => j !== i)))}>×</button></div>)}<Btn sm variant="ghost" icon="plus" onClick={() => setUrl(withQuery(url, [...params, { k: "", v: "", on: true }]) + (params.length ? "" : ""))}>Add param</Btn></>}
          {tab === "headers" && <>{headers.map((h, i) => <div key={i} className="pt-kv"><Checkbox checked={h.on} onChange={(v) => setHeaders(headers.map((x, j) => (j === i ? { ...x, on: v } : x)))} label={<span className="adm-sr">Enable {h.k}</span>} /><TextInput value={h.k} onChange={(v) => setHeaders(headers.map((x, j) => (j === i ? { ...x, k: v } : x)))} aria-label="Header name" /><TextInput value={h.v} onChange={(v) => setHeaders(headers.map((x, j) => (j === i ? { ...x, v } : x)))} aria-label="Header value" /><button className="adm-x" aria-label="Remove header" onClick={() => setHeaders(headers.filter((_, j) => j !== i))}>×</button></div>)}<Btn sm variant="ghost" icon="plus" onClick={() => setHeaders([...headers, { k: "", v: "", on: true }])}>Add header</Btn></>}
          {tab === "auth" && <div className="adm-stack" style={{ maxWidth: 420 }}><Checkbox checked={auth} onChange={setAuth} label="Send a Bearer token" /><TextInput value={token} onChange={setToken} disabled={!auth} aria-label="Bearer token" prefix="Bearer" /><p className="jp-muted">The demo API accepts the token <code>{DEMO_TOKEN}</code>. Anything else returns 401.</p></div>}
          {tab === "body" && <div className="adm-stack">{!hasBody && <Alert s="info" title={`${method} requests normally have no body`}>Switch to POST, PUT or PATCH to send one.</Alert>}<TextArea value={body} onChange={setBody} rows={7} aria-label="Request body" placeholder='{ "customer": "Ava", "amount": 10 }' />{bodyOk !== null && <span className={bodyOk ? "jp-hint" : "adm-err"}>{bodyOk ? "Valid JSON" : "Not valid JSON (the server will return 400)"}</span>}</div>}
        </div>
      </Panel>
      <Panel title="Response" className="adm-section" actions={res && <div className="adm-row"><Btn sm icon="copy" onClick={() => { navigator.clipboard?.writeText(toCurl(buildReq())); toast({ kind: "ok", title: "cURL copied" }); }}>Copy as cURL</Btn></div>}>
        {busy ? <div className="adm-row"><Spinner size={18} /> Waiting for the response…</div> : !res ? <EmptyState spot="lens" title="No response yet">Press Send to call the API.</EmptyState> : (
          <div className="adm-stack">
            <div className="adm-row" style={{ gap: 18 }}><span className="pt-status"><Badge s={tone(res.status)}>{res.status} {res.statusText}</Badge></span><span className="jp-muted adm-num">{res.timeMs} ms</span><span className="jp-muted adm-num">{res.size} B</span></div>
            <Tabs value={rtab} onChange={setRtab} tabs={[{ id: "body", label: "Body" }, { id: "headers", label: "Headers", count: Object.keys(res.headers).length }, { id: "raw", label: "Raw" }]} />
            {rtab === "body" && <><TextInput value={filter} onChange={setFilter} placeholder="Filter with JSONPath, e.g. $.data[*].customer" aria-label="JSONPath filter" prefix={<Icon name="filter" size={14} />} />{filtered?.err && <span className="adm-err">{filtered.err}</span>}{filtered?.ok ? <div className="pt-out">{filtered.ok.length ? filtered.ok.map((h, i) => <div key={i}><span>{i}</span><pre>{JSON.stringify(h.value, null, 2)}</pre></div>) : <div><span>—</span><pre>No matches</pre></div>}</div> : <pre className="pt-pre">{pretty || "(empty body)"}</pre>}</>}
            {rtab === "headers" && <dl className="adm-dl" style={{ gridTemplateColumns: "200px 1fr" }}>{Object.entries(res.headers).map(([k, v]) => <><dt key={k}>{k}</dt><dd key={k + "v"} className="adm-num">{v}</dd></>)}</dl>}
            {rtab === "raw" && <pre className="pt-pre">{`HTTP/1.1 ${res.status} ${res.statusText}\n${Object.entries(res.headers).map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${res.body}`}</pre>}
          </div>)}
      </Panel>
      {hist.length > 0 && <Panel title="History" className="adm-section" flush actions={<Btn sm variant="ghost" onClick={() => setHist([])}>Clear</Btn>}><ul className="adm-list adm-list--tight">{hist.map((h, i) => <li key={i}><Badge s={tone(h.res.status)}>{h.res.status}</Badge><b style={{ width: 54 }}>{h.req.method}</b><button className="adm-link" style={{ textDecoration: "none", flex: 1, textAlign: "start" }} onClick={() => { setMethod(h.req.method); setUrl(h.req.url); setBody(h.req.body ?? ""); }}>{h.req.url}</button><span className="jp-muted adm-num">{h.res.timeMs} ms</span></li>)}</ul></Panel>}
    </>
  );
}
