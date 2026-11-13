import { useCallback, useEffect, useState } from "react";

/** localStorage-backed state (survives reloads; falls back silently if storage is blocked). */
export function useStored<T>(key: string, init: T): [T, (v: T | ((p: T) => T)) => void] {
  const [v, setV] = useState<T>(() => { try { const r = localStorage.getItem(key); return r ? (JSON.parse(r) as T) : init; } catch { return init; } });
  const set = useCallback((n: T | ((p: T) => T)) => setV((p) => { const next = typeof n === "function" ? (n as (p: T) => T)(p) : n; try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ } return next; }), [key]);
  return [v, set];
}
/** Simulated clock in minutes since epoch. Starts at the fixed demo time and advances `speed` sim-minutes per real second while mounted. */
export const NOW0 = Date.UTC(2026, 10, 12, 16, 52) / 60000;
export function useSimNow(speed = 1, run = true) {
  const [t, setT] = useState(NOW0);
  useEffect(() => { if (!run) return; const i = setInterval(() => setT((x) => x + speed / 1), 1000); return () => clearInterval(i); }, [speed, run]);
  return t;
}
export const when = (min: number) => new Date(min * 60000).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
export const ago = (min: number, now = NOW0) => { const d = Math.max(0, now - min); return d < 60 ? `${Math.round(d)}m ago` : d < 1440 ? `${Math.floor(d / 60)}h ago` : `${Math.floor(d / 1440)}d ago`; };
