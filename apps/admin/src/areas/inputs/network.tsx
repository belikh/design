import { useMemo, useState } from "react";
import { Field, TextInput, TextArea, Select } from "@belikh/jupiter-ui/inputs.tsx";
import { Btn, Badge } from "@belikh/jupiter-ui/kit.tsx";
import { classifyIpv4, cidrContains, dnsIssue, formatPorts, fwRuleIssues, hostnameIssue, intToIpv4, ipv4ToInt, ipv6Valid, isCidr, normaliseMac, parseCidr, parsePorts, pfIssues, portsOverlap, prefixForHosts, shadowed, splitSubnet, vlanIssue, vlsm, type DnsType, type FwRule, type PfRule } from "./logic-net.ts";
import { demoEd25519, parseSshKey } from "./logic-text.ts";
import "./in2.css";

let k = 0; const nid = (p: string) => `${p}${++k}`;
const lvl = (l: "error" | "warn" | "ok") => (l === "error" ? "in2-bad" : l === "warn" ? "in2-warn" : "in2-ok");

/* ---------- IP / CIDR / MAC / hostname / VLAN fields ---------- */
function NetInput({ label, value, onChange, check, hint, placeholder }: { label: string; value: string; onChange: (v: string) => void; check: (v: string) => { level: "error" | "warn" | "ok"; msg: string } | null; hint?: string; placeholder?: string }) {
  const r = value.trim() ? check(value) : null;
  return <Field label={label} hint={hint} error={r?.level === "error" ? r.msg : undefined}>{(id, d) => <div className="in2-stack" style={{ gap: 4 }}><TextInput id={id} aria-describedby={d} className="in2-mono" placeholder={placeholder} value={value} onChange={onChange} state={r?.level === "error" ? "error" : r?.level === "ok" ? "success" : undefined} />{r && r.level !== "error" && <span className={lvl(r.level)} role="status" style={{ fontSize: "var(--jp-fs-xs)" }}>{r.msg}</span>}</div>}</Field>;
}
export function NetworkFields() {
  const [ip, setIp] = useState("192.168.10.25"); const [cidr, setCidr] = useState("10.20.0.0/22"); const [mac, setMac] = useState("00-1A-2b-3c-4D-5e"); const [host, setHost] = useState("gateway.office.example.com"); const [vlan, setVlan] = useState("120"); const [v6, setV6] = useState("2001:db8::1");
  return (
    <div className="in2-grid">
      <NetInput label="IPv4 address" value={ip} onChange={setIp} placeholder="192.168.1.10" check={(v) => { const n = ipv4ToInt(v); return n === null ? { level: "error", msg: "Four numbers from 0 to 255, like 192.168.1.10" } : { level: classifyIpv4(n) === "reserved" ? "warn" : "ok", msg: `${classifyIpv4(n)} address` }; }} />
      <NetInput label="IPv6 address" value={v6} onChange={setV6} check={(v) => (ipv6Valid(v) ? { level: "ok", msg: "Valid IPv6" } : { level: "error", msg: "Not a valid IPv6 address" })} />
      <NetInput label="Network (CIDR)" value={cidr} onChange={setCidr} hint="Address and prefix length" check={(v) => { const c = parseCidr(v); return isCidr(c) ? { level: c.hostBitsSet ? "warn" : "ok", msg: c.hostBitsSet ? `Host bits set: network is ${c.normalised}` : `${c.hosts.toLocaleString()} usable hosts, ${intToIpv4(c.first)} to ${intToIpv4(c.last)}` } : { level: "error", msg: c.error }; }} />
      <NetInput label="MAC address" value={mac} onChange={setMac} hint="Any common format is accepted" check={(v) => { const m = normaliseMac(v); return m.ok ? { level: "ok", msg: `${m.mac}${m.kind ? ` · ${m.kind}` : ""}` } : { level: "error", msg: "A MAC has 12 hex digits, like 00:1a:2b:3c:4d:5e" }; }} />
      <NetInput label="Hostname" value={host} onChange={setHost} check={(v) => { const e = hostnameIssue(v); return e ? { level: "error", msg: e } : { level: "ok", msg: "Valid hostname" }; }} />
      <NetInput label="VLAN ID" value={vlan} onChange={setVlan} check={(v) => vlanIssue(v)} />
    </div>
  );
}

