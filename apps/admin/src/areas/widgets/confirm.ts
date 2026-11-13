/* Pure state helpers for the confirmation gestures. */
export const scrolledToEnd = (el: { scrollTop: number; clientHeight: number; scrollHeight: number }, slack = 8): boolean => el.scrollHeight <= el.clientHeight + 1 || el.scrollTop + el.clientHeight >= el.scrollHeight - slack;
export const holdProgress = (elapsed: number, total: number): number => Math.max(0, Math.min(1, elapsed / total));
export const slideValue = (x: number, track: number, thumb: number): number => { const span = Math.max(1, track - thumb); return Math.max(0, Math.min(100, (x / span) * 100)); };
export type Challenge = { q: string; a: string };
/** A deterministic arithmetic placeholder challenge. This protects nothing: it only demonstrates the UI states. */
export function challenge(seed: number): Challenge { const a = (seed * 7 + 3) % 9 + 1, b = (seed * 5 + 2) % 8 + 2; return { q: `What is ${a} + ${b}?`, a: String(a + b) }; }
