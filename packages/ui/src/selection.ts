import { useEffect, useRef, useSyncExternalStore } from "react";

/** Selection context: a table with checked rows publishes actions here and the command palette lists them first. */
export type SelectionAction = { label: string; run: () => void; text?: string };
export type SelectionContext = { source: string; count: number; noun?: string; actions: SelectionAction[] } | null;
let ctx: SelectionContext = null; const subs = new Set<() => void>();
const set = (c: SelectionContext) => { ctx = c; subs.forEach((f) => f()); };
export const getSelectionContext = () => ctx;
export const useSelectionContext = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => ctx);

/** Publish (or clear) this table's selection. Actions are read at run time, so they may close over fresh state. */
export function usePublishSelection(source: string, count: number, actions: SelectionAction[], noun = "rows") {
  const ref = useRef(actions); ref.current = actions;
  const labels = actions.map((a) => a.label).join("|");
  useEffect(() => {
    if (count <= 0) { if (ctx?.source === source) set(null); return; }
    set({ source, count, noun, actions: ref.current.map((a, i) => ({ ...a, run: () => ref.current[i]?.run() })) });
    return () => { if (ctx?.source === source) set(null); };
  }, [source, count, noun, labels]);
}
