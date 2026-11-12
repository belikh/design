import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SideNav, navId } from "./nav.tsx";

describe("SideNav ids", () => {
  it("builds valid, unique ids for group names with spaces and punctuation", () => {
    const ids = ["Charts (more)", "Charts more", "Data", "A/B"].map(navId);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z][\w-]*$/);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("points every group toggle at an existing region", () => {
    const routes = [{ path: "/a", label: "A", icon: "home", group: "Charts (more)" }, { path: "/b", label: "B", icon: "home", group: "Charts more" }];
    const { container } = render(<MemoryRouter initialEntries={["/a"]}><SideNav routes={routes} t={(x) => x} /></MemoryRouter>);
    container.querySelectorAll("button[aria-controls]").forEach((b) => { const id = b.getAttribute("aria-controls")!; expect(id).not.toMatch(/\s|\(|\)/); if (b.getAttribute("aria-expanded") === "true") expect(container.querySelector(`[id="${id}"]`)).not.toBeNull(); });
  });
});
