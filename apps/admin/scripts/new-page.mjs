#!/usr/bin/env node
// Scaffold a page the house way: component + test + route entry.
//   npm run new:page -w apps/admin -- <area> <PageName> "<Label>" [list|detail|form|dashboard|kiosk]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const [area, name, label = name, kind = "list"] = process.argv.slice(2);
if (!area || !name || !/^[A-Z][A-Za-z0-9]+$/.test(name) || !/^[a-z][a-z0-9-]+$/.test(area)) { console.error('Usage: new-page <area-kebab> <PascalName> "<Label>" [list|detail|form|dashboard|kiosk]'); process.exit(1); }
if (!["list", "detail", "form", "dashboard", "kiosk"].includes(kind)) { console.error("kind must be list, detail, form, dashboard or kiosk"); process.exit(1); }
const dir = new URL(`../src/p2/${area}/`, import.meta.url).pathname; mkdirSync(dir, { recursive: true });
const file = join(dir, `${name}.tsx`); if (existsSync(file)) { console.error(`${file} exists`); process.exit(1); }
const slug = name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const bodies = {
  dashboard: `export function ${name}() {
  return (
    <>
      <PageHeader title="${label}" crumbs={["${area}", "${label}"]} desc="Tiles for the numbers that matter, then the trend behind them." />
      <div className="adm-stack">
        <div className="adm-grid adm-grid--3"><StatTile label="Revenue" value="$12,400" delta={8} spark={series(14, 30, 8, 1)} sub="30 days" /><StatTile label="Orders" value="312" delta={-2} spark={series(14, 20, 6, 2)} sub="30 days" /><StatTile label="Uptime" value="99.9%" delta={0} spark={series(14, 99, 1, 3)} sub="30 days" /></div>
        <Panel title="Trend"><LineChart area smooth height={220} labels={days(30)} series={[{ name: "Revenue", data: series(30, 40, 20, 9) }]} /></Panel>
      </div>
    </>
  );
}
`,
  kiosk: `/** Kiosk: big touch targets, no hover-only affordances, no app chrome (the route is registered with bare: true). */
export function ${name}() {
  const [done, setDone] = useState(false);
  return (
    <main className="adm-kiosk" style={{ minBlockSize: "100dvh", display: "grid", placeItems: "center", gap: "var(--jp-space-5)", padding: "var(--jp-space-6)", textAlign: "center" }}>
      <h1>{done ? "Thank you" : "${label}"}</h1>
      <p className="jp-muted">{done ? "You can step away now." : "Touch the button to continue."}</p>
      <Btn variant="primary" style={{ minBlockSize: 72, minInlineSize: 280, fontSize: "var(--jp-fs-xl)" }} onClick={() => setDone(!done)}>{done ? "Start over" : "Start"}</Btn>
    </main>
  );
}
`,
  list: `type Row = { id: string; name: string; status: string };
const seed = (): Row[] => Array.from({ length: 8 }, (_, i) => ({ id: \`R-\${i + 1}\`, name: \`Item \${i + 1}\`, status: i % 2 ? "Open" : "Done" }));
const cols: Col<Row>[] = [
  { key: "id", header: "ID", width: 90 },
  { key: "name", header: "Name", width: 220, editor: { type: "text" }, validate: (v) => (String(v).trim() ? null : "A name is required") },
  { key: "status", header: "Status", width: 150, editor: { type: "select", options: [{ value: "Open", label: "Open", s: "info" }, { value: "Done", label: "Done", s: "ok" }] } },
];
export function ${name}() {
  const items = useMemo(() => createCollection<Row>(seed), []); const { rows, save, state } = useCollection(items);
  return (<><PageHeader title="${label}" crumbs={["${area}", "${label}"]} /><Panel title="${label}"><DataTable rows={rows} cols={cols} onCommit={save} state={state === "loading" ? "loading" : "ready"} ariaLabel="${label}" /></Panel></>);
}
`,
  detail: `export function ${name}() {
  const [rec, setRec] = useState({ name: "Example", owner: "Sam", active: true });
  const set = (k: string) => (v: EditValue) => { setRec((r) => ({ ...r, [k]: v })); return null; };
  return (<><PageHeader title={<Editable value={rec.name} editor={{ type: "text" }} label="Title" onSave={set("name")} />} crumbs={["${area}", "${label}"]} />
    <Panel title="Details"><dl className="adm-dl"><dt>Owner</dt><dd><Editable value={rec.owner} editor={{ type: "text" }} label="Owner" onSave={set("owner")} /></dd><dt>Active</dt><dd><Editable value={rec.active} editor={{ type: "boolean" }} label="Active" onSave={set("active")} /></dd></dl></Panel></>);
}
`,
  form: `export function ${name}() {
  const [name, setName] = useState(""); const [touched, setTouched] = useState(false); const err = touched && !name.trim() ? "A name is required" : undefined;
  return (<><PageHeader title="${label}" crumbs={["${area}", "${label}"]} /><Panel title="${label}"><div className="adm-stack">
    <Field label="Name" error={err}>{(id) => <TextInput id={id} value={name} onChange={setName} onBlur={() => setTouched(true)} />}</Field>
    <div><Btn variant="primary" disabled={!name.trim()}>Save</Btn></div></div></Panel></>);
}
`,
};
const imports = {
  dashboard: `import { PageHeader, Panel } from "@belikh/jupiter-ui/kit.tsx";\nimport { LineChart, StatTile } from "@belikh/jupiter-ui/Charts.tsx";\nimport { days, series } from "../../data/fixtures.ts";`,
  kiosk: `import { useState } from "react";\nimport { Btn } from "@belikh/jupiter-ui/kit.tsx";`, list: `import { useMemo } from "react";\nimport { PageHeader, Panel } from "@belikh/jupiter-ui/kit.tsx";\nimport { DataTable, type Col } from "@belikh/jupiter-ui/DataTable.tsx";\nimport { createCollection, useCollection } from "@belikh/jupiter-ui/mock.ts";`,
  detail: `import { useState } from "react";\nimport { PageHeader, Panel } from "@belikh/jupiter-ui/kit.tsx";\nimport { Editable, type EditValue } from "@belikh/jupiter-ui/editable.tsx";`,
  form: `import { useState } from "react";\nimport { Btn, PageHeader, Panel } from "@belikh/jupiter-ui/kit.tsx";\nimport { Field, TextInput } from "@belikh/jupiter-ui/inputs.tsx";` };
