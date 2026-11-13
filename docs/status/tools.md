# Status: Tools (A4)

| ID | Entry | Status | Route | Note |
|---|---|---|---|---|
| A094 | Report / query builder | Done | `/tools/report-builder` | Visual builder generates SQL run by the in-memory engine. |
| A095 | SQL console | Done | `/tools/sql` | Own SELECT-only parser (joins not supported); errors with caret, explain, examples. |
| A097 | Terminal | Partial | `/tools/terminal` | Sandboxed fake shell with virtual FS and pipes; curl/ping refuse real network; replay mode. |
| A098 | JSON/YAML editor | Partial | `/tools/code-editor` | YAML is a subset parser (no anchors/multi-doc); JSON-schema-lite validation. |
| A099 | Diff viewer | Done | `/tools/diff` | Split and unified views. |
| A100 | Markdown editor | Partial | `/tools/markdown-editor` | Toolbar + live preview; not a full rich-text/WYSIWYG editor. |
| A101 | Docs reader | Done | `/tools/docs` | Five fictional docs, search and outline. |
| A102 | Topology explorer | Partial | `/tools/topology` | Fictional network, VLAN filter, shortest path, bottleneck; static layout. |
| A103 | Trace viewer | Done | `/tools/traces` | Span waterfall, critical path, self-time, service breakdown; synthetic traces. |
| A105 | Schedule / cron manager | Done | `/tools/schedules` | Own cron parser, next runs, plain-English description; nothing actually runs. |
| A106 | Job queue monitor | Done | `/tools/job-queues` | Simulated queue with retry/promote/pause/remove. |
| A108 | Metrics explorer | Done | `/tools/metrics` | Synthetic 168h dataset; aggregate, group by, filters. |
| A109 | Alert rule editor with backtest | Done | `/tools/alert-rules` | Backtest against history plus threshold suggestion. |
| A111 | API request builder | Done | `/tools/api-builder` | Talks only to an in-page mock API; no real network; cURL export. |
| A113 | Regex / JSONPath / jq playground | Partial | `/tools/playground` | JSONPath and jq are subsets; regex uses native RegExp with size caps (no ReDoS timeout). |
| A120 | Data quality report | Done | `/tools/data-quality` | Rules, score gauge, failing rows, column profile, JSON export, custom rules. |
| A121 | Bulk job runner | Done | `/tools/bulk-runner` | Dry run, confirm, progress, failure limit, retry; applies to local state only. |
| A122 | Diagnostics / self-test | Done | `/tools/diagnostics` | 18 browser/app checks, re-run, copy report. |
| A123 | System info and about | Done | `/tools/system-info` | Env, storage, licences, support bundle; licence list is static. |
| A125 | Print / PDF preview | Done | `/tools/print-preview` | Auto-pagination with keep-with-next; PDF via browser print, no server PDF generation. |

## Not in scope
- A096, A107, A124: pre-existing P1 pages (untouched).
- A104, A110, A112, A114–A119: specialised tier, Skipped.

## Verification
- `src/areas/tools/lib.test.ts` + `pages.test.tsx`: 72 tests passing; every route renders.
- Screenshots reviewed for a sample of pages (light/dark, desktop/390px); not every page at every size.
