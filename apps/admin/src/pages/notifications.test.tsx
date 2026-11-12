import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { Notifications } from "./Notifications.tsx";

describe("notification inbox inline actions", () => {
  const mount = () => render(<MemoryRouter><PrefsProvider><Notifications /></PrefsProvider></MemoryRouter>);
  it("runs a contextual action in one click and offers undo", async () => {
    mount(); const li = screen.getByText("pxe-boot is unreachable").closest("li") as HTMLElement; await userEvent.click(within(li).getByRole("button", { name: "Retry check" }));
    expect(await screen.findByText(/Retry check: pxe-boot is unreachable/)).toBeInTheDocument(); expect(within(li).queryByRole("button", { name: /Mark .* as read/ })).toBeNull();
    await userEvent.click(await screen.findByRole("button", { name: "Undo" })); expect(within(screen.getByText("pxe-boot is unreachable").closest("li") as HTMLElement).getByRole("button", { name: /as read/ })).toBeInTheDocument();
  });
  it("marks one notification read inline", async () => {
    mount(); const li = screen.getByText("Noah Smith mentioned you").closest("li") as HTMLElement; await userEvent.click(within(li).getByRole("button", { name: /as read/ })); expect(await screen.findByText("Marked as read")).toBeInTheDocument();
  });
});
