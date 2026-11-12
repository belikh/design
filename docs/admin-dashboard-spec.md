# Admin dashboard template: coverage spec (draft 2: author's list + advisor's doubling)

Goal: one template that demonstrates every view type, input type and visualisation we are likely to need, so any
internal tool can be assembled from it. Everything is themed from `@belikh/jupiter-tokens`; graphics come from
`@belikh/jupiter-graphics`. Each entry becomes a section or route in the template, with realistic sample data.

**Tiers are proposals.** `P1` = the core kit needed to build almost any admin tool; `P2` = common, build next;
`P3` = specialised or domain-specific, build on demand. Pick the first tier to build and edit this file to move entries.
IDs are stable within this draft only; the ID prefix is the section letter.

## A. Page and view types

### A1. Dashboards
- `A001` **P1** Overview / home (KPI row + charts + activity)
- `A002` **P1** Analytics dashboard (time-range, comparison, breakdowns)
- `A003` **P2** KPI scorecard (targets, status, owners)
- `A004` **P2** Operations / NOC wall (dense, glanceable, auto-refresh)
- `A005` **P2** Executive summary (big numbers, narrative)
- `A006` **P2** Per-entity dashboard (one service / one device / one customer)
- `A007` **P1** Customisable dashboard (drag, resize, add and remove widgets, edit mode)
- `A008` **P1** Kiosk / wall display mode (large type, high contrast, no chrome)
- `A009` **P1** Status page (public, uptime bars, incident history)
- `A010` **P2** Report page (print-ready, paged, with headers and footers)
- `A011` **P2** SLO and error-budget dashboard (burn rate, budget left)
- `A012` **P2** Capacity planning and forecast
- `A013` **P2** Cost and spend (budget vs actual, by tag)
- `A014` **P2** Security posture (findings by severity, coverage)
- `A015` **P2** Live-stream dashboard (rolling window, event ticker)
- `A016` **P2** Two-period or two-entity comparison dashboard
- `A017` **P2** Personal "my work" home (assigned, mentions, recents)
- `A018` **P2** Dashboard gallery and template picker
- `A019` **P3** Embedded single-widget view
- `A020` **P3** Rotating playlist of dashboards for TVs

### A2. Lists and collections
- `A021` **P1** Data table (full-featured, see B)
- `A022` **P1** Card grid / gallery
- `A023` **P1** List view (rows with metadata and quick actions)
- `A024` **P1** Kanban board (columns, swimlanes, WIP limits, drag and drop)
- `A025` **P2** Tree / hierarchy explorer
- `A026` **P2** File manager (folders, grid and list, preview pane, breadcrumbs)
- `A027` **P2** Media library (thumbnails, filters, bulk select)
- `A028` **P2** Inbox / messaging (list + thread + composer)
- `A029` **P1** Activity feed / audit log
- `A030` **P1** Notifications centre
- `A031` **P1** Search results (grouped by type, facets, highlights)
- `A032` **P1** Calendar (month, week, day, agenda, resource view)
- `A033` **P2** Timeline / roadmap / Gantt
- `A034` **P2** Map view (markers, clusters, polygons, side list)
- `A035` **P2** Org chart / team directory
- `A036` **P2** Inventory / asset register
- `A037` **P2** Comparison view (side by side, diff highlighting)
- `A038` **P2** Approval queue
- `A039` **P2** Task list with subtasks
- `A040` **P2** Ticket list with SLA timers
- `A041` **P2** Contacts list with pipeline stages
- `A042` **P2** Product catalogue with variants
- `A043` **P2** Order list and order detail (line items, fulfilment timeline)
- `A044` **P2** Trash, archive and restore
- `A045` **P2** Version history with restore
- `A046` **P2** Favourites, recents, pinned
- `A047` **P2** Duplicate detection and merge
- `A048` **P2** Tag and taxonomy manager
- `A049` **P2** Saved searches and smart collections
- `A050` **P2** Leaderboard page
- `A051` **P2** Live tile wall (cameras, screens)
- `A052` **P2** Entity history across systems
- `A053` **P2** Backlog with drag prioritisation

