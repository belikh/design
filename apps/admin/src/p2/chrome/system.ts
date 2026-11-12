import { useEffect, useSyncExternalStore } from "react";
import { can, type Perm, type Role } from "./engine.ts";

// One small external store for app-wide system state. Works without a provider (like the warehouse store), so any page can use it.
export type Env = "production" | "staging" | "sandbox";
export type Task = { id: string; title: string; kind: "upload" | "export" | "sync" | "job"; progress: number; status: "running" | "done" | "failed" | "cancelled"; startedAt: number; error?: string; willFail?: boolean; ms: number };
export type AuditEntry = { id: string; at: number; actor: string; role: Role; action: string; target?: string; env: Env; workspace: string };
export type ClipItem = { id: string; at: number; label: string; text: string; pinned?: boolean };
export type Workspace = { id: string; name: string; env: Env };
export const WORKSPACES: Workspace[] = [{ id: "jupiter-prod", name: "Jupiter", env: "production" }, { id: "jupiter-staging", name: "Jupiter", env: "staging" }, { id: "sandbox", name: "Sandbox", env: "sandbox" }];
export type SystemState = {
  workspace: string; role: Role; readOnly: boolean; maintenance: { on: boolean; message: string }; impersonating: string | null; consent: "unset" | "accepted" | "essential";
  connection: "online" | "degraded" | "offline"; lastSync: number; tasks: Task[]; audit: AuditEntry[]; clipboard: ClipItem[]; version: string;
};
const KEY = "adm-system"; const PERSIST: (keyof SystemState)[] = ["workspace", "role", "readOnly", "maintenance", "impersonating", "consent", "audit", "clipboard"];
const initial = (): SystemState => ({ workspace: "jupiter-staging", role: "admin", readOnly: false, maintenance: { on: false, message: "Scheduled maintenance tonight at 22:00 AEST. Expect a few minutes of downtime." }, impersonating: null, consent: "unset", connection: "online", lastSync: Date.now(), tasks: [], audit: [], clipboard: [], version: "0.1.0" });
const load = (): SystemState => { const s = initial(); try { const raw = localStorage.getItem(KEY); if (raw) Object.assign(s, JSON.parse(raw)); } catch { /* ignore */ }
  // `?visual=1` is used by scripts/visual.mjs: no consent bar, so screenshots show the page, not a banner.
  try { if (typeof location !== "undefined" && /[?&]visual=1/.test(location.search)) s.consent = "essential"; } catch { /* ignore */ }
  return s; };
let state: SystemState = load(); const subs = new Set<() => void>();
const save = () => { try { const o: Partial<SystemState> = {}; for (const k of PERSIST) (o as Record<string, unknown>)[k] = state[k]; localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* ignore */ } };
const set = (p: Partial<SystemState>) => { state = { ...state, ...p }; save(); subs.forEach((f) => f()); };
export const getSystem = () => state; export const subscribeSystem = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const useSystem = () => useSyncExternalStore(subscribeSystem, getSystem);
export const workspaceOf = (s: SystemState = state) => WORKSPACES.find((w) => w.id === s.workspace) ?? WORKSPACES[1];
export const envOf = (s: SystemState = state): Env => workspaceOf(s).env;
export const resetSystem = () => { timers.forEach((t) => clearInterval(t)); timers.clear(); state = initial(); subs.forEach((f) => f()); };

