import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PlanChip, PlanLegend, Planner, type PlanBlock, type PlanColumn, type PlanRow } from "./Planner.tsx";

const columns: PlanColumn[] = [{ id: "mon", label: "Mon", sub: "23", group: "Week 48" }, { id: "tue", label: "Tue", sub: "24", group: "Week 48", now: true }, { id: "wed", label: "Wed", sub: "25", group: "Week 49" }];
const rows: PlanRow[] = [{ id: "a", name: "Ava Nguyen" }, { id: "b", name: "Ben Okafor" }];
const plan: Record<string, PlanBlock> = {
  "a:mon": { code: "E", label: "03:30 to 11:30", series: 1 },
  "a:tue": { code: "E", label: "03:30 to 11:30", series: 1, tone: "danger", note: "Rest 9 h, minimum is 10 h" },
  "b:mon": { code: "OFF", quiet: true },
};
const cell = (r: PlanRow, c: PlanColumn) => plan[`${r.id}:${c.id}`];

describe("Planner", () => {
  it("draws a named table with a header per column, a row per name and a group row", () => {
    render(<Planner columns={columns} rows={rows} cell={cell} ariaLabel="Roster" rowHeader="Staff" />);
    expect(screen.getByRole("table", { name: "Roster" })).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Week 48", "Week 49", "Staff", "Mon 23", "Tue 24", "Wed 25"]);
    expect(screen.getAllByRole("rowheader").map((h) => h.textContent)).toEqual(["Ava Nguyen", "Ben Okafor"]);
    expect(screen.getByRole("columnheader", { name: "Tue 24" })).toHaveAttribute("aria-current", "date");
  });
  it("makes every cell a button that names its row, column and block, empty cells too", () => {
    const onSelect = vi.fn();
    render(<Planner columns={columns} rows={rows} cell={cell} ariaLabel="Roster" onSelect={onSelect} selected={{ row: "a", col: "mon" }} />);
    expect(screen.getAllByRole("button")).toHaveLength(6);
    expect(screen.getByRole("button", { name: "Ava Nguyen, Mon 23: E 03:30 to 11:30" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Ben Okafor, Wed 25: Empty" }));
    expect(onSelect).toHaveBeenCalledWith(rows[1], columns[2]);
  });
  it("says a block's status in words", () => {
    render(<Planner columns={columns} rows={rows} cell={cell} ariaLabel="Roster" onSelect={() => {}} />);
    expect(screen.getByRole("button", { name: "Ava Nguyen, Tue 24: E 03:30 to 11:30. Rest 9 h, minimum is 10 h" })).toBeInTheDocument();
    expect(screen.getByText("Problem: Rest 9 h, minimum is 10 h")).toBeInTheDocument();
  });
  it("moves focus between cells with the arrow keys and keeps one tab stop", () => {
    render(<Planner columns={columns} rows={rows} cell={cell} ariaLabel="Roster" onSelect={() => {}} />);
    const first = screen.getByRole("button", { name: "Ava Nguyen, Mon 23: E 03:30 to 11:30" });
    expect(screen.getAllByRole("button").filter((b) => b.tabIndex === 0)).toEqual([first]);
    first.focus(); fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(document.activeElement).toHaveAttribute("data-cell", "0:1");
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    expect(document.activeElement).toHaveAttribute("data-cell", "1:1");
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(document.activeElement).toHaveAttribute("data-cell", "1:2");
  });
  it("adds summary rows under the grid and shows only codes when compact", () => {
    const { container } = render(<Planner compact columns={columns} rows={rows} cell={cell} ariaLabel="Roster" summary={[{ label: "On shift", cell: (c) => (c.id === "mon" ? 1 : c.id === "tue" ? 1 : 0) }]} />);
    expect(container.querySelector("tfoot")!.textContent).toBe("On shift110");
    expect(screen.queryByText("03:30 to 11:30")).not.toBeInTheDocument();
  });
  it("offers a block and a legend on their own", () => {
    render(<><PlanChip block={{ code: "PVS", label: "Lane 3", series: 2 }} /><PlanLegend items={[{ block: { code: "E", series: 1 }, text: "Early" }]} /></>);
    expect(screen.getByText("PVS").parentElement).toHaveAttribute("data-series", "2");
    expect(screen.getByRole("list", { name: "Key" })).toHaveTextContent("EEarly");
  });
});
