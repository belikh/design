export type Route = { path: string; label: string; icon: string; group: string; keywords?: string };

/**
 * The full route list. It starts empty; `p2/registry.ts` appends every registered route (first-wave pages from `p2/core` first, then the other areas) when it loads.
 * routes.ts deliberately imports nothing from the registry: pages (which the registry imports) read ROUTES, so a static
 * import back would be a circular dependency and crash the dev server with "Cannot access 'P2_ROUTES' before initialization".
 */
export const ROUTES: Route[] = [];
