// Access + notification logic (pure).
export const parseEmails = (text: string, existing: string[] = []) => {
  const parts = text.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean); const seen = new Set<string>(); const valid: string[] = [], invalid: string[] = [], dupes: string[] = [], already: string[] = [];
  for (const p of parts) { const e = p.toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) invalid.push(p); else if (existing.map((x) => x.toLowerCase()).includes(e)) already.push(e); else if (seen.has(e)) dupes.push(e); else { seen.add(e); valid.push(e); } }
  return { valid, invalid, dupes, already };
};
export type Member = { id: string; name: string; email: string; role: "owner" | "admin" | "editor" | "viewer" };
export function canChangeRole(members: Member[], id: string, to: Member["role"]): { ok: boolean; why?: string } {
  const m = members.find((x) => x.id === id); if (!m) return { ok: false, why: "Member not found" }; if (m.role === to) return { ok: true };
  if (m.role === "owner") return { ok: false, why: "The owner can’t be changed. Transfer ownership first." }; if (to === "owner") return { ok: false, why: "Use “Transfer ownership” to make someone an owner." };
  if (m.role === "admin" && to !== "admin" && members.filter((x) => x.role === "admin" || x.role === "owner").length <= 1) return { ok: false, why: "At least one admin is required." };
  return { ok: true };
}
export const seatsLeft = (limit: number, members: number, pendingInvites: number) => Math.max(0, limit - members - pendingInvites);
export const isQuiet = (nowHHMM: string, from: string, to: string) => (from === to ? false : from < to ? nowHHMM >= from && nowHHMM < to : nowHHMM >= from || nowHHMM < to);
export type Matrix = Record<string, Record<string, boolean>>;
export const EVENTS = ["Deploy finished", "Alert raised", "Invoice paid", "New sign-in", "Mention", "Weekly digest"] as const; export const CHANNELS = ["In-app", "Email", "Push", "Slack", "SMS"] as const;
export const ESSENTIAL = new Set(["Alert raised", "New sign-in"]);
export function preset(name: "all" | "essential" | "none"): Matrix { const m: Matrix = {}; for (const e of EVENTS) { m[e] = {}; for (const c of CHANNELS) m[e][c] = name === "all" ? c !== "SMS" : name === "essential" ? ESSENTIAL.has(e) && (c === "In-app" || c === "Email" || c === "Push") : false; } return m; }
export const countOn = (m: Matrix) => Object.values(m).reduce((a, r) => a + Object.values(r).filter(Boolean).length, 0);
/** Should this event be delivered now on this channel? Quiet hours silence everything except Essential events. */
export const deliver = (m: Matrix, ev: string, ch: string, nowHHMM: string, q: { on: boolean; from: string; to: string }) => !!m[ev]?.[ch] && !(q.on && isQuiet(nowHHMM, q.from, q.to) && !ESSENTIAL.has(ev));
