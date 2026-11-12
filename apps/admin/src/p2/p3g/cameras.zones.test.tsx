import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { Cameras } from "./Cameras.tsx";
import { resetStores } from "./lib.tsx";
import { CLIPS, ZONES } from "./cameras.data.ts";
import { moveZone, resizeZone, dragCorner, removeVertex, insertVertex, moveVertex, inside, keyEdit, toPolygon, toRect, rectBetween, withPoints, bbox, type Geo } from "./cameras.geo.ts";
import { motionSegments, objectAt, classify, drawFrame, readPalette, mmss, hash } from "./cameras.clip.ts";
import { ClipPlayer } from "./ClipPlayer.tsx";

const R: Geo = { shape: "rect", points: [], x: 10, y: 10, w: 30, h: 20 };
const TRI = withPoints({ shape: "polygon", points: [], x: 0, y: 0, w: 0, h: 0 } as Geo, [[10, 10], [50, 10], [30, 50]]);
describe("zone geometry", () => {
  it("moves and stops at the frame edge without resizing", () => { expect(moveZone(R, 5, -2)).toMatchObject({ x: 15, y: 8 }); const m = moveZone(R, 500, 500); expect(m).toMatchObject({ x: 70, y: 80, w: 30, h: 20 }); expect(moveZone(R, -500, 0).x).toBe(0); });
  it("resizes with a minimum and a frame limit", () => { expect(resizeZone(R, 5, -5)).toMatchObject({ w: 35, h: 15 }); expect(resizeZone(R, -100, -100)).toMatchObject({ w: 4, h: 4 }); expect(resizeZone(R, 500, 0).w).toBe(90); });
  it("scales polygon points on resize and keeps the bounding box in sync", () => { const p = resizeZone(TRI, 20, 0); expect(p.w).toBe(60); expect(p.points[1]).toEqual([70, 10]); expect(bbox(p.points)).toMatchObject({ x: 10, w: 60 }); });
  it("drags a corner with the opposite one fixed, never below the minimum", () => {
    expect(dragCorner(R, "se", 60, 50)).toMatchObject({ x: 10, y: 10, w: 50, h: 40 }); expect(dragCorner(R, "nw", 0, 0)).toMatchObject({ x: 0, y: 0, w: 40, h: 30 }); expect(dragCorner(R, "se", 11, 11)).toMatchObject({ w: 4, h: 4 });
    expect(dragCorner(R, "se", 5, 50)).toMatchObject({ x: 5, w: 5 }); // dragged past the opposite edge: flips
  });
  it("moves, inserts and removes polygon corners (min three)", () => { expect(moveVertex(TRI, 2, 30, 60).points[2]).toEqual([30, 60]); const q = insertVertex(TRI, 0); expect(q.points).toHaveLength(4); expect(q.points[1]).toEqual([30, 10]); expect(removeVertex(q, 1).points).toHaveLength(3); expect(removeVertex(TRI, 0)).toBe(TRI); });
  it("hit-tests polygons and rectangles", () => { expect(inside(TRI, [30, 20])).toBe(true); expect(inside(TRI, [12, 45])).toBe(false); expect(inside(R, [20, 20])).toBe(true); expect(inside(R, [41, 20])).toBe(false); });
  it("converts between shapes", () => { const p = toPolygon(R); expect(p.points).toHaveLength(4); expect(toRect(p)).toMatchObject({ shape: "rect", x: 10, w: 30 }); expect(rectBetween([50, 60], [20, 10])).toEqual({ x: 20, y: 10, w: 30, h: 50 }); });
  it("maps keys: arrows move, Shift resizes, Ctrl is 5x, other keys are ignored", () => { expect(keyEdit(R, "ArrowRight", { shift: false, ctrl: false })).toMatchObject({ x: 11 }); expect(keyEdit(R, "ArrowDown", { shift: true, ctrl: false })).toMatchObject({ y: 10, h: 21 }); expect(keyEdit(R, "ArrowLeft", { shift: false, ctrl: true })?.x).toBe(5); expect(keyEdit(R, "a", { shift: false, ctrl: false })).toBeNull(); });
});

