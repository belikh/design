import { describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createCollection, useCollection } from "./mock.ts";

type R = { id: string; n: number };
const fast = { latency: 0, jitter: 0 };
describe("mock collection", () => {
  it("lists, updates, creates and removes", async () => {
    const c = createCollection<R>([{ id: "a", n: 1 }], fast);
    expect((await c.update("a", { n: 2 })).n).toBe(2); expect((await c.create({ n: 5 })).id).toBe("N-2"); await c.remove("a"); expect((await c.list()).map((r) => r.id)).toEqual(["N-2"]);
  });
  it("fails on demand and leaves data unchanged", async () => {
    const c = createCollection<R>([{ id: "a", n: 1 }], { ...fast, failWhen: (op, id) => (op === "update" && id === "a" ? "Locked" : null) });
    const err = await c.update("a", { n: 9 }).then(() => null, (e: Error) => e.message); expect(err).toBe("Locked"); expect(c.snapshot()[0].n).toBe(1);
  });
  it("useCollection loads rows and save returns null or the error", async () => {
    const c = createCollection<R>([{ id: "a", n: 1 }, { id: "b", n: 2 }], { ...fast, failWhen: (op, id) => (op === "update" && id === "b" ? "No" : null) });
    const { result } = renderHook(() => useCollection(c)); await waitFor(() => expect(result.current.state).toBe("ready"));
    let r1: string | null = "x", r2: string | null = null; await act(async () => { r1 = await result.current.save({ id: "a", n: 1 }, "n", 7); r2 = await result.current.save({ id: "b", n: 2 }, "n", 7); });
    expect(r1).toBeNull(); expect(r2).toBe("No"); await waitFor(() => expect(result.current.rows[0].n).toBe(7));
  });
});
