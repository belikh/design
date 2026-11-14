import type { Drawing } from "../tiers.ts";
import { trace } from "../spline.ts";
import { box, xs } from "./network.ts";

// Logistics and dock operations (48 x 48). Side and front views drawn as edge networks, like the hardware icons.
const wheel = (x: number, y: number, r = 4.5) => `o(${x},${y},${r},270,360)`;

export const logisticsIcons: Drawing[] = [
  // rigid truck, side view, facing right: box body, cab, two wheels hanging from the chassis line
  ["truck", "lorry delivery vehicle freight prime mover", trace("4,32", [
    ...box(4, 9, 28, 32, { b: [12], r: [18] }),
    "28,18 35,18! 43,26! 44,32", "28,32 36,32", "36,32 44,32",
    wheel(12, 36.5), wheel(36, 36.5),
  ])],
  // semi-trailer on its own: box on a rear bogie, landing legs under the nose
  ["trailer", "semi container freight haulage", trace("3,29", [
    ...box(3, 9, 45, 29, { b: [9, 29, 40] }),
    "9,29 9,38", "5,38 9,38", "9,38 13,38",
    wheel(29, 33.5), wheel(40, 33.5),
  ])],
  // forklift, side view, facing right: counterweight, overhead guard, mast and forks
  ["forklift", "fork lift truck pallet jack warehouse", trace("5,32", [
    ...box(5, 22, 33, 32, { t: [15, 27], b: [11, 26], r: [27] }),
    "15,22 15,8", "15,8 27,8", "27,8 27,22",
    "33,27 36,27", "36,5 36,27", "36,27 36,40", "36,40 45,40",
    wheel(11, 36.5), wheel(26, 36.5),
  ])],
  // pallet with two cartons stacked on the deck
  ["pallet", "skid crate cartons stock goods", trace("4,31", [
    ...box(4, 31, 44, 35, { t: [6, 22, 40], b: [11, 20, 28, 37] }),
    "4,35 4,40! 11,40! 11,35", "20,35 20,40! 28,40! 28,35", "37,35 37,40! 44,40! 44,35",
    "6,31 6,20! 22,20", "22,20 22,10! 40,10! 40,31", "22,20 22,31",
  ])],
  // loading dock, front view: roller door, bumpers either side, leveller pit under the door
  ["dock", "loading bay door warehouse leveller bumper", trace("8,6", [
    ...box(8, 6, 40, 32, { b: [14, 34], l: [13, 19, 25], r: [13, 19, 25] }), ...xs(13, [8, 40]), ...xs(19, [8, 40]), ...xs(25, [8, 40]),
    "8,32 3,32", "40,32 45,32", "3,32 3,42! 9,42! 9,32", "45,32 45,42! 39,42! 39,32",
    "14,32 14,37! 34,37! 34,32",
  ])],
  // boom gate: post housing, lowered striped arm, rest post
  ["gate", "boom barrier entry access yard", trace("4,42", [
    ...box(4, 16, 14, 42, { r: [22, 28] }),
    ...xs(22, [14, 22, 32, 44]), ...xs(28, [14, 18, 28, 40, 44]), "44,22 44,28",
    "22,22 18,28", "32,22 28,28",
    "40,28 40,42", "36,42 40,42", "40,42 44,42",
  ])],
  // cable seal: a hang tag with a barcode strip and the cable loop through its hole
  ["seal", "tag bolt cable tamper security container", trace("13,44", [
    "13,44 13,22", "13,22 20,13", "20,13 24,13", "24,13 28,13", "28,13 35,22", "35,22 35,44",
    ...xs(44, [13, 18, 24, 30, 35]),
    "o(24,7.5,5.5,90,360)", "24,13 24,17.5", "o(24,20,2.5,270,360)",
    "18,44 18,34", "24,44 24,34", "30,44 30,34",
  ])],
];
