import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { WhKiosk } from "./WhKiosk.tsx";
import { WhLobby } from "./WhLobby.tsx";
import { WhDock } from "./WhDock.tsx";
import { WhTicket } from "./WhTicket.tsx";
import { WhPortal } from "./WhPortal.tsx";
import { WhForklift } from "./WhForklift.tsx";
import { WhDocks } from "./WhDocks.tsx";
import { actions, getState } from "../warehouse/store.ts";
import { eligibleFreeDocks, jobOf, occupant, type Ticket } from "../warehouse/engine.ts";

const app = (path: string) => render(<MemoryRouter initialEntries={[path]}><PrefsProvider><Routes>
  <Route path="/wh/kiosk" element={<WhKiosk />} /><Route path="/wh/lobby" element={<WhLobby />} /><Route path="/wh/dock" element={<WhDock />} /><Route path="/wh/ticket/:id" element={<WhTicket />} />
  <Route path="/wh/portal" element={<WhPortal />} /><Route path="/wh/portal/:dock" element={<WhPortal />} /><Route path="/wh/forklift" element={<WhForklift />} /><Route path="/wh/docks" element={<WhDocks />} />
</Routes></PrefsProvider></MemoryRouter>);
const click = (name: string | RegExp) => userEvent.click(screen.getByRole("button", { name }));
const type = async (keys: string) => { for (const k of keys) await click(new RegExp(`^${k === " " ? "Space" : k}$`)); };
const ticket = (id: string): Ticket => getState().tickets.find((t) => t.id === id)!;
/** A fresh truck on the board with nobody simulated, so the test is the only person acting. */
const quiet = () => { actions.reset(); actions.setSimStaff(false); actions.setSimFork(false); actions.setAutoArrivals(false); actions.setAuto(false); };
const arrival = (o: { dir?: "in" | "out"; load?: "ambient" | "chilled"; ref?: string; pallets?: number } = {}) => {
  const r = actions.checkIn({ rego: "TST 001", driver: "Test Driver", phone: "0400000001", carrier: "adhoc", cls: "rigid", height: 3.6, cube: 38, tailLift: false, jobs: [{ dir: o.dir ?? "in", ref: o.ref, load: o.load ?? "ambient", pallets: o.pallets ?? 4 }] });
  return r.ticket!;
};
const toDock = (t: Ticket) => { const d = eligibleFreeDocks(getState(), ticket(t.id))[0]; actions.call(t.id, d.id); return d; };
beforeEach(quiet);

describe("driver kiosk", () => {
  it("checks a walk-in delivery through every step and issues a ticket", async () => {
    const before = getState().tickets.length; app("/wh/kiosk");
    await click(/Touch to start/);
    await type("1AB"); await click(/Next/);
    await click(/Delivering/); await click(/Next/);
    await click(/Rigid truck/); await click(/Next/);
    await click(/I don’t have a booking/); await click(/Chilled/); await userEvent.click(screen.getByLabelText("More pallets")); await click(/Next/);
    await type("SAM"); await userEvent.click(screen.getByLabelText("Mobile number")); await type("0412345678"); await click("Wombat Transport"); await click(/Next/);
    expect(screen.getByText("Check your details")).toBeInTheDocument(); await click(/Confirm check-in/);
    expect(screen.getByText("You’re checked in")).toBeInTheDocument();
    const s = getState(); expect(s.tickets.length).toBe(before + 1); const t = s.tickets[s.tickets.length - 1]; const j = jobOf(t);
    expect(t.rego).toBe("1AB"); expect(t.cls).toBe("rigid"); expect(t.height).toBe(3.6); expect(j.dir).toBe("in"); expect(j.load).toBe("chilled"); expect(j.slot).toBeUndefined(); expect(j.blind).toBe(true); expect(screen.getByText(t.id)).toBeInTheDocument();
  });
  it("copies the booking's load and pallets when the reference is typed, so the truck is gated on what is booked", async () => {
    const b = getState().bookings.find((x) => x.dir === "in" && x.load === "chilled" && !getState().tickets.some((t) => t.jobs.some((j) => j.ref === x.ref)))!; app("/wh/kiosk");
    await click(/Touch to start/); await type("1AB"); await click(/Next/); await click(/Delivering/); await click(/Next/); await click(/Refrigerated/); await click(/Next/);
    await userEvent.click(screen.getByRole("button", { name: "Reference" })); await type(b.ref); expect(screen.getByText(new RegExp(`booked: Chilled, ${b.pallets} pallets`))).toBeInTheDocument(); await click(/Next/);
    await type("SAM"); await userEvent.click(screen.getByLabelText("Mobile number")); await type("0412345678"); await click(/Next/); await click(/Confirm check-in/);
    const t = getState().tickets[getState().tickets.length - 1]; expect(jobOf(t).load).toBe("chilled"); expect(jobOf(t).declared).toBe(b.pallets); expect(jobOf(t).ref).toBe(b.ref);
  });
  it("keeps Next disabled until the registration is long enough", async () => {
    app("/wh/kiosk"); await click(/Touch to start/); const next = screen.getByRole("button", { name: /Next/ }); expect(next).toBeDisabled();
    await type("AB"); expect(next).toBeDisabled(); await type("C"); expect(next).toBeEnabled();
  });
  it("asks for a delivery and a collection when the driver is doing both, and needs each one settled", async () => {
    app("/wh/kiosk"); await click(/Touch to start/); await type("1AB"); await click(/Next/); await click(/Both/); await click(/Next/); await click(/Next/);
    expect(screen.getByRole("region", { name: "Delivery" })).toBeInTheDocument(); expect(screen.getByRole("region", { name: "Collection" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Next/ })).toBeDisabled();
    await userEvent.click(within(screen.getByRole("region", { name: "Delivery" })).getByRole("button", { name: /I don’t have a booking/ })); expect(screen.getByRole("button", { name: /Next/ })).toBeDisabled();
    await userEvent.click(within(screen.getByRole("region", { name: "Collection" })).getByRole("button", { name: /I don’t have an order/ })); expect(screen.getByRole("button", { name: /Next/ })).toBeEnabled();
  });
});

