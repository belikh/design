// A note's growth stage: the icon it shows and how tall its hill is. Shared by StageBadge and Terrain; no CSS, so it is cheap to import.
export type NoteStage = "seedling" | "budding" | "evergreen";
export const STAGE_ICON: Record<NoteStage, string> = { seedling: "icon-sprout", budding: "icon-bud", evergreen: "icon-evergreen" };
export const STAGE_HEIGHT: Record<NoteStage, number> = { seedling: 0.38, budding: 0.68, evergreen: 1 };