/* ---------- port range ---------- */
export function PortRangeField() {
  const [a, setA] = useState("80, 443, 8000-8100"); const [b, setB] = useState("8080-8090"); const pa = parsePorts(a, 2000), pb = parsePorts(b, 2000); const clash = !pa.error && !pb.error && portsOverlap(pa.ranges, pb.ranges);
  return (
    <div className="in2-stack">
      <Field label="Allowed ports" hint="Single ports, lists and ranges" error={a.trim() ? pa.error : undefined}>{(id, d) => <TextInput id={id} aria-describedby={d} className="in2-mono" value={a} onChange={setA} state={a.trim() && pa.error ? "error" : undefined} />}</Field>
      {!pa.error && a.trim() && <span className="in2-ok" role="status">{pa.count.toLocaleString()} ports: {formatPorts(pa.ranges)}</span>}
      <Field label="Reserved ports (for overlap check)" error={b.trim() ? pb.error : undefined}>{(id, d) => <TextInput id={id} aria-describedby={d} className="in2-mono" value={b} onChange={setB} state={b.trim() && pb.error ? "error" : undefined} />}</Field>
      {!pb.error && !pa.error && <span className={clash ? "in2-warn" : "in2-ok"} role="status">{clash ? "These sets overlap" : "No overlap"}</span>}
    </div>
  );
}

/* ---------- subnet calculator ---------- */
const bits = (n: number) => n.toString(2).padStart(32, "0");
export function SubnetCalculator() {
  const [text, setText] = useState("10.20.4.0/22"); const [probe, setProbe] = useState("10.20.5.77"); const [split, setSplit] = useState(24); const [needs, setNeeds] = useState([{ id: "n1", name: "Servers", hosts: "100" }, { id: "n2", name: "Staff", hosts: "250" }, { id: "n3", name: "IoT", hosts: "40" }, { id: "n4", name: "Guests", hosts: "60" }]);
  const c = parseCidr(text); const ok = isCidr(c); const pi = ipv4ToInt(probe); const plan = ok ? vlsm(c, needs.map((n) => ({ name: n.name || "?", hosts: Number(n.hosts) || 1 }))) : null;
  const rows: [string, string][] = ok ? [["Network", intToIpv4(c.network)], ["Broadcast", intToIpv4(c.broadcast)], ["Netmask", intToIpv4(c.mask)], ["Wildcard", intToIpv4(c.wildcard)], ["First host", intToIpv4(c.first)], ["Last host", intToIpv4(c.last)], ["Usable hosts", c.hosts.toLocaleString()]] : [];
  const subs = ok ? splitSubnet(c, split, 16) : [];
  return (
    <div className="in2-stack">
      <Field label="Network (CIDR)" error={!ok ? c.error : undefined}>{(id, d) => <TextInput id={id} aria-describedby={d} className="in2-mono" value={text} onChange={setText} state={!ok ? "error" : undefined} />}</Field>
      {ok && <>
        <div className="in2-bitrow" role="img" aria-label={`${c.prefix} network bits then ${32 - c.prefix} host bits`}>{bits(c.network).split("").map((b, i) => <i key={i} className={i < c.prefix ? "is-net" : ""} title={`bit ${i}: ${b}`} />)}</div><span className="in2-note">{c.prefix} network bits (accent) · {32 - c.prefix} host bits</span>
        <dl className="in2-help" style={{ margin: 0 }}>{rows.map(([a, b]) => <div key={a}><dt className="in2-note">{a}</dt><dd className="in2-mono" style={{ margin: 0 }}>{b}</dd></div>)}</dl>
        {c.hostBitsSet && <span className="in2-warn" role="status">You entered a host address; the network is {c.normalised}</span>}
        <div className="in2-row"><Field label="Is this address inside?">{(id) => <TextInput id={id} className="in2-mono" value={probe} onChange={setProbe} />}</Field><span role="status" className={pi === null ? "in2-bad" : cidrContains(c, pi) ? "in2-ok" : "in2-warn"}>{pi === null ? "Not an IPv4 address" : cidrContains(c, pi) ? "Yes, inside" : "No, outside"}</span></div>
        <div className="in2-row"><Field label="Split into">{(id) => <Select id={id} value={String(split)} onChange={(v) => setSplit(Number(v))} options={Array.from({ length: Math.max(0, 30 - c.prefix) }, (_, i) => c.prefix + 1 + i).map((p) => ({ value: String(p), label: `/${p}  (${2 ** (p - c.prefix)} subnets)` }))} />}</Field></div>
        {subs.length > 0 && <div className="in2-row">{subs.map((s) => <span key={s} className="in2-pill in2-mono">{s}</span>)}{2 ** (split - c.prefix) > 16 && <span className="in2-note">+ {2 ** (split - c.prefix) - 16} more</span>}</div>}
        <div className="in2-box in2-stack"><b>Plan subnets by host count (VLSM)</b>
          {needs.map((n, i) => <div key={n.id} className="in2-row"><input className="jp-input" style={{ width: 130 }} aria-label={`Segment ${i + 1} name`} value={n.name} onChange={(e) => setNeeds(needs.map((x) => (x.id === n.id ? { ...x, name: e.target.value } : x)))} /><input className="jp-input" style={{ width: 90 }} type="number" min={1} aria-label={`Segment ${i + 1} hosts`} value={n.hosts} onChange={(e) => setNeeds(needs.map((x) => (x.id === n.id ? { ...x, hosts: e.target.value } : x)))} /><span className="in2-note">needs /{prefixForHosts(Number(n.hosts) || 1)}</span><Btn sm variant="ghost" aria-label={`Remove segment ${i + 1}`} onClick={() => setNeeds(needs.filter((x) => x.id !== n.id))}>×</Btn></div>)}
          <div className="in2-row"><Btn sm icon="plus" onClick={() => setNeeds([...needs, { id: nid("n"), name: `Segment ${needs.length + 1}`, hosts: "10" }])}>Add segment</Btn></div>
          {plan && ("error" in plan ? <span role="alert" className="in2-bad">{plan.error}</span> : <table className="in2-tz" aria-label="Subnet plan"><thead><tr><th>Segment</th><th>Subnet</th><th>Usable</th><th>Needed</th></tr></thead><tbody>{plan.map((p) => <tr key={p.name + p.cidr}><td>{p.name}</td><td className="in2-mono">{p.cidr}</td><td>{p.usable}</td><td>{p.hosts}</td></tr>)}</tbody></table>)}</div></>}
    </div>
  );
}

