/// <reference types="node" />
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { MemoryRouter } from "react-router-dom";
import axe from "axe-core";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { App } from "../App.tsx";
import { ROUTES } from "../routes.ts";

/**
 * Accessibility check for every route (axe-core in jsdom: roles, names, labels, ARIA validity, landmarks; colour contrast
 * is covered by the token gate and the browser checks). It is a ratchet: violations that already exist are listed in
 * a11y-baseline.json and may only shrink; a route that gains a violation rule fails. Regenerate after fixing things:
 *   A11Y_UPDATE=1 npm test -w @belikh/jupiter-admin -- a11y
 */
const BASE_PATH = `${process.cwd()}/src/test/a11y-baseline.json`; // vitest runs with the app as the working directory
const baseline: Record<string, string[]> = existsSync(BASE_PATH) ? JSON.parse(readFileSync(BASE_PATH, "utf8")) : {};
const found: Record<string, string[]> = {};
const OFF = ["color-contrast", "region", "landmark-one-main", "page-has-heading-one", "scrollable-region-focusable", "link-in-text-block"];

describe("accessibility: every route", () => {
  for (const path of ROUTES.map((r) => r.path)) {
    it(path, async () => {
      render(<MemoryRouter initialEntries={[path]}><PrefsProvider><App /></PrefsProvider></MemoryRouter>);
      await waitFor(() => expect(screen.queryByTestId("route-loading")).not.toBeInTheDocument(), { timeout: 8000 });
      const res = await axe.run(document.body, { rules: Object.fromEntries(OFF.map((r) => [r, { enabled: false }])), resultTypes: ["violations"], iframes: false });
      const ids = [...new Set(res.violations.map((v) => v.id))].sort(); found[path] = ids;
      if (process.env.A11Y_UPDATE) return;
      const fresh = ids.filter((id) => !(baseline[path] ?? []).includes(id));
      expect(fresh, `new accessibility violations on ${path}: ${fresh.join(", ")}`).toEqual([]);
    }, 30000);
  }
  it("writes the baseline when asked", () => { if (process.env.A11Y_UPDATE) writeFileSync(BASE_PATH, JSON.stringify(Object.fromEntries(Object.entries(found).filter(([, v]) => v.length).sort()), null, 1) + "\n"); });
});
