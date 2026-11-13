import { useEffect, useRef, useState } from "react";
import { Alert, Badge, Btn } from "@belikh/jupiter-ui/kit.tsx";
import { fmtBytes, fmtClock } from "./audio.ts";
import { SourcePicker, type Picked } from "./sourcepicker.tsx";
import { bestFrame } from "./geometry.ts";
import { frameDiff, frameScore, lumaContrast, meanLuma, sampleTimes, usableDuration } from "./video.ts";
import { Note, Row, Stack } from "./ui.tsx";

const FRAMES = 12; const TW = 160; const TH = 90; const MAIN_W = 640;
type Frame = { t: number; url: string; score: number };
type Meta = { duration: number; w: number; h: number; name: string };
type Shot = { url: string; bytes: number; w: number; h: number; name: string; t: number };
const once = (el: HTMLMediaElement, ev: string, ms = 8000) => new Promise<void>((res, rej) => { const to = window.setTimeout(() => { el.removeEventListener(ev, ok); rej(new Error(`Timed out waiting for the video (${ev})`)); }, ms); const ok = () => { window.clearTimeout(to); res(); }; el.addEventListener(ev, ok, { once: true }); });
/** Seek and wait for the frame. Resolves immediately when already there and a frame is decoded. */
async function seek(v: HTMLVideoElement, t: number) { if (v.readyState >= 2 && Math.abs(v.currentTime - t) < 0.001) return; const p = once(v, "seeked"); v.currentTime = t; await p; }
/** MediaRecorder webm reports an Infinite duration until the end has been found: seek far ahead to make the browser measure it. */
async function prepare(v: HTMLVideoElement, hint: number): Promise<number> {
  if (v.readyState < 1) await once(v, "loadedmetadata");
  if (!Number.isFinite(v.duration)) { const p = new Promise<void>((res) => { const done = () => { v.removeEventListener("durationchange", done); v.removeEventListener("timeupdate", done); res(); }; v.addEventListener("durationchange", done); v.addEventListener("timeupdate", done); window.setTimeout(done, 4000); }); v.currentTime = 1e101; await p; }
  const d = usableDuration(v.duration, hint); await seek(v, 0); return d;
}
const toBlob = (c: HTMLCanvasElement, type: string): Promise<Blob | null> => new Promise((res) => (typeof c.toBlob === "function" ? c.toBlob(res, type) : res(null)));

