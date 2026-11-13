import type { ReactNode } from "react";
import { createCollection, useCollection, type Collection } from "@belikh/jupiter-ui/mock.ts";
import { SyncStatus } from "@belikh/jupiter-ui/sync.tsx";
import { Panel } from "@belikh/jupiter-ui/kit.tsx";
import { DataTable, type Col } from "@belikh/jupiter-ui/DataTable.tsx";
import "./homelab.css";

/** Fixed clock so sample data and tests are deterministic. */
export const TODAY = "2026-11-12";
export const NOW_MIN = 17 * 60;
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
export const money = (n: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

export type Row = { id: string; rev: number };
const stores = new Map<string, Collection<never>>();
/** One in-memory collection per key, so edits survive navigating away and back. */
export function store<T extends Row>(key: string, seed: () => T[]): Collection<T> {
  let c = stores.get(key) as Collection<T> | undefined;
  if (!c) { c = createCollection<T>(seed, { latency: 20, jitter: 10 }); stores.set(key, c as unknown as Collection<never>); }
  return c;
}
export const resetStores = () => stores.clear();
/** Forget every store whose key starts with `prefix` (used when a live source is disconnected). */
export const dropStores = (prefix: string) => { for (const k of [...stores.keys()]) if (k.startsWith(prefix)) stores.delete(k); };
export function useStore<T extends Row>(key: string, seed: () => T[]) {
  const c = store(key, seed);
  const t = useCollection(c, { staleAfter: 120000 });
  /** Patch a row by id through the same optimistic path as an in-place edit. */
  const patch = (id: string, p: Partial<T>) => { const r = t.rows.find((x) => x.id === id); if (r) for (const [k, v] of Object.entries(p)) void t.save(r, k, v); };
  return { ...t, c, patch };
}
export type Store<T extends Row> = ReturnType<typeof useStore<T>>;

/** A titled DataTable bound to a store: in-place editing, bulk edit, add row, and sync state. */
export function Sheet<T extends Row>({ t, title, cols, blank, facet, groupBy, name, extra, pageSize = 8 }: {
  t: Store<T>; title: string; cols: Col<T>[]; blank?: Omit<T, "id" | "rev">; facet?: Parameters<typeof DataTable<T>>[0]["facet"]; groupBy?: string; name: string; extra?: ReactNode; pageSize?: number;
}) {
  return (
    <Panel title={title} flush actions={<>{extra}<SyncStatus online={t.online} pending={t.pending} stale={t.stale} updatedAt={t.updatedAt} onRefresh={t.refresh} /></>}>
      <DataTable rows={t.rows} cols={cols} onCommit={t.save} facet={facet} groupBy={groupBy} pageSize={pageSize} exportName={name} ariaLabel={title}
        onAdd={blank ? async (v) => { try { await t.c.create({ rev: 1, ...blank, ...v } as unknown as Omit<T, "id"> & { id?: string }); return null; } catch (e) { return e instanceof Error ? e.message : "Couldn't add"; } } : undefined} />
    </Panel>
  );
}
export const opts = (...v: string[]) => v.map((x) => ({ value: x, label: x }));
export const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
export const ipNum = (ip: string) => ip.split(".").reduce((a, o) => a * 256 + Number(o), 0);
