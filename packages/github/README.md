# @belikh/jupiter-github

Makes READMEs, the personal profile (`<user>/<user>`), the organisation profile (`.github/profile/README.md`) and the repo social preview look like Jupiter.
Every colour, font and radius comes from `jupiter.tokens.json`: the tokens package emits `jupiter-github.json`, `src/render.mjs` turns it into SVG, so one token change updates everything.

## Use

```sh
node src/make.mjs --title "My project" --subtitle "What it does" --out .github/assets
node src/make.mjs --out .github/assets --only banner,social --logo --footer "owner/repo" --png
node src/make.mjs --out .github/assets --only badge --badge "build|passing|ok" --badge "coverage|91%|info"
node src/make.mjs --out .github/assets --only tile --tile "Uptime|99.98%|ok"
node src/make.mjs --palette        # Markdown table with `#hex` chips
```

Files come in `-light` / `-dark` pairs (`banner`, `divider`, `social-preview`, `tile-<label>`, `badge-<label>`). Statuses: `ok warn danger info accent neutral`
(badge value text uses the token's status colour on its `*Bg`, which the tokens build already checks for WCAG AA). Reference them with `<picture>`:

The default README header is just the logo, right-aligned, no per-repo banner:

```html
<p align="right">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/belikh/design/main/packages/graphics/logo/jupiter-logo-dark.svg">
    <img alt="jupiter.au" src="https://raw.githubusercontent.com/belikh/design/main/packages/graphics/logo/jupiter-logo-light.svg" width="260">
  </picture>
</p>
```

(Banners and the social preview can still be generated with the commands above when wanted; the templates do not use them.)

`templates/README.md`, `profile-README.md` and `org-profile-README.md` use `<picture>`, alerts (`> [!NOTE]`), tables, badges, Mermaid and hex chips.
The org template uses absolute `raw.githubusercontent.com` URLs because relative paths are unreliable on the org page.

## Design for GitHub's renderer

README HTML is sanitised (no style, class, script, iframe), so styling lives in the SVGs. SVGs are shown through `<img>`: no scripts, no external fonts or links.
The files embed base64 WOFF2 subsets (SGI Text 400/800, JetBrains Mono 500; Basic Latin and common punctuation, about 30 KB per banner) and use inline CSS animation
(a flowing line with status spots) that stops under `prefers-reduced-motion`. Dark mode is two files plus `<picture>` (the media query follows the OS/browser, not GitHub's own theme switch).

## Build and sync

- `npm run build -w @belikh/jupiter-github`: syncs the logo from `packages/graphics/logo`, writes `assets/` from `src/theme.json`, and writes this repo's own banner and social preview to `.github/assets/` (used by the root README).
- `src/theme.json` is written by the tokens build (`npm run build:tokens`), like the Rust core. CI fails if `theme.json`, `assets/` or `.github/assets/*.svg` are stale; the test suite checks the same.
- `npm run png`: rasterises the social preview with Chromium via playwright-core (`CHROMIUM=<path>`, default `/usr/bin/chromium`). PNGs are committed but not diff-checked (rasterisation varies by build).
- `scripts/subset-fonts.sh` (developer only; needs fonttools + brotli) regenerates `src/fonts.mjs`. Titles with characters outside the subset fall back to the system stack.
- The logo (`--logo`) is the one in `packages/graphics/logo`, embedded by `scripts/sync-logo.mjs`; it is not redrawn here.

## Limits

Embedded SGI Text is proprietary Bitstream data, included with the owner's consent; JetBrains Mono is SIL OFL. Not published by `scripts/publish-packages.mjs`; it ships as the release asset `jupiter-github.tgz`.
Text is not measured: long titles and subtitles shrink to a minimum size, then overflow. The social preview must be uploaded manually in repo settings.
