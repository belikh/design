# Native Linux demos

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