describe("generated clip", () => {
  const clip = CLIPS()[4]; // x5, 52 s person
  it("is deterministic and only moves inside motion segments", () => { expect(motionSegments(clip)).toHaveLength(2); expect(objectAt(clip, 0)).toBeNull(); expect(objectAt(clip, clip.durSec * 0.5)).toBeNull(); const a = objectAt(clip, 10), b = objectAt(clip, 10); expect(a).toEqual(b); expect(a).not.toBeNull(); expect(objectAt(clip, 12)!.x).not.toBe(a!.x); expect(hash("x5")).toBe(hash("x5")); });
  it("classifies the object against detect and ignore zones (ignore wins)", () => {
    const o = { x: 40, y: 50, w: 10, h: 20, kind: "person" as const }; const base = { name: "A", mode: "Detect" as const, enabled: true, shape: "rect" as const, points: [], x: 30, y: 40, w: 40, h: 40 };
    expect(classify(null, [base]).state).toBe("none"); expect(classify(o, [base])).toEqual({ state: "detected", zone: "A" }); expect(classify(o, [{ ...base, enabled: false }]).state).toBe("outside");
    expect(classify(o, [base, { ...base, name: "B", mode: "Ignore" }])).toEqual({ state: "ignored", zone: "B" }); expect(mmss(75)).toBe("1:15");
  });
  it("draws different frames with a motion overlay on a 2d context", () => {
    const calls: string[] = []; const g = new Proxy({}, { get: (_t, k) => (k === "createLinearGradient" ? () => ({ addColorStop() {} }) : (...a: unknown[]) => { calls.push(String(k)); void a; }), set: () => true }) as unknown as CanvasRenderingContext2D;
    const pal = readPalette(document.body); drawFrame(g, 640, 360, clip, 0, [], pal, "15:05"); const idle = calls.length; calls.length = 0; drawFrame(g, 640, 360, clip, 10, ZONES().filter((z) => z.cam === "k2"), pal, "15:05");
    expect(calls.filter((c) => c === "strokeRect").length).toBeGreaterThan(0); expect(calls.length).toBeGreaterThan(idle);
  });
});

describe("clip player", () => {
  const clip = CLIPS()[4];
  it("plays, pauses, and scrubs, announcing the frame", async () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] }); const draws: number[] = []; let n = 0;
    const spy = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((() => new Proxy({}, { get: (_t, k) => (k === "createLinearGradient" ? () => ({ addColorStop() {} }) : () => { if (k === "clearRect") draws.push(++n); }), set: () => true })) as never);
    render(<ClipPlayer clip={clip} zones={[]} />); expect(draws.length).toBeGreaterThan(0); const canvas = screen.getByTestId("clip-canvas"); expect(canvas.getAttribute("aria-label")).toMatch(/not a recording.*0:00 of 0:52: no motion/);
    fireEvent.change(screen.getByRole("slider", { name: "Scrub clip timeline" }), { target: { value: "10" } }); expect(screen.getByTestId("clip-canvas").getAttribute("aria-label")).toMatch(/0:10 of 0:52: person outside any zone/);
    const before = draws.length; const play = screen.getByRole("button", { name: "Play" }); fireEvent.click(play); expect(screen.getByRole("button", { name: "Pause" })).toHaveAttribute("aria-pressed", "true");
    await vi.advanceTimersByTimeAsync(500); await waitFor(() => expect(draws.length).toBeGreaterThan(before)); fireEvent.click(screen.getByRole("button", { name: "Pause" })); const frozen = draws.length; await vi.advanceTimersByTimeAsync(500); expect(draws.length).toBe(frozen);
    fireEvent.click(screen.getByRole("button", { name: "Restart" })); expect(screen.getByTestId("clip-canvas").getAttribute("aria-label")).toMatch(/0:00 of 0:52/); spy.mockRestore(); vi.useRealTimers();
  });
});

