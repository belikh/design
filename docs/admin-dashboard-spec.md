# Admin dashboard template: coverage spec (draft 2: author's list + advisor's doubling)

Goal: one template that demonstrates every view type, input type and visualisation we are likely to need, so any
internal tool can be assembled from it. Everything is themed from `@belikh/jupiter-tokens`; graphics come from
`@belikh/jupiter-graphics`. Each entry becomes a section or route in the template, with realistic sample data.

**Tiers are proposals.** `Core` = the core kit needed to build almost any admin tool; `Common` = common, build next;
`Specialised` = specialised or domain-specific, build on demand. Pick the first tier to build and edit this file to move entries.
IDs are stable within this draft only; the ID prefix is the section letter.

## A. Page and view types

### A1. Dashboards
- `A001` **Core** Overview / home (KPI row + charts + activity)
- `A002` **Core** Analytics dashboard (time-range, comparison, breakdowns)
- `A003` **Common** KPI scorecard (targets, status, owners)
- `A004` **Common** Operations / NOC wall (dense, glanceable, auto-refresh)
- `A005` **Common** Executive summary (big numbers, narrative)
- `A006` **Common** Per-entity dashboard (one service / one device / one customer)
- `A007` **Core** Customisable dashboard (drag, resize, add and remove widgets, edit mode)
- `A008` **Core** Kiosk / wall display mode (large type, high contrast, no chrome)
- `A009` **Core** Status page (public, uptime bars, incident history)
- `A010` **Common** Report page (print-ready, paged, with headers and footers)
- `A011` **Common** SLO and error-budget dashboard (burn rate, budget left)
- `A012` **Common** Capacity planning and forecast
- `A013` **Common** Cost and spend (budget vs actual, by tag)
- `A014` **Common** Security posture (findings by severity, coverage)
- `A015` **Common** Live-stream dashboard (rolling window, event ticker)
- `A016` **Common** Two-period or two-entity comparison dashboard
- `A017` **Common** Personal "my work" home (assigned, mentions, recents)
- `A018` **Common** Dashboard gallery and template picker
- `A019` **Specialised** Embedded single-widget view
- `A020` **Specialised** Rotating playlist of dashboards for TVs

### A2. Lists and collections
- `A021` **Core** Data table (full-featured, see B)
- `A022` **Core** Card grid / gallery
- `A023` **Core** List view (rows with metadata and quick actions)
- `A024` **Core** Kanban board (columns, swimlanes, WIP limits, drag and drop)
- `A025` **Common** Tree / hierarchy explorer
- `A026` **Common** File manager (folders, grid and list, preview pane, breadcrumbs)
- `A027` **Common** Media library (thumbnails, filters, bulk select)
- `A028` **Common** Inbox / messaging (list + thread + composer)
- `A029` **Core** Activity feed / audit log
- `A030` **Core** Notifications centre
- `A031` **Core** Search results (grouped by type, facets, highlights)
- `A032` **Core** Calendar (month, week, day, agenda, resource view)
- `A033` **Common** Timeline / roadmap / Gantt
- `A034` **Common** Map view (markers, clusters, polygons, side list)
- `A035` **Common** Org chart / team directory
- `A036` **Common** Inventory / asset register
- `A037` **Common** Comparison view (side by side, diff highlighting)
- `A038` **Common** Approval queue
- `A039` **Common** Task list with subtasks
- `A040` **Common** Ticket list with SLA timers
- `A041` **Common** Contacts list with pipeline stages
- `A042` **Common** Product catalogue with variants
- `A043` **Common** Order list and order detail (line items, fulfilment timeline)
- `A044` **Common** Trash, archive and restore
- `A045` **Common** Version history with restore
- `A046` **Common** Favourites, recents, pinned
- `A047` **Common** Duplicate detection and merge
- `A048` **Common** Tag and taxonomy manager
- `A049` **Common** Saved searches and smart collections
- `A050` **Common** Leaderboard page
- `A051` **Common** Live tile wall (cameras, screens)
- `A052` **Common** Entity history across systems
- `A053` **Common** Backlog with drag prioritisation

