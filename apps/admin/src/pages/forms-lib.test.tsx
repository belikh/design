import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { useRef } from "react";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { Wizard } from "../pages/Wizard.tsx";
import { Editable } from "@belikh/jupiter-ui/editable.tsx";
import { Disclosure } from "@belikh/jupiter-ui/kit.tsx";
import { FormSummary, parseDateShortcut, parsePasted, usePasteFill, useFieldErrors } from "@belikh/jupiter-ui/forms.tsx";

const NOW = new Date("2026-11-12T10:00:00Z"); // a Thursday
beforeEach(() => localStorage.clear());

describe("date shortcuts", () => {
  it("parses words, offsets and weekdays", () => {
    const p = (t: string) => parseDateShortcut(t, NOW);
    expect(p("today")).toBe("2026-11-12"); expect(p("tomorrow")).toBe("2026-11-13"); expect(p("yesterday")).toBe("2026-11-11"); expect(p("+3d")).toBe("2026-11-15"); expect(p("in 2 weeks")).toBe("2026-11-26");
    expect(p("+1m")).toBe("2026-12-12"); expect(p("-2d")).toBe("2026-11-10"); expect(p("next mon")).toBe("2026-11-16"); expect(p("thu")).toBe("2026-11-19"); expect(p("2027-01-02")).toBe("2027-01-02");
    expect(p("whenever")).toBeNull(); expect(p("")).toBeNull();
  });
  it("is accepted by the date editor", async () => {
    const onSave = vi.fn(); render(<PrefsProvider><Editable value="2026-12-01" editor={{ type: "date" }} label="Due" onSave={onSave} /></PrefsProvider>);
    await userEvent.click(screen.getByRole("button", { name: "Edit Due" })); const input = await screen.findByRole("textbox", { name: "Due" }); await userEvent.clear(input); await userEvent.type(input, "+2d{Enter}");
    await waitFor(() => expect(onSave).toHaveBeenCalled()); expect(onSave.mock.calls[0][0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("rejects nonsense with a helpful message", async () => {
    render(<PrefsProvider><Editable value="2026-12-01" editor={{ type: "date" }} label="Due" onSave={() => null} /></PrefsProvider>);
    await userEvent.click(screen.getByRole("button", { name: "Edit Due" })); const input = await screen.findByRole("textbox", { name: "Due" }); await userEvent.clear(input); await userEvent.type(input, "banana{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent(/Enter a date/);
  });
});
describe("select with many options", () => {
  it("uses a searchable combobox above seven options", async () => {
    const options = Array.from({ length: 9 }, (_, i) => ({ value: `v${i}`, label: `Option ${i}` })); const onSave = vi.fn();
    render(<PrefsProvider><Editable value="v1" editor={{ type: "select", options }} label="Pick" onSave={onSave} /></PrefsProvider>);
    await userEvent.click(screen.getByRole("button", { name: "Edit Pick" })); expect(screen.queryByRole("combobox", { name: "Pick" })?.tagName).not.toBe("SELECT"); expect(await screen.findByRole("combobox")).toBeInTheDocument();
  });
});
describe("paste to fill", () => {
  it("parses Label: value lines and tab-separated rows", () => {
    expect(parsePasted("Name: Ava\nEmail: a@b.c").pairs).toEqual([["Name", "Ava"], ["Email", "a@b.c"]]); expect(parsePasted("Ava\ta@b.c\t5").positional).toEqual(["Ava", "a@b.c", "5"]); expect(parsePasted("just some prose").pairs).toEqual([]);
  });
  const Form = ({ onFilled }: { onFilled: (n: number, s: string[]) => void }) => { const ref = useRef<HTMLFormElement>(null); usePasteFill(ref, onFilled); return <form ref={ref}><label htmlFor="n">Name</label><input id="n" /><label htmlFor="e">Email *</label><input id="e" /></form>; };
  it("fills fields by label and reports what it skipped", () => {
    const onFilled = vi.fn(); render(<Form onFilled={onFilled} />); const f = document.querySelector("form")!;
    fireEvent.paste(f, { clipboardData: { getData: () => "Name: Ava\nemail: ava@x.io\nPhone: 1" } });
    expect((document.getElementById("n") as HTMLInputElement).value).toBe("Ava"); expect((document.getElementById("e") as HTMLInputElement).value).toBe("ava@x.io"); expect(onFilled).toHaveBeenCalledWith(2, ["Phone"]);
  });
});
describe("field errors", () => {
  it("shows a field's error after blur, and every error after submit", () => {
    const { result } = renderHook(() => useFieldErrors({ name: "", age: 5 }, { name: (v) => (v ? null : "Name is required"), age: (v) => (v >= 18 ? null : "Must be an adult") }));
    expect(result.current.error("name")).toBeUndefined(); act(() => result.current.blur("name")); expect(result.current.error("name")).toBe("Name is required"); expect(result.current.error("age")).toBeUndefined(); expect(result.current.summary).toEqual([]);
    let r: unknown; act(() => { r = result.current.submit(); }); expect(r).toBe("name"); expect(result.current.summary).toHaveLength(2); expect(result.current.error("age")).toBe("Must be an adult");
  });
  it("renders a summary with jump links", async () => {
    const jump = vi.fn(); render(<FormSummary items={[["name", "Name is required"]]} onJump={jump} />); await userEvent.click(screen.getByRole("button", { name: "Name is required" })); expect(jump).toHaveBeenCalledWith("name");
  });
});
describe("disclosure", () => { it("hides advanced fields until opened", async () => { render(<Disclosure label="More"><input aria-label="Secret" /></Disclosure>); expect(screen.getByText("More").closest("details")).not.toHaveAttribute("open"); }); });
describe("wizard", () => {
  const mount = (u = "/new") => render(<MemoryRouter initialEntries={[u]}><PrefsProvider><Wizard /></PrefsProvider></MemoryRouter>);
  it("opens at the step named in the URL and resumes a saved draft", async () => {
    localStorage.setItem("jp-draft:wizard-project", JSON.stringify({ name: "my-project", region: "ap-southeast-2", plan: "pro", cpu: 2, ha: true, env: [] }));
    mount("/new?step=3"); expect(await screen.findByText("my-project")).toBeInTheDocument(); expect(screen.getByText("Resumed your draft")).toBeInTheDocument();
  });
  it("moves forward and back through URL steps", async () => {
    mount("/new"); await userEvent.type(screen.getByLabelText(/Project name/), "abc-site"); await userEvent.click(screen.getByRole("button", { name: "Continue" })); expect(await screen.findByText(/Free/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Back" })); expect(await screen.findByLabelText(/Project name/)).toHaveValue("abc-site");
  });
});

describe("wizard: same as above", () => {
  it("copies the owner email to billing until unchecked", async () => {
    render(<MemoryRouter initialEntries={["/new"]}><PrefsProvider><Wizard /></PrefsProvider></MemoryRouter>);
    await userEvent.type(await screen.findByLabelText("Owner email"), "ava@example.com"); expect(screen.getByLabelText("Billing email")).toHaveValue("ava@example.com"); expect(screen.getByLabelText("Billing email")).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox", { name: /same as the owner/ })); expect(screen.getByLabelText("Billing email")).toBeEnabled(); await userEvent.clear(screen.getByLabelText("Billing email")); await userEvent.type(screen.getByLabelText("Billing email"), "ap@example.com");
    await userEvent.type(screen.getByLabelText("Owner email"), "x"); expect(screen.getByLabelText("Billing email")).toHaveValue("ap@example.com");
  });
});
