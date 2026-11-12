import type { ReactNode } from "react";
import { ROUTES } from "../routes.ts";

/** Contract for P2 areas: each folder src/p2/<area>/index.tsx exports `routes: P2Route[]`. They register automatically. */
export type P2Route = {
  /** The link in nav, the palette and breadcrumbs. */ path: string; label: string; icon: string; group: string; keywords?: string; element: ReactNode;
  /** The react-router pattern when it differs from `path` (e.g. path "/customers/ava" for routePath "/customers/:id"). */ routePath?: string;
  /** false = routable but not listed in nav or the palette. */ nav?: boolean;
  /** render without the app shell (kiosk-style) */ bare?: boolean;
};
const mods = import.meta.glob<{ routes?: P2Route[] }>("./*/index.tsx", { eager: true });
// `docs` (the design-system pages: Foundations, Build, Ship) goes first, then `core` (the first-wave pages) so nav groups keep their order; the other areas follow alphabetically.
const rank = (k: string) => (k.includes("/docs/") ? 0 : k.includes("/core/") ? 1 : 2);
export const P2_ROUTES: P2Route[] = Object.entries(mods).sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b)).flatMap(([, m]) => m.routes ?? []);

// Append once (guarded against HMR re-evaluation) so ROUTES contains base + P2 routes for nav, palette and tests.
for (const { element: _e, bare: _b, routePath: _p, nav, ...route } of P2_ROUTES) if (nav !== false && !ROUTES.some((x) => x.path === route.path)) ROUTES.push(route);
