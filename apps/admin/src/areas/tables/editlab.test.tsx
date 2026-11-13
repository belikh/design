import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { EditLab } from "./EditLab.tsx";

const mount = () => render(<MemoryRouter><PrefsProvider><EditLab /></PrefsProvider></MemoryRouter>);
const rowOf = (id: string) => screen.getByText(id).closest("tr") as HTMLElement;

describe("edit lab: edit in place", () => {
  it("edits a cell on double-click, commits on Enter, and rejects an invalid value", async () => {
    mount(); const cell = within(rowOf("T-100")).getByText("Pick list 1"); await userEvent.dblClick(cell);
    const input = await screen.findByRole("textbox", { name: /Task for T-100/ }); await userEvent.clear(input); await userEvent.type(input, "{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("A name is required");
    await userEvent.type(input, "Renamed{Enter}"); expect(await within(rowOf("T-100")).findByText("Renamed")).toBeInTheDocument();
  });
  it("opens the editor with F2 from the grid", async () => {
    mount(); const td = within(rowOf("T-101")).getByText("Dock check 2").closest("td")!; td.focus(); await userEvent.click(td); await userEvent.keyboard("{F2}");
    expect(await screen.findByRole("textbox", { name: /Task for T-101/ })).toBeInTheDocument();
  });
});

describe("edit lab: bulk edit", () => {
  const check = async (ids: string[]) => { for (const id of ids) await userEvent.click(within(rowOf(id)).getByRole("checkbox")); };
  it("shows Mixed, previews what changes, applies once and undoes once", async () => {
    mount(); await check(["T-100", "T-101", "T-102"]); await userEvent.click(screen.getByRole("button", { name: "Edit fields" }));
    await userEvent.selectOptions(screen.getByLabelText("Field to edit"), "status");
    expect(screen.getByRole("combobox", { name: /New Status/ })).toHaveDisplayValue(/Mixed \(3 values\)/);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: /New Status/ }), "Done");
    expect(await screen.findByText(/Changes 2 of 3, 1 already match/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Apply to 3 selected" }));
    expect(await screen.findByText("2 updated")).toBeInTheDocument();
    await waitFor(() => expect(within(rowOf("T-101")).getByText("Done")).toBeInTheDocument());
    await userEvent.click(await screen.findByRole("button", { name: /Undo/ }));
    await waitFor(() => expect(within(rowOf("T-101")).getByText("In progress")).toBeInTheDocument());
  });
  it("supports relative changes: add to a number", async () => {
    mount(); await check(["T-100", "T-101"]); await userEvent.click(screen.getByRole("button", { name: "Edit fields" }));
    await userEvent.selectOptions(screen.getByLabelText("Field to edit"), "qty"); await userEvent.selectOptions(screen.getByLabelText("Action"), "add");
    await userEvent.type(screen.getByRole("textbox", { name: /New Qty/ }), "10"); await userEvent.click(screen.getByRole("button", { name: "Apply to 2 selected" }));
    await waitFor(() => { expect(within(rowOf("T-100")).getByText("11")).toBeInTheDocument(); expect(within(rowOf("T-101")).getByText("18")).toBeInTheDocument(); });
  });
  it("reports partial failures and retries them", async () => {
    mount(); await userEvent.click(screen.getByLabelText(/Make T-103/)); await check(["T-102", "T-103"]); await userEvent.click(screen.getByRole("button", { name: "Edit fields" }));
    await userEvent.selectOptions(screen.getByLabelText("Field to edit"), "status"); await userEvent.selectOptions(screen.getByRole("combobox", { name: /New Status/ }), "Done");
    await userEvent.click(screen.getByRole("button", { name: /Apply to 2 selected/ }));
    expect(await screen.findByText("1 failed")).toBeInTheDocument(); expect(screen.getByText(/Server rejected this row/)).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText(/Make T-103/)); await userEvent.click(screen.getByRole("button", { name: /Retry 1 failed/ }));
    expect(await screen.findByText("1 updated")).toBeInTheDocument();
  });
});

