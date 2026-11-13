import { NOW, DAY, mean, prng } from "./lib.ts";

export type Stage = { name: string; status: "passed" | "failed" | "running" | "skipped"; sec: number };
export type Run = { id: number; branch: string; sha: string; author: string; msg: string; startedAt: number; stages: Stage[]; env?: "staging" | "production" };
export type Release = { version: string; date: string; commits: string[]; status: "current" | "previous" | "rolled-back"; notes: string };
export const runStatus = (r: Run): "passed" | "failed" | "running" => (r.stages.some((s) => s.status === "failed") ? "failed" : r.stages.some((s) => s.status === "running") ? "running" : "passed");
export const runSeconds = (r: Run) => r.stages.reduce((a, s) => a + s.sec, 0);
const names = ["lint", "typecheck", "test", "build", "package", "deploy"];
const rr = prng(13);
const t = (hoursAgo: number) => NOW.getTime() - hoursAgo * 3600_000;
const mkRun = (id: number, hoursAgo: number, branch: string, msg: string, fail?: string, running?: boolean): Run => ({ id, branch, sha: (0x1a0000 + id * 7919).toString(16).slice(0, 7), author: ["Ava Nguyen", "Noah Smith", "Mia Patel"][id % 3], msg, startedAt: t(hoursAgo),
  stages: names.map((n, i) => { const f = fail === n; const after = fail ? names.indexOf(fail) < i : false; return { name: n, status: after ? "skipped" : f ? "failed" : running && i === names.length - 1 ? "running" : "passed", sec: after ? 0 : Math.round(20 + rr() * 90 + i * 10) }; }), env: branch === "main" ? "production" : "staging" });
export const RUNS: Run[] = [
  mkRun(231, 0.4, "main", "feat(tokens): add Go and Rust theme outputs", undefined, true), mkRun(230, 3, "main", "fix(graphics): clip stroke on rule tier"), mkRun(229, 5, "feature/kiosk", "feat(kiosk): idle reset", "test"), mkRun(228, 9, "main", "chore(deps): bump vite"),
  mkRun(227, 26, "main", "feat(admin): chart zoom"), mkRun(226, 30, "feature/latex", "feat(latex): invoice class", "typecheck"), mkRun(225, 50, "main", "fix(css): layer jupiter components"), mkRun(224, 74, "main", "feat(esphome): widget package"), mkRun(223, 120, "main", "docs: update readme"), mkRun(222, 170, "main", "fix(ci): pin node 24"),
];
export const RELEASES: Release[] = [
  { version: "1.4.0", date: "2026-11-12", status: "current", commits: ["feat(tokens): add Go and Rust theme outputs", "feat(admin): chart zoom", "fix(graphics): clip stroke on rule tier"], notes: "Rust and Go theme outputs, chart zoom." },
  { version: "1.3.2", date: "2026-11-05", status: "previous", commits: ["fix(css): layer jupiter components", "fix(ci): pin node 24"], notes: "Patch: CSS layer ordering." },
  { version: "1.3.1", date: "2026-10-29", status: "rolled-back", commits: ["feat(esphome): widget package", "docs: update readme"], notes: "Rolled back: LVGL snippet regression." },
  { version: "1.3.0", date: "2026-10-20", status: "previous", commits: ["feat(latex): resume classes", "feat(kiosk): idle reset", "chore(deps): bump vite"], notes: "LaTeX templates." },
];
/** Group conventional commits into changelog sections. */
export function changelog(commits: string[]) {
  const titles: Record<string, string> = { feat: "Features", fix: "Fixes", docs: "Documentation", chore: "Maintenance", ci: "CI" };
  const out: Record<string, { scope?: string; text: string }[]> = {};
  for (const c of commits) { const m = /^(\w+)(?:\(([^)]+)\))?!?:\s*(.+)$/.exec(c); const kind = m ? m[1] : "chore"; (out[titles[kind] ?? "Other"] ??= []).push({ scope: m?.[2], text: m ? m[3] : c }); }
  return out;
}
export function nextVersion(current: string, commits: string[]) { const [a, b, c] = current.split(".").map(Number); if (commits.some((x) => /^\w+(\([^)]*\))?!:/.test(x))) return `${a + 1}.0.0`; if (commits.some((x) => x.startsWith("feat"))) return `${a}.${b + 1}.0`; return `${a}.${b}.${c + 1}`; }
export function doraMetrics(runs: Run[], releases: Release[]) {
  const prod = runs.filter((r) => r.env === "production" && runStatus(r) !== "running"); const failRate = prod.length ? prod.filter((r) => runStatus(r) === "failed").length / prod.length : 0;
  const days = (NOW.getTime() - new Date(releases[releases.length - 1].date).getTime()) / DAY; const freq = releases.length / Math.max(1, days / 7);
  return { deployFreqPerWeek: freq, changeFailureRate: failRate, meanPipelineMin: mean(runs.map((r) => runSeconds(r) / 60)) };
}
