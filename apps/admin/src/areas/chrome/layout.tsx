import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import "./chrome.css";
import { Menu } from "@belikh/jupiter-ui/kit.tsx";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";
import { closeTab, closeTile, countPanes, moveTab, pinTab, setRatio, setWidget, splitTile, type DocTab, type Tile } from "./engine.ts";

/* ---------- controlled splitter (drag + keyboard + double-click reset) ---------- */
export function Splitter({ dir, ratio, onRatio, a, b, label, min = 0.15, max = 0.85 }: { dir: "h" | "v"; ratio: number; onRatio: (r: number) => void; a: ReactNode; b: ReactNode; label: string; min?: number; max?: number }) {
  const box = useRef<HTMLDivElement>(null); const clamp = (r: number) => Math.min(max, Math.max(min, r));
  const drag = (e: React.PointerEvent) => {
    e.preventDefault(); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); const el = box.current!;
    const move = (ev: PointerEvent) => { const r = el.getBoundingClientRect(); onRatio(clamp(dir === "h" ? (ev.clientX - r.left) / r.width : (ev.clientY - r.top) / r.height)); };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); }; window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };
  const key = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 0.1 : 0.02; const back = dir === "h" ? "ArrowLeft" : "ArrowUp", fwd = dir === "h" ? "ArrowRight" : "ArrowDown";
    if (e.key === back) { e.preventDefault(); onRatio(clamp(ratio - step)); } else if (e.key === fwd) { e.preventDefault(); onRatio(clamp(ratio + step)); } else if (e.key === "Home") { e.preventDefault(); onRatio(min); } else if (e.key === "End") { e.preventDefault(); onRatio(max); } else if (e.key === "Enter") onRatio(0.5);
  };
  const style = dir === "h" ? { gridTemplateColumns: `${ratio * 100}% 10px minmax(0, 1fr)` } : { gridTemplateRows: `${ratio * 100}% 10px minmax(0, 1fr)` };
  return (
    <div ref={box} className={`adm-split2 is-${dir}`} style={style}>
      <div className="adm-split2__pane">{a}</div>
      <div role="separator" aria-orientation={dir === "h" ? "vertical" : "horizontal"} aria-label={label} aria-valuenow={Math.round(ratio * 100)} aria-valuemin={Math.round(min * 100)} aria-valuemax={Math.round(max * 100)} tabIndex={0} className="adm-split2__bar" onPointerDown={drag} onKeyDown={key} onDoubleClick={() => onRatio(0.5)} />
      <div className="adm-split2__pane">{b}</div>
    </div>
  );
}
/** Uncontrolled split pane that remembers its position. */
export function SplitPane({ dir = "h", initial = 0.5, a, b, storageKey, label = "Resize panes" }: { dir?: "h" | "v"; initial?: number; a: ReactNode; b: ReactNode; storageKey?: string; label?: string }) {
  const [r, setR] = useState(() => { try { const v = storageKey ? Number(localStorage.getItem(storageKey)) : 0; return v > 0 ? v : initial; } catch { return initial; } });
  const set = useCallback((x: number) => { setR(x); try { if (storageKey) localStorage.setItem(storageKey, String(x)); } catch { /* ignore */ } }, [storageKey]);
  return <Splitter dir={dir} ratio={r} onRatio={set} a={a} b={b} label={label} />;
}

/* ---------- tiling layout: split, close, swap widget, resize ---------- */
export type WidgetDef = { label: string; render: () => ReactNode };
export function TilingLayout({ tree, onChange, widgets }: { tree: Tile; onChange: (t: Tile) => void; widgets: Record<string, WidgetDef> }) {
  const ids = Object.keys(widgets); const panes = countPanes(tree);
  const render = (t: Tile): ReactNode => t.kind === "split"
    ? <Splitter key={t.id} dir={t.dir} ratio={t.ratio} onRatio={(r) => onChange(setRatio(tree, t.id, r))} label={`Resize ${t.dir === "h" ? "columns" : "rows"}`} a={render(t.a)} b={render(t.b)} />
    : (
      <section key={t.id} className="adm-tile" aria-label={widgets[t.widget]?.label}>
        <header className="adm-tile__bar">
          <select className="adm-tile__pick" aria-label="Widget" value={t.widget} onChange={(e) => onChange(setWidget(tree, t.id, e.target.value))}>{ids.map((i) => <option key={i} value={i}>{widgets[i].label}</option>)}</select>
          <span className="adm-spacer" />
          <button className="adm-x" aria-label={`Split ${widgets[t.widget]?.label} side by side`} title="Split side by side" onClick={() => onChange(splitTile(tree, t.id, "h", ids[(ids.indexOf(t.widget) + 1) % ids.length]))}><Icon name="menu" size={14} /></button>
          <button className="adm-x" aria-label={`Split ${widgets[t.widget]?.label} top and bottom`} title="Split top and bottom" onClick={() => onChange(splitTile(tree, t.id, "v", ids[(ids.indexOf(t.widget) + 1) % ids.length]))}><Icon name="minus" size={14} /></button>
          <button className="adm-x" aria-label={`Close ${widgets[t.widget]?.label}`} disabled={panes <= 1} onClick={() => onChange(closeTile(tree, t.id))}>×</button>
        </header>
        <div className="adm-tile__body">{widgets[t.widget]?.render()}</div>
      </section>
    );
  return <div className="adm-tiling">{render(tree)}</div>;
}

