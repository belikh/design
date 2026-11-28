// A contour map of linked things. Each item is a hill (its height says how developed or how important it is), links are dotted trails,
// and items can be placed by their links or by meaning (distance follows how alike their vectors are). It renders as plain SVG, so it works on the
// server and prints; items are real links. Computed once per input, deterministic for the same input.
import { useEffect, useMemo, useRef, useState } from "react";
import { graphic } from "@belikh/jupiter-graphics";
import { STAGE_HEIGHT, STAGE_ICON, type NoteStage } from "./stage.ts";
import "./styles/terrain.css";

export type TerrainKind = "note" | "project" | "repo" | "thing";
/** The icon each kind of item gets on the map unless the item names its own. */
export const TERRAIN_KIND_ICON: Record<TerrainKind, string> = { note: "icon-file", project: "icon-folder", repo: "icon-github", thing: "icon-cpu" };

/** How tall an item's hill is when it gives no height of its own and has no stage. */
export const TERRAIN_KIND_HEIGHT: Record<TerrainKind, number> = { note: 0.5, project: 0.75, repo: 0.5, thing: 0.4 };
const hillOf = (n: { height?: number; stage?: NoteStage; kind?: TerrainKind }) => n.height ?? (n.stage ? STAGE_HEIGHT[n.stage] : n.kind ? TERRAIN_KIND_HEIGHT[n.kind] : 0.5);

export type TerrainNode = {
  id: string; label: string; href?: string;
  /** 0 to 1: how tall the hill is (a project's activity). Leave out to take the height of the stage or the kind (TERRAIN_KIND_HEIGHT). */
  height?: number;
  /** What the item is. Each kind has one icon (TERRAIN_KIND_ICON) so a map reads the same in every project. */
  kind?: TerrainKind;
  /** A note's growth stage: its icon is the stage's, and the hill is the stage's height when `height` is left out. */
  stage?: NoteStage;
  /** An icon id from @belikh/jupiter-graphics, such as "icon-sprout", drawn on the hill. Overrides the icon of the stage and of the kind. */
  icon?: string;
  /** Fixed position as a fraction of the map (0 to 1). Leave out to let the layout place it. */
  x?: number; y?: number;
  /** Position on the narrow (phone) map, when it differs from x and y. Set by settleTerrain. */
  narrowX?: number; narrowY?: number;
  /** Show the label only while the item, or one linked to it, is hovered or focused. For maps with many items or long names. */
  quiet?: boolean;
  /** An embedding. When every item has one and layout is "meaning", distance on the map follows how unlike the vectors are. */
  vector?: number[];
};
export type TerrainProps = {
  nodes: TerrainNode[]; links?: [string, string][];
  /** "links": placed by their links. "meaning": by how alike their vectors are. "hub": the `focus` item in the middle and the rest around it (the map on one item's own page). */
  layout?: "links" | "meaning" | "hub";
  /** The item the map is about. It is drawn as the current page: not a link, `aria-current`. With layout "hub" it sits in the middle. */
  focus?: string;
  width?: number;
  /** Height of the wide map. Defaults to 460, or to a height that fits the items for a hub. */
  height?: number;
  /** Size of the map when its container is narrower than 40rem (a phone): the map is laid out again as a tall, narrow one so labels stay readable.
   *  Defaults to 360 wide and tall enough to keep the same room per item. */
  narrowWidth?: number; narrowHeight?: number;
  /** Name each kind of icon on the map under it. Only the icons that are drawn are listed. */
  legend?: boolean;
  /** Accessible name of the map. */ title?: string;
  /** Text under the map for people who cannot see it. Defaults to a count. */ summary?: string;
};

const CELL = 8, STEP = 0.1, CHAR = 6.4; // CHAR: width of one label character in map units (mono, 10 units tall)
const EDGES: Record<number, string> = { 1: "LB", 2: "BR", 3: "LR", 4: "TR", 5: "TLBR", 6: "TB", 7: "TL", 8: "TL", 9: "TB", 10: "TRLB", 11: "TR", 12: "LR", 13: "BR", 14: "LB" };
const hashInt = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const cos = (a: number[], b: number[]) => { let d = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; } return d / (Math.sqrt(x * y) || 1); };
const r1 = (n: number) => Math.round(n * 10) / 10;

