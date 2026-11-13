import { mean, daysUntil, parseIso } from "./lib.ts";

export const STAGES = ["saved", "applied", "screen", "interview", "offer", "rejected"] as const;
export type Stage = (typeof STAGES)[number];
export type JobEvent = { date: string; type: "applied" | "email" | "call" | "interview" | "offer" | "rejection" | "note"; note: string };
export type App = { id: string; company: string; role: string; stage: Stage; reached: Exclude<Stage, "rejected">; appliedOn?: string; source: string; location: string; events: JobEvent[]; doc?: "resume" | "cover" };
const A = (id: number, company: string, role: string, stage: Stage, reached: App["reached"], appliedOn: string | undefined, source: string, location: string, events: JobEvent[], doc?: App["doc"]): App => ({ id: `j${id}`, company, role, stage, reached, appliedOn, source, location, events, doc });
export const APPS: App[] = [
  A(1, "Harbour Field Services", "Field Systems Technician", "interview", "interview", "2026-10-22", "Referral", "Brisbane", [{ date: "2026-10-22", type: "applied", note: "Applied with cover letter" }, { date: "2026-10-27", type: "call", note: "15 min phone screen" }, { date: "2026-11-10", type: "interview", note: "Panel interview booked" }], "cover"),
  A(2, "Council Open Data Unit", "Data Support Officer", "screen", "screen", "2026-11-03", "Job board", "Brisbane", [{ date: "2026-11-03", type: "applied", note: "Applied online" }, { date: "2026-11-09", type: "email", note: "Request for availability" }], "resume"),
  A(3, "Northgate Logistics", "Inventory Systems Analyst", "applied", "applied", "2026-11-05", "Job board", "Brisbane", [{ date: "2026-11-05", type: "applied", note: "Applied" }]),
  A(4, "Delta Aviation Services", "Security Technician", "rejected", "screen", "2026-10-05", "Job board", "Brisbane Airport", [{ date: "2026-10-05", type: "applied", note: "Applied" }, { date: "2026-10-12", type: "call", note: "Phone screen" }, { date: "2026-10-20", type: "rejection", note: "Position filled internally" }]),
  A(5, "Redline Networks", "Network Technician", "offer", "offer", "2026-09-18", "Recruiter", "Remote / QLD", [{ date: "2026-09-18", type: "applied", note: "Via recruiter" }, { date: "2026-09-25", type: "interview", note: "Technical interview" }, { date: "2026-10-08", type: "interview", note: "Final interview" }, { date: "2026-10-30", type: "offer", note: "Offer received" }]),
  A(6, "Kookaburra Automation", "ESP32 Firmware Tester", "saved", "saved", undefined, "Newsletter", "Remote", []), A(7, "Bayside IT", "Service Desk Analyst", "rejected", "applied", "2026-10-14", "Job board", "Brisbane", [{ date: "2026-10-14", type: "applied", note: "Applied" }, { date: "2026-10-29", type: "rejection", note: "Automated rejection" }]),
  A(8, "Moreton Hardware", "Warehouse Systems Support", "applied", "applied", "2026-11-08", "Direct", "Brisbane", [{ date: "2026-11-08", type: "applied", note: "Applied" }]), A(9, "Outback Telco", "Fixed Wireless Installer", "saved", "saved", undefined, "Job board", "Regional QLD", []),
];
const ORDER: Exclude<Stage, "rejected">[] = ["saved", "applied", "screen", "interview", "offer"];
/** Funnel: how many applications reached at least each stage (rejected ones count up to where they got). */
export function funnel(apps: App[]) { return ORDER.map((s) => ({ stage: s, count: apps.filter((a) => ORDER.indexOf(a.reached) >= ORDER.indexOf(s)).length })); }
export const stageConversion = (apps: App[]) => { const f = funnel(apps); return f.slice(1).map((x, i) => ({ from: f[i].stage, to: x.stage, rate: f[i].count ? x.count / f[i].count : 0 })); };
export function stats(apps: App[]) {
  const applied = apps.filter((a) => a.appliedOn); const responded = applied.filter((a) => a.events.some((e) => ["call", "email", "interview", "offer", "rejection"].includes(e.type)));
  const days = responded.map((a) => (parseIso(a.events.find((e) => e.type !== "applied" && e.type !== "note")!.date).getTime() - parseIso(a.appliedOn!).getTime()) / 864e5);
  return { applied: applied.length, active: apps.filter((a) => !["rejected", "saved"].includes(a.stage) && a.stage !== "offer").length, responseRate: applied.length ? responded.length / applied.length : 0, avgDaysToResponse: mean(days), offers: apps.filter((a) => a.stage === "offer").length };
}
export const ageDays = (a: App) => (a.appliedOn ? -daysUntil(a.appliedOn) : 0);
export const DOCS = { resume: "# Alex Example\n\n*Systems and field-service technician, Brisbane*\n\n## Summary\n\nHands-on technician with a background in Linux administration, networking and electronics repair.\n\n## Experience\n\n- **Systems administrator**, Example Systems (2002–present): UniFi networks, WireGuard remote access, vintage UNIX restoration.\n- **Inventory controller**, Example Logistics: SAP data entry automation with Excel and VBA.\n\n## Skills\n\n| Area | Tools |\n| --- | --- |\n| Systems | NixOS, systemd |\n| Hardware | ESP32, FPGA |\n", cover: "Dear Hiring Manager,\n\nI am applying for the **Field Systems Technician** role. I bring decades of hands-on Linux, networking and hardware experience.\n\nIn my current role I work to strict procedures; outside work I run a segmented UniFi network and a household NixOS fleet.\n\nKind regards,\n\nAlex Example" } as const;
