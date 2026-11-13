// A contour map of linked things. Each item is a hill (its height says how developed or how important it is), links are dotted trails,
// and items can be placed by their links or by meaning (distance follows how alike their vectors are). It renders as plain SVG, so it works on the
// server and prints; items are real links. Computed once per input, deterministic for the same input.
import { useMemo, useState } from "react";
import { graphic } from "@belikh/jupiter-graphics";
import "./styles/terrain.css";

export type TerrainNode = {
  id: string; label: string; href?: string;
  /** 0 to 1: how tall the hill is (a note's stage, a project's activity). */
  height: number;
  /** An icon id from @belikh/jupiter-graphics, such as "icon-sprout", drawn on the hill. */
  icon?: string;
  /** Fixed position as a fraction of the map (0 to 1). Leave out to let the layout place it. */
  x?: number; y?: number;
  /** An embedding. When every item has one and layout is "meaning", distance on the map follows how unlike the vectors are. */
  vector?: number[];
};
export type TerrainProps = {
  nodes: TerrainNode[]; links?: [string, string][];
  layout?: "links" | "meaning"; width?: number; height?: number;
  /** Accessible name of the map. */ title?: string;
  /** Text under the map for people who cannot see it. Defaults to a count. */ summary?: string;
};

const CELL = 8, STEP = 0.1, CHAR = 6.4; // CHAR: width of one label character in map units (mono, 10 units tall)
const EDGES: Record<number, string> = { 1: "LB", 2: "BR", 3: "LR", 4: "TR", 5: "TLBR", 6: "TB", 7: "TL", 8: "TL", 9: "TB", 10: "TRLB", 11: "TR", 12: "LR", 13: "BR", 14: "LB" };
const hashInt = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const cos = (a: number[], b: number[]) => { let d = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; } return d / (Math.sqrt(x * y) || 1); };
const r1 = (n: number) => Math.round(n * 10) / 10;

type P = { x: number; y: number };

function layoutLinks(P: P[], edges: [number, number][], aspect: number) {
  const N = P.length, want = Math.min(0.22, 1.5 / Math.sqrt(Math.max(N, 1)));
  for (let step = 0; step < 400; step++) {
    const cool = 1 - step / 400, V = P.map(() => [0, 0]);
    for (let i = 0; i < N; i++) {
      V[i][0] += (0.5 - P[i].x) * 0.01; V[i][1] += (0.5 - P[i].y) * 0.014;
      for (let j = i + 1; j < N; j++) {
        const dx = (P[i].x - P[j].x) * aspect, dy = P[i].y - P[j].y, d2 = dx * dx + dy * dy + 0.001, k = 0.0009 / d2;
        V[i][0] += (dx * k) / aspect; V[j][0] -= (dx * k) / aspect; V[i][1] += dy * k; V[j][1] -= dy * k;
      }
    }
    for (const [a, b] of edges) {
      const dx = (P[b].x - P[a].x) * aspect, dy = P[b].y - P[a].y, d = Math.hypot(dx, dy) + 1e-6, k = (d - want) * 0.03;
      V[a][0] += ((k * dx) / d) / aspect; V[b][0] -= ((k * dx) / d) / aspect; V[a][1] += (k * dy) / d; V[b][1] -= (k * dy) / d;
    }
    P.forEach((p, i) => { p.x = Math.min(0.94, Math.max(0.06, p.x + V[i][0] * cool * 8)); p.y = Math.min(0.9, Math.max(0.1, p.y + V[i][1] * cool * 8)); });
  }
}

