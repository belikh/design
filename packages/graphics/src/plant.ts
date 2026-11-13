// A plant drawn from a seed (any string, such as a note id), a growth stage and a link count. Same inputs, same plant.
// It is a branching tree walked out and back with trace(), so the result is still ONE unbroken stroke on the spot canvas,
// like every other graphic in the set. Stage sets how far it grows; links set how branched and spread it is.
import { TIERS } from "./tiers.ts";
import { parse, toPath, trace, bounds } from "./spline.ts";

export type Stage = "seedling" | "budding" | "evergreen";
export type Plant = { id: string; tier: "spot"; name: string; tags: string[]; d: string };

const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const n1 = (n: number) => String(Math.round(n * 10) / 10);

const DEPTH: Record<Stage, number> = { seedling: 2, budding: 3, evergreen: 5 };
const TRUNK: Record<Stage, number> = { seedling: 66, budding: 74, evergreen: 70 };
const LEAF: Record<Stage, number> = { seedling: 9, budding: 6, evergreen: 3.6 };

function build(seed: string, stage: Stage, links: number, scale: number): string {
  const rand = rng(hash(seed));
  const t = TIERS.spot, bx = t.w / 2, by = t.h - 18;
  const spread = 0.34 + Math.min(Math.max(links, 0), 8) * 0.05;
  const edges: string[] = [`${n1(bx)},${n1(by)} ${n1(bx - 62 * scale)},${n1(by)}`, `${n1(bx)},${n1(by)} ${n1(bx + 62 * scale)},${n1(by)}`];
  const grow = (x: number, y: number, ang: number, len: number, depth: number) => {
    const x2 = x + Math.sin(ang) * len, y2 = y - Math.cos(ang) * len;
    // a slightly bowed branch: one smooth midpoint pushed sideways, so the line flows instead of ruling straight
    const bow = (rand() - 0.5) * 0.28 * len, mx = (x + x2) / 2 + Math.cos(ang) * bow, my = (y + y2) / 2 + Math.sin(ang) * bow;
    edges.push(`${n1(x)},${n1(y)} ${n1(mx)},${n1(my)} ${n1(x2)},${n1(y2)}`);
    if (depth >= DEPTH[stage]) {
      // a leaf: a small loop that starts and ends at the tip, so it is part of the same stroke
      const r = LEAF[stage] * scale, cx = x2 + Math.sin(ang) * r, cy = y2 - Math.cos(ang) * r;
      const a0 = (Math.atan2(Math.cos(ang), -Math.sin(ang)) * 180) / Math.PI;
      edges.push(`o(${n1(cx)},${n1(cy)},${n1(r)},${n1(a0)},360)`);
      return;
    }
    const k = depth === 0 ? 1 : 2 + (rand() < 0.25 ? 1 : 0);
    for (let i = 0; i < k; i++) {
      const lean = k === 1 ? (rand() - 0.5) * 0.3 : (i / (k - 1) - 0.5) * 2 * spread;
      grow(x2, y2, ang + lean + (rand() - 0.5) * 0.25, len * (0.7 + rand() * 0.1), depth + 1);
    }
  };
  grow(bx, by, 0, TRUNK[stage] * scale, 0);
  return trace(`${n1(bx)},${n1(by)}`, edges);
}

export function plant(seed: string, stage: Stage = "seedling", links = 0): Plant {
  const t = TIERS.spot;
  let scale = 1, src = build(seed, stage, links, scale);
  for (let i = 0; i < 8; i++) { // shrink until it sits inside the canvas padding
    const b = bounds(parse(src));
    if (b.minX >= t.pad && b.minY >= t.pad && b.maxX <= t.w - t.pad && b.maxY <= t.h - t.pad) break;
    scale *= 0.92; src = build(seed, stage, links, scale);
  }
  return { id: `spot-plant-${seed}`, tier: "spot", name: `plant-${seed}`, tags: ["plant", stage], d: toPath(parse(src)) };
}

/** Inline SVG markup, same attributes as svg() in the main module: one path, no fill, colour from the surrounding text. */
export function plantSvg(seed: string, stage: Stage = "seedling", links = 0, opts: { title?: string; class?: string } = {}): string {
  const p = plant(seed, stage, links), t = TIERS.spot;
  const a11y = opts.title ? `role="img" aria-label="${opts.title.replace(/[<>&"]/g, "")}"` : `aria-hidden="true"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t.w} ${t.h}" class="jp-line jp-line--spot${opts.class ? " " + opts.class : ""}" ${a11y}><path fill="none" stroke="currentColor" stroke-width="${t.stroke}" stroke-linecap="round" stroke-linejoin="round" pathLength="1" d="${p.d}"/></svg>`;
}
