// Home Assistant data source adapter. The UI only ever talks to `HaSource`, whose shape mirrors the
// HA WebSocket API (states, state_changed events, call_service). Default is a deterministic simulation.
import { useSyncExternalStore } from "react";
import { rng } from "../data/fixtures.ts";

export type HaEntity = { entity_id: string; state: string; attributes: Record<string, unknown>; last_changed: string };
export type HaSnapshot = { version: number; entities: HaEntity[]; byId: Record<string, HaEntity> };
export type ServiceResult = { ok: boolean; error?: string };

export interface HaSource {
  getStates(): HaEntity[];
  getSnapshot(): HaSnapshot;
  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe(cb: () => void): () => void;
  callService(domain: string, service: string, data?: Record<string, unknown>): Promise<ServiceResult>;
  /** Recent numeric history for sparklines (oldest first). */
  history(entityId: string): number[];
}

const iso = (t: number) => new Date(t).toISOString();
const PIN = "1234"; // demo-only alarm code for the simulation. Never ship a real code in client code.

type Seed = [id: string, state: string, attrs?: Record<string, unknown>];
const ROOMS = ["living_room", "kitchen", "bedroom", "office", "garage"] as const;
const BASE_T: Record<string, number> = { living_room: 22.4, kitchen: 23.1, bedroom: 20.6, office: 24.0, garage: 16.8 };
const BASE_H: Record<string, number> = { living_room: 48, kitchen: 52, bedroom: 55, office: 44, garage: 62 };
const title = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function seeds(): Seed[] {
  const s: Seed[] = [
    ["sensor.solar_power", "3.2", { unit_of_measurement: "kW", friendly_name: "Solar" }],
    ["sensor.grid_power", "-0.8", { unit_of_measurement: "kW", friendly_name: "Grid" }],
    ["sensor.battery_power", "1.1", { unit_of_measurement: "kW", friendly_name: "Battery" }],
    ["sensor.battery_soc", "64", { unit_of_measurement: "%", friendly_name: "Battery SoC" }],
    ["sensor.house_power", "1.3", { unit_of_measurement: "kW", friendly_name: "House" }],
    ["alarm_control_panel.home", "disarmed", { friendly_name: "Alarm", code_format: "number" }],
    ["weather.home", "sunny", { temperature: 27, humidity: 54, wind_speed: 14, friendly_name: "Brisbane" }],
    ["sensor.wan_download", "212", { unit_of_measurement: "Mbit/s", friendly_name: "WAN download" }],
    ["sensor.wan_upload", "38", { unit_of_measurement: "Mbit/s", friendly_name: "WAN upload" }],
    ["sensor.unifi_clients", "37", { friendly_name: "Wi-Fi clients" }],
    ["person.ava", "home", { friendly_name: "Ava Nguyen" }],
    ["person.noah", "not_home", { friendly_name: "Noah Smith" }],
    ["lock.front_door", "locked", { friendly_name: "Front door" }],
    ["lock.back_door", "unlocked", { friendly_name: "Back door" }],
    ["cover.garage_door", "closed", { friendly_name: "Garage door" }],
    ["cover.living_blinds", "open", { friendly_name: "Living blinds" }],
    ["light.porch", "off", { friendly_name: "Porch" }],
    ["switch.hall_heater", "off", { friendly_name: "Hall heater" }],
    ["switch.garden_pump", "off", { friendly_name: "Garden pump" }],
    ["switch.printer_3d", "on", { friendly_name: "3D printer" }],
    ["automation.movie_mode", "on", { friendly_name: "Movie mode", last_triggered: null }],
    ["automation.good_night", "on", { friendly_name: "Good night", last_triggered: null }],
    ["automation.away_mode", "on", { friendly_name: "Away mode", last_triggered: null }],
    ["automation.boost_hot_water", "on", { friendly_name: "Boost hot water", last_triggered: null }],
  ];
  for (const r of ROOMS) {
    s.push([`sensor.${r}_temperature`, String(BASE_T[r]), { unit_of_measurement: "°C", friendly_name: `${title(r)} temperature` }]);
    s.push([`sensor.${r}_humidity`, String(BASE_H[r]), { unit_of_measurement: "%", friendly_name: `${title(r)} humidity` }]);
    s.push([`binary_sensor.${r}_csi_occupancy`, r === "living_room" || r === "office" ? "on" : "off", { device_class: "occupancy", people: r === "living_room" ? 1 : r === "office" ? 1 : 0, friendly_name: `${title(r)} occupancy (Wi-Fi CSI)` }]);
    if (r !== "garage") s.push([`light.${r}`, r === "living_room" || r === "office" ? "on" : "off", { friendly_name: title(r), brightness: 200 }]);
  }
  const bat: [string, number][] = [["front_door_sensor", 88], ["csi_node_living", 61], ["tv_remote", 34], ["smoke_alarm_hall", 92], ["body_scale", 17], ["mower", 71]];
  for (const [id, v] of bat) s.push([`sensor.${id}_battery`, String(v), { unit_of_measurement: "%", device_class: "battery", friendly_name: title(id) }]);
  return s;
}