/** Arrange by meaning: distance on the map follows 1 - cosine similarity, then the cloud is scaled to fill the map. */
function layoutMeaning(P: P[], vecs: number[][], aspect: number) {
  const n = P.length, T = vecs.map((a, i) => vecs.map((b, j) => (i === j ? 0 : Math.max(0.12, 1 - cos(a, b)))));
  for (let s = 0; s < 600; s++) {
    const cool = 1 - s / 600, V = P.map(() => [0, 0]);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const dx = (P[i].x - P[j].x) * aspect, dy = P[i].y - P[j].y, d = Math.hypot(dx, dy) + 1e-6, k = ((d - T[i][j]) * 0.9) / n;
      V[i][0] -= ((k * dx) / d) / aspect; V[j][0] += ((k * dx) / d) / aspect; V[i][1] -= (k * dy) / d; V[j][1] += (k * dy) / d;
    }
    P.forEach((p, i) => { p.x += V[i][0] * cool; p.y += V[i][1] * cool; });
  }
  const xs = P.map((p) => p.x * aspect), ys = P.map((p) => p.y), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const sc = Math.min((0.86 * aspect) / Math.max(x1 - x0, 1e-6), 0.74 / Math.max(y1 - y0, 1e-6)), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  P.forEach((p) => { p.x = 0.5 + ((p.x * aspect - cx) * sc) / aspect; p.y = 0.5 + (p.y - cy) * sc; });
}

export function buildTerrain(nodes: TerrainNode[], links: [string, string][], W: number, H: number, layout: "links" | "meaning") {
  const idx = new Map(nodes.map((n, i) => [n.id, i]));
  const edges: [number, number][] = [];
  for (const [a, b] of links) if (idx.has(a) && idx.has(b) && a !== b) edges.push([idx.get(a)!, idx.get(b)!]);
  const deg = nodes.map(() => 0); for (const [a, b] of edges) { deg[a]++; deg[b]++; }
  const aspect = W / H;
  const P: P[] = nodes.map((n) => ({ x: n.x ?? 0.15 + (hashInt(n.id) / 4294967296) * 0.7, y: n.y ?? 0.15 + (hashInt(n.id + "y") / 4294967296) * 0.7 }));
  const fixed = nodes.every((n) => n.x !== undefined && n.y !== undefined);
  const meaning = !fixed && layout === "meaning" && nodes.length > 2 && nodes.every((n) => n.vector && n.vector.length);
  if (!fixed) { if (meaning) layoutMeaning(P, nodes.map((n) => n.vector!), aspect); else layoutLinks(P, edges, aspect); }
  const U = Math.min(W, H), sigK = meaning ? 0.5 : 1;
  const cols = Math.ceil(W / CELL) + 2, rows = Math.ceil(H / CELL) + 2, g = new Float32Array(cols * rows);
  nodes.forEach((n, k) => {
    const sx = P[k].x * W, sy = P[k].y * H, sig = U * (0.07 + 0.009 * Math.min(deg[k], 8)) * sigK, R = sig * 3, A = n.height * (1 + 0.05 * Math.min(deg[k], 8));
    if (A < 0.002) return;
    for (let j = Math.max(0, Math.floor((sy - R) / CELL)); j <= Math.min(rows - 1, Math.ceil((sy + R) / CELL)); j++)
      for (let i = Math.max(0, Math.floor((sx - R) / CELL)); i <= Math.min(cols - 1, Math.ceil((sx + R) / CELL)); i++) {
        const dx = i * CELL - sx, dy = j * CELL - sy; g[j * cols + i] += A * Math.exp(-(dx * dx + dy * dy) / (2 * sig * sig));
      }
  });
  let max = 0; for (let i = 0; i < g.length; i++) if (g[i] > max) max = g[i];
  const contours: { d: string; index: boolean }[] = [];
  for (let lv = STEP, k = 1; lv < max; lv += STEP, k++) {
    let d = "";
    for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
      const a = g[j * cols + i], b = g[j * cols + i + 1], c = g[(j + 1) * cols + i + 1], dd = g[(j + 1) * cols + i];
      const code = (a > lv ? 8 : 0) | (b > lv ? 4 : 0) | (c > lv ? 2 : 0) | (dd > lv ? 1 : 0);
      if (code === 0 || code === 15) continue;
      const x0 = i * CELL, y0 = j * CELL;
      const pt: Record<string, [number, number]> = { T: [x0 + (CELL * (lv - a)) / (b - a), y0], R: [x0 + CELL, y0 + (CELL * (lv - b)) / (c - b)], B: [x0 + (CELL * (lv - dd)) / (c - dd), y0 + CELL], L: [x0, y0 + (CELL * (lv - a)) / (dd - a)] };
      const e = EDGES[code];
      for (let q = 0; q < e.length; q += 2) { const p1 = pt[e[q]], p2 = pt[e[q + 1]]; d += `M${r1(p1[0])} ${r1(p1[1])}L${r1(p2[0])} ${r1(p2[1])}`; }
    }
    if (d) contours.push({ d, index: k % 5 === 0 });
  }
  return { P, edges, deg, contours };
}

