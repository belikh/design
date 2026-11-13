# Jupiter LaTeX templates

Document classes driven by the same tokens as the web, email and terminal outputs. Colours come from
`jupiter-tokens.sty` (generated from `packages/tokens/jupiter.tokens.json`); change a token, rebuild, and every
document follows. Engine: **XeLaTeX** (LuaLaTeX also works).

| Class | Use | Options |
| --- | --- | --- |
| `jupiter-resume` | Resume / CV | `dense` (one-page, mono labels), `sidebar` (tinted sidebar), `classic` (serif, monochrome, ATS-friendly) |
| `jupiter-letter` | Formal letter, cover letter | `cover` (sans, accent rule, matches `dense`); default is formal serif |
| `jupiter-notes` | Working notes with margin remarks and checklists | |
| `jupiter-report` | Reports and long documents (title page, contents, callouts, code) | |
| `jupiter-invoice` | Invoices with computed subtotal, tax and total | |

`jupiter.sty` is the shared base: font fallbacks, `jpcallout` / `jpnote`, `jpcode`, `\jpbadge`, `\jplabel`.

The resume macros are identical across the three styles, so one content file renders in any of them
(see `templates/resume-sample-content.tex`).

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

SGI Text, SGI Alt and JetBrains Mono are loaded from `fonts/` (gitignored: the SGI files are proprietary Bitstream
typefaces; confirm redistribution rights before publishing them). If `fonts/` is absent, the classes fall back to the
installed `SGI Text` / `JetBrains Mono` family, then to Fira Sans / DejaVu Sans Mono, so a clean checkout still builds.
The `.otf` files were converted from the WOFF2 set in `apps/admin/public/fonts/`, because XeLaTeX and LuaLaTeX can't
load the original Type 1 `.pfb` files through fontspec.

## Private documents

Keep filled-in documents (your resume, invoices, letters) in a private repo; this repo holds placeholders only.
