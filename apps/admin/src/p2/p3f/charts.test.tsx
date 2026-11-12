import { describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import * as D from "./data.ts";
import { FinancePage, PolarPage, EnergyPage, SignalPage, SurfacePage, FeaturesPage } from "./pages.tsx";
import { BudgetVariance, CashBridge, Candlestick, ControlChart, DepthChart, ErrorBars, InvoiceAgeing } from "./fin.tsx";
import { ParallelCoords, PolarArea, Radar, TagCloud, WordCloud } from "./polarcharts.tsx";
import { BatterySoc, LoadCurve, StackedSources, SunPath, TempHumidity, WindRose } from "./env.tsx";
import { Constellation, ImageHistogram, Spectrogram, VideoMarkers, Waterfall, Waveform } from "./sig.tsx";
import { CapacityForecast, ContourPlot, PoolLayout, SmartTrend, SurfacePlot, demoField } from "./surf.tsx";
import { AsciiPreview, CrossFilter, FreshnessBar, LassoScatter, PatternBars, ScaleSwitch, SyncedCharts, TrendFig } from "./feat.tsx";
import { routes } from "./index.tsx";

const wrap = (ui: React.ReactElement) => render(<MemoryRouter><PrefsProvider>{ui}</PrefsProvider></MemoryRouter>);
const noCrash = () => { expect(screen.queryByText("This view crashed")).not.toBeInTheDocument(); expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/); };

describe("routes and pages", () => {
  it("registers six unprefixed /p3/signals routes in the domain group", () => {
    expect(routes).toHaveLength(6); for (const r of routes) { expect(r.path).toMatch(/^\/p3\/signals\/[a-z]+$/); expect(r.group).toBe("Charts (domain)"); }
  });
  const pages: [string, React.ComponentType, string[]][] = [["finance", FinancePage, ["D060", "D066"]], ["polar", PolarPage, ["D061", "D062"]], ["energy", EnergyPage, ["D063", "D064"]], ["signal", SignalPage, ["D065", "D067"]], ["surface", SurfacePage, ["D068", "D069"]], ["features", FeaturesPage, ["D074"]]];
  for (const [name, Page, ids] of pages) it(`${name} page renders, labels its IDs, has no NaN`, () => {
    const { container } = wrap(<Page />); noCrash();
    for (const id of ids) expect(screen.getAllByText(id).length).toBeGreaterThan(0);
    for (const svg of container.querySelectorAll("svg[role=img]")) expect(svg.getAttribute("aria-label")?.length).toBeGreaterThan(20);
  });
});

