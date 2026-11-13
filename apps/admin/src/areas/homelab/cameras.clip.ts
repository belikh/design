import type { Clip, Zone, Kind } from "./cameras.data.ts";
import { inside, outline } from "./cameras.geo.ts";

/** A generated clip: no video exists, so the picture is a procedural scene with a deterministic moving object, derived from the clip's id and kind. */
export const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const rand = (seed: number, i: number) => { const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453; return x - Math.floor(x); };
const SIZE: Record<Kind, [number, number]> = { person: [7, 22], vehicle: [22, 13], animal: [9, 7], motion: [10, 10] };

/** Seconds during which the object moves (the "motion events"). Long clips pause in the middle. */
export function motionSegments(c: Pick<Clip, "durSec">): { from: number; to: number }[] {
  const d = c.durSec; return d >= 30 ? [{ from: d * 0.08, to: d * 0.45 }, { from: d * 0.55, to: d * 0.92 }] : [{ from: d * 0.1, to: d * 0.9 }];
}
export type Obj = { x: number; y: number; w: number; h: number; kind: Kind };
/** Object box (percent, top-left) at time t, or null when nothing is moving. */
export function objectAt(c: Pick<Clip, "id" | "durSec" | "kind">, t: number): Obj | null {
  if (!motionSegments(c).some((s) => t >= s.from && t <= s.to)) return null;
  const seed = hash(c.id), [w, h] = SIZE[c.kind], dir = seed % 2 ? 1 : -1, p = Math.min(1, Math.max(0, t / c.durSec)), y0 = 52 + rand(seed, 1) * 22;
  const cx = dir > 0 ? -5 + p * 110 : 105 - p * 110, cy = y0 + Math.sin(p * Math.PI * 2 * (1 + rand(seed, 2))) * 3 * (c.kind === "vehicle" ? 0.3 : 1);
  return { x: cx - w / 2, y: cy - h, w, h, kind: c.kind };
}
export type Hit = { state: "none" | "outside" | "detected" | "ignored"; zone: string };
/** Is the object's footprint (bottom centre) in a detect zone, an ignore zone, or neither? Ignore wins. */
export function classify(o: Obj | null, zones: Pick<Zone, "name" | "mode" | "enabled" | "x" | "y" | "w" | "h" | "shape" | "points">[]): Hit {
  if (!o) return { state: "none", zone: "" }; const p: [number, number] = [o.x + o.w / 2, o.y + o.h - 1]; const on = zones.filter((z) => z.enabled && inside(z, p));
  const ig = on.find((z) => z.mode === "Ignore"); if (ig) return { state: "ignored", zone: ig.name }; const de = on.find((z) => z.mode === "Detect"); return de ? { state: "detected", zone: de.name } : { state: "outside", zone: "" };
}
export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
export const describeFrame = (c: Pick<Clip, "label" | "kind">, o: Obj | null, hit: Hit, t: number, dur: number) => `${c.label} at ${mmss(t)} of ${mmss(dur)}: ${!o ? "no motion" : `${c.kind} ${hit.state === "detected" ? `detected in ${hit.zone}` : hit.state === "ignored" ? `ignored in ${hit.zone}` : "outside any zone"}`}`;

