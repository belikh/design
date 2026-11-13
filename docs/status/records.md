# Status: Records (spec section A3, detail and edit)

Area: `apps/admin/src/areas/records/` (nav group **Records**). All routes live under `/records/`. Pure logic is in `*.logic.ts` and
unit-tested; every page has interaction tests in `pages.test.tsx`. Data is fictional and deterministic, state lives in the browser, and
nothing talks to a server. "Done" means the workflow works end to end in the browser; it does not mean it is wired to a backend.

| ID | Entry | Status | Route | Note |
| --- | --- | --- | --- | --- |
| A056 | Split view with resizable panes | Done | `/records/split` | Horizontal and nested vertical panes; drag, arrow keys (Shift = bigger), Home/End, double-click reset; sizes remembered; stacks on phones (divider hidden). |
| A061 | Bulk edit | Done | `/records/bulk-edit` | Select rows, queue several field changes, shows mixed-value fields and "N of M will change", applies with undo. Four fields only (status, owner, tags, price). |
| A064 | Permissions / roles matrix | Done | `/records/roles` | Role × resource × action, inheritance with locked inherited cells and their source, cycle prevention, explain panel, create and delete role. In-memory only. |
| A065 | Onboarding checklist / setup progress | Done | `/records/onboarding` | Dependencies, optional steps, skip/undo, progress ring, "continue" next step, remembered in localStorage. |
| A066 | Billing: plans, usage, invoices, payment methods | Done | `/records/billing` | Plan change with proration, usage chart and projected overage, invoice detail drawer, add/remove/default cards with Luhn and expiry validation. No real payment processing. |
| A067 | API keys and webhooks management | Done | `/records/api` | Scoped keys shown once, rotate/revoke with undo, webhook endpoints with https-only validation, test send, delivery log with retries and exponential backoff, replay. The signature is a demo hash (FNV), not HMAC. |
| A068 | Integrations / connections gallery | Done | `/records/integrations` | Search and category filter, connect/configure drawer with required fields, simulated credential rejection, health state, reconnect, disconnect. |
| A069 | Feature flags / experiments | Done | `/records/flags` | Per-environment flags, kill switch, % rollout with deterministic bucketing, targeting rules, evaluator that explains each decision, production rollout confirmation, A/B result with two-proportion z-test. |
| A070 | Import (upload, map columns, validate, preview, commit) | Done | `/records/import` | File picker or paste, header toggle, auto column mapping, per-row validation, duplicate detection, skip-problem-rows option, import summary and problem-rows CSV. Client-side only; no real destination. |
| A071 | Export / scheduled reports | Done | `/records/export` | Filter, choose columns, CSV/JSON/NDJSON download and copy, preview, scheduled reports with next-run calculation, pause, run now. Schedules are not executed in the background. |
| A072 | Incident page (status, timeline, responders, postmortem) | Done | `/records/incident` | Enforced status workflow (needs summary and one commander to resolve), timeline, responders, MTTR-style stats, postmortem editor with Markdown preview/copy. |
| A073 | Runbook page (checkable steps, run log) | Done | `/records/runbook` | Ordered steps, simulated commands, skip, abort, a failing destructive step aborts the run, run log. Commands are simulated, not executed. |
| A074 | Device detail (live metrics, config, logs, actions) | Done | `/records/device/:id` | Live-updating simulated metrics with health roll-up, staged config with validation, logs, locate/reboot/update, factory reset needs a typed confirmation. Three sample devices (`ap-office`, `esp-living`, `nas-tank`). |
| A075 | Config editor with staged changes, diff, apply and rollback | Done | `/records/config` | KEY=value editor with line-accurate errors, diff table and unified diff, apply with a note, append-only revision history, rollback creates a new revision. |
| A076 | Environment and secrets manager | Done | `/records/secrets` | Per-environment variables, masked secrets with reveal, rotation age states, rotate, delete with undo, cross-environment gap report. Secrets are held in browser memory only; never use real ones. |
| A077 | Template editor with live preview and variables | Done | `/records/templates` | {{variables}} with dotted paths, sample values, HTML-escaped preview, missing-variable warnings, insert chips, HTML source view. |
| A078 | Notification preferences matrix (event by channel) | Done | `/records/notifications` | Event × channel matrix, presets, per-project override, per-event frequency, quiet hours across midnight with essential exceptions, delivery tester. |
| A079 | Active sessions and devices, with revoke | Done | `/records/sessions` | Sessions list with risk flag, revoke with undo, revoke all others (confirm), trusted-device toggle, sign-in history. |
| A080 | Team members and invites | Done | `/records/team` | Members and roles with owner/last-admin protection, multi-email invite with validation/dedupe, seat limit counting pending invites, resend/revoke, remove member. |
| A081 | Audit event detail (who, what, before and after) | Done | `/records/audit` | Filterable event list, detail, field-level change table, split before/after diff, sensitive values redacted unless toggled. |
| A082 | Data retention and privacy controls | Done | `/records/privacy` | Per-dataset retention with action and legal hold, purge dry-run preview, expiry chart, subject-rights requests with 30-day deadlines and status workflow (erasure blocked by holds), consent toggles. Nothing is actually purged. |
| A083 | Backup and restore wizard | Done | `/records/backup` | Restore-point chain resolution (incremental needs its base), scope and target, impact warnings (data loss window, schema drift), typed confirmation for in-place restore, progress. Simulated. |
| A084 | Upgrade assistant (pre-flight checks, progress, rollback) | Done | `/records/upgrade` | Editable environment facts drive blocking vs advisory checks, warning acknowledgement, phased progress with optional simulated failure, rollback. |
| A085 | Maintenance window scheduler | Done | `/records/maintenance` | 7-day timeline, create/edit/cancel, validation (end after start, 12 h limit), overlap detection on shared systems, notification flag, "now" fixed at 12 Nov 16:52 for determinism. |
| A086 | Quota and rate-limit usage | Done | `/records/quotas` | Quota cards with warning/critical/exceeded states and a live token-bucket simulator (bucket size, refill, burst, auto-traffic, 429 log). |
| A088 | Theme and branding editor (the token editor as a page) | Done | `/records/branding` | Edits real `@belikh/jupiter-tokens` in a scoped preview (inline CSS variables; the app theme is untouched), live contrast checks for light and dark, import/export tokens JSON. Does not write `jupiter.tokens.json`. |
| A089 | Custom fields and schema designer | Done | `/records/schema` | Field editor (add, reorder, delete), types, options, min/max, conditional visibility, issues list, generated JSON Schema, and a form generated from it with validation. Does not enforce conditional `required` in the emitted JSON Schema (it omits conditionally-required fields from `required`). |

Out of scope for this fork (specialised tier): A087 licence and entitlements, A090 form builder, A091 survey results, A092 approval-flow designer, A093 moderation detail.
P1 entries in the section (A054, A055, A057–A060, A062, A063) were built earlier in `apps/admin/src/pages/`.

## Honest gaps
- No server: everything is browser state, so nothing persists across reloads except the onboarding checklist and split-pane sizes.
- Security-sensitive demos (API keys, secrets, card entry, webhook signing) are illustrative. They must not be reused as real implementations (the signature is non-cryptographic; card data is not tokenised).
- Time is fixed or simulated in several pages (incident clock, maintenance "now", schedules) so output stays deterministic.
- Visual review covered four pages on desktop (roles, branding, incident, maintenance) and roles at 390 px; the last panel-header wrap fix was not re-screenshotted. The remaining pages are covered by interaction tests and a route smoke render but were not individually screenshotted.
- Translations and right-to-left layout were not audited for these pages (logical CSS properties are used where practical).
