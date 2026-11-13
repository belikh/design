export type Proto = "tcp" | "udp" | "icmp";
export type Flow = { id: string; src: string; dst: string; proto: Proto; port: number; app: string; bytes: number; packets: number; action: "allow" | "block" };
const SRC = ["ws-anna (10.0.10.21)", "ws-ben (10.0.10.22)", "tv-lounge (10.0.30.5)", "cam-front (10.0.40.2)", "nas (10.0.20.4)", "phone-guest (10.0.50.9)"];
const DST: [string, Proto, number, string][] = [["cdn.video.example", "tcp", 443, "Streaming"], ["api.cloud.example", "tcp", 443, "Cloud API"], ["dns.example (1.1.1.1)", "udp", 53, "DNS"], ["ntp.example", "udp", 123, "NTP"], ["backup.offsite.example", "tcp", 22, "SSH"], ["gateway (10.0.0.1)", "icmp", 0, "Ping"], ["ads.tracker.example", "tcp", 443, "Tracking"]];
export const FLOWS: Flow[] = Array.from({ length: 40 }, (_, i) => {
  const [dst, proto, port, app] = DST[(i * 3 + (i >> 2)) % DST.length]; const src = SRC[(i * 5 + (i >> 3)) % SRC.length];
  const bytes = proto === "icmp" ? 800 + i * 40 : proto === "udp" ? 4_000 + ((i * 7919) % 90_000) : 120_000 + ((i * 104729) % 9_000_000);
  return { id: `f${i + 1}`, src, dst, proto, port, app, bytes, packets: Math.round(bytes / (proto === "tcp" ? 900 : 120)), action: dst.startsWith("ads.") ? "block" : "allow" };
});
export type Filters = { proto: Proto | "all"; minBytes: number; q: string; action: "all" | "allow" | "block" };
export const applyFilters = (flows: Flow[], f: Filters) => flows.filter((x) => (f.proto === "all" || x.proto === f.proto) && x.bytes >= f.minBytes && (f.action === "all" || x.action === f.action) && (!f.q || `${x.src} ${x.dst} ${x.app}`.toLowerCase().includes(f.q.toLowerCase())));
export type SNode = { name: string; side: "l" | "r"; total: number; y: number; h: number };
export type SLink = { src: string; dst: string; bytes: number; flows: number; sy: number; dy: number; w: number; proto: Proto };
/** Two-column Sankey layout. Heights are bytes scaled to fit `height`; links stack inside their nodes. */
export function sankey(flows: Flow[], height: number, gap = 8): { left: SNode[]; right: SNode[]; links: SLink[] } {
  const pair = new Map<string, { src: string; dst: string; bytes: number; flows: number; proto: Proto }>();
  for (const f of flows) { const k = `${f.src}>${f.dst}`; const c = pair.get(k); if (c) { c.bytes += f.bytes; c.flows++; } else pair.set(k, { src: f.src, dst: f.dst, bytes: f.bytes, flows: 1, proto: f.proto }); }
  const tot = (side: "src" | "dst") => { const m = new Map<string, number>(); for (const p of pair.values()) m.set(p[side], (m.get(p[side]) ?? 0) + p.bytes); return [...m].sort((a, b) => b[1] - a[1]); };
  const L = tot("src"), R = tot("dst"); const sum = L.reduce((s, x) => s + x[1], 0) || 1;
  const usable = (n: number) => Math.max(1, height - gap * (n - 1)); const k = Math.min(usable(L.length), usable(R.length)) / sum;
  const place = (list: [string, number][], side: "l" | "r") => { let y = 0; return list.map(([name, total]) => { const n: SNode = { name, side, total, y, h: Math.max(4, total * k) }; y += n.h + gap; return n; }); };
  const left = place(L, "l"), right = place(R, "r"); const lo = new Map<string, number>(), ro = new Map<string, number>();
  const links = [...pair.values()].sort((a, b) => b.bytes - a.bytes).map((p) => {
    const a = left.find((n) => n.name === p.src)!, b = right.find((n) => n.name === p.dst)!; const w = Math.max(1, p.bytes * k);
    const sy = a.y + (lo.get(a.name) ?? 0), dy = b.y + (ro.get(b.name) ?? 0); lo.set(a.name, (lo.get(a.name) ?? 0) + w); ro.set(b.name, (ro.get(b.name) ?? 0) + w);
    return { src: p.src, dst: p.dst, bytes: p.bytes, flows: p.flows, sy, dy, w, proto: p.proto };
  });
  return { left, right, links };
}
