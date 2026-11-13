import { lazy } from "react";
import type { AreaRoute } from "../registry.ts";

// First-wave pages. They register exactly like every other area (this folder's `routes` is picked up by the registry),
// and the lazy() calls keep each page in its own chunk.
const Overview = lazy(() => import("../../pages/Overview.tsx").then((m) => ({ default: m.Overview })));
const Analytics = lazy(() => import("../../pages/Analytics.tsx").then((m) => ({ default: m.Analytics })));
const Ops = lazy(() => import("../../pages/Ops.tsx").then((m) => ({ default: m.Ops })));
const Status = lazy(() => import("../../pages/Status.tsx").then((m) => ({ default: m.Status })));
const Orders = lazy(() => import("../../pages/Orders.tsx").then((m) => ({ default: m.Orders })));
const Cards = lazy(() => import("../../pages/Cards.tsx").then((m) => ({ default: m.Cards })));
const List = lazy(() => import("../../pages/List.tsx").then((m) => ({ default: m.List })));
const Board = lazy(() => import("../../pages/Board.tsx").then((m) => ({ default: m.Board })));
const Calendar = lazy(() => import("../../pages/Calendar.tsx").then((m) => ({ default: m.Calendar })));
const Inbox = lazy(() => import("../../pages/Inbox.tsx").then((m) => ({ default: m.Inbox })));
const Search = lazy(() => import("../../pages/Search.tsx").then((m) => ({ default: m.Search })));
const Customer = lazy(() => import("../../pages/Customer.tsx").then((m) => ({ default: m.Customer })));
const Profile = lazy(() => import("../../pages/Profile.tsx").then((m) => ({ default: m.Profile })));
const EditForm = lazy(() => import("../../pages/EditForm.tsx").then((m) => ({ default: m.EditForm })));
const Wizard = lazy(() => import("../../pages/Wizard.tsx").then((m) => ({ default: m.Wizard })));
const Settings = lazy(() => import("../../pages/Settings.tsx").then((m) => ({ default: m.Settings })));
const Logs = lazy(() => import("../../pages/Logs.tsx").then((m) => ({ default: m.Logs })));
const Activity = lazy(() => import("../../pages/Activity.tsx").then((m) => ({ default: m.Activity })));
const Notifications = lazy(() => import("../../pages/Notifications.tsx").then((m) => ({ default: m.Notifications })));
const DashboardBuilder = lazy(() => import("../../pages/DashboardBuilder.tsx").then((m) => ({ default: m.DashboardBuilder })));
const Kiosk = lazy(() => import("../../pages/Kiosk.tsx").then((m) => ({ default: m.Kiosk })));
const ChartsGallery = lazy(() => import("../../pages/ChartsGallery.tsx").then((m) => ({ default: m.ChartsGallery })));
const InputsGallery = lazy(() => import("../../pages/InputsGallery.tsx").then((m) => ({ default: m.InputsGallery })));
const Components = lazy(() => import("../../pages/Components.tsx").then((m) => ({ default: m.Components })));
const States = lazy(() => import("../../pages/States.tsx").then((m) => ({ default: m.States })));
const Auth = lazy(() => import("../../pages/Auth.tsx").then((m) => ({ default: m.Auth })));
const Errors = lazy(() => import("../../pages/Errors.tsx").then((m) => ({ default: m.Errors })));
const Help = lazy(() => import("../../pages/Help.tsx").then((m) => ({ default: m.Help })));
const EspWidgets = lazy(() => import("../../pages/EspWidgets.tsx").then((m) => ({ default: m.EspWidgets })));
const WhDock = lazy(() => import("../../pages/WhDock.tsx").then((m) => ({ default: m.WhDock })));
const WhKiosk = lazy(() => import("../../pages/WhKiosk.tsx").then((m) => ({ default: m.WhKiosk })));
const WhLobby = lazy(() => import("../../pages/WhLobby.tsx").then((m) => ({ default: m.WhLobby })));
const WhTicket = lazy(() => import("../../pages/WhTicket.tsx").then((m) => ({ default: m.WhTicket })));
const HomeAssistant = lazy(() => import("../../pages/HomeAssistant.tsx").then((m) => ({ default: m.HomeAssistant })));