### A3. Detail and edit
- `A054` **P1** Detail page (summary header, tabs, related panels)
- `A055` **P1** Master-detail (list left, detail right)
- `A056` **P2** Split view with resizable panes
- `A057` **P1** Profile page (user / customer / device)
- `A058` **P1** Edit form page (sectioned, sticky save bar, dirty state)
- `A059` **P1** Create wizard (multi-step with validation, review step)
- `A060` **P1** Drawer edit (side panel) and modal edit
- `A061` **P2** Bulk edit
- `A062` **P1** Inline edit (click to edit fields and cells)
- `A063` **P1** Settings (tabbed, sectioned, search within settings)
- `A064` **P2** Permissions / roles matrix
- `A065` **P2** Onboarding checklist / setup progress
- `A066` **P2** Billing: plans, usage, invoices, payment methods
- `A067` **P2** API keys and webhooks management
- `A068` **P2** Integrations / connections gallery
- `A069` **P2** Feature flags / experiments
- `A070` **P2** Import (upload, map columns, validate, preview, commit)
- `A071` **P2** Export / scheduled reports
- `A072` **P2** Incident page (status, timeline, responders, postmortem)
- `A073` **P2** Runbook page (checkable steps, run log)
- `A074` **P2** Device detail (live metrics, config, logs, actions)
- `A075` **P2** Config editor with staged changes, diff, apply and rollback
- `A076` **P2** Environment and secrets manager
- `A077` **P2** Template editor with live preview and variables
- `A078` **P2** Notification preferences matrix (event by channel)
- `A079` **P2** Active sessions and devices, with revoke
- `A080` **P2** Team members and invites
- `A081` **P2** Audit event detail (who, what, before and after)
- `A082` **P2** Data retention and privacy controls
- `A083` **P2** Backup and restore wizard
- `A084` **P2** Upgrade assistant (pre-flight checks, progress, rollback)
- `A085` **P2** Maintenance window scheduler
- `A086` **P2** Quota and rate-limit usage
- `A087` **P3** Licence and entitlements
- `A088` **P2** Theme and branding editor (the token editor as a page)
- `A089` **P2** Custom fields and schema designer
- `A090` **P3** Form builder (drag fields, conditional logic, preview)
- `A091` **P3** Survey results page
- `A092` **P3** Approval flow designer
- `A093` **P3** Moderation detail (approve, reject, reason)

### A4. Tools
- `A094` **P2** Report / query builder (visual)
- `A095` **P2** SQL / query console with results grid
- `A096` **P1** Log viewer (live tail, filters, levels, context)
- `A097` **P2** Terminal / console panel
- `A098` **P2** JSON / YAML / code editor with validation
- `A099` **P2** Diff viewer (split and unified)
- `A100` **P2** Markdown / rich-text document editor
- `A101` **P2** Markdown / docs reader
- `A102` **P2** Network / topology explorer
- `A103` **P2** Trace viewer (span waterfall)
- `A104` **P3** Workflow / automation builder (nodes and edges)
- `A105` **P2** Schedule / cron manager
- `A106` **P2** Job queue monitor
- `A107` **P1** Command palette and global search
- `A108` **P2** Metrics explorer (pick metric, group by, ad hoc chart)
- `A109` **P2** Alert rule editor with test against history
- `A110` **P3** Notebook (text, query and chart cells)
- `A111` **P2** API request builder with response viewer
- `A112` **P3** Webhook delivery log with replay
- `A113` **P2** Regex, JSONPath and jq playground
- `A114` **P3** Database browser (tables, relations, rows)
- `A115` **P3** Object storage browser
- `A116` **P3** Network flow viewer
- `A117` **P3** Remote shell with session recording
- `A118` **P3** Firmware rollout manager (rings, progress)
- `A119` **P3** Image annotation tool
- `A120` **P2** Data quality report
- `A121` **P2** Bulk job runner (dry run, per-row results)
- `A122` **P2** Diagnostics and self-test page
- `A123` **P2** System info and about
- `A124` **P1** Component kitchen-sink page
- `A125` **P2** Print and PDF preview

### A5. Auth, errors and system pages
- `A126` **P1** Sign in, sign up, forgot and reset password, 2FA, magic link, SSO chooser
- `A127` **P2** Account locked, session expired, consent
- `A128` **P1** 401, 403, 404, 500, 503 maintenance, offline
- `A129` **P1** Empty states per view (first-run, no results, no permission, cleared)
- `A130` **P2** Changelog / what's new
- `A131` **P2** Help centre / support request form
- `A132` **P2** Legal / terms / privacy (long-form reading layout)

## B. Table and data-grid capabilities

