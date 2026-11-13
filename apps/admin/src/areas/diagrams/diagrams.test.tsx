import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import type { ReactElement } from "react";
import * as D from "./data.ts";
import * as P from "./pages.tsx";
import { Alluvial, ArcDiagram, Chord, Sankey } from "./flows.tsx";
import { Dendrogram, MindMap, OrgChart, TreeDiagram } from "./trees.tsx";
import { UpSet, Venn } from "./sets.tsx";
import { Architecture, DependencyMatrix, ErDiagram, LayeredGraph } from "./systems.tsx";
import { FlameGraph, TraceWaterfall } from "./traces.tsx";
import { CohortTable, Funnel } from "./product.tsx";
import { BranchGraph, CommitCalendar, DeployFrequency, LeadTime } from "./devops.tsx";
import { Faceplate, RackElevation, SignalHeat, WifiSpectrum } from "./network.tsx";
import { MotionRaster, OccupancyHeat } from "./occupancy.tsx";
import { AuChoropleth, Geofences, GpsTrack, HexTileMap, RoadIsochrone } from "./geo.tsx";
import { routes } from "./index.tsx";

const wrap = (ui: ReactElement) => render(<MemoryRouter><PrefsProvider>{ui}</PrefsProvider></MemoryRouter>);
const clean = () => { expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/); };
const start = D.TODAY.getTime() - 84 * 86400000;

