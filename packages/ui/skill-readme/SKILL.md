---
name: github-readme
description: How to write and lay out README.md files, GitHub profile READMEs and organisation profiles for jupiter.au projects. Use whenever you create or edit a README.md, a profile README, a repo description, release notes or any other Markdown that GitHub renders, even for a small repo or a quick edit. Covers the page layout, the logo header, the section order and the writing rules.
---

# GitHub READMEs

Every jupiter.au repo has a README that looks the same and reads the same. Follow this when you create or edit one.

## Layout

Start with the logo, right-aligned, and nothing else above the title. No banner, no badges row above the logo, no per-repo header image.

```html
<p align="right">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/belikh/design/main/packages/graphics/logo/jupiter-logo-dark.svg">
    <img alt="jupiter.au" src="https://raw.githubusercontent.com/belikh/design/main/packages/graphics/logo/jupiter-logo-light.svg" width="260">
  </picture>
</p>
```

Link the logo files; do not copy them into the repo. Keep the width at 260.

Then, in this order:

1. `# Project name`, then one or two plain sentences saying what it is.
2. A row of links to the main sections (`<p>` with `·` between links). Leave it out for a short README.
3. `---` with a `<br>` above and below it.
4. Sections as `##` headings, each separated by a `<br>`. Give the page room; GitHub collapses blank lines, so use `<br>`.
5. A table for lists of parts, options or commands that have more than one attribute. Always give the table a header row with real column names.
6. Long reference material inside `<details><summary><b>Title</b></summary>`.
7. A last `<p align="right"><sub>jupiter.au</sub></p>`.

Rules for the page:

- Only the HTML GitHub allows: `p`, `picture`, `img`, `details`, `summary`, `table`, `br`, `sub`, `kbd`, and the `align` attribute. No `style`, `class`, `script` or `iframe`.
- Images are SVG or PNG with a light and a dark file, chosen with `<picture>`. Give every image an `alt`.
- Callouts use GitHub alerts: `> [!NOTE]`, `> [!WARNING]`. Use them for things the reader must not miss, not for decoration.
- Diagrams use Mermaid code blocks. Colours written as `#4b3fbf` in backticks show a swatch.
- Code blocks always name the language (`sh`, `ts`, `json`).
- Badges: only for status that changes (build, version). Make them with `@belikh/jupiter-github` (`node src/make.mjs --badge "build|passing|ok"`) so they use the token colours. At most one row, below the intro, never above the logo.
- Profile README (`<user>/<user>`) and organisation README (`.github/profile/README.md`): same logo header, then a short intro, then tiles or a pinned-projects table. The org page needs absolute `raw.githubusercontent.com` URLs.
- The social preview is 1280x640 and set by hand under Settings > Social preview. Generate it with `@belikh/jupiter-github`.

## Writing

Write like a person explaining their project to a colleague.

- Say what the thing does, then how to use it. Put the install and run commands near the top.
- Use plain words and short sentences. Prefer concrete nouns and numbers to adjectives.
- Do not describe the README, the layout or the project's philosophy. No "this document", "this repo aims to", "welcome to".
- No slogans, taglines or marketing lines. No "X, not Y" and "not just X, but Y" constructions. No lists of three adjectives.
- No filler openers or closers ("In summary", "Note that", "It's worth mentioning"), no emoji, no exclamation marks.
- Don't write comments about your own work ("a calmer layout", "now more robust"). Say what changed and why it matters to the reader, in a commit message, not in the README.
- Headings are nouns or short verb phrases: "Install", "Configuration", "Change a token". Not questions or jokes.
- One idea per sentence. If a sentence needs a second "and", split it.
- Keep the README current. When a command or path changes, change the README in the same commit. Delete sections that stopped being true.

Check before finishing: read it once as someone who has never seen the repo. Can they install and run the project from the first screen?

## Sections for a project README

Use only the ones that apply, in this order: what it is, install, use, configuration, develop (commands to build, test, lint), release, licence. A small repo may have just the first three.

## Commit messages and release notes

Same voice. First line says what changed. The body says why it was needed. Commits are authored by `belikh <io@belic.net>` only, with no co-author or tool attribution lines.

## Where things live

- Logo files: `packages/graphics/logo/jupiter-logo-{light,dark}.svg` in `belikh/design`.
- Asset generator and templates: `packages/github` in `belikh/design` (`templates/README.md`, `profile-README.md`, `org-profile-README.md`).
- The design system skill, for everything that is not a README: `jupiter-design-system`.