- `B001` **P1** Sort (single and multi), column filters, global quick search
- `B002` **P1** Faceted filters with counts, saved filters and views
- `B003` **P1** Column show/hide, reorder, resize, pin left/right, sticky header and first column
- `B004` **P1** Row selection (single, multi, select-all across pages), bulk-action bar
- `B005` **P1** Row actions menu, hover actions, row click to open drawer
- `B006` **P1** Expandable rows (detail panels), nested / tree rows
- `B007` **P2** Grouped rows with aggregates (sum, avg, count) and collapse
- `B008` **P1** Inline cell editing with validation and undo
- `B009` **P1** Cell renderers: text, number, currency, percent, date, relative time, badge, progress, sparkline, avatar, tags, link, copy, boolean, rating, icon, bar-in-cell, heat-cell, status dot
- `B010` **P1** Pagination, infinite scroll, cursor pagination, virtualised rows (100k)
- `B011` **P1** Density toggle (compact, comfortable), zebra, borders on/off
- `B012` **P2** Footer totals, summary row
- `B013` **P2** Pivot table, cross-tab with heat colouring
- `B014` **P3** Spreadsheet grid (cell ranges, formulas, fill handle, copy/paste)
- `B015` **P2** Export (CSV, JSON, XLSX, PDF) and copy as markdown
- `B016` **P2** Drag to reorder rows, drag between tables
- `B017` **P1** Loading skeleton, empty, error with retry, partial results, stale-data badge
- `B018` **P1** Responsive: table to cards below a breakpoint
- `B019` **P2** Header menu with per-column aggregate picker
- `B020` **P2** Pinned rows (top and bottom)
- `B021` **P2** Conditional formatting (colour scales, icon sets, data bars)
- `B022` **P2** Range selection with sum, average and count in a status bar
- `B023` **P1** Keyboard grid navigation and ARIA grid roles
- `B024` **P2** Drag-to-group bar, multi-level grouping
- `B025` **P2** Nested sub-table in a row
- `B026` **P2** Row reorder with handles and a keyboard alternative
- `B027` **P2** Column groups, multi-row headers, rotated headers
- `B028` **P2** Wrap vs truncate, row height options, auto-fit column
- `B029` **P2** Diff mode between two snapshots
- `B030` **P2** Live rows (streaming inserts, flash on change, pause)
- `B031` **P2** Row severity stripe, row-level error markers
- `B032` **P2** Bulk paste from a spreadsheet with validation preview
- `B033` **P2** Server-side mode, estimated totals, "load more"
- `B034` **P2** Find in table (highlight, next and previous)
- `B035` **P2** Column statistics popover (mini-histogram, nulls, distinct)
- `B036` **P2** View switcher for one dataset (table, cards, calendar, map, timeline)

## C. Input types

### C1. Text
- `C001` **P1** Text, textarea (auto-grow), password (strength meter, reveal), email, URL, phone, search (with clear)
- `C002` **P1** Prefix / suffix / addon, inline unit, character counter, input mask
- `C003` **P2** Rich text (WYSIWYG), markdown editor with preview, code input with syntax highlight
- `C004` **P2** Mention / slash-command input
- `C005` **P1** OTP / PIN code
- `C006` **P2** Secret / API key field (masked, reveal, copy, rotate)
- `C007` **P2** Card, IBAN, BSB and ABN masked inputs
- `C008` **P2** Password generator, passkey enrolment, TOTP QR, recovery codes
- `C009` **P2** Async availability check (username, slug)
- `C010` **P2** Click-to-edit inline text
- `C011` **P2** Rich text with attachments, tables, variable inserter, snippets
- `C012` **P2** Code editors for SQL, YAML, JSON, shell and CSS, with lint, format and diff before save

### C2. Numeric
- `C013` **P1** Number, stepper, currency, percentage, unit-aware (kg, ms, GB)
- `C014` **P1** Slider, range slider (dual), slider with marks, stepped, vertical
- `C015` **P3** Rating (stars, hearts), NPS 0 to 10, Likert scale, emoji reaction
- `C016` **P2** Scrub-to-change number, knob or dial
- `C017` **P2** Min-max pair, ratio, dimensions (W by H by D)
- `C018` **P2** Allocation sliders that sum to 100
- `C019` **P2** Money with currency selector, money range
- `C020` **P2** Unit-switching input

