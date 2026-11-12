/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { DEFAULT_TOKENS, generateFontsCSS } from "@belikh/jupiter-tokens";

/**
 * Inject the @font-face rules with an ABSOLUTE /fonts/ base. The published jupiter-fonts.css uses relative URLs (right for a
 * file that sits next to its fonts), which break in an SPA: they resolve against the current route in dev (/wh/dock -> /wh/fonts/)
 * and against /assets/ in the production build, both of which serve the HTML page instead of the font.
 */
const fonts = () => ({ name: "jupiter-fonts", transformIndexHtml: () => [{ tag: "style", attrs: { "data-jupiter": "fonts" }, children: generateFontsCSS(DEFAULT_TOKENS, "/fonts/"), injectTo: "head" as const }] });

/**
 * Cascade layers: design-system CSS (tokens, @belikh/jupiter-ui components) goes in `jp`, the app's own CSS in `app`, and `app` wins by layer order
 * rather than by selector specificity or import order. Page styles can no longer fight component styles. The files are wrapped
 * at build time so the sources stay plain CSS that other projects can copy.
 */
const layers = () => ({
  name: "jupiter-layers", enforce: "pre" as const,
  transform(code: string, id: string) {
    const f = id.split("?")[0]; if (!f.endsWith(".css") || f.includes("/node_modules/") || /^\s*@(import|charset)/m.test(code)) return null;
    const layer = f.includes("/packages/tokens/") || f.includes("/packages/ui/") ? "jp" : f.includes("/apps/admin/src/") ? "app" : null; return layer ? { code: `@layer ${layer} {\n${code}\n}`, map: null } : null;
  },
  transformIndexHtml: () => [{ tag: "style", attrs: { "data-jupiter": "layers" }, children: "@layer jp, app;", injectTo: "head-prepend" as const }],
});

export default defineConfig({
  plugins: [react(), fonts(), layers()],
  server: { port: 3000, strictPort: true },
  test: { environment: "jsdom", setupFiles: ["./src/test/setup.ts"], css: false, include: ["src/**/*.test.{ts,tsx}"], testTimeout: 15000 },
});
