import type { ReactNode } from "react";
import { PageHeader, Panel } from "@belikh/jupiter-ui/kit.tsx";
import * as D from "./data.ts";
import { Alluvial, ArcDiagram, Chord, Sankey } from "./flows.tsx";
import { Dendrogram, MindMap, OrgChart, TreeDiagram } from "./trees.tsx";
import { UpSet, Venn } from "./sets.tsx";
import { Architecture, DependencyMatrix, ErDiagram, LayeredGraph } from "./systems.tsx";
import { FlameGraph, TraceWaterfall } from "./traces.tsx";
import { CohortTable, Funnel } from "./product.tsx";
import { BranchGraph, CommitCalendar, DeployFrequency, LeadTime } from "./devops.tsx";
import { Faceplate, RackElevation, SignalHeat, WifiSpectrum } from "./network.tsx";
import { MotionRaster, OccupancyHeat } from "./occupancy.tsx";
import { AuChoropleth, GpsTrack, Geofences, HexTileMap, RoadIsochrone } from "./geo.tsx";

const P = ({ id, title, children }: { id: string; title: string; children: ReactNode }) => <Panel title={<>{title} <span className="dg-id">{id}</span></>} id={id.toLowerCase().replace(/\W+/g, "-")}>{children}</Panel>;
const Stack = ({ children }: { children: ReactNode }) => <div className="adm-stack" style={{ marginTop: 16 }}>{children}</div>;
const Grid = ({ children }: { children: ReactNode }) => <div className="adm-grid adm-grid--2" style={{ marginTop: 16 }}>{children}</div>;
const Ids = ({ ids }: { ids: string }) => <p className="pc-note">Catalogue entries on this page: <span className="dg-id">{ids}</span></p>;

