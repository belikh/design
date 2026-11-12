import { resolveInk } from "./palette.ts";
import { offset, svgDocument } from "./render-svg.ts";
import { primsToLambda } from "./render-lambda.ts";
import { getWidget } from "./widgets.ts";
import type { Display, Prim, Rect, WidgetDef } from "./types.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Placement { id: string; widget: WidgetDef<any>; rect: Rect; props: any }

const place = (id: string, rect: Rect, t: number, d: Display, tweak?: (p: Record<string, unknown>) => Record<string, unknown>): Placement => {
  const widget = getWidget(id);
  const base = widget.defaults(d) as Record<string, unknown>;
  return { id, widget, rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.w), h: Math.round(rect.h) }, props: widget.simulate(tweak ? tweak(base) : base, t) };
};

/** A ready-made dashboard sized for the display: 6 widgets on large displays, 4 on small e-paper, 2-3 on OLEDs. */
export function dashboard(d: Display, t = 0): Placement[] {
  const m = 4, w = d.width, h = d.height;
  if (w >= 300 && h >= 200) {
    const hh = h >= 300 ? 36 : 28, y0 = m + hh + m, cw = (w - 3 * m) / 2, rh = (h - y0 - 2 * m) / 2;
    return [
      place("clock", { x: m, y: m, w: w * 0.42, h: hh }, t, d),
      place("wifi", { x: w - 62, y: m + 2, w: 58, h: 22 }, t, d),
      place("dial", { x: m, y: y0, w: cw, h: rh }, t, d),
      place("tile", { x: m + cw + m, y: y0, w: cw, h: rh }, t, d),
      place("spark", { x: m, y: y0 + rh + m, w: cw, h: rh }, t, d),
    ].concat(place("bar", { x: m + cw + m, y: y0 + rh + m + Math.max(0, (rh - 44) / 2), w: cw, h: Math.min(44, rh) }, t, d));
  }
  if (w >= 250) {
    const sq = h - 2 * m, x1 = sq + 2 * m, w1 = w - x1 - m, th = Math.floor((h - 3 * m) * 0.6);
    return [
      place("dial", { x: m, y: m, w: sq, h: sq }, t, d),
      place("tile", { x: x1, y: m, w: w1, h: th }, t, d),
      place("bar", { x: x1, y: m + th + m + 4, w: Math.floor(w1 * 0.62), h: h - th - 3 * m - 4 }, t, d),
      place("battery", { x: x1 + Math.floor(w1 * 0.62) + m, y: m + th + m + 4, w: w1 - Math.floor(w1 * 0.62) - m, h: 22 }, t, d),
    ];
  }
  if (h >= 64) return [
    place("tile", { x: 0, y: 0, w, h: 40 }, t, d),
    place("segments", { x: 0, y: 44, w: w - 32, h: 20 }, t, d),
    place("wifi", { x: w - 26, y: 44, w: 26, h: 20 }, t, d, (p) => ({ ...p, showValue: false })),
  ];
  return [place("pair", { x: 0, y: 0, w, h }, t, d)];
}

/** Combined display lambda for a set of placements. */
export function composeLambda(d: Display, ps: Placement[]): string {
  const bg = resolveInk("bg", d.palette).lambda;
  const blocks = ps.map((p) => `{ // ${p.widget.label} at ${p.rect.x},${p.rect.y} ${p.rect.w}x${p.rect.h}\n${primsToLambda(p.widget.build(p.props, p.rect.w, p.rect.h), p.rect, d.palette)}\n}`);
  return `// Jupiter dashboard for ${d.label}. Needs jupiter-esphome.yaml (colors + fonts)${d.palette === "colour" ? "" : "; e-paper / OLED palettes use COLOR_ON / COLOR_OFF and literal Colors"}.\nit.fill(${bg});\n${blocks.join("\n")}`;
}

/** The whole display as one SVG at true pixel size. */
export function composeSvg(d: Display, ps: Placement[], time = 0): string {
  const prims: Prim[] = ps.flatMap((p) => p.widget.build(p.props, p.rect.w, p.rect.h).map((q) => offset(q, p.rect.x, p.rect.y)));
  return svgDocument(prims, { width: d.width, height: d.height, palette: d.palette, time });
}

/** LVGL YAML snippet for one widget. */
export function toLvgl<P>(widget: WidgetDef<P>, props: P, rect: Rect): string { return widget.lvgl(props, rect); }
