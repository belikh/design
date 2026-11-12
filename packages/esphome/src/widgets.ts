import { K, add, sub, mul, div, hi, clamp, ge, lt, frac, toN, withSim, type N, type Src } from "./calc.ts";
import { fontFor, textW } from "./geom.ts";
import type { Display, Prim, Rect, Role, WidgetDef } from "./types.ts";

const fit = (d: Display, w: number, h: number) => ({ w: Math.min(w, d.width), h: Math.min(h, d.height) });
const sim = (t: number, mid: number, amp: number, speed = 0.7, phase = 0) => mid + amp * Math.sin(t * speed + phase);
const R = (x: number, y: number, w: number, h: number, ink: Role, fill?: boolean | "hatch"): Prim => ({ k: "rect", x: K(x), y: K(y), w: K(w), h: K(h), ink, fill });
const Ln = (x1: number, y1: number, x2: number, y2: number, ink: Role): Prim => ({ k: "line", x1: K(x1), y1: K(y1), x2: K(x2), y2: K(y2), ink });
const T = (x: number | N, y: number | N, size: 12 | 14 | 16 | 20 | 28 | 40, ink: Role, align: "l" | "c" | "r", va: "top" | "mid", fmt: string, ...args: N[]): Prim =>
  ({ k: "text", x: typeof x === "number" ? K(x) : x, y: typeof y === "number" ? K(y) : y, size, ink, align, va, fmt, args });
const pctEsc = (s: string) => s.replace(/%/g, "%%");

/** if v >= danger -> danger, else if v >= warn -> warn, else ok. Higher is worse. */
function byHigh(v: N, warn: number | undefined, danger: number | undefined, make: (ink: Role) => Prim[]): Prim[] {
  if (warn === undefined && danger === undefined) return make("ok");
  const inner: Prim[] = warn === undefined ? make("ok") : [{ k: "if", cond: ge(v, K(warn)), then: make("warn"), else: make("ok") }];
  return danger === undefined ? inner : [{ k: "if", cond: ge(v, K(danger)), then: make("danger"), else: inner }];
}
/** Lower is worse (battery, signal): below `danger` -> danger, below `warn` -> warn. */
function byLow(v: N, warn: number, danger: number, make: (ink: Role) => Prim[]): Prim[] {
  return [{ k: "if", cond: lt(v, K(danger)), then: make("danger"), else: [{ k: "if", cond: lt(v, K(warn)), then: make("warn"), else: make("ok") }] }];
}
/** Zone-coloured span along 0..1: ok up to `warnF`, warn up to `dangerF`, danger beyond; `f` is the value fraction. */
function zones(f: N, warnF: number | undefined, dangerF: number | undefined, mk: (lo: number, hi: number, ink: Role, f: N) => Prim): Prim[] {
  const z: [number, number, Role][] = [];
  const w = warnF ?? 1, d = Math.max(w, dangerF ?? 1);
  z.push([0, w, "ok"]);
  if (w < 1) z.push([w, d, "warn"]);
  if (d < 1) z.push([d, 1, "danger"]);
  return z.map(([a, b, ink]) => mk(a, b, ink, f));
}
const fracOf = (v: number | undefined, min: number, max: number) => (v === undefined ? undefined : (v - min) / (max - min));
const comment = (name: string, r: Rect) => `# ${name} ${r.w}x${r.h} at ${r.x},${r.y}. Unverified against a real ESPHome build.`;
const srcNum = (s: Src) => (typeof s === "number" ? s : s.sim);

