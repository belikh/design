import { useMemo, useRef, useState } from "react";
import { Field, Slider } from "@belikh/jupiter-ui/inputs.tsx";
import { Btn, Badge } from "@belikh/jupiter-ui/kit.tsx";
import "./in2.css";

/** Fictional addresses (no network, no real geocoder). lat/lon are on a made-up grid near -27.47, 153.02. */
export type Addr = { id: string; line: string; suburb: string; state: string; postcode: string; lat: number; lon: number };
export const ADDRESSES: Addr[] = [
  { id: "a1", line: "12 Wattle Street", suburb: "Kangaroo Point", state: "QLD", postcode: "4169", lat: -27.4752, lon: 153.0371 }, { id: "a2", line: "88 Jacaranda Avenue", suburb: "West End", state: "QLD", postcode: "4101", lat: -27.4821, lon: 153.0095 },
  { id: "a3", line: "5 Banksia Court", suburb: "Paddington", state: "QLD", postcode: "4064", lat: -27.4605, lon: 153.0042 }, { id: "a4", line: "301 Eucalypt Road", suburb: "Woolloongabba", state: "QLD", postcode: "4102", lat: -27.4888, lon: 153.0356 },
  { id: "a5", line: "47 Wattle Street", suburb: "Newstead", state: "QLD", postcode: "4006", lat: -27.4496, lon: 153.0461 }, { id: "a6", line: "9 Grevillea Lane", suburb: "Milton", state: "QLD", postcode: "4064", lat: -27.4687, lon: 153.0013 },
  { id: "a7", line: "150 Mangrove Parade", suburb: "Bulimba", state: "QLD", postcode: "4171", lat: -27.4515, lon: 153.0589 }, { id: "a8", line: "22 Boronia Drive", suburb: "Highgate Hill", state: "QLD", postcode: "4101", lat: -27.4953, lon: 153.0128 },
];
export const SITES = [{ name: "Depot north", lat: -27.4496, lon: 153.0461 }, { name: "Depot south", lat: -27.4953, lon: 153.0128 }, { name: "Cafe West End", lat: -27.4821, lon: 153.0095 }, { name: "Kiosk Bulimba", lat: -27.4515, lon: 153.0589 }, { name: "Store Milton", lat: -27.4687, lon: 153.0013 }];
export const haversineKm = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => { const r = (d: number) => (d * Math.PI) / 180; const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };
export const searchAddresses = (q: string, list = ADDRESSES) => { const t = q.trim().toLowerCase(); if (t.length < 2) return []; const w = t.split(/\s+/); return list.filter((a) => w.every((x) => `${a.line} ${a.suburb} ${a.postcode}`.toLowerCase().includes(x))).slice(0, 6); };
export const coordIssue = (lat: string, lon: string): string | null => { const a = Number(lat), o = Number(lon); if (lat.trim() === "" || lon.trim() === "" || Number.isNaN(a) || Number.isNaN(o)) return "Enter latitude and longitude as numbers"; if (a < -90 || a > 90) return "Latitude must be between -90 and 90"; if (o < -180 || o > 180) return "Longitude must be between -180 and 180"; return null; };

const BOX = { lat0: -27.5, lat1: -27.44, lon0: 152.995, lon1: 153.065 }; const W = 420, H = 280;
const px = (lat: number, lon: number) => ({ x: ((lon - BOX.lon0) / (BOX.lon1 - BOX.lon0)) * W, y: ((BOX.lat1 - lat) / (BOX.lat1 - BOX.lat0)) * H });
const unpx = (x: number, y: number) => ({ lat: BOX.lat1 - (y / H) * (BOX.lat1 - BOX.lat0), lon: BOX.lon0 + (x / W) * (BOX.lon1 - BOX.lon0) });
const kmPerPx = (haversineKm({ lat: -27.47, lon: BOX.lon0 }, { lat: -27.47, lon: BOX.lon1 }) / W);

