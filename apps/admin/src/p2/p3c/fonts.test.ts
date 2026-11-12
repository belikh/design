import { describe, expect, it } from "vitest";
import { FONTS, availabilityFromFaces, fontShorthand, isInstalled } from "./fonts.ts";

describe("fonts", () => {
  it("lists the shipped families first and every stack ends in a generic family", () => {
    expect(FONTS.filter((f) => f.source === "shipped").map((f) => f.name)).toEqual(["JetBrains Mono", "SGI Text", "SGI Alt"]);
    for (const f of FONTS) expect(/(sans-serif|serif|monospace|cursive)$/.test(f.stack)).toBe(true);
    expect(new Set(FONTS.map((f) => f.id)).size).toBe(FONTS.length);
  });
  it("detects installed fonts by width difference", () => {
    const widths: Record<string, number> = { "monospace": 100, "serif": 90, "sans-serif": 95, '"Here", monospace': 120, '"Here", serif': 120, '"Here", sans-serif': 120 };
    const measure = (f: string) => widths[f] ?? (f.endsWith("monospace") ? 100 : f.endsWith("serif") && !f.endsWith("sans-serif") ? 90 : 95);
    expect(isInstalled(measure, "Here")).toBe(true); expect(isInstalled(measure, "Gone")).toBe(false); expect(isInstalled(measure, "system-ui")).toBe(true);
  });
  it("maps FontFace results to availability", () => {
    expect(availabilityFromFaces([{ status: "loaded" }])).toBe("available"); expect(availabilityFromFaces([{ status: "error" }])).toBe("missing"); expect(availabilityFromFaces([])).toBe("missing"); expect(availabilityFromFaces(null)).toBe("unknown");
  });
  it("builds a font shorthand in rem", () => { expect(fontShorthand("Georgia, serif", 700, 20, true)).toBe("italic 700 1.25rem Georgia, serif"); });
});
