import type { ReactNode } from "react";
import { PageHeader, Panel } from "@belikh/jupiter-ui/kit.tsx";
import * as D from "./data.ts";
import { AreaChart, CyclePlot, FanChart, HorizonChart, MinMaxBand } from "./area.tsx";
import { BoxPlot, DensityChart, EcdfChart, Histogram, QQPlot, Ridgeline, StripChart, ViolinPlot } from "./dist.tsx";
import { Icicle, PackedCircles, Sunburst, TreemapChart } from "./hierCharts.tsx";
import { BumpChart, FunnelChart, MarimekkoChart, ParetoChart, PyramidChart, WaterfallChart } from "./biz.tsx";
import { ClockChart, GaugeCluster, LikertChart, NestedDonut, NpsGauge, Pictogram, RoseChart, UnitChart, WaffleChart } from "./parts.tsx";

const P = ({ children, title, id }: { children: ReactNode; title: string; id: string }) => <Panel title={`${title} · ${id}`} id={`${id.toLowerCase()}-${title.toLowerCase().replace(/\W+/g, "-")}`}>{children}</Panel>;
const G = ({ children, cols = 2 }: { children: ReactNode; cols?: 1 | 2 | 3 }) => <div className={`adm-grid adm-grid--${cols}`} style={{ marginBlockStart: "var(--jp-space-4)" }}>{children}</div>;
const Ids = ({ ids }: { ids: string }) => <p className="p3-note">Entries: <span className="p3-ids">{ids}</span></p>;
const crumbs = (s: string) => ["Charts (more)", s];

export function AreaBandsPage() {
  return (<>
    <PageHeader title="Areas, bands and horizons" crumbs={crumbs("Areas and bands")} desc="Area, stacked, 100% stacked and streamgraph; min-max band and fan chart; horizon chart and cycle plot. Every chart has a data table, export and arrow-key readout." />
    <G><P id="D002" title="Area"><AreaChart title="Traffic, area" mode="area" labels={D.MONTHS} names={D.trafficNames} series={D.traffic} unit="k" /></P><P id="D002" title="Stacked area"><AreaChart title="Traffic, stacked area" mode="stacked" labels={D.MONTHS} names={D.trafficNames} series={D.traffic} unit="k" /></P></G>
    <G><P id="D002" title="100% stacked area"><AreaChart title="Traffic mix, 100% stacked" mode="percent" labels={D.MONTHS} names={D.trafficNames} series={D.traffic} /></P><P id="D002" title="Streamgraph"><AreaChart title="Sessions by channel, streamgraph" mode="stream" labels={D.streamWeeks} names={D.streamNames} series={D.streams} height={280} /></P></G>
    <G><P id="D009" title="Min-max band"><MinMaxBand title="Latency, daily min-max band" labels={D.bandDays} {...D.latencyBand} /></P><P id="D009" title="Fan chart"><FanChart title="Revenue forecast fan" labels={D.forecastLabels} median={D.forecast.median} histLen={D.forecast.histLen} spread={D.forecast.spread} unit="k" /></P></G>
    <G cols={1}><P id="D010" title="Horizon chart"><HorizonChart title="CPU deviation by host, horizon" labels={D.horizonHours.map(String)} names={D.horizonHosts} series={D.horizonSeries} /></P><P id="D010" title="Cycle plot"><CyclePlot title="Monthly sales, cycle plot" values={D.cycleValues} period={12} seasons={D.MONTHS} cycleNames={D.cycleYears} /></P></G>
    <Ids ids="D002 D009 D010" />
  </>);
}

export function DistributionsMorePage() {
  return (<>
    <PageHeader title="Distributions, in depth" crumbs={crumbs("Distributions")} desc="Histogram, density, ridgeline, box, violin and strip / beeswarm; cumulative distribution and QQ plot. Quartiles and densities are computed in tested pure modules." />
    <G><P id="D013" title="Histogram"><Histogram title="Response time, histogram" values={D.groups[0]} /></P><P id="D013" title="Density"><DensityChart title="Response time by endpoint, density" names={D.groupNames.slice(0, 3)} groups={D.groups.slice(0, 3)} /></P></G>
    <G cols={1}><P id="D013" title="Ridgeline"><Ridgeline title="Response time, ridgeline" names={D.groupNames} groups={D.groups} /></P></G>
    <G><P id="D013" title="Box plot"><BoxPlot title="Response time, box plot" names={D.groupNames} groups={D.groups} /></P><P id="D013" title="Violin"><ViolinPlot title="Response time, violin" names={D.groupNames} groups={D.groups} /></P></G>
    <G><P id="D013" title="Strip plot"><StripChart title="Response time, strip" names={D.groupNames} groups={D.strip} /></P><P id="D013" title="Beeswarm"><StripChart title="Response time, strip" swarm names={D.groupNames} groups={D.strip} /></P></G>
    <G><P id="D018" title="Cumulative distribution"><EcdfChart title="Response time, cumulative distribution" names={D.groupNames} groups={D.groups} /></P><P id="D018" title="QQ plot"><QQPlot title="Order value, normal QQ plot" values={D.skewed} /></P></G>
    <Ids ids="D013 D018" />
  </>);
}

