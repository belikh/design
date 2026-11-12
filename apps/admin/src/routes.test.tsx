import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { App } from "./App.tsx";
import { ROUTES } from "./routes.ts";

const extra = ["/errors/403", "/errors/503", "/nope", "/search?q=ava", "/customers/ava-nguyen"];
describe("every route renders without crashing", () => {
  for (const path of [...ROUTES.map((r) => r.path), ...extra]) {
    it(path, async () => {
      render(<MemoryRouter initialEntries={[path]}><PrefsProvider><App /></PrefsProvider></MemoryRouter>);
      await waitFor(() => expect(screen.queryByTestId("route-loading")).not.toBeInTheDocument(), { timeout: 8000 }); // lazy P2 pages
      expect(screen.queryByText("This view crashed")).not.toBeInTheDocument();
      expect(document.body.textContent?.length).toBeGreaterThan(50);
    });
  }
});
