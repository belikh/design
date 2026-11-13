import type { AreaRoute } from "../registry.ts";
import { lazy } from "react";
const AccessPage = lazy(() => import("./PagesSystem.tsx").then((m) => ({ default: m.AccessPage })));
const BannersPage = lazy(() => import("./PagesSystem.tsx").then((m) => ({ default: m.BannersPage })));
const SharePage = lazy(() => import("./PagesSystem.tsx").then((m) => ({ default: m.SharePage })));
const StatusPage = lazy(() => import("./PagesSystem.tsx").then((m) => ({ default: m.StatusPage })));
const UndoPage = lazy(() => import("./PagesSystem.tsx").then((m) => ({ default: m.UndoPage })));
const PanesPage = lazy(() => import("./PagesLayout.tsx").then((m) => ({ default: m.PanesPage })));
const SelectionPage = lazy(() => import("./PagesLayout.tsx").then((m) => ({ default: m.SelectionPage })));
const TabsPage = lazy(() => import("./PagesLayout.tsx").then((m) => ({ default: m.TabsPage })));
const WorkspacePage = lazy(() => import("./PagesLayout.tsx").then((m) => ({ default: m.WorkspacePage })));
const EntitiesPage = lazy(() => import("./PagesContent.tsx").then((m) => ({ default: m.EntitiesPage })));
const KpiPage = lazy(() => import("./PagesContent.tsx").then((m) => ({ default: m.KpiPage })));
const MediaPage = lazy(() => import("./PagesContent.tsx").then((m) => ({ default: m.MediaPage })));
const NotificationsPage = lazy(() => import("./PagesContent.tsx").then((m) => ({ default: m.NotificationsPage })));
const TimelinePage = lazy(() => import("./PagesContent.tsx").then((m) => ({ default: m.TimelinePage })));
const DangerPage = lazy(() => import("./PagesGuided.tsx").then((m) => ({ default: m.DangerPage })));
const HelpPage = lazy(() => import("./PagesGuided.tsx").then((m) => ({ default: m.HelpPage })));
const OnboardingPage = lazy(() => import("./PagesGuided.tsx").then((m) => ({ default: m.OnboardingPage })));
const WizardPage = lazy(() => import("./PagesGuided.tsx").then((m) => ({ default: m.WizardPage })));
const DeliveryPage = lazy(() => import("./PagesScale.tsx").then((m) => ({ default: m.DeliveryPage })));
const ParityPage = lazy(() => import("./PagesScale.tsx").then((m) => ({ default: m.ParityPage })));
const ScalePage = lazy(() => import("./PagesScale.tsx").then((m) => ({ default: m.ScalePage })));
const TouchPage = lazy(() => import("./PagesScale.tsx").then((m) => ({ default: m.TouchPage })));

const G = "System";
export const routes: AreaRoute[] = [
  { path: "/chrome/banners", label: "Environment and banners", icon: "flag", group: G, keywords: "environment maintenance read-only impersonation consent", element: <BannersPage /> },
  { path: "/chrome/status", label: "Status bar and tasks", icon: "loader", group: G, keywords: "background tasks connection sync", element: <StatusPage /> },
  { path: "/chrome/access", label: "Access, audit and scoping", icon: "shield", group: G, keywords: "permissions roles audit workspace view as", element: <AccessPage /> },
  { path: "/chrome/undo", label: "Undo, optimistic and conflicts", icon: "undo", group: G, keywords: "undo redo merge conflict optimistic", element: <UndoPage /> },
  { path: "/chrome/share", label: "Export and share", icon: "send", group: G, keywords: "export csv pdf png share link schedule email", element: <SharePage /> },
  { path: "/chrome/workspace", label: "Inspector and mini-map", icon: "topology", group: G, keywords: "inspector outline minimap canvas diagram", element: <WorkspacePage /> },
  { path: "/chrome/tabs", label: "Document tabs and layouts", icon: "folder", group: G, keywords: "tabs pinned reorder saved layouts", element: <TabsPage /> },
  { path: "/chrome/panes", label: "Panes, tiling and grid", icon: "sliders", group: G, keywords: "split resize tiling dock dashboard grid", element: <PanesPage /> },
  { path: "/chrome/selection", label: "Selection and clipboard", icon: "copy", group: G, keywords: "selection summary clipboard tray spreadsheet", element: <SelectionPage /> },
  { path: "/chrome/notifications", label: "Notifications v2", icon: "bell", group: G, keywords: "snooze group types approvals", element: <NotificationsPage /> },
  { path: "/chrome/entities", label: "Entity chips", icon: "user", group: G, keywords: "chips hover card users devices services hosts", element: <EntitiesPage /> },
  { path: "/chrome/kpi", label: "KPIs and targets", icon: "chart", group: G, keywords: "kpi target gauge comparison metric list", element: <KpiPage /> },
  { path: "/chrome/timeline", label: "Timeline variants", icon: "clock", group: G, keywords: "timeline vertical horizontal grouped diff", element: <TimelinePage /> },
  { path: "/chrome/media", label: "Media", icon: "image", group: G, keywords: "lightbox carousel pdf audio video player", element: <MediaPage /> },
  { path: "/chrome/help", label: "Shortcuts and help", icon: "help", group: G, keywords: "shortcuts cheat sheet help panel docs popover", element: <HelpPage /> },
  { path: "/chrome/wizard", label: "Wizard parts", icon: "plus", group: G, keywords: "wizard step rail review success", element: <WizardPage /> },
  { path: "/chrome/danger", label: "Danger zone and undo window", icon: "alert", group: G, keywords: "danger delete soft delete trash undo cooldown", element: <DangerPage /> },
  { path: "/chrome/onboarding", label: "Onboarding tour", icon: "star", group: G, keywords: "tour coachmark checklist onboarding", element: <OnboardingPage /> },
  { path: "/chrome/scale", label: "Large data and budgets", icon: "database", group: G, keywords: "performance 100k 1m rows points virtualised downsample budget", element: <ScalePage /> },
  { path: "/chrome/touch", label: "Touch and gestures", icon: "phone", group: G, keywords: "touch target swipe gesture accessibility", element: <TouchPage /> },
  { path: "/chrome/delivery", label: "Delivery channels", icon: "mail", group: G, keywords: "delivery quiet hours digest email push", element: <DeliveryPage /> },
  { path: "/chrome/parity", label: "Surface parity", icon: "monitor", group: G, keywords: "parity tui slint gtk latex", element: <ParityPage /> },
];
