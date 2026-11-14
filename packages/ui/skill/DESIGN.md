# Jupiter design rules

Read this before drawing, laying out or styling anything: a page, a screen, a document, a graphic, an email, a README. The values come from `packages/tokens/jupiter.tokens.json`; the rules say how to use them. If a value is not here, look it up in the tokens, do not invent one.

<!-- token-facts
type.scale=14,16,18,22,30,42
space=4,8,12,16,24,32,48,64
radius=sm:2,md:6
motion=fast:120,base:200,slow:320
layout.readingMeasure=72
layout.breakpoints=640,960,1280
control.height=32
kiosk.minTarget=48
-->

## Inherit, do not copy

Everything here reaches an app through a live reference: tokens as CSS variables, graphics and components by name from the packages. Never restate a token value in your own code (the numbers in this file are for checking, not for pasting). When a value has to be baked into an image or a document, generate it from the tokens so the next release regenerates it.

## The look

Flat, quiet and precise, with thin flowing line art as the one decorative idea. Large display type, a lot of space, one accent colour. It looks like a good technical manual: confident type, nothing ornamental that is not a drawing from the graphics set.

## Type

- **SGI Alt** for display: titles, covers, big figures, the logo. **SGI Text** for everything you read. **JetBrains Mono** for labels, code, identifiers and numbers in tables.
- Use the scale `14, 16, 18, 22, 30, 42` (px, `--jp-fs-*`). Body is 16 with line height 1.5; headings use 1.2. Print and covers may go larger (40 to 56pt) for display text only.
- Sentence case for headings and buttons. Capitals only for short mono labels.
- Left-align text, ragged right. Keep text to the reading measure of 72 characters.
- Figures in tables are mono and right-aligned so the digits line up.
- Do not fake bold or italic, do not letter-space body text, do not centre paragraphs.

## Colour

- Colours are tokens: `text`, `textMuted`, `surface`, `border`, `accent` and the status set `ok`, `warn`, `danger`, `info`. Never a literal.
- Both light and dark must work. Contrast is checked in the tokens build (WCAG AA); do not lower it with opacity.
- `accent` (purple) marks the one thing to act on or look at. Use it sparingly: a primary button, a link, the dot in the logo.
- Red and green mean status only, and status is never carried by colour alone: add a word or an icon. The one exception is the Great Red Spot in the logo, drawn in the `danger` colour.
- Chart series use `--adm-c1` to `--adm-c8`, which are checked for colour-vision safety. Never pick series colours by hand.

## Space and shape

- Spacing is the scale `4, 8, 12, 16, 24, 32, 48, 64`. Give sections 48 or more between them; crowding is the usual mistake.
- Layout is 12 columns with a 16px gutter and breakpoints at 640, 960 and 1280. Prefer an asymmetric grid: a narrow column for labels and numbers beside a wide column for content.
- Corners are nearly square: radius `sm` 2 or `md` 6, nothing larger, no pills. Borders are 1px in the `border` token. Shadows only from the elevation tokens, and rarely.
- Controls are 32px high (48px minimum target on kiosks). Density comes from the user's preference, not the page.
- Put the logo top-right in headers and letterheads, small. It marks the page as jupiter.au and takes no more room than that.

## Graphics

- Graphics come from `@belikh/jupiter-graphics` and nowhere else: no emoji, no icon fonts, no other icon sets, no stock images, no gradients, no drop shadows.
- Four tiers with a constant stroke weight inside each tier, so a page of graphics looks drawn by one hand. `icon`: 48 canvas, stroke 1.75, shown 20 to 64px. `spot`: 240, stroke 2, 120px and up. `scene`: 480 x 240, stroke 2, wide hero art. `rule`: 480 x 48, stroke 2, dividers stretched to the measure.
- Icons sit beside a label at 20px. They do not decorate headings or fill space.
- A rule separates major blocks. `end` is the default. One spot or scene per page at most, for an empty state, an intro or a cover.
- Colour a graphic with `currentColor` (inline, sprite or mask) so it follows the theme. In places that cannot inherit colour (an `<img>`, a README, a PDF), use the baked light/dark files.
- New graphics follow the existing style: one continuous thin flowing line, ground tails and loops, no fills. A real product must be drawn from reference photographs, not from memory. Add the graphic to `packages/graphics` first, then use it.

## Motion

- Durations are `fast` 120, `base` 200 and `slow` 320 ms with the token easing. Motion explains a change (something appeared, moved or saved); it is never decoration.
- Respect `prefers-reduced-motion`: no movement, no looping animation. The status spots on the GitHub kit stop under it.

## Documents and print

LaTeX, PDF and generated docs follow the same rules with room to be bolder. Embed the SGI fonts (check with `pdffonts`). Use a large SGI Alt title, a line-art rule or spot on the cover and generous margins. Tables have no vertical rules, and figures are mono and right-aligned. The first page must still read at 170px wide, because that is the README thumbnail.

## Writing

Plain words that say what a thing does. No slogans, no "X, not Y", no filler, no emoji. See the `github-readme` skill for the full list.

## Before you finish

1. Look at it in light and dark, at 390px wide and at desktop width. Take screenshots and read them.
2. Squint test: the hierarchy should still be clear when blurred. One thing is largest, one thing is accent.
3. Tab through it with the keyboard and check focus is visible.
4. Search your change for literals: hex colours, pixel font sizes, `border-radius` over 6, `box-shadow`, emoji.