/* ---------------------------------------------------------------- dial */
export interface DialProps { label: string; unit: string; value: Src; min: number; max: number; warnAt?: number; dangerAt?: number; decimals: number }
const dial: WidgetDef<DialProps> = {
  id: "dial", label: "Dial gauge", description: "270-degree arc with ticks, zone colours and a centre value.",
  size: (d) => fit(d, 160, 160),
  defaults: () => ({ label: "CPU temp", unit: "C", value: { expr: "id(cpu_temp).state", sim: 54 }, min: 0, max: 100, warnAt: 60, dangerAt: 80, decimals: 0 }),
  simulate: (p, t) => ({ ...p, value: withSim(p.value, sim(t, 55, 38, 0.6)) }),
  build(p, w, h) {
    const size = Math.min(w, h), r = Math.floor(size / 2) - 2, cx = Math.floor(w / 2), cy = Math.floor(h / 2) + (h > 60 ? 2 : 0), th = Math.max(3, Math.round(r * 0.14));
    const v = toN(p.value), f = frac(v, K(p.min), K(p.max)), A0 = 135, SW = 270, out: Prim[] = [];
    out.push({ k: "arc", cx: K(cx), cy: K(cy), r: K(r), a0: K(A0), a1: K(A0 + SW), th, ink: "border" });
    out.push(...zones(f, fracOf(p.warnAt, p.min, p.max), fracOf(p.dangerAt, p.min, p.max), (zl, zh, ink, ff) =>
      ({ k: "arc", cx: K(cx), cy: K(cy), r: K(r), a0: K(A0 + SW * zl), a1: add(K(A0), mul(K(SW), clamp(ff, K(zl), K(zh)))), th, ink })));
    if (r >= 26) for (let i = 0; i <= 10; i++) { const a = A0 + 27 * i, c = Math.cos((a * Math.PI) / 180), s = Math.sin((a * Math.PI) / 180), r1 = r - th - 2, r2 = r - th - (i % 5 === 0 ? 7 : 4); out.push(Ln(Math.round(cx + r1 * c), Math.round(cy + r1 * s), Math.round(cx + r2 * c), Math.round(cy + r2 * s), "muted")); }
    const vs = fontFor(r * 0.55);
    out.push(T(cx, cy - (r >= 34 ? Math.round(vs * 0.35) : 0), vs, "text", "c", "mid", `%.${p.decimals}f`, v));
    if (r >= 34) out.push(T(cx, cy + Math.round(vs * 0.6), 12, "muted", "c", "top", pctEsc(p.unit)));
    if (r >= 48) { out.push(T(cx - Math.round(r * 0.62), cy + Math.round(r * 0.86), 12, "muted", "c", "mid", "%d", K(p.min))); out.push(T(cx + Math.round(r * 0.62), cy + Math.round(r * 0.86), 12, "muted", "c", "mid", "%d", K(p.max))); }
    if (r >= 64) out.push(T(cx, cy + Math.round(r * 0.86), 12, "muted", "c", "mid", pctEsc(p.label)));
    return out;
  },
  lvgl(p, r) {
    const s = Math.min(r.w, r.h);
    return `${comment("Dial", r)}
- meter:
    x: ${r.x}
    y: ${r.y}
    width: ${s}
    height: ${s}
    styles: jp_style_card
    scales:
      - range_from: ${p.min}
        range_to: ${p.max}
        angle_range: 270
        rotation: 135
        ticks: { count: 11, length: 6, width: 1, color: jp_text_muted }
        indicators:
          - arc: { color: jp_ok, r_mod: -4, width: 8, start_value: ${p.min}, end_value: ${p.warnAt ?? p.max} }
${p.warnAt !== undefined ? `          - arc: { color: jp_warn, r_mod: -4, width: 8, start_value: ${p.warnAt}, end_value: ${p.dangerAt ?? p.max} }\n` : ""}${p.dangerAt !== undefined ? `          - arc: { color: jp_danger, r_mod: -4, width: 8, start_value: ${p.dangerAt}, end_value: ${p.max} }\n` : ""}          - line: { id: dial_needle, color: jp_text, width: 2, r_mod: -10, value: ${srcNum(p.value)} }
- label:
    x: ${r.x + Math.round(s / 2) - 20}
    y: ${r.y + Math.round(s / 2) - 10}
    text: "${p.label}"
    styles: jp_style_muted
# bind: sensor on_value -> lvgl.indicator.update: { id: dial_needle, value: !lambda return x; }`;
  },
};

