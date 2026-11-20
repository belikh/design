import type { Drawing } from "../tiers.ts";
import { trace } from "../spline.ts";

// Portable air conditioner from the product photo: rounded top corners, a tall louvred grille over a ledge,
// a plain lower panel, a carry grip recessed into the side, a drain outlet and castors. The side recedes
// towards the back edge with a slight perspective (top level, bottom rising). One unbroken stroke via trace().
const chain = (pts: string[]) => pts.slice(1).map((p, i) => `${pts[i]} ${p}`);
const xs = (y: number, list: number[]) => chain(list.map((x) => `${x},${y}`));
const ys = (x: number, list: number[]) => chain(list.map((y) => `${x},${y}`));

const louvres = [62, 69, 76, 83, 90, 97, 104, 111, 118];
const edges = [
  // front face: rounded top corners, sides, rim, grille, ledge, lower panel and base
  "o(60,56,6,180,90)", "o(120,56,6,270,90)", "60,50 120,50",
  ...ys(54, [56, 58, 138, 142, 212]), ...ys(126, [56, 58, 138, 142, 212]),
  ...xs(58, [54, ...louvres, 126]), ...xs(138, [54, ...louvres, 126]), ...xs(142, [54, 90, 126]),
  ...louvres.map((x) => `${x},58 ${x},138`),
  ...xs(212, [54, 70, 90, 102, 116, 126]),
  // the Home Assistant mark: a house hung from the ledge, with a three-node tree inside
  "90,142 76,156", "90,142 104,156", ...ys(76, [156, 170]), ...ys(104, [156, 170]), ...xs(170, [76, 90, 104]),
  "90,170 90,166", "90,166 90,163", "o(90,160,3,90,360)", "90,166 83.5,164", "90,166 96.5,164", "o(81,164,2.5,0,360)", "o(99,164,2.5,180,360)",
  // side face: top, rounded back corners, back edge, base
  "126,56 160,60", "o(160,66,6,270,90)", "o(160,184,6,0,90)",
  ...ys(166, [66, 116.5, 184]), "160,190 150,196.5", "150,196.5 126,212",
  // carry grip recessed into the side, with a bar running out to the back edge
  "141,110 153,110", "153,110 153,116.5", "153,116.5 153,123", "153,123 141,123", "141,123 141,110",
  "153,116.5 166,116.5",
  // castors and drain outlet
  ...ys(70, [212, 216]), "o(70,220,4,-90,360)", ...ys(116, [212, 216]), "o(116,220,4,-90,360)",
  "90,212 90,216", "90,216 102,216", "102,216 102,212",
  ...ys(150, [196.5, 202]), "o(150,205,3,-90,360)",
];

const body = trace("54,212", edges);
export const appliances: Drawing[] = [
  ["portable-aircon", "air conditioner portable cooling climate esphome appliance", `12,226 40,222 ${body}`],
];
