/** Annotation model and operations for the image annotator. Pure: no DOM. Coordinates are image pixels. */
import { bboxOfPts, clampPt, nearestEdge, polygonArea, round2, translatePts, type Bounds, type Box, type Pt } from "./geometry.ts";

export type Kind = "box" | "point" | "polygon" | "polyline";
export const KINDS: Kind[] = ["box", "point", "polygon", "polyline"];
/** `pts` holds: box = 2 opposite corners (top-left, bottom-right); point = 1; polygon >= 3; polyline >= 2. */
export type Ann = { id: string; kind: Kind; cls: string; note: string; pts: Pt[] };
export type ImageInfo = { name: string; w: number; h: number; url?: string };
export type Doc = { image: ImageInfo; classes: string[]; anns: Ann[] };

export const SAMPLE: ImageInfo = { name: "rack-front.svg", w: 640, h: 400 };
export const DEFAULT_CLASSES = ["Device", "Cable", "Fault", "Label"];
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_CLASSES = 40;

export const minPts = (k: Kind) => ({ box: 2, point: 1, polygon: 3, polyline: 2 })[k];
export const canResizeVertices = (k: Kind) => k === "polygon" || k === "polyline";
export const classIndex = (classes: string[], c: string) => Math.max(0, classes.indexOf(c));
export const nextId = (anns: Ann[]) => `a${anns.reduce((m, a) => Math.max(m, Number(a.id.slice(1)) || 0), 0) + 1}`;
export const bbox = (a: Ann): Box => bboxOfPts(a.pts);

/** Keep every vertex inside the image, order box corners, and keep boxes at least 2px in each direction. */
export function normalize(a: Ann, b: Bounds): Ann {
  let pts = a.pts.map((p) => clampPt(p, b));
  if (a.kind === "box" && pts.length === 2) {
    const [x1, x2] = [Math.min(pts[0][0], pts[1][0]), Math.max(pts[0][0], pts[1][0])], [y1, y2] = [Math.min(pts[0][1], pts[1][1]), Math.max(pts[0][1], pts[1][1])];
    const x2b = Math.min(b.w, Math.max(x2, x1 + 2)), y2b = Math.min(b.h, Math.max(y2, y1 + 2));
    pts = [[Math.min(x1, x2b - 2), Math.min(y1, y2b - 2)], [x2b, y2b]];
  }
  return { ...a, pts };
}
export const moveBy = (a: Ann, dx: number, dy: number, b: Bounds): Ann => ({ ...a, pts: translatePts(a.pts, dx, dy, b) });
export const setVertex = (a: Ann, i: number, p: Pt, b: Bounds): Ann => (i < 0 || i >= a.pts.length ? a : normalize({ ...a, pts: a.pts.map((q, j) => (j === i ? p : q)) }, b));

/** Insert a vertex after index `i` (polygon and polyline only). Defaults to the edge midpoint. */
export function insertVertex(a: Ann, i: number, p: Pt | undefined, b: Bounds): Ann {
  if (!canResizeVertices(a.kind)) return a;
  const n = a.pts.length; const idx = Math.max(0, Math.min(i, n - 1)); const cur = a.pts[idx];
  const next = a.pts[idx + 1] ?? (a.kind === "polygon" ? a.pts[0] : undefined);
  const at: Pt = p ?? (next ? [(cur[0] + next[0]) / 2, (cur[1] + next[1]) / 2] : [cur[0] + 20, cur[1] + 20]);
  return normalize({ ...a, pts: [...a.pts.slice(0, idx + 1), at, ...a.pts.slice(idx + 1)] }, b);
}
/** Remove vertex `i`, or null when that would leave too few vertices. */
export const removeVertex = (a: Ann, i: number): Ann | null => (!canResizeVertices(a.kind) || a.pts.length <= minPts(a.kind) || i < 0 || i >= a.pts.length ? null : { ...a, pts: a.pts.filter((_, j) => j !== i) });
/** Insert a vertex on the edge nearest to p (for double-click). */
export function insertOnNearestEdge(a: Ann, p: Pt, b: Bounds): { ann: Ann; index: number } | null {
  if (!canResizeVertices(a.kind)) return null; const e = nearestEdge(a.pts, p, a.kind === "polygon"); if (!e) return null;
  return { ann: insertVertex(a, e.index, e.point, b), index: e.index + 1 };
}
export const areaOf = (a: Ann): number => (a.kind === "box" ? (a.pts[1][0] - a.pts[0][0]) * (a.pts[1][1] - a.pts[0][1]) : a.kind === "polygon" ? polygonArea(a.pts) : 0);

