export type Theme = "light" | "dark";
export type Density = "comfortable" | "compact";
export const THEMES: Theme[] = ["light", "dark"];
export const DENSITIES: Density[] = ["comfortable", "compact"];
export type VariantKey = `${Theme}-${Density}`;
export const VARIANTS: { key: VariantKey; theme: Theme; density: Density; label: string }[] = DENSITIES.flatMap((density) => THEMES.map((theme) => ({ key: `${theme}-${density}` as VariantKey, theme, density, label: `${theme} ${density}` })));
export type Cov = { path: string; label: string; group: string; light: boolean; dark: boolean; variants: Record<VariantKey, boolean>; covered: number; a11y: string[] };
type R = { path: string; label: string; group: string };
/** Baseline key for one variant. Comfortable keeps the original "#theme" form so older baselines stay valid; compact adds "+compact". */
export const shotKey = (path: string, theme: Theme, density: Density = "comfortable") => `${path}#${theme}${density === "compact" ? "+compact" : ""}`;
/** Visual baseline keys look like "/chrome/access#dark" or "/chrome/access#dark+compact"; routes may or may not carry the /p2 prefix, so try both. */
export function hasShot(shots: Record<string, string>, path: string, theme: Theme, density: Density = "comfortable") {
  const k = (p: string) => shotKey(p, theme, density);
  return k(path) in shots || k(`/p2${path}`) in shots || (path.startsWith("/p2") && k(path.slice(3)) in shots);
}
export function coverage(routes: R[], shots: Record<string, string>, a11y: Record<string, string[]>): Cov[] {
  return routes.map((r) => {
    const variants = Object.fromEntries(VARIANTS.map((v) => [v.key, hasShot(shots, r.path, v.theme, v.density)])) as Record<VariantKey, boolean>;
    return { ...r, light: variants["light-comfortable"], dark: variants["dark-comfortable"], variants, covered: VARIANTS.filter((v) => variants[v.key]).length, a11y: a11y[r.path] ?? [] };
  });
}
export const summary = (c: Cov[]) => ({
  routes: c.length, full: c.filter((x) => x.covered === VARIANTS.length).length, missing: c.filter((x) => x.covered < VARIANTS.length).length,
  /** Routes with light and dark but without both compact shots (the pre-density baseline). */
  noDensity: c.filter((x) => x.light && x.dark && !(x.variants["light-compact"] && x.variants["dark-compact"])).length,
  shots: c.reduce((s, x) => s + x.covered, 0), possible: c.length * VARIANTS.length,
  byVariant: Object.fromEntries(VARIANTS.map((v) => [v.key, c.filter((x) => x.variants[v.key]).length])) as Record<VariantKey, number>,
  clean: c.filter((x) => x.a11y.length === 0).length, violations: c.reduce((s, x) => s + x.a11y.length, 0),
});
/** Baseline entries whose route no longer exists (stale screenshots). */
export function orphanShots(routes: R[], shots: Record<string, string>) {
  const ps = new Set(routes.flatMap((r) => [r.path, `/p2${r.path}`])); return [...new Set(Object.keys(shots).map((k) => k.split("#")[0]))].filter((p) => !ps.has(p) && !ps.has(p.replace(/^\/p2/, "")));
}
export const COMMANDS = [
  { cmd: "npm run visual", dir: "apps/admin", what: "Screenshots every route in four variants (light and dark, comfortable and compact density) at 1280x800 with Chromium and compares a 24x14 luminance grid with visual/baseline.json. Add -- --update to accept, -- --only /home to limit, -- --density compact for one density, -- --baseline-out file.json to write the baseline elsewhere." },
  { cmd: "npm run e2e", dir: "apps/admin", what: "Real-browser interaction tests (focus, clipboard, drag and drop, popovers, keyboard undo) via playwright-core and the system Chromium." },
  { cmd: "npm test", dir: "apps/admin", what: "Vitest: unit tests, page tests, the routes smoke test and the axe a11y check of every route against a11y-baseline.json (a ratchet: it may only shrink)." },
  { cmd: "A11Y_UPDATE=1 npm test -- a11y", dir: "apps/admin", what: "Regenerate src/test/a11y-baseline.json after fixing violations." },
];
export const HOOKS = [
  { hook: 'data-testid="route-loading"', where: "App route fallback", use: "Wait until it is gone before asserting or screenshotting a lazy route." },
  { hook: "role and accessible name", where: "All pages", use: "Prefer getByRole(name). Every control has a visible label or aria-label, which is also what axe checks." },
  { hook: "route path", where: "src/routes.ts ROUTES", use: "visual.mjs and the a11y test enumerate routes from the same list, so a new route is covered automatically." },
];