### A3. Detail and edit
- `A054` **Core** Detail page (summary header, tabs, related panels)
- `A055` **Core** Master-detail (list left, detail right)
- `A056` **Common** Split view with resizable panes
- `A057` **Core** Profile page (user / customer / device)
- `A058` **Core** Edit form page (sectioned, sticky save bar, dirty state)
- `A059` **Core** Create wizard (multi-step with validation, review step)
- `A060` **Core** Drawer edit (side panel) and modal edit
- `A061` **Common** Bulk edit
- `A062` **Core** Inline edit (click to edit fields and cells)
- `A063` **Core** Settings (tabbed, sectioned, search within settings)
- `A064` **Common** Permissions / roles matrix
- `A065` **Common** Onboarding checklist / setup progress
- `A066` **Common** Billing: plans, usage, invoices, payment methods
- `A067` **Common** API keys and webhooks management
- `A068` **Common** Integrations / connections gallery
- `A069` **Common** Feature flags / experiments
- `A070` **Common** Import (upload, map columns, validate, preview, commit)
- `A071` **Common** Export / scheduled reports
- `A072` **Common** Incident page (status, timeline, responders, postmortem)
- `A073` **Common** Runbook page (checkable steps, run log)
- `A074` **Common** Device detail (live metrics, config, logs, actions)
- `A075` **Common** Config editor with staged changes, diff, apply and rollback
- `A076` **Common** Environment and secrets manager
- `A077` **Common** Template editor with live preview and variables
- `A078` **Common** Notification preferences matrix (event by channel)
- `A079` **Common** Active sessions and devices, with revoke
- `A080` **Common** Team members and invites
- `A081` **Common** Audit event detail (who, what, before and after)
- `A082` **Common** Data retention and privacy controls
- `A083` **Common** Backup and restore wizard
- `A084` **Common** Upgrade assistant (pre-flight checks, progress, rollback)
- `A085` **Common** Maintenance window scheduler
- `A086` **Common** Quota and rate-limit usage
- `A087` **Specialised** Licence and entitlements
- `A088` **Common** Theme and branding editor (the token editor as a page)
- `A089` **Common** Custom fields and schema designer
- `A090` **Specialised** Form builder (drag fields, conditional logic, preview)
- `A091` **Specialised** Survey results page
- `A092` **Specialised** Approval flow designer
- `A093` **Specialised** Moderation detail (approve, reject, reason)

### A4. Tools
- `A094` **Common** Report / query builder (visual)
- `A095` **Common** SQL / query console with results grid
- `A096` **Core** Log viewer (live tail, filters, levels, context)
- `A097` **Common** Terminal / console panel
- `A098` **Common** JSON / YAML / code editor with validation
- `A099` **Common** Diff viewer (split and unified)
- `A100` **Common** Markdown / rich-text document editor
- `A101` **Common** Markdown / docs reader
- `A102` **Common** Network / topology explorer
- `A103` **Common** Trace viewer (span waterfall)
- `A104` **Specialised** Workflow / automation builder (nodes and edges)
- `A105` **Common** Schedule / cron manager
- `A106` **Common** Job queue monitor
- `A107` **Core** Command palette and global search
- `A108` **Common** Metrics explorer (pick metric, group by, ad hoc chart)
- `A109` **Common** Alert rule editor with test against history
- `A110` **Specialised** Notebook (text, query and chart cells)
- `A111` **Common** API request builder with response viewer
- `A112` **Specialised** Webhook delivery log with replay
- `A113` **Common** Regex, JSONPath and jq playground
- `A114` **Specialised** Database browser (tables, relations, rows)
- `A115` **Specialised** Object storage browser
- `A116` **Specialised** Network flow viewer
- `A117` **Specialised** Remote shell with session recording
- `A118` **Specialised** Firmware rollout manager (rings, progress)
- `A119` **Specialised** Image annotation tool
- `A120` **Common** Data quality report
- `A121` **Common** Bulk job runner (dry run, per-row results)
- `A122` **Common** Diagnostics and self-test page
- `A123` **Common** System info and about
- `A124` **Core** Component kitchen-sink page
- `A125` **Common** Print and PDF preview

### A5. Auth, errors and system pages
- `A126` **Core** Sign in, sign up, forgot and reset password, 2FA, magic link, SSO chooser
- `A127` **Common** Account locked, session expired, consent
- `A128` **Core** 401, 403, 404, 500, 503 maintenance, offline
- `A129` **Core** Empty states per view (first-run, no results, no permission, cleared)
- `A130` **Common** Changelog / what's new
- `A131` **Common** Help centre / support request form
- `A132` **Common** Legal / terms / privacy (long-form reading layout)

## B. Table and data-grid capabilities

