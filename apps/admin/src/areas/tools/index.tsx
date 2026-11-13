import type { AreaRoute } from "../registry.ts";
import { Terminal } from "./pages/Terminal.tsx";
import { Trace } from "./pages/Trace.tsx";
import { Diagnostics } from "./pages/Diagnostics.tsx";
import { lazy } from "react";
const QueryBuilder = lazy(() => import("./pages/QueryBuilder.tsx").then((m) => ({ default: m.QueryBuilder })));
const SqlConsole = lazy(() => import("./pages/SqlConsole.tsx").then((m) => ({ default: m.SqlConsole })));
const CodeEditor = lazy(() => import("./pages/CodeEditor.tsx").then((m) => ({ default: m.CodeEditor })));
const DiffPage = lazy(() => import("./pages/DiffPage.tsx").then((m) => ({ default: m.DiffPage })));
const MarkdownEditor = lazy(() => import("./pages/MarkdownEditor.tsx").then((m) => ({ default: m.MarkdownEditor })));
const DocsReader = lazy(() => import("./pages/DocsReader.tsx").then((m) => ({ default: m.DocsReader })));
const Topology = lazy(() => import("./pages/Topology.tsx").then((m) => ({ default: m.Topology })));
const CronManager = lazy(() => import("./pages/CronManager.tsx").then((m) => ({ default: m.CronManager })));
const JobQueue = lazy(() => import("./pages/JobQueue.tsx").then((m) => ({ default: m.JobQueue })));
const MetricsExplorer = lazy(() => import("./pages/MetricsExplorer.tsx").then((m) => ({ default: m.MetricsExplorer })));
const AlertRules = lazy(() => import("./pages/AlertRules.tsx").then((m) => ({ default: m.AlertRules })));
const ApiBuilder = lazy(() => import("./pages/ApiBuilder.tsx").then((m) => ({ default: m.ApiBuilder })));
const Playground = lazy(() => import("./pages/Playground.tsx").then((m) => ({ default: m.Playground })));
const DataQuality = lazy(() => import("./pages/DataQuality.tsx").then((m) => ({ default: m.DataQuality })));
const BulkRunner = lazy(() => import("./pages/BulkRunner.tsx").then((m) => ({ default: m.BulkRunner })));
const SystemInfo = lazy(() => import("./pages/SystemInfo.tsx").then((m) => ({ default: m.SystemInfo })));
const PrintPreview = lazy(() => import("./pages/PrintPreview.tsx").then((m) => ({ default: m.PrintPreview })));

const G = "Tools";
export const routes: AreaRoute[] = [
  { path: "/tools/report-builder", label: "Report builder", icon: "filter", group: G, keywords: "query visual builder sql report", element: <QueryBuilder /> },
  { path: "/tools/sql", label: "SQL console", icon: "database", group: G, keywords: "query select table results", element: <SqlConsole /> },
  { path: "/tools/terminal", label: "Terminal", icon: "terminal", group: G, keywords: "console shell command recording", element: <Terminal /> },
  { path: "/tools/code-editor", label: "JSON / YAML editor", icon: "code", group: G, keywords: "json yaml validate schema config", element: <CodeEditor /> },
  { path: "/tools/diff", label: "Diff viewer", icon: "git-branch", group: G, keywords: "compare text changes unified split", element: <DiffPage /> },
  { path: "/tools/markdown-editor", label: "Markdown editor", icon: "edit", group: G, keywords: "write docs preview rich text", element: <MarkdownEditor /> },
  { path: "/tools/docs", label: "Docs reader", icon: "book", group: G, keywords: "documentation markdown search outline", element: <DocsReader /> },
  { path: "/tools/topology", label: "Network topology", icon: "topology", group: G, keywords: "network devices vlan path trace unifi", element: <Topology /> },
  { path: "/tools/traces", label: "Trace viewer", icon: "pulse", group: G, keywords: "distributed tracing spans waterfall latency", element: <Trace /> },
  { path: "/tools/schedules", label: "Schedules (cron)", icon: "clock", group: G, keywords: "cron jobs timer next run", element: <CronManager /> },
  { path: "/tools/job-queues", label: "Job queues", icon: "rack", group: G, keywords: "background jobs workers retry failed", element: <JobQueue /> },
  { path: "/tools/metrics", label: "Metrics explorer", icon: "chart", group: G, keywords: "metrics group by aggregate query chart", element: <MetricsExplorer /> },
  { path: "/tools/alert-rules", label: "Alert rules", icon: "bell", group: G, keywords: "alerting backtest threshold noise", element: <AlertRules /> },
  { path: "/tools/api-builder", label: "API request builder", icon: "send", group: G, keywords: "http rest request response curl", element: <ApiBuilder /> },
  { path: "/tools/playground", label: "Regex / JSONPath / jq", icon: "search", group: G, keywords: "regex jsonpath jq playground test pattern", element: <Playground /> },
  { path: "/tools/data-quality", label: "Data quality", icon: "shield", group: G, keywords: "validation rules nulls duplicates profile", element: <DataQuality /> },
  { path: "/tools/bulk-runner", label: "Bulk job runner", icon: "upload", group: G, keywords: "bulk update dry run batch retry", element: <BulkRunner /> },
  { path: "/tools/diagnostics", label: "Diagnostics", icon: "success", group: G, keywords: "self test health browser checks", element: <Diagnostics /> },
  { path: "/tools/system-info", label: "System info", icon: "info", group: G, keywords: "about version environment licences support", element: <SystemInfo /> },
  { path: "/tools/print-preview", label: "Print preview", icon: "file", group: G, keywords: "pdf print paginate report paper", element: <PrintPreview /> },
];
