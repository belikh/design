# @belikh/jupiter-graphics

Line graphics for every Jupiter surface. Each one is a **single unbroken stroke**: one `<path>`, one moveto, no fill,
round caps and joins, coloured by `currentColor`. They take the text colour of whatever they sit in, so the same file
works in light, dark, kiosk and print.

| Tier | Canvas | Stroke | For |
| --- | --- | --- | --- |
| `spot` | 240 × 240 | 2 | Illustrations: empty/error/success states, cards, avatars, people, animals, retro hardware |
| `scene` | 480 × 240 | 2 | Heroes, banners, kiosk idle screens |
| `rule` | 480 × 48 | 2 | Dividers, underlines, flourishes |
| `icon` | 48 × 48 | 1.75 | Interface glyphs, 20 to 64px |

## Use

```html
<!-- a file -->
<img src="https://<pages-host>/current/svg/spot/kangaroo.svg" alt="">

<!-- the sprite: inherits colour, can be animated -->
<link rel="stylesheet" href="jupiter-graphics.css">
<svg class="jp-line jp-line--icon"><use href="jupiter-graphics.svg#jp-icon-search"/></svg>
<svg class="jp-line jp-line--spot jp-line--draw"><use href="jupiter-graphics.svg#jp-spot-mac-se30"/></svg>
```

```ts
import { svg, GRAPHICS } from "@belikh/jupiter-graphics";
import "@belikh/jupiter-graphics/css";
el.innerHTML = svg("scene-walker", { title: "Someone walking" });
```

An `<img>` cannot inherit colour: it renders black. Use the sprite, inline markup or a CSS mask when the graphic must
follow the theme.

Classes: `jp-line--icon|spot|scene|rule` size the graphic, `jp-line--hairline` keeps the stroke a constant pixel width
at any size, `jp-line--draw` draws the line on (`--jp-line-duration`, `--jp-line-delay`), `jp-line--loop` repeats it.
The animation is off under `prefers-reduced-motion`.

## Adding a graphic

Graphics are not drawn in an editor. Each is a list of waypoints in `src/drawings/*.ts`, and `src/spline.ts` runs one
smooth curve through them, so "one continuous line" holds by construction.

```ts
["heart", "like love", "8,44 24,38 37,27 41,17 36,9 29,10 24,18! 19,10 12,9 7,17 11,27 24,38 40,44"],
```

- `x,y` the line flows through the point; `x,y!` it turns a sharp corner there.
- `o(cx,cy,r,start,sweep)` an arc or loop; `o(cx,cy,rx,ry,start,sweep)` an ellipse. Degrees, 0 = east, clockwise.
- `s(cx,cy,r0,r1,start,sweep)` a spiral.

Hardware and diagrams (`machines.ts`, `work.ts`) are described as a network of edges and walked by `trace()`, which
goes out along each edge and back along the same curve. Still one stroke, and the proportions can be exact; draw these
from a photograph of the real object, not from memory.

`npm run build` writes `dist/` and then checks every file: one path, one subpath, no fill, `currentColor` only, the
tier's viewBox and stroke width, round caps. `node scripts/sheet.ts <dir>` renders contact sheets (needs
`rsvg-convert` and ImageMagick) so you can look at what you drew.

The pen may cross itself, loop, or run back along a line it has already drawn; it never lifts.
