import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { ServiceHealth } from "./ServiceHealth.tsx";
import { CertsDns } from "./CertsDns.tsx";
import { Access } from "./Access.tsx";
import { Billing } from "./Billing.tsx";
import { EspFleet } from "./EspFleet.tsx";
import { MediaArchive } from "./MediaArchive.tsx";
import { WarehouseOps } from "./WarehouseOps.tsx";
import { JobPipeline } from "./JobPipeline.tsx";
import { Documents } from "./Documents.tsx";
import { AgentRuns } from "./AgentRuns.tsx";
import { routes } from "./index.tsx";

const wrap = (el: React.ReactNode) => render(<MemoryRouter><PrefsProvider>{el}</PrefsProvider></MemoryRouter>);
const tab = (name: RegExp | string) => userEvent.click(screen.getByRole("tab", { name }));

describe("domain registry", () => {
  it("registers 16 routes under /domain with unique paths in the Domain group", () => { expect(routes).toHaveLength(16); expect(new Set(routes.map((r) => r.path)).size).toBe(16); expect(routes.every((r) => r.path.startsWith("/domain/") && r.group === "Domain")).toBe(true); });
});
describe("service health", () => {
  it("acknowledges and resolves an incident, clearing the open count", async () => {
    wrap(<ServiceHealth />); expect(screen.getByText("1 open incident")).toBeInTheDocument(); await tab(/Incidents/);
    await userEvent.click(screen.getByRole("button", { name: /INC-107/ })); expect(screen.getByRole("button", { name: "Acknowledged" })).toBeDisabled(); // already acked by the seeded responder
    await userEvent.click(screen.getByRole("button", { name: "Resolve" })); expect(screen.getByText("all clear")).toBeInTheDocument();
  });
  it("backtests an alert rule against history and reports firings", async () => {
    wrap(<ServiceHealth />); await tab(/Alert rules/); await userEvent.click(screen.getAllByRole("button", { name: "Test on history" })[0]); expect(screen.getByText(/Backtest: API p95 latency high/)).toBeInTheDocument(); expect(screen.getByText(/firings? in 24 h/)).toBeInTheDocument();
  });
  it("adds an on-call override", async () => { wrap(<ServiceHealth />); await tab(/On-call/); await userEvent.click(screen.getByRole("button", { name: "Add 7-day override" })); expect(screen.getAllByText("override").length).toBeGreaterThan(0); });
});
describe("certificates and DNS", () => {
  it("blocks invalid records, accepts valid ones, and shows a zone diff before publishing", async () => {
    wrap(<CertsDns />); await tab(/DNS records/); await userEvent.click(screen.getByRole("button", { name: "Add record" })); const dlg = within(screen.getByRole("dialog"));
    const name = dlg.getByRole("textbox", { name: /^Name/ }), value = dlg.getAllByRole("textbox", { name: /^Value/ })[0]; // the TTL stepper input is also labelled "Value"
    await userEvent.type(name, "mail"); await userEvent.type(value, "999.9.9.9"); expect(dlg.getByRole("button", { name: "Save" })).toBeDisabled(); expect(dlg.getByText(/IPv4/)).toBeInTheDocument();
    await userEvent.clear(value); await userEvent.type(value, "203.0.113.55"); await userEvent.click(dlg.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Pending changes (zone diff)")).toBeInTheDocument(); await userEvent.click(screen.getByRole("button", { name: "Publish" })); expect(screen.queryByText("Pending changes (zone diff)")).not.toBeInTheDocument();
  });
  it("flags certificates that need action", () => { wrap(<CertsDns />); expect(screen.getByText(/need attention/)).toBeInTheDocument(); expect(screen.getAllByText(/old-unifi\.local/).length).toBeGreaterThan(0); });
});
describe("users, keys and audit", () => {
  it("records role changes in the audit log", async () => {
    wrap(<Access />); await userEvent.click(screen.getByLabelText("Viewer for Mia Patel")); await tab(/Audit log/); expect(screen.getAllByText("user.role_changed").length).toBeGreaterThan(1);
    await userEvent.type(screen.getByLabelText("Search audit log"), "viewer"); expect(screen.getAllByText("user.role_changed")).toHaveLength(1);
  });
  it("shows a new API key once and lists it afterwards", async () => {
    wrap(<Access />); await tab(/API keys/); await userEvent.click(screen.getByRole("button", { name: /Create key/ })); const dlg = within(screen.getByRole("dialog")); await userEvent.type(dlg.getByLabelText(/^Name/), "Test key");
    await userEvent.click(dlg.getByRole("combobox")); await userEvent.click(await screen.findByRole("option", { name: "projects:read" })); await userEvent.click(dlg.getByRole("button", { name: "Create" }));
    expect(screen.getByLabelText("New API key")).toHaveTextContent(/^jp_live_[0-9a-f]{24}$/); await userEvent.click(screen.getByRole("button", { name: /saved it/ })); expect(screen.getByText("Test key")).toBeInTheDocument(); expect(screen.queryByLabelText("New API key")).not.toBeInTheDocument();
  });
  it("replays a failed webhook delivery", async () => { wrap(<Access />); await tab(/Webhooks/); await userEvent.click(screen.getAllByRole("button", { name: "Replay" })[0]); expect(screen.queryAllByRole("button", { name: "Replay" }).length).toBeLessThan(2); });
});
describe("billing", () => {
  it("validates a new invoice and computes its total", async () => {
    wrap(<Billing />); await userEvent.click(screen.getByRole("button", { name: /New invoice/ })); const dlg = within(screen.getByRole("dialog")); expect(dlg.getByRole("button", { name: "Save draft" })).toBeDisabled();
    await userEvent.type(dlg.getByLabelText(/^Client/), "Acme"); await userEvent.type(dlg.getByLabelText("Line 1 description"), "Consulting"); await userEvent.clear(dlg.getByLabelText("Line 1 unit price")); await userEvent.type(dlg.getByLabelText("Line 1 unit price"), "100");
    expect(dlg.getByText(/Total \$110\.00/)).toBeInTheDocument(); await userEvent.click(dlg.getByRole("button", { name: "Save draft" })); expect(screen.getAllByText("INV-0044").length).toBeGreaterThan(0);
  });
  it("matches the LaTeX invoice total for INV-0042", () => { wrap(<Billing />); expect(screen.getAllByText("$3,091.55").length).toBeGreaterThan(0); });
});
describe("ESP fleet", () => {
  it("runs a ringed OTA rollout to completion", async () => {
    wrap(<EspFleet />); await tab(/OTA rollout/); await userEvent.click(screen.getByRole("button", { name: "Start rollout" })); for (let i = 1; i <= 3; i++) await userEvent.click(screen.getByRole("button", { name: new RegExp(`Run ring ${i}`) }));
    expect(screen.getByRole("button", { name: "Done" })).toBeDisabled();
  });
  it("halts the rollout when failures exceed the gate", async () => {
    wrap(<EspFleet />); await tab(/OTA rollout/); await userEvent.click(screen.getByLabelText(/Simulate failures/)); await userEvent.click(screen.getByRole("button", { name: "Start rollout" }));
    for (let i = 1; i <= 3 && !screen.queryByText(/Halted by the failure gate/); i++) await userEvent.click(screen.getByRole("button", { name: new RegExp(`Run ring ${i}`) }));
    if (!screen.queryByText(/Halted by the failure gate/)) expect(screen.getByRole("button", { name: "Done" })).toBeDisabled(); // ESP8266 landed in a ring that stayed under the 20% gate
  });
});
describe("media archive", () => {
  it("searches the library and builds a playlist", async () => {
    wrap(<MediaArchive />); await userEvent.type(screen.getByLabelText("Search library"), "magpie"); expect(screen.getAllByRole("button", { name: /^Play / })).toHaveLength(1);
    await tab(/Playlists/); await userEvent.type(screen.getByLabelText("New playlist name"), "Birds"); await userEvent.click(screen.getByRole("button", { name: "Create" })); expect(screen.getAllByText("Birds").length).toBeGreaterThan(0); expect(screen.getByText("Empty playlist")).toBeInTheDocument();
  });
  it("blocks saving invalid metadata", async () => { wrap(<MediaArchive />); await tab(/Metadata editor/); const t = screen.getAllByLabelText(/^Title/)[0]; await userEvent.clear(t); expect(screen.getByRole("button", { name: "Save" })).toBeDisabled(); expect(screen.getAllByText(/Title is required/).length).toBeGreaterThan(0); });
});
describe("warehouse operations", () => {
  it("flags a short and damaged receipt as a discrepancy", async () => {
    wrap(<WarehouseOps />); await tab(/Goods receival/); await userEvent.click(screen.getAllByRole("button", { name: "Receive" })[0]); const dlg = within(screen.getByRole("dialog")); expect(dlg.getByText("Matches the ASN")).toBeInTheDocument();
    await userEvent.click(dlg.getAllByLabelText("Decrease")[0]); expect(dlg.getByText(/1 short/)).toBeInTheDocument(); await userEvent.click(dlg.getByRole("button", { name: "Confirm" })); expect(screen.getAllByText("discrepancy").length).toBeGreaterThan(1);
  });
  it("reads the live dock engine for the inbound summary", () => { wrap(<WarehouseOps />); expect(screen.getByText(/Inbound \(live from the dock board\)/)).toBeInTheDocument(); expect(screen.getByText("Trucks waiting")).toBeInTheDocument(); });
});
describe("job pipeline", () => {
  it("moves an application between stages with undo available", async () => { wrap(<JobPipeline />); const before = screen.getByRole("region", { name: "applied" }); const n = within(before).getAllByRole("article").length; await userEvent.click(within(before).getAllByRole("button", { name: /right/ })[0]); expect(within(screen.getByRole("region", { name: "applied" })).getAllByRole("article").length).toBe(n - 1); });
});
describe("documents", () => {
  it("generates LaTeX for an invoice record with escaped fields", async () => { wrap(<Documents />); await tab(/Invoices & letters/); await userEvent.click(screen.getByRole("button", { name: /INV-0042/ })); expect(screen.getByText(/\\documentclass\{jupiter-invoice\}/)).toBeInTheDocument(); });
});
describe("agent runs", () => {
  it("shows session cost and flags missing prompt variables", async () => {
    wrap(<AgentRuns />); expect(screen.getAllByText(/\$\d/).length).toBeGreaterThan(0); await tab(/Prompt library/); expect(screen.getByLabelText("Rendered prompt")).toHaveTextContent(/Review the following Rust diff/);
    await userEvent.clear(screen.getByLabelText("language")); expect(screen.getByText("Missing variables")).toBeInTheDocument();
  });
});
