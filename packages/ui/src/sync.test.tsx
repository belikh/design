import { afterEach, describe, expect, it } from "vitest";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConflictError, createCollection, useCollection } from "./mock.ts";
import { ConflictPrompt, SyncStatus } from "./sync.tsx";

type R = { id: string; rev: number; n: number };
const fast = { latency: 0, jitter: 0 };
const mk = () => createCollection<R>([{ id: "a", rev: 1, n: 1 }, { id: "b", rev: 1, n: 2 }], fast);
const setOnline = (v: boolean) => { Object.defineProperty(navigator, "onLine", { value: v, configurable: true }); window.dispatchEvent(new Event(v ? "online" : "offline")); };
afterEach(() => setOnline(true));

describe("optimistic concurrency", () => {
  it("bumps rev and rejects a stale write with the current row", async () => {
    const c = mk(); await c.update("a", { n: 5 }, { baseRev: 1 }); expect(c.snapshot()[0]).toMatchObject({ n: 5, rev: 2 });
    const err = await c.update("a", { n: 9 }, { baseRev: 1 }).then(() => null, (e: unknown) => e); expect(err).toBeInstanceOf(ConflictError); expect((err as ConflictError<R>).theirs.n).toBe(5);
  });
});
describe("useCollection", () => {
  it("applies a save optimistically, then settles on the stored value", async () => {
    const c = mk(); const { result } = renderHook(() => useCollection(c)); await waitFor(() => expect(result.current.state).toBe("ready"));
    let out: string | null = "x"; await act(async () => { out = await result.current.save(result.current.rows[0], "n", 7); }); expect(out).toBeNull(); await waitFor(() => expect(result.current.rows[0].n).toBe(7));
  });
  it("reverts and reports when the save fails", async () => {
    const c = createCollection<R>([{ id: "a", rev: 1, n: 1 }], { ...fast, failWhen: (op) => (op === "update" ? "Nope" : null) }); const { result } = renderHook(() => useCollection(c)); await waitFor(() => expect(result.current.state).toBe("ready"));
    let out: string | null = null; await act(async () => { out = await result.current.save(result.current.rows[0], "n", 7); }); expect(out).toBe("Nope"); await waitFor(() => expect(result.current.rows[0].n).toBe(1));
  });
  it("queues saves while offline, shows them, and flushes when back online", async () => {
    const c = mk(); const { result } = renderHook(() => useCollection(c)); await waitFor(() => expect(result.current.state).toBe("ready"));
    act(() => setOnline(false)); await waitFor(() => expect(result.current.online).toBe(false));
    await act(async () => { await result.current.save(result.current.rows[0], "n", 42); }); expect(result.current.pending).toBe(1); expect(result.current.rows[0].n).toBe(42); expect(c.snapshot()[0].n).toBe(1);
    act(() => setOnline(true)); await waitFor(() => expect(c.snapshot()[0].n).toBe(42)); await waitFor(() => expect(result.current.pending).toBe(0));
  });
  it("surfaces a conflict and resolves it either way", async () => {
    const c = mk(); const { result } = renderHook(() => useCollection(c)); await waitFor(() => expect(result.current.state).toBe("ready")); const mine = result.current.rows[0];
    act(() => c.externalUpdate("a", { n: 100 })); await waitFor(() => expect(result.current.rows[0].n).toBe(100));
    let out: string | null = null; await act(async () => { out = await result.current.save(mine, "n", 5); }); expect(out).toMatch(/Someone else/); expect(result.current.conflict?.theirs.n).toBe(100);
    await act(async () => { await result.current.resolveConflict("mine"); }); await waitFor(() => expect(c.snapshot()[0].n).toBe(5)); expect(result.current.conflict).toBeNull();
  });
  it("goes stale and refreshes in the background", async () => {
    const c = mk(); const { result } = renderHook(() => useCollection(c, { staleAfter: -1 })); await waitFor(() => expect(result.current.state).toBe("ready")); await waitFor(() => expect(result.current.stale).toBe(true));
    await act(async () => { await result.current.refresh(); }); expect(result.current.state).toBe("ready");
  });
});
describe("sync UI", () => {
  it("shows offline, pending and stale indicators, and nothing when in sync", async () => {
    const { rerender } = render(<SyncStatus online pending={0} stale={false} updatedAt={null} onRefresh={() => {}} />); expect(screen.queryByText(/pending|Offline|Updated/)).toBeNull();
    rerender(<SyncStatus online={false} pending={2} stale updatedAt={Date.now() - 120000} onRefresh={() => {}} />); expect(screen.getByText("Offline")).toBeInTheDocument(); expect(screen.getByText("2 changes pending")).toBeInTheDocument(); expect(screen.getByText(/Updated 2 min ago/)).toBeInTheDocument();
  });
  it("asks which version to keep", async () => {
    const picks: string[] = []; render(<ConflictPrompt conflict={{ id: "a", key: "n", mine: 5, theirs: { id: "a", rev: 2, n: 100 } as R }} field="Qty" onResolve={(k) => picks.push(k)} />);
    expect(await screen.findByText("100")).toBeInTheDocument(); await userEvent.click(screen.getByRole("button", { name: "Keep mine" })); expect(picks).toEqual(["mine"]);
  });
});
