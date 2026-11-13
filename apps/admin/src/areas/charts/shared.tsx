import type { ReactNode } from "react";
import { C } from "@belikh/jupiter-ui/Charts.tsx";
import type { FrameState } from "./frame.tsx";

/** Empty data always renders the empty state instead of NaN geometry. */
export const autoState = (state: FrameState | undefined, n: number): FrameState => (state && state !== "ready" ? state : n === 0 ? "empty" : "ready");
export const finite = (v: number, fb = 0) => (Number.isFinite(v) ? v : fb);
/** Nice round upper bound and evenly spaced ticks from 0 (or `lo`) to it. A flat series still gets a usable axis. */
export function niceDomain(lo: number, hi: number, ticks = 4) {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { lo: 0, hi: 1, ticks: [0, 1] };
  if (hi === lo) { const pad = Math.abs(hi) * 0.1 || 1; lo -= pad; hi += pad; }
  const span = hi - lo, raw = span / ticks, mag = 10 ** Math.floor(Math.log10(raw)), step = ([1, 2, 5, 10].find((m) => raw <= m * mag) ?? 10) * mag;
  const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step; const out: number[] = []; for (let v = a; v <= b + step / 2; v += step) out.push(Math.round(v / step) * step);
  return { lo: a, hi: b, ticks: out };
}
export type Shape = "circle" | "square" | "diamond" | "triangle";
export const SHAPES: Shape[] = ["circle", "square", "diamond", "triangle"];
/** Marker with a distinct shape per series so colour is never the only cue. */
export function Marker({ shape, x, y, r = 5, fill, stroke = "var(--jp-surface-raised)", ...rest }: { shape: Shape; x: number; y: number; r?: number; fill: string; stroke?: string } & React.SVGAttributes<SVGElement>) {
  const p = { fill, stroke, strokeWidth: 1.5, ...rest } as React.SVGProps<SVGElement>;
  if (shape === "square") return <rect x={x - r} y={y - r} width={r * 2} height={r * 2} {...(p as React.SVGProps<SVGRectElement>)} />;
  if (shape === "diamond") return <path d={`M${x},${y - r * 1.25}L${x + r * 1.25},${y}L${x},${y + r * 1.25}L${x - r * 1.25},${y}Z`} {...(p as React.SVGProps<SVGPathElement>)} />;
  if (shape === "triangle") return <path d={`M${x},${y - r * 1.2}L${x + r * 1.1},${y + r}L${x - r * 1.1},${y + r}Z`} {...(p as React.SVGProps<SVGPathElement>)} />;
  return <circle cx={x} cy={y} r={r} {...(p as React.SVGProps<SVGCircleElement>)} />;
}
export const Swatch = ({ i, shape = "circle", label }: { i: number; shape?: Shape; label: ReactNode }) => (
  <span className="adm-row" style={{ gap: 6, display: "inline-flex" }}><svg width="12" height="12" aria-hidden><Marker shape={shape} x={6} y={6} r={4.5} fill={C(i)} stroke="none" /></svg>{label}</span>
);
export const fmt1 = (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v * 100) / 100));