/* ----------------------------------------------------------------- bar */
export interface BarProps { label: string; unit: string; value: Src; min: number; max: number; warnAt?: number; dangerAt?: number; vertical: boolean; decimals: number }
const bar: WidgetDef<BarProps> = {
  id: "bar", label: "Bar gauge", description: "Horizontal or vertical bar with zone colours and threshold marks.",
  size: (d) => fit(d, 200, 40),
  defaults: () => ({ label: "Humidity", unit: "%", value: { expr: "id(humidity).state", sim: 58 }, min: 0, max: 100, warnAt: 70, dangerAt: 90, vertical: false, decimals: 0 }),
  simulate: (p, t) => ({ ...p, value: withSim(p.value, sim(t, 55, 38, 0.5, 1)) }),
  build(p, w, h) {
    const v = toN(p.value), f = frac(v, K(p.min), K(p.max)), out: Prim[] = [];
    const wf = fracOf(p.warnAt, p.min, p.max), df = fracOf(p.dangerAt, p.min, p.max);
    if (!p.vertical) {
      const showLabel = h >= 28, bh = showLabel ? Math.max(8, Math.min(16, h - 18)) : Math.max(6, h - 2), by = showLabel ? h - bh - 1 : 1;
      if (showLabel) { out.push(T(0, 0, 12, "muted", "l", "top", pctEsc(p.label))); out.push(T(w, 0, 12, "text", "r", "top", `%.${p.decimals}f${pctEsc(p.unit)}`, v)); }
      out.push(R(0, by, w, bh, "border"));
      out.push(...zones(f, wf, df, (zl, zh, ink, ff) => ({ k: "rect", x: K(1 + (w - 2) * zl), y: K(by + 1), w: hi(K(0), sub(mul(K(w - 2), clamp(ff, K(zl), K(zh))), K((w - 2) * zl))), h: K(bh - 2), ink, fill: true })));
      for (const m of [wf, df]) if (m !== undefined) out.push(Ln(Math.round(1 + (w - 2) * m), by - 2, Math.round(1 + (w - 2) * m), by + bh + 1, "muted"));
    } else {
      const bw = Math.max(8, Math.min(20, w - 4)), bx = Math.floor((w - bw) / 2), top = h >= 40 ? 16 : 1, bot = h - 1, ht = bot - top;
      if (h >= 40) out.push(T(w / 2, 0, 12, "text", "c", "top", `%.${p.decimals}f`, v));
      out.push(R(bx, top, bw, ht, "border"));
      out.push(...zones(f, wf, df, (zl, zh, ink, ff) => { const len = hi(K(0), sub(mul(K(ht - 2), clamp(ff, K(zl), K(zh))), K((ht - 2) * zl))); return { k: "rect", x: K(bx + 1), y: sub(K(bot - 1 - (ht - 2) * zl), len), w: K(bw - 2), h: len, ink, fill: true }; }));
      for (const m of [wf, df]) if (m !== undefined) out.push(Ln(bx - 2, Math.round(bot - 1 - (ht - 2) * m), bx + bw + 1, Math.round(bot - 1 - (ht - 2) * m), "muted"));
    }
    return out;
  },
  lvgl(p, r) {
    return `${comment("Bar", r)}
- bar:
    id: bar_${p.label.toLowerCase().replace(/\W+/g, "_")}
    x: ${r.x}
    y: ${r.y}
    width: ${r.w}
    height: ${r.h}
    min_value: ${p.min}
    max_value: ${p.max}
    value: ${srcNum(p.value)}
    indicator:
      bg_color: jp_ok   # change to jp_warn / jp_danger with an on_value lambda past ${p.warnAt ?? "the warn"} / ${p.dangerAt ?? "the danger"} threshold
# bind: sensor on_value -> lvgl.bar.update: { id: bar_..., value: !lambda return x; }`;
  },
};

/* ---------------------------------------------------------------- tile */
export interface TileProps { label: string; unit: string; value: Src; delta?: Src; decimals: number }
const tile: WidgetDef<TileProps> = {
  id: "tile", label: "Big-number tile", description: "Label, large value, unit and an optional signed delta.",
  size: (d) => fit(d, 120, 64),
  defaults: () => ({ label: "Temperature", unit: "C", value: { expr: "id(temperature).state", sim: 22.4 }, delta: { expr: "id(temperature_delta).state", sim: 0.6 }, decimals: 1 }),
  simulate: (p, t) => ({ ...p, value: withSim(p.value, sim(t, 22, 3, 0.5)), delta: p.delta === undefined ? undefined : withSim(p.delta, sim(t, 0, 1.2, 0.9)) }),
  build(p, w, h) {
    const pad = h >= 56 ? 6 : 2, out: Prim[] = [], v = toN(p.value), showLabel = h >= 44, showDelta = p.delta !== undefined && h >= 60;
    if (h >= 36) out.push(R(0, 0, w, h, "border"));
    if (showLabel) out.push(T(pad + 2, pad, 12, "muted", "l", "top", pctEsc(p.label)));
    const vs = fontFor(showLabel ? (showDelta ? h * 0.34 : h * 0.44) : h * 0.7), vy = showLabel ? Math.round(pad + 14 + (h - pad * 2 - 14 - (showDelta ? 14 : 0) - vs) / 2) : Math.round((h - vs) / 2);
    out.push(T(pad + 2, vy, vs, "text", "l", "top", `%.${p.decimals}f`, v));
    if (w >= 90) out.push(T(pad + 2 + textW(String(Math.round(srcNum(p.value))).length + (p.decimals ? p.decimals + 1 : 0), vs) + 4, vy + vs - 12, 12, "muted", "l", "top", pctEsc(p.unit)));
    if (showDelta && p.delta !== undefined) {
      const dn = toN(p.delta), y = h - pad - 12;
      out.push({ k: "if", cond: ge(dn, K(0)), then: [T(pad + 2, y, 12, "ok", "l", "top", "%+.1f", dn)], else: [T(pad + 2, y, 12, "danger", "l", "top", "%+.1f", dn)] });
    }
    return out;
  },
  lvgl(p, r) {
    return `${comment("Tile", r)}
- obj:
    x: ${r.x}
    y: ${r.y}
    width: ${r.w}
    height: ${r.h}
    styles: jp_style_card
    widgets:
      - label: { text: "${p.label}", styles: jp_style_muted, align: TOP_LEFT }
      - label: { id: tile_${p.label.toLowerCase().replace(/\W+/g, "_")}, text: "--", styles: jp_style_value, align: CENTER }
      - label: { text: "${p.unit}", styles: jp_style_muted, align: BOTTOM_RIGHT }
# bind: sensor on_value -> lvgl.label.update: { id: tile_..., text: !lambda 'char b[16]; snprintf(b, 16, "%.${p.decimals}f", x); return std::string(b);' }`;
  },
};

