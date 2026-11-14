import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Terrain, buildTerrain, narrowSize, type TerrainNode } from "./Terrain.tsx";

const nodes: TerrainNode[] = [
  { id: "a", label: "Alpha", href: "/a/", height: 1, icon: "icon-evergreen" },
  { id: "b", label: "Beta", href: "/b/", height: 0.6 },
  { id: "c", label: "Gamma", href: "/c/", height: 0.3 },
];
const links: [string, string][] = [["a", "b"], ["b", "c"]];

describe("Terrain", () => {
  it("draws every item as a link inside a named map", () => {
    render(<Terrain nodes={nodes} links={links} title="Garden map" />);
    expect(screen.getByRole("group", { name: "Garden map" })).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Alpha" })).toHaveAttribute("href", "/a/");
  });
  it("highlights the trails of the item you point at and dims the rest", () => {
    const { container } = render(<Terrain nodes={nodes} links={links} />);
    fireEvent.mouseEnter(screen.getByRole("link", { name: "Alpha" }));
    expect(container.querySelectorAll(".adm-terrain__trails line.is-hot")).toHaveLength(1);
    expect(container.querySelectorAll(".adm-terrain__trails line.is-dim")).toHaveLength(1);
  });
  it("keeps a quiet item's label hidden until it is pointed at", () => {
    const { container } = render(<Terrain nodes={nodes.map((n, i) => (i === 2 ? { ...n, quiet: true } : n))} links={links} />);
    const texts = () => [...container.querySelectorAll("text")].map((e) => e.textContent);
    expect(texts()).not.toContain("Gamma");
    fireEvent.mouseEnter(screen.getByRole("link", { name: "Gamma" }));
    expect(texts()).toContain("Gamma");
  });
  it("is deterministic: the same input gives the same map", () => {
    const a = buildTerrain(nodes, links, 1000, 560, "links"), b = buildTerrain(nodes, links, 1000, 560, "links");
    expect(a.P).toEqual(b.P); expect(a.contours.map((c) => c.d)).toEqual(b.contours.map((c) => c.d));
    expect(a.contours.length).toBeGreaterThan(2);
  });
  it("places items by meaning: alike vectors land closer than unlike ones", () => {
    const v = [{ ...nodes[0], vector: [1, 0, 0] }, { ...nodes[1], vector: [0.98, 0.2, 0] }, { ...nodes[2], vector: [0, 0, 1] }];
    const t = buildTerrain(v, [], 1000, 560, "meaning"), d = (i: number, j: number) => Math.hypot((t.P[i].x - t.P[j].x) * 1000, (t.P[i].y - t.P[j].y) * 560);
    expect(d(0, 1)).toBeLessThan(d(0, 2));
  });
  it("keeps a fixed position when one is given", () => {
    const t = buildTerrain(nodes.map((n, i) => ({ ...n, x: 0.2 + i * 0.3, y: 0.5 })), links, 1000, 560, "links");
    expect(t.P[1]).toEqual({ x: 0.5, y: 0.5 });
  });
  describe("in a narrow container", () => {
    afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
    const narrowContainer = (px: number) => {
      vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
      vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(px);
    };
    it("lays the map out again as a tall one that fits, with every item inside it", () => {
      narrowContainer(340);
      const { container } = render(<Terrain nodes={nodes} links={links} />);
      const svg = container.querySelector("svg.adm-terrain")!;
      expect(svg).toHaveClass("adm-terrain--narrow");
      expect(svg.getAttribute("viewBox")).toBe(`0 0 360 ${narrowSize(3, 360, 1000 * 460)}`);
      for (const c of container.querySelectorAll("circle")) expect(Number(c.getAttribute("cx"))).toBeLessThanOrEqual(360);
      expect(screen.getAllByRole("link")).toHaveLength(3);
    });
    it("keeps the wide map when the container is wide", () => {
      narrowContainer(900);
      const { container } = render(<Terrain nodes={nodes} links={links} />);
      expect(container.querySelector("svg.adm-terrain")!.getAttribute("viewBox")).toBe("0 0 1000 460");
    });
    it("gives the narrow map room for every item", () => {
      expect(narrowSize(45, 360, 440000)).toBeGreaterThan((45 * 120 * 46) / 360);
    });
  });
});
