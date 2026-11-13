#!/usr/bin/env bash
# Build both native demos and render every page in light and dark (and compact) to PNGs, failing on a missing or
# near-empty image. Needs a display (X11 or Wayland) and, for GTK, the gtk4 development files. Not run in CI.
#   examples/sync-assets.sh && examples/check-native.sh [outdir]
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; out="${1:-$here/../target/native-shots}"; mkdir -p "$out"
pages="overview metrics alerts tables invoice documents network settings"
for demo in slint gtk; do
  ( cd "$here/$demo" && cargo build -q )
  for page in $pages; do
    for mode in light dark; do
      flags=(); [ "$mode" = dark ] && flags+=(--dark); [ "$page" = tables ] && flags+=(--compact)
      f="$out/$demo-$page-$mode.png"
      ( cd "$here/$demo" && cargo run -q -- --page "$page" "${flags[@]}" --screenshot "$f" >/dev/null 2>&1 )
      [ "$(stat -c %s "$f")" -gt 15000 ] || { echo "blank or missing: $f" >&2; exit 1; }
    done
  done
done
echo "ok: $out"
