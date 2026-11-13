import type { AreaRoute } from "../registry.ts";
import { lazy } from "react";
const Network = lazy(() => import("./Network.tsx").then((m) => ({ default: m.Network })));
const Retro = lazy(() => import("./Retro.tsx").then((m) => ({ default: m.Retro })));
const Cameras = lazy(() => import("./Cameras.tsx").then((m) => ({ default: m.Cameras })));
const Printing = lazy(() => import("./Printing.tsx").then((m) => ({ default: m.Printing })));
const Finance = lazy(() => import("./Finance.tsx").then((m) => ({ default: m.Finance })));
const Vault = lazy(() => import("./Vault.tsx").then((m) => ({ default: m.Vault })));
const Quality = lazy(() => import("./Quality.tsx").then((m) => ({ default: m.Quality })));
const Parity = lazy(() => import("./Parity.tsx").then((m) => ({ default: m.Parity })));

// Paths are literal strings so scripts/visual.mjs (which greps `path: "/..."`) picks them up.
export const routes: AreaRoute[] = [
  { path: "/home/network", label: "Network", icon: "topology", group: "Home lab", keywords: "unifi topology vlan firewall dhcp vpn wireguard tailscale wifi spectrum clients", element: <Network /> },
  { path: "/home/retro", label: "Retro-computing", icon: "monitor", group: "Home lab", keywords: "sgi irix octane o2 indy firmware media restoration amiga", element: <Retro /> },
  { path: "/home/cameras", label: "Camera recorder", icon: "camera", group: "Home lab", keywords: "events clips timeline zones retention nvr protect", element: <Cameras /> },
  { path: "/home/printing", label: "3D printing", icon: "cpu", group: "Home lab", keywords: "printer filament jobs queue failures prusa bambu", element: <Printing /> },
  { path: "/home/vault", label: "Research vault", icon: "book", group: "Home lab", keywords: "notes sources graph runs hyperresearch", element: <Vault /> },
  { path: "/home/finance", label: "Household finance", icon: "card", group: "Household", keywords: "bills subscriptions budgets money", element: <Finance /> },
  { path: "/quality", label: "Quality", icon: "shield", group: "Quality", keywords: "visual regression a11y axe baseline routes coverage test", element: <Quality /> },
  { path: "/parity", label: "Platform parity", icon: "code", group: "Quality", keywords: "tui slint gtk latex native parity", element: <Parity /> },
];
