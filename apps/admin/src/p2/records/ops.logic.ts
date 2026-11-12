// Incident, runbook and device logic (pure).
export type IncStatus = "investigating" | "identified" | "monitoring" | "resolved";
export const FLOW: IncStatus[] = ["investigating", "identified", "monitoring", "resolved"];
export const nextStatuses = (s: IncStatus): IncStatus[] => (s === "resolved" ? ["investigating"] : s === "monitoring" ? ["identified", "resolved"] : s === "identified" ? ["monitoring", "investigating"] : ["identified"]);
export type IncEvent = { t: number; kind: "status" | "note" | "responder" | "action"; text: string; by: string };
export type Incident = { id: string; title: string; sev: 1 | 2 | 3; status: IncStatus; startedAt: number; resolvedAt?: number; events: IncEvent[]; responders: { name: string; role: "commander" | "scribe" | "responder" }[]; summary: string; cause: string; followUps: { text: string; done: boolean }[] };
export function changeStatus(i: Incident, to: IncStatus, now: number, by: string): { inc: Incident; error?: string } {
  if (!nextStatuses(i.status).includes(to)) return { inc: i, error: `Can’t go from ${i.status} to ${to}` };
  if (to === "resolved" && !i.summary.trim()) return { inc: i, error: "Add a summary before resolving" };
  if (to === "resolved" && !i.responders.some((r) => r.role === "commander")) return { inc: i, error: "Assign an incident commander first" };
  return { inc: { ...i, status: to, resolvedAt: to === "resolved" ? now : undefined, events: [{ t: now, kind: "status", text: `Status: ${i.status} → ${to}`, by }, ...i.events] } };
}
export const assign = (i: Incident, name: string, role: Incident["responders"][number]["role"], now: number, by: string): Incident => {
  const others = i.responders.filter((r) => r.name !== name && !(role === "commander" && r.role === "commander"));
  return { ...i, responders: [...others, { name, role }], events: [{ t: now, kind: "responder", text: `${name} joined as ${role}`, by }, ...i.events] };
};
export const durationMin = (i: Incident, now: number) => Math.max(0, Math.round(((i.resolvedAt ?? now) - i.startedAt) / 60000));
export const timeToStatus = (i: Incident, to: IncStatus) => { const e = [...i.events].reverse().find((x) => x.kind === "status" && x.text.endsWith(`→ ${to}`)); return e ? Math.round((e.t - i.startedAt) / 60000) : null; };
export function postmortem(i: Incident, fmt: (t: number) => string) {
  const tl = [...i.events].reverse().map((e) => `- ${fmt(e.t)} ${e.text}${e.by ? ` (${e.by})` : ""}`).join("\n");
  return `# Postmortem: ${i.title}\n\n**Severity:** SEV${i.sev}  \n**Duration:** ${durationMin(i, i.resolvedAt ?? i.startedAt + 1)} min  \n**Commander:** ${i.responders.find((r) => r.role === "commander")?.name ?? "unassigned"}\n\n## Summary\n${i.summary || "_Not written yet._"}\n\n## Root cause\n${i.cause || "_Not determined._"}\n\n## Timeline\n${tl}\n\n## Follow-ups\n${i.followUps.length ? i.followUps.map((f) => `- [${f.done ? "x" : " "}] ${f.text}`).join("\n") : "_None._"}\n`;
}
export const pmReady = (i: Incident) => i.status === "resolved" && !!i.summary.trim() && !!i.cause.trim() && i.followUps.length > 0;

export type RStep = { id: string; title: string; kind: "manual" | "command"; cmd?: string; expect?: string; destructive?: boolean };
export type RunState = { started: boolean; done: Record<string, "ok" | "failed" | "skipped">; log: { t: number; msg: string }[]; aborted: boolean };
export const newRun = (): RunState => ({ started: false, done: {}, log: [], aborted: false });
export const currentStep = (steps: RStep[], r: RunState) => (r.aborted ? undefined : steps.find((s) => !r.done[s.id]));
export function completeStep(steps: RStep[], r: RunState, id: string, result: "ok" | "failed" | "skipped", now: number): RunState {
  const cur = currentStep(steps, r); if (!cur || cur.id !== id) return r; // steps must be done in order
  const s = steps.find((x) => x.id === id)!;
  return { ...r, started: true, done: { ...r.done, [id]: result }, aborted: result === "failed" && s.destructive ? true : r.aborted, log: [{ t: now, msg: `${s.title}: ${result}` }, ...r.log] };
}
export const abort = (r: RunState, now: number): RunState => ({ ...r, aborted: true, log: [{ t: now, msg: "Run aborted" }, ...r.log] });
export const runStatus = (steps: RStep[], r: RunState) => (r.aborted ? "aborted" : !r.started ? "not started" : steps.every((s) => r.done[s.id]) ? (Object.values(r.done).includes("failed") ? "finished with failures" : "complete") : "in progress");
export const simulateCommand = (cmd: string) => (/fail|rm -rf/.test(cmd) ? { ok: false, out: `${cmd}\nexit status 1` } : { ok: true, out: `${cmd}\nOK (0.4s)` });

export type Metrics = { cpu: number; mem: number; temp: number; rssi: number; uptimeH: number };
export function deviceHealth(m: Metrics): { status: "ok" | "warn" | "danger"; reasons: string[] } {
  const reasons: string[] = []; let level = 0; const bump = (l: number, r: string) => { level = Math.max(level, l); reasons.push(r); };
  if (m.cpu >= 90) bump(2, `CPU ${m.cpu}%`); else if (m.cpu >= 75) bump(1, `CPU ${m.cpu}%`);
  if (m.mem >= 92) bump(2, `Memory ${m.mem}%`); else if (m.mem >= 80) bump(1, `Memory ${m.mem}%`);
  if (m.temp >= 80) bump(2, `Temperature ${m.temp}°C`); else if (m.temp >= 70) bump(1, `Temperature ${m.temp}°C`);
  if (m.rssi <= -85) bump(1, `Weak signal ${m.rssi} dBm`);
  return { status: (["ok", "warn", "danger"] as const)[level], reasons };
}
export const needsTypedConfirm = (action: "reboot" | "locate" | "update" | "reset") => action === "reset";
