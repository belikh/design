# @belikh/jupiter-esphome

Instrument widgets for ESPHome displays, in the Jupiter look: dial, bar, big-number tile, sparkline, thermometer, battery,
Wi-Fi signal, status, clock, humidity drop, level tank, segmented progress and a two-value tile.

Each widget is defined once as drawing primitives and rendered three ways:

- `renderSvg(widget, props, { width, height, palette })`: a pixel-exact preview (1 unit = 1 px; crisp edges on 1-bit and e-paper)
- `toLambda(widget, props, rect, palette)`: an ESPHome display-lambda block (only `it.line / rectangle / filled_rectangle / circle / filled_circle / horizontal_line / printf / strftime / fill`)
- `toLvgl(widget, props, rect)`: an LVGL YAML snippet referencing the styles in `@belikh/jupiter-tokens/esphome.yaml`

Palettes: `colour`, `epaper3` (white/black/red), `epaper4` (+ yellow), `mono` (1-bit). `quantise()` and the renderers only use inks a
panel can show. `dashboard(display)` lays out a ready-made screen; `DISPLAYS` lists common panel sizes.

Sensor values are C++ expressions (`{ expr: "id(temp).state", sim: 22.4 }`): the lambda uses `expr`, the preview uses `sim`.

Not verified: the generated lambdas and LVGL snippets have not been compiled for real hardware. Run `npm test -w @belikh/jupiter-esphome`
for the structural checks (valid SVG, legal inks, allowed `it.*` calls, YAML parses, theme in sync with the tokens).
