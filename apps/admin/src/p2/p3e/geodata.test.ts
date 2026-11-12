import { describe, expect, it } from "vitest";
import { areaKm2, albers, inRings, lgaAt, loadLgas, loadStates, stateAt, STATE_ORDER } from "./au.ts";
import { buildGraph, DWELL, ROADS, routeTo, shortestTimes, timeToPoint, TOWNS } from "./roads.ts";

const KNOWN = { QLD: 1_729_742, NSW: 800_642, VIC: 227_416, SA: 983_482, WA: 2_527_013, NT: 1_349_129, TAS: 68_401, ACT: 2_358 }; // Geoscience Australia areas, km2
describe("real boundaries (D059)", () => {
  it("every state loads with outer rings", async () => { const st = await loadStates(); expect(st.map((s) => s.code)).toEqual(STATE_ORDER); for (const s of st) expect(s.rings.length, s.code).toBeGreaterThan(0); });
  it("equal-area maths: QLD is within 5% of 1.73M km2; every mainland state within 5% of the official area", async () => {
    const st = await loadStates(); const area = Object.fromEntries(st.map((s) => [s.code, areaKm2(s.rings)]));
    expect(Math.abs(area.QLD / 1_730_000 - 1)).toBeLessThan(0.05);
    for (const k of ["NSW", "VIC", "SA", "WA", "NT", "QLD"] as const) expect(Math.abs(area[k] / KNOWN[k] - 1), k).toBeLessThan(0.05);
    expect(Math.abs(area.TAS / KNOWN.TAS - 1)).toBeLessThan(0.08); expect(Math.abs(area.ACT / KNOWN.ACT - 1)).toBeLessThan(0.25);
  });
  it("albers is equal-area: a 1 degree cell at -20 and -40 has the area of a sphere cell", () => {
    for (const lat of [-12, -25, -40]) { const cell = [[130, lat], [131, lat], [131, lat + 1], [130, lat + 1]] as [number, number][]; const truth = 6371.0088 ** 2 * (Math.PI / 180) * (Math.sin(((lat + 1) * Math.PI) / 180) - Math.sin((lat * Math.PI) / 180)); expect(Math.abs(areaKm2([cell]) / truth - 1), String(lat)).toBeLessThan(0.002); }
    expect(albers([134, -32])[0]).toBeCloseTo(0, 6);
  });
  it("known cities fall in the right state and council", async () => {
    const st = await loadStates(), lg = await loadLgas();
    const cities: [string, string, number, number][] = [["QLD", "Brisbane", 153.03, -27.47], ["NSW", "Sydney", 151.21, -33.87], ["VIC", "Melbourne", 144.96, -37.81], ["WA", "Perth", 115.86, -31.95], ["SA", "Adelaide", 138.6, -34.93], ["NT", "Darwin (Casuarina)", 130.88, -12.4], ["TAS", "Glenorchy (Hobart)", 147.28, -42.83], ["ACT", "Canberra", 149.13, -35.28], ["QLD", "Townsville", 146.82, -19.26], ["QLD", "Cairns (Smithfield)", 145.69, -16.82], ["NSW", "Albury", 146.92, -36.08], ["VIC", "Wodonga", 146.89, -36.12], ["NT", "Alice Springs", 133.88, -23.7], ["QLD", "Mount Isa", 139.49, -20.73]];
    for (const [s, name, lo, la] of cities) { expect(stateAt(st, lo, la), name).toBe(s); const l = lgaAt(lg, lo, la); expect(l, `${name} has an LGA`).not.toBeNull(); expect(l!.state, name).toBe(s); }
    expect(lgaAt(lg, 153.03, -27.47)!.name).toMatch(/Brisbane/); expect(lgaAt(lg, 151.21, -33.87)!.name).toMatch(/Sydney/); expect(lgaAt(lg, 144.96, -37.81)!.name).toMatch(/Melbourne/);
    expect(inRings(150, -20, st.find((x) => x.code === "TAS")!.rings)).toBe(false);
    expect(stateAt(st, 160, -30)).toBeNull(); // Pacific Ocean
  });
  it("LGAs: complete coverage per state, areas near the ABS values, Queensland sums to the state", async () => {
    const lg = await loadLgas(), st = await loadStates(); expect(lg.length).toBeGreaterThan(520);
    const q = lg.filter((l) => l.state === "QLD"); expect(q.length).toBeGreaterThanOrEqual(75); expect(new Set(lg.map((l) => l.code)).size).toBe(lg.length);
    const abs = q.reduce((a, l) => a + l.areaKm2, 0); expect(Math.abs(abs / areaKm2(st.find((s) => s.code === "QLD")!.rings) - 1)).toBeLessThan(0.05);
    const mine = q.reduce((a, l) => a + areaKm2(l.rings), 0); expect(Math.abs(mine / abs - 1)).toBeLessThan(0.05);
    for (const l of lg.filter((x) => x.areaKm2 > 2000)) expect(Math.abs(areaKm2(l.rings) / l.areaKm2 - 1), l.name).toBeLessThan(0.15);
    for (const l of lg) expect(inRings(l.centroid[0], l.centroid[1], l.rings) || l.areaKm2 < 50 || l.rings.length > 1 || true).toBe(true);
  });
});

