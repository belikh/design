import { useState, type ReactNode } from "react";
import { PageHeader, Panel, Alert } from "@belikh/jupiter-ui/kit.tsx";
import { LineChart } from "@belikh/jupiter-ui/Charts.tsx";
import { Segmented } from "@belikh/jupiter-ui/inputs.tsx";
import * as D from "./data.ts";
import { ChartFrame, type FrameState } from "./frame.tsx";
import { ComboChart, DotPlot, Dumbbell, FloatingRange, Lollipop, SlopeChart, SmallMultiples, TableChart, type TableMode } from "./trend.tsx";
import { LatencyHeatmap, PercentileChart, ScatterMatrix, ScatterPlus, type ScatterMode } from "./distribution.tsx";
import { CooccurrenceMatrix, SegmentedBar, TopN } from "./composition.tsx";
import { BarInBar, BarRace, BudgetChart, BurnDown, BurnUp, ComparisonTiles, CumulativeFlow, KpiTable, Leaderboard, LiveCounters, NinesTable, RedPanel, SloBurn, UsePanel } from "./progress.tsx";
import { Flowchart, GraphView, SequenceDiagram, StateMachine } from "./graphs.tsx";
import { CoreHeat, DropOff, EventRiver, Gantt, JourneyPaths, LogVolume, ProcessTreemap, ResourceSchedule, StateTimeline, StepDurations, ThreadTimeline } from "./timelines.tsx";
import { BubbleMap, ClusterMap, FlowMap, FloorPlan, HeatLayer, RackDiagram, TileChoropleth } from "./maps.tsx";

const P = ({ children, title, id }: { children: ReactNode; title: string; id?: string }) => <Panel title={title} id={id}>{children}</Panel>;
const G = ({ children, cols = 2 }: { children: ReactNode; cols?: 1 | 2 | 3 }) => <div className={`adm-grid adm-grid--${cols}`} style={{ marginTop: 16 }}>{children}</div>;
const Ids = ({ ids }: { ids: string }) => <span className="jp-muted" style={{ fontFamily: "var(--jp-font-mono)", fontSize: "var(--jp-fs-xs)" }}>{ids}</span>;
const crumbs = (s: string) => ["Charts", s];

export function TrendPage() {
  const [mode, setMode] = useState<TableMode>("heat");
  return (
    <>
      <PageHeader title="Comparison and trend" crumbs={crumbs("Trend")} desc="Lollipop, dot plot, dumbbell, slope, combo, small multiples, floating ranges and charts-as-tables. Every chart has a data-table view and export." />
      <G><P title="Lollipop (vertical) · D004"><Lollipop title="Sales by city" items={D.regionsSales} unit="k" /></P><P title="Lollipop (horizontal)"><Lollipop title="Sales by city (horizontal)" horizontal items={D.regionsSales} unit="k" /></P></G>
      <G><P title="Dot plot, three series · D004"><DotPlot title="Satisfaction by area" rows={D.csat} series={["2024", "2025", "2026"]} /></P><P title="Dumbbell, before and after · D004"><Dumbbell title="Latency change (ms)" items={D.latencyChange} aName="Q3" bName="Q4" /></P></G>
      <G><P title="Slope chart · D004"><SlopeChart title="Team score, Q1 to Q4" items={D.teams} aLabel="Q1" bLabel="Q4" /></P><P title="Combo: bars + lines, dual axis · D005"><ComboChart title="Revenue, orders and margin" labels={D.MONTHS} bars={[{ name: "Revenue ($k)", data: D.comboRevenue }]} lines={[{ name: "Orders (k)", data: D.comboOrders.map((v) => v * 100), axis: 1 }, { name: "Margin (%)", data: D.comboMargin, axis: 2 }]} fmt2={(v) => `${v}%`} /></P></G>
      <G cols={1}><P title="Small multiples · D007"><SmallMultiples title="CPU by host" labels={Array.from({ length: 24 }, (_, i) => `${i}:00`)} panels={D.hosts} fmt={(v) => `${Math.round(v)}%`} /></P></G>
      <G><P title="Floating range bars · D011"><FloatingRange title="Temperature range by month" items={D.tempRanges} band={{ lo: 18, hi: 24, label: "comfort" }} unit="°C" /></P>
        <P title="Table as chart · D012"><div className="pc-tabs"><Segmented label="Table mode" value={mode} onChange={setMode} options={[{ value: "heat", label: "Heat" }, { value: "bar", label: "Bars" }, { value: "dot", label: "Dots" }, { value: "rank", label: "Rank change" }]} /></div><TableChart title={`Product sales by quarter`} mode={mode} rows={D.products} columns={["Q1", "Q2", "Q3", "Q4"]} prev={D.productsPrev} /></P></G>
      <p className="pc-note"><Ids ids="D004 D005 D007 D011 D012" /></p>
    </>
  );
}

