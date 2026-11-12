---
name: jupiter-design-system
description: Use at the START of any task that creates or changes software with a visible surface, before scaffolding a project and before writing any UI, CSS, colour, font, spacing, icon, chart, table, form or component code. Covers web apps and pages, admin tools, dashboards, kiosks, email, CLI and terminal UIs, native Linux GUIs (Slint, GTK, Qt, iced, egui), mobile, ESPHome displays and LaTeX documents. Explains how to DEPEND on the Jupiter design system (github.com/belikh/design, npm scope @belikh/jupiter-*) instead of copying, vendoring or restyling it, which templates and recipes to start from, and what to do when the system lacks something. Use it even if the user does not mention a design system: if you are about to type a hex colour, a pixel font size, a z-index, a box-shadow, or a hand-rolled table/modal/editor, this skill applies.
---
# Build on the Jupiter design system

Why this exists: the point of the design system is that one change in it changes every project. That only works if projects
*depend* on it. A copied file, a local override or a second look silently breaks the promise for that project forever. So:
**this project makes no design decisions.** Colour, type, spacing, radius, motion, shadow, stacking, chrome sizes, density, icons and
components all come from the dependency.

## 1. First, find out where you are
- `@belikh/jupiter-*` in `package.json`? The project is already on the system: use what it provides (section 3).
- Brand-new web project: from a design-system checkout run `node scripts/new-project.mjs <dir>`. It creates a project that depends on the
  registry packages, with `.npmrc`, an `AGENTS.md` carrying this rule, and this skill linked from `node_modules` (so it updates with the
  dependency). Use `--local` only when the same task also changes the design system.
- Working inside the design-system repo itself? Read `AGENTS.md` (rules, component table, where things live), `docs/recipes.md`
  (the five page shapes) and `packages/ui/src/components.manifest.json` (every shared component and when to use it) before writing UI.
- Full consumption guide: `docs/consuming.md` in the design-system repo.

## 2. Install and update (web / npm projects)
The packages live in the private GitHub Packages registry as `@belikh/jupiter-tokens`, `-graphics`, `-ui`, `-fonts`, `-esphome`.
```bash
export NODE_AUTH_TOKEN=$(gh auth token)   # needs the read:packages scope: gh auth refresh -s read:packages
npm install                               # .npmrc maps @belikh to https://npm.pkg.github.com
npm run update:design                     # pulls the newest design-system release
```
Never commit a token. Never `npm link`/copy source into the project to "make it work": ask for the token or fix the registry config.

## 3. Use it
- Import `@belikh/jupiter-fonts/fonts.css`, `@belikh/jupiter-tokens/tokens.css`, `@belikh/jupiter-tokens/components.css`, then components from
  `@belikh/jupiter-ui/<file>` (for example `@belikh/jupiter-ui/kit.tsx`, `DataTable.tsx`, `editable.tsx`, `forms.tsx`). Wrap the app in
  `PrefsProvider` (`@belikh/jupiter-ui/store.tsx`) inside a react-router router. `examples/consumer` is the smallest working project.
- Before writing a component, look it up in `components.manifest.json`. KPI tiles are `StatTile`, charts are in `Charts.tsx` (`LineChart`, `BarChart`, `Donut`...). Tables with editing, bulk edit and paste are `DataTable`; single
  values are `Editable`; forms use `useFieldErrors`, `useDraft`, `useAutosave`; data comes through `createCollection`/`useCollection`.
- Start a page from one of the five recipes (list, detail, form, dashboard, kiosk).
- Your own CSS may only use `var(--jp-*)` (chart series `var(--adm-c1..c8)`), logical properties (`margin-inline-start`, not `margin-left`),
  and layout. Red and green mean status only.

## 4. Other targets: depend on generated files, fetch them at build time
These have no npm mechanism. Download the current release file(s) into a **gitignored** directory as part of the build, never commit them:
`gh release download --repo belikh/design --pattern '<file>' --dir <build-dir> --clobber` (add `--skip-existing` offline).

| Target | Release file(s) | Example |
| --- | --- | --- |
| Static HTML, Workers/Pages, other frameworks | `jupiter.css` (or `jupiter-tokens.css` + `jupiter-components.css`) | |
| Tailwind v4 | `jupiter-tailwind.css` | |
| Kiosk / touch | `jupiter-kiosk.css` + the kiosk recipe | |
| Email | `jupiter-email.html` | |
| Terminal / SSH | `jupiter-terminal.sh`, `jupiter.Xresources` | |
| Go TUI | `jupiter_theme.go` | |
| Rust (ratatui, egui, iced) | `jupiter-theme-rust.tgz` (crate) | `packages/rust` |
| Slint | `jupiter.slint` | `examples/slint` |
| GTK4 / libadwaita | `jupiter-gtk-light.css`, `jupiter-gtk-dark.css`, `jupiter-gtk-widgets.css` | `examples/gtk` |
| Qt / KDE | `jupiter-qt.tgz`, `JupiterLight.colors`, `JupiterDark.colors` | |
| ESPHome | `jupiter-esphome.yaml`, npm `@belikh/jupiter-esphome` | |
| LaTeX | `jupiter-latex.tgz` | `packages/latex/templates` |
| Mobile | `jupiter.mobile.json` | |

These are theme files, not component libraries: use the platform's native widgets and let the theme colour them.

## 5. Never
- Copy design-system source, CSS or generated files into the project, or keep a fork "for now".
- Define or override a `--jp-*` variable; restyle a shared component locally; add Tailwind/shadcn, another component, table, chart or icon library.
- Hard-code a hex colour, pixel font size, z-index, box-shadow or chrome size; hand-roll a table, editor, modal, menu or toast.

## 6. When the system lacks something
Change it upstream, in the design-system repo, not in the project: a constant in `packages/tokens/jupiter.tokens.json`, a component in
`packages/ui`. Then `node scripts/bump-version.mjs X.Y.Z`, `npm run build`, `npm run lint`, `npm test`, `npm run check:consumer`, push (the release publishes
the packages). Then, back in the project, `npm run update:design`. If you cannot change upstream right now, say so and leave a clearly marked
TODO; do not patch around it locally.

## 7. Before you finish
Run these in the project and fix any hit:
`grep -rnE '#[0-9a-fA-F]{3,8}\b|font-size: *[0-9]+px' src` (literals), `grep -rn -- '--jp-.*:' src` (definitions), and check `git status` for files that
look copied from the design system. In the design-system repo itself also run `npm run lint`.