if (!bodies[kind]) { console.error("kind must be list, detail, form, dashboard or kiosk"); process.exit(1); }
writeFileSync(file, `${imports[kind]}\n\n${bodies[kind]}`);
writeFileSync(join(dir, `${name}.test.tsx`), `import { describe, expect, it } from "vitest";\nimport { render, screen } from "@testing-library/react";\nimport { MemoryRouter } from "react-router-dom";\nimport { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";\nimport { ${name} } from "./${name}.tsx";\n\ndescribe("${name}", () => {\n  it("renders its heading", async () => {\n    render(<MemoryRouter><PrefsProvider><${name} /></PrefsProvider></MemoryRouter>);\n    expect(await screen.findByRole("heading", { level: 1 })).toBeInTheDocument();\n  });\n});\n`);
const idx = join(dir, "index.tsx"); const entry = `  { path: "/${area}/${slug}", label: "${label}", icon: "database", group: "${area}", keywords: "${label.toLowerCase()}"${kind === "kiosk" ? ", bare: true" : ""}, element: <${name} /> },\n`;
if (existsSync(idx)) { let s = readFileSync(idx, "utf8"); s = s.replace(/(export const routes: P2Route\[\] = \[\n)/, `$1${entry}`); s = s.replace(/^(import type \{ P2Route \}[^\n]*\n)/, `$1import { ${name} } from "./${name}.tsx";\n`); writeFileSync(idx, s); }
else writeFileSync(idx, `import type { P2Route } from "../registry.ts";\nimport { ${name} } from "./${name}.tsx";\n\nexport const routes: P2Route[] = [\n${entry}];\n`);
console.log(`Created ${area}/${name}.tsx, its test, and the route /${area}/${slug}. Now run: npm test && npm run lint:style`);