- `B001` **Core** Sort (single and multi), column filters, global quick search
- `B002` **Core** Faceted filters with counts, saved filters and views
- `B003` **Core** Column show/hide, reorder, resize, pin left/right, sticky header and first column
- `B004` **Core** Row selection (single, multi, select-all across pages), bulk-action bar
- `B005` **Core** Row actions menu, hover actions, row click to open drawer
- `B006` **Core** Expandable rows (detail panels), nested / tree rows
- `B007` **Common** Grouped rows with aggregates (sum, avg, count) and collapse
- `B008` **Core** Inline cell editing with validation and undo
- `B009` **Core** Cell renderers: text, number, currency, percent, date, relative time, badge, progress, sparkline, avatar, tags, link, copy, boolean, rating, icon, bar-in-cell, heat-cell, status dot
- `B010` **Core** Pagination, infinite scroll, cursor pagination, virtualised rows (100k)
- `B011` **Core** Density toggle (compact, comfortable), zebra, borders on/off
- `B012` **Common** Footer totals, summary row
- `B013` **Common** Pivot table, cross-tab with heat colouring
- `B014` **Specialised** Spreadsheet grid (cell ranges, formulas, fill handle, copy/paste)
- `B015` **Common** Export (CSV, JSON, XLSX, PDF) and copy as markdown
- `B016` **Common** Drag to reorder rows, drag between tables
- `B017` **Core** Loading skeleton, empty, error with retry, partial results, stale-data badge
- `B018` **Core** Responsive: table to cards below a breakpoint
- `B019` **Common** Header menu with per-column aggregate picker
- `B020` **Common** Pinned rows (top and bottom)
- `B021` **Common** Conditional formatting (colour scales, icon sets, data bars)
- `B022` **Common** Range selection with sum, average and count in a status bar
- `B023` **Core** Keyboard grid navigation and ARIA grid roles
- `B024` **Common** Drag-to-group bar, multi-level grouping
- `B025` **Common** Nested sub-table in a row
- `B026` **Common** Row reorder with handles and a keyboard alternative
- `B027` **Common** Column groups, multi-row headers, rotated headers
- `B028` **Common** Wrap vs truncate, row height options, auto-fit column
- `B029` **Common** Diff mode between two snapshots
- `B030` **Common** Live rows (streaming inserts, flash on change, pause)
- `B031` **Common** Row severity stripe, row-level error markers
- `B032` **Common** Bulk paste from a spreadsheet with validation preview
- `B033` **Common** Server-side mode, estimated totals, "load more"
- `B034` **Common** Find in table (highlight, next and previous)
- `B035` **Common** Column statistics popover (mini-histogram, nulls, distinct)
- `B036` **Common** View switcher for one dataset (table, cards, calendar, map, timeline)

## C. Input types

### C1. Text
- `C001` **Core** Text, textarea (auto-grow), password (strength meter, reveal), email, URL, phone, search (with clear)
- `C002` **Core** Prefix / suffix / addon, inline unit, character counter, input mask
- `C003` **Common** Rich text (WYSIWYG), markdown editor with preview, code input with syntax highlight
- `C004` **Common** Mention / slash-command input
- `C005` **Core** OTP / PIN code
- `C006` **Common** Secret / API key field (masked, reveal, copy, rotate)
- `C007` **Common** Card, IBAN, BSB and ABN masked inputs
- `C008` **Common** Password generator, passkey enrolment, TOTP QR, recovery codes
- `C009` **Common** Async availability check (username, slug)
- `C010` **Common** Click-to-edit inline text
- `C011` **Common** Rich text with attachments, tables, variable inserter, snippets
- `C012` **Common** Code editors for SQL, YAML, JSON, shell and CSS, with lint, format and diff before save

### C2. Numeric
- `C013` **Core** Number, stepper, currency, percentage, unit-aware (kg, ms, GB)
- `C014` **Core** Slider, range slider (dual), slider with marks, stepped, vertical
- `C015` **Specialised** Rating (stars, hearts), NPS 0 to 10, Likert scale, emoji reaction
- `C016` **Common** Scrub-to-change number, knob or dial
- `C017` **Common** Min-max pair, ratio, dimensions (W by H by D)
- `C018` **Common** Allocation sliders that sum to 100
- `C019` **Common** Money with currency selector, money range
- `C020` **Common** Unit-switching input

### C3. Choice
- `C021` **Core** Select, multi-select, grouped options, searchable combobox, async search, creatable
- `C022` **Core** Radio, radio cards, checkbox, checkbox group, tri-state, switch, segmented control, toggle button group
- `C023` **Core** Tag / chip input
- `C024` **Common** Transfer list (dual listbox)
- `C025` **Common** Tree select, cascader, hierarchical checklist
- `C026` **Common** Country / region / timezone / language pickers
- `C027` **Specialised** Icon picker, emoji picker
- `C028` **Common** Autocomplete with recent items and ghost completion
- `C029` **Common** Multi-value paste into chips, with per-chip validation
- `C030` **Common** Switch with confirm and pending states
- `C031` **Common** Radio with "other" text, conditional reveal fields
- `C032` **Common** Rich options (avatar, icon, description), virtualised long lists, select all
- `C033` **Common** People, assignee, role and team pickers
- `C034` **Common** Record reference picker, relation editor

