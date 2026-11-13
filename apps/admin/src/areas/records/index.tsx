import type { AreaRoute } from "../registry.ts";
import { Onboarding } from "./misc.tsx";
import { Billing, Quotas, Integrations } from "./platform.tsx";
import { Retention, Maintenance } from "./lifecycle.tsx";
import { Team, Sessions } from "./access.tsx";
import { lazy } from "react";
const SplitView = lazy(() => import("./misc.tsx").then((m) => ({ default: m.SplitView })));
const BulkEdit = lazy(() => import("./misc.tsx").then((m) => ({ default: m.BulkEdit })));
const ApiKeys = lazy(() => import("./platform.tsx").then((m) => ({ default: m.ApiKeys })));
const FeatureFlags = lazy(() => import("./platform.tsx").then((m) => ({ default: m.FeatureFlags })));
const ImportWizard = lazy(() => import("./dataio.tsx").then((m) => ({ default: m.ImportWizard })));
const ExportReports = lazy(() => import("./dataio.tsx").then((m) => ({ default: m.ExportReports })));
const IncidentPage = lazy(() => import("./ops.tsx").then((m) => ({ default: m.IncidentPage })));
const RunbookPage = lazy(() => import("./ops.tsx").then((m) => ({ default: m.RunbookPage })));
const DevicePage = lazy(() => import("./ops.tsx").then((m) => ({ default: m.DevicePage })));
const ConfigEditor = lazy(() => import("./config.tsx").then((m) => ({ default: m.ConfigEditor })));
const Secrets = lazy(() => import("./config.tsx").then((m) => ({ default: m.Secrets })));
const TemplateEditor = lazy(() => import("./config.tsx").then((m) => ({ default: m.TemplateEditor })));
const AuditDetail = lazy(() => import("./config.tsx").then((m) => ({ default: m.AuditDetail })));
const BackupRestore = lazy(() => import("./lifecycle.tsx").then((m) => ({ default: m.BackupRestore })));
const UpgradeAssistant = lazy(() => import("./lifecycle.tsx").then((m) => ({ default: m.UpgradeAssistant })));
const BrandingEditor = lazy(() => import("./design.tsx").then((m) => ({ default: m.BrandingEditor })));
const SchemaDesigner = lazy(() => import("./design.tsx").then((m) => ({ default: m.SchemaDesigner })));
const RolesMatrix = lazy(() => import("./access.tsx").then((m) => ({ default: m.RolesMatrix })));
const NotificationMatrix = lazy(() => import("./access.tsx").then((m) => ({ default: m.NotificationMatrix })));

export const routes: AreaRoute[] = [
  { path: "/records/split", label: "Split view", icon: "sliders", group: "Records", keywords: "resizable panes divider master detail", element: <SplitView /> },
  { path: "/records/bulk-edit", label: "Bulk edit", icon: "edit", group: "Records", keywords: "multi select update many", element: <BulkEdit /> },
  { path: "/records/onboarding", label: "Onboarding checklist", icon: "check", group: "Records", keywords: "setup progress get started", element: <Onboarding /> },
  { path: "/records/roles", label: "Roles and permissions", icon: "shield", group: "Records", keywords: "rbac matrix inheritance access", element: <RolesMatrix /> },
  { path: "/records/team", label: "Team and invites", icon: "user", group: "Records", keywords: "members invite seats", element: <Team /> },
  { path: "/records/sessions", label: "Sessions and devices", icon: "lock", group: "Records", keywords: "revoke sign-in history security", element: <Sessions /> },
  { path: "/records/notifications", label: "Notification matrix", icon: "bell", group: "Records", keywords: "preferences channels quiet hours digest", element: <NotificationMatrix /> },
  { path: "/records/billing", label: "Billing and plans", icon: "card", group: "Records", keywords: "invoices payment methods proration", element: <Billing /> },
  { path: "/records/quotas", label: "Quotas and rate limits", icon: "battery", group: "Records", keywords: "usage limits token bucket", element: <Quotas /> },
  { path: "/records/api", label: "API keys and webhooks", icon: "key", group: "Records", keywords: "tokens scopes delivery retries replay", element: <ApiKeys /> },
  { path: "/records/integrations", label: "Integrations", icon: "link", group: "Records", keywords: "connect slack github gallery", element: <Integrations /> },
  { path: "/records/flags", label: "Feature flags", icon: "flag", group: "Records", keywords: "experiments rollout ab test", element: <FeatureFlags /> },
  { path: "/records/import", label: "Import data", icon: "upload", group: "Records", keywords: "csv map columns validate preview commit", element: <ImportWizard /> },
  { path: "/records/export", label: "Export and reports", icon: "download", group: "Records", keywords: "scheduled reports csv json", element: <ExportReports /> },
  { path: "/records/incident", label: "Incident page", icon: "alert", group: "Records", keywords: "postmortem timeline responders status", element: <IncidentPage /> },
  { path: "/records/runbook", label: "Runbook", icon: "terminal", group: "Records", keywords: "steps checklist run log", element: <RunbookPage /> },
  { path: "/records/device/:id", label: "Device detail", icon: "router", group: "Records", keywords: "live metrics config logs actions", element: <DevicePage /> },
  { path: "/records/config", label: "Config editor", icon: "settings", group: "Records", keywords: "staged diff apply rollback revisions", element: <ConfigEditor /> },
  { path: "/records/secrets", label: "Environment and secrets", icon: "lock", group: "Records", keywords: "env variables rotation masked", element: <Secrets /> },
  { path: "/records/templates", label: "Template editor", icon: "mail", group: "Records", keywords: "email variables preview", element: <TemplateEditor /> },
  { path: "/records/audit", label: "Audit event detail", icon: "file", group: "Records", keywords: "before after diff who what", element: <AuditDetail /> },
  { path: "/records/privacy", label: "Retention and privacy", icon: "shield", group: "Records", keywords: "gdpr dsar retention legal hold consent purge", element: <Retention /> },
  { path: "/records/backup", label: "Backup and restore", icon: "database", group: "Records", keywords: "restore point wizard", element: <BackupRestore /> },
  { path: "/records/upgrade", label: "Upgrade assistant", icon: "upload", group: "Records", keywords: "preflight checks rollback version", element: <UpgradeAssistant /> },
  { path: "/records/maintenance", label: "Maintenance windows", icon: "clock", group: "Records", keywords: "schedule conflicts downtime", element: <Maintenance /> },
  { path: "/records/branding", label: "Theme and branding", icon: "sparkle", group: "Records", keywords: "tokens colours contrast editor preview", element: <BrandingEditor /> },
  { path: "/records/schema", label: "Custom fields and schema", icon: "database", group: "Records", keywords: "json schema designer conditional fields", element: <SchemaDesigner /> },
];
