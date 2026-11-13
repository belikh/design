---
title: Writing documentation
summary: How to write the one source folder that becomes the docs site, the Markdown files in the repository and a PDF.
section: contribute
order: 10
icon: edit
audience: developers
status: stable
---

Documentation is written once, in `docs-src/`, as Markdown with a small header on each file. The `jupiter-docs` command (package `@belikh/jupiter-docs`) turns that folder into three outputs. Never edit an output by hand: the next build overwrites it.

| Output | Where | Command |
| --- | --- | --- |
| Static site for docs.jupiter.au | `dist/site` | `jupiter-docs build --site` |
| Plain GitHub Markdown | `docs/*.md` | `jupiter-docs build --md` |
| PDF | `dist/<id>.pdf` | `jupiter-docs build --pdf` |

## Folder layout

```text title="docs-src and docs.config.json"
docs.config.json        project name, version, repository, sections, glossary
docs-src/
  index.md              landing page text
  consuming.md          one page per file; the file name is the page id
  guides/setup.md       nested ids use a slash: guides/setup
```

`docs.config.json` lists the sections in navigation order. Each page names its section in its header. Pages in a section are sorted by `order`, then by title.

```json title="docs.config.json"
{
  "project": "My project",
  "versionFrom": "package.json",
  "repo": "https://github.com/me/my-project",
  "siteUrl": "https://docs.example.org",
  "sections": [{ "id": "use", "title": "Use", "summary": "Install and run it.", "icon": "terminal" }],
  "glossary": { "Token": "A named design constant." }
}
```

## Page header

Every page starts with a YAML block. `title` and `summary` are required, and so is `section` on every page except `index.md`.

```yaml title="docs-src/guides/setup.md"
---
title: Set up the project
summary: Install the tools and run the first build.
section: use
order: 20
icon: terminal
audience: developers
status: stable
---
```

`icon` is a name from the icon tier of the graphics set. `audience` is one of users, developers, agents or maintainers. `status` is draft, stable or deprecated. The page title is the top heading, so the body starts at `##` and never skips a level.

## Directives

Block directives start with colons. Use four colons for the outer block when you nest one inside another.

````markdown title="Callouts"
:::note
Plain information.
:::

:::warning Check the version
A title is optional. The kinds are note, tip, warning and danger.
:::
````

:::tip
Callouts become GitHub alerts in the repository Markdown, boxed text on the site and `jpcallout` boxes in the PDF.
:::

One-line directives start with two colons.

````markdown title="Graphics and the glossary"
::graphic rule/end
::graphic spot/summit A mountain with a flag on the summit
::glossary
````

`::graphic tier/name` places a graphic from `@belikh/jupiter-graphics`. Text after the name is the alt text; leave it out for a decorative graphic. The site draws it inline in the theme colour, the repository Markdown uses a light and dark `<picture>`, and the PDF uses a coloured copy. `::glossary` lists every term from the glossary in `docs.config.json`.

## Links

Link to another page with its id, and to a heading with its anchor. Plain relative links to `.md` files also work.

````markdown title="Cross-references"
See [[consuming]] or [[consuming#fonts|the fonts section]].
A [[term:Token]] is defined once in the glossary.

:::see-also
- [[recipes]]
:::
````

See [[consuming#fonts|the fonts section]] for the licensed typefaces. A [[term:Token]] is a named design constant.

Links to files outside the source folder, such as `../AGENTS.md`, are checked against the repository and become repository links on the site. Raw HTML is not allowed.

## Code

Give every code block a language, and a title when the block is a file or a command with context. Use `text` for plain output.

````markdown title="Code with a title"
```sh title="Install"
npm install
```
````

## Check and build

```sh title="Commands"
jupiter-docs check              # validate the source
jupiter-docs build              # write docs/*.md and dist/site
jupiter-docs build --pdf        # also build the PDF (needs xelatex)
jupiter-docs build --check      # fail when docs/*.md is out of date (CI)
jupiter-docs init               # scaffold docs-src in a new project
```

`check` reports a missing title or summary, an unknown section, graphic, icon or glossary term, a broken page link or anchor, a heading that skips a level, an unclosed directive and a code block without a language. Each message names the file and line.

:::warning
`build --md` only writes files that carry the generated header. Hand-written files in `docs/` are never touched or deleted.
:::

## Writing rules

Write like a person explaining the project to a colleague. Use plain words and short sentences. Say what a thing does, then how to use it. No slogans, no "X, not Y", no filler openers, no emoji. Headings are nouns or short verb phrases. The visual rules (type, colour, space, graphics) are in `packages/ui/skill/DESIGN.md`; the site and the PDF already follow them, so write content and leave the look to the generator.

## Add a graphic

Graphics come only from `@belikh/jupiter-graphics`. If the set lacks one, add it to `packages/graphics` first, run `npm run build:graphics`, then use its `tier/name`. `jupiter-docs check` fails on a name that is not in the set.

::graphic rule/loops

:::see-also
- [[consuming]]
- [[recipes]]
- [[glossary]]
:::