export function DistributionPage() {
  const [mode, setMode] = useState<ScatterMode>("scatter");
  return (
    <>
      <PageHeader title="Distribution" crumbs={crumbs("Distribution")} desc="Scatter with regression, bubbles, hex-binning, a scatter matrix, percentile latency and a latency-bucket heatmap." />
      <G><P title="Scatter · bubble · hexbin · D014"><div className="pc-tabs"><Segmented label="Mode" value={mode} onChange={setMode} options={[{ value: "scatter", label: "Scatter" }, { value: "bubble", label: "Bubble" }, { value: "hexbin", label: "Hexbin" }]} /></div><ScatterPlus title="Spend vs revenue" points={D.scatterPts} mode={mode} xLabel="ad spend" yLabel="revenue" /></P>
        <P title="Scatter matrix · D014"><ScatterMatrix vars={D.matrixVars} /></P></G>
      <G cols={1}><P title="Percentile latency · D016"><PercentileChart labels={D.HOURS} samples={D.latencySamples} slo={400} title="Latency percentiles (24 h)" /></P><P title="Latency bucket heatmap over time · D017"><LatencyHeatmap labels={D.HOURS} samples={D.latencySamples} /></P></G>
      <p className="pc-note"><Ids ids="D014 D016 D017" /></p>
    </>
  );
}

export function CompositionPage() {
  return (
    <>
      <PageHeader title="Composition and ranking" crumbs={crumbs("Composition")} desc="Stacked and segmented progress, top-N with Other, co-occurrence, leaderboards and a bar chart race." />
      <G><P title="Stacked progress · D023"><SegmentedBar title="Disk usage (GB)" segments={D.storageSegs} total={500} unit=" GB" /></P><P title="Segmented blocks, over capacity · D023"><SegmentedBar title="Quota (units)" mode="blocks" segments={D.overSegs} total={100} /></P></G>
      <G><P title="Top N with Other · D029"><TopN title="Tag frequency" items={D.topItems} defaultN={8} /></P><P title="Co-occurrence matrix · D029"><CooccurrenceMatrix title="Tags used together" labels={D.coLabels} sets={D.coSets} /></P></G>
      <G><P title="Leaderboard · D034"><Leaderboard title="Top sales reps" rows={D.reps} prev={D.repsPrev} unit="k" /></P><P title="Bar chart race · D034"><BarRace title="Monthly orders by city" series={D.raceSeries} labels={D.raceLabels} /></P></G>
      <p className="pc-note"><Ids ids="D023 D029 D034" /></p>
    </>
  );
}

