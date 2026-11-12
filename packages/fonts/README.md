# @belikh/jupiter-fonts (private)

The design system's typefaces as a dependency. `import "@belikh/jupiter-fonts/fonts.css"` registers SGI Text, SGI Alt and JetBrains Mono; the
rest of the system already names them in its font stacks, so a project that installs this renders like the design site.

The SGI files are proprietary Bitstream typefaces: **never commit them and never publish them to a public registry.** `files/` is
gitignored; stage it from `apps/admin/public/fonts` with `node scripts/stage-fonts.mjs`, then publish privately with
`node scripts/publish-packages.mjs --only fonts --include-fonts` (from a machine that has the files; CI does not).
