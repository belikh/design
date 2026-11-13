<p align="right">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="packages/graphics/logo/jupiter-logo-dark.svg">
    <img alt="jupiter.au" src="packages/graphics/logo/jupiter-logo-light.svg" width="260">
  </picture>
</p>

# Jupiter design system

One JSON file is the source of truth for every Jupiter surface: websites, apps, email, terminals, kiosks and mobile.

```
packages/tokens/   @belikh/jupiter-tokens: jupiter.tokens.json + generators + built outputs
packages/graphics/  @belikh/jupiter-graphics: one-line SVG icons, illustrations, scenes and dividers
packages/rust/     jupiter-theme crate (palettes + ratatui/egui/iced adapters)
packages/latex/    LaTeX classes + templates (resume x3, letter, cover letter, notes, report, invoice)
apps/admin/        THE app: the design-system site (overview, tokens, type, layout, graphics, targets, live token editor) and the admin template, warehouse kiosk system, Home Assistant and ESPHome panels, as one site
packages/esphome/  @belikh/jupiter-esphome: instrument widgets that emit ESPHome lambda / LVGL snippets
packages/github/   @belikh/jupiter-github: README logo header, tiles, badges, social preview (SVG, light + dark) and templates
```

## Changing a token

1. Edit `packages/tokens/jupiter.tokens.json` (the `/editor` page of the app can build the JSON for you; use **Copy**).
2. `npm run build` regenerates everything in `packages/tokens/dist/`.
3. Bump the version and release. Consumers update the dependency and every surface follows.

## Using it in a project

Every file is generated from the one tokens JSON and published as an **unversioned** release asset, so a project can
track `current` or pin a version.

| Surface | Use |
| --- | --- |
| Plain HTML / static sites (Cloudflare Pages, Workers assets) | `<link rel="stylesheet" href="https://<pages-host>/current/jupiter.css">`, or copy the file |
| Any bundler (Vite, Astro, Next, ...) | `import "@belikh/jupiter-tokens/css"` |
| Tailwind v4 | `@import "@belikh/jupiter-tokens/tokens.css"; @import "@belikh/jupiter-tokens/tailwind.css";` then `bg-jp-surface`, `text-jp-accent`, `font-jp-mono` |
| Variables only / components only | `@belikh/jupiter-tokens/tokens.css`, `@belikh/jupiter-tokens/components.css` (components sit in `@layer jupiter`, so app styles and utilities win) |
| Fonts (opt in) | `@belikh/jupiter-tokens/fonts.css` + your own copy of the font files |
| Kiosk touchscreens | `@belikh/jupiter-tokens/kiosk.css` |
| Email | `@belikh/jupiter-tokens/email.html` (inline-styled, table-based) |
| Terminals / SSH | `@belikh/jupiter-tokens/terminal.sh`, `@belikh/jupiter-tokens/Xresources` |
| Go TUIs (Bubble Tea / Lip Gloss) | `jupiter_theme.go`: `lipgloss.Color(jupiter.Dark.Accent)` |
| Rust (ratatui, egui, iced) | `jupiter-theme` crate (`packages/rust`) with optional adapters |
| Linux GUI: Slint, GTK4/libadwaita, Qt/QML, KDE | `jupiter.slint`, `jupiter-gtk-{light,dark}.css`, `jupiter-qt.tgz`, `Jupiter{Light,Dark}.colors`; see `packages/rust/README.md` |
| iOS / Android | `@belikh/jupiter-tokens/mobile.json` |
| LaTeX | `jupiter-latex.tgz` (classes + `jupiter-tokens.sty`); see `packages/latex` |
| Line graphics (icons, illustrations, dividers) | `@belikh/jupiter-graphics`: single SVGs, a sprite, CSS and a JS helper; see `packages/graphics/README.md` |
| JS/TS | `import { DEFAULT_TOKENS, generateCSS, ansiPalette } from "@belikh/jupiter-tokens"` |
| Raw tokens | `@belikh/jupiter-tokens/tokens.json` |

Components are plain CSS classes (`jp-btn`, `jp-table`, ...), so any framework can use them; see the docs site.

### Tracking `current`

- **Static sites, email, scripts:** point at `/current/<file>` on the Pages site (see Releases below). No rebuild needed
  for CSS; email, terminal, Go and mobile outputs only change when the consumer rebuilds, so run an update PR there.
- **npm consumers:** do not depend on a moving URL in a project that has a lockfile (the integrity hash will fail on
  the next release). Depend on the versioned tarball and let Renovate/Dependabot open update PRs:
  `"@belikh/jupiter-tokens": "https://github.com/<owner>/<repo>/releases/download/v1.0.0/jupiter-tokens-1.0.0.tgz"`.

## Releases

`.github/workflows/release.yml` runs on every push to `main`. If `packages/tokens/package.json` has a new version it:

1. runs typecheck, the token **validation gate** (schema, version in sync with `jupiter.tokens.json`, WCAG AA contrast in
   light and dark), the build, and a **breaking-change gate** (removing a `--jp-*` variable or `.jp-*` class needs a
   major version bump, checked against the previous release's `names.json`);
2. publishes an immutable `vX.Y.Z` GitHub release with unversioned assets (`.../releases/latest/download/jupiter.css`);
3. if the repo variable `CLOUDFLARE_PAGES_PROJECT` (and secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) is set,
   deploys a Pages site with `/current/` and every `/vX.Y.Z/` (versioned paths are immutable-cached).

A private repo means each consumer needs a token to fetch release assets; the Pages site does not.

## Develop

```sh
npm install
npm run dev        # builds tokens, then serves the app (design-system site + admin template) on :3000
npm run build      # tokens + app
npm run lint       # divergence guard rails + house style lint
npm run typecheck
```

## Fonts (not in the package)

SGI Text / SGI Alt are Bitstream typefaces marked "confidential and proprietary". They live only in
`apps/admin/public/fonts/` and are **not** shipped in `@belikh/jupiter-tokens`. The CSS falls back to system fonts.
JetBrains Mono is OFL-licensed. Confirm redistribution rights before adding any of these to a published package.

## Publishing

Not published to a registry yet. Consumers install the versioned tarball from the GitHub release (above); GitHub
Packages or a private npm scope can be added later without changing the file layout. Run `npm run build` locally and
`scripts/release-assets.sh` to see exactly what a release contains.
