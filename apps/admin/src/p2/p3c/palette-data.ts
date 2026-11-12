/* Sample colour data. User-chosen colours are data, not styles; this file holds the demo values. */
import type { GradientSpec } from "./colour.ts";
export type Swatch = { id: string; name: string; hex: string };
export const SWATCHES = ["#1f6feb", "#8250df", "#bf3989", "#cf222e", "#bc4c00", "#9a6700", "#1a7f37", "#0969da", "#24292f", "#57606a", "#8c959f", "#ffffff"];
export const DEFAULT_COLOUR = "#1f6feb";
export const BLACK = "#000000";
export const WHITE = "#ffffff";
export const DEFAULT_GRADIENT: GradientSpec = { kind: "linear", angle: 135, stops: [{ at: 0, hex: "#1f6feb" }, { at: 100, hex: "#8250df" }] };
export const START_PALETTE: Swatch[] = [{ id: "bg", name: "Background", hex: "#ffffff" }, { id: "surface", name: "Surface", hex: "#f1f3f5" }, { id: "text", name: "Text", hex: "#1c2024" }, { id: "muted", name: "Muted text", hex: "#8a9099" }, { id: "accent", name: "Accent", hex: "#2f6fdb" }, { id: "onaccent", name: "On accent", hex: "#ffffff" }, { id: "danger", name: "Danger", hex: "#d6453d" }];
