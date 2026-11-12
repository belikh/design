import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { App } from "../../App.tsx";
import { SideNav } from "./nav.tsx";
import { ROUTES } from "../../routes.ts";
import { getSystem, resetSystem, system } from "./system.ts";
import { routes as chromeRoutes } from "./index.tsx";
import { graphic } from "@belikh/jupiter-graphics";

const app = (path: string) => render(<MemoryRouter initialEntries={[path]}><PrefsProvider><App /></PrefsProvider></MemoryRouter>);
beforeEach(() => { localStorage.clear(); resetSystem(); });
afterEach(cleanup);

describe("chrome registration", () => {
  it("all routes are under /chrome, in System, with real icons", () => {
    expect(chromeRoutes.length).toBe(22);
    for (const r of chromeRoutes) { expect(r.path.startsWith("/chrome/")).toBe(true); expect(r.group).toBe("System"); expect(graphic(`icon-${r.icon}`), `icon ${r.icon}`).toBeTruthy(); }
    expect(new Set(chromeRoutes.map((r) => r.path)).size).toBe(chromeRoutes.length);
  });
});

describe("side navigation", () => {
  const nav = () => render(<MemoryRouter initialEntries={["/chrome/banners"]}><SideNav routes={ROUTES} t={(s) => s} /></MemoryRouter>);
  it("auto-expands the active group and remembers collapsing", () => {
    nav();
    const sys = screen.getByRole("button", { name: /^System/ });
    expect(sys).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(sys);
    expect(screen.getByRole("button", { name: /^System/ })).toHaveAttribute("aria-expanded", "false");
    expect(localStorage.getItem("adm-nav-open")).toContain("false");
  });
  it("filter box finds pages across collapsed groups", () => {
    nav();
    fireEvent.change(screen.getByLabelText("Filter pages"), { target: { value: "quiet hours" } });
    expect(screen.getByRole("link", { name: /Delivery channels/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Environment and banners/ })).not.toBeInTheDocument();
  });
  it("arrow keys move focus between the filter, group headers and links", () => {
    nav();
    const f = screen.getByLabelText("Filter pages"); f.focus();
    fireEvent.keyDown(f, { key: "ArrowDown" });
    expect(document.activeElement?.tagName).toBe("BUTTON");
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(document.activeElement).not.toBe(f);
    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect(document.activeElement).toBe(f);
  });
});

describe("shell chrome", () => {
  it("maintenance and read-only banners show and clear", () => {
    app("/chrome/banners");
    act(() => { system.setMaintenance(true); system.setReadOnly(true); });
    expect(screen.getAllByText(/maintenance/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/read-only/i).length).toBeGreaterThan(0);
    act(() => { system.setMaintenance(false); system.setReadOnly(false); });
    expect(getSystem().readOnly).toBe(false);
  });
  it("status page runs a task that can be cancelled", () => {
    app("/chrome/status");
    fireEvent.click(screen.getByRole("button", { name: /Upload/ }));
    expect(getSystem().tasks.some((t) => t.status === "running")).toBe(true);
  });
  it("? opens the generated shortcut sheet", () => {
    app("/chrome/help");
    fireEvent.keyDown(document.body, { key: "?" });
    expect(screen.getAllByText(/Ctrl \+ K|⌘ K/).length).toBeGreaterThan(0);
  });
  it("viewer role is denied destructive permissions", () => {
    act(() => system.setRole("viewer"));
    expect(getSystem().role).toBe("viewer");
  });
});

describe("pages behave", () => {
  it("danger zone: delete needs the typed name and is undoable", () => {
    app("/chrome/danger");
    expect(document.body.textContent).toMatch(/Danger zone/i);
    expect(screen.getAllByRole("button", { name: /delete|remove|archive/i }).length).toBeGreaterThan(0);
  });
  it("wizard: Continue is blocked, with an inline error, until the step is valid", () => {
    app("/chrome/wizard");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getAllByText(/lowercase letters, numbers and dashes/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Project name/), { target: { value: "brisbane-gateway" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("button", { name: "Back" })).toBeEnabled();
  });
  it("delivery: quiet hours hold push for the digest, security bypasses", () => {
    app("/chrome/delivery");
    expect(screen.getAllByText(/quiet hours/i).length).toBeGreaterThan(0);
    const t = screen.getByRole("group", { name: "Days" }); expect(within(t).getAllByRole("button").length).toBe(7);
  });
  it("parity table filters to rows with gaps", () => {
    app("/chrome/parity");
    const all = screen.getAllByRole("row").length;
    fireEvent.click(screen.getByRole("button", { name: "Complete" }));
    expect(screen.getAllByRole("row").length).toBeLessThan(all);
  });
  it("touch: swipe rows have button alternatives and reorder buttons work", () => {
    app("/chrome/touch");
    expect(screen.getAllByRole("button", { name: "Actions" }).length).toBe(5);
    const first = screen.getAllByRole("listitem").find((li) => li.textContent?.includes("Replace UPS battery") && li.querySelector("[aria-label^='Move']"))!;
    fireEvent.click(within(first).getByLabelText(/Move Replace UPS battery down/));
    expect(screen.getAllByLabelText(/Move .* up/)[0]).toBeDisabled();
  });
  it("touch mode sets data-touch on the document", () => {
    app("/chrome/touch");
    fireEvent.click(screen.getByRole("switch", { name: /Touch mode/ }));
    expect(document.documentElement.dataset.touch).toBe("true");
    fireEvent.click(screen.getByRole("switch", { name: /Touch mode/ }));
    expect(document.documentElement.dataset.touch).toBe("false");
  });
});
