# jupiter-theme (Rust)

Jupiter design tokens for native Rust apps. `src/generated.rs` is produced from `packages/tokens/jupiter.tokens.json`
(`npm run build`) and committed, so `cargo` users need no Node toolchain. CI fails if it is stale.

The core has **no dependencies**: `LIGHT` / `DARK` palettes, `Scheme`, `ANSI16`, and the `font`, `space`, `radius`,
`motion`, `layout` and `kiosk` constants. Adapters are opt-in features:

```toml
[dependencies]
jupiter-theme = { git = "https://github.com/<owner>/<repo>", tag = "v1.0.0", features = ["egui"] }
```

| Feature | Toolkit | Use |
| --- | --- | --- |
| `ratatui` | terminal UIs (a runnable six-page dashboard: `cargo run --features ratatui --example tui_dashboard`, or `-- --dump metrics` for one frame as text) | `jupiter_theme::tui::Theme::dark().selected()` returns a ready `Style`; `Color::from(rgb)` |
| `egui` | egui / eframe | `jupiter_theme::egui_theme::apply(&ctx, Scheme::Dark)` sets visuals, spacing and type sizes |
| `iced` | iced (via `iced_core`) | `.theme(|_| jupiter_theme::iced_theme::theme(Scheme::Dark))` |

## Other Linux GUI toolkits (generated files, no crate needed)

| Toolkit | File | Use |
| --- | --- | --- |
| Slint | `jupiter.slint` | `import { Jupiter } from "jupiter.slint";` then `background: Jupiter.bg;`. Switch scheme with `ui.global::<Jupiter>().set_dark(true)` |
| GTK4 / libadwaita (gtk4-rs, relm4) | `jupiter-gtk-light.css`, `jupiter-gtk-dark.css` | Load with a `CssProvider` at `STYLE_PROVIDER_PRIORITY_APPLICATION`; pick the file from the app's colour scheme (`adw::StyleManager`) |
| Qt / QML (cxx-qt) | `jupiter-qt.tgz` (`Jupiter/Jupiter.qml` + `qmldir`) | Put the folder on the QML import path, `import Jupiter 1.0`, `color: Jupiter.bg`; follows `Qt.styleHints.colorScheme` |
| KDE Plasma system-wide | `JupiterLight.colors`, `JupiterDark.colors` | Copy to `~/.local/share/color-schemes/`, then System Settings > Colors |

Not covered: libcosmic apps use COSMIC's own theme system (RON palettes); the `iced` adapter is for plain iced.

## Fonts

The tokens name SGI Text and JetBrains Mono. Neither is bundled; load them yourself (egui needs font bytes installed
with `Context::set_fonts`, Slint/GTK/Qt use installed families). The SGI faces are proprietary.

## Develop

```sh
cargo fmt --check && cargo clippy --all-features -- -D warnings && cargo test --all-features
```
