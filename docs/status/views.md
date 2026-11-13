# Status: `views` (spec A1, A2, A5)

Module: `apps/admin/src/areas/views/` · nav group "Views" · 36 routes under `/views/`.
Tests: `logic.test.ts` (19, pure logic) + `pages.test.tsx` (17, UI interactions); the `src/routes.test.tsx` smoke test renders every `/views/*` route.
All data is fictional and deterministic. State that users change (files, trash, contacts, assets, favourites, saved dashboards, consent) persists in the browser's localStorage only; there is no server.

| ID | Entry | Status | Route | Note |
|---|---|---|---|---|
| A003 | KPI scorecard | Done | `/views/scorecard` | Editable targets, status filters, owners, narrative. |
| A004 | Operations / NOC wall | Partial | `/ops` (existing P1 build) | Not rebuilt here; the existing ops wall already covers dense glanceable auto-refresh. |
| A005 | Executive summary | Done | `/views/scorecard` (Executive tab) | Big numbers plus generated narrative. |
| A006 | Per-entity dashboard | Done | `/views/entity?kind=&id=` | Service / device / customer via query params; records recents. Customers also have `/customers/:id`. |
| A010 | Report page | Done | `/views/report` | Paged, running header/footer, A4/Letter `@page`, print CSS. Browser print only; no PDF engine. |
| A011 | SLO / error budget | Done | `/views/slo` | Target and window selectors, burn-rate alerts, nines table. |
| A012 | Capacity forecast | Done | `/views/capacity` | Linear-fit forecast with band, growth what-if, limit line, days-until. Simple model, not seasonal. |
| A013 | Cost and spend | Done | `/views/cost` | Budget vs actual, by tag, variance and projection. |
| A014 | Security posture | Done | `/views/security` | Findings by severity; acknowledge / fix / reopen with undo. |
| A015 | Live-stream dashboard | Done | `/views/live` | Simulated rolling window and event ticker; pause and speed control. |
| A016 | Two-period comparison | Done | `/views/compare` | Period or entity compare with deltas. |
| A017 | My work home | Done | `/views/my-work` | Assigned, mentions, recents. |
| A018 | Dashboard gallery | Done | `/views/gallery` | Templates, create modal, "My dashboards" persisted. Created dashboards are saved records, not freely editable layouts. |
| A025 | Tree explorer | Done | `/views/files` | Shares the file tree with the file manager. |
| A026 | File manager | Done | `/views/files` | Grid/list, breadcrumbs, preview pane, rename, new folder, delete to Trash with undo. Files are metadata only (no uploads). |
| A027 | Media library | Done | `/views/media` | Filters and bulk select. Thumbnails are illustrations. |
| A028 | Inbox / messaging | Partial | `/inbox` (existing P1 build) | Not rebuilt here. |
| A033 | Timeline / Gantt | Done | `/views/roadmap` | Lanes, zoom, today line; bars move by keyboard or drag, in whole-month steps only. |
| A034 | Map view | Partial | `/views/map` | Markers, clusters, polygons and synced side list work, but the map is a stylised plane, not real geography or tiles. |
| A035 | Org chart | Done | `/views/org` | Collapsible chart plus directory list. |
| A036 | Asset register | Done | `/views/assets` | Check-out modal, archive, label with a pseudo-QR (not scannable). |
| A037 | Comparison view | Done | `/views/compare` | Side-by-side with diff highlighting. |
| A038 | Approval queue | Done | `/views/approvals` | Approve, reject with required reason, bulk approve low-risk only, undo. |
| A039 | Task list with subtasks | Done | `/views/tasks` | Rollup, parent completion, add subtask, hide done. |
| A040 | Ticket list with SLA timers | Done | `/views/tickets` | SLA clock pauses on "waiting on customer" and records met/missed on resolve. Clock is simulated. |
| A041 | Contacts with pipeline | Done | `/views/contacts` | Pipeline and list views, edit drawer, delete to Trash. |
| A042 | Product catalogue | Done | `/views/catalogue` | Variants, out-of-stock options disabled, cart capped at stock. Checkout is a demo. |
| A043 | Orders and detail | Done | `/views/orders` (`?id=`) | Line items with GST, fulfilment timeline, advance/cancel. |
| A044 | Trash, archive, restore | Done | `/views/trash` | Shared with files, contacts and assets; restore, and delete-forever requires typing the name. |
| A045 | Version history | Done | `/views/history` | Restore appends a new head and keeps history. |
| A046 | Favourites, recents, pinned | Done | `/views/favourites` | Stored locally; not wired into the shell sidebar. |
| A047 | Duplicate detection and merge | Done | `/views/duplicates` | Jaro-Winkler plus company match, union-find groups, merge. |
| A048 | Tag and taxonomy manager | Done | `/views/taxonomy` | Rename, move (cycle guard), merge, delete; sibling clash errors. |
| A049 | Saved searches | Done | `/views/saved-searches` | Save, run, delete. Searches run over the fictional contacts only. |
| A050 | Leaderboard | Done | `/views/leaderboard` | Ranks with ties and rank-change deltas, podium. |
| A051 | Live tile wall | Partial | `/views/tile-wall` | Tile layout and status work; camera feeds are illustrations, not video. |
| A052 | Entity history across systems | Done | `/views/history` (tab) | Merged cross-system timeline. |
| A053 | Backlog with drag prioritisation | Done | `/views/backlog` | Drag, move buttons and Alt+Up/Down, sprint line. |
| A127 | Account locked / session expired / consent | Done | `/views/account-states` | Lock countdown, resend cooldown, idle warning modal, consent bar and manager. Not connected to real auth. |
| A130 | Changelog | Done | `/views/changelog` | Filter by type. |
| A131 | Help centre / support form | Partial | `/views/support` (+ existing `/help`) | Validated form with suggested answers; nothing is sent anywhere. |
| A132 | Legal long-form | Done | `/views/legal` | Anchor nav, reading progress, accept. Placeholder text. |

## Honest gaps
- Map is not real geography; tile-wall feeds and media thumbnails are illustrations; the pseudo-QR is not scannable.
- All user changes are browser-local; nothing persists server-side.
- i18n is not applied to these pages.
- A004 and A028 point at existing P1 pages rather than new builds.
- The full-app route smoke test currently fails on `/chrome/help` ("Maximum update depth exceeded"), which is outside this module.
