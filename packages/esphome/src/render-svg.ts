import { K, add } from "./calc.ts";
import type { N } from "./calc.ts";
import { dropRows, printf, strftime } from "./geom.ts";
import { resolveInk } from "./palette.ts";
import type { PaletteId, Prim, Rect, WidgetDef } from "./types.ts";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const f = (n: number) => String(+n.toFixed(2));

export interface SvgOpts { width: number; height: number; palette: PaletteId; /** seconds, for clock widgets */ time?: number }

/** Render primitives into SVG elements (no wrapper). `used` collects hatch patterns that must be defined. */
export function primsToSvg(prims: Prim[], palette: PaletteId, used: Set<string>, time = 0): string {
  const crisp = palette !== "colour";
  const out: string[] = [];
  const ink = (r: Parameters<typeof resolveInk>[0]) => resolveInk(r, palette);
  const pat = (hex: string) => { used.add(hex); return `url(#hatch-${hex.slice(1)})`; };
  for (const p of prims) {
    switch (p.k) {
      case "rect": {
        const c = ink(p.ink), x = p.x.v, y = p.y.v, w = p.w.v, h = p.h.v;
        if (w <= 0 || h <= 0) break;
        if (p.fill) out.push(`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${p.fill === "hatch" || c.hatch ? pat(c.hex) : c.hex}"/>`);
        else out.push(`<rect x="${f(x + 0.5)}" y="${f(y + 0.5)}" width="${f(w - 1)}" height="${f(h - 1)}" fill="none" stroke="${c.hex}" stroke-width="1"/>`);
        break;
      }
      case "line": { const c = ink(p.ink); out.push(`<line x1="${f(p.x1.v + 0.5)}" y1="${f(p.y1.v + 0.5)}" x2="${f(p.x2.v + 0.5)}" y2="${f(p.y2.v + 0.5)}" stroke="${c.hex}" stroke-width="1"/>`); break; }
      case "circle": { const c = ink(p.ink); out.push(p.fill ? `<circle cx="${f(p.cx.v)}" cy="${f(p.cy.v)}" r="${f(p.r.v)}" fill="${c.hex}"/>` : `<circle cx="${f(p.cx.v)}" cy="${f(p.cy.v)}" r="${f(p.r.v)}" fill="none" stroke="${c.hex}" stroke-width="1"/>`); break; }
      case "arc": {
        const c = ink(p.ink), a0 = p.a0.v, a1 = p.a1.v;
        if (a1 <= a0) break;
        const pt = (a: number, r: number) => `${f(p.cx.v + r * Math.cos((a * Math.PI) / 180))},${f(p.cy.v + r * Math.sin((a * Math.PI) / 180))}`;
        if (!crisp) { const r = p.r.v - p.th / 2; out.push(`<path d="M${pt(a0, r)}A${f(r)},${f(r)} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${pt(Math.min(a1, a0 + 359.9), r)}" fill="none" stroke="${c.hex}" stroke-width="${p.th}"/>`); break; }
        // same 3-degree line segments the lambda draws
        for (let t = 0; t < p.th; t++) { const r = p.r.v - t; const pts: string[] = []; for (let a = a0; a < a1; a += 3) { pts.push(pt(a, r)); } pts.push(pt(a1, r)); out.push(`<polyline points="${pts.join(" ")}" fill="none" stroke="${c.hex}" stroke-width="1"/>`); }
        break;
      }
      case "text": {
        const c = ink(p.ink), s = esc(printf(p.fmt, p.args.map((a) => a.v)));
        const y = p.y.v + (p.va === "top" ? p.size * 0.8 : p.size * 0.35);
        out.push(`<text x="${f(p.x.v)}" y="${f(y)}" font-family="JetBrains Mono, ui-monospace, monospace" font-size="${p.size}" fill="${c.hex}" text-anchor="${p.align === "l" ? "start" : p.align === "c" ? "middle" : "end"}">${s}</text>`);
        break;
      }
      case "time": {
        const c = ink(p.ink), y = p.y.v + (p.va === "top" ? p.size * 0.8 : p.size * 0.35);
        out.push(`<text x="${f(p.x.v)}" y="${f(y)}" font-family="JetBrains Mono, ui-monospace, monospace" font-size="${p.size}" fill="${c.hex}" text-anchor="${p.align === "l" ? "start" : p.align === "c" ? "middle" : "end"}">${esc(strftime(p.fmt, time))}</text>`);
        break;
      }
      case "spark": {
        const c = ink(p.ink), mn = p.min.v, mx = p.max.v, n = p.data.length;
        if (n < 2 || mx <= mn) break;
        const pts = p.data.map((v, i) => `${f(p.x + (i * (p.w - 1)) / (n - 1) + 0.5)},${f(p.y + (p.h - 1) - Math.trunc(((v - mn) / (mx - mn)) * (p.h - 1)) + 0.5)}`).join(" ");
        out.push(`<polyline points="${pts}" fill="none" stroke="${c.hex}" stroke-width="1"/>`);
        break;
      }
      case "drop": {
        const c = ink(p.ink);
        for (const r of dropRows(Math.round(p.top.v), Math.round(p.r.v), p.level.v)) {
          const cx = Math.round(p.cx.v);
          out.push(`<rect x="${cx - r.hw}" y="${r.y}" width="1" height="1" fill="${c.hex}"/><rect x="${cx + r.hw}" y="${r.y}" width="1" height="1" fill="${c.hex}"/>`);
          if (r.fill && 2 * r.hw - 3 > 0) out.push(`<rect x="${cx - r.hw + 2}" y="${r.y}" width="${2 * r.hw - 3}" height="1" fill="${c.hex}"/>`);
        }
        break;
      }
      case "segs": {
        const c = ink(p.ink), o = ink(p.off), gap = 2, sw = Math.trunc((p.w - (p.n - 1) * gap) / p.n), on = Math.trunc(p.count.v);
        for (let i = 0; i < p.n; i++) {
          const x = p.x + i * (sw + gap);
          out.push(i < on ? `<rect x="${x}" y="${p.y}" width="${sw}" height="${p.h}" fill="${c.hex}"/>` : `<rect x="${x + 0.5}" y="${p.y + 0.5}" width="${sw - 1}" height="${p.h - 1}" fill="none" stroke="${o.hex}" stroke-width="1"/>`);
        }
        break;
      }
      case "if": out.push(primsToSvg(p.cond.v ? p.then : p.else, palette, used, time)); break;
    }
  }
  return out.join("");
}

