import { useMemo, useState } from "react";
import { PageHeader, Panel, Btn, Badge, Alert, Tabs } from "@belikh/jupiter-ui/kit.tsx";
import { Switch, Segmented } from "@belikh/jupiter-ui/inputs.tsx";
import { parseYaml, toYaml, validate, YamlError, type Schema } from "../lib/yaml.ts";
import type { Json } from "../lib/jsonpath.ts";
import { Editor, ErrorCaret, pretty } from "../common.tsx";

const YAML_SAMPLE = "# Deployment config\nname: jupiter-api\nimage: ghcr.io/example/jupiter-api:1.0.0\nreplicas: 3\nresources:\n  cpu: 500m\n  memory: 256Mi\nenv:\n  - name: LOG_LEVEL\n    value: info\n  - name: REGION\n    value: ap-southeast-2\n";
export const SCHEMA: Schema = { type: "object", required: ["name", "image"], additionalProperties: false, properties: { name: { type: "string", minLength: 3, pattern: "^[a-z][a-z0-9-]*$" }, image: { type: "string" }, replicas: { type: "integer", minimum: 1, maximum: 10 }, resources: { type: "object", properties: { cpu: { type: "string" }, memory: { type: "string" } } }, env: { type: "array", items: { type: "object", required: ["name", "value"] } } } };
type Mode = "yaml" | "json";
export function jsonProblem(text: string, e: unknown): { line: number; col: number; message: string } {
  const msg = e instanceof Error ? e.message : String(e); const lc = /line (\d+) column (\d+)/.exec(msg); if (lc) return { line: Number(lc[1]), col: Number(lc[2]), message: msg };
  const p = /position (\d+)/.exec(msg); if (p) { const before = text.slice(0, Number(p[1])).split("\n"); return { line: before.length, col: before[before.length - 1].length + 1, message: msg }; }
  return { line: 1, col: 1, message: msg };
}
export function parseDoc(text: string, mode: Mode): { value?: Json; error?: { line: number; col: number; message: string } } {
  try { return { value: mode === "json" ? (JSON.parse(text) as Json) : parseYaml(text) }; }
  catch (e) { return { error: e instanceof YamlError ? { line: e.line, col: e.col, message: e.message } : jsonProblem(text, e) }; }
}
export function CodeEditor() {
  const [mode, setMode] = useState<Mode>("yaml"); const [text, setText] = useState(YAML_SAMPLE); const [useSchema, setUseSchema] = useState(true); const [tab, setTab] = useState("parsed");
  const parsed = useMemo(() => parseDoc(text, mode), [text, mode]); const issues = parsed.value !== undefined && useSchema ? validate(parsed.value, SCHEMA) : [];
  const switchMode = (m: Mode) => { if (m === mode) return; const p = parseDoc(text, mode); if (p.value !== undefined) setText(m === "json" ? pretty(p.value) : toYaml(p.value) + "\n"); setMode(m); };
  const format = () => { if (parsed.value === undefined) return; setText(mode === "json" ? pretty(parsed.value) : toYaml(parsed.value) + "\n"); };
  return (
    <>
      <PageHeader title="JSON / YAML editor" crumbs={["Tools", "Code editor"]} desc="Edit config with live validation: syntax errors point at the line and column, and the document can be checked against a schema." status={parsed.error ? <Badge s="danger">invalid</Badge> : issues.length ? <Badge s="warn">{issues.length} schema issue{issues.length > 1 ? "s" : ""}</Badge> : <Badge s="ok">valid</Badge>}
        actions={<><Segmented label="Format" value={mode} onChange={switchMode} options={[{ value: "yaml", label: "YAML" }, { value: "json", label: "JSON" }]} /><Btn icon="sparkle" disabled={!!parsed.error} onClick={format}>Format</Btn><Btn icon="refresh" onClick={() => { setText(mode === "yaml" ? YAML_SAMPLE : pretty(parseYaml(YAML_SAMPLE))); }}>Reset</Btn></>} />
      <div className="pt-cols">
        <div>
          <Editor label={`${mode.toUpperCase()} document`} value={text} onChange={setText} rows={20} errorLine={parsed.error?.line ?? null} />
          {parsed.error && <ErrorCaret source={text} line={parsed.error.line} col={parsed.error.col} message={parsed.error.message} />}
          <div className="adm-row" style={{ marginTop: 8, justifyContent: "space-between" }}><span className="pt-kbd-hint">{text.split("\n").length} lines · {text.length} chars · Tab indents</span><Switch checked={useSchema} onChange={setUseSchema} label="Validate against schema" /></div>
        </div>
        <Panel title="Result" flush>
          <div style={{ padding: "0 12px" }}><Tabs value={tab} onChange={setTab} tabs={[{ id: "parsed", label: "Parsed" }, { id: "schema", label: "Schema", count: issues.length }, { id: "def", label: "Schema definition" }]} /></div>
          <div style={{ padding: 12 }}>
            {tab === "parsed" && (parsed.value !== undefined ? <pre className="pt-pre">{mode === "yaml" ? pretty(parsed.value) : toYaml(parsed.value)}</pre> : <Alert s="danger" title="Fix the syntax error to see the parsed result" />)}
            {tab === "schema" && (!useSchema ? <Alert s="info" title="Schema validation is off" /> : parsed.value === undefined ? <Alert s="danger" title="Fix the syntax error first" /> : issues.length ? <ul style={{ margin: 0, paddingInlineStart: 20 }}>{issues.map((i) => <li key={i} className="adm-err" style={{ marginBottom: 4 }}>{i}</li>)}</ul> : <Alert s="ok" title="Matches the schema" />)}
            {tab === "def" && <pre className="pt-pre">{pretty(SCHEMA as unknown as Json)}</pre>}
          </div>
        </Panel>
      </div>
    </>
  );
}
