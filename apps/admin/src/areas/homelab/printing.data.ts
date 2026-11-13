import type { Row } from "./lib.tsx";
export type Printer = Row & { name: string; model: string; state: "Idle" | "Printing" | "Paused" | "Error" | "Offline"; job: string; progress: number; nozzle: number; bed: number; hours: number };
export const PRINTERS = (): Printer[] => [
  { id: "pr1", rev: 1, name: "Prusa MK4", model: "Prusa MK4S", state: "Printing", job: "j1", progress: 62, nozzle: 215, bed: 60, hours: 842 },
  { id: "pr2", rev: 1, name: "Bambu P1S", model: "Bambu Lab P1S", state: "Idle", job: "", progress: 0, nozzle: 24, bed: 23, hours: 310 },
  { id: "pr3", rev: 1, name: "Ender 3 (legacy)", model: "Creality Ender-3", state: "Error", job: "", progress: 0, nozzle: 0, bed: 0, hours: 1904 },
];
export type Job = Row & { name: string; printer: string; material: string; grams: number; minutes: number; status: "Queued" | "Printing" | "Done" | "Failed"; priority: number };
export const JOBS = (): Job[] => [
  { id: "j1", rev: 1, name: "Keyboard case top", printer: "pr1", material: "PETG", grams: 96, minutes: 410, status: "Printing", priority: 1 },
  { id: "j2", rev: 1, name: "Cable clips x20", printer: "", material: "PLA", grams: 40, minutes: 95, status: "Queued", priority: 2 },
  { id: "j3", rev: 1, name: "SGI Octane drive sled", printer: "", material: "PETG", grams: 450, minutes: 560, status: "Queued", priority: 3 },
  { id: "j4", rev: 1, name: "Spool holder", printer: "pr2", material: "PLA", grams: 60, minutes: 180, status: "Done", priority: 9 },
  { id: "j5", rev: 1, name: "Camera mount", printer: "pr3", material: "ABS", grams: 35, minutes: 120, status: "Failed", priority: 9 },
];
export type Spool = Row & { brand: string; material: string; color: string; grams: number; dry: boolean; cost: number };
export const SPOOLS = (): Spool[] => [
  { id: "s1", rev: 1, brand: "Prusament", material: "PETG", color: "Galaxy black", grams: 420, dry: true, cost: 45 },
  { id: "s2", rev: 1, brand: "Bambu", material: "PLA", color: "Jade white", grams: 880, dry: true, cost: 32 },
  { id: "s3", rev: 1, brand: "eSun", material: "PLA", color: "Silk blue", grams: 70, dry: true, cost: 28 },
  { id: "s4", rev: 1, brand: "Generic", material: "ABS", color: "Grey", grams: 640, dry: false, cost: 24 },
  { id: "s5", rev: 1, brand: "Polymaker", material: "PETG", color: "Teal", grams: 15, dry: true, cost: 38 },
];
export type Failure = Row & { date: string; job: string; reason: "Bed adhesion" | "Spaghetti" | "Clog" | "Power loss" | "Thermal runaway" | "Other"; gramsWasted: number; note: string };
export const FAILURES = (): Failure[] => [
  { id: "x1", rev: 1, date: "2026-11-10", job: "Camera mount", reason: "Thermal runaway", gramsWasted: 12, note: "Ender halted at 240 C; thermistor suspect." },
  { id: "x2", rev: 1, date: "2026-11-01", job: "Spool holder", reason: "Bed adhesion", gramsWasted: 22, note: "Cleaned plate with IPA." },
  { id: "x3", rev: 1, date: "2026-10-22", job: "Fan duct", reason: "Clog", gramsWasted: 8, note: "" },
  { id: "x4", rev: 1, date: "2026-10-15", job: "Gridfinity bins", reason: "Bed adhesion", gramsWasted: 31, note: "" },
];
/** Total filament of a material that is dry and not nearly empty (under 20 g is treated as unusable). */
export const usableGrams = (spools: Spool[], material: string) => spools.filter((s) => s.material === material && s.dry && s.grams >= 20).reduce((s, x) => s + x.grams, 0);
export type StartCheck = { ok: true } | { ok: false; why: string };
/** Whether a printer can start a job now. */
export function canStart(p: Printer, j: Job, spools: Spool[]): StartCheck {
  if (p.state !== "Idle") return { ok: false, why: `${p.name} is ${p.state.toLowerCase()}` };
  if (j.status !== "Queued") return { ok: false, why: "Job is not queued" };
  const have = usableGrams(spools, j.material); if (have < j.grams) return { ok: false, why: `Needs ${j.grams} g ${j.material}, ${have} g dry stock` };
  return { ok: true };
}
export const nextJob = (jobs: Job[]) => [...jobs].filter((j) => j.status === "Queued").sort((a, b) => a.priority - b.priority)[0];
export const failureRate = (jobs: Job[]) => { const d = jobs.filter((j) => j.status === "Done" || j.status === "Failed"); return d.length ? Math.round((d.filter((j) => j.status === "Failed").length / d.length) * 100) : 0; };
export const etaMin = (j: Job, p: Printer) => Math.round(j.minutes * (1 - p.progress / 100));
