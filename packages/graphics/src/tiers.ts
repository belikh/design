// Four canvases. Stroke weight is constant inside a tier so a page of graphics reads as one hand.
export type Tier = "icon" | "spot" | "scene" | "rule";
export type Drawing = [name: string, tags: string, waypoints: string];

export const TIERS: Record<Tier, { w: number; h: number; stroke: number; pad: number; use: string }> = {
  icon: { w: 48, h: 48, stroke: 1.75, pad: 2, use: "Interface glyphs, 20 to 64px. Simple routes so they hold at small sizes." },
  spot: { w: 240, h: 240, stroke: 2, pad: 4, use: "Spot illustrations for empty, error and success states, cards and avatars. 120px and up." },
  scene: { w: 480, h: 240, stroke: 2, pad: 4, use: "Wide illustrations for heroes, banners and kiosk idle screens." },
  rule: { w: 480, h: 48, stroke: 2, pad: 3, use: "Dividers, underlines and flourishes. Stretch to the measure." },
};
