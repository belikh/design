# Status: chrome (spec sections E and F)

Area: app shell and cross-cutting chrome. All pages live under `apps/admin/src/areas/chrome/` and appear in the **System** nav group at `/chrome/*`.
Statuses: **Done** = built, reachable, covered by the route smoke test (and a behaviour test where noted); **Partial** = works but with a stated limit.

| ID | Entry | Status | Route | Honest note |
|---|---|---|---|---|
| E011 | Media: lightbox, carousel, PDF, audio/video | Partial | `/chrome/media` | Lightbox, carousel (autoplay pauses on hover/focus, reduced-motion aware), PDF embed (a generated valid PDF), audio (real `<audio>` over a generated WAV) all work. Video is a canvas animation, not a real video codec stream. |
| E013 | Split panes, tiling, draggable dashboard grid | Done | `/chrome/panes` | Splitter has keyboard control and remembers position; tiles split/close/swap; grid cards move and resize with buttons as well as drag. Drag was exercised only by logic tests, not in a real pointer session. |
| E014 | Onboarding: tour, coachmarks, empty-state CTA | Done | `/chrome/onboarding` | `?tour=1` autostarts the tour (also in the command palette). Seen-state persists in localStorage. |
| E015 | Permission-aware UI (disabled, hidden, upsell) | Done | `/chrome/access` | `Can` disables with `inert` + reason, hides, or opens an upsell dialog. Roles are simulated client-side; no server enforces anything. |
| E016 | Env badge, impersonation, read-only, maintenance, consent | Done | `/chrome/banners` | Global banners and top-bar badge driven by the `system` store. `?visual=1` presets consent for screenshots only. |
| E017 | Status bar and background tasks tray | Done | `/chrome/status` | Tasks are simulated timers (progress, cancel, retry, clear). Connection state is a toggle, not a real network probe. |
| E018 | Inspector, outline, mini-map | Done | `/chrome/workspace` | Small diagram editor demonstrating all three; not a general-purpose canvas. |
| E019 | Document tabs and saved layouts | Done | `/chrome/tabs` | Close, drag and Alt+Arrow reorder, pin, middle-click close, tab list menu; layouts saved to localStorage. |
| E020 | Selection summary and clipboard tray | Done | `/chrome/selection` | Tray lives in the status bar; pin/drop/clear. Copies go through the app's own tray, not the OS clipboard history. |
| E022 | Notification types, grouping, snooze | Done | `/chrome/notifications` | Grouping by day/type, per-item snooze with time presets. Data is fictional. |
| E023 | Entity chips with hover cards | Done | `/chrome/entities` | User, device, service, host. Cards are static fixtures, not live lookups. |
| E024 | KPI with target, comparison chip, mini-gauge, metric list | Done | `/chrome/kpi` | |
| E025 | Timeline variants | Done | `/chrome/timeline` | Vertical, horizontal, grouped by day, with text diffs (uses `DiffViewer`). |
| E027 | Shortcut sheet, help panel, inline docs popover | Done | `/chrome/help` | Sheet is generated from the live shortcut registry (`?`), help panel opens with F1 and is context-aware per route. The docs corpus is a small hand-written set, not every page. |
| E028 | Wizard parts | Done | `/chrome/wizard` | Step rail, per-step validation with inline error, review with edit links, success screen. |
| E029 | Danger zone, soft delete, undo window, cooldown | Done | `/chrome/danger` | Type-to-confirm, 3 s arming delay, retention and restore, a time-travel control to see purge and cooldown. Soft delete is in-memory. |
| F007 | Undo/redo, optimistic updates, conflicts | Done | `/chrome/undo` | Undo stack, optimistic save with rollback on failure, three-way merge dialog on conflict (`merge3`). Server is simulated. |
| F009 | Permissions and audit trail | Done | `/chrome/access` | Role matrix + filterable audit log (persisted, capped). Audit is client-side so is not tamper-proof. |
| F010 | Export and share (CSV, PNG, PDF, scheduled email) | Partial | `/chrome/share` | CSV/JSON/Markdown/PNG/PDF exports work and the PDF is generated in-browser. "Scheduled email" and share links are UI + stored schedule only; nothing is sent. |
| F011 | Workspace/environment scoping, "view as role" | Done | `/chrome/access`, top bar | Switching workspace changes the environment badge and scoped data; view-as shows a banner and applies that role's permissions. |
| F013 | Large data (100k rows, 1M points) and budgets | Partial | `/chrome/scale` | Virtualised 100k-row table and LTTB-downsampled 1M-point canvas chart, with timing budgets. Budgets are machine-dependent and not enforced in CI; the page's own numbers were not benchmarked across devices. |
| F018 | Touch targets, gestures, non-drag alternatives | Partial | `/chrome/touch` | 44px audit, app-wide touch mode, swipe rows with menu fallbacks, reorder with buttons. Pointer events were tested in jsdom/headless only, not on a real touch device. Touch-mode CSS covers the common controls, not every component. |
| F019 | Delivery channels, digest, quiet hours | Partial | `/chrome/delivery` | Routing engine is tested (quiet hours incl. overnight windows, urgent bypass, digest hold) and the email template is the generated one. Nothing is actually delivered. |

## Also delivered

- **Scalable shell nav**: collapsible groups with remembered state, filter box, active-group auto-expand, arrow/Home/End keys, rail mode. Command palette (Ctrl/Cmd+K) lists up to 40 results and includes tour/role/read-only actions.
- **Surface parity page**: `/chrome/parity` (hand-compiled, can go stale).
- **Visual regression**: `npm run visual` (see below).

## Skipped (not in the 23 above, mentioned in the brief)

Assistant/chat panel with streaming and tool-call cards, presence/locks/comments: not built.

## Visual regression

```bash
npm run visual                          # all routes, light + dark, compare with visual/baseline.json
npm run visual -- --only /chrome     # subset by path prefix
npm run visual -- --update              # refresh baseline after an intended visual change
VISUAL_URL=http://127.0.0.1:3000 npm run visual   # reuse a running dev server
```

Needs `chromium` on PATH (override with `CHROMIUM=`). Screenshots go to `.visual/` (gitignored); `visual/baseline.json` stores a 24×14 luminance grid per screenshot, so clocks and relative times don't fail the run but layout and colour changes do. It is a coarse check, not pixel-perfect. Only `/chrome` has a baseline so far: run `--update` once for the full set after all P2 areas land. Exit code is 1 on changes or failures.

## Tests

`src/areas/chrome/engine.test.ts`, `pdf.test.ts`, `chrome.test.tsx` (34 tests) plus the automatic route smoke test in `src/routes.test.tsx`.
