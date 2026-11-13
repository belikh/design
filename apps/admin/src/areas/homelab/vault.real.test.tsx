import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { Vault } from "./Vault.tsx";
import { resetStores } from "./lib.tsx";
import { parseFrontMatter, parseYaml, wikilinks, buildVault, parseRun } from "./vault.parse.ts";
import { edgesOf, degrees, forceLayout, radialLayout, circleLayout, components } from "./vault.graph.ts";
import { loadVault, hasVault, repoSource, type VaultSource } from "./vault.load.ts";

// A fictional fixture vault (no real notes): front matter in the shapes hyperresearch writes.
const A = `---
title: '[2401.00001] Fictional paper on long context'
id: alpha-note
tags:
- context
- paper
created: '2026-08-24T00:18:41.066026Z'
updated: '2026-09-02T02:39:15.133597Z'
source: https://arxiv.org/abs/2401.00001
source_domain: arxiv.org
fetched_at: '2026-08-24T00:18:41.065045Z'
status: evergreen
content_type: paper
tier: institutional
deprecated: false
summary: 'A folded summary that runs
  over two lines and has a ''quoted'' word.'
---
# Alpha
See [[beta-note]] and [[Gamma note|the gamma]] and [[beta-note#Heading]]. Also [[missing-note]].
\`\`\`
[[ignored-in-code]]
\`\`\`
`;
const B = `---
title: Beta note
id: beta-note
tags: [context, "two words"]
status: draft
summary: >
  Folded block
  summary.
updated: 2026-10-01
---
Links back to [[alpha-note]].
`;
const C = `---
title: Gamma note
status: review
---
No id in front matter, so the file name is the id. Links to [[Beta Note]] by title.
`;
const D = `---
title: Lonely
status: stale
summary: ''
---
Nothing links here.
`;
const FILES = { "../x/research/notes/alpha-note.md": A, "../x/research/notes/beta-note.md": B, "../x/research/notes/gamma.md": C, "../x/research/notes/lonely.md": D };
const RUN = JSON.stringify({ manifest_version: 1, vault_tag: "demo-run-1", profile: "full", profile_steps: ["1", "2", "3", "4"], status: "running", steps: { "1": { status: "done" }, "2": { status: "done" }, "3": { status: "running" } }, spend: { estimated_usd: 1.234, sources_fetched: 12 } });
const RUN2 = JSON.stringify({ vault_tag: "demo-run-2", profile: "light", profile_steps: ["1", "2"], status: "paused", steps: {}, spend: {} });
const mk = (files: Record<string, string>) => Object.fromEntries(Object.entries(files).map(([p, t]) => [p, () => Promise.resolve(t)]));
const SRC: VaultSource = { notes: mk(FILES), runs: mk({ "../x/research/runs/demo-run-1/run.json": RUN, "../x/research/runs/demo-run-2/run.json": RUN2, "../x/research/runs/bad/run.json": "{not json" }), queries: mk({ "../x/research/runs/demo-run-1/query.md": "---\ntype: query\n---\nHow do fictional models handle long context?\n" }) };

