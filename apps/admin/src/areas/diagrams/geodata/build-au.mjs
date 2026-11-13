#!/usr/bin/env node
// D059 geometry build. Run once (`node build-au.mjs [cacheDir]`), commit the output (au-states.json, au-lga.json).
// The app never fetches at runtime; this script is dev-time only.
//
// DATA SOURCES (retrieved 2026-11-13)
//  1. States and territories: Natural Earth 1:10m Admin 1 - States, Provinces (ne_10m_admin_1_states_provinces),
//     https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson
//     Licence: public domain (https://www.naturalearthdata.com/about/terms-of-use/).
//  2. Local government areas: ABS ASGS Edition 3, Local Government Areas 2021 (digital boundary), ArcGIS REST service
//     https://geo.abs.gov.au/arcgis/rest/services/ASGS2021/LGA/MapServer/0   (queried as GeoJSON, outSR=4326, maxAllowableOffset=0.01)
//     Licence: Creative Commons Attribution 4.0 International; attribution "(c) Australian Bureau of Statistics 2021".
//     Our file is a simplified, quantised derivative; it is not the official boundary.
//
// PIPELINE: download -> Douglas-Peucker (degrees) -> drop tiny islands (always keep each feature's largest ring)
//   (LGAs of a few km2 that vanish at this scale are kept as their bounding box) -> quantise to 0.01 degree (about 1.1 km) -> drop repeated points -> delta-encode ints per ring.
// Output ring format: [x0, y0, dx1, dy1, dx2, dy2, ...] in units of 0.01 degree (lon, lat); rings are implicitly closed.
// Projection is done at runtime (equirectangular for drawing, Albers equal-area for areas) so the files stay projection-free.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const cache = process.argv[2] ?? join(here, ".cache");
const NE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson";
const LGA = "https://geo.abs.gov.au/arcgis/rest/services/ASGS2021/LGA/MapServer/0/query?where=1%3D1&outFields=lga_code_2021,lga_name_2021,state_code_2021,area_albers_sqkm&outSR=4326&maxAllowableOffset=0.01&geometryPrecision=3&f=geojson&resultRecordCount=2000";
const Q = 100;

async function get(url, name) {
  const f = join(cache, name); await mkdir(cache, { recursive: true });
  if (!existsSync(f)) { const r = await fetch(url); if (!r.ok) throw new Error(`${url}: ${r.status}`); await writeFile(f, Buffer.from(await r.arrayBuffer())); }
  return JSON.parse(await readFile(f, "utf8"));
}
/** Douglas-Peucker on an open polyline (iterative). */
function dp(pts, tol) {
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1; const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let m = -1, md = tol; const [ax, ay] = pts[a], [bx, by] = pts[b]; const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) { const [px, py] = pts[i]; let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t)); const d = Math.hypot(px - ax - t * dx, py - ay - t * dy); if (d > md) { md = d; m = i; } }
    if (m > 0) { keep[m] = 1; st.push([a, m], [m, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const area = (r) => { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j][0] * r[i][1] - r[i][0] * r[j][1]; return a / 2; };
/** Ring simplification: split a closed ring at its two farthest-apart indices so DP has stable anchors. */
function simplifyRing(ring, tol) {
  const r = ring.slice(0, -1); if (r.length < 4) return null; let k = 0; for (let i = 1; i < r.length; i++) if (r[i][0] < r[k][0]) k = i;
  const rot = [...r.slice(k), ...r.slice(0, k)]; let far = 0, fd = -1; for (let i = 0; i < rot.length; i++) { const d = Math.hypot(rot[i][0] - rot[0][0], rot[i][1] - rot[0][1]); if (d > fd) { fd = d; far = i; } }
  const s = [...dp(rot.slice(0, far + 1), tol), ...dp([...rot.slice(far), rot[0]], tol).slice(1, -1)];
  return s.length >= 3 ? s : null;
}
const quant = (ring) => { const out = []; for (const [x, y] of ring) { const q = [Math.round(x * Q), Math.round(y * Q)]; const p = out[out.length - 1]; if (!p || p[0] !== q[0] || p[1] !== q[1]) out.push(q); } if (out.length > 1 && out[0][0] === out.at(-1)[0] && out[0][1] === out.at(-1)[1]) out.pop(); return out.length >= 3 ? out : null; };
const enc = (ring) => { const o = [ring[0][0], ring[0][1]]; for (let i = 1; i < ring.length; i++) o.push(ring[i][0] - ring[i - 1][0], ring[i][1] - ring[i - 1][1]); return o; };
/** Outer rings only (holes are dropped: the only large ones are enclaves such as Lesotho-style cases, none in Australia at this scale). */
function rings(geom, tol, minArea) {
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates; const outs = polys.map((p) => p[0]).sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)));
  const res = []; outs.forEach((o, i) => { if (i > 0 && Math.abs(area(o)) < minArea) return; const s = simplifyRing(o, tol); const q = s && quant(s); if (q && (i === 0 || Math.abs(area(q)) / (Q * Q) >= minArea / 2)) res.push(enc(q)); }); return res;
}
const centroid = (rs) => { let best = null; for (const r of rs) { let x = r[0], y = r[1]; const pts = [[x, y]]; for (let i = 2; i < r.length; i += 2) { x += r[i]; y += r[i + 1]; pts.push([x, y]); } const a = Math.abs(area(pts)); if (!best || a > best.a) { let cx = 0, cy = 0, s = 0; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const f = pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1]; cx += (pts[j][0] + pts[i][0]) * f; cy += (pts[j][1] + pts[i][1]) * f; s += f; } best = { a, c: s ? [cx / (3 * s), cy / (3 * s)] : pts[0] }; } } return best.c.map((v) => Math.round(v)); };

