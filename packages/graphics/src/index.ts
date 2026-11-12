import { TIERS, type Drawing, type Tier } from "./tiers.ts";
import { parse, toPath, bounds } from "./spline.ts";
import { icons } from "./drawings/icons.ts";
import { spots } from "./drawings/spots.ts";
import { scenes } from "./drawings/scenes.ts";
import { rules } from "./drawings/rules.ts";

export { TIERS, type Tier };
export type Graphic = { id: string; tier: Tier; name: string; tags: string[]; d: string };

const SOURCES: Record<Tier, Drawing[]> = { icon: icons, spot: spots, scene: scenes, rule: rules };

export const GRAPHICS: Graphic[] = (Object.keys(SOURCES) as Tier[]).flatMap((tier) =>
  SOURCES[tier].map(([name, tags, src]) => {
    const pts = parse(src);
    const t = TIERS[tier], b = bounds(pts), m = t.pad;
    if (b.minX < m || b.minY < m || b.maxX > t.w - m || b.maxY > t.h - m)
      throw new Error(`${tier}/${name}: waypoints leave the ${t.w}x${t.h} canvas (pad ${m}): ${JSON.stringify(b)}`);
    return { id: `${tier}-${name}`, tier, name, tags: tags.split(" ").filter(Boolean), d: toPath(pts) };
  }),
);

// The whole style, as markup: one path, no fill, round ends, colour from the surrounding text.
// pathLength="1" lets CSS draw the line on with stroke-dasharray: 1 whatever its real length.
export const pathAttrs = (tier: Tier) =>
  `fill="none" stroke="currentColor" stroke-width="${TIERS[tier].stroke}" stroke-linecap="round" stroke-linejoin="round" pathLength="1"`;

export function svg(g: Graphic, title?: string): string {
  const t = TIERS[g.tier];
  const a11y = title ? `role="img" aria-label="${title.replace(/[<>&"]/g, "")}"` : `aria-hidden="true"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t.w} ${t.h}" class="jp-line jp-line--${g.tier}" ${a11y}><path ${pathAttrs(g.tier)} d="${g.d}"/></svg>\n`;
}