/** Every chart: an img role with a text summary, a data-table view and a keyboard inspector that updates the live readout. */
const charts: [string, () => React.ReactElement][] = [
  ["candlestick", () => <Candlestick candles={D.candles} />], ["depth", () => <DepthChart bids={D.bids} asks={D.asks} />], ["control", () => <ControlChart values={D.controlData} />], ["error bars", () => <ErrorBars groups={D.errorGroups} />],
  ["radar", () => <Radar axes={D.radarAxes} series={D.radarSeries} />], ["polar area", () => <PolarArea labels={D.MONTHS} values={D.polarMonths} />], ["parallel", () => <ParallelCoords dims={D.parallelDims} rows={D.parallelRows} groups={D.parallelGroups} />], ["word cloud", () => <WordCloud words={D.words} />],
  ["load curve", () => <LoadCurve load={D.load} bands={D.tariff} />], ["sources", () => <StackedSources sources={D.sources} />], ["battery", () => <BatterySoc netKw={D.batteryNet} />], ["temp/humidity", () => <TempHumidity data={D.weather} band={D.comfort} />], ["wind rose", () => <WindRose samples={D.windSamples} edges={D.windEdges} />], ["sun path", () => <SunPath />],
  ["spectrogram", () => <Spectrogram signal={D.rfSignal} />], ["waterfall", () => <Waterfall signal={D.rfSignal} />], ["constellation", () => <Constellation symbols={D.rxSymbols} />],
  ["budget", () => <BudgetVariance rows={D.budget} />], ["ageing", () => <InvoiceAgeing invoices={D.invoices} asOf={D.AS_OF} />], ["bridge", () => <CashBridge steps={D.bridge} />],
  ["waveform", () => <Waveform samples={D.audio} />], ["histogram", () => <ImageHistogram pixels={D.pixels} />], ["video", () => <VideoMarkers duration={D.videoDuration} markers={D.videoMarkers} />],
  ["contour", () => <ContourPlot field={demoField(24)} />], ["surface", () => <SurfacePlot field={demoField(14)} />], ["pools", () => <PoolLayout disks={D.disks} />], ["smart", () => <SmartTrend attrs={D.smartSeries} labels={D.smartDays} />], ["forecast", () => <CapacityForecast usage={D.usageTb} capacity={D.capacityTb} />],
  ["threshold trend", () => <TrendFig title="Latency" labels={D.demoSeries.map((_, i) => `t${i}`)} values={D.demoSeries} prev={D.demoPrev} bands={D.demoBands} />], ["scale switch", () => <ScaleSwitch />], ["pattern bars", () => <PatternBars />], ["lasso", () => <LassoScatter rows={D.demoRows} />],
];
describe("chart accessibility contract", () => {
  for (const [name, make] of charts) {
    it(`${name}: role img + summary, data table toggle, inspector readout`, () => {
      const { container } = wrap(make()); noCrash();
      const svg = container.querySelector("svg[role=img]"); expect(svg).not.toBeNull(); expect(svg!.getAttribute("aria-label")!.length).toBeGreaterThan(20);
      const slider = container.querySelector<HTMLInputElement>(".p3-inspect input[type=range]:not([disabled])"); expect(slider, "inspector slider").not.toBeNull();
      fireEvent.change(slider!, { target: { value: "1" } }); const ro = container.querySelector(".p3-readout")!; expect(ro.textContent!.length).toBeGreaterThan(5); expect(ro.textContent).not.toMatch(/Hover the chart/); noCrash();
      fireEvent.click(screen.getAllByLabelText("Show data table")[0]); expect(container.querySelector("table")).not.toBeNull(); expect(container.querySelectorAll("tbody tr").length).toBeGreaterThan(0);
    });
  }
});

describe("empty states", () => {
  it("every chart that takes data shows 'No data' for nothing", () => {
    wrap(<>
      <Candlestick candles={[]} /><DepthChart bids={[]} asks={[]} /><ControlChart values={[]} /><ErrorBars groups={[]} /><Radar axes={[]} series={[]} /><PolarArea labels={[]} values={[]} /><ParallelCoords dims={[]} rows={[]} groups={[]} /><WordCloud words={[]} />
      <LoadCurve load={[]} bands={[]} /><StackedSources sources={[]} /><BatterySoc netKw={[]} /><TempHumidity data={[]} band={D.comfort} /><WindRose samples={[]} edges={D.windEdges} />
      <Spectrogram signal={[]} /><Waterfall signal={[]} /><Constellation symbols={[]} /><BudgetVariance rows={[]} /><InvoiceAgeing invoices={[]} asOf={1} /><CashBridge steps={[]} />
      <Waveform samples={[]} /><ImageHistogram pixels={[]} /><VideoMarkers duration={10} markers={[]} /><ContourPlot field={[]} /><SurfacePlot field={[]} /><PoolLayout disks={[]} /><SmartTrend attrs={[]} labels={[]} /><CapacityForecast usage={[]} capacity={10} />
    </>);
    expect(screen.getAllByText("No data").length).toBe(27); noCrash();
  });
  it("tag cloud and ascii preview say so", () => { wrap(<><TagCloud words={[]} /><AsciiPreview values={[]} /></>); expect(screen.getAllByText(/No data/).length).toBe(2); });
  it("single-point and flat data do not produce NaN", () => {
    wrap(<><ControlChart values={[5]} /><TrendFig title="x" labels={["a"]} values={[1]} /><Candlestick candles={[{ t: "a", o: 5, h: 5, l: 5, c: 5 }]} /><BudgetVariance rows={[{ label: "a", budget: 0, actual: 0, kind: "cost" }]} /><WordCloud words={[{ text: "solo", weight: 3 }]} /></>); noCrash();
  });
});

