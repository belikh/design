import type { Note, Source, Run } from "./vault.data.ts";
/** Reads hyperresearch notes (markdown with YAML front matter and [[wikilinks]]) and run manifests. Pure and defensive: bad input gives fewer notes, never a throw. */
export type Yaml = string | number | boolean | null | Yaml[] | { [k: string]: Yaml };

const unquote = (s: string): string => {
  const t = s.trim();
  if (t.length >= 2 && t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1).replace(/''/g, "'");
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) { try { return JSON.parse(t) as string; } catch { return t.slice(1, -1); } }
  return t;
};
const scalar = (raw: string): Yaml => {
  const t = raw.trim(); if (/^['"]/.test(t)) return unquote(t);
  if (t === "" || t === "~" || t === "null") return null; if (t === "true") return true; if (t === "false") return false; if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t); return t;
};
/** Split a flow list body on top-level commas, respecting quotes. */
const splitFlow = (s: string): string[] => { const out: string[] = []; let cur = "", q = ""; for (const c of s) { if (q) { cur += c; if (c === q) q = ""; } else if (c === "'" || c === '"') { q = c; cur += c; } else if (c === ",") { out.push(cur); cur = ""; } else cur += c; } if (cur.trim()) out.push(cur); return out; };
const indentOf = (l: string) => l.length - l.trimStart().length;

/** Parse the YAML subset hyperresearch writes: scalars, quoted and folded strings, block/flow lists, block scalars and nested maps. */
export function parseYaml(lines: string[]): Record<string, Yaml> {
  const out: Record<string, Yaml> = {}; let i = 0;
  while (i < lines.length) {
    const line = lines[i]; if (!line.trim() || line.trim().startsWith("#") || indentOf(line) > 0) { i++; continue; }
    const m = /^([^\s:#][^:]*?):(?:\s+(.*)|\s*)$/.exec(line); if (!m) { i++; continue; } const key = m[1].trim(); let rest = (m[2] ?? "").trim(); i++;
    const block: string[] = []; while (i < lines.length && (!lines[i].trim() || indentOf(lines[i]) > 0 || (/^-\s/.test(lines[i]) && rest === ""))) { block.push(lines[i]); i++; }
    while (block.length && !block[block.length - 1].trim()) block.pop();
    if (rest === "") {
      const items = block.filter((l) => l.trim());
      if (items.length && /^\s*-\s/.test(items[0])) out[key] = items.filter((l) => /^\s*-\s/.test(l)).map((l) => scalar(l.replace(/^\s*-\s+/, "")));
      else if (items.length) { const base = Math.min(...items.map(indentOf)); out[key] = parseYaml(items.map((l) => l.slice(base))); } else out[key] = null;
    } else if (/^[>|][+-]?\d*$/.test(rest)) { const base = Math.min(...block.filter((l) => l.trim()).map(indentOf), 99); const body = block.map((l) => l.slice(Math.min(base, indentOf(l)))); out[key] = rest.startsWith(">") ? body.join(" ").replace(/\s+/g, " ").trim() : body.join("\n").trim(); }
    else if (rest.startsWith("[")) { let s = rest; for (const l of block) s += " " + l.trim(); out[key] = splitFlow(s.replace(/^\[/, "").replace(/\]\s*$/, "")).map(scalar); }
    else if (/^['"]/.test(rest)) { for (const l of block) rest += " " + l.trim(); out[key] = unquote(rest.trim()); }
    else { for (const l of block) rest += " " + l.trim(); out[key] = scalar(rest); }
  }
  return out;
}
export function parseFrontMatter(text: string): { data: Record<string, Yaml>; body: string } {
  const t = text.replace(/^﻿/, "").replace(/\r\n/g, "\n"); if (!t.startsWith("---\n")) return { data: {}, body: t };
  const end = t.indexOf("\n---", 4); if (end < 0) return { data: {}, body: t };
  return { data: parseYaml(t.slice(4, end).split("\n")), body: t.slice(end + 4).replace(/^\n/, "") };
}
/** [[target]], [[target|alias]], [[target#heading]]; code spans and fenced blocks are ignored. */
export function wikilinks(body: string): string[] {
  const clean = body.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, ""); const out: string[] = [];
  for (const m of clean.matchAll(/\[\[([^\]\n]+?)\]\]/g)) { const t = m[1].split("|")[0].split("#")[0].trim(); if (t && !out.includes(t)) out.push(t); } return out;
}

export type VaultFile = { path: string; text: string };
const str = (v: Yaml | undefined) => (v === null || v === undefined || typeof v === "object" ? "" : String(v));
const arr = (v: Yaml | undefined): string[] => (Array.isArray(v) ? v.map(str).filter(Boolean) : typeof v === "string" && v ? [v] : []);
const day = (v: Yaml | undefined) => /^\d{4}-\d{2}-\d{2}/.exec(str(v))?.[0] ?? "";
const stem = (p: string) => p.split("/").pop()!.replace(/\.md$/i, "");
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const STATUSES = ["draft", "review", "evergreen", "stale", "deprecated", "archive"] as const;
export type Parsed = { notes: Note[]; sources: Source[]; broken: Record<string, string[]>; skipped: string[] };

/** Build notes with resolved [[links]]. Links resolve by id, file name, then title (case-insensitive); the rest are reported as broken. */
export function buildVault(files: VaultFile[]): Parsed {
  const raw = files.map((f) => { const { data, body } = parseFrontMatter(f.text); const id = str(data.id) || stem(f.path); return { f, data, body, id }; });
  const byKey = new Map<string, string>(); for (const r of raw) { byKey.set(norm(r.id), r.id); byKey.set(norm(stem(r.f.path)), r.id); } for (const r of raw) if (!byKey.has(norm(str(r.data.title)))) byKey.set(norm(str(r.data.title)), r.id);
  const seen = new Set<string>(), notes: Note[] = [], broken: Record<string, string[]> = {}, skipped: string[] = [], sources: Source[] = [];
  for (const r of raw) {
    if (seen.has(r.id)) { skipped.push(`${r.f.path}: duplicate id ${r.id}`); continue; } seen.add(r.id);
    const links: string[] = [], bad: string[] = [];
    for (const t of wikilinks(r.body)) { const to = byKey.get(norm(t)); if (!to) bad.push(t); else if (to !== r.id && !links.includes(to)) links.push(to); }
    if (bad.length) broken[r.id] = bad; const st = str(r.data.status); const status = (STATUSES as readonly string[]).includes(st) ? (st as Note["status"]) : r.data.deprecated === true ? "deprecated" : "draft";
    const updated = day(r.data.updated) || day(r.data.created) || day(r.data.fetched_at);
    notes.push({ id: r.id, rev: 1, title: str(r.data.title) || r.id, status, summary: str(r.data.summary).trim(), tags: arr(r.data.tags), links, updated, source: str(r.data.source) || undefined });
    const url = str(r.data.source); if (/^https?:\/\//.test(url)) {
      const ct = str(r.data.content_type); const tier = str(r.data.tier); const q = typeof r.data.quality === "number" ? r.data.quality : typeof r.data.quality_score === "number" ? r.data.quality_score : ({ institutional: 90, primary: 85, secondary: 65, community: 45, tertiary: 40 } as Record<string, number>)[tier] ?? 50;
      const oa = r.data.oa && typeof r.data.oa === "object" && !Array.isArray(r.data.oa) ? str((r.data.oa as Record<string, Yaml>).version) : ""; const host = str(r.data.source_domain) || (() => { try { return new URL(url).hostname; } catch { return ""; } })();
      sources.push({ id: `s-${r.id}`, rev: 1, url, domain: host, kind: /paper|preprint|article/.test(ct) ? "paper" : /doc|spec|reference/.test(ct) ? "docs" : /forum|thread|discussion/.test(ct) ? "forum" : "blog", quality: Math.round(q), fetched: day(r.data.fetched_at) || updated, oa: oa === "publishedVersion" ? "published" : oa === "acceptedVersion" ? "accepted" : oa === "submittedVersion" || /arxiv\.org/.test(host) ? "preprint" : "none" });
    }
  }
  return { notes, sources, broken, skipped };
}

const TIERS = new Set(["light", "full", "dissertation"]);
const RUN_STATUS: Record<string, Run["status"]> = { running: "running", paused: "blocked", blocked: "blocked", done: "done", failed: "failed", aborted: "failed" };
/** One run.json manifest (plus the optional query.md) -> a Run row. */
export function parseRun(json: string, queryMd = "", id = ""): Run | null {
  let d: Record<string, unknown>; try { d = JSON.parse(json) as Record<string, unknown>; } catch { return null; } if (!d || typeof d !== "object" || Array.isArray(d)) return null;
  const steps = d.steps && typeof d.steps === "object" ? (d.steps as Record<string, { status?: string }>) : {}; const plan = Array.isArray(d.profile_steps) ? (d.profile_steps as unknown[]).map(String) : Object.keys(steps);
  const doneN = plan.filter((s) => ["done", "skipped"].includes(steps[s]?.status ?? "")).length; const running = plan.find((s) => steps[s]?.status === "running");
  const spend = (d.spend && typeof d.spend === "object" ? d.spend : {}) as Record<string, unknown>; const tag = String(d.vault_tag ?? id); const q = parseFrontMatter(queryMd).body.replace(/^#+\s*.*\n/m, "").trim().split("\n").find((l) => l.trim() && !l.startsWith("#") && !l.startsWith("---"));
  const status = RUN_STATUS[String(d.status)] ?? "running"; const profile = String(d.profile ?? "full");
  return { id: `run-${tag}`, rev: 1, query: (q ?? tag).slice(0, 160), tier: TIERS.has(profile) ? (profile as Run["tier"]) : "full", step: status === "done" ? plan.length : doneN, total: plan.length || undefined, stepName: running ?? plan[doneN], status, sources: Number(spend.sources_fetched) || 0, spend: Math.round((Number(spend.estimated_usd) || 0) * 100) / 100 };
}
