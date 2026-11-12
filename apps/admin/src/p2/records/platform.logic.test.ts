import { describe, expect, it } from "vitest";
import * as P from "./platform.logic.ts";

describe("cards", () => {
  it("validates numbers with Luhn and detects brands", () => { expect(P.luhn("4242 4242 4242 4242")).toBe(true); expect(P.luhn("4242 4242 4242 4241")).toBe(false); expect(P.luhn("1234")).toBe(false); expect(P.cardBrand("4242")).toBe("Visa"); expect(P.cardBrand("5555 5555")).toBe("Mastercard"); expect(P.cardBrand("3782")).toBe("Amex"); });
  it("formats and checks expiry", () => { expect(P.formatCard("4242424242424242")).toBe("4242 4242 4242 4242"); expect(P.validExpiry("12/26")).toBe(true); expect(P.validExpiry("10/26")).toBe(false); expect(P.validExpiry("13/30")).toBe(false); expect(P.validExpiry("1/30")).toBe(false); });
});
describe("billing maths", () => {
  it("prorates plan changes", () => { expect(P.prorate(49, 149, 15)).toEqual({ credit: 24.5, charge: 74.5, net: 50 }); });
  it("projects usage and tiers overage", () => { expect(P.projectUsage(400, 10)).toBe(1200); expect(P.overage(1500, 1000, [{ upTo: 500, perUnit: 0.1 }, { upTo: Infinity, perUnit: 0.05 }])).toBe(50); expect(P.overage(1700, 1000, [{ upTo: 500, perUnit: 0.1 }, { upTo: Infinity, perUnit: 0.05 }])).toBe(60); expect(P.overage(900, 1000, [{ upTo: Infinity, perUnit: 1 }])).toBe(0); });
});
describe("api keys and webhooks", () => {
  it("validates key requests", () => { expect(P.keyErrors("", [], [])).toHaveLength(2); expect(P.keyErrors("ci", ["admin", "orders:read"], [])).toEqual(["“admin” already includes every other scope"]); expect(P.keyErrors("CI", ["orders:read"], ["ci"])).toEqual(["A key with this name exists"]); expect(P.keyErrors("ci", ["orders:read"], [])).toEqual([]); });
  it("makes deterministic, masked keys", () => { expect(P.makeKey(1)).toBe(P.makeKey(1)); expect(P.makeKey(1)).not.toBe(P.makeKey(2)); expect(P.mask(P.makeKey(1))).toMatch(/^jp_live_.{0}[a-z0-9]{0,}•{12}[a-z0-9]{4}$/); });
  it("allows only public https webhook URLs", () => { expect(P.urlError("http://x.com")).toBe("Must use https://"); expect(P.urlError("https://localhost/x")).toBe("Public URLs only"); expect(P.urlError("nope")).toBe("Enter a valid URL"); expect(P.urlError("https://hooks.example.com/a")).toBeNull(); });
  it("simulates deliveries with retries and backoff", () => {
    expect(P.simulateDeliveries("https://ok.example.com")).toEqual([{ attempt: 1, status: 200, ms: 93 }]); const flaky = P.simulateDeliveries("https://flaky.example.com"); expect(flaky.map((d) => d.status)).toEqual([503, 503, 200]); expect(flaky[0].retryInSec).toBe(30); expect(P.deliveryState(flaky)).toBe("delivered");
    const fail = P.simulateDeliveries("https://fail.example.com"); expect(fail).toHaveLength(5); expect(fail[4].retryInSec).toBeUndefined(); expect(P.deliveryState(fail)).toBe("failed"); expect(P.simulateDeliveries("https://slow.x.com")[0].status).toBe("timeout");
  });
  it("signing is stable and secret-dependent (demo)", () => { expect(P.demoSign("s", "b")).toBe(P.demoSign("s", "b")); expect(P.demoSign("s", "b")).not.toBe(P.demoSign("t", "b")); });
});
