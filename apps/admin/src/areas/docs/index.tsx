import { lazy } from "react";
import type { AreaRoute } from "../registry.ts";

// The design-system documentation pages (src/docs). They are the first nav groups and "/" is the landing page.
const DsOverview = lazy(() => import("../../docs/Overview.tsx").then((m) => ({ default: m.DsOverview })));
const DsTokens = lazy(() => import("../../docs/Tokens.tsx").then((m) => ({ default: m.DsTokens })));
const DsFonts = lazy(() => import("../../docs/Fonts.tsx").then((m) => ({ default: m.DsFonts })));
const DsLayout = lazy(() => import("../../docs/Layout.tsx").then((m) => ({ default: m.DsLayout })));
const DsGraphics = lazy(() => import("../../docs/Graphics.tsx").then((m) => ({ default: m.DsGraphics })));
const DsHtmlComponents = lazy(() => import("../../docs/HtmlComponents.tsx").then((m) => ({ default: m.DsHtmlComponents })));
const DsDashboard = lazy(() => import("../../docs/Dashboard.tsx").then((m) => ({ default: m.DsDashboard })));
const DsTargets = lazy(() => import("../../docs/Targets.tsx").then((m) => ({ default: m.DsTargets })));
const DsEditor = lazy(() => import("../../docs/Editor.tsx").then((m) => ({ default: m.DsEditor })));

export const routes: AreaRoute[] = [
  { path: "/", label: "Overview", icon: "home", group: "Foundations", keywords: "design system principles pipeline landing", element: <DsOverview /> },
  { path: "/tokens", label: "Tokens", icon: "sliders", group: "Foundations", keywords: "colour contrast type space radii motion", element: <DsTokens /> },
  { path: "/fonts", label: "Type specimen", icon: "edit", group: "Foundations", keywords: "fonts sgi jetbrains typography", element: <DsFonts /> },
  { path: "/layout", label: "Layout", icon: "menu", group: "Foundations", keywords: "grid breakpoints columns reading", element: <DsLayout /> },
  { path: "/graphics", label: "Line graphics", icon: "image", group: "Foundations", keywords: "icons spot illustrations svg", element: <DsGraphics /> },
  { path: "/components/html", label: "Components (HTML)", icon: "star", group: "Build", keywords: "markup css jupiter.css copy paste", element: <DsHtmlComponents /> },
  { path: "/dashboard", label: "Sample dashboard", icon: "chart", group: "Build", keywords: "jupiter.css grid example", element: <DsDashboard /> },
  { path: "/targets", label: "Targets", icon: "monitor", group: "Ship", keywords: "email terminal kiosk mobile ssh", element: <DsTargets /> },
  { path: "/editor", label: "Token editor", icon: "sliders", group: "Ship", keywords: "live tokens customise import export", element: <DsEditor /> },
];
