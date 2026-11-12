import { useEffect, useRef, useState } from "react";
import { Alert, Badge, Btn } from "@belikh/jupiter-ui/kit.tsx";
import { MIN_TRIM, clampTrim, encodeWav, extractPeaks, fmtBytes, fmtClock, moveHandle, parseWavHeader, peakEnvelope, silenceRange, sliceChannels, synthTone, trimLength, type Peaks } from "./audio.ts";
import { SourcePicker, type Picked } from "./sourcepicker.tsx";
import { Note, Row, Stack, startDrag } from "./ui.tsx";

type AC = typeof AudioContext;
const audioCtor = (): AC | undefined => (typeof window === "undefined" ? undefined : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: AC }).webkitAudioContext));
const readBuffer = (b: Blob): Promise<ArrayBuffer> => (typeof b.arrayBuffer === "function" ? b.arrayBuffer() : new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as ArrayBuffer); r.onerror = () => rej(r.error); r.readAsArrayBuffer(b); }));
const BUCKETS = 320; const STEP = 0.1;
type Loaded = { buffer: AudioBuffer; duration: number; peaks: Peaks; env: number[]; name: string };
type Exported = { url: string; name: string; bytes: number; seconds: number; info: string };

/** A time field that edits as text and commits on blur or Enter, so typing "1." is not rewritten mid-way. */
function TimeField({ label, value, max, onCommit }: { label: string; value: number; max: number; onCommit: (v: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null); const commit = () => { if (draft !== null) { const n = Number(draft); if (Number.isFinite(n)) onCommit(Math.min(max, Math.max(0, n))); setDraft(null); } };
  return <label className="p3-field"><span className="jp-label">{label}</span><input className="jp-input p3-mono p3-num" type="number" inputMode="decimal" min={0} max={max} step={0.01} value={draft ?? value.toFixed(2)} aria-label={label} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") commit(); }} /></label>;
}

/* ---------------- C048 audio waveform trim ---------------- */
export function WaveformTrim() {
  const [a, setA] = useState<Loaded | null>(null); const [status, setStatus] = useState<"idle" | "decoding" | "ready" | "error">("idle"); const [err, setErr] = useState("");
  const [r, setR] = useState<[number, number]>([0, 0]); const [playing, setPlaying] = useState(false); const [head, setHead] = useState(0); const [out, setOut] = useState<Exported | null>(null);
  const box = useRef<HTMLDivElement>(null); const play = useRef<{ ctx: AudioContext; src: AudioBufferSourceNode } | null>(null); const raf = useRef(0); const outUrl = useRef<string | null>(null);
  const dur = a?.duration ?? 0;
  const stopPlay = () => { cancelAnimationFrame(raf.current); const p = play.current; play.current = null; if (p) { p.src.onended = null; try { p.src.stop(); } catch { /* already stopped */ } void p.ctx.close().catch(() => undefined); } setPlaying(false); };
  const dropOut = () => { if (outUrl.current) URL.revokeObjectURL(outUrl.current); outUrl.current = null; setOut(null); };
  useEffect(() => () => { stopPlay(); if (outUrl.current) URL.revokeObjectURL(outUrl.current); }, []);

  const load = async (p: Picked) => {
    stopPlay(); dropOut(); setStatus("decoding"); setErr(""); const AC = audioCtor();
    if (!AC) { setStatus("error"); setErr("Web Audio is not available in this browser, so audio cannot be decoded."); return; }
    const ctx = new AC();
    try {
      const buffer = await ctx.decodeAudioData(await readBuffer(p.blob)); const chans = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i)); const peaks = extractPeaks(chans, BUCKETS);
      setA({ buffer, duration: buffer.duration, peaks, env: peakEnvelope(peaks), name: p.name }); setR([0, buffer.duration]); setStatus("ready");
    } catch (e) { setA(null); setStatus("error"); setErr(`"${p.name}" could not be decoded as audio (${(e as Error)?.message || (e as Error)?.name || "unsupported or damaged file"}). Try a WAV, MP3, Ogg or WebM audio file.`); }
    finally { void ctx.close?.().catch?.(() => undefined); }
  };
  const sample = () => { const sr = 44100; const blob = new Blob([encodeWav([synthTone(sr, 6)], sr)], { type: "audio/wav" }); void load({ blob, name: "sample-tone.wav", seconds: 6 }); };

  const move = (i: 0 | 1, t: number) => { dropOut(); setR((p) => moveHandle(p, i, t, dur)); };
  const nudge = (i: 0 | 1) => (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 1 : e.altKey ? 0.01 : STEP; const cur = r[i]; let t: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") t = cur + step; else if (e.key === "ArrowLeft" || e.key === "ArrowDown") t = cur - step; else if (e.key === "Home") t = 0; else if (e.key === "End") t = dur; else if (e.key === "PageUp") t = cur + 5; else if (e.key === "PageDown") t = cur - 5;
    if (t !== null) { e.preventDefault(); move(i, t); }
  };
  const drag = (i: 0 | 1) => (e: React.PointerEvent) => { (e.currentTarget as HTMLElement).focus(); startDrag(e, box.current, (x, _y, w) => move(i, (x / w) * dur)); };

  const toggle = () => {
    if (playing) { stopPlay(); return; } if (!a) return; const AC = audioCtor(); if (!AC) { setErr("Web Audio is not available in this browser."); return; }
    const ctx = new AC(); const src = ctx.createBufferSource(); src.buffer = a.buffer; src.connect(ctx.destination); const [s, e] = r; const t0 = ctx.currentTime; src.onended = () => stopPlay(); void ctx.resume?.();
    src.start(0, s, e - s); play.current = { ctx, src }; setPlaying(true); setHead(s);
    const loop = () => { setHead(Math.min(e, s + (ctx.currentTime - t0))); raf.current = requestAnimationFrame(loop); }; loop();
  };
  const exportWav = () => {
    if (!a) return; dropOut(); const sr = a.buffer.sampleRate; const chans = Array.from({ length: a.buffer.numberOfChannels }, (_, i) => a.buffer.getChannelData(i)); const cut = sliceChannels(chans, sr, r[0], r[1]);
    const wav = encodeWav(cut, sr); const info = parseWavHeader(wav)!; const url = URL.createObjectURL(new Blob([wav], { type: "audio/wav" })); outUrl.current = url;
    const base = a.name.replace(/\.[^.]+$/, "") || "audio"; setOut({ url, name: `${base}-trim.wav`, bytes: wav.byteLength, seconds: info.seconds, info: `WAV, ${info.bits}-bit PCM, ${info.sampleRate} Hz, ${info.channels} channel${info.channels === 1 ? "" : "s"}` });
  };
  const trimSilence = () => { if (!a) return; dropOut(); const [x, y] = silenceRange(a.env); const [s, e] = clampTrim((x / BUCKETS) * dur, ((y + 1) / BUCKETS) * dur, dur); setR([s, e]); };
  const pct = (t: number) => (dur ? (t / dur) * 100 : 0);

  return (
    <Stack>
      <SourcePicker kind="audio" current={a?.name} onPick={(p) => void load(p)} />
      <Row><Btn sm onClick={sample}>Load a sample tone</Btn><span className="p3-note">A 6 second generated WAV (silence, 440 Hz, 660 Hz, silence) that goes through the same decoder.</span></Row>
      {status === "decoding" && <p className="p3-note" role="status">Decoding audio…</p>}
      {status === "error" && <Alert s="danger" title="Could not load audio" onClose={() => setStatus("idle")}>{err}</Alert>}
      {!a && status !== "decoding" && <p className="p3-note">Load an audio file, drop one on the area above, or pick a recording from C043 to see its waveform.</p>}
      {a && <>
        <div className="p3-wave" ref={box}>
          <svg viewBox={`0 0 ${BUCKETS} 40`} preserveAspectRatio="none" className="p3-wave__svg" role="img" aria-label={`Waveform of ${a.name}, ${fmtClock(dur)} long, selection ${fmtClock(r[0])} to ${fmtClock(r[1])}`}>
            {Array.from({ length: BUCKETS }, (_, i) => { const hi = a.peaks.max[i], lo = a.peaks.min[i]; const t = ((i + 0.5) / BUCKETS) * dur; const h = Math.max(0.5, (hi - lo) * 19); return <rect key={i} x={i + 0.1} width={0.8} y={20 - hi * 19} height={h} className={t >= r[0] && t <= r[1] ? "is-in" : ""} />; })}
          </svg>
          <span className="p3-wave__shade" style={{ insetInlineStart: 0, inlineSize: `${pct(r[0])}%` }} /><span className="p3-wave__shade" style={{ insetInlineEnd: 0, inlineSize: `${100 - pct(r[1])}%` }} />
          {([0, 1] as const).map((i) => <span key={i} role="slider" tabIndex={0} className="p3-wave__handle" aria-label={i === 0 ? "Trim start" : "Trim end"} aria-valuemin={0} aria-valuemax={Math.round(dur * 100) / 100} aria-valuenow={Math.round(r[i] * 100) / 100} aria-valuetext={fmtClock(r[i])} style={{ insetInlineStart: `${pct(r[i])}%` }} onPointerDown={drag(i)} onKeyDown={nudge(i)} />)}
          {playing && <span className="p3-wave__play" style={{ insetInlineStart: `${pct(head)}%` }} aria-hidden />}
        </div>
        <p className="p3-note">Handles: drag, or focus one and use the arrow keys (0.1 s, Shift 1 s, Alt 0.01 s), Page Up and Down (5 s), Home and End.</p>
        <Row><TimeField label="Start (seconds)" value={r[0]} max={dur} onCommit={(v) => move(0, v)} /><TimeField label="End (seconds)" value={r[1]} max={dur} onCommit={(v) => move(1, v)} />
          <Badge s="info">{a.buffer.numberOfChannels === 1 ? "Mono" : `${a.buffer.numberOfChannels} channels`} · {a.buffer.sampleRate} Hz</Badge></Row>
        <Row><Btn sm icon={playing ? "stop" : "play"} onClick={toggle}>{playing ? "Stop playback" : "Play selection"}</Btn><Btn sm onClick={trimSilence}>Trim silence</Btn><Btn sm variant="ghost" onClick={() => { dropOut(); setR([0, dur]); }}>Reset</Btn><Btn variant="primary" sm onClick={exportWav} disabled={trimLength(r) < MIN_TRIM / 2}>Export WAV</Btn>
          <span className="p3-note" role="status">Keeps {fmtClock(trimLength(r))} of {fmtClock(dur)}{playing ? " · playing" : ""}</span></Row>
        {out && <div className="p3-result"><b>{out.name}</b><span className="p3-note">{fmtClock(out.seconds)} · {fmtBytes(out.bytes)} · {out.info}</span><audio controls src={out.url} aria-label="Trimmed audio" /><a className="jp-btn jp-btn--sm jp-btn--primary" href={out.url} download={out.name}>Download WAV</a></div>}
      </>}
      <Note>Audio is decoded in this tab with the Web Audio API and never uploaded. The waveform shows the true minimum and maximum of each slice. The browser resamples to its audio rate when decoding (usually 44.1 or 48 kHz), so the export is uncompressed 16-bit PCM WAV at that rate with all channels kept.</Note>
    </Stack>
  );
}
