import { graphic, TIERS, type Tier } from "@belikh/jupiter-graphics";

/** Single-stroke line graphic from @belikh/jupiter-graphics, coloured by the surrounding text colour. */
export function Graphic({ id, size, className = "", title }: { id: string; size?: number | string; className?: string; title?: string }) {
  const g = graphic(id);
  if (!g) return null;
  const t = TIERS[g.tier as Tier];
  const w = size ?? (g.tier === "icon" ? 18 : g.tier === "spot" ? 120 : "100%");
  return (
    <svg
      viewBox={`0 0 ${t.w} ${t.h}`}
      width={w}
      height={typeof w === "number" ? (w * t.h) / t.w : undefined}
      className={`jp-line ${className}`}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ flex: "none", overflow: "visible" }}
    >
      <path d={g.d} fill="none" stroke="currentColor" strokeWidth={t.stroke} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const Icon = ({ name, size = 18, className = "" }: { name: string; size?: number; className?: string }) => (
  <Graphic id={`icon-${name}`} size={size} className={className} />
);
export const Spot = ({ name, size = 120, className = "" }: { name: string; size?: number; className?: string }) => (
  <Graphic id={`spot-${name}`} size={size} className={className} />
);
export const Rule = ({ name = "wave", className = "" }: { name?: string; className?: string }) => (
  <Graphic id={`rule-${name}`} size="100%" className={`adm-rule ${className}`} />
);
