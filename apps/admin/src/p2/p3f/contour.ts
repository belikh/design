/** Maths for D068. Marching squares contours and an isometric wireframe projection. */
export type Seg = [number, number, number, number];
/** Contour segments at `level` on a grid field[row][col]; coordinates are in grid units (x = column, y = row), edge crossings linearly interpolated. */
export function marchingSquares(field: number[][], level: number): Seg[] {
  const segs: Seg[] = [], R = field.length, C = R ? field[0].length : 0;
  const lerp = (a: number, b: number) => (a === b ? 0.5 : (level - a) / (b - a));
  for (let y = 0; y < R - 1; y++) for (let x = 0; x < C - 1; x++) {
    const a = field[y][x], b = field[y][x + 1], c = field[y + 1][x + 1], d = field[y + 1][x];
    const code = (a >= level ? 8 : 0) | (b >= level ? 4 : 0) | (c >= level ? 2 : 0) | (d >= level ? 1 : 0);
    if (code === 0 || code === 15) continue;
    const top: [number, number] = [x + lerp(a, b), y], right: [number, number] = [x + 1, y + lerp(b, c)], bottom: [number, number] = [x + lerp(d, c), y + 1], left: [number, number] = [x, y + lerp(a, d)];
    const add = (p: [number, number], q: [number, number]) => segs.push([p[0], p[1], q[0], q[1]]);
    const centre = (a + b + c + d) / 4 >= level;
    switch (code) {
      case 1: case 14: add(left, bottom); break; case 2: case 13: add(bottom, right); break; case 3: case 12: add(left, right); break;
      case 4: case 11: add(top, right); break; case 6: case 9: add(top, bottom); break; case 7: case 8: add(left, top); break; case 5: if (centre) { add(left, top); add(bottom, right); } else { add(left, bottom); add(top, right); } break;
      case 10: if (centre) { add(left, bottom); add(top, right); } else { add(left, top); add(bottom, right); } break;
    }
  }
  return segs;
}
/** Join segments into polylines by matching end points (1e-6 tolerance). A closed contour has first point == last point. */
export function chainSegments(segs: Seg[]) {
  const key = (x: number, y: number) => `${Math.round(x * 1e6)},${Math.round(y * 1e6)}`, ends = new Map<string, number[]>();
  segs.forEach((s, i) => { for (const k of [key(s[0], s[1]), key(s[2], s[3])]) ends.set(k, [...(ends.get(k) ?? []), i]); });
  const used = new Set<number>(), lines: [number, number][][] = [];
  const next = (k: string) => (ends.get(k) ?? []).find((i) => !used.has(i));
  for (let i = 0; i < segs.length; i++) {
    if (used.has(i)) continue; used.add(i); const line: [number, number][] = [[segs[i][0], segs[i][1]], [segs[i][2], segs[i][3]]];
    for (const dir of [1, 0]) for (;;) { const p = dir ? line[line.length - 1] : line[0], j = next(key(p[0], p[1])); if (j === undefined) break; used.add(j); const s = segs[j], fwd = key(s[0], s[1]) === key(p[0], p[1]), q: [number, number] = fwd ? [s[2], s[3]] : [s[0], s[1]]; if (dir) line.push(q); else line.unshift(q); }
    lines.push(line);
  }
  return lines;
}
export const isClosed = (l: [number, number][]) => l.length > 3 && Math.abs(l[0][0] - l[l.length - 1][0]) < 1e-6 && Math.abs(l[0][1] - l[l.length - 1][1]) < 1e-6;
/** Isometric projection of grid point (x, y) with height z: screen x = (x - y)·cos30°, screen y = (x + y)·sin30° - z. */
export const iso = (x: number, y: number, z: number, sx = 1, sz = 1): [number, number] => [(x - y) * Math.cos(Math.PI / 6) * sx, (x + y) * Math.sin(Math.PI / 6) * sx - z * sz];
/** Wireframe polylines (rows then columns) of a height field, projected; every line has one vertex per grid point. */
export function surfaceLines(z: number[][], sx: number, sz: number) {
  const R = z.length, C = R ? z[0].length : 0, rows = z.map((r, y) => r.map((v, x) => iso(x, y, v, sx, sz))), cols = Array.from({ length: C }, (_, x) => z.map((r, y) => iso(x, y, r[x], sx, sz)));
  return { rows, cols };
}
/** Sample f over an n×n grid on [-1,1]². */
export const sampleField = (n: number, f: (x: number, y: number) => number) => Array.from({ length: n }, (_, j) => Array.from({ length: n }, (_, i) => f((2 * i) / (n - 1) - 1, (2 * j) / (n - 1) - 1)));
