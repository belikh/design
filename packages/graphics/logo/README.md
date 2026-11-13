# Jupiter logo

`jupiter-logo-{light,dark}.svg` is the logo: the banded-planet mark, the wordmark and three flowing lines. The wordmark is **outlined from the real SGI Alt 700 font** (`apps/admin/public/fonts/sgi-alt-700.woff2`), not hand-drawn. Colours are the token `text` and `accent` for each theme.

Regenerate with `python3 packages/graphics/scripts/logo.py` (needs `pip install fonttools brotli`). Reference these files instead of copying them: use a `<picture>` with `prefers-color-scheme` on the web and GitHub, and the same files in the GitHub target banner.

The SGI fonts are Bitstream typefaces; confirm redistribution rights (see `apps/admin/public/fonts/README.txt`). The outlines embed glyph shapes.
