/* A tiny shared shelf so a recording made in C043 can be opened by the C048 editors. Blobs only; no URLs are held here. */
import { useSyncExternalStore } from "react";
export type ShelfItem = { id: number; kind: "audio" | "video"; blob: Blob; name: string; seconds: number };
let items: ShelfItem[] = []; let next = 0; const subs = new Set<() => void>();
const emit = () => { items = [...items]; subs.forEach((f) => f()); };
export const shelfAdd = (i: Omit<ShelfItem, "id">): ShelfItem => { const it = { ...i, id: ++next }; items = [it, ...items]; emit(); return it; };
export const shelfRemove = (id: number) => { items = items.filter((i) => i.id !== id); emit(); };
export const shelfClear = () => { items = []; emit(); };
export const useShelf = (): ShelfItem[] => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => items, () => items);