### C4. Date and time
- `C035` **Core** Date, time, datetime, date range, week, month, year picker, preset ranges, relative ("last 7 days"), timezone-aware
- `C036` **Common** Duration input
- `C037` **Specialised** Cron expression builder, recurrence rule builder, weekly availability grid
- `C038` **Common** Natural-language date, fiscal period, multi-date, blackout dates
- `C039` **Common** Time-zone conversion preview, working-hours picker

### C5. Files and media
- `C040` **Core** File upload (drag and drop, multi, progress, validation, resume), image upload with crop, avatar upload, paste image
- `C041` **Specialised** Signature pad, drawing canvas
- `C042` **Specialised** Colour picker (swatches, hex, HSL, gradient), font picker
- `C043` **Specialised** Audio / video recorder
- `C044` **Specialised** Palette editor with contrast check
- `C045` **Specialised** Box-model spacing editor, easing-curve editor
- `C046` **Common** Folder upload, URL import, camera capture, barcode and QR scan, chunked large files
- `C047` **Common** Image focal point, alt text, redact, SVG preview on light and dark
- `C048` **Specialised** Audio waveform trim, video thumbnail picker

### C6. Structured
- `C049` **Core** Key-value editor, repeater (add, remove, reorder rows), nested form groups
- `C050` **Specialised** Query / filter builder (AND / OR groups), regex tester, formula editor
- `C051` **Common** JSON schema form (rendered from a schema)
- `C052` **Common** Address autocomplete with map confirm, geo point picker, radius picker
- `C053` **Common** IP / CIDR / MAC / port range / hostname inputs
- `C054` **Common** Permissions matrix (rows by resources, columns by actions)
- `C055` **Specialised** Schedule picker, calendar slot picker
- `C056` **Common** Drag-sort list, ranking input, matrix of questions
- `C057` **Specialised** CAPTCHA / human check placeholder
- `C058` **Common** Per-locale translations editor
- `C059` **Common** Filter pills with operators
- `C060` **Common** Tokenised search (field:value chips), scopes, saved queries
- `C061` **Common** Editable grid as a field, checkbox and radio matrix
- `C062` **Common** Rule builder (if and then), threshold editor previewed on a chart
- `C063` **Common** Column mapping editor, option-list editor
- `C064` **Specialised** Polygon and bounding-box draw, route waypoints, room picker, rack-unit picker
- `C065` **Common** VLAN id, subnet calculator, firewall, DNS and port-forward rule rows, SSH key paste with fingerprint
- `C066` **Specialised** Device and entity picker, GPIO pin picker, sunrise and sunset offsets

### C7. Form behaviour (every input shows these)
- `C067` **Core** States: default, hover, focus, filled, disabled, read-only, loading, error, warning, success
- `C068` **Core** Help text, label placement (top, left, floating), required marker, inline validation, validation summary
- `C069` **Core** Dirty indicator, autosave status, unsaved-changes guard, reset to default
- `C070` **Core** Form layouts: single column, two column, sectioned, inline, horizontal, stepped, sticky action bar
- `C071` **Specialised** Scroll-to-accept, hold-to-confirm, slide-to-confirm
- `C072` **Common** Save and resume, draft and publish
- `C073` **Common** Field permissions and field history
- `C074` **Core** Cross-field and conditional validation
- `C075` **Core** Focus first error, paste JSON to fill

## D. Visualisations

### D1. Comparison and trend
- `D001` **Core** Line, multi-line, smoothed, stepped
- `D002` **Specialised** Area, stacked area, 100% stacked area, streamgraph
- `D003` **Core** Bar vertical, horizontal, grouped, stacked, 100% stacked, with target line, diverging
- `D004` **Common** Lollipop, dot plot, dumbbell, slope chart
- `D005` **Common** Combo chart (bar + line, dual axis)
- `D006` **Core** Sparklines (line, bar, area, win-loss), sparkline table
- `D007` **Common** Small multiples
- `D008` **Core** Annotated time series (events, deployments, incidents), forecast with confidence band, anomaly highlight, brush and zoom, crosshair
- `D009` **Specialised** Min-max band, fan chart
- `D010` **Specialised** Horizon chart, cycle plot
- `D011` **Common** Floating range bars
- `D012` **Common** Table as chart (heat table, bar table, dot table, rank change arrows)

### D2. Distribution
- `D013` **Specialised** Histogram, density, ridgeline, box plot, violin, strip / beeswarm
- `D014` **Common** Scatter, bubble, scatter matrix, hexbin, regression line
- `D015` **Core** Heatmap (matrix, correlation), calendar heatmap (contribution style), time-of-day by day-of-week grid
- `D016` **Common** Percentile latency chart (p50, p95, p99)
- `D017` **Common** Latency bucket heatmap over time
- `D018` **Specialised** Cumulative distribution, QQ plot