export const routes: AreaRoute[] = [
  { path: "/overview", label: "Admin overview", icon: "home", group: "Dashboards", keywords: "kpi home dashboard", element: <Overview /> },
  { path: "/analytics", label: "Analytics", icon: "chart", group: "Dashboards", keywords: "time range compare breakdown", element: <Analytics /> },
  { path: "/ops", label: "Operations wall", icon: "monitor", group: "Dashboards", keywords: "noc status services", element: <Ops /> },
  { path: "/status", label: "Status page", icon: "pulse", group: "Dashboards", keywords: "uptime incidents public", element: <Status /> },
  { path: "/orders", label: "Orders (data table)", icon: "database", group: "Data", keywords: "table grid sort filter", element: <Orders /> },
  { path: "/cards", label: "Card grid", icon: "image", group: "Data", keywords: "gallery", element: <Cards /> },
  { path: "/list", label: "List view", icon: "menu", group: "Data", keywords: "rows", element: <List /> },
  { path: "/board", label: "Kanban board", icon: "tag", group: "Data", keywords: "tasks drag", element: <Board /> },
  { path: "/calendar", label: "Calendar", icon: "calendar", group: "Data", keywords: "events month week", element: <Calendar /> },
  { path: "/inbox", label: "Inbox (master-detail)", icon: "mail", group: "Data", keywords: "messages split", element: <Inbox /> },
  { path: "/search?q=ava", label: "Search results", icon: "search", group: "Data", keywords: "facets", routePath: "/search", element: <Search /> },
  { path: "/customers/ava-nguyen", label: "Customer detail", icon: "user", group: "Records", keywords: "detail tabs profile", routePath: "/customers/:id", element: <Customer /> },
  { path: "/profile", label: "Profile", icon: "user", group: "Records", element: <Profile /> },
  { path: "/edit", label: "Edit form", icon: "edit", group: "Records", keywords: "form validation", element: <EditForm /> },
  { path: "/new", label: "Create wizard", icon: "plus", group: "Records", keywords: "steps stepper", element: <Wizard /> },
  { path: "/settings", label: "Settings", icon: "settings", group: "Records", keywords: "preferences", element: <Settings /> },
  { path: "/logs", label: "Log viewer", icon: "terminal", group: "Tools", keywords: "tail", element: <Logs /> },
  { path: "/activity", label: "Activity feed", icon: "clock", group: "Tools", keywords: "audit", element: <Activity /> },
  { path: "/notifications", label: "Notifications", icon: "bell", group: "Tools", element: <Notifications /> },
  { path: "/dashboard-builder", label: "Customisable dashboard", icon: "sliders", group: "Tools", keywords: "drag widgets edit", element: <DashboardBuilder /> },
  { path: "/kiosk", label: "Kiosk mode", icon: "monitor", group: "Tools", keywords: "wall display", element: <Kiosk /> },
  { path: "/wh/dock", label: "Dock board", icon: "rack", group: "Warehouse", keywords: "queue docks priority timeslot", element: <WhDock /> },
  { path: "/wh/kiosk", label: "Driver check-in kiosk", icon: "monitor", group: "Warehouse", keywords: "driver terminal data entry", element: <WhKiosk /> },
  { path: "/wh/lobby", label: "Lobby display", icon: "monitor", group: "Warehouse", keywords: "waiting drivers screen", element: <WhLobby /> },
  { path: "/wh/ticket/A101", label: "Driver ticket (mobile)", icon: "phone", group: "Warehouse", keywords: "status", routePath: "/wh/ticket/:id", element: <WhTicket /> },
  { path: "/ha", label: "Home Assistant panel", icon: "home", group: "Panels", keywords: "instrumentation energy lights", element: <HomeAssistant /> },
  { path: "/esphome", label: "ESPHome widgets", icon: "sliders", group: "Panels", keywords: "esp32 display lambda lvgl designer instruments", element: <EspWidgets /> },
  { path: "/charts", label: "Chart gallery", icon: "trend", group: "Library", keywords: "visualisation", element: <ChartsGallery /> },
  { path: "/inputs", label: "Input gallery", icon: "edit", group: "Library", keywords: "form controls", element: <InputsGallery /> },
  { path: "/components", label: "Components", icon: "star", group: "Library", keywords: "kitchen sink overlays", element: <Components /> },
  { path: "/states", label: "States and errors", icon: "alert", group: "Library", keywords: "empty loading error 404", element: <States /> },
  { path: "/help", label: "Help centre", icon: "help", group: "Library", keywords: "docs markdown faq", element: <Help /> },
  { path: "/auth/sign-in", label: "Sign in", icon: "key", group: "Library", keywords: "auth login 2fa", element: <Auth /> },
  { path: "/errors/:code", label: "Errors", icon: "alert", group: "Library", nav: false, element: <Errors /> },
];
