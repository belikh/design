# Jupiter LaTeX templates

Document classes driven by the same tokens as the web, email and terminal outputs. Colours come from
`jupiter-tokens.sty` (generated from `packages/tokens/jupiter.tokens.json`); change a token, rebuild, and every
document follows. Engine: **XeLaTeX** (LuaLaTeX also works).

## The design

Every document has the same typographic look, so a report, an invoice and a letter read as one family:

- **A gutter and a column.** A 44 mm gutter on the left holds mono labels, section numbers, dates and margin remarks; the text sits in a 130 mm column beside it. Letters, notes, the report and the invoice use this grid; the dense and classic resumes use a narrower gutter for dates and section labels.
- **Type.** SGI Alt for display (titles 40 to 56 pt on covers, a 50 pt invoice total), SGI Text for everything you read (9.3 to 10 pt), JetBrains Mono for labels and figures. SGI Text is the document's main font, so tables, floats and captions never fall back to Latin Modern. No document may embed another font (CI checks `pdffonts` on every PDF).
- **Cover and spot.** The report cover has three flowing lines (accent, ink, muted), each a different hand-drawn path, with the red spot set in the curl of the accent line. The logo sits small, top-right.
- **Second voice.** The hand-drawn `underline` rule sits under a name or title (letters, notes, resumes), the `swash` runs under the invoice title, and the red spot follows the sender's name on a cover letter and a dense resume. Use them sparingly.
- **Tables.** No vertical rules; figures are mono and right-aligned (the `r` column type does it in the report class); the invoice item table repeats its header on every page.

| Class | Use | Options |
| --- | --- | --- |
| `jupiter-resume` | Resume / CV | `dense` (one page, gutter of dates and labels), `sidebar` (tinted sidebar), `classic` (monochrome, ATS-friendly, multi-page) |
| `jupiter-letter` | Formal letter, cover letter | `cover` (accent underline and the red spot); default is formal (ink underline) |
| `jupiter-notes` | Working notes with remarks in the gutter and checklists | |
| `jupiter-report` | Reports and long documents (cover, contents, callouts, code, wide and long tables) | `\reportkind{Proposal}` sets the cover label |
| `jupiter-invoice` | Invoices, quotes and purchase orders with computed subtotal, tax and total (`\invoicekind`, `\invoicetolabel`, `\invoiceextra`, `\invoicesign`); long documents run onto further pages | |
| `jupiter-form` | Minutes, status reports, checklists, review forms, briefs, job descriptions, one-pagers, press releases, fax covers, expense reports, budgets | `\formkind`, `\jpentry`, `\expenseitem`, `\budgetline` |
| `jupiter-agreement` | NDA, MSA, contractor agreement, SOW: parties as rows, clause numbers in the gutter, signature blocks | `\clause`, `\term`, `\jpsign` |
| `jupiter-deck` | Short 16:9 decks, one idea per slide | `slide` environment |
| `jupiter-doc.sty`, `jupiter-money.sty` | Shared rows, checks, ratings, stats, signatures; money arithmetic and the item table | loaded by the classes above |

`jupiter.sty` is the shared base: SGI Text as main font, `\jpsans` / `\jpdisplay` / `\jpmono`, `jpcallout` / `jpnote`, `jpcode`, `\jpbadge`, `\jplabel`, the graphics placement (`\jpart`, `\jpat`, `\jprect`, `\jpdot`, `\jpcoverlines`, `\jpunderline`) and the grid helpers (`\jpgutter`, `\jpgutterw`, `\jptwodigits`). `\jpbody{size}{leading}` sets the body size. `\jpserif` is an alias of `\jpsans`; no serif font ships.

The resume macros are identical across the three styles, so one content file renders in any of them
(see `templates/resume-sample-content.tex`). The invoice also exposes `\jpsubtotal`, `\jptaxamount`, `\jptotaldue` and `\jptaxrate`.

Report tables: put a table wider than the 130 mm column in `\begin{jpwide} ... \end{jpwide}` (it extends over the gutter to 192 mm and cannot break across pages; use it for tables of up to about 40 rows), and use `longtable` for long ones (set `\LTleft` to `-\jpgutterw` in a group to let one overhang the gutter). `\jpfit{...}` scales a diagram down to the line width.

## Build

```sh
npm run build -w @belikh/jupiter-tokens          # generates dist/jupiter-tokens.sty
packages/latex/scripts/build.sh packages/latex/templates/*.tex   # PDFs land in packages/latex/build/
JUPITER_LATEX_OUT=/some/dir packages/latex/scripts/build.sh my.tex   # choose the output directory
```

Other repos use the classes by calling this script (see `job-search/resumes/build.sh`) or by putting `src/` and
`../tokens/dist/` on `TEXINPUTS`.

## Generated report and invoice

`templates/report-generated.tex` and `templates/invoice-generated.tex` are produced by `npm run export:sample` from the
same fixtures the web dashboards render (service health, alerts, network, billing; the invoice goes through the web's
own `invoiceTex()`). The report has a service-status table, hourly metric sparklines (TikZ), incidents and alert rules,
VLAN/device/firewall tables and an invoice list. `npm run check:sample` (CI) fails if they are stale. Do not edit them by
hand; compile them like any template with `scripts/build.sh`.

## Fonts

SGI Text, SGI Alt and JetBrains Mono are loaded from `fonts/`, which is committed. `scripts/build.sh` passes the folder to every document, so CI and local builds use the real fonts (CI fails if a PDF embeds anything else). The `.otf` files were converted from the WOFF2 set in `apps/admin/public/fonts/`, because XeLaTeX and LuaLaTeX can't load the original Type 1 `.pfb` files through fontspec. Without the folder (for example a bare `jupiter-latex.tgz` copy), the classes fall back to the installed `SGI Text` / `JetBrains Mono` family, then to Fira Sans / DejaVu Sans Mono.

## Graphics

Line graphics are PDFs placed by id: `\jpart[width=31mm]{logo-light}`, `\jpart{underline-accent}`, `\jpat{x}{y}{material}` (position from the top-left of the page). They are generated from the design-system SVGs, coloured from the token colours (never a literal), by `scripts/graphics.mjs`, which reads `graphics/manifest.json` and writes `graphics/<id>.pdf` with `rsvg-convert` (`librsvg2-bin`). The PDFs are committed and ship in `jupiter-latex.tgz` (with the manifest, the script and `build.sh`); put `graphics/` on `TEXINPUTS` next to the classes, as `build.sh` does.

To add a graphic:

1. Make sure the drawing exists in `packages/graphics` (the `rule`, `spot` or `scene` tier; a real product is drawn from reference photographs). Page-sized drawings that only documents use, such as the three cover lines, live in `graphics/art/` and are referenced as `art/<name>`.
2. Add an entry to `graphics/manifest.json`: `{ "id": "spot-letter-accent", "src": "spot/letter", "color": "jplightAccent", "stroke": 2 }`. `color` must be a token colour from `jupiter-tokens.sty`; the script refuses any other.
3. Run `node packages/latex/scripts/graphics.mjs` and commit the PDFs and `graphics/sources.lock`. CI regenerates the PDFs and fails when `sources.lock` (a hash of every final SVG) differs, which means a source changed without regenerating.

## Private documents

Keep filled-in documents (your resume, invoices, letters) in a private repo; this repo holds placeholders only.