describe("dock status display and clerk portal", () => {
  it("shows every dock on the wall and links to each one", () => {
    app("/wh/portal"); const s = getState(); expect(screen.getByRole("heading", { name: "Dock status" })).toBeInTheDocument(); expect(screen.getAllByRole("link", { name: /: (Free|Closed|Reverse in|Check-in|Accepted|Unloading|Loading|Checking|Rejected|Clear to go)$/ }).length).toBeGreaterThanOrEqual(s.docks.length);
  });
  it("walks a truck through approach, check-in, acceptance, clearing and departure, and the word on the display follows", async () => {
    const t = arrival({ pallets: 1 }); const d = toDock(t); const { unmount } = app(`/wh/portal/${d.id}`);
    expect(screen.getByRole("heading", { name: "Reverse in" })).toBeInTheDocument(); expect(screen.getByText(t.id)).toBeInTheDocument(); unmount();
    actions.arrive(t.id); const view = app(`/wh/portal/${d.id}`); expect(screen.getByRole("heading", { name: "Check-in" })).toBeInTheDocument();
    const accept = screen.getByRole("button", { name: "Accept truck" }); expect(accept).toBeDisabled();
    await click(/Paperwork matches/); await click(/Seal intact/); expect(accept).toBeEnabled(); await userEvent.click(accept);
    expect(ticket(t.id).status).toBe("accepted"); expect(screen.getByRole("heading", { name: "Accepted" })).toBeInTheDocument(); view.unmount();
    actions.start(t.id); actions.addLine(t.id); actions.finish(t.id); app(`/wh/portal/${d.id}`);
    expect(screen.getByRole("heading", { name: "Checking" })).toBeInTheDocument(); const clear = screen.getByRole("button", { name: /Clear to leave/ });
    expect(clear).toBeEnabled(); expect(screen.queryByText(/Discrepancy/)).toBeNull(); await userEvent.click(clear); expect(screen.getByRole("heading", { name: "Clear to go" })).toBeInTheDocument();
    actions.depart(t.id); expect(occupant(getState(), d.id)).toBeUndefined();
  });
  it("will not clear a short delivery until the clerk has reviewed the discrepancy", async () => {
    const t = arrival({ pallets: 3 }); const d = toDock(t); actions.arrive(t.id); actions.checks(t.id, { paperwork: true, seal: true }); actions.accept(t.id); actions.start(t.id); actions.addLine(t.id); actions.finish(t.id); app(`/wh/portal/${d.id}`);
    const clear = screen.getByRole("button", { name: /Clear to leave/ }); expect(clear).toBeDisabled(); expect(screen.getByText(/Discrepancy: 2 short/)).toBeInTheDocument();
    await click(/I have reviewed the discrepancy/); expect(clear).toBeEnabled();
  });
  it("rejects a truck with a reason after a confirm, and the dock only frees when it has left", async () => {
    const t = arrival(); const d = toDock(t); actions.arrive(t.id); app(`/wh/portal/${d.id}`);
    await click("Reject"); expect(screen.getByRole("dialog")).toBeInTheDocument(); await userEvent.click(screen.getByRole("radio", { name: "Damaged load" })); await click("Reject truck");
    expect(screen.getByRole("heading", { name: "Rejected" })).toBeInTheDocument(); expect(jobOf(ticket(t.id)).reason).toBe("Damaged load");
    await click("Send away"); expect(ticket(t.id).status).toBe("cleared"); expect(occupant(getState(), d.id)?.id).toBe(t.id); expect(screen.getByRole("heading", { name: "Clear to go" })).toBeInTheDocument();
    actions.depart(t.id); expect(occupant(getState(), d.id)).toBeUndefined();
  });
  it("hides the controls in display-only mode", () => {
    const t = arrival(); const d = toDock(t); actions.arrive(t.id); app(`/wh/portal/${d.id}?display=1`);
    expect(screen.getByRole("heading", { name: "Check-in" })).toBeInTheDocument(); expect(screen.getByRole("button", { name: "Show controls" })).toBeInTheDocument();
  });
});

