// D057-D058: network hardware and building sensing maths.
export type Port = { n: number; kind: "rj45" | "sfp"; state: "up" | "down" | "disabled" | "error"; speed: number; poe: number; vlan: number; label: string };
/** Odd ports on the top row, even on the bottom (as on a real faceplate); SFP cages are numbered after the copper ports and sit on the right. */
export function faceplate(ports: Port[], cell: { w: number; h: number; gap: number }, groupGap = 10) {
  const cu = ports.filter((p) => p.kind === "rj45"), sfp = ports.filter((p) => p.kind === "sfp"); const pairs = Math.ceil(cu.length / 2);
  const out = cu.map((p) => { const i = Math.floor((p.n - 1) / 2); const g = Math.floor(i / 4); return { port: p, x: i * (cell.w + cell.gap) + g * groupGap, y: p.n % 2 ? 0 : cell.h + cell.gap, w: cell.w, h: cell.h }; });
  const x0 = pairs * (cell.w + cell.gap) + Math.floor((pairs - 1) / 4) * groupGap + groupGap;
  sfp.forEach((p, k) => out.push({ port: p, x: x0 + Math.floor(k / 2) * (cell.w + cell.gap), y: k % 2 ? cell.h + cell.gap : 0, w: cell.w, h: cell.h }));
  return { cells: out, width: Math.max(...out.map((c) => c.x + c.w)), height: cell.h * 2 + cell.gap };
}
export const poeUse = (ports: Port[], budget: number) => { const used = ports.reduce((a, p) => a + (p.state === "up" ? p.poe : 0), 0); return { used, budget, pct: budget ? used / budget : 0, remaining: budget - used }; };
export type Dev = { name: string; u: number; h: number; kind: string; watts: number }; // u = lowest unit occupied (1 = bottom)
export function rackModel(devs: Dev[], units = 42) {
  const occ = Array<string | null>(units + 1).fill(null); const conflicts: [string, string][] = []; const oob: string[] = [];
  for (const d of devs) { if (d.u < 1 || d.u + d.h - 1 > units) { oob.push(d.name); continue; } for (let k = d.u; k < d.u + d.h; k++) { if (occ[k]) conflicts.push([occ[k]!, d.name]); else occ[k] = d.name; } }
  const free: { from: number; to: number }[] = []; let s = 0; for (let u = 1; u <= units + 1; u++) { if (u <= units && !occ[u]) { if (!s) s = u; } else if (s) { free.push({ from: s, to: u - 1 }); s = 0; } }
  return { conflicts, oob, free, usedU: occ.slice(1).filter(Boolean).length, freeU: occ.slice(1).filter((x) => !x).length, watts: devs.reduce((a, d) => a + d.watts, 0) };
}
/* Wi-Fi channels */
export type Band = "2.4" | "5";
export const centreMHz = (band: Band, ch: number) => (band === "2.4" ? (ch === 14 ? 2484 : 2407 + 5 * ch) : 5000 + 5 * ch);
export type Bss = { ssid: string; band: Band; channel: number; width: 20 | 40 | 80; rssi: number };
export const span = (b: Bss) => { const c = centreMHz(b.band, b.channel); return [c - b.width / 2 - (b.band === "2.4" && b.width === 20 ? 1 : 0), c + b.width / 2 + (b.band === "2.4" && b.width === 20 ? 1 : 0)] as [number, number]; };
export const overlapMHz = (a: Bss, b: Bss) => { if (a.band !== b.band) return 0; const [a0, a1] = span(a), [b0, b1] = span(b); return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0)); };
/** Congestion score of a candidate channel = sum over other networks of overlap fraction × signal weight (stronger neighbours hurt more). Lower is better. */
export const congestion = (band: Band, ch: number, width: 20 | 40 | 80, others: Bss[]) => { const me: Bss = { ssid: "", band, channel: ch, width, rssi: 0 }; return others.reduce((a, o) => a + (overlapMHz(me, o) / width) * Math.max(0, (o.rssi + 100) / 70), 0); };
/** Signal grid: log-distance path loss with a fixed loss per wall crossed. */
export type AP = { id: string; x: number; y: number; tx: number };
export type Wall = [number, number, number, number];
export const segHit = (a: [number, number], b: [number, number], w: Wall) => { const [x1, y1] = a, [x2, y2] = b, [x3, y3, x4, y4] = w; const d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3); if (!d) return false; const t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d, u = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / d; return t > 0 && t < 1 && u >= 0 && u <= 1; };
export const rssiAt = (ap: AP, p: [number, number], walls: Wall[], o = { n: 3, wall: 7, ref: 40 }) => { const d = Math.max(1, Math.hypot(p[0] - ap.x, p[1] - ap.y)); return ap.tx - o.ref - 10 * o.n * Math.log10(d) - o.wall * walls.filter((w) => segHit([ap.x, ap.y], p, w)).length; };
export function signalGrid(cols: number, rows: number, cell: number, aps: AP[], walls: Wall[]) { return Array.from({ length: rows }, (_, j) => Array.from({ length: cols }, (_, i) => { const p: [number, number] = [(i + 0.5) * cell, (j + 0.5) * cell]; let best = -Infinity, id = ""; for (const ap of aps) { const v = rssiAt(ap, p, walls); if (v > best) { best = v; id = ap.id; } } return { rssi: best, ap: id }; })); }
export const rssiBand = (v: number) => (v >= -55 ? 0 : v >= -67 ? 1 : v >= -75 ? 2 : 3); // excellent, good, fair, poor
/* Occupancy */
export type Sample = { room: string; hour: number; people: number };
export function occupancy(samples: Sample[], capacity: Record<string, number>, rooms: string[]) {
  const sum = rooms.map(() => Array(24).fill(0)), n = rooms.map(() => Array(24).fill(0));
  for (const s of samples) { const r = rooms.indexOf(s.room); if (r < 0) continue; sum[r][s.hour] += s.people; n[r][s.hour]++; }
  return rooms.map((room, r) => sum[r].map((v, h) => (n[r][h] ? v / n[r][h] / capacity[room] : null)));
}
export const binEvents = (times: number[], bins: number, span: number) => { const c = Array(bins).fill(0); for (const t of times) { const b = Math.min(bins - 1, Math.max(0, Math.floor((t / span) * bins))); c[b]++; } return c as number[]; };
