import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { Network } from "./Network.tsx";
import { resetStores } from "./lib.tsx";
import { parseWgShow, parseTailscaleStatus, parseVpn, handshakeMinutes } from "./network.vpn.ts";
import { channelPlan, channels20, isDfs, radioProblem, rankBlocks, SPECTRUM_5, SPECTRUM_6 } from "./network.spectrum.ts";
import { cannedSource, unifiSource, normaliseBase, SourceError, mapDevices } from "./network.source.ts";

// All fixtures are fictional (documentation address ranges, made-up keys).
const WG = `interface: wg0
  public key: PUBLICKEYPUBLICKEYPUBLICKEYPUBLICKEYPUBLI=
  private key: (hidden)
  listening port: 51820

peer: aaaaaa1111111111111111111111111111111111111=
  preshared key: (hidden)
  endpoint: 203.0.113.9:51820
  allowed ips: 10.8.0.2/32, fd00::2/128
  latest handshake: 1 minute, 5 seconds ago
  transfer: 312.00 MiB received, 88.50 KiB sent

peer: bbbbbb2222222222222222222222222222222222222=
  allowed ips: 10.8.0.3/32
  latest handshake: 2 days, 3 hours, 1 minute ago
  transfer: 1.50 GiB received, 0 B sent

peer: cccccc3333333333333333333333333333333333333=
  allowed ips: 10.8.0.4/32
`;
const TS = JSON.stringify({ Self: { HostName: "me" }, Peer: {
  "nodekey:aa": { HostName: "nas", TailscaleIPs: ["100.64.0.12", "fd7a::1"], Online: true, CurAddr: "198.51.100.4:41641", RxBytes: 1048576 * 10, TxBytes: 2097152 },
  "nodekey:bb": { DNSName: "vps.tail1234.ts.net.", TailscaleIPs: ["100.64.0.40"], Online: false, LastSeen: "2026-11-12T10:00:00Z", Relay: "syd" },
  "nodekey:cc": { HostName: "old", TailscaleIPs: ["100.64.0.50"], Online: false, LastSeen: "0001-01-01T00:00:00Z" } } });

describe("wg show parser", () => {
  it("reads peers, handshake age, transfer, and never keeps keys", () => {
    const r = parseWgShow(WG); expect(r.errors).toEqual([]); expect(r.peers).toHaveLength(3);
    expect(r.peers[0]).toMatchObject({ kind: "WireGuard", address: "10.8.0.2", endpoint: "203.0.113.9:51820", handshakeMin: 1, never: false, rxMb: 312, txMb: 0.1, enabled: true });
    expect(r.peers[1]).toMatchObject({ address: "10.8.0.3", handshakeMin: 2 * 1440 + 3 * 60 + 1, rxMb: 1536, txMb: 0 });
    expect(r.peers[2]).toMatchObject({ never: true, endpoint: "(none)" });
    expect(JSON.stringify(r)).not.toMatch(/PUBLICKEY|preshared|private/i);
  });
  it("parses handshake phrases", () => { expect(handshakeMinutes("45 seconds ago")).toBe(1); expect(handshakeMinutes("1 hour, 2 minutes ago")).toBe(62); expect(handshakeMinutes("soon")).toBeNull(); });
  it("reports junk and unreadable lines", () => { expect(parseWgShow("hello world").errors[0]).toMatch(/No "interface:"/); expect(parseWgShow("peer: x\n  transfer: lots").errors[0]).toMatch(/could not read transfer/); });
});
describe("tailscale parser", () => {
  it("maps online, offline and never-seen peers", () => {
    const r = parseTailscaleStatus(TS, Date.parse("2026-11-12T12:00:00Z")); expect(r.errors).toEqual([]); expect(r.peers.map((p) => p.name)).toEqual(["nas", "vps", "old"]);
    expect(r.peers[0]).toMatchObject({ kind: "Tailscale", address: "100.64.0.12", endpoint: "198.51.100.4:41641", handshakeMin: 0, rxMb: 10, txMb: 2 });
    expect(r.peers[1]).toMatchObject({ handshakeMin: 120, endpoint: "relay syd", never: false }); expect(r.peers[2].never).toBe(true);
  });
  it("rejects bad input", () => { expect(parseTailscaleStatus("{nope").errors[0]).toMatch(/not valid JSON/); expect(parseTailscaleStatus("[]").errors[0]).toMatch(/Unexpected/); expect(parseTailscaleStatus("{}").errors[0]).toMatch(/No "Peer"/); });
  it("auto-detects the format", () => { expect(parseVpn(TS).format).toBe("tailscale"); expect(parseVpn(WG).format).toBe("wireguard"); expect(parseVpn("x").format).toBe("unknown"); });
});