const STATES = { "AU-WA": "WA", "AU-NT": "NT", "AU-SA": "SA", "AU-QLD": "QLD", "AU-NSW": "NSW", "AU-VIC": "VIC", "AU-TAS": "TAS", "AU-ACT": "ACT" };
const ne = await get(NE, "ne_10m_admin_1.geojson");
const states = {};
for (const f of ne.features) {
  if (f.properties.admin !== "Australia") continue; const code = STATES[f.properties.iso_3166_2]; if (!code) continue; // drops Jervis Bay, Macquarie Island
  const rs = rings(f.geometry, code === "ACT" ? 0.003 : 0.02, code === "ACT" ? 0 : 0.01);
  // Lord Howe Island is tagged AU-NSW in Natural Earth; it is 600 km offshore and would stretch every map, so it is omitted.
  if (code === "NSW" && f.geometry.type === "Polygon" && f.geometry.coordinates[0].length < 60 && f.properties.name === "Lord Howe Island") continue;
  states[code] = states[code] ? { rings: [...states[code].rings, ...rs] } : { rings: rs };
}
const lgaSrc = await get(LGA, "abs_lga_2021_0p01.geojson");
const SC = { 1: "NSW", 2: "VIC", 3: "QLD", 4: "SA", 5: "WA", 6: "TAS", 7: "NT", 8: "ACT" };
const lgas = [];
for (const f of lgaSrc.features) {
  const p = f.properties, s = SC[p.state_code_2021]; if (!s || !f.geometry) continue; // drops Other Territories and No usual address
  let rs = rings(f.geometry, 0.02, 0.003);
  if (!rs.length) { // an LGA of a few km2 collapses at 0.01 degree: keep it as a small box around its bounding box so it still exists, is listed and can be selected
    const all = (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates).flatMap((q) => q[0]); const xs = all.map((q) => q[0] * Q), ys = all.map((q) => q[1] * Q);
    const x0 = Math.floor(Math.min(...xs)), x1 = Math.max(x0 + 1, Math.ceil(Math.max(...xs))), y0 = Math.floor(Math.min(...ys)), y1 = Math.max(y0 + 1, Math.ceil(Math.max(...ys)));
    rs = [enc([[x0, y0], [x1, y0], [x1, y1], [x0, y1]])];
  }
  lgas.push({ c: p.lga_code_2021, n: p.lga_name_2021.replace(/\s*\((NSW|Vic\.|Qld|SA|WA|Tas\.|NT|ACT|.{2,6}\.?)\)$/, ""), s, a: Math.round(p.area_albers_sqkm * 10) / 10, k: centroid(rs), r: rs });
}
lgas.sort((a, b) => a.c.localeCompare(b.c));
const meta = { source: { states: NE, lga: "https://geo.abs.gov.au/arcgis/rest/services/ASGS2021/LGA/MapServer/0" }, licence: { states: "Natural Earth, public domain", lga: "CC BY 4.0, (c) Australian Bureau of Statistics 2021" }, retrieved: "2026-11-13", unit: "0.01 degree, delta-encoded rings [x0,y0,dx,dy,...]" };
await writeFile(join(here, "au-states.json"), JSON.stringify({ meta, states }));
await writeFile(join(here, "au-lga.json"), JSON.stringify({ meta, lgas }));
console.log("states", Object.keys(states).length, "lgas", lgas.length);
