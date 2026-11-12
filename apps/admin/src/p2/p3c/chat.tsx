import { Fragment, useEffect, useRef, useState } from "react";
import { Avatar, Badge, Btn } from "@belikh/jupiter-ui/kit.tsx";
import { stream, SOURCES, type Citation, type ToolCall } from "./chatsim.ts";
import { Note, Row, Stack } from "./ui.tsx";

/* ---------------- E030 chat thread and composer ---------------- */
type Msg = { id: number; who: string; text: string; at: number; state: "sent" | "sending" | "failed" };
const REPLIES = ["Thanks, I will take a look.", "Good catch. Can you add the screenshot?", "Agreed. Let's ship it after lunch.", "I have updated the ticket."];
const clock = (t: number) => new Date(t).toISOString().slice(11, 16);
export function ChatThread({ delay = 700, base = Date.UTC(2026, 2, 4, 9, 30) }: { delay?: number; base?: number }) {
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 1, who: "Cleo Park", text: "Morning. The staging deploy finished, can someone check the invoices page?", at: base, state: "sent" }, { id: 2, who: "Cleo Park", text: "No rush.", at: base + 60000, state: "sent" }, { id: 3, who: "Me", text: "On it.", at: base + 240000, state: "sent" }]);
  const [draft, setDraft] = useState(""); const [typing, setTyping] = useState(false); const end = useRef<HTMLDivElement>(null); const id = useRef(3); const clockRef = useRef(base + 300000); const failed = useRef(new Set<number>()); const timers = useRef<number[]>([]); const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { const el = scroller.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs, typing]);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
  const deliver = (m: Msg) => { later(() => { if (/fail/i.test(m.text) && !failed.current.has(m.id)) { failed.current.add(m.id); setMsgs((x) => x.map((y) => (y.id === m.id ? { ...y, state: "failed" } : y))); return; } setMsgs((x) => x.map((y) => (y.id === m.id ? { ...y, state: "sent" } : y))); setTyping(true); later(() => { setTyping(false); clockRef.current += 90000; setMsgs((x) => [...x, { id: ++id.current, who: "Cleo Park", text: REPLIES[m.id % REPLIES.length], at: clockRef.current, state: "sent" }]); }, delay * 2); }, delay / 2); };
  const send = () => { const text = draft.trim(); if (!text) return; clockRef.current += 60000; const m: Msg = { id: ++id.current, who: "Me", text, at: clockRef.current, state: "sending" }; setMsgs((x) => [...x, m]); setDraft(""); deliver(m); };
  const retry = (m: Msg) => { setMsgs((x) => x.map((y) => (y.id === m.id ? { ...y, state: "sending" } : y))); deliver(m); };
  return (
    <Stack>
      <div className="p3-chat" ref={scroller} role="log" aria-label="Conversation with Cleo Park" aria-live="polite" tabIndex={0}>
        {msgs.map((m, i) => { const mine = m.who === "Me"; const first = msgs[i - 1]?.who !== m.who; return (
          <Fragment key={m.id}>
            <div className={`p3-msg ${mine ? "is-mine" : ""} ${first ? "is-first" : ""}`}>
              {!mine && <span className="p3-msg__av">{first ? <Avatar name={m.who} size={28} /> : null}</span>}
              <div className="p3-msg__b">{first && <span className="p3-msg__who">{mine ? "You" : m.who} <time className="p3-note" dateTime={new Date(m.at).toISOString()}>{clock(m.at)}</time></span>}<p className={`p3-msg__t ${m.state !== "sent" ? "is-pending" : ""}`}>{m.text}</p>
                {m.state === "sending" && <span className="p3-note">Sending…</span>}{m.state === "failed" && <span className="p3-bad" role="alert">Not delivered. <button type="button" className="adm-link" onClick={() => retry(m)}>Retry</button></span>}</div>
            </div></Fragment>); })}
        {typing && <p className="p3-note p3-typing" role="status">Cleo Park is typing…</p>}<div ref={end} />
      </div>
      <form className="p3-composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <label className="p3-field p3-grow"><span className="p3-sr">Message</span><textarea className="jp-input" rows={2} aria-label="Message" placeholder="Write a message. Enter sends, Shift+Enter adds a line." value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }} /></label>
        <Btn variant="primary" type="submit" icon="send" disabled={!draft.trim()}>Send</Btn>
      </form>
      <Note>Include the word "fail" in a message to see a delivery failure and Retry.</Note>
    </Stack>
  );
}