/* --------------------------------------------------------------- spark */
export interface SparkProps { label: string; unit: string; value: Src; series: number[]; seriesExpr: string; min: number; max: number; decimals: number }
const spark: WidgetDef<SparkProps> = {
  id: "spark", label: "Sparkline", description: "Value with a line trace of recent history.",
  size: (d) => fit(d, 160, 64),
  defaults: () => ({ label: "Power", unit: "W", value: { expr: "id(power).state", sim: 410 }, series: Array.from({ length: 32 }, (_, i) => 300 + 120 * Math.sin(i / 3)), seriesExpr: "id(power_history)", min: 0, max: 600, decimals: 0 }),
  simulate: (p, t) => { const s = Array.from({ length: 32 }, (_, i) => 300 + 140 * Math.sin((i + t * 3) / 3.1) + 40 * Math.sin((i + t) / 1.3)); return { ...p, series: s, value: withSim(p.value, s[31]) }; },
  build(p, w, h) {
    const out: Prim[] = [], v = toN(p.value), top = h >= 40 ? 16 : 0;
    if (h >= 40) { out.push(T(0, 0, 12, "muted", "l", "top", pctEsc(p.label))); out.push(T(w, 0, 12, "text", "r", "top", `%.${p.decimals}f${pctEsc(p.unit)}`, v)); }
    else out.push(T(w, 0, 12, "text", "r", "top", `%.${p.decimals}f`, v));
    out.push(Ln(0, h - 1, w - 1, h - 1, "border"));
    out.push({ k: "spark", x: 0, y: top, w, h: h - top - 2, data: p.series, expr: p.seriesExpr, min: K(p.min), max: K(p.max), ink: "accent" });
    return out;
  },
  lvgl(p, r) {
    const pts = p.series.map((v, i) => `{${Math.round((i * (r.w - 1)) / (p.series.length - 1))}, ${Math.round((r.h - 20) - ((v - p.min) / (p.max - p.min)) * (r.h - 20))}}`).join(", ");
    return `${comment("Sparkline", r)}
# ESPHome's LVGL has no live chart widget: this draws a static 'line'. For a live trace use the display lambda from this widget.
- obj:
    x: ${r.x}
    y: ${r.y}
    width: ${r.w}
    height: ${r.h}
    styles: jp_style_card
    widgets:
      - label: { text: "${p.label}", styles: jp_style_muted, align: TOP_LEFT }
      - line: { points: [${pts}], line_color: jp_accent, line_width: 2, y: 16 }`;
  },
};

