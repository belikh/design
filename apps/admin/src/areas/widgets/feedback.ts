/* Pure helpers for ratings, NPS, Likert and the GPIO / confirm widgets. */
export const npsCategory = (n: number): "detractor" | "passive" | "promoter" => (n <= 6 ? "detractor" : n <= 8 ? "passive" : "promoter");
/** Net Promoter Score = %promoters - %detractors, -100 to 100. */
export function npsScore(scores: number[]): { score: number; promoters: number; passives: number; detractors: number } {
  if (!scores.length) return { score: 0, promoters: 0, passives: 0, detractors: 0 };
  const c = { promoter: 0, passive: 0, detractor: 0 }; for (const s of scores) c[npsCategory(s)]++;
  return { score: Math.round(((c.promoter - c.detractor) / scores.length) * 100), promoters: c.promoter, passives: c.passive, detractors: c.detractor };
}
export const LIKERT = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"] as const;
export const likertMean = (answers: (number | undefined)[]): number | null => { const a = answers.filter((x): x is number => x !== undefined); return a.length ? a.reduce((x, y) => x + y, 0) / a.length + 1 : null; };
export const nextRating = (cur: number, key: string, max: number): number | null => (key === "ArrowRight" || key === "ArrowUp" ? Math.min(max, cur + 1) : key === "ArrowLeft" || key === "ArrowDown" ? Math.max(1, cur - 1) : key === "Home" ? 1 : key === "End" ? max : null);

/* ---- ESP32-style GPIO ---- */
export type Need = "output" | "input" | "adc" | "pwm" | "i2c";
export type Pin = { n: number; flags: ("flash" | "input-only" | "strapping" | "adc2" | "adc1" | "uart")[]; note?: string };
const f = (n: number, ...flags: Pin["flags"]): Pin => ({ n, flags });
export const PINS: Pin[] = [f(0, "strapping", "adc2"), f(1, "uart"), f(2, "strapping", "adc2"), f(3, "uart"), f(4, "adc2"), f(5, "strapping"), f(6, "flash"), f(7, "flash"), f(8, "flash"), f(9, "flash"), f(10, "flash"), f(11, "flash"), f(12, "strapping", "adc2"), f(13, "adc2"), f(14, "adc2"), f(15, "strapping", "adc2"), f(16), f(17), f(18), f(19), f(21), f(22), f(23), f(25, "adc2"), f(26, "adc2"), f(27, "adc2"), f(32, "adc1"), f(33, "adc1"), f(34, "input-only", "adc1"), f(35, "input-only", "adc1"), f(36, "input-only", "adc1"), f(39, "input-only", "adc1")];
export type PinState = { ok: boolean; level: "ok" | "warn" | "bad"; reason: string };
/** Whether a pin is usable for a need, given pins already used (and whether Wi-Fi is on, which blocks ADC2). */
export function pinState(p: Pin, need: Need, used: Record<number, string>, wifi = true): PinState {
  if (p.flags.includes("flash")) return { ok: false, level: "bad", reason: "Connected to the flash chip" };
  if (used[p.n]) return { ok: false, level: "bad", reason: `Already used by ${used[p.n]}` };
  if (p.flags.includes("input-only") && (need === "output" || need === "pwm" || need === "i2c")) return { ok: false, level: "bad", reason: "Input only" };
  if (need === "adc" && !p.flags.some((x) => x === "adc1" || x === "adc2")) return { ok: false, level: "bad", reason: "No analog input" };
  if (need === "adc" && p.flags.includes("adc2") && wifi) return { ok: false, level: "bad", reason: "ADC2 is unavailable while Wi-Fi is on" };
  if (p.flags.includes("uart")) return { ok: true, level: "warn", reason: "Used by the serial console and flashing" };
  if (p.flags.includes("strapping")) return { ok: true, level: "warn", reason: "Strapping pin: its level at boot changes startup behaviour" };
  return { ok: true, level: "ok", reason: "Available" };
}
