import { describe, expect, it } from "vitest";
import { aggregate, cellFx, columnStats, groupRows, median, numStats, parseDelimited, ruleMatches } from "@belikh/jupiter-ui/tableUtils.ts";
import { buildPdf, buildXlsx, crc32, toCsv, toJson, toMarkdown, toTsv, zipStore } from "@belikh/jupiter-ui/tableExport.ts";
import { pivot } from "./pivot.ts";
import { isValid, mapColumns, validateRows, type FieldDef } from "./paste.ts";

describe("aggregate and stats", () => {
  it("computes every aggregate and ignores non-numeric values", () => {
    const v = [4, 1, 9, "x", null, 6];
    expect(aggregate(v, "sum")).toBe(20); expect(aggregate(v, "avg")).toBe(5); expect(aggregate(v, "min")).toBe(1); expect(aggregate(v, "max")).toBe(9); expect(aggregate(v, "median")).toBe(5);
    expect(aggregate(v, "count")).toBe(5); expect(aggregate([1, 1, 2], "distinct")).toBe(2); expect(aggregate([], "sum")).toBe(0);
  });
  it("median handles odd and even lengths", () => { expect(median([3, 1, 2])).toBe(2); expect(median([4, 1, 2, 3])).toBe(2.5); });
  it("summarises a numeric column with a histogram", () => {
    const s = columnStats([1, 2, 2, 3, 10, null, ""]);
    expect(s).toMatchObject({ count: 7, nulls: 2, distinct: 4, numeric: true, min: 1, max: 10, sum: 18 }); expect(s.histogram).toHaveLength(10); expect(s.histogram.reduce((a, b) => a + b.count, 0)).toBe(5); expect(s.top[0]).toEqual({ value: "2", count: 2 });
  });
  it("summarises a text column by top values", () => { const s = columnStats(["a", "b", "a", "c", "a"]); expect(s.numeric).toBe(false); expect(s.top[0]).toEqual({ value: "a", count: 3 }); expect(s.histogram).toEqual([]); });
});
describe("conditional formats", () => {
  const st = numStats([0, 50, 100])!;
  it("scale and bars use token variables, proportional to the value", () => {
    expect(cellFx({ type: "scale" }, 100, st).background).toContain("var(--jp-accent) 55%"); expect(cellFx({ type: "scale" }, 0, st).background).toContain("var(--jp-accent) 0%");
    expect(cellFx({ type: "bars" }, 50, st).background).toContain("50%");
  });
  it("diverging scale is green above the mean and red below", () => { expect(cellFx({ type: "scale", diverging: true }, 90, st).background).toContain("--jp-ok"); expect(cellFx({ type: "scale", diverging: true }, 10, st).background).toContain("--jp-danger"); });
  it("icon sets pick tercile glyphs and can be inverted", () => {
    expect(cellFx({ type: "icons" }, 95, st).glyph).toMatchObject({ char: "▲", tone: "ok" }); expect(cellFx({ type: "icons" }, 5, st).glyph).toMatchObject({ char: "▼", tone: "danger" }); expect(cellFx({ type: "icons" }, 50, st).glyph?.tone).toBe("muted");
    expect(cellFx({ type: "icons", invert: true }, 95, st).glyph).toMatchObject({ tone: "danger" });
  });
  it("rules: first matching rule wins, operators work", () => {
    const rules = [{ op: "<" as const, value: 10, tone: "danger" as const }, { op: "between" as const, value: 10, to: 20, tone: "warn" as const }, { op: "contains" as const, value: "late", tone: "info" as const }];
    expect(cellFx({ type: "rules", rules }, 5, null).color).toContain("danger"); expect(cellFx({ type: "rules", rules }, 15, null).color).toContain("warn"); expect(cellFx({ type: "rules", rules }, "Running LATE", null).color).toContain("info"); expect(cellFx({ type: "rules", rules }, 50, null)).toEqual({});
    expect(ruleMatches({ op: ">=", value: 5, tone: "ok" }, "5")).toBe(true);
  });
});
describe("grouping and parsing", () => {
  it("nests rows by several keys preserving order", () => {
    const rows = [{ a: "x", b: "1" }, { a: "y", b: "1" }, { a: "x", b: "2" }, { a: "x", b: "1" }]; const g = groupRows(rows, [(r) => r.a, (r) => r.b]);
    expect(g.map((n) => n.value)).toEqual(["x", "y"]); expect(g[0].rows).toHaveLength(3); expect(g[0].children.map((c) => [c.value, c.rows.length])).toEqual([["1", 2], ["2", 1]]); expect(g[0].children[0].depth).toBe(1);
  });
  it("parses tab, comma and semicolon separated text with quotes", () => {
    expect(parseDelimited("a\tb\n1\t2")).toEqual([["a", "b"], ["1", "2"]]); expect(parseDelimited('a,"b,c"\n1,"say ""hi"""')).toEqual([["a", "b,c"], ["1", 'say "hi"']]); expect(parseDelimited("a;b;c\n1;2;3")[1]).toEqual(["1", "2", "3"]); expect(parseDelimited('x\t"multi\nline"')).toEqual([["x", "multi\nline"]]); expect(parseDelimited("")).toEqual([]);
  });
});

