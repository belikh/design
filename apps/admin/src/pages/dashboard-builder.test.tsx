import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { DashboardBuilder } from "./DashboardBuilder.tsx";

describe("dashboard builder: reorder without dragging", () => {
  it("moves a widget later with its button and back earlier", async () => {
    render(<MemoryRouter><PrefsProvider><DashboardBuilder /></PrefsProvider></MemoryRouter>);
    await screen.findByRole("heading", { level: 1 }); // edit mode is on by default
    const order = () => [...document.querySelectorAll(".adm-widget__bar b")].map((b) => b.textContent);
    const before = order(); expect(before.length).toBeGreaterThan(2); await userEvent.click(screen.getAllByRole("button", { name: /later$/ })[0]);
    const after = order(); expect(after[1]).toBe(before[0]); expect(after[0]).toBe(before[1]); // swapped with its neighbour
    await userEvent.click(screen.getAllByRole("button", { name: /earlier$/ })[1]); expect(order()).toEqual(before);
  });
});
