import type { Drawing } from "../tiers.ts";
import { ring, trace } from "../spline.ts";
import { box, xs, ys } from "./network.ts";

// One icon per part of the design system (48 x 48). The README table uses them.
const pins = [25, 31, 37];

export const packageIcons: Drawing[] = [
  // a hexagonal token with a value set in it
  ["tokens", "design variables values swatch json", "24,5! 40.5,14.5! 40.5,33.5! 24,43! 7.5,33.5! 7.5,14.5! 24,5! 24,16! 32,24! 24,32! 16,24! 24,16"],
  // a button with the pointer over it; the button edge stops behind the pointer
  ["ui", "components interface kit button pointer", trace("4,28", [
    "4,6 44,6", "4,6 4,28", "44,6 44,28", "4,28 22,28", "32,28 44,28",
    "22,28 22,18", "22,18 32,28", "22,28 22,38.4", "22,38.4 26.8,33.6! 30.4,42! 33.4,40.8! 29.8,33! 36.4,32.4! 32,28",
  ])],
  // a curve through one anchor, with its two handles
  ["graphics", "vector bezier curve pen illustration svg", trace("24,14", [
    "24,14 11,14", "o(8,14,3,0,360)", "24,14 37,14", "o(40,14,3,180,360)",
    "24,14 19,14.8 14,19 10.5,26 9,35", ...box(6, 35, 12, 41, { t: [9] }),
    "24,14 29,14.8 34,19 37.5,26 39,35", ...box(36, 35, 42, 41, { t: [39] }),
  ])],
  ["fonts", "type typography typeface letter text", "6,42 14,42! 10,42! 24,6! 38,42! 34,42! 42,42! 38,42! 32.17,27! 15.83,27"],
  // a window: title bar with two controls, and a sidebar
  ["app", "application window admin site layout", trace("4,40", [
    ...box(4, 8, 44, 40, { l: [18], r: [18], b: [22] }), ...xs(18, [4, 9, 16, 22, 44]),
    "o(9,15.5,2.5,90,360)", "o(16,15.5,2.5,90,360)", "22,18 22,40",
  ])],
  // the letter R inside a gear; its leg runs out to the ring
  ["rust", "language crate cargo", `16,35! 16,13! 25,13 o(25,18.5,5.5,270,180) 16,24! 23,24! ${ring(24, 24, 17.5, 21, 12, 2, 45)}`],
  // T, a lowered E and X, joined as in the TeX logo
  ["latex", "tex typesetting document pdf", trace("4,8", [
    "4,8 13,8", "13,8 22,8", "13,8 13,30", ...ys(22, [8, 16, 28, 40]),
    "22,16 30,16", "22,28 31,28", "22,40 31,40",
    "31,28 37.5,17", "37.5,17 44,6", "31,6 37.5,17", "37.5,17 44,28",
  ])],
  // a house with the pins of a microcontroller
  ["esphome", "iot firmware microcontroller esp32 home", trace("8,42", [
    "8,19 24,5", "24,5 40,19", ...ys(8, [19, ...pins, 42]), ...ys(40, [19, ...pins, 42]), "8,42 40,42",
    ...pins.flatMap((y) => [`8,${y} 3,${y}`, `40,${y} 45,${y}`]),
  ])],
  // a cat's head, body and tail
  ["github", "repository git hosting octocat", "5,31 8,35 13,38 19,38! 19,44! 19,33! 13,29 10,22 12,15 12,8! 18,11 24,10 30,11 36,8! 36,15 38,22 35,29 29,33! 29,44"],
];
