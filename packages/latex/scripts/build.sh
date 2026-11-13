#!/usr/bin/env bash
# Build one or more .tex files with XeLaTeX into build/.
#   scripts/build.sh templates/*.tex personal/*.tex
# Set JUPITER_LATEX_OUT to write PDFs somewhere other than ./build.
# Finds the classes in src/, the generated jupiter-tokens.sty in ../tokens/dist, and the
# graphics in graphics/, the fonts in fonts/ (optional: without them the documents fall back to free fonts).
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tokens="$here/../tokens/dist"
[ -f "$tokens/jupiter-tokens.sty" ] || [ ! -f "$here/tex/jupiter-tokens.sty" ] || tokens="$here/tex"   # inside the release bundle the colours sit next to the classes
[ -f "$tokens/jupiter-tokens.sty" ] || { echo "missing $tokens/jupiter-tokens.sty (run: npm run build -w @belikh/jupiter-tokens)" >&2; exit 1; }
out="${JUPITER_LATEX_OUT:-$here/build}"; mkdir -p "$out"
# graphics/ holds the committed line-graphic PDFs (jupiter.sty places them with \jpart); tex/ is the layout of the release bundle
export TEXINPUTS=".:$here/src:$here/tex:$tokens:$here/graphics:"
fonts=""; [ -f "$here/fonts/sgi-text-400.otf" ] && fonts="$here/fonts/"
status=0
for f in "$@"; do
  name="$(basename "$f" .tex)"; dir="$(cd "$(dirname "$f")" && pwd)"
  grep -q "\\documentclass" "$f" || { echo "== $name (skipped: an include file, not a document)"; continue; }
  echo "== $name (fonts: ${fonts:-fallback})"
  ( cd "$dir" && for pass in 1 2; do
      xelatex -interaction=nonstopmode -halt-on-error -output-directory "$out" \
        "\\def\\jpfontdir{$fonts}\\input{$name.tex}" >"$out/$name.log.txt" 2>&1 || { echo "FAILED: $name (see build/$name.log.txt)"; tail -25 "$out/$name.log.txt"; exit 1; }
    done ) || status=1
done
exit $status