### C3. Choice
- `C021` **P1** Select, multi-select, grouped options, searchable combobox, async search, creatable
- `C022` **P1** Radio, radio cards, checkbox, checkbox group, tri-state, switch, segmented control, toggle button group
- `C023` **P1** Tag / chip input
- `C024` **P2** Transfer list (dual listbox)
- `C025` **P2** Tree select, cascader, hierarchical checklist
- `C026` **P2** Country / region / timezone / language pickers
- `C027` **P3** Icon picker, emoji picker
- `C028` **P2** Autocomplete with recent items and ghost completion
- `C029` **P2** Multi-value paste into chips, with per-chip validation
- `C030` **P2** Switch with confirm and pending states
- `C031` **P2** Radio with "other" text, conditional reveal fields
- `C032` **P2** Rich options (avatar, icon, description), virtualised long lists, select all
- `C033` **P2** People, assignee, role and team pickers
- `C034` **P2** Record reference picker, relation editor

### C4. Date and time
- `C035` **P1** Date, time, datetime, date range, week, month, year picker, preset ranges, relative ("last 7 days"), timezone-aware
- `C036` **P2** Duration input
- `C037` **P3** Cron expression builder, recurrence rule builder, weekly availability grid
- `C038` **P2** Natural-language date, fiscal period, multi-date, blackout dates
- `C039` **P2** Time-zone conversion preview, working-hours picker

### C5. Files and media
- `C040` **P1** File upload (drag and drop, multi, progress, validation, resume), image upload with crop, avatar upload, paste image
- `C041` **P3** Signature pad, drawing canvas
- `C042` **P3** Colour picker (swatches, hex, HSL, gradient), font picker
- `C043` **P3** Audio / video recorder
- `C044` **P3** Palette editor with contrast check
- `C045` **P3** Box-model spacing editor, easing-curve editor
- `C046` **P2** Folder upload, URL import, camera capture, barcode and QR scan, chunked large files
- `C047` **P2** Image focal point, alt text, redact, SVG preview on light and dark
- `C048` **P3** Audio waveform trim, video thumbnail picker

### C6. Structured
- `C049` **P1** Key-value editor, repeater (add, remove, reorder rows), nested form groups
- `C050` **P3** Query / filter builder (AND / OR groups), regex tester, formula editor
- `C051` **P2** JSON schema form (rendered from a schema)
- `C052` **P2** Address autocomplete with map confirm, geo point picker, radius picker
- `C053` **P2** IP / CIDR / MAC / port range / hostname inputs
- `C054` **P2** Permissions matrix (rows by resources, columns by actions)
- `C055` **P3** Schedule picker, calendar slot picker
- `C056` **P2** Drag-sort list, ranking input, matrix of questions
- `C057` **P3** CAPTCHA / human check placeholder
- `C058` **P2** Per-locale translations editor
- `C059` **P2** Filter pills with operators
- `C060` **P2** Tokenised search (field:value chips), scopes, saved queries
- `C061` **P2** Editable grid as a field, checkbox and radio matrix
- `C062` **P2** Rule builder (if and then), threshold editor previewed on a chart
- `C063` **P2** Column mapping editor, option-list editor
- `C064` **P3** Polygon and bounding-box draw, route waypoints, room picker, rack-unit picker
- `C065` **P2** VLAN id, subnet calculator, firewall, DNS and port-forward rule rows, SSH key paste with fingerprint
- `C066` **P3** Device and entity picker, GPIO pin picker, sunrise and sunset offsets

### C7. Form behaviour (every input shows these)
- `C067` **P1** States: default, hover, focus, filled, disabled, read-only, loading, error, warning, success
- `C068` **P1** Help text, label placement (top, left, floating), required marker, inline validation, validation summary
- `C069` **P1** Dirty indicator, autosave status, unsaved-changes guard, reset to default
- `C070` **P1** Form layouts: single column, two column, sectioned, inline, horizontal, stepped, sticky action bar
- `C071` **P3** Scroll-to-accept, hold-to-confirm, slide-to-confirm
- `C072` **P2** Save and resume, draft and publish
- `C073` **P2** Field permissions and field history
- `C074` **P1** Cross-field and conditional validation
- `C075` **P1** Focus first error, paste JSON to fill

## D. Visualisations

