import { NOTES, SOURCES, RUNS, type Note, type Source, type Run } from "./vault.data.ts";
import { buildVault, parseRun, type VaultFile } from "./vault.parse.ts";

/** Lazy readers for real files. Keys are paths (as import.meta.glob reports them), values read the text on demand. */
export type Loaders = Record<string, () => Promise<string>>;
export type VaultSource = { notes: Loaders; runs: Loaders; queries: Loaders };
export type VaultData = { mode: "vault" | "sample"; notes: Note[]; sources: Source[]; runs: Run[]; broken: Record<string, string[]>; skipped: string[]; note: string; failed: string[] };

// Paths are relative to this file: src/p2/p3g -> repo root is five levels up. When the folder is absent the globs are empty and the page uses sample data.
// Lazy (not eager): nothing is read or bundled into the initial chunk, and the files are only fetched when the page opens.
const GLOB_NOTES = import.meta.glob("../../../../../research/notes/*.md", { query: "?raw", import: "default" }) as Loaders;
const GLOB_RUNS = import.meta.glob("../../../../../research/runs/*/run.json", { query: "?raw", import: "default" }) as Loaders;
const GLOB_QUERIES = import.meta.glob("../../../../../research/runs/*/query.md", { query: "?raw", import: "default" }) as Loaders;
// Tests must not depend on whoever's vault the tracked research symlink points at, so they get an empty source (fixtures are passed explicitly).
export const repoSource: VaultSource = import.meta.env.MODE === "test" ? { notes: {}, runs: {}, queries: {} } : { notes: GLOB_NOTES, runs: GLOB_RUNS, queries: GLOB_QUERIES };
export const hasVault = (s: VaultSource) => Object.keys(s.notes).length > 0;

export const sampleData = (): VaultData => ({ mode: "sample", notes: NOTES(), sources: SOURCES(), runs: RUNS(), broken: {}, skipped: [], failed: [], note: "No research/notes folder next to the repo, so this is fictional sample data." });

/** Read every file, tolerate individual failures (reported, not thrown), and build the vault. An empty or unreadable vault falls back to sample data. */
export async function loadVault(s: VaultSource = repoSource): Promise<VaultData> {
  if (!hasVault(s)) return sampleData();
  const failed: string[] = []; const read = async (path: string, f: () => Promise<string>) => { try { return { path, text: await f() }; } catch { failed.push(path); return null; } };
  const files = (await Promise.all(Object.entries(s.notes).map(([p, f]) => read(p, f)))).filter((x): x is VaultFile => !!x);
  const q = new Map<string, string>(); for (const r of await Promise.all(Object.entries(s.queries).map(([p, f]) => read(p, f)))) if (r) q.set(r.path.split("/").slice(-2, -1)[0], r.text);
  const runs: Run[] = []; for (const r of await Promise.all(Object.entries(s.runs).map(([p, f]) => read(p, f)))) { if (!r) continue; const tag = r.path.split("/").slice(-2, -1)[0]; const run = parseRun(r.text, q.get(tag) ?? "", tag); if (run) runs.push(run); else failed.push(r.path); }
  const v = buildVault(files); if (!v.notes.length) return { ...sampleData(), note: "research/notes exists but no note could be read, so this is sample data.", failed };
  runs.sort((a, b) => a.id.localeCompare(b.id));
  return { mode: "vault", notes: v.notes, sources: v.sources, runs, broken: v.broken, skipped: v.skipped, failed, note: `Read ${v.notes.length} notes from research/notes${runs.length ? ` and ${runs.length} runs from research/runs` : " (no research/runs/*/run.json found)"}.` };
}
