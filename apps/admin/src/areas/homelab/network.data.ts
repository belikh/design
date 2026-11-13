import type { Row } from "./lib.tsx";
import { IPV4, ipNum } from "./lib.tsx";

export type Dev = Row & { name: string; kind: "Gateway" | "Switch" | "AP" | "NAS" | "Camera" | "Other"; model: string; ip: string; uplink: string; status: "online" | "offline" | "updating"; firmware: string; uptimeDays: number };
export const DEVICES = (): Dev[] => [
  { id: "d-gw", rev: 1, name: "Dream Machine Pro", kind: "Gateway", model: "UDM-Pro", ip: "10.0.1.1", uplink: "", status: "online", firmware: "4.1.13", uptimeDays: 61 },
  { id: "d-sw1", rev: 1, name: "Rack switch", kind: "Switch", model: "USW-Pro-24-PoE", ip: "10.0.1.2", uplink: "d-gw", status: "online", firmware: "7.0.50", uptimeDays: 61 },
  { id: "d-sw2", rev: 1, name: "Workshop switch", kind: "Switch", model: "USW-Flex-Mini", ip: "10.0.1.3", uplink: "d-sw1", status: "online", firmware: "2.1.6", uptimeDays: 33 },
  { id: "d-ap1", rev: 1, name: "AP hallway", kind: "AP", model: "U7-Pro", ip: "10.0.1.10", uplink: "d-sw1", status: "online", firmware: "8.0.28", uptimeDays: 12 },
  { id: "d-ap2", rev: 1, name: "AP garage", kind: "AP", model: "U6-Lite", ip: "10.0.1.11", uplink: "d-sw2", status: "updating", firmware: "6.6.65", uptimeDays: 0 },
  { id: "d-nas", rev: 1, name: "NAS", kind: "NAS", model: "Synology DS923+", ip: "10.0.10.20", uplink: "d-sw1", status: "online", firmware: "DSM 7.2", uptimeDays: 90 },
  { id: "d-cam", rev: 1, name: "Doorbell", kind: "Camera", model: "G4 Doorbell", ip: "10.0.30.5", uplink: "d-ap1", status: "offline", firmware: "4.70.2", uptimeDays: 0 },
];
export type Client = Row & { name: string; conn: "Wired" | "Wi-Fi"; vlan: number; ip: string; via: string; signal: number; mbps: number; blocked: boolean };
export const CLIENTS = (): Client[] => [
  { id: "c1", rev: 1, name: "workstation", conn: "Wired", vlan: 10, ip: "10.0.10.50", via: "d-sw1", signal: 0, mbps: 940, blocked: false },
  { id: "c2", rev: 1, name: "iPhone", conn: "Wi-Fi", vlan: 20, ip: "10.0.20.31", via: "d-ap1", signal: -52, mbps: 433, blocked: false },
  { id: "c3", rev: 1, name: "Laptop", conn: "Wi-Fi", vlan: 20, ip: "10.0.20.32", via: "d-ap1", signal: -61, mbps: 866, blocked: false },
  { id: "c4", rev: 1, name: "Octo Pi", conn: "Wi-Fi", vlan: 30, ip: "10.0.30.12", via: "d-ap2", signal: -71, mbps: 72, blocked: false },
  { id: "c5", rev: 1, name: "Smart plug", conn: "Wi-Fi", vlan: 30, ip: "10.0.30.40", via: "d-ap2", signal: -78, mbps: 11, blocked: false },
  { id: "c6", rev: 1, name: "Octane (SGI)", conn: "Wired", vlan: 10, ip: "10.0.10.77", via: "d-sw2", signal: 0, mbps: 100, blocked: false },
  { id: "c7", rev: 1, name: "Unknown device", conn: "Wi-Fi", vlan: 40, ip: "10.0.40.9", via: "d-ap1", signal: -83, mbps: 6, blocked: true },
];
export type Vlan = Row & { vid: number; name: string; subnet: string; gateway: string; dhcp: boolean; purpose: "Trusted" | "IoT" | "Guest" | "Lab" | "Management"; isolated: boolean };
export const VLANS = (): Vlan[] => [
  { id: "v1", rev: 1, vid: 1, name: "Management", subnet: "10.0.1.0/24", gateway: "10.0.1.1", dhcp: false, purpose: "Management", isolated: false },
  { id: "v10", rev: 1, vid: 10, name: "Lab", subnet: "10.0.10.0/24", gateway: "10.0.10.1", dhcp: true, purpose: "Lab", isolated: false },
  { id: "v20", rev: 1, vid: 20, name: "Home", subnet: "10.0.20.0/24", gateway: "10.0.20.1", dhcp: true, purpose: "Trusted", isolated: false },
  { id: "v30", rev: 1, vid: 30, name: "IoT", subnet: "10.0.30.0/24", gateway: "10.0.30.1", dhcp: true, purpose: "IoT", isolated: true },
  { id: "v40", rev: 1, vid: 40, name: "Guest", subnet: "10.0.40.0/24", gateway: "10.0.40.1", dhcp: true, purpose: "Guest", isolated: true },
];
export const CIDR = /^(\d{1,3}\.){3}\d{1,3}\/(\d|[12]\d|3[0-2])$/;
export const validCidr = (s: string) => CIDR.test(s) && IPV4.test(s.split("/")[0]);
export const inSubnet = (ip: string, cidr: string) => { if (!IPV4.test(ip) || !validCidr(cidr)) return false; const [b, l] = cidr.split("/"); const bits = Number(l); const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0; return ((ipNum(ip) & mask) >>> 0) === ((ipNum(b) & mask) >>> 0); };