### D1. Comparison and trend
- `D001` **P1** Line, multi-line, smoothed, stepped
- `D002` **P3** Area, stacked area, 100% stacked area, streamgraph
- `D003` **P1** Bar vertical, horizontal, grouped, stacked, 100% stacked, with target line, diverging
- `D004` **P2** Lollipop, dot plot, dumbbell, slope chart
- `D005` **P2** Combo chart (bar + line, dual axis)
- `D006` **P1** Sparklines (line, bar, area, win-loss), sparkline table
- `D007` **P2** Small multiples
- `D008` **P1** Annotated time series (events, deployments, incidents), forecast with confidence band, anomaly highlight, brush and zoom, crosshair
- `D009` **P3** Min-max band, fan chart
- `D010` **P3** Horizon chart, cycle plot
- `D011` **P2** Floating range bars
- `D012` **P2** Table as chart (heat table, bar table, dot table, rank change arrows)

### D2. Distribution
- `D013` **P3** Histogram, density, ridgeline, box plot, violin, strip / beeswarm
- `D014` **P2** Scatter, bubble, scatter matrix, hexbin, regression line
- `D015` **P1** Heatmap (matrix, correlation), calendar heatmap (contribution style), time-of-day by day-of-week grid
- `D016` **P2** Percentile latency chart (p50, p95, p99)
- `D017` **P2** Latency bucket heatmap over time
- `D018` **P3** Cumulative distribution, QQ plot

### D3. Composition
- `D019` **P1** Pie, donut (with centre label), semi-donut
- `D020` **P1** Stacked bar and 100% stacked
- `D021` **P3** Treemap, sunburst, icicle, packed circles
- `D022` **P3** Waterfall, Pareto, funnel, pyramid
- `D023` **P2** Stacked progress bar, segmented bar
- `D024` **P3** Bump chart (rank over time), Marimekko
- `D025` **P3** Waffle, pictogram, unit chart
- `D026` **P3** Rose chart, 24-hour radial clock chart
- `D027` **P3** Nested donut, gauge cluster
- `D028` **P3** Diverging Likert, NPS gauge
- `D029` **P2** Top-N with "other", co-occurrence matrix

### D4. Progress and status
- `D030` **P1** Progress bar, ring, multi-ring, segmented progress, steps
- `D031` **P1** Gauge (radial, linear, thermometer, battery), bullet chart, radial bar
- `D032` **P1** Big number + delta + sparkline tile
- `D033` **P1** Uptime bars (status page style), status grid, traffic-light matrix
- `D034` **P2** Leaderboard / ranking with bars, bar chart race
- `D035` **P2** Actual vs target bar-in-bar, burn-down, burn-up, cumulative flow
- `D036` **P2** RED and USE panel layouts (rate, errors, duration, saturation)
- `D037` **P2** SLO burn-rate chart, availability-nines table
- `D038` **P2** KPI table with inline bars, traffic lights and trend arrows
- `D039` **P2** Comparison tiles (vs last period, target, peers), percentile rank bar
- `D040` **P2** Live counter, countdown, world clocks, rate meter

### D5. Relationships and flow
- `D041` **P3** Sankey, alluvial, chord, arc diagram
- `D042` **P2** Network graph (force), topology map, dependency graph
- `D043` **P3** Tree diagram, dendrogram, org chart, mind map
- `D044` **P2** Flowchart / process, state machine, sequence diagram
- `D045` **P3** Venn, UpSet plot
- `D046` **P2** Topology overlays (traffic-weighted edges, health colours, path trace)
- `D047` **P3** ER diagram, architecture diagram, dependency matrix, data-lineage and pipeline DAG with run states

### D6. Time and schedule
- `D048` **P2** Gantt, swimlane timeline, event river, resource schedule
- `D049` **P3** Trace span waterfall, flame graph, icicle flame
- `D050` **P3** Cohort retention table (heat), funnel conversion by step
- `D051` **P2** State timeline strip per entity, event strip, annotation lane
- `D052` **P2** Log volume histogram stacked by level, log pattern clusters
- `D053` **P2** CPU core heat strip, per-process treemap, thread timeline
- `D054` **P3** Commit calendar, branch graph, deploy frequency, lead time
- `D055` **P2** Step durations, drop-off reasons, journey paths

### D7. Geographic
- `D056` **P2** Choropleth, bubble map, marker clusters, route and flow lines, heat layer, floor plan / room map, rack diagram
- `D057` **P3** Switch faceplate port map, rack elevation, Wi-Fi spectrum plot, signal heat on a floor plan
- `D058` **P3** Occupancy heat by room and hour, motion event raster
- `D059` **P3** Hex tile map, isochrone, GPS track with elevation, geofence states, Australian state and council choropleth

