import { DEVICES, CLIENTS, VLANS, RULES, LEASES, PEERS, RADIOS, type Dev, type Client, type Vlan, type Rule, type Lease, type Peer, type Radio } from "./network.data.ts";
import { SPECTRUM_24 } from "./network.data.ts";
import { SPECTRUM, type Band } from "./network.spectrum.ts";

/** Everything the Network page shows. */
export type NetworkSnapshot = { devices: Dev[]; clients: Client[]; vlans: Vlan[]; rules: Rule[]; leases: Lease[]; peers: Peer[]; radios: Radio[]; spectrum: { "2.4 GHz": Record<number, number>; "5 GHz": Record<number, number>; "6 GHz": Record<number, number> }; /** Where the data came from. */ origin: string; notes: string[] };
/** A read-only source of network data. `canned` is the default; `unifi` reads a controller. */
export interface NetworkSource { readonly id: "canned" | "unifi"; readonly label: string; readonly readOnly: boolean; load(signal?: AbortSignal): Promise<NetworkSnapshot> }

/** Fictional fixture, deterministic. */
export const cannedSource: NetworkSource = {
  id: "canned", label: "Sample data", readOnly: false,
  load: async () => ({ devices: DEVICES(), clients: CLIENTS(), vlans: VLANS(), rules: RULES(), leases: LEASES(), peers: PEERS(), radios: RADIOS(), spectrum: { "2.4 GHz": SPECTRUM_24, ...SPECTRUM }, origin: "Sample data (fictional)", notes: [] }),
};

export type SourceErrorKind = "cors" | "auth" | "notfound" | "http" | "parse" | "timeout" | "input";
export class SourceError extends Error { kind: SourceErrorKind; constructor(kind: SourceErrorKind, message: string) { super(message); this.kind = kind; } }

type Fetch = (url: string, init: RequestInit) => Promise<Response>;
type Page<T> = { data?: T[]; totalCount?: number; count?: number; offset?: number };
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const str = (v: unknown, d = "") => (typeof v === "string" ? v : typeof v === "number" ? String(v) : d);
const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);

/** Normalise what a user typed into the base URL: the Integration API root ends in /proxy/network/integration/v1. */
export function normaliseBase(input: string): string {
  let u = input.trim(); if (!u) throw new SourceError("input", "Enter the controller address, e.g. https://192.0.2.1");
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  let url: URL; try { url = new URL(u); } catch { throw new SourceError("input", "That is not a valid address."); }
  const p = url.pathname.replace(/\/+$/, ""); return `${url.origin}${p.includes("/integration/") ? p : `${p}/proxy/network/integration/v1`}`;
}

