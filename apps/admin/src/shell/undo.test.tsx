import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { App } from "../App.tsx";
import { clearUndo, pushUndo, redo, undo } from "@belikh/jupiter-ui/undo.ts";

beforeEach(() => clearUndo());
describe("undo stack", () => {
  it("undoes and redoes in order, and a new edit drops the redo branch", async () => {
    const log: string[] = []; const mk = (n: string) => ({ label: n, undo: () => { log.push(`u${n}`); }, redo: () => { log.push(`r${n}`); } });
    pushUndo(mk("a")); pushUndo(mk("b")); await undo(); await undo(); await redo(); expect(log).toEqual(["ub", "ua", "ra"]); pushUndo(mk("c")); expect(await redo()).toBe(false);
    expect(await undo()).toBe(true); expect(log.at(-1)).toBe("uc");
  });
});
describe("Ctrl+Z in the app", () => {
  const mount = () => render(<MemoryRouter initialEntries={["/tables/edit"]}><PrefsProvider><App /></PrefsProvider></MemoryRouter>);
  it("reverts an in-place edit and redoes it", async () => {
    mount(); const row = async () => (await screen.findByText("T-100")).closest("tr") as HTMLElement; const r0 = await row();
    await userEvent.dblClick(within(r0).getByText("Pick list 1")); const input = await screen.findByRole("textbox", { name: /Task for T-100/ }); await userEvent.clear(input); await userEvent.type(input, "Edited{Enter}");
    await waitFor(async () => expect(within(await row()).getByText("Edited")).toBeInTheDocument()); document.body.focus(); await waitFor(() => expect(document.querySelector(".adm-editable__ok")).not.toBeNull(), { timeout: 2000 }); await userEvent.keyboard("{Control>}z{/Control}");
    await waitFor(async () => expect(within(await row()).getByText("Pick list 1")).toBeInTheDocument()); await userEvent.keyboard("{Control>}{Shift>}z{/Shift}{/Control}");
    await waitFor(async () => expect(within(await row()).getByText("Edited")).toBeInTheDocument());
  });
  it("is cleared when you change page", async () => { const fn = vi.fn(); pushUndo({ label: "x", undo: fn, redo: fn }); clearUndo(); expect(await undo()).toBe(false); });
});