/* ---------- firewall rules ---------- */
const FW0: FwRule[] = [{ id: "r1", action: "allow", proto: "tcp", src: "10.20.0.0/16", dst: "any", ports: "443", comment: "Internal HTTPS" }, { id: "r2", action: "deny", proto: "tcp", src: "any", dst: "10.20.5.0/24", ports: "22", comment: "Block SSH to servers" }, { id: "r3", action: "allow", proto: "tcp", src: "10.20.1.0/24", dst: "any", ports: "443", comment: "Staff HTTPS (redundant)" }, { id: "r4", action: "deny", proto: "any", src: "any", dst: "any", ports: "", comment: "Default deny" }];
export function FirewallRules() {
  const [rules, setRules] = useState<FwRule[]>(FW0); const sh = useMemo(() => shadowed(rules), [rules]); const upd = (id: string, p: Partial<FwRule>) => setRules(rules.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const mv = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= rules.length) return; const n = [...rules]; [n[i], n[j]] = [n[j], n[i]]; setRules(n); };
  const ix = (id: string) => rules.findIndex((r) => r.id === id) + 1; const total = rules.reduce((a, r) => a + fwRuleIssues(r).length + (sh[r.id] ? 1 : 0), 0);
  return (
    <div className="in2-stack">
      <div style={{ overflowX: "auto" }}><div className="in2-stack" style={{ minWidth: 720 }}>{rules.map((r, i) => { const iss = fwRuleIssues(r); return (
        <div key={r.id} className="in2-box in2-stack" role="group" aria-label={`Rule ${i + 1}`}>
          <div className="in2-rule" style={{ gridTemplateColumns: "34px 80px 80px 1fr 1fr 110px auto" }}><b>{i + 1}</b>
            <Select aria-label={`Rule ${i + 1} action`} value={r.action} onChange={(v) => upd(r.id, { action: v as FwRule["action"] })} options={[{ value: "allow", label: "Allow" }, { value: "deny", label: "Deny" }]} />
            <Select aria-label={`Rule ${i + 1} protocol`} value={r.proto} onChange={(v) => upd(r.id, { proto: v as FwRule["proto"] })} options={["tcp", "udp", "icmp", "any"].map((p) => ({ value: p, label: p }))} />
            <input className="jp-input in2-mono" aria-label={`Rule ${i + 1} source`} value={r.src} onChange={(e) => upd(r.id, { src: e.target.value })} /><input className="jp-input in2-mono" aria-label={`Rule ${i + 1} destination`} value={r.dst} onChange={(e) => upd(r.id, { dst: e.target.value })} /><input className="jp-input in2-mono" aria-label={`Rule ${i + 1} ports`} placeholder="any" disabled={r.proto === "icmp" || r.proto === "any"} value={r.ports} onChange={(e) => upd(r.id, { ports: e.target.value })} />
            <span className="in2-row" style={{ flexWrap: "nowrap" }}><Btn sm variant="ghost" aria-label={`Move rule ${i + 1} up`} disabled={i === 0} onClick={() => mv(i, -1)}>↑</Btn><Btn sm variant="ghost" aria-label={`Move rule ${i + 1} down`} disabled={i === rules.length - 1} onClick={() => mv(i, 1)}>↓</Btn><Btn sm variant="ghost" aria-label={`Delete rule ${i + 1}`} onClick={() => setRules(rules.filter((x) => x.id !== r.id))}>×</Btn></span></div>
          {iss.map((m) => <span key={m} role="alert" className="in2-bad">{m}</span>)}{sh[r.id] && <span className="in2-warn" role="status">Never matches: rule {ix(sh[r.id])} already covers all of this traffic</span>}</div>); })}</div></div>
      <div className="in2-row"><Btn sm icon="plus" onClick={() => setRules([...rules, { id: nid("r"), action: "allow", proto: "tcp", src: "any", dst: "any", ports: "", comment: "" }])}>Add rule</Btn><span className={total ? "in2-warn" : "in2-ok"} aria-live="polite">{total ? `${total} issue${total > 1 ? "s" : ""} to review` : "All rules valid and reachable"}</span></div>
      <span className="in2-note">Rules run top to bottom; the first match wins. Source and destination take “any”, a host or a CIDR.</span>
    </div>
  );
}

