import { lazy } from "react";
import type { P2Route } from "../registry.ts";
const EmbedBuilder = lazy(() => import("./Embed.tsx").then((m) => ({ default: m.EmbedBuilder })));
const EmbedView = lazy(() => import("./Embed.tsx").then((m) => ({ default: m.EmbedView })));
const PlaylistEditor = lazy(() => import("./Playlist.tsx").then((m) => ({ default: m.PlaylistEditor })));
const TvPlayer = lazy(() => import("./Playlist.tsx").then((m) => ({ default: m.TvPlayer })));
const Licence = lazy(() => import("./Licence.tsx").then((m) => ({ default: m.Licence })));
const FormBuilder = lazy(() => import("./FormBuilder.tsx").then((m) => ({ default: m.FormBuilder })));
const SurveyResults = lazy(() => import("./Survey.tsx").then((m) => ({ default: m.SurveyResults })));
const ApprovalFlow = lazy(() => import("./ApprovalFlow.tsx").then((m) => ({ default: m.ApprovalFlow })));
const Moderation = lazy(() => import("./Moderation.tsx").then((m) => ({ default: m.Moderation })));

export const routes: P2Route[] = [
  { path: "/p3/embed", label: "Embed a widget", icon: "link", group: "Embeds", keywords: "iframe embed single widget share snippet", element: <EmbedBuilder /> },
  { path: "/p3/embed/view/throughput", routePath: "/p3/embed/view/:id", label: "Embedded widget", icon: "monitor", group: "Embeds", keywords: "iframe widget", element: <EmbedView />, bare: true, nav: false },
  { path: "/p3/playlist", label: "TV playlist", icon: "monitor", group: "Embeds", keywords: "rotate dashboards tv wall display kiosk signage", element: <PlaylistEditor /> },
  { path: "/p3/playlist/tv", label: "TV player", icon: "monitor", group: "Embeds", keywords: "rotate dashboards tv player fullscreen", element: <TvPlayer />, bare: true, nav: false },
  { path: "/p3/licence", label: "Licence", icon: "key", group: "Settings", keywords: "license entitlements seats plan renewal activate key", element: <Licence /> },
  { path: "/p3/form-builder", label: "Form builder", icon: "edit", group: "Forms", keywords: "drag fields conditional logic preview survey", element: <FormBuilder /> },
  { path: "/p3/survey-results", label: "Survey results", icon: "chart", group: "Forms", keywords: "survey nps responses comments", element: <SurveyResults /> },
  { path: "/p3/approval-flow", label: "Approval flow", icon: "git-branch", group: "Workflows", keywords: "approvals designer steps sla routing", element: <ApprovalFlow /> },
  { path: "/p3/moderation", label: "Moderation", icon: "shield", group: "Workflows", keywords: "approve reject reason flagged content queue", element: <Moderation /> },
];
