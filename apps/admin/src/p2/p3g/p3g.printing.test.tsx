import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { Printing } from "./Printing.tsx";
import { PRINTERS, JOBS, SPOOLS, canStart, nextJob, failureRate, usableGrams } from "./printing.data.ts";
const wrap = (el: React.ReactNode) => render(<MemoryRouter><PrefsProvider>{el}</PrefsProvider></MemoryRouter>);
describe("printing logic", () => {
  it("ignores humid and near-empty spools", () => { expect(usableGrams(SPOOLS(), "PLA")).toBe(950); expect(usableGrams(SPOOLS(), "ABS")).toBe(0); expect(usableGrams(SPOOLS(), "PETG")).toBe(420); });
  it("refuses a busy printer, short filament, and accepts a good start", () => {
    const [mk4, p1s] = PRINTERS(); const jobs = JOBS(); expect(canStart(mk4, jobs[1], SPOOLS()).ok).toBe(false);
    const short = canStart(p1s, jobs[2], SPOOLS()); expect(short.ok).toBe(false); expect(!short.ok && short.why).toMatch(/Needs 450 g PETG/);
    expect(canStart(p1s, jobs[1], SPOOLS()).ok).toBe(true);
  });
  it("picks the lowest priority number from the queue", () => { expect(nextJob(JOBS())?.name).toBe("Cable clips x20"); });
  it("computes failure rate from finished jobs", () => { expect(failureRate(JOBS())).toBe(50); });
});
describe("printing page", () => {
  it("pauses and resumes a print", async () => { wrap(<Printing />); const card = within(await screen.findByRole("region", { name: "Prusa MK4" })); await userEvent.click(card.getByRole("button", { name: "Pause" })); expect(await card.findByRole("button", { name: "Resume" })).toBeInTheDocument(); });
  it("starts the next queued job on an idle printer", async () => { wrap(<Printing />); const card = within(await screen.findByRole("region", { name: "Bambu P1S" })); await userEvent.click(card.getByRole("button", { name: "Start next job" })); expect(await card.findByText("Cable clips x20")).toBeInTheDocument(); expect(card.getByText("Printing")).toBeInTheDocument(); });
  it("clears a printer error", async () => { wrap(<Printing />); const card = within(await screen.findByRole("region", { name: "Ender 3 (legacy)" })); await userEvent.click(card.getByRole("button", { name: "Clear error" })); expect(await card.findByText("Idle")).toBeInTheDocument(); });
});