type P = { x: number; y: number };

function layoutLinks(P: P[], edges: [number, number][], aspect: number, pin: boolean[]) {
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
    P.forEach((p, i) => { if (pin[i]) return; p.x = Math.min(0.94, Math.max(0.06, p.x + V[i][0] * cool * 8)); p.y = Math.min(0.9, Math.max(0.1, p.y + V[i][1] * cool * 8)); });
  }
}

/** Push items that sit too close apart, so their marks and labels do not collide. Labels are wide, so the minimum gap is wider than it is tall. */
function spread(P: P[], W: number, H: number, pin: boolean[]) {
  const minX = 120, minY = 46;
  for (let it = 0; it < 80; it++) {
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
      const dx = (P[j].x - P[i].x) * W, dy = (P[j].y - P[i].y) * H, ox = minX - Math.abs(dx), oy = minY - Math.abs(dy);
      if (ox <= 0 || oy <= 0) continue;
      // separate along the axis that needs the smaller move
      // a pinned item stays; the other one takes the whole move
      const wi = pin[i] ? 0 : pin[j] ? 2 : 1, wj = pin[j] ? 0 : pin[i] ? 2 : 1;
      if (oy / minY < ox / minX) { const m = (oy / 2 / H) * (dy < 0 ? -1 : 1); P[i].y -= m * wi; P[j].y += m * wj; }
      else { const m = (ox / 2 / W) * (dx < 0 ? -1 : 1); P[i].x -= m * wi; P[j].x += m * wj; }
    }
    P.forEach((p, i) => { if (pin[i]) return; p.x = Math.min(0.92, Math.max(0.08, p.x)); p.y = Math.min(0.86, Math.max(0.1, p.y)); });
  }
}

/** How much nearer two linked items sit than their text alone would put them (0.5: half the distance). A link says they belong together even when one of them,
 *  such as a project with a one-line summary, reads very differently from the other. LINK_WEIGHT makes that pair count for more than the many unlinked
 *  ones that push an outlier away, or the pull is lost in the crowd. */
const LINK_PULL = 0.4, LINK_WEIGHT = 8, MIN_GAP = 0.12;

/** Arrange by meaning: distance on the map follows 1 - cosine similarity, linked items are drawn nearer, then the cloud is scaled to fill the map. */
function layoutMeaning(P: P[], vecs: number[][], aspect: number, W: number, H: number, edges: [number, number][]) {
  const n = P.length, T = vecs.map((a, i) => vecs.map((b, j) => (i === j ? 0 : Math.max(MIN_GAP, 1 - cos(a, b)))));
  const W8 = vecs.map(() => vecs.map(() => 1));
  for (const [a, b] of edges) { T[a][b] = T[b][a] = Math.max(MIN_GAP, T[a][b] * LINK_PULL); W8[a][b] = W8[b][a] = LINK_WEIGHT; }
  for (let s = 0; s < 600; s++) {
    const cool = 1 - s / 600, V = P.map(() => [0, 0]);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const dx = (P[i].x - P[j].x) * aspect, dy = P[i].y - P[j].y, d = Math.hypot(dx, dy) + 1e-6, k = (d - T[i][j]) * Math.min(0.45, (0.9 * W8[i][j]) / n); // capped: a heavy link on a small map would overshoot
      V[i][0] -= ((k * dx) / d) / aspect; V[j][0] += ((k * dx) / d) / aspect; V[i][1] -= (k * dy) / d; V[j][1] += (k * dy) / d;
    }
    P.forEach((p, i) => { p.x += V[i][0] * cool; p.y += V[i][1] * cool; });
  }
  // fill the map: width and height are scaled separately (the map is abstract, so it need not keep its proportions)
  const xs = P.map((p) => p.x), ys = P.map((p) => p.y), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  P.forEach((p) => { p.x = 0.08 + (0.84 * (p.x - x0)) / Math.max(x1 - x0, 1e-6); p.y = 0.12 + (0.7 * (p.y - y0)) / Math.max(y1 - y0, 1e-6); });
  spread(P, W, H, P.map(() => false));
}

