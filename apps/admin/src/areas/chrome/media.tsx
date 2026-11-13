import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import "./chrome.css";
import { Btn } from "@belikh/jupiter-ui/kit.tsx";
import { Graphic, Icon } from "@belikh/jupiter-ui/Icon.tsx";
import { fmtTime, makeWav, MELODY, peaks, pdfUrl } from "./pdf.ts";
import { swipeDir } from "./engine.ts";

/* ---------- lightbox / image viewer: prev/next, zoom, thumbnails, keyboard ---------- */
export type Img = { id: string; title: string; caption?: string };
export function Lightbox({ images, index, onIndex, onClose }: { images: Img[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const [zoom, setZoom] = useState(1); const ref = useRef<HTMLDivElement>(null); const img = images[index];
  useEffect(() => { setZoom(1); }, [index]); useEffect(() => { ref.current?.focus(); }, []);
  const go = (d: number) => onIndex((index + d + images.length) % images.length);
  const key = (e: React.KeyboardEvent) => { if (e.key === "Escape") onClose(); else if (e.key === "ArrowRight") go(1); else if (e.key === "ArrowLeft") go(-1); else if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(4, z + 0.25)); else if (e.key === "-") setZoom((z) => Math.max(0.5, z - 0.25)); else if (e.key === "0") setZoom(1); };
  return (
    <div className="adm-lightbox" role="dialog" aria-modal="true" aria-label={`Image viewer: ${img.title}`} tabIndex={-1} ref={ref} onKeyDown={key}>
      <header><b>{img.title}</b><span className="jp-muted adm-num">{index + 1} / {images.length}</span><span className="adm-spacer" />
        <button className="adm-x" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>−</button><span className="adm-num" aria-live="polite">{Math.round(zoom * 100)}%</span><button className="adm-x" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(4, z + 0.25))}>+</button><button className="adm-x" aria-label="Reset zoom" onClick={() => setZoom(1)}>Fit</button><button className="adm-x" aria-label="Close viewer" onClick={onClose}>×</button></header>
      <div className="adm-lightbox__stage" onWheel={(e) => setZoom((z) => Math.min(4, Math.max(0.5, z + (e.deltaY < 0 ? 0.1 : -0.1))))}>
        <button className="adm-lightbox__nav is-prev" aria-label="Previous image" onClick={() => go(-1)}><Icon name="chevron-left" size={28} /></button>
        <div className="adm-lightbox__img" style={{ transform: `scale(${zoom})` }}><Graphic id={img.id} size="100%" title={img.title} /></div>
        <button className="adm-lightbox__nav is-next" aria-label="Next image" onClick={() => go(1)}><Icon name="chevron-right" size={28} /></button>
      </div>
      {img.caption && <p className="adm-lightbox__cap">{img.caption}</p>}
      <div className="adm-lightbox__thumbs" role="tablist" aria-label="Thumbnails">{images.map((t, i) => <button key={t.id} role="tab" aria-selected={i === index} aria-label={t.title} className={i === index ? "is-on" : ""} onClick={() => onIndex(i)}><Graphic id={t.id} size="100%" /></button>)}</div>
    </div>
  );
}

/* ---------- carousel: keyboard, dots, swipe, autoplay that pauses on hover/focus and respects reduced motion ---------- */
export function Carousel({ slides, label, autoplayMs = 5000 }: { slides: { id: string; node: ReactNode; title: string }[]; label: string; autoplayMs?: number }) {
  const [i, setI] = useState(0); const [playing, setPlaying] = useState(() => !(typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)); const [held, setHeld] = useState(false); const start = useRef<[number, number] | null>(null);
  const go = useCallback((d: number) => setI((x) => (x + d + slides.length) % slides.length), [slides.length]);
  useEffect(() => { if (!playing || held) return; const t = setInterval(() => go(1), autoplayMs); return () => clearInterval(t); }, [playing, held, go, autoplayMs]);
  return (
    <section className="adm-carousel" aria-roledescription="carousel" aria-label={label} onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)} onFocus={() => setHeld(true)} onBlur={() => setHeld(false)} onKeyDown={(e) => { if (e.key === "ArrowRight") go(1); else if (e.key === "ArrowLeft") go(-1); }}
      onPointerDown={(e) => { start.current = [e.clientX, e.clientY]; }} onPointerUp={(e) => { if (!start.current) return; const d = swipeDir(e.clientX - start.current[0], e.clientY - start.current[1], 40); start.current = null; if (d) go(d === "left" ? 1 : -1); }}>
      <div className="adm-carousel__track" style={{ transform: `translateX(calc(${-i * 100}% * var(--dir, 1)))` }} aria-live={playing && !held ? "off" : "polite"}>
        {slides.map((s, k) => <div key={s.id} className="adm-carousel__slide" role="group" aria-roledescription="slide" aria-label={`${k + 1} of ${slides.length}: ${s.title}`} aria-hidden={k !== i}>{s.node}</div>)}
      </div>
      <div className="adm-carousel__bar"><button className="adm-x" aria-label="Previous slide" onClick={() => go(-1)}>‹</button><div className="adm-carousel__dots" role="tablist" aria-label="Slides">{slides.map((s, k) => <button key={s.id} role="tab" aria-selected={k === i} aria-label={`Slide ${k + 1}: ${s.title}`} className={k === i ? "is-on" : ""} onClick={() => setI(k)} />)}</div><button className="adm-x" aria-label="Next slide" onClick={() => go(1)}>›</button>
        <button className="adm-x" aria-pressed={playing} aria-label={playing ? "Pause autoplay" : "Start autoplay"} onClick={() => setPlaying(!playing)}>{playing ? "Pause" : "Play"}</button></div>
    </section>
  );
}

