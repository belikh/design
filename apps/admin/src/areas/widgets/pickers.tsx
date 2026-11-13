import { useMemo, useState } from "react";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";
import { Btn, Badge } from "@belikh/jupiter-ui/kit.tsx";
import { Checkbox, Segmented, Select } from "@belikh/jupiter-ui/inputs.tsx";
import { PINS, pinState, type Need } from "./feedback.ts";
import { fmtOffset, hhmm, parseOffset, sunTimes } from "./geometry.ts";
import { CopyBtn, Note, Row, Stack, rovingKeys } from "./ui.tsx";

/* ---------------- C027 icon picker ---------------- */
export const ICON_NAMES = "alert ap arrow-down arrow-left arrow-right arrow-up attach battery bell block bolt book bookmark calendar camera card cart chart chat check clock cloud code console copy cpu cup database disk download drop edit ethernet eye file filter flag folder gift git-branch globe heart help home image infinity info key leaf lightbulb link lock mail memory monitor moon music phone pin play plus pulse rack refresh router search send server settings shield signal sliders sparkle star sun switch tag terminal thermometer topology trash trend unlock upload usb user vpn wifi wind".split(" ");
export function IconPicker({ value, onChange, icons = ICON_NAMES, cols = 8 }: { value?: string; onChange?: (v: string) => void; icons?: string[]; cols?: number }) {
  const [inner, setInner] = useState(value ?? ""); const [q, setQ] = useState(""); const v = value ?? inner; const set = (n: string) => { setInner(n); onChange?.(n); };
  const shown = icons.filter((n) => n.includes(q.trim().toLowerCase().replace(/\s+/g, "-")));
  return (
    <Stack>
      <label className="p3-field"><span className="jp-label">Search icons</span><input className="jp-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. wifi" /></label>
      <div className="p3-iconpick" role="radiogroup" aria-label="Icon" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} onKeyDown={rovingKeys(cols)}>
        {shown.map((n, i) => <button key={n} type="button" role="radio" aria-checked={v === n} aria-label={n} title={n} data-roving tabIndex={v === n || (!shown.includes(v) && i === 0) ? 0 : -1} className={v === n ? "is-on" : ""} onClick={() => set(n)}><Icon name={n} size={20} /></button>)}
        {!shown.length && <p className="p3-note p3-span">No icon matches "{q}".</p>}
      </div>
      <Row><span className="p3-note" aria-live="polite">{v ? <>Selected: <Icon name={v} size={16} /> <code>{v}</code></> : "Nothing selected"}</span>{v && <><CopyBtn text={v} label="Copy name" /><Btn sm variant="ghost" onClick={() => set("")}>Clear</Btn></>}</Row>
    </Stack>
  );
}

