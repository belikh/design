# Changelog

## 1.5.0
- Terrain in @belikh/jupiter-ui: a contour map of linked items (hills, dotted link trails), placed by links or by meaning, rendered as plain SVG with real links

## 1.4.0
- The github-readme skill moved to belikh/docs (skill-readme/SKILL.md, shipped in @belikh/jupiter-docs); @belikh/jupiter-ui no longer carries skill-readme
- 1.3.3: the documentation system moved to belikh/docs (docs.jupiter.au); the release carries jupiter-fonts.tgz (SGI Text, SGI Alt and JetBrains Mono woff2 with fonts.css)
- 1.3.1: the small-screen and high-contrast/print stylesheets ship in @belikh/jupiter-ui (styles/responsive.css, styles/a11y.css); .adm-hide-sm hides in the top bar on phones
- 1.3.0: the shell and docs-look stylesheets ship in @belikh/jupiter-ui (styles/shell.css, styles/docs.css) so sites can use the same sidebar, top bar and status bar as the demo
- 1.3.0: plant(seed, stage, links) in @belikh/jupiter-graphics (plant.ts), one-stroke plants for garden notes; icons sprout, bud and evergreen; logo/favicon.svg
- 1.3.0: closed dialog.adm-modal and dialog.adm-drawer stay hidden outside React
- Edit in place for table cells and detail fields, with a commit-on-blur or Save/Cancel preference
- Bulk edit: Mixed placeholder, live preview, relative changes, one undo, retry for failed rows
- Spreadsheet keys: type to replace, Tab and Enter navigation, paste a block, Ctrl/Cmd+D fill down
- Autosave, restored drafts and an unsaved-changes guard
- Native dialogs and popover menus; cascade layers; view transitions
- Command palette: recent and pinned pages, actions for the checked rows

## 1.0.0
- First release of the Jupiter design system: tokens, graphics, ESPHome widgets, LaTeX, Rust, and the admin template
