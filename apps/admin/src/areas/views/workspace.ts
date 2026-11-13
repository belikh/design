import { useSyncExternalStore } from "react";
import { NOW0 } from "./shared.tsx";
import { assets as assetSeed, contacts as contactSeed, fileTree, type Asset, type FNode } from "./data.ts";
import type { Contact } from "./logic.ts";

// One persisted workspace shared by the file manager, contacts, duplicates, assets and the trash/archive page.
export type TrashItem = { id: string; kind: "file" | "contact" | "note" | "ticket" | "task"; label: string; deletedAt: number; by: string; parentId?: string; payload?: unknown };
export type WS = { tree: FNode; contacts: Contact[]; assets: Asset[]; trash: TrashItem[]; archive: Asset[] };
const KEY = "jp-views-ws"; const subs = new Set<() => void>();
const seedTrash = (): TrashItem[] => [{ id: "tr1", kind: "note", label: "Meeting notes (old)", deletedAt: NOW0 - 3000, by: "Mia Patel" }, { id: "tr2", kind: "ticket", label: "TKT-1998: Duplicate report", deletedAt: NOW0 - 9000, by: "Noah Smith" }, { id: "tr3", kind: "task", label: "Order spare PSU", deletedAt: NOW0 - 30000, by: "Ava Nguyen" }];
const fresh = (): WS => ({ tree: JSON.parse(JSON.stringify(fileTree)) as FNode, contacts: contactSeed.map((c) => ({ ...c })), assets: assetSeed.map((a) => ({ ...a })), trash: seedTrash(), archive: [] });
const load = (): WS => { try { const r = localStorage.getItem(KEY); if (r) { const w = JSON.parse(r) as WS; if (w.tree) return w; } } catch { /* ignore */ } return fresh(); };
let ws: WS = load();
const set = (n: WS) => { ws = n; try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* ignore */ } subs.forEach((f) => f()); };
export const useWs = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => ws);
export const getWs = () => ws;

/* tree helpers */
export const findNode = (n: FNode, id: string): FNode | null => (n.id === id ? n : n.children?.map((c) => findNode(c, id)).find(Boolean) ?? null);
export const findParent = (n: FNode, id: string): FNode | null => (n.children?.some((c) => c.id === id) ? n : n.children?.map((c) => findParent(c, id)).find(Boolean) ?? null);
export const pathTo = (n: FNode, id: string): FNode[] | null => { if (n.id === id) return [n]; for (const c of n.children ?? []) { const p = pathTo(c, id); if (p) return [n, ...p]; } return null; };
const mapTree = (n: FNode, f: (x: FNode) => FNode): FNode => f({ ...n, children: n.children?.map((c) => mapTree(c, f)) });

export const wsActions = {
  rename: (id: string, name: string) => set({ ...ws, tree: mapTree(ws.tree, (n) => (n.id === id ? { ...n, name, mod: NOW0 } : n)) }),
  deleteNode: (id: string, by = "Ava Nguyen") => { const parent = findParent(ws.tree, id); const node = findNode(ws.tree, id); if (!parent || !node) return; set({ ...ws, tree: mapTree(ws.tree, (n) => (n.id === parent.id ? { ...n, children: n.children?.filter((c) => c.id !== id) } : n)), trash: [{ id: `tr-${id}-${ws.trash.length}`, kind: "file", label: node.name, deletedAt: NOW0, by, parentId: parent.id, payload: node }, ...ws.trash] }); },
  addFolder: (parentId: string, name: string) => set({ ...ws, tree: mapTree(ws.tree, (n) => (n.id === parentId ? { ...n, children: [...(n.children ?? []), { id: `n${Date.now()}`, name, kind: "folder", mod: NOW0, children: [] }] } : n)) }),
  deleteContact: (id: string, by = "Ava Nguyen") => { const c = ws.contacts.find((x) => x.id === id); if (!c) return; set({ ...ws, contacts: ws.contacts.filter((x) => x.id !== id), trash: [{ id: `tr-${id}-${ws.trash.length}`, kind: "contact", label: c.name, deletedAt: NOW0, by, payload: c }, ...ws.trash] }); },
  setContacts: (contacts: Contact[]) => set({ ...ws, contacts }),
  setAssets: (assets: Asset[]) => set({ ...ws, assets }),
  archiveAsset: (id: string) => { const a = ws.assets.find((x) => x.id === id); if (a) set({ ...ws, assets: ws.assets.filter((x) => x.id !== id), archive: [...ws.archive, a] }); },
  unarchive: (id: string) => { const a = ws.archive.find((x) => x.id === id); if (a) set({ ...ws, archive: ws.archive.filter((x) => x.id !== id), assets: [...ws.assets, a] }); },
  restore: (id: string): string => {
    const t = ws.trash.find((x) => x.id === id); if (!t) return "Nothing to restore"; let next: WS = { ...ws, trash: ws.trash.filter((x) => x.id !== id) };
    if (t.kind === "file") { const node = t.payload as FNode; const parent = (t.parentId && findNode(next.tree, t.parentId)) || next.tree; next = { ...next, tree: mapTree(next.tree, (n) => (n.id === parent.id ? { ...n, children: [...(n.children ?? []), node] } : n)) }; set(next); return `Restored ${t.label} to ${parent.name}`; }
    if (t.kind === "contact") { next = { ...next, contacts: [...next.contacts, t.payload as Contact] }; set(next); return `Restored contact ${t.label}`; }
    set(next); return `Restored ${t.label} (demo item)`;
  },
  purge: (ids: string[]) => set({ ...ws, trash: ws.trash.filter((t) => !ids.includes(t.id)) }),
  undoTrash: (items: TrashItem[]) => set({ ...ws, trash: [...items, ...ws.trash.filter((t) => !items.some((i) => i.id === t.id))] }),
  reset: () => set(fresh()),
};