/** A sensible starting shape centred on `c`, for the keyboard "Add ..." buttons. */
export function defaultShape(kind: Kind, c: Pt, b: Bounds, size = Math.min(b.w, b.h) / 5): Pt[] {
  const [x, y] = c; const s = size;
  const pts: Pt[] = kind === "box" ? [[x - s * 0.75, y - s / 2], [x + s * 0.75, y + s / 2]] : kind === "point" ? [[x, y]] : kind === "polygon" ? [[x, y - s / 2], [x + s * 0.6, y + s / 3], [x - s * 0.6, y + s / 3]] : [[x - s * 0.7, y + s / 4], [x, y - s / 4], [x + s * 0.7, y + s / 4]];
  return pts.map((p) => clampPt(p, b));
}

export const describe = (a: Ann) => { const bb = bbox(a); const where = `at ${Math.round(bb.x)}, ${Math.round(bb.y)}`; return `${a.cls} ${a.kind}${a.kind === "polygon" || a.kind === "polyline" ? `, ${a.pts.length} vertices` : ""} ${where}${a.note ? `: ${a.note}` : ""}`; };

export const SEED_ANNS: Ann[] = [
  { id: "a1", kind: "box", cls: "Device", note: "Core switch, 48 port", pts: [[70, 52], [300, 92]] },
  { id: "a2", kind: "box", cls: "Fault", note: "Amber fault LED on PSU", pts: [[70, 232], [300, 272]] },
  { id: "a3", kind: "point", cls: "Cable", note: "Unlabelled patch lead", pts: [[318, 152]] },
  { id: "a4", kind: "polyline", cls: "Cable", note: "Uplink run to the router", pts: [[340, 150], [420, 190], [500, 230], [600, 300]] },
  { id: "a5", kind: "polygon", cls: "Label", note: "Wall-mounted router", pts: [[470, 40], [600, 40], [600, 120], [470, 120]] },
];
export const seedDoc = (): Doc => ({ image: SAMPLE, classes: [...DEFAULT_CLASSES], anns: SEED_ANNS.map((a) => ({ ...a })) });

// ---------------------------------------------------------------- COCO

const flat = (pts: Pt[]) => pts.flatMap((p) => [round2(p[0]), round2(p[1])]);
const pairs = (v: number[]): Pt[] => { const out: Pt[] = []; for (let i = 0; i + 1 < v.length; i += 2) out.push([v[i], v[i + 1]]); return out; };

/** COCO-style JSON. Polygons and boxes carry `segmentation`; points use `keypoints`; polylines (not in COCO) are kept in `attributes.points`. */
export function toCoco(doc: Doc): string {
  const cat = (c: string) => doc.classes.indexOf(c) + 1;
  return JSON.stringify({
    info: { description: "Jupiter image annotation export", version: "1.0" },
    images: [{ id: 1, file_name: doc.image.name, width: doc.image.w, height: doc.image.h }],
    categories: doc.classes.map((name, i) => ({ id: i + 1, name })),
    annotations: doc.anns.map((a, i) => {
      const bb = bbox(a); const base = { id: i + 1, image_id: 1, category_id: cat(a.cls), bbox: [round2(bb.x), round2(bb.y), round2(bb.w), round2(bb.h)], area: round2(areaOf(a)), iscrowd: 0 };
      const attributes = { kind: a.kind, note: a.note, points: flat(a.pts) };
      if (a.kind === "box") { const [[x1, y1], [x2, y2]] = a.pts; return { ...base, segmentation: [[x1, y1, x2, y1, x2, y2, x1, y2]], attributes }; }
      if (a.kind === "polygon") return { ...base, segmentation: [flat(a.pts)], attributes };
      if (a.kind === "point") return { ...base, segmentation: [], keypoints: [a.pts[0][0], a.pts[0][1], 2], num_keypoints: 1, attributes };
      return { ...base, segmentation: [], attributes };
    }),
  }, null, 2);
}

