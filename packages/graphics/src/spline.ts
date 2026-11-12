// One continuous line: an ordered list of waypoints becomes ONE svg subpath (a single moveto).
//
// Waypoint string grammar (whitespace separated):
//   x,y                    smooth point: the line flows through it
//   x,y!                   corner: the line changes direction sharply here, without lifting
//   o(cx,cy,r,a0,sweep)    arc of a circle, a0 in degrees (0 = east, 90 = south: y points down),
//   o(cx,cy,rx,ry,a0,sweep)  positive sweep = clockwise on screen. Sweeps past 360 make loops.
//   s(cx,cy,r0,r1,a0,sweep)  spiral: like an arc, but the radius runs from r0 to r1. The curl.

export type Pt = { x: number; y: number; corner: boolean };

export function parse(src: string): Pt[] {
  const pts: Pt[] = [];
  for (const tok of src.trim().split(/\s+/)) {
    const arc = /^o\(([^)]+)\)(!?)$/.exec(tok);
    if (arc) {
      const n = arc[1].split(",").map(Number);
      if ((n.length !== 5 && n.length !== 6) || n.some(Number.isNaN)) throw new Error(`bad arc: ${tok}`);
      const [cx, cy, rx, ry, a0, sweep] = n.length === 5 ? [n[0], n[1], n[2], n[2], n[3], n[4]] : n;
      const steps = Math.max(2, Math.ceil(Math.abs(sweep) / 40));
      for (let i = 0; i <= steps; i++) {
        const a = ((a0 + (sweep * i) / steps) * Math.PI) / 180;
        pts.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a), corner: false });
      }
      if (arc[2]) pts[pts.length - 1].corner = true;
      continue;
    }
    const sp = /^s\(([^)]+)\)(!?)$/.exec(tok);
    if (sp) {
      const n = sp[1].split(",").map(Number);
      if (n.length !== 6 || n.some(Number.isNaN)) throw new Error(`bad spiral: ${tok}`);
      const [cx, cy, r0, r1, a0, sweep] = n;
      const steps = Math.max(2, Math.ceil(Math.abs(sweep) / 40));
      for (let i = 0; i <= steps; i++) {
        const a = ((a0 + (sweep * i) / steps) * Math.PI) / 180, rr = r0 + ((r1 - r0) * i) / steps;
        pts.push({ x: cx + rr * Math.cos(a), y: cy + rr * Math.sin(a), corner: false });
      }
      if (sp[2]) pts[pts.length - 1].corner = true;
      continue;
    }
    const m = /^(-?[\d.]+),(-?[\d.]+)(!?)$/.exec(tok);
    if (!m) throw new Error(`bad waypoint: ${tok}`);
    pts.push({ x: Number(m[1]), y: Number(m[2]), corner: m[3] === "!" });
  }
  // Shapes often end where the next begins: merge coincident waypoints (a corner wins).
  const out: Pt[] = [];
  for (const p of pts) {
    const q = out[out.length - 1];
    if (q && Math.hypot(p.x - q.x, p.y - q.y) < 0.35) q.corner ||= p.corner;
    else out.push(p);
  }
  if (out.length < 2) throw new Error("a line needs at least two waypoints");
  return out;
}

const r = (n: number) => String(Math.round(n * 100) / 100);