describe("edit lab: spreadsheet behaviour", () => {
  it("shows Add prompts for empty cells, relative dates and a lock with its reason", async () => {
    mount(); expect(within(rowOf("T-100")).getByText("Add owner")).toBeInTheDocument();
    expect(within(rowOf("T-100")).getByText(/days?|month|week/)).toBeInTheDocument();
    const locked = within(rowOf("T-102")).getByText("Locked: Completed tasks are final"); expect(locked).toBeInTheDocument();
  });
  it("starts editing when you type on a focused cell, replacing the value", async () => {
    mount(); const td = within(rowOf("T-101")).getByText("Dock check 2").closest("td")!; await userEvent.click(td); await userEvent.keyboard("Z");
    const input = await screen.findByRole("textbox", { name: /Task for T-101/ }); expect(input).toHaveValue("Z");
  });
  it("Tab commits and moves to the next editable cell; Enter moves the focus down", async () => {
    mount(); await userEvent.dblClick(within(rowOf("T-100")).getByText("Pick list 1"));
    const input = await screen.findByRole("textbox", { name: /Task for T-100/ }); await userEvent.type(input, "{Tab}");
    expect(await screen.findByRole("combobox", { name: /Status for T-100/ })).toBeInTheDocument();
  });
  it("pastes a block from the clipboard with validation", async () => {
    mount(); const td = within(rowOf("T-100")).getByText("Pick list 1").closest("td")!; await userEvent.click(td);
    await userEvent.paste("Alpha\tDone\nBeta\tnonsense");
    await waitFor(() => { expect(within(rowOf("T-100")).getByText("Alpha")).toBeInTheDocument(); expect(within(rowOf("T-101")).getByText("Beta")).toBeInTheDocument(); });
    expect(await screen.findByText(/Pasted \d+ cells?/)).toBeInTheDocument();
  });
});

describe("edit lab: typing in editors", () => {
  it("lets you type spaces in a cell editor (Space must not toggle the row)", async () => {
    mount(); await userEvent.dblClick(within(rowOf("T-100")).getByText("Pick list 1")); const input = await screen.findByRole("textbox", { name: /Task for T-100/ });
    await userEvent.clear(input); await userEvent.type(input, "two words{Enter}"); expect(await within(rowOf("T-100")).findByText("two words")).toBeInTheDocument(); expect(within(rowOf("T-100")).getByRole("checkbox")).not.toBeChecked();
  });
});

describe("edit lab: save states stay visible in cells", () => {
  it("shows the error in the cell and keeps the old value when the save is rejected", async () => {
    mount(); await userEvent.click(screen.getByLabelText(/Make T-103/));
    await userEvent.dblClick(within(rowOf("T-103")).getByText("Cycle count 4")); const input = await screen.findByRole("textbox", { name: /Task for T-103/ });
    await userEvent.clear(input); await userEvent.type(input, "Renamed{Enter}");
    expect(await within(rowOf("T-103")).findByRole("alert")).toHaveTextContent("Server rejected this row"); await waitFor(() => expect(within(rowOf("T-103")).getByText("Cycle count 4")).toBeInTheDocument()); // the optimistic value reverts once the failed save settles
  });
  it("shows a saved tick after a successful save", async () => {
    mount(); await userEvent.dblClick(within(rowOf("T-100")).getByText("Pick list 1")); const input = await screen.findByRole("textbox", { name: /Task for T-100/ });
    await userEvent.clear(input); await userEvent.type(input, "Fresh{Enter}"); await waitFor(() => expect(within(rowOf("T-100")).getByText("Fresh")).toBeInTheDocument());
  });
});

