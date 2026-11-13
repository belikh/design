import { useMemo, useState } from "react";
import { PageHeader, Panel, Tabs, Badge, Alert } from "@belikh/jupiter-ui/kit.tsx";
import { Select, TextInput, TextArea } from "@belikh/jupiter-ui/inputs.tsx";
import { jsonPath, PathError, type Json } from "../lib/jsonpath.ts";
import { jq, JqError, JQ_FUNCTIONS } from "../lib/jq.ts";
import { REGEX_PRESETS, SAMPLE_JSON, regexReplace, runRegex } from "../lib/playground.ts";
import { Editor, ErrorCaret } from "../common.tsx";
import { jsonProblem } from "./CodeEditor.tsx";
import "../tools.css";

const FLAGS = ["g", "i", "m", "s", "u"];
function RegexTab() {
  const [pat, setPat] = useState(REGEX_PRESETS[0].pattern); const [flags, setFlags] = useState(REGEX_PRESETS[0].flags); const [text, setText] = useState(REGEX_PRESETS[0].text); const [repl, setRepl] = useState("<$&>");
  const r = useMemo(() => runRegex(pat, flags, text), [pat, flags, text]); const replaced = useMemo(() => (pat && !r.error ? regexReplace(pat, flags, text, repl) : null), [pat, flags, text, repl, r.error]);
  return (
    <div className="adm-stack">
      <div className="adm-row"><Select value="" onChange={(n) => { const p = REGEX_PRESETS.find((x) => x.name === n); if (p) { setPat(p.pattern); setFlags(p.flags); setText(p.text); } }} aria-label="Load an example" options={[{ value: "", label: "Examples…" }, ...REGEX_PRESETS.map((p) => ({ value: p.name, label: p.name }))]} /><span className="jp-muted">Runs in your browser with size limits. Very complex patterns on large text can be slow.</span></div>
      <div className="adm-row" style={{ flexWrap: "nowrap" }}><div style={{ flex: 1 }}><TextInput value={pat} onChange={setPat} aria-label="Regular expression" prefix="/" suffix="/" state={r.error ? "error" : undefined} /></div><div className="pt-flags" role="group" aria-label="Flags">{FLAGS.map((f) => <button key={f} type="button" aria-pressed={flags.includes(f)} title={{ g: "global", i: "ignore case", m: "multiline", s: "dot matches newline", u: "unicode" }[f]} onClick={() => setFlags(flags.includes(f) ? flags.replace(f, "") : flags + f)}>{f}</button>)}</div></div>
      {r.error && <Alert s="danger" title="Invalid pattern">{r.error}</Alert>}
      <div className="pt-cols"><div><div className="jp-label">Test text</div><TextArea value={text} onChange={setText} rows={8} aria-label="Test text" /></div><div><div className="jp-label">Matches <Badge s={r.matches.length ? "ok" : undefined}>{r.matches.length}{r.truncated ? "+" : ""}</Badge></div><div className="pt-hl" aria-live="polite">{r.segments.map((s, i) => (s.match === undefined ? <span key={i}>{s.text}</span> : <mark key={i} className={s.match % 2 ? "is-alt" : ""}>{s.text}</mark>))}</div></div></div>
      {r.matches.length > 0 && <Panel title="Match details" flush><table className="jp-table"><thead><tr><th>#</th><th>Index</th><th>Match</th><th>Groups</th></tr></thead><tbody>{r.matches.slice(0, 30).map((m, i) => <tr key={i}><td>{i + 1}</td><td className="adm-num">{m.index}</td><td className="adm-num">{m.text || <span className="jp-muted">(empty)</span>}</td><td className="adm-num">{[...Object.entries(m.named).map(([k, v]) => `${k}=${v}`), ...(Object.keys(m.named).length ? [] : m.groups.map((g, j) => `$${j + 1}=${g ?? "∅"}`))].join("  ") || "—"}</td></tr>)}</tbody></table></Panel>}
      <div><div className="jp-label">Replace with</div><TextInput value={repl} onChange={setRepl} aria-label="Replacement" /><pre className="pt-pre" style={{ marginTop: 6 }}>{replaced ?? ""}</pre></div>
    </div>
  );
}
function JsonSource({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const err = useMemo(() => { try { JSON.parse(value); return null; } catch (e) { return jsonProblem(value, e); } }, [value]);
  return <div><div className="jp-label">JSON input</div><Editor label="JSON input" value={value} onChange={onChange} rows={14} errorLine={err?.line ?? null} />{err && <ErrorCaret source={value} line={err.line} col={err.col} message={err.message} />}</div>;
}
const parse = (s: string): Json | undefined => { try { return JSON.parse(s) as Json; } catch { return undefined; } };
function PathTab() {
  const [src, setSrc] = useState(SAMPLE_JSON); const [q, setQ] = useState("$.store.book[?(@.price < 15)].title");
  const doc = parse(src); const out = useMemo(() => { if (doc === undefined) return { err: "Fix the JSON first" }; try { return { ok: jsonPath(doc, q) }; } catch (e) { return { err: e instanceof PathError ? `${e.message} (at ${e.pos})` : String(e) }; } }, [doc, q]);
  return (
    <div className="pt-cols"><JsonSource value={src} onChange={setSrc} /><div className="adm-stack"><div><div className="jp-label">JSONPath</div><TextInput value={q} onChange={setQ} aria-label="JSONPath expression" state={out.err ? "error" : undefined} />{out.err && <span className="adm-err" role="alert">{out.err}</span>}</div>
      <div className="pt-chips">{["$.store.book[*].title", "$..price", "$.store.book[0:2]", "$.store.book[?(@.isbn)]", "$.store.book[?(@.category == 'fiction' && @.price > 20)].title", "$.store.*"].map((e) => <button key={e} type="button" className="adm-pill" onClick={() => setQ(e)}>{e}</button>)}</div>
      <div className="jp-label">Results {out.ok && <Badge s={out.ok.length ? "ok" : undefined}>{out.ok.length}</Badge>}</div>{out.ok && <div className="pt-out">{out.ok.length ? out.ok.map((h, i) => <div key={i}><span>{i}</span><pre><b>{h.path}</b>{"\n"}{JSON.stringify(h.value, null, 2)}</pre></div>) : <div><span>—</span><pre>No matches</pre></div>}</div>}</div></div>
  );
}
function JqTab() {
  const [src, setSrc] = useState(SAMPLE_JSON); const [prog, setProg] = useState(".store.book | map(select(.price < 15) | {title, price}) | sort_by(.price)");
  const doc = parse(src); const out = useMemo(() => { if (doc === undefined) return { err: "Fix the JSON first" }; try { return { ok: jq(prog, doc) }; } catch (e) { return { err: e instanceof JqError ? e.message : String(e) }; } }, [doc, prog]);
  return (
    <div className="pt-cols"><JsonSource value={src} onChange={setSrc} /><div className="adm-stack"><div><div className="jp-label">jq program</div><TextArea value={prog} onChange={setProg} rows={3} aria-label="jq program" />{out.err && <span className="adm-err" role="alert">{out.err}</span>}</div>
      <div className="pt-chips">{[".store.book[].title", ".store.book | length", ".store.book | map(.price) | add", "[.store.book[] | select(.category == \"fiction\")] | length", ".store | keys", ".store.book | group_by(.category) | map({category: .[0].category, n: length})"].map((e) => <button key={e} type="button" className="adm-pill" onClick={() => setProg(e)}>{e}</button>)}</div>
      <div className="jp-label">Output {out.ok && <Badge s="ok">{out.ok.length}</Badge>}</div>{out.ok && <div className="pt-out">{out.ok.length ? out.ok.map((v, i) => <div key={i}><span>{i}</span><pre>{JSON.stringify(v, null, 2)}</pre></div>) : <div><span>—</span><pre>(empty)</pre></div>}</div>}
      <details><summary className="jp-muted" style={{ cursor: "pointer" }}>Supported functions</summary><div className="pt-chips" style={{ marginTop: 6 }}>{JQ_FUNCTIONS.map((f) => <code key={f} className="adm-chip">{f}</code>)}</div></details></div></div>
  );
}
export function Playground() {
  const [tab, setTab] = useState("regex");
  return (
    <>
      <PageHeader title="Regex, JSONPath and jq playground" crumbs={["Tools", "Playground"]} desc="Try patterns and queries against sample data with instant feedback. Everything is evaluated by small, sandboxed interpreters in your browser: no code is ever executed."
        tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: "regex", label: "Regex" }, { id: "jsonpath", label: "JSONPath" }, { id: "jq", label: "jq" }]} />} />
      {tab === "regex" ? <RegexTab /> : tab === "jsonpath" ? <PathTab /> : <JqTab />}
    </>
  );
}