/* ---------------- C027 emoji picker ---------------- */
type Emo = { c: string; n: string; k: string; g: string };
const e = (c: string, n: string, g: string, k = ""): Emo => ({ c, n, g, k });
export const EMOJIS: Emo[] = [
  e("😀", "grinning face", "Faces", "happy smile"), e("😄", "smiling face", "Faces", "happy joy"), e("😂", "tears of joy", "Faces", "laugh lol"), e("🙂", "slight smile", "Faces", "ok"), e("😉", "wink", "Faces"), e("😍", "heart eyes", "Faces", "love"), e("🤔", "thinking", "Faces", "hmm"), e("😴", "sleeping", "Faces", "tired zzz"), e("😢", "crying", "Faces", "sad tear"), e("😡", "angry", "Faces", "mad"), e("😮", "surprised", "Faces", "wow"), e("🥳", "party face", "Faces", "celebrate"),
  e("👍", "thumbs up", "People", "yes approve like"), e("👎", "thumbs down", "People", "no dislike"), e("👏", "clapping", "People", "applause"), e("🙏", "folded hands", "People", "thanks please"), e("👋", "waving hand", "People", "hello bye"), e("💪", "flexed biceps", "People", "strong"), e("👀", "eyes", "People", "look"), e("🧑‍💻", "technologist", "People", "developer"),
  e("🐶", "dog", "Nature", "pet"), e("🐱", "cat", "Nature", "pet"), e("🦘", "kangaroo", "Nature", "australia"), e("🐨", "koala", "Nature", "australia"), e("🌳", "tree", "Nature"), e("🌸", "blossom", "Nature", "flower"), e("☀️", "sun", "Nature", "weather"), e("🌧️", "rain", "Nature", "weather"),
  e("🍕", "pizza", "Food", "dinner"), e("☕", "coffee", "Food", "drink"), e("🍺", "beer", "Food", "drink"), e("🍎", "apple", "Food", "fruit"), e("🥑", "avocado", "Food"), e("🍰", "cake", "Food", "birthday"),
  e("🚀", "rocket", "Objects", "launch ship"), e("💡", "light bulb", "Objects", "idea"), e("🔥", "fire", "Objects", "hot"), e("⚡", "lightning", "Objects", "power"), e("🔒", "lock", "Objects", "secure"), e("🔑", "key", "Objects"), e("📦", "package", "Objects", "box delivery"), e("🛠️", "tools", "Objects", "fix"), e("📈", "chart up", "Objects", "growth"), e("🎉", "party popper", "Objects", "celebrate"),
  e("✅", "check mark", "Symbols", "done yes"), e("❌", "cross mark", "Symbols", "no wrong"), e("⚠️", "warning", "Symbols", "caution"), e("❤️", "red heart", "Symbols", "love"), e("💯", "hundred points", "Symbols", "perfect"), e("➕", "plus", "Symbols", "add"), e("❓", "question", "Symbols", "help"), e("⭐", "star", "Symbols", "favourite"),
];
export const EMOJI_GROUPS = ["Faces", "People", "Nature", "Food", "Objects", "Symbols"];
export const searchEmoji = (q: string, group?: string): Emo[] => { const t = q.trim().toLowerCase(); return EMOJIS.filter((x) => (!group || t || x.g === group) && (!t || `${x.n} ${x.k} ${x.g}`.toLowerCase().includes(t))); };
export function EmojiPicker({ onPick }: { onPick?: (c: string) => void }) {
  const [q, setQ] = useState(""); const [g, setG] = useState("Faces"); const [recent, setRecent] = useState<string[]>([]); const [text, setText] = useState(""); const [tone, setTone] = useState("");
  const list = searchEmoji(q, g); const pick = (c: string) => { setRecent((r) => [c, ...r.filter((x) => x !== c)].slice(0, 8)); setText((t) => t + c); onPick?.(c); };
  const TONES = [["", "Default"], ["🏻", "Light"], ["🏽", "Medium"], ["🏿", "Dark"]];
  const toned = (c: string, g2: string) => (tone && g2 === "People" && ["👍", "👎", "👏", "🙏", "👋", "💪"].includes(c) ? c + tone : c);
  return (
    <Stack>
      <label className="p3-field"><span className="jp-label">Search emoji</span><input className="jp-input" type="search" value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="e.g. party" /></label>
      <Row><Select value={g} onChange={setG} options={EMOJI_GROUPS} aria-label="Category" disabled={!!q} /><Select value={tone} onChange={setTone} options={TONES.map(([v, l]) => ({ value: v, label: `Skin tone: ${l}` }))} aria-label="Skin tone" /></Row>
      {recent.length > 0 && <div><span className="p3-note">Recent</span><div className="p3-emoji" role="group" aria-label="Recent emoji">{recent.map((c) => <button key={c} type="button" aria-label={c} onClick={() => pick(c)}>{c}</button>)}</div></div>}
      <div className="p3-emoji" role="group" aria-label={q ? "Search results" : g} onKeyDown={rovingKeys(8)}>
        {list.map((x, i) => <button key={x.n} type="button" data-roving tabIndex={i === 0 ? 0 : -1} aria-label={x.n} title={x.n} onClick={() => pick(toned(x.c, x.g))}>{toned(x.c, x.g)}</button>)}
        {!list.length && <p className="p3-note p3-span">No emoji found.</p>}
      </div>
      <label className="p3-field"><span className="jp-label">Message</span><input className="jp-input" value={text} onChange={(ev) => setText(ev.target.value)} placeholder="Picked emoji are inserted here" /></label>
    </Stack>
  );
}

