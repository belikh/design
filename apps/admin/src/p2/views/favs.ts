import { useSyncExternalStore } from "react";
// Favourites, pinned and recents, persisted in localStorage and shared by every page that uses this hook.
export type FavItem = { path: string; title: string; icon: string; at: number };
type State = { favs: FavItem[]; pinned: string[]; recents: FavItem[] };
const KEY = "jp-views-favs"; const subs = new Set<() => void>();
const load = (): State => { try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r) as State; } catch { /* ignore */ } return { favs: [{ path: "/orders", title: "Orders", icon: "database", at: 1 }, { path: "/wh/dock", title: "Dock board", icon: "rack", at: 2 }], pinned: ["/wh/dock"], recents: [{ path: "/analytics", title: "Analytics", icon: "chart", at: 5 }, { path: "/logs", title: "Log viewer", icon: "terminal", at: 4 }, { path: "/ha", title: "Home Assistant panel", icon: "home", at: 3 }] }; };
let state: State = load();
const set = (n: State) => { state = n; try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* ignore */ } subs.forEach((f) => f()); };
export const favStore = {
  get: () => state,
  toggleFav: (i: Omit<FavItem, "at">) => set({ ...state, favs: state.favs.some((f) => f.path === i.path) ? state.favs.filter((f) => f.path !== i.path) : [...state.favs, { ...i, at: Date.now() }], pinned: state.favs.some((f) => f.path === i.path) ? state.pinned.filter((p) => p !== i.path) : state.pinned }),
  togglePin: (path: string) => set({ ...state, pinned: state.pinned.includes(path) ? state.pinned.filter((p) => p !== path) : [...state.pinned, path] }),
  visit: (i: Omit<FavItem, "at">) => set({ ...state, recents: [{ ...i, at: Date.now() }, ...state.recents.filter((r) => r.path !== i.path)].slice(0, 12) }),
  clearRecents: () => set({ ...state, recents: [] }),
  reset: () => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } set(load()); },
};
export const useFavs = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => state);
