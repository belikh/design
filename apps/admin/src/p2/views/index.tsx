import type { P2Route } from "../registry.ts";
import { Capacity, Security } from "./Dash1.tsx";
import { Compare } from "./Dash2.tsx";
import { Media, Roadmap } from "./Explore.tsx";
import { Tasks, Tickets, Contacts, Backlog } from "./Work.tsx";
import { Catalogue } from "./Commerce.tsx";
import { Trash, Favourites, Duplicates, Leaderboard } from "./Records.tsx";
import { Support } from "./System.tsx";
import { lazy } from "react";
const Scorecard = lazy(() => import("./Dash1.tsx").then((m) => ({ default: m.Scorecard })));
const SloPage = lazy(() => import("./Dash1.tsx").then((m) => ({ default: m.SloPage })));
const CostPage = lazy(() => import("./Dash1.tsx").then((m) => ({ default: m.CostPage })));
const LiveStream = lazy(() => import("./Dash2.tsx").then((m) => ({ default: m.LiveStream })));
const MyWork = lazy(() => import("./Dash2.tsx").then((m) => ({ default: m.MyWork })));
const Gallery = lazy(() => import("./Dash2.tsx").then((m) => ({ default: m.Gallery })));
const Report = lazy(() => import("./Dash2.tsx").then((m) => ({ default: m.Report })));
const EntityDash = lazy(() => import("./Dash2.tsx").then((m) => ({ default: m.EntityDash })));
const Files = lazy(() => import("./Explore.tsx").then((m) => ({ default: m.Files })));
const MapView = lazy(() => import("./Explore.tsx").then((m) => ({ default: m.MapView })));
const OrgChart = lazy(() => import("./Explore.tsx").then((m) => ({ default: m.OrgChart })));
const Assets = lazy(() => import("./Explore.tsx").then((m) => ({ default: m.Assets })));
const Approvals = lazy(() => import("./Work.tsx").then((m) => ({ default: m.Approvals })));
const OrdersV = lazy(() => import("./Commerce.tsx").then((m) => ({ default: m.OrdersV })));
const History = lazy(() => import("./Records.tsx").then((m) => ({ default: m.History })));
const Taxonomy = lazy(() => import("./Records.tsx").then((m) => ({ default: m.Taxonomy })));
const SavedSearches = lazy(() => import("./Records.tsx").then((m) => ({ default: m.SavedSearches })));
const TileWall = lazy(() => import("./Records.tsx").then((m) => ({ default: m.TileWall })));
const AccountStates = lazy(() => import("./System.tsx").then((m) => ({ default: m.AccountStates })));
const Changelog = lazy(() => import("./System.tsx").then((m) => ({ default: m.Changelog })));
const Legal = lazy(() => import("./System.tsx").then((m) => ({ default: m.Legal })));