/** The hub layout: the focus item in the middle, the rest around it. One or two sit on a diagonal so their names never share a line on a narrow map;
 *  with many, every second one moves inward so their names do not collide. `i` counts the items around the focus. */
function hubPlace(i: number, count: number): P {
  if (count === 1) return { x: 0.6, y: 0.62 };
  if (count === 2) return i === 0 ? { x: 0.22, y: 0.3 } : { x: 0.78, y: 0.64 };
  const a = -Math.PI / 2 + (i / count) * 2 * Math.PI + (count % 2 ? 0 : Math.PI / count), r = count > 7 && (i + 1) % 2 === 0 ? 0.6 : 1;
  return { x: 0.5 + 0.36 * r * Math.cos(a), y: 0.48 + 0.3 * r * Math.sin(a) };
}
const HUB_CENTER = (count: number): P => (count === 1 ? { x: 0.4, y: 0.34 } : { x: 0.5, y: 0.48 });
/** Sizes that fit a hub: [wide height, narrow height]. */
export const hubSize = (around: number): [number, number] => {
  const few = around <= 2;
  return [few ? 200 : around > 7 ? 340 : 250, few ? 280 : Math.max(420, 140 + 56 * around)];
};

export function buildTerrain(nodes: TerrainNode[], links: [string, string][], W: number, H: number, layout: "links" | "meaning" | "hub", focus?: string) {
  const idx = new Map(nodes.map((n, i) => [n.id, i]));
  const edges: [number, number][] = [];
  for (const [a, b] of links) if (idx.has(a) && idx.has(b) && a !== b) edges.push([idx.get(a)!, idx.get(b)!]);
  const deg = nodes.map(() => 0); for (const [a, b] of edges) { deg[a]++; deg[b]++; }
  const aspect = W / H;
  const P: P[] = nodes.map((n) => ({ x: n.x ?? 0.15 + (hashInt(n.id) / 4294967296) * 0.7, y: n.y ?? 0.15 + (hashInt(n.id + "y") / 4294967296) * 0.7 }));
  const pin = nodes.map((n) => n.x !== undefined && n.y !== undefined);
  const fixed = pin.every(Boolean), hub = layout === "hub" && focus !== undefined && idx.has(focus);
  const meaning = !fixed && !hub && layout === "meaning" && nodes.length > 2 && nodes.every((n) => n.vector && n.vector.length);
  if (hub) {
    const f = idx.get(focus!)!, around = nodes.length - 1; let k = 0;
    nodes.forEach((n, i) => { if (pin[i]) return; Object.assign(P[i], i === f ? HUB_CENTER(around) : hubPlace(k++, around)); });
  } else if (!fixed) { if (meaning) layoutMeaning(P, nodes.map((n) => n.vector!), aspect, W, H, edges); else { layoutLinks(P, edges, aspect, pin); spread(P, W, H, pin); } }
  // a map settled by meaning keeps its broad hills even though its vectors are gone
  const U = Math.min(W, H), sigK = meaning || (fixed && layout === "meaning") ? 0.5 : 1;
  const cols = Math.ceil(W / CELL) + 2, rows = Math.ceil(H / CELL) + 2, g = new Float32Array(cols * rows);
  nodes.forEach((n, k) => {
    const sx = P[k].x * W, sy = P[k].y * H, sig = U * (0.07 + 0.009 * Math.min(deg[k], 8)) * sigK, R = sig * 3, A = hillOf(n) * (1 + 0.05 * Math.min(deg[k], 8));
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
  return { P, edges, deg, contours, meaning };
}

/** Height of the narrow map: the same area as the wide one, but never less than a 120 by 60 slot for every item. */
export const narrowSize = (count: number, narrowWidth: number, wideArea: number) =>
  Math.round(Math.max(wideArea / narrowWidth / 2, (count * 120 * 60) / (narrowWidth * 0.84) + 80));

const KIND_ORDER: TerrainKind[] = ["note", "project", "repo", "thing"], STAGE_ORDER: NoteStage[] = ["seedling", "budding", "evergreen"];
const KIND_WORD: Record<TerrainKind, string> = { note: "Note", project: "Project", repo: "Repository", thing: "Thing" };
/** The icons a map draws, with the word for each, in a stable order. */
export function legendOf(nodes: TerrainNode[]): { icon: string; word: string }[] {
  const out = new Map<string, { rank: number; word: string }>();
  nodes.forEach((n) => {
    if (n.icon) return;
    if (n.stage) out.set(STAGE_ICON[n.stage], { rank: 10 + STAGE_ORDER.indexOf(n.stage), word: n.stage[0].toUpperCase() + n.stage.slice(1) });
    else if (n.kind) out.set(TERRAIN_KIND_ICON[n.kind], { rank: KIND_ORDER.indexOf(n.kind), word: KIND_WORD[n.kind] });
  });
  return [...out].sort((a, b) => a[1].rank - b[1].rank).map(([icon, v]) => ({ icon, word: v.word }));
}

/** Lay the map out once, on the server, and keep only the result: every item gets its wide and narrow position and loses its vector, so the page
 *  does not ship embeddings only to repeat a layout. Give the same width, height and narrow size the component will get, and pass the `layout` that comes
 *  back to the component: it is "meaning" only when every item had a vector and the map really was placed by meaning. */
export function settleTerrain(nodes: TerrainNode[], links: [string, string][], o: { layout?: "links" | "meaning"; width?: number; height?: number; narrowWidth?: number; narrowHeight?: number } = {}): { nodes: TerrainNode[]; layout: "links" | "meaning" } {
  const { layout = "links", width = 1000, height = 460, narrowWidth = 360 } = o, narrowHeight = o.narrowHeight ?? narrowSize(nodes.length, narrowWidth, width * height);
  const wide = buildTerrain(nodes, links, width, height, layout), narrow = buildTerrain(nodes, links, narrowWidth, narrowHeight, layout);
  const r = (n: number) => Math.round(n * 1000) / 1000;
  return {
    layout: wide.meaning ? "meaning" : "links",
    nodes: nodes.map(({ vector: _v, ...n }, i) => ({ ...n, x: r(wide.P[i].x), y: r(wide.P[i].y), narrowX: r(narrow.P[i].x), narrowY: r(narrow.P[i].y) })),
  };
}

const NO_LINKS: [string, string][] = [];

export function Terrain({ nodes, links = NO_LINKS, layout = "links", focus, width: wideW = 1000, height: heightProp, narrowWidth = 360, narrowHeight, legend, title = "Map", summary }: TerrainProps) {
  const [hubWide, hubNarrow] = hubSize(nodes.length - 1), isHub = layout === "hub" && focus !== undefined;
  const wideH = heightProp ?? (isHub ? hubWide : 460);
  // The server and the first paint draw the wide map. Once mounted, a container narrower than 40rem gets the narrow one instead of a sideways scroll.
  const wrap = useRef<HTMLElement>(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = wrap.current; if (!el || typeof ResizeObserver === "undefined") return;
    const check = () => { const w = el.clientWidth, rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16; if (w > 0) setNarrow(w < 40 * rem); };
    check(); const ro = new ResizeObserver(check); ro.observe(el); return () => ro.disconnect();
  }, []);
  const width = narrow ? narrowWidth : wideW;
  const height = narrow ? narrowHeight ?? (isHub ? hubNarrow : narrowSize(nodes.length, narrowWidth, wideW * wideH)) : wideH;
  const placed = useMemo(() => (narrow ? nodes.map((n) => (n.narrowX !== undefined && n.narrowY !== undefined ? { ...n, x: n.narrowX, y: n.narrowY } : n)) : nodes), [nodes, narrow]);
  const t = useMemo(() => buildTerrain(placed, links, width, height, layout, focus), [placed, links, width, height, layout, focus]);
  const [hot, setHot] = useState<number | null>(null);
  const near = useMemo(() => { const s = new Set<number>(); if (hot !== null) { s.add(hot); for (const [a, b] of t.edges) { if (a === hot) s.add(b); if (b === hot) s.add(a); } } return s; }, [hot, t.edges]);
  // The drawn name and its box, from one place so the collision test and the drawing agree. A name too long for the map is cut with an ellipsis; aria-label keeps it whole.
  const place = (i: number) => {
    const max = Math.max(4, Math.floor((width - 16) / CHAR)), full = nodes[i].label, text = full.length > max ? full.slice(0, max - 1) + "…" : full;
    const w = text.length * CHAR, x = Math.min(Math.max(t.P[i].x * width - w / 2, 4), width - w - 4);
    return { text, x, y: t.P[i].y * height + 24, w };
  };
  // labels: most prominent first, skipping any that would overlap one already placed, or a dot (the hovered item always shows)
  const labels = useMemo(() => {
    const order = nodes.map((n, i) => ({ i, pri: hillOf(n) * 5 + t.deg[i] * 0.2 + (i === hot ? 100 : 0) + (near.has(i) ? 50 : 0) })).sort((a, b) => b.pri - a.pri);
    const placed: number[][] = nodes.map((_, i) => [t.P[i].x * width - 11, t.P[i].y * height - 11, t.P[i].x * width + 11, t.P[i].y * height + 11]), out = new Set<number>();
    for (const { i } of order) {
      if (nodes[i].quiet && i !== hot && !near.has(i)) continue;
      const { x, y, w } = place(i), box = [x - 4, y - 10, x + w + 4, y + 10];
      if (i !== hot && placed.some((q) => box[0] < q[2] && box[2] > q[0] && box[1] < q[3] && box[3] > q[1])) continue;
      placed.push(box); out.add(i);
    }
    return out;
  }, [nodes, t, hot, near, width, height]);

  return (
    <figure className="adm-terrain-wrap" ref={wrap}>
      <svg className={narrow ? "adm-terrain adm-terrain--narrow" : "adm-terrain"} viewBox={`0 0 ${width} ${height}`} role="group" aria-label={title}>
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
            const x = t.P[i].x * width, y = t.P[i].y * height, id = n.icon ?? (n.stage ? STAGE_ICON[n.stage] : n.kind ? TERRAIN_KIND_ICON[n.kind] : undefined), g = id ? graphic(id) : undefined;
            const body = (
              <>
                <circle cx={x} cy={y} r={11} className="adm-terrain__dot" />
                {g && <svg x={x - 8} y={y - 8} width={16} height={16} viewBox="0 0 48 48" aria-hidden="true"><path d={g.d} className="adm-terrain__icon" /></svg>}
                {labels.has(i) && <text x={place(i).x} y={y + 24} fontSize={10} className="adm-terrain__label">{place(i).text}</text>}
              </>
            );
            const cls = `adm-terrain__node${i === hot ? " is-hot" : hot !== null && !near.has(i) ? " is-dim" : ""}`;
            const on = { onMouseEnter: () => setHot(i), onMouseLeave: () => setHot(null), onFocus: () => setHot(i), onBlur: () => setHot(null) };
            return n.href && n.id !== focus
              ? <a key={n.id} href={n.href} className={cls} aria-label={n.label} {...on}>{body}</a>
              : <g key={n.id} className={cls} role="img" aria-label={n.label} aria-current={n.id === focus ? "page" : undefined} {...on}>{body}</g>;
          })}
        </g>
      </svg>
      {legend && (
        <ul className="adm-terrain__legend">
          {legendOf(nodes).map((l) => <li key={l.icon}><svg width={16} height={16} viewBox="0 0 48 48" aria-hidden="true"><path d={graphic(l.icon)!.d} className="adm-terrain__icon" /></svg>{l.word}</li>)}
        </ul>
      )}
      <figcaption className="adm-sr">{summary ?? `${title}: ${nodes.length} items, ${t.edges.length} links.`}</figcaption>
    </figure>
  );
}
