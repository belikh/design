import { describe, expect, it, beforeEach } from "vitest";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { GeneralSettings } from "../pages/Settings.tsx";
import { UnsavedGuardHost, useAutosave, useDraft, useUnsavedGuard } from "@belikh/jupiter-ui/forms.tsx";

beforeEach(() => { localStorage.clear(); });

describe("useDraft", () => {
  it("restores a saved draft after remount and can discard it", async () => {
    const a = renderHook(() => useDraft("t", { x: "a" })); act(() => a.result.current.setValue({ x: "b" })); await waitFor(() => expect(localStorage.getItem("jp-draft:t")).toContain('"b"')); a.unmount();
    const b = renderHook(() => useDraft("t", { x: "a" })); expect(b.result.current.value).toEqual({ x: "b" }); await waitFor(() => expect(b.result.current.restored).toBe(true));
    act(() => b.result.current.discard()); expect(b.result.current.value).toEqual({ x: "a" }); expect(localStorage.getItem("jp-draft:t")).toBeNull();
  });
});
describe("useAutosave", () => {
  it("skips the initial value, saves after a change, and reports errors with retry", async () => {
    const saves: string[] = []; let fail = true;
    const { result, rerender } = renderHook(({ v }) => useAutosave(v, (x) => { saves.push(x); return fail ? "Nope" : null; }, 10), { initialProps: { v: "a" } });
    await new Promise((r) => setTimeout(r, 40)); expect(saves).toEqual([]);
    rerender({ v: "b" }); await waitFor(() => expect(result.current.status).toBe("error")); expect(result.current.error).toBe("Nope");
    fail = false; act(() => result.current.retry()); await waitFor(() => expect(result.current.status).toBe("saved")); expect(saves).toEqual(["b", "b"]);
  });
});
describe("unsaved-changes guard", () => {
  const Page = ({ dirty }: { dirty: boolean }) => { useUnsavedGuard(dirty); return <><a href="/elsewhere">Go</a><UnsavedGuardHost /></>; };
  it("asks before following an in-app link while dirty, and not when clean", async () => {
    const { rerender } = render(<MemoryRouter><Page dirty /></MemoryRouter>);
    await userEvent.click(screen.getByText("Go")); expect(await screen.findByText("Leave without saving?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Stay" })); await waitFor(() => expect(screen.queryByText("Leave without saving?")).toBeNull());
    rerender(<MemoryRouter><Page dirty={false} /></MemoryRouter>); await userEvent.click(screen.getByText("Go")); expect(screen.queryByText("Leave without saving?")).toBeNull();
  });
});
describe("general settings", () => {
  it("saves automatically without a Save button and validates", async () => {
    render(<MemoryRouter><PrefsProvider><GeneralSettings /></PrefsProvider></MemoryRouter>);
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    const name = screen.getByLabelText("Workspace name"); await userEvent.clear(name); expect(await screen.findByText(/Workspace name is required/, {}, { timeout: 3000 })).toBeInTheDocument();
    await userEvent.type(name, "Acme"); expect(await screen.findByText("Saved", {}, { timeout: 3000 })).toBeInTheDocument();
  });
});
