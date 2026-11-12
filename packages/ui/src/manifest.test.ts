import { describe, expect, it } from "vitest";
import manifest from "./components.manifest.json";

const files = import.meta.glob("./*.{ts,tsx}", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
describe("component manifest", () => {
  it("lists only components that still exist in the named file", () => {
    for (const c of manifest.components) {
      const text = files[`./${c.file}`]; expect(text, `${c.file} missing`).toBeTruthy();
      expect(new RegExp(`export (function|const|class) ${c.name}\\b`).test(text), `${c.name} not exported from ${c.file}`).toBe(true);
      expect(c.when.length, `${c.name} needs a "when"`).toBeGreaterThan(5);
    }
  });
  it("has no duplicate names", () => { const n = manifest.components.map((c) => c.name); expect(new Set(n).size).toBe(n.length); });
});
