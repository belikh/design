import { lazy } from "react";
import type { AreaRoute } from "../registry.ts";

const WorkflowBuilder = lazy(() => import("./WorkflowBuilder.tsx").then((m) => ({ default: m.WorkflowBuilder })));
const Notebook = lazy(() => import("./Notebook.tsx").then((m) => ({ default: m.Notebook })));
const WebhookLog = lazy(() => import("./WebhookLog.tsx").then((m) => ({ default: m.WebhookLog })));
const DbBrowser = lazy(() => import("./DbBrowser.tsx").then((m) => ({ default: m.DbBrowser })));
const ObjectStorage = lazy(() => import("./ObjectStorage.tsx").then((m) => ({ default: m.ObjectStorage })));
const FlowViewer = lazy(() => import("./FlowViewer.tsx").then((m) => ({ default: m.FlowViewer })));
const RemoteShell = lazy(() => import("./RemoteShell.tsx").then((m) => ({ default: m.RemoteShell })));
const FirmwareRollout = lazy(() => import("./FirmwareRollout.tsx").then((m) => ({ default: m.FirmwareRollout })));
const ImageAnnotator = lazy(() => import("./ImageAnnotator.tsx").then((m) => ({ default: m.ImageAnnotator })));

export const routes: AreaRoute[] = [
  { path: "/workflow-builder", label: "Workflow builder", icon: "git-branch", group: "Builders", keywords: "automation nodes edges trigger action condition flow", element: <WorkflowBuilder /> },
  { path: "/notebook", label: "Notebook", icon: "book", group: "Data", keywords: "cells query chart text sql analysis", element: <Notebook /> },
  { path: "/webhook-log", label: "Webhook deliveries", icon: "send", group: "Operations", keywords: "webhook replay delivery retry http log", element: <WebhookLog /> },
  { path: "/database-browser", label: "Database browser", icon: "database", group: "Data", keywords: "tables rows relations foreign key schema", element: <DbBrowser /> },
  { path: "/object-storage", label: "Object storage", icon: "cloud", group: "Data", keywords: "bucket s3 objects files prefix upload", element: <ObjectStorage /> },
  { path: "/network-flows", label: "Network flows", icon: "topology", group: "Operations", keywords: "traffic sankey netflow bytes protocol", element: <FlowViewer /> },
  { path: "/remote-shell", label: "Remote shell", icon: "terminal", group: "Operations", keywords: "ssh session recording replay audit", element: <RemoteShell /> },
  { path: "/firmware-rollout", label: "Firmware rollout", icon: "upload", group: "Operations", keywords: "firmware update rings canary staged progress", element: <FirmwareRollout /> },
  { path: "/image-annotation", label: "Image annotation", icon: "image", group: "Builders", keywords: "label boxes points markup bounding", element: <ImageAnnotator /> },
];
