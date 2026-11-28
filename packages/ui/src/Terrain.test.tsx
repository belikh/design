import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { graphic } from "@belikh/jupiter-graphics";
import { Terrain, buildTerrain, hubSize, narrowSize, TERRAIN_KIND_ICON, type TerrainNode } from "./Terrain.tsx";

const nodes: TerrainNode[] = [
  { id: "a", label: "Alpha", href: "/a/", height: 1, icon: "icon-evergreen" },
  { id: "b", label: "Beta", href: "/b/", height: 0.6 },
  { id: "c", label: "Gamma", href: "/c/", height: 0.3 },
];
const links: [string, string][] = [["a", "b"], ["b", "c"]];

describe("Terrain", () => {
  it("draws each node with the icon of its kind, its stage, or its own icon, in that order of precedence", () => {
    const { container } = render(<Terrain nodes={[
      { id: "p", label: "P", height: 1, kind: "project" }, { id: "r", label: "R", height: 1, kind: "repo" },
      { id: "t", label: "T", height: 1, kind: "thing" }, { id: "n", label: "N", height: 1, kind: "note", icon: "icon-star" },
      { id: "s", label: "S", stage: "budding", kind: "note" }, { id: "x", label: "X", height: 1 },
    ]} />);
    const drawn = [...container.querySelectorAll(".adm-terrain__icon")].map((e) => e.getAttribute("d"));
    expect(drawn).toEqual(["icon-folder", "icon-github", "icon-cpu", "icon-star", "icon-bud"].map((id) => graphic(id)!.d));
    expect(TERRAIN_KIND_ICON.repo).toBe("icon-github");
  });
  it("takes a note's hill height from its stage when none is given", () => {
    const t = (stage: "seedling" | "evergreen") => buildTerrain([{ id: "a", label: "A", stage, x: 0.5, y: 0.5 }], [], 1000, 460, "links").contours.length;
    expect(t("evergreen")).toBeGreaterThan(t("seedling"));
  });
  it("does not lay the map out again when the pointer moves and no links were given", () => {
    const { container } = render(<Terrain nodes={nodes} />);
    const before = container.querySelector(".adm-terrain__contours")!.innerHTML;
    fireEvent.mouseEnter(screen.getByRole("link", { name: "Alpha" }));
    expect(container.querySelector(".adm-terrain__contours")!.innerHTML).toBe(before);
  });
  it("keeps a pinned item where it is while the others are placed around it", () => {
    const t = buildTerrain([{ ...nodes[0], x: 0.3, y: 0.4 }, nodes[1], nodes[2]], links, 1000, 560, "links");
    expect(t.P[0]).toEqual({ x: 0.3, y: 0.4 });
    expect(t.P[1]).not.toEqual(t.P[2]);
  });
  it("cuts a name that is too long for the map but keeps it whole for assistive technology", () => {
    const long = "x".repeat(200);
    const { container } = render(<Terrain nodes={[{ id: "a", label: long, href: "/a/", height: 1, x: 0.5, y: 0.5 }]} />);
    const text = container.querySelector("text")!;
    expect(text.textContent!.length).toBeLessThan(long.length); expect(text.textContent).toMatch(/…$/);
    expect(Number(text.getAttribute("x"))).toBeGreaterThanOrEqual(4);
    expect(screen.getByRole("link", { name: long })).toBeInTheDocument();
  });
  it("never lets a name sit on top of a dot", () => {
    const close = [{ id: "a", label: "Alpha", height: 1, x: 0.5, y: 0.5 }, { id: "b", label: "Beta", height: 1, x: 0.5, y: 0.5 + 24 / 460 }];
    const { container } = render(<Terrain nodes={close} />);
    expect([...container.querySelectorAll("text")].map((e) => e.textContent)).toEqual(["Beta"]); // Alpha's name would sit on Beta's dot
  });
  describe("hub layout", () => {
    const hub = [{ id: "me", label: "Me", height: 1, href: "/me/" }, ...["a", "b", "c", "d"].map((id) => ({ id, label: id, height: 0.5, href: `/${id}/` }))];
    it("puts the focus item in the middle and the rest around it", () => {
      const t = buildTerrain(hub, [], 1000, 250, "hub", "me");
      expect(t.P[0]).toEqual({ x: 0.5, y: 0.48 });
      for (const p of t.P.slice(1)) expect(Math.hypot(p.x - 0.5, p.y - 0.48)).toBeGreaterThan(0.2);
    });
    it("draws the focus item as the current page, not a link, and sizes the map to its items", () => {
      const { container } = render(<Terrain nodes={hub} layout="hub" focus="me" />);
      expect(screen.getAllByRole("link")).toHaveLength(4);
      expect(screen.getByRole("img", { name: "Me" })).toHaveAttribute("aria-current", "page");
      expect(container.querySelector("svg.adm-terrain")!.getAttribute("viewBox")).toBe(`0 0 1000 ${hubSize(4)[0]}`);
    });
    it("keeps one or two connections on a diagonal", () => {
      const t = buildTerrain(hub.slice(0, 2), [], 1000, 200, "hub", "me");
      expect(t.P[0].x).toBeLessThan(t.P[1].x); expect(t.P[0].y).toBeLessThan(t.P[1].y);
    });
  });
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
