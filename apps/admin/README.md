# Jupiter admin template

A working admin dashboard that exercises the design system end to end: shell, 28 routes, a data grid, 25-odd chart
types, every common input, overlays, and all the empty/loading/error states. It implements the **P1** tier of
[`docs/admin-dashboard-spec.md`](../../docs/admin-dashboard-spec.md). Everything is themed from `@belikh/jupiter-tokens`
(light, dark, auto; comfortable and compact density) and uses `@belikh/jupiter-graphics` for icons and illustrations.

```sh
npm run dev                # http://localhost:3000 (from the repo root: builds the packages first)
npm run build -w @belikh/jupiter-admin
```

Append `?theme=light|dark` to any URL to force a scheme (used for screenshots).

## Routes

| Group | Routes |
| --- | --- |
| Dashboards | `/` overview · `/analytics` · `/ops` operations wall · `/status` public status page |
| Data | `/orders` data table (sort, filter, facets, pin, resize, reorder, select, bulk, expand, inline edit, export, group, virtualise 20k rows) · `/cards` · `/list` · `/board` kanban · `/calendar` · `/inbox` master-detail · `/search?q=` |
| Records | `/customers/:id` · `/profile` · `/edit` (validation, dirty tracking, autosave, sticky save bar) · `/new` wizard · `/settings` |
| Tools | `/logs` live tail + regex · `/activity` · `/notifications` · `/dashboard-builder` drag/resize widgets · `/kiosk` |
| Warehouse | `/wh/dock` staff dock board · `/wh/kiosk` driver check-in terminal · `/wh/lobby` waiting-drivers display · `/wh/ticket/:id` driver phone page |
| Panels | `/ha` Home Assistant (simulated) · `/esphome` ESPHome instrument widgets |
| Library | `/charts` · `/inputs` · `/components` · `/states` · `/auth/sign-in` · `/errors/:code` |

`Cmd/Ctrl+K` opens the command palette; `?` shows the shortcut cheat sheet.

## Structure

- `src/ui/kit.tsx` buttons, badges, panels, tabs, modal, drawer, menu, tooltip, accordion, pagination, stepper, toasts…
- `src/ui/Charts.tsx` hand-rolled SVG charts (no chart dependency). 1 viewBox unit = 1 CSS pixel, so text never stretches;
  series colours are CSS variables derived from the tokens.
- `src/ui/DataTable.tsx` the grid. `src/ui/inputs.tsx` form controls. `src/data/fixtures.ts` seeded, deterministic data.
- `src/admin.css` layout and component styles, all via `--jp-*` variables.

## Warehouse timeslot system

Trucks check in at the kiosk (rego, booking or walk-in, load class, pallets, driver), get a ticket with queue position and
ETA, and are called to a compatible dock in priority order. Priority = time waited + slot adherence + load class (frozen,
chilled, dangerous goods) + carrier tier + urgent flag + SLA breach, and every contribution is shown so staff can see *why*;
the rules are editable live. The state lives in the browser and syncs between tabs (BroadcastChannel + localStorage), with
one tab elected leader (Web Locks) to run the clock, so open `/wh/kiosk` and `/wh/lobby` in other windows while using
`/wh/dock`. There is no server; production would need a shared backend. Engine: `src/warehouse/engine.ts` (pure, tested).

## Tests

`npm test -w @belikh/jupiter-admin` (Vitest + Testing Library, 67 tests). `npm run check:palette` gates the chart colours for
colour-vision safety. Append `?step=4` to `/wh/kiosk` to jump to a kiosk step.

## Not in scope here (see the spec's P2/P3 tiers)

Server integration, auth, real data fetching, charts' brush/zoom and export, RTL, print styles, and the long tail of
specialised views. Sample data is fictional.

Fonts: SGI Text and JetBrains Mono live in `public/fonts`; the proprietary SGI files are gitignored (JetBrains Mono is committed);
without them the app falls back to system fonts.