/* ---------------- E030 assistant panel ---------------- */
type Turn = { id: number; prompt: string; text: string; cites: Citation[]; tools: ToolCall[]; status: "streaming" | "done" | "stopped"; vote?: "up" | "down" };
const SUGGESTED = ["How do colour tokens work?", "What changed in the latest release?", "Search the logs for a broken job"];
function Answer({ turn, onCite }: { turn: Turn; onCite: (n: number) => void }) {
  const parts = turn.text.split(/(\[\d+\])/g);
  return <p className="p3-answer" aria-busy={turn.status === "streaming"}>{parts.map((p, i) => { const m = /^\[(\d+)\]$/.exec(p); return m ? <sup key={i}><button type="button" className="p3-cite" aria-label={`Source ${m[1]}`} onClick={() => onCite(Number(m[1]))}>{m[1]}</button></sup> : <Fragment key={i}>{p}</Fragment>; })}{turn.status === "streaming" && <span className="p3-caret" aria-hidden />}</p>;
}
export function AssistantPanel({ delay = 25 }: { delay?: number }) {
  const [turns, setTurns] = useState<Turn[]>([]); const [q, setQ] = useState(""); const ac = useRef<AbortController | null>(null); const id = useRef(0); const [hi, setHi] = useState<number | null>(null); const [announce, setAnnounce] = useState("");
  useEffect(() => () => ac.current?.abort(), []);
  const ask = async (prompt: string) => {
    const text = prompt.trim(); if (!text || ac.current) return; const tid = ++id.current; const ctl = new AbortController(); ac.current = ctl; setQ(""); setAnnounce("Assistant is answering");
    setTurns((t) => [...t, { id: tid, prompt: text, text: "", cites: [], tools: [], status: "streaming" }]); const upd = (fn: (t: Turn) => Turn) => setTurns((all) => all.map((x) => (x.id === tid ? fn(x) : x)));
    for await (const c of stream(text, delay, ctl.signal)) {
      if (c.type === "text") upd((t) => ({ ...t, text: t.text + c.text })); else if (c.type === "tool") upd((t) => ({ ...t, tools: [...t.tools, c.call] })); else if (c.type === "tool-result") upd((t) => ({ ...t, tools: t.tools.map((x) => (x.id === c.id ? { ...x, status: c.status, result: c.result } : x)) })); else if (c.type === "cite") upd((t) => ({ ...t, cites: [...t.cites, c.cite] })); else if (c.type === "done") upd((t) => ({ ...t, status: "done" }));
    }
    upd((t) => (t.status === "streaming" ? { ...t, status: "stopped" } : t)); ac.current = null; setAnnounce(ctl.signal.aborted ? "Answer stopped" : "Answer complete");
  };
  const busy = turns.some((t) => t.status === "streaming");
  return (
    <Stack>
      <div className="p3-assist" aria-label="Assistant conversation">
        {!turns.length && <div className="p3-assist__empty"><p>Ask about tokens, releases or logs. Answers are simulated: no model or network is used.</p><Row>{SUGGESTED.map((s) => <Btn key={s} sm onClick={() => void ask(s)}>{s}</Btn>)}</Row></div>}
        {turns.map((t) => (
          <article key={t.id} className="p3-turn" aria-label={`Question: ${t.prompt}`}>
            <p className="p3-turn__q"><span className="p3-sr">You asked: </span>{t.prompt}</p>
            {t.tools.map((c) => <details key={c.id} className={`p3-tool is-${c.status}`} open={c.status !== "done"}><summary><span className="p3-tool__n">{c.name}</span> <Badge s={c.status === "running" ? "info" : c.status === "done" ? "ok" : "danger"}>{c.status === "running" ? "Running" : c.status === "done" ? "Done" : "Failed"}</Badge></summary><dl className="p3-kv">{Object.entries(c.args).map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd><code>{v}</code></dd></Fragment>)}{c.result && <><dt>result</dt><dd>{c.result}</dd></>}</dl></details>)}
            {(t.text || t.status === "streaming") && <Answer turn={t} onCite={(n) => { setHi(n); document.getElementById(`p3src-${t.id}-${n}`)?.focus(); }} />}
            {t.status === "stopped" && <p className="p3-note">Stopped.</p>}
            {t.cites.length > 0 && <ol className="p3-sources" aria-label="Sources">{t.cites.map((c) => <li key={c.n} id={`p3src-${t.id}-${c.n}`} tabIndex={-1} className={hi === c.n ? "is-hi" : ""}><span className="p3-chip">[{c.n}]</span> {c.title} <span className="p3-note">{c.source}</span></li>)}</ol>}
            {t.status !== "streaming" && <Row><Btn sm variant="ghost" aria-pressed={t.vote === "up"} onClick={() => setTurns(turns.map((x) => (x.id === t.id ? { ...x, vote: x.vote === "up" ? undefined : "up" } : x)))}>Helpful</Btn><Btn sm variant="ghost" aria-pressed={t.vote === "down"} onClick={() => setTurns(turns.map((x) => (x.id === t.id ? { ...x, vote: x.vote === "down" ? undefined : "down" } : x)))}>Not helpful</Btn><Btn sm variant="ghost" disabled={busy} onClick={() => void ask(t.prompt)}>Regenerate</Btn></Row>}
          </article>))}
      </div>
      <p className="p3-sr" role="status">{announce}</p>
      <form className="p3-composer" onSubmit={(e) => { e.preventDefault(); void ask(q); }}>
        <label className="p3-field p3-grow"><span className="p3-sr">Ask the assistant</span><input className="jp-input" aria-label="Ask the assistant" placeholder="Ask a question…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        {busy ? <Btn type="button" icon="stop" onClick={() => ac.current?.abort()}>Stop</Btn> : <Btn type="submit" variant="primary" icon="send" disabled={!q.trim()}>Ask</Btn>}
      </form>
      <p className="p3-note">{SOURCES.length} documents are searchable in this demo.</p>
    </Stack>
  );
}