export function AddressField() {
  const [q, setQ] = useState(""); const [open, setOpen] = useState(false); const [hi, setHi] = useState(0); const [addr, setAddr] = useState<Addr | null>(null); const [confirmed, setConfirmed] = useState(false); const [manual, setManual] = useState(false);
  const res = useMemo(() => searchAddresses(q), [q]); const choose = (a: Addr) => { setAddr(a); setQ(`${a.line}, ${a.suburb}`); setOpen(false); setConfirmed(false); };
  const [pin, setPin] = useState<{ lat: number; lon: number } | null>(null); const pos = pin ?? (addr ? { lat: addr.lat, lon: addr.lon } : null); const moved = addr && pin ? haversineKm(addr, pin) * 1000 : 0; const svg = useRef<SVGSVGElement>(null);
  const place = (e: React.PointerEvent) => { const r = svg.current!.getBoundingClientRect(); const p = unpx(((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H); setPin({ lat: Number(p.lat.toFixed(5)), lon: Number(p.lon.toFixed(5)) }); setConfirmed(false); };
  return (
    <div className="in2-stack">
      <Field label="Delivery address" hint="Start typing a street or suburb (sample data: try “wattle” or “paddington”)">{(id, d) => (
        <div style={{ position: "relative" }}>
          <input id={id} aria-describedby={d} className="jp-input" role="combobox" aria-expanded={open && res.length > 0} aria-controls="addr-list" aria-autocomplete="list" aria-activedescendant={open && res[hi] ? `addr-${res[hi].id}` : undefined} autoComplete="off" value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); setAddr(null); setPin(null); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setHi(Math.min(res.length - 1, hi + 1)); } else if (e.key === "ArrowUp") { e.preventDefault(); setHi(Math.max(0, hi - 1)); } else if (e.key === "Enter" && open && res[hi]) { e.preventDefault(); choose(res[hi]); } else if (e.key === "Escape") setOpen(false); }} />
          {open && res.length > 0 && <ul id="addr-list" role="listbox" className="in2-menu" style={{ position: "absolute", insetInline: 0, zIndex: 5 }}>{res.map((a, i) => <li key={a.id} id={`addr-${a.id}`} role="option" aria-selected={i === hi} className={i === hi ? "is-active" : ""} onMouseDown={(e) => { e.preventDefault(); choose(a); }}><b>{a.line}</b> <span className="in2-note">{a.suburb} {a.state} {a.postcode}</span></li>)}</ul>}
        </div>)}</Field>
      {q.trim().length >= 2 && !addr && res.length === 0 && <span className="in2-note" role="status">No matching address. <button type="button" className="adm-link" onClick={() => setManual(true)}>Enter it manually</button></span>}
      {manual && !addr && <ManualAddress onDone={(a) => { choose(a); setManual(false); }} />}
      {addr && pos && <div className="in2-stack">
        <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="in2-map" role="img" aria-label={`Map. Pin at ${pos.lat.toFixed(4)}, ${pos.lon.toFixed(4)}. Click to move the pin.`} style={{ width: "100%", maxWidth: W, cursor: "crosshair", touchAction: "none" }} onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); place(e); }} onPointerMove={(e) => e.buttons === 1 && place(e)}>
          {Array.from({ length: 9 }, (_, i) => <line key={"h" + i} x1={0} x2={W} y1={(i + 0.5) * (H / 9)} y2={(i + 0.5) * (H / 9)} stroke="var(--jp-border)" strokeWidth={i % 3 === 0 ? 3 : 1} vectorEffect="non-scaling-stroke" />)}{Array.from({ length: 14 }, (_, i) => <line key={"v" + i} y1={0} y2={H} x1={(i + 0.5) * (W / 14)} x2={(i + 0.5) * (W / 14)} stroke="var(--jp-border)" strokeWidth={i % 4 === 0 ? 3 : 1} vectorEffect="non-scaling-stroke" />)}
          <path d={`M0 ${H * 0.62} C ${W * 0.3} ${H * 0.45}, ${W * 0.6} ${H * 0.85}, ${W} ${H * 0.55}`} fill="none" stroke="var(--jp-accent)" opacity={0.35} strokeWidth={14} vectorEffect="non-scaling-stroke" />
          {(() => { const p = px(pos.lat, pos.lon); const o = px(addr.lat, addr.lon); return <g><circle cx={o.x} cy={o.y} r={4} fill="none" stroke="var(--jp-text-muted)" strokeDasharray="2 2" /><path d={`M${p.x} ${p.y} l-7 -16 a8 8 0 1 1 14 0 z`} fill="var(--jp-danger)" stroke="var(--jp-bg)" strokeWidth={1.5} /></g>; })()}</svg>
        <div className="in2-row" aria-live="polite"><Badge s={confirmed ? "ok" : "warn"}>{confirmed ? "Location confirmed" : "Not yet confirmed"}</Badge><span className="in2-note">{addr.line}, {addr.suburb} {addr.state} {addr.postcode}</span>{moved > 5 && <span className="in2-warn">Pin moved {Math.round(moved)} m from the geocoded point</span>}</div>
        <div className="in2-row"><Btn variant="primary" disabled={confirmed} onClick={() => setConfirmed(true)}>Confirm location</Btn>{pin && <Btn onClick={() => { setPin(null); setConfirmed(false); }}>Reset pin</Btn>}</div></div>}
    </div>
  );
}
function ManualAddress({ onDone }: { onDone: (a: Addr) => void }) {
  const [v, setV] = useState({ line: "", suburb: "", postcode: "" }); const err = { line: v.line.trim() ? "" : "Required", suburb: v.suburb.trim() ? "" : "Required", postcode: /^\d{4}$/.test(v.postcode) ? "" : "4 digits" }; const [shown, setShown] = useState(false);
  return <form className="in2-box in2-stack" noValidate onSubmit={(e) => { e.preventDefault(); setShown(true); if (!Object.values(err).some(Boolean)) onDone({ id: "manual", ...v, state: "QLD", lat: -27.47, lon: 153.03 }); }}>
    {(["line", "suburb", "postcode"] as const).map((k) => <Field key={k} label={k === "line" ? "Street address" : k[0].toUpperCase() + k.slice(1)} error={shown ? err[k] : undefined}>{(id, d) => <input id={id} aria-describedby={d} className="jp-input" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} />}</Field>)}<div className="in2-row"><Btn type="submit" variant="primary">Use this address</Btn></div></form>;
}

