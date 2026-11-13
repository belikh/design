import type { Row } from "./lib.tsx";
import type { Pt } from "./cameras.geo.ts";
export type Cam = Row & { name: string; place: string; recording: "Continuous" | "Motion only" | "Off"; bitrateMbps: number; retentionDays: number; sensitivity: number };
export const CAMS = (): Cam[] => [
  { id: "k1", rev: 1, name: "Front door", place: "Porch", recording: "Motion only", bitrateMbps: 4, retentionDays: 30, sensitivity: 60 },
  { id: "k2", rev: 1, name: "Driveway", place: "Outside", recording: "Continuous", bitrateMbps: 6, retentionDays: 14, sensitivity: 50 },
  { id: "k3", rev: 1, name: "Garage", place: "Garage", recording: "Motion only", bitrateMbps: 3, retentionDays: 30, sensitivity: 70 },
  { id: "k4", rev: 1, name: "Workshop", place: "Workshop", recording: "Off", bitrateMbps: 3, retentionDays: 7, sensitivity: 40 },
];
export type Kind = "person" | "vehicle" | "animal" | "motion";
export type Clip = Row & { cam: string; startMin: number; durSec: number; kind: Kind; mb: number; keep: boolean; label: string };
export const CLIPS = (): Clip[] => [
  { id: "x1", rev: 1, cam: "k1", startMin: 7 * 60 + 12, durSec: 24, kind: "person", mb: 11, keep: false, label: "Courier" },
  { id: "x2", rev: 1, cam: "k2", startMin: 8 * 60 + 2, durSec: 40, kind: "vehicle", mb: 30, keep: false, label: "Car leaves" },
  { id: "x3", rev: 1, cam: "k3", startMin: 9 * 60 + 45, durSec: 15, kind: "motion", mb: 6, keep: false, label: "Garage door" },
  { id: "x4", rev: 1, cam: "k1", startMin: 12 * 60 + 30, durSec: 20, kind: "animal", mb: 9, keep: false, label: "Possum" },
  { id: "x5", rev: 1, cam: "k2", startMin: 15 * 60 + 5, durSec: 52, kind: "person", mb: 38, keep: true, label: "Visitor" },
  { id: "x6", rev: 1, cam: "k2", startMin: 16 * 60 + 40, durSec: 30, kind: "vehicle", mb: 22, keep: false, label: "Car arrives" },
  { id: "x7", rev: 1, cam: "k1", startMin: 2 * 60 + 14, durSec: 18, kind: "animal", mb: 7, keep: false, label: "Cat" },
];
/** Zone geometry is in percent of the frame. Rectangles use x/y/w/h; polygons also carry `points` (x/y/w/h is then their bounding box). */
export type Zone = Row & { cam: string; name: string; shape: "rect" | "polygon"; points: Pt[]; x: number; y: number; w: number; h: number; mode: "Detect" | "Ignore"; enabled: boolean; /** Motion sensitivity inside this zone, 0 to 100. */ sensitivity: number; /** Days to keep clips whose motion started in this zone. */ retentionDays: number };
export const ZONES = (): Zone[] => [
  { id: "z1", rev: 1, cam: "k1", name: "Doorstep", shape: "rect", points: [], x: 10, y: 40, w: 30, h: 45, mode: "Detect", enabled: true, sensitivity: 60, retentionDays: 30 },
  { id: "z2", rev: 1, cam: "k2", name: "Driveway", shape: "polygon", points: [[45, 90], [58, 55], [90, 55], [90, 90]], x: 45, y: 55, w: 45, h: 35, mode: "Detect", enabled: true, sensitivity: 50, retentionDays: 14 },
  { id: "z3", rev: 1, cam: "k2", name: "Neighbour's tree", shape: "rect", points: [], x: 5, y: 10, w: 25, h: 30, mode: "Ignore", enabled: true, sensitivity: 0, retentionDays: 1 },
  { id: "z4", rev: 1, cam: "k3", name: "Door", shape: "rect", points: [], x: 60, y: 20, w: 30, h: 60, mode: "Detect", enabled: false, sensitivity: 70, retentionDays: 30 },
];
/** Storage needed for `days` of recording: continuous = full bitrate; motion only = 15% duty cycle; off = 0. Result in GB. */
export function storageGb(c: Cam): number { const duty = c.recording === "Continuous" ? 1 : c.recording === "Motion only" ? 0.15 : 0; return Math.round(c.bitrateMbps * duty * 86400 * c.retentionDays / 8 / 1000 * 10) / 10; }
export const totalGb = (cams: Cam[]) => Math.round(cams.reduce((s, c) => s + storageGb(c), 0) * 10) / 10;
export const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
/** Clips older than retention would be purged; given "age in days" for each clip. Pinned clips are kept. */
export const purgeable = (clips: Clip[], ageDays: Record<string, number>, cams: Cam[]) => clips.filter((c) => !c.keep && (ageDays[c.id] ?? 0) > (cams.find((x) => x.id === c.cam)?.retentionDays ?? 0));