### D8. Financial and scientific
- `D060` **P3** Candlestick / OHLC, depth chart, control chart, error bars
- `D061` **P3** Polar / radar / spider, polar area, parallel coordinates
- `D062` **P3** Word cloud, tag cloud
- `D063` **P3** Energy load curve, stacked sources, tariff bands, battery state of charge
- `D064` **P3** Temperature and humidity with comfort band, wind rose, sun path
- `D065` **P3** Spectrogram, waterfall plot, constellation scatter (for the Wi-Fi sensing work)
- `D066` **P3** Budget variance, invoice ageing, cash-flow bridge
- `D067` **P3** Audio waveform, image histogram, video timeline markers
- `D068` **P3** Contour and surface plot (optional tier)
- `D069` **P3** Storage pool layout, SMART trend, capacity forecast

### D9. Chart furniture (applies to every chart)
- `D070` **P1** Legends (interactive, toggle series), tooltips with crosshair, axes (log, time, dual), gridlines, reference lines, annotations
- `D071` **P1** Empty, loading skeleton, error, no-data, partial-data states
- `D072` **P1** Colour: categorical (8), sequential, diverging, status; colour-blind safe; dark and light
- `D073` **P2** Export PNG / SVG / CSV, fullscreen, data table fallback (accessible)
- `D074` **P3** Threshold bands and alert markers; ghost series for the compare period; synced crosshair and zoom; drill-down and cross-filtering; lasso select; linear/log and absolute/percent switch; last-updated stamp, query inspector; pattern fills for print; ASCII rendering for the TUIs

## E. Application chrome and components

- `E001` **P1** Shell: collapsible sidebar, icon rail, top nav, mega menu, breadcrumbs, workspace / tenant switcher, user menu
- `E002` **P1** Global search, command palette, notifications, help, feedback button, theme and density switch, language switch
- `E003` **P1** Page header (title, description, status, primary action, secondary actions, tabs)
- `E004` **P1** Filter bar, toolbar, bulk-action bar, sticky save bar, floating action button
- `E005` **P1** Overlays: modal (info, form, confirm, destructive with type-to-confirm), drawer (left, right, bottom), popover, tooltip, dropdown, context menu, hover card
- `E006` **P1** Feedback: toast (stack), banner, inline alert, callout, snackbar with undo, progress toast
- `E007` **P1** Loading: spinner, skeleton, shimmer, progress bar, optimistic state
- `E008` **P1** Navigation: tabs (line, pill, vertical), stepper, pagination, breadcrumb, tree nav, anchor nav
- `E009` **P1** Data display: cards (stat, media, profile, pricing, list), description list, key-value grid, timeline, activity stream, comment thread, avatar and avatar stack, badge, status pill, tag
- `E010` **P1** Disclosure: accordion, collapsible, tabs, details
- `E011` **P2** Media: image viewer / lightbox, carousel, PDF viewer, audio / video player
- `E012` **P1** Code and docs: code block (copy, line numbers, highlight), diff, markdown render, kbd hints
- `E013` **P2** Resizable split panes, dock / tiling layout, drag-and-drop dashboard grid
- `E014` **P2** Onboarding: product tour, coachmarks, empty-state call to action
- `E015` **P2** Permission-aware UI (disabled, hidden, upsell)
- `E016` **P2** Environment badge, impersonation, read-only and maintenance banners, consent bar
- `E017` **P2** Status bar (connection, sync, version), background tasks tray
- `E018` **P2** Inspector panel, outline, mini-map
- `E019` **P2** Document tabs (closable, reorderable, pinned), saved workspace layouts
- `E020` **P2** Selection summary and clipboard tray
- `E021` **P1** State component set using @belikh/jupiter-graphics spots (empty, error, offline, no permission)
- `E022` **P2** Notification item types, grouping, snooze
- `E023` **P2** Entity chips (user, device, service, host) with hover cards
- `E024` **P2** KPI with target, comparison chip, mini-gauge, metric list
- `E025` **P2** Timeline variants (vertical, horizontal, grouped by day, with diffs)
- `E026` **P1** Scope bar (date range, time zone, refresh interval, environment)
- `E027` **P2** Shortcut cheat sheet, searchable help panel, inline docs popover
- `E028` **P2** Wizard parts (step rail, review summary, success screen)
- `E029` **P2** Danger zone, soft delete, undo window, cooldown
- `E030` **P3** Chat thread and composer, assistant panel (streaming answer, citations, tool-call cards)

