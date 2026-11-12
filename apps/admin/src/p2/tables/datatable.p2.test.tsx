import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { DataTable, type Col } from "@belikh/jupiter-ui/DataTable.tsx";

type R = { id: string; name: string; region: string; status: string; qty: number; cost: number };
const rows: R[] = Array.from({ length: 12 }, (_, i) => ({ id: `r${i + 1}`, name: `name${i + 1}`, region: ["QLD", "NSW", "VIC"][i % 3], status: i % 2 ? "Open" : "Done", qty: i + 1, cost: (i + 1) * 10 }));
const cols: Col<R>[] = [{ key: "name", header: "Name" }, { key: "region", header: "Region" }, { key: "status", header: "Status" }, { key: "qty", header: "Qty", align: "right", agg: "sum" }, { key: "cost", header: "Cost", align: "right", agg: "sum", fmt: (v) => `$${v}` }];
type P = Partial<Parameters<typeof DataTable<R>>[0]>;
const setup = (p: P = {}) => render(<MemoryRouter><DataTable<R> rows={rows} cols={cols} pageSize={25} selectable={false} {...p} /></MemoryRouter>);
const body = () => document.querySelector("tbody:not(.adm-pinned)") as HTMLElement;
const dataRows = () => within(body()).getAllByRole("row").filter((r) => !r.classList.contains("adm-group") && !r.classList.contains("adm-expand"));
const groupRows = () => Array.from(document.querySelectorAll("tr.adm-group")) as HTMLElement[];
const menu = async (header: string, item: string) => { await userEvent.click(screen.getByRole("button", { name: new RegExp(`${header} column menu`) })); await userEvent.click(screen.getByRole("menuitem", { name: item })); };
const dt = () => { const d = new Map<string, string>(); return { setData: (k: string, v: string) => d.set(k, v), getData: (k: string) => d.get(k) ?? "", get types() { return [...d.keys()]; }, effectAllowed: "", dropEffect: "none" }; };