// Centripetal Catmull-Rom through each smooth run, emitted as cubic beziers. Corners split runs.
export function toPath(pts: Pt[]): string {
  let d = `M${r(pts[0].x)} ${r(pts[0].y)}`;
  let start = 0;
  for (let i = 1; i < pts.length; i++) {
    if (!pts[i].corner && i !== pts.length - 1) continue;
    const run = pts.slice(start, i + 1);
    start = i;
    if (run.length === 2) { d += `L${r(run[1].x)} ${r(run[1].y)}`; continue; }
    for (let k = 0; k < run.length - 1; k++) {
      const p0 = run[Math.max(0, k - 1)], p1 = run[k], p2 = run[k + 1], p3 = run[Math.min(run.length - 1, k + 2)];
      const dist = (a: Pt, b: Pt) => Math.sqrt(Math.hypot(b.x - a.x, b.y - a.y));
      const d1 = dist(p0, p1), d2 = dist(p1, p2), d3 = dist(p2, p3);
      const c1 = d1 < 1e-6 ? p1 : {
        x: (d1 * d1 * p2.x - d2 * d2 * p0.x + (2 * d1 * d1 + 3 * d1 * d2 + d2 * d2) * p1.x) / (3 * d1 * (d1 + d2)),
        y: (d1 * d1 * p2.y - d2 * d2 * p0.y + (2 * d1 * d1 + 3 * d1 * d2 + d2 * d2) * p1.y) / (3 * d1 * (d1 + d2)),
      };
      const c2 = d3 < 1e-6 ? p2 : {
        x: (d3 * d3 * p1.x - d2 * d2 * p3.x + (2 * d3 * d3 + 3 * d3 * d2 + d2 * d2) * p2.x) / (3 * d3 * (d3 + d2)),
        y: (d3 * d3 * p1.y - d2 * d2 * p3.y + (2 * d3 * d3 + 3 * d3 * d2 + d2 * d2) * p2.y) / (3 * d3 * (d3 + d2)),
      };
      d += `C${r(c1.x)} ${r(c1.y)} ${r(c2.x)} ${r(c2.y)} ${r(p2.x)} ${r(p2.y)}`;
    }
  }
  return d;
}

export function bounds(pts: Pt[]) {
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

// Reuse one drawing in several orientations: both return a plain waypoint string.
const show = (pts: Pt[]) => pts.map((p) => `${r(p.x)},${r(p.y)}${p.corner ? "!" : ""}`).join(" ");
export function rot(src: string, deg: number, cx = 24, cy = 24): string {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return show(parse(src).map((p) => ({ ...p, x: cx + (p.x - cx) * c - (p.y - cy) * s, y: cy + (p.x - cx) * s + (p.y - cy) * c })));
}
export const flip = (src: string, w = 48): string => show(parse(src).map((p) => ({ ...p, x: w - p.x })));
// Closed ring that alternates between two radii: sun rays (k = 1) or gear teeth (k = 2 points per level).
export function ring(cx: number, cy: number, r1: number, r2: number, n: number, k: 1 | 2 = 1, a0 = -90): string {
  const out: string[] = [];
  const step = 360 / (n * 2);
  for (let i = 0; i <= n * 2; i++) {
    const rr = i % 2 ? r2 : r1, mid = a0 + i * step;
    for (const a of k === 1 ? [mid] : [mid - step * 0.3, mid + step * 0.3]) {
      const t = (a * Math.PI) / 180;
      out.push(`${r(cx + rr * Math.cos(t))},${r(cy + rr * Math.sin(t))}!`);
    }
  }
  return out.join(" ");
}

// Technical subjects (hardware, diagrams) are easier to describe as ordinary line art: a set of edges
// that meet at shared points. trace() walks that network depth-first without lifting the pen, going out
// along each edge and back along the same curve, so the result is still one unbroken stroke.
// Each edge is a waypoint string; edges connect where their end points coincide.
export function trace(start: string, edges: string[]): string {
  const E = edges.map((e) => parse(e));
  const same = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y) < 0.7;
  const used = E.map(() => false);
  const origin = parse(`${start} -999,-999`)[0];
  const out: Pt[] = [{ ...origin, corner: true }];
  const walk = (at: Pt) => {
    for (let i = 0; i < E.length; i++) {
      if (used[i]) continue;
      const e = E[i];
      const seq = same(e[0], at) ? e : same(e[e.length - 1], at) ? [...e].reverse() : null;
      if (!seq) continue;
      used[i] = true;
      for (let k = 1; k < seq.length; k++) out.push({ ...seq[k], corner: k === seq.length - 1 || seq[k].corner });
      walk(seq[seq.length - 1]);
      for (let k = seq.length - 2; k >= 0; k--) out.push({ ...seq[k], corner: k === 0 || seq[k].corner });
    }
  };
  walk(origin);
  const missed = edges.filter((_, i) => !used[i]);
  if (missed.length) throw new Error(`trace: ${missed.length} edge(s) do not connect to ${start}: ${missed.join(" | ")}`);
  return show(out);
}
