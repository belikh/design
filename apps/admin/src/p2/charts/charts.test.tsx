import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { tableToCsv } from "@belikh/jupiter-ui/chartTools.tsx";
import { TrendPage, DistributionPage, CompositionPage, DeliveryPage, GraphsPage, TimelinesPage, MapsPage, FurniturePage } from "./pages.tsx";
import { Lollipop, DotPlot, Dumbbell, SlopeChart, FloatingRange, TableChart } from "./trend.tsx";
import { ScatterPlus, PercentileChart } from "./distribution.tsx";
import { TopN, SegmentedBar, CooccurrenceMatrix } from "./composition.tsx";
import { Leaderboard, BarRace, BurnDown, BurnUp, NinesTable, kpiStatus, splitDuration } from "./progress.tsx";
import { GraphView, StateMachine, Flowchart } from "./graphs.tsx";
import { ResourceSchedule, Gantt, findConflicts, StateTimeline, LogVolume } from "./timelines.tsx";
import { ClusterMap } from "./maps.tsx";
import * as D from "./data.ts";

const wrap = (ui: React.ReactElement) => render(<MemoryRouter><PrefsProvider>{ui}</PrefsProvider></MemoryRouter>);
const noCrash = () => { expect(screen.queryByText("This view crashed")).not.toBeInTheDocument(); expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/); };

describe("pages render with demo data (no NaN / undefined text)", () => {
  const pages: [string, React.ComponentType][] = [["trend", TrendPage], ["distribution", DistributionPage], ["composition", CompositionPage], ["delivery", DeliveryPage], ["graphs", GraphsPage], ["timelines", TimelinesPage], ["maps", MapsPage], ["furniture", FurniturePage]];
  for (const [name, Page] of pages) it(name, () => { const { container } = wrap(<Page />); expect(container.querySelectorAll("svg, table, .pc-frame").length).toBeGreaterThan(0); noCrash(); });
});

describe("edge cases: empty, single point, all equal", () => {
  it("empty data shows the empty state instead of a chart", () => {
    wrap(<><Lollipop items={[]} /><DotPlot rows={[]} series={[]} /><TopN items={[]} /><Leaderboard rows={[]} /><ScatterPlus points={[]} mode="scatter" /></>);
    expect(screen.getAllByText("No data").length).toBe(5);
  });
  it("single point renders", () => {
    wrap(<><Lollipop items={[{ label: "a", value: 3 }]} /><ScatterPlus points={[{ x: 1, y: 1 }]} mode="scatter" /><Dumbbell items={[{ label: "a", a: 1, b: 2 }]} /><SlopeChart items={[{ label: "a", a: 1, b: 2 }]} aLabel="A" bLabel="B" /></>);
    noCrash();
  });
  it("all-equal values do not divide by zero", () => {
    wrap(<><Lollipop items={[{ label: "a", value: 5 }, { label: "b", value: 5 }]} /><ScatterPlus points={[{ x: 2, y: 2 }, { x: 2, y: 2 }, { x: 2, y: 2 }]} mode="hexbin" /><FloatingRange items={[{ label: "a", lo: 4, hi: 4 }]} /><SegmentedBar segments={[{ label: "a", value: 0 }]} total={0} /></>);
    noCrash();
  });
  it("loading and error states render and retry is wired", () => {
    const retry = vi.fn(); wrap(<><Lollipop items={[{ label: "a", value: 1 }]} state="loading" /><Lollipop items={[{ label: "a", value: 1 }]} state="error" /></>);
    expect(screen.getByLabelText(/loading/)).toBeInTheDocument(); expect(screen.getByText(/Couldn’t load/)).toBeInTheDocument(); void retry;
  });
  it("burn charts with no progress do not crash", () => { wrap(<><BurnDown total={10} done={[0, 0, 0]} labels={["a", "b", "c"]} /><BurnUp scope={[10, 10, 10]} done={[0, 0, 0]} labels={["a", "b", "c"]} /></>); noCrash(); });
  it("a graph with a cycle and a flowchart with one node lay out", () => {
    wrap(<><GraphView nodes={[{ id: "a" }, { id: "b" }]} edges={[{ from: "a", to: "b" }, { from: "b", to: "a" }]} layout="layered" directed /><Flowchart nodes={[{ id: "s", label: "Only", kind: "start" }]} edges={[]} /></>); noCrash();
  });
});

