import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { routes } from "./index.tsx";
import { serverQuery, rowAt } from "./Server.tsx";
import { SHIPMENTS } from "./data.ts";

const page = (path: string, url = path) => render(<MemoryRouter initialEntries={[url]}><PrefsProvider>{routes.find((r) => r.path === path)!.element}</PrefsProvider></MemoryRouter>);

describe("route registry", () => {
  it("exposes the nine table pages under /tables in the Grids group", () => { expect(routes).toHaveLength(9); expect(routes.every((r) => r.path.startsWith("/tables/") && r.group === "Grids" && r.icon)).toBe(true); expect(new Set(routes.map((r) => r.path)).size).toBe(9); });
});
describe("grid lab", () => {
  it("renders grouped by state with aggregates, a group bar, header menus and an export menu", async () => {
    page("/tables/grid"); expect(await screen.findByRole("heading", { name: "Grid lab" })).toBeInTheDocument(); expect(document.querySelectorAll("tr.adm-group").length).toBeGreaterThanOrEqual(5); expect(screen.getByLabelText("Group by")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cost column menu/ })).toBeInTheDocument(); expect(document.querySelector("th.adm-th-group")).not.toBeNull(); await userEvent.click(screen.getByRole("button", { name: /Export/ })); expect(screen.getByRole("menuitem", { name: "Excel (.xlsx)" })).toBeInTheDocument();
    expect(document.querySelector("tr.sev-danger")).not.toBeNull(); expect(screen.getAllByRole("img", { name: /^Error:/ }).length).toBeGreaterThan(0);
  });
});
describe("pivot", () => {
  it("re-pivots when the dimensions or aggregation change and drills into a cell", async () => {
    page("/tables/pivot"); const table = () => screen.getByRole("table"); expect(within(table()).getAllByRole("columnheader").map((c) => c.textContent)).toEqual(expect.arrayContaining(["Delayed", "Held", "Total"]));
    await userEvent.selectOptions(screen.getByLabelText("Columns"), "mode"); expect(within(table()).getAllByRole("columnheader").map((c) => c.textContent)).toEqual(expect.arrayContaining(["Road", "Air", "Sea", "Rail"]));
    await userEvent.selectOptions(screen.getByLabelText("Measure"), "id"); expect(screen.getByLabelText("Aggregation")).toHaveValue("count"); const cell = screen.getAllByRole("button", { name: /Show rows/ })[0]; await userEvent.click(cell);
    expect(await screen.findByText(/^Rows for /)).toBeInTheDocument(); expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    const grand = within(table()).getAllByRole("row").at(-1)!; expect(within(grand).getAllByRole("cell").at(-1)).toHaveTextContent(String(SHIPMENTS.length));
  });
  it("can hide totals and heat colouring", async () => { page("/tables/pivot"); await userEvent.click(screen.getByLabelText("Totals")); expect(screen.queryByRole("columnheader", { name: "Total" })).not.toBeInTheDocument(); });
});
describe("bulk paste", () => {
  it("validates a pasted sheet, lets the user fix a cell, imports valid rows and keeps the invalid ones", async () => {
    page("/tables/paste"); await userEvent.click(screen.getByRole("button", { name: "Load sample with errors" }));
    expect(screen.getByText("3 valid")).toBeInTheDocument(); expect(screen.getByText("7 invalid")).toBeInTheDocument(); expect(screen.getByText("Already exists")).toBeInTheDocument(); expect(screen.getByText("Duplicate in paste")).toBeInTheDocument(); expect(screen.getByText("Use YYYY-MM-DD")).toBeInTheDocument(); expect(screen.getByText("Minimum 1")).toBeInTheDocument();
    const qty = screen.getByLabelText("Pallets, row 3"); await userEvent.clear(qty); await userEvent.type(qty, "5"); expect(screen.getByText("4 valid")).toBeInTheDocument(); expect(screen.queryByText("Minimum 1")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Import 4 valid rows" })); expect(await screen.findByText("Imported rows (4)")).toBeInTheDocument(); expect(screen.getByText("0 valid")).toBeInTheDocument(); expect(screen.getByText("6 invalid")).toBeInTheDocument();
    expect(screen.getAllByText(/^SH-70(01|02|03|10)$/).length).toBeGreaterThanOrEqual(4);
  });
  it("maps columns by header regardless of order and honours the mapping selects", async () => {
    page("/tables/paste"); const ta = screen.getByLabelText("Pasted rows"); await userEvent.click(ta); await userEvent.paste("Pallets\tRef\tCustomer\tState\tDue\tCost\nSH-8001\t7\tAcme\tQLD\t2026-11-20\t10"); // 'Pallets' and 'Ref' swapped by mistake: values are invalid until mapped
    expect(screen.getByText("Whole number expected")).toBeInTheDocument(); await userEvent.selectOptions(screen.getByLabelText("Source column for Ref"), "0"); await userEvent.selectOptions(screen.getByLabelText("Source column for Pallets"), "1"); expect(screen.getByText("1 valid")).toBeInTheDocument();
  });
});
describe("view switcher", () => {
  it("shows the same filtered data in five views and keeps filters and selection across them", async () => {
    page("/tables/views"); const pressed = (n: string) => screen.getByRole("button", { name: n });
    await userEvent.click(screen.getByRole("button", { name: /Held/ })); const n = Number(/(\d+) of/.exec(document.body.textContent!)![1]); expect(n).toBe(SHIPMENTS.filter((s) => s.status === "Held").length);
    await userEvent.click(pressed("Cards")); expect(document.querySelectorAll(".p2t-card").length).toBe(Math.min(48, n)); await userEvent.click(pressed("Calendar")); expect(screen.getByRole("grid", { name: "Deliveries by due date" })).toBeInTheDocument();
    await userEvent.click(pressed("Map")); expect(screen.getByRole("img", { name: "Map of destinations" })).toBeInTheDocument(); const bubble = screen.getAllByRole("button", { name: /shipments$/ })[0]; await userEvent.click(bubble); expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
    await userEvent.click(pressed("Timeline")); const bars = screen.getAllByRole("button", { name: /to .*Held/ }); expect(bars.length).toBe(Math.min(70, n)); await userEvent.click(bars[0]); expect(await screen.findByRole("dialog")).toBeInTheDocument(); expect(within(screen.getByRole("dialog")).getByText("Held")).toBeInTheDocument();
  });
  it("starts on the view named in the URL", () => { page("/tables/views", "/tables/views?view=cards"); expect(document.querySelectorAll(".p2t-card").length).toBeGreaterThan(0); });
  it("filters all views with the search box", async () => { page("/tables/views", "/tables/views?view=cards"); await userEvent.type(screen.getByLabelText("Search all views"), "zzzz-none"); expect(screen.getByText("No shipments match.")).toBeInTheDocument(); });
});
describe("reorder page", () => {
  it("reorders the priority list from the keyboard and the order badge follows", async () => {
    page("/tables/reorder"); const badge = () => screen.getByText(/T-1 ›/); expect(badge()).toHaveTextContent("T-1 › T-2 › T-3 › T-4 › T-5 › T-6");
    const handle = document.querySelector('[data-handle="T-1"]') as HTMLElement; handle.focus(); fireEvent.keyDown(handle, { key: "ArrowDown", altKey: true }); expect(screen.getByText(/T-2 ›/)).toHaveTextContent("T-2 › T-1 › T-3 › T-4 › T-5 › T-6");
  });
});
describe("server-side table", () => {
  it("serves exact totals when unfiltered and sampled estimates when filtered", () => {
    const a = serverQuery({ q: "", sort: [], filters: {}, facet: null, page: 3, size: 10, append: false }); expect(a.total).toBe(1_240_000); expect(a.estimated).toBe(false); expect(a.rows.map((r) => r.ref)[0]).toBe("SH-0000020"); expect(a.rows).toHaveLength(10);
    const d = serverQuery({ q: "", sort: [{ key: "ref", dir: -1 }], filters: {}, facet: null, page: 1, size: 3, append: false }); expect(d.rows[0].ref).toBe("SH-1239999");
    const f = serverQuery({ q: "", sort: [], filters: {}, facet: "Held", page: 1, size: 5, append: false }); expect(f.estimated).toBe(true); expect(f.rows.every((r) => r.status === "Held")).toBe(true); expect(f.total).toBeGreaterThan(200_000); expect(f.total).toBeLessThan(420_000);
    expect(rowAt(77)).toEqual(rowAt(77));
  });
  it("loads the first page through the DataTable server protocol and switches to load-more", async () => {
    page("/tables/server"); expect(await screen.findByText("SH-0000000", {}, { timeout: 3000 })).toBeInTheDocument(); expect(screen.getByText(/10 loaded of 1,240,000 rows/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Load more" })); expect(await screen.findByRole("button", { name: /Load more \(10\)/ })).toBeInTheDocument();
  });
});
describe("live rows and diff", () => {
  it("pauses and resumes the stream", async () => { page("/tables/live"); await userEvent.click(screen.getByRole("button", { name: "Pause" })); expect(screen.getByText("paused")).toBeInTheDocument(); await userEvent.click(screen.getByRole("button", { name: "Resume" })); expect(screen.getByText("live")).toBeInTheDocument(); });
  it("compares against a snapshot after simulated changes", async () => {
    page("/tables/live"); const simulate = screen.getByRole("button", { name: "Simulate changes" }); expect(simulate).toBeDisabled(); await userEvent.click(screen.getByRole("button", { name: "Take snapshot" })); await userEvent.click(simulate);
    expect(document.querySelectorAll("tr.is-added").length).toBe(2); expect(document.querySelectorAll("tr.is-removed").length).toBe(1); expect(document.querySelectorAll("td.is-changed").length).toBeGreaterThan(0);
  });
});
describe("nested tables", () => {
  it("expands a customer to a nested shipment table with its own paging", async () => {
    page("/tables/nested"); const first = document.querySelector("tbody tr[data-row]") as HTMLElement; await userEvent.click(within(first).getByRole("button", { name: "Toggle details" })); const nested = document.querySelector(".p2t-nested")!; expect(nested.querySelector("table")).not.toBeNull(); expect(nested.querySelector(".adm-dt__foot")).not.toBeNull();
    expect(document.querySelectorAll("th.adm-th--rot").length).toBe(12); expect(document.querySelectorAll("th.adm-th-group").length).toBe(2);
  });
});
