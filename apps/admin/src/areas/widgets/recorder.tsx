import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Badge, Btn } from "@belikh/jupiter-ui/kit.tsx";
import { Checkbox, Segmented, Select } from "@belikh/jupiter-ui/inputs.tsx";
import { fmtBytes, rmsFromBytes } from "./audio.ts";
import { shelfAdd, shelfRemove } from "./shelf.ts";
import { Note, Row, Stack } from "./ui.tsx";

/* ---------------- C043 audio / video recorder ---------------- */
type Clip = { id: number; kind: "audio" | "video"; seconds: number; bytes: number; url?: string; name: string; shelfId?: number; simulated: boolean };
export const canRecord = (): boolean => typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
type PermState = PermissionState | "unknown";

/** Turn a getUserMedia / MediaRecorder failure into a message that says what to do next. */
export function describeMediaError(e: unknown): string {
  const name = (e as { name?: string })?.name ?? ""; const msg = (e as { message?: string })?.message ?? "";
  if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") return "Permission to use the microphone or camera was denied. Allow access in the browser's site settings and try again, or use simulated recording.";
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "No microphone or camera was found. Connect one and press Refresh devices, or use simulated recording.";
  if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") return "The device could not be opened. Another application may be using it; close it and try again.";
  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") return "The selected device is no longer available. Pick another device from the list.";
  return `Could not start recording: ${msg || name || "unknown error"}`;
}
const pickMime = (video: boolean): string | undefined => {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return undefined;
  return (video ? ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"] : ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"]).find((m) => MediaRecorder.isTypeSupported(m));
};
const extFor = (mime: string) => (mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm");
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
type AC = typeof AudioContext;
const audioCtor = (): AC | undefined => (typeof window === "undefined" ? undefined : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: AC }).webkitAudioContext));

