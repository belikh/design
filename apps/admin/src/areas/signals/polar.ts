/** Maths for D061 (radar, polar area, parallel coordinates) and D064 (wind rose, sun path). Angles are degrees clockwise from north (top). */
const rad = (d: number) => (d * Math.PI) / 180;
export const polarPoint = (cx: number, cy: number, r: number, deg: number): [number, number] => [cx + r * Math.sin(rad(deg)), cy - r * Math.cos(rad(deg))];
/** Radar polygon: axis i sits at 360*i/n; the radius is value/max of R (clamped to 0..1). */
export function radarVertices(values: number[], max: number | number[], cx: number, cy: number, R: number) {
  return values.map((v, i) => { const m = Array.isArray(max) ? max[i] : max; return polarPoint(cx, cy, R * Math.min(1, Math.max(0, m ? v / m : 0)), (360 * i) / values.length); });
}
export const ringPath = (pts: [number, number][]) => (pts.length ? `M${pts.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join("L")}Z` : "");
/** Polar-area wedges: equal angles, area proportional to value (radius ∝ √value). */
export function polarAreaWedges(values: number[], cx: number, cy: number, R: number) {
  const max = Math.max(...values, 0), n = values.length;
  return values.map((v, i) => {
    const r = max ? R * Math.sqrt(v / max) : 0, a0 = (360 * i) / n, a1 = (360 * (i + 1)) / n - 1, p0 = polarPoint(cx, cy, r, a0), p1 = polarPoint(cx, cy, r, a1);
    return { r, path: r ? `M${cx},${cy}L${p0[0]},${p0[1]}A${r},${r} 0 0 1 ${p1[0]},${p1[1]}Z` : "" };
  });
}
/** Normalise each dimension to 0..1 (min-max) for parallel coordinates; `invert` flips an axis where lower is better. */
export function parallelNormalise(rows: number[][], invert: boolean[] = []) {
  const dims = rows[0]?.length ?? 0, lo = Array.from({ length: dims }, (_, d) => Math.min(...rows.map((r) => r[d]))), hi = Array.from({ length: dims }, (_, d) => Math.max(...rows.map((r) => r[d])));
  return { lo, hi, rows: rows.map((r) => r.map((v, d) => { const t = hi[d] === lo[d] ? 0.5 : (v - lo[d]) / (hi[d] - lo[d]); return invert[d] ? 1 - t : t; })) };
}
export const COMPASS16 = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
/** Wind rose: bin samples into `dirs` compass sectors (centred on the sector) and speed classes. Frequencies sum to 100 (calm samples are kept in `calm`). */
export function windRose(samples: { dir: number; speed: number }[], speedEdges: number[], dirs = 16) {
  const bins = Array.from({ length: dirs }, () => speedEdges.map(() => 0)); let calm = 0;
  for (const s of samples) {
    if (s.speed < speedEdges[0]) { calm++; continue; }
    const d = Math.floor((((s.dir % 360) + 360) % 360 + 180 / dirs) / (360 / dirs)) % dirs; let k = speedEdges.length - 1; while (k > 0 && s.speed < speedEdges[k]) k--; bins[d][k]++;
  }
  const n = samples.length || 1;
  return { freq: bins.map((r) => r.map((c) => (100 * c) / n)), calm: (100 * calm) / n };
}
/** Solar declination in degrees for a day of the year (Cooper's approximation). */
export const declination = (doy: number) => 23.44 * Math.sin(rad((360 * (284 + doy)) / 365));
/** Sun altitude and azimuth (degrees, azimuth clockwise from north) at local solar `hour`. */
export function sunPosition(lat: number, doy: number, hour: number) {
  const d = rad(declination(doy)), phi = rad(lat), h = rad(15 * (hour - 12));
  const sinAlt = Math.sin(phi) * Math.sin(d) + Math.cos(phi) * Math.cos(d) * Math.cos(h), alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const cosAz = (Math.sin(d) - Math.sin(alt) * Math.sin(phi)) / (Math.cos(alt) * Math.cos(phi) || 1e-9), az0 = (Math.acos(Math.max(-1, Math.min(1, cosAz))) * 180) / Math.PI;
  return { alt: (alt * 180) / Math.PI, az: hour > 12 ? 360 - az0 : az0 };
}
/** Hourly sun path above the horizon for a day. */
export function sunPath(lat: number, doy: number, step = 0.5) {
  const pts: { hour: number; alt: number; az: number }[] = [];
  for (let h = 0; h <= 24; h += step) { const p = sunPosition(lat, doy, h); if (p.alt >= 0) pts.push({ hour: h, ...p }); }
  return pts;
}
/** Stereographic-style sky projection: zenith at the centre, horizon at radius R. */
export const skyPoint = (cx: number, cy: number, R: number, alt: number, az: number) => polarPoint(cx, cy, R * (1 - alt / 90), az);