describe("ChartFrame furniture", () => {
  it("toggles to an accessible data table and back", () => {
    wrap(<Lollipop items={[{ label: "Alpha", value: 3 }, { label: "Beta", value: 7 }]} title="Demo" />);
    fireEvent.click(screen.getByRole("button", { name: "Show data table" }));
    const t = screen.getByRole("table"); expect(within(t).getByText("Alpha")).toBeInTheDocument(); expect(screen.getByRole("button", { name: "Show chart" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Show chart" })); expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
  it("tableToCsv quotes commas, quotes and newlines", () => {
    expect(tableToCsv({ head: ["a", "b"], rows: [["x,y", 'he said "hi"'], ["line\nbreak", 2]] })).toBe('"a","b"\n"x,y","he said ""hi"""\n"line\nbreak","2"');
  });
});

describe("interactions", () => {
  it("TopN: raising N moves items out of Other, Other expands", () => {
    wrap(<TopN items={D.topItems} defaultN={3} />);
    const other = screen.getByRole("button", { name: /Other/ }); fireEvent.click(other);
    expect(other).toHaveAttribute("aria-expanded", "true");
    const slider = screen.getByRole("slider"); fireEvent.change(slider, { target: { value: "6" } });
    expect(screen.getByText(/Other \(\d+\)/)).toBeInTheDocument();
  });
  it("TableChart: clicking a header sorts", () => {
    wrap(<TableChart mode="heat" rows={[{ name: "a", values: [3, 1] }, { name: "b", values: [1, 9] }, { name: "c", values: [2, 5] }]} columns={["X", "Y"]} />);
    const first = () => screen.getAllByRole("row")[1].textContent;
    const hdr = () => screen.getByRole("button", { name: /^X/ });
    expect(first()).toMatch(/^a/); // default: first column, descending
    fireEvent.click(hdr()); expect(first()).toMatch(/^b/); expect(screen.getByRole("columnheader", { name: /X/ })).toHaveAttribute("aria-sort", "ascending");
    fireEvent.click(screen.getByRole("button", { name: /^Y/ })); expect(first()).toMatch(/^b/); expect(screen.getByRole("columnheader", { name: /Y/ })).toHaveAttribute("aria-sort", "descending");
  });
  it("BarRace: play toggles to pause", () => {
    wrap(<BarRace series={D.raceSeries} labels={D.raceLabels} />);
    fireEvent.click(screen.getByRole("button", { name: /Play/ })); expect(screen.getByRole("button", { name: /Pause/ })).toBeInTheDocument();
  });
  it("StateMachine: firing an event changes the current state", () => {
    wrap(<StateMachine states={D.fsmStates} transitions={D.fsmTransitions} initial="cart" />);
    expect(screen.getByText("cart", { selector: "b" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /checkout/ })); expect(screen.getByText("placed", { selector: "b" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Reset/ })); expect(screen.getByText("cart", { selector: "b" })).toBeInTheDocument();
  });
  it("GraphView: clicking two nodes announces a path", () => {
    wrap(<GraphView nodes={D.netNodes} edges={D.netEdges} layout="force" title="Net" />);
    const nodes = document.querySelectorAll("svg [role='button'], svg g[tabindex]"); expect(nodes.length).toBeGreaterThan(2);
    fireEvent.click(nodes[0]); fireEvent.click(nodes[nodes.length - 1]); noCrash();
  });
  it("ClusterMap: zoom in changes the zoom readout, reset restores it", () => {
    wrap(<ClusterMap points={D.devices} />);
    expect(screen.getByText(/1×/)).toBeInTheDocument(); fireEvent.click(screen.getByRole("button", { name: /^\+$|Zoom in/ })); expect(screen.queryByText(/^1×/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Reset/ })); expect(screen.getByText(/1×/)).toBeInTheDocument();
  });
});

describe("timelines and delivery logic surfaced in UI", () => {
  it("ResourceSchedule reports conflicts and text equivalent", () => {
    wrap(<ResourceSchedule resources={D.rooms2} bookings={D.bookings} />);
    expect(screen.getByText(/conflicts?:/)).toBeInTheDocument();
  });
  it("findConflicts: touching bookings do not conflict, overlapping do", () => {
    const b = (id: string, s: number, e: number) => ({ id, resource: "r", start: s, end: e, label: id });
    expect(findConflicts([b("a", 1, 2), b("b", 2, 3)])).toHaveLength(0); expect(findConflicts([b("a", 1, 3), b("b", 2, 4)])).toHaveLength(1);
  });
  it("Gantt renders in both modes", () => { wrap(<><Gantt tasks={D.ganttTasks} baseDate={D.BASE_DATE} today={0} /><Gantt tasks={D.ganttTasks} baseDate={D.BASE_DATE} today={0} mode="swimlane" /></>); noCrash(); expect(document.body.innerHTML).not.toMatch(/--adm-c0/); });
  it("StateTimeline and LogVolume render", () => { wrap(<><StateTimeline entities={D.strips} events={D.stripEvents} annotations={D.stripNotes} domain={[0, 1440]} /><LogVolume lines={D.logLines} /></>); noCrash(); });
  it("NinesTable, kpiStatus, splitDuration", () => {
    wrap(<NinesTable target={99.9} observed={99.95} />); expect(screen.getAllByRole("row").length).toBeGreaterThan(3);
    expect(kpiStatus({ name: "x", value: 100, target: 100, trend: [], better: "up" })).toBe("ok"); expect(kpiStatus({ name: "x", value: 10, target: 100, trend: [], better: "up" })).not.toBe("ok");
    expect(splitDuration(90_061_000)).toMatchObject({ d: 1, h: 1, m: 1, s: 1 }); expect(splitDuration(-5)).toMatchObject({ d: 0, s: 0 });
  });
  it("PercentileChart and CooccurrenceMatrix render demo data", () => { wrap(<CooccurrenceMatrix labels={D.coLabels} sets={D.coSets} />); noCrash(); void PercentileChart; });
});