// ---- mappers (exported for tests): UniFi Network Integration API object -> page rows ----
const kindOf = (model: string, features: unknown): Dev["kind"] => {
  const m = model.toUpperCase(), f = JSON.stringify(features ?? "").toLowerCase();
  if (/^(UDM|UDR|UXG|UCG|UDW|UCK)/.test(m)) return "Gateway"; if (/^(USW|US-|USL|USM|ECS)/.test(m)) return "Switch"; if (/^(U[0-9]|UAP|UAL|UBB|E7|U7|UWB)/.test(m) || f.includes("accesspoint")) return "AP"; if (/^(UNVR|UCK-G2|DS)/.test(m)) return "NAS"; if (/^(UVC|G[0-9])/.test(m)) return "Camera"; return "Other";
};
const stateOf = (s: string): Dev["status"] => (/^online$/i.test(s) ? "online" : /updat|provision|adopt|pending/i.test(s) ? "updating" : "offline");
export function mapDevices(items: unknown[]): Dev[] {
  const rows = items.map((raw, i): Dev => { const d = rec(raw); const model = str(d.model); return { id: str(d.id, `dev-${i}`), rev: 1, name: str(d.name, str(d.macAddress, "device")), kind: kindOf(model, d.features), model, ip: str(d.ipAddress), uplink: str(rec(d.uplink).deviceId), status: stateOf(str(d.state)), firmware: str(d.firmwareVersion, "unknown"), uptimeDays: Math.round(num(d.uptimeSec) / 86400) }; });
  // The list endpoint has no uplink; hang everything that has none off the gateway so the tree still renders.
  const gw = rows.find((d) => d.kind === "Gateway"); return rows.map((d) => (!d.uplink && gw && d.id !== gw.id ? { ...d, uplink: gw.id } : d));
}
export function mapVlans(items: unknown[]): Vlan[] {
  return items.map((raw, i): Vlan => { const n = rec(raw), v4 = rec(n.ipv4Configuration), vid = num(n.vlanId, 1); const host = str(v4.hostIpAddress), pl = num(v4.prefixLength, 24), dhcpMode = str(rec(v4.dhcpConfiguration).mode); const sub = host ? `${host.split(".").slice(0, 3).join(".")}.0/${pl}` : "";
    return { id: str(n.id, `net-${i}`), rev: 1, vid, name: str(n.name, `VLAN ${vid}`), subnet: sub, gateway: host, dhcp: dhcpMode ? dhcpMode === "SERVER" : false, purpose: /guest/i.test(str(n.name)) ? "Guest" : /iot/i.test(str(n.name)) ? "IoT" : vid === 1 || n.management === "GATEWAY" ? "Management" : "Trusted", isolated: n.isolationEnabled === true }; });
}
export function mapClients(items: unknown[], vlans: Vlan[]): Client[] {
  return items.map((raw, i): Client => { const c = rec(raw); const wifi = /wireless/i.test(str(c.type)); const net = vlans.find((v) => v.id === str(c.networkId)); return { id: str(c.id, `cl-${i}`), rev: 1, name: str(c.name, str(c.macAddress, "client")), conn: wifi ? "Wi-Fi" : "Wired", vlan: net?.vid ?? 0, ip: str(c.ipAddress), via: str(c.uplinkDeviceId), signal: wifi ? num(c.signalDbm ?? rec(c.wireless).signalDbm, 0) : 0, mbps: num(c.linkSpeedMbps ?? rec(c.wireless).linkSpeedMbps, 0), blocked: rec(c.access).type === "BLOCKED" || rec(c.access).blocked === true }; });
}
export function mapRules(items: unknown[], zones: Record<string, string>): Rule[] {
  return items.map((raw, i): Rule => { const p = rec(raw), a = str(rec(p.action).type).toUpperCase(); const zone = (x: unknown) => zones[str(rec(x).zoneId)] ?? "any";
    return { id: str(p.id, `fw-${i}`), rev: 1, order: num(rec(p.index).value ?? p.index, i + 1), name: str(p.name, "Policy"), from: zone(p.source), to: zone(p.destination), action: a === "BLOCK" ? "Block" : a === "REJECT" ? "Reject" : "Allow", proto: "any", port: "any", enabled: p.enabled !== false, hits: 0 }; });
}
/** The Integration API has no DHCP lease list in every release, so leases come from /dhcp/leases when it exists and otherwise from clients that have an address. */
export function mapLeases(items: unknown[], vlans: Vlan[], from: "leases" | "clients"): Lease[] {
  return items.map((raw, i): Lease => { const l = rec(raw); const net = vlans.find((v) => v.id === str(l.networkId)); const fixed = from === "leases" ? l.type === "STATIC" || l.static === true : rec(l.access).type === "FIXED_IP" || l.fixedIp === true;
    return { id: str(l.id, `ls-${i}`), rev: 1, host: str(l.hostname ?? l.name, str(l.macAddress, "host")), ip: str(l.ipAddress), mac: str(l.macAddress), vlan: net?.vid ?? 0, kind: fixed ? "Static" : "Dynamic", expires: str(l.expiresAt).slice(0, 10) }; }).filter((l) => l.ip);
}

