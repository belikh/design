import type { P2Route } from "../registry.ts";
import { lazy } from "react";
const L = <K extends string>(name: K) => lazy(() => import("./pages.tsx").then((m) => ({ default: (m as unknown as Record<K, React.ComponentType>)[name] })));
const SpreadsheetPage = L("SpreadsheetPage"), RatingsPage = L("RatingsPage"), ConfirmPage = L("ConfirmPage"), IconEmojiPage = L("IconEmojiPage"), DeviceGpioPage = L("DeviceGpioPage"), SchedulePage = L("SchedulePage"), DrawingPage = L("DrawingPage"), DesignToolsPage = L("DesignToolsPage"), MediaPage = L("MediaPage"), LogicPage = L("LogicPage"), SpatialPage = L("SpatialPage"), ChatPage = L("ChatPage"), PresencePage = L("PresencePage");

const G = "Inputs (specialised)";
export const routes: P2Route[] = [
  { path: "/p3/spreadsheet-grid", label: "Spreadsheet grid", icon: "database", group: "Grids", keywords: "spreadsheet excel cells formulas fill handle copy paste range B014", element: <SpreadsheetPage /> },
  { path: "/p3/ratings-nps-likert", label: "Ratings and reactions", icon: "star", group: G, keywords: "rating stars hearts nps likert emoji reaction survey feedback C015", element: <RatingsPage /> },
  { path: "/p3/confirm-gestures", label: "Confirmation gestures", icon: "check", group: G, keywords: "captcha human check scroll to accept hold to confirm slide to confirm terms C057 C071", element: <ConfirmPage /> },
  { path: "/p3/icon-emoji-picker", label: "Icon and emoji pickers", icon: "sparkle", group: G, keywords: "icon picker emoji picker search skin tone C027", element: <IconEmojiPage /> },
  { path: "/p3/device-gpio-sun", label: "Device, GPIO and sun pickers", icon: "cpu", group: G, keywords: "device entity picker gpio pin esp32 sunrise sunset offset home assistant C066", element: <DeviceGpioPage /> },
  { path: "/p3/schedule-recurrence", label: "Schedules and recurrence", icon: "calendar", group: G, keywords: "cron rrule recurrence availability schedule slot picker booking C037 C055", element: <SchedulePage /> },
  { path: "/p3/signature-drawing", label: "Signature and drawing", icon: "edit", group: G, keywords: "signature pad drawing canvas ink pen eraser C041", element: <DrawingPage /> },
  { path: "/p3/design-tools", label: "Colour, type and spacing", icon: "sliders", group: G, keywords: "colour picker gradient font picker palette contrast wcag box model spacing easing cubic bezier C042 C044 C045", element: <DesignToolsPage /> },
  { path: "/p3/audio-video-media", label: "Audio and video", icon: "camera", group: G, keywords: "recorder mediarecorder audio video waveform trim thumbnail C043 C048", element: <MediaPage /> },
  { path: "/p3/query-regex-formula", label: "Query, regex and formula", icon: "filter", group: G, keywords: "query builder filter and or groups regex tester formula editor expression C050", element: <LogicPage /> },
  { path: "/p3/spatial-draw", label: "Plans, routes and racks", icon: "pin", group: G, keywords: "polygon bounding box route waypoints room picker rack unit floor plan C064", element: <SpatialPage /> },
  { path: "/p3/chat-assistant", label: "Chat and assistant", icon: "chat", group: "Collaboration", keywords: "chat thread composer assistant streaming citations tool call E030", element: <ChatPage /> },
  { path: "/p3/presence-comments", label: "Presence and comments", icon: "user", group: "Collaboration", keywords: "presence avatars live cursors record locks comments collaboration F012", element: <PresencePage /> },
];