describe("collections and two-way visits", () => {
  const out = () => getState().bookings.find((x) => x.dir === "out" && x.load === "ambient" && !getState().tickets.some((t) => t.jobs.some((j) => j.ref === x.ref)))!;
  it("needs a seal number typed on the portal before an outbound truck can be cleared", async () => {
    const b = out(); const r = actions.checkIn({ rego: "OUT 001", driver: "Dee", phone: "0400000002", carrier: b.carrier, cls: "rigid", height: 3.6, cube: 38, tailLift: false, jobs: [{ dir: "out", ref: b.ref, load: "ambient", pallets: b.pallets }] }); const t = r.ticket!; const d = toDock(t);
    actions.arrive(t.id); actions.checks(t.id, { paperwork: true, inspect: true }); actions.accept(t.id); actions.start(t.id); jobOf(ticket(t.id)).lines.forEach((l) => actions.mark(t.id, l.id, "ok")); actions.finish(t.id); app(`/wh/portal/${d.id}`);
    const clear = screen.getByRole("button", { name: /Clear to leave/ }); expect(clear).toBeDisabled(); expect(screen.getByText("Record the seal number")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Seal number"), "sl123456"); expect(jobOf(ticket(t.id)).sealNo).toBe("SL123456"); expect(clear).toBeEnabled(); await userEvent.click(clear); expect(screen.getByRole("heading", { name: "Clear to go" })).toBeInTheDocument();
  });
  it("keeps a delivering-and-collecting truck on a dock that fits both jobs, and the display switches to the collection", async () => {
    const i = getState().bookings.find((x) => x.dir === "in" && x.load === "ambient" && !getState().tickets.some((t) => t.jobs.some((j) => j.ref === x.ref)))!, o = out();
    const t = actions.checkIn({ rego: "TWO 001", driver: "Dee", phone: "0400000003", carrier: i.carrier, cls: "rigid", height: 3.6, cube: 38, tailLift: false, jobs: [{ dir: "in", ref: i.ref, load: "ambient", pallets: i.pallets }, { dir: "out", ref: o.ref, load: "ambient", pallets: o.pallets }] }).ticket!;
    actions.call(t.id, 1); actions.arrive(t.id); actions.checks(t.id, { paperwork: true, seal: true }); actions.accept(t.id); actions.start(t.id); jobOf(ticket(t.id)).lines.forEach((l) => actions.mark(t.id, l.id, "ok")); actions.finish(t.id);
    app("/wh/portal/1"); await click(/Clear and start collection/);
    expect(ticket(t.id).dock).toBe(1); expect(ticket(t.id).status).toBe("onDock"); expect(ticket(t.id).cur).toBe(1); expect(screen.getByRole("heading", { name: "Check-in" })).toBeInTheDocument(); expect(screen.getByText(/Collection · Ambient/)).toBeInTheDocument();
  });
});

describe("forklift terminal", () => {
  const accepted = (pallets = 3) => {
    const b = getState().bookings.find((x) => x.dir === "in" && x.load === "ambient" && !getState().tickets.some((t) => t.jobs.some((j) => j.ref === x.ref)))!;
    const t = arrival({ ref: b.ref, pallets: b.pallets }); void pallets; const d = toDock(t); actions.arrive(t.id); actions.checks(t.id, { paperwork: true, seal: true }); actions.accept(t.id); return { t, d, b };
  };
  it("lists what to expect, and only starts once the truck is accepted", async () => {
    const t0 = arrival(); const d0 = toDock(t0); actions.arrive(t0.id); app(`/wh/forklift?dock=${d0.id}`);
    expect(screen.getByText("Not accepted yet")).toBeInTheDocument(); expect(screen.queryByRole("button", { name: "Start unload" })).toBeNull();
  });
  it("shows the manifest, starts the unload, and will not finish until every pallet is checked", async () => {
    const { t, d, b } = accepted(); app(`/wh/forklift?dock=${d.id}`);
    expect(screen.getByText(`Expect ${b.pallets} pallets`)).toBeInTheDocument(); await click("Start unload"); expect(ticket(t.id).status).toBe("working");
    const finish = screen.getByRole("button", { name: "Finish unload" }); expect(finish).toBeDisabled();
    await userEvent.click(within(screen.getAllByRole("group", { name: /^Pallet / })[0]).getByRole("button", { name: "Damaged" })); expect(finish).toBeDisabled();
    await click("Mark remaining received"); expect(finish).toBeEnabled(); await userEvent.click(finish); expect(ticket(t.id).status).toBe("complete");
    expect(jobOf(ticket(t.id)).lines[0].state).toBe("damaged");
  });
  it("counts a walk-in truck in pallet by pallet (blind count)", async () => {
    const t = arrival({ pallets: 2 }); const d = toDock(t); actions.arrive(t.id); actions.checks(t.id, { paperwork: true, seal: true }); actions.accept(t.id); app(`/wh/forklift?dock=${d.id}`);
    expect(screen.getByText("Blind count: no manifest")).toBeInTheDocument(); await click("Start unload"); expect(screen.getByRole("button", { name: "Finish unload" })).toBeDisabled();
    await click(/Pallet counted/); await click(/Pallet counted/); expect(screen.getByRole("button", { name: "Finish unload" })).toBeEnabled(); expect(screen.getByText("2 / 2 pallets")).toBeInTheDocument();
  });
});

describe("dock setup", () => {
  it("lets a dock be set up for another purpose, and locks a dock with a truck on it", async () => {
    const free = getState().docks.find((d) => d.status === "open" && !occupant(getState(), d.id) && !d.dirs.includes("out"))!; app("/wh/docks");
    await click(new RegExp(`^${free.name}`)); await userEvent.click(within(screen.getByRole("group", { name: "Direction" })).getByRole("button", { name: "Outbound" }));
    expect(getState().docks.find((d) => d.id === free.id)!.dirs).toContain("out");
  });
  it("refuses to change a dock while a truck is on it", async () => {
    const t = arrival(); const d = toDock(t); app("/wh/docks"); await click(new RegExp(`^${d.name}`));
    expect(screen.getByText(new RegExp(`${t.id} .* is on this dock`))).toBeInTheDocument(); expect(within(screen.getByRole("group", { name: "Direction" })).getByRole("button", { name: "Outbound" })).toBeDisabled();
  });
});

describe("dispatch board, lobby and driver ticket", () => {
  it("shows an approaching truck on the lobby display with its dock", () => {
    const t = arrival(); const d = toDock(t); app("/wh/lobby"); expect(screen.getAllByText(t.id).length).toBeGreaterThan(0); expect(screen.getAllByText(new RegExp(d.name)).length).toBeGreaterThan(0); expect(screen.getByText(/reverse in/)).toBeInTheDocument();
  });
  it("renders the dock board with priority reasons and the dock cards", () => {
    arrival(); app("/wh/dock"); expect(screen.getByRole("heading", { name: /Dock board/ })).toBeInTheDocument(); expect(screen.getAllByText(/Priority and why/i).length).toBeGreaterThan(0); expect(screen.getAllByText("Dock 1").length).toBeGreaterThan(0);
  });
  it("renders the driver's phone ticket with one instruction per stage, and a not-found state", () => {
    const t = arrival(); const d = toDock(t); const { unmount } = app(`/wh/ticket/${t.id}`); expect(screen.getByRole("heading", { name: `Back onto ${d.name}` })).toBeInTheDocument(); unmount();
    actions.arrive(t.id); const v = app(`/wh/ticket/${t.id}`); expect(screen.getByRole("heading", { name: "Stay in your cab" })).toBeInTheDocument(); v.unmount();
    app("/wh/ticket/ZZZ"); expect(screen.getByText("Ticket not found")).toBeInTheDocument();
  });
});