const cases: [string, string, () => ReactElement, () => ReactElement][] = [
  ["Sankey D041", "sankey", () => <Sankey nodes={D.sankeyNodes} links={D.sankeyLinks} />, () => <Sankey nodes={[]} links={[]} />],
  ["Alluvial D041", "alluvial", () => <Alluvial stages={D.alluvialStages} paths={D.alluvialPaths} />, () => <Alluvial stages={[]} paths={[]} />],
  ["Chord D041", "chord", () => <Chord names={D.chordNames} matrix={D.chordMatrix} />, () => <Chord names={[]} matrix={[]} />],
  ["Arc D041", "arc", () => <ArcDiagram ids={D.arcIds} links={D.arcLinks} />, () => <ArcDiagram ids={[]} links={[]} state="empty" />],
  ["Tree D043", "tree", () => <TreeDiagram root={D.taxonomy} />, () => <TreeDiagram root={D.taxonomy} state="empty" />],
  ["Org chart D043", "org", () => <OrgChart root={D.orgTree} />, () => <OrgChart root={D.orgTree} state="empty" />],
  ["Mind map D043", "mind", () => <MindMap root={D.mind} />, () => <MindMap root={D.mind} state="empty" />],
  ["Dendrogram D043", "dendro", () => <Dendrogram labels={D.dendroLabels} vectors={D.dendroVectors} />, () => <Dendrogram labels={["a", "b"]} vectors={[[0], [1]]} state="empty" />],
  ["Venn D045", "venn", () => <Venn sets={D.venn} />, () => <Venn sets={{ A: [], B: [] }} />],
  ["UpSet D045", "upset", () => <UpSet sets={D.upset} />, () => <UpSet sets={{ A: [] }} />],
  ["ER D047", "er", () => <ErDiagram entities={D.entities} relations={D.relations} />, () => <ErDiagram entities={[]} relations={[]} />],
  ["Architecture D047", "arch", () => <Architecture tiers={D.tiers} edges={D.archEdges} />, () => <Architecture tiers={[]} edges={[]} />],
  ["Dependency matrix D047", "dep", () => <DependencyMatrix ids={D.packages} edges={D.pkgDeps} />, () => <DependencyMatrix ids={[]} edges={[]} />],
  ["Pipeline DAG D047", "dag", () => <LayeredGraph ids={D.pipeline} edges={D.pipeEdges} raw={D.pipeRaw} />, () => <LayeredGraph ids={[]} edges={[]} />],
  ["Lineage D047", "lineage", () => <LayeredGraph mode="lineage" ids={D.lineage} edges={D.lineageEdges} />, () => <LayeredGraph mode="lineage" ids={[]} edges={[]} />],
  ["Waterfall D049", "waterfall", () => <TraceWaterfall spans={D.spans} />, () => <TraceWaterfall spans={[]} />],
  ["Flame D049", "flame", () => <FlameGraph stacks={D.stacks} />, () => <FlameGraph stacks={[]} />],
  ["Cohort D050", "cohort", () => <CohortTable users={D.cohortUsers} periods={D.WEEKS} />, () => <CohortTable users={[]} periods={D.WEEKS} />],
  ["Funnel D050", "funnel", () => <Funnel data={D.funnels} />, () => <Funnel data={{ All: [] }} />],
  ["Commit calendar D054", "calendar", () => <CommitCalendar counts={D.commitCounts} end={D.TODAY} />, () => <CommitCalendar counts={{}} end={D.TODAY} />],
  ["Branch graph D054", "branch", () => <BranchGraph commits={D.commits} />, () => <BranchGraph commits={[]} />],
  ["Deploy frequency D054", "deploy", () => <DeployFrequency deploys={D.deploys} start={start} weeks={12} />, () => <DeployFrequency deploys={[]} start={start} weeks={12} />],
  ["Lead time D054", "lead", () => <LeadTime hours={D.leadHours} />, () => <LeadTime hours={[]} />],
  ["Faceplate D057", "faceplate", () => <Faceplate ports={D.ports} />, () => <Faceplate ports={[]} />],
  ["Rack D057", "rack", () => <RackElevation racks={D.racks} />, () => <RackElevation racks={[]} />],
  ["Wi-Fi D057", "wifi", () => <WifiSpectrum networks={D.bss} />, () => <WifiSpectrum networks={[]} />],
  ["Signal heat D057", "signal", () => <SignalHeat {...D.FLOOR} aps={D.aps} walls={D.walls} rooms={D.rooms} />, () => <SignalHeat {...D.FLOOR} aps={[]} walls={D.walls} rooms={D.rooms} state="empty" />],
  ["Occupancy D058", "occ", () => <OccupancyHeat samples={D.occSamples} capacity={D.capacity} rooms={D.roomNames} />, () => <OccupancyHeat samples={[]} capacity={D.capacity} rooms={D.roomNames} />],
  ["Motion D058", "motion", () => <MotionRaster events={D.motionEvents} />, () => <MotionRaster events={{ a: [] }} />],
  ["Hex map D059", "hex", () => <HexTileMap rows={D.hexRows} names={D.hexNames} population={D.statePop} internet={D.stateInternet} />, () => <HexTileMap rows={["."]} names={D.hexNames} population={D.statePop} internet={D.stateInternet} />],
  ["Isochrone D059", "iso", () => <RoadIsochrone />, () => <RoadIsochrone state="empty" />],
  ["GPS D059", "gps", () => <GpsTrack track={D.gpsTrack} />, () => <GpsTrack track={D.gpsTrack} state="empty" />],
  ["Geofence D059", "fence", () => <Geofences track={D.gpsTrack} fences={D.fences} />, () => <Geofences track={D.gpsTrack} fences={D.fences} state="empty" />],
  ["Choropleth D059", "choro", () => <AuChoropleth states={D.stateInternet} />, () => <AuChoropleth states={{}} state="empty" />],
];

describe.each(cases)("%s", (_name, _k, make, empty) => {
  it("renders an accessible diagram with no NaN or undefined text", async () => {
    const { container } = wrap(make()); await waitFor(() => expect(document.querySelector("[aria-busy='true'], p[role='status']")).toBeNull());
    expect(container.querySelector("svg[role='group'][aria-label], table.dg-heat, svg[aria-label]")).not.toBeNull();
    for (const s of container.querySelectorAll("svg[aria-label]")) expect(s.getAttribute("aria-label")!.length).toBeGreaterThan(15);
    expect(container.querySelector("[aria-live='polite']")).not.toBeNull(); clean();
  });
  it("has a data table view", async () => { wrap(make()); await waitFor(() => expect(document.querySelector("[aria-busy='true'], p[role='status']")).toBeNull()); fireEvent.click(screen.getAllByRole("button", { name: "Show data table" })[0]); expect(document.querySelector("table")).not.toBeNull(); clean(); });
  it("shows the empty state instead of NaN geometry when there is no data", () => { wrap(empty()); expect(screen.getByText("No data")).toBeInTheDocument(); clean(); });
});

