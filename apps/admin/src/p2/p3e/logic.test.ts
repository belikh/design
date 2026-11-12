import { describe, expect, it } from "vitest";
import { alluvial, arcLayout, chord, sankey } from "./flow.ts";
import { cutTree, dendrogramLayout, euclid, mindMap, tidyTree, upgma, type TNode, type TreeIn } from "./tree.ts";
import { exclusive, regionAnchors, regionOf, unionSize, vennCircles } from "./sets.ts";
import { crossings, depMatrix, effectiveStates, layers, layoutLayered, overlaps, reach, topoOrder } from "./dag.ts";
import { flameLayout, foldStacks, subtree, waterfall } from "./trace.ts";
import { cohorts, funnel } from "./cohort.ts";
import { assignLanes, calendar, doraFrequency, doraLeadTime, histogram, quantile, weeklyCounts } from "./git.ts";
import { bandOf, connected, fenceTrack, haversine, hexDistance, hexToPixel, offsetToAxial, parseHexGrid, pixelToHex, pointInPolygon, polyArea, travelTimes, trackStats, bbox } from "./geo.ts";
import { binEvents, centreMHz, congestion, faceplate, occupancy, overlapMHz, poeUse, rackModel, rssiAt, rssiBand, signalGrid } from "./net.ts";
import * as D from "./data.ts";

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const near = (a: number, b: number, e = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(e);

describe("sankey (D041)", () => {
  const s = sankey(D.sankeyNodes, D.sankeyLinks, { width: 600, height: 300 });
  it("conserves flow: sample data has equal in and out at every interior node", () => { for (const n of s.nodes.filter((n) => n.col === 1)) expect(n.in).toBe(n.out); expect(sum(s.nodes.filter((n) => n.col === 0).map((n) => n.value))).toBe(sum(s.nodes.filter((n) => n.col === 2).map((n) => n.value))); });
  it("node heights are value × one shared scale", () => { for (const n of s.nodes) near(n.y1 - n.y0, n.value * s.ky); });
  it("nodes in a column do not overlap and stay inside the box", () => { for (let c = 0; c < 3; c++) { const col = s.nodes.filter((n) => n.col === c).sort((a, b) => a.y0 - b.y0); col.forEach((n, i) => { expect(n.y0).toBeGreaterThanOrEqual(-1e-6); expect(n.y1).toBeLessThanOrEqual(300 + 1e-6); if (i) expect(n.y0).toBeGreaterThanOrEqual(col[i - 1].y1); }); } });
  it("link ribbons stay within their node and sum to the node's flow", () => {
    for (const n of s.nodes) { const out = s.links.filter((l) => l.source === n.id), inn = s.links.filter((l) => l.target === n.id);
      near(sum(out.map((l) => l.width)), n.out * s.ky); near(sum(inn.map((l) => l.width)), n.in * s.ky);
      for (const l of out) { expect(l.sy - l.width / 2).toBeGreaterThanOrEqual(n.y0 - 1e-6); expect(l.sy + l.width / 2).toBeLessThanOrEqual(n.y1 + 1e-6); }
      for (const l of inn) { expect(l.ty - l.width / 2).toBeGreaterThanOrEqual(n.y0 - 1e-6); expect(l.ty + l.width / 2).toBeLessThanOrEqual(n.y1 + 1e-6); } }
  });
  it("derives columns from edges and rejects cycles", () => { const r = sankey([{ id: "a" }, { id: "b" }, { id: "c" }], [{ source: "a", target: "b", value: 1 }, { source: "b", target: "c", value: 1 }], { width: 100, height: 50 }); expect(r.nodes.map((n) => n.col)).toEqual([0, 1, 2]); expect(() => sankey([{ id: "a" }, { id: "b" }], [{ source: "a", target: "b", value: 1 }, { source: "b", target: "a", value: 1 }], { width: 1, height: 1 })).toThrow(); });
});
describe("alluvial (D041)", () => {
  const a = alluvial(D.alluvialStages, D.alluvialPaths); const s = sankey(a.nodes, a.links, { width: 500, height: 300 });
  it("every stage holds the same total population", () => { for (let c = 0; c < 4; c++) near(sum(s.nodes.filter((n) => n.col === c).map((n) => n.value)), sum(D.alluvialPaths.map((p) => p.value))); });
  it("interior stage nodes have in = out", () => { for (const n of s.nodes.filter((n) => n.col > 0 && n.col < 3)) expect(n.in).toBe(n.out); });
});
describe("chord (D041)", () => {
  const { groups, chords } = chord(D.chordMatrix, 0.05);
  it("group arcs fill the circle minus gaps", () => { near(sum(groups.map((g) => g.end - g.start)) + 0.05 * 5, 2 * Math.PI); });
  it("chord end widths are proportional to the matrix cells", () => { const k = (2 * Math.PI - 0.25) / sum(D.chordMatrix.flat()); for (const c of chords) { near(c.source.end - c.source.start, D.chordMatrix[c.source.index][c.target.index] * k); near(c.target.end - c.target.start, D.chordMatrix[c.target.index][c.source.index] * k); } });
  it("chord ends sit inside their group arc and do not overlap each other", () => { for (const g of groups) { const ends = chords.flatMap((c) => [c.source, c.target]).filter((e) => e.index === g.index && e.end > e.start).sort((a, b) => a.start - b.start); ends.forEach((e, i) => { expect(e.start).toBeGreaterThanOrEqual(g.start - 1e-9); expect(e.end).toBeLessThanOrEqual(g.end + 1e-9); if (i) expect(e.start).toBeGreaterThanOrEqual(ends[i - 1].end - 1e-9); }); } });
  it("an empty matrix gives zero-width arcs, not NaN", () => { const z = chord([[0, 0], [0, 0]]); expect(z.groups.every((g) => Number.isFinite(g.start) && g.end === g.start)).toBe(true); });
});
describe("arc diagram (D041)", () => {
  it("spaces nodes evenly and arc radius is half the span", () => { const r = arcLayout(D.arcIds, D.arcLinks, 700); const xs = D.arcIds.map((i) => r.x.get(i)!); for (let i = 1; i < xs.length; i++) near(xs[i] - xs[i - 1], (700 - 32) / 13); for (const a of r.arcs) near(a.r * 2, a.x1 - a.x0); });
});

describe("tree layouts (D043)", () => {
  const sizes = (t: TreeIn): number => (t.children?.length ? sum(t.children.map(sizes)) : 1);
  it("tidy tree: one slot per leaf, parents centred, same-depth nodes at least 1 apart", () => {
    const ns = tidyTree(D.orgTree); expect(ns.filter((n) => !n.children.length).length).toBe(sizes(D.orgTree)); const by = new Map(ns.map((n) => [n.id, n]));
    for (const n of ns) if (n.children.length) near(n.pos, (by.get(n.children[0])!.pos + by.get(n.children[n.children.length - 1])!.pos) / 2);
    const depths = new Set(ns.map((n) => n.depth)); for (const d of depths) { const row = ns.filter((n) => n.depth === d).map((n) => n.pos).sort((a, b) => a - b); for (let i = 1; i < row.length; i++) expect(row[i] - row[i - 1]).toBeGreaterThanOrEqual(1 - 1e-9); }
  });
  it("collapsing a node turns it into a leaf", () => { const ns = tidyTree(D.orgTree, new Set(["cto"])); const cto = ns.find((n) => n.id === "cto") as TNode; expect(cto.collapsed).toBe(true); expect(ns.some((n) => n.id === "eng1")).toBe(false); });
  it("mind map splits the branches into two balanced sides covering every leaf", () => { const m = mindMap(D.mind); expect(m.leftLeaves + m.rightLeaves).toBe(sizes(D.mind)); expect(Math.abs(m.leftLeaves - m.rightLeaves)).toBeLessThanOrEqual(3); expect(m.left.length + m.right.length - 2).toBe(tidyTree(D.mind).length - 1); });
  const toy = [[0, 1, 5, 6], [1, 0, 5, 6], [5, 5, 0, 2], [6, 6, 2, 0]];
  it("UPGMA merges the closest pair first with the known average-linkage heights", () => { const m = upgma(toy); expect(m.map((x) => [x.a, x.b, x.height])).toEqual([[0, 1, 1], [2, 3, 2], [4, 5, 5.5]]); expect(m[2].size).toBe(4); });
  it("heights never decrease and there are n-1 merges", () => { const v = D.dendroVectors; const d = v.map((a) => v.map((b) => euclid(a, b))); const m = upgma(d); expect(m.length).toBe(v.length - 1); for (let i = 1; i < m.length; i++) expect(m[i].height).toBeGreaterThanOrEqual(m[i - 1].height - 1e-9); });
  it("dendrogram layout: leaf order is a permutation, parents sit above both children", () => { const m = upgma(toy); const l = dendrogramLayout(4, m); expect([...l.order].sort()).toEqual([0, 1, 2, 3]); const by = new Map(l.nodes.map((n) => [n.id, n])); for (const n of l.nodes.filter((n) => !n.leaf)) { expect(n.y).toBeGreaterThanOrEqual(by.get(n.a!)!.y); expect(n.y).toBeGreaterThanOrEqual(by.get(n.b!)!.y); } });
  it("cut at a height gives the expected clusters", () => { const m = upgma(toy); expect(cutTree(4, m, 1.5)).toEqual([0, 0, 1, 2]); expect(cutTree(4, m, 3)).toEqual([0, 0, 1, 1]); expect(new Set(cutTree(4, m, 6)).size).toBe(1); });
});

describe("sets (D045)", () => {
  it("exclusive regions add up to the union and to each set's size", () => {
    for (const sets of [D.venn, D.upset]) { const ex = exclusive(sets); expect(sum(ex.map((e) => e.count))).toBe(unionSize(sets)); for (const [n, items] of Object.entries(sets)) expect(sum(ex.filter((e) => e.sets.includes(n)).map((e) => e.count))).toBe(new Set(items).size); }
  });
  it("toy example by hand", () => { const ex = exclusive({ A: ["1", "2", "3"], B: ["3", "4"], C: ["3", "5"] }); expect(ex.find((e) => e.sets.join() === "A,B,C")?.count).toBe(1); expect(ex.find((e) => e.sets.join() === "A")?.count).toBe(2); expect(unionSize({ A: ["1", "2", "3"], B: ["3", "4"], C: ["3", "5"] })).toBe(5); });
  it("duplicates inside one set count once", () => { expect(exclusive({ A: ["x", "x", "y"] })[0].count).toBe(2); });
  it("each label anchor lies in its own region", () => { const cs = vennCircles({ Web: 200, Mobile: 150, API: 100 }, 400, 300); const a = regionAnchors(cs, 400, 300); expect(a.size).toBe(7); for (const [k, p] of a) expect(regionOf(cs, p.x, p.y).join("|")).toBe(k); });
  it("circle areas are proportional to set size", () => { const cs = vennCircles({ A: 400, B: 100 }, 400, 300); near((cs[0].r / cs[1].r) ** 2, 4, 1e-9); });
});

describe("DAG layout (D047)", () => {
  const ids = D.pipeline, nodes = ids.map((id) => ({ id, w: 120, h: 30 }));
  const lay = layoutLayered(nodes, D.pipeEdges, { colGap: 40, rowGap: 12 })!;
  it("layers respect every edge and the layout is a function of the DAG", () => { const l = layers(ids, D.pipeEdges)!; for (const [f, t] of D.pipeEdges) expect(l.get(f)!).toBeLessThan(l.get(t)!); expect(lay.placed.length).toBe(ids.length); });
  it("boxes never overlap and every edge points left to right", () => { for (let i = 0; i < lay.placed.length; i++) for (let j = i + 1; j < lay.placed.length; j++) expect(overlaps(lay.placed[i], lay.placed[j])).toBe(false); const by = new Map(lay.placed.map((p) => [p.id, p])); for (const [f, t] of D.pipeEdges) expect(by.get(f)!.x + by.get(f)!.w).toBeLessThanOrEqual(by.get(t)!.x); });
  it("ordering sweeps never increase crossings versus the initial order", () => { const l = layers(ids, D.pipeEdges)!; const init = Array.from({ length: Math.max(...l.values()) + 1 }, (_, i) => ids.filter((x) => l.get(x) === i)); expect(lay.crossings).toBeLessThanOrEqual(crossings(init, D.pipeEdges)); });
  it("detects cycles", () => { expect(layers(["a", "b"], [["a", "b"], ["b", "a"]])).toBeNull(); expect(layoutLayered([{ id: "a", w: 1, h: 1 }, { id: "b", w: 1, h: 1 }], [["a", "b"], ["b", "a"]], { colGap: 1, rowGap: 1 })).toBeNull(); });
  it("counts a known crossing", () => { expect(crossings([["a", "b"], ["c", "d"]], [["a", "d"], ["b", "c"]])).toBe(1); expect(crossings([["a", "b"], ["c", "d"]], [["a", "c"], ["b", "d"]])).toBe(0); });
  it("lineage and architecture layouts also have no overlaps", () => { const l2 = layoutLayered(D.lineage.map((id) => ({ id, w: 110, h: 28 })), D.lineageEdges, { colGap: 30, rowGap: 10 })!; for (let i = 0; i < l2.placed.length; i++) for (let j = i + 1; j < l2.placed.length; j++) expect(overlaps(l2.placed[i], l2.placed[j])).toBe(false); });
  it("a failed task blocks queued descendants but keeps finished and running states", () => { const s = effectiveStates({ a: "success", b: "failed", c: "queued", d: "queued", e: "running", f: "queued" }, [["a", "b"], ["b", "c"], ["c", "d"], ["a", "e"], ["e", "f"]]); expect(s).toEqual({ a: "success", b: "failed", c: "blocked", d: "blocked", e: "running", f: "queued" }); });
  it("sample pipeline: everything after the failed join is blocked", () => { const s = effectiveStates(D.pipeRaw, D.pipeEdges); expect(s.join_sessions).toBe("failed"); for (const id of ["build_features", "train_model", "score_batch", "publish_dashboard"]) expect(s[id]).toBe("blocked"); expect(s.notify_slack).toBe("skipped"); expect(s.extract_orders).toBe("success"); });
  it("dependency matrix is triangular for a DAG and has one mark per edge", () => { const m = depMatrix(D.packages, D.pkgDeps); expect(sum(m.cells.flat())).toBe(D.pkgDeps.length); m.cells.forEach((row, r) => row.forEach((v, c) => { if (v) expect(c).toBeLessThan(r); })); expect(topoOrder(["a", "b"], [["a", "b"], ["b", "a"]])).toBeNull(); });
  it("reachability follows edges both ways", () => { expect([...reach("tokens", D.pkgDeps, "down")].sort()).toContain("e2e"); expect([...reach("e2e", D.pkgDeps, "up")]).toContain("core"); expect(reach("core", D.pkgDeps, "up").size).toBe(0); });
});

describe("trace waterfall (D049)", () => {
  const rows = waterfall(D.spans);
  it("one row per span in parent-before-child order with correct depth", () => { expect(rows.length).toBe(D.spans.length); const seen = new Set<string>(); for (const r of rows) { if (r.parent) expect(seen.has(r.parent)).toBe(true); seen.add(r.id); } expect(rows[0].depth).toBe(0); expect(rows.find((r) => r.id === "6")!.depth).toBe(3); });
  it("self time is within [0, duration] and the root's self time plus its direct children's coverage equals its duration", () => { for (const r of rows) { expect(r.self).toBeGreaterThanOrEqual(0); expect(r.self).toBeLessThanOrEqual(r.dur); } const root = rows[0]; const kids = rows.filter((r) => r.parent === "1"); const cover = sum(kids.map((k) => k.dur)); near(root.self, root.dur - cover); });
  it("children start inside their parent", () => { const by = new Map(D.spans.map((s) => [s.id, s])); for (const s of D.spans) if (s.parent) { const p = by.get(s.parent)!; expect(s.start).toBeGreaterThanOrEqual(p.start); expect(s.start + s.dur).toBeLessThanOrEqual(p.start + p.dur + 1e-9); } });
  it("critical path follows the last-ending child", () => { const crit = rows.filter((r) => r.critical).map((r) => r.id); expect(crit[0]).toBe("1"); expect(crit).toContain("14"); expect(crit).not.toContain("2"); });
  it("self time of overlapping children uses the union, not the sum", () => { const r = waterfall([{ id: "p", parent: null, service: "s", name: "p", start: 0, dur: 100 }, { id: "a", parent: "p", service: "s", name: "a", start: 10, dur: 50 }, { id: "b", parent: "p", service: "s", name: "b", start: 30, dur: 50 }]); near(r[0].self, 100 - 70); });
});
describe("flame graph (D049)", () => {
  const root = foldStacks(D.stacks); const total = sum(D.stacks.map((s) => s[1]));
  it("root value is the sample total; value = self + children everywhere", () => { expect(root.value).toBe(total); const chk = (t: typeof root): void => { expect(t.value).toBe(t.self + sum(t.children.map((c) => c.value))); t.children.forEach(chk); }; chk(root); });
  for (const sort of ["name", "size"] as const) it(`layout (${sort}): widths ∝ samples, children nest in parent and siblings do not overlap`, () => {
    const rects = flameLayout(root, sort); const by = new Map(rects.map((r) => [r.path.join(";"), r])); expect(rects[0].x0).toBe(0); expect(rects[0].x1).toBe(1);
    for (const r of rects) { near(r.x1 - r.x0, r.value / total); if (r.path.length > 1) { const p = by.get(r.path.slice(0, -1).join(";"))!; expect(r.x0).toBeGreaterThanOrEqual(p.x0 - 1e-9); expect(r.x1).toBeLessThanOrEqual(p.x1 + 1e-9); } }
    const kids = new Map<string, typeof rects>(); for (const r of rects) if (r.path.length > 1) kids.set(r.path.slice(0, -1).join(";"), [...(kids.get(r.path.slice(0, -1).join(";")) ?? []), r]);
    for (const ks of kids.values()) { ks.sort((a, b) => a.x0 - b.x0); for (let i = 1; i < ks.length; i++) expect(ks[i].x0).toBeGreaterThanOrEqual(ks[i - 1].x1 - 1e-9); }
  });
  it("icicle sorts the biggest sibling first; zooming re-roots to a subtree", () => { const r = flameLayout(root, "size").filter((x) => x.depth === 3 && x.path[2] === "handle"); expect(r[0].value).toBeGreaterThanOrEqual(r[r.length - 1].value); const sub = subtree(root, ["all", "main", "handle", "orders"]); expect(sub.name).toBe("orders"); expect(flameLayout(sub)[0].value).toBe(sub.value); });
});

describe("cohorts and funnel (D050)", () => {
  const { rows, avg } = cohorts(D.cohortUsers, D.WEEKS);
  it("week 0 retains everyone; the triangle is null where the future is", () => { for (const r of rows) { expect(r.counts[0]).toBe(r.size); expect(r.pct[0]).toBe(1); r.counts.forEach((c, k) => { if (r.cohort + k >= D.WEEKS) expect(c).toBeNull(); else expect(c).not.toBeNull(); }); } });
  it("sample data has non-increasing retention within a cohort (churn only)", () => { for (const r of rows) { const c = r.counts.filter((x): x is number => x !== null); for (let i = 1; i < c.length; i++) expect(c[i]).toBeLessThanOrEqual(c[i - 1]); } });
  it("sizes add up to all users; weighted average is hand-checkable", () => { expect(sum(rows.map((r) => r.size))).toBe(D.cohortUsers.length); const t = cohorts([{ cohort: 0, active: [1] }, { cohort: 0, active: [] }, { cohort: 1, active: [] }, { cohort: 1, active: [] }, { cohort: 1, active: [] }], 2); expect(t.avg[0]).toBe(1); near(t.avg[1]!, 1 / 2); expect(t.rows[1].counts).toEqual([3, null]); });
  it("funnel: step and overall conversion", () => { const f = funnel([{ name: "a", count: 1000 }, { name: "b", count: 400 }, { name: "c", count: 100 }]); expect(f.map((x) => x.fromPrev)).toEqual([1, 0.4, 0.25]); expect(f.map((x) => x.fromTop)).toEqual([1, 0.4, 0.1]); expect(f.map((x) => x.lost)).toEqual([0, 600, 300]); expect(sum(f.map((x) => x.lost)) + f[2].count).toBe(1000); });
  it("segments sum to the total funnel at the top", () => { expect(D.funnels.Mobile[0].count + D.funnels.Desktop[0].count).toBe(D.funnels.All[0].count); });
  it("empty funnel and zero top do not produce NaN", () => { expect(funnel([])).toEqual([]); expect(funnel([{ name: "a", count: 0 }, { name: "b", count: 0 }]).every((x) => Number.isFinite(x.fromPrev) && Number.isFinite(x.fromTop))).toBe(true); });
});

describe("git analytics (D054)", () => {
  it("calendar has whole weeks, correct weekdays and conserves commit totals", () => {
    const c = calendar(D.commitCounts, D.TODAY, 26); expect(c.cells.length).toBe(26 * 7); c.cells.forEach((x, i) => { expect(x.dow).toBe(i % 7); expect(new Date(x.date + "T00:00:00Z").getUTCDay()).toBe(x.dow); });
    const inWindow = Object.entries(D.commitCounts).filter(([d]) => d >= c.start && d <= "2026-11-12"); expect(sum(c.cells.map((x) => x.count))).toBe(sum(inWindow.map(([, v]) => v)));
  });
  it("levels are monotone in count and 0 only for no commits", () => { const c = calendar(D.commitCounts, D.TODAY, 26).cells; for (const a of c) { expect(a.level === 0).toBe(a.count === 0); for (const b of c) if (a.count < b.count) expect(a.level).toBeLessThanOrEqual(b.level); } });
  it("days after the end date are empty", () => { const c = calendar({ "2026-11-14": 9 }, new Date(Date.UTC(2026, 10, 12)), 4); expect(sum(c.cells.map((x) => x.count))).toBe(0); });
  it("branch lanes: parents come first, a branch keeps one lane, simultaneously live branches never share one", () => {
    const { nodes, laneOf } = assignLanes(D.commits); const idx = new Map(D.commits.map((c, i) => [c.id, i])); D.commits.forEach((c, i) => c.parents.forEach((p) => expect(idx.get(p)!).toBeLessThan(i)));
    D.commits.forEach((c, i) => expect(nodes[i].lane).toBe(laneOf.get(c.branch)));
    const span = new Map<string, [number, number]>(); D.commits.forEach((c, i) => { const s = span.get(c.branch); span.set(c.branch, [s ? s[0] : i, i]); });
    const bs = [...span]; for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) if (laneOf.get(bs[i][0]) === laneOf.get(bs[j][0])) expect(bs[i][1][1] < bs[j][1][0] || bs[j][1][1] < bs[i][1][0]).toBe(true);
  });
  it("a lane is reused after its branch merges", () => { const cm = [{ id: "1", branch: "main", parents: [], msg: "", author: "" }, { id: "2", branch: "x", parents: ["1"], msg: "", author: "" }, { id: "3", branch: "main", parents: ["1", "2"], msg: "", author: "" }, { id: "4", branch: "y", parents: ["3"], msg: "", author: "" }]; const r = assignLanes(cm); expect(r.laneOf.get("x")).toBe(1); expect(r.laneOf.get("y")).toBe(1); expect(r.lanes).toBe(2); });
  it("weekly deploy counts conserve the number of deploys", () => { const start = D.TODAY.getTime() - 84 * 86400000; expect(sum(weeklyCounts(D.deploys, start, 12))).toBe(D.deploys.length); });
  it("DORA bands at their thresholds", () => { expect(doraFrequency(1)).toBe("Elite"); expect(doraFrequency(0.5)).toBe("High"); expect(doraFrequency(1 / 14)).toBe("Medium"); expect(doraFrequency(0.001)).toBe("Low"); expect(doraLeadTime(23)).toBe("Elite"); expect(doraLeadTime(24)).toBe("High"); expect(doraLeadTime(800)).toBe("Low"); });
  it("quantiles and histogram", () => { expect(quantile([1, 2, 3, 4, 5], 0.5)).toBe(3); near(quantile([1, 2, 3, 4], 0.9), 3.7); expect(Number.isNaN(quantile([], 0.5))).toBe(true); const h = histogram(D.leadHours, [4, 24, 72, 168]); expect(sum(h)).toBe(D.leadHours.length); expect(histogram([1, 5, 100], [4, 24])).toEqual([1, 1, 1]); });
});

