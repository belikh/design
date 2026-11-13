import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { Cameras } from "./Cameras.tsx";
import { CAMS, CLIPS, storageGb, totalGb, hhmm, purgeable } from "./cameras.data.ts";
const wrap = (el: React.ReactNode) => render(<MemoryRouter><PrefsProvider>{el}</PrefsProvider></MemoryRouter>);
describe("camera logic", () => {
  it("estimates storage by recording mode", () => { const [front, drive, , shop] = CAMS(); expect(storageGb(drive)).toBe(Math.round(6 * 86400 * 14 / 8 / 1000 * 10) / 10); expect(storageGb(shop)).toBe(0); expect(storageGb(front)).toBeLessThan(storageGb({ ...front, recording: "Continuous" })); expect(totalGb(CAMS())).toBeGreaterThan(900); });
  it("formats minutes", () => { expect(hhmm(7 * 60 + 5)).toBe("07:05"); });
  it("never purges pinned clips", () => { const age = Object.fromEntries(CLIPS().map((c) => [c.id, 99])); const p = purgeable(CLIPS(), age, CAMS()); expect(p.some((c) => c.keep)).toBe(false); expect(p.length).toBe(CLIPS().length - 1); });
});
describe("camera page", () => {
  it("previews a clip chosen on the timeline and pins it", async () => {
    wrap(<Cameras />); const mark = await screen.findByRole("button", { name: /^Courier, Front door, person at 07:12/ }); await userEvent.click(mark);
    expect(screen.getByRole("heading", { name: "Courier at 07:12" })).toBeInTheDocument(); await userEvent.click(screen.getByRole("button", { name: "Pin to keep" })); expect(await screen.findByRole("button", { name: "Unpin" })).toBeInTheDocument();
  });
  it("filters the timeline by kind", async () => { wrap(<Cameras />); await userEvent.click(screen.getByRole("button", { name: "Vehicles" })); expect(screen.queryByRole("button", { name: /Courier/ })).not.toBeInTheDocument(); expect(screen.getByRole("button", { name: /Car leaves/ })).toBeInTheDocument(); });
  it("warns when planned retention exceeds 80% of the disk", async () => { wrap(<Cameras />); await userEvent.click(screen.getByRole("tab", { name: "Retention" })); expect(await screen.findByText(/Planned retention uses/)).toBeInTheDocument(); });
});
