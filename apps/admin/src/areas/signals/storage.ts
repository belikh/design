/** Maths for D069. */
/** Least-squares line through (index, value). */
export function linearFit(y: number[]) {
  const n = y.length; if (n < 2) return { slope: 0, intercept: y[0] ?? 0 };
  const mx = (n - 1) / 2, my = y.reduce((a, b) => a + b, 0) / n; let sxy = 0, sxx = 0; y.forEach((v, i) => { sxy += (i - mx) * (v - my); sxx += (i - mx) ** 2; });
  const slope = sxy / sxx; return { slope, intercept: my - slope * mx };
}
/** Extrapolate `horizon` further points from the fit; `daysToFull` is index steps from the last observed point until `capacity`, or null when usage is not rising. */
export function forecast(y: number[], horizon: number, capacity?: number) {
  const f = linearFit(y), n = y.length, ahead = Array.from({ length: horizon }, (_, k) => f.intercept + f.slope * (n + k));
  const toFull = capacity !== undefined && f.slope > 0 ? Math.max(0, (capacity - (f.intercept + f.slope * (n - 1))) / f.slope) : null;
  return { ...f, ahead, toFull };
}
export type RaidLevel = "stripe" | "mirror" | "raid5" | "raid6";
export const RAID_LABEL: Record<RaidLevel, string> = { stripe: "Stripe (RAID 0)", mirror: "Mirror (RAID 1)", raid5: "Single parity (RAID 5)", raid6: "Double parity (RAID 6)" };
const minDisks: Record<RaidLevel, number> = { stripe: 1, mirror: 2, raid5: 3, raid6: 4 };
/** Usable and fault tolerance of a pool: capacity is limited by the smallest disk. Returns null when there are too few disks for the level. */
export function poolUsable(disksTb: number[], level: RaidLevel) {
  const n = disksTb.length; if (n < minDisks[level]) return null; const s = Math.min(...disksTb);
  const usable = level === "stripe" ? s * n : level === "mirror" ? s : level === "raid5" ? s * (n - 1) : s * (n - 2);
  return { rawTb: disksTb.reduce((a, b) => a + b, 0), usableTb: usable, tolerates: level === "stripe" ? 0 : level === "mirror" ? n - 1 : level === "raid5" ? 1 : 2 };
}
/** SMART attributes count down from `value` (normalised, 100 or 253 is new) towards `thresh`; the margin is the share of the way left. */
export function smartMargin(value: number, thresh: number, worst = value) { return value <= thresh ? 0 : Math.max(0, (Math.min(value, worst) - thresh) / Math.max(1, 100 - thresh)); }
export const smartState = (value: number, thresh: number): "ok" | "warn" | "fail" => (value <= thresh ? "fail" : value - thresh < 15 ? "warn" : "ok");