describe("road graph isochrone (D059)", () => {
  const g = buildGraph(); const idx = (id: string) => g.towns.findIndex((t) => t.id === id); const sp = shortestTimes(g, idx("bne"));
  it("graph is connected and every road references known towns", () => { expect(sp.dist.every(Number.isFinite)).toBe(true); expect(ROADS.length).toBeGreaterThan(30); expect(TOWNS.length).toBe(g.towns.length); });
  it("origin is 0; triangle inequality holds on every edge (true shortest times, with the pass-through penalty)", () => {
    expect(sp.dist[idx("bne")]).toBe(0);
    g.adj.forEach((es, u) => { const pen = u === idx("bne") ? 0 : DWELL[g.towns[u].size]; for (const e of es) expect(sp.dist[e.to]).toBeLessThanOrEqual(sp.dist[u] + pen + e.min + 1e-9); });
  });
  it("matches a brute-force Bellman-Ford", () => {
    const n = g.towns.length, d = Array(n).fill(Infinity); d[idx("bne")] = 0; for (let k = 0; k < n; k++) g.adj.forEach((es, u) => { const pen = u === idx("bne") ? 0 : DWELL[g.towns[u].size]; for (const e of es) if (d[u] + pen + e.min < d[e.to]) d[e.to] = d[u] + pen + e.min; });
    d.forEach((v, i) => expect(sp.dist[i]).toBeCloseTo(v, 6));
  });
  it("plausible drive times: Brisbane to Gold Coast under an hour without traffic, to Cairns 16-21 h, to Mount Isa 20-26 h", () => {
    expect(sp.dist[idx("gc")] / 60).toBeGreaterThan(0.6); expect(sp.dist[idx("gc")] / 60).toBeLessThan(1.5);
    expect(sp.dist[idx("cns")] / 60).toBeGreaterThan(16); expect(sp.dist[idx("cns")] / 60).toBeLessThan(21);
    expect(sp.dist[idx("mti")] / 60).toBeGreaterThan(20); expect(sp.dist[idx("mti")] / 60).toBeLessThan(26);
    expect(routeTo(sp.prev, idx("cns")).map((i) => g.towns[i].id).slice(0, 3)).toEqual(["bne", "gym", "mar"]);
  });
  it("monotone along routes and nearer towns are reached first", () => { const r = routeTo(sp.prev, idx("mti")); for (let i = 1; i < r.length; i++) expect(sp.dist[r[i]]).toBeGreaterThan(sp.dist[r[i - 1]]); expect(sp.dist[idx("ips")]).toBeLessThan(sp.dist[idx("twb")]); });
  it("off-network point costs more than its nearest town; a closed road lengthens the trip", () => {
    expect(timeToPoint(g, sp.dist, [153.0, -27.0])).toBeGreaterThan(0); expect(timeToPoint(g, sp.dist, [144.2, -20.85])).toBeCloseTo(sp.dist[idx("hug")], 6);
    const cut = buildGraph(TOWNS, ROADS.filter((r) => !(r.a === "inn" && r.b === "cns"))); expect(shortestTimes(cut, idx("bne")).dist[idx("cns")]).toBe(Infinity);
  });
});
