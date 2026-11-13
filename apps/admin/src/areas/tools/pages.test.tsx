import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { routes } from "./index.tsx";
import { suggestThreshold, backtest } from "./lib/alert.ts";
import { buildBlocks } from "./pages/PrintPreview.tsx";
import { paginate } from "./lib/paginate.ts";
import { runRegex } from "./lib/playground.ts";
import { buildSql } from "./lib/qb.ts";
import { runSql } from "./lib/sql.ts";
import { TABLES } from "./lib/data.ts";
import { CHECKS } from "./pages/Diagnostics.tsx";

describe("tools routes", () => {
  it("has 20 unique /tools paths in group Tools", () => {
    expect(routes).toHaveLength(20);
    expect(new Set(routes.map((r) => r.path)).size).toBe(20);
    for (const r of routes) { expect(r.path.startsWith("/tools/")).toBe(true); expect(r.group).toBe("Tools"); expect(r.bare).toBeFalsy(); }
  });
  it.each(routes.map((r) => [r.path, r] as const))("renders %s", (_p, r) => {
    const { container } = render(<PrefsProvider><MemoryRouter>{r.element}</MemoryRouter></PrefsProvider>);
    expect(container.querySelector("h1")).not.toBeNull();
  });
});
describe("libs", () => {
  it("regex runner finds matches and caps bad patterns", () => {
    const r = runRegex("a(b+)", "g", "ab abb x");
    expect(r.error).toBeUndefined(); expect(r.matches.length).toBe(2);
    expect(runRegex("(", "", "x").error).toBeTruthy();
  });
  it("query builder SQL runs on the sql engine", () => {
    const sql = buildSql({ table: "orders", cols: ["id"], conds: [], join: "and", groupBy: "", aggFn: "", aggCol: "", orderBy: "", desc: false, limit: 5 });
    expect(runSql(sql, TABLES).rows.length).toBe(5);
  });
  it("alert threshold suggestion reduces firings", () => {
    const v = Array.from({ length: 168 }, (_, i) => 50 + (i % 10) * 3 + (i % 37 === 0 ? 40 : 0));
    const rule = { op: ">" as const, threshold: 55, forPoints: 1, cooldownPoints: 0 };
    const before = backtest(v, rule).firings.length;
    const t = suggestThreshold(v, rule, 3);
    expect(t).not.toBeNull();
    expect(backtest(v, { ...rule, threshold: t as number }).firings.length).toBeLessThanOrEqual(3);
    expect(before).toBeGreaterThan(3);
  });
  it("print pagination covers all blocks and keeps headings with next block", () => {
    const blocks = buildBlocks(); const pages = paginate(blocks, 240);
    expect(pages.flatMap((p) => p.blocks).length).toBe(blocks.length);
    for (const p of pages) expect(p.blocks.at(-1)?.keepWithNext).not.toBe(true);
  });
  it("diagnostics checks have unique ids and none throw", async () => {
    expect(new Set(CHECKS.map((c) => c.id)).size).toBe(CHECKS.length);
    for (const c of CHECKS) { const r = await c.run(); expect(["pass", "warn", "fail", "info"]).toContain(r.status); }
  });
});
describe("interactions", () => {
  it("SQL console runs a query", async () => {
    const r = routes.find((x) => x.path.endsWith("/sql"))!;
    render(<PrefsProvider><MemoryRouter>{r.element}</MemoryRouter></PrefsProvider>);
    fireEvent.click(screen.getAllByRole("button", { name: /run/i })[0]);
    expect(await screen.findAllByRole("row")).not.toHaveLength(0);
  });
});