## F. Cross-cutting behaviour

- `F001` **P1** Light, dark, auto; high-contrast; density; RTL
- `F002` **P1** Time range picker with compare-to and auto-refresh; live updating (websocket) with pause
- `F003` **P1** Responsive: desktop, tablet, phone, kiosk; print stylesheet
- `F004` **P1** Keyboard navigation and shortcuts (cheat sheet), focus management, ARIA, reduced motion, screen-reader summaries for charts
- `F005` **P1** i18n: number, currency, date and relative-time formatting, pluralisation
- `F006` **P1** URL state (filters, sort, tab, range), shareable links, saved views
- `F007` **P2** Undo / redo, optimistic updates, conflict handling
- `F008` **P1** Error boundaries, retry, offline queue, stale data indicators
- `F009` **P2** Permissions and audit trail
- `F010` **P2** Export and share (CSV, PNG, PDF, scheduled email)
- `F011` **P2** Workspace and environment scoping, "view as role"
- `F012` **P3** Presence avatars, live cursors, record locks, comments on anything
- `F013` **P2** Large-data fixtures (100k rows, 1M points) and performance budgets
- `F014` **P1** State matrix: every view in loading, empty, error, partial, stale, offline, read-only, no-permission
- `F015` **P1** Seeded deterministic sample data, time travel for demos
- `F016` **P1** Theming proof: live token edits, brand swap, contrast gate
- `F017` **P3** Test hooks, visual regression per route (light and dark, both densities), a11y audit per route
- `F018` **P2** Touch targets, gestures, non-drag alternatives
- `F019` **P2** Delivery channels (in-app, email matching jupiter-email.html, digest, quiet hours)
- `F020` **P3** Parity table: which views also exist in the TUI, Slint and GTK demos, and as LaTeX report export

## G. Sample domain modules (realistic content for our own use)

- `G001` **P2** Service health and uptime, incident timeline, alert rules and on-call
- `G002` **P3** Network: topology (UniFi), devices and clients, VLANs, firewall rules, DHCP leases, VPN peers (WireGuard, Tailscale), Wi-Fi channel and spectrum
- `G003` **P2** Home automation: entity inventory, automations list, energy usage, battery levels, camera wall, presence (CSI sensing)
- `G004` **P2** Hosts and storage: NixOS fleet, ZFS / iSCSI pools, disk SMART, backups and restore points, UPS and power
- `G005` **P2** CI and deploys: pipeline runs, releases, changelog
- `G006` **P2** Certificates and DNS: expiry timeline, record editor
- `G007` **P2** Media archive: library, playlists, metadata editor (suno-web)
- `G008` **P2** Job search pipeline: kanban, application timeline, document previews (job-search)
- `G009` **P2** Users, roles, API keys, webhooks, audit log
- `G010` **P2** Billing: invoices (matches the LaTeX invoice), usage metering
- `G011` **P3** Retro-computing catalogue: machines, firmware, media, restoration log
- `G012` **P2** Airport screening ops (lane throughput, queue times, equipment tests, roster)
- `G013` **P2** Warehouse (stock levels, goods receival, pick rates, order table)
- `G014` **P2** Council open data (waste calendar, car-park map, dataset catalogue)
- `G015` **P2** ESP32 and ESPHome fleet (firmware versions, OTA rollout, BLE devices)
- `G016` **P3** Camera recorder (event clips timeline, zones, retention)
- `G017` **P3** 3D printing (printer status, job queue, filament stock, failures)
- `G018` **P2** Design-system admin (token versions, releases, consumers per version, contrast report, graphics browser)
- `G019` **P2** Documents (LaTeX template gallery, generated PDFs, invoice and letter records)
- `G020` **P3** Household finance (bills, subscriptions, budgets)
- `G021` **P3** Research vault (notes, sources, graph, run status)
- `G022` **P2** Agent runs (sessions, tool calls, cost and tokens, evals, prompt library)

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

Tiers (proposed): P1 94, P2 220, P3 75.

Entry count is the number of list items. Many bundle several leaf items (a leaf is a comma- or semicolon-separated
element, parentheses counted separately), so the leaf count is an approximation, not a spec: use it to size the work,
not to promise coverage.

