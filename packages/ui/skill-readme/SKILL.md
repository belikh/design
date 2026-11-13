---
name: github-readme
description: How to write and lay out README files, GitHub profile READMEs and organisation profiles for jupiter.au projects. Use whenever you create or edit a README (README.rst), a profile README, a repo description, release notes or any other reStructuredText or Markdown that GitHub renders, even for a small repo or a quick edit. Covers the file format, the page layout, the logo header, the section order and the writing rules.
---

# GitHub READMEs

Every jupiter.au repo has a README that looks the same and reads the same. Follow this when you create or edit one.

## Format

Write `README.rst` (reStructuredText), not `README.md`. If a repo has both, GitHub shows the Markdown one, so delete the `.md`. When you edit a repo that still has `README.md`, convert it to `README.rst` in the same commit (`git mv` first so the history follows).

GitHub renders `.rst` with docutils plus an HTML sanitiser. Checked on a live page:

| Works | Does not |
| :-- | :-- |
| headings, paragraphs, lists, `code-block`, `list-table`, `contents` | `[!NOTE]` alerts and Mermaid blocks |
| `image` with `:align:`, `:width:` and `:target:` (badges are consecutive images) | styled admonitions: `note::` and `warning::` render as plain labelled text, so use the boxed callout below |
| `.. raw:: html` with `picture`, `details`, `table`, `br`, `p align`, `sub` | `style`, `class`, `script`, `iframe` inside raw HTML |
| `#gh-dark-mode-only` and `#gh-light-mode-only` on image URLs | |

Use raw HTML for the logo header, the title, the light/dark switch, collapsible sections and callouts. Vertical space comes from a line containing only `|` (an empty line block), which survives where blank lines do not. Add `.. meta::` with a `:description:` under the header.

This layout follows how the `sphinx-readme` project formats its README (raw `<h1>` and aligned block, boxed callouts, `|` spacing).

## Layout

Start the file with the logo, right-aligned, and nothing else before the title. No banner, no badge row above the logo, no per-repo header image.

```rst
.. raw:: html

   <p align="right">
     <picture>
       <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/belikh/design/main/packages/graphics/logo/jupiter-logo-dark.svg">
       <img alt="jupiter.au" src="https://raw.githubusercontent.com/belikh/design/main/packages/graphics/logo/jupiter-logo-light.svg" width="260">
     </picture>
   </p>

   <h1>Project name</h1>
```

The title is a raw `<h1>` on purpose. If it were an `.rst` heading, GitHub would hoist it above the logo.

Link the logo files; do not copy them into the repo. Keep the width at 260. Inside `belikh/design` itself the paths are relative.

Then, in this order:

1. The title (the raw `<h1>` in the header block), then one or two plain sentences saying what it is.
2. A row of links to the main sections, separated by `·`. Leave it out for a short README.
3. A `|` line, then a `----` transition.
4. Sections as `----` underlined headings (`Install` then `-------`). Give the page room with a `|` line between the big blocks.
5. A `list-table` with `:header-rows: 1` and real column names for lists of parts, options or commands that have more than one attribute.
6. Long reference material inside raw `<details><summary><b>Title</b></summary>` … `</details>`, opened and closed in two raw blocks around the content.
7. A last raw `<p align="right"><sub>jupiter.au</sub></p>`.

Rules for the page:

- Images are SVG or PNG with a light and a dark file, chosen with `<picture>` in raw HTML. Every meaningful image has an `alt`.
- Callouts use a one-column raw table, with the title in the `<th>` (`Note`, `Warning`) and the text in the `<td>`; the templates have the exact block. Keep them rare, and no emoji (see Icons and graphics).
- Code blocks always name the language: `.. code-block:: sh`.
- Inline code uses double backticks. Links are `` `text <url>`_ ``.
- Badges only for status that changes (build, version). Make them with `@belikh/jupiter-github` (`node src/make.mjs --badge "build|passing|ok"`) so they use the token colours. One row, below the intro.
- Profile README (`<user>/<user>`) and organisation README (`.github/profile/README.rst`): same logo header, a short intro, then tiles or a table of projects. The org page needs absolute `raw.githubusercontent.com` URLs.
- The social preview is 1280x640 and set by hand under Settings > Social preview. Generate it with `@belikh/jupiter-github`.

