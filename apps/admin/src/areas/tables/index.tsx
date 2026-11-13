import type { AreaRoute } from "../registry.ts";
import { Pivot } from "./Pivot.tsx";
import { Reorder } from "./Reorder.tsx";
import { Live } from "./Live.tsx";
import { Server } from "./Server.tsx";
import { Nested } from "./Nested.tsx";
import { lazy } from "react";
const GridLab = lazy(() => import("./GridLab.tsx").then((m) => ({ default: m.GridLab })));
const EditLab = lazy(() => import("./EditLab.tsx").then((m) => ({ default: m.EditLab })));
const BulkPaste = lazy(() => import("./BulkPaste.tsx").then((m) => ({ default: m.BulkPaste })));
const Views = lazy(() => import("./Views.tsx").then((m) => ({ default: m.Views })));

export const routes: AreaRoute[] = [
  { path: "/tables/grid", label: "Grid lab", icon: "database", group: "Grids", keywords: "table grouping aggregate pin range find export conditional format", element: <GridLab /> },
  { path: "/tables/edit", label: "Edit and bulk edit", icon: "edit", group: "Grids", keywords: "inline edit in place bulk edit fill down undo validation commit blur", element: <EditLab /> },
  { path: "/tables/pivot", label: "Pivot table", icon: "chart", group: "Grids", keywords: "cross-tab crosstab heat pivot", element: <Pivot /> },
  { path: "/tables/reorder", label: "Reorder rows", icon: "menu", group: "Grids", keywords: "drag drop handle keyboard between tables", element: <Reorder /> },
  { path: "/tables/live", label: "Live rows and diff", icon: "pulse", group: "Grids", keywords: "streaming flash pause snapshot diff compare", element: <Live /> },
  { path: "/tables/server", label: "Server-side table", icon: "cloud", group: "Grids", keywords: "pagination estimate total load more remote", element: <Server /> },
  { path: "/tables/paste", label: "Bulk paste", icon: "copy", group: "Grids", keywords: "import spreadsheet validate preview csv tsv", element: <BulkPaste /> },
  { path: "/tables/views", label: "View switcher", icon: "image", group: "Grids", keywords: "table cards calendar map timeline", element: <Views /> },
  { path: "/tables/nested", label: "Nested and grouped headers", icon: "folder", group: "Grids", keywords: "sub-table column groups rotated headers heat", element: <Nested /> },
];
