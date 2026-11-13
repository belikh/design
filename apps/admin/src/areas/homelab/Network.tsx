import { useState } from "react";
import { PageHeader, Panel, Tabs, Badge, Btn, Alert } from "@belikh/jupiter-ui/kit.tsx";
import { StatTile } from "@belikh/jupiter-ui/Charts.tsx";
import type { Col } from "@belikh/jupiter-ui/DataTable.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { useStore, Sheet, opts, IPV4, type Row } from "./lib.tsx";
import { SPECTRUM_24 } from "./network.data.ts";
import { SPECTRUM } from "./network.spectrum.ts";
import { DEVICES, CLIENTS, VLANS, RULES, LEASES, PEERS, RADIOS, layout, shadowed, leaseProblems, peerState, validCidr, type Dev, type Client, type Vlan, type Rule, type Lease, type Peer, type Radio } from "./network.data.ts";
import { Spectrum } from "./NetworkSpectrum.tsx";
import { Connect, VpnImport, type Live } from "./NetworkLive.tsx";
import { radioProblem, isDfs, channelPlan, type Band, type Width } from "./network.spectrum.ts";
import { dropStores } from "./lib.tsx";

const stat = (s: Dev["status"]) => (s === "online" ? "ok" : s === "updating" ? "warn" : "danger") as "ok" | "warn" | "danger";

function Topology({ devs, clients, sel, onSel }: { devs: Dev[]; clients: Client[]; sel: string; onSel: (id: string) => void }) {
  const { pos, leaves } = layout(devs); const W = Math.max(560, leaves * 150), H = 330; const X = (x: number) => 80 + x * ((W - 160) / Math.max(leaves - 1, 1)); const Y = (d: number) => 40 + d * 90;
  return (
    <svg className="hg-svg" viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Network topology">
      {devs.filter((d) => d.uplink && pos[d.id] && pos[d.uplink]).map((d) => <path key={d.id} className={`hg-link${sel === d.id || sel === d.uplink ? " hg-link-on" : ""}`} d={`M${X(pos[d.uplink].x)} ${Y(pos[d.uplink].y) + 20} V${(Y(pos[d.uplink].y) + Y(pos[d.id].y)) / 2} H${X(pos[d.id].x)} V${Y(pos[d.id].y) - 20}`} />)}
      {devs.filter((d) => pos[d.id]).map((d) => { const p = pos[d.id]; const n = clients.filter((c) => c.via === d.id).length; const s = stat(d.status);
        return (<g key={d.id} className={`hg-node${sel === d.id ? " is-sel" : ""}${s === "ok" ? "" : ` is-${s}`}`} role="button" tabIndex={0} aria-label={`${d.name}, ${d.kind}, ${d.status}, ${n} clients`} aria-pressed={sel === d.id} onClick={() => onSel(d.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSel(d.id); } }}>
          <rect x={X(p.x) - 62} y={Y(p.y) - 20} width={124} height={40} rx={6} /><text x={X(p.x)} y={Y(p.y) - 3} textAnchor="middle">{d.name.length > 16 ? d.name.slice(0, 15) + "…" : d.name}</text><text className="hg-dim" x={X(p.x)} y={Y(p.y) + 12} textAnchor="middle">{d.kind} · {n} cl</text></g>); })}
    </svg>
  );
}