/* ---------------- C066 device and entity picker ---------------- */
export type Entity = { id: string; name: string; area: string; state: string; domain: string; battery?: number };
export const ENTITIES: Entity[] = [
  { id: "light.kitchen_ceiling", name: "Kitchen ceiling", area: "Kitchen", state: "on", domain: "light" }, { id: "light.lounge_lamp", name: "Lounge lamp", area: "Lounge", state: "off", domain: "light" }, { id: "light.studio_strip", name: "Studio strip", area: "Studio", state: "on", domain: "light" },
  { id: "sensor.rack_temperature", name: "Rack temperature", area: "Comms room", state: "27.4 °C", domain: "sensor" }, { id: "sensor.garage_humidity", name: "Garage humidity", area: "Garage", state: "61 %", domain: "sensor", battery: 18 }, { id: "sensor.solar_power", name: "Solar power", area: "Roof", state: "3.2 kW", domain: "sensor" },
  { id: "switch.pump_bore", name: "Bore pump", area: "Yard", state: "off", domain: "switch" }, { id: "switch.rack_fan", name: "Rack fan", area: "Comms room", state: "on", domain: "switch" },
  { id: "binary_sensor.front_door", name: "Front door", area: "Entry", state: "closed", domain: "binary_sensor", battery: 84 }, { id: "binary_sensor.motion_hall", name: "Hall motion", area: "Hall", state: "clear", domain: "binary_sensor", battery: 9 },
  { id: "climate.living", name: "Living room AC", area: "Lounge", state: "cool 23°", domain: "climate" }, { id: "cover.garage_door", name: "Garage door", area: "Garage", state: "closed", domain: "cover" }, { id: "lock.front", name: "Front lock", area: "Entry", state: "locked", domain: "lock", battery: 56 },
];
export const filterEntities = (list: Entity[], q: string, domain: string, area: string): Entity[] => { const t = q.trim().toLowerCase(); return list.filter((x) => (!domain || x.domain === domain) && (!area || x.area === area) && (!t || `${x.id} ${x.name} ${x.area}`.toLowerCase().includes(t))); };
export function EntityPicker({ multi = true }: { multi?: boolean }) {
  const [q, setQ] = useState(""); const [domain, setDomain] = useState(""); const [area, setArea] = useState(""); const [sel, setSel] = useState<string[]>(["light.kitchen_ceiling"]);
  const shown = filterEntities(ENTITIES, q, domain, area); const domains = [...new Set(ENTITIES.map((x) => x.domain))]; const areas = [...new Set(ENTITIES.map((x) => x.area))].sort();
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : multi ? [...s, id] : [id]));
  return (
    <Stack>
      <Row>
        <label className="p3-field p3-grow"><span className="jp-label">Search devices and entities</span><input className="jp-input" type="search" value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="name, area or entity id" /></label>
        <label className="p3-field"><span className="jp-label">Domain</span><Select value={domain} onChange={setDomain} options={[{ value: "", label: "All domains" }, ...domains.map((d) => ({ value: d, label: d }))]} aria-label="Domain" /></label>
        <label className="p3-field"><span className="jp-label">Area</span><Select value={area} onChange={setArea} options={[{ value: "", label: "All areas" }, ...areas]} aria-label="Area" /></label>
      </Row>
      <ul className="p3-entlist" aria-label="Entities">
        {shown.map((x) => <li key={x.id}><Checkbox checked={sel.includes(x.id)} onChange={() => toggle(x.id)} label={<span className="p3-ent"><b>{x.name}</b> <code className="p3-note">{x.id}</code><span className="p3-note">{x.area} · {x.state}</span>{x.battery !== undefined && x.battery < 20 && <Badge s="warn">Battery {x.battery}%</Badge>}</span>} /></li>)}
        {!shown.length && <li className="p3-note">No entity matches.</li>}
      </ul>
      <Row><span className="p3-note" aria-live="polite">{sel.length} selected</span>{sel.map((id) => <span key={id} className="p3-chip">{id}<button type="button" aria-label={`Remove ${id}`} onClick={() => toggle(id)}>×</button></span>)}</Row>
    </Stack>
  );
}

