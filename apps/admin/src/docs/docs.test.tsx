import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { DEFAULT_TOKENS } from "@belikh/jupiter-tokens";
import { App } from "../App.tsx";
import { ROUTES } from "../routes.ts";

const at = async (path: string) => {
  const r = render(<MemoryRouter initialEntries={[path]}><PrefsProvider><App /></PrefsProvider></MemoryRouter>);
  await waitFor(() => expect(screen.queryByTestId("route-loading")).not.toBeInTheDocument(), { timeout: 8000 });
  await screen.findByTestId("page-title", {}, { timeout: 8000 });
  return r;
};
beforeEach(() => { document.documentElement.removeAttribute("data-theme"); });

describe("route map", () => {
  it("serves the design system at / and the admin dashboard at /overview", async () => {
    await at("/");
    expect(screen.getByTestId("page-title")).toHaveTextContent("Jupiter design system");
  });
  it("lists the docs groups first, in order", () => {
    const groups = [...new Set(ROUTES.map((r) => r.group))];
    expect(groups.slice(0, 3)).toEqual(["Foundations", "Build", "Ship"]);
    for (const p of ["/", "/tokens", "/fonts", "/layout", "/graphics", "/components/html", "/dashboard", "/targets", "/editor", "/overview", "/components"]) expect(ROUTES.some((r) => r.path === p), p).toBe(true);
  });
  it("keeps the admin dashboard on /overview", async () => {
    await at("/overview");
    expect(screen.getByTestId("page-title")).toHaveTextContent("Overview");
    expect(screen.getByText("Service health")).toBeInTheDocument();
  });
});

describe("shell in the documentation look", () => {
  it("has the jupiter /ds brand, version badge, nav groups and footer", async () => {
    await at("/tokens");
    expect(screen.getByTestId("brand-home-link")).toHaveTextContent("jupiter /ds");
    expect(screen.getByTestId("version-badge")).toHaveTextContent(`v${DEFAULT_TOKENS.version}`);
    const nav = screen.getByRole("navigation", { name: "Pages" });
    expect(within(nav).getByRole("link", { name: "Token editor" })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Tokens" })).toHaveClass("active");
    expect(screen.getByTestId("status-line")).toHaveTextContent("tokens default");
    expect(screen.getByText(/generated from jupiter.tokens.json/)).toBeInTheDocument();
  });
});

describe("docs pages", () => {
  it("Tokens lists every colour role and passes AA for the defaults", async () => {
    await at("/tokens");
    expect(screen.getByTestId("swatches-light")).toBeInTheDocument();
    expect(screen.getByTestId("contrast-light-summary")).toHaveTextContent("pass AA");
    expect(screen.getByTestId("type-scale-table")).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("motion-play-fast"));
  });
  it("Fonts changes the sample text", async () => {
    await at("/fonts");
    await userEvent.type(screen.getByTestId("specimen-custom-input"), "Zebra");
    expect(screen.getAllByText("Zebra").length).toBeGreaterThan(3);
  });
  it("Layout reports the breakpoints", async () => { await at("/layout"); expect(screen.getByTestId("breakpoints-table")).toBeInTheDocument(); expect(screen.getByTestId("grid-demo")).toBeInTheDocument(); });
  it("Graphics filters by search", async () => {
    await at("/graphics");
    await userEvent.type(screen.getByTestId("graphics-search"), "kangaroo");
    expect(screen.getAllByTestId(/^graphic-.*kangaroo/).length).toBeGreaterThan(0);
    expect(screen.queryAllByTestId(/^graphic-/).length).toBeLessThan(20);
  });
  it("Targets switches between the four platforms", async () => {
    await at("/targets");
    expect(screen.getByTestId("target-panel-email")).toBeInTheDocument();
    for (const t of ["terminal", "kiosk", "mobile"]) { await userEvent.click(screen.getByTestId(`target-tab-${t}`)); expect(screen.getByTestId(`target-panel-${t}`)).toBeInTheDocument(); }
  });
  it("HTML components shows each markup sample in light and dark", async () => {
    await at("/components/html");
    for (const id of ["button", "inputs", "panel", "table", "badge", "stat", "code", "callout"]) { expect(screen.getByTestId(`demo-${id}-light`)).toBeInTheDocument(); expect(screen.getByTestId(`markup-${id}`)).toBeInTheDocument(); }
  });
  it("Sample dashboard filters the services table", async () => {
    await at("/dashboard");
    const before = screen.getAllByTestId("dash-table-row").length;
    await userEvent.type(screen.getByTestId("dash-filter-input"), "auth");
    expect(screen.getAllByTestId("dash-table-row").length).toBeLessThan(before);
    await userEvent.click(screen.getByTestId("dash-table-sort-service"));
  });
});

describe("live token editor", () => {
  it("restyles the whole site: edits emit a live style, flag the shell, persist, and reset", async () => {
    await at("/editor");
    expect(document.getElementById("jupiter-live")).toBeNull();
    const hex = screen.getByTestId("editor-color-hex-light-accent");
    await userEvent.clear(hex); await userEvent.type(hex, "#ff0066");
    const style = await waitFor(() => { const el = document.getElementById("jupiter-live"); expect(el).not.toBeNull(); return el!; });
    expect(style.textContent).toContain("#ff0066");
    expect(style.textContent).toContain("@layer jp");
    expect(screen.getByTestId("custom-tokens-badge")).toBeInTheDocument();
    expect(screen.getByTestId("status-line")).toHaveTextContent("tokens custom");
    expect(localStorage.getItem("jp-tokens")).toContain("#ff0066");
    await userEvent.click(screen.getByTestId("editor-reset"));
    await waitFor(() => expect(document.getElementById("jupiter-live")).toBeNull());
    expect(screen.queryByTestId("custom-tokens-badge")).not.toBeInTheDocument();
  });
  it("shares the theme with the Display preference (one source of truth)", async () => {
    await at("/editor");
    await userEvent.click(screen.getByTestId("editor-mode-dark"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("jp-theme")).toBe("dark");
    expect(screen.getByTestId("status-line")).toHaveTextContent("theme dark");
  });
  it("starts from a saved custom token set", async () => {
    const t = structuredClone(DEFAULT_TOKENS); t.color.light.accent = "#123456"; localStorage.setItem("jp-tokens", JSON.stringify(t));
    await at("/tokens");
    expect(document.getElementById("jupiter-live")?.textContent).toContain("#123456");
  });
});
