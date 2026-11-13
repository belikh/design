import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import * as D from "./data.ts";
import { AreaBandsPage, BusinessFlowPage, DistributionsMorePage, HierarchyPage, PartsRadialPage } from "./pages.tsx";
import { AreaChart, CyclePlot, FanChart, HorizonChart, MinMaxBand } from "./area.tsx";
import { BoxPlot, DensityChart, EcdfChart, Histogram, QQPlot, Ridgeline, StripChart, ViolinPlot } from "./dist.tsx";
import { Icicle, PackedCircles, Sunburst, TreemapChart } from "./hierCharts.tsx";
import { BumpChart, FunnelChart, MarimekkoChart, ParetoChart, PyramidChart, WaterfallChart } from "./biz.tsx";
import { ClockChart, GaugeCluster, LikertChart, NestedDonut, NpsGauge, Pictogram, RoseChart, UnitChart, WaffleChart } from "./parts.tsx";
import { routes } from "./index.tsx";

const wrap = (ui: React.ReactElement) => render(<MemoryRouter><PrefsProvider>{ui}</PrefsProvider></MemoryRouter>);
const clean = () => { expect(screen.queryByText("This view crashed")).not.toBeInTheDocument(); expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/); };

describe("gallery pages", () => {
  const pages: [string, React.ComponentType, string[]][] = [
    ["area-bands", AreaBandsPage, ["D002", "D009", "D010"]], ["distributions", DistributionsMorePage, ["D013", "D018"]], ["hierarchy", HierarchyPage, ["D021"]],
    ["business-flow", BusinessFlowPage, ["D022", "D024"]], ["parts-radial", PartsRadialPage, ["D025", "D026", "D027", "D028"]],
  ];
  for (const [name, Page, ids] of pages) it(`${name} renders with every entry id labelled and no NaN text`, () => {
    const { container } = wrap(<Page />); clean();
    for (const id of ids) expect(screen.getAllByText(new RegExp(`· ${id}`)).length).toBeGreaterThan(0);
    const svgs = [...container.querySelectorAll("svg.p3-svg")]; expect(svgs.length).toBeGreaterThan(1);
    for (const s of svgs) { expect(s.getAttribute("role")).toBe("img"); expect(s.getAttribute("aria-label")?.length).toBeGreaterThan(30); }
  });
  it("registers five routes under /p3/charts in the Charts (more) group", () => { expect(routes.length).toBe(5); for (const r of routes) { expect(r.path).toMatch(/^\/p3\/charts\//); expect(r.group).toBe("Charts (more)"); } });
  it("covers every assigned entry", () => { const k = routes.map((r) => r.keywords).join(" "); for (const id of ["D002", "D009", "D010", "D013", "D018", "D021", "D022", "D024", "D025", "D026", "D027", "D028"]) expect(k).toContain(id); });
});

describe("empty data shows the empty state", () => {
  it("every chart", () => {
    const root = { name: "r", children: [] };
    wrap(<>
      <AreaChart mode="stacked" labels={[]} names={[]} series={[]} /><MinMaxBand labels={[]} min={[]} mean={[]} max={[]} /><HorizonChart labels={[]} names={[]} series={[]} /><CyclePlot values={[]} period={12} seasons={[]} cycleNames={[]} />
      <Histogram values={[]} /><DensityChart names={[]} groups={[]} /><Ridgeline names={[]} groups={[]} /><BoxPlot names={[]} groups={[]} /><ViolinPlot names={[]} groups={[]} /><StripChart names={[]} groups={[]} /><EcdfChart names={[]} groups={[]} /><QQPlot values={[]} />
      <TreemapChart root={root} /><Sunburst root={root} /><Icicle root={root} /><PackedCircles root={root} />
      <WaterfallChart steps={[]} /><ParetoChart items={[]} /><FunnelChart steps={[]} /><PyramidChart groups={[]} left={{ name: "L", data: [] }} right={{ name: "R", data: [] }} /><BumpChart labels={[]} series={[]} /><MarimekkoChart cols={[]} />
      <WaffleChart parts={[]} /><Pictogram parts={[]} /><UnitChart rows={[]} /><RoseChart labels={[]} values={[]} /><ClockChart byHour={[]} /><NestedDonut inner={[]} outer={[]} /><GaugeCluster gauges={[]} /><LikertChart cats={[]} rows={[]} /><NpsGauge scores={[]} />
    </>);
    expect(screen.getAllByText("No data").length).toBe(31); clean();
  });
});

describe("keyboard readout and data table", () => {
  it("arrow keys step through the readout of a histogram", () => {
    const { container } = wrap(<Histogram values={[1, 2, 2, 3, 3, 3, 4, 9]} bins={4} />);
    const svg = container.querySelector("svg.p3-svg")!; svg.dispatchEvent(new Event("focus")); fireEvent.keyDown(svg, { key: "ArrowRight" });
    expect(screen.getByText("0 to 2.5 ms: 3 values (37.5%)")).toBeInTheDocument(); fireEvent.keyDown(svg, { key: "ArrowRight" }); expect(screen.getByText("2.5 to 5 ms: 4 values (50.0%)")).toBeInTheDocument();
    fireEvent.keyDown(svg, { key: "Escape" }); expect(screen.getByText(/Hover, or focus the chart/)).toBeInTheDocument();
  });
  it("data table toggle shows the computed numbers (stacked area totals, box quartiles, NPS)", () => {
    const { unmount } = wrap(<AreaChart mode="percent" title="Mix" labels={["a", "b"]} names={["x", "y"]} series={[[1, 3], [3, 1]]} />);
    expect(screen.getByLabelText(/Mix. 100% stacked area/)).toBeInTheDocument(); fireEvent.click(screen.getByRole("button", { name: "Show data table" }));
    const t = screen.getByRole("table"); expect(within(t).getAllByRole("row").length).toBe(3); expect(within(t).getAllByText("4").length).toBe(2); unmount();
    wrap(<BoxPlot title="Box" names={["g"]} groups={[[1, 2, 3, 4, 5, 6, 7, 8, 9, 100]]} />); fireEvent.click(screen.getByRole("button", { name: "Show data table" }));
    const bt = screen.getByRole("table"); expect(within(bt).getByText("3.3")).toBeInTheDocument(); expect(within(bt).getByText("7.8")).toBeInTheDocument(); expect(within(bt).getByText("5.5")).toBeInTheDocument();
  });
  it("labels and key text for each family", () => {
    wrap(<><NpsGauge scores={[10, 10, 9, 8, 3]} title="NPS" /><WaffleChart parts={D.ticketParts} title="W" /><FunnelChart steps={D.funnelSteps} title="F" /><ParetoChart items={D.defects} title="P" /></>);
    expect(screen.getByLabelText(/Net Promoter Score 40/)).toBeInTheDocument(); expect(screen.getByLabelText(/Waffle of 100 squares: Resolved 62, In progress 21/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Funnel of 5 steps from 48,200/)).toBeInTheDocument(); expect(screen.getByLabelText(/first 3 account for 8\d%/)).toBeInTheDocument();
  });
  it("single point and all-equal data do not produce NaN", () => {
    wrap(<><AreaChart mode="stream" labels={["a"]} names={["x"]} series={[[5]]} title="A1" /><Histogram values={[5, 5, 5]} title="H1" /><BoxPlot names={["a"]} groups={[[4, 4, 4]]} title="B1" /><QQPlot values={[3, 3, 3]} title="Q1" /><FunnelChart steps={[{ label: "x", value: 0 }]} title="F1" /><BumpChart labels={["a"]} series={[{ name: "s", values: [1] }]} title="Bu1" /><TreemapChart root={{ name: "r", children: [{ name: "a", value: 1 }] }} title="T1" /><LikertChart cats={["a", "b", "c"]} rows={[{ label: "q", counts: [0, 0, 0] }]} title="L1" /></>);
    clean();
  });
});
