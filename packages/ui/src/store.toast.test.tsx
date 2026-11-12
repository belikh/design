import { describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { PrefsProvider, usePrefs } from "./store.tsx";

let api: ReturnType<typeof usePrefs>;
const Grab = () => { api = usePrefs(); return null; };
const mount = () => render(<PrefsProvider><Grab /></PrefsProvider>);

describe("toasts", () => {
  it("folds identical toasts into one with a count", () => {
    mount(); act(() => { api.toast({ kind: "ok", title: "Saved" }); api.toast({ kind: "ok", title: "Saved" }); api.toast({ kind: "ok", title: "Saved" }); });
    expect(screen.getAllByText("Saved")).toHaveLength(1); expect(screen.getByLabelText("3 times")).toBeInTheDocument();
  });
  it("does not fold toasts that carry an undo", () => {
    mount(); act(() => { api.toast({ kind: "ok", title: "Edited", undo: () => {} }); api.toast({ kind: "ok", title: "Edited", undo: () => {} }); });
    expect(screen.getAllByText("Edited")).toHaveLength(2);
  });
  it("keeps at most five, dropping the oldest non-error first, and errors persist", () => {
    mount(); act(() => { api.toast({ kind: "danger", title: "Boom" }); for (let i = 0; i < 6; i++) api.toast({ kind: "ok", title: `n${i}` }); });
    expect(screen.getByText("Boom")).toBeInTheDocument(); expect(screen.queryByText("n0")).toBeNull(); expect(screen.getByText("n5")).toBeInTheDocument(); expect(screen.getAllByRole("status")).toHaveLength(5);
  });
});
