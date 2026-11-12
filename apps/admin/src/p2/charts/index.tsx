import type { P2Route } from "../registry.ts";
import { lazy } from "react";
const CompositionPage = lazy(() => import("./pages.tsx").then((m) => ({ default: m.CompositionPage })));
const DeliveryPage = lazy(() => import("./pages.tsx").then((m) => ({ default: m.DeliveryPage })));
const DistributionPage = lazy(() => import("./pages.tsx").then((m) => ({ default: m.DistributionPage })));
const FurniturePage = lazy(() => import("./pages.tsx").then((m) => ({ default: m.FurniturePage })));
const GraphsPage = lazy(() => import("./pages.tsx").then((m) => ({ default: m.GraphsPage })));
const MapsPage = lazy(() => import("./pages.tsx").then((m) => ({ default: m.MapsPage })));
const TimelinesPage = lazy(() => import("./pages.tsx").then((m) => ({ default: m.TimelinesPage })));
const TrendPage = lazy(() => import("./pages.tsx").then((m) => ({ default: m.TrendPage })));

export const routes: P2Route[] = [
  { path: "/charts/trend", label: "Trend and comparison", icon: "trend", group: "Charts", keywords: "lollipop dumbbell slope combo small multiples floating range table", element: <TrendPage /> },
  { path: "/charts/distribution", label: "Distribution", icon: "chart", group: "Charts", keywords: "scatter bubble hexbin matrix percentile latency heatmap", element: <DistributionPage /> },
  { path: "/charts/composition", label: "Composition and ranking", icon: "database", group: "Charts", keywords: "segmented top n other co-occurrence leaderboard race", element: <CompositionPage /> },
  { path: "/charts/delivery", label: "Delivery, SLOs, live", icon: "pulse", group: "Charts", keywords: "burn down burn up cumulative flow red use slo budget nines kpi comparison counter", element: <DeliveryPage /> },
  { path: "/charts/graphs", label: "Graphs and diagrams", icon: "topology", group: "Charts", keywords: "network topology dependency flowchart state machine sequence", element: <GraphsPage /> },
  { path: "/charts/timelines", label: "Timelines", icon: "clock", group: "Charts", keywords: "gantt swimlane schedule river state strip log volume cpu thread sankey journey", element: <TimelinesPage /> },
  { path: "/charts/maps", label: "Maps and spatial", icon: "globe", group: "Charts", keywords: "choropleth bubble cluster flow heat floor plan rack", element: <MapsPage /> },
  { path: "/charts/furniture", label: "Chart furniture", icon: "download", group: "Charts", keywords: "export png svg csv table fullscreen states", element: <FurniturePage /> },
];