### D3. Composition
- `D019` **Core** Pie, donut (with centre label), semi-donut
- `D020` **Core** Stacked bar and 100% stacked
- `D021` **Specialised** Treemap, sunburst, icicle, packed circles
- `D022` **Specialised** Waterfall, Pareto, funnel, pyramid
- `D023` **Common** Stacked progress bar, segmented bar
- `D024` **Specialised** Bump chart (rank over time), Marimekko
- `D025` **Specialised** Waffle, pictogram, unit chart
- `D026` **Specialised** Rose chart, 24-hour radial clock chart
- `D027` **Specialised** Nested donut, gauge cluster
- `D028` **Specialised** Diverging Likert, NPS gauge
- `D029` **Common** Top-N with "other", co-occurrence matrix

### D4. Progress and status
- `D030` **Core** Progress bar, ring, multi-ring, segmented progress, steps
- `D031` **Core** Gauge (radial, linear, thermometer, battery), bullet chart, radial bar
- `D032` **Core** Big number + delta + sparkline tile
- `D033` **Core** Uptime bars (status page style), status grid, traffic-light matrix
- `D034` **Common** Leaderboard / ranking with bars, bar chart race
- `D035` **Common** Actual vs target bar-in-bar, burn-down, burn-up, cumulative flow
- `D036` **Common** RED and USE panel layouts (rate, errors, duration, saturation)
- `D037` **Common** SLO burn-rate chart, availability-nines table
- `D038` **Common** KPI table with inline bars, traffic lights and trend arrows
- `D039` **Common** Comparison tiles (vs last period, target, peers), percentile rank bar
- `D040` **Common** Live counter, countdown, world clocks, rate meter

### D5. Relationships and flow
- `D041` **Specialised** Sankey, alluvial, chord, arc diagram
- `D042` **Common** Network graph (force), topology map, dependency graph
- `D043` **Specialised** Tree diagram, dendrogram, org chart, mind map
- `D044` **Common** Flowchart / process, state machine, sequence diagram
- `D045` **Specialised** Venn, UpSet plot
- `D046` **Common** Topology overlays (traffic-weighted edges, health colours, path trace)
- `D047` **Specialised** ER diagram, architecture diagram, dependency matrix, data-lineage and pipeline DAG with run states

### D6. Time and schedule
- `D048` **Common** Gantt, swimlane timeline, event river, resource schedule
- `D049` **Specialised** Trace span waterfall, flame graph, icicle flame
- `D050` **Specialised** Cohort retention table (heat), funnel conversion by step
- `D051` **Common** State timeline strip per entity, event strip, annotation lane
- `D052` **Common** Log volume histogram stacked by level, log pattern clusters
- `D053` **Common** CPU core heat strip, per-process treemap, thread timeline
- `D054` **Specialised** Commit calendar, branch graph, deploy frequency, lead time
- `D055` **Common** Step durations, drop-off reasons, journey paths

### D7. Geographic
- `D056` **Common** Choropleth, bubble map, marker clusters, route and flow lines, heat layer, floor plan / room map, rack diagram
- `D057` **Specialised** Switch faceplate port map, rack elevation, Wi-Fi spectrum plot, signal heat on a floor plan
- `D058` **Specialised** Occupancy heat by room and hour, motion event raster
- `D059` **Specialised** Hex tile map, isochrone, GPS track with elevation, geofence states, Australian state and council choropleth

### D8. Financial and scientific
- `D060` **Specialised** Candlestick / OHLC, depth chart, control chart, error bars
- `D061` **Specialised** Polar / radar / spider, polar area, parallel coordinates
- `D062` **Specialised** Word cloud, tag cloud
- `D063` **Specialised** Energy load curve, stacked sources, tariff bands, battery state of charge
- `D064` **Specialised** Temperature and humidity with comfort band, wind rose, sun path
- `D065` **Specialised** Spectrogram, waterfall plot, constellation scatter (for the Wi-Fi sensing work)
- `D066` **Specialised** Budget variance, invoice ageing, cash-flow bridge
- `D067` **Specialised** Audio waveform, image histogram, video timeline markers
- `D068` **Specialised** Contour and surface plot (optional tier)
- `D069` **Specialised** Storage pool layout, SMART trend, capacity forecast

