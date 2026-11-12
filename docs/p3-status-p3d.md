# P3d status: more charts (D002, D009, D010, D013, D018, D021, D022, D024-D028)

Code: `apps/admin/src/p2/p3d/`. Pure maths (tested): `stack.ts`, `stats.ts`, `hier.ts`, `flow.ts`, `radial.ts`. Charts: `area.tsx`, `dist.tsx`, `hierCharts.tsx`, `biz.tsx`, `parts.tsx`. Shared wrapper `kit.tsx` (uses `../charts/frame.tsx`: data-table toggle, export, fullscreen, empty/loading/error states; adds a focusable `role="img"` svg, arrow-key readout and a legend). Sample data is seeded (`data.ts`).

| Entry | Route | Status | Note |
| --- | --- | --- | --- |
| D002 area, stacked, 100%, streamgraph | /p3/charts/area-bands | Done | wiggle baseline for the stream; 100% columns tested to sum to 1 |
| D009 min-max band, fan chart | /p3/charts/area-bands | Done | fan bands 50/80/95% widen with sqrt(horizon); illustrative spread, not a fitted model |
| D010 horizon, cycle plot | /p3/charts/area-bands | Done | horizon layers tested to reconstruct the values |
| D013 histogram, density, ridgeline, box, violin, strip/beeswarm | /p3/charts/distributions | Done | type-7 quartiles, Tukey whiskers, Gaussian KDE (Silverman); beeswarm tested for no overlap. Individual points are not keyboard-navigable (groups are) |
| D018 CDF, QQ plot | /p3/charts/distributions | Done | normal QQ with quartile line; keyboard steps through deciles |
| D021 treemap, sunburst, icicle, packed circles | /p3/charts/hierarchy | Done | squarify areas tested proportional; packing is greedy tangent placement, tested non-overlapping |
| D022 waterfall, Pareto, funnel, pyramid | /p3/charts/business-flow | Done | |
| D024 bump, Marimekko | /p3/charts/business-flow | Done | |
| D025 waffle, pictogram, unit chart | /p3/charts/parts-radial | Done | largest-remainder counts; pictogram uses a distinct shape per category |
| D026 rose, 24 h clock | /p3/charts/parts-radial | Done | |
| D027 nested donut, gauge cluster | /p3/charts/parts-radial | Done | gauge zones use status tokens and print the zone name |
| D028 diverging Likert, NPS gauge | /p3/charts/parts-radial | Done | |

## Known issue outside this folder
The nav group name "Charts (more)" makes `apps/admin/src/p2/chrome/nav.tsx` emit `aria-controls="nav-Charts (more)"` and `id="nav-Charts (more)"`, an invalid IDREF (`aria-valid-attr-value`). It shows only on pages where the group is expanded, so the five /p3/charts/* a11y tests fail until nav.tsx sanitises the id (e.g. `nav-${g.replace(/\W+/g, "-")}` in both places). Not fixed here (outside my folder). The charts themselves had no other violations.

## Tests
`layout.test.ts` (35, maths) and `charts.test.tsx` (12: pages, empty states, keyboard, table, edge cases).