/* ---------------- C066 GPIO pin picker ---------------- */
const NEEDS: { value: Need; label: string }[] = [{ value: "output", label: "Output" }, { value: "input", label: "Input" }, { value: "adc", label: "Analog in" }, { value: "pwm", label: "PWM" }, { value: "i2c", label: "I2C" }];
export function GpioPicker() {
  const [need, setNeed] = useState<Need>("output"); const [wifi, setWifi] = useState(true); const [role, setRole] = useState("Relay 1"); const [used, setUsed] = useState<Record<number, string>>({ 21: "I2C SDA", 22: "I2C SCL" }); const [hover, setHover] = useState<number | null>(null);
  const assign = (n: number) => setUsed((u) => { const x = { ...u }; for (const k of Object.keys(x)) if (x[Number(k)] === role) delete x[Number(k)]; x[n] = role; return x; });
  const states = useMemo(() => Object.fromEntries(PINS.map((p) => [p.n, pinState(p, need, used, wifi)])), [need, used, wifi]);
  const detail = PINS.find((p) => p.n === hover);
  return (
    <Stack>
      <Row><label className="p3-field"><span className="jp-label">Role to assign</span><input className="jp-input" value={role} onChange={(ev) => setRole(ev.target.value)} /></label><div className="p3-field"><span className="jp-label" id="gpio-need">Needs</span><Segmented label="Pin capability needed" options={NEEDS} value={need} onChange={setNeed} /></div><Checkbox checked={wifi} onChange={setWifi} label="Wi-Fi enabled" /></Row>
      <div className="p3-gpio" role="group" aria-label="GPIO pins">
        {PINS.map((p) => { const s = states[p.n]; const mine = used[p.n] === role; return (
          <button key={p.n} type="button" className={`p3-gpio__pin is-${s.level} ${used[p.n] ? "is-used" : ""} ${mine ? "is-mine" : ""}`} aria-disabled={!s.ok && !mine} aria-pressed={mine} aria-label={`GPIO${p.n}: ${used[p.n] ? `${used[p.n]}. ` : ""}${s.reason}`} onMouseEnter={() => setHover(p.n)} onFocus={() => setHover(p.n)} onClick={() => (s.ok || mine) && (mine ? setUsed((u) => { const x = { ...u }; delete x[p.n]; return x; }) : assign(p.n))}><b>{p.n}</b><span>{used[p.n] ?? ""}</span></button>); })}
      </div>
      <p className="p3-note" aria-live="polite">{detail ? `GPIO${detail.n}: ${states[detail.n].reason}${detail.flags.length ? ` (${detail.flags.join(", ")})` : ""}` : "Hover or focus a pin for details. Click to assign it to the role above; click again to release."}</p>
      <Note>Legend: plain = available, amber = usable with a caution, struck = unavailable for this need.</Note>
    </Stack>
  );
}