describe("front matter parser", () => {
  it("reads scalars, quoted and folded strings, lists and dates", () => {
    const { data, body } = parseFrontMatter(A); expect(data.title).toBe("[2401.00001] Fictional paper on long context"); expect(data.id).toBe("alpha-note"); expect(data.tags).toEqual(["context", "paper"]); expect(data.deprecated).toBe(false);
    expect(data.summary).toBe("A folded summary that runs over two lines and has a 'quoted' word."); expect(data.created).toBe("2026-08-24T00:18:41.066026Z"); expect(data.source).toBe("https://arxiv.org/abs/2401.00001"); expect(body.startsWith("# Alpha")).toBe(true);
    const b = parseFrontMatter(B).data; expect(b.tags).toEqual(["context", "two words"]); expect(b.summary).toBe("Folded block summary."); expect(b.updated).toBe("2026-10-01");
  });
  it("copes with no front matter, unterminated front matter, nested maps and junk", () => {
    expect(parseFrontMatter("# Just text")).toEqual({ data: {}, body: "# Just text" }); expect(parseFrontMatter("---\ntitle: x\nno end").data).toEqual({}); expect(parseYaml(["oa:", "  version: publishedVersion", "  n: 3", "k: v"])).toEqual({ oa: { version: "publishedVersion", n: 3 }, k: "v" }); expect(parseYaml(["???", "  stray", "a: 1"])).toEqual({ a: 1 });
  });
  it("extracts wikilinks, with aliases and headings, skipping code", () => { expect(wikilinks(A.split("---").slice(2).join("---"))).toEqual(["beta-note", "Gamma note", "missing-note"]); expect(wikilinks("`[[x]]` and [[y]] [[y]]")).toEqual(["y"]); });
});
describe("vault builder", () => {
  const v = buildVault(Object.entries(FILES).map(([path, text]) => ({ path, text })));
  it("builds notes, resolving links by id, file name and title, and reports broken ones", () => {
    expect(v.notes.map((n) => n.id)).toEqual(["alpha-note", "beta-note", "gamma", "lonely"]); const by = Object.fromEntries(v.notes.map((n) => [n.id, n]));
    expect(by["alpha-note"]).toMatchObject({ status: "evergreen", updated: "2026-09-02", tags: ["context", "paper"], links: ["beta-note", "gamma"] }); expect(v.broken).toEqual({ "alpha-note": ["missing-note"] });
    expect(by["beta-note"].links).toEqual(["alpha-note"]); expect(by.gamma.links).toEqual(["beta-note"]); expect(by.gamma.status).toBe("review"); expect(by.lonely).toMatchObject({ status: "stale", summary: "", links: [] });
  });
  it("derives the source list from notes with a URL", () => { expect(v.sources).toHaveLength(1); expect(v.sources[0]).toMatchObject({ url: "https://arxiv.org/abs/2401.00001", domain: "arxiv.org", kind: "paper", quality: 90, fetched: "2026-08-24", oa: "preprint" }); });
  it("skips duplicate ids and defaults unknown status to draft", () => { const d = buildVault([{ path: "a.md", text: "---\nid: x\nstatus: weird\n---\n" }, { path: "b.md", text: "---\nid: x\n---\n" }]); expect(d.notes).toHaveLength(1); expect(d.notes[0].status).toBe("draft"); expect(d.skipped[0]).toMatch(/duplicate id x/); });
});
describe("run manifests", () => {
  it("maps run.json to a run row", () => {
    expect(parseRun(RUN, "---\n---\nHow do fictional models handle long context?\n")).toMatchObject({ id: "run-demo-run-1", query: "How do fictional models handle long context?", tier: "full", step: 2, total: 4, stepName: "3", status: "running", sources: 12, spend: 1.23 });
    expect(parseRun(RUN2, "", "x")).toMatchObject({ tier: "light", status: "blocked", step: 0, query: "demo-run-2" }); expect(parseRun("{nope")).toBeNull(); expect(parseRun("[]")).toBeNull();
    expect(parseRun(JSON.stringify({ vault_tag: "t", status: "done", profile_steps: ["1", "2", "3"], steps: {} }))).toMatchObject({ step: 3, status: "done" });
  });
});
describe("graph layouts", () => {
  const notes = [..."abcdefgh"].map((id) => ({ id, links: id === "a" ? ["b", "c", "d"] : id === "e" ? ["f"] : [] }));
  const edges = edgesOf(notes);
  it("builds each edge once and counts degrees", () => { expect(edges).toEqual([["a", "b"], ["a", "c"], ["a", "d"], ["e", "f"]]); expect(edgesOf([{ id: "x", links: ["y"] }, { id: "y", links: ["x", "x", "zz"] }])).toEqual([["x", "y"]]); expect(degrees(notes, edges)).toMatchObject({ a: 3, b: 1, e: 1, g: 0 }); });
  it("finds connected groups, largest first", () => { expect(components(notes, edges).map((c) => c.length)).toEqual([4, 2, 1, 1]); });
  it("force layout is deterministic, inside the box, and pulls linked notes closer than unlinked ones", () => {
    const p1 = forceLayout(notes, edges), p2 = forceLayout(notes, edges); expect(p1).toEqual(p2); for (const q of Object.values(p1)) { expect(q.x).toBeGreaterThanOrEqual(0); expect(q.x).toBeLessThanOrEqual(1); expect(q.y).toBeGreaterThanOrEqual(0); expect(q.y).toBeLessThanOrEqual(1); }
    const d = (a: string, b: string) => Math.hypot(p1[a].x - p1[b].x, p1[a].y - p1[b].y); expect(d("a", "b")).toBeLessThan(d("a", "g")); expect(d("e", "f")).toBeLessThan(d("e", "h")); expect(new Set(Object.values(p1).map((q) => `${q.x.toFixed(3)},${q.y.toFixed(3)}`)).size).toBe(8);
    expect(forceLayout([], [])).toEqual({}); expect(forceLayout([{ id: "x" }], [])).toEqual({ x: { x: 0.5, y: 0.5 } });
  });
  it("radial layout puts the chosen note in the centre and rings by distance", () => {
    const p = radialLayout(notes, edges, "a"); expect(p.a).toEqual({ x: 0.5, y: 0.5 }); const r = (id: string) => Math.hypot(p[id].x - 0.5, p[id].y - 0.5); expect(r("b")).toBeCloseTo(r("c")); expect(r("b")).toBeLessThan(r("e")); expect(r("e")).toBeCloseTo(r("g")); expect(radialLayout(notes, edges, "nope").a).toBeDefined();
  });
  it("circle layout spreads notes evenly", () => { const p = circleLayout(notes); const r = Object.values(p).map((q) => Math.hypot(q.x - 0.5, q.y - 0.5)); expect(Math.max(...r) - Math.min(...r)).toBeLessThan(1e-9); });
});
describe("loading", () => {
  it("falls back to sample data when there is no vault (the repo has none in tests)", async () => { expect(hasVault(repoSource)).toBe(false); const d = await loadVault(); expect(d.mode).toBe("sample"); expect(d.note).toMatch(/fictional/); });
  it("reads a fixture vault, tolerating a bad run file and a failing note", async () => {
    const d = await loadVault({ ...SRC, notes: { ...SRC.notes, "../x/research/notes/broken.md": () => Promise.reject(new Error("nope")) } }); expect(d.mode).toBe("vault"); expect(d.notes).toHaveLength(4); expect(d.runs.map((r) => r.id)).toEqual(["run-demo-run-1", "run-demo-run-2"]); expect(d.failed.sort()).toEqual(["../x/research/notes/broken.md", "../x/research/runs/bad/run.json"]); expect(d.note).toMatch(/Read 4 notes.*2 runs/);
  });
  it("an unreadable vault falls back to sample with a message", async () => { const d = await loadVault({ notes: { "a.md": () => Promise.reject(new Error("x")) }, runs: {}, queries: {} }); expect(d.mode).toBe("sample"); expect(d.note).toMatch(/no note could be read/); });
});