describe("grouping (B007, B024)", () => {
  it("groups on several levels with per-group aggregates and collapse", async () => {
    setup({ groupBy: ["region", "status"], groupBar: true });
    const top = groupRows().filter((g) => g.dataset.depth === "0"); expect(top.map((g) => within(g).getAllByRole("cell")[0].textContent)).toEqual([expect.stringContaining("QLD"), expect.stringContaining("NSW"), expect.stringContaining("VIC")]);
    expect(groupRows().filter((g) => g.dataset.depth === "1").length).toBe(6); expect(top[0]).toHaveTextContent(/22\s*sum/); // QLD: qty 1+4+7+10
    await userEvent.click(top[0]); expect(groupRows().filter((g) => g.dataset.depth === "1").length).toBe(4); // QLD children hidden
    await userEvent.click(screen.getByRole("button", { name: "Collapse all" })); expect(dataRows()).toHaveLength(0); await userEvent.click(screen.getByRole("button", { name: "Expand all" })); expect(dataRows()).toHaveLength(12);
  });
  it("adds and removes grouping from the group bar, the header menu and by dropping a header", async () => {
    setup({ groupBar: true, headerMenu: true }); expect(groupRows()).toHaveLength(0);
    await menu("Region", "Group by this column"); expect(groupRows()).toHaveLength(3); expect(screen.getByRole("button", { name: "Remove grouping by Region" })).toBeInTheDocument();
    const data = dt(); data.setData("application/x-jp-col", "status"); fireEvent.drop(document.querySelector(".adm-groupbar")!, { dataTransfer: data }); expect(groupRows().filter((g) => g.dataset.depth === "1").length).toBe(6);
    await userEvent.click(screen.getByRole("button", { name: "Remove grouping by Region" })); expect(groupRows()).toHaveLength(2); expect(screen.getByRole("button", { name: "Remove grouping by Status" })).toBeInTheDocument();
  });
});
describe("header menu and footer (B012, B019, B028)", () => {
  it("changes a column's aggregate and the footer follows; totals scope switches to the page or selection", async () => {
    setup({ headerMenu: true, pageSize: 5, selectable: true }); const foot = () => within(document.querySelector("tfoot")!);
    expect(foot().getAllByText(/sum/).length).toBe(2); expect(foot().getByText("78")).toBeInTheDocument(); // qty total 1..12
    await menu("Qty", "Aggregate: average"); expect(foot().getByText("6.5")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Totals scope"), "page"); expect(foot().getByText("Totals (5)")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Totals scope"), "filtered"); await userEvent.click(within(body()).getAllByRole("checkbox")[0]); await userEvent.selectOptions(screen.getByLabelText("Totals scope"), "selected"); expect(foot().getByText("Totals (1)")).toBeInTheDocument();
  });
  it("hides, pins and auto-fits columns from the menu; text wrapping from the layout menu", async () => {
    setup({ headerMenu: true, layoutMenu: true }); await menu("Region", "Hide column"); expect(screen.queryByRole("columnheader", { name: /Region/ })).not.toBeInTheDocument();
    await menu("Name", "Pin left"); expect(document.querySelector('th[data-col="name"]')).toHaveStyle({ position: "sticky" });
    await menu("Cost", "Auto-fit width"); expect((document.querySelector('th[data-col="cost"]') as HTMLElement).style.width).toMatch(/px$/);
    await userEvent.click(screen.getByRole("button", { name: /Text/ })); await userEvent.click(screen.getByRole("menuitem", { name: "Text: wrap" })); expect(document.querySelector("table")!.className).toContain("adm-table--wrap");
  });
  it("opens column statistics with a histogram and top values", async () => {
    setup({ headerMenu: true }); await menu("Qty", "Column statistics…"); const m = screen.getByRole("dialog"); expect(within(m).getByText("Distinct")).toBeInTheDocument(); expect(within(m).getByRole("img", { name: "Histogram" })).toBeInTheDocument(); expect(within(m).getByText("Min / Max").nextSibling).toHaveTextContent("1 / 12");
  });
});
describe("pinned rows (B020)", () => {
  it("shows initial pinned rows outside the paginated flow and lets users pin and unpin", async () => {
    setup({ pinnable: true, pinnedTop: ["r2"], pinnedBottom: ["r5"], pageSize: 5 }); const top = document.querySelector(".adm-pinned--top")!, bot = document.querySelector(".adm-pinned--bottom")!;
    expect(within(top as HTMLElement).getByText("name2")).toBeInTheDocument(); expect(within(bot as HTMLElement).getByText("name5")).toBeInTheDocument(); expect(within(body()).queryByText("name2")).not.toBeInTheDocument();
    await userEvent.click(within(top as HTMLElement).getByRole("button", { name: /Pin r2/ })); await userEvent.click(screen.getByRole("menuitem", { name: "Unpin" })); expect(document.querySelector(".adm-pinned--top")).toBeNull(); expect(within(body()).getByText("name2")).toBeInTheDocument();
    await userEvent.click(within(body()).getAllByRole("button", { name: /Pin r1/ })[0]); await userEvent.click(screen.getByRole("menuitem", { name: "Pin to top" })); expect(within(document.querySelector(".adm-pinned--top") as HTMLElement).getByText("name1")).toBeInTheDocument();
  });
});
describe("conditional formatting (B021) and severity/error markers (B031)", () => {
  it("renders icon sets, data bars and highlight rules from tokens", () => {
    setup({ cols: [{ key: "name", header: "Name" }, { key: "qty", header: "Qty", cf: { type: "icons" } }, { key: "cost", header: "Cost", cf: { type: "bars" } }, { key: "status", header: "Status", cf: { type: "rules", rules: [{ op: "=", value: 0, tone: "ok" }, { op: "contains", value: "Open", tone: "warn" }] } }] });
    expect(screen.getAllByRole("img", { name: "high" }).length).toBeGreaterThan(0); expect(screen.getAllByRole("img", { name: "low" }).length).toBeGreaterThan(0);
    expect((screen.getByText("120").closest("td") as HTMLElement).style.background).toContain("linear-gradient"); expect((screen.getAllByText("Open")[0].closest("td") as HTMLElement).style.color).toContain("--jp-warn");
  });
  it("switches a numeric column's format from the header menu", async () => { setup({ headerMenu: true }); await menu("Cost", "Format: data bars"); expect((screen.getByText("$120").closest("td") as HTMLElement).style.background).toContain("linear-gradient"); });
  it("marks severity rows and shows an accessible error marker with the message", () => {
    setup({ severity: (r) => (r.qty === 3 ? "danger" : undefined), rowError: (r) => (r.qty === 3 ? "Customs hold" : undefined) });
    expect(screen.getByText("name3").closest("tr")).toHaveClass("sev-danger"); expect(screen.getByRole("img", { name: "Error: Customs hold" })).toBeInTheDocument(); expect(screen.getAllByRole("img", { name: /^Error/ })).toHaveLength(1);
  });
});
describe("range selection (B022)", () => {
  it("drags across cells and summarises count, sum and average; Escape clears; Ctrl+C copies TSV", async () => {
    setup({ rangeSelect: true }); const cell = (r: number, c: number) => within(dataRows()[r]).getAllByRole("cell")[c];
    fireEvent.mouseDown(cell(0, 3)); fireEvent.mouseEnter(cell(2, 4)); fireEvent.mouseUp(document);
    const bar = screen.getByRole("status", { name: "Selection summary" }); expect(bar).toHaveTextContent("3×2"); expect(bar).toHaveTextContent(/Count\s*6/); expect(bar).toHaveTextContent(/Sum\s*66/); expect(bar).toHaveTextContent(/Average\s*11/); // qty 1,2,3 + cost 10,20,30
    expect(document.querySelectorAll("td.is-range")).toHaveLength(6);
    fireEvent.keyDown(document.querySelector("table")!, { key: "c", ctrlKey: true }); expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith("1\t10\n2\t20\n3\t30");
    fireEvent.keyDown(document.querySelector("table")!, { key: "Escape" }); expect(screen.queryByRole("status", { name: "Selection summary" })).not.toBeInTheDocument();
  });
  it("extends with Shift+Arrow from the focused cell", async () => {
    setup({ rangeSelect: true }); const first = within(dataRows()[0]).getAllByRole("cell")[3]; await userEvent.click(first); fireEvent.keyDown(document.querySelector("table")!, { key: "ArrowDown", shiftKey: true }); fireEvent.keyDown(document.querySelector("table")!, { key: "ArrowDown", shiftKey: true });
    expect(screen.getByRole("status", { name: "Selection summary" })).toHaveTextContent(/Sum\s*6/);
  });
});
describe("reordering (B016, B026)", () => {
  it("moves a row with Alt+Arrow keys and reports the new order", async () => {
    const onReorder = vi.fn(); setup({ reorderable: true, onReorder }); const h = document.querySelector('[data-handle="r2"]') as HTMLElement; h.focus();
    fireEvent.keyDown(h, { key: "ArrowDown", altKey: true }); expect(onReorder.mock.calls[0][0].slice(0, 3).map((r: R) => r.id)).toEqual(["r1", "r3", "r2"]);
    fireEvent.keyDown(h, { key: "ArrowUp", altKey: true }); expect(onReorder.mock.calls[1][0].slice(0, 2).map((r: R) => r.id)).toEqual(["r2", "r1"]); fireEvent.keyDown(h, { key: "End", altKey: true }); expect(onReorder.mock.calls[2][0].at(-1).id).toBe("r2");
    expect(screen.getByRole("status", { name: "" })).toBeDefined();
  });
  it("disables the handles while the table is sorted", async () => { setup({ reorderable: true, onReorder: vi.fn() }); expect(document.querySelector('[data-handle="r1"]')).toBeEnabled(); await userEvent.click(screen.getByRole("button", { name: /^Qty(?! column menu)/ })); expect(document.querySelector('[data-handle="r1"]')).toBeDisabled(); });
  it("reorders by dragging a handle onto another row", () => {
    const onReorder = vi.fn(); setup({ reorderable: true, onReorder }); const d = dt(); fireEvent.dragStart(document.querySelector('[data-handle="r1"]')!, { dataTransfer: d }); const target = document.querySelector('tr[data-row="r4"]')!; fireEvent.dragOver(target, { dataTransfer: d }); fireEvent.drop(target, { dataTransfer: d });
    expect(onReorder.mock.calls[0][0].slice(0, 4).map((r: R) => r.id)).toEqual(["r2", "r3", "r1", "r4"]);
  });
  it("moves a row between two tables sharing a drag group", () => {
    const onReceive = vi.fn(), onMoveOut = vi.fn();
    render(<MemoryRouter><DataTable<R> rows={rows.slice(0, 3)} cols={cols} selectable={false} reorderable dragGroup="g" onMoveOut={onMoveOut} ariaLabel="A" /><DataTable<R> rows={rows.slice(5, 7)} cols={cols} selectable={false} reorderable dragGroup="g" onReceive={onReceive} ariaLabel="B" /></MemoryRouter>);
    const d = dt(); fireEvent.dragStart(document.querySelector('[data-handle="r1"]')!, { dataTransfer: d }); const target = document.querySelector('tr[data-row="r7"]')!; fireEvent.drop(target, { dataTransfer: d });
    expect(onReceive).toHaveBeenCalledWith(expect.objectContaining({ id: "r1" }), "r7"); d.dropEffect = "move"; fireEvent.dragEnd(document.querySelector('[data-handle="r1"]')!, { dataTransfer: d }); expect(onMoveOut).toHaveBeenCalledWith("r1");
  });
});
describe("headers (B027)", () => {
  it("renders group header cells with the right span and rotated headers", () => {
    setup({ cols: [{ key: "name", header: "Name" }, { key: "qty", header: "Qty", group: "Volume" }, { key: "cost", header: "Cost", group: "Volume", rotate: true }, { key: "region", header: "Region" }] });
    const g = document.querySelector("th.adm-th-group") as HTMLElement; expect(g).toHaveTextContent("Volume"); expect(g.getAttribute("colspan")).toBe("2"); expect(document.querySelectorAll("thead tr")).toHaveLength(2); expect(document.querySelector('th[data-col="name"]')!.getAttribute("rowspan")).toBe("2"); expect(document.querySelector('th[data-col="cost"]')).toHaveClass("adm-th--rot");
  });
});
describe("diff and live rows (B029, B030)", () => {
  it("marks added, removed and changed cells against a snapshot, and can be toggled off", async () => {
    const before = [...rows.slice(0, 4), { id: "gone", name: "gone-row", region: "QLD", status: "Open", qty: 1, cost: 5 }].map((r) => (r.id === "r2" ? { ...r, cost: 999 } : r));
    setup({ rows: rows.slice(0, 5), diff: { before } }); expect(screen.getByText("name5").closest("tr")).toHaveClass("is-added"); expect(screen.getByText("gone-row").closest("tr")).toHaveClass("is-removed");
    const changed = screen.getByText("$20").closest("td")!; expect(changed).toHaveClass("is-changed"); expect(changed).toHaveAttribute("title", "Was: 999"); expect(screen.getByText("+1")).toBeInTheDocument(); expect(screen.getByText("−1")).toBeInTheDocument(); expect(screen.getByText("~1")).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("Diff vs snapshot")); expect(screen.queryByText("gone-row")).not.toBeInTheDocument();
  });
  it("flashes changed cells and new rows when live data arrives", () => {
    const { rerender } = setup({ flash: true }); expect(document.querySelector(".is-flash")).toBeNull();
    rerender(<MemoryRouter><DataTable<R> rows={[{ id: "new", name: "fresh", region: "QLD", status: "Open", qty: 1, cost: 1 }, ...rows.map((r) => (r.id === "r3" ? { ...r, cost: 777 } : r))]} cols={cols} pageSize={25} selectable={false} flash /></MemoryRouter>);
    expect(screen.getByText("$777").closest("td")).toHaveClass("is-flash"); expect(screen.getByText("fresh").closest("tr")).toHaveClass("is-new");
  });
});
describe("find in table (B034)", () => {
  it("opens with Ctrl+F, highlights, counts, steps through matches and jumps pages", async () => {
    setup({ findable: true, pageSize: 5 }); fireEvent.keyDown(document.querySelector(".adm-dt__wrap")!, { key: "f", ctrlKey: true }); const input = await screen.findByLabelText("Find in table", { selector: "input" });
    await userEvent.type(input, "name1"); expect(screen.getByText("1 of 4")).toBeInTheDocument(); // name1, name10, name11, name12
    expect(document.querySelectorAll("mark.adm-mark").length).toBeGreaterThan(0); expect(document.querySelector("mark.is-cur")).toHaveTextContent("name1");
    await userEvent.click(screen.getByRole("button", { name: "Next match" })); expect(screen.getByText("2 of 4")).toBeInTheDocument(); await waitFor(() => expect(document.querySelector('tr[data-row="r10"]')).toBeInTheDocument()); // moved to page 2 (text is split by <mark>)
    await userEvent.click(screen.getByRole("button", { name: "Previous match" })); expect(screen.getByText("1 of 4")).toBeInTheDocument();
    await userEvent.clear(input); await userEvent.type(input, "zzz"); expect(screen.getByText("No matches")).toBeInTheDocument(); await userEvent.keyboard("{Escape}"); expect(screen.queryByRole("search")).not.toBeInTheDocument();
  });
});
describe("server-side mode (B033)", () => {
  it("delegates queries, shows an estimate and appends in load-more mode", async () => {
    const onQuery = vi.fn(); setup({ rows: rows.slice(0, 5), pageSize: 5, server: { total: 12400, estimated: true, mode: "more", onQuery } });
    await waitFor(() => expect(onQuery).toHaveBeenCalledWith(expect.objectContaining({ page: 1, append: false }))); expect(screen.getByText(/5 loaded of ~12,400 \(estimate\) rows/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Load more \(5\)/ })); await waitFor(() => expect(onQuery).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, append: true })));
    await userEvent.type(screen.getByLabelText("Search table"), "abc"); await waitFor(() => expect(onQuery).toHaveBeenLastCalledWith(expect.objectContaining({ q: "abc", page: 1 })), { timeout: 1500 });
  });
  it("uses server totals for pagination and does not filter locally", async () => {
    const onQuery = vi.fn(); setup({ rows: rows.slice(0, 5), pageSize: 5, server: { total: 40, mode: "pages", onQuery } }); expect(screen.getByRole("button", { name: "8" })).toBeInTheDocument(); expect(within(body()).getAllByRole("row")).toHaveLength(5);
    await userEvent.click(screen.getByRole("button", { name: "2" })); await waitFor(() => expect(onQuery).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, append: false })));
  });
});
describe("exports (B015)", () => {
  it("offers a menu of formats and copies Markdown / TSV of the visible columns", async () => {
    setup({ exports: ["csv", "json", "xlsx", "pdf", "md", "tsv"] }); await userEvent.click(screen.getByRole("button", { name: /Export/ })); expect(screen.getAllByRole("menuitem").map((m) => m.textContent)).toEqual(["CSV", "JSON", "Excel (.xlsx)", "PDF", "Copy as Markdown", "Copy for spreadsheet (TSV)"]);
    await userEvent.click(screen.getByRole("menuitem", { name: "Copy as Markdown" })); const md = vi.mocked(navigator.clipboard.writeText).mock.lastCall![0]; expect(md.split("\n")[0]).toBe("| Name | Region | Status | Qty | Cost |"); expect(md.split("\n")[1]).toBe("| --- | --- | --- | ---: | ---: |"); expect(md.split("\n")).toHaveLength(14); expect(await screen.findByText("Copied 12 rows")).toBeInTheDocument();
  });
  it("exports only the selection when rows are selected", async () => {
    setup({ selectable: true, exports: ["tsv"] }); await userEvent.click(within(body()).getAllByRole("checkbox")[1]); await userEvent.click(screen.getByRole("button", { name: /Export TSV/ })); expect(vi.mocked(navigator.clipboard.writeText).mock.lastCall![0].split("\n")).toHaveLength(2);
  });
});
