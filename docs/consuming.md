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
SGI Text and SGI Alt are Bitstream typefaces used with the owner's consent. The woff2 files are committed in `apps/admin/public/fonts`, and every release carries
them as `jupiter-fonts.tgz` (the `@belikh/jupiter-fonts` package: the files and a `fonts.css`). `node scripts/stage-fonts.mjs` copies them into the gitignored
`packages/fonts/files` before the package is packed. Projects import `@belikh/jupiter-fonts/fonts.css`, or unpack `jupiter-fonts.tgz` at build time as docs.jupiter.au does;
without the files they fall back to free fonts.

## Other targets (no npm mechanism)
Rust, Go, Slint, GTK, Qt, KDE, LaTeX, ESPHome YAML, email, terminal and mobile consume generated files from the release. Fetch them into a
gitignored directory at build time (`gh release download --repo belikh/design --pattern <file> --dir <build-dir> --clobber`); never commit them.
The list of files per target is in `packages/ui/skill/SKILL.md` and `README.md`.

## GitHub (READMEs, profiles, social preview)
`jupiter-github.tgz` (also `@belikh/jupiter-github`) carries light and dark SVGs generated from the tokens: banner, divider, stat tile, status badges and the
1280x640 social preview, plus README, profile (`<user>/<user>`) and org profile (`.github/profile/README.md`) templates. Make a project's own with
`node make.mjs --title "My project" --subtitle "What it does" --out .github/assets` (add `--logo` for the Jupiter logo, `--badge "build|passing|ok"`,
`--tile "Uptime|99.98%|ok"`, `--png` for the social preview, `--palette` for a hex-chip colour table), then reference them with `<picture>` as the templates do.
The social preview has no upload API: set it by hand under Settings > Social preview. Regenerate after a token change; nothing is hand-drawn.

## Agents
`packages/ui/skill/SKILL.md` is the skill development agents use before building anything. New projects get it linked from
`node_modules/@belikh/jupiter-ui/skill`, so it updates with the dependency. In this repo it is linked at `.claude/skills/jupiter-design-system`.
