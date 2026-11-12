import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Panel } from "@belikh/jupiter-ui/kit.tsx";
import { Btn } from "@belikh/jupiter-ui/kit.tsx";
import "./p3c.css";

/** A demo entry: a Panel labelled with its backlog ID. */
export function Entry({ id, title, desc, children, actions }: { id: string; title: string; desc?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <Panel title={<><span className="p3-id">{id}</span> {title}</>} actions={actions} className="p3-entry" id={`entry-${id}`}>
      {desc && <p className="p3-note p3-desc">{desc}</p>}
      {children}
    </Panel>
  );
}
export const Stack = ({ children, className = "" }: { children: ReactNode; className?: string }) => <div className={`p3-stack ${className}`}>{children}</div>;
export const Row = ({ children, className = "" }: { children: ReactNode; className?: string }) => <div className={`p3-row ${className}`}>{children}</div>;
export const Note = ({ children, warn }: { children: ReactNode; warn?: boolean }) => <p className={`p3-note ${warn ? "p3-warn" : ""}`}>{children}</p>;

export function useReducedMotion(): boolean {
  const [r, setR] = useState(() => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => { if (typeof matchMedia !== "function") return; const m = matchMedia("(prefers-reduced-motion: reduce)"); const h = () => setR(m.matches); m.addEventListener?.("change", h); return () => m.removeEventListener?.("change", h); }, []);
  return r;
}

/** Arrow-key roving focus over `[data-roving]` descendants laid out in `cols` columns. */
export function rovingKeys(cols: number) {
  return (e: KeyboardEvent<HTMLElement>) => {
    const items = [...e.currentTarget.querySelectorAll<HTMLElement>("[data-roving]:not(:disabled)")]; const i = items.indexOf(document.activeElement as HTMLElement); if (i < 0) return;
    const d = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key as "ArrowRight"]; if (d === undefined && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault(); const n = e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : Math.min(items.length - 1, Math.max(0, i + d!)); items[n]?.focus();
  };
}

export function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false); const t = useRef<number>(0);
  useEffect(() => () => window.clearTimeout(t.current), []);
  return <Btn sm icon="copy" onClick={() => { void navigator.clipboard?.writeText(text).catch(() => undefined); setDone(true); window.clearTimeout(t.current); t.current = window.setTimeout(() => setDone(false), 1500); }}>{done ? "Copied" : label}</Btn>;
}
/** Pointer drag helper: calls onMove with position relative to the element, until the pointer is released. */
export function startDrag(e: { clientX: number; clientY: number; currentTarget: Element; preventDefault: () => void }, el: Element | null, onMove: (x: number, y: number, w: number, h: number) => void, onEnd?: () => void) {
  if (!el) return; e.preventDefault();
  const move = (ev: MouseEvent | PointerEvent) => { const r = el.getBoundingClientRect(); onMove(ev.clientX - r.left, ev.clientY - r.top, r.width, r.height); };
  const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); onEnd?.(); };
  window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); move(e as unknown as PointerEvent);
}
export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
