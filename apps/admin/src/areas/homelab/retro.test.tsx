import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { Retro } from "./Retro.tsx";
import { FIRMWARE, MEDIA, LOG, fwState, imagedPct, totalCost, byMachine } from "./retro.data.ts";
const wrap = (el: React.ReactNode) => render(<MemoryRouter><PrefsProvider>{el}</PrefsProvider></MemoryRouter>);
describe("retro logic", () => {
  it("flags outdated firmware", () => { expect(FIRMWARE().filter((f) => fwState(f) === "outdated").map((f) => f.machine)).toEqual(["Fuel", "Amiga 1200"]); });
  it("computes the imaged percentage ignoring paper manuals", () => { expect(imagedPct(MEDIA())).toBe(50); });
  it("totals cost and filters history newest first", () => { expect(totalCost(LOG())).toBe(74); expect(byMachine(LOG(), "Octane")).toHaveLength(1); });
});
describe("retro page", () => {
  it("adds a restoration log entry and shows it in the machine history", async () => {
    wrap(<Retro />); await userEvent.click(screen.getByRole("tab", { name: /Restoration log/ })); await userEvent.type(screen.getByRole("textbox", { name: /What did you do/ }), "Replaced PSU");
    await userEvent.click(screen.getByRole("button", { name: "Add to log" })); expect(await screen.findByText("Replaced PSU")).toBeInTheDocument();
  });
  it("disables Add until an action is typed", async () => { wrap(<Retro />); await userEvent.click(screen.getByRole("tab", { name: /Restoration log/ })); expect(screen.getByRole("button", { name: "Add to log" })).toBeDisabled(); });
});