export type Imported = { ok: true; classes: string[]; anns: Ann[]; image?: { name: string; w: number; h: number }; warnings: string[] } | { ok: false; error: string };
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const numArr = (v: unknown): v is number[] => Array.isArray(v) && v.every(isNum);

/** Read COCO-style JSON (our own export, or a plain COCO file with bbox/segmentation/keypoints). Points are clamped to `bounds`. */
export function fromCoco(text: string, bounds: Bounds): Imported {
  let j: unknown; try { j = JSON.parse(text); } catch { return { ok: false, error: "This is not valid JSON." }; }
  if (typeof j !== "object" || j === null || !Array.isArray((j as { annotations?: unknown }).annotations)) return { ok: false, error: "Expected a COCO object with an \"annotations\" array." };
  const o = j as { images?: { file_name?: unknown; width?: unknown; height?: unknown }[]; categories?: { id?: unknown; name?: unknown }[]; annotations: Record<string, unknown>[] };
  const warnings: string[] = []; const names = new Map<number, string>(); const classes: string[] = [];
  for (const c of o.categories ?? []) if (isNum(c.id) && typeof c.name === "string" && c.name.trim()) { names.set(c.id, c.name.trim()); if (!classes.includes(c.name.trim())) classes.push(c.name.trim()); }
  const im = o.images?.[0]; const image = im && typeof im.file_name === "string" && isNum(im.width) && isNum(im.height) && im.width > 0 && im.height > 0 ? { name: im.file_name, w: im.width, h: im.height } : undefined;
  const anns: Ann[] = [];
  o.annotations.forEach((r, i) => {
    const where = `annotation ${i + 1}`; const attr = (typeof r.attributes === "object" && r.attributes ? r.attributes : {}) as { kind?: unknown; note?: unknown; points?: unknown };
    let kind: Kind | null = null; let pts: Pt[] = [];
    if (typeof attr.kind === "string" && (KINDS as string[]).includes(attr.kind) && numArr(attr.points)) { kind = attr.kind as Kind; pts = pairs(attr.points); if (kind === "box" && pts.length === 4) pts = [pts[0], pts[2]]; }
    else if (Array.isArray(r.segmentation) && Array.isArray(r.segmentation[0]) && numArr(r.segmentation[0]) && r.segmentation[0].length >= 6) { kind = "polygon"; pts = pairs(r.segmentation[0] as number[]); }
    else if (numArr(r.keypoints) && r.keypoints.length >= 2) { kind = "point"; pts = [[r.keypoints[0], r.keypoints[1]]]; }
    else if (numArr(r.bbox) && r.bbox.length === 4) { kind = "box"; pts = [[r.bbox[0], r.bbox[1]], [r.bbox[0] + r.bbox[2], r.bbox[1] + r.bbox[3]]]; }
    if (!kind || pts.length < minPts(kind) || (kind === "box" && pts.length !== 2) || (kind === "point" && pts.length !== 1)) { warnings.push(`Skipped ${where}: no usable geometry.`); return; }
    const cls = (isNum(r.category_id) && names.get(r.category_id)) || "Unlabelled"; if (!classes.includes(cls)) classes.push(cls);
    anns.push({ id: "", kind, cls, note: typeof attr.note === "string" ? attr.note : "", pts });
  });
  return finish(classes, anns, bounds, warnings, image);
}

