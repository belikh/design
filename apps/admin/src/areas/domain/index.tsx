import type { AreaRoute } from "../registry.ts";
import { Billing } from "./Billing.tsx";
import { Documents } from "./Documents.tsx";
import { lazy } from "react";
const ServiceHealth = lazy(() => import("./ServiceHealth.tsx").then((m) => ({ default: m.ServiceHealth })));
const HomeAutomation = lazy(() => import("./HomeAutomation.tsx").then((m) => ({ default: m.HomeAutomation })));
const HostsStorage = lazy(() => import("./HostsStorage.tsx").then((m) => ({ default: m.HostsStorage })));
const CiDeploys = lazy(() => import("./CiDeploys.tsx").then((m) => ({ default: m.CiDeploys })));
const CertsDns = lazy(() => import("./CertsDns.tsx").then((m) => ({ default: m.CertsDns })));
const MediaArchive = lazy(() => import("./MediaArchive.tsx").then((m) => ({ default: m.MediaArchive })));
const JobPipeline = lazy(() => import("./JobPipeline.tsx").then((m) => ({ default: m.JobPipeline })));
const Access = lazy(() => import("./Access.tsx").then((m) => ({ default: m.Access })));
const AirportOps = lazy(() => import("./AirportOps.tsx").then((m) => ({ default: m.AirportOps })));
const WarehouseOps = lazy(() => import("./WarehouseOps.tsx").then((m) => ({ default: m.WarehouseOps })));
const CouncilData = lazy(() => import("./CouncilData.tsx").then((m) => ({ default: m.CouncilData })));
const EspFleet = lazy(() => import("./EspFleet.tsx").then((m) => ({ default: m.EspFleet })));
const DesignSystemAdmin = lazy(() => import("./DesignSystemAdmin.tsx").then((m) => ({ default: m.DesignSystemAdmin })));
const AgentRuns = lazy(() => import("./AgentRuns.tsx").then((m) => ({ default: m.AgentRuns })));

const R = (path: string, label: string, icon: string, keywords: string, element: React.ReactNode): AreaRoute => ({ path: `/domain/${path}`, label, icon, group: "Domain", keywords, element });
export const routes: AreaRoute[] = [
  R("service-health", "Service health & on-call", "pulse", "uptime slo incidents alert rules on-call error budget", <ServiceHealth />),
  R("home-automation", "Home automation", "home", "entities automations energy batteries cameras csi presence home assistant", <HomeAutomation />),
  R("hosts-storage", "Hosts & storage", "server", "nixos fleet zfs iscsi smart backups restore ups power", <HostsStorage />),
  R("ci-deploys", "CI & deploys", "git-branch", "pipeline runs releases changelog rollback dora", <CiDeploys />),
  R("certs-dns", "Certificates & DNS", "lock", "certificates expiry dns records zone editor", <CertsDns />),
  R("media-archive", "Media archive", "music", "library playlists metadata editor tracks suno", <MediaArchive />),
  R("job-pipeline", "Job search pipeline", "tag", "applications kanban funnel resume cover letter", <JobPipeline />),
  R("access", "Users, keys & audit", "key", "users roles permissions api keys webhooks audit log", <Access />),
  R("billing", "Billing", "card", "invoices usage metering gst tiers", <Billing />),
  R("airport-ops", "Airport screening ops", "shield", "lanes throughput queue equipment tests roster", <AirportOps />),
  R("warehouse-ops", "Warehouse operations", "rack", "stock reorder receival pick rates orders asn", <WarehouseOps />),
  R("council-data", "Council open data", "globe", "waste calendar car park map dataset catalogue", <CouncilData />),
  R("esp-fleet", "ESP32 / ESPHome fleet", "cpu", "firmware ota rollout ble devices wifi", <EspFleet />),
  R("design-system", "Design-system admin", "sparkle", "tokens versions consumers contrast graphics browser", <DesignSystemAdmin />),
  R("documents", "Documents (LaTeX)", "file", "latex templates pdf invoices letters", <Documents />),
  R("agent-runs", "Agent runs", "terminal", "sessions tool calls cost tokens evals prompt library", <AgentRuns />),
];