/* ---------------- C066 sunrise and sunset offsets ---------------- */
const PLACES: Record<string, { lat: number; lon: number; tz: number }> = { Brisbane: { lat: -27.47, lon: 153.03, tz: 10 }, Sydney: { lat: -33.87, lon: 151.21, tz: 10 }, Perth: { lat: -31.95, lon: 115.86, tz: 8 }, Hobart: { lat: -42.88, lon: 147.33, tz: 10 }, Auckland: { lat: -36.85, lon: 174.76, tz: 12 }, Tromso: { lat: 69.65, lon: 18.96, tz: 1 } };
export function SunOffsets() {
  const [place, setPlace] = useState("Brisbane"); const [date, setDate] = useState("2026-12-21"); const [rise, setRise] = useState("-30"); const [set, setSet] = useState("+45");
  const p = PLACES[place]; const d = new Date(date + "T00:00:00Z"); const sun = Number.isNaN(d.getTime()) ? null : sunTimes(p.lat, p.lon, d);
  const ro = parseOffset(rise), so = parseOffset(set); const local = (m: number) => m + p.tz * 60;
  const bar = (m: number) => `${(((m % 1440) + 1440) % 1440) / 14.4}%`;
  const Off = ({ label, text, setText, off }: { label: string; text: string; setText: (s: string) => void; off: number | null }) => (
    <div className="p3-field"><label className="jp-label" htmlFor={`off-${label}`}>{label} offset</label>
      <Row><Btn sm aria-label={`${label} 15 minutes earlier`} onClick={() => setText(fmtOffset((off ?? 0) - 15))}>−15</Btn><input id={`off-${label}`} className="jp-input p3-narrow" value={text} aria-invalid={off === null} onChange={(ev) => setText(ev.target.value)} /><Btn sm aria-label={`${label} 15 minutes later`} onClick={() => setText(fmtOffset((off ?? 0) + 15))}>+15</Btn></Row>
      {off === null && <span className="p3-bad" role="alert">Use a form like -30, +1h 15m or 45m.</span>}</div>);
  return (
    <Stack>
      <Row><label className="p3-field"><span className="jp-label">Place</span><Select value={place} onChange={setPlace} options={Object.keys(PLACES)} aria-label="Place" /></label><label className="p3-field"><span className="jp-label">Date</span><input className="jp-input" type="date" value={date} onChange={(ev) => setDate(ev.target.value)} /></label></Row>
      <Row><Off label="Sunrise" text={rise} setText={setRise} off={ro} /><Off label="Sunset" text={set} setText={setSet} off={so} /></Row>
      {sun ? <>
        <svg className="p3-sunbar" viewBox="0 0 100 12" role="img" aria-label={`Daylight from ${hhmm(local(sun.sunrise))} to ${hhmm(local(sun.sunset))}`} preserveAspectRatio="none"><rect x="0" y="3" width="100" height="6" className="p3-sunbar__night" /><rect x={Number.parseFloat(bar(local(sun.sunrise)))} y="3" width={Math.max(0, Number.parseFloat(bar(local(sun.sunset))) - Number.parseFloat(bar(local(sun.sunrise))))} height="6" className="p3-sunbar__day" />{ro !== null && <rect x={Number.parseFloat(bar(local(sun.sunrise + ro)))} y="0" width="0.8" height="12" className="p3-sunbar__mark" />}{so !== null && <rect x={Number.parseFloat(bar(local(sun.sunset + so)))} y="0" width="0.8" height="12" className="p3-sunbar__mark" />}</svg>
        <dl className="p3-kv" aria-live="polite"><dt>Sunrise</dt><dd>{hhmm(local(sun.sunrise))}</dd><dt>Sunrise trigger</dt><dd>{ro === null ? "invalid offset" : `${hhmm(local(sun.sunrise + ro))} (${fmtOffset(ro)})`}</dd><dt>Sunset</dt><dd>{hhmm(local(sun.sunset))}</dd><dt>Sunset trigger</dt><dd>{so === null ? "invalid offset" : `${hhmm(local(sun.sunset + so))} (${fmtOffset(so)})`}</dd></dl></>
        : <p className="p3-warn" role="status">No sunrise or sunset on this date at this latitude (polar day or night).</p>}
      <Note>Times are standard time for the place (no daylight-saving adjustment) from an approximate solar model, good to a couple of minutes.</Note>
    </Stack>
  );
}
