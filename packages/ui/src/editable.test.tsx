import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrefsProvider, usePrefs } from "./store.tsx";
import { Editable, coerce, formatValue, INVALID, validateSpec, type CommitMode, type EditValue, type EditorSpec } from "./editable.tsx";

const num: EditorSpec = { type: "number", min: 0, max: 100, unit: "kg" };
function Field({ commit, onSave, spec = { type: "text" }, value = "Ava", label = "Name", validate }: { commit?: CommitMode; onSave?: (v: EditValue) => unknown; spec?: EditorSpec; value?: EditValue; label?: string; validate?: (v: EditValue) => string | null }) {
  return <PrefsProvider><Editable value={value} editor={spec} label={label} commit={commit} validate={validate} onSave={(onSave ?? (() => {})) as never} /></PrefsProvider>;
}
const start = async (label = "Name") => { await userEvent.click(screen.getByRole("button", { name: `Edit ${label}` })); return screen.getByLabelText(label); };

describe("pure helpers", () => {
  it("coerces numbers and rejects junk", () => { expect(coerce(num, "1,234.5")).toBe(1234.5); expect(coerce(num, "abc")).toBe(INVALID); expect(coerce(num, "")).toBe(INVALID); });
  it("validates ranges, lengths and options", () => {
    expect(validateSpec(num, "101")).toMatch(/at most 100/); expect(validateSpec(num, "-1")).toMatch(/at least 0/); expect(validateSpec(num, "50")).toBeNull();
    expect(validateSpec({ type: "text", maxLength: 3 }, "abcd")).toMatch(/Max 3/); expect(validateSpec({ type: "select", options: [{ value: "a", label: "A" }] }, "b")).toMatch(/Choose/);
    expect(validateSpec({ type: "text" }, "x", (v) => (v === "x" ? "nope" : null))).toBe("nope");
  });
  it("formats values", () => { expect(formatValue(num, 5)).toBe("5 kg"); expect(formatValue({ type: "tags" }, ["a", "b"])).toBe("a, b"); expect(formatValue({ type: "boolean" }, true)).toBe("Yes"); });
});

describe("Editable: blur mode", () => {
  it("commits on Enter", async () => { const save = vi.fn(); render(<Field commit="blur" onSave={save} />); const i = await start(); await userEvent.clear(i); await userEvent.type(i, "Noah{Enter}"); expect(save).toHaveBeenCalledWith("Noah", expect.anything()); });
  it("commits when focus leaves", async () => { const save = vi.fn(); render(<><Field commit="blur" onSave={save} /><button>elsewhere</button></>); const i = await start(); await userEvent.clear(i); await userEvent.type(i, "Mia"); await userEvent.click(screen.getByText("elsewhere")); expect(save).toHaveBeenCalledWith("Mia", expect.anything()); });
  it("Escape cancels without saving", async () => { const save = vi.fn(); render(<Field commit="blur" onSave={save} />); const i = await start(); await userEvent.type(i, "zzz{Escape}"); expect(save).not.toHaveBeenCalled(); expect(screen.getByRole("button", { name: "Edit Name" })).toHaveTextContent("Ava"); });
  it("does not save an unchanged value", async () => { const save = vi.fn(); render(<Field commit="blur" onSave={save} />); await start(); await userEvent.keyboard("{Enter}"); expect(save).not.toHaveBeenCalled(); });
  it("keeps the editor open and explains an invalid value on blur", async () => {
    const save = vi.fn(); render(<><Field commit="blur" onSave={save} spec={num} value={5} label="Weight" /><button>elsewhere</button></>);
    const i = await start("Weight"); await userEvent.clear(i); await userEvent.type(i, "500"); await userEvent.click(screen.getByText("elsewhere"));
    expect(save).not.toHaveBeenCalled(); expect(screen.getByRole("alert")).toHaveTextContent(/at most 100/); expect(screen.getByLabelText("Weight")).toBeInTheDocument();
  });
  it("coerces numbers before saving", async () => { const save = vi.fn(); render(<Field commit="blur" onSave={save} spec={num} value={5} label="Weight" />); const i = await start("Weight"); await userEvent.clear(i); await userEvent.type(i, "42{Enter}"); expect(save).toHaveBeenCalledWith(42, expect.anything()); });
  it("commits a select as soon as you choose", async () => { const save = vi.fn(); render(<Field commit="blur" onSave={save} spec={{ type: "select", options: [{ value: "a", label: "A" }, { value: "b", label: "B" }] }} value="a" label="Pick" />); await start("Pick"); await userEvent.selectOptions(screen.getByLabelText("Pick"), "b"); expect(save).toHaveBeenCalledWith("b", expect.anything()); });
});

describe("Editable: explicit mode", () => {
  it("does not commit on blur; Save commits", async () => {
    const save = vi.fn(); render(<><Field commit="explicit" onSave={save} /><button>elsewhere</button></>); const i = await start(); await userEvent.clear(i); await userEvent.type(i, "Zoe"); await userEvent.click(screen.getByText("elsewhere"));
    expect(save).not.toHaveBeenCalled(); await userEvent.click(screen.getByRole("button", { name: "Save Name" })); expect(save).toHaveBeenCalledWith("Zoe", expect.anything());
  });
  it("Save is disabled until something changed and valid; Cancel discards", async () => {
    const save = vi.fn(); render(<Field commit="explicit" onSave={save} />); const i = await start(); expect(screen.getByRole("button", { name: "Save Name" })).toBeDisabled();
    await userEvent.type(i, "x"); expect(screen.getByRole("button", { name: "Save Name" })).toBeEnabled(); await userEvent.click(screen.getByRole("button", { name: "Cancel editing Name" })); expect(save).not.toHaveBeenCalled();
  });
  it("follows the saved preference when no mode is forced", async () => {
    function Probe() { const { setEditCommit } = usePrefs(); return <button onClick={() => setEditCommit("explicit")}>set explicit</button>; }
    render(<PrefsProvider><Probe /><Editable value="Ava" editor={{ type: "text" }} label="Name" onSave={() => {}} /></PrefsProvider>);
    await userEvent.click(screen.getByText("set explicit")); await start(); expect(screen.getByRole("button", { name: "Save Name" })).toBeInTheDocument();
  });
});

