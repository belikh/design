import { useEffect, useRef, useSyncExternalStore } from "react";

// A tiny shortcut registry: components register key combos with descriptions, the cheat sheet reads them back. (E027)
export type Shortcut = { id: string; combo: string; description: string; scope: string; run: () => void; when?: () => boolean };
const reg = new Map<string, Shortcut>(); const subs = new Set<() => void>(); let snap: Shortcut[] = [];
const notify = () => { snap = [...reg.values()]; subs.forEach((f) => f()); };
export const registerShortcut = (s: Shortcut) => { reg.set(s.id, s); notify(); return () => { if (reg.get(s.id) === s) { reg.delete(s.id); notify(); } }; };
export const listShortcuts = () => snap;
export const useShortcutList = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => snap);
/** Static entries shown in the sheet that are handled elsewhere (table cells, inbox lists, etc.). */
export const STATIC_SHORTCUTS: { combo: string; description: string; scope: string }[] = [
  { combo: "Arrow keys", description: "Move between table cells", scope: "Tables" }, { combo: "Enter", description: "Edit the focused cell", scope: "Tables" }, { combo: "Space", description: "Select the focused row", scope: "Tables" },
  { combo: "Shift + click", description: "Add a secondary sort", scope: "Tables" }, { combo: "j / k", description: "Next / previous message", scope: "Inbox" }, { combo: "Esc", description: "Close the dialog, menu or drawer", scope: "Global" },
];
export const isMac = () => typeof navigator !== "undefined" && /mac/i.test(navigator.platform || navigator.userAgent || "");
/** "mod+k" -> "⌘ K" on macOS, "Ctrl + K" elsewhere. */
export const prettyCombo = (c: string) => c.split("+").map((p) => ({ mod: isMac() ? "⌘" : "Ctrl", shift: isMac() ? "⇧" : "Shift", alt: isMac() ? "⌥" : "Alt" }[p] ?? (p.length === 1 ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1)))).join(isMac() ? " " : " + ");
export function matches(combo: string, e: KeyboardEvent): boolean {
  const parts = combo.toLowerCase().split("+"); const key = parts[parts.length - 1]; const mods = new Set(parts.slice(0, -1));
  const mod = mods.has("mod"), shift = mods.has("shift"), alt = mods.has("alt");
  if (mod !== (e.ctrlKey || e.metaKey)) return false; if (alt !== e.altKey) return false;
  if (shift !== e.shiftKey && !(key.length === 1 && !/[a-z0-9]/.test(key))) return false; // symbol keys like "?" already imply shift
  return e.key.toLowerCase() === key;
}
let installed = false;
function install() {
  if (installed || typeof window === "undefined") return; installed = true;
  window.addEventListener("keydown", (e) => {
    const typing = (e.target as HTMLElement | null)?.closest?.("input,textarea,select,[contenteditable=true]");
    for (const s of reg.values()) { if (!matches(s.combo, e)) continue; if (typing && !/mod|alt|f\d/i.test(s.combo)) continue; if (s.when && !s.when()) continue; e.preventDefault(); s.run(); return; }
  });
}
/** Register a global shortcut for the lifetime of the component. */
export function useShortcut(id: string, combo: string, description: string, run: () => void, scope = "Global", when?: () => boolean) {
  // Latest callbacks live in refs so inline closures don't re-register (and re-render) on every render.
  const r = useRef(run), w = useRef(when); r.current = run; w.current = when; const hasWhen = !!when;
  useEffect(() => { install(); return registerShortcut({ id, combo, description, scope, run: () => r.current(), when: hasWhen ? () => w.current?.() ?? true : undefined }); }, [id, combo, description, scope, hasWhen]);
}
