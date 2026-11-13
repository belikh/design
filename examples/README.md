# Native Linux demos

Both demos have the same eight pages (Overview, Metrics, Alerts, Tables, Invoice, Documents, Network, Settings), all
driven by the generated tokens (colours, type, spacing, radius, motion and the `density` presets) and by
`data/sample.rs`, which `npm run export:sample` derives from the same fixtures as the web dashboards. Settings has a
working Dark/Light switch, Compact density (control height, cell and page padding come from the density tokens) and
Show resolved incidents (filters the Alerts page). The Tables page sorts by column, selects rows and edits Client, Status and Total cells in place (Enter commits, Escape cancels, invalid input stays open with a message). Documents previews the selected item's LaTeX source; Network draws the device topology from each uplink.

Render every page to a PNG (needs a display): `examples/sync-assets.sh && examples/check-native.sh`. Both demos accept
`--page <name> --dark --compact --hide-resolved --screenshot out.png`; Slint also takes ordered `--click x,y` and `--type text` (real pointer and key events, so a whole cell-editing session can be scripted); GTK takes `--toggle dark|compact|resolved`, `--select <row>` (document preview) and `--edit row,col,text` (drives a table cell's own entry). CI does not build these demos (it
validates the generated GTK CSS only), so they are verified by building and rendering locally.

Two small Rust apps showing the same dashboard themed from the generated outputs: the Slint theme global and the
GTK4 named-colour stylesheet, plus the `@belikh/jupiter-graphics` icons, a spot illustration and a rule.

```sh
npm run build -w @belikh/jupiter-tokens -w @belikh/jupiter-graphics
examples/sync-assets.sh            # copies the generated theme + SVGs into each demo

cd examples/slint && cargo run -- [--dark]
cd examples/gtk   && cargo run -- [--dark]
# render one frame to a PNG and exit (CI / visual diffs):
cargo run -- --dark --screenshot out.png
```

- **Slint** uses `jupiter.slint` (the `Jupiter` global). Graphics are single strokes in `currentColor`, so `colorize`
  tints them from the theme. Fonts: if the proprietary SGI files exist in `packages/latex/fonts/`, the sync script
  bundles them via `fonts.slint`; otherwise Slint falls back to system fonts.
- **GTK4** (no libadwaita) loads `jupiter-gtk-{light,dark}.css` and its own `assets/app.css` written against the named
  colours. GTK will not recolour stroke icons, so the demo bakes the palette colour into each SVG before rendering
  (palette from the `jupiter-theme` crate).
- `assets/` and `ui/assets` are generated copies; re-run the sync script after rebuilding the tokens or graphics.
