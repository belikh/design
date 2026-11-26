import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TabBar } from "./TabBar.tsx";

const items = [{ to: "/", label: "Home", icon: "home", end: true }, { to: "/roster", label: "Roster", icon: "calendar" }, { to: "/swaps", label: "Swaps", icon: "refresh", count: 12 }];

describe("TabBar", () => {
  it("is a named navigation with one link per item and marks the current one", () => {
    render(<MemoryRouter initialEntries={["/roster"]}><TabBar items={items} label="Sections" /></MemoryRouter>);
    expect(screen.getByRole("navigation", { name: "Sections" }).querySelectorAll("a")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Roster" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });
  it("shows a count as a capped badge and says it in words", () => {
    render(<MemoryRouter><TabBar items={items} /></MemoryRouter>);
    const swaps = screen.getByRole("link", { name: /Swaps/ });
    expect(swaps).toHaveTextContent("9+"); expect(swaps).toHaveAccessibleName(/^Swaps.*12 waiting$/);
  });
});