/* ---------- document tabs: closable, pinnable, reorderable (drag or Alt+Arrow), overflow menu ---------- */
export function DocTabs({ tabs, active, onChange, onSelect, onClosed }: { tabs: DocTab[]; active: string; onChange: (t: DocTab[]) => void; onSelect: (id: string) => void; onClosed?: (t: DocTab, nextActive: string) => void }) {
  const [drag, setDrag] = useState<string | null>(null); const [over, setOver] = useState<number | null>(null);
  const close = (id: string) => { const r = closeTab(tabs, id, active); if (r.closed) { onChange(r.tabs); onClosed?.(r.closed, r.active); onSelect(r.active); } };
  const key = (e: React.KeyboardEvent, t: DocTab, i: number) => {
    if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) { e.preventDefault(); onChange(moveTab(tabs, t.id, i + (e.key === "ArrowLeft" ? -1 : 1))); requestAnimationFrame(() => document.getElementById(`dtab-${t.id}`)?.focus()); }
    else if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); const n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length]; onSelect(n.id); requestAnimationFrame(() => document.getElementById(`dtab-${n.id}`)?.focus()); }
    else if (e.key === "Delete" || (e.key === "w" && (e.ctrlKey || e.metaKey))) { e.preventDefault(); close(t.id); }
  };
  return (
    <div className="adm-dtabs">
      <div role="tablist" aria-label="Open documents" className="adm-dtabs__list">
        {tabs.map((t, i) => (
          <div key={t.id} className={`adm-dtab ${active === t.id ? "is-active" : ""} ${t.pinned ? "is-pinned" : ""} ${over === i ? "is-over" : ""}`} draggable onDragStart={() => setDrag(t.id)} onDragOver={(e) => { e.preventDefault(); setOver(i); }} onDragLeave={() => setOver(null)} onDrop={() => { if (drag) onChange(moveTab(tabs, drag, i)); setDrag(null); setOver(null); }} onDragEnd={() => { setDrag(null); setOver(null); }} onAuxClick={(e) => e.button === 1 && close(t.id)}>
            <button role="tab" id={`dtab-${t.id}`} aria-selected={active === t.id} tabIndex={active === t.id ? 0 : -1} onClick={() => onSelect(t.id)} onKeyDown={(e) => key(e, t, i)}>{t.pinned && <Icon name="pin" size={12} />}{t.title}{t.dirty && <span className="adm-dot adm-dot--warn" aria-label="unsaved" />}</button>
            {!t.pinned && <button className="adm-x" aria-label={`Close ${t.title}`} onClick={() => close(t.id)}>×</button>}
          </div>))}
      </div>
      <Menu label="Tabs" icon="menu" items={tabs.flatMap((t, i): ({ label: string; onSelect: () => void; danger?: boolean } | "sep")[] => [{ label: `${active === t.id ? "✓ " : ""}${t.title}`, onSelect: () => onSelect(t.id) }, ...(i === tabs.length - 1 ? ["sep" as const, { label: active ? `${tabs.find((x) => x.id === active)?.pinned ? "Unpin" : "Pin"} current tab` : "Pin", onSelect: () => active && onChange(pinTab(tabs, active)) }, { label: "Close other tabs", onSelect: () => onChange(tabs.filter((x) => x.id === active || x.pinned)) }] : [])])} />
    </div>
  );
}

/* ---------- mini-map ---------- */
export type MapNode = { id: string; x: number; y: number; w: number; h: number; label: string; kind: string };
export function MiniMap({ nodes, world, view, onView, width = 180 }: { nodes: MapNode[]; world: { w: number; h: number }; view: { x: number; y: number; w: number; h: number }; onView: (x: number, y: number) => void; width?: number }) {
  const k = width / world.w; const h = world.h * k; const box = useRef<SVGSVGElement>(null);
  const go = (e: React.PointerEvent) => { const r = box.current!.getBoundingClientRect(); onView((e.clientX - r.left) / k - view.w / 2, (e.clientY - r.top) / k - view.h / 2); };
  const down = (e: React.PointerEvent) => { go(e); const move = (ev: PointerEvent) => go(ev as unknown as React.PointerEvent); const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); }; window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); };
  return (
    <svg ref={box} className="adm-minimap" width={width} height={h} viewBox={`0 0 ${width} ${h}`} role="img" aria-label="Mini-map: click or drag to move the viewport" onPointerDown={down}>
      <rect width={width} height={h} className="adm-minimap__bg" />
      {nodes.map((n) => <rect key={n.id} x={n.x * k} y={n.y * k} width={Math.max(3, n.w * k)} height={Math.max(3, n.h * k)} rx="1" className={`adm-minimap__n is-${n.kind}`} />)}
      <rect x={view.x * k} y={view.y * k} width={view.w * k} height={view.h * k} className="adm-minimap__view" />
    </svg>
  );
}
export { setWidget, useEffect };