export function FlowsPage() {
  return (
    <>
      <PageHeader title="Flows and relationships" crumbs={["Diagrams", "Flows"]} desc="Sankey, alluvial, chord and arc diagrams. Each has a focusable readout, a data-table view and an export menu." />
      <Stack>
        <P id="D041" title="Sankey"><Sankey nodes={D.sankeyNodes} links={D.sankeyLinks} stageNames={["Source", "Landing page", "Outcome"]} /></P>
        <P id="D041" title="Alluvial"><Alluvial stages={D.alluvialStages} paths={D.alluvialPaths} /></P>
        <Grid><P id="D041" title="Chord"><Chord names={D.chordNames} matrix={D.chordMatrix} /></P><P id="D041" title="Arc diagram"><ArcDiagram ids={D.arcIds} links={D.arcLinks} /></P></Grid>
      </Stack>
      <Ids ids="D041" />
    </>
  );
}
export function HierarchyPage() {
  return (
    <>
      <PageHeader title="Hierarchies and sets" crumbs={["Diagrams", "Hierarchies"]} desc="Tree, org chart, mind map, dendrogram, Venn and UpSet. Layouts are computed, tested and keyboard reachable." />
      <Stack>
        <P id="D043" title="Tree diagram"><TreeDiagram root={D.taxonomy} /></P>
        <P id="D043" title="Org chart"><OrgChart root={D.orgTree} /></P>
        <P id="D043" title="Mind map"><MindMap root={D.mind} /></P>
        <P id="D043" title="Dendrogram"><Dendrogram labels={D.dendroLabels} vectors={D.dendroVectors} /></P>
        <Grid><P id="D045" title="Venn"><Venn sets={D.venn} /></P><P id="D045" title="UpSet plot"><UpSet sets={D.upset} /></P></Grid>
      </Stack>
      <Ids ids="D043 D045" />
    </>
  );
}
export function SystemsPage() {
  return (
    <>
      <PageHeader title="Systems and data lineage" crumbs={["Diagrams", "Systems"]} desc="ER and architecture diagrams, a dependency matrix, a pipeline DAG with run states and table-level data lineage." />
      <Stack>
        <P id="D047" title="ER diagram"><ErDiagram entities={D.entities} relations={D.relations} /></P>
        <P id="D047" title="Architecture diagram"><Architecture tiers={D.tiers} edges={D.archEdges} /></P>
        <P id="D047" title="Dependency matrix"><DependencyMatrix ids={D.packages} edges={D.pkgDeps} /></P>
        <P id="D047" title="Pipeline DAG with run states"><LayeredGraph mode="run" ids={D.pipeline} edges={D.pipeEdges} raw={D.pipeRaw} /></P>
        <P id="D047" title="Data lineage"><LayeredGraph mode="lineage" ids={D.lineage} edges={D.lineageEdges} /></P>
      </Stack>
      <Ids ids="D047" />
    </>
  );
}
export function TracesPage() {
  return (
    <>
      <PageHeader title="Traces and profiles" crumbs={["Diagrams", "Traces"]} desc="A trace span waterfall with critical path, and a flame graph that flips to an icicle and zooms into any frame." />
      <Stack><P id="D049" title="Trace span waterfall"><TraceWaterfall spans={D.spans} /></P><P id="D049" title="Flame graph and icicle"><FlameGraph stacks={D.stacks} /></P></Stack>
      <Ids ids="D049" />
    </>
  );
}
export function ProductEngineeringPage() {
  return (
    <>
      <PageHeader title="Retention, funnels and delivery" crumbs={["Diagrams", "Product and delivery"]} desc="Cohort retention and funnel conversion, then commit activity, branch graph, deploy frequency and lead time with DORA bands." />
      <Stack>
        <P id="D050" title="Cohort retention table"><CohortTable users={D.cohortUsers} periods={D.WEEKS} /></P>
        <P id="D050" title="Funnel conversion by step"><Funnel data={D.funnels} /></P>
        <P id="D054" title="Commit calendar"><CommitCalendar counts={D.commitCounts} end={D.TODAY} /></P>
        <P id="D054" title="Branch graph"><BranchGraph commits={D.commits} /></P>
        <Grid><P id="D054" title="Deploy frequency"><DeployFrequency deploys={D.deploys} start={D.TODAY.getTime() - 84 * 86400000} weeks={12} /></P><P id="D054" title="Lead time"><LeadTime hours={D.leadHours} /></P></Grid>
      </Stack>
      <Ids ids="D050 D054" />
    </>
  );
}
export function NetworkSpatialPage() {
  return (
    <>
      <PageHeader title="Network hardware and wireless" crumbs={["Spatial", "Network"]} desc="Switch faceplate port map, rack elevation, Wi-Fi spectrum plot and predicted signal on a floor plan." />
      <Stack>
        <P id="D057" title="Switch faceplate port map"><Faceplate ports={D.ports} /></P>
        <P id="D057" title="Rack elevation"><RackElevation racks={D.racks} /></P>
        <P id="D057" title="Wi-Fi spectrum plot"><WifiSpectrum networks={D.bss} /></P>
        <P id="D057" title="Signal heat on a floor plan"><SignalHeat {...D.FLOOR} aps={D.aps} walls={D.walls} rooms={D.rooms} /></P>
      </Stack>
      <Ids ids="D057" />
    </>
  );
}
export function OccupancyPage() {
  return (
    <>
      <PageHeader title="Occupancy and motion" crumbs={["Spatial", "Occupancy"]} desc="Room utilisation by hour, and a raster of motion events per sensor." />
      <Stack><P id="D058" title="Occupancy heat by room and hour"><OccupancyHeat samples={D.occSamples} capacity={D.capacity} rooms={D.roomNames} /></P><P id="D058" title="Motion event raster"><MotionRaster events={D.motionEvents} /></P></Stack>
      <Ids ids="D058" />
    </>
  );
}
export function GeoMapsPage() {
  return (
    <>
      <PageHeader title="Maps without map tiles" crumbs={["Spatial", "Maps"]} desc="Hex tile map, isochrone, GPS track with elevation, geofence states and an Australian state and council choropleth. State and council boundaries are real open data (Natural Earth, ABS) simplified for the screen; the isochrone is Dijkstra over a road graph." />
      <Stack>
        <P id="D059" title="Hex tile map"><HexTileMap rows={D.hexRows} names={D.hexNames} population={D.statePop} internet={D.stateInternet} /></P>
        <P id="D059" title="Choropleth: states and councils"><AuChoropleth states={D.stateInternet} /></P>
        <P id="D059" title="Isochrone"><RoadIsochrone /></P>
        <Grid><P id="D059" title="GPS track with elevation"><GpsTrack track={D.gpsTrack} /></P><P id="D059" title="Geofence states"><Geofences track={D.gpsTrack} fences={D.fences} /></P></Grid>
      </Stack>
      <Ids ids="D059" />
    </>
  );
}