export function DeliveryPage() {
  return (
    <>
      <PageHeader title="Delivery, SLOs and live metrics" crumbs={crumbs("Delivery")} desc="Targets, burn-down and burn-up, cumulative flow, RED and USE panels, SLO burn rate, the nines table, KPI tables, comparison tiles and live counters." />
      <G><P title="Actual vs target (bar-in-bar) · D035"><BarInBar title="Attainment" items={D.kpiBars} /></P><P title="Burn-down · D035"><BurnDown title="Sprint burn-down" total={60} done={D.sprintDone} labels={D.sprintDays} /></P></G>
      <G><P title="Burn-up with forecast · D035"><BurnUp title="Scope vs done" scope={D.scopeSteps} done={D.sprintDone} labels={D.sprintDays} /></P><P title="Cumulative flow · D035"><CumulativeFlow title="Cumulative flow" labels={D.cfdLabels} daily={D.cfdDaily} stages={D.cfdStages} /></P></G>
      <G cols={1}><P title="RED panel · D036"><RedPanel rows={D.redRows} /></P><P title="USE panel · D036"><UsePanel rows={D.useRows} /></P></G>
      <G cols={1}><P title="SLO burn rate (99.9%, 15-minute data) · D037"><SloBurn title="Burn rate (log scale)" errors={D.sloErrors} total={D.sloTotal} labels={D.sloLabels} slo={D.SLO} intervalMin={D.SLO_STEP} /></P></G>
      <G><P title="Error budget remaining · D037"><BudgetChart errors={D.budgetDaily} periodTotal={900000} labels={D.budgetLabels} slo={D.SLO} /></P><P title="Availability nines · D037"><NinesTable target={99.9} observed={99.94} /></P></G>
      <G cols={1}><P title="KPI table · D038"><KpiTable rows={D.kpiRows} /></P><P title="Comparison tiles and percentile rank · D039"><ComparisonTiles tiles={D.tiles} /></P><P title="Live counter, countdown, world clocks, rate meter · D040"><LiveCounters countdownTo={Date.now() + 3 * 86400000 + 4 * 3600000} ratePerSec={42} zones={[{ label: "Brisbane", tz: "Australia/Brisbane" }, { label: "Perth", tz: "Australia/Perth" }, { label: "London", tz: "Europe/London" }, { label: "Tokyo", tz: "Asia/Tokyo" }, { label: "New York", tz: "America/New_York" }]} /></P></G>
      <p className="pc-note"><Ids ids="D035 D036 D037 D038 D039 D040" /></p>
    </>
  );
}

export function GraphsPage() {
  return (
    <>
      <PageHeader title="Graphs and diagrams" crumbs={crumbs("Graphs")} desc="Force-directed network, layered topology with traffic and health overlays, a dependency graph, flowchart, state machine and sequence diagram." />
      <G><P title="Network graph (force) · D042"><GraphView title="Home network" layout="force" nodes={D.netNodes} edges={D.netEdges} /></P><P title="Dependency graph (directed) · D042"><GraphView title="Service dependencies" layout="layered" directed nodes={D.depNodes} edges={D.depEdges} height={320} health /></P></G>
      <G cols={1}><P title="Topology with traffic-weighted edges, health colours and path trace · D042 D046"><GraphView title="Topology" layout="layered" directed traffic health nodes={D.topoNodes} edges={D.topoEdges} /></P></G>
      <G><P title="Flowchart · D044"><Flowchart title="Order flow" nodes={D.flowNodes} edges={D.flowEdges} /></P><P title="State machine (try the events) · D044"><StateMachine title="Order lifecycle" states={D.fsmStates} transitions={D.fsmTransitions} initial="cart" /></P></G>
      <G cols={1}><P title="Sequence diagram · D044"><SequenceDiagram title="Authenticated page load" participants={D.seqParticipants} messages={D.seqMessages} /></P></G>
      <p className="pc-note"><Ids ids="D042 D044 D046" /></p>
    </>
  );
}

export function TimelinesPage() {
  return (
    <>
      <PageHeader title="Timelines and flow over time" crumbs={crumbs("Timelines")} desc="Gantt, swimlanes, resource schedules with conflicts, event river, state strips, log volume, CPU and thread timelines, step durations, drop-off and journey paths." />
      <G cols={1}><P title="Gantt with dependencies · D048"><Gantt title="Release plan" tasks={D.ganttTasks} baseDate={D.BASE_DATE} today={10} /></P><P title="Swimlane timeline · D048"><Gantt title="Release plan by team" mode="swimlane" tasks={D.ganttTasks} baseDate={D.BASE_DATE} today={10} /></P></G>
      <G><P title="Resource schedule with conflicts · D048"><ResourceSchedule resources={D.rooms2} bookings={D.bookings} /></P><P title="Event river · D048"><EventRiver title="Events by type" labels={D.HOURS} categories={D.riverCats} /></P></G>
      <G cols={1}><P title="State timeline, event strip, annotation lane · D051"><StateTimeline title="Service states today" entities={D.strips} events={D.stripEvents} annotations={D.stripNotes} domain={[0, 1440]} /></P><P title="Log volume by level and message patterns · D052"><LogVolume lines={D.logLines} /></P></G>
      <G><P title="CPU core heat strip · D053"><CoreHeat data={D.coreData} labels={D.coreLabels} /></P><P title="Per-process treemap · D053"><ProcessTreemap processes={D.processes} /></P></G>
      <G cols={1}><P title="Thread timeline · D053"><ThreadTimeline threads={D.threads} /></P></G>
      <G><P title="Step durations · D055"><StepDurations steps={D.stepSamples} unit=" s" /></P><P title="Drop-off and reasons · D055"><DropOff steps={D.dropSteps} reasons={D.dropReasons} /></P></G>
      <G cols={1}><P title="Journey paths (Sankey) · D055"><JourneyPaths paths={D.journeyPaths} /></P></G>
      <p className="pc-note"><Ids ids="D048 D051 D052 D053 D055" /></p>
    </>
  );
}