## Icons and graphics

Use graphics from the design system and nothing else: no emoji, no icon fonts, no third-party icon sets, no clip art. Everything comes from `@belikh/jupiter-graphics`, baked for READMEs into `packages/github/graphics/<tier>/<name>-{light,dark}.svg` (tiers: `icon` 20 to 32px, `spot` 120px and up, `scene` wide hero art, `rule` dividers). `<img>` cannot take the text colour, so always use the baked light/dark pair, never the files in `packages/graphics/dist`. Find names in `packages/graphics/dist/manifest.json` or the Graphics page of the app. If the set has no graphic you need, add one to `packages/graphics` first.

Where they go:

- **Dividers:** a `rule` between major blocks instead of `----`. `end` (a diamond on a line) is the default; use `loops`, `wave` or `underline` for a change of mood. Centre it at 50% width.
- **Icons:** 20px, beside a label in a table cell or list, never inside running text and never decorating every heading. One icon per row of a parts table is fine.
- **Spot illustrations and scenes:** for an empty state, an intro on a profile or an org page, 160 to 240px wide, at most one per page.

Light and dark in raw HTML:

```rst
.. raw:: html

   <p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/belikh/design/main/packages/github/graphics/rule/end-dark.svg"><img alt="" src="https://raw.githubusercontent.com/belikh/design/main/packages/github/graphics/rule/end-light.svg" width="50%"></picture></p>
```

Light and dark inline (table cells, lists), as a substitution pair placed next to each other; only one of the two shows:

```rst
.. |bolt-l| image:: https://raw.githubusercontent.com/belikh/design/main/packages/github/graphics/icon/bolt-light.svg#gh-light-mode-only
   :width: 20
.. |bolt-d| image:: https://raw.githubusercontent.com/belikh/design/main/packages/github/graphics/icon/bolt-dark.svg#gh-dark-mode-only
   :width: 20

|bolt-l| |bolt-d| **ESPHome**
```

Inside `belikh/design` the paths are relative (under `packages/github/graphics`). Decorative images get an empty `alt`; meaningful ones get a real one.

## Writing

Write like a person explaining their project to a colleague.

- Say what the thing does, then how to use it. Put the install and run commands near the top.
- Use plain words and short sentences. Prefer concrete nouns and numbers to adjectives.
- Do not describe the README, the layout or the project's philosophy. No "this document", "this repo aims to", "welcome to".
- No slogans or taglines. No "X, not Y" and "not just X, but Y". No lists of three adjectives.
- No filler openers or closers ("In summary", "Note that", "It's worth mentioning"), no emoji, no exclamation marks.
- Do not comment on your own work ("a calmer layout", "now more robust"). Say what changed in the commit message, not the README.
- Headings are nouns or short verb phrases: "Install", "Configuration", "Change a token".
- One idea per sentence. If a sentence needs a second "and", split it.
- Keep the README current. When a command or path changes, change the README in the same commit. Delete sections that stopped being true.

Check before finishing: read it as someone who has never seen the repo. Can they install and run the project from the first screen?

## Sections for a project README

Use only the ones that apply, in this order: what it is, install, use, configuration, develop (build, test, lint), release, licence. A small repo may have just the first three.

## Commit messages and release notes

Same voice. The first line says what changed. The body says why it was needed. Commits are authored by `belikh <io@belic.net>` only, with no co-author or tool attribution lines.

## Where things live

- Logo files: `packages/graphics/logo/jupiter-logo-{light,dark}.svg` in `belikh/design`.
- Asset generator and templates: `packages/github` in `belikh/design` (`templates/README.rst`, `profile-README.rst`, `org-profile-README.rst`).
- The design system skill, for everything that is not a README: `jupiter-design-system`.
