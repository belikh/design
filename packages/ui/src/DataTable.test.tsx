import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { DataTable, type Col } from "./DataTable.tsx";

type R = { id: string; name: string; qty: number; status: string };
const rows: R[] = Array.from({ length: 23 }, (_, i) => ({ id: `r${i + 1}`, name: ["delta", "alpha", "charlie", "bravo"][i % 4] + i, qty: (i * 7) % 20, status: i % 3 === 0 ? "paid" : "open" }));
const cols: Col<R>[] = [{ key: "name", header: "Name", filter: "text", edit: "text" }, { key: "qty", header: "Qty", agg: "sum", edit: "number" }, { key: "status", header: "Status", filter: "select" }];
const setup = (extra: Partial<Parameters<typeof DataTable<R>>[0]> = {}) => render(<MemoryRouter><DataTable<R> rows={rows} cols={cols} pageSize={10} {...extra} /></MemoryRouter>);
const bodyRows = () => within(screen.getAllByRole("rowgroup")[1]).getAllByRole("row");

describe("DataTable", () => {
  it("paginates", async () => {
    setup(); expect(bodyRows()).toHaveLength(10);
    await userEvent.click(screen.getByRole("button", { name: "3" })); expect(bodyRows()).toHaveLength(3);
  });
  it("sorts ascending then descending, with aria-sort", async () => {
    setup(); await userEvent.click(screen.getByRole("button", { name: /^Qty(?! column menu)/ }));
    expect(screen.getByRole("columnheader", { name: /Qty/ })).toHaveAttribute("aria-sort", "ascending");
    await userEvent.click(screen.getByRole("button", { name: /^Qty(?! column menu)/ })); expect(screen.getByRole("columnheader", { name: /Qty/ })).toHaveAttribute("aria-sort", "descending");
  });
  it("filters by global search and shows the empty state when nothing matches", async () => {
    setup(); await userEvent.type(screen.getByLabelText("Search table"), "alpha1"); expect(bodyRows().length).toBeLessThan(10);
    await userEvent.clear(screen.getByLabelText("Search table")); await userEvent.type(screen.getByLabelText("Search table"), "zzzz");
    expect(screen.getByText("No results")).toBeInTheDocument();
  });
  it("selects rows, offers select-all across pages, and runs a bulk action", async () => {
    const run = vi.fn(); setup({ bulk: [{ label: "Archive", onRun: run }] });
    await userEvent.click(screen.getByLabelText("Select page")); expect(screen.getByText("10 selected")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Select all 23/ })); await userEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(run).toHaveBeenCalledTimes(1); expect(run.mock.calls[0][0]).toHaveLength(23);
  });
  it("edits a cell inline and reports the change", async () => {
    const onEdit = vi.fn(); setup({ onEdit }); const cell = within(bodyRows()[0]).getAllByRole("cell")[1];
    await userEvent.dblClick(cell); const input = within(cell).getByRole("textbox"); await userEvent.clear(input); await userEvent.type(input, "Zed{Enter}");
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "r1" }), "name", "Zed");
  });
  it("shows totals and loading/error states", () => {
    const { rerender } = setup(); expect(screen.getByText(/Totals/)).toBeInTheDocument();
    rerender(<MemoryRouter><DataTable<R> rows={rows} cols={cols} state="error" /></MemoryRouter>); expect(screen.getByText(/Couldn’t load rows/)).toBeInTheDocument();
  });
  it("expands rows and renders tree children", async () => {
    setup({ expand: (r) => <span>detail for {r.id}</span>, getChildren: (r) => (r.id === "r1" ? [{ id: "kid", name: "child-row", qty: 1, status: "open" }] : undefined) });
    await userEvent.click(within(bodyRows()[0]).getByRole("button", { name: "Toggle details" })); expect(screen.getByText("detail for r1")).toBeInTheDocument();
    await userEvent.click(within(bodyRows()[0]).getByRole("button", { name: "Expand" })); expect(screen.getByText("child-row")).toBeInTheDocument();
  });
});

describe("selection-aware command palette", () => {
  it("publishes actions for the checked rows and clears them when unchecked", async () => {
    const { getSelectionContext } = await import("./selection.ts");
    render(<MemoryRouter><DataTable rows={[{ id: "a", n: "x" }, { id: "b", n: "y" }]} cols={[{ key: "n", header: "N", edit: "text" }]} onEdit={() => {}} /></MemoryRouter>);
    expect(getSelectionContext()).toBeNull();
    await userEvent.click(screen.getByLabelText("Select a")); const c = getSelectionContext();
    expect(c?.count).toBe(1); expect(c?.actions.map((a) => a.label)).toEqual(expect.arrayContaining(["Edit fields on 1 selected", "Clear selection"]));
    await userEvent.click(screen.getByLabelText("Select a")); expect(getSelectionContext()).toBeNull();
  });
});