export function Recorder({ maxSeconds = 30, forceSimulated }: { maxSeconds?: number; forceSimulated?: boolean }) {
  const supported = canRecord(); const [sim, setSim] = useState(!!forceSimulated || !supported); const [kind, setKind] = useState<"audio" | "video">("audio");
  const [state, setState] = useState<"idle" | "recording" | "paused">("idle"); const [secs, setSecs] = useState(0); const [clips, setClips] = useState<Clip[]>([]); const [err, setErr] = useState(""); const [level, setLevel] = useState(0);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]); const [cams, setCams] = useState<MediaDeviceInfo[]>([]); const [micId, setMicId] = useState(""); const [camId, setCamId] = useState(""); const [perm, setPerm] = useState<{ mic: PermState; cam: PermState }>({ mic: "unknown", cam: "unknown" });
  const rec = useRef<MediaRecorder | null>(null); const stream = useRef<MediaStream | null>(null); const chunks = useRef<Blob[]>([]); const id = useRef(0); const preview = useRef<HTMLVideoElement>(null);
  const acc = useRef(0); const segStart = useRef(0); const timer = useRef(0); const raf = useRef(0); const actx = useRef<AudioContext | null>(null); const clipsRef = useRef<Clip[]>([]); clipsRef.current = clips; const kindRef = useRef(kind); kindRef.current = kind;
  const elapsedNow = () => acc.current + (segStart.current ? (Date.now() - segStart.current) / 1000 : 0);

  const stopMeter = () => { cancelAnimationFrame(raf.current); if (actx.current) { void actx.current.close().catch(() => undefined); actx.current = null; } };
  const stopTracks = () => { stopMeter(); stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; if (preview.current) preview.current.srcObject = null; };
  useEffect(() => () => { window.clearInterval(timer.current); stopTracks(); clipsRef.current.forEach((c) => { if (c.url) URL.revokeObjectURL(c.url); if (c.shelfId) shelfRemove(c.shelfId); }); }, []);

  /* devices and permission state */
  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try { const all = await navigator.mediaDevices.enumerateDevices(); setMics(all.filter((d) => d.kind === "audioinput")); setCams(all.filter((d) => d.kind === "videoinput")); } catch { /* listing is best effort */ }
  }, []);
  useEffect(() => {
    if (sim || !supported) return; void refreshDevices(); const md = navigator.mediaDevices; md.addEventListener?.("devicechange", refreshDevices);
    const cleanups: (() => void)[] = [() => md.removeEventListener?.("devicechange", refreshDevices)];
    (["microphone", "camera"] as const).forEach((n) => { try { void navigator.permissions?.query({ name: n as PermissionName }).then((p) => { const set = () => setPerm((x) => ({ ...x, [n === "microphone" ? "mic" : "cam"]: p.state })); set(); p.onchange = set; cleanups.push(() => { p.onchange = null; }); }).catch(() => undefined); } catch { /* permission name not supported */ } });
    return () => cleanups.forEach((f) => f());
  }, [sim, supported, refreshDevices]);
  const enable = async () => {
    setErr(""); try { const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: kind === "video" }); s.getTracks().forEach((t) => t.stop()); await refreshDevices(); setPerm((p) => ({ ...p, mic: "granted", cam: kind === "video" ? "granted" : p.cam })); } catch (e) { setErr(describeMediaError(e)); }
  };

  const finish = useCallback((blob: Blob | null, seconds: number) => {
    window.clearInterval(timer.current); const k = kindRef.current; const n = ++id.current; let url: string | undefined, shelfId: number | undefined; const mime = blob?.type || (k === "video" ? "video/webm" : "audio/webm"); const name = `${k}-clip-${n}.${extFor(mime)}`;
    if (blob) { url = URL.createObjectURL(blob); shelfId = shelfAdd({ kind: k, blob, name, seconds }).id; }
    setClips((c) => [{ id: n, kind: k, seconds, bytes: blob?.size ?? Math.round(seconds * (k === "audio" ? 16000 : 250000)), url, name, shelfId, simulated: !blob }, ...c]);
    setState("idle"); setSecs(0); acc.current = 0; segStart.current = 0; setLevel(0); stopTracks();
  }, []);
  const stop = useCallback(() => {
    const seconds = elapsedNow(); acc.current = seconds; segStart.current = 0; window.clearInterval(timer.current);
    if (sim) { finish(null, seconds); return; }
    const r = rec.current; if (r && r.state !== "inactive") { (r as MediaRecorder & { _secs?: number })._secs = seconds; r.stop(); } else finish(null, seconds);
  }, [sim, finish]);
  const tick = useCallback(() => {
    window.clearInterval(timer.current);
    timer.current = window.setInterval(() => { const s = elapsedNow(); setSecs(s); if (sim) setLevel(0.2 + 0.6 * Math.abs(Math.sin(s * 3.1)) * (0.5 + 0.5 * Math.random())); if (s >= maxSeconds) stop(); }, 200);
  }, [maxSeconds, stop, sim]);

  const meter = (s: MediaStream) => {
    const AC = audioCtor(); if (!AC || !s.getAudioTracks().length) return;
    try { const ctx = new AC(); actx.current = ctx; void ctx.resume?.(); const an = ctx.createAnalyser(); an.fftSize = 1024; ctx.createMediaStreamSource(s).connect(an); const data = new Uint8Array(an.fftSize); let last = 0;
      const loop = () => { an.getByteTimeDomainData(data); const v = Math.min(1, rmsFromBytes(data) * 4); if (Math.abs(v - last) > 0.01) { last = v; setLevel(v); } raf.current = requestAnimationFrame(loop); }; loop();
    } catch { /* no meter: recording still works */ }
  };

  const start = async () => {
    setErr(""); acc.current = 0; setSecs(0);
    if (sim) { segStart.current = Date.now(); setState("recording"); tick(); return; }
    try {
      const audio: MediaTrackConstraints | boolean = micId ? { deviceId: { exact: micId } } : true; const video: MediaTrackConstraints | boolean = kind === "video" ? (camId ? { deviceId: { exact: camId } } : true) : false;
      const s = await navigator.mediaDevices.getUserMedia({ audio, video }); stream.current = s; chunks.current = [];
      const mime = pickMime(kind === "video"); const r = mime ? new MediaRecorder(s, { mimeType: mime }) : new MediaRecorder(s); rec.current = r;
      r.ondataavailable = (e) => { if (e.data && e.data.size) chunks.current.push(e.data); };
      r.onerror = (e) => { setErr(describeMediaError((e as unknown as { error?: unknown }).error)); stopTracks(); window.clearInterval(timer.current); setState("idle"); };
      r.onstop = () => { const secsHint = (r as MediaRecorder & { _secs?: number })._secs ?? acc.current; finish(new Blob(chunks.current, { type: r.mimeType || mime || (kind === "video" ? "video/webm" : "audio/webm") }), secsHint); };
      r.start(250); segStart.current = Date.now(); setState("recording"); tick(); meter(s); void refreshDevices(); setPerm((p) => ({ ...p, mic: "granted" }));
      if (kind === "video" && preview.current) { preview.current.srcObject = s; void preview.current.play?.().catch(() => undefined); }
    } catch (e) { stopTracks(); setErr(describeMediaError(e)); if ((e as Error)?.name === "NotAllowedError") setPerm((p) => ({ ...p, mic: "denied" })); }
  };
  const pause = () => { acc.current = elapsedNow(); segStart.current = 0; window.clearInterval(timer.current); if (!sim) rec.current?.pause(); setSecs(acc.current); setState("paused"); };
  const resume = () => { if (!sim) rec.current?.resume(); segStart.current = Date.now(); setState("recording"); tick(); };
  const idle = state === "idle"; const permBadge = (p: PermState) => <Badge s={p === "granted" ? "ok" : p === "denied" ? "danger" : "info"}>{p === "unknown" ? "not asked" : p}</Badge>;
  return (
    <Stack>
      {!supported && <Alert s="info" title="Recording is not available in this browser">MediaRecorder or media devices are missing, so this demo uses simulated recording: no audio or video is captured.</Alert>}
      <Row><Segmented label="Recording type" value={kind} onChange={(k) => idle && setKind(k)} options={[{ value: "audio", label: "Audio" }, { value: "video", label: "Video" }]} />
        <Checkbox checked={sim} onChange={(v) => idle && setSim(v)} disabled={!supported || !idle} label="Simulated recording (no device access)" />
        <Badge s={sim ? "warn" : "ok"}>{sim ? "Simulated" : "Live device"}</Badge></Row>
      {!sim && <>
        <Row className="lab-devices">
          <label className="lab-field"><span className="jp-label">Microphone</span><Select value={micId} disabled={!idle} aria-label="Microphone" onChange={setMicId} options={[{ value: "", label: mics.length ? "Default microphone" : "Default (grant access to list devices)" }, ...mics.filter((d) => d.deviceId && d.deviceId !== "default").map((d, i) => ({ value: d.deviceId, label: d.label || `Microphone ${i + 1}` }))]} /></label>
          {kind === "video" && <label className="lab-field"><span className="jp-label">Camera</span><Select value={camId} disabled={!idle} aria-label="Camera" onChange={setCamId} options={[{ value: "", label: cams.length ? "Default camera" : "Default (grant access to list devices)" }, ...cams.filter((d) => d.deviceId).map((d, i) => ({ value: d.deviceId, label: d.label || `Camera ${i + 1}` }))]} /></label>}
          <Btn sm onClick={() => void enable()} disabled={!idle}>Enable devices</Btn><Btn sm variant="ghost" onClick={() => void refreshDevices()} disabled={!idle}>Refresh devices</Btn>
        </Row>
        <p className="lab-note" role="status">Microphone permission: {permBadge(perm.mic)}{kind === "video" && <> Camera permission: {permBadge(perm.cam)}</>} {perm.mic === "denied" && "Blocked in the browser: change it in the site settings, then press Enable devices."}</p></>}
      {kind === "video" && !sim && <video ref={preview} className="lab-videoprev" muted playsInline aria-label="Camera preview" />}
      {kind === "video" && sim && <div className="lab-videoprev lab-videoprev--sim" role="img" aria-label="Simulated camera preview">{state === "recording" ? "REC" : "Simulated camera"}</div>}
      <div className="lab-rec">
        <span className={`lab-rec__dot ${state === "recording" ? "is-live" : ""}`} aria-hidden /><b className="lab-mono" role="timer" aria-label="Recording time">{fmt(secs)}</b><span className="lab-note">/ {fmt(maxSeconds)}</span>
        <div className="lab-meter" role="meter" aria-label="Input level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level * 100)}><i style={{ inlineSize: `${level * 100}%` }} /></div>
      </div>
      <Row>
        {idle && <Btn variant="primary" icon="play" onClick={() => void start()}>Start recording</Btn>}
        {state === "recording" && <Btn onClick={pause}>Pause</Btn>}{state === "paused" && <Btn onClick={resume}>Resume</Btn>}
        {!idle && <Btn variant="primary" icon="stop" onClick={stop}>Stop and save</Btn>}
        <span className="lab-note" role="status">{state === "recording" ? "Recording…" : state === "paused" ? "Paused" : clips.length ? `${clips.length} clip${clips.length === 1 ? "" : "s"} saved` : "Ready"}</span>
      </Row>
      {err && <Alert s="danger" title="Recording failed" onClose={() => setErr("")}>{err}{supported && !sim && <> <Btn sm variant="secondary" onClick={() => { setSim(true); setErr(""); }}>Use simulated recording</Btn></>}</Alert>}
      {clips.length > 0 && <ul className="lab-clips" aria-label="Recordings">{clips.map((c) => <li key={c.id}><b>{c.kind === "audio" ? "Audio" : "Video"} clip {c.id}</b><span className="lab-note">{fmt(c.seconds)} · {fmtBytes(c.bytes)}{c.simulated ? " · simulated" : ""}</span>
        {c.url && (c.kind === "audio" ? <audio controls src={c.url} aria-label={`Play clip ${c.id}`} /> : <video controls src={c.url} className="lab-videoprev" aria-label={`Play clip ${c.id}`} />)}
        {c.url && <a className="jp-btn jp-btn--sm jp-btn--secondary" href={c.url} download={c.name} aria-label={`Download clip ${c.id}`}>Download</a>}
        <Btn sm variant="ghost" onClick={() => { if (c.url) URL.revokeObjectURL(c.url); if (c.shelfId) shelfRemove(c.shelfId); setClips((x) => x.filter((y) => y.id !== c.id)); }} aria-label={`Delete clip ${c.id}`}>Delete</Btn></li>)}</ul>}
      <Note>Nothing is uploaded: real recordings stay in this tab and are offered to the trim and thumbnail editors below. They are released when deleted or when you leave the page. The recording limit is {maxSeconds} seconds. Simulated mode captures nothing and is the fallback when the API is missing or you choose it.</Note>
    </Stack>
  );
}