/* --------------------------------------------------------- thermometer */
export interface ThermoProps { value: Src; min: number; max: number; warnAt?: number; dangerAt?: number; unit: string }
const thermo: WidgetDef<ThermoProps> = {
  id: "thermometer", label: "Thermometer", description: "Vertical tube and bulb with zone colour and scale marks.",
  size: (d) => fit(d, 56, 140),
  defaults: () => ({ value: { expr: "id(temperature).state", sim: 24 }, min: 0, max: 50, warnAt: 30, dangerAt: 40, unit: "C" }),
  simulate: (p, t) => ({ ...p, value: withSim(p.value, sim(t, 25, 18, 0.5)) }),
  build(p, w, h) {
    const v = toN(p.value), f = frac(v, K(p.min), K(p.max)), out: Prim[] = [];
    const br = Math.max(6, Math.min(Math.floor(w / 2.6), Math.floor(h / 5))), cx = Math.floor(w / 2) - (w >= 40 ? 6 : 0), tw = Math.max(6, Math.floor(br * 0.9)), top = 2, bulbY = h - br - 2, tubeBot = bulbY - br + 2, ht = tubeBot - top;
    out.push(R(cx - Math.floor(tw / 2), top, tw, ht, "border"));
    out.push({ k: "circle", cx: K(cx), cy: K(bulbY), r: K(br), ink: "border" });
    out.push(R(cx - Math.floor(tw / 2) + 1, tubeBot - 1, tw - 2, 2, "bg", true));
    out.push(...byHigh(v, p.warnAt, p.dangerAt, (ink) => [{ k: "circle", cx: K(cx), cy: K(bulbY), r: K(br - 2), ink, fill: true } as Prim]));
    const len = mul(K(ht - 4), f);
    out.push(...byHigh(v, p.warnAt, p.dangerAt, (ink) => [{ k: "rect", x: K(cx - Math.floor(tw / 2) + 2), y: sub(K(tubeBot), len), w: K(tw - 4), h: add(len, K(2)), ink, fill: true } as Prim]));
    if (w >= 40) for (let i = 0; i <= 4; i++) { const y = Math.round(tubeBot - 2 - ((ht - 4) * i) / 4); out.push(Ln(cx + Math.floor(tw / 2) + 3, y, cx + Math.floor(tw / 2) + (i % 2 ? 6 : 9), y, "muted")); }
    if (h >= 90) out.push(T(w - 1, 0, 12, "text", "r", "top", `%.0f${pctEsc(p.unit)}`, v));
    return out;
  },
  lvgl(p, r) { return `${comment("Thermometer", r)}\n- bar:\n    x: ${r.x}\n    y: ${r.y}\n    width: ${Math.min(r.w, 24)}\n    height: ${r.h}\n    min_value: ${p.min}\n    max_value: ${p.max}\n    value: ${srcNum(p.value)}\n    indicator:\n      bg_color: jp_ok\n# bind: sensor on_value -> lvgl.bar.update: { id: ..., value: !lambda return x; }`; },
};

/* ------------------------------------------------------------- battery */
export interface BatteryProps { value: Src; warnAt: number; dangerAt: number }
const battery: WidgetDef<BatteryProps> = {
  id: "battery", label: "Battery", description: "Cell outline with level fill: danger below 15%, warn below 40%.",
  size: (d) => fit(d, 64, 28),
  defaults: () => ({ value: { expr: "id(battery_level).state", sim: 72 }, warnAt: 40, dangerAt: 15 }),
  simulate: (p, t) => ({ ...p, value: withSim(p.value, sim(t, 50, 48, 0.4)) }),
  build(p, w, h) {
    const v = toN(p.value), nub = Math.max(2, Math.floor(h / 6)), bw = w - nub - (w >= 56 ? 24 : 0), out: Prim[] = [];
    out.push(R(0, 0, bw, h, "text"));
    out.push(R(bw, Math.floor(h / 3), nub, Math.ceil(h / 3), "text", true));
    const len = mul(K(bw - 4), clamp(div(v, K(100)), K(0), K(1)));
    out.push(...byLow(v, p.warnAt, p.dangerAt, (ink) => [{ k: "rect", x: K(2), y: K(2), w: len, h: K(h - 4), ink, fill: true } as Prim]));
    if (w >= 56) out.push(T(w, Math.round((h - 12) / 2), 12, "text", "r", "top", "%d%%", v));
    return out;
  },
  lvgl(p, r) { return `${comment("Battery", r)}\n- bar:\n    x: ${r.x}\n    y: ${r.y}\n    width: ${r.w - 24}\n    height: ${r.h}\n    min_value: 0\n    max_value: 100\n    value: ${srcNum(p.value)}\n    indicator:\n      bg_color: jp_ok   # jp_warn below ${p.warnAt}, jp_danger below ${p.dangerAt}\n- label: { x: ${r.x + r.w - 22}, y: ${r.y}, text: "${srcNum(p.value)}%", styles: jp_style_label }`; },
};