describe("exporters", () => {
  const H = ["Name", "Qty"], R = [["Ann", 3], ['B "q"', null]];
  it("csv, tsv, json and markdown", () => {
    expect(toCsv(H, R)).toBe('"Name","Qty"\n"Ann","3"\n"B ""q""",""'); expect(toTsv(H, R)).toBe("Name\tQty\nAnn\t3\nB \"q\"\t"); expect(JSON.parse(toJson(H, R))).toEqual([{ Name: "Ann", Qty: 3 }, { Name: 'B "q"', Qty: null }]);
    expect(toMarkdown(["A|B", "N"], [["x|y", 1]], ["left", "right"])).toBe("| A\\|B | N |\n| --- | ---: |\n| x\\|y | 1 |");
  });
  it("crc32 matches the standard check value", () => { expect(crc32(new TextEncoder().encode("123456789")).toString(16)).toBe("cbf43926"); });
  /** Minimal zip reader (stored entries) to prove the xlsx is a structurally valid zip with correct CRCs. */
  const readZip = (b: Uint8Array) => { const dv = new DataView(b.buffer, b.byteOffset, b.byteLength); const eocd = b.length - 22; expect(dv.getUint32(eocd, true)).toBe(0x06054b50); const n = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true); const out: Record<string, { text: string; crcOk: boolean }> = {};
    for (let i = 0; i < n; i++) { expect(dv.getUint32(p, true)).toBe(0x02014b50); const crc = dv.getUint32(p + 16, true), size = dv.getUint32(p + 24, true), nl = dv.getUint16(p + 28, true), off = dv.getUint32(p + 42, true); const name = new TextDecoder().decode(b.slice(p + 46, p + 46 + nl)); expect(dv.getUint32(off, true)).toBe(0x04034b50); const lnl = dv.getUint16(off + 26, true); const data = b.slice(off + 30 + lnl, off + 30 + lnl + size); out[name] = { text: new TextDecoder().decode(data), crcOk: crc32(data) === crc }; p += 46 + nl; } return out; };
  it("builds a valid xlsx package with numbers, strings and escaping", () => {
    const z = readZip(buildXlsx(["Name", "Qty"], [["A & <B>", 5], ["C", true]], "Ship"));
    expect(Object.keys(z).sort()).toEqual(["[Content_Types].xml", "_rels/.rels", "xl/_rels/workbook.xml.rels", "xl/styles.xml", "xl/workbook.xml", "xl/worksheets/sheet1.xml"]); expect(Object.values(z).every((e) => e.crcOk)).toBe(true);
    const sheet = z["xl/worksheets/sheet1.xml"].text; expect(sheet).toContain("A &amp; &lt;B&gt;"); expect(sheet).toContain('<c r="B2"><v>5</v></c>'); expect(sheet).toContain('t="b"'); expect(z["xl/workbook.xml"].text).toContain('name="Ship"');
  });
  it("zipStore round-trips arbitrary bytes", () => { const z = readZip(zipStore([{ name: "a.txt", data: new TextEncoder().encode("hello") }])); expect(z["a.txt"]).toEqual({ text: "hello", crcOk: true }); });
  it("builds a PDF with a header, the rows and a valid xref", () => {
    const pdf = new TextDecoder().decode(buildPdf("Title (x)", ["Name", "Qty"], [["Ann", 3]])); expect(pdf.startsWith("%PDF-1.4")).toBe(true); expect(pdf).toContain("(Title \\(x\\)) Tj"); expect(pdf).toContain("Ann"); expect(pdf).toContain("%%EOF");
    const xref = Number(/startxref\n(\d+)/.exec(pdf)![1]); expect(pdf.slice(xref, xref + 4)).toBe("xref");
    const many = new TextDecoder().decode(buildPdf("t", ["a"], Array.from({ length: 130 }, (_, i) => [i]))); expect(many).toContain("/Count 3");
  });
});

