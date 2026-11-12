export type Op = ">" | ">=" | "<" | "<=";
export type Rule = { op: Op; threshold: number; forPoints: number; cooldownPoints: number };
export type Firing = { start: number; end: number; peak: number; notified: boolean };
export type Backtest = { states: ("ok" | "pending" | "firing")[]; firings: Firing[]; notifications: number; suppressed: number; firingPoints: number };
const test = (v: number, op: Op, t: number) => (op === ">" ? v > t : op === ">=" ? v >= t : op === "<" ? v < t : v <= t);
/** Replay a rule over a historical series: a condition must hold for `forPoints` consecutive points to fire; repeat notifications within the cooldown are suppressed. */
export function backtest(values: number[], rule: Rule): Backtest {
  const states: Backtest["states"] = []; const firings: Firing[] = []; let run = 0, cur: Firing | null = null, lastNotify = -Infinity, notifications = 0, suppressed = 0;
  values.forEach((v, i) => {
    if (test(v, rule.op, rule.threshold)) {
      run++;
      if (run >= Math.max(1, rule.forPoints)) { if (!cur) { const notify = i - lastNotify > rule.cooldownPoints; cur = { start: i - run + 1, end: i, peak: v, notified: notify }; firings.push(cur); if (notify) { notifications++; lastNotify = i; } else suppressed++; } cur.end = i; cur.peak = rule.op[0] === ">" ? Math.max(cur.peak, v) : Math.min(cur.peak, v); states.push("firing"); } else states.push("pending");
    } else { run = 0; cur = null; states.push("ok"); }
  });
  return { states, firings, notifications, suppressed, firingPoints: states.filter((s) => s === "firing").length };
}

/** Lowest threshold (searching 120 candidates between min and max) that would have fired at most `maxFirings` times: a starting point for tuning a noisy rule. */
export function suggestThreshold(values: number[], rule: Omit<Rule, "threshold">, maxFirings: number): number | null {
  if (!values.length) return null; const lo = Math.min(...values), hi = Math.max(...values); const up = rule.op === ">" || rule.op === ">=";
  for (let i = 0; i <= 120; i++) { const t = up ? lo + ((hi - lo) * i) / 120 : hi - ((hi - lo) * i) / 120; if (backtest(values, { ...rule, threshold: t }).firings.length <= maxFirings) return Math.round(t * 10) / 10; }
  return null;
}