export type Rule = Row & { order: number; name: string; from: string; to: string; action: "Allow" | "Block" | "Reject"; proto: "any" | "tcp" | "udp" | "icmp"; port: string; enabled: boolean; hits: number };
export const RULES = (): Rule[] => [
  { id: "r1", rev: 1, order: 1, name: "Management to anywhere", from: "Management", to: "any", action: "Allow", proto: "any", port: "any", enabled: true, hits: 982341 },
  { id: "r2", rev: 1, order: 2, name: "IoT to NAS (blocked)", from: "IoT", to: "Lab", action: "Block", proto: "any", port: "any", enabled: true, hits: 211 },
  { id: "r3", rev: 1, order: 3, name: "Home to Lab SSH", from: "Home", to: "Lab", action: "Allow", proto: "tcp", port: "22", enabled: true, hits: 1830 },
  { id: "r4", rev: 1, order: 4, name: "IoT to Lab ssh (shadowed)", from: "IoT", to: "Lab", action: "Allow", proto: "tcp", port: "22", enabled: true, hits: 0 },
  { id: "r5", rev: 1, order: 5, name: "Guest isolation", from: "Guest", to: "Home", action: "Reject", proto: "any", port: "any", enabled: true, hits: 54 },
  { id: "r6", rev: 1, order: 6, name: "Plex to Home", from: "Lab", to: "Home", action: "Allow", proto: "tcp", port: "32400", enabled: false, hits: 12 },
];
const covers = (a: string, b: string) => a === "any" || a === b;
/** Rules that can never match because an earlier enabled rule covers the same (or wider) traffic. Returns id -> shadowing rule name. */
export function shadowed(rules: Rule[]): Record<string, string> {
  const sorted = [...rules].sort((a, b) => a.order - b.order); const out: Record<string, string> = {};
  sorted.forEach((r, i) => { if (!r.enabled) return; const by = sorted.slice(0, i).find((e) => e.enabled && covers(e.from, r.from) && covers(e.to, r.to) && covers(e.proto, r.proto) && covers(e.port, r.port)); if (by) out[r.id] = by.name; });
  return out;
}
export type Lease = Row & { host: string; ip: string; mac: string; vlan: number; kind: "Static" | "Dynamic"; expires: string };
export const LEASES = (): Lease[] => [
  { id: "l1", rev: 1, host: "workstation", ip: "10.0.10.50", mac: "3c:ec:ef:00:11:01", vlan: 10, kind: "Static", expires: "" },
  { id: "l2", rev: 1, host: "octane", ip: "10.0.10.77", mac: "08:00:69:aa:bb:cc", vlan: 10, kind: "Static", expires: "" },
  { id: "l3", rev: 1, host: "iphone", ip: "10.0.20.31", mac: "a4:83:e7:12:34:56", vlan: 20, kind: "Dynamic", expires: "2026-11-13" },
  { id: "l4", rev: 1, host: "octo-pi", ip: "10.0.30.12", mac: "dc:a6:32:01:02:03", vlan: 30, kind: "Static", expires: "" },
  { id: "l5", rev: 1, host: "printer-mk4", ip: "10.0.30.12", mac: "10:9c:70:aa:00:01", vlan: 30, kind: "Dynamic", expires: "2026-11-12" },
];
/** Leases handing out the same IP, or an IP outside the lease's VLAN subnet. */
export function leaseProblems(leases: Lease[], vlans: Vlan[]): Record<string, string> {
  const out: Record<string, string> = {}; const seen = new Map<string, Lease>();
  for (const l of leases) { const v = vlans.find((x) => x.vid === l.vlan); if (!IPV4.test(l.ip)) out[l.id] = "Not a valid IPv4 address"; else if (v && !inSubnet(l.ip, v.subnet)) out[l.id] = `Outside ${v.subnet}`; const o = seen.get(l.ip); if (o) { out[l.id] = `Same IP as ${o.host}`; out[o.id] ??= `Same IP as ${l.host}`; } else seen.set(l.ip, l); }
  return out;
}
export type Peer = Row & { name: string; kind: "WireGuard" | "Tailscale"; address: string; endpoint: string; handshakeMin: number; rxMb: number; txMb: number; enabled: boolean; /** No handshake has happened yet (wg shows "(none)"); handshakeMin is then meaningless. */ never?: boolean };
export const PEERS = (): Peer[] => [
  { id: "p1", rev: 1, name: "phone", kind: "WireGuard", address: "10.8.0.2", endpoint: "203.0.113.9:51820", handshakeMin: 1, rxMb: 312, txMb: 88, enabled: true },
  { id: "p2", rev: 1, name: "travel laptop", kind: "WireGuard", address: "10.8.0.3", endpoint: "198.51.100.4:51820", handshakeMin: 4320, rxMb: 0, txMb: 0, enabled: true },
  { id: "p3", rev: 1, name: "nas (subnet router)", kind: "Tailscale", address: "100.64.0.12", endpoint: "tailnet", handshakeMin: 0, rxMb: 1204, txMb: 5532, enabled: true },
  { id: "p4", rev: 1, name: "cloud vps", kind: "Tailscale", address: "100.64.0.40", endpoint: "tailnet", handshakeMin: 2, rxMb: 40, txMb: 12, enabled: false },
];
export const peerState = (p: Peer): "disabled" | "connected" | "stale" => (!p.enabled ? "disabled" : p.never || p.handshakeMin > 3 ? "stale" : "connected");
export type Radio = Row & { ap: string; band: "2.4 GHz" | "5 GHz" | "6 GHz"; channel: number; width: 20 | 40 | 80 | 160; power: "Low" | "Medium" | "High"; };
export const RADIOS = (): Radio[] => [
  { id: "rd1", rev: 1, ap: "AP hallway", band: "2.4 GHz", channel: 6, width: 20, power: "Medium" },
  { id: "rd2", rev: 1, ap: "AP hallway", band: "5 GHz", channel: 36, width: 80, power: "High" },
  { id: "rd3", rev: 1, ap: "AP garage", band: "2.4 GHz", channel: 6, width: 20, power: "Medium" },
  { id: "rd4", rev: 1, ap: "AP garage", band: "5 GHz", channel: 149, width: 40, power: "Medium" },
  { id: "rd5", rev: 1, ap: "AP hallway", band: "6 GHz", channel: 33, width: 80, power: "Medium" },
];
/** Neighbour utilisation (% airtime) per 2.4 GHz channel from the last spectrum scan. */
export const SPECTRUM_24: Record<number, number> = { 1: 38, 2: 22, 3: 12, 4: 8, 5: 14, 6: 71, 7: 40, 8: 18, 9: 10, 10: 9, 11: 33, 12: 6, 13: 5 };
/** Least congested of the non-overlapping 2.4 GHz channels (1, 6, 11), counting adjacent-channel bleed at half weight. */
export function bestChannel(util: Record<number, number>): { channel: number; score: number } {
  const score = (c: number) => (util[c] ?? 0) + [-2, -1, 1, 2].reduce((s, d) => s + (util[c + d] ?? 0) * (d === 1 || d === -1 ? 0.5 : 0.25), 0);
  const best = [1, 6, 11].map((c) => ({ channel: c, score: Math.round(score(c)) })).sort((a, b) => a.score - b.score)[0]; return best;
}
/** Tidy layout of devices as a tree: x by leaf order, y by depth. */
export function layout(devs: Dev[]) {
  const kids = (id: string) => devs.filter((d) => d.uplink === id); const pos: Record<string, { x: number; y: number }> = {}; let leaf = 0;
  const walk = (d: Dev, depth: number): number => { const k = kids(d.id); const xs = k.map((c) => walk(c, depth + 1)); const x = k.length ? (xs[0] + xs[xs.length - 1]) / 2 : leaf++; pos[d.id] = { x, y: depth }; return x; };
  devs.filter((d) => !d.uplink || !devs.some((p) => p.id === d.uplink)).forEach((r) => walk(r, 0)); return { pos, leaves: Math.max(leaf, 1) };
}