/* ---------------- C048 video thumbnail picker ---------------- */
export function ThumbnailPicker() {
  const video = useRef<HTMLVideoElement>(null); const main = useRef<HTMLCanvasElement>(null); const urls = useRef<string[]>([]); const srcUrl = useRef<string | null>(null); const shotUrl = useRef<string | null>(null); const job = useRef(0); const seq = useRef(0);
  const [meta, setMeta] = useState<Meta | null>(null); const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle"); const [err, setErr] = useState(""); const [src, setSrc] = useState<string | null>(null);
  const [frames, setFrames] = useState<Frame[]>([]); const [progress, setProgress] = useState(0); const [t, setT] = useState(0); const [cover, setCover] = useState<number | null>(null); const [shot, setShot] = useState<Shot | null>(null); const [capturing, setCapturing] = useState(false);
  const revokeAll = () => { urls.current.forEach((u) => URL.revokeObjectURL(u)); urls.current = []; };
  useEffect(() => () => { job.current++; revokeAll(); if (srcUrl.current) URL.revokeObjectURL(srcUrl.current); if (shotUrl.current) URL.revokeObjectURL(shotUrl.current); }, []);

  const drawMain = (at?: number) => { const v = video.current, c = main.current; if (!v || !c || !v.videoWidth) return; const s = Math.min(1, MAIN_W / v.videoWidth); c.width = Math.round(v.videoWidth * s); c.height = Math.round(v.videoHeight * s); c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height); void at; };
  const goTo = async (to: number) => { const v = video.current; if (!v || !meta) return; const my = ++seq.current; const at = Math.min(Math.max(0, to), meta.duration); setT(at); try { await seek(v, at); if (my === seq.current) drawMain(); } catch (e) { setErr((e as Error).message); } };

  const load = async (p: Picked) => {
    const v = video.current; if (!v) return; const my = ++job.current; setStatus("loading"); setErr(""); setFrames([]); setCover(null); setMeta(null); setShot(null); setProgress(0); setCapturing(false); revokeAll();
    if (srcUrl.current) URL.revokeObjectURL(srcUrl.current); const url = URL.createObjectURL(p.blob); srcUrl.current = url; setSrc(url); v.src = url; v.muted = true; v.preload = "auto";
    try {
      v.load(); await Promise.race([once(v, "loadedmetadata", 10000), new Promise<void>((_, rej) => v.addEventListener("error", () => rej(new Error("The browser could not decode this video.")), { once: true }))]);
      const duration = await prepare(v, p.seconds); if (my !== job.current) return; if (!v.videoWidth || duration <= 0) throw new Error("This file has no readable video track.");
      setMeta({ duration, w: v.videoWidth, h: v.videoHeight, name: p.name }); setT(0); drawMain(); setStatus("ready");
      /* thumbnail strip: capture, then score on the same small frame */
      const th = document.createElement("canvas"); th.width = TW; th.height = TH; const ctx = th.getContext("2d", { willReadFrequently: true }); if (!ctx) throw new Error("Canvas is not available.");
      setCapturing(true); const out: Frame[] = []; let prev: Uint8ClampedArray | null = null;
      for (const [i, at] of sampleTimes(duration, FRAMES).entries()) {
        await seek(v, at); if (my !== job.current) return; ctx.drawImage(v, 0, 0, TW, TH); const px = ctx.getImageData(0, 0, TW, TH).data; const b = await toBlob(th, "image/jpeg"); if (!b) continue;
        const u = URL.createObjectURL(b); urls.current.push(u); out.push({ t: at, url: u, score: frameScore(lumaContrast(px), prev ? frameDiff(prev, px) : 0, meanLuma(px)) }); prev = new Uint8ClampedArray(px); setFrames([...out]); setProgress(i + 1);
      }
      if (my !== job.current) return; await seek(v, 0); drawMain(); setCapturing(false); if (out.length) { const bi = bestFrame(out.map((f) => f.score)); setCover(out[bi].t); }
    } catch (e) { if (my !== job.current) return; setCapturing(false); setStatus("error"); setErr((e as Error).message || "The video could not be loaded."); }
  };
  const best = frames.length ? bestFrame(frames.map((f) => f.score)) : -1;
  const pickFrame = (f: Frame) => { setCover(f.t); void goTo(f.t); };
  const exportPng = async () => {
    const v = video.current; if (!v || !meta || cover === null) return; try {
      await seek(v, cover); const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext("2d")?.drawImage(v, 0, 0); const b = await toBlob(c, "image/png"); if (!b) throw new Error("PNG export is not available in this browser.");
      if (shotUrl.current) URL.revokeObjectURL(shotUrl.current); const url = URL.createObjectURL(b); shotUrl.current = url; const base = meta.name.replace(/\.[^.]+$/, "") || "video";
      setShot({ url, bytes: b.size, w: c.width, h: c.height, name: `${base}-cover-${cover.toFixed(2)}s.png`, t: cover }); await seek(v, t); drawMain();
    } catch (e) { setErr((e as Error).message); }
  };
  const dur = meta?.duration ?? 0; const coverIsStrip = cover !== null && frames.some((f) => f.t === cover);
  return (
    <Stack>
      <SourcePicker kind="video" current={meta?.name} onPick={(p) => void load(p)} />
      <video ref={video} className="lab-sr" muted playsInline preload="auto" aria-hidden="true" tabIndex={-1} src={src ?? undefined} />
      {status === "loading" && <p className="lab-note" role="status">Loading video…</p>}
      {status === "error" && <Alert s="danger" title="Could not load video" onClose={() => setStatus("idle")}>{err}</Alert>}
      {err && status !== "error" && <Alert s="danger" title="Something went wrong" onClose={() => setErr("")}>{err}</Alert>}
      {!meta && status !== "loading" && <p className="lab-note">Load a video file, drop one on the area above, or pick a video recording from C043.</p>}
      {meta && <>
        <canvas ref={main} className="lab-canvas" role="img" aria-label={`Video frame at ${fmtClock(t)}`} />
        <label className="lab-slider"><span>Scrub</span><input type="range" min={0} max={Math.round(dur * 100) / 100} step={0.05} value={t} aria-label="Scrub through the video" disabled={capturing} aria-valuetext={`${fmtClock(t)} of ${fmtClock(dur)}`} onChange={(e) => void goTo(Number(e.target.value))} /><output>{fmtClock(t)}</output></label>
        <Row><Badge s="info">{meta.w} × {meta.h}</Badge><Badge s="info">{fmtClock(dur)}</Badge>{capturing && <span className="lab-note" role="status">Capturing frames {progress} of {FRAMES}…</span>}</Row>
        <div className="lab-thumbs" role="radiogroup" aria-label="Thumbnail frames">
          {frames.map((f, k) => <button key={k} type="button" role="radio" aria-checked={cover === f.t} aria-label={`Frame ${k + 1} at ${fmtClock(f.t)}${k === best ? ", suggested" : ""}`} className={Math.abs(t - f.t) < 0.03 ? "is-cur" : ""} disabled={capturing} onClick={() => pickFrame(f)}><img src={f.url} alt="" />{k === best && <Badge s="info">Best</Badge>}</button>)}
        </div>
        <Row><Btn sm disabled={best < 0} onClick={() => frames[best] && pickFrame(frames[best])}>Suggest best frame</Btn><Btn sm disabled={capturing} onClick={() => setCover(t)}>Use current frame</Btn>
          <Btn sm variant="primary" disabled={cover === null || capturing} onClick={() => void exportPng()}>Export cover as PNG</Btn>
          <span className="lab-note" role="status">{cover === null ? "No cover chosen" : `Cover: ${coverIsStrip ? `frame ${frames.findIndex((f) => f.t === cover) + 1}` : "custom frame"} at ${fmtClock(cover)}`}</span></Row>
        {shot && <div className="lab-result"><img src={shot.url} alt={`Exported cover at ${fmtClock(shot.t)}`} className="lab-frame lab-frame--big" /><span className="lab-note">{shot.name} · {shot.w} × {shot.h} · {fmtBytes(shot.bytes)}</span><a className="jp-btn jp-btn--sm jp-btn--primary" href={shot.url} download={shot.name}>Download PNG</a></div>}
      </>}
      <Note>Frames are decoded in this tab: the video is sought to evenly spaced times, drawn to a canvas, and scored by detail, change from the previous frame and exposure to suggest a cover. The exported PNG is captured at the video's full resolution. Nothing is uploaded.</Note>
    </Stack>
  );
}