let aid = 0;
export const audit = (action: string, target?: string) => {
  const e: AuditEntry = { id: `a${Date.now()}-${++aid}`, at: Date.now(), actor: state.impersonating ?? "Ava Nguyen", role: state.role, action, target, env: envOf(), workspace: workspaceOf().name };
  set({ audit: [e, ...state.audit].slice(0, 200) });
};
export const system = {
  setWorkspace: (workspace: string) => { set({ workspace }); audit("Switched workspace", workspace); },
  setRole: (role: Role) => { set({ role }); audit("Viewing as role", role); },
  setReadOnly: (readOnly: boolean) => { set({ readOnly }); audit(readOnly ? "Enabled read-only mode" : "Disabled read-only mode"); },
  setMaintenance: (on: boolean, message?: string) => { set({ maintenance: { on, message: message ?? state.maintenance.message } }); audit(on ? "Announced maintenance" : "Cleared maintenance banner"); },
  impersonate: (who: string | null) => { set({ impersonating: who }); audit(who ? "Started impersonation" : "Stopped impersonation", who ?? undefined); },
  setConsent: (consent: SystemState["consent"]) => { set({ consent }); audit("Cookie consent", consent); },
  setConnection: (connection: SystemState["connection"]) => set({ connection, ...(connection === "online" ? { lastSync: Date.now() } : {}) }),
  sync: () => { set({ lastSync: Date.now() }); },
  clearAudit: () => set({ audit: [] }),
  clip: (label: string, text: string) => { const it: ClipItem = { id: `c${Date.now()}-${++aid}`, at: Date.now(), label, text }; set({ clipboard: [it, ...state.clipboard.filter((c) => c.text !== text || c.pinned)].slice(0, 30) }); },
  pin: (id: string) => set({ clipboard: state.clipboard.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)) }),
  dropClip: (id: string) => set({ clipboard: state.clipboard.filter((c) => c.id !== id) }),
  clearClips: () => set({ clipboard: state.clipboard.filter((c) => c.pinned) }),
};

/* ---------- background tasks (simulated progress) ---------- */
const timers = new Map<string, ReturnType<typeof setInterval>>();
export function startTask(o: { title: string; kind?: Task["kind"]; ms?: number; fail?: boolean }): string {
  const t: Task = { id: `t${Date.now()}-${++aid}`, title: o.title, kind: o.kind ?? "job", progress: 0, status: "running", startedAt: Date.now(), ms: o.ms ?? 6000, willFail: o.fail };
  set({ tasks: [t, ...state.tasks].slice(0, 30) }); run(t.id); return t.id;
}
function run(id: string) {
  const tick = 250; const iv = setInterval(() => {
    const t = state.tasks.find((x) => x.id === id); if (!t || t.status !== "running") { clearInterval(iv); timers.delete(id); return; }
    const p = Math.min(100, t.progress + (tick / t.ms) * 100 * (0.7 + Math.random() * 0.6)); const fail = t.willFail && p > 60;
    set({ tasks: state.tasks.map((x) => (x.id === id ? { ...x, progress: fail ? x.progress : p, status: fail ? "failed" : p >= 100 ? "done" : "running", error: fail ? "Upstream timed out (simulated)" : undefined } : x)) });
    if (fail || p >= 100) { clearInterval(iv); timers.delete(id); if (p >= 100) set({ lastSync: Date.now() }); }
  }, tick); timers.set(id, iv);
}
export const cancelTask = (id: string) => { set({ tasks: state.tasks.map((t) => (t.id === id && t.status === "running" ? { ...t, status: "cancelled" } : t)) }); };
export const retryTask = (id: string) => { const t = state.tasks.find((x) => x.id === id); if (t) { set({ tasks: state.tasks.map((x) => (x.id === id ? { ...x, status: "running", progress: 0, error: undefined, willFail: false } : x)) }); run(id); } };
export const clearFinished = () => set({ tasks: state.tasks.filter((t) => t.status === "running") });

/* ---------- permission hooks ---------- */
export const useRole = () => useSystem().role;
export function useCan(perm: Perm): { allowed: boolean; reason?: string } {
  const s = useSystem(); const base = can(s.role, perm);
  if (!base) return { allowed: false, reason: `Your role (${s.role}) can't do this` };
  const write = perm.endsWith(".edit") || perm.endsWith(".delete") || perm === "members.manage";
  if (s.readOnly && write) return { allowed: false, reason: "Read-only mode is on" };
  return { allowed: true };
}
/** Mirror system state onto <html> so CSS can react (read-only styling, environment tint). */
export function useSystemAttributes() {
  const s = useSystem();
  useEffect(() => { const el = document.documentElement; el.dataset.readonly = String(s.readOnly); el.dataset.env = envOf(s); }, [s]);
}
