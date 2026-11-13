import { describe, expect, it } from "vitest";
import { plan, stream, type Chunk } from "./chatsim.ts";
const collect = async (p: string, signal?: AbortSignal) => { const out: Chunk[] = []; for await (const c of stream(p, 0, signal)) out.push(c); return out; };
describe("simulated assistant", () => {
  it("streams text, calls a tool first, cites sources and ends with done", async () => { const c = await collect("what are the colour tokens"); expect(c[0].type).toBe("tool"); expect(c[1]).toMatchObject({ type: "tool-result", status: "done" }); expect(c.filter((x) => x.type === "text").map((x) => (x as { text: string }).text).join("")).toContain("--jp-*"); expect(c.filter((x) => x.type === "cite")).toHaveLength(2); expect(c.at(-1)).toEqual({ type: "done" }); });
  it("surfaces a tool failure", async () => { expect((await collect("this is broken")).find((x) => x.type === "tool-result")).toMatchObject({ status: "error" }); });
  it("stops when aborted", async () => { const ac = new AbortController(); ac.abort(); const c = await collect("hello", ac.signal); expect(c.some((x) => x.type === "done")).toBe(false); });
  it("answers unknown prompts without tools", () => { expect(plan("zzz").tool).toBeUndefined(); });
});