/* ---------------------------------------------------------------- wifi */
export interface WifiProps { rssi: Src; showValue: boolean }
const wifi: WidgetDef<WifiProps> = {
  id: "wifi", label: "Wi-Fi signal", description: "Four bars from RSSI (-90, -80, -70, -60 dBm).",
  size: (d) => fit(d, 56, 22),
  defaults: () => ({ rssi: { expr: "id(wifi_signal).state", sim: -62 }, showValue: true }),
  simulate: (p, t) => ({ ...p, rssi: withSim(p.rssi, sim(t, -70, 22, 0.5)) }),
  build(p, w, h) {
    const v = toN(p.rssi), out: Prim[] = [], bars = [-90, -80, -70, -60], bw = Math.max(3, Math.floor(h / 4)), gap = 2;
    bars.forEach((thr, i) => {
      const bh = Math.max(3, Math.round((h * (i + 1)) / 4)), x = i * (bw + gap), y = h - bh;
      out.push({ k: "if", cond: ge(v, K(thr)), then: [R(x, y, bw, bh, "text", true)], else: [R(x, y, bw, bh, "text")] });
    });
    if (p.showValue && w >= 50) out.push(T(w, Math.round((h - 12) / 2), 12, "muted", "r", "top", "%d", v));
    return out;
  },
  lvgl(p, r) { return `${comment("Wi-Fi", r)}\n- label:\n    x: ${r.x}\n    y: ${r.y}\n    text: "${srcNum(p.rssi)} dBm"\n    styles: jp_style_muted\n# LVGL has no signal glyph here: use a font with Wi-Fi icons, or the display lambda from this widget.`; },
};

/* -------------------------------------------------------------- status */
export interface StatusProps { label: string; state: Src; pill: boolean }
const STATE_TXT = ["OK", "WARN", "FAULT"];
const status: WidgetDef<StatusProps> = {
  id: "status", label: "Status dot / pill", description: "State 0 = ok, 1 = warn, 2 = danger; dot with label or a filled pill.",
  size: (d) => fit(d, 96, 24),
  defaults: () => ({ label: "Pump", state: { expr: "id(pump_state).state", sim: 0 }, pill: false }),
  simulate: (p, t) => ({ ...p, state: withSim(p.state, Math.floor(((t / 3) % 3 + 3) % 3)) }),
  build(p, w, h) {
    const v = toN(p.state), out: Prim[] = [], make = (ink: Role, txt: string): Prim[] => p.pill
      ? [R(0, 0, w, h, ink, true), T(w / 2, h / 2 - 6, 12, "bg", "c", "top", `${pctEsc(p.label)} ${txt}`)]
      : [{ k: "circle", cx: K(Math.round(Math.min(h, 24) / 2)), cy: K(Math.round(h / 2)), r: K(Math.max(3, Math.round(Math.min(h, 24) / 4))), ink, fill: true }, T(Math.min(h, 24) + 2, Math.round(h / 2) - 6, 12, "text", "l", "top", `${pctEsc(p.label)} ${txt}`)];
    out.push({ k: "if", cond: ge(v, K(2)), then: make("danger", STATE_TXT[2]), else: [{ k: "if", cond: ge(v, K(1)), then: make("warn", STATE_TXT[1]), else: make("ok", STATE_TXT[0]) }] });
    return out;
  },
  lvgl(p, r) { return `${comment("Status", r)}\n- led:\n    id: led_${p.label.toLowerCase().replace(/\W+/g, "_")}\n    x: ${r.x}\n    y: ${r.y}\n    color: jp_ok   # jp_warn / jp_danger via lvgl.led.update\n    brightness: 255\n- label: { x: ${r.x + 24}, y: ${r.y}, text: "${p.label}", styles: jp_style_label }`; },
};

/* --------------------------------------------------------------- clock */
export interface ClockProps { source: string; format: string; dateFormat: string }
const clock: WidgetDef<ClockProps> = {
  id: "clock", label: "Clock", description: "Time and date from an ESPHome time component.",
  size: (d) => fit(d, 160, 56),
  defaults: () => ({ source: "id(ha_time).now()", format: "%H:%M", dateFormat: "%a %d %b" }),
  simulate: (p) => p,
  build(p, w, h) {
    const hasDate = h >= 44, ts = fontFor(hasDate ? h * 0.56 : h * 0.8), out: Prim[] = [];
    out.push({ k: "time", x: K(0), y: K(0), size: ts, ink: "text", align: "l", va: "top", fmt: p.format, source: p.source });
    if (hasDate) out.push({ k: "time", x: K(0), y: K(ts + 2), size: 12, ink: "muted", align: "l", va: "top", fmt: p.dateFormat, source: p.source });
    return out;
  },
  lvgl(p, r) { return `${comment("Clock", r)}\n- label:\n    x: ${r.x}\n    y: ${r.y}\n    styles: jp_style_value\n    text: !lambda |-\n      return id(ha_time).now().strftime("${p.format}");`; },
};

