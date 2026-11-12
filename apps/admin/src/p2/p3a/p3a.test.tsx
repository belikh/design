import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { routes } from "./index.tsx";
import { SEED_FIELDS, SEED_STEPS, condError, isVisible, licenceCheck, makeResponses, move, newField, nextIndex, nps, route, sampleKey, validateFlow, validateForm } from "./lib.ts";
import { embedUrl } from "./Embed.tsx";

const page = (path: string) => { const r = routes.find((x) => x.path === path)!; return render(<PrefsProvider><MemoryRouter initialEntries={[path]}><Routes><Route path={r.routePath ?? r.path} element={r.element} /></Routes></MemoryRouter></PrefsProvider>); };
beforeEach(() => { try { localStorage.clear(); } catch { /* ignore */ } });

describe("p3a routes", () => {
  it("registers unique /p3 paths with groups", () => {
    expect(new Set(routes.map((r) => r.path)).size).toBe(routes.length);
    for (const r of routes) { expect(r.path.startsWith("/p3/")).toBe(true); expect(r.group).toBeTruthy(); }
    expect(routes.filter((r) => r.nav !== false && !r.bare).length).toBe(7);
  });
  it.each(routes.map((r) => [r.path] as const))("renders %s", async (p) => {
    page(p); expect(await screen.findByRole("heading", { level: 1 }, { timeout: 5000 }).catch(() => screen.findByRole("figure", {}, { timeout: 5000 }).catch(() => screen.findByText(/nothing to show/i)))).toBeTruthy();
  });
});

describe("lib", () => {
  it("conditional visibility and validation skip hidden fields", () => {
    const hw = SEED_FIELDS.find((f) => f.id === "hw")!;
    expect(isVisible(hw, { kind: "Access" }, SEED_FIELDS)).toBe(false);
    expect(isVisible(hw, { kind: "Hardware" }, SEED_FIELDS)).toBe(true);
    expect(validateForm(SEED_FIELDS, { name: "A", kind: "Access" })).toEqual({});
    expect(validateForm(SEED_FIELDS, { name: "A", kind: "Hardware" }).hw).toMatch(/required/);
    expect(validateForm(SEED_FIELDS, { name: "A", kind: "Hardware", hw: "Laptop", qty: "50" }).qty).toMatch(/at most 20/);
  });
  it("a condition can only point upward", () => {
    const f = [{ ...newField("text"), id: "a", cond: { field: "b", op: "eq" as const, value: "x" } }, { ...newField("text"), id: "b" }];
    expect(condError(f, 0)).toMatch(/above/); expect(condError(SEED_FIELDS, 2)).toBeNull();
  });
  it("move reorders", () => { expect(move([1, 2, 3], 0, 2)).toEqual([2, 3, 1]); expect(move([1, 2], 0, 5)).toEqual([1, 2]); });
  it("approval routing follows conditions and flags coverage gaps", () => {
    expect(route(SEED_STEPS, 500).path.map((s) => s.id)).toEqual(["s1"]);
    expect(route(SEED_STEPS, 30000).path).toHaveLength(4);
    expect(validateFlow(SEED_STEPS)).toEqual([]);
    expect(validateFlow([{ ...SEED_STEPS[1] }]).join()).toMatch(/no approval/);
    expect(validateFlow([])[0]).toMatch(/at least one/);
  });
  it("licence keys check their checksum", () => { expect(licenceCheck(sampleKey())).toBeNull(); expect(licenceCheck("AAAA-BBBB-CCCC-DDDD")).toMatch(/checksum/); expect(licenceCheck("nope")).toMatch(/format/); });
  it("survey NPS and playlist wrap", () => { const n = nps(makeResponses(100)); expect(n.promoters + n.passives + n.detractors).toBe(n.n); expect(nextIndex(2, 3)).toBe(0); expect(nextIndex(0, 3, -1)).toBe(2); expect(nextIndex(0, 0)).toBe(0); });
  it("embed url carries options", () => { expect(embedUrl("http://x", "uptime", { theme: "dark", title: false, refresh: 10 })).toBe("http://x/p3/embed/view/uptime?theme=dark&title=0&refresh=10"); });
});

