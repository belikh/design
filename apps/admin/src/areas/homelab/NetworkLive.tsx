import { useEffect, useRef, useState } from "react";
import { Panel, Btn, Alert, Badge } from "@belikh/jupiter-ui/kit.tsx";
import { Field, TextInput, TextArea } from "@belikh/jupiter-ui/inputs.tsx";
import type { Store } from "./lib.tsx";
import type { Peer } from "./network.data.ts";
import { parseVpn } from "./network.vpn.ts";
import { unifiSource, SourceError, type NetworkSnapshot, type NetworkSource } from "./network.source.ts";

export type Live = { source: NetworkSource; snap: NetworkSnapshot; gen: number };
/** Connect to a UniFi controller (read-only). The key is held in component state and the source closure only; it is never written to storage, the URL or the console. */
export function Connect({ live, onLive, onDisconnect }: { live: Live | null; onLive: (l: Live) => void; onDisconnect: () => void }) {
  const [url, setUrl] = useState(""); const [key, setKey] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState<SourceError | null>(null); const ctl = useRef<AbortController | null>(null); const gen = useRef(0);
  useEffect(() => () => ctl.current?.abort(), []);
  const run = async (src: NetworkSource) => {
    ctl.current?.abort(); const c = new AbortController(); ctl.current = c; setBusy(true); setErr(null);
    try { const snap = await src.load(c.signal); if (!c.signal.aborted) { onLive({ source: src, snap, gen: ++gen.current }); setKey(""); } } catch (e) { if (!c.signal.aborted) setErr(e instanceof SourceError ? e : new SourceError("http", "Something went wrong reading the controller.")); } finally { if (ctl.current === c) setBusy(false); }
  };
  const connect = () => { try { void run(unifiSource(url, key)); } catch (e) { setErr(e instanceof SourceError ? e : new SourceError("input", "Check the address and key.")); } };
  return (
    <Panel title="Data source" actions={live ? <Badge s="ok">Live, read-only</Badge> : <Badge s="info">Sample data</Badge>}>
      <div className="adm-stack">
        <p className="hg-muted">The page shows fictional sample data by default. To read a real UniFi controller, enter its address and an API key (Integrations in the controller). Requests are read-only <code>GET</code>s sent straight from this browser; the key is kept in memory only and is forgotten when you disconnect or leave the page.</p>
        {!live && <form className="adm-stack" onSubmit={(e) => { e.preventDefault(); if (!busy) connect(); }} autoComplete="off">
          <Field label="Controller address" hint="For example https://192.0.2.1 (the /proxy/network/integration/v1 path is added for you)">{(id) => <TextInput id={id} value={url} onChange={setUrl} placeholder="https://controller.example" inputMode="url" autoComplete="off" spellCheck={false} />}</Field>
          <Field label="API key">{(id) => <TextInput id={id} value={key} onChange={setKey} type="password" autoComplete="off" spellCheck={false} />}</Field>
          <div className="hg-row"><Btn variant="primary" type="submit" disabled={busy}>{busy ? "Connecting" : "Connect"}</Btn></div></form>}
        {live && <div className="adm-stack"><p><b>{live.snap.origin}</b>: {live.snap.devices.length} devices, {live.snap.clients.length} clients, {live.snap.vlans.length} networks, {live.snap.rules.length} firewall policies, {live.snap.leases.length} leases.</p>
          {live.snap.notes.map((n) => <p key={n} className="hg-muted">{n}</p>)}
          <div className="hg-row"><Btn disabled={busy} onClick={() => void run(live.source)}>Refresh</Btn><Btn variant="ghost" onClick={() => { ctl.current?.abort(); setErr(null); onDisconnect(); }}>Disconnect and forget the key</Btn></div></div>}
        {err && <Alert s="danger" title={{ cors: "Could not reach the controller", auth: "Key rejected", notfound: "Address not found", http: "Controller error", parse: "Unexpected answer", timeout: "No answer", input: "Check the form" }[err.kind]}>{err.message}</Alert>}
      </div>
    </Panel>
  );
}

/** Paste `wg show` or `tailscale status --json` and add the peers. Private keys are never read. */
export function VpnImport({ peers }: { peers: Store<Peer> }) {
  const [text, setText] = useState(""); const [res, setRes] = useState<ReturnType<typeof parseVpn> | null>(null); const [added, setAdded] = useState<number | null>(null);
  const add = async () => {
    if (!res) return; const have = new Set(peers.rows.map((p) => `${p.kind}|${p.name}|${p.address}`)); let n = 0;
    for (const p of res.peers) if (!have.has(`${p.kind}|${p.name}|${p.address}`)) { await peers.c.create({ rev: 1, ...p } as never); n++; }
    setAdded(n);
  };
  return (
    <Panel title="Import peers from pasted output">
      <div className="adm-stack">
        <p className="hg-muted">Run <code>sudo wg show</code> or <code>tailscale status --json</code> on the machine and paste the result. It is parsed in this browser and goes nowhere. Private and preshared keys are ignored (<code>wg show</code> hides them anyway).</p>
        <Field label="Output">{(id) => <TextArea id={id} value={text} onChange={(v) => { setText(v); setRes(null); setAdded(null); }} rows={6} placeholder={"interface: wg0\n  listening port: 51820\n\npeer: AbCd...\n  endpoint: 203.0.113.9:51820\n  allowed ips: 10.8.0.2/32\n  latest handshake: 1 minute, 5 seconds ago\n  transfer: 312.00 MiB received, 88.00 MiB sent"} spellCheck={false} />}</Field>
        <div className="hg-row"><Btn onClick={() => { setRes(parseVpn(text)); setAdded(null); }} disabled={!text.trim()}>Parse</Btn>{res && res.peers.length > 0 && <Btn variant="primary" onClick={() => void add()}>{`Add ${res.peers.length} ${res.format} peer${res.peers.length > 1 ? "s" : ""}`}</Btn>}</div>
        {res && res.errors.length > 0 && <Alert s={res.peers.length ? "warn" : "danger"} title={res.peers.length ? "Parsed with warnings" : "Nothing to import"}>{res.errors.join(" ")}</Alert>}
        {res && res.peers.length > 0 && <p className="hg-muted" role="status">{`Found ${res.peers.length} ${res.format} peer${res.peers.length > 1 ? "s" : ""}: ${res.peers.map((p) => p.name).join(", ")}.`}</p>}
        {added !== null && <p role="status">{added === 0 ? "Those peers are already in the table." : `Added ${added} peer${added > 1 ? "s" : ""} to the table.`}</p>}
      </div>
    </Panel>
  );
}