describe("pivot", () => {
  const rows = [{ r: "A", c: "x", v: 10 }, { r: "A", c: "y", v: 20 }, { r: "B", c: "x", v: 30 }, { r: "A", c: "x", v: 50 }];
  it("aggregates cells and computes totals from raw values", () => {
    const p = pivot(rows, (x) => x.r, (x) => x.c, (x) => x.v, "sum"); expect(p.rows).toEqual(["A", "B"]); expect(p.cols).toEqual(["x", "y"]); expect(p.cells).toEqual([[60, 20], [30, null]]); expect(p.rowTotals).toEqual([80, 30]); expect(p.colTotals).toEqual([90, 20]); expect(p.grand).toBe(110); expect([p.min, p.max]).toEqual([20, 60]);
    const a = pivot(rows, (x) => x.r, (x) => x.c, (x) => x.v, "avg"); expect(a.rowTotals[0]).toBeCloseTo(80 / 3); expect(a.grand).toBeCloseTo(27.5);
    expect(p.groups.get("A\u0000x")).toHaveLength(2);
  });
  it("can order keys by total", () => { const p = pivot(rows, (x) => x.r, (x) => x.c, (x) => x.v, "sum", "total"); expect(p.rows).toEqual(["A", "B"]); expect(p.cols).toEqual(["x", "y"]); const q = pivot([{ r: "A", c: "p", v: 1 }, { r: "B", c: "p", v: 9 }], (x) => x.r, (x) => x.c, (x) => x.v, "sum", "total"); expect(q.rows).toEqual(["B", "A"]); });
});

describe("bulk paste validation", () => {
  const F: FieldDef[] = [{ key: "ref", label: "Ref", required: true, unique: true, pattern: /^SH-\d+$/, patternMsg: "Format SH-1" }, { key: "qty", label: "Qty", type: "int", required: true, min: 1 }, { key: "d", label: "Due", type: "date" }, { key: "m", label: "Mode", type: "enum", options: ["Road", "Air"] }];
  it("maps columns by header name, regardless of order, and falls back to position", () => {
    expect(mapColumns(["Qty", "Ref", "Mode", "Due"], F)).toEqual({ map: [1, 0, 3, 2], hasHeader: true }); expect(mapColumns(["SH-1", "5", "2026-01-01", "Road"], F)).toEqual({ map: [0, 1, 2, 3], hasHeader: false });
  });
  it("flags required, format, number, range, date, enum and duplicate errors", () => {
    const res = validateRows([["SH-1", "5", "2026-01-01", "Road"], ["", "x", "01/02/2026", "Sea"], ["SH-1", "0", "", ""], ["bad", "2", "", ""], ["SH-9", "3", "", "air"]], [0, 1, 2, 3], F, new Set(["sh-9"]));
    expect(isValid(res[0])).toBe(true); expect(res[1].errors).toEqual(["Required", "Whole number expected", "Use YYYY-MM-DD", "One of: Road, Air"]); expect(res[2].errors[0]).toBe("Duplicate in paste"); expect(res[2].errors[1]).toBe("Minimum 1"); expect(res[3].errors[0]).toBe("Format SH-1"); expect(res[4].errors[0]).toBe("Already exists"); expect(res[4].errors[3]).toBeNull();
  });
});
