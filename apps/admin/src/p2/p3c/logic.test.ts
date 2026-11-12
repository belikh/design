import { describe, expect, it } from "vitest";
import { contrast, grade, hexToHsl, hslToHex, parseHex, suggestFg, gradientCss, ramp, toHex } from "./colour.ts";
import { newCond, newGroup, toPredicate, toSql, toSentence, testRegex, segments, type FieldDef } from "./query.ts";
import { polygonArea, pointInPolygon, normBox, iou, insertOnNearestEdge, bezierAt, parseBezier, bezierCss, silenceBounds, sunTimes, hhmm, parseOffset, fmtOffset, clampBox } from "./geometry.ts";

describe("colour", () => {
  it("parses hex and round-trips through HSL", () => { expect(parseHex("#0af")).toEqual({ r: 0, g: 170, b: 255 }); expect(parseHex("nope")).toBeNull(); for (const h of ["#336699", "#ff0000", "#808080"]) expect(hslToHex(hexToHsl(h)!)).toBe(h); });
  it("contrast matches WCAG references", () => { expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 1); expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 1); expect(grade("#767676", "#ffffff")).toMatchObject({ aaNormal: true, aaaNormal: false }); expect(grade("nothex", "#fff")).toBeNull(); });
  it("suggests a foreground that passes", () => { const s = suggestFg("#999999", "#ffffff")!; expect(contrast(s, "#ffffff")!).toBeGreaterThanOrEqual(4.5); const d = suggestFg("#666666", "#101010")!; expect(contrast(d, "#101010")!).toBeGreaterThanOrEqual(4.5); });
  it("builds gradients with sorted stops and a lightness ramp", () => { expect(gradientCss({ kind: "linear", angle: 90, stops: [{ at: 100, hex: "#fff" }, { at: 0, hex: "#000" }] })).toBe("linear-gradient(90deg, #000 0%, #fff 100%)"); const r = ramp("#3366cc", 5); expect(r).toHaveLength(5); expect(contrast(r[0], "#ffffff")!).toBeLessThan(contrast(r[4], "#ffffff")!); expect(toHex({ r: 1, g: 2, b: 3 })).toBe("#010203"); });
});
const defs: FieldDef[] = [{ id: "name", label: "Name", type: "text" }, { id: "age", label: "Age", type: "number" }, { id: "role", label: "Role", type: "enum", options: ["admin", "viewer"] }];
const rows = [{ name: "Ava", age: 31, role: "admin" }, { name: "Ben", age: 22, role: "viewer" }, { name: "Cleo", age: 45, role: "viewer" }];
describe("query builder", () => {
  it("evaluates nested AND/OR groups", () => {
    const g = newGroup("and", [{ ...newCond(defs[1]), op: "gt", value: "25" }, newGroup("or", [{ ...newCond(defs[2]), op: "eq", value: "admin" }, { ...newCond(defs[0]), op: "starts", value: "cl" }])]);
    expect(rows.filter(toPredicate(g, defs)).map((r) => r.name)).toEqual(["Ava", "Cleo"]);
  });
  it("ignores incomplete conditions and matches all when empty; NOT inverts", () => { expect(rows.filter(toPredicate(newGroup(), defs))).toHaveLength(3); expect(rows.filter(toPredicate(newGroup("and", [newCond(defs[0])]), defs))).toHaveLength(3); const g = { ...newGroup("and", [{ ...newCond(defs[2]), value: "admin" }]), not: true }; expect(rows.filter(toPredicate(g, defs)).map((r) => r.name)).toEqual(["Ben", "Cleo"]); });
  it("renders SQL with quoting and a sentence", () => { const g = newGroup("or", [{ ...newCond(defs[0]), op: "eq", value: "O'Neil" }, { ...newCond(defs[1]), op: "gte", value: "18" }]); expect(toSql(g, defs)).toBe("(name = 'O''Neil' OR age >= 18)"); expect(toSentence(g, defs)).toBe('(Name is "O\'Neil" or Age is at least "18")'); expect(toSql(newGroup(), defs)).toBe("TRUE"); });
});
describe("regex tester", () => {
  it("finds matches with groups and highlights segments", () => { const r = testRegex("(?<k>\\w+)=(\\d+)", "", "a=1 b=22"); expect(r.ok && r.matches.map((m) => m.text)).toEqual(["a=1", "b=22"]); expect(r.ok && r.matches[1].named.k).toBe("b"); expect(segments("a=1 b=22", r.ok ? r.matches : [])).toEqual([{ text: "a=1", hit: true }, { text: " ", hit: false }, { text: "b=22", hit: true }]); });
  it("reports syntax errors and survives zero-width patterns", () => { expect(testRegex("(", "", "x")).toMatchObject({ ok: false }); const r = testRegex("x*", "", "abc"); expect(r.ok).toBe(true); expect(testRegex("a", "g", "a".repeat(500), 10)).toMatchObject({ truncated: true }); });
});
describe("geometry", () => {
  const sq = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }];
  it("area, containment, boxes", () => { expect(polygonArea(sq)).toBe(12); expect(pointInPolygon({ x: 1, y: 1 }, sq)).toBe(true); expect(pointInPolygon({ x: 5, y: 1 }, sq)).toBe(false); expect(normBox({ x: 5, y: 5 }, { x: 1, y: 2 })).toEqual({ x: 1, y: 2, w: 4, h: 3 }); expect(iou({ x: 0, y: 0, w: 2, h: 2 }, { x: 1, y: 0, w: 2, h: 2 })).toBeCloseTo(1 / 3); expect(clampBox({ x: -5, y: 0, w: 50, h: 5 }, 10, 10)).toEqual({ x: 0, y: 0, w: 10, h: 5 }); });
  it("inserts a vertex on the nearest edge", () => { expect(insertOnNearestEdge(sq, { x: 2, y: -1 })[1]).toEqual({ x: 2, y: -1 }); });
  it("easing: endpoints, linear identity, monotone ease-in-out", () => { expect(bezierAt([0.42, 0, 0.58, 1], 0)).toBe(0); expect(bezierAt([0.42, 0, 0.58, 1], 1)).toBe(1); expect(bezierAt([0, 0, 1, 1], 0.3)).toBeCloseTo(0.3, 3); expect(bezierAt([0.42, 0, 0.58, 1], 0.5)).toBeCloseTo(0.5, 2); expect(bezierAt([0.34, 1.56, 0.64, 1], 0.5)).toBeGreaterThan(1); expect(parseBezier(bezierCss([0.1, 0.2, 0.3, 0.4]))).toEqual([0.1, 0.2, 0.3, 0.4]); expect(parseBezier("cubic-bezier(2,0,0,0)")).toBeNull(); });
  it("silence bounds", () => { expect(silenceBounds([0, 0.01, 0.5, 0.6, 0.02, 0])).toEqual([2, 3]); });
  it("sun times are plausible for Brisbane in December", () => { const s = sunTimes(-27.47, 153.03, new Date("2026-12-21T00:00:00Z"))!; expect(hhmm(s.sunrise + 600)).toMatch(/^0[45]:/); expect(hhmm(s.sunset + 600)).toMatch(/^1[89]:/); expect(sunTimes(80, 0, new Date("2026-12-21T00:00:00Z"))).toBeNull(); });
  it("parses and formats offsets", () => { expect(parseOffset("-30")).toBe(-30); expect(parseOffset("+1h 15m")).toBe(75); expect(parseOffset("soon")).toBeNull(); expect(fmtOffset(-30)).toBe("-30m"); expect(fmtOffset(75)).toBe("+1h 15m"); expect(fmtOffset(60)).toBe("+1h"); });
});
import { nearestOrder, rackFits, rackFree, routeLength } from "./geometry.ts";
describe("routes and racks", () => {
  it("measures a route and orders greedily", () => { expect(routeLength([{ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 3, y: 10 }])).toBe(11); expect(nearestOrder([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 1, y: 0 }, { x: 5, y: 0 }])).toEqual([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }]); });
  it("checks rack fit, overlap and bounds", () => {
    const devs = [{ name: "Switch", u: 40, h: 1 }, { name: "Server", u: 10, h: 2 }];
    expect(rackFits(devs, 20, 2)).toMatchObject({ ok: true }); expect(rackFits(devs, 11, 2)).toMatchObject({ ok: false, reason: expect.stringContaining("Server") }); expect(rackFits(devs, 42, 2).ok).toBe(false); expect(rackFits(devs, 9, 1).ok).toBe(true); expect(rackFits(devs, 0, 1).ok).toBe(false); expect(rackFree(devs)).toBe(39);
  });
});
