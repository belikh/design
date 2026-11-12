/** Maths for D062. A deterministic spiral word-cloud packer and tag-cloud size scale. */
export type CloudWord = { text: string; weight: number };
export type Placed = { text: string; size: number; x: number; y: number; w: number; h: number; rot: boolean };
/** Font size from weight on a log scale between min and max, so one huge term does not flatten the rest. */
export function sizeScale(weights: number[], min: number, max: number) {
  const lo = Math.log(Math.max(1, Math.min(...weights))), hi = Math.log(Math.max(1, Math.max(...weights)));
  return (w: number) => (hi === lo ? (min + max) / 2 : min + ((Math.log(Math.max(1, w)) - lo) / (hi - lo)) * (max - min));
}
/** Rough text box: average glyph width 0.58 em, line height 1.1 em (no DOM needed, so it is testable). */
export const measureWord = (text: string, size: number) => ({ w: Math.ceil(text.length * size * 0.58) + 4, h: Math.ceil(size * 1.1) });
const hit = (a: Placed, b: Placed) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
/** Place words largest first along an Archimedean spiral from the centre; a word is skipped (placed: false) when no free spot is found inside the box. Boxes never overlap. */
export function layoutCloud(words: CloudWord[], W: number, H: number, minSize = 12, maxSize = 44, pad = 2) {
  const scale = sizeScale(words.map((w) => w.weight), minSize, maxSize), done: Placed[] = [], skipped: string[] = [];
  for (const wd of [...words].sort((a, b) => b.weight - a.weight)) {
    const size = scale(wd.weight), m = measureWord(wd.text, size); let ok = false;
    for (let t = 0; t < 2400 && !ok; t++) {
      const ang = t * 0.35, rr = 1.6 * ang, x = W / 2 + rr * Math.cos(ang) * 1.5 - m.w / 2, y = H / 2 + rr * Math.sin(ang) - m.h / 2;
      const box: Placed = { text: wd.text, size, x, y, w: m.w + pad, h: m.h + pad, rot: false };
      if (x < 0 || y < 0 || x + box.w > W || y + box.h > H) continue;
      if (!done.some((d) => hit(d, box))) { done.push(box); ok = true; }
    }
    if (!ok) skipped.push(wd.text);
  }
  return { placed: done, skipped };
}
