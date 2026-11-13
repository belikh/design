import { useEffect, useRef, useState } from "react";
import "./tools.css";

/** Plain-text editor with a line-number gutter, error-line marker, Tab-to-indent and Ctrl/Cmd+Enter to run. */
export function Editor({ value, onChange, errorLine, rows = 12, onRun, label, placeholder, readOnly }: { value: string; onChange: (v: string) => void; errorLine?: number | null; rows?: number; onRun?: () => void; label: string; placeholder?: string; readOnly?: boolean }) {
  const gut = useRef<HTMLDivElement>(null); const lines = Math.max(rows, value.split("\n").length);
  return (
    <div className="pt-editor">
      <div className="pt-gutter" ref={gut} aria-hidden>{Array.from({ length: lines }, (_, i) => <div key={i} className={errorLine === i + 1 ? "is-err" : ""}>{i + 1}</div>)}</div>
      <textarea aria-label={label} value={value} rows={rows} placeholder={placeholder} readOnly={readOnly} spellCheck={false} autoCapitalize="off" autoCorrect="off" wrap="off" style={{ height: rows * 20 + 16 }}
        onChange={(e) => onChange(e.target.value)} onScroll={(e) => { if (gut.current) gut.current.scrollTop = e.currentTarget.scrollTop; }}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); onRun?.(); }
          else if (e.key === "Tab" && !e.shiftKey && !readOnly) { e.preventDefault(); const t = e.currentTarget; const s = t.selectionStart; onChange(value.slice(0, s) + "  " + value.slice(t.selectionEnd)); requestAnimationFrame(() => { t.selectionStart = t.selectionEnd = s + 2; }); }
        }} />
    </div>
  );
}

/** Shows an error with the offending line and a caret under the position. */
export function ErrorCaret({ source, pos, line, col, message }: { source: string; pos?: number; line?: number; col?: number; message: string }) {
  let l = line ?? 1, c = col ?? 1;
  if (pos !== undefined) { const before = source.slice(0, pos).split("\n"); l = before.length; c = before[before.length - 1].length + 1; }
  const text = source.split("\n")[l - 1] ?? "";
  return <div className="pt-caret" role="alert"><b>{message}</b>{`line ${l}, column ${c}\n${text}\n${" ".repeat(Math.max(0, c - 1))}^`}</div>;
}
export const posToLine = (source: string, pos: number) => source.slice(0, pos).split("\n").length;

/** useState that persists to localStorage (best effort). */
export function useStored<T>(key: string, initial: T): [T, (v: T | ((x: T) => T)) => void] {
  const [v, setV] = useState<T>(() => { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : initial; } catch { return initial; } });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ } }, [key, v]);
  return [v, setV];
}
export const pretty = (v: unknown) => JSON.stringify(v, null, 2);