function finish(classes: string[], anns: Ann[], bounds: Bounds, warnings: string[], image?: { name: string; w: number; h: number }): Imported {
  let clamped = 0;
  const out = anns.map((a, i) => { const n = normalize({ ...a, id: `a${i + 1}` }, bounds); if (n.pts.some((p, k) => p[0] !== round2(a.pts[k][0]) || p[1] !== round2(a.pts[k][1]))) clamped++; return n; });
  if (clamped) warnings.push(`${clamped} annotation${clamped === 1 ? " was" : "s were"} moved to fit inside the image.`);
  if (image && (image.w !== bounds.w || image.h !== bounds.h)) warnings.push(`The file was made for a ${image.w} × ${image.h} image; the current image is ${bounds.w} × ${bounds.h}.`);
  return { ok: true, classes, anns: out, image, warnings };
}

// ---------------------------------------------------------------- CSV

export const CSV_HEADER = ["id", "kind", "class", "note", "x", "y", "w", "h", "points"];
const FORMULA = /^[=+@\t\r]/;
const esc = (v: string) => { const s = FORMULA.test(v) ? `'${v}` : v; return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s; };

/** One row per annotation. `x,y,w,h` is the bounding box; `points` is "x y;x y;..." (all kinds). Cells that start with = + @ are prefixed with ' so spreadsheets do not run them. */
export function toCsv(anns: Ann[]): string {
  const rows = anns.map((a) => { const b = bbox(a); return [a.id, a.kind, a.cls, a.note, b.x, b.y, b.w, b.h, a.pts.map((p) => `${round2(p[0])} ${round2(p[1])}`).join(";")].map((v) => esc(String(v))).join(","); });
  return [CSV_HEADER.join(","), ...rows].join("\r\n") + "\r\n";
}

export function parseCsv(text: string): string[][] | null {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let q = false; let any = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]; any = true;
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
    if (ch === '"' && cell === "") q = true; else if (ch === ",") { row.push(cell); cell = ""; } else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); cell = ""; if (row.length > 1 || row[0] !== "") rows.push(row); row = []; } else cell += ch;
  }
  if (q) return null;
  if (any && (cell !== "" || row.length)) { row.push(cell); rows.push(row); }
  return rows;
}

export function fromCsv(text: string, bounds: Bounds, knownClasses: string[]): Imported {
  const rows = parseCsv(text.replace(/^﻿/, "")); if (!rows || !rows.length) return { ok: false, error: "This is not a valid CSV file." };
  const head = rows[0].map((h) => h.trim().toLowerCase()); const col = (n: string) => head.indexOf(n);
  if (col("kind") < 0 || col("points") < 0) return { ok: false, error: "Expected a header row with at least \"kind\" and \"points\" columns." };
  const warnings: string[] = []; const classes = [...knownClasses]; const anns: Ann[] = [];
  rows.slice(1).forEach((r, i) => {
    const kind = r[col("kind")]?.trim() as Kind; const raw = r[col("points")] ?? "";
    const pts = raw.split(";").map((s) => s.trim().split(/\s+/).map(Number)).filter((p) => p.length === 2 && p.every(isNum)).map((p) => [p[0], p[1]] as Pt);
    if (!(KINDS as string[]).includes(kind) || pts.length < minPts(kind) || (kind === "box" && pts.length !== 2) || (kind === "point" && pts.length !== 1)) { warnings.push(`Skipped row ${i + 2}: invalid kind or points.`); return; }
    const cls = (col("class") >= 0 && r[col("class")]?.trim()) || "Unlabelled"; if (!classes.includes(cls)) classes.push(cls);
    const note = col("note") >= 0 ? (r[col("note")] ?? "").replace(/^'([=+@\t\r])/, "$1") : "";
    anns.push({ id: "", kind, cls, note, pts });
  });
  if (!anns.length && warnings.length) return { ok: false, error: warnings[0] };
  return finish(classes, anns, bounds, warnings);
}
