import "@testing-library/jest-dom/vitest";
import { afterEach, beforeAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => { cleanup(); localStorage.clear(); sessionStorage.clear(); });
class RO { observe() {} unobserve() {} disconnect() {} }
vi.stubGlobal("ResizeObserver", RO);
vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } });
Object.defineProperty(window, "matchMedia", { value: (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }), writable: true });
Element.prototype.scrollIntoView = vi.fn();
Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn().mockResolvedValue(undefined) }, configurable: true });

// Production lazy-loads pages (React.lazy). In tests, start every lazy import immediately and wait for them all before each
// file runs, so components render synchronously and assertions stay simple and deterministic.
const lazyLoads: Promise<unknown>[] = [];
vi.mock("react", async (orig) => {
  const actual = await orig<typeof import("react")>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lazyShim = (loader: () => Promise<{ default: any }>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mod: { default: any } | null = null; let err: unknown = null;
    const p = loader().then((m) => { mod = m; }, (e) => { err = e; }); lazyLoads.push(p);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (props: any) => { if (err) throw err; if (!mod) throw p; return actual.createElement(mod.default, props); };
  };
  return { ...actual, lazy: lazyShim, default: { ...actual, lazy: lazyShim } };
});
beforeAll(async () => { await Promise.all(lazyLoads); });
