import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { Network } from "./Network.tsx";
import { shadowed, RULES, leaseProblems, LEASES, VLANS, bestChannel, SPECTRUM_24, inSubnet, validCidr, peerState, PEERS } from "./network.data.ts";

const wrap = (el: React.ReactNode) => render(<MemoryRouter><PrefsProvider>{el}</PrefsProvider></MemoryRouter>);
describe("network logic", () => {
  it("finds the shadowed firewall rule", () => { expect(shadowed(RULES())).toEqual({ r4: "IoT to NAS (blocked)" }); });
  it("ignores disabled rules when shadowing", () => { const r = RULES().map((x) => (x.id === "r2" ? { ...x, enabled: false } : x)); expect(shadowed(r)).toEqual({}); });
  it("flags duplicate lease IPs", () => { const p = leaseProblems(LEASES(), VLANS()); expect(p.l4).toMatch(/Same IP/); expect(p.l5).toMatch(/Same IP/); expect(p.l1).toBeUndefined(); });
  it("checks subnet membership and CIDR", () => { expect(inSubnet("10.0.20.5", "10.0.20.0/24")).toBe(true); expect(inSubnet("10.0.21.5", "10.0.20.0/24")).toBe(false); expect(validCidr("10.0.0.0/33")).toBe(false); });
  it("picks the quietest of channels 1, 6, 11", () => { expect(bestChannel(SPECTRUM_24).channel).toBe(11); });
  it("classifies VPN peers by handshake age", () => { const s = PEERS().map(peerState); expect(s).toEqual(["connected", "stale", "connected", "disabled"]); });
});
describe("network page", () => {
  it("shows the topology and selects a device from the keyboard", async () => {
    wrap(<Network />); const node = await screen.findByRole("button", { name: /^AP garage, AP, updating/ }); node.focus(); await userEvent.keyboard("{Enter}");
    expect(node).toHaveAttribute("aria-pressed", "true"); expect(screen.getByRole("heading", { name: "AP garage" })).toBeInTheDocument();
  });
  it("warns about shadowed rules on the firewall tab", async () => { wrap(<Network />); await userEvent.click(screen.getByRole("tab", { name: /Firewall/ })); expect(await screen.findByText(/1 rule can never match/)).toBeInTheDocument(); });
  it("applies the recommended Wi-Fi channel", async () => { wrap(<Network />); await userEvent.click(screen.getByRole("tab", { name: /Wi-Fi/ })); await userEvent.click(screen.getByRole("button", { name: "Use channel 11" })); expect(await screen.findByText(/moved to channel 11/)).toBeInTheDocument(); });
});