/* ------------------------------------------------------------ humidity */
export interface HumidityProps { label: string; value: Src }
const humidity: WidgetDef<HumidityProps> = {
  id: "humidity", label: "Humidity drop", description: "Water drop filled to the humidity level, with the value beside it.",
  size: (d) => fit(d, 100, 80),
  defaults: () => ({ label: "Humidity", value: { expr: "id(humidity).state", sim: 58 } }),
  simulate: (p, t) => ({ ...p, value: withSim(p.value, sim(t, 55, 35, 0.5, 2)) }),
  build(p, w, h) {
    const v = toN(p.value), pad = 2, r = Math.max(4, Math.floor((h - pad * 2) / 2.9)), cx = pad + r + 2, out: Prim[] = [];
    out.push({ k: "drop", cx: K(cx), top: K(pad), r: K(r), level: frac(v, K(0), K(100)), ink: "info" });
    const x = cx + r + 6, vs = fontFor(Math.min(h * 0.4, (w - x) / 3.4));
    out.push(T(x, Math.round((h - vs) / 2) - (h >= 56 ? 6 : 0), vs, "text", "l", "top", "%d%%", v));
    const room = Math.floor((w - x) / 7.2);
    if (h >= 56 && room >= 4) out.push(T(x, Math.round((h - vs) / 2) + vs - 4, 12, "muted", "l", "top", pctEsc(p.label.slice(0, room))));
    return out;
  },
  lvgl(p, r) { return `${comment("Humidity", r)}\n- arc:\n    x: ${r.x}\n    y: ${r.y}\n    width: ${Math.min(r.w, r.h)}\n    height: ${Math.min(r.w, r.h)}\n    min_value: 0\n    max_value: 100\n    value: ${srcNum(p.value)}\n    adjustable: false\n    indicator:\n      arc_color: jp_info\n# LVGL has no drop shape: an arc stands in. Use the display lambda for the drop.`; },
};

/* ---------------------------------------------------------------- tank */
export interface TankProps { label: string; value: Src; unit: string }
const tank: WidgetDef<TankProps> = {
  id: "tank", label: "Level tank", description: "Tank outline with a liquid level, quarter marks and a value.",
  size: (d) => fit(d, 64, 120),
  defaults: () => ({ label: "Water", value: { expr: "id(tank_level).state", sim: 64 }, unit: "%" }),
  simulate: (p, t) => ({ ...p, value: withSim(p.value, sim(t, 50, 45, 0.35, 3)) }),
  build(p, w, h) {
    const v = toN(p.value), f = frac(v, K(0), K(100)), tw = w >= 44 ? Math.floor(w * 0.5) : w, ht = h - 2, out: Prim[] = [];
    out.push(R(0, 1, tw, ht, "text"));
    const len = mul(K(ht - 4), f);
    out.push(...byLow(v, 30, 15, (ink) => [{ k: "rect", x: K(2), y: sub(K(ht - 1), len), w: K(tw - 4), h: add(len, K(1)), ink, fill: ink === "ok" ? "hatch" : true } as Prim]));
    for (const q of [0.25, 0.5, 0.75]) out.push(Ln(tw, Math.round(ht - (ht - 4) * q), tw + 4, Math.round(ht - (ht - 4) * q), "muted"));
    if (w >= 56) out.push(T(tw + 7, w >= 88 ? 16 : 0, 12, "text", "l", "top", `%d${pctEsc(p.unit)}`, v));
    if (w >= 88) out.push(T(tw + 7, 0, 12, "muted", "l", "top", pctEsc(p.label)));
    return out;
  },
  lvgl(p, r) { return `${comment("Tank", r)}\n- bar:\n    x: ${r.x}\n    y: ${r.y}\n    width: ${Math.floor(r.w / 2)}\n    height: ${r.h}\n    min_value: 0\n    max_value: 100\n    value: ${srcNum(p.value)}\n    indicator:\n      bg_color: jp_info\n- label: { x: ${r.x + Math.floor(r.w / 2) + 6}, y: ${r.y}, text: "${p.label}", styles: jp_style_muted }`; },
};

