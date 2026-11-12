import { useSyncExternalStore } from "react";

/**
 * Per-page undo and redo. Edits that can be reversed (in-place edits, bulk edits) push an entry; Ctrl/Cmd+Z undoes the latest,
 * Ctrl/Cmd+Shift+Z (or Ctrl+Y) redoes it. The Shell clears the stack when you change page, so undo never reaches into another page.
 */
export type UndoEntry = { label: string; undo: () => void | Promise<unknown>; redo: () => void | Promise<unknown> };
let past: UndoEntry[] = [], future: UndoEntry[] = []; let snap = { canUndo: false, canRedo: false, undoLabel: "", redoLabel: "" }; const subs = new Set<() => void>();
const emit = () => { const n = { canUndo: past.length > 0, canRedo: future.length > 0, undoLabel: past[past.length - 1]?.label ?? "", redoLabel: future[future.length - 1]?.label ?? "" }; if (n.canUndo !== snap.canUndo || n.canRedo !== snap.canRedo || n.undoLabel !== snap.undoLabel || n.redoLabel !== snap.redoLabel) { snap = n; subs.forEach((f) => f()); } };

export const pushUndo = (e: UndoEntry) => { past = [...past, e].slice(-50); future = []; emit(); };
export const clearUndo = () => { past = []; future = []; emit(); };
export async function undo() { const e = past[past.length - 1]; if (!e) return false; past = past.slice(0, -1); future = [...future, e]; emit(); await e.undo(); return true; }
export async function redo() { const e = future[future.length - 1]; if (!e) return false; future = future.slice(0, -1); past = [...past, e]; emit(); await e.redo(); return true; }
export const useUndoState = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => snap);

/** True when the keyboard event should be left to a text field's own undo. */
export const inTextField = (t: EventTarget | null) => { const el = t as HTMLElement | null; return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)); };
