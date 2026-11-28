import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { graphic } from "@belikh/jupiter-graphics";
import { StageBadge } from "./kit.tsx";
import { STAGE_ICON, STAGE_HEIGHT } from "./stage.ts";

describe("StageBadge", () => {
  it("shows the stage as a word with the stage's icon", () => {
    for (const stage of ["seedling", "budding", "evergreen"] as const) {
      const { container, unmount } = render(<StageBadge stage={stage} />);
      expect(container.textContent).toContain(stage);
      expect(container.querySelector("path")!.getAttribute("d")).toBe(graphic(STAGE_ICON[stage])!.d);
      unmount();
    }
  });
  it("grows taller with each stage", () => {
    expect(STAGE_HEIGHT.seedling).toBeLessThan(STAGE_HEIGHT.budding); expect(STAGE_HEIGHT.budding).toBeLessThan(STAGE_HEIGHT.evergreen);
  });
});
