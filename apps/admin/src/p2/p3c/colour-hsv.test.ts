import { describe, expect, it } from "vitest";
import { hexToHsl, hsvToHex, hsvToRgb, hslToHsv, parseColour, parseHexA, rgbCss, rgbToHsv, toHexA, hsvToHsl } from "./colour.ts";

describe("HSV / alpha colour maths", () => {
  it("converts primaries and greys", () => {
    expect(rgbToHsv({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 100, v: 100 });
    expect(rgbToHsv({ r: 0, g: 255, b: 0 }).h).toBe(120);
    expect(rgbToHsv({ r: 0, g: 0, b: 0 })).toEqual({ h: 0, s: 0, v: 0 });
    const g = rgbToHsv({ r: 128, g: 128, b: 128 }); expect(g.s).toBe(0); expect(g.v).toBeCloseTo(50.2, 1);
    expect(hsvToRgb({ h: 240, s: 100, v: 100 })).toEqual({ r: 0, g: 0, b: 255 });
  });
  it("round-trips every 17th rgb value through HSV within one step", () => {
    for (let r = 0; r < 256; r += 17) for (let g = 0; g < 256; g += 17) for (let b = 0; b < 256; b += 17) {
      const back = hsvToRgb(rgbToHsv({ r, g, b })); expect(Math.abs(back.r - r)).toBeLessThanOrEqual(1); expect(Math.abs(back.g - g)).toBeLessThanOrEqual(1); expect(Math.abs(back.b - b)).toBeLessThanOrEqual(1);
    }
  });
  it("agrees with HSL for a known colour", () => {
    const hsv = rgbToHsv({ r: 0x33, g: 0x66, b: 0x99 }); const hsl = hsvToHsl(hsv); const ref = hexToHsl("#336699")!;
    expect(hsl.h).toBeCloseTo(ref.h, 3); expect(hsl.s).toBeCloseTo(ref.s, 3); expect(hsl.l).toBeCloseTo(ref.l, 3);
    expect(hsvToHex(hslToHsv(ref))).toBe("#336699");
  });
  it("parses and formats alpha hex", () => {
    expect(parseHexA("#f008")).toEqual({ rgb: { r: 255, g: 0, b: 0 }, a: 0x88 / 255 });
    expect(parseHexA("#336699")?.a).toBe(1); expect(parseHexA("#33669")).toBeNull(); expect(parseHexA("nope")).toBeNull();
    expect(toHexA({ r: 255, g: 0, b: 0 }, 1)).toBe("#ff0000"); expect(toHexA({ r: 255, g: 0, b: 0 }, 0.5)).toBe("#ff000080"); expect(toHexA({ r: 1, g: 2, b: 3 }, 0)).toBe("#01020300");
  });
  it("parses rgb() strings", () => {
    expect(parseColour("rgb(10, 20, 30)")).toEqual({ rgb: { r: 10, g: 20, b: 30 }, a: 1 });
    expect(parseColour("rgb(10 20 30 / 0.5)")?.a).toBe(0.5); expect(parseColour("rgba(10,20,30,50%)")?.a).toBe(0.5);
    expect(parseColour("rgb(300 0 0)")).toBeNull(); expect(rgbCss({ r: 1, g: 2, b: 3 }, 0.25)).toBe("rgb(1 2 3 / 0.25)");
  });
});
