import type { AreaRoute } from "../registry.ts";
import { lazy } from "react";
const AccessPage = lazy(() => import("./pages.tsx").then((m) => ({ default: m.AccessPage })));
const ChoicesPage = lazy(() => import("./pages.tsx").then((m) => ({ default: m.ChoicesPage })));
const DataPage = lazy(() => import("./pages.tsx").then((m) => ({ default: m.DataPage })));
const DatesPage = lazy(() => import("./pages.tsx").then((m) => ({ default: m.DatesPage })));
const EditorsPage = lazy(() => import("./pages.tsx").then((m) => ({ default: m.EditorsPage })));
const FilesPage = lazy(() => import("./pages.tsx").then((m) => ({ default: m.FilesPage })));
const LocationPage = lazy(() => import("./pages.tsx").then((m) => ({ default: m.LocationPage })));
const NetworkPage = lazy(() => import("./pages.tsx").then((m) => ({ default: m.NetworkPage })));
const NumbersPage = lazy(() => import("./pages.tsx").then((m) => ({ default: m.NumbersPage })));
const PickersPage = lazy(() => import("./pages.tsx").then((m) => ({ default: m.PickersPage })));
const SecurityPage = lazy(() => import("./pages.tsx").then((m) => ({ default: m.SecurityPage })));
const TextPage = lazy(() => import("./pages.tsx").then((m) => ({ default: m.TextPage })));

export const routes: AreaRoute[] = [
  { path: "/inputs/text", label: "Text entry", icon: "edit", group: "Forms", keywords: "mask card iban bsb abn username slug click to edit autocomplete chips paste mention slash", element: <TextPage /> },
  { path: "/inputs/security", label: "Secrets and security", icon: "lock", group: "Forms", keywords: "api key secret password generator totp qr recovery codes passkey webauthn", element: <SecurityPage /> },
  { path: "/inputs/editors", label: "Editors", icon: "code", group: "Forms", keywords: "markdown rich text code editor lint format diff snippets variables attachments", element: <EditorsPage /> },
  { path: "/inputs/numbers", label: "Numbers and money", icon: "chart", group: "Forms", keywords: "scrub knob range ratio dimensions allocation percent sum currency money units duration", element: <NumbersPage /> },
  { path: "/inputs/dates", label: "Dates and time zones", icon: "calendar", group: "Forms", keywords: "natural language date fiscal year quarter multi date blackout timezone working hours overlap", element: <DatesPage /> },
  { path: "/inputs/pickers", label: "Pickers", icon: "user", group: "Forms", keywords: "transfer list tree select cascader country timezone language people role team record relation virtualised", element: <PickersPage /> },
  { path: "/inputs/choices", label: "Choices and ordering", icon: "check", group: "Forms", keywords: "switch confirm radio other reveal drag sort rank matrix survey", element: <ChoicesPage /> },
  { path: "/inputs/files", label: "Files and media", icon: "upload", group: "Forms", keywords: "folder upload url import camera barcode qr scan chunked resumable image focal point alt text redact svg", element: <FilesPage /> },
  { path: "/inputs/data", label: "Structured data", icon: "database", group: "Forms", keywords: "json schema form filter pills search tokens saved query grid rule builder threshold column mapping import option list translations", element: <DataPage /> },
  { path: "/inputs/access", label: "Access, drafts and history", icon: "shield", group: "Forms", keywords: "permissions matrix field permissions field history save resume draft publish versions", element: <AccessPage /> },
  { path: "/inputs/network", label: "Network fields", icon: "topology", group: "Forms", keywords: "ip cidr mac port range hostname vlan subnet calculator firewall dns port forward ssh key fingerprint", element: <NetworkPage /> },
  { path: "/inputs/location", label: "Location", icon: "globe", group: "Forms", keywords: "address autocomplete map confirm geo point radius latitude longitude", element: <LocationPage /> },
];
