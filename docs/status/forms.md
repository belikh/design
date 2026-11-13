# Status: embeds, playlist, licence, forms, surveys, approvals, moderation

Code: `apps/admin/src/areas/forms/`. Tests: `forms.test.tsx` (27 tests). All data is in-memory sample data.

| ID | Route | Status | Note |
|---|---|---|---|
| A019 | `/embed` (+ bare `/embed/view/:id`) | Done | Widget picker, theme/title/refresh options, iframe snippet, live preview, chrome-free embedded view reading `?theme`, `?title`, `?refresh`. No real cross-origin auth. |
| A020 | `/playlist` (+ bare `/playlist/tv`) | Done | Editable dwell time and on/off per slide, Up/Down reorder, add/remove with undo; TV player auto-rotates with progress, pause, prev/next, full screen. Dashboards are small widget compositions, not links to real dashboards. |
| A087 | `/licence` | Done | Plan summary, expiry warning, entitlements DataTable (add-ons editable, plan limits locked), usage bars, key activation with checksum validation, seat request with undo. |
| A090 | `/form-builder` | Done | Drag from palette or Add button, drag or Up/Down reorder, field settings, conditional logic (upward-only, validated), working preview with validation, draft autosave. No export/persist to a backend. |
| A091 | `/survey-results` | Done | Generated 120 responses; NPS, completion, charts per question, group filter, comment search, CSV export. |
| A092 | `/approval-flow` | Done | Editable steps (approver, rule, condition, SLA), reorder, undoable removal, route simulator by amount, validation of coverage gaps, publish. Parallel branches not supported (linear steps with conditions). |
| A093 | `/moderation` | Done | Priority queue, detail with flags and author history, approve, reject modal with required reason, reopen, undo toasts. |

Notes: nothing outside the forms folder or docs was changed. `npx vitest run src/test/a11y` reports one failure on `/home/network` (not in this area); `lint:style` regressions come from the widgets area, not this one.