/* ---------- paged document viewer + a real generated PDF ---------- */
export function DocViewer({ pages, title }: { pages: ReactNode[]; title: string }) {
  const [p, setP] = useState(1); const [zoom, setZoom] = useState(1); const n = pages.length; const go = (x: number) => setP(Math.max(1, Math.min(n, x)));
  return (
    <div className="adm-docv" role="region" aria-label={`Document viewer: ${title}`} onKeyDown={(e) => { if (e.key === "PageDown" || e.key === "ArrowRight") go(p + 1); else if (e.key === "PageUp" || e.key === "ArrowLeft") go(p - 1); else if (e.key === "Home") go(1); else if (e.key === "End") go(n); }} tabIndex={0}>
      <div className="adm-docv__bar"><b>{title}</b><span className="adm-spacer" /><button className="adm-x" aria-label="Previous page" disabled={p <= 1} onClick={() => go(p - 1)}>‹</button><label className="adm-row" style={{ gap: 4 }}><input className="jp-input jp-input--mono adm-docv__page" aria-label="Page number" value={p} onChange={(e) => go(Number(e.target.value) || 1)} /> / {n}</label><button className="adm-x" aria-label="Next page" disabled={p >= n} onClick={() => go(p + 1)}>›</button>
        <button className="adm-x" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>−</button><span className="adm-num">{Math.round(zoom * 100)}%</span><button className="adm-x" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(2, z + 0.25))}>+</button></div>
      <div className="adm-docv__body"><aside aria-label="Page thumbnails">{pages.map((_, i) => <button key={i} className={p === i + 1 ? "is-on" : ""} aria-label={`Go to page ${i + 1}`} aria-current={p === i + 1 ? "page" : undefined} onClick={() => setP(i + 1)}><span>{i + 1}</span></button>)}</aside>
        <div className="adm-docv__scroll"><div className="adm-docv__page-sheet" style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>{pages[p - 1]}</div></div></div>
    </div>
  );
}
export function PdfEmbed({ title, pages }: { title: string; pages: string[][] }) {
  const url = useMemo(() => pdfUrl(title, pages), [title, pages]); useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return url ? <div className="adm-pdf"><iframe title={`${title} (PDF)`} src={url} /><a className="jp-btn jp-btn--secondary jp-btn--sm" href={url} download={`${title.toLowerCase().replace(/\W+/g, "-")}.pdf`}>Download PDF</a></div> : <p className="jp-muted">PDF preview needs a browser with Blob URLs.</p>;
}

