#!/usr/bin/env bash
# Collect everything a release publishes into ./release.
# File names are UNVERSIONED so https://<host>/.../latest/download/<file> and /current/<file> are stable URLs.
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tok="$root/packages/tokens"; tex="$root/packages/latex"
out="$root/release"; rm -rf "$out"; mkdir -p "$out"
version="$(node -p "require('$tok/package.json').version")"

# 1. generated outputs (web css, email, terminal, kiosk, mobile, latex colours, tokens json, api names)
for f in jupiter.css jupiter-tokens.css jupiter-components.css jupiter-fonts.css jupiter-tailwind.css jupiter-kiosk.css \
         jupiter-email.html jupiter-terminal.sh jupiter.Xresources jupiter.mobile.json jupiter-tokens.sty jupiter_theme.go jupiter_theme.rs jupiter.slint jupiter-esphome.yaml jupiter-github.json jupiter-gtk-light.css jupiter-gtk-dark.css jupiter-gtk-widgets.css \
         Jupiter.qml JupiterLight.colors JupiterDark.colors names.json; do
  cp "$tok/dist/$f" "$out/$f"
done
cp "$tok/jupiter.tokens.json" "$out/jupiter.tokens.json"

# 2. npm package tarball (versioned name is fine: npm needs it)
( cd "$tok" && npm pack --pack-destination "$out" >/dev/null 2>&1 )

# 2-ui. the React components and ESPHome widgets as npm tarballs too, plus UNVERSIONED aliases of all package tarballs so a project can
#        depend on https://github.com/<owner>/<repo>/releases/latest/download/jupiter-ui.tgz and always get the current one.
( cd "$root/packages/ui" && npm pack --pack-destination "$out" >/dev/null 2>&1 )
( cd "$root/packages/esphome" && npm pack --pack-destination "$out" >/dev/null 2>&1 )
( cd "$root/packages/github" && npm pack --pack-destination "$out" >/dev/null 2>&1 )
( cd "$root/packages/docs" && npm pack --pack-destination "$out" >/dev/null 2>&1 )  # jupiter-docs.tgz: the documentation generator  # jupiter-github.tgz: SVG kit (banner, tile, badge, social preview), CLI, templates

# 2a. line graphics: sprite, stylesheet, manifest, every SVG as one archive, and the npm tarball
gfx="$root/packages/graphics"
cp "$gfx/dist/jupiter-graphics.svg" "$gfx/dist/jupiter-graphics.css" "$out/"
cp "$gfx/dist/manifest.json" "$out/jupiter-graphics.json"
tar czf "$out/jupiter-graphics-svg.tgz" -C "$gfx/dist" svg
( cd "$gfx" && npm pack --pack-destination "$out" >/dev/null 2>&1 )

# unversioned aliases of every package tarball (after all of them are packed)
for n in tokens graphics ui esphome github docs; do cp "$out/belikh-jupiter-$n-$version.tgz" "$out/jupiter-$n.tgz"; done

# 2b. Qt module (drop the Jupiter/ folder on the QML import path) and the Rust crate
qt="$(mktemp -d)"; mkdir -p "$qt/Jupiter"; cp "$tok/dist/Jupiter.qml" "$tok/dist/qmldir" "$qt/Jupiter/"
( cd "$qt" && tar czf "$out/jupiter-qt.tgz" Jupiter ); rm -rf "$qt"
tar --exclude=target --exclude=Cargo.lock -czf "$out/jupiter-theme-rust.tgz" -C "$root/packages" rust

# 3. LaTeX bundle: classes + base (jupiter.sty includes the graphics placement) + generated colours + templates + the font files
#    + the line-graphic PDFs with their manifest and the script that regenerates them (needs the repo and rsvg-convert) + build.sh
stage="$(mktemp -d)"; d="$stage/jupiter-latex"; mkdir -p "$d/tex"
cp "$tex"/src/*.cls "$tex"/src/*.sty "$tok/dist/jupiter-tokens.sty" "$d/tex/"
cp -r "$tex/templates" "$d/templates"; cp -r "$tex/fonts" "$d/fonts"; cp "$tex/README.md" "$d/README.md"
cp -r "$tex/graphics" "$d/graphics"; mkdir -p "$d/scripts"; cp "$tex/scripts/graphics.mjs" "$tex/scripts/build.sh" "$d/scripts/"
( cd "$stage" && tar czf "$out/jupiter-latex.tgz" jupiter-latex )
rm -rf "$stage"

# 3b. README graphics: the logo and every baked light/dark graphic as flat, unversioned files, so READMEs can link
#     https://github.com/<owner>/<repo>/releases/latest/download/<file>  (logo-light.svg, icon-bolt-dark.svg, rule-end-light.svg, ...)
cp "$gfx/logo/jupiter-logo-light.svg" "$out/logo-light.svg"; cp "$gfx/logo/jupiter-logo-dark.svg" "$out/logo-dark.svg"
for f in "$root"/packages/github/graphics/*/*.svg; do tier="$(basename "$(dirname "$f")")"; cp "$f" "$out/$tier-$(basename "$f")"; done

# 3c. LaTeX demo documents rendered by the release workflow: latex-<template>.pdf and latex-<template>.png (first page). Skipped when not rendered locally.
for f in "$tex"/build/*.pdf; do [ -e "$f" ] || continue; n="$(basename "$f" .pdf)"
  cp "$f" "$out/latex-$n.pdf"; [ -f "$tex/build/$n.png" ] && cp "$tex/build/$n.png" "$out/latex-$n.png"; done

# 3d. docs site (this repo's docs-src, deployable as-is to Cloudflare Pages) and, when rendered by the latex job, the PDF and its first page
node "$root/packages/docs/bin/jupiter-docs.mjs" build --site --config "$root/docs.config.json"
tar czf "$out/jupiter-docs-site.tgz" -C "$root/dist/site" .
[ -f "$root/dist/jupiter-docs.pdf" ] && cp "$root/dist/jupiter-docs.pdf" "$out/jupiter-docs.pdf"
[ -f "$root/dist/jupiter-docs.png" ] && cp "$root/dist/jupiter-docs.png" "$out/jupiter-docs.png"

# 4. checksums
( cd "$out" && sha256sum * > SHA256SUMS )
echo "release $version:"; ls -1 "$out"
