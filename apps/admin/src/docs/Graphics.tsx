import { useMemo, useState, type CSSProperties } from "react";
import { PageHeader, Section } from "@belikh/jupiter-ui/kit.tsx";
import { useCopy } from "./copy.ts";
import { GRAPHICS, TIERS, svg, type Graphic, type Tier } from "@belikh/jupiter-graphics";
import "@belikh/jupiter-graphics/jupiter-graphics.css";

const ORDER: { tier: Tier; title: string; min: number }[] = [
  { tier: "spot", title: "Spot illustrations", min: 190 },
  { tier: "scene", title: "Scenes", min: 340 },
  { tier: "rule", title: "Rules and flourishes", min: 340 },
  { tier: "icon", title: "Icons", min: 92 },
];

function Line({ g, draw }: { g: Graphic; draw?: boolean }) {
  const t = TIERS[g.tier];
  return (
    <svg viewBox={`0 0 ${t.w} ${t.h}`} className={`jp-line jp-line--${g.tier}${draw ? " jp-line--draw" : ""}`} aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth={t.stroke} strokeLinecap="round" strokeLinejoin="round" pathLength={1} d={g.d} />
    </svg>
  );
}

export function DsGraphics() {
  const copyText = useCopy();
  const [q, setQ] = useState("");
  const [draw, setDraw] = useState(0);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? GRAPHICS.filter((g) => g.name.includes(s) || g.tags.some((t) => t.includes(s))) : GRAPHICS;
  }, [q]);

  return (
    <>
      <PageHeader eyebrow="foundations" title="Line graphics">
        <p>
          Every graphic is a single unbroken stroke: one path, no fill, round ends, drawn in the colour of the text around it. {GRAPHICS.length} graphics in
          four sizes. Select one to copy its SVG.
        </p>
      </PageHeader>

      <div className="adm-toolbar">
        <label className="jp-field adm-toolbar__grow">
          <span className="jp-label">Search</span>
          <input className="jp-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="kangaroo, retro, error, divider…" data-testid="graphics-search" />
        </label>
        <button type="button" className="jp-btn" onClick={() => setDraw((n) => n + 1)} data-testid="graphics-draw">
          Draw them on
        </button>
      </div>

      {ORDER.map(({ tier, title, min }) => {
        const list = shown.filter((g) => g.tier === tier);
        if (!list.length) return null;
        return (
          <Section key={tier} title={title} kicker={`${list.length} · ${TIERS[tier].w}×${TIERS[tier].h}`}>
            <p className="jp-muted adm-gap-bottom">{TIERS[tier].use}</p>
            <div className="adm-gallery" style={{ "--adm-min": `${min}px` } as CSSProperties} data-testid={`graphics-${tier}`}>
              {list.map((g) => (
                <button
                  key={`${g.id}-${draw}`}
                  type="button"
                  title={`Copy ${g.id} SVG`}
                  onClick={() => copyText(`${g.id}.svg`, svg(g.id))}
                  data-testid={`graphic-${g.id}`}
                  className={`adm-gtile adm-gtile--${tier}`}
                >
                  <span className="adm-gtile__art"><Line g={g} draw={draw > 0} /></span>
                  <span className="jp-mono jp-muted adm-gtile__name">{g.name}</span>
                </button>
              ))}
            </div>
          </Section>
        );
      })}
      {!shown.length && <p className="jp-muted">Nothing matches “{q}”.</p>}
    </>
  );
}
