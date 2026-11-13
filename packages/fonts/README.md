# @belikh/jupiter-fonts

The design system's typefaces as a dependency. `import "@belikh/jupiter-fonts/fonts.css"` registers SGI Text, SGI Alt and JetBrains Mono; the
rest of the system already names them in its font stacks, so a project that installs this renders like the design site.

The SGI files are proprietary Bitstream typefaces used with the owner's consent. They are committed in `apps/admin/public/fonts`. `files/` and
`fonts.css` here are gitignored staging output: `node scripts/stage-fonts.mjs` fills them, and `scripts/release-assets.sh` packs the package as
`jupiter-fonts.tgz`, an asset of every release. `node scripts/publish-packages.mjs --only fonts --include-fonts` still publishes it to the registry.