describe("interaction", () => {
  it("focusing a sankey node announces its flows", () => { wrap(<Sankey nodes={D.sankeyNodes} links={D.sankeyLinks} />); const n = screen.getAllByRole("img").find((e) => e.getAttribute("aria-label")?.startsWith("Home:"))!; fireEvent.focus(n); expect(document.querySelector("[aria-live='polite']")!.textContent).toMatch(/Home: 7[,.]?300 visits/); });
  it("tree branches collapse and expand with Enter", () => { wrap(<TreeDiagram root={D.taxonomy} />); const before = document.querySelectorAll("svg g[role]").length; const inf = screen.getByRole("button", { name: /^Infrastructure/ }); expect(inf).toHaveAttribute("aria-expanded", "true"); fireEvent.keyDown(inf, { key: "Enter" }); expect(screen.getByRole("button", { name: /^Infrastructure/ })).toHaveAttribute("aria-expanded", "false"); expect(document.querySelectorAll("svg g[role]").length).toBeLessThan(before); });
  it("dendrogram cut slider changes the cluster count", () => { wrap(<Dendrogram labels={D.dendroLabels} vectors={D.dendroVectors} />); const s = screen.getByRole("slider"); const badge = () => document.querySelector(".dg-badge")!.textContent!; const a = badge(); fireEvent.change(s, { target: { value: "0" } }); expect(badge()).toMatch(/12 clusters/); fireEvent.change(s, { target: { value: s.getAttribute("max")! } }); expect(badge()).toMatch(/1 clusters/); expect(a).toMatch(/clusters/); });
  it("heat table has one tab stop and arrow keys move the cursor", () => { wrap(<CohortTable users={D.cohortUsers} periods={D.WEEKS} />); const tds = () => [...document.querySelectorAll<HTMLElement>("td[data-r]")]; expect(tds().filter((t) => t.tabIndex === 0).length).toBe(1); const first = tds()[0]; first.focus(); fireEvent.keyDown(first, { key: "ArrowRight" }); expect(tds().filter((t) => t.tabIndex === 0)[0].dataset.c).toBe("1"); expect(document.querySelector("[aria-live='polite']")!.textContent).toMatch(/1 weeks after signup/); });
  it("cohort triangle shows the future as empty cells", () => { wrap(<CohortTable users={D.cohortUsers} periods={D.WEEKS} />); expect(document.querySelectorAll("td.is-empty").length).toBe((D.WEEKS * (D.WEEKS - 1)) / 2 + 0 + (0)); });
  it("pipeline marks the downstream of the failed task as blocked", () => { wrap(<LayeredGraph ids={D.pipeline} edges={D.pipeEdges} raw={D.pipeRaw} />); expect(screen.getByRole("img", { name: /^train_model: Blocked by upstream failure/ })).toBeInTheDocument(); expect(screen.getByRole("img", { name: /^join_sessions: Failed/ })).toBeInTheDocument(); });
  it("flame graph zooms into a frame and resets", () => { wrap(<FlameGraph stacks={D.stacks} />); fireEvent.keyDown(screen.getByRole("button", { name: /^orders:/ }), { key: "Enter" }); expect(screen.getByRole("button", { name: /Reset zoom/ })).toBeInTheDocument(); fireEvent.click(screen.getByRole("button", { name: /Reset zoom/ })); expect(screen.queryByRole("button", { name: /Reset zoom/ })).toBeNull(); });
  it("GPS slider moves the marker and updates the readout", () => { wrap(<GpsTrack track={D.gpsTrack} />); const s = screen.getByRole("slider"); fireEvent.change(s, { target: { value: "70" } }); expect(s.getAttribute("aria-valuetext")).toMatch(/km.*m.*elapsed/); });
  it("geofence states follow the scrubber", () => { wrap(<Geofences track={D.gpsTrack} fences={D.fences} />); expect(screen.getByText(/Depot: (Inside|Dwelling)/)).toBeInTheDocument(); fireEvent.change(screen.getByRole("slider"), { target: { value: "70" } }); expect(screen.getByText(/Depot: Outside/)).toBeInTheDocument(); });
  it("choropleth loads real boundaries, then switches to councils and steps with the keyboard", async () => { wrap(<AuChoropleth states={D.stateInternet} />); expect(await screen.findByRole("img", { name: /^New South Wales:/ })).toBeInTheDocument(); fireEvent.click(screen.getByRole("button", { name: /Council/ })); const g = await screen.findByRole("group", { name: /Council areas map, \d+ areas/ }); fireEvent.keyDown(g, { key: "ArrowRight" }); expect(document.querySelector("[aria-live='polite']")!.textContent).toMatch(/\(\w+\): \d+% online \(sample\), .* km2/); fireEvent.change(screen.getByLabelText("Zoom to state"), { target: { value: "QLD" } }); expect(await screen.findByRole("group", { name: /Council areas map, [78]\d areas/ })).toBeInTheDocument(); });
  it("isochrone runs Dijkstra and a route readout appears for a chosen town", async () => { wrap(<RoadIsochrone />); await screen.findByLabelText("Route to town"); fireEvent.change(screen.getByLabelText("Route to town"), { target: { value: "cns" } }); expect(document.querySelector("[aria-live='polite']")!.textContent).toMatch(/^Brisbane to Cairns: 1\d h \d\d min, about 1\d{3} km via Brisbane, Gympie/); });
  it("wifi spectrum recommends a quiet channel and switches band", () => { wrap(<WifiSpectrum networks={D.bss} />); expect(screen.getByText(/Quietest 20 MHz channel: 11/)).toBeInTheDocument(); fireEvent.click(screen.getByRole("button", { name: "5 GHz" })); expect(screen.getByText(/Quietest 20 MHz channel:/)).toBeInTheDocument(); });
  it("signal heat grid reads cells with the arrow keys", () => { wrap(<SignalHeat {...D.FLOOR} aps={D.aps} walls={D.walls} rooms={D.rooms} />); const g = screen.getByRole("group", { name: /Arrow keys read/ }); fireEvent.focus(g); fireEvent.keyDown(g, { key: "ArrowRight" }); expect(document.querySelector("[aria-live='polite']")!.textContent).toMatch(/column 2: -?\d+ dBm from AP-/); });
  it("commit calendar reads days with the arrow keys", () => { wrap(<CommitCalendar counts={D.commitCounts} end={D.TODAY} />); const g = screen.getByRole("group", { name: /Arrow keys move between days/ }); fireEvent.focus(g); fireEvent.keyDown(g, { key: "ArrowDown" }); expect(document.querySelector("[aria-live='polite']")!.textContent).toMatch(/Mon \d{4}-\d{2}-\d{2}: \d+ commits/); });
});