### D9. Chart furniture (applies to every chart)
- `D070` **Core** Legends (interactive, toggle series), tooltips with crosshair, axes (log, time, dual), gridlines, reference lines, annotations
- `D071` **Core** Empty, loading skeleton, error, no-data, partial-data states
- `D072` **Core** Colour: categorical (8), sequential, diverging, status; colour-blind safe; dark and light
- `D073` **Common** Export PNG / SVG / CSV, fullscreen, data table fallback (accessible)
- `D074` **Specialised** Threshold bands and alert markers; ghost series for the compare period; synced crosshair and zoom; drill-down and cross-filtering; lasso select; linear/log and absolute/percent switch; last-updated stamp, query inspector; pattern fills for print; ASCII rendering for the TUIs

## E. Application chrome and components

- `E001` **Core** Shell: collapsible sidebar, icon rail, top nav, mega menu, breadcrumbs, workspace / tenant switcher, user menu
- `E002` **Core** Global search, command palette, notifications, help, feedback button, theme and density switch, language switch
- `E003` **Core** Page header (title, description, status, primary action, secondary actions, tabs)
- `E004` **Core** Filter bar, toolbar, bulk-action bar, sticky save bar, floating action button
- `E005` **Core** Overlays: modal (info, form, confirm, destructive with type-to-confirm), drawer (left, right, bottom), popover, tooltip, dropdown, context menu, hover card
- `E006` **Core** Feedback: toast (stack), banner, inline alert, callout, snackbar with undo, progress toast
- `E007` **Core** Loading: spinner, skeleton, shimmer, progress bar, optimistic state
- `E008` **Core** Navigation: tabs (line, pill, vertical), stepper, pagination, breadcrumb, tree nav, anchor nav
- `E009` **Core** Data display: cards (stat, media, profile, pricing, list), description list, key-value grid, timeline, activity stream, comment thread, avatar and avatar stack, badge, status pill, tag
- `E010` **Core** Disclosure: accordion, collapsible, tabs, details
- `E011` **Common** Media: image viewer / lightbox, carousel, PDF viewer, audio / video player
- `E012` **Core** Code and docs: code block (copy, line numbers, highlight), diff, markdown render, kbd hints
- `E013` **Common** Resizable split panes, dock / tiling layout, drag-and-drop dashboard grid
- `E014` **Common** Onboarding: product tour, coachmarks, empty-state call to action
- `E015` **Common** Permission-aware UI (disabled, hidden, upsell)
- `E016` **Common** Environment badge, impersonation, read-only and maintenance banners, consent bar
- `E017` **Common** Status bar (connection, sync, version), background tasks tray
- `E018` **Common** Inspector panel, outline, mini-map
- `E019` **Common** Document tabs (closable, reorderable, pinned), saved workspace layouts
- `E020` **Common** Selection summary and clipboard tray
- `E021` **Core** State component set using @belikh/jupiter-graphics spots (empty, error, offline, no permission)
- `E022` **Common** Notification item types, grouping, snooze
- `E023` **Common** Entity chips (user, device, service, host) with hover cards
- `E024` **Common** KPI with target, comparison chip, mini-gauge, metric list
- `E025` **Common** Timeline variants (vertical, horizontal, grouped by day, with diffs)
- `E026` **Core** Scope bar (date range, time zone, refresh interval, environment)
- `E027` **Common** Shortcut cheat sheet, searchable help panel, inline docs popover
- `E028` **Common** Wizard parts (step rail, review summary, success screen)
- `E029` **Common** Danger zone, soft delete, undo window, cooldown
- `E030` **Specialised** Chat thread and composer, assistant panel (streaming answer, citations, tool-call cards)

## F. Cross-cutting behaviour

- `F001` **Core** Light, dark, auto; high-contrast; density; RTL
- `F002` **Core** Time range picker with compare-to and auto-refresh; live updating (websocket) with pause
- `F003` **Core** Responsive: desktop, tablet, phone, kiosk; print stylesheet
- `F004` **Core** Keyboard navigation and shortcuts (cheat sheet), focus management, ARIA, reduced motion, screen-reader summaries for charts
- `F005` **Core** i18n: number, currency, date and relative-time formatting, pluralisation
- `F006` **Core** URL state (filters, sort, tab, range), shareable links, saved views
- `F007` **Common** Undo / redo, optimistic updates, conflict handling
- `F008` **Core** Error boundaries, retry, offline queue, stale data indicators
- `F009` **Common** Permissions and audit trail
- `F010` **Common** Export and share (CSV, PNG, PDF, scheduled email)
- `F011` **Common** Workspace and environment scoping, "view as role"
- `F012` **Specialised** Presence avatars, live cursors, record locks, comments on anything
- `F013` **Common** Large-data fixtures (100k rows, 1M points) and performance budgets
- `F014` **Core** State matrix: every view in loading, empty, error, partial, stale, offline, read-only, no-permission
- `F015` **Core** Seeded deterministic sample data, time travel for demos
- `F016` **Core** Theming proof: live token edits, brand swap, contrast gate
- `F017` **Specialised** Test hooks, visual regression per route (light and dark, both densities), a11y audit per route
- `F018` **Common** Touch targets, gestures, non-drag alternatives
- `F019` **Common** Delivery channels (in-app, email matching jupiter-email.html, digest, quiet hours)
- `F020` **Specialised** Parity table: which views also exist in the TUI, Slint and GTK demos, and as LaTeX report export