/** Read-only UniFi Network Integration API client. The key lives only in this closure: it is sent as X-API-KEY on GET requests and never stored or logged. */
export function unifiSource(baseUrl: string, apiKey: string, opts: { fetch?: Fetch; timeoutMs?: number; siteId?: string } = {}): NetworkSource {
  const doFetch: Fetch = opts.fetch ?? ((u, i) => fetch(u, i));
  const base = normaliseBase(baseUrl); if (!apiKey.trim()) throw new SourceError("input", "Enter an API key (create one in the controller under Integrations).");
  const get = async (path: string, signal?: AbortSignal): Promise<unknown> => {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), opts.timeoutMs ?? 10000); const onAbort = () => ctl.abort(); signal?.addEventListener("abort", onAbort);
    try {
      const r = await doFetch(`${base}${path}`, { method: "GET", headers: { Accept: "application/json", "X-API-KEY": apiKey }, credentials: "omit", cache: "no-store", signal: ctl.signal });
      if (r.status === 401 || r.status === 403) throw new SourceError("auth", "The controller rejected the API key (HTTP " + r.status + ").");
      if (r.status === 404) throw new SourceError("notfound", "Not found (HTTP 404). Check the address; the Integration API lives under /proxy/network/integration/v1.");
      if (!r.ok) throw new SourceError("http", `The controller answered HTTP ${r.status}.`);
      try { return await r.json(); } catch { throw new SourceError("parse", "The controller did not return JSON. Is this the right address?"); }
    } catch (e) {
      if (e instanceof SourceError) throw e;
      if (signal?.aborted) throw new SourceError("timeout", "Cancelled.");
      if (ctl.signal.aborted) throw new SourceError("timeout", "The controller did not answer within " + Math.round((opts.timeoutMs ?? 10000) / 1000) + " s.");
      throw new SourceError("cors", "The browser could not reach the controller. Usual causes: it is not reachable from here, it uses a self-signed certificate you have not trusted, or it does not send CORS headers for this origin (put a reverse proxy in front that does) or this page is https and the controller is http.");
    } finally { clearTimeout(t); signal?.removeEventListener("abort", onAbort); }
  };
  const all = async (path: string, signal?: AbortSignal): Promise<unknown[]> => {
    const out: unknown[] = []; for (let offset = 0; offset < 5000; ) { const p = rec(await get(`${path}${path.includes("?") ? "&" : "?"}offset=${offset}&limit=200`, signal)) as Page<unknown>; const d = Array.isArray(p.data) ? p.data : (Array.isArray(p) ? (p as unknown[]) : []); out.push(...d); offset += d.length; if (!d.length || offset >= num(p.totalCount, offset)) break; } return out;
  };
  return {
    id: "unifi", label: "UniFi controller", readOnly: true,
    async load(signal) {
      const notes: string[] = []; const sites = await all("/sites", signal); if (!sites.length) throw new SourceError("http", "The controller has no sites.");
      const site = opts.siteId ? sites.find((s) => str(rec(s).id) === opts.siteId) ?? sites[0] : sites[0]; const sid = str(rec(site).id); if (sites.length > 1) notes.push(`${sites.length} sites found; showing "${str(rec(site).name, sid)}".`);
      const S = `/sites/${encodeURIComponent(sid)}`; const opt = async (p: string) => { try { return await all(`${S}${p}`, signal); } catch (e) { if (e instanceof SourceError && (e.kind === "notfound" || e.kind === "http")) { notes.push(`${p} unavailable (${e.message})`); return null; } throw e; } };
      const [devs, cls, nets] = await Promise.all([all(`${S}/devices`, signal), all(`${S}/clients`, signal), all(`${S}/networks`, signal)]);
      const [pols, zs, ls] = await Promise.all([opt("/firewall/policies"), opt("/firewall/zones"), opt("/dhcp/leases")]);
      const vlans = mapVlans(nets), zones = Object.fromEntries((zs ?? []).map((z) => [str(rec(z).id), str(rec(z).name)]));
      const leases = ls ? mapLeases(ls, vlans, "leases") : mapLeases(cls, vlans, "clients"); if (!ls) notes.push("No DHCP lease endpoint: leases are derived from clients that have an address.");
      return { devices: mapDevices(devs), clients: mapClients(cls, vlans), vlans, rules: mapRules(pols ?? [], zones), leases, peers: [], radios: [], spectrum: { "2.4 GHz": {}, "5 GHz": {}, "6 GHz": {} }, origin: `UniFi controller, site "${str(rec(site).name, sid)}"`, notes: [...notes, "Radios, spectrum scans and VPN peers are not part of the Integration API: use the pasted-text import for VPN peers."] };
    },
  };
}
export type { Band };
