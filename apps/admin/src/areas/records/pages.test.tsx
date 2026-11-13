import { describe, expect, it } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { routes } from "./index.tsx";

const page = (path: string) => { const r = routes.find((x) => x.path === path)!; return render(<MemoryRouter><PrefsProvider>{r.element}</PrefsProvider></MemoryRouter>); };
const btn = (n: string | RegExp) => screen.getByRole("button", { name: n });

describe("registration", () => {
  it("registers every route under /records with unique paths", () => { const p = routes.map((r) => r.path); expect(new Set(p).size).toBe(p.length); expect(p.every((x) => x.startsWith("/records/"))).toBe(true); expect(routes.every((r) => r.group === "Records" && r.icon && r.label)).toBe(true); expect(routes.length).toBeGreaterThanOrEqual(25); });
});
describe("config editor", () => {
  it("stages a change, shows the diff, applies it, then rolls back", async () => {
    page("/records/config"); const ta = screen.getByLabelText("Config") as HTMLTextAreaElement; fireEvent.change(ta, { target: { value: ta.value.replace("cache.ttl=300", "cache.ttl=600") } });
    expect(screen.getByText("1 staged change")).toBeInTheDocument(); await userEvent.click(btn("Review and apply")); await userEvent.click(btn("Apply to live")); expect(screen.getByText("in sync with live")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: /History/ })); expect(screen.getByText("r2")).toBeInTheDocument(); await userEvent.click(btn("Roll back to this")); await userEvent.type(screen.getByLabelText("Confirmation"), "rollback"); await userEvent.click(btn("Delete permanently"));
    await userEvent.click(screen.getByRole("tab", { name: /History/ })); expect(screen.getByText("r3")).toBeInTheDocument(); expect(screen.getAllByText("Rolled back to r1").length).toBeGreaterThan(0);
  });
  it("blocks applying a config with syntax errors", async () => { page("/records/config"); fireEvent.change(screen.getByLabelText("Config"), { target: { value: "not valid" } }); expect(screen.getByRole("alert")).toHaveTextContent(/Line 1/); });
});
describe("roles matrix", () => {
  it("locks inherited permissions and explains where they come from", async () => {
    page("/records/roles"); await userEvent.click(within(screen.getByRole("listbox", { name: "Roles" })).getByRole("option", { name: /^Admin/ }));
    const inherited = screen.getByLabelText(/Admin read orders \(inherited from/); expect(inherited).toBeDisabled(); expect(inherited).toBeChecked(); expect(screen.getByLabelText(/Admin admin orders$/)).toBeEnabled();
    expect(screen.getAllByText(/granted directly|inherited from/).length).toBeGreaterThan(0);
  });
  it("lets you toggle a role’s own grant", async () => { page("/records/roles"); const cb = screen.getByLabelText(/Editor delete orders$/); expect(cb).not.toBeChecked(); await userEvent.click(cb); expect(cb).toBeChecked(); });
});
describe("team", () => {
  it("validates, dedupes and disables sending until addresses are valid", async () => {
    page("/records/team"); await userEvent.click(btn("Invite people")); const send = screen.getByRole("button", { name: /^Send/ }); expect(send).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Email addresses"), "new@x.co, bad@, new@x.co"); expect(screen.getByText("invalid: bad@")).toBeInTheDocument(); expect(screen.getByText("duplicate: new@x.co")).toBeInTheDocument(); expect(screen.getByRole("button", { name: /Send 1 invite/ })).toBeEnabled();
  });
  it("locks the owner’s role and lets other roles change", async () => {
    page("/records/team"); const selects = screen.getAllByLabelText(/^Role for /) as HTMLSelectElement[]; expect(selects[0]).toBeDisabled(); expect(selects[0].value).toBe("owner");
    expect(selects[1]).toBeEnabled(); await userEvent.selectOptions(selects[1], "viewer"); expect(selects[1].value).toBe("viewer");
  });
});
describe("maintenance windows", () => {
  it("rejects a window overlapping an existing one on a shared system", async () => {
    page("/records/maintenance"); await userEvent.click(btn("Schedule window")); await userEvent.type(screen.getByLabelText(/Title/), "Another DB job");
    fireEvent.change(screen.getByLabelText(/Start/), { target: { value: "2026-11-14T23:00" } }); fireEvent.change(screen.getByLabelText(/End/), { target: { value: "2026-11-15T01:00" } });
    await userEvent.click(screen.getByLabelText("db")); await userEvent.click(btn("Save window")); expect(screen.getByRole("alert")).toHaveTextContent(/Overlaps “Database patching”/);
    await userEvent.click(screen.getByLabelText("db")); await userEvent.click(screen.getByLabelText("web")); await userEvent.click(btn("Save window")); expect(screen.getByText("Another DB job")).toBeInTheDocument();
  });
});
describe("schema designer", () => {
  it("adds a field, flags a bad key, and reveals conditional fields in the generated form", async () => {
    page("/records/schema"); await userEvent.selectOptions(screen.getByLabelText("Add field"), "number"); expect(screen.getAllByText(/New number field/).length).toBeGreaterThan(0);
    const key = screen.getByLabelText(/Key \(camelCase\)/); await userEvent.clear(key); await userEvent.type(key, "Bad Key"); expect(screen.getAllByText(/not a valid key/).length).toBeGreaterThan(0);
    await userEvent.clear(key); await userEvent.type(key, "seats"); await userEvent.click(screen.getByRole("tab", { name: "JSON Schema" })); expect(screen.getByText(/"seats"/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Try the form" })); expect(screen.queryByLabelText(/Contract end/)).toBeNull(); await userEvent.selectOptions(screen.getByLabelText(/^Tier/), "Enterprise"); expect(screen.getByLabelText(/Contract end/)).toBeInTheDocument();
  });
});
describe("branding editor", () => {
  it("scopes edits to a preview and reports contrast failures live", async () => {
    page("/records/branding"); expect(screen.getByText(/contrast checks pass/)).toBeInTheDocument(); const before = screen.queryAllByText("fail").length;
    fireEvent.change(screen.getByLabelText("text hex"), { target: { value: "#f2f0ea" } }); expect(screen.queryAllByText("fail").length).toBeGreaterThan(before); expect(document.documentElement.style.getPropertyValue("--jp-text")).toBe("");
    await userEvent.click(btn("Reset")); expect(screen.getByText("matches shipped tokens")).toBeInTheDocument();
  });
});
describe("import wizard", () => {
  it("maps, validates problem rows, and imports only the clean ones", async () => {
    page("/records/import"); await userEvent.click(btn("Use sample data")); await userEvent.click(btn("Continue")); await userEvent.click(btn("Continue"));
    expect(screen.getByText(/with errors/)).toBeInTheDocument(); expect(screen.getByText(/duplicate emails/)).toBeInTheDocument(); expect(screen.getAllByText(/Invalid email|Not a number|Required/).length).toBeGreaterThan(0);
    await userEvent.click(btn("Continue")); expect(screen.getByText(/Will import/)).toBeInTheDocument(); await userEvent.click(btn("Import now")); expect(await screen.findByText("Import complete", {}, { timeout: 3000 })).toBeInTheDocument();
  }, 10000);
});
describe("bulk edit and split view", () => {
  it("queues a change, previews the count and applies it", async () => {
    page("/records/bulk-edit"); const first = screen.getByLabelText("Select P-100"); await userEvent.click(first); await userEvent.click(screen.getByLabelText("Select P-101")); await userEvent.click(btn(/Bulk edit \(2\)/));
    await userEvent.selectOptions(screen.getByLabelText("Field"), "tags"); await userEvent.type(screen.getByLabelText("Value"), "reviewed"); await userEvent.click(btn("Queue change")); expect(screen.getByText(/items will change/)).toBeInTheDocument();
    await userEvent.click(btn(/Apply to 2 items/)); expect(screen.getAllByText("reviewed").length).toBe(2);
  });
  it("resizes the split panes with the keyboard", async () => {
    page("/records/split"); const bar = screen.getAllByRole("separator", { name: "Resize list and detail" })[0]; bar.focus(); const w = Number(bar.getAttribute("aria-valuenow")); await userEvent.keyboard("{ArrowRight}"); expect(Number(bar.getAttribute("aria-valuenow"))).toBe(w + 16); await userEvent.keyboard("{Home}"); expect(bar.getAttribute("aria-valuenow")).toBe("200");
  });
});
describe("onboarding", () => {
  it("blocks dependent steps until prerequisites are done", async () => {
    page("/records/onboarding"); await userEvent.click(screen.getByRole("button", { name: /2\. Connect a domain/ })); expect(screen.getByRole("button", { name: "Verify domain" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: /1\. Create your first project/ })); await userEvent.click(screen.getByRole("button", { name: "Create project" }));
    await userEvent.click(screen.getByRole("button", { name: /2\. Connect a domain/ })); expect(screen.getByRole("button", { name: "Verify domain" })).toBeEnabled();
  });
});
describe("api keys", () => {
  it("shows a new key once and lets you revoke it", async () => {
    page("/records/api"); await userEvent.click(btn("Create key")); const create = screen.getAllByRole("button", { name: "Create key" }).pop()!; expect(create).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/Name/), "Deploy bot"); await userEvent.click(screen.getByLabelText("orders:read")); await userEvent.click(screen.getAllByRole("button", { name: "Create key" }).pop()!);
    expect(screen.getByText("You won’t be able to see this again")).toBeInTheDocument(); await userEvent.click(btn("I’ve saved it")); expect(screen.getByText("Deploy bot")).toBeInTheDocument(); expect(screen.getAllByText(/jp_live_.*•{12}/).length).toBeGreaterThan(0);
  });
  it("retries failing webhooks and records every attempt", async () => {
    page("/records/api"); await userEvent.click(screen.getByRole("tab", { name: /Webhooks/ })); await userEvent.type(screen.getByLabelText(/Endpoint URL/), "https://flaky.example.com/h"); await userEvent.click(btn("Add endpoint"));
    const rows = screen.getAllByRole("listitem").filter((li) => within(li).queryByText("https://flaky.example.com/h")); await userEvent.click(within(rows[0]).getByRole("button", { name: "Send test" })); await userEvent.click(screen.getByRole("tab", { name: /Delivery log/ })); expect(screen.getByText("3")).toBeInTheDocument(); expect(screen.getByText("delivered")).toBeInTheDocument();
  });
});
describe("backup, upgrade, incident", () => {
  it("requires typing RESTORE before an in-place restore", async () => {
    page("/records/backup"); await userEvent.click(screen.getByLabelText(/i-1112/)); await userEvent.click(btn("Continue")); await userEvent.click(screen.getByLabelText(/In place/)); await userEvent.click(btn("Continue"));
    const start = btn("Start restore"); expect(start).toBeDisabled(); await userEvent.type(screen.getByLabelText(/Type RESTORE/), "RESTORE"); expect(start).toBeEnabled(); expect(screen.getByText(/Data written in the last/)).toBeInTheDocument();
  });
  it("blocks an upgrade when pre-flight checks fail", async () => {
    page("/records/upgrade"); const start = btn("Start upgrade"); expect(start).toBeEnabled(); fireEvent.change(screen.getByLabelText("Free disk (GB)"), { target: { value: "5" } }); expect(start).toBeDisabled(); expect(screen.getByText(/blocking issue/)).toBeInTheDocument();
  });
  it("won’t resolve an incident without a summary and commander", async () => {
    page("/records/incident"); await userEvent.click(btn("Mark identified")); await userEvent.click(btn("Mark monitoring")); await userEvent.click(btn("Mark resolved")); expect(screen.getAllByText("monitoring").length).toBeGreaterThan(0);
  });
});
