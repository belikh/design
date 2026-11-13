import { NOW, mean, prng, sum } from "./lib.ts";

export type Lane = { id: string; name: string; open: boolean; staff: number; perHour: number[] };
export type Equip = { id: string; name: string; type: "ETD" | "X-ray CT" | "WTMD"; every: number; lastTest: string; result: "pass" | "fail"; lane: string };
export type Shift = { id: string; name: string; start: number; end: number; lane: string; role: "screener" | "supervisor" };
const r = prng(5);
const curve = (peak: number) => Array.from({ length: 18 }, (_, i) => { const h = i + 5; const wave = Math.exp(-((h - 7) ** 2) / 6) + 0.8 * Math.exp(-((h - 16) ** 2) / 8) + 0.3; return Math.round(peak * wave * (0.9 + r() * 0.2)); });
export const HOURS = Array.from({ length: 18 }, (_, i) => i + 5);
export const LANES: Lane[] = [{ id: "l1", name: "Lane 1", open: true, staff: 4, perHour: curve(150) }, { id: "l2", name: "Lane 2", open: true, staff: 4, perHour: curve(140) }, { id: "l3", name: "Lane 3", open: true, staff: 4, perHour: curve(120) }, { id: "l4", name: "Lane 4", open: false, staff: 0, perHour: curve(0) }, { id: "l5", name: "Crew lane", open: true, staff: 3, perHour: curve(60) }];
export const hourIndex = (now = NOW) => now.getHours() - 5;
/** Queue wait via Little's law: W = L / λ, with L the number queued and λ the lane throughput per minute. */
export const queueWaitMin = (queued: number, perHour: number) => (perHour <= 0 ? Infinity : queued / (perHour / 60));
export const QUEUE_NOW: Record<string, number> = { l1: 34, l2: 22, l3: 41, l4: 0, l5: 6 };
export const peakHour = (l: Lane) => HOURS[l.perHour.indexOf(Math.max(...l.perHour))];
export const totalThroughput = (lanes: Lane[]) => HOURS.map((_, i) => sum(lanes.map((l) => l.perHour[i])));
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000).toISOString();
export const EQUIP: Equip[] = [
  { id: "e1", name: "ETD 1", type: "ETD", every: 24, lastTest: hoursAgo(5), result: "pass", lane: "Lane 1" }, { id: "e2", name: "ETD 2", type: "ETD", every: 24, lastTest: hoursAgo(26), result: "pass", lane: "Lane 3" }, { id: "e3", name: "CT 1", type: "X-ray CT", every: 24, lastTest: hoursAgo(11), result: "pass", lane: "Lane 1" },
  { id: "e4", name: "CT 2", type: "X-ray CT", every: 24, lastTest: hoursAgo(9), result: "fail", lane: "Lane 2" }, { id: "e5", name: "CT 3", type: "X-ray CT", every: 24, lastTest: hoursAgo(20), result: "pass", lane: "Lane 3" }, { id: "e6", name: "WTMD A", type: "WTMD", every: 12, lastTest: hoursAgo(13), result: "pass", lane: "Crew lane" },
];
export type TestState = "ok" | "due-soon" | "overdue" | "failed";
export function testState(e: Equip, now = NOW): { state: TestState; hoursLeft: number } { const hoursLeft = e.every - (now.getTime() - new Date(e.lastTest).getTime()) / 3600_000; return { state: e.result === "fail" ? "failed" : hoursLeft < 0 ? "overdue" : hoursLeft < 3 ? "due-soon" : "ok", hoursLeft }; }
const S = (id: number, name: string, start: number, end: number, lane: string, role: Shift["role"] = "screener"): Shift => ({ id: `s${id}`, name, start, end, lane, role });
export const ROSTER: Shift[] = [
  S(1, "A. Nguyen", 5, 13, "Lane 1", "supervisor"), S(2, "N. Smith", 5, 13, "Lane 1"), S(3, "M. Patel", 5, 13, "Lane 1"), S(4, "L. Williams", 5, 13, "Lane 1"), S(5, "Z. Chen", 5, 13, "Lane 2"), S(6, "J. Kelly", 5, 13, "Lane 2"), S(7, "R. Singh", 6, 14, "Lane 2"), S(8, "E. Moore", 6, 14, "Lane 2"),
  S(9, "T. Walker", 6, 14, "Lane 3"), S(10, "P. Hughes", 6, 14, "Lane 3"), S(11, "K. Evans", 7, 15, "Lane 3"), S(12, "O. Brown", 7, 15, "Lane 3"), S(13, "D. Taylor", 13, 21, "Lane 1", "supervisor"), S(14, "F. Murphy", 13, 21, "Lane 1"), S(15, "G. Wilson", 13, 21, "Lane 1"), S(16, "H. Lee", 14, 22, "Lane 2"), S(17, "I. Park", 14, 22, "Lane 2"), S(18, "S. Ray", 14, 22, "Lane 3"),
];
/** Required staff per hour: 4 per open lane through the peaks, 3 off-peak; coverage counts shifts covering each hour. */
export const requiredAt = (hour: number, lanes: Lane[]) => sum(lanes.filter((l) => l.open && l.perHour[hour - 5] > 0).map((l) => (l.perHour[hour - 5] > 80 ? 4 : 3)));
export const coverageAt = (hour: number, roster: Shift[]) => roster.filter((s) => hour >= s.start && hour < s.end).length;
export const gaps = (roster: Shift[], lanes: Lane[]) => HOURS.map((h) => ({ hour: h, need: requiredAt(h, lanes), have: coverageAt(h, roster) })).filter((g) => g.have < g.need);
export const meanThroughput = (l: Lane) => mean(l.perHour.filter((v) => v > 0));
