import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { existsSync } from "node:fs";
import { MemoryRouter } from "react-router-dom";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import "../registry.ts";
import { ROUTES } from "../../routes.ts";
import baseline from "../../../visual/baseline.json";
import a11yBaseline from "../../test/a11y-baseline.json";
import { Quality } from "./Quality.tsx";
import { Parity } from "./Parity.tsx";
import { coverage, summary, hasShot, orphanShots, shotKey, VARIANTS } from "./quality.data.ts";
import { PARITY, TARGETS, totals, gaps, type View } from "./parity.data.ts";
const wrap = (el: React.ReactNode) => render(<MemoryRouter><PrefsProvider>{el}</PrefsProvider></MemoryRouter>);
const R = [{ path: "/a", label: "A", group: "G" }, { path: "/b", label: "B", group: "G" }, { path: "/c", label: "C", group: "G" }];
const shots = { "/a#light": "x", "/a#dark": "x", "/a#light+compact": "x", "/a#dark+compact": "x", "/b#light": "x", "/b#dark+compact": "x", "/gone#dark": "x" };
describe("quality logic", () => {
  it("builds keys: comfortable keeps the legacy form, compact adds a suffix", () => { expect(shotKey("/a", "dark")).toBe("/a#dark"); expect(shotKey("/a", "light", "compact")).toBe("/a#light+compact"); });
  it("matches baseline keys per theme and density", () => {
    expect(hasShot(shots, "/a", "dark")).toBe(true); expect(hasShot(shots, "/b", "light")).toBe(true); expect(hasShot(shots, "/b", "dark")).toBe(false);
    expect(hasShot(shots, "/b", "dark", "compact")).toBe(true); expect(hasShot(shots, "/b", "light", "compact")).toBe(false); expect(hasShot({ "/chrome/x#dark+compact": "x" }, "/chrome/x", "dark", "compact")).toBe(true);
  });
  it("covers four variants per route and counts them", () => {
    expect(VARIANTS.map((v) => v.key)).toEqual(["light-comfortable", "dark-comfortable", "light-compact", "dark-compact"]);
    const c = coverage(R, shots, { "/c": ["link-name", "list"] }); expect(c[0].covered).toBe(4); expect(c[1].variants).toEqual({ "light-comfortable": true, "dark-comfortable": false, "light-compact": false, "dark-compact": true }); expect(c[2].covered).toBe(0);
    expect(summary(c)).toEqual({ routes: 3, full: 1, missing: 2, noDensity: 0, shots: 6, possible: 12, byVariant: { "light-comfortable": 2, "dark-comfortable": 1, "light-compact": 1, "dark-compact": 2 }, clean: 2, violations: 2 });
  });
  it("flags routes baselined before density variants existed", () => { expect(summary(coverage(R, { "/a#light": "x", "/a#dark": "x" }, {})).noDensity).toBe(1); });
  it("reports baseline routes that no longer exist", () => { expect(orphanShots(R, shots)).toEqual(["/gone"]); });
  it("reads the real artefacts", () => { expect(ROUTES.length).toBeGreaterThan(100); expect(Object.keys(baseline.shots).length).toBeGreaterThan(100); expect(summary(coverage(ROUTES, baseline.shots, a11yBaseline)).routes).toBe(ROUTES.length); });
});
describe("quality page", () => {
  it("shows per-route status and filters to visual gaps", async () => {
    wrap(<Quality routes={R} shots={shots} a11y={{ "/c": ["link-name"] }} />); expect(screen.getByText("2 routes lack a visual baseline")).toBeInTheDocument();
    expect(screen.getAllByText("npm run visual").length).toBeGreaterThan(0); expect(screen.getAllByText("npm run e2e").length).toBeGreaterThan(0); expect(screen.getAllByText("npm test").length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: "a11y known" })); expect(screen.getByText("link-name", { selector: "td *, td" })).toBeInTheDocument(); expect(screen.queryByText("/a")).not.toBeInTheDocument();
  });
  it("shows all four variants per route with counts", () => {
    wrap(<Quality routes={R} shots={shots} a11y={{}} />);
    for (const l of ["light comfortable", "dark comfortable", "light compact", "dark compact"]) { expect(screen.getByRole("columnheader", { name: new RegExp(`Visual ${l}`) })).toBeInTheDocument(); expect(screen.getByText(`Baselined: ${l}`)).toBeInTheDocument(); }
    expect(screen.getByText("4/4", { selector: "td" })).toBeInTheDocument(); expect(screen.getByText("2/4", { selector: "td" })).toBeInTheDocument(); expect(screen.getByText("0/4", { selector: "td" })).toBeInTheDocument();
  });
  it("says when the baseline has no compact shots", () => { wrap(<Quality routes={R} shots={{ "/a#light": "x", "/a#dark": "x" }} a11y={{}} />); expect(screen.getByText(/routes have no compact baseline yet/)).toBeInTheDocument(); });
});
describe("parity", () => {
  it("every evidence path exists in the repo and is tracked, not a generated copy", () => {
    const root = `${process.cwd()}/../..`;
    for (const v of PARITY) for (const p of v.evidence) { expect(existsSync(`${root}/${p}`), p).toBe(true); expect(p, "generated copies are gitignored").not.toMatch(/examples\/slint\/ui\/(assets|fonts|jupiter\.slint)|examples\/gtk\/assets\/(svg|jupiter-gtk)|\/dist\/|\/build\//); }
  });
  it("counts and the gap filter follow the data; n/a is neither a yes nor a gap", () => {
    const fx: View[] = [
      { id: "a", view: "A", web: "/a", tui: "yes", slint: "yes", gtk: "yes", latex: "na", evidence: [], note: "", reasons: { latex: "no runtime" } },
      { id: "b", view: "B", web: "/b", tui: "no", slint: "partial", gtk: "yes", latex: "na", evidence: [], note: "" },
      { id: "c", view: "C", web: "/c", tui: "na", slint: "na", gtk: "na", latex: "yes", evidence: [], note: "" },
    ];
    expect(totals(fx)).toEqual({ tui: 1, slint: 1, gtk: 2, latex: 1, n: 3, applicable: { tui: 2, slint: 2, gtk: 2, latex: 1 } });
    expect(gaps(fx).map((x) => x.id)).toEqual(["b"]);
    expect(totals(PARITY).n).toBe(PARITY.length);
  });
  it("every n/a or partial cell in the data has a reason, and every yes has evidence", () => {
    for (const v of PARITY) { expect(v.evidence.length, v.id).toBeGreaterThan(0); for (const t of TARGETS) if (v[t] === "na" || v[t] === "partial") expect((v.reasons?.[t] ?? "").length, `${v.id}.${t}`).toBeGreaterThan(10); }
  });
  it("metrics, alerts, settings, overview exist on every UI target", () => { for (const id of ["overview", "metrics", "alerts", "settings"]) { const v = PARITY.find((x) => x.id === id)!; expect([v.tui, v.slint, v.gtk], id).toEqual(["yes", "yes", "yes"]); } });
  it("renders the table, shows n/a with its reason and filters to gaps", async () => {
    wrap(<Parity />); expect(screen.getByRole("table", { name: "Platform parity" })).toBeInTheDocument();
    expect(screen.getAllByText("n/a").length).toBeGreaterThan(0); expect(screen.getByText(/A PDF cannot be edited in place/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "With gaps" })); expect(screen.queryByText("Theme (light and dark tokens)")).not.toBeInTheDocument(); expect(gaps(PARITY).length).toBe(0); expect(screen.queryByText("Data tables with in-place edit")).not.toBeInTheDocument();
  });
});
