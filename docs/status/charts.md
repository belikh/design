# P2 status: charts (spec sections D1–D9)

Routes live under `/charts/*` (nav group "Charts"). All data is fictional and deterministic (`apps/admin/src/p2/charts/data.ts`). Nothing here has been exercised against real data. "Done" means the feature exists, renders in light and dark, and is covered by the render/interaction tests in `charts.test.tsx` or the pure-logic tests in `lib.test.ts`.

| ID | Entry | Status | Route | Note |
|---|---|---|---|---|
| D004 | Lollipop, dot plot, dumbbell, slope | Done | `/charts/trend` | Vertical and horizontal lollipop; slope labels are de-collided. |
| D005 | Combo bar + line, dual axis | Done | `/charts/trend` | Two y-axes with separate formatters. |
| D007 | Small multiples | Done | `/charts/trend` | Shared/independent y-axis toggle. |
| D011 | Floating range bars | Done | `/charts/trend` | Optional comfort band. |
| D012 | Table as chart | Done | `/charts/trend` | Heat, bar, dot and rank modes; sorting is client-side only. |
| D014 | Scatter, bubble, matrix, hexbin, regression | Done | `/charts/distribution` | Regression with R²; keyboard point navigation. |
| D016 | Percentile latency | Done | `/charts/distribution` | p50/p90/p95/p99 with SLO line and drag-zoom. |
| D017 | Latency bucket heatmap | Done | `/charts/distribution` | Log colour scale, percentile overlay lines. |
| D023 | Stacked / segmented progress | Done | `/charts/composition` | Over-capacity state flagged with a glyph, not just colour. |
| D029 | Top-N with Other, co-occurrence matrix | Done | `/charts/composition` | Adjustable N, expandable Other; Jaccard normalisation option. |
| D034 | Leaderboard, bar chart race | Done | `/charts/composition` | Rank-change arrows; race has play/pause/scrub with interpolated frames. |
| D035 | Actual vs target, burn-down/up, cumulative flow | Done | `/charts/delivery` | Burn-up forecasts completion; needed NaN-gap support added to `LineChart`. |
| D036 | RED / USE panels | Done | `/charts/delivery` | Status shown by glyph shape plus colour. |
| D037 | SLO burn rate, nines table | Done | `/charts/delivery` | Multi-window burn thresholds, error-budget curve, downtime-allowed table. |
| D038 | KPI table | Done | `/charts/delivery` | Status direction-aware (higher or lower is better). |
| D039 | Comparison tiles, percentile rank | Done | `/charts/delivery` | |
| D040 | Live counter, countdown, world clocks, rate meter | Done | `/charts/delivery` | Ticks from a clock hook; not tested over real elapsed time. |
| D042 | Network / dependency graph | Done | `/charts/graphs` | Seeded force layout and layered DAG; drag nodes; shortest-path trace. |
| D044 | Flowchart, state machine, sequence | Done | `/charts/graphs` | State machine is interactive. Flowchart and state machine scroll sideways when wide instead of shrinking. |
| D046 | Topology overlays | Partial | `/charts/graphs` | Traffic-weighted animated edges, health colours and path trace work. Arrowheads on thick traffic edges are small and partly hidden by nodes. |
| D048 | Gantt, swimlane, event river, resource schedule | Done | `/charts/timelines` | Dependencies, today line, conflict detection. Event river uses a silhouette baseline. |
| D051 | State timeline, event strip, annotation lane | Done | `/charts/timelines` | Drag to zoom. Event labels can overlap at 390px. |
| D052 | Log-volume histogram, pattern clusters | Done | `/charts/timelines` | Patterns derived by normalising IPs, numbers and ids. |
| D053 | CPU core heat strip, process treemap, thread timeline | Done | `/charts/timelines` | Treemap reuses the existing `Treemap` component. |
| D055 | Step durations, drop-off reasons, journey paths | Done | `/charts/timelines` | |
| D056 | Choropleth, bubble, clusters, flow lines, heat, floor plan, rack | Partial | `/charts/maps` | Map is a coarse hand-drawn Australia outline (~50 km accuracy); choropleth is a tile cartogram because no real state polygons were available. Bubble-map labels overlap in the south-east. Clusters are computed in screen space. |
| D073 | Export PNG/SVG/CSV, fullscreen, accessible table fallback | Partial | all `/charts/*` | Every chart has the table toggle, CSV and fullscreen. SVG/PNG export captures only the first SVG in a frame, and HTML-based charts (tables, bars, leaderboard, rack, segmented bar) offer CSV only. PNG export and fullscreen are not covered by tests. |

## Shared changes outside `p2/charts/`
- `ui/Charts.tsx`: exported `nice`, `fmtDefault`, `useWidth`, `Tooltip`; added `thresholds` prop to `LineChart`; `NaN` values now leave a gap in a line; `C(i)` no longer yields an undefined colour for negative indices.
- `ui/chartTools.tsx`: exported `download`; added `ChartTableData`, `tableToCsv`, `GenericTable`.

## Known gaps
- Fictional data only; no live data source wiring.
- Interaction coverage is the tests in `charts.test.tsx`; drag, pan and drag-zoom gestures are not exercised there.
- Visual review was by screenshot at 1440 px (light) plus selected dark and 390 px views, not every page at every size.
