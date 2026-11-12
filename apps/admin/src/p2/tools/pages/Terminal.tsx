import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader, Panel, Btn, Badge, Tabs, Alert, EmptyState } from "@belikh/jupiter-ui/kit.tsx";
import { Segmented, Switch } from "@belikh/jupiter-ui/inputs.tsx";
import { initialShell, makeFs, runLine, type ShellState } from "../lib/shell.ts";
import { useStored } from "../common.tsx";

type Line = { kind: "in" | "out" | "err"; text: string };
type Ev = { t: number; input: string; out: string[]; err: boolean };
type Rec = { name: string; events: Ev[] };
const COMMANDS = ["help", "ls", "cd", "pwd", "cat", "head", "tail", "grep", "wc", "sort", "uniq", "echo", "env", "whoami", "hostname", "uname", "date", "uptime", "ps", "df", "free", "systemctl", "ping", "curl", "mkdir", "touch", "rm", "history", "clear"];
const prompt = (cwd: string[]) => `ava@jupiter-gw:${cwd.length === 2 && cwd[0] === "home" && cwd[1] === "ava" ? "~" : "/" + cwd.join("/")}$`;
export function Terminal() {
  const fs = useRef(makeFs()); const [st, setSt] = useState<ShellState>(initialShell()); const [lines, setLines] = useState<Line[]>([{ kind: "out", text: 'Sandboxed shell. Nothing here touches your machine or the network. Type "help".' }]);
  const [input, setInput] = useState(""); const [hi, setHi] = useState<number | null>(null); const [rec, setRec] = useState(true); const [events, setEvents] = useState<Ev[]>([]); const t0 = useRef(Date.now()); const box = useRef<HTMLDivElement>(null);
  const [saved, setSaved] = useStored<Rec[]>("pt-recordings", []); const [tab, setTab] = useState("term"); const [open, setOpen] = useState<string>("");
  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [lines]);
  const submit = () => {
    const line = input; const r = runLine(line, st, fs.current); setInput(""); setHi(null); setSt(r.state);
    if (r.clear) setLines([]); else setLines((l) => [...l, { kind: "in", text: `${prompt(st.cwd)} ${line}` }, ...r.out.map((t): Line => ({ kind: r.error ? "err" : "out", text: t }))]);
    if (rec && line.trim()) setEvents((e) => [...e, { t: Date.now() - t0.current, input: line, out: r.out, err: !!r.error }]);
  };
  const key = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") submit();
    else if (e.key === "ArrowUp") { e.preventDefault(); const n = hi === null ? st.history.length - 1 : Math.max(0, hi - 1); if (n >= 0) { setHi(n); setInput(st.history[n] ?? ""); } }
    else if (e.key === "ArrowDown") { e.preventDefault(); if (hi === null) return; const n = hi + 1; if (n >= st.history.length) { setHi(null); setInput(""); } else { setHi(n); setInput(st.history[n]); } }
    else if (e.key === "Tab") { e.preventDefault(); const w = input.split(/\s+/); if (w.length === 1) { const m = COMMANDS.filter((c) => c.startsWith(w[0])); if (m.length === 1) setInput(m[0] + " "); else if (m.length > 1) setLines((l) => [...l, { kind: "out", text: m.join("  ") }]); } }
    else if (e.key === "l" && e.ctrlKey) { e.preventDefault(); setLines([]); }
  };
  const current: Rec = { name: "Current session", events }; const all = [current, ...saved]; const replay = all.find((r) => r.name === open) ?? current;
  return (
    <>
      <PageHeader title="Terminal" crumbs={["Tools", "Terminal"]} desc="A sandboxed console with history, Tab completion for commands, pipes and a virtual file system, plus session recording and replay." status={<Badge s={rec ? "danger" : "ok"}>{rec ? "recording" : "not recording"}</Badge>}
        tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: "term", label: "Terminal" }, { id: "rec", label: "Recordings", count: saved.length + (events.length ? 1 : 0) }]} />} actions={<><Switch checked={rec} onChange={setRec} label="Record" /><Btn icon="trash" onClick={() => { setLines([]); setEvents([]); setSt(initialShell()); fs.current = makeFs(); t0.current = Date.now(); }}>Reset session</Btn></>} />
      {tab === "term" && <>
        <div className="pt-term" ref={box} onClick={() => document.getElementById("pt-term-input")?.focus()} role="log" aria-label="Terminal output">
          {lines.map((l, i) => <div key={i} className={`pt-term__line ${l.kind === "err" ? "is-err" : ""}`}>{l.kind === "in" ? <><span className="pt-term__prompt">{l.text.split(" ")[0]}</span> {l.text.slice(l.text.indexOf(" ") + 1)}</> : l.text}</div>)}
          <div className="pt-term__input"><span className="pt-term__prompt">{prompt(st.cwd)}</span><input id="pt-term-input" aria-label="Command" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={key} autoComplete="off" autoCapitalize="off" spellCheck={false} autoFocus /></div>
        </div>
        <p className="pt-kbd-hint" style={{ marginTop: 6 }}>↑↓ history · Tab completes commands · Ctrl+L clears. Try: <code>ls -l</code>, <code>cat /var/log/syslog | grep -i failed | wc -l</code>, <code>systemctl status pxe-boot</code></p>
      </>}
      {tab === "rec" && <div className="pt-cols">
        <Panel title="Sessions" flush>
          <ul className="adm-list">{all.map((r) => <li key={r.name} className={replay.name === r.name ? "is-sel" : ""}><button className="adm-link" style={{ textDecoration: "none" }} onClick={() => setOpen(r.name)}>{r.name}</button><span className="jp-muted">{r.events.length} commands</span><span className="adm-spacer" />{r === current ? <Btn sm disabled={!events.length} onClick={() => { setSaved([{ name: `Session ${saved.length + 1}`, events }, ...saved]); }}>Save</Btn> : <button className="adm-x" aria-label={`Delete ${r.name}`} onClick={() => setSaved(saved.filter((s) => s.name !== r.name))}>×</button>}</li>)}</ul>
        </Panel>
        <Replay rec={replay} />
      </div>}
      <div style={{ marginTop: 12 }}><Alert s="info" title="Sandboxed on purpose">Commands run against a pretend file system and canned data. There is no real shell, network or file access.</Alert></div>
    </>
  );
}
export function Replay({ rec }: { rec: Rec }) {
  const total = rec.events.length ? rec.events[rec.events.length - 1].t + 1000 : 0; const [pos, setPos] = useState(0); const [play, setPlay] = useState(false); const [speed, setSpeed] = useState("2");
  useEffect(() => { setPos(0); setPlay(false); }, [rec.name, total]);
  useEffect(() => { if (!play) return; const i = setInterval(() => setPos((p) => { const n = p + 100 * Number(speed); if (n >= total) { setPlay(false); return total; } return n; }), 100); return () => clearInterval(i); }, [play, speed, total]);
  const shown = useMemo(() => rec.events.filter((e) => e.t <= pos), [rec.events, pos]);
  if (!rec.events.length) return <Panel title="Replay"><EmptyState spot="inbox-zero" title="Nothing recorded yet">Run commands in the terminal with Record on.</EmptyState></Panel>;
  return (
    <Panel title="Replay" actions={<Segmented label="Speed" value={speed} onChange={setSpeed} options={[{ value: "1", label: "1×" }, { value: "2", label: "2×" }, { value: "5", label: "5×" }]} />}>
      <div className="pt-term" style={{ height: 260 }} aria-label="Replay output">{shown.map((e, i) => <div key={i}><div className="pt-term__line"><span className="pt-term__prompt">$</span> {e.input}</div>{e.out.map((o, j) => <div key={j} className={`pt-term__line ${e.err ? "is-err" : ""}`}>{o}</div>)}</div>)}</div>
      <div className="adm-row" style={{ marginTop: 8, flexWrap: "nowrap" }}><Btn sm onClick={() => { if (pos >= total) setPos(0); setPlay(!play); }}>{play ? "Pause" : pos >= total ? "Replay" : "Play"}</Btn><input className="pt-scrub" type="range" min={0} max={total} value={pos} onChange={(e) => { setPlay(false); setPos(Number(e.target.value)); }} aria-label="Scrub recording" /><span className="adm-num jp-muted" style={{ minWidth: 70, textAlign: "end" }}>{(pos / 1000).toFixed(1)}s / {(total / 1000).toFixed(1)}s</span></div>
    </Panel>
  );
}