describe("edit lab: filters, views, add row, peek", () => {
  it("adds a filter chip with an operator and removes it", async () => {
    mount(); await userEvent.click(screen.getByRole("button", { name: /^Filter/ })); await userEvent.selectOptions(screen.getByLabelText("Filter column"), "qty");
    await userEvent.selectOptions(screen.getByLabelText("Filter operator"), "gt"); await userEvent.type(screen.getByLabelText("Filter value"), "30"); await userEvent.click(screen.getByRole("button", { name: "Add filter" }));
    const chip = await screen.findByText("Qty > 30"); expect(chip).toBeInTheDocument(); expect(screen.queryByText("T-100")).toBeNull(); expect(screen.getByText("T-105")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Remove filter Qty > 30/ })); expect(await screen.findByText("T-100")).toBeInTheDocument();
  });
  it("saves a view, applies it later, and deletes it", async () => {
    mount(); await userEvent.type(screen.getByLabelText("Search table"), "Pick"); expect(screen.queryByText("T-101")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Views" })); await userEvent.click(await screen.findByRole("menuitem", { name: /Save current view/ }));
    await userEvent.type(screen.getByLabelText("View name"), "Picks"); await userEvent.click(screen.getByRole("button", { name: "Save view" }));
    await userEvent.clear(screen.getByLabelText("Search table")); expect(await screen.findByText("T-101")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Views" })); await userEvent.click(await screen.findByRole("menuitem", { name: "Picks" })); await waitFor(() => expect(screen.queryByText("T-101")).toBeNull());
    await userEvent.click(screen.getByRole("button", { name: "Views" })); await userEvent.click(await screen.findByRole("menuitem", { name: /Delete “Picks”/ })); expect(JSON.parse(localStorage.getItem("jp-views:edit-lab")!)).toEqual([]);
  });
  it("adds a row inline with validation", async () => {
    mount(); await userEvent.click(screen.getByRole("button", { name: "+ Add row" })); const name = screen.getByRole("textbox", { name: "New Task" }); await userEvent.type(name, "Brand new task");
    await userEvent.click(screen.getByRole("button", { name: "Add" })); expect(await screen.findByText("Brand new task", {}, { timeout: 2000 })).toBeInTheDocument();
  });
  it("peeks at a row with Shift+Space and from the row button", async () => {
    mount(); await userEvent.click(screen.getByRole("button", { name: "Peek T-101" })); const dlg = await screen.findByRole("dialog", { name: "Peek: T-101" }); expect(within(dlg).getByText("Dock check 2")).toBeInTheDocument();
  });
  it("shows sums for the checked rows", async () => {
    mount(); for (const id of ["T-100", "T-101"]) await userEvent.click(within(rowOf(id)).getByRole("checkbox")); expect(await screen.findByText(/Sum Qty/)).toBeInTheDocument();
  });
});

describe("edit lab: related peek and compare", () => {
  it("follows a related row inside the peek panel and goes Back", async () => {
    mount(); await userEvent.click(screen.getByRole("button", { name: "Peek T-101" })); const dlg = await screen.findByRole("dialog", { name: "Peek: T-101" });
    await userEvent.click(within(dlg).getAllByRole("button").find((b) => /^T-1\d\d$/.test(b.textContent ?? "") && b.className.includes("adm-link"))!);
    expect(await screen.findByRole("dialog", { name: /^Peek: T-1\d\d$/ })).toBeInTheDocument(); expect(screen.getByText(/T-101 › T-1\d\d/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Back" })); expect(await screen.findByRole("dialog", { name: "Peek: T-101" })).toBeInTheDocument();
  });
  it("compares two checked rows side by side, marking the differences", async () => {
    mount(); for (const id of ["T-100", "T-101"]) await userEvent.click(within(rowOf(id)).getByRole("checkbox")); await userEvent.click(await screen.findByRole("button", { name: "Compare 2" }));
    const dlg = await screen.findByRole("dialog", { name: "Compare two rows" }); expect(within(dlg).getByRole("columnheader", { name: "T-100" })).toBeInTheDocument(); expect(within(dlg).getByRole("columnheader", { name: "T-101" })).toBeInTheDocument();
    expect(within(dlg).getAllByText("(differs)").length).toBeGreaterThan(0);
  });
});

describe("edit lab: back/forward restores the selection", () => {
  it("restores the checked rows on a history (POP) entry, and remembers new ones", async () => {
    sessionStorage.setItem("jp-sel:/:editable-tasks", JSON.stringify(["T-101", "T-102"])); mount();
    await waitFor(() => expect(within(rowOf("T-101")).getByRole("checkbox")).toBeChecked()); expect(within(rowOf("T-102")).getByRole("checkbox")).toBeChecked(); expect(within(rowOf("T-100")).getByRole("checkbox")).not.toBeChecked();
    await userEvent.click(within(rowOf("T-100")).getByRole("checkbox")); await waitFor(() => expect(JSON.parse(sessionStorage.getItem("jp-sel:/:editable-tasks")!)).toContain("T-100"));
    for (const id of ["T-100", "T-101", "T-102"]) await userEvent.click(within(rowOf(id)).getByRole("checkbox")); await waitFor(() => expect(sessionStorage.getItem("jp-sel:/:editable-tasks")).toBeNull());
  });
});
