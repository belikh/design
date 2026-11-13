export type Resource = "projects" | "billing" | "members" | "api-keys" | "audit";
export type Action = "read" | "write" | "admin";
export const RESOURCES: Resource[] = ["projects", "billing", "members", "api-keys", "audit"];
export const ACTIONS: Action[] = ["read", "write", "admin"];
export type Role = { id: string; name: string; perms: Record<Resource, Action[]> };
export type User = { id: string; name: string; email: string; roles: string[]; active: boolean; lastSeen: string };
export type ApiKey = { id: string; name: string; prefix: string; scopes: string[]; created: string; lastUsed?: string; revoked?: boolean };
export type Delivery = { id: string; at: string; event: string; status: number; ms: number; attempt: number };
export type Webhook = { id: string; url: string; events: string[]; active: boolean; deliveries: Delivery[] };
export type AuditEvent = { id: number; at: string; actor: string; action: string; target: string; detail?: string };
const none = (): Record<Resource, Action[]> => ({ projects: [], billing: [], members: [], "api-keys": [], audit: [] });
export const ROLES: Role[] = [
  { id: "owner", name: "Owner", perms: { projects: ["read", "write", "admin"], billing: ["read", "write", "admin"], members: ["read", "write", "admin"], "api-keys": ["read", "write", "admin"], audit: ["read"] } },
  { id: "admin", name: "Admin", perms: { projects: ["read", "write", "admin"], billing: ["read"], members: ["read", "write"], "api-keys": ["read", "write"], audit: ["read"] } },
  { id: "editor", name: "Editor", perms: { ...none(), projects: ["read", "write"] } }, { id: "viewer", name: "Viewer", perms: { ...none(), projects: ["read"] } }, { id: "billing", name: "Billing", perms: { ...none(), billing: ["read", "write"] } },
];
export const USERS: User[] = [
  { id: "u1", name: "Ava Nguyen", email: "ava@example.com", roles: ["owner"], active: true, lastSeen: "now" }, { id: "u2", name: "Noah Smith", email: "noah@example.com", roles: ["admin"], active: true, lastSeen: "12 min ago" }, { id: "u3", name: "Mia Patel", email: "mia@example.com", roles: ["editor", "billing"], active: true, lastSeen: "3 h ago" },
  { id: "u4", name: "Liam Williams", email: "liam@example.com", roles: ["viewer"], active: true, lastSeen: "2 d ago" }, { id: "u5", name: "Zoe Chen", email: "zoe@example.com", roles: ["viewer"], active: false, lastSeen: "41 d ago" },
];
/** Union of the permissions granted by all of a user's roles. A deactivated user has none. */
export function effective(user: User, roles: Role[]): Record<Resource, Action[]> {
  const out = none(); if (!user.active) return out;
  for (const rid of user.roles) { const r = roles.find((x) => x.id === rid); if (!r) continue; for (const res of RESOURCES) out[res] = [...new Set([...out[res], ...r.perms[res]])] as Action[]; }
  return out;
}
export const can = (user: User, roles: Role[], res: Resource, act: Action) => { const p = effective(user, roles)[res]; return act === "read" ? p.length > 0 : p.includes(act) || p.includes("admin"); };
export const SCOPES = ["projects:read", "projects:write", "billing:read", "members:read", "audit:read"];
/** Deterministic example key (never a real secret): jp_live_ + 24 hex chars from a counter. */
export function makeKey(n: number) { let s = (n * 2654435761) >>> 0; let out = ""; for (let i = 0; i < 24; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; out += (s >>> 28).toString(16); } return `jp_live_${out}`; }
export const KEYS: ApiKey[] = [{ id: "k1", name: "CI deploy", prefix: "jp_live_9f2c…", scopes: ["projects:write"], created: "2026-08-14", lastUsed: "today" }, { id: "k2", name: "Home Assistant bridge", prefix: "jp_live_41ab…", scopes: ["projects:read", "members:read"], created: "2026-09-30", lastUsed: "5 min ago" }, { id: "k3", name: "Old script", prefix: "jp_live_7e10…", scopes: ["billing:read"], created: "2025-12-01", revoked: true }];
export const HOOKS: Webhook[] = [{ id: "w1", url: "https://hooks.example.net/jupiter", events: ["deploy.finished", "invoice.paid"], active: true, deliveries: [{ id: "d1", at: "16:52", event: "deploy.finished", status: 200, ms: 120, attempt: 1 }, { id: "d2", at: "15:10", event: "invoice.paid", status: 500, ms: 3000, attempt: 3 }, { id: "d3", at: "09:03", event: "deploy.finished", status: 200, ms: 98, attempt: 1 }] }, { id: "w2", url: "https://chat.example.org/incoming/xyz", events: ["alert.raised"], active: false, deliveries: [{ id: "d4", at: "Yesterday", event: "alert.raised", status: 410, ms: 210, attempt: 5 }] }];
export const deliveryOk = (d: Delivery) => d.status >= 200 && d.status < 300;
export const successRate = (h: Webhook) => (h.deliveries.length ? h.deliveries.filter(deliveryOk).length / h.deliveries.length : 1);
export const filterAudit = (log: AuditEvent[], q: string, actor: string) => log.filter((e) => (actor === "all" || e.actor === actor) && (!q || `${e.action} ${e.target} ${e.detail ?? ""}`.toLowerCase().includes(q.toLowerCase())));
