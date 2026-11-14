import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Spotlight, SettingsRail, SettingsSection } from "./kit.tsx";
import { StatTile } from "./Charts.tsx";

describe("Spotlight", () => {
  it("is a named region with the title, body and actions, and carries the tone", () => {
    render(<Spotlight eyebrow="Next up" title="A101" tone="warn" actions={<button>Call</button>}><p>Waited 20 min</p></Spotlight>);
    const r = screen.getByRole("region", { name: "Next up" });
    expect(r).toHaveAttribute("data-tone", "warn");
    expect(r).toHaveTextContent("A101");
    expect(r).toHaveTextContent("Waited 20 min");
    expect(screen.getByRole("button", { name: "Call" })).toBeTruthy();
  });
  it("uses the label for the region name when given", () => {
    render(<Spotlight eyebrow="Next up" label="Truck waiting longest" title="A101" />);
    expect(screen.getByRole("region", { name: "Truck waiting longest" })).toBeTruthy();
  });
});

describe("SettingsSection and SettingsRail", () => {
  it("renders the title, the explanation and the controls, and links the rail to the ids", () => {
    render(<><SettingsRail items={[{ id: "a", label: "Rules" }, { id: "b", label: "Gate" }]} /><SettingsSection id="a" title="Rules" desc="How trucks are ranked"><input aria-label="Weight" /></SettingsSection><SettingsSection id="b" title="Gate">x</SettingsSection></>);
    expect(screen.getByRole("heading", { level: 2, name: "Rules" })).toBeTruthy();
    expect(screen.getByText("How trucks are ranked")).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Weight" })).toBeTruthy();
    const nav = screen.getByRole("navigation", { name: "Sections" });
    expect(nav.querySelector('a[href="#a"]')).toHaveAttribute("aria-current", "true");
    expect(nav.querySelector('a[href="#b"]')).not.toHaveAttribute("aria-current");
  });
});

describe("StatTile size", () => {
  it("adds the large modifier only for size lg", () => {
    const { container, rerender } = render(<StatTile label="Waiting" value="4" />);
    expect(container.querySelector(".adm-stat--lg")).toBeNull();
    rerender(<StatTile label="Waiting" value="4" size="lg" />);
    expect(container.querySelector(".adm-stat--lg")).not.toBeNull();
  });
});