export function GeoPointRadius() {
  const [lat, setLat] = useState("-27.4698"); const [lon, setLon] = useState("153.0251"); const [r, setR] = useState(3); const issue = coordIssue(lat, lon); const c = issue ? null : { lat: Number(lat), lon: Number(lon) };
  const inside = c ? SITES.map((s) => ({ ...s, d: haversineKm(c, s) })).filter((s) => s.d <= r).sort((a, b) => a.d - b.d) : []; const svg = useRef<SVGSVGElement>(null);
  const set = (e: React.PointerEvent) => { const b = svg.current!.getBoundingClientRect(); const p = unpx(((e.clientX - b.left) / b.width) * W, ((e.clientY - b.top) / b.height) * H); setLat(p.lat.toFixed(5)); setLon(p.lon.toFixed(5)); };
  const cp = c ? px(c.lat, c.lon) : null;
  return (
    <div className="in2-grid"><div className="in2-stack">
      <div className="in2-row"><Field label="Latitude" error={issue && lat.trim() !== "" && Number.isNaN(Number(lat)) ? "Not a number" : undefined}>{(id) => <input id={id} className="jp-input in2-mono" style={{ width: 130 }} inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} aria-invalid={!!issue || undefined} />}</Field><Field label="Longitude">{(id) => <input id={id} className="jp-input in2-mono" style={{ width: 130 }} inputMode="decimal" value={lon} onChange={(e) => setLon(e.target.value)} aria-invalid={!!issue || undefined} />}</Field></div>
      {issue && <span role="alert" className="in2-bad">{issue}</span>}
      <Slider label="Radius" value={r} min={0.5} max={10} step={0.5} onChange={setR} fmt={(v) => `${v} km`} />
      <div className="in2-box in2-stack" aria-live="polite"><b>{inside.length} of {SITES.length} sites inside {r} km</b>{inside.map((s) => <div key={s.name} className="in2-row"><span style={{ flex: 1 }}>{s.name}</span><span className="in2-mono">{s.d.toFixed(2)} km</span></div>)}{!inside.length && <span className="in2-note">None. Widen the radius or move the point.</span>}</div></div>
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="in2-map" role="img" aria-label="Map with a radius circle. Click to move the centre." style={{ width: "100%", maxWidth: W, cursor: "crosshair", touchAction: "none" }} onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); set(e); }} onPointerMove={(e) => e.buttons === 1 && set(e)}>
        {SITES.map((s) => { const p = px(s.lat, s.lon); const on = inside.some((i) => i.name === s.name); return <g key={s.name}><circle cx={p.x} cy={p.y} r={5} fill={on ? "var(--jp-accent)" : "var(--jp-text-muted)"} /><text x={p.x + 8} y={p.y + 4} fontSize={12} fill="var(--jp-text)">{s.name}</text></g>; })}
        {cp && <><circle cx={cp.x} cy={cp.y} r={r / kmPerPx} fill="var(--jp-accent)" opacity={0.12} stroke="var(--jp-accent)" /><circle cx={cp.x} cy={cp.y} r={5} fill="var(--jp-danger)" /></>}</svg></div>
  );
}
