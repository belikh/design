# Changelog

## Unreleased

## 1.6.0
- Planner in @belikh/jupiter-ui (`Planner.tsx`): a plan as a grid, a row per person or resource against days or time slots with one block per cell, for rosters, lane rotations and bookings. Sticky headers, arrow-key movement, summary rows, a compact mode; `PlanChip` and `PlanLegend` show a block and the key on their own
- TabBar in @belikh/jupiter-ui (`TabBar.tsx`): bottom navigation for phones, placed last in `.adm-shell`
- A side Drawer is never taller than the screen: a long body scrolls inside it and the footer buttons stay in reach (they were pushed below the viewport)
- Touch mode ships in @belikh/jupiter-ui: `styles/touch.css` (44px targets under `data-touch="true"`) and `touch.ts` (`initTouchMode` turns it on for a phone or a tablet unless the person chose otherwise)

## 1.5.7
- The shell's main area contains its absolutely placed children, so hidden screen-reader text in a long page no longer makes the page behind it scroll into blank space on phones

## 1.5.6
- Terrain fits a phone: in a container narrower than 40rem it lays the map out again as a tall, narrow one (`narrowWidth`, `narrowHeight`) instead of scrolling sideways

## 1.5.5
- @belikh/jupiter-graphics: seven logistics icons, `truck`, `trailer`, `forklift`, `pallet`, `dock`, `gate` and `seal`, for dock-scheduling screens
- Spotlight, SettingsSection and SettingsRail in @belikh/jupiter-ui/kit.tsx; StatTile takes size="lg". A page can lead with its one important item and lay out admin settings as title and explanation beside the controls

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