export function Terrain({ nodes, links = [], layout = "links", width = 1000, height = 460, title = "Map", summary }: TerrainProps) {
  const t = useMemo(() => buildTerrain(nodes, links, width, height, layout), [nodes, links, width, height, layout]);
  const [hot, setHot] = useState<number | null>(null);
  const near = useMemo(() => { const s = new Set<number>(); if (hot !== null) { s.add(hot); for (const [a, b] of t.edges) { if (a === hot) s.add(b); if (b === hot) s.add(a); } } return s; }, [hot, t.edges]);
  // labels: most prominent first, skipping any that would overlap one already placed (the hovered item always shows)
  const labels = useMemo(() => {
    const order = nodes.map((n, i) => ({ i, pri: n.height * 5 + t.deg[i] * 0.2 + (i === hot ? 100 : 0) + (near.has(i) ? 50 : 0) })).sort((a, b) => b.pri - a.pri);
    const placed: number[][] = [], out = new Set<number>();
    for (const { i } of order) {
      const w = nodes[i].label.length * CHAR + 8, x = Math.min(Math.max(t.P[i].x * width - w / 2, 4), width - w - 4), y = t.P[i].y * height + 24;
      const box = [x - 4, y - 10, x + w + 4, y + 10];
      if (i !== hot && placed.some((q) => box[0] < q[2] && box[2] > q[0] && box[1] < q[3] && box[3] > q[1])) continue;
      placed.push(box); out.add(i);
    }
    return out;
  }, [nodes, t, hot, near, width, height]);

  return (
    <figure className="adm-terrain-wrap">
      <svg className="adm-terrain" viewBox={`0 0 ${width} ${height}`} role="group" aria-label={title}>
        <g className="adm-terrain__contours" aria-hidden="true">
          {t.contours.map((c, i) => <path key={i} d={c.d} className={c.index ? "is-index" : undefined} />)}
        </g>
        <g className="adm-terrain__trails" aria-hidden="true">
          {t.edges.map(([a, b], i) => {
            const on = hot !== null && (a === hot || b === hot);
            return <line key={i} x1={t.P[a].x * width} y1={t.P[a].y * height} x2={t.P[b].x * width} y2={t.P[b].y * height} className={on ? "is-hot" : hot !== null ? "is-dim" : undefined} />;
          })}
        </g>
        <g className="adm-terrain__nodes">
          {nodes.map((n, i) => {
            const x = t.P[i].x * width, y = t.P[i].y * height, g = n.icon ? graphic(n.icon) : undefined;
            const body = (
              <>
                <circle cx={x} cy={y} r={11} className="adm-terrain__dot" />
                {g && <svg x={x - 8} y={y - 8} width={16} height={16} viewBox="0 0 48 48" aria-hidden="true"><path d={g.d} className="adm-terrain__icon" /></svg>}
                {labels.has(i) && <text x={Math.min(Math.max(x - (n.label.length * CHAR) / 2, 4), width - n.label.length * CHAR - 4)} y={y + 24} fontSize={10} className="adm-terrain__label">{n.label}</text>}
              </>
            );
            const cls = `adm-terrain__node${i === hot ? " is-hot" : hot !== null && !near.has(i) ? " is-dim" : ""}`;
            const on = { onMouseEnter: () => setHot(i), onMouseLeave: () => setHot(null), onFocus: () => setHot(i), onBlur: () => setHot(null) };
            return n.href
              ? <a key={n.id} href={n.href} className={cls} aria-label={n.label} {...on}>{body}</a>
              : <g key={n.id} className={cls} role="img" aria-label={n.label} {...on}>{body}</g>;
          })}
        </g>
      </svg>
      <figcaption className="adm-sr">{summary ?? `${title}: ${nodes.length} items, ${t.edges.length} links.`}</figcaption>
    </figure>
  );
}
