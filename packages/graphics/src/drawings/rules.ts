import type { Drawing } from "../tiers.ts";

// 480 x 48 grid. Set preserveAspectRatio="none" (the .jp-line--stretch class) to fill any measure.
const seq = (n: number, f: (i: number) => string) => Array.from({ length: n }, (_, i) => f(i)).join(" ");

export const rules: Drawing[] = [
  ["loop", "divider curl", "6,29 120,28 222,29 o(240,19,10,90,-360) 258,29 360,28 474,29"],
  ["loops", "divider triple curl", "6,31 150,31 o(200,22,9,90,-360) o(240,19,12,90,-360) o(280,22,9,90,-360) 330,31 474,31"],
  ["heart", "divider love thanks", "6,40 180,42 224,44 240,38 253,27 257,17 252,9 245,10 240,18! 235,10 228,9 223,17 227,27 240,38 256,44 300,42 474,40"],
  ["spirals", "divider scroll ends", "s(26,22,3,15,180,-450) 120,37 360,37 s(454,22,15,3,90,-450)"],
  ["swash", "flourish ornament calligraphy", "6,34 80,30 160,12 200,18 190,34 170,28 190,12 240,10 290,12 310,28 290,34 280,18 320,12 400,30 474,34"],
  ["vine", "divider leaves nature", `6,24 ${seq(7, (i) => { const x = 36 + i * 60, s = i % 2 ? -1 : 1; return `${x},24 ${x + 14},${24 - s * 12} ${x + 34},${24 - s * 17} ${x + 27},${24 - s * 5} ${x + 12},24`; })} 474,24`],
  ["wave", "divider water sine", seq(19, (i) => `${6 + i * 26},${i % 2 ? 14 : 34}`)],
  ["coil", "scribble spring loading", `6,30 ${seq(15, (i) => `o(${40 + i * 28},24,13,16,90,-300)`)} 474,30`],
  ["pulse", "divider heartbeat activity", "6,24 180,24! 196,8! 214,40! 232,8! 250,40! 268,8! 284,24! 474,24"],
  ["arrow", "direction next long", "6,24 440,24! 440,14! 472,24! 440,34! 440,24"],
  ["underline", "emphasis highlight heading", "8,22 120,16 300,14 462,17 472,22 460,26 300,25 150,28 60,35"],
  ["prompt", "heading underline terminal", "8,8 24,22! 10,35 20,41 60,40 474,40"],
  ["bracket", "corner frame section", "6,44 6,24! 474,24! 474,4"],
  ["end", "section end diamond finish", "6,24 222,24! 240,8! 258,24! 240,40! 222,24! 474,24"],
  ["circuit", "pcb trace node electronics", "o(14,34,8,0,360)! 90,34! 110,14! 200,14! 220,34! 292,34! o(300,34,8,180,540)! 380,34! 400,14! 454,14! o(462,14,8,180,360)"],
  ["signal", "noise radio network trace", `${seq(10, (i) => `${6 + i * 24},${i % 2 ? 12 : 36}`)} ${seq(17, (i) => `${240 + i * 14},${[24, 12, 30, 18, 38, 8, 28, 20, 40, 14, 26, 10, 34, 22, 36, 16, 30][i]}!`)} 474,24`],
];