const shift = (n: N, d: number): N => add(n, K(d));
/** Move a primitive by (dx, dy). */
export function offset(p: Prim, dx: number, dy: number): Prim {
  switch (p.k) {
    case "rect": return { ...p, x: shift(p.x, dx), y: shift(p.y, dy) };
    case "line": return { ...p, x1: shift(p.x1, dx), y1: shift(p.y1, dy), x2: shift(p.x2, dx), y2: shift(p.y2, dy) };
    case "circle": case "arc": return { ...p, cx: shift(p.cx, dx), cy: shift(p.cy, dy) };
    case "text": case "time": return { ...p, x: shift(p.x, dx), y: shift(p.y, dy) };
    case "spark": case "segs": return { ...p, x: p.x + dx, y: p.y + dy };
    case "drop": return { ...p, cx: shift(p.cx, dx), top: shift(p.top, dy) };
    case "if": return { ...p, then: p.then.map((q) => offset(q, dx, dy)), else: p.else.map((q) => offset(q, dx, dy)) };
  }
}

const defs = (used: Set<string>) => used.size ? `<defs>${[...used].map((h) => `<pattern id="hatch-${h.slice(1)}" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="1" fill="${h}"/></pattern>`).join("")}</defs>` : "";

/** Wrap primitives into a standalone SVG of exactly width x height pixels (1 unit = 1 px). */
export function svgDocument(prims: Prim[], o: SvgOpts, bgRect?: Rect): string {
  const used = new Set<string>();
  const body = primsToSvg(prims, o.palette, used, o.time ?? 0);
  const bg = resolveInk("bg", o.palette).hex, crisp = o.palette !== "colour";
  const r = bgRect ?? { x: 0, y: 0, w: o.width, h: o.height };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${o.width} ${o.height}" width="${o.width}" height="${o.height}"${crisp ? ' shape-rendering="crispEdges"' : ""}>${defs(used)}<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${bg}"/>${body}</svg>`;
}

/** Preview one widget at its true pixel size. */
export function renderSvg<P>(widget: WidgetDef<P>, props: P, o: SvgOpts): string {
  return svgDocument(widget.build(props, o.width, o.height), o);
}
