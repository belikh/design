import { useCallback, useSyncExternalStore } from "react";

/** Recent and pinned pages, remembered per browser. Tiny external store so the sidebar, palette and menus stay in sync. */
const RK = "jp-recent", PK = "jp-pinned";
const read = (k: string): string[] => { try { const v = JSON.parse(localStorage.getItem(k) ?? "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; } };
const write = (k: string, v: string[]) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };
let recent = read(RK), pinned = read(PK); const subs = new Set<() => void>(); const emit = () => subs.forEach((f) => f());
const sub = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

export const recordVisit = (path: string) => { if (recent[0] === path) return; recent = [path, ...recent.filter((p) => p !== path)].slice(0, 8); write(RK, recent); emit(); };
export const togglePin = (path: string) => { pinned = pinned.includes(path) ? pinned.filter((p) => p !== path) : [...pinned, path].slice(0, 12); write(PK, pinned); emit(); };
export const useRecent = () => useSyncExternalStore(sub, () => recent);
export const usePinned = () => useSyncExternalStore(sub, () => pinned);
export const usePinToggle = () => useCallback(togglePin, []);
/** Test helper. */
export const resetRecents = () => { recent = []; pinned = []; write(RK, recent); write(PK, pinned); emit(); };
