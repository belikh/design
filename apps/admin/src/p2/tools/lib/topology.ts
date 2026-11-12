export type NodeKind = "internet" | "gateway" | "switch" | "ap" | "server" | "nas" | "camera" | "iot" | "client";
export type TNode = { id: string; label: string; kind: NodeKind; x: number; y: number; vlan: number; ip: string; status: "up" | "warn" | "down" };
export type TEdge = { a: string; b: string; medium: "fibre" | "ethernet" | "wifi"; mbps: number; util: number };
export const VLANS: Record<number, string> = { 1: "Main", 10: "Servers", 20: "IoT", 30: "Cameras", 99: "WAN" };
export const NODES: TNode[] = [
  { id: "wan", label: "Internet", kind: "internet", x: 480, y: 30, vlan: 99, ip: "—", status: "up" }, { id: "udm", label: "UDM Pro", kind: "gateway", x: 480, y: 120, vlan: 1, ip: "10.1.1.1", status: "up" },
  { id: "core", label: "Core switch", kind: "switch", x: 480, y: 215, vlan: 1, ip: "10.1.1.2", status: "up" }, { id: "sw-lab", label: "Lab switch", kind: "switch", x: 220, y: 215, vlan: 10, ip: "10.1.10.2", status: "up" }, { id: "sw-cam", label: "Camera switch", kind: "switch", x: 740, y: 215, vlan: 30, ip: "10.1.30.2", status: "warn" },
  { id: "ap-liv", label: "AP living", kind: "ap", x: 400, y: 320, vlan: 1, ip: "10.1.1.11", status: "up" }, { id: "ap-off", label: "AP office", kind: "ap", x: 520, y: 320, vlan: 1, ip: "10.1.1.12", status: "up" }, { id: "ap-gar", label: "AP garage", kind: "ap", x: 640, y: 320, vlan: 1, ip: "10.1.1.13", status: "warn" },
  { id: "api", label: "jupiter-api", kind: "server", x: 120, y: 320, vlan: 10, ip: "10.1.10.20", status: "up" }, { id: "media", label: "media-archive", kind: "server", x: 240, y: 320, vlan: 10, ip: "10.1.10.21", status: "warn" }, { id: "nas", label: "NAS (tank)", kind: "nas", x: 340, y: 405, vlan: 10, ip: "10.1.10.30", status: "up" },
  { id: "pxe", label: "pxe-boot", kind: "server", x: 140, y: 405, vlan: 10, ip: "10.1.10.40", status: "down" }, { id: "cam1", label: "Cam driveway", kind: "camera", x: 720, y: 320, vlan: 30, ip: "10.1.30.11", status: "up" }, { id: "cam2", label: "Cam door", kind: "camera", x: 820, y: 320, vlan: 30, ip: "10.1.30.12", status: "up" },
  { id: "tv", label: "LG TV", kind: "iot", x: 380, y: 405, vlan: 20, ip: "10.1.20.51", status: "up" }, { id: "esp", label: "ESP32 sensors", kind: "iot", x: 520, y: 405, vlan: 20, ip: "10.1.20.60", status: "up" }, { id: "ws", label: "Workstation", kind: "client", x: 640, y: 405, vlan: 1, ip: "10.1.1.124", status: "up" },
];
export const EDGES: TEdge[] = [
  { a: "wan", b: "udm", medium: "fibre", mbps: 1000, util: 0.34 }, { a: "udm", b: "core", medium: "fibre", mbps: 10000, util: 0.12 }, { a: "core", b: "sw-lab", medium: "ethernet", mbps: 2500, util: 0.41 }, { a: "core", b: "sw-cam", medium: "ethernet", mbps: 1000, util: 0.86 },
  { a: "core", b: "ap-liv", medium: "ethernet", mbps: 1000, util: 0.18 }, { a: "core", b: "ap-off", medium: "ethernet", mbps: 1000, util: 0.09 }, { a: "core", b: "ap-gar", medium: "ethernet", mbps: 1000, util: 0.22 }, { a: "sw-lab", b: "api", medium: "ethernet", mbps: 2500, util: 0.27 },
  { a: "sw-lab", b: "media", medium: "ethernet", mbps: 2500, util: 0.63 }, { a: "sw-lab", b: "nas", medium: "ethernet", mbps: 10000, util: 0.55 }, { a: "sw-lab", b: "pxe", medium: "ethernet", mbps: 1000, util: 0 }, { a: "sw-cam", b: "cam1", medium: "ethernet", mbps: 100, util: 0.7 }, { a: "sw-cam", b: "cam2", medium: "ethernet", mbps: 100, util: 0.66 },
  { a: "ap-liv", b: "tv", medium: "wifi", mbps: 866, util: 0.3 }, { a: "ap-off", b: "esp", medium: "wifi", mbps: 72, util: 0.05 }, { a: "ap-off", b: "ws", medium: "wifi", mbps: 1200, util: 0.2 },
];
export const neighbors = (id: string, edges = EDGES) => edges.flatMap((e) => (e.a === id ? [e.b] : e.b === id ? [e.a] : []));
/** Shortest hop path (BFS). `avoidDown` skips nodes whose status is "down" except the endpoints. */
export function shortestPath(from: string, to: string, opts: { avoidDown?: boolean; nodes?: TNode[]; edges?: TEdge[] } = {}): string[] | null {
  const nodes = opts.nodes ?? NODES, edges = opts.edges ?? EDGES; const status = new Map(nodes.map((n) => [n.id, n.status])); if (!status.has(from) || !status.has(to)) return null;
  const prev = new Map<string, string | null>([[from, null]]); const q = [from];
  while (q.length) { const c = q.shift()!; if (c === to) break; for (const n of neighbors(c, edges)) { if (prev.has(n)) continue; if (opts.avoidDown && status.get(n) === "down" && n !== to) continue; prev.set(n, c); q.push(n); } }
  if (!prev.has(to)) return null; const path: string[] = []; for (let c: string | null = to; c; c = prev.get(c) ?? null) path.unshift(c); return path;
}
export const pathEdges = (path: string[]) => path.slice(1).map((n, i) => [path[i], n] as const);
export const edgeBetween = (a: string, b: string, edges = EDGES) => edges.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));
export const bottleneck = (path: string[]) => pathEdges(path).map(([a, b]) => edgeBetween(a, b)!).reduce<TEdge | null>((m, e) => (!m || e.mbps * (1 - e.util) < m.mbps * (1 - m.util) ? e : m), null);
