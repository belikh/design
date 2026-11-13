import type { AreaRoute } from "../registry.ts";
import { lazy } from "react";
const AreaBandsPage = lazy(() => import("./pages.tsx").then((m) => ({ default: m.AreaBandsPage })));
const DistributionsMorePage = lazy(() => import("./pages.tsx").then((m) => ({ default: m.DistributionsMorePage })));
const HierarchyPage = lazy(() => import("./pages.tsx").then((m) => ({ default: m.HierarchyPage })));
const BusinessFlowPage = lazy(() => import("./pages.tsx").then((m) => ({ default: m.BusinessFlowPage })));
const PartsRadialPage = lazy(() => import("./pages.tsx").then((m) => ({ default: m.PartsRadialPage })));

export const routes: AreaRoute[] = [
  { path: "/charts/area-bands", label: "Areas, bands, horizons", icon: "trend", group: "Charts (more)", keywords: "area stacked 100% streamgraph min max band fan chart forecast horizon cycle plot D002 D009 D010", element: <AreaBandsPage /> },
  { path: "/charts/distributions", label: "Distributions in depth", icon: "chart", group: "Charts (more)", keywords: "histogram density ridgeline box plot violin strip beeswarm ecdf cumulative qq quantile D013 D018", element: <DistributionsMorePage /> },
  { path: "/charts/hierarchy", label: "Hierarchy", icon: "topology", group: "Charts (more)", keywords: "treemap sunburst icicle packed circles tree D021", element: <HierarchyPage /> },
  { path: "/charts/business-flow", label: "Business flows and ranks", icon: "pulse", group: "Charts (more)", keywords: "waterfall pareto funnel pyramid bump rank marimekko mekko D022 D024", element: <BusinessFlowPage /> },
  { path: "/charts/parts-radial", label: "Parts, radial, survey", icon: "database", group: "Charts (more)", keywords: "waffle pictogram unit rose clock 24 hour nested donut gauge likert nps D025 D026 D027 D028", element: <PartsRadialPage /> },
];
