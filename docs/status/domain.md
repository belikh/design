# Status: Domain (spec section G)

All routes live under `/domain/…`, group "Domain", code in `apps/admin/src/areas/domain/`.
Every page is driven by fictional fixtures with a fixed clock (`NOW` = 2026-11-12 17:00) so output is deterministic. There is no backend: writes (role changes, DNS publish, OTA rollout, restore, invoice save) mutate in-memory state and show a toast. Derived numbers (uptime, error budget, DORA, GST totals, queue waits, contrast ratios) are computed by pure functions covered by `domain.logic.test.ts`; page interactions are covered by `domain.pages.test.tsx` (61 tests total, all passing).

| ID | Status | Route | Note |
|---|---|---|---|
| G001 | Done | `/domain/service-health` | Health table with SLO error budgets and 90-day uptime bars, incident timeline with ack/resolve, alert rules with a backtest, on-call roster with override. Metrics are canned. |
| G003 | Partial | `/domain/home-automation` | Entity table, automations (enable, run now), energy chart, batteries, presence heatmap all present. The camera wall shows icons and status only; there is no live stream. CSI data is synthetic. |
| G004 | Partial | `/domain/hosts-storage` | Fleet with config drift, ZFS pools with days-until-full, SMART health, backup restore wizard, UPS runtime. The restore is simulated. iSCSI is shown only as pool metadata. |
| G005 | Done | `/domain/ci-deploys` | Runs with stage timings, releases with rollback confirm, changelog and next version generated from conventional commits, DORA tiles. Data is fixture, not read from CI. |
| G006 | Done | `/domain/certs-dns` | Expiry timeline with renewal state, record editor with zone-aware validation and a diff before publish. Publish is simulated. |
| G007 | Done | `/domain/media-archive` | Searchable and filterable library, playlists with reorder, validated metadata editor. No audio playback. |
| G008 | Partial | `/domain/job-pipeline` | Kanban with moves, funnel and stage conversion, application timeline. Document previews are text placeholders, not real files. |
| G009 | Done | `/domain/access` | Role/permission matrix whose changes write audit events, API keys shown once, webhooks with simulated replay, filterable audit log. |
| G010 | Done | `/domain/billing` | Invoice list and editor with validation, integer-cent totals with GST, status ageing, usage metering with tiered cost. Not yet the same data as the LaTeX invoice sample; see G019. |
| G012 | Partial | `/domain/airport-ops` | Lane throughput, queue wait via Little's law, equipment test state, staffing roster with coverage gaps. All synthetic; no real shift system. |
| G013 | Done | `/domain/warehouse-ops` | Stock cover and reorder suggestions, receival reconciliation, pick rates, order table. Reads the live warehouse store and engine used by the kiosk system. |
| G014 | Done | `/domain/council-data` | Waste calendar with next collection, SVG car-park map with nearest-free, dataset catalogue search. Fictional council. |
| G015 | Partial | `/domain/esp-fleet` | Firmware versions, ringed OTA rollout with a 20% failure halt gate, best BLE proxy. OTA and BLE are simulated; nothing talks to a device. |
| G018 | Done | `/domain/design-system` | Token version diff, releases, consumers per version, contrast report using the real `checkContrast` on the default tokens, graphics browser using `@belikh/jupiter-graphics`. Version history is fixture. |
| G019 | Partial | `/domain/documents` | Template gallery, a generated-PDFs list (fixture records only), invoice and letter forms that generate escaped LaTeX and a build command. Nothing is compiled; no real PDFs exist. |
| G022 | Partial | `/domain/agent-runs` | Run list with cost from token rates (example pricing), eval pass rate and regressions, prompt library with variable extraction. Session and tool-call drill-down is shallow. |

## Verification

- `tsc --noEmit`: no errors in `src/areas/domain`.
- `vitest run src/areas/domain`: 61 passed.
- Visual: screenshots of all 16 pages reviewed at 1440px (light, some dark), plus service-health at 390px dark. Fixed after review: Access status switch label said "active" next to an off switch; invoice preview table overflowed its card. Known cosmetic gaps: ESP firmware donut legend has no colour swatches, the shared chart toolbar's Export button clips slightly, and long tables/kanban scroll horizontally. Only one mobile page was captured.

## Note

During this run the dev server intermittently rendered a blank page (`Cannot access 'AREA_ROUTES' before initialization`, `src/routes.ts:39`) from a circular import: `routes.ts` -> `areas/registry.ts` -> every area, while `areas/tools/pages/SystemInfo.tsx`, `areas/tools/pages/Diagnostics.tsx` and `areas/chrome/nav.tsx` import `routes.ts` back. No domain file imports `routes.ts`. It was flaky (some loads fine, some blank) and still present in the dev log at last check, so it belongs to those areas to fix (read `ROUTES` lazily or move the shared types out of `routes.ts`).
