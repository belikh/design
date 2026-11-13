import { lazy } from "react";
import type { AreaRoute } from "../registry.ts";

const FinancePage = lazy(() => import("./pages.tsx").then((m) => ({ default: m.FinancePage })));
const PolarPage = lazy(() => import("./pages.tsx").then((m) => ({ default: m.PolarPage })));
const EnergyPage = lazy(() => import("./pages.tsx").then((m) => ({ default: m.EnergyPage })));
const SignalPage = lazy(() => import("./pages.tsx").then((m) => ({ default: m.SignalPage })));
const SurfacePage = lazy(() => import("./pages.tsx").then((m) => ({ default: m.SurfacePage })));
const FeaturesPage = lazy(() => import("./pages.tsx").then((m) => ({ default: m.FeaturesPage })));

export const routes: AreaRoute[] = [
  { path: "/signals/finance", label: "Markets, quality, finance", icon: "trend", group: "Charts (domain)", keywords: "candlestick ohlc depth control chart error bars budget variance invoice ageing cash flow bridge D060 D066", element: <FinancePage /> },
  { path: "/signals/polar", label: "Polar, parallel, word clouds", icon: "chart", group: "Charts (domain)", keywords: "radar spider polar area parallel coordinates word cloud tag cloud D061 D062", element: <PolarPage /> },
  { path: "/signals/energy", label: "Energy and environment", icon: "bolt", group: "Charts (domain)", keywords: "load curve tariff stacked sources battery state of charge temperature humidity comfort wind rose sun path D063 D064", element: <EnergyPage /> },
  { path: "/signals/signal", label: "Signals and media", icon: "pulse", group: "Charts (domain)", keywords: "spectrogram waterfall constellation wifi sensing audio waveform image histogram video timeline markers D065 D067", element: <SignalPage /> },
  { path: "/signals/surface", label: "Surfaces and storage", icon: "database", group: "Charts (domain)", keywords: "contour surface marching squares storage pool smart trend capacity forecast D068 D069", element: <SurfacePage /> },
  { path: "/signals/features", label: "Chart features", icon: "sparkle", group: "Charts (domain)", keywords: "threshold alert ghost compare crosshair zoom drill cross filter lasso log percent last updated query inspector pattern print ascii tui D074", element: <FeaturesPage /> },
];