## G. Sample domain modules (realistic content for our own use)

- `G001` **Common** Service health and uptime, incident timeline, alert rules and on-call
- `G002` **Specialised** Network: topology (UniFi), devices and clients, VLANs, firewall rules, DHCP leases, VPN peers (WireGuard, Tailscale), Wi-Fi channel and spectrum
- `G003` **Common** Home automation: entity inventory, automations list, energy usage, battery levels, camera wall, presence (CSI sensing)
- `G004` **Common** Hosts and storage: NixOS fleet, ZFS / iSCSI pools, disk SMART, backups and restore points, UPS and power
- `G005` **Common** CI and deploys: pipeline runs, releases, changelog
- `G006` **Common** Certificates and DNS: expiry timeline, record editor
- `G007` **Common** Media archive: library, playlists, metadata editor (suno-web)
- `G008` **Common** Job search pipeline: kanban, application timeline, document previews (job-search)
- `G009` **Common** Users, roles, API keys, webhooks, audit log
- `G010` **Common** Billing: invoices (matches the LaTeX invoice), usage metering
- `G011` **Specialised** Retro-computing catalogue: machines, firmware, media, restoration log
- `G012` **Common** Airport screening ops (lane throughput, queue times, equipment tests, roster)
- `G013` **Common** Warehouse (stock levels, goods receival, pick rates, order table)
- `G014` **Common** Council open data (waste calendar, car-park map, dataset catalogue)
- `G015` **Common** ESP32 and ESPHome fleet (firmware versions, OTA rollout, BLE devices)
- `G016` **Specialised** Camera recorder (event clips timeline, zones, retention)
- `G017` **Specialised** 3D printing (printer status, job queue, filament stock, failures)
- `G018` **Common** Design-system admin (token versions, releases, consumers per version, contrast report, graphics browser)
- `G019` **Common** Documents (LaTeX template gallery, generated PDFs, invoice and letter records)
- `G020` **Specialised** Household finance (bills, subscriptions, budgets)
- `G021` **Specialised** Research vault (notes, sources, graph, run status)
- `G022` **Common** Agent runs (sessions, tool calls, cost and tokens, evals, prompt library)

---

# Counts

| Section | Draft 1 | Added | Entries | ~Leaf items |
| --- | ---: | ---: | ---: | ---: |
| A. Page and view types | 66 | 66 | 132 | 237 |
| B. Table and data-grid capabilities | 18 | 18 | 36 | 108 |
| C. Input types | 36 | 39 | 75 | 236 |
| D. Visualisations | 37 | 37 | 74 | 255 |
| E. Application chrome and components | 15 | 15 | 30 | 146 |
| F. Cross-cutting behaviour | 10 | 10 | 20 | 75 |
| G. Sample domain modules | 11 | 11 | 22 | 85 |
| **Total** | **193** | **196** | **389** | **1142** |

Tiers (proposed): Core 94, Common 220, Specialised 75.

Entry count is the number of list items. Many bundle several leaf items (a leaf is a comma- or semicolon-separated
element, parentheses counted separately), so the leaf count is an approximation, not a spec: use it to size the work,
not to promise coverage.

Chart furniture (D9) and the form-behaviour set (C7) apply to *every* chart and *every* input, so they multiply the
build rather than add to it.

---

# Implementation status: core tier (`apps/admin`)

Verified: typecheck and production build pass; **67 interaction tests** (Vitest + Testing Library) cover the priority engine,
the data table (sort, filter, paginate, select, bulk, inline edit, tree rows), form validation and paste-JSON, the wizard,
the combobox, the driver check-in kiosk end to end, and a smoke render of **every route**. Main pages were also reviewed as
light/dark screenshots, and the overview at phone width. The colour-vision gate (`npm run check:palette`) passes.

**Done (core):** everything in the previous status list, plus the items that were missing: chart brush/zoom, anomaly
highlight, log and secondary axes, thermometer and battery gauges, SVG/PNG/CSV export with an accessible data-table view,
mega menu, popover, hover card, context menu, tree and anchor navigation, pricing cards, diff viewer, a safe Markdown
renderer, a Help centre, a language switch (EN/ES/JA/AR) with right-to-left layout, high-contrast mode, a print
stylesheet, error boundary, shortcut cheat sheet, paste-JSON-to-fill, pin-right columns, tree rows, table-to-cards on small
screens, and URL state for the orders table (search, facet, sort, page, tab).

