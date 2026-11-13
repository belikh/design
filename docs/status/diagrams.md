# Status: diagrams and spatial (D041-D059)

Code: `apps/admin/src/areas/diagrams/`. Real boundary data and loaders are in `au.ts` (+ `geodata/`), the road graph and Dijkstra in `roads.ts`, equal-area (Albers) area maths in `au.ts`, tested in `geodata.test.ts`. Layout maths lives in `flow.ts`, `tree.ts`, `sets.ts`, `dag.ts`, `trace.ts`, `cohort.ts`, `git.ts`, `geo.ts`, `au.ts`, `net.ts` (unit-tested in `logic.test.ts`); components are in the `.tsx` files, pages in `pages.tsx`, routes in `index.tsx`. Every diagram uses the shared `ChartFrame` (data-table view, fullscreen, SVG/PNG/CSV export, empty state), has an `aria-label` summary, a focusable readout and, where needed, a legend.

| ID | Route | Status | Note |
| --- | --- | --- | --- |
| D041 | /diagrams/flows | Done | Sankey, alluvial, chord, arc. Flow conservation, ribbon extents and chord angles tested. |
| D043 | /diagrams/hierarchies | Done | Collapsible tree, org chart, mind map (balanced sides), dendrogram (UPGMA, cut slider). |
| D045 | /diagrams/hierarchies | Done | Venn (2-3 sets; circle areas follow set size, overlap shapes schematic, counts exact) and UpSet (top 12 combinations). |
| D047 | /diagrams/systems | Done | ER (crow's foot), tiered architecture, dependency matrix, pipeline DAG with run states (failed upstream marks queued tasks blocked), data lineage with upstream/downstream tracing. |
| D049 | /diagrams/traces | Done | Waterfall with self time and critical path; flame graph with icicle toggle and zoom. |
| D050 | /diagrams/delivery | Done | Cohort retention heat table with weighted average row; funnel with All/Mobile/Desktop. |
| D054 | /diagrams/delivery | Done | Commit calendar, branch graph with lane reuse, deploy frequency, lead time, DORA bands. |
| D057 | /spatial/network | Done | Faceplate (status/PoE/VLAN), 42U rack elevation, Wi-Fi spectrum with channel recommendation, predicted signal heat on a floor plan. Signal is a model, not a survey. |
| D058 | /spatial/occupancy | Done | Occupancy heat (percent of capacity) and motion event raster. |
| D059 | /spatial/maps | Done | Hex tile map; choropleth on real boundaries (Natural Earth 1:10m states, public domain; ABS 2021 LGAs, CC BY 4.0: all 8 states and about 544 councils nationwide, zoom to any state, keyboard stepping and a council picker); GPS track with elevation; geofence states; isochrone as Dijkstra over an explicit Queensland road graph (35 towns, 40 highway links) with councils shaded by drive time and a route readout. Geometry is built once by `geodata/build-au.mjs`, committed as ~160 KB of JSON and lazy-loaded; sources, licences and dates are in `geodata/README.md`. |

Notes: all data is deterministic sample data in `data.ts`. No new dependencies; no map tiles. Large grids (calendar, floor plan, isochrone) use one tab stop with arrow-key navigation.

## D059 limits (honest)
- Boundaries are display grade: states simplified to 0.02 degree (about 2 km), LGAs to about 1 km. Coastal cities can fall just offshore (Darwin and Cairns CBD points do), so tests use inland points. Neighbouring LGAs are simplified independently (hairline gaps possible); enclave holes are dropped; about 13 tiny LGAs are drawn as boxes. Jervis Bay, Lord Howe, Macquarie, Christmas and Cocos Islands are omitted.
- Council values are a sample metric modelled from area, not a statistic. State values are sample data.
- The road graph is an explicit hand-made sample of Queensland highways (approximate coordinates, straight-line links), not OpenStreetMap routing. Cost model (documented in `roads.ts`): km x winding factor at 110/100/90 km/h plus 8/4/2 min transit at cities/centres/towns; no traffic, rest stops or ferries. Off-network areas are priced from the nearest town at 60 km/h x 1.25.
- The old raster `Isochrone` component and the hand-made polygons / jittered council grid were removed; `travelTimes` (grid Dijkstra) and `costGrid` remain in `geo.ts` / `data.ts` as tested maths.
- The map loads data with a dynamic import; until it arrives a status line shows (the shared `ChartFrame` loading skeleton fails axe `aria-prohibited-attr`, so it is not used here).
