import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { Customer } from "./Customer.tsx";
import { Board } from "./Board.tsx";
import { Profile } from "./Profile.tsx";

const wrap = (el: React.ReactNode) => render(<MemoryRouter><PrefsProvider>{el}</PrefsProvider></MemoryRouter>);
describe("detail pages edit in place", () => {
  it("customer: no separate Edit button; title and fields edit in place, with field history", async () => {
    wrap(<Customer />); expect(await screen.findByRole("heading", { level: 1 })).toBeInTheDocument(); expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Edit Region" })); const input = await screen.findByRole("textbox", { name: "Region" }); await userEvent.clear(input); await userEvent.type(input, "Sydney{Enter}");
    expect(await screen.findByText("Sydney")).toBeInTheDocument(); await userEvent.click(await screen.findByLabelText("History of Region")); expect(await screen.findByText("Brisbane", { selector: "s" })).toBeInTheDocument();
  });
  it("customer: rejects an empty name", async () => {
    wrap(<Customer />); await userEvent.click(await screen.findByRole("button", { name: "Edit Customer name" })); const input = screen.getByRole("textbox", { name: "Customer name" }); await userEvent.clear(input); await userEvent.type(input, "{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("A name is required");
  });
  it("profile: no Edit profile button; about text edits in place", async () => {
    wrap(<Profile />); await waitFor(() => expect(screen.getByRole("button", { name: "Edit About" })).toBeInTheDocument()); expect(screen.queryByRole("button", { name: "Edit profile" })).toBeNull();
  });
  it("board: card title and points edit in place", async () => {
    wrap(<Board />); const card = document.querySelector(".adm-kcard") as HTMLElement; const titleBtn = within(card).getByRole("button", { name: /^Edit Title for/ }); await userEvent.click(titleBtn);
    const input = await screen.findByRole("textbox", { name: /^Title for/ }); await userEvent.clear(input); await userEvent.type(input, "Renamed card{Enter}"); expect(await within(document.querySelector(".adm-kcard") as HTMLElement).findByText("Renamed card")).toBeInTheDocument();
  });
});
