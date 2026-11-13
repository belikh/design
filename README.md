<p align="right">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="packages/graphics/logo/jupiter-logo-dark.svg">
    <img alt="jupiter.au" src="packages/graphics/logo/jupiter-logo-light.svg" width="260">
  </picture>
</p>

<br>

# Jupiter design system

Colour, type and shape for websites, apps, email, terminals, kiosks, mobile, documents and READMEs, generated from one token file.

<br>

<p>
  <a href="docs/consuming.md"><b>Use it in a project</b></a> &nbsp;·&nbsp;
  <a href="#change-a-token">Change a token</a> &nbsp;·&nbsp;
  <a href="#targets">Targets</a> &nbsp;·&nbsp;
  <a href="#releases">Releases</a> &nbsp;·&nbsp;
  <a href="#develop">Develop</a>
</p>

<br>

---

<br>

## What is in here

| Part | Where | What |
| :-- | :-- | :-- |
| **Tokens** | `packages/tokens` | `jupiter.tokens.json`, the generators, and every built output |
| **UI** | `packages/ui` | React components, shared styles and the agent skill |
| **Graphics** | `packages/graphics` | One-line SVG icons, illustrations, dividers and the logo |
| **Fonts** | `packages/fonts` | The font files, as their own package |
| **App** | `apps/admin` | The design-system site and the admin template, one app |
| **Rust** | `packages/rust` | `jupiter-theme` crate with ratatui, egui and iced adapters |
| **LaTeX** | `packages/latex` | Classes and templates: resume, letter, notes, report, invoice |
| **ESPHome** | `packages/esphome` | Instrument widgets that emit ESPHome / LVGL snippets |
| **GitHub** | `packages/github` | README, profile and social-preview kit |

<br>

## Change a token

<br>

1. Edit `packages/tokens/jupiter.tokens.json`. The `/editor` page of the app can build the JSON.
2. Run `npm run build`. Every output is regenerated.
3. Bump the version with `node scripts/bump-version.mjs X.Y.Z` and push.

Projects depend on the published `@belikh/jupiter-*` packages and pick up the change with `npm run update:design`.

<br>

## Targets

<br>

<details>
<summary><b>Every generated target</b></summary>

<br>

| Surface | Use |
| :-- | :-- |
| Plain HTML / static sites | `<link rel="stylesheet" href="https://<pages-host>/current/jupiter.css">` |
| Any bundler (Vite, Astro, Next) | `import "@belikh/jupiter-tokens/css"` |
| Tailwind v4 | `@import "@belikh/jupiter-tokens/tokens.css"; @import "@belikh/jupiter-tokens/tailwind.css";` |
| Variables or components only | `tokens.css`, `components.css` (components sit in `@layer jupiter`) |
| Fonts | `@belikh/jupiter-fonts/fonts.css` |
| Kiosk touchscreens | `@belikh/jupiter-tokens/kiosk.css` |
| Email | `@belikh/jupiter-tokens/email.html` |
| Terminals / SSH | `terminal.sh`, `Xresources` |
| Go TUIs | `jupiter_theme.go` |
| Rust (ratatui, egui, iced) | the `jupiter-theme` crate |
| Slint, GTK4, Qt, KDE | `jupiter.slint`, `jupiter-gtk-*.css`, `jupiter-qt.tgz`, `Jupiter*.colors` |
| iOS / Android | `mobile.json` |
| LaTeX | `jupiter-latex.tgz` |
| ESPHome | `@belikh/jupiter-esphome` |
| READMEs and profiles | `jupiter-github.tgz` |
| JS / TS | `import { DEFAULT_TOKENS, generateCSS } from "@belikh/jupiter-tokens"` |

</details>

<br>

## Releases

<br>

Every push to `main` runs the release workflow. If the token version is new, it:

1. checks the schema, WCAG AA contrast in light and dark, and that no variable or class was removed without a major bump;
2. publishes an immutable `vX.Y.Z` release with the generated files;
3. publishes the npm packages to GitHub Packages;
4. deploys the Pages site, when `CLOUDFLARE_PAGES_PROJECT` is set.

<br>

## Develop

<br>

```sh
npm install
npm run dev        # tokens, then the app on :3000
npm run build
npm run lint       # divergence guard rails and house style
npm run typecheck
```

<br>

---

<p align="right"><sub>jupiter.au</sub></p>