describe("routes", () => {
  it("registers eight lazy pages with known icons", () => { expect(routes.length).toBe(8); for (const r of routes) { expect(r.path).toMatch(/^\/(diagrams|spatial)\//); expect(["Diagrams", "Spatial"]).toContain(r.group); } });
  const pages: [string, () => ReactElement][] = [["flows", P.FlowsPage], ["hierarchies", P.HierarchyPage], ["systems", P.SystemsPage], ["traces", P.TracesPage], ["delivery", P.ProductEngineeringPage], ["network", P.NetworkSpatialPage], ["occupancy", P.OccupancyPage], ["maps", P.GeoMapsPage]].map(([n, C]) => [n as string, () => <>{(C as () => ReactElement)()}</>]);
  for (const [name, page] of pages) it(`page ${name} renders and labels every entry ID`, () => { const { container } = wrap(page()); expect(container.querySelectorAll("svg, table").length).toBeGreaterThan(1); expect(container.querySelectorAll(".dg-id").length).toBeGreaterThan(0); clean(); });
  it("every catalogue ID is labelled somewhere", () => { const seen = new Set<string>(); for (const [, p] of pages) { const { container, unmount } = wrap(p()); container.querySelectorAll(".dg-id").forEach((e) => e.textContent && seen.add(e.textContent)); unmount(); } for (const id of ["D041", "D043", "D045", "D047", "D049", "D050", "D054", "D057", "D058", "D059"]) expect(seen.has(id), id).toBe(true); });
});
void within;
