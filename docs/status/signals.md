# Status: domain charts

Code: `apps/admin/src/areas/signals/`. Routes are registered from `index.tsx`; all are in the nav group "Charts (domain)". Maths lives in plain `.ts` modules (`finance`, `polar`, `wordcloud`, `energy`, `signal`, `contour`, `storage`, `features`, `interact`) with unit tests in `math.test.ts`; component tests are in `charts.test.tsx`.

Shared pattern (`shared.tsx`, `Fig`): each chart is an SVG with `role="img"` and a computed text summary, a data-table toggle and CSV/SVG/PNG export (via the existing `ChartFrame`), a legend, an empty state, and a keyboard-reachable inspector (a labelled slider that walks the data points and updates an `aria-live` readout; hover does the same). Series are told apart by more than colour where it matters (hollow vs solid candles, dash styles, shapes, SVG patterns). Red and green are used only for status (budget variance favourable/adverse, with hatching and text as well).

| Entry | Route | Status | Note |
| --- | --- | --- | --- |
| D060 | /signals/finance | Done | Candlestick and OHLC (toggle), depth chart, control chart (mean ± 3σ plus runs of 7 as signals), error bars (SD, SE or 95% CI). |
| D061 | /signals/polar | Done | Radar, polar area (area proportional to value), parallel coordinates (group emphasis, inverted axes). |
| D062 | /signals/polar | Done | Word cloud (deterministic spiral packer, no overlaps, words that do not fit are skipped and still listed in the table) and tag cloud (real buttons, filter callback). The cloud words are not individually focusable; the inspector slider and table cover keyboard use. |
| D063 | /signals/energy | Done | Load curve with tariff bands and per-band cost, stacked sources, battery state of charge with charge/discharge bars and reserve line. |
| D064 | /signals/energy | Done | Temperature and humidity with comfort band and in-band share, 16-point wind rose by speed class, sun path (three days, hourly marks, solar-time approximation). |
| D065 | /signals/signal | Done | Spectrogram and waterfall from a naive DFT of a synthetic signal, 16-QAM constellation with EVM. Sample data is synthetic, not real Wi-Fi CSI; the components take plain arrays. |
| D066 | /signals/finance | Done | Budget variance (cost vs revenue aware), invoice ageing (buckets sum to total), cash-flow bridge. |
| D067 | /signals/signal | Done | Audio waveform envelope, image luminance histogram with clipping readouts, video timeline markers with row packing. No real media is decoded; inputs are sample arrays. |
| D068 | /signals/surface | Done | Contour plot (marching squares, chained polylines, selectable level count) and isometric wireframe surface (painter-ordered rows, height exaggeration). Contour lines are labelled only when long enough. |
| D069 | /signals/surface | Done | Pool layout (RAID level selector, usable vs redundancy, disk cards), SMART trend (three attributes against thresholds), capacity forecast (least-squares trend, ±1.96σ band, days to full). The forecast is a straight line fit, not seasonal. |
| D074 | /signals/features | Done | One reusable hook, `useChartInteractions` (`useChartInteractions.tsx`), with pure maths in `interact.ts` (tested in `interact.test.ts`). It gives any SVG chart: drag-to-zoom (pointer drag, double-click reset, keyboard + / - / arrows / Home / End / Escape on a focusable frame, and a visible range control with start/end sliders and buttons), a crosshair shared by charts with the same `group` id (optionally the zoom window too), lasso (pointer polygon, or keyboard: arrows move a point, Space adds a vertex, Enter closes), linear/log and absolute/percent-change toggles, and a last-updated stamp with a query inspector (`meta`). `Fig` takes `ix` and adds the frame and controls. Applied to `TrendFig` (all options, incl. threshold bands, alert markers and a ghost series), `LassoScatter` (lasso-only), and to `ControlChart` and `TempHumidity` (zoom, shared crosshair, range control), which are the same components the Finance and Energy pages use; the Features page shows both of those next to the demos. |

## Verification
- `npx vitest run src/areas/signals`: maths and component tests.
- `/signals/*` pass the axe route check without baseline changes.
- `npm run lint:style`: no violations from this area (any current failures come from other areas).
- Type check was run on this area in isolation (`tsc -p` over the folder) because `src/docs/Editor.tsx` currently has a syntax error from another process.

## Known limits
- Charts import `ChartFrame` from `../charts/frame.tsx` (read-only reuse); a rename there would need a matching change here.
- Word-cloud text widths are estimated (0.58 em per glyph), so spacing is approximate for proportional fonts.

## D074 limits (honest)
- Zoom, crosshair, range control and freshness are wired into four components (`TrendFig`, `LassoScatter`, `ControlChart`, `TempHumidity`). Other charts in the area (candlestick, load curve, battery, SMART, forecast and so on) still use the plain `Fig` and can opt in with the same three lines (`useChartInteractions`, `ix`, `plotProps` + `overlay`).
- Log and percent toggles are built into `TrendFig` only. In percent mode every series is a change from its own first visible point; log is offered only for absolute values and clamps values at or below zero to the floor. `ScaleSwitch` (stacked percent of total) and `CrossFilter` / `PatternBars` / `AsciiPreview` remain separate compositions.
- Groups share an index domain: charts in one group must have the same x positions (sync of zoom assumes equal length).
- The lasso on a line chart selects points inside the polygon in pixel space; the keyboard lasso needs a focused chart frame.
- Verified in Chromium: drag-zoom, double-click reset, keyboard zoom, synced crosshair and zoom across two charts, pointer lasso, and axe on the page after load.
