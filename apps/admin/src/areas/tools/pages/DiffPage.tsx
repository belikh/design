import { useMemo, useState } from "react";
import { PageHeader, Panel, Btn, Badge } from "@belikh/jupiter-ui/kit.tsx";
import { Field, Segmented, Switch, TextArea, Select } from "@belikh/jupiter-ui/inputs.tsx";
import { DiffViewer, diffLines } from "@belikh/jupiter-ui/extra.tsx";

const SAMPLES: Record<string, [string, string]> = {
  "Tokens change": ["accent: #4b3fbf\nradius: 6px\nfont: SGI Text\nmotion: 200ms\n", "accent: #4b3fbf\nradius: 8px\nfont: SGI Text\nmotion: 160ms\ndensity: compact\n"],
  "Config file": ["server {\n  listen 80;\n  server_name jupiter.au;\n  root /var/www;\n}\n", "server {\n  listen 443 ssl;\n  server_name jupiter.au;\n  root /var/www/current;\n  ssl_certificate /etc/ssl/jupiter.pem;\n}\n"],
  "Prose": ["The dock board ranks trucks by priority.\nFrozen loads go first.\nWalk-ins wait longer.\n", "The dock board ranks trucks by priority.\nFrozen and chilled loads go first.\nWalk-ins wait longer.\nStaff can tune the rules live.\n"],
};
export function DiffPage() {
  const [a, setA] = useState(SAMPLES["Tokens change"][0]); const [b, setB] = useState(SAMPLES["Tokens change"][1]); const [mode, setMode] = useState<"unified" | "split">("unified"); const [ws, setWs] = useState(false);
  const norm = (s: string) => (ws ? s.split("\n").map((l) => l.trim().replace(/\s+/g, " ")).join("\n") : s);
  const A = norm(a), B = norm(b); const d = useMemo(() => diffLines(A, B), [A, B]); const adds = d.filter((x) => x.t === "add").length, dels = d.filter((x) => x.t === "del").length;
  return (
    <>
      <PageHeader title="Diff viewer" crumbs={["Tools", "Diff"]} desc="Compare two texts line by line, in unified or split view. Paste your own, or load an example." status={adds + dels === 0 ? <Badge s="ok">identical</Badge> : <Badge s="info">+{adds} −{dels}</Badge>}
        actions={<><Select value="" onChange={(k) => { if (k) { setA(SAMPLES[k][0]); setB(SAMPLES[k][1]); } }} aria-label="Load an example" options={[{ value: "", label: "Examples…" }, ...Object.keys(SAMPLES).map((k) => ({ value: k, label: k }))]} /><Btn icon="refresh" onClick={() => { setA(b); setB(a); }}>Swap</Btn></>} />
      <div className="pt-cols"><Field label="Before">{(id) => <TextArea id={id} value={a} onChange={setA} rows={9} />}</Field><Field label="After">{(id) => <TextArea id={id} value={b} onChange={setB} rows={9} />}</Field></div>
      <div className="adm-row" style={{ margin: "12px 0" }}><Segmented label="View" value={mode} onChange={setMode} options={[{ value: "unified", label: "Unified" }, { value: "split", label: "Split" }]} /><Switch checked={ws} onChange={setWs} label="Ignore whitespace" /></div>
      <Panel flush><DiffViewer before={A} after={B} mode={mode} labels={["before", "after"]} /></Panel>
    </>
  );
}
