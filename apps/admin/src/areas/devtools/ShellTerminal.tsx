import { useEffect, useRef, useState } from "react";
import { Btn, Badge } from "@belikh/jupiter-ui/kit.tsx";
import { Field } from "@belikh/jupiter-ui/inputs.tsx";
import { Recorder, makeRecording, type Recording } from "./lib/asciicast.ts";
import { keyToBytes } from "./lib/keys.ts";
import { Screen } from "./lib/term.ts";
import type { ShellTransport } from "./lib/transport.ts";

export type TermMeta = { host: string; user: string };

/**
 * A live terminal over any ShellTransport. Subscribes, then connects, records every byte in both directions (asciicast events)
 * and hands the finished Recording to `onSave` when the connection ends. Focus the terminal and type, or use the Command box below it.
 */
export function ShellTerminal({ transport, meta, onFail, onSave }: { transport: ShellTransport; meta: TermMeta; onFail: (msg: string) => void; onSave: (r: Recording) => void }) {
  const screen = useRef(new Screen()); const rec = useRef(new Recorder()); const started = useRef(false); const saved = useRef(false); const stamp = useRef(new Date());
  const [text, setText] = useState(""); const [status, setStatus] = useState<"connecting" | "connected" | "ended">("connecting"); const [line, setLine] = useState("");
  const term = useRef<HTMLDivElement>(null); const cmd = useRef<HTMLInputElement>(null); const body = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const offData = transport.onData((d) => { rec.current.add("o", d); screen.current.write(d); setText(screen.current.text()); });
    const offClose = transport.onClose((reason) => {
      setStatus("ended");
      if (saved.current) return; saved.current = true;
      const events = rec.current.events;
      if (events.length) onSave(makeRecording({ id: `rec-${Date.now()}`, host: meta.host, user: meta.user, started: fmt(stamp.current), timestamp: Math.floor(stamp.current.getTime() / 1000), events, title: `${meta.user}@${meta.host}` + (reason ? "" : "") }));
    });
    if (!started.current) {
      started.current = true;
      transport.connect().then(() => { setStatus((s) => (s === "ended" ? s : "connected")); term.current?.focus(); }, (e: unknown) => { saved.current = true; setStatus("ended"); onFail(e instanceof Error ? e.message : String(e)); });
    }
    return () => { offData(); offClose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transport]);
  useEffect(() => { body.current?.scrollTo?.(0, body.current.scrollHeight); }, [text]);

  const send = (d: string) => { if (status === "ended" || !d) return; rec.current.add("i", d); transport.send(d); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); cmd.current?.focus(); return; } // the way out of the terminal for keyboard users
    const b = keyToBytes(e); if (b === null) return; e.preventDefault(); send(b);
  };
  const onPaste = (e: React.ClipboardEvent) => { e.preventDefault(); send(e.clipboardData.getData("text").replace(/\r?\n/g, "\r")); };
  const submit = (e: React.FormEvent) => { e.preventDefault(); send(line + "\r"); setLine(""); };
  return (
    <div className="adm-stack">
      <div ref={term} className="p3-term" role="application" aria-label={`Terminal on ${transport.label}`} aria-describedby="p3-term-hint" tabIndex={0} onKeyDown={onKey} onPaste={onPaste}>
        <pre ref={body} className="p3-term-body">{text}{status === "connecting" ? "Connecting…" : ""}</pre>
      </div>
      <p id="p3-term-hint" className="p3-note jp-muted">Click the terminal and type. Tab completes, Up and Down recall history, Ctrl+C cancels, Ctrl+L clears, Ctrl+D exits. Escape moves focus out to the Command box.</p>
      <form onSubmit={submit} className="p3-term-form">
        <Field label="Command">{(id) => <input id={id} ref={cmd} className="jp-input p3-mono" value={line} disabled={status !== "connected"} onChange={(e) => setLine(e.target.value)} autoComplete="off" spellCheck={false} autoCapitalize="off" />}</Field>
        <Btn variant="primary" type="submit" disabled={status !== "connected"}>Run</Btn>
        <Btn type="button" aria-label="Send Ctrl+C" disabled={status !== "connected"} onClick={() => send("\x03")}>Ctrl+C</Btn>
        <Btn type="button" aria-label="Send Ctrl+L (clear screen)" disabled={status !== "connected"} onClick={() => send("\x0c")}>Ctrl+L</Btn>
      </form>
      <div className="adm-row"><Badge s={status === "connected" ? "danger" : undefined}>{status === "connected" ? "recording" : status === "connecting" ? "connecting" : "session ended, saved"}</Badge><span className="jp-muted">{rec.current.events.length} events captured</span>{status !== "ended" && <Btn sm onClick={() => transport.close()}>End and save</Btn>}</div>
    </div>
  );
}

const p2 = (n: number) => String(n).padStart(2, "0");
const fmt = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
