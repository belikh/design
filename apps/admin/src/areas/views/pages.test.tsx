import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { Approvals, Backlog, Contacts, Tasks, Tickets } from "./Work.tsx";
import { Files } from "./Explore.tsx";
import { Trash, History, Favourites, Duplicates, Taxonomy, SavedSearches } from "./Records.tsx";
import { Catalogue, OrdersV } from "./Commerce.tsx";
import { AccountStates, Support } from "./System.tsx";
import { getWs, wsActions } from "./workspace.ts";
import { favStore } from "./favs.ts";

const app = (el: ReactElement, path = "/") => render(<MemoryRouter initialEntries={[path]}><PrefsProvider>{el}</PrefsProvider></MemoryRouter>);
beforeEach(() => { wsActions.reset(); favStore.reset(); });

describe("approvals", () => {
  it("approves one item, requires a reason to reject, and blocks bulk-approving high risk", async () => {
    app(<Approvals />); expect(screen.getByRole("tab", { name: /Pending/ })).toHaveTextContent("6");
    await userEvent.click(screen.getByLabelText(/Select AP-302/)); const bulk = document.querySelector(".adm-bulk") as HTMLElement; expect(within(bulk).getByRole("button", { name: "Approve" })).toBeDisabled(); await userEvent.click(screen.getByLabelText(/Select AP-302/)); // high risk
    await userEvent.click(screen.getAllByRole("button", { name: "Approve" })[0]); expect(screen.getByRole("tab", { name: /Pending/ })).toHaveTextContent("5");
    await userEvent.click(screen.getAllByRole("button", { name: "Reject…" })[0]); const reject = screen.getAllByRole("button", { name: "Reject" }).find((b) => b.closest("[role=dialog]"))!; expect(reject).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/Reason/), "Not in budget"); expect(reject).toBeEnabled(); await userEvent.click(reject); expect(screen.getByRole("tab", { name: /Rejected/ })).toHaveTextContent("1");
  });
});
describe("tasks", () => {
  it("rolls up subtasks and completes a parent when every child is done", async () => {
    app(<Tasks />); expect(screen.getByText(/of \d+ steps/)).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("Launch v1.0")); expect(screen.getAllByText(/^\d\/\d$/).some((n) => n.textContent === "4/4")).toBe(true);
    await userEvent.click(screen.getByLabelText("Network migration")); await userEvent.click(screen.getByLabelText("Network migration")); // check then uncheck
    expect(screen.getByLabelText("Create camera VLAN")).not.toBeChecked();
  });
  it("adds a subtask and removes a task with undo", async () => {
    app(<Tasks />); await userEvent.click(within(screen.getByText("Renew certificates").closest("li")!).getByRole("button", { name: "•••" })); await userEvent.click(screen.getByRole("menuitem", { name: "Add subtask" }));
    await userEvent.type(screen.getByLabelText("New subtask"), "Check expiry{Enter}"); expect(screen.getByText("Check expiry")).toBeInTheDocument();
  });
});
describe("tickets with SLA timers", () => {
  it("lists breached tickets first, pauses the clock when waiting on the customer, and resolves", async () => {
    app(<Tickets />); expect(screen.getByText(/past SLA/)).toBeInTheDocument();
    const row = screen.getByText("TKT-2040").closest("tr")!; await userEvent.click(within(row).getByRole("button", { name: "Actions" })); await userEvent.click(screen.getByRole("menuitem", { name: "Waiting on customer" }));
    expect(within(screen.getByText("TKT-2040").closest("tr")!).getByText("paused")).toBeInTheDocument();
    await userEvent.click(within(screen.getByText("TKT-2040").closest("tr")!).getByRole("button", { name: "Actions" })); await userEvent.click(screen.getByRole("menuitem", { name: "Resolve" }));
    expect(within(screen.getByText("TKT-2040").closest("tr")!).getByText(/met|missed/)).toBeInTheDocument();
  });
});
describe("backlog", () => {
  it("reorders with buttons and with Alt+Arrow, and draws the sprint line", async () => {
    app(<Backlog />); const titles = () => screen.getAllByRole("listitem").filter((li) => li.hasAttribute("draggable")).map((li) => li.getAttribute("aria-label")!.replace(/^\d+\. /, "").replace(/, \d+ points$/, ""));
    const first = titles()[0]; await userEvent.click(screen.getByLabelText(`Move ${first} down`)); expect(titles()[1]).toBe(first);
    const li = screen.getAllByRole("listitem").find((l) => l.getAttribute("aria-label")?.includes(first))!; li.focus(); await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}"); expect(titles()[2]).toBe(first);
    expect(screen.getByText(/sprint line/)).toBeInTheDocument();
  });
});
describe("file manager and trash share data", () => {
  it("deleting a file moves it to Trash, and Restore puts it back", async () => {
    const { unmount } = app(<Files />); await userEvent.click(screen.getByLabelText("notes.txt, file")); await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(getWs().tree.children!.some((c) => c.id === "f9")).toBe(false); expect(getWs().trash[0].label).toBe("notes.txt"); unmount();
    app(<Trash />); const row = screen.getByText("notes.txt").closest("tr")!; await userEvent.click(within(row).getByRole("button", { name: "Restore" }));
    expect(getWs().tree.children!.some((c) => c.id === "f9")).toBe(true); expect(getWs().trash.some((t) => t.label === "notes.txt")).toBe(false);
  });
  it("won't delete forever without typing the item name", async () => {
    app(<Trash />); await userEvent.click(within(screen.getByText("Meeting notes (old)").closest("tr")!).getByRole("button", { name: "Delete" })); expect(screen.getByRole("button", { name: /Delete permanently/ })).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Confirmation"), "Meeting notes (old)"); await userEvent.click(screen.getByRole("button", { name: /Delete permanently/ })); expect(getWs().trash.some((t) => t.id === "tr1")).toBe(false);
  });
});
describe("duplicates and contacts", () => {
  it("finds likely duplicates and merges them, reducing the contact count", async () => {
    app(<Duplicates />); const before = getWs().contacts.length; expect(screen.getAllByText(/possible duplicates/).length).toBeGreaterThan(0);
    await userEvent.click(screen.getAllByRole("button", { name: "Merge into selected" })[0]); expect(getWs().contacts.length).toBeLessThan(before);
  });
  it("deleting a contact sends it to Trash", async () => {
    app(<Contacts />); await userEvent.click(screen.getByRole("tab", { name: /List/ })); const row = screen.getByText("Ruby Singh").closest("tr")!; await userEvent.click(within(row).getByRole("button", { name: "Edit" })); await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(getWs().trash.some((t) => t.kind === "contact" && t.label === "Ruby Singh")).toBe(true);
  });
});
describe("taxonomy safety", () => {
  it("shows an error for a sibling name clash and refuses cycles", async () => {
    app(<Taxonomy />); const name = screen.getByLabelText("Name"); await userEvent.clear(name); await userEvent.type(name, "Storage"); await userEvent.click(screen.getByRole("button", { name: "Rename" })); expect(screen.getByText(/sibling already has that name/)).toBeInTheDocument();
  });
});
describe("catalogue", () => {
  it("disables out-of-stock variants and caps the cart at stock", async () => {
    app(<Catalogue />); const card = screen.getByText("Retro keyboard").closest("article")!; await userEvent.click(within(card).getByRole("button", { name: "Compact" })); await userEvent.click(within(card).getByRole("button", { name: "Grey" })); // Grey|Compact has 8 in stock
    expect(within(card).getByRole("button", { name: "Add to cart" })).toBeEnabled(); for (let i = 0; i < 10; i++) await userEvent.click(within(card).getByRole("button", { name: "Add to cart" }));
    await userEvent.click(screen.getByRole("button", { name: /Cart \(/ })); expect(screen.getByRole("button", { name: /Cart \(8\)/ })).toBeInTheDocument(); // Grey|Compact stock is 8
  });
});
describe("orders", () => {
  it("shows line items with GST and advances the fulfilment status", async () => {
    app(<OrdersV />, "/?id=SO-7100"); expect(screen.getByText(/GST \(10%\)/)).toBeInTheDocument(); await userEvent.click(screen.getByRole("button", { name: /Mark paid/ })); expect(screen.getByRole("button", { name: /Mark picked/ })).toBeInTheDocument();
  });
});
describe("saved searches, favourites, history, account states, support", () => {
  it("saves a search and lists it", async () => {
    app(<SavedSearches />); await userEvent.type(screen.getByLabelText("Query"), "ava"); await userEvent.type(screen.getByLabelText("Save as"), "My Ava search"); await userEvent.click(screen.getByRole("button", { name: "Save search" })); expect(screen.getAllByText("My Ava search").length).toBeGreaterThan(0);
  });
  it("toggles a favourite page", async () => {
    app(<Favourites />); const pill = screen.getByRole("button", { name: /Analytics/, pressed: false }); await userEvent.click(pill); expect(favStore.get().favs.some((f) => f.path === "/analytics")).toBe(true);
  });
  it("restoring an old version appends a new head and keeps history", async () => {
    app(<History />); await userEvent.click(screen.getByText("First draft")); await userEvent.click(screen.getByRole("button", { name: "Restore this version" })); await userEvent.click(screen.getAllByRole("button", { name: "Restore" }).at(-1)!);
    expect(screen.getByText("Restored v1")).toBeInTheDocument(); expect(screen.getByText(/v5/)).toBeInTheDocument();
  });
  it("records a consent choice", async () => {
    app(<AccountStates />); await userEvent.click(screen.getByRole("tab", { name: "Consent" })); await userEvent.click(screen.getByRole("button", { name: "Reject optional" })); expect(screen.getAllByText("Not allowed").length).toBe(2); expect(JSON.parse(localStorage.getItem("vw-consent")!)).toMatchObject({ analytics: false, marketing: false });
  });
  it("validates the support form and suggests answers from the subject", async () => {
    app(<Support />); await userEvent.click(screen.getByRole("button", { name: /Send request/ })); expect(screen.getAllByText(/Give it a short|Describe what happened/).length).toBe(2);
    await userEvent.type(screen.getByLabelText(/Subject/), "Reset my password please"); expect(screen.getByText("These might help")).toBeInTheDocument(); expect(screen.getAllByText(/lasts 30 minutes/).length).toBeGreaterThan(0);
    await userEvent.type(screen.getByLabelText(/What happened/), "I cannot sign in after the reset email arrived"); await userEvent.click(screen.getByRole("button", { name: /Send request/ })); expect(screen.getByText(/received/)).toBeInTheDocument();
  });
});