describe("channel plans", () => {
  it("has the standard block counts", () => {
    expect(channels20("5 GHz")).toHaveLength(25); expect([20, 40, 80, 160].map((w) => channelPlan("5 GHz", w as 20).length)).toEqual([25, 12, 6, 2]);
    expect(channels20("6 GHz")).toHaveLength(59); expect([20, 40, 80, 160].map((w) => channelPlan("6 GHz", w as 20).length)).toEqual([59, 29, 14, 7]);
  });
  it("marks DFS in 5 GHz only", () => {
    expect(isDfs("5 GHz", 52)).toBe(true); expect(isDfs("5 GHz", 144)).toBe(true); expect(isDfs("5 GHz", 36)).toBe(false); expect(isDfs("5 GHz", 149)).toBe(false); expect(isDfs("6 GHz", 97)).toBe(false);
    const b80 = channelPlan("5 GHz", 80); expect(b80.find((b) => b.primary === 36)).toMatchObject({ dfs: false, center: 42 }); expect(b80.find((b) => b.primary === 52)?.dfs).toBe(true); expect(b80.find((b) => b.primary === 149)).toMatchObject({ dfs: false, center: 155 });
    expect(channelPlan("5 GHz", 160).map((b) => b.center)).toEqual([50, 114]);
  });
  it("165 is 20 MHz only", () => { expect(channelPlan("5 GHz", 40).some((b) => b.channels.includes(165))).toBe(false); expect(radioProblem("5 GHz", 165, 40)).toMatch(/no 40 MHz block/); expect(radioProblem("5 GHz", 165, 20)).toBeNull(); });
  it("validates radio settings", () => { expect(radioProblem("2.4 GHz", 14, 20)).toMatch(/1 to 13/); expect(radioProblem("2.4 GHz", 6, 80)).toMatch(/not usable/); expect(radioProblem("6 GHz", 33, 160)).toBeNull(); expect(radioProblem("6 GHz", 34, 20)).toMatch(/6 GHz channels/); expect(radioProblem("5 GHz", 36, 160)).toBeNull(); expect(radioProblem("5 GHz", 132, 160)).toMatch(/no 160/); });
  it("ranks the quietest block and skips DFS unless allowed", () => {
    expect(rankBlocks("5 GHz", 80, SPECTRUM_5, false)[0].primary).toBe(149); expect(rankBlocks("5 GHz", 160, SPECTRUM_5, false)).toEqual([]); expect(rankBlocks("5 GHz", 80, SPECTRUM_5, false).every((b) => !b.dfs)).toBe(true);
    const a = rankBlocks("5 GHz", 80, SPECTRUM_5, true)[0]; expect(a.dfs).toBe(true); expect(a.primary).toBe(116); expect(rankBlocks("6 GHz", 160, SPECTRUM_6, false)).toHaveLength(7);
  });
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const page = (data: unknown[]) => ({ offset: 0, limit: 200, count: data.length, totalCount: data.length, data });
const FIX: Record<string, unknown> = {
  "/sites": page([{ id: "site-1", name: "Fictional home" }]),
  "/sites/site-1/devices": page([{ id: "gw", name: "Gateway A", model: "UDM-Pro", state: "ONLINE", ipAddress: "192.0.2.1", firmwareVersion: "4.0.0" }, { id: "sw", name: "Switch A", model: "USW-24", state: "OFFLINE", ipAddress: "192.0.2.2" }, { id: "ap", name: "AP A", model: "U7-Pro", state: "UPDATING", ipAddress: "192.0.2.3", uptimeSec: 172800 }]),
  "/sites/site-1/clients": page([{ id: "c1", name: "laptop", type: "WIRELESS", ipAddress: "192.0.2.50", macAddress: "02:00:00:00:00:01", networkId: "n20", access: { type: "DEFAULT" } }, { id: "c2", name: "nas", type: "WIRED", ipAddress: "192.0.2.51", macAddress: "02:00:00:00:00:02", networkId: "n1", access: { type: "BLOCKED" } }]),
  "/sites/site-1/networks": page([{ id: "n1", name: "Default", vlanId: 1, management: "GATEWAY", ipv4Configuration: { hostIpAddress: "192.0.2.1", prefixLength: 24, dhcpConfiguration: { mode: "SERVER" } } }, { id: "n20", name: "IoT", vlanId: 20, ipv4Configuration: { hostIpAddress: "198.51.100.1", prefixLength: 24, dhcpConfiguration: { mode: "SERVER" } } }]),
  "/sites/site-1/firewall/zones": page([{ id: "z1", name: "Internal" }, { id: "z2", name: "External" }]),
  "/sites/site-1/firewall/policies": page([{ id: "p1", name: "Block IoT out", enabled: true, index: 3, action: { type: "BLOCK" }, source: { zoneId: "z1" }, destination: { zoneId: "z2" } }]),
};
const fakeFetch = (over: Record<string, () => Response> = {}) => vi.fn(async (url: string, init: RequestInit) => {
  const path = new URL(url).pathname.replace("/proxy/network/integration/v1", ""); if (over[path]) return over[path]();
  if (path === "/sites/site-1/dhcp/leases") return json({}, 404); if (path in FIX) return json(FIX[path]); return json({}, 404); void init;
});

describe("data source", () => {
  it("the canned source is the default and is fictional", async () => { const s = await cannedSource.load(); expect(s.devices.length).toBeGreaterThan(0); expect(s.origin).toMatch(/fictional/); expect(s.spectrum["5 GHz"][36]).toBeGreaterThan(0); });
  it("normalises the controller address", () => { expect(normaliseBase("192.0.2.1")).toBe("https://192.0.2.1/proxy/network/integration/v1"); expect(normaliseBase("http://c.example:8443/")).toBe("http://c.example:8443/proxy/network/integration/v1"); expect(() => normaliseBase("")).toThrow(SourceError); });
  it("maps the Integration API shape and sends only read-only GETs with the key header", async () => {
    const f = fakeFetch(); const snap = await unifiSource("https://192.0.2.1", "test-key-123", { fetch: f }).load();
    expect(snap.devices.map((d) => [d.kind, d.status, d.uplink])).toEqual([["Gateway", "online", ""], ["Switch", "offline", "gw"], ["AP", "updating", "gw"]]);
    expect(snap.vlans.map((v) => [v.vid, v.subnet, v.dhcp])).toEqual([[1, "192.0.2.0/24", true], [20, "198.51.100.0/24", true]]); expect(snap.clients.map((c) => [c.conn, c.vlan, c.blocked])).toEqual([["Wi-Fi", 20, false], ["Wired", 1, true]]);
    expect(snap.rules[0]).toMatchObject({ name: "Block IoT out", from: "Internal", to: "External", action: "Block", order: 3 }); expect(snap.leases).toHaveLength(2); expect(snap.notes.join(" ")).toMatch(/derived from clients/);
    for (const [, init] of f.mock.calls) { expect(init.method).toBe("GET"); expect((init.headers as Record<string, string>)["X-API-KEY"]).toBe("test-key-123"); expect(init.credentials).toBe("omit"); }
    expect(JSON.stringify(snap)).not.toContain("test-key-123");
  });
  it("hangs devices off the gateway only when no uplink is given", () => { expect(mapDevices([{ id: "a", model: "UDM", state: "ONLINE" }, { id: "b", model: "USW", state: "ONLINE", uplink: { deviceId: "z" } }]).map((d) => d.uplink)).toEqual(["", "z"]); });
  it("classifies errors: auth, not found, CORS/network, bad JSON, timeout", async () => {
    const kind = async (f: Parameters<typeof unifiSource>[2]) => unifiSource("https://192.0.2.1", "k", f).load().then(() => "ok", (e: SourceError) => e.kind);
    expect(await kind({ fetch: async () => json({}, 401) })).toBe("auth"); expect(await kind({ fetch: async () => json({}, 404) })).toBe("notfound"); expect(await kind({ fetch: async () => json({}, 500) })).toBe("http");
    expect(await kind({ fetch: async () => { throw new TypeError("Failed to fetch"); } })).toBe("cors"); expect(await kind({ fetch: async () => new Response("<html>", { status: 200 }) })).toBe("parse");
    expect(await kind({ timeoutMs: 20, fetch: (_u, i) => new Promise((_r, rej) => i.signal?.addEventListener("abort", () => rej(new DOMException("a", "AbortError")))) })).toBe("timeout");
  });
  it("requires an address and a key", () => { expect(() => unifiSource("https://x.example", " ")).toThrow(/API key/); });
});

const wrap = () => render(<MemoryRouter><PrefsProvider><Network /></PrefsProvider></MemoryRouter>);
describe("network page: live source, VPN import and spectrum", () => {
  it("connects read-only, shows the mode, never stores the key, then disconnects to sample data", async () => {
    resetStores(); const f = fakeFetch(); vi.stubGlobal("fetch", f); const spy = vi.spyOn(console, "log"); const setItem = vi.spyOn(Storage.prototype, "setItem");
    wrap(); expect(screen.getAllByText("Sample data").length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("tab", { name: "Data source" })); await userEvent.type(screen.getByLabelText("Controller address"), "192.0.2.1"); await userEvent.type(screen.getByLabelText("API key"), "super-secret-key");
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(await screen.findByText(/Live data \(read-only\)/)).toBeInTheDocument(); expect(screen.getAllByText(/UniFi controller, site "Fictional home"/).length).toBeGreaterThan(0);
    expect(setItem.mock.calls.flat().join(" ")).not.toContain("super-secret-key"); expect(spy.mock.calls.flat().join(" ")).not.toContain("super-secret-key"); expect(document.body.innerHTML).not.toContain("super-secret-key");
    await userEvent.click(screen.getByRole("tab", { name: "Topology" })); expect(await screen.findByRole("button", { name: /^Gateway A, Gateway, online/ })).toBeInTheDocument(); expect(screen.getByRole("button", { name: "Restart" })).toBeDisabled();
    await userEvent.click(screen.getByRole("tab", { name: "Data source" })); await userEvent.click(screen.getByRole("button", { name: /Disconnect/ }));
    await userEvent.click(screen.getByRole("tab", { name: "Topology" })); expect(await screen.findByRole("button", { name: /^Dream Machine Pro/ })).toBeInTheDocument(); vi.unstubAllGlobals(); setItem.mockRestore(); spy.mockRestore();
  });
  it("shows a CORS-style failure without leaving sample mode", async () => {
    resetStores(); vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); })); wrap(); await userEvent.click(screen.getByRole("tab", { name: "Data source" }));
    await userEvent.type(screen.getByLabelText("Controller address"), "192.0.2.1"); await userEvent.type(screen.getByLabelText("API key"), "k"); await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(await screen.findByText("Could not reach the controller")).toBeInTheDocument(); expect(screen.getByRole("button", { name: "Connect" })).toBeInTheDocument(); vi.unstubAllGlobals();
  });
  it("imports pasted WireGuard output into the peers table", async () => {
    resetStores(); wrap(); await userEvent.click(screen.getByRole("tab", { name: "VPN" })); const ta = await screen.findByLabelText("Output"); await userEvent.click(ta); await userEvent.paste(WG);
    await userEvent.click(screen.getByRole("button", { name: "Parse" })); await userEvent.click(await screen.findByRole("button", { name: "Add 3 wireguard peers" })); expect(await screen.findByText("Added 3 peers to the table.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText("10.8.0.4").length).toBeGreaterThan(0));
  });
  it("switches the spectrum to 5 GHz with DFS marking and applies the recommended block with undo", async () => {
    resetStores(); wrap(); await userEvent.click(screen.getByRole("tab", { name: /Wi-Fi/ })); await userEvent.click(screen.getByRole("button", { name: "5 GHz" }));
    expect(screen.getByRole("img", { name: /5 GHz airtime.*Channels 52 to 144 are DFS/ })).toBeInTheDocument(); await userEvent.click(screen.getByRole("button", { name: "160 MHz" }));
    expect(screen.getByRole("img", { name: /No block available/ })).toBeInTheDocument(); expect(screen.getByRole("button", { name: "No block" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Allow DFS" })); expect(screen.getByRole("img", { name: /100 to 128 \(centre 114\).*\(DFS\)/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "80 MHz" })); await userEvent.click(screen.getByRole("button", { name: "Avoid DFS" })); await userEvent.click(screen.getByRole("button", { name: "Use channel 149 at 80 MHz" }));
    expect(await screen.findByText("5 GHz moved to channel 149 at 80 MHz")).toBeInTheDocument(); await userEvent.click(screen.getByRole("button", { name: /Undo/ })); await userEvent.click(screen.getByRole("button", { name: "6 GHz" })); expect(screen.getByRole("img", { name: /6 GHz airtime by 20 MHz channel/ })).toBeInTheDocument(); expect(screen.queryByRole("button", { name: "Allow DFS" })).not.toBeInTheDocument();
  });
});