Chart furniture (D9) and the form-behaviour set (C7) apply to *every* chart and *every* input, so they multiply the
build rather than add to it.

---

# Implementation status: P1 tier (`apps/admin`)

Verified: typecheck and production build pass; **67 interaction tests** (Vitest + Testing Library) cover the priority engine,
the data table (sort, filter, paginate, select, bulk, inline edit, tree rows), form validation and paste-JSON, the wizard,
the combobox, the driver check-in kiosk end to end, and a smoke render of **every route**. Main pages were also reviewed as
light/dark screenshots, and the overview at phone width. The colour-vision gate (`npm run check:palette`) passes.

**Done (P1):** everything in the previous status list, plus the items that were missing: chart brush/zoom, anomaly
highlight, log and secondary axes, thermometer and battery gauges, SVG/PNG/CSV export with an accessible data-table view,
mega menu, popover, hover card, context menu, tree and anchor navigation, pricing cards, diff viewer, a safe Markdown
renderer, a Help centre, a language switch (EN/ES/JA/AR) with right-to-left layout, high-contrast mode, a print
stylesheet, error boundary, shortcut cheat sheet, paste-JSON-to-fill, pin-right columns, tree rows, table-to-cards on small
screens, and URL state for the orders table (search, facet, sort, page, tab).

**Still partial:** i18n translates the shell labels only (not page content); RTL is a good first pass but not audited
page by page; input masks; datetime/week/month pickers (native inputs only); image crop on upload; URL state outside the
orders table; the 7th and 8th chart colours are neutral fallbacks (use labels past six series).

**Not done:** automated visual-regression tests (screenshots are reviewed by hand), and none of the P2/P3 tiers.

# Also built beyond the spec
- **Warehouse inbound timeslot system** (`/wh/*`): priority engine, driver check-in kiosk, staff dock board, lobby display
  and driver ticket page, synced live across browser tabs.
- **Home Assistant panel** (`/ha`, simulated data behind a live-ready adapter) and **ESPHome instrument widgets** (`/esphome`,
  `@belikh/jupiter-esphome`, `jupiter-esphome.yaml`).

---

# Implementation status: P2 tier

All eight P2 areas were built in parallel under `apps/admin/src/p2/<area>/` and register themselves through
`src/p2/registry.ts` (187 routes in total with P1). Per-entry status, route and an honest note for every P2 entry is in
`docs/p2-status-<area>.md`. Totals from those files: **181 Done, 39 Partial, 1 Skipped** of 221 tracked entries
(the 220 P2 entries plus a few neighbours that the area owners also recorded).

| Area | Done | Partial | Skipped | Doc |
| --- | ---: | ---: | ---: | --- |
| charts | 24 | 3 | 0 | [p2-status-charts.md](p2-status-charts.md) |
| chrome | 18 | 5 | 0 | [p2-status-chrome.md](p2-status-chrome.md) |
| domain | 9 | 7 | 0 | [p2-status-domain.md](p2-status-domain.md) |
| inputs | 37 | 6 | 0 | [p2-status-inputs.md](p2-status-inputs.md) |
| records | 27 | 0 | 0 | [p2-status-records.md](p2-status-records.md) |
| tables | 14 | 8 | 1 | [p2-status-tables.md](p2-status-tables.md) |
| tools | 15 | 5 | 0 | [p2-status-tools.md](p2-status-tools.md) |
| views | 37 | 5 | 0 | [p2-status-views.md](p2-status-views.md) |

Verification: typecheck clean, **694 Vitest tests in 29 files pass**, every one of the 187 routes renders without crashing,
production build passes, the colour-vision gate passes. Interactions are covered by tests; visual quality was checked by
eye per area (not every page in dark or at 390px). Everything is client-side with fictional data: no entry in this tier talks
to a real backend, and anything described as "simulated" in an area doc is exactly that.

Known cross-cutting gaps: the admin app ships as a single ~2.1 MB JavaScript chunk (route-level code splitting is not done);
RTL, high contrast and 390px were not audited page by page; several demos (maps, flame graphs, topology) use stylised
rather than real geography/data; nothing has been run on real touch hardware.

## P3 implementation status

All 75 P3 entries are built (64 Done, 11 Partial). They live in `apps/admin/src/p2/p3a` to `p3g`, registered like every other area (routes under `/p3/*` and `/home/*`). Per-entry notes, routes and limits are in `docs/p3-status-p3a.md` to `docs/p3-status-p3g.md`.

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