const wrap = () => render(<MemoryRouter><PrefsProvider><Cameras /></PrefsProvider></MemoryRouter>);
const zoneBtn = (name: RegExp) => screen.findByRole("button", { name });
describe("zone map (keyboard)", () => {
  it("Tab reaches zones; arrows nudge, Shift resizes, Delete removes with Undo", async () => {
    resetStores(); wrap(); await userEvent.click(screen.getByRole("tab", { name: "Zones" })); await userEvent.click(screen.getByRole("button", { name: "Front door" }));
    const door = await zoneBtn(/^Doorstep, Detect, rectangle, x 10 y 40, 30 by 45/); act(() => door.focus()); await waitFor(() => expect(door).toHaveAttribute("aria-pressed", "true"));
    await userEvent.keyboard("{ArrowRight}{ArrowDown}"); expect(await zoneBtn(/^Doorstep, Detect, rectangle, x 11 y 41, 30 by 45/)).toBeInTheDocument();
    await userEvent.keyboard("{Shift>}{ArrowRight}{ArrowRight}{/Shift}"); expect(await zoneBtn(/x 11 y 41, 32 by 45/)).toBeInTheDocument();
    await userEvent.keyboard("{Shift>}{ArrowUp}{/Shift}"); expect(await zoneBtn(/x 11 y 41, 32 by 44/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText("32", { selector: "td, td *, [role=gridcell], [role=gridcell] *" }).length).toBeGreaterThan(0), { timeout: 2000 }); // saved to the store after the debounce
    await userEvent.keyboard("{Delete}"); await waitFor(() => expect(screen.queryByRole("button", { name: /^Doorstep, Detect/ })).not.toBeInTheDocument()); expect(screen.getByText("Removed Doorstep")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Undo/ })); expect(await zoneBtn(/^Doorstep, Detect, rectangle, x 11 y 41, 32 by 44/)).toBeInTheDocument();
  });
  it("Tab moves between zones of a camera", async () => {
    resetStores(); wrap(); await userEvent.click(screen.getByRole("tab", { name: "Zones" })); await userEvent.click(screen.getByRole("button", { name: "Driveway" })); const a = await zoneBtn(/^Driveway, Detect, polygon/); const b = await zoneBtn(/^Neighbour's tree, Ignore/);
    act(() => a.focus()); await userEvent.tab(); const corners = screen.getAllByRole("button", { name: /^Driveway corner \d of 4/ }); expect(corners).toHaveLength(4); expect(corners[0]).toHaveFocus(); for (let i = 0; i < 3; i++) await userEvent.tab(); expect(corners[3]).toHaveFocus(); await userEvent.tab(); expect(b).toHaveFocus();
  });
  it("edits polygon corners from the keyboard, keeps at least three, and adds a corner", async () => {
    resetStores(); wrap(); await userEvent.click(screen.getByRole("tab", { name: "Zones" })); await userEvent.click(screen.getByRole("button", { name: "Driveway" })); const drv = await zoneBtn(/^Driveway, Detect, polygon/); act(() => drv.focus()); await userEvent.tab();
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}"); expect(await screen.findByRole("button", { name: /corner 1 of 4, x 43 y 90/ })).toBeInTheDocument();
    await userEvent.keyboard("{Insert}"); expect(await screen.findAllByRole("button", { name: /^Driveway corner \d of 5/ })).toHaveLength(5);
    act(() => screen.getByRole("button", { name: /corner 1 of 5/ }).focus()); await userEvent.keyboard("{Delete}"); expect(await screen.findAllByRole("button", { name: /^Driveway corner \d of 4/ })).toHaveLength(4);
  });
  it("adds a rectangle and a polygon without a pointer, then edits sensitivity and retention in place", async () => {
    resetStores(); wrap(); await userEvent.click(screen.getByRole("tab", { name: "Zones" })); await userEvent.click(screen.getByRole("button", { name: "Front door" })); await userEvent.click(screen.getByRole("button", { name: "Add polygon" })); expect(await zoneBtn(/^Zone 2, Detect, polygon, 3 corners/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Add rectangle" })); expect(await zoneBtn(/^Zone 3, Detect, rectangle, x 30 y 30, 30 by 30/)).toBeInTheDocument();
    const bar = screen.getByRole("group", { name: "Selected zone Zone 3" }); await userEvent.click(within(bar).getByRole("button", { name: /Sensitivity/ })); await userEvent.keyboard("{Control>}a{/Control}80{Enter}");
    expect(await zoneBtn(/^Zone 3, .*sensitivity 80/)).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole("group", { name: "Selected zone Zone 3" })).getByRole("button", { name: "Convert to polygon" })); expect(await zoneBtn(/^Zone 3, Detect, polygon, 4 corners/)).toBeInTheDocument();
  });
  it("shows a real clip player instead of a placeholder", async () => { resetStores(); wrap(); await userEvent.click(await screen.findByRole("button", { name: /^Visitor, Driveway/ })); expect(await screen.findByTestId("clip-canvas")).toBeInTheDocument(); expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument(); expect(screen.queryByText(/placeholder/i)).not.toBeInTheDocument(); });
});
