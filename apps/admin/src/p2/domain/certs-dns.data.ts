import { daysUntil } from "./lib.ts";

export type Cert = { id: string; domain: string; sans: string[]; issuer: string; notAfter: string; autoRenew: boolean; host: string };
export type RType = "A" | "AAAA" | "CNAME" | "TXT" | "MX" | "SRV";
export type DnsRecord = { id: string; name: string; type: RType; value: string; ttl: number; prio?: number };
export const certStatus = (c: Cert): { days: number; level: "expired" | "danger" | "warn" | "ok" } => { const days = daysUntil(c.notAfter); return { days, level: days < 0 ? "expired" : days < 14 ? "danger" : days < 30 ? "warn" : "ok" }; };
export const CERTS: Cert[] = [
  { id: "c1", domain: "jupiter.au", sans: ["www.jupiter.au"], issuer: "Let’s Encrypt (example)", notAfter: "2026-11-21", autoRenew: true, host: "edge" }, { id: "c2", domain: "api.jupiter.au", sans: [], issuer: "Let’s Encrypt (example)", notAfter: "2026-12-30", autoRenew: true, host: "edge" },
  { id: "c3", domain: "media.jupiter.au", sans: ["archive.jupiter.au"], issuer: "Let’s Encrypt (example)", notAfter: "2026-11-30", autoRenew: false, host: "vega" }, { id: "c4", domain: "ha.jupiter.au", sans: [], issuer: "Internal CA", notAfter: "2027-06-01", autoRenew: false, host: "lyra" },
  { id: "c5", domain: "old-unifi.local", sans: [], issuer: "Self-signed", notAfter: "2026-11-02", autoRenew: false, host: "udm" },
];
/** Certificates needing action: not auto-renewing and expiring within 45 days, or already expired. */
export const needsAction = (c: Cert) => { const s = certStatus(c); return s.level === "expired" || (!c.autoRenew && s.days < 45); };

const NAME = /^(@|\*|[a-z0-9_]([a-z0-9_-]{0,61}[a-z0-9_])?(\.[a-z0-9_]([a-z0-9_-]{0,61}[a-z0-9_])?)*)$/i;
const V4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const V6 = /^[0-9a-f:]+$/i;
const HOST = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.?$/i;
/** Validate a DNS record in the context of the rest of the zone (CNAME exclusivity, duplicates, per-type value syntax). */
export function validateRecord(r: Omit<DnsRecord, "id"> & { id?: string }, zone: DnsRecord[]): string[] {
  const e: string[] = []; const others = zone.filter((x) => x.id !== r.id);
  if (!NAME.test(r.name)) e.push("Name is not a valid host label");
  if (r.ttl < 60 || r.ttl > 86400) e.push("TTL must be between 60 and 86400 seconds");
  if (r.type === "A" && !V4.test(r.value)) e.push("A records need an IPv4 address");
  if (r.type === "AAAA" && !(V6.test(r.value) && r.value.includes(":"))) e.push("AAAA records need an IPv6 address");
  if ((r.type === "CNAME" || r.type === "MX") && !HOST.test(r.value)) e.push(`${r.type} target must be a hostname`);
  if (r.type === "TXT" && r.value.length > 255) e.push("TXT strings are limited to 255 characters per string");
  if (r.type === "MX" && (r.prio === undefined || r.prio < 0)) e.push("MX records need a priority");
  if (r.type === "CNAME" && r.name === "@") e.push("CNAME cannot be at the zone apex");
  if (r.type === "CNAME" && others.some((x) => x.name === r.name && x.type !== "CNAME")) e.push("CNAME cannot coexist with other records of the same name");
  if (r.type !== "CNAME" && others.some((x) => x.name === r.name && x.type === "CNAME")) e.push("A CNAME already exists with this name");
  if (others.some((x) => x.name === r.name && x.type === r.type && x.value === r.value)) e.push("Duplicate record");
  return e;
}
export const ZONE: DnsRecord[] = [
  { id: "z1", name: "@", type: "A", value: "203.0.113.10", ttl: 300 }, { id: "z2", name: "www", type: "CNAME", value: "jupiter.au.", ttl: 300 }, { id: "z3", name: "api", type: "A", value: "203.0.113.11", ttl: 300 },
  { id: "z4", name: "media", type: "A", value: "203.0.113.12", ttl: 300 }, { id: "z5", name: "@", type: "MX", value: "mail.example.net.", ttl: 3600, prio: 10 }, { id: "z6", name: "@", type: "TXT", value: "v=spf1 include:_spf.example.net -all", ttl: 3600 },
  { id: "z7", name: "_acme-challenge", type: "TXT", value: "placeholder-token", ttl: 60 },
];
export const toZone = (records: DnsRecord[], origin = "jupiter.au.") => [`$ORIGIN ${origin}`, "$TTL 300", ...[...records].sort((a, b) => a.name.localeCompare(b.name) || a.type.localeCompare(b.type)).map((r) => `${r.name.padEnd(16)} ${String(r.ttl).padEnd(6)} IN ${r.type.padEnd(5)} ${r.type === "MX" ? `${r.prio} ` : ""}${r.type === "TXT" ? `"${r.value}"` : r.value}`)].join("\n");