const G = "Views"; const P = "/views";
export const routes: P2Route[] = [
  { path: `${P}/scorecard`, label: "KPI scorecard + executive summary", icon: "chart", group: G, keywords: "kpi targets owners exec narrative", element: <Scorecard /> },
  { path: `${P}/slo`, label: "SLO and error budget", icon: "pulse", group: G, keywords: "burn rate availability nines", element: <SloPage /> },
  { path: `${P}/capacity`, label: "Capacity planning", icon: "trend", group: G, keywords: "forecast disk cpu growth", element: <Capacity /> },
  { path: `${P}/cost`, label: "Cost and spend", icon: "card", group: G, keywords: "budget variance projection", element: <CostPage /> },
  { path: `${P}/security`, label: "Security posture", icon: "shield", group: G, keywords: "findings severity coverage", element: <Security /> },
  { path: `${P}/live`, label: "Live stream", icon: "bolt", group: G, keywords: "rolling window ticker realtime", element: <LiveStream /> },
  { path: `${P}/compare`, label: "Compare (periods, entities, items)", icon: "sliders", group: G, keywords: "two period side by side diff", element: <Compare /> },
  { path: `${P}/my-work`, label: "My work", icon: "user", group: G, keywords: "assigned mentions recents home", element: <MyWork /> },
  { path: `${P}/gallery`, label: "Dashboard gallery", icon: "image", group: G, keywords: "templates picker", element: <Gallery /> },
  { path: `${P}/report`, label: "Print-ready report", icon: "book", group: G, keywords: "paged header footer pdf", element: <Report /> },
  { path: `${P}/entity`, label: "Per-entity dashboard", icon: "server", group: G, keywords: "service device customer", element: <EntityDash /> },
  { path: `${P}/files`, label: "File manager + tree", icon: "folder", group: G, keywords: "hierarchy explorer preview trash", element: <Files /> },
  { path: `${P}/media`, label: "Media library", icon: "camera", group: G, keywords: "thumbnails lightbox bulk", element: <Media /> },
  { path: `${P}/roadmap`, label: "Roadmap (Gantt)", icon: "calendar", group: G, keywords: "timeline gantt lanes", element: <Roadmap /> },
  { path: `${P}/map`, label: "Map and sites", icon: "globe", group: G, keywords: "markers clusters zones polygons", element: <MapView /> },
  { path: `${P}/org`, label: "Org chart and directory", icon: "user", group: G, keywords: "people team reporting", element: <OrgChart /> },
  { path: `${P}/assets`, label: "Asset register", icon: "database", group: G, keywords: "inventory check out repair label", element: <Assets /> },
  { path: `${P}/approvals`, label: "Approval queue", icon: "check", group: G, keywords: "approve reject delegate", element: <Approvals /> },
  { path: `${P}/tasks`, label: "Tasks with subtasks", icon: "success", group: G, keywords: "nested rollup todo", element: <Tasks /> },
  { path: `${P}/tickets`, label: "Tickets with SLA timers", icon: "tag", group: G, keywords: "sla breach support", element: <Tickets /> },
  { path: `${P}/contacts`, label: "Contacts pipeline", icon: "mail", group: G, keywords: "crm stages leads", element: <Contacts /> },
  { path: `${P}/backlog`, label: "Backlog prioritisation", icon: "menu", group: G, keywords: "rank drag sprint", element: <Backlog /> },
  { path: `${P}/catalogue`, label: "Catalogue with variants", icon: "cart", group: G, keywords: "products stock colour size", element: <Catalogue /> },
  { path: `${P}/orders`, label: "Orders and order detail", icon: "gift", group: G, keywords: "line items fulfilment timeline", element: <OrdersV /> },
  { path: `${P}/trash`, label: "Trash and archive", icon: "trash", group: G, keywords: "restore delete forever", element: <Trash /> },
  { path: `${P}/history`, label: "Version and entity history", icon: "clock", group: G, keywords: "versions restore diff audit across systems", element: <History /> },
  { path: `${P}/favourites`, label: "Favourites and recents", icon: "star", group: G, keywords: "pinned bookmarks", element: <Favourites /> },
  { path: `${P}/duplicates`, label: "Duplicates and merge", icon: "copy", group: G, keywords: "dedupe contacts", element: <Duplicates /> },
  { path: `${P}/taxonomy`, label: "Tag taxonomy", icon: "tag", group: G, keywords: "tags merge rename tree", element: <Taxonomy /> },
  { path: `${P}/saved-searches`, label: "Saved searches", icon: "search", group: G, keywords: "smart collections", element: <SavedSearches /> },
  { path: `${P}/leaderboard`, label: "Leaderboard", icon: "flag", group: G, keywords: "ranking podium", element: <Leaderboard /> },
  { path: `${P}/tile-wall`, label: "Tile wall", icon: "monitor", group: G, keywords: "cameras screens grid", element: <TileWall /> },
  { path: `${P}/account-states`, label: "Account locked / expired / consent", icon: "lock", group: G, keywords: "session lockout cookie", element: <AccountStates /> },
  { path: `${P}/changelog`, label: "What's new (changelog)", icon: "sparkle", group: G, keywords: "release notes", element: <Changelog /> },
  { path: `${P}/support`, label: "Support request", icon: "help", group: G, keywords: "contact ticket form", element: <Support /> },
  { path: `${P}/legal`, label: "Terms of service (long-form)", icon: "file", group: G, keywords: "legal privacy terms reading", element: <Legal /> },
];
