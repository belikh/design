# Depending on the design system

Projects **depend** on the design system; they never copy it. A change to a design constant (`packages/tokens/jupiter.tokens.json`) or a
component (`packages/ui`) is released once, and every project picks it up with one update command.

## Web / npm projects
Packages (private, GitHub Packages): `@belikh/jupiter-tokens` (generated CSS and constants), `-graphics` (icons and illustrations), `-ui`
(React components, preferences, mock data layer), `-fonts` (the licensed typefaces, private), `-esphome` (display widgets).
They are named the same here and in the monorepo, so imports are identical everywhere.

```bash
node scripts/new-project.mjs ../my-project         # from a design-system checkout
cd ../my-project
export NODE_AUTH_TOKEN=$(gh auth token)           # token needs read:packages (gh auth refresh -s read:packages)
npm install && npm run dev
npm run update:design                              # later: take the newest design-system release
```
The generated `.npmrc` maps the `@belikh` scope to `https://npm.pkg.github.com` and reads the token from the environment. In CI, set
`NODE_AUTH_TOKEN` from a secret with read access to the packages.

Why real names rather than aliases such as `@jupiter/ui` -> `npm:@belikh/jupiter-ui`: npm 12 refuses registry installs through aliases
(`allow-remote`), and GitHub Packages requires the scope to be the repo owner.

## Releasing a change
Change the token or component here, then `node scripts/bump-version.mjs X.Y.Z && npm run build && npm run lint && npm test &&
npm run check:consumer`, push `main`. The release workflow publishes every package at that version (skipping versions already published)
and attaches the generated files to a GitHub release. `npm run check:consumer` proves the loop: it changes constants, rebuilds
`examples/consumer`, checks the new values arrived, and restores.

## Fonts
SGI Text and SGI Alt are proprietary and never committed or public. `node scripts/stage-fonts.mjs` copies them from `apps/admin/public/fonts`
into the gitignored `packages/fonts/files`; `node scripts/publish-packages.mjs --only fonts --include-fonts` publishes them to the private registry
from a machine that has them (CI does not). Projects import `@belikh/jupiter-fonts/fonts.css`; without the package they fall back to free fonts.

## Other targets (no npm mechanism)
Rust, Go, Slint, GTK, Qt, KDE, LaTeX, ESPHome YAML, email, terminal and mobile consume generated files from the release. Fetch them into a
gitignored directory at build time (`gh release download --repo belikh/design --pattern <file> --dir <build-dir> --clobber`); never commit them.
The list of files per target is in `packages/ui/skill/SKILL.md` and `README.md`.

## Agents
`packages/ui/skill/SKILL.md` is the skill development agents use before building anything. New projects get it linked from
`node_modules/@belikh/jupiter-ui/skill`, so it updates with the dependency. In this repo it is linked at `.claude/skills/jupiter-design-system`.
