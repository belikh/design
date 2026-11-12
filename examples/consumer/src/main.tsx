// A project built on the design system: it imports the generated CSS and the shared components, and decides nothing about
// colour, type, spacing, elevation or layout. Change a token in the design system and this project changes with it.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@belikh/jupiter-tokens/tokens.css";
import "@belikh/jupiter-tokens/components.css";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { Badge, Btn, PageHeader, Panel } from "@belikh/jupiter-ui/kit.tsx";
import { DataTable, type Col } from "@belikh/jupiter-ui/DataTable.tsx";

type Row = { id: string; name: string; status: string };
const rows: Row[] = [{ id: "a", name: "First", status: "ok" }, { id: "b", name: "Second", status: "warn" }];
const cols: Col<Row>[] = [{ key: "id", header: "ID" }, { key: "name", header: "Name", editor: { type: "text" } }, { key: "status", header: "Status" }];

createRoot(document.getElementById("root")!).render(
  <StrictMode><PrefsProvider><BrowserRouter>
    <main style={{ padding: "var(--jp-space-5)" }}>
      <PageHeader title="Consumer project" desc="Nothing here is styled locally." />
      <Panel title="Components"><div className="adm-row"><Btn variant="primary">Primary</Btn><Btn>Secondary</Btn><Badge s="ok">ok</Badge></div></Panel>
      <Panel title="Table"><DataTable rows={rows} cols={cols} ariaLabel="Consumer table" onCommit={() => null} /></Panel>
    </main>
  </BrowserRouter></PrefsProvider></StrictMode>,
);
