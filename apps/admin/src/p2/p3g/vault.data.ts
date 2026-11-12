import type { Row } from "./lib.tsx";
export type Note = Row & { title: string; status: "draft" | "review" | "evergreen" | "stale" | "deprecated" | "archive"; summary: string; tags: string[]; links: string[]; updated: string; /** Original URL, when the note was fetched from the web. */ source?: string };
export const NOTES = (): Note[] => [
  { id: "n-mamba", rev: 1, title: "Mamba selective state spaces", status: "evergreen", summary: "Linear-time sequence modelling via input-dependent state transitions.", tags: ["ml", "ssm"], links: ["n-attn", "n-hippo"], updated: "2026-11-05" },
  { id: "n-attn", rev: 1, title: "Attention is all you need", status: "evergreen", summary: "Transformer architecture; quadratic cost in sequence length.", tags: ["ml"], links: ["n-mamba"], updated: "2026-10-29" },
  { id: "n-hippo", rev: 1, title: "HiPPO memory", status: "review", summary: "Polynomial projection operators for long-range memory.", tags: ["ml", "ssm"], links: ["n-mamba"], updated: "2026-10-21" },
  { id: "n-irix", rev: 1, title: "IRIX 6.5 maintenance releases", status: "draft", summary: "", tags: ["retro"], links: [], updated: "2026-11-10" },
  { id: "n-unifi", rev: 1, title: "UniFi zone-based firewall", status: "draft", summary: "", tags: ["network"], links: ["n-vlan"], updated: "2026-11-11" },
  { id: "n-vlan", rev: 1, title: "VLAN design for a home lab", status: "stale", summary: "IoT/Guest isolation with per-zone rules.", tags: ["network"], links: ["n-unifi"], updated: "2026-03-02" },
  { id: "n-orphan", rev: 1, title: "Misc bookmarks", status: "review", summary: "Unsorted links to revisit.", tags: [], links: [], updated: "2026-09-12" },
];
export type Source = Row & { url: string; domain: string; kind: "paper" | "docs" | "blog" | "forum"; quality: number; fetched: string; oa: "none" | "published" | "accepted" | "preprint" };
export const SOURCES = (): Source[] => [
  { id: "s1", rev: 1, url: "https://arxiv.org/abs/2312.00752", domain: "arxiv.org", kind: "paper", quality: 92, fetched: "2026-11-05", oa: "preprint" },
  { id: "s2", rev: 1, url: "https://arxiv.org/abs/1706.03762", domain: "arxiv.org", kind: "paper", quality: 98, fetched: "2026-10-29", oa: "preprint" },
  { id: "s3", rev: 1, url: "https://help.ui.com/hc/en-us/articles/zone-based-firewalls", domain: "help.ui.com", kind: "docs", quality: 85, fetched: "2026-11-11", oa: "none" },
  { id: "s4", rev: 1, url: "https://forum.example.org/t/irix-patches", domain: "forum.example.org", kind: "forum", quality: 41, fetched: "2026-11-10", oa: "none" },
  { id: "s5", rev: 1, url: "https://example.com/blog/home-lab-vlans", domain: "example.com", kind: "blog", quality: 58, fetched: "2026-03-01", oa: "none" },
];
export const STEPS = ["decompose", "partition", "search", "fetch", "analyse", "loci", "depth", "critic", "draft", "synthesise", "critics x4", "patch", "cite-check", "polish", "readability", "ship"] as const;
export type Run = Row & { query: string; tier: "light" | "full" | "dissertation"; step: number; status: "running" | "blocked" | "done" | "failed"; sources: number; spend: number; /** Steps in this run's profile (16 for the full pipeline). */ total?: number; stepName?: string };
export const RUNS = (): Run[] => [
  { id: "r1", rev: 1, query: "State space models vs transformers for long context", tier: "full", step: 12, status: "running", sources: 74, spend: 6.8 },
  { id: "r2", rev: 1, query: "IRIX 6.5 maintenance patch history", tier: "light", step: 4, status: "blocked", sources: 9, spend: 0.6 },
  { id: "r3", rev: 1, query: "Zone-based firewall migration for UniFi", tier: "full", step: 16, status: "done", sources: 61, spend: 5.1 },
];
export const progress = (r: Run) => Math.round((r.step / (r.total ?? STEPS.length)) * 100);
export const degree = (notes: Note[], id: string) => notes.filter((n) => n.id !== id && (n.links.includes(id) || notes.find((x) => x.id === id)?.links.includes(n.id))).length;
export const orphans = (notes: Note[]) => notes.filter((n) => degree(notes, n.id) === 0);
/** Curation queue: notes without a summary, and notes untouched for over 180 days. */
export function needsCuration(notes: Note[], today = "2026-11-12"): Record<string, string> {
  const out: Record<string, string> = {}; for (const n of notes) { if (!n.summary.trim()) out[n.id] = "No summary"; else if (n.status !== "evergreen" && (Date.parse(today) - Date.parse(n.updated)) / 86400000 > 180) out[n.id] = "Untouched for 180+ days"; } return out;
}
/** Circular layout for the link graph. */
export const circle = (n: number, r: number, cx: number, cy: number) => Array.from({ length: n }, (_, i) => ({ x: cx + r * Math.cos((2 * Math.PI * i) / n - Math.PI / 2), y: cy + r * Math.sin((2 * Math.PI * i) / n - Math.PI / 2) }));
