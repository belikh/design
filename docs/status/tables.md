# P2 status — tables (spec section B, group "Grids")

Code: `apps/admin/src/ui/DataTable.tsx` (+ `tableUtils.ts`, `tableExport.ts`, `dataTable.css`) and `apps/admin/src/p2/tables/`.
Tests: 57 new (`logic.test.ts` 19, `datatable.p2.test.tsx` 23, `pages.test.tsx` 15) + 7 existing DataTable tests, all passing.

| ID | Status | Route | Note |
|----|--------|-------|------|
| B007 | Done | /p2/tables/grid | Aggregate picker per column (sum/avg/count/min/max/median/distinct), footer scope select (filtered / page / selected). |
| B012 | Done | /p2/tables/grid | Column header menu: sort, hide, pin, aggregate, auto-fit, group-by, stats, number format. |
| B013 | Done | /p2/tables/grid | Multi-level row grouping with per-group aggregates, collapse/expand all. |
| B015 | Partial | /p2/tables/grid | CSV/TSV/JSON/Markdown/XLSX/PDF export, dependency-free. XLSX and PDF are checked structurally (zip CRC, xref) but not opened in Excel or a PDF viewer; PDF is plain Courier, non-ASCII becomes "?". |
| B016 | Partial | /p2/tables/reorder | Drag between tables via `dragGroup`/`onReceive`/`onMoveOut`. Tested with synthetic DnD events, not a real browser drag. |
| B019 | Done | /p2/tables/grid | Drag header to group bar, or use menu; keyboard-accessible. |
| B020 | Partial | /p2/tables/grid | Pinned top/bottom rows and sticky footer. Only meaningful with `maxHeight`; otherwise the page is the scroller. |
| B021 | Done | /p2/tables/grid | Conditional formatting: colour scale, diverging, data bars, icon sets, rules. |
| B022 | Partial | /p2/tables/grid | Range selection with copy (TSV) and status-bar stats. Visible rows/cols only; no fill handle or formulas. |
| B024 | Done | /p2/tables/grid | Wrap/truncate and row-height layout menu. |
| B025 | Done | /p2/tables/nested, /grid | Column groups (spanning headers) and rotated headers. |
| B026 | Done | /p2/tables/reorder | Row reorder by handle with Alt+Arrow/Home/End keyboard alternative and aria-live announcements. |
| B027 | Done | /p2/tables/nested | Nested sub-table via row expand; tree rows. |
| B028 | Partial | /p2/tables/grid | Auto-fit width by canvas measurement (double-click handle or menu); char-count fallback in jsdom. |
| B029 | Partial | /p2/tables/live | Snapshot diff (added/removed/changed, old value shown). Matched by `id`; removed rows are shown at the bottom, not in original position. |
| B030 | Done | /p2/tables/live | Streaming inserts/edits with flash, pause with buffered-count, reduced-motion safe. |
| B031 | Done | /p2/tables/paste | Bulk paste (TSV/CSV/semicolon, quotes), column mapping, per-cell validation, error preview. |
| B032 | Done | /p2/tables/grid | Find-in-table bar with highlights and next/prev. |
| B033 | Partial | /p2/tables/server | Server mode protocol (paging / load-more, estimated totals, debounced queries) against a fake 1.24M-row backend. Only Ref sorts server-side; filtered totals are extrapolated from a 4,000-row sample. |
| B034 | Done | /p2/tables/pivot | Pivot with row/col field, aggregate, totals, heat shading. |
| B035 | Done | /p2/tables/views | View switcher (table, cards, calendar, map, timeline); view kept in URL, filters carry across. |
| B036 | Partial | /p2/tables/views | Map is a stylised Australia outline with 9 cities; timeline capped at 70 rows. |
| B014 | Skipped | — | Spreadsheet grid is P3, out of scope. |

## Other gaps
- Cross-tab/URL state only for Orders (`urlKey`) and the Views page `?view`.
- No RTL or high-contrast screenshots taken (tokens only, so should follow); 390px not screenshot-checked.
- `download()` (anchor click) untested in a real browser.
- Map: Sydney/Canberra labels overlap slightly.