export type Palette = { bg: string; surface: string; line: string; text: string; accent: string; warn: string; ok: string; kind: Record<Kind, string>; detect: string; ignore: string; font: string };
/** Read colours from the design tokens so the canvas follows light/dark. Fallbacks are CSS keywords, not hex. */
export function readPalette(el: Element): Palette {
  const cs = getComputedStyle(el), v = (n: string, d: string) => cs.getPropertyValue(n).trim() || d;
  return { bg: v("--jp-surface", "gray"), surface: v("--jp-surface-raised", "silver"), line: v("--jp-border", "gray"), text: v("--jp-text", "currentColor"), accent: v("--jp-accent", "dodgerblue"), warn: v("--jp-warn", "orange"), ok: v("--jp-ok", "green"),
    kind: { person: v("--adm-c1", "dodgerblue"), vehicle: v("--adm-c2", "orange"), animal: v("--adm-c3", "teal"), motion: v("--adm-c4", "purple") }, detect: v("--adm-c1", "dodgerblue"), ignore: v("--adm-c5", "gray"), font: `${v("--jp-fs-xs", "0.75rem")} ${v("--jp-font-mono", "monospace")}` };
}
type Ctx = CanvasRenderingContext2D;
/** Draw frame t of a clip: scene, zones, motion trail, detection box, HUD. Pure function of its arguments, so scrubbing is exact. */
export function drawFrame(g: Ctx, W: number, H: number, c: Pick<Clip, "id" | "durSec" | "kind" | "label" | "startMin">, t: number, zones: Parameters<typeof classify>[1], pal: Palette, hhmm: string) {
  const seed = hash(c.id); g.clearRect(0, 0, W, H);
  const sky = g.createLinearGradient?.(0, 0, 0, H); if (sky) { sky.addColorStop(0, pal.bg); sky.addColorStop(1, pal.surface); g.fillStyle = sky; } else g.fillStyle = pal.bg; g.fillRect(0, 0, W, H);
  g.fillStyle = pal.surface; g.fillRect(0, H * 0.62, W, H * 0.38); g.strokeStyle = pal.line; g.lineWidth = 1; g.beginPath(); g.moveTo(0, H * 0.62); g.lineTo(W, H * 0.62); g.stroke();
  for (let i = 0; i < 4; i++) { const bw = W * (0.08 + rand(seed, 10 + i) * 0.1), bx = rand(seed, 20 + i) * (W - bw), bh = H * (0.15 + rand(seed, 30 + i) * 0.25); g.strokeStyle = pal.line; g.strokeRect(bx, H * 0.62 - bh, bw, bh); }
  const sx = W / 100, sy = H / 100;
  for (const z of zones) { if (!z.enabled) continue; const o = outline(z as never); g.beginPath(); o.forEach(([a, b], i) => (i ? g.lineTo(a * sx, b * sy) : g.moveTo(a * sx, b * sy))); g.closePath(); const col = z.mode === "Detect" ? pal.detect : pal.ignore; g.globalAlpha = 0.14; g.fillStyle = col; g.fill(); g.globalAlpha = 1; g.strokeStyle = col; g.setLineDash?.([6, 4]); g.stroke(); g.setLineDash?.([]); }
  const o = objectAt(c, t);
  if (o) { // trail: where the object was over the last 1.5 s
    g.strokeStyle = pal.kind[c.kind]; g.globalAlpha = 0.5; g.beginPath(); let started = false; for (let k = 1.5; k >= 0; k -= 0.25) { const q = objectAt(c, Math.max(0, t - k)); if (!q) continue; const px = (q.x + q.w / 2) * sx, py = (q.y + q.h) * sy; if (started) g.lineTo(px, py); else { g.moveTo(px, py); started = true; } } g.stroke(); g.globalAlpha = 1;
    g.fillStyle = pal.kind[c.kind]; g.globalAlpha = 0.35; g.fillRect(o.x * sx, o.y * sy, o.w * sx, o.h * sy); g.globalAlpha = 1;
    const hit = classify(o, zones); g.lineWidth = 2; g.strokeStyle = hit.state === "detected" ? pal.ok : hit.state === "ignored" ? pal.ignore : pal.warn; g.strokeRect(o.x * sx, o.y * sy, o.w * sx, o.h * sy);
    g.font = pal.font; g.fillStyle = pal.text; g.fillText(`${c.kind} ${hit.state === "detected" ? `in ${hit.zone}` : hit.state === "ignored" ? "(ignored)" : "outside zones"}`, o.x * sx, Math.max(12, o.y * sy - 6));
  }
  g.font = pal.font; g.fillStyle = pal.text; g.textBaseline = "top"; g.fillText(`${hhmm}  +${mmss(t)}`, 10, 8); g.fillStyle = pal.warn; g.beginPath(); g.arc(W - 16, 14, 4, 0, Math.PI * 2); g.fill(); g.fillStyle = pal.text; g.textBaseline = "alphabetic";
  g.fillText(o ? "MOTION" : "idle", W - 70, 18);
}