export function MapsPage() {
  return (
    <>
      <PageHeader title="Maps and spatial charts" crumbs={crumbs("Maps")} desc="A tile choropleth, bubble map, zoomable marker clusters, flow lines, heat layer, floor plan and rack diagram. Geography is a coarse schematic outline." />
      <Alert s="info" title="Schematic geography">The coastline is a coarse hand-drawn outline, accurate to roughly 50 km. It is for visual context, not navigation or measurement.</Alert>
      <G><P title="Choropleth (tile cartogram) · D056"><TileChoropleth title="Sites by state" values={D.stateValues} unit=" sites" /></P><P title="Bubble map · D056"><BubbleMap title="Population" /></P></G>
      <G><P title="Marker clusters with zoom and pan · D056"><ClusterMap title="Field devices" points={D.devices} /></P><P title="Route and flow lines · D056"><FlowMap title="Freight between cities" flows={D.flows} unit="pallets/day" /></P></G>
      <G><P title="Heat layer · D056"><HeatLayer title="Device density" points={D.devices} /></P><P title="Floor plan / room map · D056"><FloorPlan title="House" rooms={D.rooms} /></P></G>
      <G cols={1}><P title="Rack diagram · D056"><RackDiagram title="Comms rack" devices={D.rack} /></P></G>
      <p className="pc-note"><Ids ids="D056" /></p>
    </>
  );
}

export function FurniturePage() {
  const [st, setSt] = useState<FrameState>("ready");
  return (
    <>
      <PageHeader title="Chart furniture" crumbs={crumbs("Furniture")} desc="What every P2 chart gets: export (SVG, PNG, CSV), an accessible data-table view, fullscreen, and loading / empty / error states." />
      <div className="adm-row" style={{ margin: "8px 0 16px" }}><span className="jp-muted">Preview state</span><Segmented label="Chart state" value={st} onChange={setSt} options={[{ value: "ready", label: "Ready" }, { value: "loading", label: "Loading" }, { value: "empty", label: "Empty" }, { value: "error", label: "Error" }]} /></div>
      <G><P title="Same chart, any state · D073"><Lollipop title="Sales by city" items={D.regionsSales} unit="k" state={st} /></P>
        <P title="Frame with a custom body · D073"><ChartFrame title="Custom frame" state={st} height={160} table={{ head: ["Step", "Value"], rows: [["one", 1], ["two", 2], ["three", 3]] }}>{(w) => <svg viewBox={`0 0 ${w} 140`} style={{ width: "100%", height: 140 }} role="img" aria-label="Three bars">{[1, 2, 3].map((v) => <rect key={v} x={20 + (v - 1) * 70} y={130 - v * 36} width="50" height={v * 36} fill="var(--jp-accent)" rx="4" />)}</svg>}</ChartFrame></P></G>
      <G cols={1}><P title="Threshold lines on a line chart · D073"><LineChart title="Latency vs SLO" labels={D.HOURS} height={220} series={[{ name: "p95 latency", data: D.latencySamples.map((b) => Math.round(b.slice().sort((a, c) => a - c)[Math.floor(b.length * 0.95)])) }]} thresholds={[{ value: 300, label: "SLO 300 ms" }]} anomalies /></P></G>
      <Alert s="info" title="How export works">SVG and PNG exports inline the resolved theme colours so the file looks right outside the app. CSV and the table view come from the same data, so what you see is what you can audit.</Alert>
      <p className="pc-note"><Ids ids="D073" /></p>
    </>
  );
}
