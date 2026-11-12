import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { Finance } from "./Finance.tsx";
import { BILLS, SUBS, BUDGETS, billState, budgetState, monthly, monthlyTotal, applyPayment, dueIn14, renewingSoon } from "./finance.data.ts";
const wrap = (el: React.ReactNode) => render(<MemoryRouter><PrefsProvider>{el}</PrefsProvider></MemoryRouter>);
describe("finance logic", () => {
  it("normalises yearly to monthly and skips cancelled", () => { expect(monthly(SUBS()[2])).toBe(8); expect(monthly(SUBS()[4])).toBe(0); expect(monthlyTotal(SUBS())).toBe(44.99); });
  it("classifies bills against the fixed date", () => { expect(BILLS().map(billState)).toEqual(["overdue", "due soon", "upcoming", "paid", "upcoming"]); });
  it("sums what is due in 14 days", () => { expect(dueIn14(BILLS())).toBe(406.3); });
  it("flags budget status", () => { expect(BUDGETS().map(budgetState)).toEqual(["ok", "ok", "ok", "warn", "over"]); });
  it("applies and reverses a payment on the right budget", () => { const b = BILLS()[0]; const paid = applyPayment(BUDGETS(), b); expect(paid[0].spent).toBe(361.6); expect(applyPayment(paid, b, -1)[0].spent).toBe(143.2); });
  it("finds subscriptions renewing within a week", () => { expect(renewingSoon(SUBS()).map((s) => s.name)).toEqual(["Streaming bundle", "Cloud backup"]); });
});
describe("finance page", () => {
  it("shows the overdue alert and marks a bill paid, which clears it", async () => {
    wrap(<Finance />); expect(await screen.findByText("1 overdue")).toBeInTheDocument();
    await userEvent.click(await screen.findByRole("button", { name: "Mark paid Origin Energy" })); expect(await screen.findByRole("button", { name: "Reopen Origin Energy" })).toBeInTheDocument(); expect(screen.queryByText("1 overdue")).not.toBeInTheDocument();
  });
  it("reflects the payment in the budget", async () => { wrap(<Finance />); await userEvent.click(screen.getByRole("tab", { name: "Budgets" })); expect((await screen.findAllByText("$361.60")).length).toBeGreaterThan(0); });
});