describe("hex tile map (D059)", () => {
  const tiles = parseHexGrid(D.hexRows);
  it("tile counts per state follow the design and coordinates are unique", () => { const cnt: Record<string, number> = {}; tiles.forEach((t) => (cnt[D.hexNames[t.ch]] = (cnt[D.hexNames[t.ch]] ?? 0) + 1)); expect(cnt).toEqual({ WA: 3, NT: 1, QLD: 5, SA: 2, NSW: 8, VIC: 7, ACT: 1, TAS: 1 }); expect(new Set(tiles.map((t) => `${t.q},${t.r}`)).size).toBe(tiles.length); });
  it("each state's tiles form one connected cluster", () => { for (const ch of Object.keys(D.hexNames)) expect(connected(tiles.filter((t) => t.ch === ch))).toBe(true); expect(connected(tiles)).toBe(true); });
  it("axial maths: neighbours are one step and exactly one size√3 apart, pixel round-trips", () => { expect(hexDistance({ q: 0, r: 0 }, { q: 2, r: -1 })).toBe(2); const a = hexToPixel({ q: 0, r: 0 }, 10), b = hexToPixel({ q: 1, r: 0 }, 10); near(Math.hypot(b.x - a.x, b.y - a.y), 10 * Math.sqrt(3)); const c = hexToPixel({ q: 0, r: 1 }, 10); near(Math.hypot(c.x - a.x, c.y - a.y), 10 * Math.sqrt(3)); for (const t of tiles) { const p = hexToPixel(t, 12); expect(pixelToHex(p.x + 1, p.y - 1, 12)).toEqual({ q: t.q, r: t.r }); } });
  it("offset-to-axial matches the odd-r convention", () => { expect(offsetToAxial(0, 0)).toEqual({ q: 0, r: 0 }); expect(offsetToAxial(2, 1)).toEqual({ q: 2, r: 1 }); expect(offsetToAxial(2, 2)).toEqual({ q: 1, r: 2 }); const p = tiles.map((t) => hexToPixel(t, 10)); for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) expect(Math.hypot(p[i].x - p[j].x, p[i].y - p[j].y)).toBeGreaterThan(10 * Math.sqrt(3) - 1e-6); });
});
describe("isochrone (D059)", () => {
  const t = travelTimes(D.costGrid, D.ISO_ORIGIN);
  it("origin is 0 and blocked cells are unreachable", () => { expect(t[D.ISO_ORIGIN[1]][D.ISO_ORIGIN[0]]).toBe(0); expect(t[0][22]).toBe(Infinity); });
  it("times obey the triangle inequality along every step (so they are true shortest times)", () => { const h = t.length, w = t[0].length; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (!Number.isFinite(t[y][x])) continue; for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) { const nx = x + dx, ny = y + dy; if (nx >= w || ny < 0 || ny >= h || !Number.isFinite(t[ny][nx])) continue; const step = ((D.costGrid[y][x] + D.costGrid[ny][nx]) / 2) * (dx && dy ? Math.SQRT2 : 1); expect(Math.abs(t[ny][nx] - t[y][x])).toBeLessThanOrEqual(step + 1e-9); } } });
  it("uniform grid gives the octile distance", () => { const g = Array.from({ length: 9 }, () => Array(9).fill(1)); const r = travelTimes(g, [0, 0]); near(r[8][8], 8 * Math.SQRT2); near(r[0][8], 8); near(r[3][8], 3 * Math.SQRT2 + 5); });
  it("bands partition reachable cells", () => { const bands = [10, 20, 30]; const cnt = [0, 0, 0, 0, 0]; t.flat().forEach((v) => cnt[bandOf(v, bands) + 1]++); expect(sum(cnt)).toBe(t.flat().length); expect(cnt[0]).toBe(t.flat().filter((v) => !Number.isFinite(v)).length); });
  it("bridges let the far bank be reached", () => { expect(Number.isFinite(t[10][30])).toBe(true); });
});
describe("GPS track (D059)", () => {
  it("haversine against known distances", () => { near(haversine({ lat: 0, lon: 0 }, { lat: 1, lon: 0 }) / 1000, 111.195, 0.01); const syd = { lat: -33.8688, lon: 151.2093 }, mel = { lat: -37.8136, lon: 144.9631 }; expect(haversine(syd, mel) / 1000).toBeGreaterThan(700); expect(haversine(syd, mel) / 1000).toBeLessThan(720); expect(haversine(syd, syd)).toBe(0); });
  it("elevation gain/loss ignore noise below the threshold and total a hand-made profile", () => { const mk = (es: number[]) => es.map((ele, i) => ({ lat: 0, lon: i * 0.001, ele, t: i })); const s = trackStats(mk([0, 1, 0, 1, 0, 10, 20, 15, 5, 5]), 3); near(s.gain, 20); near(s.loss, 15); expect(s.min).toBe(0); expect(s.max).toBe(20); });
  it("sample track is a closed loop with sane totals", () => { const s = trackStats(D.gpsTrack); expect(s.cum.length).toBe(D.gpsTrack.length); for (let i = 1; i < s.cum.length; i++) expect(s.cum[i]).toBeGreaterThan(s.cum[i - 1]); expect(s.distance).toBeGreaterThan(20000); expect(s.distance).toBeLessThan(60000); expect(s.gain).toBeGreaterThan(40); near(s.gain, s.loss, 30); });
});
describe("geofences (D059)", () => {
  const sq: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10]];
  it("point in polygon incl. concave shape", () => { expect(pointInPolygon([5, 5], sq)).toBe(true); expect(pointInPolygon([11, 5], sq)).toBe(false); const L: [number, number][] = [[0, 0], [10, 0], [10, 4], [4, 4], [4, 10], [0, 10]]; expect(pointInPolygon([2, 8], L)).toBe(true); expect(pointInPolygon([8, 8], L)).toBe(false); near(polyArea(sq), 100); });
  it("enter/exit events and dwell state", () => { const path = [{ t: 0, p: [-5, 5] as [number, number] }, { t: 10, p: [5, 5] as [number, number] }, { t: 20, p: [6, 5] as [number, number] }, { t: 30, p: [15, 5] as [number, number] }, { t: 40, p: [5, 5] as [number, number] }, { t: 100, p: [5, 6] as [number, number] }]; const r = fenceTrack(path, [{ id: "z", poly: sq }], 30); expect(r.events.map((e) => `${e.kind}@${e.t}`)).toEqual(["enter@10", "exit@30", "enter@40"]); expect(r.state.z).toBe("dwelling"); expect(fenceTrack(path.slice(0, 3), [{ id: "z", poly: sq }], 30).state.z).toBe("inside"); expect(fenceTrack(path.slice(0, 1), [{ id: "z", poly: sq }], 30).state.z).toBe("outside"); });
  it("sample asset enters and leaves the depot and visits the school zone", () => { const r = fenceTrack(D.gpsTrack.map((g) => ({ t: g.t, p: [g.lon, g.lat] as [number, number] })), D.fences, 120); for (const f of D.fences) expect(r.events.filter((e) => e.fence === f.id).length).toBeGreaterThan(0); });
});
describe("network hardware (D057)", () => {
  it("faceplate: odd ports on the top row, even below, no overlaps, SFP to the right", () => { const f = faceplate(D.ports, { w: 22, h: 24, gap: 4 }); const by = new Map(f.cells.map((c) => [c.port.n, c])); expect(f.cells.length).toBe(28); expect(by.get(1)!.y).toBe(0); expect(by.get(2)!.y).toBeGreaterThan(0); expect(by.get(1)!.x).toBe(by.get(2)!.x); expect(by.get(3)!.x).toBeGreaterThan(by.get(1)!.x); for (let i = 0; i < f.cells.length; i++) for (let j = i + 1; j < f.cells.length; j++) expect(overlaps(f.cells[i], f.cells[j])).toBe(false); expect(by.get(25)!.x).toBeGreaterThan(by.get(24)!.x + 22); });
  it("PoE budget counts only ports that are up", () => { const p = poeUse(D.ports, 370); near(p.used, sum(D.ports.filter((x) => x.state === "up").map((x) => x.poe))); near(p.remaining, 370 - p.used); const ps = [{ ...D.ports[0], state: "down" as const, poe: 15 }]; expect(poeUse(ps, 100).used).toBe(0); });
  it("rack model: used + free = capacity, free ranges are the gaps, overlaps are reported", () => { for (const r of D.racks) { const m = rackModel(r.devs); expect(m.usedU + m.freeU).toBe(42); expect(sum(m.free.map((f) => f.to - f.from + 1))).toBe(m.freeU); expect(m.conflicts).toEqual([]); expect(m.oob).toEqual([]); } const bad = rackModel([{ name: "a", u: 1, h: 3, kind: "x", watts: 1 }, { name: "b", u: 3, h: 2, kind: "x", watts: 1 }, { name: "c", u: 41, h: 3, kind: "x", watts: 1 }], 42); expect(bad.conflicts).toEqual([["a", "b"]]); expect(bad.oob).toEqual(["c"]); expect(rackModel([{ name: "a", u: 3, h: 2, kind: "x", watts: 1 }], 10).free).toEqual([{ from: 1, to: 2 }, { from: 5, to: 10 }]); });
  it("channel centre frequencies", () => { expect(centreMHz("2.4", 1)).toBe(2412); expect(centreMHz("2.4", 6)).toBe(2437); expect(centreMHz("2.4", 11)).toBe(2462); expect(centreMHz("5", 36)).toBe(5180); expect(centreMHz("5", 149)).toBe(5745); });
  it("2.4 GHz channels 1, 6 and 11 are non-overlapping; 1 and 3 overlap; 5 GHz 80 MHz covers four 20 MHz channels", () => { const b = (channel: number, width: 20 | 40 | 80 = 20, band: "2.4" | "5" = "2.4") => ({ ssid: "", band, channel, width, rssi: -60 }); expect(overlapMHz(b(1), b(6))).toBe(0); expect(overlapMHz(b(6), b(11))).toBe(0); expect(overlapMHz(b(1), b(3))).toBeGreaterThan(0); expect(overlapMHz(b(1), b(1))).toBe(22); expect(overlapMHz(b(1), b(1, 20, "5"))).toBe(0); expect(overlapMHz(b(42, 80, "5"), b(36, 20, "5"))).toBe(20); });
  it("congestion prefers the quietest of 1/6/11", () => { const others = D.bss.filter((x) => x.band === "2.4"); const scores = [1, 6, 11].map((c) => congestion("2.4", c, 20, others)); expect(Math.min(...scores)).toBe(scores[2]); expect(congestion("2.4", 1, 20, [])).toBe(0); });
  it("signal falls with distance, walls subtract a fixed loss, bands are ordered", () => { const ap = { id: "a", x: 0, y: 0, tx: 20 }; const r = [2, 5, 10, 20, 40].map((d) => rssiAt(ap, [d, 0.01], [])); for (let i = 1; i < r.length; i++) expect(r[i]).toBeLessThan(r[i - 1]); near(rssiAt(ap, [10, 0.01], []) - rssiAt(ap, [10, 0.01], [[5, -5, 5, 5]]), 7); near(rssiAt(ap, [10, 0.01], []) - rssiAt(ap, [10, 0.01], [[5, -5, 5, 5], [7, -5, 7, 5]]), 14); expect(rssiBand(-50)).toBe(0); expect(rssiBand(-60)).toBe(1); expect(rssiBand(-70)).toBe(2); expect(rssiBand(-90)).toBe(3); });
  it("signal grid picks the strongest AP per cell and has no NaN", () => { const g = signalGrid(D.FLOOR.cols, D.FLOOR.rows, D.FLOOR.cell, D.aps, D.walls); expect(g.length).toBe(22); expect(g.flat().every((c) => Number.isFinite(c.rssi) && c.ap)).toBe(true); const c = g[6][6]; expect(c.ap).toBe("AP-1"); for (const ap of D.aps) expect(rssiAt(ap, [(6 + 0.5) * 14, (6 + 0.5) * 14], D.walls)).toBeLessThanOrEqual(c.rssi + 1e-9); });
});
describe("occupancy and motion (D058)", () => {
  it("occupancy matrix averages samples and divides by capacity", () => { const m = occupancy([{ room: "A", hour: 9, people: 4 }, { room: "A", hour: 9, people: 6 }, { room: "B", hour: 0, people: 1 }], { A: 10, B: 2 }, ["A", "B"]); near(m[0][9]!, 0.5); near(m[1][0]!, 0.5); expect(m[0][10]).toBeNull(); expect(m.every((r) => r.length === 24)).toBe(true); });
  it("sample matrix: office hours busier than night, kitchen peaks at lunch", () => { const m = occupancy(D.occSamples, D.capacity, D.roomNames); const open = m[1]; expect(open[10]!).toBeGreaterThan(open[2]! * 5); const k = m[5]; expect(k[12]!).toBeGreaterThan(k[10]!); });
  it("binning conserves events and clamps edges", () => { const all = D.motionEvents["Kitchen"]; expect(sum(binEvents(all, 24, 1440))).toBe(all.length); expect(binEvents([0, 1439, 1440, -5], 24, 1440)).toEqual([2, ...Array(22).fill(0), 2]); });
});
