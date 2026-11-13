import { useEffect, useRef, useState } from "react";
import { PageHeader, Panel, Btn, Badge, Tabs, Disclosure, EmptyState, Alert } from "@belikh/jupiter-ui/kit.tsx";
import { Field, Segmented, Select, TextInput } from "@belikh/jupiter-ui/inputs.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { HOSTS } from "./lib/shell.ts";
import { SEED_RECORDINGS } from "./lib/sessions.ts";
import { SimTransport, WebSocketTransport, checkWsUrl, type ShellTransport } from "./lib/transport.ts";
import { decodeCast, duration, fmtClock, makeRecording, type Recording } from "./lib/asciicast.ts";
import { ShellTerminal } from "./ShellTerminal.tsx";
import { ShellPlayer } from "./ShellPlayer.tsx";
import "./devtools.css";

type Kind = "sim" | "ws";
const MAX_CAST_BYTES = 20 * 1024 * 1024;

const readText = (f: File): Promise<string> => (typeof f.text === "function" ? f.text() : new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsText(f); }));

export function RemoteShell() {
  const { toast } = usePrefs();
  const [tab, setTab] = useState("live"); const [kind, setKind] = useState<Kind>("sim"); const [hostId, setHostId] = useState(HOSTS[0].id); const [url, setUrl] = useState("");
  const [live, setLive] = useState<{ id: number; transport: ShellTransport; host: string; user: string } | null>(null); const [error, setError] = useState<string | null>(null); const [ended, setEnded] = useState(false);
  const [recs, setRecs] = useState<Recording[]>(SEED_RECORDINGS); const [sel, setSel] = useState<string | null>(SEED_RECORDINGS[0].id); const [importErr, setImportErr] = useState<string | null>(null);
  const seq = useRef(0); const fileRef = useRef<HTMLInputElement>(null); const liveRef = useRef(live); liveRef.current = live;
  useEffect(() => () => liveRef.current?.transport.close(), []);
  const rec = recs.find((r) => r.id === sel); const host = HOSTS.find((h) => h.id === hostId)!; const chk = checkWsUrl(url);

  const connect = () => {
    setError(null); setEnded(false);
    if (kind === "sim") { setLive({ id: ++seq.current, transport: new SimTransport(host), host: host.id, user: host.user }); return; }
    if (!chk.ok) { setError(chk.error); return; }
    setLive({ id: ++seq.current, transport: new WebSocketTransport(chk.url), host: new URL(chk.url).host, user: "remote" });
  };
  const remove = (id: string) => { const old = recs; setRecs(recs.filter((r) => r.id !== id)); if (sel === id) setSel(null); toast({ kind: "warn", title: "Recording deleted", undo: () => setRecs(old) }); };
  const importFile = async (f: File) => {
    setImportErr(null);
    if (f.size > MAX_CAST_BYTES) { setImportErr(`${f.name} is larger than 20 MB.`); return; }
    const r = decodeCast(await readText(f));
    if (!r.ok) { setImportErr(`${f.name}: ${r.error}`); return; }
    const m = /^(\S+)@(\S+)/.exec(r.header.title ?? ""); const ts = r.header.timestamp ?? Math.floor(Date.now() / 1000); const d = new Date(ts * 1000); const p = (n: number) => String(n).padStart(2, "0");
    const next = makeRecording({ id: `imp-${Date.now()}`, host: m?.[2] ?? "imported", user: m?.[1] ?? "unknown", started: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`, timestamp: ts, events: r.events, width: r.header.width, height: r.header.height, title: r.header.title ?? f.name });
    setRecs((c) => [next, ...c]); setSel(next.id); toast({ kind: "ok", title: "Recording imported", body: `${r.events.length} events from ${f.name}` });
  };

  return (
    <>
      <PageHeader title="Remote shell" crumbs={["Operations", "Remote shell"]} desc="A recorded terminal session. The default transport is a sandboxed simulation on three fake hosts; a WebSocket transport can attach to a pty bridge you run yourself. Sessions are recorded as asciicast v2 and can be replayed, scrubbed, exported and imported."
        status={live && !ended ? <Badge s="danger">recording {live.host}</Badge> : <Badge>idle</Badge>} />
      <Tabs tabs={[{ id: "live", label: "Live session" }, { id: "recordings", label: "Recordings", count: recs.length }]} value={tab} onChange={setTab} />
      <div className="lab-gap" />
      {tab === "live" && <Panel title="Session" actions={live ? <Btn sm onClick={() => { live.transport.close(); setLive(null); }}>Close</Btn> : undefined}>
        {!live && <div className="adm-stack">
          <div className="adm-row">
            <Segmented<Kind> label="Transport" value={kind} onChange={(k) => { setKind(k); setError(null); }} options={[{ value: "sim", label: "Simulated host" }, { value: "ws", label: "WebSocket" }]} />
            {kind === "sim" && <Select aria-label="Host" value={hostId} onChange={setHostId} options={HOSTS.map((h) => ({ value: h.id, label: `${h.user}@${h.name}` }))} />}
          </div>
          {kind === "ws" && <Field label="WebSocket URL" hint="Nothing connects until you press Connect. Credentials in the URL are refused and nothing is stored." error={url && !chk.ok ? chk.error : undefined}>{(id) => <TextInput id={id} value={url} onChange={setUrl} placeholder="wss://bridge.example.net/pty" spellCheck={false} autoComplete="off" />}</Field>}
          {kind === "ws" && chk.ok && chk.insecure && <Alert s="warn" title="Unencrypted connection">ws:// sends everything you type, in clear text. Use wss:// unless this is localhost.</Alert>}
          {kind === "ws" && <Disclosure label="How the WebSocket transport works"><p className="lab-note">Each message is a text frame of raw terminal bytes. The page sends keystrokes (Enter as CR, Ctrl+C as 0x03, arrows as ANSI escapes) and renders whatever the server sends, so any pty-over-WebSocket bridge that speaks plain frames works. There is no resize or login message: put authentication in front of the bridge. Browsers block ws:// from an https page except for localhost, and the server must accept this page's origin. Recordings stay in this browser tab until you download them.</p></Disclosure>}
          {error && <Alert s="danger" title="Could not connect" onClose={() => setError(null)}>{error}</Alert>}
          <EmptyState spot="empty" title="Not connected" action={<Btn variant="primary" icon="terminal" disabled={kind === "ws" && !chk.ok} onClick={connect}>Connect{kind === "sim" ? ` to ${host.name}` : ""}</Btn>}>{kind === "sim" ? "Choose a host to start a recorded session." : "Enter a URL, then press Connect to open a recorded session."}</EmptyState>
        </div>}
        {live && <ShellTerminal key={live.id} transport={live.transport} meta={{ host: live.host, user: live.user }}
          onFail={(m) => { setLive(null); setError(m); }}
          onSave={(r) => { setEnded(true); setRecs((c) => [r, ...c]); setSel(r.id); toast({ kind: "ok", title: "Session recorded", body: `${r.events.length} events saved to Recordings` }); }} />}
      </Panel>}
      {tab === "recordings" && <div className="lab-split lab-split--side">
        <Panel title="Sessions" flush actions={<><Btn sm icon="upload" onClick={() => fileRef.current?.click()}>Import</Btn><input ref={fileRef} type="file" hidden accept=".cast,.txt,text/plain,application/x-asciicast" aria-label="Import .cast file" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void importFile(f); }} /></>}>
          {importErr && <div className="lab-pad"><Alert s="danger" title="Import failed" onClose={() => setImportErr(null)}>{importErr}</Alert></div>}
          {recs.length === 0 ? <EmptyState spot="empty" title="No recordings">Sessions you run, or .cast files you import, are saved here.</EmptyState> : <ul className="lab-tree" aria-label="Recordings">{recs.map((r) => <li key={r.id} className="lab-rec"><button className={sel === r.id ? "is-on" : ""} aria-current={sel === r.id ? "true" : undefined} onClick={() => setSel(r.id)}><span>{r.user}@{r.host}</span><span className="jp-muted adm-num">{r.started} · {fmtClock(duration(r))}</span></button><button className="adm-x" aria-label={`Delete recording ${r.started} on ${r.host}`} onClick={() => remove(r.id)}>×</button></li>)}</ul>}
        </Panel>
        <Panel title="Replay">{rec ? <ShellPlayer rec={rec} /> : <Alert s="info" title="Select a recording">Choose a session to replay it.</Alert>}</Panel>
      </div>}
    </>
  );
}
