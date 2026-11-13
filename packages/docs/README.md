# @belikh/jupiter-docs

Generates a project's documentation from one Markdown source folder. The same `docs-src/` produces a static site, plain GitHub Markdown and a PDF, all in the Jupiter look.

```sh
npm install --save-dev @belikh/jupiter-docs
npx jupiter-docs init          # docs.config.json and docs-src/
npx jupiter-docs check         # validate the source
npx jupiter-docs build         # docs/*.md and dist/site
npx jupiter-docs build --pdf   # dist/<id>.pdf (needs xelatex and rsvg-convert)
npx jupiter-docs build --check # fail when docs/*.md is out of date
```

The format (page header, directives, links, config) is described in `docs-src/writing-documentation.md` of the design system repo and in the `jupiter-docs` agent skill. `src/spec.mjs` lists every directive and header key.

- Site: reads the tokens, components and graphics CSS from the `@belikh/jupiter-*` packages and the SGI fonts from `@belikh/jupiter-fonts` when installed. Output is relative-linked with hashed assets, a `_headers` file and a 404 page, so it deploys as it is to Cloudflare Pages. Set `base` in `docs.config.json` to serve it from a sub-path.
- PDF: needs `jupiter-docs.cls`. Point `latexDir` (or `JUPITER_LATEX_DIR`) at `packages/latex` or an unpacked `jupiter-latex.tgz`.
- Tests: `npm test -w @belikh/jupiter-docs`.