**Still partial:** i18n translates the shell labels only (not page content); RTL is a good first pass but not audited
page by page; input masks; datetime/week/month pickers (native inputs only); image crop on upload; URL state outside the
orders table; the 7th and 8th chart colours are neutral fallbacks (use labels past six series).

**Not done:** automated visual-regression tests (screenshots are reviewed by hand), and none of the common or specialised tiers.

# Also built beyond the spec
- **Warehouse inbound timeslot system** (`/wh/*`): priority engine, driver check-in kiosk, staff dock board, lobby display
  and driver ticket page, synced live across browser tabs.
- **Home Assistant panel** (`/ha`, simulated data behind a live-ready adapter) and **ESPHome instrument widgets** (`/esphome`,
  `@belikh/jupiter-esphome`, `jupiter-esphome.yaml`).

---

# Implementation status: common tier

All eight common-tier areas were built in parallel under `apps/admin/src/areas/<area>/` and register themselves through
`src/areas/registry.ts` (187 routes in total with the core tier). Per-entry status, route and an honest note for every common-tier entry is in
`docs/status/<area>.md`. Totals from those files: **181 Done, 39 Partial, 1 Skipped** of 221 tracked entries
(the 220 common-tier entries plus a few neighbours that the area owners also recorded).

| Area | Done | Partial | Skipped | Doc |
| --- | ---: | ---: | ---: | --- |
| charts | 24 | 3 | 0 | [status/charts.md](status/charts.md) |
| chrome | 18 | 5 | 0 | [status/chrome.md](status/chrome.md) |
| domain | 9 | 7 | 0 | [status/domain.md](status/domain.md) |
| inputs | 37 | 6 | 0 | [status/inputs.md](status/inputs.md) |
| records | 27 | 0 | 0 | [status/records.md](status/records.md) |
| tables | 14 | 8 | 1 | [status/tables.md](status/tables.md) |
| tools | 15 | 5 | 0 | [status/tools.md](status/tools.md) |
| views | 37 | 5 | 0 | [status/views.md](status/views.md) |

Verification: typecheck clean, **694 Vitest tests in 29 files pass**, every one of the 187 routes renders without crashing,
production build passes, the colour-vision gate passes. Interactions are covered by tests; visual quality was checked by
eye per area (not every page in dark or at 390px). Everything is client-side with fictional data: no entry in this tier talks
to a real backend, and anything described as "simulated" in an area doc is exactly that.

Known cross-cutting gaps: the admin app ships as a single ~2.1 MB JavaScript chunk (route-level code splitting is not done);
RTL, high contrast and 390px were not audited page by page; several demos (maps, flame graphs, topology) use stylised
rather than real geography/data; nothing has been run on real touch hardware.

## Specialised tier implementation status

All 75 specialised entries are built (64 Done, 11 Partial). They live in `apps/admin/src/areas/` (`forms`, `devtools`, `widgets`, `charts-more`, `diagrams`, `signals`, `homelab`), registered like every other area. Per-entry notes, routes and limits are in `docs/status/forms.md` to `docs/status/homelab.md`.

Partial entries (each is a working page; the note says what is simulated or missing):

- `A117` Remote shell with session recording: see the status table for the limit
- `A119` Image annotation tool: see the status table for the limit
- `C042` Colour picker (swatches, hex, HSL, gradient), font picker: see the status table for the limit
- `C043` Audio / video recorder: see the status table for the limit
- `C048` Audio waveform trim, video thumbnail picker: see the status table for the limit
- `D059` Hex tile map, isochrone, GPS track with elevation, geofence states, Australian state and council choropleth: see the status table for the limit
- `D074` Threshold bands and alert markers; ghost series for the compare period; synced crosshair and zoom; drill-down and cross-filtering; lasso select; linear/log and absolute/percent switch; last-updated stamp, query inspector; pattern fills for print; ASCII rendering for the TUIs: see the status table for the limit
- `F017` Test hooks, visual regression per route (light and dark, both densities), a11y audit per route: see the status table for the limit
- `G002` Network: topology (UniFi), devices and clients, VLANs, firewall rules, DHCP leases, VPN peers (WireGuard, Tailscale), Wi-Fi channel and spectrum: see the status table for the limit
- `G016` Camera recorder (event clips timeline, zones, retention): see the status table for the limit
- `G021` Research vault (notes, sources, graph, run status): see the status table for the limit