describe("Editable: saving, rollback and undo", () => {
  it("shows the new value optimistically, then confirms", async () => {
    let done!: () => void; const save = vi.fn(() => new Promise<void>((r) => { done = r; })); render(<Field commit="blur" onSave={save} />);
    const i = await start(); await userEvent.clear(i); await userEvent.type(i, "Leo{Enter}"); expect(screen.getByRole("button", { name: "Edit Name" })).toHaveTextContent("Leo"); expect(screen.getByLabelText("Saving")).toBeInTheDocument();
    done(); await waitFor(() => expect(screen.queryByLabelText("Saving")).not.toBeInTheDocument());
  });
  it("rolls back and reports a rejected save", async () => {
    const save = vi.fn().mockRejectedValue(new Error("Server said no")); render(<Field commit="blur" onSave={save} />); const i = await start(); await userEvent.clear(i); await userEvent.type(i, "Bad{Enter}");
    expect(await screen.findByText(/Server said no/)).toBeInTheDocument(); expect(screen.getByRole("button", { name: "Edit Name" })).toHaveTextContent("Ava");
  });
  it("treats a returned string as an error too", async () => { const save = vi.fn().mockResolvedValue("Name taken"); render(<Field commit="blur" onSave={save} />); const i = await start(); await userEvent.clear(i); await userEvent.type(i, "Dup{Enter}"); expect(await screen.findByText(/Name taken/)).toBeInTheDocument(); });
  it("offers Undo that restores the previous value", async () => {
    const save = vi.fn(); render(<Field commit="blur" onSave={save} />); const i = await start(); await userEvent.clear(i); await userEvent.type(i, "Max{Enter}");
    await userEvent.click(await screen.findByRole("button", { name: "Undo" })); await waitFor(() => expect(save).toHaveBeenLastCalledWith("Ava", expect.anything()));
  });
});

describe("Editable: keyboard flow", () => {
  it("Tab commits and opens the next editable, not the first", async () => {
    const a = vi.fn(), b = vi.fn(), c = vi.fn();
    render(<PrefsProvider><Editable value="A" editor={{ type: "text" }} label="One" commit="blur" onSave={a} /><Editable value="B" editor={{ type: "text" }} label="Two" commit="blur" onSave={b} /><Editable value="C" editor={{ type: "text" }} label="Three" commit="blur" onSave={c} /></PrefsProvider>);
    const two = await start("Two"); await userEvent.type(two, "2"); await userEvent.keyboard("{Tab}");
    await waitFor(() => expect(screen.getByLabelText("Three")).toHaveFocus()); expect(b).toHaveBeenCalledWith("B2", expect.anything()); expect(screen.queryByLabelText("One")).not.toBeInTheDocument();
  });
  it("Shift+Tab moves to the previous editable", async () => {
    render(<PrefsProvider><Editable value="A" editor={{ type: "text" }} label="One" commit="blur" onSave={() => {}} /><Editable value="B" editor={{ type: "text" }} label="Two" commit="blur" onSave={() => {}} /></PrefsProvider>);
    await start("Two"); await userEvent.keyboard("{Shift>}{Tab}{/Shift}"); await waitFor(() => expect(screen.getByLabelText("One")).toHaveFocus());
  });
  it("opens with F2 and Enter on the value", async () => { render(<Field commit="blur" />); screen.getByRole("button", { name: "Edit Name" }).focus(); await userEvent.keyboard("{F2}"); expect(screen.getByLabelText("Name")).toBeInTheDocument(); });
  it("a boolean is a one-click switch with no edit mode", async () => { const save = vi.fn(); render(<Field spec={{ type: "boolean" }} value={false} label="Active" onSave={save} />); await userEvent.click(screen.getByRole("switch", { name: "Active" })); expect(save).toHaveBeenCalledWith(true, expect.anything()); });
});

describe("format as you type (numbers)", () => {
  it("groups thousands while typing and still saves a plain number", async () => {
    const { groupDigits } = await import("./editable.tsx"); expect(groupDigits("1234567.5")).toBe("1,234,567.5"); expect(groupDigits("-1200")).toBe("-1,200"); expect(groupDigits("abc12")).toBe("12"); expect(groupDigits("007")).toBe("7"); expect(groupDigits("1.2.3")).toBe("1.23");
    const save = vi.fn(); render(<PrefsProvider><Editable value={5} editor={{ type: "number" }} label="Qty" onSave={save} /></PrefsProvider>); await userEvent.click(screen.getByRole("button", { name: "Edit Qty" })); const i = await screen.findByRole("textbox", { name: "Qty" });
    await userEvent.clear(i); await userEvent.type(i, "1234567{Enter}"); expect(i).toHaveValue("1,234,567"); await waitFor(() => expect(save).toHaveBeenCalledWith(1234567, expect.anything()));
  });
});