/* ---------- DNS records ---------- */
type Dns = { id: string; type: DnsType; name: string; value: string; ttl: string };
export function DnsRecords() {
  const [recs, setRecs] = useState<Dns[]>([{ id: "d1", type: "A", name: "@", value: "203.0.113.10", ttl: "300" }, { id: "d2", type: "CNAME", name: "www", value: "example.com", ttl: "300" }, { id: "d3", type: "MX", name: "@", value: "10 mail.example.com", ttl: "3600" }, { id: "d4", type: "A", name: "api", value: "203.0.113.999", ttl: "300" }]); const upd = (id: string, p: Partial<Dns>) => setRecs(recs.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const conflict = (r: Dns) => recs.some((o) => o.id !== r.id && o.name === r.name && ((o.type === "CNAME") !== (r.type === "CNAME")));
  return (
    <div className="in2-stack">{recs.map((r, i) => { const e = dnsIssue(r.type, r.name, r.value) ?? (conflict(r) ? "A name with a CNAME cannot have other record types" : null) ?? (!/^\d+$/.test(r.ttl) || +r.ttl < 60 ? "TTL must be at least 60 seconds" : null); return (
      <div key={r.id} className="in2-stack" style={{ gap: 2 }}><div className="in2-row" role="group" aria-label={`Record ${i + 1}`}><div style={{ width: 100 }}><Select aria-label={`Record ${i + 1} type`} value={r.type} onChange={(v) => upd(r.id, { type: v as DnsType })} options={["A", "AAAA", "CNAME", "TXT", "MX", "SRV"].map((t) => ({ value: t, label: t }))} /></div><input className="jp-input in2-mono" style={{ width: 110 }} aria-label={`Record ${i + 1} name`} value={r.name} onChange={(ev) => upd(r.id, { name: ev.target.value })} /><input className="jp-input in2-mono" style={{ flex: 1, minWidth: 180 }} aria-label={`Record ${i + 1} value`} aria-invalid={!!e || undefined} value={r.value} onChange={(ev) => upd(r.id, { value: ev.target.value })} /><input className="jp-input" style={{ width: 80 }} aria-label={`Record ${i + 1} TTL`} value={r.ttl} onChange={(ev) => upd(r.id, { ttl: ev.target.value })} /><Btn sm variant="ghost" aria-label={`Delete record ${i + 1}`} onClick={() => setRecs(recs.filter((x) => x.id !== r.id))}>×</Btn></div>{e && <span role="alert" className="in2-bad" style={{ fontSize: "var(--jp-fs-xs)" }}>{e}</span>}</div>); })}
      <div className="in2-row"><Btn sm icon="plus" onClick={() => setRecs([...recs, { id: nid("d"), type: "A", name: "", value: "", ttl: "300" }])}>Add record</Btn></div></div>
  );
}

/* ---------- port-forward rows ---------- */
export function PortForwards() {
  const [rows, setRows] = useState<PfRule[]>([{ id: "p1", proto: "tcp", extPort: "443", ip: "192.168.1.20", intPort: "8443", note: "Web" }, { id: "p2", proto: "tcp", extPort: "443", ip: "192.168.1.21", intPort: "", note: "Dup of 443" }, { id: "p3", proto: "udp", extPort: "51820", ip: "8.8.8.8", intPort: "", note: "WireGuard" }]); const iss = useMemo(() => pfIssues(rows), [rows]); const upd = (id: string, p: Partial<PfRule>) => setRows(rows.map((r) => (r.id === id ? { ...r, ...p } : r)));
  return (
    <div className="in2-stack"><div style={{ overflowX: "auto" }}><div className="in2-stack" style={{ minWidth: 640 }}>{rows.map((r, i) => <div key={r.id} className="in2-stack" style={{ gap: 2 }}><div className="in2-row" role="group" aria-label={`Forward ${i + 1}`}><div style={{ width: 80 }}><Select aria-label={`Forward ${i + 1} protocol`} value={r.proto} onChange={(v) => upd(r.id, { proto: v as "tcp" | "udp" })} options={[{ value: "tcp", label: "TCP" }, { value: "udp", label: "UDP" }]} /></div><input className="jp-input in2-mono" style={{ width: 110 }} aria-label={`Forward ${i + 1} external port`} value={r.extPort} onChange={(e) => upd(r.id, { extPort: e.target.value })} /><span aria-hidden>→</span><input className="jp-input in2-mono" style={{ width: 140 }} aria-label={`Forward ${i + 1} internal IP`} value={r.ip} onChange={(e) => upd(r.id, { ip: e.target.value })} /><input className="jp-input in2-mono" style={{ width: 90 }} aria-label={`Forward ${i + 1} internal port`} placeholder="same" value={r.intPort} onChange={(e) => upd(r.id, { intPort: e.target.value })} /><input className="jp-input" style={{ width: 130 }} aria-label={`Forward ${i + 1} note`} value={r.note} onChange={(e) => upd(r.id, { note: e.target.value })} /><Btn sm variant="ghost" aria-label={`Delete forward ${i + 1}`} onClick={() => setRows(rows.filter((x) => x.id !== r.id))}>×</Btn></div>{(iss[r.id] ?? []).map((m) => <span key={m} role="alert" className="in2-bad" style={{ fontSize: "var(--jp-fs-xs)" }}>{m}</span>)}</div>)}</div></div>
      <div className="in2-row"><Btn sm icon="plus" onClick={() => setRows([...rows, { id: nid("p"), proto: "tcp", extPort: "", ip: "", intPort: "", note: "" }])}>Add forward</Btn></div></div>
  );
}

/* ---------- SSH key ---------- */
export function SshKeyField() {
  const [text, setText] = useState(demoEd25519(7, "ava@laptop")); const t = text.trim(); const info = t ? parseSshKey(t) : null; const [saved, setSaved] = useState<string[]>([]);
  return (
    <div className="in2-stack">
      <Field label="Public key" hint="Paste the contents of id_ed25519.pub. Private keys are rejected." error={info && !info.valid ? info.error : /PRIVATE KEY/.test(t) ? "That is a PRIVATE key. Never paste it anywhere." : undefined}>{(id, d) => <TextArea id={id} aria-describedby={d} className="in2-mono" rows={3} value={text} onChange={setText} />}</Field>
      {info?.valid && <div className="in2-box in2-stack" role="status"><div className="in2-row"><Badge s="ok">{info.type}{info.bits ? ` ${info.bits}` : ""}</Badge><span>{info.comment || <i className="in2-note">no comment</i>}</span></div><div><span className="in2-note">Fingerprint (matches ssh-keygen -lf)</span><div className="in2-mono" style={{ wordBreak: "break-all" }}>{info.fingerprint}</div></div></div>}
      <div className="in2-row"><Btn variant="primary" disabled={!info?.valid || saved.includes(info.fingerprint)} onClick={() => info && setSaved([...saved, info.fingerprint])}>Add key</Btn><Btn onClick={() => setText(demoEd25519(Math.floor(Math.random() * 200) + 8, "new@laptop"))}>Generate sample</Btn></div>
      {saved.length > 0 && <ul className="adm-list in2-box" style={{ padding: 0 }} aria-label="Added keys">{saved.map((f) => <li key={f}><code className="in2-mono">{f}</code></li>)}</ul>}
    </div>
  );
}
