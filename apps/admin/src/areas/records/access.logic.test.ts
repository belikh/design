import { describe, expect, it } from "vitest";
import { canChangeRole, countOn, deliver, isQuiet, parseEmails, preset, seatsLeft, type Member } from "./access.logic.ts";

const members: Member[] = [{ id: "1", name: "A", email: "a@x.co", role: "owner" }, { id: "2", name: "B", email: "b@x.co", role: "admin" }, { id: "3", name: "C", email: "c@x.co", role: "editor" }];
describe("invites", () => {
  it("splits, validates, dedupes and flags existing members", () => { const r = parseEmails("new@x.co, NEW@x.co; bad@, a@x.co  c@y.co", ["a@x.co"]); expect(r.valid).toEqual(["new@x.co", "c@y.co"]); expect(r.dupes).toEqual(["new@x.co"]); expect(r.invalid).toEqual(["bad@"]); expect(r.already).toEqual(["a@x.co"]); });
  it("counts seats including pending invites", () => { expect(seatsLeft(5, 3, 1)).toBe(1); expect(seatsLeft(3, 3, 2)).toBe(0); });
});
describe("role changes", () => {
  it("protects the owner and the last admin", () => { expect(canChangeRole(members, "1", "admin").ok).toBe(false); expect(canChangeRole(members, "3", "owner").ok).toBe(false); expect(canChangeRole(members, "3", "viewer").ok).toBe(true); expect(canChangeRole([...members].filter((m) => m.id !== "1"), "2", "editor")).toMatchObject({ ok: false, why: "At least one admin is required." }); expect(canChangeRole(members, "2", "editor").ok).toBe(true); });
});
describe("notifications", () => {
  it("handles quiet hours across midnight", () => { expect(isQuiet("23:30", "22:00", "07:00")).toBe(true); expect(isQuiet("06:59", "22:00", "07:00")).toBe(true); expect(isQuiet("12:00", "22:00", "07:00")).toBe(false); expect(isQuiet("12:00", "09:00", "17:00")).toBe(true); expect(isQuiet("12:00", "10:00", "10:00")).toBe(false); });
  it("presets and delivery with quiet-hour exceptions for essential events", () => {
    expect(countOn(preset("none"))).toBe(0); expect(countOn(preset("essential"))).toBe(6); const all = preset("all"); const q = { on: true, from: "22:00", to: "07:00" };
    expect(deliver(all, "Mention", "Email", "23:00", q)).toBe(false); expect(deliver(all, "Alert raised", "Email", "23:00", q)).toBe(true); expect(deliver(all, "Mention", "Email", "12:00", q)).toBe(true); expect(deliver(all, "Mention", "SMS", "12:00", q)).toBe(false);
  });
});
