import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import "./records.css";

const read = (k: string): number | null => { try { const v = localStorage.getItem(k); return v ? Number(v) : null; } catch { return null; } };
/** Resizable split view. Drag the divider, or focus it and use arrow keys (Shift = bigger steps), Home/End, double-click to reset. */
export function SplitPane({ first, second, initial = 320, min = 180, max = 640, storageKey, orientation = "horizontal", label = "Resize panes" }: { first: ReactNode; second: ReactNode; initial?: number; min?: number; max?: number; storageKey?: string; orientation?: "horizontal" | "vertical"; label?: string }) {
  const [size, setSize] = useState(() => (storageKey ? read(storageKey) : null) ?? initial); const box = useRef<HTMLDivElement>(null); const dragging = useRef(false);
  const clamp = useCallback((n: number) => Math.max(min, Math.min(max, n)), [min, max]);
  useEffect(() => { if (storageKey) try { localStorage.setItem(storageKey, String(size)); } catch { /* ignore */ } }, [size, storageKey]);
  const vertical = orientation === "vertical";
  const move = (e: PointerEvent) => { if (!dragging.current || !box.current) return; const r = box.current.getBoundingClientRect(); setSize(clamp(vertical ? e.clientY - r.top : e.clientX - r.left)); };
  const up = () => { dragging.current = false; window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); document.body.style.userSelect = ""; };
  const down = (e: React.PointerEvent) => { e.preventDefault(); dragging.current = true; document.body.style.userSelect = "none"; window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); };
  useEffect(() => up, []); // eslint-disable-line react-hooks/exhaustive-deps
  const key = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 64 : 16; const dec = vertical ? "ArrowUp" : "ArrowLeft", inc = vertical ? "ArrowDown" : "ArrowRight";
    if (e.key === dec) { e.preventDefault(); setSize((s) => clamp(s - step)); } else if (e.key === inc) { e.preventDefault(); setSize((s) => clamp(s + step)); } else if (e.key === "Home") { e.preventDefault(); setSize(min); } else if (e.key === "End") { e.preventDefault(); setSize(max); }
  };
  return (
    <div ref={box} className={`rec-split ${vertical ? "is-vertical" : ""}`} style={{ ["--rec-first" as string]: `${size}px` }}>
      <div className="rec-split__a">{first}</div>
      <div role="separator" aria-orientation={vertical ? "horizontal" : "vertical"} aria-label={label} aria-valuenow={size} aria-valuemin={min} aria-valuemax={max} tabIndex={0} className="rec-split__bar" onPointerDown={down} onKeyDown={key} onDoubleClick={() => setSize(initial)} />
      <div className="rec-split__b">{second}</div>
    </div>
  );
}