/** Deterministic simulation: same numbers on every load, updated every ~1.5 s. */
export class SimSource implements HaSource {
  private map = new Map<string, HaEntity>();
  private hist = new Map<string, number[]>();
  private subs = new Set<() => void>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private snap: HaSnapshot = { version: 0, entities: [], byId: {} };
  private rand = rng(20261112);
  private tick = 0;
  private t0 = Date.now();

  private intervalMs: number;
  constructor(intervalMs = 1500) {
    this.intervalMs = intervalMs;
    for (const [entity_id, state, attributes = {}] of seeds()) this.map.set(entity_id, { entity_id, state, attributes, last_changed: iso(this.t0) });
    for (let i = 0; i < 24; i++) this.step(true); // pre-fill history so sparklines are never empty
    this.rebuild();
  }

  getStates = () => this.snap.entities;
  getSnapshot = () => this.snap;
  history = (id: string) => this.hist.get(id) ?? [];

  subscribe = (cb: () => void) => {
    this.subs.add(cb);
    if (!this.timer) this.timer = setInterval(() => { this.step(false); this.rebuild(); this.subs.forEach((f) => f()); }, this.intervalMs);
    return () => { this.subs.delete(cb); if (!this.subs.size && this.timer) { clearInterval(this.timer); this.timer = null; } };
  };

  private num = (id: string) => Number(this.map.get(id)?.state ?? 0);
  private set(id: string, state: string, attrs?: Record<string, unknown>) {
    const e = this.map.get(id); if (!e) return;
    this.map.set(id, { ...e, state, attributes: attrs ? { ...e.attributes, ...attrs } : e.attributes, last_changed: e.state === state ? e.last_changed : iso(Date.now()) });
  }
  private push(id: string, v: number) { const h = this.hist.get(id) ?? []; h.push(v); if (h.length > 40) h.shift(); this.hist.set(id, h); }
  private rebuild() { const entities = [...this.map.values()]; this.snap = { version: this.snap.version + 1, entities, byId: Object.fromEntries(entities.map((e) => [e.entity_id, e])) }; }

  private step(silent: boolean) {
    this.tick++; const t = this.tick, r = this.rand;
    const sun = Math.max(0, Math.sin(t / 18 + 1.2));
    const solar = Math.round((sun * 5.6 + (r() - 0.5) * 0.3) * 100) / 100;
    const heaters = this.map.get("switch.hall_heater")?.state === "on" ? 1.8 : 0;
    const printer = this.map.get("switch.printer_3d")?.state === "on" ? 0.25 : 0;
    const house = Math.round((0.7 + heaters + printer + Math.abs(Math.sin(t / 7)) * 0.6 + (r() - 0.5) * 0.15) * 100) / 100;
    let soc = this.num("sensor.battery_soc");
    const surplus = solar - house;
    const batt = Math.max(-3, Math.min(3, soc >= 99 && surplus > 0 ? 0 : soc <= 8 && surplus < 0 ? 0 : surplus * 0.8)); // + charging
    soc = Math.max(5, Math.min(100, soc + batt * 0.12));
    const grid = Math.round((house + batt - solar) * 100) / 100; // + import, - export
    this.set("sensor.solar_power", solar.toFixed(2)); this.set("sensor.house_power", house.toFixed(2));
    this.set("sensor.battery_power", batt.toFixed(2)); this.set("sensor.battery_soc", soc.toFixed(1)); this.set("sensor.grid_power", grid.toFixed(2));
    for (const [id, v] of [["sensor.solar_power", solar], ["sensor.house_power", house], ["sensor.grid_power", grid], ["sensor.battery_soc", soc]] as const) this.push(id, v);
    for (const room of ROOMS) {
      const th = this.num(`sensor.${room}_temperature`), hh = this.num(`sensor.${room}_humidity`);
      const nt = Math.round((BASE_T[room] + Math.sin(t / 11 + room.length) * 0.9 + (r() - 0.5) * 0.2) * 10) / 10;
      const nh = Math.round(BASE_H[room] + Math.cos(t / 13 + room.length) * 4 + (r() - 0.5));
      this.set(`sensor.${room}_temperature`, String(nt)); this.set(`sensor.${room}_humidity`, String(nh));
      this.push(`sensor.${room}_temperature`, nt); this.push(`sensor.${room}_humidity`, nh); void th; void hh;
    }
    // Wi-Fi CSI occupancy drifts slowly between rooms.
    if (t % 9 === 0 && !silent) {
      const occ = ROOMS.filter((x) => x !== "garage"); const room = occ[Math.floor(r() * occ.length)];
      const id = `binary_sensor.${room}_csi_occupancy`; const e = this.map.get(id)!; const people = Math.floor(r() * 3);
      this.set(id, people ? "on" : "off", { people });
      void e;
    }
    const dl = Math.round(212 + Math.sin(t / 5) * 60 + (r() - 0.5) * 30), ul = Math.round(38 + Math.cos(t / 6) * 10 + (r() - 0.5) * 6);
    this.set("sensor.wan_download", String(dl)); this.set("sensor.wan_upload", String(ul)); this.push("sensor.wan_download", dl); this.push("sensor.wan_upload", ul);
    this.set("sensor.unifi_clients", String(Math.round(37 + Math.sin(t / 15) * 3)));
    for (const id of ["sensor.body_scale_battery", "sensor.tv_remote_battery"]) if (t % 40 === 0) this.set(id, String(Math.max(1, this.num(id) - 1)));
    this.set("weather.home", sun > 0.15 ? "sunny" : "clear-night", { temperature: Math.round(24 + sun * 5) });
  }

