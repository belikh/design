// Presentation helpers: which entities appear where, and friendly names/icons.
import type { HaEntity } from "./source.ts";

export const ROOMS = ["living_room", "kitchen", "bedroom", "office", "garage"] as const;
export const roomName = (r: string) => r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
export const friendly = (e: HaEntity | undefined, fallback = "") => String(e?.attributes.friendly_name ?? fallback);

/** Tappable on/off tiles: [entity_id, icon]. Icons come from @belikh/jupiter-graphics. */
export const TOGGLES: [string, string][] = [
  ["light.living_room", "lightbulb"], ["light.kitchen", "lightbulb"], ["light.bedroom", "lightbulb"], ["light.office", "lightbulb"], ["light.porch", "lightbulb"],
  ["switch.hall_heater", "thermometer"], ["switch.garden_pump", "drop"], ["switch.printer_3d", "bolt"],
];
export const LOCKS = ["lock.front_door", "lock.back_door"];
export const COVERS = ["cover.garage_door", "cover.living_blinds"];
export const PERSONS = ["person.ava", "person.noah"];
export const AUTOMATIONS: [string, string][] = [["automation.movie_mode", "monitor"], ["automation.good_night", "moon"], ["automation.away_mode", "home"], ["automation.boost_hot_water", "bolt"]];
export const BATTERIES = ["sensor.front_door_sensor_battery", "sensor.csi_node_living_battery", "sensor.tv_remote_battery", "sensor.smoke_alarm_hall_battery", "sensor.body_scale_battery", "sensor.mower_battery"];
export const ALARM_LABEL: Record<string, string> = { disarmed: "Disarmed", armed_home: "Armed (home)", armed_away: "Armed (away)", arming: "Arming…", triggered: "TRIGGERED" };
export const WEATHER_ICON: Record<string, string> = { sunny: "sun", "clear-night": "moon", cloudy: "cloud", windy: "wind", rainy: "drop" };
