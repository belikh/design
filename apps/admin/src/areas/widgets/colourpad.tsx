import { useRef } from "react";
import { hsvToHex } from "./colour.ts";
import { BLACK, WHITE } from "./palette-data.ts";
import { clamp, startDrag } from "./ui.tsx";

/** 2D saturation (x) and brightness (y) pad for one hue. A single slider-role control: arrows move 1, Shift+arrows 10, Home/End jump saturation. */
export function SvPad({ h, s, v, onChange }: { h: number; s: number; v: number; onChange: (s: number, v: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const set = (ns: number, nv: number) => onChange(clamp(Math.round(ns * 10) / 10, 0, 100), clamp(Math.round(nv * 10) / 10, 0, 100));
  const key = (e: React.KeyboardEvent) => {
    const d = e.shiftKey ? 10 : 1; const m: Record<string, [number, number]> = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, d], ArrowDown: [0, -d] };
    if (e.key === "Home") { e.preventDefault(); set(0, v); return; } if (e.key === "End") { e.preventDefault(); set(100, v); return; } if (e.key === "PageUp") { e.preventDefault(); set(s, v + 10); return; } if (e.key === "PageDown") { e.preventDefault(); set(s, v - 10); return; }
    const dd = m[e.key]; if (dd) { e.preventDefault(); set(s + dd[0], v + dd[1]); }
  };
  return (
    <div ref={box} className="p3-pad" role="slider" tabIndex={0} aria-label="Saturation and brightness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(s)} aria-valuetext={`Saturation ${Math.round(s)}%, brightness ${Math.round(v)}%`} aria-describedby="p3-pad-help"
      style={{ backgroundImage: `linear-gradient(to top, ${BLACK}, transparent), linear-gradient(to right, ${WHITE}, ${hsvToHex({ h, s: 100, v: 100 })})` }}
      onKeyDown={key} onPointerDown={(e) => { box.current?.focus(); startDrag(e, box.current, (x, y, w, hh) => set((x / w) * 100, (1 - y / hh) * 100)); }}>
      <span className="p3-pad__thumb" style={{ insetInlineStart: `${s}%`, insetBlockStart: `${100 - v}%`, background: hsvToHex({ h, s, v }) }} aria-hidden />
      <span id="p3-pad-help" className="p3-sr">Arrow keys move one step, Shift with arrows moves ten, Home and End set saturation to 0 or 100, Page Up and Page Down change brightness.</span>
    </div>
  );
}