  async callService(domain: string, service: string, data: Record<string, unknown> = {}): Promise<ServiceResult> {
    await new Promise((res) => setTimeout(res, 220)); // simulated round-trip
    const id = String(data.entity_id ?? "");
    const e = this.map.get(id);
    let result: ServiceResult = { ok: true };
    if ((domain === "light" || domain === "switch") && e) {
      const on = service === "turn_on" || (service === "toggle" && e.state !== "on");
      this.set(id, on ? "on" : "off");
    } else if (domain === "lock" && e) this.set(id, service === "lock" ? "locked" : "unlocked");
    else if (domain === "cover" && e) this.set(id, service === "open_cover" ? "open" : service === "close_cover" ? "closed" : e.state === "open" ? "closed" : "open");
    else if (domain === "alarm_control_panel" && e) {
      if (String(data.code ?? "") !== PIN) result = { ok: false, error: "Invalid code" };
      else this.set(id, service === "alarm_disarm" ? "disarmed" : service === "alarm_arm_home" ? "armed_home" : "armed_away");
    } else if ((domain === "automation" || domain === "script") && e) this.set(id, e.state, { last_triggered: iso(Date.now()) });
    else result = { ok: false, error: `Unknown service ${domain}.${service}` };
    this.rebuild(); this.subs.forEach((f) => f());
    return result;
  }
}

/**
 * LIVE SOURCE (stub, intentionally not implemented).
 *
 * To connect a real Home Assistant, implement `HaSource` over its WebSocket API:
 *   1. Open `ws(s)://<host>/api/websocket`. HA sends `{type:"auth_required"}`.
 *   2. Reply `{type:"auth", access_token}`; wait for `{type:"auth_ok"}`.
 *   3. Send `{id:1, type:"subscribe_entities"}` (compressed state diffs) or `get_states` + `subscribe_events`
 *      with `event_type:"state_changed"`, and fold the results into `HaSnapshot`.
 *   4. For `callService`, send `{id:n, type:"call_service", domain, service, service_data}` and resolve on the
 *      matching `{type:"result", id:n, success}` message.
 *   5. Reconnect with backoff, and re-authenticate on every new socket.
 *
 * Credentials: this module deliberately stores none. Obtain the long-lived access token from the user at
 * runtime (e.g. a settings field kept in memory) or, better, put a server-side proxy in front so the browser
 * never holds a token. Do not commit tokens or write them to localStorage.
 */
export class LiveSource implements HaSource {
  readonly url: string;
  constructor(url: string) { this.url = url; throw new Error("LiveSource is a documented stub: see the comment above."); }
  getStates(): HaEntity[] { return []; }
  getSnapshot(): HaSnapshot { return { version: 0, entities: [], byId: {} }; }
  subscribe(): () => void { return () => {}; }
  callService(): Promise<ServiceResult> { return Promise.resolve({ ok: false, error: "not implemented" }); }
  history(): number[] { return []; }
}

export const haSource: HaSource = new SimSource();

/** Subscribe a component to the source. Re-renders on every state change. */
export function useHa(source: HaSource = haSource) {
  const snap = useSyncExternalStore(source.subscribe, source.getSnapshot, source.getSnapshot);
  const get = (id: string) => snap.byId[id];
  const num = (id: string) => Number(snap.byId[id]?.state ?? NaN);
  return { snap, entities: snap.entities, get, num, history: source.history, call: source.callService.bind(source) };
}
