import { useEffect, useRef, useState } from "react";
import { Btn, Badge } from "@belikh/jupiter-ui/kit.tsx";
import { Slider } from "@belikh/jupiter-ui/inputs.tsx";
import type { Clip, Zone } from "./cameras.data.ts";
import { hhmm } from "./cameras.data.ts";
import { drawFrame, objectAt, classify, motionSegments, describeFrame, readPalette, mmss } from "./cameras.clip.ts";

const CW = 640, CH = 360;
/** Plays a generated clip on a canvas: a procedural scene with a moving object, motion-event overlay and zone hits, play/pause and a scrubbable timeline. */
export function ClipPlayer({ clip, zones }: { clip: Clip; zones: Zone[] }) {
  const cv = useRef<HTMLCanvasElement>(null); const [t, setT] = useState(0); const [playing, setPlaying] = useState(false); const tRef = useRef(0); const zRef = useRef(zones); zRef.current = zones;
  useEffect(() => { setT(0); tRef.current = 0; setPlaying(false); }, [clip.id]);
  useEffect(() => { // draw whenever the time, clip, or zones change
    const el = cv.current; if (!el) return; let g: CanvasRenderingContext2D | null = null; try { g = el.getContext("2d"); } catch { g = null; } if (!g) return;
    drawFrame(g, CW, CH, clip, t, zones, readPalette(el), hhmm(clip.startMin));
  }, [t, clip, zones]);
  useEffect(() => { // advance with real time while playing
    if (!playing) return; let raf = 0, last = performance.now();
    const step = (now: number) => { const dt = Math.min(0.1, (now - last) / 1000); last = now; const n = Math.min(clip.durSec, tRef.current + dt); tRef.current = n; setT(n); if (n >= clip.durSec) { setPlaying(false); return; } raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [playing, clip.durSec]);
  const seek = (v: number) => { const n = Math.min(clip.durSec, Math.max(0, v)); tRef.current = n; setT(n); };
  const o = objectAt(clip, t), hit = classify(o, zones), segs = motionSegments(clip), text = describeFrame(clip, o, hit, t, clip.durSec);
  const atEnd = t >= clip.durSec;
  return (
    <div className="adm-stack">
      <canvas ref={cv} className="hg-canvas" width={CW} height={CH} role="img" aria-label={`Generated preview, not a recording. ${text}`} data-testid="clip-canvas" />
      <svg className="hg-scrub" viewBox={`0 0 ${clip.durSec} 10`} preserveAspectRatio="none" role="img" aria-label={`Motion events: ${segs.map((s) => `${mmss(s.from)} to ${mmss(s.to)}`).join(", ")}`}>
        {segs.map((s) => <rect key={s.from} className="hg-seg" x={s.from} y={0} width={s.to - s.from} height={10} rx={1} />)}<line className="hg-link-on" x1={t} x2={t} y1={0} y2={10} style={{ strokeWidth: 0.6 }} /></svg>
      <div className="hg-row">
        <Btn sm variant="primary" aria-pressed={playing} onClick={() => { if (!playing && atEnd) seek(0); setPlaying(!playing); }}>{playing ? "Pause" : atEnd ? "Replay" : "Play"}</Btn>
        <Btn sm onClick={() => { setPlaying(false); seek(0); }}>Restart</Btn>
        <Badge s={o ? (hit.state === "detected" ? "ok" : hit.state === "ignored" ? "info" : "warn") : "info"}>{o ? (hit.state === "detected" ? `${clip.kind} in ${hit.zone}` : hit.state === "ignored" ? `ignored: ${hit.zone}` : `${clip.kind}, outside zones`) : "no motion"}</Badge>
        <span className="hg-muted hg-num">{mmss(t)} / {mmss(clip.durSec)}</span></div>
      <Slider label="Scrub clip timeline" value={Math.round(t * 10) / 10} min={0} max={clip.durSec} step={0.5} fmt={mmss} onChange={(v) => { setPlaying(false); seek(v); }} />
      <p className="hg-muted">Generated animation: this demo has no video. The box, trail and zone hits are computed from the clip and the zones you drew, so editing a zone changes the overlay.</p>
    </div>
  );
}
