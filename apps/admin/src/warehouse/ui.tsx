import { useEffect, useState } from "react";
import { DIR_LABEL, LOAD_LABEL, STAGE_LABEL, simNow, type Direction, type LoadClass, type State, type TicketStatus } from "./engine.ts";

/** Re-render every second so clocks and countdowns stay live even when the engine has nothing new to publish. Returns the current sim time. */
export function useNow(s: Pick<State, "baseSim" | "baseReal" | "speed">): number {
  const [, set] = useState(0);
  useEffect(() => { const t = setInterval(() => set((x) => x + 1), 1000); return () => clearInterval(t); }, []);
  return simNow(s);
}

export type Tone = "ok" | "warn" | "danger" | "info" | "accent" | "muted";
/** One tone per stage, used by the stage chips, the dock status display and the lobby. Colour is never the only signal: the stage always has a word. */
export const STAGE_TONE: Record<TicketStatus | "free" | "blocked", Tone> = { free: "ok", blocked: "danger", waiting: "muted", called: "warn", onDock: "info", accepted: "info", working: "accent", complete: "warn", cleared: "ok", departed: "muted", noshow: "danger" };

export const LoadTag = ({ l }: { l: LoadClass }) => <span className={`wh-load is-${l}`}>{l === "dg" ? "DG" : LOAD_LABEL[l]}</span>;
export const DirTag = ({ d }: { d: Direction }) => <span className={`wh-dir is-${d}`}>{d === "in" ? "↓" : "↑"} {DIR_LABEL[d]}</span>;
export const StageChip = ({ st }: { st: TicketStatus | "free" | "blocked" }) => <span className={`wh-stage is-${STAGE_TONE[st]}`}>{st === "free" ? "Free" : st === "blocked" ? "Blocked" : STAGE_LABEL[st]}</span>;
/** The stages a truck passes at a dock, in order, for the progress rail. */
export const RAIL: { st: TicketStatus; label: string }[] = [{ st: "called", label: "Approach" }, { st: "onDock", label: "Check-in" }, { st: "accepted", label: "Accepted" }, { st: "working", label: "Working" }, { st: "complete", label: "Review" }, { st: "cleared", label: "Leaving" }];
export const Rail = ({ at }: { at: TicketStatus }) => {
  const i = RAIL.findIndex((r) => r.st === at);
  return <ol className="wh-rail" aria-label="Progress at the dock">{RAIL.map((r, k) => <li key={r.st} className={k < i ? "is-past" : k === i ? "is-now" : ""} aria-current={k === i ? "step" : undefined}><i aria-hidden />{r.label}</li>)}</ol>;
};
export const dockLabel = (s: Pick<State, "docks">, id?: number) => s.docks.find((d) => d.id === id)?.name ?? "dock";
export const cap = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
