import { clamp, mean, prng, sum } from "./lib.ts";

export type Domain = "light" | "switch" | "sensor" | "binary_sensor" | "climate" | "lock" | "cover" | "camera" | "media_player";
export type Entity = { id: string; name: string; domain: Domain; area: string; state: string; battery?: number; integration: string; updated: string };
export type Automation = { id: string; name: string; trigger: string; actions: string[]; enabled: boolean; lastRun?: string; runs7d: number; failures7d: number };
export type CameraFeed = { id: string; name: string; area: string; online: boolean; lastMotion?: string; events24h: number; spot: string };
export type Room = { id: string; name: string; occupied: boolean; confidence: number; csiRssi: number; people: number; history: number[] };

export const AREAS = ["Living room", "Kitchen", "Bedroom", "Office", "Garage", "Porch", "Workshop"];
export const ENTITIES: Entity[] = [
  { id: "light.living_room", name: "Living room lights", domain: "light", area: "Living room", state: "on", integration: "ESPHome", updated: "16:52" }, { id: "light.kitchen", name: "Kitchen lights", domain: "light", area: "Kitchen", state: "off", integration: "ESPHome", updated: "14:10" },
  { id: "light.office", name: "Office lights", domain: "light", area: "Office", state: "on", integration: "ESPHome", updated: "09:03" }, { id: "switch.printer", name: "3D printer power", domain: "switch", area: "Workshop", state: "on", integration: "Shelly", updated: "13:45" },
  { id: "sensor.living_temp", name: "Living room temperature", domain: "sensor", area: "Living room", state: "23.1", battery: 88, integration: "ESPHome", updated: "16:59" }, { id: "sensor.bedroom_temp", name: "Bedroom temperature", domain: "sensor", area: "Bedroom", state: "20.6", battery: 71, integration: "ESPHome", updated: "16:58" },
  { id: "sensor.garage_temp", name: "Garage temperature", domain: "sensor", area: "Garage", state: "17.6", battery: 14, integration: "ESPHome", updated: "16:55" }, { id: "binary_sensor.front_door", name: "Front door contact", domain: "binary_sensor", area: "Porch", state: "off", battery: 62, integration: "Zigbee", updated: "12:21" },
  { id: "binary_sensor.office_csi", name: "Office presence (CSI)", domain: "binary_sensor", area: "Office", state: "on", integration: "aquila", updated: "16:59" }, { id: "climate.living", name: "Living room A/C", domain: "climate", area: "Living room", state: "cool", integration: "Daikin", updated: "15:30" },
  { id: "lock.front_door", name: "Front door lock", domain: "lock", area: "Porch", state: "locked", battery: 54, integration: "Zigbee", updated: "08:02" }, { id: "cover.garage", name: "Garage door", domain: "cover", area: "Garage", state: "closed", integration: "ESPHome", updated: "07:40" },
  { id: "camera.porch", name: "Porch camera", domain: "camera", area: "Porch", state: "recording", integration: "UniFi Protect", updated: "16:59" }, { id: "camera.garage", name: "Garage camera", domain: "camera", area: "Garage", state: "idle", integration: "UniFi Protect", updated: "16:59" },
  { id: "media_player.tv", name: "Living room TV", domain: "media_player", area: "Living room", state: "playing", integration: "LG webOS", updated: "16:40" }, { id: "sensor.door_battery", name: "Door sensor battery", domain: "sensor", area: "Porch", state: "62", battery: 62, integration: "Zigbee", updated: "12:21" },
];
export const AUTOMATIONS: Automation[] = [
  { id: "a1", name: "Lights off when the house is empty", trigger: "person.* all away for 10 min", actions: ["light.turn_off all"], enabled: true, lastRun: "Today 08:12", runs7d: 5, failures7d: 0 },
  { id: "a2", name: "Evening porch light", trigger: "sun below horizon -15 min", actions: ["light.turn_on porch"], enabled: true, lastRun: "Today 17:40", runs7d: 7, failures7d: 0 },
  { id: "a3", name: "Close garage at night", trigger: "time 22:00 and cover open", actions: ["cover.close garage", "notify phone"], enabled: true, lastRun: "Yesterday 22:00", runs7d: 2, failures7d: 1 },
  { id: "a4", name: "Heat warning to phone", trigger: "garage temperature above 32 C", actions: ["notify phone"], enabled: false, lastRun: "Last week", runs7d: 0, failures7d: 0 },
  { id: "a5", name: "Office lights follow CSI presence", trigger: "binary_sensor.office_csi changes", actions: ["light.turn_on/off office"], enabled: true, lastRun: "Today 09:03", runs7d: 38, failures7d: 3 },
];
export const CAMERAS: CameraFeed[] = [
  { id: "c1", name: "Porch", area: "Porch", online: true, lastMotion: "16:41", events24h: 14, spot: "scanner-arch" }, { id: "c2", name: "Garage", area: "Garage", online: true, lastMotion: "11:08", events24h: 3, spot: "box" },
  { id: "c3", name: "Back yard", area: "Porch", online: false, events24h: 0, spot: "tree" }, { id: "c4", name: "Workshop", area: "Workshop", online: true, lastMotion: "13:50", events24h: 6, spot: "motherboard-486" },
];
const r = prng(7);
export const ROOMS: Room[] = AREAS.map((a, i) => ({ id: a, name: a, occupied: [true, false, false, true, false, false, true][i], confidence: [0.94, 0.88, 0.97, 0.91, 0.82, 0.76, 0.69][i], csiRssi: -48 - i * 3, people: [2, 0, 0, 1, 0, 0, 1][i], history: Array.from({ length: 24 }, (_, h) => Math.round((h > 6 && h < 22 ? 0.3 + 0.5 * r() : 0.05 * r()) * 100) / 100) }));
/** Half-hourly power (kW) for a day: solar curve, house load, grid = load - solar. */
export function energyDay() {
  const rr = prng(3); const t = Array.from({ length: 48 }, (_, i) => i / 2);
  const solar = t.map((h) => Math.max(0, Math.round(5.2 * Math.sin(((h - 6) / 12) * Math.PI) * 100) / 100 || 0)).map((v, i) => (t[i] < 6 || t[i] > 18 ? 0 : v));
  const load = t.map((h) => Math.round((0.35 + (h > 17 && h < 22 ? 1.4 : 0.3) * rr() + (h > 6 && h < 9 ? 0.5 : 0)) * 100) / 100);
  return { t, solar, load, grid: load.map((l, i) => Math.round((l - solar[i]) * 100) / 100) };
}
/** kWh from half-hourly kW samples; import and export split; cost with import tariff and export feed-in. */
export function energySummary(grid: number[], solar: number[], load: number[], importRate = 0.31, feedIn = 0.06) {
  const imp = sum(grid.filter((g) => g > 0)) * 0.5, exp = sum(grid.filter((g) => g < 0).map((g) => -g)) * 0.5;
  return { solarKwh: sum(solar) * 0.5, loadKwh: sum(load) * 0.5, importKwh: imp, exportKwh: exp, cost: imp * importRate - exp * feedIn, selfUse: clamp(1 - exp / Math.max(0.001, sum(solar) * 0.5), 0, 1) };
}
export const LOW_BATTERY = 20;
export const lowBattery = (es: Entity[]) => es.filter((e) => e.battery !== undefined && e.battery <= LOW_BATTERY).sort((a, b) => a.battery! - b.battery!);
export const successRate = (a: Automation) => (a.runs7d ? 1 - a.failures7d / a.runs7d : 1);
export const occupancyHours = (room: Room) => mean(room.history) * 24;
