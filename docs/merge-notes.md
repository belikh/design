# Merging apps/docs into apps/admin

Why: the design system was two sites on two ports (docs :3000, admin :3100) with two class vocabularies (`.site-*`, `.adm-*`), two component stacks (Tailwind/shadcn/base-ui/sonner/recharts/lucide vs `@belikh/jupiter-ui`) and two theme stores. There is now ONE app (`apps/admin`, package `@belikh/jupiter-admin`, port 3000, strict) in the original docs look.

## URL map
| Old | New | Notes |
| --- | --- | --- |
| docs `/` Overview | `/` | `src/docs/Overview.tsx`, group Foundations |
| docs `/tokens` `/fonts` `/layout` `/graphics` | same | Foundations |
| docs `/components` (HTML markup demos) | `/components/html` | `/components` stays the admin React gallery (collision resolved by moving the docs page; the two pages link to each other) |
| docs `/dashboard` (sample dashboard) | `/dashboard` | Build; traffic SVG replaced by the shared `LineChart` |
| docs `/targets` `/editor` | same | Ship |
| admin `/` (dashboard Overview) | `/overview` | nav label "Admin overview", group Dashboards |
| every other admin route | unchanged | |

Nav order: Foundations, Build, Ship, then the admin groups. `p2/registry.ts` ranks `p2/docs` first, then `core`, then areas alphabetically.

## What moved where
- Pages: `apps/admin/src/docs/*` (registered by `p2/docs/index.tsx`). Token editor state: `docs/store.tsx` (`DsProvider`, mounted in `App.tsx`).
- Live tokens: when the tokens differ from the defaults a `<style id="jupiter-live">` with `generateTokensCSS` is emitted into the `jp` layer after the static tokens.css, so edits restyle the whole site. (Only the token variables are re-emitted, not the component CSS, so app overrides in the `app` layer keep winning.)
- Theme: one preference, `PrefsProvider.theme` (`jp-theme`); added additive `resolvedTheme`. The docs `mode`/`setMode` are thin aliases. The editor's light/dark tab sets it like the old site did.
- Toasts: `usePrefs().toast` replaces sonner (`docs/copy.ts`).
- Shell: 48px bar, `jupiter /ds` brand, version and custom-tokens badges, flat nav list (mono group labels, dash marker, accent text for the active item; filter, collapsible groups, pins, resize and rail kept), sidebar status block, footer line. Styles in `styles/shell.css`.
- Shared UI additions (`packages/ui`): `PageHeader` (`eyebrow`, `children`), `Section`, `Callout`, `KeyValue` (`.adm-facts`), `SimpleTable`, `StatTile` (`unit`, `trend`, `testId`), `CodeBlock` (`testId`, `maxHeight`), `Panel`/`Badge` `testId`; restyled `.adm-pagehead`, `.adm-tabs--line`, `.adm-seg` to the flat look.
- Tokens: compact density, high contrast and print overrides moved into the generated components CSS (they re-point `--jp-*`, which apps may no longer do).
- Fonts: `apps/docs/public/fonts` -> `apps/admin/public/fonts` (JetBrains Mono + OFL + README committed, SGI files gitignored via `apps/admin/.gitignore` and the root `.gitignore`). Favicons copied.
- Infra: root scripts (`dev`, `dev:admin` alias, `build`, `typecheck`, `lint`), CI (`npm run lint` before typecheck/test), release.yml (Pages site now contains the built app at `/` plus `_redirects` SPA fallback, alongside `/current` and `/vX.Y.Z`), READMEs, `visual.mjs`/`e2e.mjs` defaults, lockfile via `--package-lock-only`. a11y and visual baseline keys `/` -> `/overview`.

## Dropped / merged
- `apps/docs` deleted, with Tailwind, shadcn, base-ui, sonner, recharts, lucide (+ shims, `components.json`), react-query, `@fontsource/*` (the tokens font stack uses the local SGI/JetBrains files), `lib/api.ts`, `queryClient.ts` (unused).
- Docs theme switch (auto/light/dark buttons) is replaced by the existing Display menu (same state). Mobile "menu" button: the admin sidebar is still hidden below 860px as before.
- Docs `Components` and `Dashboard` are kept as `/components/html` and `/dashboard`: they show the raw `jupiter.css` markup, which the React gallery does not.

## Divergence guard rails
`scripts/check-divergence.mjs` (root `npm run lint`, CI): one UI app; no banned deps; no `--jp-*` definitions in app/ui CSS or TSX (tokens output and the live style excepted); no `.site-*`; every CSS file in apps/admin imported (global ones listed in `src/styles/entry.ts`). See AGENTS.md "Divergence rules".

## Left over / caveats
- The "shared style entry list" rule is enforced for `src/styles/*` only; area CSS (`p2/*/*.css`, warehouse, ha, esp) is imported by its components (reachability is checked). Moving those into the entry would touch concurrently edited files.
- `npm run build -w @belikh/jupiter-admin` (tsc) currently fails only in other agents' `p2/p3c/*` files; `vite build` succeeds. `lint:style` fails only on `p2/p3c/grid.tsx` and `querytools.tsx` (not mine).
- Visual baseline has no entries for the new docs routes; run `npm run visual -- --update --only /` when the tree settles.
- Hard-coded colours/px font sizes still exist in legacy files under the lint baseline; the new check does not add colour/shadow scanning beyond `lint:style`.
- Nav group ids are now sanitised (`navId` in `p2/chrome/nav.tsx`, with a test).
