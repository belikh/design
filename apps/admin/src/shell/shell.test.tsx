import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { App } from "../App.tsx";
import { parseChangelog, CHANGELOG } from "../areas/whatsnew/WhatsNew.tsx";
import { recordVisit, resetRecents, togglePin } from "./recents.ts";

const mount = (path = "/orders") => render(<MemoryRouter initialEntries={[path]}><PrefsProvider><App /></PrefsProvider></MemoryRouter>);
beforeEach(() => { localStorage.clear(); resetRecents(); });

describe("shell: recent and pinned pages", () => {
  it("the store keeps unique recents (newest first) and toggles pins", () => {
    recordVisit("/a"); recordVisit("/b"); recordVisit("/a"); expect(JSON.parse(localStorage.getItem("jp-recent")!)).toEqual(["/a", "/b"]);
    togglePin("/b"); expect(JSON.parse(localStorage.getItem("jp-pinned")!)).toEqual(["/b"]); togglePin("/b"); expect(JSON.parse(localStorage.getItem("jp-pinned")!)).toEqual([]);
  });
  it("pins the current page from the palette and shows it in the sidebar", async () => {
    mount("/orders"); await screen.findByRole("heading", { level: 1 }); await userEvent.click(screen.getByRole("button", { name: "Open command palette" }));
    await userEvent.type(await screen.findByLabelText("Command"), "pin this"); await userEvent.keyboard("{Enter}");
    const nav = await screen.findByRole("navigation", { name: "Pinned pages" }); expect(within(nav).getByText(/Orders/)).toBeInTheDocument();
  });
  it("lists visited pages as Recent in the palette", async () => {
    mount("/orders"); await screen.findByRole("heading", { level: 1 }); recordVisit("/analytics"); await userEvent.click(screen.getByRole("button", { name: "Open command palette" }));
    expect(await screen.findByText("Recent")).toBeInTheDocument();
  });
});
describe("shell: create menu, sidebar resize, what's new", () => {
  it("has a global Create menu", async () => {
    mount("/orders"); await screen.findByRole("heading", { level: 1 }); await userEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(await screen.findByRole("menuitem", { name: /New item/ })).toBeInTheDocument();
  });
  it("resizes the sidebar with the keyboard and remembers the width", async () => {
    mount("/orders"); await screen.findByRole("heading", { level: 1 }); const h = screen.getByRole("separator", { name: "Resize sidebar" }); h.focus();
    await userEvent.keyboard("{ArrowRight}{ArrowRight}"); await waitFor(() => expect(h).toHaveAttribute("aria-valuenow", "292")); expect(localStorage.getItem("jp-side-w")).toBe("292");
  });
  it("renders the changelog on the What's new page", async () => {
    expect(parseChangelog("# T\n\n## One\n- a\n- b\n## Two\n* c").map((e) => [e.title, e.items.length])).toEqual([["One", 2], ["Two", 1]]);
    expect(CHANGELOG).toContain("Changelog"); mount("/whats-new"); expect(await screen.findByRole("heading", { name: "What’s new" })).toBeInTheDocument(); expect(await screen.findByText("Unreleased")).toBeInTheDocument();
  });
});
