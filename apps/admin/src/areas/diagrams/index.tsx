import { lazy } from "react";
import type { P2Route } from "../registry.ts";

const pick = <K extends string>(k: K) => lazy(() => import("./pages.tsx").then((m) => ({ default: (m as unknown as Record<K, React.ComponentType>)[k] })));
const FlowsPage = pick("FlowsPage"), HierarchyPage = pick("HierarchyPage"), SystemsPage = pick("SystemsPage"), TracesPage = pick("TracesPage"), ProductEngineeringPage = pick("ProductEngineeringPage");
const NetworkSpatialPage = pick("NetworkSpatialPage"), OccupancyPage = pick("OccupancyPage"), GeoMapsPage = pick("GeoMapsPage");

export const routes: P2Route[] = [
  { path: "/p3/diagrams/flows", label: "Flows and relationships", icon: "topology", group: "Diagrams", keywords: "sankey alluvial chord arc diagram flow D041", element: <FlowsPage /> },
  { path: "/p3/diagrams/hierarchies", label: "Hierarchies and sets", icon: "git-branch", group: "Diagrams", keywords: "tree dendrogram org chart mind map venn upset D043 D045", element: <HierarchyPage /> },
  { path: "/p3/diagrams/systems", label: "Systems and lineage", icon: "database", group: "Diagrams", keywords: "er diagram architecture dependency matrix data lineage pipeline dag run states D047", element: <SystemsPage /> },
  { path: "/p3/diagrams/traces", label: "Traces and flame graphs", icon: "pulse", group: "Diagrams", keywords: "trace span waterfall flame graph icicle profile D049", element: <TracesPage /> },
  { path: "/p3/diagrams/delivery", label: "Retention and delivery", icon: "chart", group: "Diagrams", keywords: "cohort retention funnel commit calendar branch graph deploy frequency lead time dora D050 D054", element: <ProductEngineeringPage /> },
  { path: "/p3/spatial/network", label: "Network hardware and Wi-Fi", icon: "rack", group: "Spatial", keywords: "switch faceplate port map rack elevation wifi spectrum signal heat floor plan D057", element: <NetworkSpatialPage /> },
  { path: "/p3/spatial/occupancy", label: "Occupancy and motion", icon: "clock", group: "Spatial", keywords: "occupancy heat room hour motion event raster D058", element: <OccupancyPage /> },
  { path: "/p3/spatial/maps", label: "Hex, isochrone and geo maps", icon: "globe", group: "Spatial", keywords: "hex tile map isochrone gps track elevation geofence choropleth state council D059", element: <GeoMapsPage /> },
];
