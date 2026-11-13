import { useEffect, useMemo, useState } from "react";
import { Btn, Disclosure, CodeBlock } from "@belikh/jupiter-ui/kit.tsx";
import { Segmented, Slider } from "@belikh/jupiter-ui/inputs.tsx";
import { duration, encodeCast, fmtClock, fmtSize, summarize, type Recording } from "./lib/asciicast.ts";
import { renderAt } from "./lib/term.ts";

type Speed = "1" | "2" | "4" | "8";

export function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/x-asciicast" }));
  const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Replay of a recording: play/pause, speed, scrubbing, a text summary and .cast export. */
export function ShellPlayer({ rec }: { rec: Recording }) {
  const total = duration(rec); const [pos, setPos] = useState(0); const [playing, setPlaying] = useState(false); const [speed, setSpeed] = useState<Speed>("1");
  useEffect(() => { setPos(0); setPlaying(false); }, [rec.id]);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setPos((p) => { const n = p + 50 * Number(speed); if (n >= total) { setPlaying(false); return total; } return n; }), 50);
    return () => clearInterval(t);
  }, [playing, speed, total]);
  const sum = useMemo(() => summarize(rec), [rec]); const screen = useMemo(() => renderAt(rec.events, pos), [rec, pos]);
  const cast = useMemo(() => encodeCast(rec), [rec]);
  return (
    <div className="adm-stack">
      <div className="lab-term" role="group" aria-label={`Replay of session on ${rec.host}`} tabIndex={0}><pre className="lab-term-body">{screen}</pre></div>
      <div className="adm-row">
        <Btn variant="primary" onClick={() => { if (pos >= total) setPos(0); setPlaying(!playing); }}>{playing ? "Pause" : pos >= total && total > 0 ? "Replay" : "Play"}</Btn>
        <Segmented<Speed> label="Speed" value={speed} onChange={setSpeed} options={[{ value: "1", label: "1x" }, { value: "2", label: "2x" }, { value: "4", label: "4x" }, { value: "8", label: "8x" }]} />
        <span className="adm-num">{fmtClock(pos)} / {fmtClock(total)}</span>
        <span className="lab-spacer" />
        <Btn icon="download" onClick={() => download(`${rec.title.replace(/[^\w.-]+/g, "_")}-${rec.started.replace(/[^\d]/g, "")}.cast`, cast)}>Download .cast</Btn>
      </div>
      <Slider label="Position" value={pos} min={0} max={Math.max(Math.ceil(total / 50) * 50, 50)} step={50} onChange={(v) => { setPlaying(false); setPos(v >= total - 49 ? Math.max(v, total) : v); }} fmt={fmtClock} />
      <dl className="lab-dl" aria-label="Recording summary">
        <dt>Duration</dt><dd>{fmtClock(sum.durationMs)} ({(sum.durationMs / 1000).toFixed(1)} s)</dd>
        <dt>Events</dt><dd>{sum.events} ({sum.keystrokes} keystrokes in)</dd>
        <dt>Output</dt><dd>{fmtSize(sum.outputBytes)} of terminal output</dd>
        <dt>File size</dt><dd>{fmtSize(sum.castBytes)} as .cast</dd>
        <dt>Longest pause</dt><dd>{(sum.longestPauseMs / 1000).toFixed(1)} s</dd>
      </dl>
      <Disclosure label="Preview .cast (asciicast v2)"><CodeBlock label="asciicast preview" code={cast.split("\n").slice(0, 21).join("\n") + (rec.events.length > 20 ? "\n… (truncated preview)" : "")} /></Disclosure>
    </div>
  );
}
