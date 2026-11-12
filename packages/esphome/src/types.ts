import type { N } from "./calc.ts";

export type Role = "bg" | "surface" | "border" | "text" | "muted" | "accent" | "onAccent" | "ok" | "warn" | "danger" | "info";
export type PaletteId = "colour" | "epaper3" | "epaper4" | "mono";
export interface Display { id: string; label: string; width: number; height: number; palette: PaletteId }
export interface Rect { x: number; y: number; w: number; h: number }
export type FontPx = 12 | 14 | 16 | 20 | 28 | 40;
export type Align = "l" | "c" | "r";
export type VAlign = "top" | "mid";

/** Drawing primitives: the intermediate form every renderer consumes. Coordinates are relative to the widget rect. */
export type Prim =
  | { k: "rect"; x: N; y: N; w: N; h: N; ink: Role; fill?: boolean | "hatch" }
  | { k: "line"; x1: N; y1: N; x2: N; y2: N; ink: Role }
  | { k: "circle"; cx: N; cy: N; r: N; ink: Role; fill?: boolean }
  | { k: "arc"; cx: N; cy: N; r: N; a0: N; a1: N; th: number; ink: Role }
  | { k: "text"; x: N; y: N; size: FontPx; ink: Role; align: Align; va: VAlign; fmt: string; args: N[] }
  | { k: "time"; x: N; y: N; size: FontPx; ink: Role; align: Align; va: VAlign; fmt: string; source: string }
  | { k: "spark"; x: number; y: number; w: number; h: number; data: number[]; expr: string; min: N; max: N; ink: Role }
  | { k: "drop"; cx: N; top: N; r: N; level: N; ink: Role }
  | { k: "segs"; x: number; y: number; w: number; h: number; n: number; count: N; ink: Role; off: Role }
  | { k: "if"; cond: N; then: Prim[]; else: Prim[] };

export interface WidgetDef<P> {
  id: string;
  label: string;
  description: string;
  /** Preferred size, clamped to the display. */
  size: (d: Display) => { w: number; h: number };
  defaults: (d: Display) => P;
  /** Update preview values for time `t` (seconds). Expressions are kept. */
  simulate: (p: P, t: number) => P;
  build: (p: P, w: number, h: number) => Prim[];
  lvgl: (p: P, r: Rect) => string;
}
