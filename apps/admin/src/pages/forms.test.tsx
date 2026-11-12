import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { EditForm } from "./EditForm.tsx";
import { Wizard } from "./Wizard.tsx";

const wrap = (el: React.ReactNode) => render(<MemoryRouter><PrefsProvider>{el}</PrefsProvider></MemoryRouter>);
describe("EditForm", () => {
  it("blocks submit with errors, focuses the first invalid field, then saves when fixed", async () => {
    wrap(<EditForm />); const name = screen.getByLabelText(/Full name/); await userEvent.clear(name);
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0); expect(name).toHaveFocus();
    await userEvent.type(name, "Ava Nguyen"); await userEvent.click(screen.getByLabelText(/I accept the terms/));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect((await screen.findAllByText("Saving…", {}, { timeout: 2000 })).length).toBeGreaterThan(0); expect(await screen.findByText("All changes saved", {}, { timeout: 3000 })).toBeInTheDocument();
  });
  it("applies a cross-field rule (admins need 2+ seats)", async () => {
    wrap(<EditForm />); await userEvent.click(screen.getByLabelText("Decrease")); for (let i = 0; i < 4; i++) await userEvent.click(screen.getByLabelText("Decrease"));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" })); expect(screen.getAllByText(/at least 2 seats/i).length).toBeGreaterThan(0);
  });
  it("fills the form from pasted JSON and rejects wrong types", async () => {
    wrap(<EditForm />); await userEvent.click(screen.getByRole("button", { name: /Paste JSON/ }));
    const ta = screen.getByLabelText("JSON"); await userEvent.click(ta); await userEvent.paste('{"name":"Noah Smith","seats":"lots"}'); await userEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/Wrong type for: seats/);
    await userEvent.clear(ta); await userEvent.click(ta); await userEvent.paste('{"name":"Noah Smith"}'); await userEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(screen.getByLabelText(/Full name/)).toHaveValue("Noah Smith");
  });
});
describe("Wizard", () => {
  it("validates each step and reaches the success screen", async () => {
    wrap(<Wizard />); await userEvent.click(screen.getByRole("button", { name: "Continue" })); expect(screen.getAllByText(/lowercase letters/).length).toBeGreaterThan(0);
    await userEvent.type(screen.getByLabelText(/Project name/), "my-app"); await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    await userEvent.click(screen.getByLabelText(/Team/)); await userEvent.click(screen.getByRole("button", { name: "Continue" })); await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Review your choices")).toBeInTheDocument(); await userEvent.click(screen.getByRole("button", { name: /Launch/ }));
    expect(screen.getByText(/my-app is launching/)).toBeInTheDocument();
  });
});