export function Network() {
  const [tab, setTab] = useState("topology"); const { toast } = usePrefs(); const [sel, setSel] = useState("d-gw");
  const [live, setLive] = useState<Live | null>(null); const k = live ? `net-live${live.gen}` : "net"; const L = live?.snap; const ro = !!live;
  const devs = useStore(`${k}-dev`, () => L?.devices ?? DEVICES()), clients = useStore(`${k}-cl`, () => L?.clients ?? CLIENTS()), vlans = useStore(`${k}-vlan`, () => L?.vlans ?? VLANS()), rules = useStore(`${k}-rule`, () => L?.rules ?? RULES()), leases = useStore(`${k}-lease`, () => L?.leases ?? LEASES()), peers = useStore(`${k}-peer`, () => L?.peers ?? PEERS()), radios = useStore(`${k}-radio`, () => L?.radios ?? RADIOS());
  const spectrum = L?.spectrum ?? { "2.4 GHz": SPECTRUM_24, ...SPECTRUM };
  /** Live data is read-only: strip the editors so cells cannot be changed. */
  const rd = <T extends Row>(cols: Col<T>[]): Col<T>[] => (ro ? cols.map((c) => ({ ...c, editor: undefined })) : cols);
  const disconnect = () => { dropStores("net-live"); setLive(null); setSel("d-gw"); };
  const shadow = shadowed(rules.rows), lp = leaseProblems(leases.rows, vlans.rows); const d = devs.rows.find((x) => x.id === sel);
  const devCols: Col<Dev>[] = [
    { key: "name", header: "Name", width: 180, editor: { type: "text", maxLength: 40 }, validate: (v) => (String(v).trim() ? null : "A name is required") }, { key: "kind", header: "Kind", width: 110 }, { key: "model", header: "Model", width: 150 },
    { key: "ip", header: "IP", width: 130, editor: { type: "text" }, validate: (v) => (IPV4.test(String(v)) ? null : "Enter an IPv4 address") },
    { key: "status", header: "Status", width: 110, render: (r) => <Badge s={stat(r.status)}>{r.status}</Badge> }, { key: "firmware", header: "Firmware", width: 110 }, { key: "uptimeDays", header: "Uptime (d)", width: 100, align: "right" },
  ];
  const clCols: Col<Client>[] = [
    { key: "name", header: "Client", width: 170, editor: { type: "text", maxLength: 40 } }, { key: "conn", header: "Link", width: 90 }, { key: "vlan", header: "VLAN", width: 80, align: "right", editor: { type: "select", options: opts("10", "20", "30", "40") }, value: (r) => String(r.vlan) },
    { key: "ip", header: "IP", width: 130 }, { key: "signal", header: "Signal (dBm)", width: 110, align: "right", value: (r) => (r.conn === "Wired" ? "wired" : r.signal) }, { key: "mbps", header: "Link Mbps", width: 100, align: "right" },
    { key: "blocked", header: "Blocked", width: 100, editor: { type: "boolean" }, value: (r) => (r.blocked ? "Yes" : "No") },
  ];
  const vlCols: Col<Vlan>[] = [
    { key: "vid", header: "VLAN ID", width: 90, align: "right", editor: { type: "number", min: 1, max: 4094 } }, { key: "name", header: "Name", width: 130, editor: { type: "text" } },
    { key: "subnet", header: "Subnet", width: 150, editor: { type: "text" }, validate: (v) => (validCidr(String(v)) ? null : "Use CIDR, e.g. 10.0.50.0/24") },
    { key: "gateway", header: "Gateway", width: 130, editor: { type: "text" }, validate: (v) => (IPV4.test(String(v)) ? null : "Enter an IPv4 address") },
    { key: "purpose", header: "Purpose", width: 130, editor: { type: "select", options: opts("Trusted", "IoT", "Guest", "Lab", "Management") } }, { key: "dhcp", header: "DHCP", width: 80, editor: { type: "boolean" }, value: (r) => (r.dhcp ? "On" : "Off") }, { key: "isolated", header: "Isolated", width: 90, editor: { type: "boolean" }, value: (r) => (r.isolated ? "Yes" : "No") },
  ];
  const zones = opts("any", "Lab", "Home", "IoT", "Guest", "Management");
  const ruleCols: Col<Rule>[] = [
    { key: "order", header: "#", width: 60, align: "right", editor: { type: "number", min: 1, max: 999 } }, { key: "name", header: "Rule", width: 210, editor: { type: "text" } }, { key: "from", header: "From", width: 110, editor: { type: "select", options: zones } }, { key: "to", header: "To", width: 110, editor: { type: "select", options: zones } },
    { key: "action", header: "Action", width: 100, editor: { type: "select", options: [{ value: "Allow", label: "Allow", s: "ok" }, { value: "Block", label: "Block", s: "danger" }, { value: "Reject", label: "Reject", s: "warn" }] } },
    { key: "proto", header: "Proto", width: 90, editor: { type: "select", options: opts("any", "tcp", "udp", "icmp") } }, { key: "port", header: "Port", width: 90, editor: { type: "text" } }, { key: "enabled", header: "On", width: 70, editor: { type: "boolean" }, value: (r) => (r.enabled ? "Yes" : "No") },
    { key: "hits", header: "Hits", width: 100, align: "right", fmt: (v) => Number(v).toLocaleString("en-AU") }, { key: "note", header: "Check", width: 190, render: (r) => (shadow[r.id] ? <Badge s="warn">{`Shadowed by ${shadow[r.id]}`}</Badge> : <span className="hg-muted">ok</span>), value: (r) => shadow[r.id] ?? "" },
  ];
  const leaseCols: Col<Lease>[] = [
    { key: "host", header: "Host", width: 150, editor: { type: "text" } }, { key: "ip", header: "IP", width: 130, editor: { type: "text" }, validate: (v) => (IPV4.test(String(v)) ? null : "Enter an IPv4 address") }, { key: "mac", header: "MAC", width: 160 },
    { key: "vlan", header: "VLAN", width: 80, align: "right" }, { key: "kind", header: "Type", width: 110, editor: { type: "select", options: opts("Static", "Dynamic") } }, { key: "expires", header: "Expires", width: 120, editor: { type: "date" } },
    { key: "problem", header: "Check", width: 200, render: (r) => (lp[r.id] ? <Badge s="danger">{lp[r.id]}</Badge> : <span className="hg-muted">ok</span>), value: (r) => lp[r.id] ?? "" },
  ];
  const peerCols: Col<Peer>[] = [
    { key: "name", header: "Peer", width: 190, editor: { type: "text" } }, { key: "kind", header: "Kind", width: 110 }, { key: "address", header: "Address", width: 130 }, { key: "endpoint", header: "Endpoint", width: 180 },
    { key: "state", header: "State", width: 120, render: (r) => { const s = peerState(r); return <Badge s={s === "connected" ? "ok" : s === "stale" ? "warn" : "info"}>{s}</Badge>; }, value: (r) => peerState(r) },
    { key: "handshakeMin", header: "Handshake", width: 110, value: (r) => (r.kind === "Tailscale" ? "n/a" : r.handshakeMin >= 60 ? `${Math.round(r.handshakeMin / 60)} h ago` : `${r.handshakeMin} min ago`) }, { key: "rxMb", header: "Rx MB", width: 90, align: "right" }, { key: "txMb", header: "Tx MB", width: 90, align: "right" },
    { key: "enabled", header: "Enabled", width: 90, editor: { type: "boolean" }, value: (r) => (r.enabled ? "Yes" : "No") },
  ];
  const radioCols: Col<Radio>[] = [
    { key: "ap", header: "Access point", width: 150 }, { key: "band", header: "Band", width: 100 },
    { key: "channel", header: "Channel", width: 100, align: "right", editor: { type: "number", min: 1, max: 233 }, validate: (v, r) => radioProblem(r.band as Band, Number(v), r.width as Width) },
    { key: "width", header: "Width (MHz)", width: 110, align: "right", editor: { type: "select", options: opts("20", "40", "80", "160") }, value: (r) => String(r.width), validate: (v, r) => radioProblem(r.band as Band, r.channel, Number(v) as Width) }, { key: "power", header: "Tx power", width: 110, editor: { type: "select", options: opts("Low", "Medium", "High") } },
    { key: "dfs", header: "DFS", width: 110, render: (r) => (channelPlan(r.band as Band, r.width as Width).find((b) => b.channels.includes(r.channel))?.dfs || isDfs(r.band as Band, r.channel) ? <Badge s="warn">DFS</Badge> : <span className="hg-muted">no</span>), value: (r) => (isDfs(r.band as Band, r.channel) ? "DFS" : "no") },
  ];
  const downDevs = devs.rows.filter((x) => x.status !== "online").length, conflicts = Object.keys(lp).length, shadows = Object.keys(shadow).length;
  return (
    <>
      <PageHeader title="Network" crumbs={["Home lab", "Network"]} desc={ro ? `${L?.origin}. Read-only: nothing here changes the controller.` : "Sample UniFi site (fictional data): topology, devices and clients, VLANs, firewall rules, DHCP leases, VPN peers and 2.4, 5 and 6 GHz channels. Edit cells in place, or connect a controller on the Data source tab."}
        status={<>{<Badge s={ro ? "ok" : "info"}>{ro ? "Live data (read-only)" : "Sample data"}</Badge>}{downDevs ? <Badge s="warn">{downDevs} devices need attention</Badge> : <Badge s="ok">all devices online</Badge>}</>}
        tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: "topology", label: "Topology" }, { id: "devices", label: "Devices and clients" }, { id: "vlans", label: "VLANs", count: vlans.rows.length }, { id: "firewall", label: "Firewall", count: rules.rows.length }, { id: "dhcp", label: "DHCP leases", count: leases.rows.length }, { id: "vpn", label: "VPN" }, { id: "wifi", label: "Wi-Fi" }, { id: "source", label: "Data source" }]} />} />
      <div className="adm-grid adm-grid--4"><StatTile label="Devices online" value={`${devs.rows.filter((x) => x.status === "online").length}/${devs.rows.length}`} /><StatTile label="Clients" value={String(clients.rows.length)} sub={`${clients.rows.filter((c) => c.blocked).length} blocked`} /><StatTile label="Firewall shadowed" value={String(shadows)} invert /><StatTile label="Lease problems" value={String(conflicts)} invert /></div>
      <div className="adm-section">
        {tab === "topology" && <div className="hg-split"><Panel title="Uplink tree"><Topology devs={devs.rows} clients={clients.rows} sel={sel} onSel={setSel} /></Panel>
          <Panel title={d?.name ?? "Select a device"}>{d ? <dl className="hg-kv"><dt>Kind</dt><dd>{d.kind}</dd><dt>Model</dt><dd>{d.model}</dd><dt>IP</dt><dd className="hg-num">{d.ip}</dd><dt>Status</dt><dd><Badge s={stat(d.status)}>{d.status}</Badge></dd><dt>Firmware</dt><dd className="hg-num">{d.firmware}</dd><dt>Clients</dt><dd>{clients.rows.filter((c) => c.via === d.id).map((c) => c.name).join(", ") || "none"}</dd></dl> : null}
            {d && <div className="hg-row" style={{ marginBlockStart: "var(--jp-space-3)" }}><Btn sm disabled={d.status === "updating" || ro} title={ro ? "Read-only: live data cannot be changed from here" : undefined} onClick={() => { devs.patch(d.id, { status: "updating" }); toast({ kind: "info", title: `Restarting ${d.name}` }); }}>Restart</Btn></div>}</Panel></div>}
        {tab === "devices" && <div className="adm-stack"><Sheet t={devs} title="Devices" cols={rd(devCols)} name="devices" /><Sheet t={clients} title="Clients" cols={rd(clCols)} name="clients" facet={{ key: "conn", label: "Link", options: [{ value: "Wired" }, { value: "Wi-Fi" }] }} /></div>}
        {tab === "vlans" && <Sheet t={vlans} title="VLANs" cols={rd(vlCols)} name="vlans" blank={ro ? undefined : { vid: 50, name: "New VLAN", subnet: "10.0.50.0/24", gateway: "10.0.50.1", dhcp: true, purpose: "Lab", isolated: false }} />}
        {tab === "firewall" && <div className="adm-stack">{shadows > 0 && <Alert s="warn" title={`${shadows} rule${shadows > 1 ? "s" : ""} can never match`}>An earlier enabled rule already covers the same traffic. Reorder or remove it.</Alert>}<Sheet t={rules} title="Firewall rules (evaluated by order)" cols={rd(ruleCols)} name="firewall-rules" blank={ro ? undefined : { order: 99, name: "New rule", from: "any", to: "any", action: "Block", proto: "any", port: "any", enabled: false, hits: 0 }} /></div>}
        {tab === "dhcp" && <div className="adm-stack">{conflicts > 0 && <Alert s="danger" title={`${conflicts} lease problem${conflicts > 1 ? "s" : ""}`}>{Object.values(lp).join(" · ")}</Alert>}<Sheet t={leases} title="DHCP leases and reservations" cols={rd(leaseCols)} name="dhcp-leases" /></div>}
        {tab === "vpn" && <div className="adm-stack"><Sheet t={peers} title="VPN peers (WireGuard and Tailscale)" cols={peerCols} name="vpn-peers" /><VpnImport peers={peers} /></div>}
        {tab === "source" && <Connect live={live} onLive={(l) => { if (live) dropStores(`net-live${live.gen}`); setLive(l); setSel(l.snap.devices.find((x) => x.kind === "Gateway")?.id ?? l.snap.devices[0]?.id ?? ""); }} onDisconnect={disconnect} />}
        {tab === "wifi" && <div className="adm-stack"><Spectrum radios={radios} spectrum={spectrum} readOnly={ro} /><Sheet t={radios} title="Radios" cols={rd(radioCols)} name="radios" /></div>}
      </div>
    </>
  );
}