export function HierarchyPage() {
  return (<>
    <PageHeader title="Hierarchy" crumbs={crumbs("Hierarchy")} desc="Treemap, sunburst, icicle and packed circles over the same storage tree. Area, angle, width and circle area are all proportional to size." />
    <G><P id="D021" title="Treemap"><TreemapChart title="Storage, treemap" root={D.diskTree} /></P><P id="D021" title="Sunburst"><Sunburst title="Storage, sunburst" root={D.diskTree} /></P></G>
    <G><P id="D021" title="Icicle"><Icicle title="Storage, icicle" root={D.diskTree} /></P><P id="D021" title="Packed circles"><PackedCircles title="Storage, packed circles" root={D.diskTree} /></P></G>
    <Ids ids="D021" />
  </>);
}

export function BusinessFlowPage() {
  return (<>
    <PageHeader title="Business flows and ranks" crumbs={crumbs("Business flows")} desc="Waterfall, Pareto, funnel and population pyramid; bump chart of rank over time and Marimekko." />
    <G><P id="D022" title="Waterfall"><WaterfallChart title="Profit bridge, waterfall" steps={D.profitSteps} /></P><P id="D022" title="Pareto"><ParetoChart title="Defects, Pareto" items={D.defects} /></P></G>
    <G><P id="D022" title="Funnel"><FunnelChart title="Signup, funnel" steps={D.funnelSteps} /></P><P id="D022" title="Pyramid"><PyramidChart title="Population, pyramid" groups={D.ageGroups} left={D.pyramid.left} right={D.pyramid.right} /></P></G>
    <G><P id="D024" title="Bump chart"><BumpChart title="Team score rank, bump chart" labels={D.bumpWeeks} series={D.bumpTeams} /></P><P id="D024" title="Marimekko"><MarimekkoChart title="Revenue by region and product, Marimekko" cols={D.mekko} /></P></G>
    <Ids ids="D022 D024" />
  </>);
}

export function PartsRadialPage() {
  return (<>
    <PageHeader title="Parts, radial and survey charts" crumbs={crumbs("Parts and radial")} desc="Waffle, pictogram and unit chart; rose and 24-hour clock; nested donut and gauge cluster; diverging Likert and NPS gauge." />
    <G><P id="D025" title="Waffle"><WaffleChart title="Tickets, waffle" parts={D.ticketParts} /></P><P id="D025" title="Pictogram"><Pictogram title="Tickets, pictogram" parts={D.ticketParts} /></P></G>
    <G cols={1}><P id="D025" title="Unit chart"><UnitChart title="Open tickets by team, unit chart" rows={D.unitRows} per={2} /></P></G>
    <G><P id="D026" title="Rose chart"><RoseChart title="Incidents by month, rose" labels={D.MONTHS} values={D.incidentsByMonth} /></P><P id="D026" title="24-hour clock"><ClockChart title="Events by hour, 24-hour clock" byHour={D.eventsByHour} /></P></G>
    <G><P id="D027" title="Nested donut"><NestedDonut title="Revenue by region and country, nested donut" inner={D.ringInner} outer={D.ringOuter} /></P><P id="D027" title="Gauge cluster"><GaugeCluster title="Host health, gauge cluster" gauges={D.gauges} /></P></G>
    <G><P id="D028" title="Diverging Likert"><LikertChart title="Survey, diverging Likert" cats={D.likertCats} rows={D.likertRows} /></P><P id="D028" title="NPS gauge"><NpsGauge title="Customer NPS" scores={D.npsScores} /></P></G>
    <Ids ids="D025 D026 D027 D028" />
  </>);
}
