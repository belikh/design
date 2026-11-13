import { lazy } from "react";
import type { P2Route } from "../registry.ts";

// Dock-side warehouse screens: the dock status display + clerk portal, the forklift terminal and dock setup.
// (The kiosk, lobby, ticket and dock board live in `core`.) The portal and forklift render without the app shell.
const WhPortal = lazy(() => import("../../pages/WhPortal.tsx").then((m) => ({ default: m.WhPortal })));
const WhForklift = lazy(() => import("../../pages/WhForklift.tsx").then((m) => ({ default: m.WhForklift })));
const WhDocks = lazy(() => import("../../pages/WhDocks.tsx").then((m) => ({ default: m.WhDocks })));

export const routes: P2Route[] = [
  { path: "/wh/portal", label: "Dock status display", icon: "monitor", group: "Warehouse", keywords: "dock portal clerk accept reject clear large display", element: <WhPortal />, bare: true },
  { path: "/wh/portal/4", label: "Dock 4 status", icon: "monitor", group: "Warehouse", keywords: "dock portal one door", routePath: "/wh/portal/:dock", element: <WhPortal />, bare: true, nav: false },
  { path: "/wh/forklift", label: "Forklift terminal", icon: "rack", group: "Warehouse", keywords: "forklift operator unload load pallets tablet", element: <WhForklift />, bare: true },
  { path: "/wh/docks", label: "Dock setup", icon: "settings", group: "Warehouse", keywords: "dock configuration direction truck class height cube equipment", element: <WhDocks /> },
];
