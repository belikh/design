import type { Peer } from "./network.data.ts";
/** Parsers for pasted `wg show` and `tailscale status --json` output. Pure and defensive: unknown lines are ignored, keys are never kept. */
export type Parsed = { peers: Omit<Peer, "id" | "rev">[]; errors: string[] };

const UNIT_MIB: Record<string, number> = { B: 1 / 1048576, KIB: 1 / 1024, MIB: 1, GIB: 1024, TIB: 1048576 };
/** "312.00 MiB" -> MiB as a number (rounded to 0.1). */
const toMib = (n: string, u: string) => Math.round(Number(n) * (UNIT_MIB[u.toUpperCase()] ?? 0) * 10) / 10;
/** "1 minute, 5 seconds ago" / "2 days, 3 hours, 1 minute ago" -> minutes. null when it can't be read. */
export function handshakeMinutes(s: string): number | null {
  const t = s.trim().toLowerCase(); if (!t.endsWith("ago")) return null; let sec = 0, hit = false;
  for (const m of t.matchAll(/(\d+)\s*(day|hour|minute|second)s?/g)) { hit = true; sec += Number(m[1]) * { day: 86400, hour: 3600, minute: 60, second: 1 }[m[2] as "day"]; }
  return hit ? Math.round(sec / 60) : null;
}

export function parseWgShow(text: string): Parsed {
  const peers: Parsed["peers"] = [], errors: string[] = []; let cur: Parsed["peers"][number] | null = null; let iface = "wg"; let any = false;
  const push = () => { if (cur) peers.push(cur); cur = null; };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim(); if (!line) continue; const i = line.indexOf(":"); if (i < 0) continue; const k = line.slice(0, i).trim().toLowerCase(), v = line.slice(i + 1).trim();
    if (k === "interface") { push(); iface = v || "wg"; any = true; continue; }
    if (k === "peer") { push(); any = true; cur = { name: `${iface} ${v.slice(0, 6)}…`, kind: "WireGuard", address: "", endpoint: "(none)", handshakeMin: 0, never: true, rxMb: 0, txMb: 0, enabled: true }; continue; }
    if (!cur) continue; // interface-level fields (public key, listening port). Private and preshared keys are never read.
    if (k === "endpoint") cur.endpoint = v; else if (k === "allowed ips") cur.address = v.split(",")[0].trim().replace(/\/(32|128)$/, "") || v;
    else if (k === "latest handshake") { const m = handshakeMinutes(v); if (m === null) { if (!/none/i.test(v)) errors.push(`Peer ${cur.name}: could not read handshake "${v}"`); } else { cur.handshakeMin = m; cur.never = false; } }
    else if (k === "transfer") { const m = /([\d.]+)\s*(\w+)\s+received,\s*([\d.]+)\s*(\w+)\s+sent/i.exec(v); if (m) { cur.rxMb = toMib(m[1], m[2]); cur.txMb = toMib(m[3], m[4]); } else errors.push(`Peer ${cur.name}: could not read transfer "${v}"`); }
  }
  push(); if (!any) errors.push("No \"interface:\" or \"peer:\" lines found. Paste the output of `wg show`."); return { peers, errors };
}

type TsNode = { HostName?: string; DNSName?: string; TailscaleIPs?: string[]; Online?: boolean; LastSeen?: string; RxBytes?: number; TxBytes?: number; CurAddr?: string; Relay?: string; ExitNode?: boolean };
/** `now` is injectable so results are deterministic in tests. */
export function parseTailscaleStatus(text: string, now: number = Date.now()): Parsed {
  let j: { Peer?: Record<string, TsNode> | null }; try { j = JSON.parse(text); } catch { return { peers: [], errors: ["That is not valid JSON. Paste the output of `tailscale status --json`."] }; }
  if (!j || typeof j !== "object" || Array.isArray(j)) return { peers: [], errors: ["Unexpected JSON: expected an object with a \"Peer\" map."] };
  const errors: string[] = []; const peers: Parsed["peers"] = [];
  for (const [key, n] of Object.entries(j.Peer ?? {})) {
    if (!n || typeof n !== "object") { errors.push(`Peer ${key.slice(0, 12)}: not an object`); continue; }
    const ip = n.TailscaleIPs?.find((a) => !a.includes(":")) ?? n.TailscaleIPs?.[0] ?? ""; const seen = n.LastSeen ? Date.parse(n.LastSeen) : NaN; const year1 = Number.isFinite(seen) && seen > Date.parse("2000-01-01");
    peers.push({ name: n.HostName || n.DNSName?.split(".")[0] || key.slice(0, 12), kind: "Tailscale", address: ip, endpoint: n.CurAddr || (n.Relay ? `relay ${n.Relay}` : "tailnet"), handshakeMin: n.Online ? 0 : year1 ? Math.max(0, Math.round((now - seen) / 60000)) : 99999, never: !n.Online && !year1, rxMb: Math.round(((n.RxBytes ?? 0) / 1048576) * 10) / 10, txMb: Math.round(((n.TxBytes ?? 0) / 1048576) * 10) / 10, enabled: true });
  }
  if (!("Peer" in j)) errors.push("No \"Peer\" key found, so there are no peers to import."); return { peers, errors };
}
/** Pick a parser from the text itself. */
export function parseVpn(text: string, now?: number): Parsed & { format: "wireguard" | "tailscale" | "unknown" } {
  const t = text.trim(); if (!t) return { peers: [], errors: ["Paste some output first."], format: "unknown" };
  if (t.startsWith("{")) return { ...parseTailscaleStatus(t, now), format: "tailscale" };
  if (/^(interface|peer):/im.test(t)) return { ...parseWgShow(t), format: "wireguard" };
  return { peers: [], errors: ["Could not tell what this is. Expected `wg show` text or `tailscale status --json`."], format: "unknown" };
}