describe("interactions", () => {
  it("embed builder generates an iframe snippet for the chosen widget", async () => {
    page("/p3/embed"); fireEvent.change(await screen.findByLabelText("Widget"), { target: { value: "capacity" } });
    expect(document.body.textContent).toMatch(/<iframe src="[^"]*\/p3\/embed\/view\/capacity/);
  });
  it("form builder: add a field, and preview shows conditional logic", async () => {
    page("/p3/form-builder"); await screen.findByRole("heading", { level: 1 });
    const before = screen.getAllByRole("button", { name: /^Delete /i }).length;
    fireEvent.click(screen.getByRole("button", { name: "Add Checkbox field" }));
    expect(screen.getAllByRole("button", { name: /^Delete /i }).length).toBe(before + 1);
    fireEvent.click(screen.getByRole("tab", { name: "Preview" }));
    expect(screen.queryByLabelText(/Which device/)).toBeNull();
    fireEvent.change(screen.getByLabelText(/Request type/), { target: { value: "Hardware" } });
    expect(screen.getByLabelText(/Which device/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(await screen.findByText(/problem/)).toBeTruthy();
  });
  it("form builder: keyboard reorder moves a field", async () => {
    page("/p3/form-builder"); await screen.findByRole("heading", { level: 1 });
    fireEvent.click(screen.getByRole("button", { name: "Move Request type up" }));
    const items = screen.getAllByRole("listitem").map((li) => li.textContent ?? "");
    expect(items.findIndex((t) => t.includes("Request type"))).toBeLessThan(items.findIndex((t) => t.includes("Your name")));
  });
  it("approval designer shows the route for an amount and warns about gaps", async () => {
    page("/p3/approval-flow"); const path = await screen.findByRole("list", { name: /Route for this request/ });
    expect(within(path).getAllByRole("listitem")).toHaveLength(3); // 12,000 skips the executive step
    fireEvent.click(screen.getByRole("button", { name: "Remove Manager review" }));
    expect(await screen.findByText(/Published|Unpublished|issue/)).toBeTruthy();
  });
  it("moderation: rejecting with Other requires an explanation; approving removes it from the queue", async () => {
    page("/p3/moderation"); await screen.findByText(/M-202/);
    fireEvent.click(screen.getByRole("button", { name: "Reject…" }));
    const dlg = await screen.findByRole("dialog", { hidden: true }); fireEvent.change(within(dlg).getByLabelText("Reason"), { target: { value: "Other (explain below)" } });
    fireEvent.click(within(dlg).getByRole("button", { name: "Reject item" }));
    expect(await within(dlg).findByText(/Explain the reason/)).toBeTruthy();
    fireEvent.change(within(dlg).getByLabelText(/Note to the author/), { target: { value: "Not allowed here" } });
    fireEvent.click(within(dlg).getByRole("button", { name: "Reject item" }));
    await screen.findByText(/Rejected \(1\)/);
  });
  it("moderation approve moves item to Approved", async () => {
    page("/p3/moderation"); await screen.findByText(/M-202/); fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(await screen.findByText(/Approved \(1\)/)).toBeTruthy();
  });
  it("licence rejects a bad key and accepts the sample", async () => {
    page("/p3/licence"); fireEvent.click(await screen.findByRole("button", { name: "Activate a licence key" }));
    const input = await screen.findByLabelText(/Licence key/, undefined, { timeout: 3000 }); fireEvent.change(input, { target: { value: "AAAA-BBBB-CCCC-DDDD" } }); fireEvent.blur(input);
    expect(await screen.findByText(/checksum/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Fill in sample key" })); fireEvent.click(screen.getByRole("button", { name: "Activate" }));
    expect(await screen.findByText("Licence activated")).toBeTruthy();
  });
  it("survey filters by respondent group", async () => {
    page("/p3/survey-results"); await screen.findByText("Net promoter score");
    fireEvent.click(screen.getByRole("button", { name: "Staff" }));
    const staff = makeResponses(120).filter((r) => r.segment === "Staff").length;
    expect(screen.getAllByText(`${staff} responses`).length).toBeGreaterThan(0);
  });
  it("TV player steps through slides and pauses", async () => {
    page("/p3/playlist/tv"); expect(await screen.findByText(/Slide 1 of 3/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next slide" })); expect(screen.getByText(/Slide 2 of 3/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Previous slide" })); fireEvent.click(screen.getByRole("button", { name: "Previous slide" })); expect(screen.getByText(/Slide 3 of 3/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Pause" })); expect(screen.getByRole("button", { name: "Resume" })).toBeTruthy();
  });
  it("playlist editor lists the rotation", async () => {
    page("/p3/playlist"); expect(await screen.findByRole("button", { name: "Move slide 1 down" })).toBeTruthy();
  });
});
