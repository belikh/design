import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { Vault } from "./Vault.tsx";
import { NOTES, RUNS, STEPS, degree, orphans, needsCuration, progress } from "./vault.data.ts";
const wrap = (el: React.ReactNode) => render(<MemoryRouter><PrefsProvider>{el}</PrefsProvider></MemoryRouter>);
describe("vault logic", () => {
  it("counts connections both directions and finds orphans", () => { expect(degree(NOTES(), "n-hippo")).toBe(1); expect(degree(NOTES(), "n-mamba")).toBe(2); expect(orphans(NOTES()).map((n) => n.id).sort()).toEqual(["n-irix", "n-orphan"]); });
  it("queues notes lacking a summary and stale ones", () => { expect(needsCuration(NOTES())).toEqual({ "n-irix": "No summary", "n-unifi": "No summary", "n-vlan": "Untouched for 180+ days" }); });
  it("computes run progress out of 16 steps", () => { expect(STEPS).toHaveLength(16); expect(RUNS().map(progress)).toEqual([75, 25, 100]); });
});
describe("vault page", () => {
  it("selects a note in the graph by keyboard and shows its details", async () => { wrap(<Vault />); await userEvent.click(screen.getByRole("tab", { name: "Graph" })); const n = screen.getByRole("button", { name: /^HiPPO memory, 1 connections/ }); n.focus(); await userEvent.keyboard(" "); expect(screen.getByRole("heading", { name: "HiPPO memory" })).toBeInTheDocument(); });
  it("advances a running research run one step", async () => {
    wrap(<Vault />); await userEvent.click(screen.getByRole("tab", { name: /Runs/ })); await userEvent.click(await screen.findByRole("button", { name: /Advance State space models/ })); expect(await screen.findByText(/13\/16 cite-check/)).toBeInTheDocument();
  });
  it("does not let a blocked run advance", async () => { wrap(<Vault />); await userEvent.click(screen.getByRole("tab", { name: /Runs/ })); expect(await screen.findByRole("button", { name: /Advance IRIX/ })).toBeDisabled(); });
});