const wrap = (el: React.ReactNode) => render(<MemoryRouter><PrefsProvider>{el}</PrefsProvider></MemoryRouter>);
describe("vault page modes", () => {
  it("says it is showing sample data when there is no vault", () => { resetStores(); wrap(<Vault />); expect(screen.getAllByText("Sample data (fictional)").length).toBeGreaterThan(0); expect(screen.getByText("Showing sample data")).toBeInTheDocument(); });
  it("shows the real vault: mode, notes, sources, graph with selection and runs", async () => {
    resetStores(); wrap(<Vault source={SRC} />); expect(await screen.findByText("Showing your research vault")).toBeInTheDocument(); expect(screen.getAllByText("Real vault: 4 notes").length).toBeGreaterThan(0); expect(screen.getByText(/Read 4 notes from research\/notes and 2 runs/)).toBeInTheDocument();
    expect(await screen.findByText("Beta note")).toBeInTheDocument(); expect(screen.queryByText("Mamba selective state spaces")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: /Sources/ })); expect(await screen.findByText("https://arxiv.org/abs/2401.00001")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Graph" })); expect(screen.getByRole("group", { name: "Note link graph: 4 notes, 3 links, 1 unlinked" })).toBeInTheDocument(); expect(screen.getByText(/1 link to notes that do not exist/)).toBeInTheDocument();
    for (const l of ["Radial", "Circle", "Force"]) { await userEvent.click(screen.getByRole("button", { name: l })); expect(screen.getByRole("group", { name: /Note link graph/ })).toBeInTheDocument(); }
    await userEvent.click(screen.getByRole("button", { name: /^Beta note, 2 connections/ })); expect(screen.getByRole("heading", { name: "Beta note" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: /Runs/ })); expect((await screen.findAllByText("How do fictional models handle long context?")).length).toBeGreaterThan(0); expect(screen.getByText(/2\/4 3/)).toBeInTheDocument(); expect(screen.queryByRole("button", { name: /Advance/ })).not.toBeInTheDocument();
  });
  it("is read-only in real mode (no add row)", async () => { resetStores(); wrap(<Vault source={SRC} />); await screen.findByText("Beta note"); await waitFor(() => expect(screen.queryByRole("button", { name: /add row|new note/i })).not.toBeInTheDocument()); });
});
