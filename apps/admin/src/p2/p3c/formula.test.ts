import { describe, expect, it } from "vitest";
import { calc, computeSheet, fillRange, pasteTSV, shiftFormula, toTSV, colName, parseRef } from "./formula.ts";

const none = { cell: () => undefined };
describe("formula engine", () => {
  it("respects precedence, unary minus, power right-associativity and percent", () => {
    expect(calc("1+2*3", none)).toEqual({ value: 7 }); expect(calc("-2^2", none)).toEqual({ value: 4 }); expect(calc("2^3^2", none)).toEqual({ value: 512 }); expect(calc("50%*8", none)).toEqual({ value: 4 });
  });
  it("calls functions, compares, concatenates", () => {
    expect(calc('IF(3>2,"yes","no")', none)).toEqual({ value: "yes" }); expect(calc('"a"&"b"&1', none)).toEqual({ value: "ab1" }); expect(calc("ROUND(2.345,2)", none)).toEqual({ value: 2.35 }); expect(calc("MAX(1,9,3)", none)).toEqual({ value: 9 });
  });
  it("reports errors with positions instead of throwing", () => {
    expect(calc("1/0", none)).toMatchObject({ error: "#DIV/0!" }); expect(calc("FOO(1)", none)).toMatchObject({ error: "#NAME?" }); expect(calc("1+", none)).toMatchObject({ error: "#SYNTAX" }); expect(calc("(1+2", none)).toMatchObject({ error: "#SYNTAX" });
    expect(calc("price*2", { cell: () => undefined, variable: (n) => (n === "price" ? 4 : undefined) })).toEqual({ value: 8 }); expect(calc("nope", none)).toMatchObject({ error: "#NAME?", pos: 0 });
  });
  it("does not execute code-looking input", () => { expect(calc("constructor.constructor('x')()", none)).toMatchObject({ error: "#SYNTAX" }); expect(calc("alert(1)", none)).toMatchObject({ error: "#NAME?" }); });
  it("converts column names", () => { expect(colName(0)).toBe("A"); expect(colName(26)).toBe("AA"); expect(parseRef("$B$3")).toMatchObject({ col: 1, row: 2, absCol: true, absRow: true }); });
});
describe("sheet", () => {
  const raw = { A1: "1", A2: "2", A3: "3", B1: "=SUM(A1:A3)", B2: "=B1*2", C1: "=C2", C2: "=C1", D1: "=A1/0", E1: "=B2+D1" };
  it("computes ranges and dependencies", () => { const c = computeSheet(raw); expect(c.B1).toBe(6); expect(c.B2).toBe(12); });
  it("detects cycles and propagates errors", () => { const c = computeSheet(raw); expect(c.C1).toEqual({ error: "#CYCLE!" }); expect(c.D1).toEqual({ error: "#DIV/0!" }); expect(c.E1).toEqual({ error: "#DIV/0!" }); });
  it("shifts relative references only", () => { expect(shiftFormula("=A1+$B$2+C$3", 1, 1)).toBe("=B2+$B$2+D$3"); expect(shiftFormula('="A1"&SUM(A1:A2)', 2, 0)).toBe('="A1"&SUM(A3:A4)'); });
  it("fills down: formulas shift, two-number series extend", () => {
    const f = fillRange({ B1: "=A1*2" }, { r0: 0, c0: 1, r1: 0, c1: 1 }, { r0: 0, c0: 1, r1: 2, c1: 1 }); expect(f).toEqual({ B2: "=A2*2", B3: "=A3*2" });
    const s = fillRange({ A1: "1", A2: "3" }, { r0: 0, c0: 0, r1: 1, c1: 0 }, { r0: 0, c0: 0, r1: 4, c1: 0 }); expect(s).toEqual({ A3: "5", A4: "7", A5: "9" });
  });
  it("round-trips TSV copy and paste with formula shifting", () => {
    const comp = computeSheet(raw); expect(toTSV(raw, comp, { r0: 0, c0: 0, r1: 1, c1: 1 })).toBe("1\t6\n2\t12"); expect(toTSV(raw, comp, { r0: 0, c0: 1, r1: 1, c1: 1 }, true)).toBe("=SUM(A1:A3)\n=B1*2");
    expect(pasteTSV("=A1\t5", { row: 4, col: 3 }, { row: 0, col: 0 })).toEqual({ D5: "=D5", E5: "5" });
  });
});
