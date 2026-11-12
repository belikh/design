import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Combobox, NumberStepper, OtpInput, PasswordInput } from "./inputs.tsx";

function Combo({ multi = true, creatable = false }) { const [v, setV] = useState<string[]>([]); return <><Combobox multi={multi} creatable={creatable} options={["rust", "go", "nix"]} value={v} onChange={setV} /><output data-testid="v">{v.join(",")}</output></>; }
describe("Combobox", () => {
  it("filters, selects with the keyboard, and removes with Backspace", async () => {
    render(<Combo />); const box = screen.getByRole("combobox"); await userEvent.click(box); await userEvent.type(box, "r");
    expect(screen.getAllByRole("option")).toHaveLength(1); await userEvent.keyboard("{Enter}"); expect(screen.getByTestId("v")).toHaveTextContent("rust");
    await userEvent.keyboard("{Backspace}"); expect(screen.getByTestId("v")).toHaveTextContent("");
  });
  it("creates a new value when creatable", async () => {
    render(<Combo creatable />); const box = screen.getByRole("combobox"); await userEvent.click(box); await userEvent.type(box, "zig{Enter}"); expect(screen.getByTestId("v")).toHaveTextContent("zig");
  });
});
describe("other inputs", () => {
  it("steps and clamps numbers", async () => {
    const f = vi.fn(); render(<NumberStepper value={2} min={0} max={3} onChange={f} />); await userEvent.click(screen.getByLabelText("Increase")); expect(f).toHaveBeenLastCalledWith(3);
  });
  it("rates password strength", async () => {
    function P() { const [v, setV] = useState(""); return <PasswordInput value={v} onChange={setV} />; }
    render(<P />); const input = document.querySelector("input")!; await userEvent.type(input, "abc"); expect(screen.getByText(/Weak|Too weak/)).toBeInTheDocument();
    await userEvent.clear(input); await userEvent.type(input, "Corr3ct-Horse!Battery"); expect(screen.getByText(/Strong|Excellent/)).toBeInTheDocument();
  });
  it("accepts a pasted OTP code", async () => {
    const f = vi.fn(); render(<OtpInput value="" onChange={f} />); screen.getByLabelText("Digit 1").focus(); await userEvent.paste("123456"); expect(f).toHaveBeenCalledWith("123456");
  });
});