/* ------------------------------------------------------------ segments */
export interface SegProps { label: string; value: Src; min: number; max: number; segments: number }
const segments: WidgetDef<SegProps> = {
  id: "segments", label: "Segmented progress", description: "A row of blocks, filled to the value (good for e-paper and OLED).",
  size: (d) => fit(d, 160, 24),
  defaults: () => ({ label: "Print", value: { expr: "id(progress).state", sim: 40 }, min: 0, max: 100, segments: 10 }),
  simulate: (p, t) => ({ ...p, value: withSim(p.value, ((t * 8) % 110)) }),
  build(p, w, h) {
    const v = toN(p.value), f = frac(v, K(p.min), K(p.max)), out: Prim[] = [], showLabel = h >= 26, bh = showLabel ? h - 16 : h;
    if (showLabel) { out.push(T(0, 0, 12, "muted", "l", "top", pctEsc(p.label))); out.push(T(w, 0, 12, "text", "r", "top", "%d%%", mul(f, K(100)))); }
    out.push({ k: "segs", x: 0, y: h - bh, w, h: bh, n: p.segments, count: mul(f, K(p.segments)), ink: "accent", off: "border" });
    return out;
  },
  lvgl(p, r) {
    const sw = Math.floor((r.w - (p.segments - 1) * 2) / p.segments), on = Math.round((srcNum(p.value) - p.min) / (p.max - p.min) * p.segments);
    const kids = Array.from({ length: p.segments }, (_, i) => `      - obj: { x: ${i * (sw + 2)}, y: 14, width: ${sw}, height: ${Math.max(6, r.h - 16)}, styles: ${i < on ? "jp_style_ok" : "jp_style_track"} }`).join("\n");
    return `${comment("Segments", r)}\n- obj:\n    x: ${r.x}\n    y: ${r.y}\n    width: ${r.w}\n    height: ${r.h}\n    widgets:\n      - label: { text: "${p.label}", styles: jp_style_muted }\n${kids}`;
  },
};

/* ---------------------------------------------------------------- pair */
export interface PairProps { label: string; a: { label: string; unit: string; value: Src; decimals: number }; b: { label: string; unit: string; value: Src; decimals: number } }
const pair: WidgetDef<PairProps> = {
  id: "pair", label: "Two-value tile", description: "Two readings side by side under one title (e.g. temperature and humidity).",
  size: (d) => fit(d, 160, 64),
  defaults: () => ({ label: "Living room", a: { label: "Temp", unit: "C", value: { expr: "id(temperature).state", sim: 22.4 }, decimals: 1 }, b: { label: "Hum", unit: "%", value: { expr: "id(humidity).state", sim: 58 }, decimals: 0 } }),
  simulate: (p, t) => ({ ...p, a: { ...p.a, value: withSim(p.a.value, sim(t, 22, 3, 0.5)) }, b: { ...p.b, value: withSim(p.b.value, sim(t, 56, 12, 0.4, 1)) } }),
  build(p, w, h) {
    const out: Prim[] = [], half = Math.floor(w / 2), showTitle = h >= 44, vs = fontFor(Math.min(h * (showTitle ? 0.4 : 0.7), (half - 8) / 3.4)), top = showTitle ? 16 : 0, vy = Math.round(top + (h - top - vs) / 2);
    if (h >= 36) out.push(R(0, 0, w, h, "border"));
    if (showTitle) out.push(T(6, 3, 12, "muted", "l", "top", pctEsc(p.label)));
    out.push(Ln(half, top + 4, half, h - 5, "border"));
    ([[p.a, 6], [p.b, half + 6]] as const).forEach(([x, ox]) => {
      out.push(T(ox, vy, vs, "text", "l", "top", `%.${x.decimals}f`, toN(x.value)));
      if (h >= 36) out.push(T(ox + textW(3 + (x.decimals ? 2 : 0), vs) + 2, vy + vs - 12, 12, "muted", "l", "top", pctEsc(x.unit)));
    });
    return out;
  },
  lvgl(p, r) { return `${comment("Two-value tile", r)}\n- obj:\n    x: ${r.x}\n    y: ${r.y}\n    width: ${r.w}\n    height: ${r.h}\n    styles: jp_style_card\n    widgets:\n      - label: { text: "${p.label}", styles: jp_style_muted, align: TOP_LEFT }\n      - label: { id: pair_a, text: "--", styles: jp_style_value, align: LEFT_MID }\n      - label: { id: pair_b, text: "--", styles: jp_style_value, align: RIGHT_MID }`; },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const WIDGETS: WidgetDef<any>[] = [dial, bar, tile, spark, thermo, battery, wifi, status, clock, humidity, tank, segments, pair];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getWidget = (id: string): WidgetDef<any> => { const w = WIDGETS.find((x) => x.id === id); if (!w) throw new Error(`unknown widget ${id}`); return w; };
