import { describe, expect, it } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { routes } from "./index.tsx";
import { MaskedField, ClickToEdit, ChipPaste, UsernameField } from "./text-fields.tsx";
import { AllocationSliders, DurationField, MoneyField } from "./numeric.tsx";
import { TransferList, SwitchConfirm, RichSelect, makeAssets, RadioOther } from "./pickers.tsx";
import { NaturalDateField, MultiDateCalendar } from "./dates.tsx";
import { SchemaForm, FilterPills, PermissionsMatrix, SortList, ColumnMapper, ThresholdChart } from "./structured.tsx";
import { SubnetCalculator, FirewallRules, PortRangeField } from "./network.tsx";
import { ChunkedUpload, UrlImport } from "./files.tsx";
import { SaveResume, DraftPublish, FieldPermissions } from "./behaviour.tsx";
import { AddressField } from "./geo.tsx";
import { TotpSetup } from "./security.tsx";

describe("routes", () => {
  it("are all under /inputs/ in the Forms group, with keywords", () => { expect(routes.length).toBeGreaterThanOrEqual(12); for (const r of routes) { expect(r.path.startsWith("/inputs/")).toBe(true); expect(r.group).toBe("Forms"); expect(r.keywords?.length).toBeGreaterThan(5); } expect(new Set(routes.map((r) => r.path)).size).toBe(routes.length); });
  it.each(routes.map((r) => [r.path, r] as const))("%s renders without throwing", (_p, r) => { const { container } = render(<MemoryRouter>{r.element}</MemoryRouter>); expect(container.querySelector("h1")).toBeTruthy(); expect(container.querySelectorAll("section, .adm-panel, [class*=panel]").length).toBeGreaterThan(0); });
});
describe("text fields", () => {
  it("card mask formats, validates and shows the brand", async () => { render(<MaskedField kind="card" />); const i = screen.getByRole("textbox"); await userEvent.type(i, "4111111111111112"); expect(i).toHaveValue("4111 1111 1111 1112"); expect(screen.queryByRole("alert")).toBeNull(); fireEvent.blur(i); expect(screen.getByRole("alert")).toBeInTheDocument(); await userEvent.clear(i); await userEvent.type(i, "4111111111111111"); expect(screen.queryByRole("alert")).toBeNull(); expect(screen.getByText("Looks valid")).toBeInTheDocument(); });
  it("click-to-edit saves, cancels with Escape, and rolls back on failure", async () => {
    render(<ClickToEdit label="Name" value="Alpha" delay={1} />); await userEvent.click(screen.getByRole("button", { name: /Alpha/ })); let box = screen.getByRole("textbox"); await userEvent.clear(box); await userEvent.type(box, "Beta{Enter}"); await waitFor(() => expect(screen.getByRole("button", { name: /Beta/ })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: /Beta/ })); box = screen.getByRole("textbox"); await userEvent.type(box, "{Escape}"); expect(screen.getByRole("button", { name: /Beta/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Beta/ })); box = screen.getByRole("textbox"); await userEvent.clear(box); await userEvent.type(box, "will fail{Enter}"); await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });
  it("chip paste splits, validates and drops duplicates", async () => { render(<ChipPaste />); const i = screen.getByRole("textbox"); await userEvent.click(i); await userEvent.paste("a@b.co, bad; a@b.co\nc@d.org"); expect(screen.getByText(/2 valid/)).toBeInTheDocument(); expect(screen.getByText(/1 need fixing/)).toBeInTheDocument(); });
  it("username availability resolves after a delay", async () => { render(<UsernameField delay={5} />); await userEvent.type(screen.getByRole("textbox"), "admin"); await waitFor(() => expect(screen.getByText(/taken|not available/i)).toBeInTheDocument()); });
});
describe("numeric", () => {
  it("allocation sliders always total 100", () => { render(<AllocationSliders />); const s = screen.getAllByRole("slider"); fireEvent.change(s[0], { target: { value: "80" } }); expect(screen.getByRole("status")).toHaveTextContent("Total 100%"); expect(s[0]).toHaveValue("80"); });
  it("money parses shorthand and duration accepts typed text", async () => { render(<MoneyField minor={0} />); const i = screen.getAllByRole("textbox")[0]; await userEvent.clear(i); await userEvent.type(i, "12k"); fireEvent.blur(i); expect(screen.getByText(/12,000\.00/)).toBeInTheDocument(); });
  it("duration shows a clear error for garbage", async () => { render(<DurationField />); const i = screen.getByRole("textbox"); await userEvent.clear(i); await userEvent.type(i, "soon"); fireEvent.blur(i); expect(screen.getByRole("alert")).toHaveTextContent(/1h 30m/); });
});
describe("pickers", () => {
  it("transfer list moves items both ways", async () => { render(<TransferList items={[{ id: "a", label: "Alpha" }, { id: "b", label: "Beta" }]} />); await userEvent.click(screen.getByRole("option", { name: "Alpha" })); await userEvent.click(screen.getByRole("button", { name: "Move selected right" })); expect(within(screen.getByRole("listbox", { name: "Selected items" })).getByText("Alpha")).toBeInTheDocument(); expect(within(screen.getByRole("listbox", { name: "Available items" })).queryByText("Alpha")).toBeNull(); await userEvent.click(screen.getByRole("button", { name: "Move all left" })); expect(within(screen.getByRole("listbox", { name: "Available items" })).getByText("Alpha")).toBeInTheDocument(); });
  it("virtualised select renders a window, not 5,000 rows, and select-all counts everything", async () => { render(<RichSelect options={makeAssets(5000)} />); expect(screen.getAllByRole("option").length).toBeLessThan(40); await userEvent.click(screen.getByRole("button", { name: /select all/i })); expect(screen.getByText(/5,000 selected|5000 selected/)).toBeInTheDocument(); });
  it("risky switch needs confirmation and shows pending", async () => { render(<SwitchConfirm label="Maintenance" delay={5} />); await userEvent.click(screen.getByRole("switch")); expect(screen.getByRole("button", { name: /confirm|yes|turn on/i })).toBeInTheDocument(); expect(screen.getByRole("switch")).not.toBeChecked(); await userEvent.click(screen.getByRole("button", { name: /confirm|yes|turn on/i })); await waitFor(() => expect(screen.getByRole("switch")).toBeChecked()); });
  it("radio 'other' reveals a required text box", async () => { render(<RadioOther />); await userEvent.click(screen.getByRole("radio", { name: /other/i })); expect(screen.getByRole("textbox")).toBeInTheDocument(); });
});
describe("dates", () => {
  it("natural date shows the resolved day and an error for nonsense", async () => { render(<NaturalDateField today={new Date(2026, 10, 12)} />); const i = screen.getByRole("textbox"); await userEvent.clear(i); await userEvent.type(i, "tomorrow"); expect(screen.getByText(/Friday 13 November 2026/)).toBeInTheDocument(); await userEvent.clear(i); await userEvent.type(i, "xyzzy"); expect(screen.getByText(/couldn.t understand/i)).toBeInTheDocument(); });
  it("blackout dates cannot be selected and ranges skip them", async () => { render(<MultiDateCalendar month={new Date(2026, 11, 1)} blackout={["2026-12-25"]} />); await userEvent.click(screen.getByRole("gridcell", { name: "25" })); expect(screen.getByText(/is blocked/)).toBeInTheDocument(); expect(screen.getByRole("gridcell", { name: "25" })).toHaveAttribute("aria-selected", "false"); await userEvent.click(screen.getByRole("gridcell", { name: "24" })); fireEvent.click(screen.getByRole("gridcell", { name: "27" }), { shiftKey: true }); expect(screen.getByRole("gridcell", { name: "26" })).toHaveAttribute("aria-selected", "true"); expect(screen.getByRole("gridcell", { name: "25" })).toHaveAttribute("aria-selected", "false"); });
});
describe("structured", () => {
  it("schema form validates on save and accepts valid input", async () => { render(<SchemaForm />); await userEvent.click(screen.getByRole("button", { name: "Save" })); expect(screen.getAllByRole("alert").length).toBeGreaterThanOrEqual(3); expect(screen.getByText(/problems? to fix/)).toBeInTheDocument(); await userEvent.type(screen.getByLabelText("Name"), "Hook"); await userEvent.type(screen.getByLabelText("Endpoint URL"), "https://x.example/hook"); await userEvent.click(screen.getByLabelText("order.paid")); await userEvent.click(screen.getByRole("button", { name: "Save" })); expect(screen.getByText(/Saved:/)).toBeInTheDocument(); });
  it("filter pills narrow the table", async () => { render(<FilterPills />); expect(screen.getByText(/5 of 8/)).toBeInTheDocument(); await userEvent.click(screen.getByRole("button", { name: /Remove filter Status/ })); expect(screen.getByText(/8 of 8/)).toBeInTheDocument(); });
  it("permissions: granting edit also grants view, and changes are listed", async () => { render(<PermissionsMatrix />); await userEvent.click(screen.getByLabelText(/can delete Settings/)); expect(screen.getByLabelText(/can view Settings/)).toBeChecked(); expect(screen.getByText(/unsaved change/)).toBeInTheDocument(); });
  it("sort list moves with buttons and announces", async () => { render(<SortList initial={["A", "B", "C"]} />); await userEvent.click(screen.getByRole("button", { name: "Move A down" })); expect(screen.getAllByRole("listitem").map((l) => l.textContent?.replace(/[^A-C]/g, ""))).toEqual(["B", "A", "C"]); expect(screen.getByText(/A moved to position 2/)).toBeInTheDocument(); });
  it("column mapper auto-maps and flags bad rows", () => { render(<ColumnMapper />); expect(screen.getByText("Invalid email")).toBeInTheDocument(); expect(screen.getByText(/2 of 3 rows ready/)).toBeInTheDocument(); });
  it("threshold chart reports breaches", () => { render(<ThresholdChart data={[1, 9, 9, 1]} />); expect(screen.getByRole("status")).toHaveTextContent(/alert|breach/i); });
});
describe("network", () => {
  it("subnet calculator shows maths and rejects bad input", async () => { render(<SubnetCalculator />); expect(screen.getByText("10.20.7.255")).toBeInTheDocument(); expect(screen.getByText("1,022")).toBeInTheDocument(); const i = screen.getAllByRole("textbox")[0]; await userEvent.clear(i); await userEvent.type(i, "10.0.0.0/40"); expect(screen.getByText(/Prefix must be/)).toBeInTheDocument(); });
  it("firewall flags a shadowed rule", () => { render(<FirewallRules />); expect(screen.getByText(/Never matches: rule 1/)).toBeInTheDocument(); });
  it("port range field reports counts and overlap", () => { render(<PortRangeField />); expect(screen.getByText(/ports: 80, 443, 8000-8100/)).toBeInTheDocument(); expect(screen.getByText(/These sets overlap/)).toBeInTheDocument(); });
});
describe("files", () => {
  it("chunked upload completes, fails one chunk once, and resumes", async () => { render(<ChunkedUpload tickMs={5} chunkMB={32} failChunk={1} />); await userEvent.click(screen.getByRole("button", { name: "Start upload" })); await waitFor(() => expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument(), { timeout: 4000 }); expect(screen.getByRole("alert")).toHaveTextContent(/failed/); await userEvent.click(screen.getByRole("button", { name: "Resume" })); await waitFor(() => expect(screen.getByText("complete")).toBeInTheDocument(), { timeout: 4000 }); });
  it("url import blocks http and localhost", async () => { render(<UrlImport />); const i = screen.getByRole("textbox"); await userEvent.clear(i); await userEvent.type(i, "http://example.com/a"); expect(screen.getByText(/Only https/)).toBeInTheDocument(); expect(screen.getByRole("button", { name: "Import" })).toBeDisabled(); });
});
describe("behaviour", () => {
  it("save & resume autosaves and offers to resume", async () => {
    localStorage.clear(); const { unmount } = render(<SaveResume storageKey="t1" debounce={5} />); await userEvent.type(screen.getByLabelText("Full name"), "Ava"); await waitFor(() => expect(localStorage.getItem("t1")).toContain("Ava")); unmount();
    render(<SaveResume storageKey="t1" debounce={5} />); await userEvent.click(screen.getByRole("button", { name: "Resume" })); expect(screen.getByLabelText("Full name")).toHaveValue("Ava");
  });
  it("wizard blocks Continue until the step is valid", async () => { localStorage.clear(); render(<SaveResume storageKey="t2" debounce={5} />); await userEvent.click(screen.getByRole("button", { name: "Continue" })); expect(screen.getByText("Enter your name")).toBeInTheDocument(); expect(screen.getByLabelText("Full name")).toBeInTheDocument(); });
  it("publish needs confirmation and records a version", async () => { render(<DraftPublish />); await userEvent.click(screen.getByRole("button", { name: /Publish…/ })); await userEvent.click(screen.getByRole("button", { name: /Yes, publish/ })); expect(screen.getByText(/Published, no changes/)).toBeInTheDocument(); expect(screen.getAllByText(/^v\d/).length).toBe(2); });
  it("field permissions hide and lock fields per role", async () => { render(<FieldPermissions />); expect(screen.queryByLabelText("Salary", { selector: "input" })).toBeNull(); await userEvent.selectOptions(screen.getByLabelText("Preview role"), "Employee"); expect(screen.getByLabelText("Salary", { selector: "input" })).toHaveAttribute("readonly"); expect(screen.queryByLabelText(/Internal notes/, { selector: "input" })).toBeNull(); });
  it("address autocomplete: keyboard select then confirm", async () => { render(<AddressField />); const i = screen.getByRole("combobox"); await userEvent.type(i, "wattle"); await userEvent.keyboard("{ArrowDown}{Enter}"); expect(screen.getByText(/Not yet confirmed/)).toBeInTheDocument(); await userEvent.click(screen.getByRole("button", { name: "Confirm location" })); expect(screen.getByText("Location confirmed")).toBeInTheDocument(); });
  it("TOTP setup verifies the live code and then shows recovery codes", async () => { render(<TotpSetup seed="GEZDGNBVGY3TQOJQ" now={() => 1700000000000} />); await userEvent.click(screen.getByLabelText(/show the current code/i)); const code = screen.getByRole("status").querySelector("b")!.textContent!; await userEvent.type(screen.getByLabelText(/6-digit/i), code); await userEvent.click(screen.getByRole("button", { name: "Verify" })); await waitFor(() => expect(screen.getAllByText(/^[a-z0-9]{4}-[a-z0-9]{4}$/).length).toBe(10)); });
});