describe("interactions", () => {
  it("candlestick: OHLC mode swaps the glyphs; up candles are hollow, down are solid", () => {
    const { container } = wrap(<Candlestick candles={D.candles} />); const rects = () => container.querySelectorAll("g[data-up] rect").length;
    const up = container.querySelectorAll('g[data-up="true"] rect:not(.p3-hi)'); expect(up.length).toBeGreaterThan(0); expect(up[0].getAttribute("fill")).toBe("var(--jp-surface-raised)");
    const dn = container.querySelector('g[data-up="false"] rect')!; expect(dn.getAttribute("fill")).toMatch(/--adm-c/);
    expect(rects()).toBeGreaterThan(0); fireEvent.click(screen.getByRole("button", { name: "OHLC bars" })); expect(container.querySelectorAll("g[data-up] rect:not(.p3-hi)").length).toBe(0);
  });
  it("control chart: signals are marked and the summary states the limits", () => {
    const { container } = wrap(<ControlChart values={D.controlData} baseline={26} />); expect(container.querySelector("svg[role=img]")!.getAttribute("aria-label")).toMatch(/control limits .* to .* \(mean ± 3 sigma\); [1-9]\d* signals?/);
  });
  it("tag cloud: select filters and announces; press again clears", () => {
    let picked: string | null = "x"; wrap(<TagCloud words={D.words.slice(0, 8)} onPick={(t) => (picked = t)} />);
    const b = screen.getByRole("button", { name: /^dashboard,/ }); fireEvent.click(b); expect(picked).toBe("dashboard"); expect(b).toHaveAttribute("aria-pressed", "true"); expect(screen.getByText(/Filtering by dashboard/)).toBeInTheDocument(); fireEvent.click(b); expect(picked).toBeNull();
  });
  it("contour: more levels give more table rows", () => {
    const { container } = wrap(<ContourPlot field={demoField(30)} />); fireEvent.click(screen.getByLabelText("Show data table")); const n8 = container.querySelectorAll("tbody tr").length; fireEvent.click(screen.getByLabelText("Show chart")); fireEvent.click(screen.getByRole("button", { name: "12" })); fireEvent.click(screen.getByLabelText("Show data table")); expect(container.querySelectorAll("tbody tr").length).toBeGreaterThan(n8);
  });
  it("pool layout: RAID 6 leaves less usable space than RAID 5", () => {
    wrap(<PoolLayout disks={D.disks} />); const sum = () => screen.getByRole("img").getAttribute("aria-label")!; expect(sum()).toMatch(/tank 4 disks, 36 of 48/); fireEvent.click(screen.getByRole("button", { name: "RAID 6" })); expect(sum()).toMatch(/tank 4 disks, 24 of 48/);
  });
  it("capacity forecast states days to full from the trend", () => { wrap(<CapacityForecast usage={Array.from({ length: 10 }, (_, i) => 10 + 2 * i)} capacity={50} />); expect(screen.getByRole("img").getAttribute("aria-label")).toMatch(/growing 2.00 TB per day; full in about 11 days/); });
  it("synced charts share the crosshair and the zoom window through their group id", () => {
    const { container } = wrap(<SyncedCharts labels={D.demoSeries.map((_, i) => `t${i}`)} a={D.demoSeries} b={D.demoPrev} group="t-sync" />);
    fireEvent.change(screen.getByLabelText("Inspect Throughput"), { target: { value: "5" } });
    const ro = [...container.querySelectorAll(".p3-readout")].map((e) => e.textContent); expect(ro[0]).toMatch(/^t5:/); expect(ro[1]).toMatch(/^t5:/);
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" })); for (const svg of container.querySelectorAll("svg[role=img]")) expect(svg.getAttribute("aria-label")).toMatch(/31 of 60 points/);
    expect(screen.getAllByRole("button", { name: "Zoom in" }).length).toBe(1);
  });
  it("drag on the plot zooms to the dragged range; double-click resets", () => {
    const { container } = wrap(<TrendFig title="Drag" labels={D.demoSeries.map((_, i) => `t${i}`)} values={D.demoSeries} />);
    const rect = container.querySelector("svg[role=img] rect[fill=transparent]")!, x0 = +rect.getAttribute("x")!, wd = +rect.getAttribute("width")!, at = (f: number) => x0 + f * wd;
    fireEvent.pointerDown(rect, { clientX: at(0.25), clientY: 50, pointerId: 1 }); fireEvent.pointerMove(rect, { clientX: at(0.75), clientY: 50, pointerId: 1 }); expect(container.querySelector(".p3-brush")).not.toBeNull(); fireEvent.pointerUp(rect, { clientX: at(0.75), clientY: 50, pointerId: 1 });
    expect(container.querySelector("svg[role=img]")!.getAttribute("aria-label")).toMatch(/: 3\d of 60 points from t1\d to t4\d/); expect(container.querySelector("svg[role=img] .p3-brush")).toBeNull();
    fireEvent.doubleClick(container.querySelector("svg[role=img] rect[fill=transparent]")!); expect(container.querySelector("svg[role=img]")!.getAttribute("aria-label")).toMatch(/60 of 60 points/);
  });
  it("a click without a drag does not zoom", () => {
    const { container } = wrap(<TrendFig title="Click" labels={D.demoSeries.map((_, i) => `t${i}`)} values={D.demoSeries} />); const rect = container.querySelector("svg[role=img] rect[fill=transparent]")!, x = +rect.getAttribute("x")! + 50;
    fireEvent.pointerDown(rect, { clientX: x, pointerId: 1 }); fireEvent.pointerUp(rect, { clientX: x, pointerId: 1 }); expect(container.querySelector("svg[role=img]")!.getAttribute("aria-label")).toMatch(/60 of 60 points/);
  });
  it("keyboard zoom: plus and minus, arrows pan, Home and End, Escape resets; the range control agrees", () => {
    const { container } = wrap(<TrendFig title="Keys" labels={D.demoSeries.map((_, i) => `t${i}`)} values={D.demoSeries} />); const frame = screen.getByRole("group", { name: /^Keys\. Plus and minus zoom/ }), say = () => container.querySelector("svg[role=img]")!.getAttribute("aria-label")!;
    fireEvent.keyDown(frame, { key: "+" }); expect(say()).toMatch(/31 of 60 points/); fireEvent.keyDown(frame, { key: "ArrowRight" }); expect(say()).toMatch(/from t18 to t48/); fireEvent.keyDown(frame, { key: "End" }); expect(say()).toMatch(/from t29 to t59/);
    expect((screen.getByLabelText("Keys: visible range start") as HTMLInputElement).value).toBe("29"); fireEvent.keyDown(frame, { key: "Home" }); expect(say()).toMatch(/from t0 to t30/); fireEvent.keyDown(frame, { key: "-" }); expect(say()).toMatch(/46 of 60/);
    fireEvent.keyDown(frame, { key: "+" }); fireEvent.keyDown(frame, { key: "Escape" }); expect(say()).toMatch(/60 of 60/);
  });
  it("range control: start and end sliders and the reset button", () => {
    const { container } = wrap(<TrendFig title="Range" labels={D.demoSeries.map((_, i) => `t${i}`)} values={D.demoSeries} />); const say = () => container.querySelector("svg[role=img]")!.getAttribute("aria-label")!;
    fireEvent.change(screen.getByLabelText("Range: visible range start"), { target: { value: "10" } }); fireEvent.change(screen.getByLabelText("Range: visible range end"), { target: { value: "19" } }); expect(say()).toMatch(/10 of 60 points from t10 to t19/);
    fireEvent.click(screen.getByRole("button", { name: "Reset zoom" })); expect(say()).toMatch(/60 of 60/);
  });
  it("lasso on a line chart: keyboard polygon selects points and reports them", () => {
    const { container } = wrap(<TrendFig title="Lasso" labels={D.demoSeries.map((_, i) => `t${i}`)} values={D.demoSeries} />); fireEvent.click(screen.getByRole("button", { name: "Lasso" }));
    const frame = screen.getByRole("group", { name: /^Lasso\. Lasso mode/ }), key = (k: string, n = 1, shift = false) => { for (let i = 0; i < n; i++) fireEvent.keyDown(frame, { key: k, shiftKey: shift }); };
    key("ArrowLeft", 8, true); key(" "); key("ArrowRight", 16, true); key(" "); key("ArrowDown", 6, true); key(" "); key("ArrowLeft", 16, true); key(" "); key("Enter");
    expect(container.querySelector(".p3-stats")?.textContent).toMatch(/Lasso: \d+ in view of [1-9]\d* selected/); fireEvent.click(screen.getByRole("button", { name: "Clear lasso" })); expect(container.querySelector(".p3-stats")?.textContent ?? "").not.toMatch(/Lasso:/);
  });
  it("lasso scatter: pointer polygon selects the points inside; Escape cancels a keyboard lasso", () => {
    const { container } = wrap(<LassoScatter rows={D.demoRows} />); const rect = container.querySelector("svg[role=img] rect[fill=transparent]")!, x0 = +rect.getAttribute("x")!, y0 = +rect.getAttribute("y")!, w = +rect.getAttribute("width")!, h = +rect.getAttribute("height")!;
    const ev = (t: "pointerDown" | "pointerMove" | "pointerUp", fx: number, fy: number) => fireEvent[t](rect, { clientX: x0 + fx * w, clientY: y0 + fy * h, pointerId: 1, buttons: t === "pointerUp" ? 0 : 1 });
    ev("pointerDown", 0.5, 0); ev("pointerMove", 1, 0); ev("pointerMove", 1, 0.5); ev("pointerMove", 0.5, 0.5); ev("pointerUp", 0.5, 0.5);
    const exp = D.demoRows.filter((r) => r.x >= 50 && r.y >= 50).length; expect(exp).toBeGreaterThan(5);
    const n = Number(/(\d+) selected/.exec(screen.getByRole("img").getAttribute("aria-label")!)![1]); expect(n).toBeGreaterThan(Math.floor(exp * 0.8)); expect(n).toBeLessThanOrEqual(exp + 2);
    fireEvent.click(screen.getByRole("button", { name: "Clear lasso" })); expect(screen.getByRole("img").getAttribute("aria-label")).toContain("0 selected");
    const frame = screen.getByRole("group", { name: /^Orders: size vs value\. Lasso mode/ }); fireEvent.keyDown(frame, { key: " " }); fireEvent.keyDown(frame, { key: "Escape" }); expect(container.querySelector("svg[role=img] path.p3-brush")).toBeNull();
  });
  it("scale toggles: log axis, then percent change (log is offered only for absolute values)", () => {
    wrap(<TrendFig title="Scales" labels={D.demoSeries.map((_, i) => `t${i}`)} values={D.demoSeries} prev={D.demoPrev} unit=" ms" />); const say = () => screen.getAllByRole("img")[0].getAttribute("aria-label")!;
    fireEvent.click(screen.getByRole("button", { name: "Log" })); expect(say()).toMatch(/log axis/); fireEvent.click(screen.getByRole("button", { name: "Percent change" })); expect(say()).toMatch(/range -?[\d.]+ to [\d.]+%;/); expect(say()).not.toMatch(/log axis/); expect(screen.queryByRole("button", { name: "Log" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Absolute" })); expect(say()).toMatch(/ms/);
  });
  it("freshness inside the chart: meta shows the stamp and the query inspector", () => {
    wrap(<TrendFig title="Meta" labels={["a", "b", "c"]} values={[1, 2, 3]} meta={{ updated: new Date(Date.UTC(2026, 10, 12, 14, 28)), now: new Date(Date.UTC(2026, 10, 12, 14, 35)), query: "SELECT 2", rows: 3, ms: 9 }} />);
    expect(screen.getByText("Stale")).toBeInTheDocument(); fireEvent.click(screen.getByRole("button", { name: "Inspect query" })); expect(screen.getByText("SELECT 2")).toBeInTheDocument();
  });
  it("ControlChart and TempHumidity carry the same hook: zoom narrows the summary and the table", () => {
    const { container } = wrap(<ControlChart values={D.controlData} baseline={26} />); fireEvent.click(screen.getByRole("button", { name: "Zoom in" })); expect(container.querySelector("svg[role=img]")!.getAttribute("aria-label")).toContain(`${Math.round((D.controlData.length - 1) / 2) + 1} of ${D.controlData.length} samples shown`);
    cleanup(); const r = wrap(<TempHumidity data={D.weather} band={D.comfort} />); fireEvent.click(screen.getByRole("button", { name: "Zoom in" })); expect(r.container.querySelector("svg[role=img]")!.getAttribute("aria-label")).toContain(`${Math.round((D.weather.length - 1) / 2) + 1} readings`);
  });
  it("cross filter: choosing a region narrows the product chart and the count", () => {
    wrap(<CrossFilter rows={D.demoRows} />); expect(screen.getByText(/120 of 120 orders/)).toBeInTheDocument(); fireEvent.click(screen.getByRole("button", { name: "EMEA" }));
    expect(screen.getAllByRole("img").some((i) => i.getAttribute("aria-label")?.startsWith("Amount by product in EMEA"))).toBe(true); expect(screen.queryByText(/120 of 120/)).not.toBeInTheDocument(); fireEvent.click(screen.getByRole("button", { name: "Clear filters" })); expect(screen.getByText(/120 of 120 orders/)).toBeInTheDocument();
  });
  it("scale switch: log axis and percent stacking change the summary", () => {
    wrap(<ScaleSwitch />); fireEvent.click(screen.getByRole("button", { name: "Log" })); expect(screen.getByRole("img").getAttribute("aria-label")).toMatch(/log axis/);
    fireEvent.click(screen.getByRole("button", { name: "Stacked" })); fireEvent.click(screen.getByRole("button", { name: "Percent" })); expect(screen.getByRole("img").getAttribute("aria-label")).toMatch(/percent of the monthly total/);
  });
  it("freshness: stale badge after 5 minutes, query inspector opens, refresh is wired", () => {
    let n = 0; wrap(<FreshnessBar updated={new Date(Date.UTC(2026, 10, 12, 14, 28))} now={new Date(Date.UTC(2026, 10, 12, 14, 35))} query="SELECT 1" rows={3} ms={12} onRefresh={() => n++} />);
    expect(screen.getByText("Stale")).toBeInTheDocument(); expect(screen.getByText(/7 min ago/)).toBeInTheDocument(); fireEvent.click(screen.getByRole("button", { name: "Inspect query" })); expect(within(screen.getByRole("region", { name: "Query inspector" })).getByText("SELECT 1")).toBeInTheDocument(); fireEvent.click(screen.getByRole("button", { name: "Refresh" })); expect(n).toBe(1);
  });
  it("pattern bars: print mode uses SVG patterns and colour-only mode does not", () => {
    const { container } = wrap(<PatternBars />); expect(container.querySelectorAll("pattern").length).toBe(6); expect(container.querySelector('rect[fill^="url(#"]')).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Colour only" })); expect(container.querySelector('rect[fill^="url(#"]')).toBeNull();
  });
  it("ASCII preview renders known input as blocks and switches style", () => {
    const { container } = wrap(<AsciiPreview values={[0, 1, 2, 3, 4, 5, 6, 7]} />); expect(container.querySelector("pre")!.textContent!.split("\n")).toHaveLength(6); fireEvent.click(screen.getByRole("button", { name: "Sparkline" })); expect(container.querySelector("pre")!.textContent).toMatch(/^[▁-█]+$/);
  });
  it("budget variance labels favourable and adverse in text, not colour alone", () => {
    wrap(<BudgetVariance rows={D.budget} />); fireEvent.click(screen.getByLabelText("Show data table")); expect(screen.getAllByText("favourable").length).toBeGreaterThan(0); expect(screen.getAllByText("adverse").length).toBeGreaterThan(0);
  });
});