/* ---------- media controls shared by audio and the canvas "video" ---------- */
export function MediaControls({ playing, time, duration, volume, rate, onToggle, onSeek, onVolume, onRate, loop, onLoop, extra }: { playing: boolean; time: number; duration: number; volume?: number; rate: number; onToggle: () => void; onSeek: (t: number) => void; onVolume?: (v: number) => void; onRate: (r: number) => void; loop: boolean; onLoop: (v: boolean) => void; extra?: ReactNode }) {
  return (
    <div className="adm-mc" role="group" aria-label="Media controls">
      <button className="adm-mc__play" aria-label={playing ? "Pause" : "Play"} onClick={onToggle}><Icon name={playing ? "pause" : "play"} size={20} /></button>
      <span className="adm-num adm-mc__t">{fmtTime(time)}</span>
      <input type="range" className="adm-mc__seek" aria-label="Seek" min={0} max={Math.max(0.01, duration)} step={0.05} value={time} onChange={(e) => onSeek(Number(e.target.value))} aria-valuetext={`${fmtTime(time)} of ${fmtTime(duration)}`} />
      <span className="adm-num adm-mc__t">{fmtTime(duration)}</span>
      {onVolume && <label className="adm-row" style={{ gap: 4 }}><span className="adm-sr">Volume</span><Icon name="music" size={14} /><input type="range" aria-label="Volume" min={0} max={1} step={0.05} value={volume ?? 1} onChange={(e) => onVolume(Number(e.target.value))} style={{ width: 70 }} /></label>}
      <select className="jp-select adm-mini" aria-label="Playback speed" value={rate} onChange={(e) => onRate(Number(e.target.value))}>{[0.5, 1, 1.5, 2].map((r) => <option key={r} value={r}>{r}×</option>)}</select>
      <label className="adm-check"><input type="checkbox" checked={loop} onChange={(e) => onLoop(e.target.checked)} /><span>Loop</span></label>{extra}
    </div>
  );
}
/** Real <audio> over a generated WAV, with a clickable waveform. */
export function AudioPlayer() {
  const wav = useMemo(() => makeWav(MELODY), []); const bars = useMemo(() => peaks(wav.samples, 72), [wav]);
  const url = useMemo(() => (typeof URL !== "undefined" && URL.createObjectURL ? URL.createObjectURL(new Blob([wav.bytes.buffer as ArrayBuffer], { type: "audio/wav" })) : ""), [wav]);
  const a = useRef<HTMLAudioElement>(null); const [playing, setPlaying] = useState(false); const [time, setTime] = useState(0); const [vol, setVol] = useState(0.7); const [rate, setRate] = useState(1); const [loop, setLoop] = useState(false);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const toggle = () => { const el = a.current; if (!el) return; if (el.paused) { void el.play?.()?.catch?.(() => setPlaying(false)); } else el.pause?.(); };
  return (
    <div className="adm-player">
      <audio ref={a} src={url} preload="metadata" loop={loop} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}><track kind="captions" /></audio>
      <div className="adm-wave" role="slider" aria-label="Waveform: click to seek" aria-valuemin={0} aria-valuemax={Math.round(wav.seconds)} aria-valuenow={Math.round(time)} tabIndex={0} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); const t = ((e.clientX - r.left) / r.width) * wav.seconds; if (a.current) a.current.currentTime = t; setTime(t); }}
        onKeyDown={(e) => { if (e.key === "ArrowRight" && a.current) a.current.currentTime = Math.min(wav.seconds, a.current.currentTime + 2); if (e.key === "ArrowLeft" && a.current) a.current.currentTime = Math.max(0, a.current.currentTime - 2); if (e.key === " ") { e.preventDefault(); toggle(); } }}>
        {bars.map((b, i) => <i key={i} className={i / bars.length <= time / wav.seconds ? "is-played" : ""} style={{ height: `${Math.max(6, b * 100)}%` }} />)}</div>
      <MediaControls playing={playing} time={time} duration={wav.seconds} volume={vol} rate={rate} loop={loop} onLoop={setLoop} onToggle={toggle} onSeek={(t) => { if (a.current) a.current.currentTime = t; setTime(t); }} onVolume={(v) => { setVol(v); if (a.current) a.current.volume = v; }} onRate={(r) => { setRate(r); if (a.current) a.current.playbackRate = r; }} />
    </div>
  );
}
/** A video-style player: a canvas animation on its own clock, with the same controls. (Not a codec demo: no video file is shipped.) */
export function VideoPlayer({ duration = 12 }: { duration?: number }) {
  const cv = useRef<HTMLCanvasElement>(null); const [playing, setPlaying] = useState(false); const [time, setTime] = useState(0); const [rate, setRate] = useState(1); const [loop, setLoop] = useState(true); const clock = useRef({ t: 0, last: 0, raf: 0 });
  const draw = useCallback((t: number) => {
    const c = cv.current; const g = c?.getContext?.("2d"); if (!c || !g) return; const css = getComputedStyle(c); const col = (v: string) => css.getPropertyValue(v).trim() || "#888";
    g.fillStyle = col("--jp-surface"); g.fillRect(0, 0, c.width, c.height); g.strokeStyle = col("--jp-border"); g.lineWidth = 1; for (let x = 0; x < c.width; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, c.height); g.stroke(); }
    const k = t / duration; g.strokeStyle = col("--jp-accent"); g.lineWidth = 3; g.beginPath(); for (let x = 0; x <= c.width; x += 4) { const y = c.height / 2 + Math.sin(x / 40 + t * 2) * 50 * Math.sin(k * Math.PI); x === 0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke();
    g.fillStyle = col("--jp-text"); g.font = "600 20px sans-serif"; g.fillText(`scene ${Math.floor(k * 4) + 1}/4`, 16, 30);
  }, [duration]);
  useEffect(() => { draw(time); }, [draw, time]);
  useEffect(() => {
    if (!playing) return; const c = clock.current; c.last = performance.now();
    const step = (now: number) => { const dt = ((now - c.last) / 1000) * rate; c.last = now; c.t += dt; if (c.t >= duration) { if (loop) c.t = 0; else { c.t = duration; setPlaying(false); } } setTime(c.t); c.raf = requestAnimationFrame(step); };
    c.raf = requestAnimationFrame(step); return () => cancelAnimationFrame(c.raf);
  }, [playing, rate, loop, duration]);
  return (
    <div className="adm-player">
      <canvas ref={cv} width={640} height={300} className="adm-video" role="img" aria-label="Simulated video: an animated waveform" />
      <MediaControls playing={playing} time={time} duration={duration} rate={rate} loop={loop} onLoop={setLoop} onToggle={() => setPlaying((p) => !p)} onSeek={(t) => { clock.current.t = t; setTime(t); }} onRate={setRate}
        extra={<Btn sm variant="ghost" onClick={() => { const el = cv.current?.parentElement; if (document.fullscreenElement) void document.exitFullscreen(); else void el?.requestFullscreen?.(); }}>Fullscreen</Btn>} />
    </div>
  );
}
