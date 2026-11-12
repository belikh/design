import type { N } from "./calc.ts";
import { specs } from "./geom.ts";
import { resolveInk } from "./palette.ts";
import type { PaletteId, Prim, Rect, WidgetDef } from "./types.ts";

/** The only `it.*` calls the generator emits (all part of ESPHome's display API). */
export const ALLOWED_IT = ["line", "rectangle", "filled_rectangle", "circle", "filled_circle", "printf", "strftime", "horizontal_line", "fill"] as const;

/** C++ integer coordinate for a value. */
const ci = (n: N, d = 0): string => (n.k ? String(Math.round(n.v) + d) : `(int)(${n.e}${d ? ` + ${d}` : ""})`);
const fl = (n: N, d = 0): string => (n.k ? String(n.v + d) : `(${n.e}${d ? ` + ${d}` : ""})`);
const ALIGN = (a: "l" | "c" | "r", v: "top" | "mid") => (v === "top" ? { l: "TOP_LEFT", c: "TOP_CENTER", r: "TOP_RIGHT" }[a] : { l: "CENTER_LEFT", c: "CENTER", r: "CENTER_RIGHT" }[a]);
const q = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

function emit(prims: Prim[], ox: number, oy: number, palette: PaletteId, ind: string): string[] {
  const out: string[] = [];
  const col = (r: Parameters<typeof resolveInk>[0]) => resolveInk(r, palette);
  const X = (n: N) => ci(n, ox), Y = (n: N) => ci(n, oy);
  for (const p of prims) {
    switch (p.k) {
      case "rect": {
        const c = col(p.ink);
        if (!p.fill) out.push(`${ind}it.rectangle(${X(p.x)}, ${Y(p.y)}, ${ci(p.w)}, ${ci(p.h)}, ${c.lambda});`);
        else if (p.fill === "hatch" || c.hatch) out.push(`${ind}for (int _y = ${Y(p.y)}; _y < ${Y(p.y)} + ${ci(p.h)}; _y += 2) it.horizontal_line(${X(p.x)}, _y, ${ci(p.w)}, ${c.lambda});`);
        else out.push(`${ind}it.filled_rectangle(${X(p.x)}, ${Y(p.y)}, ${ci(p.w)}, ${ci(p.h)}, ${c.lambda});`);
        break;
      }
      case "line": out.push(`${ind}it.line(${X(p.x1)}, ${Y(p.y1)}, ${X(p.x2)}, ${Y(p.y2)}, ${col(p.ink).lambda});`); break;
      case "circle": out.push(`${ind}it.${p.fill ? "filled_circle" : "circle"}(${X(p.cx)}, ${Y(p.cy)}, ${ci(p.r)}, ${col(p.ink).lambda});`); break;
      case "arc": {
        const c = col(p.ink).lambda, cx = fl(p.cx, ox), cy = fl(p.cy, oy);
        out.push(`${ind}{ // arc (3-degree segments, ${p.th}px thick)`,
          `${ind}  const float _a0 = ${fl(p.a0)}, _a1 = ${fl(p.a1)};`,
          `${ind}  for (float _a = _a0; _a < _a1; _a += 3.0f) {`,
          `${ind}    const float _b = fminf(_a + 3.0f, _a1);`,
          `${ind}    for (int _t = 0; _t < ${p.th}; _t++) {`,
          `${ind}      const float _r = ${fl(p.r)} - _t;`,
          `${ind}      it.line((int)(${cx} + _r * cosf(_a * 0.0174533f)), (int)(${cy} + _r * sinf(_a * 0.0174533f)), (int)(${cx} + _r * cosf(_b * 0.0174533f)), (int)(${cy} + _r * sinf(_b * 0.0174533f)), ${c});`,
          `${ind}    }`, `${ind}  }`, `${ind}}`);
        break;
      }
      case "text": {
        const kinds = specs(p.fmt);
        const args = p.args.map((a, i) => (kinds[i] === "f" ? `(float)${a.e}` : `(int)${a.e}`));
        out.push(`${ind}it.printf(${X(p.x)}, ${Y(p.y)}, id(jp_mono_${p.size}), ${col(p.ink).lambda}, TextAlign::${ALIGN(p.align, p.va)}, "${q(p.fmt)}"${args.length ? ", " + args.join(", ") : ""});`);
        break;
      }
      case "time": out.push(`${ind}it.strftime(${X(p.x)}, ${Y(p.y)}, id(jp_mono_${p.size}), ${col(p.ink).lambda}, TextAlign::${ALIGN(p.align, p.va)}, "${q(p.fmt)}", ${p.source});`); break;
      case "spark": {
        const c = col(p.ink).lambda, x = p.x + ox, y = p.y + oy;
        out.push(`${ind}{ // sparkline over a std::vector<float> (e.g. a global)`,
          `${ind}  const auto &_d = ${p.expr};`,
          `${ind}  const float _mn = ${fl(p.min)}, _mx = ${fl(p.max)};`,
          `${ind}  if (_d.size() > 1 && _mx > _mn) {`,
          `${ind}    for (size_t _i = 1; _i < _d.size(); _i++) {`,
          `${ind}      const int _x0 = ${x} + (int)((_i - 1) * ${p.w - 1} / (_d.size() - 1)), _x1 = ${x} + (int)(_i * ${p.w - 1} / (_d.size() - 1));`,
          `${ind}      const int _y0 = ${y + p.h - 1} - (int)((_d[_i - 1] - _mn) / (_mx - _mn) * ${p.h - 1}), _y1 = ${y + p.h - 1} - (int)((_d[_i] - _mn) / (_mx - _mn) * ${p.h - 1});`,
          `${ind}      it.line(_x0, _y0, _x1, _y1, ${c});`,
          `${ind}    }`, `${ind}  }`, `${ind}}`);
        break;
      }
      case "drop": {
        const c = col(p.ink).lambda;
        out.push(`${ind}{ // water drop, filled from the bottom to the level`,
          `${ind}  const int _cx = ${X(p.cx)}, _top = ${Y(p.top)}, _r = ${ci(p.r)};`,
          `${ind}  const int _cyc = _top + (int)(1.9f * _r), _bot = _cyc + _r;`,
          `${ind}  const int _fillTo = _bot - (int)(${fl(p.level)} * (_bot - _top));`,
          `${ind}  for (int _y = _top; _y <= _bot; _y++) {`,
          `${ind}    const int _hw = (_y < _cyc) ? (int)((float)(_y - _top) / (float)(_cyc - _top) * _r * 0.95f) : (int)sqrtf((float)(_r * _r - (_y - _cyc) * (_y - _cyc)));`,
          `${ind}    it.horizontal_line(_cx - _hw, _y, 1, ${c});`,
          `${ind}    it.horizontal_line(_cx + _hw, _y, 1, ${c});`,
          `${ind}    if (_y >= _fillTo && _y > _top + 2 && 2 * _hw - 3 > 0) it.horizontal_line(_cx - _hw + 2, _y, 2 * _hw - 3, ${c});`,
          `${ind}  }`, `${ind}}`);
        break;
      }
      case "segs": {
        const c = col(p.ink).lambda, o = col(p.off).lambda;
        out.push(`${ind}{ // ${p.n} progress segments`,
          `${ind}  const int _n = ${p.n}, _gap = 2, _sw = (${p.w} - (_n - 1) * _gap) / _n, _on = (int)(${fl(p.count)});`,
          `${ind}  for (int _i = 0; _i < _n; _i++) {`,
          `${ind}    const int _x = ${p.x + ox} + _i * (_sw + _gap);`,
          `${ind}    if (_i < _on) it.filled_rectangle(_x, ${p.y + oy}, _sw, ${p.h}, ${c});`,
          `${ind}    else it.rectangle(_x, ${p.y + oy}, _sw, ${p.h}, ${o});`,
          `${ind}  }`, `${ind}}`);
        break;
      }
      case "if":
        out.push(`${ind}if (${p.cond.e}) {`, ...emit(p.then, ox, oy, palette, ind + "  "));
        if (p.else.length) out.push(`${ind}} else {`, ...emit(p.else, ox, oy, palette, ind + "  "));
        out.push(`${ind}}`);
        break;
    }
  }
  return out;
}

/** Display-lambda body for primitives placed at `rect` (no surrounding braces). */
export function primsToLambda(prims: Prim[], rect: Rect, palette: PaletteId, ind = "  "): string {
  return emit(prims, rect.x, rect.y, palette, ind).join("\n");
}

/** ESPHome display-lambda block for one widget. Needs the fonts/colors from jupiter-esphome.yaml (colour palette). */
export function toLambda<P>(widget: WidgetDef<P>, props: P, rect: Rect, palette: PaletteId = "colour"): string {
  const prims = widget.build(props, rect.w, rect.h);
  return `{ // ${widget.label} at ${rect.x},${rect.y} ${rect.w}x${rect.h}\n${primsToLambda(prims, rect, palette)}\n}`;
}
